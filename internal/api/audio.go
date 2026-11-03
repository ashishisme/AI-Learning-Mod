// SPEC: SPEC-009 FR-012, FR-015; DC-09 (recorded narration ships with the release, from our own origin)

package api

import (
	"net/http"
	"os"
	"path/filepath"
	"regexp"

	"ai-foundations-coach/internal/i18n"
)

// AudioURLPrefix is where recorded narration is served. It is under /api/ so the session gate covers
// it like the lessons it reads aloud; same-origin <audio> requests carry the session cookie.
const AudioURLPrefix = "/api/audio/"

// Track files are <lessonId>/<mode>/<trackId>-<persona>.mp3 or global/<trackId>-<persona>.mp3, all
// lowercase letters, digits and hyphens, so a request can never leave the language's audio folder.
var audioPathRe = regexp.MustCompile(`^(?:[a-z0-9-]+/){1,2}[a-z0-9-]+\.mp3$|^manifest\.json$`)

// audioHandler serves public-content/audio/<lang>/... for approved languages only.
func audioHandler(contentDir string, langs *i18n.Set) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		code, rest := r.PathValue("lang"), r.PathValue("path")
		if _, ok := langs.Lookup(code); !ok || code == i18n.English.Code || !audioPathRe.MatchString(rest) {
			http.NotFound(w, r)
			return
		}
		file := filepath.Join(contentDir, "audio", code, filepath.FromSlash(rest))
		if info, err := os.Stat(file); err != nil || info.IsDir() {
			http.NotFound(w, r)
			return
		}
		// The runtime image has no MIME table, so the types are set here.
		if rest == "manifest.json" {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Cache-Control", "private, no-cache") // changes with each release
		} else {
			w.Header().Set("Content-Type", "audio/mpeg")
			w.Header().Set("Cache-Control", "private, max-age=86400")
		}
		http.ServeFile(w, r, file) // also answers Range requests, which audio seeking uses
	}
}
