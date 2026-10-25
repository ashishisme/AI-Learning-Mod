// SPEC: AC-04, AC-05, AC-06, AC-07
package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"strings"
)

func setupTestContent(t *testing.T) string {
	dir := t.TempDir()

	// Create index.json
	indexJSON := `{
		"commitSha": "abcdef1234567890abcdef1234567890abcdef12",
		"lessons": [
			{
				"id": "lesson-1",
				"module": "intro",
				"title": "Lesson 1 Title",
				"order": 0,
				"path": "lessons/01-Intro/README.md",
				"commitSha": "abcdef1234567890abcdef1234567890abcdef12"
			},
			{
				"id": "lesson-2",
				"module": "symbolic",
				"title": "Lesson 2 Title",
				"order": 1,
				"path": "lessons/02-Symbolic/README.md",
				"commitSha": "abcdef1234567890abcdef1234567890abcdef12"
			}
		]
	}`
	if err := os.WriteFile(filepath.Join(dir, "index.json"), []byte(indexJSON), 0644); err != nil {
		t.Fatalf("failed to write index: %v", err)
	}

	lessonsDir := filepath.Join(dir, "lessons")
	if err := os.MkdirAll(lessonsDir, 0755); err != nil {
		t.Fatalf("failed to create lessons dir: %v", err)
	}

	// Create lesson-1.json
	l1 := `{
		"id": "lesson-1",
		"module": "intro",
		"title": "Lesson 1 Title",
		"order": 0,
		"path": "lessons/01-Intro/README.md",
		"commitSha": "abcdef1234567890abcdef1234567890abcdef12",
		"blocks": [
			{"type": "markdown", "content": "# Lesson 1\n\nIntroductory text."}
		]
	}`
	if err := os.WriteFile(filepath.Join(lessonsDir, "lesson-1.json"), []byte(l1), 0644); err != nil {
		t.Fatalf("failed to write lesson-1: %v", err)
	}

	// Create lesson-2.json (valid)
	l2 := `{
		"id": "lesson-2",
		"module": "symbolic",
		"title": "Lesson 2 Title",
		"order": 1,
		"path": "lessons/02-Symbolic/README.md",
		"commitSha": "abcdef1234567890abcdef1234567890abcdef12",
		"blocks": [
			{"type": "markdown", "content": "# Lesson 2\n\nSymbolic reasoning."}
		]
	}`
	if err := os.WriteFile(filepath.Join(lessonsDir, "lesson-2.json"), []byte(l2), 0644); err != nil {
		t.Fatalf("failed to write lesson-2: %v", err)
	}

	return dir
}

// AC-04 (FR-CNT-01..02): GET /api/lessons and GET /api/lessons/{id} return conformant JSON with Content-Type: application/json
func TestAC04_GetLessons(t *testing.T) {
	contentDir := setupTestContent(t)
	router := NewRouter(RouterConfig{ContentDir: contentDir})

	// Test GET /api/lessons
	req := httptest.NewRequest(http.MethodGet, "/api/lessons", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/lessons expected 200, got %d", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %s", ct)
	}

	var indexMap map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &indexMap); err != nil {
		t.Fatalf("failed to parse index response as JSON: %v", err)
	}
	if _, ok := indexMap["lessons"]; !ok {
		t.Errorf("response missing 'lessons' array")
	}

	// Test GET /api/lessons/lesson-1
	req2 := httptest.NewRequest(http.MethodGet, "/api/lessons/lesson-1", nil)
	rec2 := httptest.NewRecorder()
	router.ServeHTTP(rec2, req2)

	if rec2.Code != http.StatusOK {
		t.Fatalf("GET /api/lessons/lesson-1 expected 200, got %d", rec2.Code)
	}
	if ct := rec2.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %s", ct)
	}

	var lessonMap map[string]any
	if err := json.Unmarshal(rec2.Body.Bytes(), &lessonMap); err != nil {
		t.Fatalf("failed to parse lesson response as JSON: %v", err)
	}
	if lessonMap["id"] != "lesson-1" {
		t.Errorf("expected id 'lesson-1', got %v", lessonMap["id"])
	}
}

// AC-05 (FR-CNT-03, FR-CNT-04): GET /api/lessons/..%2F..%2Fetc%2Fpasswd returns 400 or 404; no file contents leak
func TestAC05_PathTraversal(t *testing.T) {
	contentDir := setupTestContent(t)
	router := NewRouter(RouterConfig{ContentDir: contentDir})

	traversalPaths := []string{
		"/api/lessons/..%2F..%2Fetc%2Fpasswd",
		"/api/lessons/%2e%2e%2fetc%2fpasswd",
		"/api/lessons/invalid@id!",
		"/api/lessons/unknown-id-12345",
	}

	for _, p := range traversalPaths {
		req := httptest.NewRequest(http.MethodGet, p, nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest && rec.Code != http.StatusNotFound {
			t.Errorf("path traversal %q expected 400 or 404, got %d", p, rec.Code)
		}
		if rec.Body.Len() > 0 && strings.Contains(rec.Body.String(), "root:") {
			t.Errorf("file contents leaked for %s: %s", p, rec.Body.String())
		}
	}
}

// AC-06 (FR-CNT-06): A corrupted lesson file yields 500 on that ID and 200 on other IDs
func TestAC06_CorruptedLesson(t *testing.T) {
	contentDir := setupTestContent(t)

	// Corrupt lesson-2.json
	corruptPath := filepath.Join(contentDir, "lessons", "lesson-2.json")
	if err := os.WriteFile(corruptPath, []byte("NOT_VALID_JSON{{{"), 0644); err != nil {
		t.Fatalf("failed to corrupt lesson-2: %v", err)
	}

	router := NewRouter(RouterConfig{ContentDir: contentDir})

	// Check corrupted lesson-2 returns 500
	reqCorrupt := httptest.NewRequest(http.MethodGet, "/api/lessons/lesson-2", nil)
	recCorrupt := httptest.NewRecorder()
	router.ServeHTTP(recCorrupt, reqCorrupt)

	if recCorrupt.Code != http.StatusInternalServerError {
		t.Errorf("expected corrupted lesson to return 500, got %d", recCorrupt.Code)
	}

	var errResp map[string]string
	_ = json.Unmarshal(recCorrupt.Body.Bytes(), &errResp)
	if errResp["error"] != "internal error" {
		t.Errorf("expected error 'internal error', got %v", errResp["error"])
	}

	// Check uncorrupted lesson-1 still returns 200
	reqValid := httptest.NewRequest(http.MethodGet, "/api/lessons/lesson-1", nil)
	recValid := httptest.NewRecorder()
	router.ServeHTTP(recValid, reqValid)

	if recValid.Code != http.StatusOK {
		t.Errorf("expected valid lesson to return 200, got %d", recValid.Code)
	}
}

// AC-07 (FR-CNT-07, NFR-REL-01): With CONTENT_DIR empty, /api/lessons returns 503 {"error":"content not generated"} and /api/health still returns 200
func TestAC07_EmptyContentDir(t *testing.T) {
	emptyDir := t.TempDir()
	router := NewRouter(RouterConfig{ContentDir: emptyDir})

	// /api/lessons -> 503
	req := httptest.NewRequest(http.MethodGet, "/api/lessons", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503 for empty content dir, got %d", rec.Code)
	}

	var errResp map[string]string
	_ = json.Unmarshal(rec.Body.Bytes(), &errResp)
	if errResp["error"] != "content not generated" {
		t.Errorf("expected error 'content not generated', got %v", errResp["error"])
	}

	// /api/health still returns 200
	hReq := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	hRec := httptest.NewRecorder()
	router.ServeHTTP(hRec, hReq)

	if hRec.Code != http.StatusOK {
		t.Errorf("/api/health expected 200, got %d", hRec.Code)
	}
	if hRec.Body.String() != `{"ok":true}` {
		t.Errorf("/api/health expected exact {\"ok\":true}, got %s", hRec.Body.String())
	}
}
