// SPEC: NFR-SEC-03, NFR-SEC-04, NFR-SEC-08, DC-07
package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
	"strings"
)

const (
	CSPValue = "default-src 'self'; img-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' http://localhost:* http://127.0.0.1:*; frame-ancestors 'none'; base-uri 'self'"
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

const requestIDHeader = "X-Request-ID"

// RequestIDMiddleware gives every response an ID, so a learner's report can be matched to a log line.
// An incoming value is ignored: it is attacker-controlled and would end up in the logs.
func RequestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b := make([]byte, 8)
		_, _ = rand.Read(b)
		w.Header().Set(requestIDHeader, hex.EncodeToString(b))
		next.ServeHTTP(w, r)
	})
}

// PanicRecoveryMiddleware recovers from panics and returns 500 {"error":"internal error"} (NFR-SEC-08).
// The panic is logged server-side without the request body.
func PanicRecoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				// The panic value is not logged: it can quote request data. The type and stack find
				// the bug, and only API paths are logged because an invite link holds a token.
				path := "(not an API path)"
				if strings.HasPrefix(r.URL.Path, "/api/") {
					path = r.URL.Path
				}
				slog.Error("panic recovered in HTTP handler",
					"error_class", fmt.Sprintf("%T", rec),
					"stack", string(debug.Stack()),
					"path", path,
					"method", r.Method,
					"requestId", w.Header().Get(requestIDHeader),
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
