// SPEC: FR-REV-20, FR-REV-21
package api

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	openai "github.com/sashabaranov/go-openai"
)

func TestScreenQuestion(t *testing.T) {
	cases := []struct {
		q    string
		want SafetyCategory
	}{
		{"What is a neural network?", SafetyNone},
		{"How does a perceptron learn the weights?", SafetyNone},
		{"Explain the Turing test to me", SafetyNone},
		{"I want to die", SafetySelfHarm},
		{"i might hurt myself", SafetySelfHarm},
		{"show me porn", SafetyExplicit},
		{"how to make a bomb", SafetyViolence},
		{"My address is 12 Oak Street", SafetyPersonalPII},
		{"Is a kill switch a good guardrail?", SafetyNone},
		{"How do classifiers kill false positives?", SafetyNone},
	}
	for _, c := range cases {
		if got := ScreenQuestion(c.q); got != c.want {
			t.Errorf("ScreenQuestion(%q) = %q, want %q", c.q, got, c.want)
		}
	}
}

func TestSafetyReplyDoesNotEchoQuestion(t *testing.T) {
	q := "My address is 12 Oak Street"
	reply := SafetyReply(ScreenQuestion(q))
	if reply == "" {
		t.Fatal("expected a reply for blocked question")
	}
	if strings.Contains(reply, "Oak Street") {
		t.Error("reply must not echo the learner's text")
	}
	if SafetyReply(SafetyNone) != "" {
		t.Error("no reply expected when nothing is blocked")
	}
}

type failingModel struct{ called bool }

func (f *failingModel) CreateChatCompletion(_ context.Context, _ openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error) {
	f.called = true
	return openai.ChatCompletionResponse{}, errors.New("model must not be called")
}

func TestTutorBlocksUnsafeQuestionBeforeModel(t *testing.T) {
	m := &failingModel{}
	h := NewTutorHandler("key", t.TempDir(), m)
	body := `{"lessonId":"1-intro","question":"My address is 12 Oak Street"}`
	req := httptest.NewRequest(http.MethodPost, "/api/tutor", strings.NewReader(body))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if m.called {
		t.Fatal("model was called for a blocked question")
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if strings.Contains(rec.Body.String(), "Oak Street") {
		t.Error("response echoed the learner's text")
	}
	if !strings.Contains(rec.Body.String(), "trusted adult") {
		t.Errorf("expected kind redirect, got %s", rec.Body.String())
	}
}
