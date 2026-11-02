package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
)

// Unknown API paths, including the removed curriculum sync, get a JSON 404, never index.html.
func TestUnknownAPIPathIsJSON404NotIndexHTML(t *testing.T) {
	static := fstest.MapFS{"index.html": {Data: []byte("<!doctype html><title>app</title>")}}
	router := NewRouter(RouterConfig{ContentDir: t.TempDir(), StaticFS: static})

	for _, tc := range []struct{ method, path string }{
		{http.MethodPost, "/api/ingest/sync"},
		{http.MethodGet, "/api/admin/feedback"},
	} {
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, httptest.NewRequest(tc.method, tc.path, strings.NewReader(`{}`)))
		if rec.Code != http.StatusNotFound || !strings.HasPrefix(rec.Header().Get("Content-Type"), "application/json") || strings.Contains(rec.Body.String(), "<!doctype") {
			t.Errorf("%s %s: %d %q %q", tc.method, tc.path, rec.Code, rec.Header().Get("Content-Type"), rec.Body.String())
		}
	}

	// Client-side routes still get the app.
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/lesson/1-intro", nil))
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "<!doctype") {
		t.Errorf("SPA route: %d %q", rec.Code, rec.Body.String())
	}
}
