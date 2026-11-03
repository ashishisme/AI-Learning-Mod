// SPEC: DC-02, NFR-OPS-02, NFR-SEC-03, NFR-SEC-06, NFR-SEC-08
package api

import (
	"encoding/json"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"ai-foundations-coach/internal/auth"
	"ai-foundations-coach/internal/cost"
	"ai-foundations-coach/internal/feedback"
	"ai-foundations-coach/internal/i18n"
	"ai-foundations-coach/internal/ingest"
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
	// ignored, outbound calls to non-public addresses are refused, and AI-config-test is
	// unavailable.
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
	// TutorLatch switches the tutor off at the monthly budget until an admin resets it (FR-026), and
	// BudgetPush lets a verified budget notification trip it. Nil on a self-hosted run.
	TutorLatch *spend.Latch
	BudgetPush *BudgetPush
	// Release is the tag this image was built from, empty outside a release (FR-031).
	Release string
}

// RuntimeInfo is what the UI needs to know about this deployment.
type RuntimeInfo struct {
	Hosted          bool   `json:"hosted"`
	AuthRequired    bool   `json:"authRequired"`
	TutorEnabled    bool   `json:"tutorEnabled"`
	FeedbackEnabled bool   `json:"feedbackEnabled"`
	Release         string `json:"release,omitempty"`
	// Languages lists the approved interface languages, English first (SPEC-009 FR-001).
	Languages []LanguageInfo `json:"languages"`
}

// LanguageInfo is one approved language as the UI needs it.
type LanguageInfo struct {
	Code       string `json:"code"`
	Name       string `json:"name"`
	SpeechLang string `json:"speechLang"`
}

func languageInfos(s *i18n.Set) []LanguageInfo {
	var out []LanguageInfo
	for _, l := range s.Approved() {
		out = append(out, LanguageInfo{Code: l.Code, Name: l.Name, SpeechLang: l.SpeechLang})
	}
	return out
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
	// SPEC-009: languages offered to learners. A broken list must not take the site down, so it
	// falls back to English only and says why.
	langs, err := i18n.Load(lessonsHandler.contentDir)
	if err != nil {
		slog.Error("Offering English only: cannot read languages.json", "error", err.Error())
		langs = nil
	}
	lessonsHandler.langs = langs
	mux.HandleFunc("GET /api/lessons", lessonsHandler.GetIndex)
	mux.HandleFunc("GET /api/lessons/{id}", lessonsHandler.GetLesson)

	// Lesson images ship with the release (FR-033). Outside /api, so the session gate does not apply:
	// like the SPA itself, they hold no lesson text. Names are content hashes, so caching is safe.
	mux.HandleFunc("GET "+ingest.AssetURLPrefix+"{name}", func(w http.ResponseWriter, r *http.Request) {
		name := r.PathValue("name")
		file := filepath.Join(cfg.ContentDir, ingest.AssetDir, name)
		if !ingest.AssetNameRe.MatchString(name) {
			http.NotFound(w, r)
			return
		}
		if _, err := os.Stat(file); err != nil {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		http.ServeFile(w, r, file)
	})

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
	tutorHandler.latch = cfg.TutorLatch
	tutorHandler.usage = cfg.Usage
	mux.Handle("POST /api/tutor", limiter.Middleware(tutorHandler))
	mux.Handle("POST /api/tutor/stream", limiter.Middleware(tutorHandler))

	if cfg.Auth != nil {
		registerAuth(mux, cfg)
		registerAdmin(mux, cfg)
	}

	registerLearnerExtras(mux, cfg, langs)
	registerBudgetPush(mux, cfg)

	// Lets the UI hide controls that do not apply on a hosted deployment (FR-021).
	mux.HandleFunc("GET /api/runtime", RuntimeHandler(RuntimeInfo{
		Hosted: cfg.Hosted, AuthRequired: cfg.Auth != nil, TutorEnabled: !cfg.TutorDisabled,
		FeedbackEnabled: cfg.Auth != nil && cfg.FeedbackEnabled,
		Release:         cfg.Release,
		Languages:       languageInfos(langs),
	}))

	if cfg.Hosted {
		// FR-020: unavailable to everyone, with no outbound call and no content change.
		mux.HandleFunc("POST /api/config/test", hostedUnavailable)
		// FR-021a: the prompt for a learner's own local AI. No model call, so no spend.
		mux.Handle("POST /api/tutor/prepare", limiter.Middleware(TutorPrepareHandler(cfg.ContentDir, cfg.Usage)))
	} else {
		// Config test handler (FR-SET-03)
		mux.HandleFunc("POST /api/config/test", ConfigTestHandler)
	}

	// Static SPA assets serving with client-side fallback (if provided)
	if cfg.StaticFS != nil {
		fileServer := http.FileServer(http.FS(cfg.StaticFS))
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			path := r.URL.Path
			// An unknown API path must not get index.html, or callers fail parsing it as JSON.
			if strings.HasPrefix(path, "/api/") {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusNotFound)
				_, _ = w.Write([]byte(`{"error":"not found"}`))
				return
			}
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
	handler = RequestIDMiddleware(handler)
	handler = usageMiddleware(cfg.Usage)(handler) // outermost, so it also counts panics answered with 500

	return handler
}
