package ingest

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// fakeUpstream serves two lessons. The second lesson's README returns 404 when failSecond is set.
func fakeUpstream(t *testing.T, failSecond bool) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/branches/main"):
			_ = json.NewEncoder(w).Encode(map[string]any{"name": "main", "commit": map[string]any{"sha": "newsha"}})
		case strings.Contains(r.URL.Path, "/git/trees/"):
			_ = json.NewEncoder(w).Encode(map[string]any{"sha": "newsha", "tree": []map[string]any{
				{"path": "1-intro/README.md", "type": "blob"},
				{"path": "2-next/README.md", "type": "blob"},
			}})
		case strings.HasSuffix(r.URL.Path, "2-next/README.md") && failSecond:
			w.WriteHeader(http.StatusNotFound)
		case strings.HasSuffix(r.URL.Path, "README.md"):
			_, _ = w.Write([]byte("# New content\n"))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

func seedContent(t *testing.T) (dir, lessonPath string) {
	t.Helper()
	dir = t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "lessons"), 0o755); err != nil {
		t.Fatal(err)
	}
	lessonPath = filepath.Join(dir, "lessons", "1-intro.json")
	if err := os.WriteFile(lessonPath, []byte(`{"title":"old"}`), 0o644); err != nil {
		t.Fatal(err)
	}
	return dir, lessonPath
}

func runAgainst(srv *httptest.Server, dir string) error {
	_, _, err := Run(context.Background(), Config{
		GitHubToken: "t",
		ContentDir:  dir,
		BaseURL:     srv.URL + "/",
		RawBaseURL:  srv.URL,
		Client:      srv.Client(),
	})
	return err
}

func TestRunFailedFetchLeavesContentUntouched(t *testing.T) {
	dir, lessonPath := seedContent(t)
	if err := runAgainst(fakeUpstream(t, true), dir); err == nil {
		t.Fatal("expected an error when a lesson cannot be fetched")
	}
	got, err := os.ReadFile(lessonPath)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != `{"title":"old"}` {
		t.Fatalf("existing lesson was changed by a failed run: %s", got)
	}
	if _, err := os.Stat(filepath.Join(dir, "index.json")); !os.IsNotExist(err) {
		t.Fatalf("index.json must not be written by a failed run: %v", err)
	}
}

func TestRunSuccessReplacesContentAndLeavesNoTempFiles(t *testing.T) {
	dir, lessonPath := seedContent(t)
	if err := runAgainst(fakeUpstream(t, false), dir); err != nil {
		t.Fatalf("Run failed: %v", err)
	}
	got, err := os.ReadFile(lessonPath)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(got), "New content") {
		t.Fatalf("lesson not replaced: %s", got)
	}
	if _, err := os.Stat(filepath.Join(dir, "index.json")); err != nil {
		t.Fatalf("index.json missing: %v", err)
	}
	for _, sub := range []string{dir, filepath.Join(dir, "lessons")} {
		temps, _ := filepath.Glob(filepath.Join(sub, ".tmp-*"))
		if len(temps) != 0 {
			t.Fatalf("temp files left behind: %v", temps)
		}
	}
	info, err := os.Stat(lessonPath)
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode().Perm() != 0o644 {
		t.Fatalf("lesson mode = %o, want 644", info.Mode().Perm())
	}
}
