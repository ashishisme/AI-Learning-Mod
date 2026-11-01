// SPEC: FR-001, FR-003, FR-004, FR-007, FR-012
package api

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"ai-foundations-coach/internal/auth"
	"ai-foundations-coach/internal/state"
)

type authEnv struct {
	srv    *httptest.Server
	svc    *auth.Service
	store  state.Store
	client *http.Client
}

func newAuthEnv(t *testing.T, mutate ...func(*RouterConfig)) *authEnv {
	t.Helper()
	st, err := state.OpenFileStore(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	svc := auth.NewService(st, auth.DefaultConfig("https://coach.example.org"))
	cfg := RouterConfig{ContentDir: setupTestContent(t), Auth: svc, ModelClient: &mockModelClient{}}
	for _, m := range mutate {
		m(&cfg)
	}
	srv := httptest.NewServer(NewRouter(cfg))
	t.Cleanup(srv.Close)
	jar, _ := cookiejar.New(nil)
	return &authEnv{srv: srv, svc: svc, store: st, client: &http.Client{Jar: jar, Timeout: 20 * time.Second}}
}

func (e *authEnv) newToken(t *testing.T) string {
	t.Helper()
	links, err := e.svc.CreateInvites(context.Background(), "admin@example.org", 1, "Class 7B")
	if err != nil {
		t.Fatal(err)
	}
	return links[0][strings.LastIndex(links[0], "/")+1:]
}

func (e *authEnv) post(t *testing.T, c *http.Client, path string, body any, ct string) (*http.Response, string) {
	t.Helper()
	raw, _ := json.Marshal(body)
	req, _ := http.NewRequest(http.MethodPost, e.srv.URL+path, bytes.NewReader(raw))
	if ct != "" {
		req.Header.Set("Content-Type", ct)
	}
	return doReq(t, c, req)
}

func (e *authEnv) get(t *testing.T, c *http.Client, path string) (*http.Response, string) {
	t.Helper()
	req, _ := http.NewRequest(http.MethodGet, e.srv.URL+path, nil)
	return doReq(t, c, req)
}

func doReq(t *testing.T, c *http.Client, req *http.Request) (*http.Response, string) {
	t.Helper()
	resp, err := c.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return resp, string(b)
}

type creds struct {
	BetaID    string `json:"betaId"`
	Password  string `json:"password"`
	ExpiresAt string `json:"expiresAt"`
}

func (e *authEnv) activate(t *testing.T, c *http.Client) creds {
	t.Helper()
	resp, body := e.post(t, c, "/api/auth/activate", map[string]string{"token": e.newToken(t)}, "application/json")
	if resp.StatusCode != 200 {
		t.Fatalf("activate: %d %s", resp.StatusCode, body)
	}
	var cr creds
	if err := json.Unmarshal([]byte(body), &cr); err != nil || cr.BetaID == "" || cr.Password == "" {
		t.Fatalf("activation body: %s", body)
	}
	return cr
}

func TestSignedOutVisitorSeesNothingButTheOpenRoutes(t *testing.T) {
	e := newAuthEnv(t)
	for _, p := range []string{"/api/lessons", "/api/lessons/lesson-1"} {
		resp, body := e.get(t, e.client, p)
		if resp.StatusCode != 401 || !strings.Contains(body, `"code":"signin_required"`) || strings.Contains(body, "Lesson 1") {
			t.Errorf("%s: %d %s", p, resp.StatusCode, body)
		}
	}
	if resp, body := e.get(t, e.client, "/api/health"); resp.StatusCode != 200 || body != `{"ok":true}` {
		t.Errorf("health: %d %q", resp.StatusCode, body)
	}
	if _, body := e.get(t, e.client, "/api/runtime"); !strings.Contains(body, `"authRequired":true`) {
		t.Errorf("runtime must say sign-in is required: %s", body)
	}
	if resp, body := e.get(t, e.client, "/api/auth/session"); resp.StatusCode != 200 || !strings.Contains(body, `"authenticated":false`) {
		t.Errorf("session probe: %d %s", resp.StatusCode, body)
	}
	if resp, _ := e.post(t, e.client, "/api/tutor", map[string]string{"lessonId": "lesson-1", "question": "hi"}, "application/json"); resp.StatusCode != 401 {
		t.Errorf("tutor without a session: %d", resp.StatusCode)
	}
}

func TestActivateThenUseThenLogoutThenLogin(t *testing.T) {
	e := newAuthEnv(t)
	cr := e.activate(t, e.client)

	// Cookie attributes and a response that must never be cached.
	token := e.newToken(t)
	resp, _ := e.post(t, &http.Client{}, "/api/auth/activate", map[string]string{"token": token}, "application/json")
	if resp.Header.Get("Cache-Control") != "no-store" {
		t.Errorf("activation response Cache-Control = %q, want no-store", resp.Header.Get("Cache-Control"))
	}
	var sc *http.Cookie
	for _, c := range resp.Cookies() {
		if c.Name == sessionCookie {
			sc = c
		}
	}
	if sc == nil || !sc.HttpOnly || sc.SameSite != http.SameSiteLaxMode || sc.Path != "/" {
		t.Errorf("session cookie: %+v", sc)
	}

	// Signed in now: lessons work and nothing leaks the password again.
	resp, body := e.get(t, e.client, "/api/lessons/lesson-1")
	if resp.StatusCode != 200 || !strings.Contains(body, "Lesson 1 Title") {
		t.Fatalf("lesson with a session: %d %s", resp.StatusCode, body)
	}
	if resp, body := e.get(t, e.client, "/api/auth/session"); resp.StatusCode != 200 || !strings.Contains(body, `"authenticated":true`) ||
		!strings.Contains(body, cr.BetaID) || strings.Contains(body, cr.Password) {
		t.Errorf("session after activation: %d %s", resp.StatusCode, body)
	}

	if resp, _ := e.post(t, e.client, "/api/auth/logout", map[string]string{}, "application/json"); resp.StatusCode != 204 {
		t.Errorf("logout: %d", resp.StatusCode)
	}
	if resp, _ := e.get(t, e.client, "/api/lessons"); resp.StatusCode != 401 {
		t.Errorf("after logout lessons must be 401, got %d", resp.StatusCode)
	}

	// A second browser signs in with the credentials.
	other := &http.Client{}
	jar, _ := cookiejar.New(nil)
	other.Jar = jar
	resp, body = e.post(t, other, "/api/auth/login", map[string]string{"betaId": cr.BetaID, "password": cr.Password}, "application/json")
	if resp.StatusCode != 200 || !strings.Contains(body, `"authenticated":true`) || strings.Contains(body, cr.Password) {
		t.Fatalf("login: %d %s", resp.StatusCode, body)
	}
	if resp, _ := e.get(t, other, "/api/lessons"); resp.StatusCode != 200 {
		t.Errorf("lessons after login: %d", resp.StatusCode)
	}
}

func TestActivationErrors(t *testing.T) {
	e := newAuthEnv(t)
	token := e.newToken(t)
	if resp, _ := e.post(t, e.client, "/api/auth/activate", map[string]string{"token": token}, "application/json"); resp.StatusCode != 200 {
		t.Fatal("first activation failed")
	}
	resp, body := e.post(t, &http.Client{}, "/api/auth/activate", map[string]string{"token": token}, "application/json")
	if resp.StatusCode != 409 || !strings.Contains(body, "This invite has already been used. Please sign in.") || !strings.Contains(body, `"code":"invite_used"`) {
		t.Errorf("used: %d %s", resp.StatusCode, body)
	}
	if resp, body := e.post(t, &http.Client{}, "/api/auth/activate", map[string]string{"token": "nope"}, "application/json"); resp.StatusCode != 404 || !strings.Contains(body, "invite_invalid") {
		t.Errorf("unknown: %d %s", resp.StatusCode, body)
	}
	// Not JSON, or with unknown fields: refused before touching the invite.
	spare := e.newToken(t)
	if resp, _ := e.post(t, &http.Client{}, "/api/auth/activate", map[string]string{"token": spare}, "application/x-www-form-urlencoded"); resp.StatusCode != 415 {
		t.Errorf("form post: %d, want 415", resp.StatusCode)
	}
	if resp, _ := e.post(t, &http.Client{}, "/api/auth/activate", map[string]any{"token": spare, "extra": 1}, "application/json"); resp.StatusCode != 400 {
		t.Errorf("unknown field: %d, want 400", resp.StatusCode)
	}
	// A GET must never activate (link previews and scanners fetch links).
	if resp, _ := e.get(t, &http.Client{}, "/api/auth/activate?token="+spare); resp.StatusCode == 200 {
		t.Error("a GET activated an invite")
	}
	if resp, _ := e.post(t, &http.Client{}, "/api/auth/activate", map[string]string{"token": spare}, "application/json"); resp.StatusCode != 200 {
		t.Errorf("the untouched invite must still work: %d", resp.StatusCode)
	}
}

func TestLoginErrorsAreGeneric(t *testing.T) {
	e := newAuthEnv(t)
	cr := e.activate(t, &http.Client{})
	for name, in := range map[string]map[string]string{
		"wrong password": {"betaId": cr.BetaID, "password": "wrong-wrong-wrong-wrong-000"},
		"unknown id":     {"betaId": "BETA-ZZZZ-ZZZZ", "password": cr.Password},
	} {
		resp, body := e.post(t, &http.Client{}, "/api/auth/login", in, "application/json")
		if resp.StatusCode != 401 || !strings.Contains(body, `"code":"bad_credentials"`) || !strings.Contains(body, "Beta ID or password is incorrect.") {
			t.Errorf("%s: %d %s", name, resp.StatusCode, body)
		}
	}
}

func TestResponsesNeverCarryHashesOrTokens(t *testing.T) {
	e := newAuthEnv(t)
	token := e.newToken(t)
	resp, body := e.post(t, e.client, "/api/auth/activate", map[string]string{"token": token}, "application/json")
	_ = resp
	for _, bad := range []string{"pbkdf2", "passwordHash", "tokenHash", auth.HashToken(token)} {
		if strings.Contains(body, bad) {
			t.Errorf("activation response contains %q", bad)
		}
	}
}

func TestExpiredAccountEndsTheSessionOnTheNextRequest(t *testing.T) {
	e := newAuthEnv(t)
	cr := e.activate(t, e.client)
	if resp, _ := e.get(t, e.client, "/api/lessons"); resp.StatusCode != 200 {
		t.Fatal("setup: the session should work")
	}
	_ = e.store.Do(context.Background(), func(tx state.Tx) error {
		a, _ := tx.GetAccount(cr.BetaID)
		a.ExpiresAt = time.Now().Add(-time.Minute)
		tx.PutAccount(a)
		return nil
	})
	resp, body := e.get(t, e.client, "/api/lessons")
	if resp.StatusCode != 401 || !strings.Contains(body, `"code":"account_expired"`) || !strings.Contains(body, "Ask your teacher or admin to extend it") {
		t.Errorf("expired: %d %s", resp.StatusCode, body)
	}
}
