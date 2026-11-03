// SPEC: SPEC-009 FR-012, FR-015
package api

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestAudioIsServedForApprovedLanguagesOnly(t *testing.T) {
	for _, status := range []string{"approved", "hidden"} {
		dir := langContent(t, status)
		files := map[string]string{
			"audio/hi/manifest.json":                        `{"language":"hi","tracks":{}}`,
			"audio/hi/1-intro/junior/section-what-chip.mp3": "ID3-mp3-bytes",
			"audio/hi/global/chip-mascot-greeting-nova.mp3": "ID3-greeting",
			"lessons/1-intro.json":                          `{"id":"1-intro"}`,
		}
		for p, body := range files {
			f := filepath.Join(dir, filepath.FromSlash(p))
			_ = os.MkdirAll(filepath.Dir(f), 0o755)
			if err := os.WriteFile(f, []byte(body), 0o644); err != nil {
				t.Fatal(err)
			}
		}
		router := NewRouter(RouterConfig{ContentDir: dir})
		get := func(path string, header ...string) *httptest.ResponseRecorder {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			if len(header) == 2 {
				req.Header.Set(header[0], header[1])
			}
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)
			return rec
		}

		ok := []struct{ path, ctype string }{
			{"/api/audio/hi/1-intro/junior/section-what-chip.mp3", "audio/mpeg"},
			{"/api/audio/hi/global/chip-mascot-greeting-nova.mp3", "audio/mpeg"},
			{"/api/audio/hi/manifest.json", "application/json"},
		}
		for _, c := range ok {
			rec := get(c.path)
			want := http.StatusOK
			if status == "hidden" {
				want = http.StatusNotFound // a hidden language's recordings are not offered
			}
			if rec.Code != want || (want == 200 && rec.Header().Get("Content-Type") != c.ctype) {
				t.Errorf("%s %s: %d %q", status, c.path, rec.Code, rec.Header().Get("Content-Type"))
			}
		}
		if status != "approved" {
			continue
		}
		// Audio seeking uses Range requests.
		if rec := get("/api/audio/hi/1-intro/junior/section-what-chip.mp3", "Range", "bytes=0-2"); rec.Code != http.StatusPartialContent || rec.Body.String() != "ID3" {
			t.Errorf("range: %d %q", rec.Code, rec.Body.String())
		}
		for _, bad := range []string{
			"/api/audio/hi/../lessons/1-intro.json",
			"/api/audio/hi/%2e%2e/lessons/1-intro.json",
			"/api/audio/hi/1-intro/junior/section-what-chip.json",
			"/api/audio/hi/1-intro/junior/Section-What-chip.mp3",
			"/api/audio/hi/a/b/c/d.mp3",
			"/api/audio/en/manifest.json",
			"/api/audio/xx/manifest.json",
			"/api/audio/hi/1-intro/junior/missing-chip.mp3",
		} {
			if rec := get(bad); rec.Code == http.StatusOK || rec.Code == http.StatusPartialContent {
				t.Errorf("%s: %d %s", bad, rec.Code, rec.Body.String())
			}
		}
	}
}
