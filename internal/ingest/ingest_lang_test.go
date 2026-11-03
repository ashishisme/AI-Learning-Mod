// SPEC: SPEC-009 FR-005, FR-006; FR-ING-02 (amended), FR-033
package ingest

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"image"
	"image/png"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const hiReadme = "# एआई का परिचय\n\nचित्र: ![आरेख](../../../../translated_images/hi/diagram.abc123.webp)\n\nऔर ![एआई](../../../../translated_images/hi/ai.def456.webp)\n"

func pngBytes(t *testing.T) []byte {
	t.Helper()
	var b bytes.Buffer
	if err := png.Encode(&b, image.NewRGBA(image.Rect(0, 0, 2, 2))); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}

var webpBytes = []byte("RIFF\x10\x00\x00\x00WEBPVP8 \x04\x00\x00\x00test")

// langUpstream has two English lessons. Only the first is translated into Hindi, and its README uses
// one translated image that exists and one that does not (the English ai.png stands in for it).
func langUpstream(t *testing.T) *httptest.Server {
	t.Helper()
	files := map[string][]byte{
		"lessons/1-intro/README.md":                      []byte("# Intro\n\n![AI](images/ai.png)\n"),
		"lessons/1-intro/images/ai.png":                  pngBytes(t),
		"lessons/2-next/README.md":                       []byte("# Next\n"),
		"translations/hi/lessons/1-intro/README.md":      []byte(hiReadme),
		"translated_images/hi/diagram.abc123.webp":       webpBytes,
		"translations/ta/lessons/1-intro/README.md":      []byte("# தமிழ்\n"),
		"translations/hi/lessons/1-intro/extra/notes.md": []byte("not a lesson"),
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/git/trees/") {
			var tree []map[string]any
			for p := range files {
				tree = append(tree, map[string]any{"path": p, "type": "blob"})
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"sha": "pinned", "tree": tree})
			return
		}
		rel, ok := strings.CutPrefix(r.URL.Path, "/microsoft/AI-For-Beginners/pinned/")
		if data, found := files[rel]; ok && found {
			_, _ = w.Write(data)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	t.Cleanup(srv.Close)
	return srv
}

func runLang(t *testing.T, srv *httptest.Server, dir string, langs []string, skipEnglish bool) {
	t.Helper()
	_, _, err := Run(context.Background(), Config{
		GitHubToken: "t", ContentDir: dir, BaseURL: srv.URL + "/", RawBaseURL: srv.URL, Client: srv.Client(),
		PinnedSHA: "pinned", Languages: langs, SkipEnglish: skipEnglish,
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestIngestHindiLessons(t *testing.T) {
	var logs bytes.Buffer
	old := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&logs, nil)))
	defer slog.SetDefault(old)

	srv := langUpstream(t)
	dir := t.TempDir()
	runLang(t, srv, dir, []string{"hi"}, true)

	// -lang hi runs only the Hindi pass.
	if _, err := os.Stat(filepath.Join(dir, "index.json")); !os.IsNotExist(err) {
		t.Errorf("the Hindi-only pass wrote the English index: %v", err)
	}

	var index LessonIndex
	readJSON(t, filepath.Join(dir, "lang", "hi", "index.json"), &index)
	if len(index.Lessons) != 1 || index.Lessons[0].ID != "1-intro" || index.Lessons[0].Title != "एआई का परिचय" ||
		index.Lessons[0].Path != "translations/hi/lessons/1-intro/README.md" || index.CommitSHA != "pinned" {
		t.Fatalf("index: %+v", index)
	}

	var lesson Lesson
	readJSON(t, filepath.Join(dir, "lang", "hi", "lessons", "1-intro.json"), &lesson)
	sum := sha256.Sum256([]byte(hiReadme))
	if lesson.SourceHash != hex.EncodeToString(sum[:]) {
		t.Errorf("sourceHash %q is not the hash of the upstream README", lesson.SourceHash)
	}
	srcs := imageSources(lesson)
	if len(srcs) != 2 || !strings.HasSuffix(srcs[0], ".webp") || !strings.HasSuffix(srcs[1], ".png") {
		t.Fatalf("images: %v\n%s", srcs, lesson.Blocks[0].Content)
	}
	// The missing translated image is the English one, from the shared asset store.
	if want := AssetURLPrefix + contentHash(pngBytes(t)) + ".png"; srcs[1] != want {
		t.Errorf("fallback image %s, want %s", srcs[1], want)
	}

	// The translated .webp is served as image/webp.
	files := httptest.NewServer(http.StripPrefix(AssetURLPrefix, http.FileServer(http.Dir(filepath.Join(dir, AssetDir)))))
	defer files.Close()
	resp, err := http.Get(files.URL + srcs[0])
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != 200 || resp.Header.Get("Content-Type") != "image/webp" {
		t.Errorf("webp: %d %s", resp.StatusCode, resp.Header.Get("Content-Type"))
	}

	// The untranslated lesson is skipped with a log line; English is shown for it.
	if _, err := os.Stat(filepath.Join(dir, "lang", "hi", "lessons", "2-next.json")); !os.IsNotExist(err) {
		t.Errorf("an untranslated lesson was written: %v", err)
	}
	if !strings.Contains(logs.String(), "2-next") {
		t.Errorf("no log line for the skipped lesson: %s", logs.String())
	}
	if _, err := os.Stat(filepath.Join(dir, "lang", "ta")); !os.IsNotExist(err) {
		t.Error("a language that was not asked for was written")
	}
	if err := VerifyContentLanguages(dir); err != nil {
		t.Errorf("verify: %v", err)
	}
}

// With no languages, ingest is exactly the English run it always was (FR-ING-02).
func TestIngestEnglishUnchangedWithoutLanguages(t *testing.T) {
	srv := langUpstream(t)
	dir := t.TempDir()
	runLang(t, srv, dir, nil, false)
	if _, err := os.Stat(filepath.Join(dir, "lang")); !os.IsNotExist(err) {
		t.Errorf("a language directory was written: %v", err)
	}
	var lesson Lesson
	readJSON(t, filepath.Join(dir, "lessons", "1-intro.json"), &lesson)
	raw, _ := os.ReadFile(filepath.Join(dir, "lessons", "1-intro.json"))
	if lesson.Title != "Intro" || strings.Contains(string(raw), "sourceHash") {
		t.Errorf("English lesson changed shape: %s", raw)
	}
	var index LessonIndex
	readJSON(t, filepath.Join(dir, "index.json"), &index)
	if len(index.Lessons) != 2 {
		t.Errorf("English index: %+v", index)
	}
}

// A translated lesson that loads an image from outside the app fails the release check.
func TestVerifyContentLanguagesCatchesForeignImages(t *testing.T) {
	dir := t.TempDir()
	lessonDir := filepath.Join(dir, "lang", "hi", "lessons")
	if err := os.MkdirAll(lessonDir, 0o755); err != nil {
		t.Fatal(err)
	}
	writeJSON(t, filepath.Join(dir, "lang", "hi", "index.json"), LessonIndex{Lessons: []LessonMeta{{ID: "1-intro"}}})
	writeJSON(t, filepath.Join(lessonDir, "1-intro.json"), Lesson{LessonMeta: LessonMeta{ID: "1-intro"},
		Blocks: []Block{{Type: "markdown", Content: "![x](https://example.com/x.png)"}}})
	if err := VerifyContentLanguages(dir); err == nil || !strings.Contains(err.Error(), "outside the app") {
		t.Errorf("got %v", err)
	}
	if err := os.Remove(filepath.Join(lessonDir, "1-intro.json")); err != nil {
		t.Fatal(err)
	}
	if err := VerifyContentLanguages(dir); err == nil || !strings.Contains(err.Error(), "no file") {
		t.Errorf("missing lesson: %v", err)
	}
}

func readJSON(t *testing.T, path string, v any) {
	t.Helper()
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(raw, v); err != nil {
		t.Fatalf("%s: %v", path, err)
	}
}

func writeJSON(t *testing.T, path string, v any) {
	t.Helper()
	raw, _ := json.Marshal(v)
	if err := os.WriteFile(path, raw, 0o644); err != nil {
		t.Fatal(err)
	}
}

// A left-out image takes its credit line with it, in English and in Hindi.
func TestDroppedImageTakesItsCredit(t *testing.T) {
	for _, credit := range []string{"> Sketchnote by [Tomomi Imura](https://twitter.com/girlie_mac)", "> स्केचनोट द्वारा [Tomomi Imura](https://twitter.com/girlie_mac)"} {
		got := dropRe.ReplaceAllString("# शीर्षक\n\n"+droppedImage+"\n\n"+credit+"\n\nपाठ यहाँ।", "")
		if strings.Contains(got, "Tomomi") || !strings.Contains(got, "पाठ यहाँ।") {
			t.Errorf("%q left %q", credit, got)
		}
	}
}
