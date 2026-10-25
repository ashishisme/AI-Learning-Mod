// SPEC: DC-02, NFR-OPS-02, NFR-SEC-03, NFR-SEC-06, NFR-SEC-08
package api

import (
	"io/fs"
	"net/http"
)

type RouterConfig struct {
	ContentDir  string
	OpenAIKey   string
	RateLimiter *RateLimiter
	ModelClient ModelClient
	StaticFS    fs.FS // for SPA static assets
}

// NewRouter constructs the stdlib net/http ServeMux with method+path routes per DC-02.
// It wraps all routes with SecurityHeadersMiddleware and PanicRecoveryMiddleware.
func NewRouter(cfg RouterConfig) http.Handler {
	mux := http.NewServeMux()

	// Content handler
	lessonsHandler := NewLessonsHandler(cfg.ContentDir)
	mux.HandleFunc("GET /api/lessons", lessonsHandler.GetIndex)
	mux.HandleFunc("GET /api/lessons/{id}", lessonsHandler.GetLesson)

	// Health handler
	mux.HandleFunc("GET /api/health", HealthHandler)

	// Rate-limited Tutor handler
	limiter := cfg.RateLimiter
	if limiter == nil {
		limiter = NewRateLimiter(RateLimitLimit, RateLimitWindow)
	}
	tutorHandler := NewTutorHandler(cfg.OpenAIKey, cfg.ContentDir, cfg.ModelClient)
	mux.Handle("POST /api/tutor", limiter.Middleware(tutorHandler))

	// Static SPA assets serving (if provided)
	if cfg.StaticFS != nil {
		fileServer := http.FileServer(http.FS(cfg.StaticFS))
		mux.Handle("/", fileServer)
	}

	// Chain middlewares: PanicRecovery outermost -> SecurityHeaders -> Mux
	var handler http.Handler = mux
	handler = SecurityHeadersMiddleware(handler)
	handler = PanicRecoveryMiddleware(handler)

	return handler
}
