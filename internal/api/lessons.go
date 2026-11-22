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
	// SPEC-013: every lesson is ours; the Standard journey's lesson is the Detailed version, which is
	// also the fallback for a journey with no file for this lesson.
	mode := r.URL.Query().Get("mode")
	if mode != "junior" && mode != "plain-english" && mode != "detailed" {
		mode = "detailed"
	}
	langs := []string{i18n.English.Code}
	if lang := h.langs.Resolve(r.URL.Query().Get("lang")); lang != i18n.English.Code {
		langs = []string{lang, i18n.English.Code}
	}
	modes := []string{mode}
	if mode != "detailed" {
		modes = append(modes, "detailed")
	}
	served := i18n.English.Code
	lessonsDir := filepath.Join(h.contentDir, "lessons")
	targetFile := id + "." + mode + ".json"
find:
	for _, m := range modes {
		for _, lang := range langs {
			dir := filepath.Join(h.langRoot(lang), "lessons")
			if _, err := os.Stat(filepath.Join(dir, id+"."+m+".json")); err == nil {
				served, lessonsDir, targetFile = lang, dir, id+"."+m+".json"
				break find
			}
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
	// One count per lesson shown: the lesson page fetches one version per view or journey switch (FR-040).
	h.usage.IncLesson(id)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}
