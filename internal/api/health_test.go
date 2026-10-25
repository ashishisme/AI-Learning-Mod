// SPEC: AC-17
package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// AC-17 (NFR-REL-02): /api/health returns exactly {"ok":true} - no build info, version, or environment leakage.
func TestAC17_HealthExact(t *testing.T) {
	router := NewRouter(RouterConfig{ContentDir: t.TempDir()})

	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	expected := `{"ok":true}`
	if rec.Body.String() != expected {
		t.Errorf("expected exact body %q, got %q", expected, rec.Body.String())
	}
}
