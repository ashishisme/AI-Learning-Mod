// SPEC: FR-013, FR-019, FR-020, FR-022, FR-024, FR-025, SC-007, SC-008, SC-009, SC-010
package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"

	"ai-foundations-coach/internal/auth"
	"ai-foundations-coach/internal/spend"
	"ai-foundations-coach/internal/state"
)

const citedAnswer = "[Lesson 1 Title § Overview] Models learn from data."

func spendTotal(t *testing.T, st state.Store) int64 {
	t.Helper()
	var total int64
	_ = st.View(context.Background(), func(tx state.Tx) error {
		for _, v := range tx.ListCounters("spend:") {
			total += v
		}
		return nil
	})
	return total
}

func signedInClient(t *testing.T, e *authEnv) (*http.Client, creds) {
	t.Helper()
	jar, _ := cookiejar.New(nil)
	c := &http.Client{Jar: jar}
	return c, e.activate(t, c)
}

// SC-007: no request can point the server at an address of the caller's choosing.
func TestHostedServerCannotBeRedirected(t *testing.T) {
	var internalHits, attackerHits atomic.Int32
	counting := func(n *atomic.Int32) *httptest.Server {
		return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			n.Add(1)
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"hi [L § O]"}}]}`))
		}))
	}
	internal, attacker := counting(&internalHits), counting(&attackerHits)
	defer internal.Close()
	defer attacker.Close()
	t.Setenv("OPENAI_BASE_URL", internal.URL+"/v1") // a private address, even when the operator sets it

	e := newAuthEnv(t, func(c *RouterConfig) {
		c.Hosted, c.OpenAIKey, c.ModelClient = true, "server-key", nil
	})
	client, _ := signedInClient(t, e)
	raw := `{"lessonId":"lesson-1","question":"How does ML learn?"}`
	req, _ := http.NewRequest("POST", e.srv.URL+"/api/tutor", strings.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-AI-Base-URL", attacker.URL+"/v1")
	req.Header.Set("X-AI-Key", "k")
	req.Header.Set("X-AI-Insecure-TLS", "true")
	resp, _ := doReq(t, client, req)
	if resp.StatusCode != http.StatusBadGateway {
		t.Errorf("status %d, want 502", resp.StatusCode)
	}
	if attackerHits.Load() != 0 || internalHits.Load() != 0 {
		t.Errorf("outbound connections: attacker %d, private %d; want none", attackerHits.Load(), internalHits.Load())
	}
}

// SC-008: signed in or not, nobody can trigger sync or the config test on a hosted server.
func TestHostedRefusesSyncAndConfigTestToLearners(t *testing.T) {
	t.Setenv(SyncEnabledEnv, "true")
	t.Setenv("GITHUB_TOKEN", "server-token")
	e := newAuthEnv(t, func(c *RouterConfig) { c.Hosted = true })
	client, _ := signedInClient(t, e)
	for _, p := range []string{"/api/ingest/sync", "/api/config/test"} {
		if resp, _ := e.post(t, client, p, map[string]string{"baseUrl": "http://169.254.169.254/"}, "application/json"); resp.StatusCode != 403 {
			t.Errorf("%s signed in: %d, want 403", p, resp.StatusCode)
		}
		if resp, _ := e.post(t, &http.Client{}, p, map[string]string{}, "application/json"); resp.StatusCode != 401 {
			t.Errorf("%s signed out: %d, want 401", p, resp.StatusCode)
		}
	}
}

// SC-009: guessing past 10 attempts is blocked, even with the right password.
func TestPasswordGuessingIsLockedOut(t *testing.T) {
	e := newAuthEnv(t)
	_, cr := signedInClient(t, e)
	wrong := map[string]string{"betaId": cr.BetaID, "password": "wrong-wrong-wrong-wrong-000"}
	for i := 0; i < 10; i++ {
		if resp, _ := e.post(t, &http.Client{}, "/api/auth/login", wrong, "application/json"); resp.StatusCode != 401 {
			t.Fatalf("attempt %d: %d", i+1, resp.StatusCode)
		}
	}
	resp, body := e.post(t, &http.Client{}, "/api/auth/login", map[string]string{"betaId": cr.BetaID, "password": cr.Password}, "application/json")
	if resp.StatusCode != 429 || !strings.Contains(body, `"code":"locked"`) || !strings.Contains(body, "Try again in 15 minutes") || resp.Header.Get("Retry-After") == "" {
		t.Errorf("after 10 failures: %d %s %v", resp.StatusCode, body, resp.Header)
	}
}

func TestLoginIsRateLimitedPerAddress(t *testing.T) {
	e := newAuthEnv(t)
	last := 0
	for i := 0; i < 31; i++ {
		resp, _ := e.post(t, &http.Client{}, "/api/auth/login", map[string]string{"betaId": "x", "password": "y"}, "application/json")
		last = resp.StatusCode
	}
	if last != 429 {
		t.Errorf("31st request in a minute: %d, want 429", last)
	}
}

// FR-024, SC-010: with the tutor off nothing reaches the AI service and nothing is spent.
func TestDisabledTutorRefusesWithoutCallingTheModel(t *testing.T) {
	m := &capturingModel{answer: citedAnswer}
	var st state.Store
	e := newAuthEnv(t, func(c *RouterConfig) {
		c.TutorDisabled, c.ModelClient = true, m
	})
	st = e.store
	client, _ := signedInClient(t, e)
	for _, p := range []string{"/api/tutor", "/api/tutor/stream"} {
		resp, body := e.post(t, client, p, map[string]string{"lessonId": "lesson-1", "question": "hi"}, "application/json")
		if resp.StatusCode != 503 || !strings.Contains(body, "tutor disabled") {
			t.Errorf("%s: %d %s", p, resp.StatusCode, body)
		}
	}
	if m.calls != 0 || spendTotal(t, st) != 0 {
		t.Errorf("model calls %d, spend %d; want 0 and 0", m.calls, spendTotal(t, st))
	}
	if _, body := e.get(t, client, "/api/runtime"); !strings.Contains(body, `"tutorEnabled":false`) {
		t.Errorf("runtime: %s", body)
	}
	if resp, _ := e.get(t, client, "/api/lessons"); resp.StatusCode != 200 {
		t.Errorf("lessons must keep working: %d", resp.StatusCode)
	}
}

func withSpend(t *testing.T, ceiling float64, m ModelClient) (*authEnv, *spend.Tally) {
	t.Helper()
	st, err := state.OpenFileStore(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	tally := spend.New(st, spend.Config{CeilingUSD: ceiling, InputPerMtokUSD: 0.15, OutputPerMtokUSD: 0.60})
	svc := auth.NewService(st, auth.DefaultConfig("https://coach.example.org"))
	srv := httptest.NewServer(NewRouter(RouterConfig{ContentDir: setupTestContent(t), Auth: svc, ModelClient: m, Spend: tally}))
	t.Cleanup(srv.Close)
	jar, _ := cookiejar.New(nil)
	return &authEnv{srv: srv, svc: svc, store: st, client: &http.Client{Jar: jar}}, tally
}

// FR-025: at the ceiling the tutor rests, makes no AI call, and everything else keeps working.
func TestCeilingMakesTheTutorRest(t *testing.T) {
	m := &capturingModel{answer: citedAnswer}
	e, _ := withSpend(t, 0.000001, m) // one micro-dollar: nothing fits
	client, _ := signedInClient(t, e)

	resp, body := e.post(t, client, "/api/tutor", map[string]string{"lessonId": "lesson-1", "question": "hi"}, "application/json")
	var out TutorResponse
	_ = json.Unmarshal([]byte(body), &out)
	if resp.StatusCode != 200 || out.Answer != RestingReply {
		t.Errorf("json: %d %s", resp.StatusCode, body)
	}
	resp, body = e.post(t, client, "/api/tutor/stream", map[string]string{"lessonId": "lesson-1", "question": "hi"}, "application/json")
	if resp.StatusCode != 200 || !strings.Contains(body, RestingReply) || !strings.Contains(body, "[DONE]") {
		t.Errorf("stream: %d %s", resp.StatusCode, body)
	}
	if m.calls != 0 {
		t.Errorf("the model was called %d times at the ceiling", m.calls)
	}
	if resp, _ := e.get(t, client, "/api/lessons/lesson-1"); resp.StatusCode != 200 {
		t.Errorf("lessons must keep working: %d", resp.StatusCode)
	}
}

func TestSpendIsSettledToTheActualCost(t *testing.T) {
	m := &capturingModel{answer: citedAnswer}
	e, _ := withSpend(t, 1.00, m)
	client, _ := signedInClient(t, e)
	if resp, body := e.post(t, client, "/api/tutor", map[string]string{"lessonId": "lesson-1", "question": "How?"}, "application/json"); resp.StatusCode != 200 || !strings.Contains(body, "Models learn") {
		t.Fatalf("tutor: %d %s", resp.StatusCode, body)
	}
	got := spendTotal(t, e.store)
	if got <= 0 {
		t.Fatal("a call must be counted")
	}
	worst := int64(800 * 0.60) // 800 output tokens alone reserve 480 micro-dollars
	if got >= worst {
		t.Errorf("tally %d: the worst-case reservation was not settled down", got)
	}
}

func TestStoreFailureFailsClosed(t *testing.T) {
	st, err := state.OpenFileStore(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	m := &capturingModel{answer: citedAnswer}
	h := NewTutorHandler("k", setupTestContent(t), m)
	h.spend = spend.New(st, spend.Config{CeilingUSD: 1, InputPerMtokUSD: 0.15, OutputPerMtokUSD: 0.60})
	st.Close()
	rec := tutorPost(h, askBody, nil)
	if rec.Code != 503 || !strings.Contains(rec.Body.String(), "tutor temporarily unavailable") || m.calls != 0 {
		t.Errorf("%d %s, model calls %d", rec.Code, rec.Body.String(), m.calls)
	}
}
