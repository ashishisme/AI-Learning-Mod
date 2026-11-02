// SPEC: FR-002, FR-008, FR-009, FR-010, FR-014, FR-015, FR-016, FR-017
package api

import (
	"context"
	"crypto/subtle"
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"ai-foundations-coach/internal/auth"
	"ai-foundations-coach/internal/cost"
	"ai-foundations-coach/internal/feedback"
	"ai-foundations-coach/internal/spend"
	"ai-foundations-coach/internal/usage"
)

const (
	adminCookie   = "admin_session"
	flowCookie    = "oidc_flow"
	adminTTL      = 8 * time.Hour
	flowTTL       = 10 * time.Minute
	csrfHeader    = "X-CSRF-Token"
	flowCookiePth = "/api/auth/admin"
)

type adminSession struct {
	Email string `json:"e"`
	CSRF  string `json:"c"`
}

type adminKey struct{}

// adminEmail is the signed-in admin placed in the context by guard.
func adminEmail(ctx context.Context) string {
	s, _ := ctx.Value(adminKey{}).(adminSession)
	return s.Email
}

type adminHandlers struct {
	svc    *auth.Service
	oidc   *auth.OIDC
	signer *auth.Signer
	admins map[string]bool
	secure bool
	usage  *usage.Recorder
	cost   *cost.Provider
	fb     *feedback.Service
	tutor  bool
	latch  *spend.Latch
}

// registerAdmin adds the admin sign-in and console routes (SPEC-008 FR-014).
func registerAdmin(mux *http.ServeMux, cfg RouterConfig) {
	h := &adminHandlers{latch: cfg.TutorLatch, svc: cfg.Auth, oidc: cfg.OIDC, signer: cfg.Signer, secure: cfg.SecureCookies, admins: map[string]bool{},
		usage: cfg.Usage, cost: cfg.Cost, fb: cfg.Feedback, tutor: !cfg.TutorDisabled}
	for _, e := range cfg.AdminEmails {
		h.admins[strings.ToLower(strings.TrimSpace(e))] = true
	}
	limiter := NewRateLimiter(120, time.Minute)
	limiter.SetTrustedProxyHops(cfg.TrustedProxyHops)
	guard := func(fn http.HandlerFunc) http.Handler { return limiter.Middleware(h.guard(fn)) }

	mux.HandleFunc("GET /api/auth/admin/login", h.login)
	mux.HandleFunc("GET /api/auth/admin/callback", h.callback)
	mux.Handle("POST /api/auth/admin/logout", guard(h.logout))

	mux.Handle("GET /api/admin/me", guard(h.me))
	mux.Handle("GET /api/admin/dashboard", guard(h.dashboard))
	mux.Handle("GET /api/admin/accounts", guard(h.accounts))
	mux.Handle("GET /api/admin/accounts.csv", guard(h.accountsCSV))
	mux.Handle("GET /api/admin/invites", guard(h.invites))
	mux.Handle("POST /api/admin/invites", guard(h.createInvites))
	mux.Handle("POST /api/admin/invites/{id}/revoke", guard(h.revokeInvite))
	mux.Handle("POST /api/admin/accounts/{betaId}/revoke", guard(h.revokeAccount))
	mux.Handle("POST /api/admin/accounts/{betaId}/reissue", guard(h.reissue))
	mux.Handle("POST /api/admin/accounts/{betaId}/extend", guard(h.extend))
	mux.Handle("POST /api/admin/accounts/extend-label", guard(h.extendLabel))
	mux.Handle("GET /api/admin/audit", guard(h.audit))
	if h.usage != nil && h.cost != nil {
		mux.Handle("GET /api/admin/overview", guard(h.overview))
		mux.Handle("GET /api/admin/usage", guard(h.usageReport))
		mux.Handle("GET /api/admin/users/activity", guard(h.activity))
		mux.Handle("GET /api/admin/costs", guard(h.costs))
		if h.latch != nil {
			mux.Handle("POST /api/admin/tutor/reset", guard(h.resetTutor))
		}
	}
	if h.fb != nil {
		mux.Handle("GET /api/admin/feedback", guard(h.feedbackList))
		mux.Handle("GET /api/admin/feedback.csv", guard(h.feedbackCSV))
		mux.Handle("POST /api/admin/feedback/{id}/status", guard(h.feedbackStatus))
		mux.Handle("POST /api/admin/feedback/{id}/delete", guard(h.feedbackDelete))
	}
}

// guard requires a valid admin cookie whose email is still on the allowlist. Writes also need the
// CSRF token, a same-origin request and a JSON body.
func (h *adminHandlers) guard(next http.HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var sess adminSession
		c, err := r.Cookie(adminCookie)
		if err != nil || h.signer.Verify(c.Value, &sess) != nil || !h.admins[strings.ToLower(sess.Email)] {
			writeAuthError(w, http.StatusUnauthorized, "admin_required", "Admin sign-in required")
			return
		}
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			if !sameOrigin(r) || subtle.ConstantTimeCompare([]byte(r.Header.Get(csrfHeader)), []byte(sess.CSRF)) != 1 {
				writeAuthError(w, http.StatusForbidden, "csrf", "Request refused")
				return
			}
			requireJSON(next).ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), adminKey{}, sess)))
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), adminKey{}, sess)))
	})
}

// ---- sign-in with the organisation identity provider

func (h *adminHandlers) login(w http.ResponseWriter, r *http.Request) {
	if h.oidc == nil {
		writeAuthError(w, http.StatusServiceUnavailable, "admin_not_configured", "Admin sign-in is not configured")
		return
	}
	authURL, flow, err := h.oidc.Begin(r.Context())
	if err != nil {
		writeAuthError(w, http.StatusBadGateway, "admin_unreachable", "The identity provider could not be reached")
		return
	}
	http.SetCookie(w, &http.Cookie{Name: flowCookie, Value: h.signer.Sign(flow, flowTTL), Path: flowCookiePth,
		MaxAge: int(flowTTL.Seconds()), HttpOnly: true, Secure: h.secure, SameSite: http.SameSiteLaxMode})
	w.Header().Set("Cache-Control", "no-store")
	http.Redirect(w, r, authURL, http.StatusFound)
}

func adminRedirect(w http.ResponseWriter, r *http.Request, errCode string) {
	to := "/admin"
	if errCode != "" {
		to += "?error=" + url.QueryEscape(errCode) // never the attempted email
	}
	http.Redirect(w, r, to, http.StatusFound)
}

func (h *adminHandlers) callback(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{Name: flowCookie, Value: "", Path: flowCookiePth, MaxAge: -1, HttpOnly: true, Secure: h.secure, SameSite: http.SameSiteLaxMode})
	w.Header().Set("Cache-Control", "no-store")
	var flow auth.FlowState
	c, err := r.Cookie(flowCookie)
	if h.oidc == nil || err != nil || h.signer.Verify(c.Value, &flow) != nil || r.URL.Query().Get("error") != "" {
		adminRedirect(w, r, "state")
		return
	}
	email, err := h.oidc.Finish(r.Context(), flow, r.URL.Query().Get("code"), r.URL.Query().Get("state"))
	switch {
	case err == nil:
	case errors.Is(err, auth.ErrOIDCState):
		adminRedirect(w, r, "state")
		return
	case errors.Is(err, auth.ErrOIDCNotAllowed):
		adminRedirect(w, r, "not_allowed")
		return
	case errors.Is(err, auth.ErrOIDCMFA):
		adminRedirect(w, r, "mfa_required")
		return
	default:
		adminRedirect(w, r, "token")
		return
	}
	http.SetCookie(w, &http.Cookie{Name: adminCookie, Value: h.signer.Sign(adminSession{Email: email, CSRF: auth.NewToken()}, adminTTL),
		Path: "/", MaxAge: int(adminTTL.Seconds()), HttpOnly: true, Secure: h.secure, SameSite: http.SameSiteLaxMode})
	adminRedirect(w, r, "")
}

func (h *adminHandlers) logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{Name: adminCookie, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: h.secure, SameSite: http.SameSiteLaxMode})
	w.WriteHeader(http.StatusNoContent)
}

func (h *adminHandlers) me(w http.ResponseWriter, r *http.Request) {
	s := r.Context().Value(adminKey{}).(adminSession)
	writeSecretJSON(w, map[string]string{"email": s.Email, "csrfToken": s.CSRF})
}

// ---- reading

func (h *adminHandlers) fail(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, auth.ErrNotFound):
		writeAuthError(w, http.StatusNotFound, "not_found", "Not found")
	case errors.Is(err, auth.ErrInvalidInput):
		writeAuthError(w, http.StatusBadRequest, "invalid", "That request is not valid")
	case errors.Is(err, auth.ErrAccountRevoked):
		writeAuthError(w, http.StatusConflict, "revoked", "This account was revoked. Send a new invite instead.")
	case errors.Is(err, auth.ErrSeatCap):
		writeAuthError(w, http.StatusConflict, "seat_cap", h.svc.SeatCapMessage())
	default:
		writeAuthError(w, http.StatusServiceUnavailable, "unavailable", "Service temporarily unavailable")
	}
}

func (h *adminHandlers) dashboard(w http.ResponseWriter, r *http.Request) {
	d, err := h.svc.Dashboard(r.Context(), r.URL.Query().Get("label"))
	if err != nil {
		h.fail(w, err)
		return
	}
	writeSecretJSON(w, d)
}

func intParam(r *http.Request, key string, def, min, max int) int {
	n, err := strconv.Atoi(r.URL.Query().Get(key))
	if err != nil || n < min {
		return def
	}
	if n > max {
		return max
	}
	return n
}

func accountFilter(r *http.Request) (auth.AccountFilter, bool) {
	q := r.URL.Query()
	f := auth.AccountFilter{Label: q.Get("label"), Status: q.Get("status"), Sort: q.Get("sort"),
		Limit: intParam(r, "limit", 100, 1, 500), Offset: intParam(r, "offset", 0, 0, 1_000_000)}
	switch f.Status {
	case "", "active", "expired", "revoked":
	default:
		return f, false
	}
	switch f.Sort {
	case "", "activated", "expiry", "lastSeen":
	default:
		return f, false
	}
	f.Desc = q.Get("order") == "desc" || (q.Get("order") == "" && f.Sort == "lastSeen")
	return f, true
}

func (h *adminHandlers) accounts(w http.ResponseWriter, r *http.Request) {
	f, ok := accountFilter(r)
	if !ok {
		writeAuthError(w, http.StatusBadRequest, "invalid", "That request is not valid")
		return
	}
	rows, total, err := h.svc.ListAccounts(r.Context(), f)
	if err != nil {
		h.fail(w, err)
		return
	}
	h.usage.Decorate(rows)
	writeSecretJSON(w, map[string]any{"items": rows, "total": total})
}

func (h *adminHandlers) accountsCSV(w http.ResponseWriter, r *http.Request) {
	f, ok := accountFilter(r)
	if !ok {
		writeAuthError(w, http.StatusBadRequest, "invalid", "That request is not valid")
		return
	}
	raw, err := h.svc.AccountsCSV(r.Context(), f)
	if err != nil {
		h.fail(w, err)
		return
	}
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="accounts.csv"`)
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write(raw)
}

func (h *adminHandlers) invites(w http.ResponseWriter, r *http.Request) {
	rows, err := h.svc.ListInvites(r.Context(), r.URL.Query().Get("status"))
	if err != nil {
		h.fail(w, err)
		return
	}
	writeSecretJSON(w, map[string]any{"items": rows, "total": len(rows)})
}

func (h *adminHandlers) audit(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListAudit(r.Context(), intParam(r, "limit", 100, 1, 500), r.URL.Query().Get("before"))
	if err != nil {
		h.fail(w, err)
		return
	}
	writeSecretJSON(w, map[string]any{"items": items})
}

// ---- changes

func (h *adminHandlers) createInvites(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Count int    `json:"count"`
		Label string `json:"label"`
	}
	if !decodeBody(w, r, &in) {
		return
	}
	links, err := h.svc.CreateInvites(r.Context(), adminEmail(r.Context()), in.Count, in.Label)
	if err != nil {
		h.fail(w, err)
		return
	}
	writeSecretJSONStatus(w, http.StatusCreated, map[string]any{"links": links}) // shown once, never cached
}

func (h *adminHandlers) noContent(w http.ResponseWriter, err error) {
	if err != nil {
		if errors.Is(err, auth.ErrInvalidInput) {
			writeAuthError(w, http.StatusConflict, "not_pending", "Only an unused invite can be revoked")
			return
		}
		h.fail(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *adminHandlers) revokeInvite(w http.ResponseWriter, r *http.Request) {
	h.noContent(w, h.svc.RevokeInvite(r.Context(), adminEmail(r.Context()), r.PathValue("id")))
}

func (h *adminHandlers) revokeAccount(w http.ResponseWriter, r *http.Request) {
	h.noContent(w, h.svc.RevokeAccount(r.Context(), adminEmail(r.Context()), r.PathValue("betaId")))
}

func (h *adminHandlers) reissue(w http.ResponseWriter, r *http.Request) {
	pw, err := h.svc.ReissuePassword(r.Context(), adminEmail(r.Context()), r.PathValue("betaId"))
	if err != nil {
		h.fail(w, err)
		return
	}
	writeSecretJSON(w, map[string]string{"password": pw})
}

func (h *adminHandlers) extend(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Months int `json:"months"`
	}
	if !decodeBody(w, r, &in) {
		return
	}
	exp, err := h.svc.Extend(r.Context(), adminEmail(r.Context()), r.PathValue("betaId"), in.Months)
	if err != nil {
		h.fail(w, err)
		return
	}
	writeSecretJSON(w, map[string]any{"expiresAt": exp})
}

func (h *adminHandlers) extendLabel(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Label  string `json:"label"`
		Months int    `json:"months"`
	}
	if !decodeBody(w, r, &in) {
		return
	}
	n, err := h.svc.ExtendLabel(r.Context(), adminEmail(r.Context()), in.Label, in.Months)
	if err != nil {
		h.fail(w, err)
		return
	}
	writeSecretJSON(w, map[string]any{"extended": n})
}
