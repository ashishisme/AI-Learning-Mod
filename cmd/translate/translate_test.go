// SPEC: SPEC-009 FR-007, FR-008, FR-017, FR-020, FR-021
package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"ai-foundations-coach/internal/i18n"
)

const secret = "sk-test-0123456789abcdef"

const enLesson = `{"lessonId":"1-intro","mode":"junior","title":"Meet AI","readingTimeMinutes":5,
"mascot":{"name":"Chip","avatar":"🤖","greeting":"Hi there!"},
"sections":[{"id":"what-is-ai","heading":"What is AI?","bodyMarkdown":"## Big idea\n- A **neural network** learns.\n- See ` + "`model.fit()`" + ` and [docs](https://example.org/a)."}],
"miniQuiz":[{"question":"Can AI learn?","options":["Yes","No"],"correctIndex":0,"praise":"Great!"}]}`

func repo(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	for p, body := range map[string]string{
		"public-content/languages.json":              `{"languages":[{"code":"hi","name":"हिन्दी","speechLang":"hi-IN","status":"hidden"}]}`,
		"public-content/lessons/1-intro.junior.json": enLesson,
		"web/src/i18n/en.json":                       `{"a.hello":"Hello {name}","b.bold":"<b>{n}</b> left"}`,
		"web/src/data/quizzes/en.json":               `{"1-intro":{"lessonId":"1-intro","title":"Intro","description":"D","questions":[{"id":"q1","prompt":"P?","options":["a","b"],"correctIndex":1,"rationale":"R","hintKeyword":"k"}]}}`,
		"content/glossary/hi.json":                   `{"language":"hi","terms":[{"en":"neural network","target":"तंत्रिका नेटवर्क","note":""}]}`,
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

// fakeModel answers each text with a Hindi marker at the end, which keeps all Markdown intact.
// breakText, when set, makes that text lose its Markdown heading.
type fakeModel struct {
	mu         sync.Mutex
	requests   []map[string]any
	breakText  string
	failStatus int
	busyFirst  int // answer 429 to this many requests first
}

func (f *fakeModel) server(t *testing.T) *httptest.Server {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req map[string]any
		_ = json.NewDecoder(r.Body).Decode(&req)
		f.mu.Lock()
		f.requests = append(f.requests, req)
		f.mu.Unlock()
		if f.busyFirst > 0 {
			f.busyFirst--
			w.WriteHeader(http.StatusTooManyRequests)
			_, _ = w.Write([]byte(`{"error":{"message":"rate limited","type":"rate"}}`))
			return
		}
		if f.failStatus != 0 {
			// A badly behaved endpoint that echoes the credential back in its error.
			w.WriteHeader(f.failStatus)
			_, _ = w.Write([]byte(`{"error":{"message":"bad key ` + r.Header.Get("Authorization") + `","type":"auth"}}`))
			return
		}
		msgs := req["messages"].([]any)
		var in map[string]string
		_ = json.Unmarshal([]byte(msgs[1].(map[string]any)["content"].(string)), &in)
		out := map[string]string{}
		for k, v := range in {
			out[k] = v + " हिं"
			if f.breakText != "" && v == f.breakText {
				out[k] = strings.TrimPrefix(v, "## ")
			}
		}
		content, _ := json.Marshal(out)
		_ = json.NewEncoder(w).Encode(map[string]any{"id": "x", "object": "chat.completion", "model": "m",
			"choices": []any{map[string]any{"index": 0, "message": map[string]any{"role": "assistant", "content": string(content)}, "finish_reason": "stop"}}})
	}))
	t.Cleanup(srv.Close)
	return srv
}

func runTranslate(t *testing.T, root string, srv *httptest.Server, args ...string) (int, string) {
	t.Helper()
	env := map[string]string{"TRANSLATE_API_KEY": secret, "TRANSLATE_MODEL": "m"}
	if srv != nil {
		env["TRANSLATE_BASE_URL"] = srv.URL + "/v1"
	}
	var out bytes.Buffer
	code := run(root, args, func(k string) string { return env[k] }, &out, &out)
	if strings.Contains(out.String(), secret) {
		t.Fatalf("the key appeared in the output:\n%s", out.String())
	}
	return code, out.String()
}

func TestTranslateSendsOnlyAllowlistedFieldsWithTheGlossary(t *testing.T) {
	root := repo(t)
	fake := &fakeModel{}
	srv := fake.server(t)
	if code, out := runTranslate(t, root, srv, "-lang", "hi", "-kind", "adaptive"); code != 0 {
		t.Fatalf("exit %d\n%s", code, out)
	}
	if len(fake.requests) != 1 {
		t.Fatalf("%d requests", len(fake.requests))
	}
	msgs := fake.requests[0]["messages"].([]any)
	system := msgs[0].(map[string]any)["content"].(string)
	if !strings.Contains(system, "neural network: तंत्रिका नेटवर्क") || !strings.Contains(system, "in brackets") {
		t.Errorf("glossary or bracket rule missing from the prompt:\n%s", system)
	}
	var sent map[string]string
	_ = json.Unmarshal([]byte(msgs[1].(map[string]any)["content"].(string)), &sent)
	var texts []string
	for _, v := range sent {
		texts = append(texts, v)
	}
	joined := strings.Join(texts, "|")
	for _, want := range []string{"Meet AI", "What is AI?", "Can AI learn?", "Yes", "Great!", "Hi there!"} {
		if !strings.Contains(joined, want) {
			t.Errorf("%q was not sent", want)
		}
	}
	for _, never := range []string{"1-intro", "junior", "what-is-ai", "🤖"} {
		if strings.Contains(joined, never) {
			t.Errorf("%q is never translated but was sent", never)
		}
	}

	// The file keeps every never-translated value, and a draft is recorded with both hashes.
	var got map[string]any
	raw, _ := os.ReadFile(filepath.Join(root, "public-content/lang/hi/lessons/1-intro.junior.json"))
	_ = json.Unmarshal(raw, &got)
	if got["lessonId"] != "1-intro" || got["mode"] != "junior" || got["title"] != "Meet AI हिं" {
		t.Errorf("translated file: %s", raw)
	}
	tg := i18n.Target{Path: "public-content/lang/hi/lessons/1-intro.junior.json", Source: "public-content/lessons/1-intro.junior.json", Kind: i18n.KindAdaptive}
	if p := i18n.Parity(root, tg); len(p) != 0 {
		t.Errorf("parity: %v", p)
	}
	l, _ := i18n.LoadLedger(root, "hi")
	e := l.Find(tg.Path)
	src, _ := i18n.SourceHash(root, tg)
	tr, _ := i18n.HashFile(filepath.Join(root, filepath.FromSlash(tg.Path)))
	if e == nil || e.Status != i18n.ReviewDraft || e.Kind != i18n.KindAdaptive || e.SourceHash != src || e.TranslationHash != tr {
		t.Errorf("ledger entry: %+v", e)
	}
}

func TestTranslateUICatalogueKeepsMarks(t *testing.T) {
	root := repo(t)
	srv := (&fakeModel{}).server(t)
	if code, out := runTranslate(t, root, srv, "-lang", "hi", "-kind", "ui"); code != 0 {
		t.Fatalf("exit %d\n%s", code, out)
	}
	raw, _ := os.ReadFile(filepath.Join(root, "web/src/i18n/hi.json"))
	if !strings.Contains(string(raw), `"<b>{n}</b> left हिं"`) {
		t.Errorf("catalogue: %s", raw)
	}
}

func TestTranslateRejectsBrokenMarkdown(t *testing.T) {
	root := repo(t)
	var lesson map[string]any
	_ = json.Unmarshal([]byte(enLesson), &lesson)
	body := lesson["sections"].([]any)[0].(map[string]any)["bodyMarkdown"].(string)
	srv := (&fakeModel{breakText: body}).server(t)
	code, out := runTranslate(t, root, srv, "-lang", "hi", "-kind", "adaptive")
	if code != 1 || !strings.Contains(out, "sections[0].bodyMarkdown: headings") || !strings.Contains(out, "nothing written") {
		t.Errorf("exit %d\n%s", code, out)
	}
	if _, err := os.Stat(filepath.Join(root, "public-content/lang/hi/lessons/1-intro.junior.json")); !os.IsNotExist(err) {
		t.Error("a broken translation was written")
	}
	if l, _ := i18n.LoadLedger(root, "hi"); len(l.Entries) != 0 {
		t.Errorf("ledger changed: %+v", l.Entries)
	}
}

func TestTranslateLeavesApprovedFilesAlone(t *testing.T) {
	root := repo(t)
	fake := &fakeModel{}
	srv := fake.server(t)
	runTranslate(t, root, srv, "-lang", "hi", "-kind", "quiz")
	l, _ := i18n.LoadLedger(root, "hi")
	e := l.Find("web/src/data/quizzes/hi.json")
	e.Status, e.Reviewer, e.Date = i18n.ReviewApproved, "reviewer-1", "2026-11-03"
	_ = l.Save(root)

	before := len(fake.requests)
	code, out := runTranslate(t, root, srv, "-lang", "hi", "-kind", "quiz")
	if code != 0 || len(fake.requests) != before || !strings.Contains(out, "approved and current") {
		t.Errorf("approved file was redone: exit %d, %d requests\n%s", code, len(fake.requests)-before, out)
	}
	if code, out := runTranslate(t, root, srv, "-lang", "hi", "-kind", "quiz", "-force"); code != 0 || len(fake.requests) != before+1 {
		t.Errorf("-force: exit %d\n%s", code, out)
	}
	if l, _ := i18n.LoadLedger(root, "hi"); l.Find("web/src/data/quizzes/hi.json").Status != i18n.ReviewDraft {
		t.Error("a forced redo kept the approval")
	}
}

func TestTranslateDryRunMakesNoRequest(t *testing.T) {
	root := repo(t)
	fake := &fakeModel{}
	srv := fake.server(t)
	var out bytes.Buffer
	// No key or model is needed for a dry run.
	code := run(root, []string{"-lang", "hi", "-dry-run"}, func(k string) string {
		if k == "TRANSLATE_BASE_URL" {
			return srv.URL + "/v1"
		}
		return ""
	}, &out, &out)
	if code != 0 || len(fake.requests) != 0 || !strings.Contains(out.String(), "no request made") {
		t.Errorf("exit %d, %d requests\n%s", code, len(fake.requests), out.String())
	}
	if _, err := os.Stat(filepath.Join(root, "content/review/hi.json")); !os.IsNotExist(err) {
		t.Error("a dry run wrote the ledger")
	}
}

func TestTranslateNeverPrintsTheKey(t *testing.T) {
	root := repo(t)
	srv := (&fakeModel{failStatus: http.StatusUnauthorized}).server(t)
	code, out := runTranslate(t, root, srv, "-lang", "hi", "-kind", "ui") // runTranslate fails the test on a leak
	if code != 1 || !strings.Contains(out, "model request failed") || !strings.Contains(out, "[redacted]") {
		t.Errorf("exit %d\n%s", code, out)
	}
}

func TestTranslateUsage(t *testing.T) {
	root := repo(t)
	for _, args := range [][]string{{"-lang", "xx"}, {"-lang", "en"}, {"-lang", "hi", "-kind", "base"}, {"-lang", "hi", "-only", "nope.json"}} {
		if code, out := runTranslate(t, root, nil, args...); code != 2 {
			t.Errorf("%v: exit %d\n%s", args, code, out)
		}
	}
	var out bytes.Buffer
	if code := run(root, []string{"-lang", "hi"}, func(string) string { return "" }, &out, &out); code != 2 {
		t.Errorf("no key: exit %d", code)
	}
}

// A rate limit is waited out and retried; the file is still written once.
func TestTranslateRetriesWhenRateLimited(t *testing.T) {
	old := retryWaits
	retryWaits = []time.Duration{0, 0, 0}
	defer func() { retryWaits = old }()
	root := repo(t)
	fake := &fakeModel{busyFirst: 2}
	srv := fake.server(t)
	if code, out := runTranslate(t, root, srv, "-lang", "hi", "-kind", "ui"); code != 0 || len(fake.requests) != 3 {
		t.Fatalf("exit %d after %d requests\n%s", code, len(fake.requests), out)
	}
	if _, err := os.Stat(filepath.Join(root, "web/src/i18n/hi.json")); err != nil {
		t.Error("the catalogue was not written after the retries")
	}
}
