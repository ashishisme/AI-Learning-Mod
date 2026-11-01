// SPEC: FR-001, FR-007, NFR-SEC-04
package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"ai-foundations-coach/internal/auth"
)

type stubValidator struct {
	err   error
	calls int
}

func (s *stubValidator) Validate(_ context.Context, token string) (auth.SessionInfo, error) {
	s.calls++
	if s.err != nil {
		return auth.SessionInfo{}, s.err
	}
	return auth.SessionInfo{BetaID: "BETA-TEST-0001", Label: "L"}, nil
}

func gated(v SessionValidator) http.Handler {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s, ok := SessionFrom(r.Context()); ok {
			w.Header().Set("X-Beta", s.BetaID)
		}
		w.WriteHeader(http.StatusOK)
	})
	return SessionGate(v, false)(next)
}

func do(h http.Handler, method, path, cookie string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, nil)
	if cookie != "" {
		r.AddCookie(&http.Cookie{Name: sessionCookie, Value: cookie})
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, r)
	return rec
}

func TestGateOpenPathsNeedNoSession(t *testing.T) {
	v := &stubValidator{err: auth.ErrNoSession}
	h := gated(v)
	for _, p := range []string{"/api/health", "/api/runtime", "/api/auth/session", "/api/auth/login", "/api/admin/me", "/", "/signin", "/assets/app.js", "/invite/abc"} {
		if rec := do(h, http.MethodGet, p, ""); rec.Code != http.StatusOK {
			t.Errorf("%s: status %d, want 200", p, rec.Code)
		}
	}
	if v.calls != 0 {
		t.Error("open paths must not touch the validator")
	}
}

func TestGateBlocksProtectedAPI(t *testing.T) {
	v := &stubValidator{}
	h := gated(v)
	for _, p := range []string{"/api/lessons", "/api/lessons/1-intro", "/api/tutor", "/api/tutor/stream", "/api/config/test", "/api/ingest/sync", "/api/feedback", "/api/usage/event"} {
		rec := do(h, http.MethodGet, p, "")
		if rec.Code != http.StatusUnauthorized || !strings.Contains(rec.Body.String(), `"code":"signin_required"`) {
			t.Errorf("%s without a cookie: %d %s", p, rec.Code, rec.Body.String())
		}
	}
	if rec := do(h, http.MethodGet, "/api/lessons", "tok"); rec.Code != http.StatusOK || rec.Header().Get("X-Beta") != "BETA-TEST-0001" {
		t.Errorf("valid session: %d %v", rec.Code, rec.Header())
	}
}

func TestGateMapsSessionFailures(t *testing.T) {
	cases := []struct {
		err       error
		status    int
		code, msg string
		cleared   bool
	}{
		{auth.ErrNoSession, 401, "signin_required", "Sign in required", true},
		{auth.ErrAccountExpired, 401, "account_expired", "Your beta access has expired. Ask your teacher or admin to extend it.", true},
		{auth.ErrAccountRevoked, 401, "account_revoked", "Your beta access has ended", true},
		{context.DeadlineExceeded, 503, "unavailable", "temporarily unavailable", false},
	}
	for _, c := range cases {
		rec := do(gated(&stubValidator{err: c.err}), http.MethodGet, "/api/lessons", "tok")
		body := rec.Body.String()
		if rec.Code != c.status || !strings.Contains(body, `"code":"`+c.code+`"`) || !strings.Contains(body, c.msg) {
			t.Errorf("%v: %d %s", c.err, rec.Code, body)
		}
		cleared := false
		for _, sc := range rec.Result().Cookies() {
			if sc.Name == sessionCookie && sc.MaxAge < 0 {
				cleared = true
			}
		}
		if cleared != c.cleared {
			t.Errorf("%v: cookie cleared = %v, want %v", c.err, cleared, c.cleared)
		}
		if rec.Header().Get("Cache-Control") != "no-store" {
			t.Errorf("%v: error responses must not be cached", c.err)
		}
	}
}

func TestRequireJSONAndSameOrigin(t *testing.T) {
	ok := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })
	h := requireJSON(ok)
	for ct, want := range map[string]int{"application/json": 204, "application/json; charset=utf-8": 204, "": 415, "text/plain": 415, "application/x-www-form-urlencoded": 415, "multipart/form-data": 415} {
		r := httptest.NewRequest(http.MethodPost, "/x", nil)
		if ct != "" {
			r.Header.Set("Content-Type", ct)
		}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, r)
		if rec.Code != want {
			t.Errorf("content type %q: %d, want %d", ct, rec.Code, want)
		}
	}
	for origin, want := range map[string]bool{"": true, "http://example.com": true, "http://evil.example": false, "null": false, "http://example.com.evil.example": false} {
		r := httptest.NewRequest(http.MethodPost, "http://example.com/x", nil)
		if origin != "" {
			r.Header.Set("Origin", origin)
		}
		if got := sameOrigin(r); got != want {
			t.Errorf("origin %q: %v, want %v", origin, got, want)
		}
	}
}
