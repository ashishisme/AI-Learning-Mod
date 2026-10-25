// SPEC: AC-01, AC-02, AC-03, AC-16
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync/atomic"
	"testing"
)

// AC-01 (FR-ING-01..04): Ingestion writes index.json with >=20 lessons, dense order, unique id, 40-hex SHA, and parses as §6.3
func TestAC01_IngestOutput(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "ingest-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	mockSHA := "abcdef1234567890abcdef1234567890abcdef12"

	// Create 24 mock lessons matching upstream structure
	var treeEntries []map[string]any
	for i := 1; i <= 24; i++ {
		folder := fmt.Sprintf("%02d-lesson-%d", i, i)
		treeEntries = append(treeEntries, map[string]any{
			"path": fmt.Sprintf("lessons/%s/README.md", folder),
			"type": "blob",
		})
		treeEntries = append(treeEntries, map[string]any{
			"path": fmt.Sprintf("lessons/%s/lab.ipynb", folder),
			"type": "blob",
		})
	}

	rawServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		_, _ = fmt.Fprintf(w, "# Lesson Title\n\nContent with an image: ![Diagram](images/diag.png)\n<img src=\"images/logo.png\">")
	}))
	defer rawServer.Close()

	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if strings.Contains(r.URL.Path, "/branches/main") {
			_, _ = fmt.Fprintf(w, `{"name":"main","commit":{"sha":"%s"}}`, mockSHA)
			return
		}
		if strings.Contains(r.URL.Path, "/git/trees/") {
			data, _ := json.Marshal(map[string]any{
				"sha":       mockSHA,
				"truncated": false,
				"tree":      treeEntries,
			})
			_, _ = w.Write(data)
			return
		}
		http.NotFound(w, r)
	}))
	defer apiServer.Close()

	cfg := Config{
		GitHubToken: "mock-token-for-testing",
		ContentDir:  tempDir,
		BaseURL:     apiServer.URL + "/",
		RawBaseURL:  rawServer.URL,
		Client:      apiServer.Client(),
	}

	ctx := context.Background()
	if err := Run(ctx, cfg); err != nil {
		t.Fatalf("Run failed: %v", err)
	}

	// Verify index.json exists
	indexPath := filepath.Join(tempDir, "index.json")
	indexBytes, err := os.ReadFile(indexPath)
	if err != nil {
		t.Fatalf("failed to read index.json: %v", err)
	}

	var idx LessonIndex
	if err := json.Unmarshal(indexBytes, &idx); err != nil {
		t.Fatalf("index.json is malformed: %v", err)
	}

	// Verify 40-hex commitSha
	hexPattern := regexp.MustCompile(`^[0-9a-f]{40}$`)
	if !hexPattern.MatchString(idx.CommitSHA) {
		t.Errorf("commitSha %q is not 40-hex chars", idx.CommitSHA)
	}

	// Verify >=20 lessons
	if len(idx.Lessons) < 20 {
		t.Errorf("expected >=20 lessons, got %d", len(idx.Lessons))
	}

	// Verify dense 0-based ordering and unique IDs
	seenIDs := make(map[string]bool)
	for expectedOrder, meta := range idx.Lessons {
		if meta.Order != expectedOrder {
			t.Errorf("lesson %s order mismatch: expected %d, got %d", meta.ID, expectedOrder, meta.Order)
		}
		if seenIDs[meta.ID] {
			t.Errorf("duplicate lesson id: %s", meta.ID)
		}
		seenIDs[meta.ID] = true

		if meta.CommitSHA != mockSHA {
			t.Errorf("meta.CommitSHA mismatch: got %s, want %s", meta.CommitSHA, mockSHA)
		}

		// Verify lessons/<id>.json parses per §6.3
		lessonFilePath := filepath.Join(tempDir, "lessons", meta.ID+".json")
		lessonBytes, err := os.ReadFile(lessonFilePath)
		if err != nil {
			t.Fatalf("failed to read lesson file %s: %v", lessonFilePath, err)
		}

		var lessonObj Lesson
		if err := json.Unmarshal(lessonBytes, &lessonObj); err != nil {
			t.Errorf("lesson %s JSON is malformed: %v", meta.ID, err)
		}

		if len(lessonObj.Blocks) != 1 {
			t.Errorf("lesson %s: expected exactly 1 block per FR-ING-08, got %d", meta.ID, len(lessonObj.Blocks))
		} else if lessonObj.Blocks[0].Type != "markdown" {
			t.Errorf("lesson %s block type is not markdown: %s", meta.ID, lessonObj.Blocks[0].Type)
		}
	}
}

// AC-02 (FR-ING-05, NFR-SEC-03): Ingested lessons contain no relative image references; all img sources on raw.githubusercontent.com
func TestAC02_NoRelativeImages(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "ingest-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	mockSHA := "abcdef1234567890abcdef1234567890abcdef12"

	treeEntries := []map[string]any{
		{
			"path": "lessons/01-Intro/README.md",
			"type": "blob",
		},
	}

	rawServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		_, _ = fmt.Fprintf(w, `# Intro

![Local Diagram](images/neural.png)
Some text with <img src="assets/robot.svg" alt="Robot">
And absolute: ![Online](https://raw.githubusercontent.com/microsoft/AI-For-Beginners/abcdef1234567890abcdef1234567890abcdef12/images/online.png)
`)
	}))
	defer rawServer.Close()

	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if strings.Contains(r.URL.Path, "/branches/main") {
			_, _ = fmt.Fprintf(w, `{"name":"main","commit":{"sha":"%s"}}`, mockSHA)
			return
		}
		if strings.Contains(r.URL.Path, "/git/trees/") {
			data, _ := json.Marshal(map[string]any{
				"sha":       mockSHA,
				"truncated": false,
				"tree":      treeEntries,
			})
			_, _ = w.Write(data)
			return
		}
		http.NotFound(w, r)
	}))
	defer apiServer.Close()

	cfg := Config{
		GitHubToken: "mock-token",
		ContentDir:  tempDir,
		BaseURL:     apiServer.URL + "/",
		RawBaseURL:  rawServer.URL,
		Client:      apiServer.Client(),
	}

	ctx := context.Background()
	if err := Run(ctx, cfg); err != nil {
		t.Fatalf("Run failed: %v", err)
	}

	lessonFilePath := filepath.Join(tempDir, "lessons", "01-intro.json")
	lessonBytes, err := os.ReadFile(lessonFilePath)
	if err != nil {
		t.Fatalf("failed to read lesson: %v", err)
	}

	var lesson Lesson
	if err := json.Unmarshal(lessonBytes, &lesson); err != nil {
		t.Fatalf("unmarshal lesson failed: %v", err)
	}

	content := lesson.Blocks[0].Content
	// Must not have relative images like "(images/neural.png)" or src="assets/robot.svg"
	if strings.Contains(content, "(images/neural.png)") {
		t.Errorf("content still contains relative markdown image: %s", content)
	}
	if strings.Contains(content, `src="assets/robot.svg"`) {
		t.Errorf("content still contains relative html image: %s", content)
	}

	// Must be rewritten to raw.githubusercontent.com/microsoft/AI-For-Beginners/<sha>/...
	expectedPrefix := "https://raw.githubusercontent.com/microsoft/AI-For-Beginners/" + mockSHA + "/"
	if !strings.Contains(content, expectedPrefix+"lessons/01-Intro/images/neural.png") {
		t.Errorf("content missing rewritten markdown image prefix: %s", content)
	}
	if !strings.Contains(content, expectedPrefix+"lessons/01-Intro/assets/robot.svg") {
		t.Errorf("content missing rewritten html image prefix: %s", content)
	}
}

// AC-03 (FR-ING-07): Ingestion without GITHUB_TOKEN exits 1
func TestAC03_MissingTokenExits1(t *testing.T) {
	// First test programmatic check
	ctx := context.Background()
	err := Run(ctx, Config{GitHubToken: ""})
	if err == nil {
		t.Fatal("expected Run() to fail when GITHUB_TOKEN is empty, got nil")
	}

	// Next test CLI execution
	cmd := exec.Command("go", "run", "./main.go")
	cmd.Dir = "."
	
	// Inherit environment but override GITHUB_TOKEN
	var env []string
	for _, e := range os.Environ() {
		if !strings.HasPrefix(e, "GITHUB_TOKEN=") {
			env = append(env, e)
		}
	}
	env = append(env, "GITHUB_TOKEN=")
	cmd.Env = env

	output, err := cmd.CombinedOutput()
	if err == nil {
		t.Fatalf("expected command to fail with exit code 1 when GITHUB_TOKEN is empty, but succeeded. Output: %s", string(output))
	}

	exitErr, ok := err.(*exec.ExitError)
	if !ok {
		t.Fatalf("expected ExitError, got %T: %v", err, err)
	}

	if exitErr.ExitCode() != 1 {
		t.Errorf("expected exit code 1, got %d", exitErr.ExitCode())
	}
}

// AC-16 (NFR-SEC-09): Ingest stub returning 500 retries 3x then fails with exit 1; a 4xx fails fast
func TestAC16_EgressRetryBackoff(t *testing.T) {
	ctx := context.Background()

	// Test 500 retries 3 times then fails
	var server500Count int32
	server500 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&server500Count, 1)
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server500.Close()

	client := server500.Client()
	_, err := fetchWithRetry(ctx, client, server500.URL+"/test-blob")
	if err == nil {
		t.Fatal("expected 500 error, got nil")
	}
	if atomic.LoadInt32(&server500Count) != 3 {
		t.Errorf("expected exactly 3 attempts for 5xx, got %d", server500Count)
	}

	// Test 4xx fails fast (attempt count == 1)
	var server404Count int32
	server404 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&server404Count, 1)
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server404.Close()

	_, err = fetchWithRetry(ctx, client, server404.URL+"/not-found")
	if err == nil {
		t.Fatal("expected 4xx error, got nil")
	}
	if atomic.LoadInt32(&server404Count) != 1 {
		t.Errorf("expected fast-fail (1 attempt) for 4xx, got %d", server404Count)
	}
}
