// SPEC: FR-040, FR-047, FR-050
package api

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"ai-foundations-coach/internal/feedback"
	"ai-foundations-coach/internal/usage"
)

// statusWriter remembers the status code. It passes Flush through and unwraps, so streaming answers
// and http.ResponseController keep working.
type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	if w.status == 0 {
		w.status = code
	}
	w.ResponseWriter.WriteHeader(code)
}

func (w *statusWriter) Flush() {
	if f, ok := w.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

func (w *statusWriter) Unwrap() http.ResponseWriter { return w.ResponseWriter }

// usageMiddleware counts API requests and server errors. It records no path, address or identity.
// The platform's health check is left out so an idle server shows no traffic.
func usageMiddleware(rec *usage.Recorder) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		if rec == nil {
			return next
		}
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !strings.HasPrefix(r.URL.Path, "/api/") || r.URL.Path == "/api/health" {
				next.ServeHTTP(w, r)
				return
			}
			sw := &statusWriter{ResponseWriter: w}
			next.ServeHTTP(sw, r)
			rec.Inc(usage.Requests)
			if sw.status >= 500 {
				rec.Inc(usage.Errors5xx)
			}
		})
	}
}

// seenMiddleware notes which account is active. It sits inside SessionGate.
func seenMiddleware(rec *usage.Recorder) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		if rec == nil {
			return next
		}
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if s, ok := SessionFrom(r.Context()); ok {
				rec.Seen(r.Context(), s.BetaID)
			}
			next.ServeHTTP(w, r)
		})
	}
}

func notAvailable(w http.ResponseWriter, _ *http.Request) {
	writeAuthError(w, http.StatusNotFound, "not_available", "Not available on this server")
}

// registerLearnerExtras adds the routes a signed-in learner's app calls besides lessons.
func registerLearnerExtras(mux *http.ServeMux, cfg RouterConfig) {
	if cfg.Usage == nil {
		mux.HandleFunc("POST /api/usage/event", notAvailable)
	} else {
		mux.Handle("POST /api/usage/event", requireJSON(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var in struct {
				Event string `json:"event"`
			}
			if !decodeBody(w, r, &in) {
				return
			}
			if in.Event != "quiz_open" {
				writeAuthError(w, http.StatusBadRequest, "invalid", "Unknown event")
				return
			}
			cfg.Usage.Inc(usage.Quiz)
			w.WriteHeader(http.StatusNoContent)
		})))
	}

	if cfg.Feedback == nil || cfg.Auth == nil {
		mux.HandleFunc("POST /api/feedback", notAvailable)
		return
	}
	limiter := NewRateLimiter(20, time.Minute)
	limiter.SetTrustedProxyHops(cfg.TrustedProxyHops)
	mux.Handle("POST /api/feedback", limiter.Middleware(requireJSON(submitFeedback(cfg.Feedback))))
}

const msgPII = "Please remove personal details (like phone numbers, emails or addresses) and send again."

func submitFeedback(fb *feedback.Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sess, ok := SessionFrom(r.Context())
		if !ok {
			writeAuthError(w, http.StatusUnauthorized, "signin_required", msgSignInRequired)
			return
		}
		var in struct {
			Rating     int    `json:"rating"`
			Category   string `json:"category"`
			Message    string `json:"message"`
			LessonID   string `json:"lessonId"`
			Mode       string `json:"mode"`
			AppVersion string `json:"appVersion"`
		}
		if !decodeBody(w, r, &in) {
			return
		}
		err := fb.Submit(r.Context(), sess.BetaID, sess.Label, feedback.Input{
			Rating: in.Rating, Category: in.Category, Message: in.Message, LessonID: in.LessonID, Mode: in.Mode, AppVersion: in.AppVersion,
		})
		var pii *feedback.PIIError
		switch {
		case err == nil:
			writeSecretJSONStatus(w, http.StatusCreated, map[string]bool{"ok": true})
		case errors.As(err, &pii):
			// The kind is a fixed label. The matched text is neither echoed nor logged (FR-048).
			writeSecretJSONStatus(w, http.StatusUnprocessableEntity, map[string]string{"error": msgPII, "code": "pii_detected", "kind": pii.Kind})
		case errors.Is(err, feedback.ErrInvalid):
			writeAuthError(w, http.StatusBadRequest, "invalid", "That feedback is not valid")
		case errors.Is(err, feedback.ErrLimit):
			writeAuthError(w, http.StatusTooManyRequests, "feedback_limit", "Thanks! You've sent a few already. Please try again later.")
		default:
			writeAuthError(w, http.StatusServiceUnavailable, "unavailable", "Service temporarily unavailable")
		}
	})
}
