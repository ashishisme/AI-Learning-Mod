// SPEC: FR-CNT-08, FR-CNT-09 (SPEC-012); contract specs/012-kids-content-easing/contracts/kids-content-check.md
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"ai-foundations-coach/internal/readability"
)

// kidsCheck measures every English Kids lesson for both age bands. It prints one line per finding and
// a summary per lesson and band, and returns 1 when any finding is a FAIL.
func kidsCheck(root, contentDir string, out io.Writer) int {
	files, err := filepath.Glob(filepath.Join(contentDir, "lessons", "*.junior.json"))
	if err != nil {
		fmt.Fprintf(out, "kids-check: FAIL %v\n", err)
		return 1
	}
	visualOK := approvedWordPictures(root)
	code := 0
	for _, f := range files {
		name := strings.TrimSuffix(filepath.Base(f), ".json")
		raw, err := os.ReadFile(f)
		if err != nil {
			fmt.Fprintf(out, "kids-check: FAIL %s %v\n", name, err)
			code = 1
			continue
		}
		summaries, findings, err := readability.CheckKidsLesson(raw, visualOK)
		if err != nil {
			fmt.Fprintf(out, "kids-check: FAIL %s is invalid: %v\n", name, err)
			code = 1
			continue
		}
		for _, x := range findings {
			fmt.Fprintf(out, "kids-check: %s %s %s section=%s rule=%s %s\n", x.Severity, name, x.Band, x.Section, x.Rule, x.Detail)
			if x.Severity == readability.Fail {
				code = 1
			}
		}
		lesson := strings.TrimSuffix(name, ".junior")
		for _, s := range summaries {
			fmt.Fprintf(out, "kids-check: %s %-5s grade=%.1f avgSentence=%.1f longest=%d maxNewWords=%d missingTerms=%d\n",
				lesson, s.Band, s.Stats.Grade, s.Stats.AvgSentence, s.Stats.Longest, s.MaxNewWords, s.MissingTerms)
		}
	}
	return code
}

// approvedWordPictures reports whether web/public/brand/words/<key>.svg exists and has an approved,
// trademark-clear asset-register entry (NFR-LIC-05).
func approvedWordPictures(root string) func(string) bool {
	approved := map[string]bool{}
	if raw, err := os.ReadFile(filepath.Join(root, "design", "brand", "asset-register.json")); err == nil {
		var reg struct {
			Assets []struct {
				Status          string `json:"status"`
				TrademarkScreen string `json:"trademarkScreen"`
				ReleaseFiles    []struct {
					Path string `json:"path"`
				} `json:"releaseFiles"`
			} `json:"assets"`
		}
		if json.Unmarshal(raw, &reg) == nil {
			for _, a := range reg.Assets {
				if a.Status == "approved" && a.TrademarkScreen == "clear" {
					for _, f := range a.ReleaseFiles {
						approved[f.Path] = true
					}
				}
			}
		}
	}
	return func(key string) bool {
		p := "words/" + key + ".svg"
		_, err := os.Stat(filepath.Join(root, "web", "public", "brand", filepath.FromSlash(p)))
		return err == nil && approved[p]
	}
}
