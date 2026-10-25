// SPEC: NFR-SEC-03, NFR-SEC-04, NFR-SEC-08, DC-07
package api

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
)

const (
	CSPValue = "default-src 'self'; img-src 'self' https://raw.githubusercontent.com data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'"
)

// SecurityHeadersMiddleware ensures all responses carry the required security headers (NFR-SEC-03)
// and emits NO CORS headers (NFR-SEC-04).
func SecurityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Cross-Origin-Opener-Policy", "same-origin")
		w.Header().Set("Content-Security-Policy", CSPValue)

		// Never emit CORS headers per NFR-SEC-04
		w.Header().Del("Access-Control-Allow-Origin")
		w.Header().Del("Access-Control-Allow-Methods")
		w.Header().Del("Access-Control-Allow-Headers")

		next.ServeHTTP(w, r)
	})
}

// PanicRecoveryMiddleware recovers from panics and returns 500 {"error":"internal error"} (NFR-SEC-08).
// The panic is logged server-side without the request body.
func PanicRecoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("panic recovered in HTTP handler",
					"error", fmt.Sprintf("%v", rec),
					"stack", string(debug.Stack()),
					"path", r.URL.Path,
					"method", r.Method,
				)

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				_ = json.NewEncoder(w).Encode(map[string]string{
					"error": "internal error",
				})
			}
		}()
		next.ServeHTTP(w, r)
	})
}
