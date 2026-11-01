// SPEC: FR-001, FR-004, FR-007, FR-011, FR-012, FR-013
package api

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"ai-foundations-coach/internal/auth"
	"ai-foundations-coach/internal/usage"
)

const maxAuthBody = 4 * 1024

type authHandlers struct {
	svc    *auth.Service
	secure bool
	hops   int
	usage  *usage.Recorder
}

// registerAuth adds the learner sign-in routes. Login and activation are limited per client
// address so they cannot be used to burn CPU on password hashing.
func registerAuth(mux *http.ServeMux, cfg RouterConfig) {
	h := &authHandlers{svc: cfg.Auth, secure: cfg.SecureCookies, hops: cfg.TrustedProxyHops, usage: cfg.Usage}
	limiter := NewRateLimiter(30, time.Minute)
	limiter.SetTrustedProxyHops(cfg.TrustedProxyHops)

	mux.HandleFunc("GET /api/auth/session", h.session)
	mux.Handle("POST /api/auth/activate", limiter.Middleware(requireJSON(http.HandlerFunc(h.activate))))
	mux.Handle("POST /api/auth/login", limiter.Middleware(requireJSON(http.HandlerFunc(h.login))))
	mux.Handle("POST /api/auth/logout", requireJSON(http.HandlerFunc(h.logout)))
}

// decodeBody reads a small JSON body and rejects unknown fields.
func decodeBody(w http.ResponseWriter, r *http.Request, v any) bool {
	dec := json.NewDecoder(io.LimitReader(r.Body, maxAuthBody))
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		writeAuthError(w, http.StatusBadRequest, "invalid", "Invalid request")
		return false
	}
	return true
}

// writeSecretJSON answers 200 with a body that must never be cached (passwords, invite links).
func writeSecretJSON(w http.ResponseWriter, v any) { writeSecretJSONStatus(w, http.StatusOK, v) }

// writeSecretJSONStatus sets the headers before the status line, which cannot be changed after it.
func writeSecretJSONStatus(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Pragma", "no-cache")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

type sessionBody struct {
	Authenticated bool   `json:"authenticated"`
	Code          string `json:"code,omitempty"`
	Message       string `json:"message,omitempty"`
	*auth.SessionInfo
}

// GET /api/auth/session always answers 200 so the app can ask "am I signed in?" without an error.
func (h *authHandlers) session(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(sessionCookie); err == nil && c.Value != "" {
		info, err := h.svc.Validate(r.Context(), c.Value)
		switch {
		case err == nil:
			writeSecretJSON(w, sessionBody{Authenticated: true, SessionInfo: &info})
			return
		case errors.Is(err, auth.ErrAccountExpired):
			clearSessionCookie(w, h.secure)
			writeSecretJSON(w, sessionBody{Code: "account_expired", Message: msgExpired})
			return
		case errors.Is(err, auth.ErrAccountRevoked):
			clearSessionCookie(w, h.secure)
			writeSecretJSON(w, sessionBody{Code: "account_revoked", Message: msgRevoked})
			return
		case errors.Is(err, auth.ErrNoSession):
			clearSessionCookie(w, h.secure)
		default:
			writeAuthError(w, http.StatusServiceUnavailable, "unavailable", "Service temporarily unavailable")
			return
		}
	}
	writeSecretJSON(w, sessionBody{})
}

func (h *authHandlers) activate(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Token string `json:"token"`
	}
	if !decodeBody(w, r, &in) {
		return
	}
	act, err := h.svc.Activate(r.Context(), strings.TrimSpace(in.Token))
	switch {
	case err == nil:
	case errors.Is(err, auth.ErrInviteInvalid):
		writeAuthError(w, http.StatusNotFound, "invite_invalid", "This invite link is not valid.")
		return
	case errors.Is(err, auth.ErrInviteUsed):
		writeAuthError(w, http.StatusConflict, "invite_used", "This invite has already been used. Please sign in.")
		return
	case errors.Is(err, auth.ErrInviteExpired):
		writeAuthError(w, http.StatusGone, "invite_expired", "This invite has expired. Ask your admin for a new one.")
		return
	case errors.Is(err, auth.ErrInviteRevoked):
		writeAuthError(w, http.StatusGone, "invite_revoked", "This invite is no longer valid. Ask your admin for a new one.")
		return
	default:
		writeAuthError(w, http.StatusServiceUnavailable, "unavailable", "Service temporarily unavailable")
		return
	}
	h.usage.Inc(usage.Activations)
	setSessionCookie(w, act.SessionToken, act.SessionExpires, h.secure)
	// The password leaves the server exactly once, here (FR-004). The response must never be cached.
	writeSecretJSON(w, map[string]any{"betaId": act.BetaID, "password": act.Password, "expiresAt": act.ExpiresAt})
}

func (h *authHandlers) login(w http.ResponseWriter, r *http.Request) {
	var in struct {
		BetaID   string `json:"betaId"`
		Password string `json:"password"`
	}
	if !decodeBody(w, r, &in) {
		return
	}
	si, err := h.svc.Login(r.Context(), in.BetaID, in.Password, clientHost(r, h.hops))
	var locked *auth.LockedError
	switch {
	case err == nil:
		h.usage.Inc(usage.SigninOK)
		setSessionCookie(w, si.Token, si.Expires, h.secure)
		writeSecretJSON(w, sessionBody{Authenticated: true, SessionInfo: &si.Info})
	case errors.As(err, &locked):
		w.Header().Set("Retry-After", strconv.Itoa(int(locked.RetryAfter.Seconds())+1))
		writeAuthError(w, http.StatusTooManyRequests, "locked", "Too many attempts. Try again in 15 minutes.")
	case errors.Is(err, auth.ErrBadCredentials):
		h.usage.Inc(usage.SigninFail)
		writeAuthError(w, http.StatusUnauthorized, "bad_credentials", "Beta ID or password is incorrect.")
	case errors.Is(err, auth.ErrAccountExpired):
		writeAuthError(w, http.StatusUnauthorized, "account_expired", msgExpired)
	case errors.Is(err, auth.ErrAccountRevoked):
		writeAuthError(w, http.StatusUnauthorized, "account_revoked", msgRevoked)
	default:
		writeAuthError(w, http.StatusServiceUnavailable, "unavailable", "Service temporarily unavailable")
	}
}

func (h *authHandlers) logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(sessionCookie); err == nil && c.Value != "" {
		_ = h.svc.Logout(r.Context(), c.Value)
	}
	clearSessionCookie(w, h.secure)
	w.WriteHeader(http.StatusNoContent)
}
