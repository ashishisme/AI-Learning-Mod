// SPEC: SPEC-009 FR-025, FR-026; FR-TUT-06 (amended), Constitution II (2.4.0)
package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"ai-foundations-coach/internal/i18n"
)

// hindiTutorContent is the English test content plus an approved (or hidden) Hindi lesson-1.
func hindiTutorContent(t *testing.T, status string) string {
	t.Helper()
	dir := setupTestContent(t)
	for rel, body := range map[string]string{
		"languages.json":                `{"languages":[{"code":"hi","name":"हिन्दी","speechLang":"hi-IN","status":"` + status + `"}]}`,
		"lang/hi/lessons/lesson-1.json": `{"id":"lesson-1","title":"पाठ 1 शीर्षक","blocks":[{"type":"markdown","content":"# परिचय\n\nएआई उदाहरणों से सीखता है।"}]}`,
	} {
		p := filepath.Join(dir, rel)
		_ = os.MkdirAll(filepath.Dir(p), 0o755)
		if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

func TestTutorPrepareInHindi(t *testing.T) {
	router := NewRouter(RouterConfig{ContentDir: hindiTutorContent(t, "approved"), Hosted: true, TutorDisabled: true})
	var got TutorPrepareResponse
	rec := postPrepare(router, `{"lessonId":"lesson-1","question":"एआई कैसे सीखता है?","lang":"hi"}`)
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil || rec.Code != http.StatusOK {
		t.Fatalf("%d %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(got.Messages[1].Content, "एआई उदाहरणों से सीखता है।") || !strings.Contains(got.Messages[1].Content, "Lesson: पाठ 1 शीर्षक") {
		t.Errorf("the prompt does not use the Hindi lesson: %q", got.Messages[1].Content)
	}
	if !strings.Contains(got.Messages[0].Content, "हिन्दी") || !strings.Contains(got.Messages[0].Content, "[पाठ 1 शीर्षक § परिचय]") {
		t.Errorf("system prompt: %q", got.Messages[0].Content)
	}
	if got.Citation != "[पाठ 1 शीर्षक § परिचय]" || got.Fallback != i18n.UncitedFallback("hi") || got.Fallback == UncitedFallback {
		t.Errorf("citation %q, fallback %q", got.Citation, got.Fallback)
	}

	// The safety reply is in Hindi too, and no prompt is returned.
	got = TutorPrepareResponse{}
	_ = json.Unmarshal(postPrepare(router, `{"lessonId":"lesson-1","question":"mera ghar ka pata 12 mg road hai","lang":"hi"}`).Body.Bytes(), &got)
	if got.SafetyReply != i18n.SafetyReply("hi", "personal-info") || len(got.Messages) != 0 {
		t.Errorf("safety: %+v", got)
	}
}

func TestTutorLanguageFallsBackToEnglish(t *testing.T) {
	for name, c := range map[string]struct{ status, lang string }{
		"unknown": {"approved", "zz"},
		"unsafe":  {"approved", "../hi"},
		"hidden":  {"hidden", "hi"},
		"none":    {"approved", ""},
	} {
		router := NewRouter(RouterConfig{ContentDir: hindiTutorContent(t, c.status), Hosted: true, TutorDisabled: true})
		body := `{"lessonId":"lesson-1","question":"What is AI?","lang":"` + c.lang + `"}`
		var got TutorPrepareResponse
		rec := postPrepare(router, body)
		if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil || rec.Code != http.StatusOK {
			t.Fatalf("%s: %d %s", name, rec.Code, rec.Body.String())
		}
		if got.Citation != "[Lesson 1 Title § Lesson 1]" || got.Fallback != UncitedFallback || strings.Contains(got.Messages[0].Content, "हिन्दी") {
			t.Errorf("%s: %+v", name, got)
		}
	}
	// Unknown fields are still refused.
	router := NewRouter(RouterConfig{ContentDir: hindiTutorContent(t, "approved"), Hosted: true, TutorDisabled: true})
	if rec := postPrepare(router, `{"lessonId":"lesson-1","question":"x","lang":"hi","voice":"x"}`); rec.Code != http.StatusBadRequest {
		t.Errorf("unknown field: %d", rec.Code)
	}
}

func TestHostedTutorAnswersInHindi(t *testing.T) {
	model := &capturingModel{answer: "यह उदाहरणों से सीखता है, बिना हवाले के।"}
	router := NewRouter(RouterConfig{ContentDir: hindiTutorContent(t, "approved"), ModelClient: model})
	rec := tutorPost(router, `{"lessonId":"lesson-1","question":"एआई कैसे सीखता है?","lang":"hi"}`, nil)
	if rec.Code != http.StatusOK || model.calls != 1 {
		t.Fatalf("%d calls=%d %s", rec.Code, model.calls, rec.Body.String())
	}
	if sys := model.last.Messages[0].Content; !strings.Contains(sys, "हिन्दी") {
		t.Errorf("system prompt has no Hindi instruction: %q", sys)
	}
	if !strings.Contains(model.last.Messages[1].Content, "पाठ 1 शीर्षक") {
		t.Errorf("user message does not use the Hindi lesson")
	}
	// An uncited answer is replaced by the Hindi fallback (FR-TUT-06 as amended).
	if !strings.Contains(rec.Body.String(), i18n.UncitedFallback("hi")) {
		t.Errorf("want the Hindi fallback, got %s", rec.Body.String())
	}

	// A blocked question gets the Hindi safety reply and never reaches the model.
	calls := model.calls
	rec = tutorPost(router, `{"lessonId":"lesson-1","question":"मैं मरना चाहता हूँ","lang":"hi"}`, nil)
	if model.calls != calls || !strings.Contains(rec.Body.String(), i18n.SafetyReply("hi", "self-harm")) {
		t.Errorf("safety: calls %d→%d %s", calls, model.calls, rec.Body.String())
	}
}
