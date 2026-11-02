// SPEC: FR-033, FR-034, SC-014
package api

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLessonAssetsAreServedFromTheAppAndCannotLeaveTheFolder(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "assets"), 0o755); err != nil {
		t.Fatal(err)
	}
	name := "0123456789abcdef0123456789abcdef.png"
	if err := os.WriteFile(filepath.Join(dir, "assets", name), []byte("\x89PNG\r\n\x1a\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "secret.png"), []byte("secret"), 0o644); err != nil {
		t.Fatal(err)
	}
	h := NewRouter(RouterConfig{ContentDir: dir})
	get := func(path string) *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest(http.MethodGet, path, nil))
		return w
	}
	w := get("/lesson-assets/" + name)
	if w.Code != 200 || w.Header().Get("Content-Type") != "image/png" || !strings.Contains(w.Header().Get("Cache-Control"), "immutable") {
		t.Errorf("asset: %d %v", w.Code, w.Header())
	}
	if w.Header().Get("Content-Security-Policy") != CSPValue {
		t.Error("an asset response must carry the security headers")
	}
	for _, bad := range []string{"/lesson-assets/secret.png", "/lesson-assets/..%2Fsecret.png", "/lesson-assets/ffffffffffffffffffffffffffffffff.png", "/lesson-assets/" + name + ".exe"} {
		if w := get(bad); w.Code == 200 {
			t.Errorf("%s must not be served", bad)
		}
	}
}

// FR-034: images, scripts and connections stay on the app's own origin.
func TestCSPAllowsNoThirdPartyHosts(t *testing.T) {
	if strings.Contains(CSPValue, "http") || strings.Contains(CSPValue, "data:") {
		t.Errorf("CSP: %s", CSPValue)
	}
	for _, want := range []string{"img-src 'self'", "script-src 'self'", "connect-src 'self'"} {
		if !strings.Contains(CSPValue, want) {
			t.Errorf("CSP is missing %s", want)
		}
	}
}
