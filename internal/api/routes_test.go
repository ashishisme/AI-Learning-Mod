// SPEC: AC-18
package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// AC-18 (NFR-OPS-02): /pprof, /debug, /metrics are not registered and return 404.
func TestAC18_NoDebugEndpoints(t *testing.T) {
	router := NewRouter(RouterConfig{ContentDir: t.TempDir()})

	forbiddenRoutes := []string{
		"/pprof",
		"/pprof/",
		"/debug",
		"/debug/pprof",
		"/debug/pprof/",
		"/debug/vars",
		"/metrics",
		"/metrics/",
	}

	for _, path := range forbiddenRoutes {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Errorf("expected 404 for forbidden route %q, got %d", path, rec.Code)
		}
	}
}
