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
	t.Setenv(SyncEnabledEnv, "true")
	t.Setenv("GITHUB_TOKEN", "")
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

func postSync(h http.Handler, contentType string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/api/ingest/sync", strings.NewReader(`{}`))
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestIngestSyncDisabledByDefault(t *testing.T) {
	t.Setenv(SyncEnabledEnv, "")
	t.Setenv("GITHUB_TOKEN", "server-token")
	if rec := postSync(NewIngestSyncHandler(t.TempDir()), "application/json"); rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 when sync is not enabled, got %d", rec.Code)
	}
}

func TestIngestSyncRejectsFormPost(t *testing.T) {
	t.Setenv(SyncEnabledEnv, "true")
	t.Setenv("GITHUB_TOKEN", "server-token")
	rec := postSync(NewIngestSyncHandler(t.TempDir()), "application/x-www-form-urlencoded")
	if rec.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("expected 415 for a form post, got %d", rec.Code)
	}
}

func TestIngestSyncRejectsOverlappingRun(t *testing.T) {
	t.Setenv(SyncEnabledEnv, "true")
	t.Setenv("GITHUB_TOKEN", "server-token")
	h := NewIngestSyncHandler(t.TempDir())
	h.running.Lock()
	defer h.running.Unlock()
	if rec := postSync(h, "application/json"); rec.Code != http.StatusConflict {
		t.Fatalf("expected 409 while a sync is running, got %d", rec.Code)
	}
}

func TestIngestSyncIsRateLimited(t *testing.T) {
	t.Setenv(SyncEnabledEnv, "")
	router := NewRouter(RouterConfig{ContentDir: t.TempDir()})
	for i := 0; i < SyncRateLimit; i++ {
		if rec := postSync(router, "application/json"); rec.Code != http.StatusForbidden {
			t.Fatalf("request %d: expected 403, got %d", i, rec.Code)
		}
	}
	if rec := postSync(router, "application/json"); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429 past the limit, got %d", rec.Code)
	}
}
