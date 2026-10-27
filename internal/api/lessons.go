// SPEC: FR-CNT-01, FR-CNT-02, FR-CNT-03, FR-CNT-04, FR-CNT-05, FR-CNT-06, FR-CNT-07
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
)

var idRegex = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,63}$`)

type LessonsHandler struct {
	contentDir string
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

	// Check if contentDir exists and has index.json (FR-CNT-07)
	indexPath := filepath.Join(h.contentDir, "index.json")
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

	// FR-CNT-04: Path traversal protection
	lessonsDir := filepath.Join(h.contentDir, "lessons")
	absLessonsDir, err := filepath.Abs(lessonsDir)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": "internal error",
		})
		return
	}

	mode := r.URL.Query().Get("mode")
	var targetFile string
	if mode == "junior" || mode == "plain-english" {
		adaptiveCandidate := filepath.Join(lessonsDir, id+"."+mode+".json")
		if _, err := os.Stat(adaptiveCandidate); err == nil {
			targetFile = id + "." + mode + ".json"
		}
	}
	if targetFile == "" {
		targetFile = id + ".json"
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
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}
