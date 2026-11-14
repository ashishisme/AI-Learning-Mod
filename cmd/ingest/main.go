// SPEC: FR-033, NFR-LIC-03, DC-07
// SPEC-009: FR-017..FR-019 (the language release gate)
// SPEC-012: FR-CNT-08 (the Kids reading check)
// SPEC-013: FR-008, FR-012 (every lesson is ours and owner-approved; nothing is fetched)
//
// The command keeps its name from when it imported the lessons. It now only checks them.
package main

import (
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

func main() {
	_ = flag.Bool("verify", true, "kept so existing release commands keep working; the check always runs")
	audio := flag.Bool("audio", true, "also check recorded narration (off where recordings are not present yet)")
	flag.Parse()

	contentDir := os.Getenv("CONTENT_DIR")
	if strings.TrimSpace(contentDir) == "" {
		contentDir = "public-content"
	}
	code := verify(contentDir, os.Stderr, *audio)
	// SPEC-012 FR-CNT-08: the Kids reading check runs in the same release gate.
	if kidsCheck(filepath.Dir(filepath.Clean(contentDir)), contentDir, os.Stderr) != 0 {
		code = 1
	}
	os.Exit(code)
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
	// SPEC-013 FR-008: our own English lessons, quizzes and notebooks ship only with a current owner approval.
	for _, p := range i18n.CheckEnglish(root) {
		fmt.Fprintf(out, "en %s: %s\n", p.Path, p.Reason)
		code = 1
	}
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
