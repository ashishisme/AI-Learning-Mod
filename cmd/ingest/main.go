// SPEC: FR-ING-01, FR-ING-02, FR-ING-03, FR-ING-04, FR-ING-05, FR-ING-06, FR-ING-07, FR-ING-08, NFR-SEC-09, DC-03, DC-07
// SPEC-009: FR-005 (-lang), FR-017..FR-019 (the language release gate in -verify)
package main

import (
	"context"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"ai-foundations-coach/internal/i18n"
	"ai-foundations-coach/internal/ingest"
	"ai-foundations-coach/internal/narration"
)

type Config = ingest.Config
type LessonMeta = ingest.LessonMeta
type Block = ingest.Block
type Lesson = ingest.Lesson
type LessonIndex = ingest.LessonIndex

var (
	Run = func(ctx context.Context, cfg Config) error {
		_, _, err := ingest.Run(ctx, cfg)
		return err
	}
	fetchWithRetry = ingest.FetchWithRetry
)

func main() {
	verifyOnly := flag.Bool("verify", false, "check that the content directory is complete and self-contained, then exit")
	lang := flag.String("lang", "", "ingest only this language from languages.json, for example hi")
	audio := flag.Bool("audio", true, "with -verify: also check recorded narration (off where recordings are not present yet)")
	flag.Parse()

	contentDir := os.Getenv("CONTENT_DIR")
	if strings.TrimSpace(contentDir) == "" {
		contentDir = "public-content"
	}
	if *verifyOnly {
		os.Exit(verify(contentDir, os.Stderr, *audio))
	}

	token := os.Getenv("GITHUB_TOKEN")
	if strings.TrimSpace(token) == "" {
		slog.Error("GITHUB_TOKEN environment variable is required")
		os.Exit(1)
	}

	langs, err := i18n.Load(contentDir)
	if err != nil {
		slog.Error("Language list is invalid", "error", err.Error())
		os.Exit(2)
	}
	cfg := Config{
		GitHubToken: token,
		ContentDir:  contentDir,
		PinnedSHA:   strings.TrimSpace(os.Getenv("INGEST_PINNED_SHA")),
	}
	// Every listed language is ingested, hidden or approved, so a reviewer can work on it.
	for _, l := range langs.All() {
		if l.Code != i18n.English.Code && (*lang == "" || *lang == l.Code) {
			cfg.Languages = append(cfg.Languages, l.Code)
		}
	}
	if *lang != "" {
		if len(cfg.Languages) == 0 {
			slog.Error("Language is not in languages.json", "lang", *lang)
			os.Exit(2)
		}
		cfg.SkipEnglish = true
	}

	sha, count, err := ingest.Run(context.Background(), cfg)
	if err != nil {
		slog.Error("Ingestion failed", "error", err.Error())
		os.Exit(1)
	}
	slog.Info("Ingestion completed successfully", "contentDir", contentDir, "commitSha", sha, "lessonsCount", count, "languages", cfg.Languages)
}

// verify is the release gate. The English content checks come first (FR-033). Then each listed
// language is checked against its review ledger and English (SPEC-009 FR-017..FR-019): a problem in
// an approved language fails the build, and one in a hidden language is only a warning, so drafts
// can ship hidden. It prints one "LANG PATH: reason" line per problem and returns the exit code.
func verify(contentDir string, out io.Writer, checkAudio bool) int {
	if err := ingest.VerifyContent(contentDir); err != nil {
		slog.Error("Content check failed", "error", err.Error())
		return 1
	}
	langs, err := i18n.Load(contentDir)
	if err != nil {
		slog.Error("Language list is invalid", "error", err.Error())
		return 1
	}
	root := filepath.Dir(filepath.Clean(contentDir)) // public-content sits at the repository root
	code := 0
	for _, l := range langs.All() {
		if l.Code == i18n.English.Code {
			continue
		}
		prefix := "warning: "
		if l.Status == i18n.StatusApproved {
			prefix = ""
		}
		for _, p := range i18n.Check(root, l.Code) {
			fmt.Fprintf(out, "%s%s %s: %s\n", prefix, l.Code, p.Path, p.Reason)
			if prefix == "" {
				code = 1
			}
		}
		if !checkAudio {
			continue
		}
		// SPEC-009 FR-012: an approved language ships with every narrated track recorded and current.
		// FR-I18N-10: a beta language may launch on device voices, so its recordings only warn.
		audioPrefix := prefix
		if l.Beta {
			audioPrefix = "warning: "
		}
		manifest, err := narration.LoadManifest(root, l.Code)
		if err == nil && audioPrefix != "" && len(manifest.Tracks) == 0 {
			fmt.Fprintf(out, "%s%s audio: no recordings yet\n", audioPrefix, l.Code)
			continue
		}
		problems, err := narration.Check(root, l.Code)
		if err != nil {
			problems = []narration.Problem{{Key: "audio", Reason: err.Error()}}
		}
		for _, line := range narration.Summary(problems, 20) {
			fmt.Fprintf(out, "%s%s audio %s\n", audioPrefix, l.Code, line)
		}
		if audioPrefix == "" && len(problems) > 0 {
			code = 1
		}
	}
	if code == 0 {
		slog.Info("Content check passed", "contentDir", contentDir)
	}
	return code
}
