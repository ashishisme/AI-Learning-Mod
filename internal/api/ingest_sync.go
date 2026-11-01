// SPEC: FR-ING-09, FR-SET-05, NFR-SEC-01
package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"ai-foundations-coach/internal/ingest"
)

const (
	// SyncRateLimit is the number of sync requests allowed per client per RateLimitWindow.
	SyncRateLimit = 3
	// SyncEnabledEnv must be "true" for the endpoint to run. It is off by default so a
	// deployed server never exposes content rewrites or its GITHUB_TOKEN to anonymous callers.
	SyncEnabledEnv = "INGEST_SYNC_ENABLED"
)

type IngestSyncRequest struct {
	GitHubToken string `json:"githubToken,omitempty"`
}

type IngestSyncResponse struct {
	OK           bool   `json:"ok"`
	CommitSHA    string `json:"commitSha,omitempty"`
	LessonsCount int    `json:"lessonsCount,omitempty"`
	DurationMs   int64  `json:"durationMs"`
	Error        string `json:"error,omitempty"`
}

type IngestSyncHandler struct {
	contentDir string
	running    sync.Mutex
}

func NewIngestSyncHandler(contentDir string) *IngestSyncHandler {
	if contentDir == "" {
		contentDir = "public-content"
	}
	return &IngestSyncHandler{contentDir: contentDir}
}

func (h *IngestSyncHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "method not allowed"})
		return
	}

	if !strings.EqualFold(strings.TrimSpace(os.Getenv(SyncEnabledEnv)), "true") {
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(IngestSyncResponse{Error: "curriculum sync is disabled on this server"})
		return
	}

	// Cross-site HTML forms cannot send this content type without a CORS preflight, which
	// this server never approves, so this also blocks cross-site request forgery.
	if !strings.HasPrefix(strings.ToLower(r.Header.Get("Content-Type")), "application/json") {
		w.WriteHeader(http.StatusUnsupportedMediaType)
		_ = json.NewEncoder(w).Encode(IngestSyncResponse{Error: "content type must be application/json"})
		return
	}

	var req IngestSyncRequest
	if r.Body != nil {
		_ = json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&req)
	}

	token := strings.TrimSpace(r.Header.Get("X-GitHub-Token"))
	if token == "" {
		token = strings.TrimSpace(req.GitHubToken)
	}
	if token == "" {
		token = os.Getenv("GITHUB_TOKEN")
	}

	if token == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(IngestSyncResponse{
			OK:    false,
			Error: "GITHUB_TOKEN is required to sync curriculum from GitHub",
		})
		return
	}

	if !h.running.TryLock() {
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(IngestSyncResponse{Error: "a curriculum sync is already running"})
		return
	}
	defer h.running.Unlock()

	ctx, cancel := context.WithTimeout(r.Context(), 90*time.Second)
	defer cancel()

	t0 := time.Now()
	cfg := ingest.Config{
		GitHubToken: token,
		ContentDir:  h.contentDir,
	}

	sha, count, err := ingest.Run(ctx, cfg)
	latency := time.Since(t0).Milliseconds()

	if err != nil {
		slog.Error("Curriculum sync failed", "error", err.Error())
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(IngestSyncResponse{
			OK:         false,
			DurationMs: latency,
			Error:      "curriculum sync failed; check the server logs",
		})
		return
	}

	slog.Info("Curriculum sync completed", "commitSha", sha, "lessonsCount", count, "latencyMs", latency)
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(IngestSyncResponse{
		OK:           true,
		CommitSHA:    sha,
		LessonsCount: count,
		DurationMs:   latency,
	})
}
