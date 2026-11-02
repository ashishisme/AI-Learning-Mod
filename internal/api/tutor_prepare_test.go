// SPEC: SPEC-008 FR-021a, FR-034
package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func postPrepare(router http.Handler, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/api/tutor/prepare", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

// FR-021a: a hosted server builds the prompt for the learner's own AI, even with its tutor off.
func TestTutorPrepareReturnsPromptWithoutCallingAModel(t *testing.T) {
	model := &capturingModel{}
	router := NewRouter(RouterConfig{ContentDir: setupTestContent(t), Hosted: true, TutorDisabled: true, ModelClient: model})

	rec := postPrepare(router, `{"lessonId":"lesson-1","question":"What is AI?"}`)
	var got TutorPrepareResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil || rec.Code != http.StatusOK {
		t.Fatalf("%d %s", rec.Code, rec.Body.String())
	}
	if len(got.Messages) != 2 || got.Messages[0].Role != "system" || got.Messages[1].Role != "user" {
		t.Fatalf("messages: %+v", got.Messages)
	}
	if !strings.Contains(got.Messages[0].Content, "[Lesson 1 Title § Lesson 1]") {
		t.Errorf("system prompt lacks the citation instruction: %q", got.Messages[0].Content)
	}
	if !strings.Contains(got.Messages[1].Content, "Introductory text.") || !strings.Contains(got.Messages[1].Content, "What is AI?") {
		t.Errorf("user message: %q", got.Messages[1].Content)
	}
	if got.Citation != "[Lesson 1 Title § Lesson 1]" || got.Fallback != UncitedFallback || got.MaxTokens != MaxCompletionTokens {
		t.Errorf("response: %+v", got)
	}
	if model.calls != 0 {
		t.Error("prepare must never call a model")
	}
}

func TestTutorPrepareScreensAndValidates(t *testing.T) {
	router := NewRouter(RouterConfig{ContentDir: setupTestContent(t), Hosted: true})

	rec := postPrepare(router, `{"lessonId":"lesson-1","question":"My address is 12 Oak Street"}`)
	var got TutorPrepareResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &got)
	if rec.Code != http.StatusOK || got.SafetyReply == "" || len(got.Messages) != 0 || strings.Contains(rec.Body.String(), "Oak Street") {
		t.Errorf("safety: %d %s", rec.Code, rec.Body.String())
	}

	for body, want := range map[string]int{
		`{"lessonId":"nope","question":"Hi"}`:                http.StatusNotFound,
		`{"lessonId":"lesson-1","question":""}`:              http.StatusBadRequest,
		`{"lessonId":"lesson-1","question":"Hi","x":1}`:      http.StatusBadRequest,
		`{"lessonId":"lesson-1","question":"Hi","mode":"?"}`: http.StatusBadRequest,
	} {
		if rec := postPrepare(router, body); rec.Code != want {
			t.Errorf("%s: %d, want %d", body, rec.Code, want)
		}
	}
}

// Self-hosted runs already reach the learner's AI through the server, so there is no prepare route.
func TestTutorPrepareIsHostedOnly(t *testing.T) {
	router := NewRouter(RouterConfig{ContentDir: setupTestContent(t)})
	if rec := postPrepare(router, `{"lessonId":"lesson-1","question":"Hi"}`); rec.Code != http.StatusNotFound {
		t.Errorf("self-hosted: %d", rec.Code)
	}
}
