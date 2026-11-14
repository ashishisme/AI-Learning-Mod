// SPEC: SPEC-009 FR-028, US7 — a second language needs content, not code
package i18n_test

import (
	"encoding/json"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"testing"

	"ai-foundations-coach/internal/api"
	"ai-foundations-coach/internal/i18n"
	"ai-foundations-coach/internal/ingest"
	"ai-foundations-coach/internal/narration"
)

// A fixture Tamil ("ta") with every file translated, reviewed and recorded is offered, served and
// passes the release checks, using only content files.
func TestASecondLanguageNeedsOnlyContent(t *testing.T) {
	root := t.TempDir()
	files := map[string]string{
		"public-content/index.json":                                 `{"lessons":[{"id":"1-intro","module":"intro","title":"Intro","order":0}]}`,
		"public-content/lessons/1-intro.junior.json":                `{"lessonId":"1-intro","mode":"junior","origin":"own","title":"Kids","sections":[{"id":"s1","heading":"What","bodyMarkdown":"AI learns."}]}`,
		"public-content/lessons/1-intro.plain-english.json":         `{"lessonId":"1-intro","mode":"plain-english","origin":"own","title":"Plain","sections":[{"id":"s1","heading":"What","bodyMarkdown":"AI learns."}]}`,
		"public-content/lessons/1-intro.detailed.json":              `{"lessonId":"1-intro","mode":"detailed","origin":"own","title":"Intro: in depth","sections":[{"id":"s1","heading":"What","bodyMarkdown":"AI learns."}]}`,
		"public-content/languages.json":                             `{"languages":[{"code":"ta","name":"தமிழ்","speechLang":"ta-IN","status":"approved"}]}`,
		"public-content/lang/ta/index.json":                         `{"lessons":[{"id":"1-intro","module":"intro","title":"அறிமுகம்","order":0}]}`,
		"public-content/lang/ta/lessons/1-intro.junior.json":        `{"lessonId":"1-intro","mode":"junior","origin":"own","title":"குழந்தைகள்","sections":[{"id":"s1","heading":"என்ன","bodyMarkdown":"AI கற்கிறது."}]}`,
		"public-content/lang/ta/lessons/1-intro.plain-english.json": `{"lessonId":"1-intro","mode":"plain-english","origin":"own","title":"எளிய","sections":[{"id":"s1","heading":"என்ன","bodyMarkdown":"AI கற்கிறது."}]}`,
		"public-content/lang/ta/lessons/1-intro.detailed.json":      `{"lessonId":"1-intro","mode":"detailed","origin":"own","title":"அறிமுகம்: ஆழமாக","sections":[{"id":"s1","heading":"என்ன","bodyMarkdown":"AI கற்கிறது."}]}`,
		"web/src/i18n/en.json":                                      `{"a.hello":"Hello","adaptive.chipGreeting":"Hi!","narration.chipSays":"Chip says: "}`,
		"web/src/i18n/ta.json":                                      `{"a.hello":"வணக்கம்","adaptive.chipGreeting":"வணக்கம்!","narration.chipSays":"சிப் சொல்கிறது: "}`,
		"web/src/data/quizzes/en.json":                              `{}`,
		"web/src/data/quizzes/ta.json":                              `{}`,
		"content/voices/ta.json":                                    `{"personas":{"chip":{"voice":"ta-IN-Wavenet-A"},"nova":{"voice":"ta-IN-Wavenet-C"},"alan":{"voice":"ta-IN-Wavenet-B"}}}`,
	}
	for p, body := range files {
		write(t, filepath.Join(root, filepath.FromSlash(p)), body)
	}
	approve(t, root, "ta")
	record(t, root, "ta")
	contentDir := filepath.Join(root, "public-content")

	// The release checks pass: content, review ledger and parity, recordings.
	if err := ingest.VerifyContent(contentDir); err != nil {
		t.Errorf("content: %v", err)
	}
	if ps := i18n.Check(root, "ta"); len(ps) != 0 {
		t.Errorf("review: %v", ps)
	}
	if ps, err := narration.Check(root, "ta"); err != nil || len(ps) != 0 {
		t.Errorf("recordings: %v %v", ps, err)
	}

	// The app offers and serves it.
	router := api.NewRouter(api.RouterConfig{ContentDir: contentDir})
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/runtime", nil))
	var runtime struct {
		Languages []struct{ Code, SpeechLang string }
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &runtime)
	if len(runtime.Languages) != 2 || runtime.Languages[1].Code != "ta" || runtime.Languages[1].SpeechLang != "ta-IN" {
		t.Errorf("runtime languages: %s", rec.Body.String())
	}
	for _, url := range []string{"/api/lessons/1-intro?lang=ta", "/api/lessons/1-intro?lang=ta&mode=junior", "/api/lessons?lang=ta"} {
		rec = httptest.NewRecorder()
		router.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, url, nil))
		if rec.Code != http.StatusOK || rec.Header().Get("Content-Language") != "ta" {
			t.Errorf("%s: %d %q", url, rec.Code, rec.Header().Get("Content-Language"))
		}
	}
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/audio/ta/manifest.json", nil))
	if rec.Code != http.StatusOK {
		t.Errorf("audio manifest: %d", rec.Code)
	}
}

// Hindi is content, not code: outside catalogues and tests, no source names a language code.
func TestNoSourceHardCodesHindi(t *testing.T) {
	repo := filepath.Join("..", "..")
	allowed := map[string]bool{
		filepath.FromSlash("internal/i18n/messages.go"): true, // the server's own message catalogue
	}
	code := regexp.MustCompile(`["'](hi|hi-IN)["']`)
	var found []string
	for _, dir := range []string{"cmd", "internal", filepath.FromSlash("web/src")} {
		_ = filepath.WalkDir(filepath.Join(repo, dir), func(p string, d fs.DirEntry, err error) error {
			if err != nil || d.IsDir() {
				return err
			}
			rel, _ := filepath.Rel(repo, p)
			ext := filepath.Ext(p)
			if (ext != ".go" && ext != ".ts" && ext != ".tsx") || strings.HasSuffix(p, "_test.go") || allowed[rel] {
				return nil
			}
			raw, _ := os.ReadFile(p)
			for i, line := range strings.Split(string(raw), "\n") {
				if code.MatchString(line) && !strings.HasPrefix(strings.TrimSpace(line), "//") {
					found = append(found, rel+":"+strconv.Itoa(i+1))
				}
			}
			return nil
		})
	}
	if len(found) > 0 {
		t.Errorf("hard-coded Hindi language code: %v", found)
	}
}

func approve(t *testing.T, root, code string) {
	t.Helper()
	targets, err := i18n.Targets(root, code)
	if err != nil {
		t.Fatal(err)
	}
	l := &i18n.Ledger{Language: code}
	for _, tg := range targets {
		src, err := i18n.SourceHash(root, tg)
		if err != nil {
			t.Fatal(err)
		}
		tr, _ := i18n.HashFile(filepath.Join(root, filepath.FromSlash(tg.Path)))
		l.Entries = append(l.Entries, i18n.Entry{Path: tg.Path, Kind: tg.Kind, SourceHash: src, TranslationHash: tr, Status: i18n.ReviewApproved, Reviewer: "reviewer", Date: "2026-11-03"})
	}
	if err := l.Save(root); err != nil {
		t.Fatal(err)
	}
}

func record(t *testing.T, root, code string) {
	t.Helper()
	tracks, err := narration.Tracks(root, code)
	if err != nil {
		t.Fatal(err)
	}
	voices, _ := narration.Voices(root, code)
	m := &narration.Manifest{Language: code, Tracks: map[string]map[string]narration.Recording{}}
	for _, tr := range tracks {
		m.Tracks[tr.Key] = map[string]narration.Recording{}
		for _, p := range narration.Personas {
			file := narration.FileFor(tr.Key, p)
			write(t, filepath.Join(narration.AudioDir(root, code), filepath.FromSlash(file)), "mp3")
			m.Tracks[tr.Key][p] = narration.Recording{File: file, Hash: narration.Hash(voices[p], tr.Text), Bytes: 3}
		}
	}
	raw, _ := json.Marshal(m)
	write(t, filepath.Join(narration.AudioDir(root, code), "manifest.json"), string(raw))
}

func write(t *testing.T, p, body string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
}
