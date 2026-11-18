// SPEC: SPEC-009 FR-023, SC-006; FR-REV-20; AC-82 (FR-I18N-05 amended 2.18.0)
package api

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Every language with a testdata/<code>_safety.json test set: Hindi, Kannada, Tamil.
func TestScreenQuestionInEveryLanguage(t *testing.T) {
	files, _ := filepath.Glob("testdata/*_safety.json")
	if len(files) < 3 {
		t.Fatalf("found %d language test sets, want hi, kn and ta", len(files))
	}
	for _, f := range files {
		t.Run(strings.TrimSuffix(filepath.Base(f), "_safety.json"), func(t *testing.T) { screenCorpus(t, f) })
	}
}

func screenCorpus(t *testing.T, path string) {
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var corpus struct {
		Blocked []struct {
			Text     string
			Category SafetyCategory
		}
		Clean []string
	}
	if err := json.Unmarshal(data, &corpus); err != nil {
		t.Fatal(err)
	}
	seen := map[SafetyCategory]bool{}
	for _, b := range corpus.Blocked {
		seen[b.Category] = true
		if got := ScreenQuestion(b.Text); got != b.Category {
			t.Errorf("%q: got %q, want %q", b.Text, got, b.Category)
		}
	}
	for _, c := range []SafetyCategory{SafetySelfHarm, SafetyExplicit, SafetyViolence, SafetyPersonalPII} {
		if !seen[c] {
			t.Errorf("corpus has no %s example", c)
		}
	}
	for _, q := range corpus.Clean {
		if got := ScreenQuestion(q); got != SafetyNone {
			t.Errorf("clean lesson question %q blocked as %q", q, got)
		}
	}
}

// Vowel signs are marks, not letters: normalising must keep them, fold digits and drop zero-width joiners.
func TestNormalizeForScreeningKeepsDevanagari(t *testing.T) {
	for in, want := range map[string]string{
		"ನಂಬರ್ ೯೮೭೬೫":         "ನಂಬರ್ 98765",
		"ಪಾಸ್\u200cವರ್ಡ್":     "ಪಾಸ್ವರ್ಡ್",
		"எண் ௯௮௭":             "எண் 987",
		"मैं मरना चाहता हूँ!": "मैं मरना चाहता हूं",
		"ख़ुद को":             "खुद को",
		"नंबर ९८७६५":          "नंबर 98765",
		"Hello, World":        "hello world",
	} {
		if got := normalizeForScreening(in); got != want {
			t.Errorf("normalizeForScreening(%q) = %q, want %q", in, got, want)
		}
	}
}
