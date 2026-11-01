// SPEC: FR-001, FR-012, NFR-SEC-04
package api

import (
	"context"
	"encoding/json"
	"errors"
	"mime"
	"net/http"
	"net/url"
	"strings"
	"time"

	"ai-foundations-coach/internal/auth"
)

const sessionCookie = "session"

// Messages shown to the learner (spec FR-007 and edge cases).
const (
	msgSignInRequired = "Sign in required"
	msgExpired        = "Your beta access has expired. Ask your teacher or admin to extend it."
	msgRevoked        = "Your beta access has ended. Please contact your teacher or admin."
)

// SessionValidator checks a session token. *auth.Service satisfies it.
type SessionValidator interface {
	Validate(ctx context.Context, token string) (auth.SessionInfo, error)
}

type sessionKey struct{}

// SessionFrom returns the signed-in learner placed in the context by SessionGate.
func SessionFrom(ctx context.Context) (auth.SessionInfo, bool) {
	s, ok := ctx.Value(sessionKey{}).(auth.SessionInfo)
	return s, ok
}

func writeAuthError(w http.ResponseWriter, status int, code, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg, "code": code})
}

func setSessionCookie(w http.ResponseWriter, token string, expires time.Time, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name: sessionCookie, Value: token, Path: "/", Expires: expires, HttpOnly: true,
		Secure: secure, SameSite: http.SameSiteLaxMode,
	})
}

func clearSessionCookie(w http.ResponseWriter, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name: sessionCookie, Value: "", Path: "/", MaxAge: -1, HttpOnly: true,
		Secure: secure, SameSite: http.SameSiteLaxMode,
	})
}

// openPath is reachable without signing in: static app files, the health check, runtime facts,
// and the auth and admin routes (which do their own checks).
func openPath(path string) bool {
	if !strings.HasPrefix(path, "/api/") {
		return true
	}
	return path == "/api/health" || path == "/api/runtime" ||
		strings.HasPrefix(path, "/api/auth/") || strings.HasPrefix(path, "/api/admin/")
}

// SessionGate requires a valid learner session on every /api/* route except the open ones (FR-001).
// It re-checks the account on every request, so revocation and expiry take effect at once.
func SessionGate(v SessionValidator, secure bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if openPath(r.URL.Path) {
				next.ServeHTTP(w, r)
				return
			}
			c, err := r.Cookie(sessionCookie)
			if err != nil || c.Value == "" {
				writeAuthError(w, http.StatusUnauthorized, "signin_required", msgSignInRequired)
				return
			}
			info, err := v.Validate(r.Context(), c.Value)
			switch {
			case err == nil:
				next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), sessionKey{}, info)))
			case errors.Is(err, auth.ErrAccountExpired):
				clearSessionCookie(w, secure)
				writeAuthError(w, http.StatusUnauthorized, "account_expired", msgExpired)
			case errors.Is(err, auth.ErrAccountRevoked):
				clearSessionCookie(w, secure)
				writeAuthError(w, http.StatusUnauthorized, "account_revoked", msgRevoked)
			case errors.Is(err, auth.ErrNoSession):
				clearSessionCookie(w, secure)
				writeAuthError(w, http.StatusUnauthorized, "signin_required", msgSignInRequired)
			default:
				writeAuthError(w, http.StatusServiceUnavailable, "unavailable", "Service temporarily unavailable")
			}
		})
	}
}

// requireJSON answers 415 unless the request body is declared as JSON. A cross-site HTML form
// cannot send this content type without a CORS preflight, which this server never approves.
func requireJSON(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mt, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type"))
		if mt != "application/json" {
			writeAuthError(w, http.StatusUnsupportedMediaType, "unsupported_media_type", "Content type must be application/json")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// sameOrigin is false when an Origin header is present and names a different host.
func sameOrigin(r *http.Request) bool {
	o := r.Header.Get("Origin")
	if o == "" {
		return true
	}
	u, err := url.Parse(o)
	return err == nil && u.Host == r.Host
}
