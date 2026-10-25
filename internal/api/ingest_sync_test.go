// SPEC: AC-37, FR-ING-09, FR-SET-05
package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestAC37_IngestSync(t *testing.T) {
	router := NewRouter(RouterConfig{ContentDir: "public-content"})

	// 1. GET returns 405 Method Not Allowed
	req := httptest.NewRequest(http.MethodGet, "/api/ingest/sync", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405 for GET /api/ingest/sync, got %d", rec.Code)
	}

	// 2. POST without token returns 400 Bad Request
	req = httptest.NewRequest(http.MethodPost, "/api/ingest/sync", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 when token missing, got %d", rec.Code)
	}

	var resp IngestSyncResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.OK != false {
		t.Errorf("expected OK=false when token missing")
	}
	if !strings.Contains(resp.Error, "GITHUB_TOKEN") {
		t.Errorf("expected error message to mention GITHUB_TOKEN, got %q", resp.Error)
	}
}
