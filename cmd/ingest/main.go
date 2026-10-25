// SPEC: FR-ING-01, FR-ING-02, FR-ING-03, FR-ING-04, FR-ING-05, FR-ING-06, FR-ING-07, FR-ING-08, NFR-SEC-09, DC-03, DC-07
package main

import (
	"context"
	"log/slog"
	"os"
	"strings"

	"ai-foundations-coach/internal/ingest"
)

type Config = ingest.Config
type LessonMeta = ingest.LessonMeta
type Block = ingest.Block
type Lesson = ingest.Lesson
type LessonIndex = ingest.LessonIndex

var (
	Run            = func(ctx context.Context, cfg Config) error {
		_, _, err := ingest.Run(ctx, cfg)
		return err
	}
	fetchWithRetry = ingest.FetchWithRetry
)

func main() {
	token := os.Getenv("GITHUB_TOKEN")
	if strings.TrimSpace(token) == "" {
		slog.Error("GITHUB_TOKEN environment variable is required")
		os.Exit(1)
	}

	contentDir := os.Getenv("CONTENT_DIR")
	if strings.TrimSpace(contentDir) == "" {
		contentDir = "public-content"
	}

	cfg := Config{
		GitHubToken: token,
		ContentDir:  contentDir,
	}

	ctx := context.Background()
	sha, count, err := ingest.Run(ctx, cfg)
	if err != nil {
		slog.Error("Ingestion failed", "error", err.Error())
		os.Exit(1)
	}
	slog.Info("Ingestion completed successfully", "contentDir", contentDir, "commitSha", sha, "lessonsCount", count)
}
