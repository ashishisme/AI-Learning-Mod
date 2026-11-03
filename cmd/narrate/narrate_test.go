// SPEC: SPEC-009 FR-012, FR-014, FR-015, SC-009
package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"ai-foundations-coach/internal/narration"
)

const token = "ya29.test-token-0123456789"

func repo(t *testing.T, sectionBody string) string {
	t.Helper()
	root := t.TempDir()
	for p, body := range map[string]string{
		"public-content/languages.json":                      `{"languages":[{"code":"hi","name":"हिन्दी","speechLang":"hi-IN","status":"hidden"}]}`,
		"web/src/i18n/en.json":                               `{"narration.chipSays":"Chip says: ","adaptive.chipGreeting":"Hello!"}`,
		"web/src/i18n/hi.json":                               `{"narration.chipSays":"चिप कहता है: ","adaptive.chipGreeting":"नमस्ते!"}`,
		"content/voices/hi.json":                             `{"language":"hi","personas":{"chip":{"voice":"hi-IN-Wavenet-A","speakingRate":1,"pitch":0},"nova":{"voice":"hi-IN-Wavenet-D","speakingRate":0.95,"pitch":0},"alan":{"voice":"hi-IN-Wavenet-B","speakingRate":1,"pitch":-1}}}`,
		"public-content/lang/hi/lessons/1-intro.junior.json": `{"lessonId":"1-intro","mode":"junior","sections":[{"id":"what","heading":"क्या","bodyMarkdown":"` + sectionBody + `"}]}`,
	} {
		f := filepath.Join(root, filepath.FromSlash(p))
		if err := os.MkdirAll(filepath.Dir(f), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(f, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return root
}

// fakeTTS answers with "MP3:<voice>:<bytes of text>" so joins and voices are visible.
type fakeTTS struct {
	mu       sync.Mutex
	requests []map[string]any
	headers  []http.Header
	fail     bool
}

func (f *fakeTTS) server(t *testing.T) *httptest.Server {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req map[string]any
		_ = json.NewDecoder(r.Body).Decode(&req)
		f.mu.Lock()
		f.requests = append(f.requests, req)
		f.headers = append(f.headers, r.Header.Clone())
		f.mu.Unlock()
		if f.fail || r.URL.Path != "/v1/text:synthesize" {
			w.WriteHeader(http.StatusForbidden)
			_, _ = w.Write([]byte(`{"error":{"message":"denied for ` + r.Header.Get("Authorization") + `"}}`))
			return
		}
		text := req["input"].(map[string]any)["text"].(string)
		voice := req["voice"].(map[string]any)["name"].(string)
		audio := "MP3:" + voice + ":" + text + "|"
		_ = json.NewEncoder(w).Encode(map[string]string{"audioContent": base64.StdEncoding.EncodeToString([]byte(audio))})
	}))
	t.Cleanup(srv.Close)
	return srv
}

func runNarrate(t *testing.T, root string, srv *httptest.Server, args ...string) (int, string) {
	t.Helper()
	env := map[string]string{"TTS_ACCESS_TOKEN": token, "TTS_PROJECT": "ai-learning-test"}
	if srv != nil {
		env["TTS_ENDPOINT"] = srv.URL
	}
	var out bytes.Buffer
	code := run(root, args, func(k string) string { return env[k] }, &out, &out)
	if strings.Contains(out.String(), token) {
		t.Fatalf("the token appeared in the output:\n%s", out.String())
	}
	return code, out.String()
}

func TestNarrateRecordsEveryTrackInEveryPersonaOnce(t *testing.T) {
	root := repo(t, "पहला वाक्य।")
	fake := &fakeTTS{}
	srv := fake.server(t)
	if code, out := runNarrate(t, root, srv, "-lang", "hi"); code != 0 {
		t.Fatalf("exit %d\n%s", code, out)
	}
	// 2 tracks (default greeting, one section) x 3 personas.
	if len(fake.requests) != 6 {
		t.Fatalf("%d requests", len(fake.requests))
	}
	first := fake.requests[0]
	if first["voice"].(map[string]any)["languageCode"] != "hi-IN" || first["audioConfig"].(map[string]any)["audioEncoding"] != "MP3" {
		t.Errorf("request: %v", first)
	}
	if fake.headers[0].Get("Authorization") != "Bearer "+token || fake.headers[0].Get("X-Goog-User-Project") != "ai-learning-test" {
		t.Errorf("headers: %v", fake.headers[0])
	}
	m, _ := narration.LoadManifest(root, "hi")
	rec := m.Tracks["1-intro/junior/section-what"]["nova"]
	audio, err := os.ReadFile(filepath.Join(narration.AudioDir(root, "hi"), rec.File))
	if err != nil || rec.File != "1-intro/junior/section-what-nova.mp3" || string(audio) != "MP3:hi-IN-Wavenet-D:क्या. पहला वाक्य।|" || rec.Bytes != len(audio) {
		t.Errorf("recording %+v: %q %v", rec, audio, err)
	}
	if code, out := runNarrate(t, root, nil, "-lang", "hi", "-check"); code != 0 {
		t.Errorf("check after a full run: exit %d\n%s", code, out)
	}

	// A second run with nothing changed makes no request and bills nothing (SC-009).
	before := len(fake.requests)
	code, out := runNarrate(t, root, srv, "-lang", "hi")
	if code != 0 || len(fake.requests) != before || !strings.Contains(out, "0 recorded, 0 characters billed") {
		t.Errorf("second run: exit %d, %d requests\n%s", code, len(fake.requests)-before, out)
	}
}

func TestNarrateRecordsOnlyWhatChanged(t *testing.T) {
	root := repo(t, "पहला वाक्य।")
	fake := &fakeTTS{}
	srv := fake.server(t)
	runNarrate(t, root, srv, "-lang", "hi")
	lesson := filepath.Join(root, "public-content/lang/hi/lessons/1-intro.junior.json")
	b, _ := os.ReadFile(lesson)
	_ = os.WriteFile(lesson, []byte(strings.Replace(string(b), "पहला", "नया", 1)), 0o644)

	if code, out := runNarrate(t, root, nil, "-lang", "hi", "-check"); code != 1 || !strings.Contains(out, "hi 1-intro/junior/section-what: chip: recording is out of date") {
		t.Errorf("check after a change: exit %d\n%s", code, out)
	}
	before := len(fake.requests)
	if code, out := runNarrate(t, root, srv, "-lang", "hi"); code != 0 || len(fake.requests)-before != 3 {
		t.Errorf("re-record: exit %d, %d requests\n%s", code, len(fake.requests)-before, out)
	}
}

func TestNarrateSplitsLongTextAtSentenceEnds(t *testing.T) {
	sentence := strings.Repeat("क", 300) + "। "   // 902 bytes
	root := repo(t, strings.Repeat(sentence, 12)) // about 10.8 KB
	fake := &fakeTTS{}
	srv := fake.server(t)
	if code, out := runNarrate(t, root, srv, "-lang", "hi", "-only", "1-intro/junior/section-what"); code != 0 {
		t.Fatalf("exit %d\n%s", code, out)
	}
	if len(fake.requests) != 9 { // 3 parts per persona
		t.Fatalf("%d requests", len(fake.requests))
	}
	for _, r := range fake.requests {
		text := r["input"].(map[string]any)["text"].(string)
		if len(text) > maxBytes || !strings.HasSuffix(text, "।") {
			t.Errorf("part of %d bytes ends %q", len(text), text[len(text)-6:])
		}
	}
	m, _ := narration.LoadManifest(root, "hi")
	audio, _ := os.ReadFile(filepath.Join(narration.AudioDir(root, "hi"), m.Tracks["1-intro/junior/section-what"]["chip"].File))
	if strings.Count(string(audio), "MP3:hi-IN-Wavenet-A:") != 3 {
		t.Errorf("parts were not joined into one file: %d bytes", len(audio))
	}
}

func TestNarrateDryRunAndSample(t *testing.T) {
	root := repo(t, "पहला वाक्य।")
	fake := &fakeTTS{}
	srv := fake.server(t)
	code, out := runNarrate(t, root, srv, "-lang", "hi", "-dry-run")
	if code != 0 || len(fake.requests) != 0 || !strings.Contains(out, "6 recordings to make") {
		t.Errorf("dry run: exit %d, %d requests\n%s", code, len(fake.requests), out)
	}
	code, out = runNarrate(t, root, srv, "-lang", "hi", "-sample", "hi-IN-Neural2-A")
	audio, err := os.ReadFile(filepath.Join(root, "narration-sample-hi-IN-Neural2-A.mp3"))
	if code != 0 || err != nil || string(audio) != "MP3:hi-IN-Neural2-A:नमस्ते!|" {
		t.Errorf("sample: exit %d %q %v\n%s", code, audio, err, out)
	}
	if _, err := os.Stat(filepath.Join(narration.AudioDir(root, "hi"), "manifest.json")); !os.IsNotExist(err) {
		t.Error("a sample or dry run wrote the manifest")
	}
}

func TestNarrateNeverPrintsTheToken(t *testing.T) {
	root := repo(t, "पहला वाक्य।")
	srv := (&fakeTTS{fail: true}).server(t)
	code, out := runNarrate(t, root, srv, "-lang", "hi") // runNarrate fails the test on a leak
	if code != 1 || !strings.Contains(out, "[redacted]") {
		t.Errorf("exit %d\n%s", code, out)
	}
}

func TestNarrateUsage(t *testing.T) {
	root := repo(t, "x")
	for _, args := range [][]string{{"-lang", "xx"}, {"-lang", "en"}, {"-lang", "hi", "-only", "nope"}} {
		if code, out := runNarrate(t, root, nil, args...); code != 2 {
			t.Errorf("%v: exit %d\n%s", args, code, out)
		}
	}
	_ = os.WriteFile(filepath.Join(root, "content/voices/hi.json"), []byte(`{"personas":{"chip":{"voice":""}}}`), 0o644)
	if code, out := runNarrate(t, root, nil, "-lang", "hi"); code != 2 || !strings.Contains(out, "choose a voice") {
		t.Errorf("no voice: exit %d\n%s", code, out)
	}
	var out bytes.Buffer
	root = repo(t, "x")
	if code := run(root, []string{"-lang", "hi"}, func(string) string { return "" }, &out, &out); code != 2 {
		t.Errorf("no token: exit %d", code)
	}
}
