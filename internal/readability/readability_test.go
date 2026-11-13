// SPEC: FR-CNT-08 (SPEC-012), AC-60
package readability

import (
	"math"
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestSyllables(t *testing.T) {
	for w, want := range map[string]int{"cat": 1, "make": 1, "neuron": 2, "computer": 3, "AI": 1, "": 0, "rhythm": 1} {
		if got := Syllables(w); got != want {
			t.Errorf("Syllables(%q) = %d, want %d", w, got, want)
		}
	}
}

func TestSentences(t *testing.T) {
	got := Sentences("A cat sat. Did it? Yes!\n\n- one item\n- two item")
	want := []string{"A cat sat", "Did it", "Yes", "one item", "two item"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %q", got)
	}
}

func TestMeasure(t *testing.T) {
	st := Measure("The cat sat. The dog ran.")
	// 6 words, 2 sentences, 6 syllables: 0.39*3 + 11.8*1 - 15.59 = -2.62
	if st.Words != 6 || st.Sentences != 2 || st.Longest != 3 || math.Abs(st.Grade+2.62) > 0.01 {
		t.Errorf("got %+v", st)
	}
}

func TestBoldTermsAndStrip(t *testing.T) {
	md := "Use **IF / THEN** rules. A **Neuron** and **neurons**. See [docs](https://x.y) ![pic](a.png)"
	if got := BoldTerms(md); !reflect.DeepEqual(got, []string{"IF / THEN", "Neuron"}) {
		t.Errorf("BoldTerms = %q", got)
	}
	if got := Words(StripMarkdown(md)); len(got) != 10 || got[len(got)-1] != "docs" {
		t.Errorf("StripMarkdown words = %q", got)
	}
}

// Lesson 3 was rewritten for SPEC-012 (grade 5.5 before). It must stay within both bands' limits.
func TestRewrittenLesson3MeetsLimits(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "..", "public-content", "lessons", "3-neuralnetworks.junior.json"))
	if err != nil {
		t.Skip("lesson file not present")
	}
	_, findings, err := CheckKidsLesson(raw, func(string) bool { return true })
	if err != nil {
		t.Fatal(err)
	}
	for _, f := range findings {
		if f.Rule != "structure" { // pictures for every card arrive with T034–T036
			t.Errorf("%s %s section=%s rule=%s %s", f.Severity, f.Band, f.Section, f.Rule, f.Detail)
		}
	}
}

// A "*" list is split into items like a "-" list, so each item is measured as its own sentence.
func TestStarListItemsAreSentences(t *testing.T) {
	md := "Look for clues:\n* big floppy ears on its head\n* a long curly tail behind it\n+ soft brown fur"
	if got := Sentences(StripMarkdown(md)); len(got) != 4 {
		t.Errorf("Sentences = %q, want 4", got)
	}
}
