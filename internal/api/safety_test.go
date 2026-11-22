// SPEC: FR-REV-20, FR-REV-21
package api

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
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
		{"I keep thinking about killing myself", SafetySelfHarm},
		{"hurting myself", SafetySelfHarm},
		{"kill  myself", SafetySelfHarm},
		{"kill\u00a0my self", SafetySelfHarm},
		{"kill-myself", SafetySelfHarm},
		{"I WANNA DIE", SafetySelfHarm},
		{"I don\u2019t want to be alive", SafetySelfHarm},
		{"thinking of self-harm", SafetySelfHarm},
		{"cutting myself again", SafetySelfHarm},
		{"I am making a bomb", SafetyViolence},
		{"building pipe bombs", SafetyViolence},
		{"how do I stab someone", SafetyViolence},
		{"I'm gonna kill my brother", SafetyViolence},
		{"my home address is 12 Oak Street", SafetyPersonalPII},
		{"here's my phone number", SafetyPersonalPII},
		{"I live on Oak Street", SafetyPersonalPII},
		{"How does a model cut costs by itself?", SafetyNone},
		{"Why do neurons die with ReLU?", SafetyNone},
		{"How do I build a classifier?", SafetyNone},
		{"I live on a farm, can AI help?", SafetyNone},
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

// Opt-in TLS skip via the X-AI-Insecure-TLS header (Settings toggle).
func TestTutorInsecureTLSHeaderOptIn(t *testing.T) {
	llm := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"x","object":"chat.completion","choices":[{"index":0,"message":{"role":"assistant","content":"A neuron adds signals. [Lesson § Intro]"},"finish_reason":"stop"}]}`))
	}))
	defer llm.Close()

	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "lessons"), 0o755); err != nil {
		t.Fatal(err)
	}
	lesson := `{"title":"Lesson","sections":[{"heading":"Intro","bodyMarkdown":"Neurons add signals."}]}`
	if err := os.WriteFile(filepath.Join(dir, "lessons", "1-intro.detailed.json"), []byte(lesson), 0o644); err != nil {
		t.Fatal(err)
	}

	ask := func(insecureHeader string) *httptest.ResponseRecorder {
		h := NewTutorHandler("", dir, nil)
		req := httptest.NewRequest(http.MethodPost, "/api/tutor", strings.NewReader(`{"lessonId":"1-intro","question":"What does a neuron do?"}`))
		req.Header.Set("X-AI-Base-URL", llm.URL+"/v1")
		req.Header.Set("X-AI-Key", "k")
		if insecureHeader != "" {
			req.Header.Set("X-AI-Insecure-TLS", insecureHeader)
		}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec
	}

	if rec := ask(""); rec.Code == http.StatusOK {
		t.Fatalf("self-signed endpoint must fail by default, got 200: %s", rec.Body.String())
	}
	rec := ask("true")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "A neuron adds signals") {
		t.Fatalf("expected success with header, got %d: %s", rec.Code, rec.Body.String())
	}
}
