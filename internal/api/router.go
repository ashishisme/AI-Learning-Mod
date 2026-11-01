// SPEC: DC-02, NFR-OPS-02, NFR-SEC-03, NFR-SEC-06, NFR-SEC-08
package api

import (
	"encoding/json"
	"io/fs"
	"net/http"

	"ai-foundations-coach/internal/auth"
	"ai-foundations-coach/internal/cost"
	"ai-foundations-coach/internal/feedback"
	"ai-foundations-coach/internal/spend"
	"ai-foundations-coach/internal/usage"
)

type RouterConfig struct {
	ContentDir  string
	OpenAIKey   string
	RateLimiter *RateLimiter
	ModelClient ModelClient
	StaticFS    fs.FS // for SPA static assets

	// Hosted is true on a public deployment (SPEC-008 FR-018..FR-022): the AI endpoint, key,
	// model and TLS behaviour come only from server configuration, per-request overrides are
	// ignored, outbound calls to non-public addresses are refused, and curriculum sync and
	// AI-config-test are unavailable.
	Hosted bool
	// TrustedProxyHops is the number of reverse proxies in front of the server (see RateLimiter).
	TrustedProxyHops int

	// Auth turns on invite-only sign-in (SPEC-008 FR-001). When nil the app behaves as before and
	// /api/auth/* and /api/admin/* do not exist.
	Auth          *auth.Service
	OIDC          *auth.OIDC
	Signer        *auth.Signer
	AdminEmails   []string
	SecureCookies bool // set the Secure flag on cookies (PUBLIC_BASE_URL is https)
	// Usage counts activity, Cost reports what the beta costs, Feedback holds learner feedback.
	// All are nil on a self-hosted run with no state store.
	Usage    *usage.Recorder
	Cost     *cost.Provider
	Feedback *feedback.Service
	// Spend is the shared daily AI ceiling (FR-025). Nil means no ceiling (self-hosted, no store).
	Spend *spend.Tally
	// TutorDisabled refuses every tutor request (FR-024). The zero value leaves the tutor on.
	TutorDisabled bool
	// FeedbackEnabled is reported to the UI; it is true only when the auditor is configured (FR-058).
	FeedbackEnabled bool
}

// RuntimeInfo is what the UI needs to know about this deployment.
type RuntimeInfo struct {
	Hosted          bool `json:"hosted"`
	AuthRequired    bool `json:"authRequired"`
	TutorEnabled    bool `json:"tutorEnabled"`
	FeedbackEnabled bool `json:"feedbackEnabled"`
}

// RuntimeHandler reports deployment facts the UI needs. It is separate from /api/health,
// which must stay exactly {"ok":true} (NFR-REL-02).
func RuntimeHandler(info RuntimeInfo) http.HandlerFunc {
	body, _ := json.Marshal(info)
	return func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(body)
	}
}

func hostedUnavailable(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusForbidden)
	_, _ = w.Write([]byte(`{"error":"not available on this server"}`))
}

// NewRouter constructs the stdlib net/http ServeMux with method+path routes per DC-02.
// It wraps all routes with SecurityHeadersMiddleware and PanicRecoveryMiddleware.
func NewRouter(cfg RouterConfig) http.Handler {
	mux := http.NewServeMux()

	// Content handler
	lessonsHandler := NewLessonsHandler(cfg.ContentDir)
	lessonsHandler.usage = cfg.Usage
	mux.HandleFunc("GET /api/lessons", lessonsHandler.GetIndex)
	mux.HandleFunc("GET /api/lessons/{id}", lessonsHandler.GetLesson)

	// Health handler
	mux.HandleFunc("GET /api/health", HealthHandler)

	// Rate-limited Tutor handler
	limiter := cfg.RateLimiter
	if limiter == nil {
		limiter = NewRateLimiter(RateLimitLimit, RateLimitWindow)
	}
	limiter.SetTrustedProxyHops(cfg.TrustedProxyHops)
	tutorHandler := NewTutorHandler(cfg.OpenAIKey, cfg.ContentDir, cfg.ModelClient)
	tutorHandler.hosted = cfg.Hosted
	tutorHandler.enabled = !cfg.TutorDisabled
	tutorHandler.spend = cfg.Spend
	tutorHandler.usage = cfg.Usage
	mux.Handle("POST /api/tutor", limiter.Middleware(tutorHandler))
	mux.Handle("POST /api/tutor/stream", limiter.Middleware(tutorHandler))

	if cfg.Auth != nil {
		registerAuth(mux, cfg)
		registerAdmin(mux, cfg)
	}

	registerLearnerExtras(mux, cfg)

	// Lets the UI hide controls that do not apply on a hosted deployment (FR-021).
	mux.HandleFunc("GET /api/runtime", RuntimeHandler(RuntimeInfo{
		Hosted: cfg.Hosted, AuthRequired: cfg.Auth != nil, TutorEnabled: !cfg.TutorDisabled,
		FeedbackEnabled: cfg.Auth != nil && cfg.FeedbackEnabled,
	}))

	if cfg.Hosted {
		// FR-020: unavailable to everyone, with no outbound call and no content change.
		mux.HandleFunc("POST /api/config/test", hostedUnavailable)
		mux.HandleFunc("POST /api/ingest/sync", hostedUnavailable)
	} else {
		// Config test handler (FR-SET-03)
		mux.HandleFunc("POST /api/config/test", ConfigTestHandler)

		// Ingest sync handler (FR-ING-09, FR-SET-05)
		ingestSyncHandler := NewIngestSyncHandler(cfg.ContentDir)
		syncLimiter := NewRateLimiter(SyncRateLimit, RateLimitWindow)
		syncLimiter.SetTrustedProxyHops(cfg.TrustedProxyHops)
		mux.Handle("POST /api/ingest/sync", syncLimiter.Middleware(ingestSyncHandler))
	}

	// Static SPA assets serving with client-side fallback (if provided)
	if cfg.StaticFS != nil {
		fileServer := http.FileServer(http.FS(cfg.StaticFS))
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			path := r.URL.Path
			if path == "/" || path == "" {
				fileServer.ServeHTTP(w, r)
				return
			}
			trimmed := path[1:]
			if f, err := cfg.StaticFS.Open(trimmed); err == nil {
				_ = f.Close()
				fileServer.ServeHTTP(w, r)
				return
			}
			// Rewrite to / to serve index.html for SPA client-side routes (e.g. /lesson/:id, /quiz/:id)
			r2 := r.Clone(r.Context())
			r2.URL.Path = "/"
			fileServer.ServeHTTP(w, r2)
		})
	}

	// Chain middlewares: PanicRecovery outermost -> SecurityHeaders -> Mux
	var handler http.Handler = mux
	if cfg.Auth != nil {
		handler = seenMiddleware(cfg.Usage)(handler)
		handler = SessionGate(cfg.Auth, cfg.SecureCookies)(handler)
	}
	handler = SecurityHeadersMiddleware(handler)
	handler = PanicRecoveryMiddleware(handler)
	handler = usageMiddleware(cfg.Usage)(handler) // outermost, so it also counts panics answered with 500

	return handler
}
