// SPEC: SPEC-008 FR-018, FR-019, FR-020, FR-021, FR-022, G3; FR-TUT-06; FR-REV mode tone
package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	openai "github.com/sashabaranov/go-openai"
)

// capturingModel records the last request and returns a fixed answer.
type capturingModel struct {
	answer string
	last   openai.ChatCompletionRequest
	calls  int
}

func (c *capturingModel) CreateChatCompletion(_ context.Context, req openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error) {
	c.calls++
	c.last = req
	return openai.ChatCompletionResponse{Choices: []openai.ChatCompletionChoice{
		{Message: openai.ChatCompletionMessage{Content: c.answer}},
	}}, nil
}

func tutorPost(h http.Handler, body string, headers map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/api/tutor", strings.NewReader(body))
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

const askBody = `{"lessonId":"lesson-1","question":"How does ML learn?"}`

func TestHostedDisablesConfigTest(t *testing.T) {
	router := NewRouter(RouterConfig{ContentDir: t.TempDir(), Hosted: true})

	for _, path := range []string{"/api/config/test"} {
		req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(`{"baseUrl":"http://169.254.169.254/"}`))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Errorf("%s: expected 403 in hosted mode, got %d", path, rec.Code)
		}
	}
}

func TestRuntimeEndpointReportsHostedMode(t *testing.T) {
	for _, hosted := range []bool{true, false} {
		router := NewRouter(RouterConfig{ContentDir: t.TempDir(), Hosted: hosted})
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/runtime", nil))
		want := `{"hosted":false,"authRequired":false,"tutorEnabled":true,"feedbackEnabled":false}`
		if hosted {
			want = `{"hosted":true,"authRequired":false,"tutorEnabled":true,"feedbackEnabled":false}`
		}
		if rec.Code != http.StatusOK || rec.Body.String() != want {
			t.Errorf("hosted=%v: got %d %q, want %q", hosted, rec.Code, rec.Body.String(), want)
		}
	}
	// /api/health must stay exactly {"ok":true} (NFR-REL-02).
	rec := httptest.NewRecorder()
	NewRouter(RouterConfig{ContentDir: t.TempDir(), Hosted: true}).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	if rec.Body.String() != `{"ok":true}` {
		t.Errorf("health body changed: %q", rec.Body.String())
	}
}

func TestHostedTutorIgnoresPerRequestOverrides(t *testing.T) {
	t.Setenv("OPENAI_BASE_URL", "")
	t.Setenv("OPENAI_MODEL", "")
	overrides := map[string]string{
		"X-AI-Base-URL":     "http://localhost:11434",
		"X-AI-Model":        "attacker-model",
		"X-AI-Key":          "attacker-key",
		"X-AI-Max-Bytes":    "999999",
		"X-AI-Insecure-TLS": "true",
	}
	longUncited := "Machine learning learns patterns from example data."

	for _, hosted := range []bool{true, false} {
		m := &capturingModel{answer: longUncited}
		h := NewTutorHandler("server-key", setupTestContent(t), m)
		h.hosted = hosted
		rec := tutorPost(h, askBody, overrides)
		if rec.Code != http.StatusOK {
			t.Fatalf("hosted=%v: expected 200, got %d: %s", hosted, rec.Code, rec.Body.String())
		}
		overridden := m.last.Model == "attacker-model"
		autoCited := strings.Contains(rec.Body.String(), "Lesson 1 Title §")
		if hosted && (overridden || autoCited) {
			t.Errorf("hosted: overrides leaked (model=%q, autoCited=%v): %s", m.last.Model, autoCited, rec.Body.String())
		}
		if hosted && m.last.Model != "gpt-4o-mini" {
			t.Errorf("hosted: expected the configured default model, got %q", m.last.Model)
		}
		if !hosted && !overridden {
			t.Errorf("non-hosted: the Settings model override should still apply, got %q", m.last.Model)
		}
	}
}

func TestHostedTutorRefusesPrivateAIEndpoint(t *testing.T) {
	var hits int
	internal := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		hits++
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"hi [Lesson § Intro]"}}]}`))
	}))
	defer internal.Close()

	// Even an operator-configured endpoint must not reach a loopback/private address when hosted.
	t.Setenv("OPENAI_BASE_URL", internal.URL+"/v1")
	h := NewTutorHandler("server-key", setupTestContent(t), nil)
	h.hosted = true
	rec := tutorPost(h, askBody, nil)

	if rec.Code != http.StatusBadGateway {
		t.Fatalf("expected 502 for a blocked endpoint, got %d: %s", rec.Code, rec.Body.String())
	}
	if hits != 0 {
		t.Fatalf("the private endpoint was contacted %d times", hits)
	}
}

func TestAutoCitationOnlyForLocalModelEndpoints(t *testing.T) {
	t.Setenv("OPENAI_BASE_URL", "")
	uncited := "Machine learning learns patterns from example data."

	cases := []struct {
		baseURL   string
		wantCited bool
	}{
		{"http://localhost:11434", true},
		{"http://127.0.0.1:8000/v1", true},
		{"https://api.example.com/v1", false},
		{"https://llm.example.org:11434/v1", true}, // Ollama's port
	}
	for _, c := range cases {
		m := &capturingModel{answer: uncited}
		h := NewTutorHandler("", setupTestContent(t), m)
		rec := tutorPost(h, askBody, map[string]string{"X-AI-Base-URL": c.baseURL})
		cited := strings.Contains(rec.Body.String(), "Lesson 1 Title §")
		if cited != c.wantCited {
			t.Errorf("%s: auto-cited=%v, want %v (%s)", c.baseURL, cited, c.wantCited, rec.Body.String())
		}
		if !c.wantCited && !strings.Contains(rec.Body.String(), "I couldn't find that in this lesson") {
			t.Errorf("%s: expected the uncited fallback, got %s", c.baseURL, rec.Body.String())
		}
	}
}

func TestTutorAudienceModeIsAppliedServerSide(t *testing.T) {
	t.Setenv("OPENAI_BASE_URL", "")
	answer := "[Lesson 1 Title § Overview] ok"

	m := &capturingModel{answer: answer}
	h := NewTutorHandler("k", setupTestContent(t), m)
	long := strings.Repeat("a", MaxQuestionLength) // the full allowance must still be accepted in a mode
	body := `{"lessonId":"lesson-1","question":"` + long + `","mode":"junior"}`
	if rec := tutorPost(h, body, nil); rec.Code != http.StatusOK {
		t.Fatalf("a 500-character question in junior mode must be accepted, got %d: %s", rec.Code, rec.Body.String())
	}
	sys := m.last.Messages[0].Content
	if !strings.HasPrefix(sys, SystemPrompt) || !strings.Contains(sys, "10-year-old") {
		t.Errorf("junior tone missing from the system prompt: %q", sys)
	}
	if strings.Contains(m.last.Messages[1].Content, "Tone:") {
		t.Error("the tone must not be part of the user message")
	}

	m2 := &capturingModel{answer: answer}
	h2 := NewTutorHandler("k", setupTestContent(t), m2)
	tutorPost(h2, `{"lessonId":"lesson-1","question":"hi","mode":"standard"}`, nil)
	if m2.last.Messages[0].Content != SystemPrompt {
		t.Error("standard mode must send the verbatim system prompt")
	}

	if rec := tutorPost(h2, `{"lessonId":"lesson-1","question":"hi","mode":"pirate"}`, nil); rec.Code != http.StatusBadRequest {
		t.Errorf("unknown mode: expected 400, got %d", rec.Code)
	}
}

func TestClientHostUsesTrustedProxyHops(t *testing.T) {
	mk := func(xff string) *http.Request {
		r := httptest.NewRequest(http.MethodPost, "/api/tutor", nil)
		r.RemoteAddr = "10.0.0.9:4444" // the front end, same for every visitor
		if xff != "" {
			r.Header.Set("X-Forwarded-For", xff)
		}
		return r
	}
	// No trusted proxy: the header is ignored, so it cannot be used to dodge the limit.
	if got := clientHost(mk("1.2.3.4"), 0); got != "10.0.0.9" {
		t.Errorf("hops=0: got %q, want the peer address", got)
	}
	// One trusted proxy appended the real client last; anything before it is client-supplied.
	if got := clientHost(mk("6.6.6.6, 203.0.113.7"), 1); got != "203.0.113.7" {
		t.Errorf("hops=1: got %q, want 203.0.113.7", got)
	}
	// Two trusted proxies (for example an HTTPS load balancer in front of the platform).
	if got := clientHost(mk("6.6.6.6, 203.0.113.7, 35.1.1.1"), 2); got != "203.0.113.7" {
		t.Errorf("hops=2: got %q, want 203.0.113.7", got)
	}
	// Missing, short or malformed headers fall back to the peer address.
	for _, xff := range []string{"", "not-an-ip"} {
		if got := clientHost(mk(xff), 1); got != "10.0.0.9" {
			t.Errorf("xff=%q: got %q, want the peer address", xff, got)
		}
	}
}

func TestRateLimiterCountsVisitorsBehindProxySeparately(t *testing.T) {
	limiter := NewRateLimiter(2, RateLimitWindow)
	limiter.SetTrustedProxyHops(1)
	h := limiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) }))
	hit := func(client string) int {
		r := httptest.NewRequest(http.MethodPost, "/", nil)
		r.RemoteAddr = "10.0.0.9:4444"
		r.Header.Set("X-Forwarded-For", client)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, r)
		return rec.Code
	}
	for i := 0; i < 2; i++ {
		if hit("203.0.113.1") != http.StatusOK {
			t.Fatal("first two requests from visitor A must pass")
		}
	}
	if hit("203.0.113.1") != http.StatusTooManyRequests {
		t.Error("visitor A's third request must be limited")
	}
	if hit("203.0.113.2") != http.StatusOK {
		t.Error("visitor B must not be limited by visitor A")
	}
}
