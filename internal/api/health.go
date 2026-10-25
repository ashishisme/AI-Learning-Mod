// SPEC: NFR-REL-02
package api

import (
	"net/http"
)

// HealthHandler returns exactly {"ok":true} with zero environment or build leakage (NFR-REL-02, §7.1.4).
func HealthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"ok":true}`))
}
