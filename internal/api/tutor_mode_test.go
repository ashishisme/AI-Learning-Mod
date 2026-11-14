// SPEC: SPEC-013 research R4 (the tutor grounds on the version on screen)
package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestTutorGroundsOnTheShownVersion(t *testing.T) {
	dir := hindiTutorContent(t, "approved")
	for rel, body := range map[string]string{
		"lessons/lesson-1.junior.json":         `{"title":"Kids One","intro":"Hi!","sections":[{"heading":"Robots learn","bigIdea":"Robots learn from examples.","bodyMarkdown":"Lots of them.","teen":{"body":"Teen layer text."}}]}`,
		"lessons/lesson-1.detailed.json":       `{"title":"Detailed One","origin":"own","sections":[{"heading":"What it is","bodyMarkdown":"A precise definition."},{"heading":"Worked example","bodyMarkdown":"Step by step."}]}`,
		"lang/hi/lessons/lesson-1.junior.json": `{"title":"बच्चों का पाठ","sections":[{"heading":"रोबोट सीखते हैं","bodyMarkdown":"उदाहरणों से।"}]}`,
	} {
		p := filepath.Join(dir, rel)
		_ = os.MkdirAll(filepath.Dir(p), 0o755)
		if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	router := NewRouter(RouterConfig{ContentDir: dir, Hosted: true, TutorDisabled: true})
	ask := func(body string) TutorPrepareResponse {
		t.Helper()
		rec := postPrepare(router, body)
		var got TutorPrepareResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil || rec.Code != http.StatusOK {
			t.Fatalf("%d %s", rec.Code, rec.Body.String())
		}
		return got
	}

	kids := ask(`{"lessonId":"lesson-1","question":"How do robots learn?","mode":"junior"}`)
	if kids.Citation != "[Kids One § Robots learn]" || !strings.Contains(kids.Messages[1].Content, "Teen layer text.") {
		t.Errorf("kids: citation %q, prompt %q", kids.Citation, kids.Messages[1].Content)
	}
	detailed := ask(`{"lessonId":"lesson-1","question":"What is it?","mode":"detailed"}`)
	if detailed.Citation != "[Detailed One § What it is]" || !strings.Contains(detailed.Messages[1].Content, "## Worked example") {
		t.Errorf("detailed: citation %q, prompt %q", detailed.Citation, detailed.Messages[1].Content)
	}
	hindi := ask(`{"lessonId":"lesson-1","question":"रोबोट कैसे सीखते हैं?","mode":"junior","lang":"hi"}`)
	if hindi.Citation != "[बच्चों का पाठ § रोबोट सीखते हैं]" {
		t.Errorf("hindi kids: citation %q", hindi.Citation)
	}
	for _, mode := range []string{"plain-english", "standard", ""} {
		got := ask(`{"lessonId":"lesson-1","question":"What is AI?","mode":"` + mode + `"}`)
		if got.Citation != "[Detailed One § What it is]" {
			t.Errorf("mode %q should ground on the Detailed lesson, citation %q", mode, got.Citation)
		}
	}
}
