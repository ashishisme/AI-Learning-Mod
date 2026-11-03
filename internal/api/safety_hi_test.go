// SPEC: SPEC-009 FR-023, SC-006; FR-REV-20
package api

import (
	"encoding/json"
	"os"
	"testing"
)

func TestScreenQuestionHindi(t *testing.T) {
	data, err := os.ReadFile("testdata/hi_safety.json")
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

// Devanagari vowel signs are marks, not letters: normalising must keep them and fold digits.
func TestNormalizeForScreeningKeepsDevanagari(t *testing.T) {
	for in, want := range map[string]string{
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
