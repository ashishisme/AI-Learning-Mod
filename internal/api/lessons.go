// SPEC: FR-CNT-01, FR-CNT-02, FR-CNT-03, FR-CNT-04, FR-CNT-05, FR-CNT-06, FR-CNT-07; SPEC-009 FR-006, FR-009
package api

import (
	"encoding/json"
	"errors"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"ai-foundations-coach/internal/i18n"
	"ai-foundations-coach/internal/usage"
)

var idRegex = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,63}$`)

type LessonsHandler struct {
	contentDir string
	usage      *usage.Recorder
	langs      *i18n.Set // approved languages; nil means English only
}

// langRoot is where a language's content lives: English at the root, others under lang/<code>/.
// code must come from i18n.Set.Resolve, which only returns approved, path-safe codes.
func (h *LessonsHandler) langRoot(code string) string {
	if code == i18n.English.Code {
		return h.contentDir
	}
	return filepath.Join(h.contentDir, "lang", code)
}

func NewLessonsHandler(contentDir string) *LessonsHandler {
	if contentDir == "" {
		contentDir = "public-content"
	}
	return &LessonsHandler{
		contentDir: contentDir,
	}
}

// GetIndex handles GET /api/lessons (FR-CNT-01, §7.1.1)
func (h *LessonsHandler) GetIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// SPEC-009: a translated index when the language is approved and present, else English.
	served := h.langs.Resolve(r.URL.Query().Get("lang"))
	if _, err := os.Stat(filepath.Join(h.langRoot(served), "index.json")); err != nil {
		served = i18n.English.Code
	}
	w.Header().Set("Content-Language", served)

	// Check if contentDir exists and has index.json (FR-CNT-07)
	indexPath := filepath.Join(h.langRoot(served), "index.json")
	data, err := os.ReadFile(indexPath)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			w.WriteHeader(http.StatusServiceUnavailable)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"error": "content not generated",
			})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": "internal error",
		})
		return
	}

	// Verify valid index JSON
	var raw json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": "internal error",
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

// GetLesson handles GET /api/lessons/{id} (FR-CNT-02, §7.1.2)
func (h *LessonsHandler) GetLesson(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	// If path value is empty, try extracting from URL path suffix
	if id == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 3 && parts[0] == "api" && parts[1] == "lessons" {
			id = parts[2]
		}
	}

	// FR-CNT-03: Validate ID format before ANY filesystem access; invalid ID produces 400
	if !idRegex.MatchString(id) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": "invalid lesson id",
		})
		return
	}

	// SPEC-009 FR-009: try the chosen language first, then English, one file at a time.
	mode := r.URL.Query().Get("mode")
	if mode != "junior" && mode != "plain-english" {
		mode = ""
	}
	served := i18n.English.Code
	lessonsDir := filepath.Join(h.contentDir, "lessons")
	targetFile := id + ".json"
	type candidate struct{ lang, file string }
	var tries []candidate
	if lang := h.langs.Resolve(r.URL.Query().Get("lang")); lang != i18n.English.Code {
		if mode != "" {
			tries = append(tries, candidate{lang, id + "." + mode + ".json"})
		} else {
			tries = append(tries, candidate{lang, id + ".json"})
		}
	}
	if mode != "" {
		tries = append(tries, candidate{i18n.English.Code, id + "." + mode + ".json"})
	}
	for _, c := range tries {
		dir := filepath.Join(h.langRoot(c.lang), "lessons")
		if _, err := os.Stat(filepath.Join(dir, c.file)); err == nil {
			served, lessonsDir, targetFile = c.lang, dir, c.file
			break
		}
	}

	// FR-CNT-04: Path traversal protection
	absLessonsDir, err := filepath.Abs(lessonsDir)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": "internal error",
		})
		return
	}

	targetPath := filepath.Join(lessonsDir, targetFile)
	absTargetPath, err := filepath.Abs(targetPath)
	if err != nil || !strings.HasPrefix(absTargetPath, absLessonsDir+string(filepath.Separator)) {
		// Escaped directory -> 404 per FR-CNT-04
		w.WriteHeader(http.StatusNotFound)
		return
	}

	data, err := os.ReadFile(absTargetPath)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			// FR-CNT-05: Unknown id produces 404 with empty body
			w.WriteHeader(http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": "internal error",
		})
		return
	}

	// FR-CNT-06: Malformed lesson JSON on disk produces 500 with {"error":"internal error"}
	var lessonMap map[string]any
	if err := json.Unmarshal(data, &lessonMap); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": "internal error",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Language", served)
	// One count per page view: the lesson page always fetches the standard lesson once, and an
	// adaptive request carries ?mode= on top of that (FR-040).
	if mode == "" {
		h.usage.IncLesson(id)
	}
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}
