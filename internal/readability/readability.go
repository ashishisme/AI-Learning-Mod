// SPEC: FR-CNT-08 (SPEC-012). Package readability measures Kids lesson text: reading grade, sentence
// length and bold (new) words. It is the Go version of the measuring script used for the SPEC-012 plan,
// so its numbers match that plan's baseline table (DC-10: no Python in the build).
package readability

import (
	"regexp"
	"strings"
)

var (
	nonLetters = regexp.MustCompile(`[^a-z]`)
	vowelRun   = regexp.MustCompile(`[aeiouy]+`)
	wordRe     = regexp.MustCompile(`[A-Za-z']+`)
	sentenceRe = regexp.MustCompile(`[.!?]+(\s+|$)|\n\s*\n|\n\s*[-*]\s+`)
	boldRe     = regexp.MustCompile(`\*\*(.+?)\*\*`)
	imageRe    = regexp.MustCompile(`!\[[^\]]*\]\([^)]*\)`)
	linkRe     = regexp.MustCompile(`\[([^\]]*)\]\([^)]*\)`)
	markupRe   = regexp.MustCompile("[`*#>_\\[\\]()|]")
	starItemRe = regexp.MustCompile(`(?m)^[ \t]*[*+][ \t]+`)
)

// Syllables counts vowel groups after dropping a final "e", with at least one per word.
func Syllables(word string) int {
	w := nonLetters.ReplaceAllString(strings.ToLower(word), "")
	if w == "" {
		return 0
	}
	w = strings.TrimSuffix(w, "e")
	return max(1, len(vowelRun.FindAllString(w, -1)))
}

// StripMarkdown keeps the words a reader sees: images are dropped, links keep their text.
func StripMarkdown(md string) string {
	s := imageRe.ReplaceAllString(md, " ")
	s = linkRe.ReplaceAllString(s, "$1")
	s = starItemRe.ReplaceAllString(s, "- ") // keep "*" list items as list items, so each is its own sentence
	return markupRe.ReplaceAllString(s, " ")
}

// Sentences splits text on . ! ? and on paragraph or list breaks, so a list item is its own sentence.
func Sentences(text string) []string {
	var out []string
	for _, s := range sentenceRe.Split(text, -1) {
		if len(Words(s)) > 0 {
			out = append(out, strings.TrimLeft(strings.TrimSpace(s), "-* "))
		}
	}
	return out
}

// Words returns the words of a text.
func Words(text string) []string { return wordRe.FindAllString(text, -1) }

// Stats is one text's measurements.
type Stats struct {
	Words       int
	Sentences   int
	AvgSentence float64
	Longest     int
	Grade       float64 // Flesch-Kincaid grade
}

// Measure computes Stats for plain text (strip Markdown first).
func Measure(text string) Stats {
	sents := Sentences(text)
	words := Words(text)
	st := Stats{Words: len(words), Sentences: max(1, len(sents))}
	if st.Words == 0 {
		return st
	}
	syl := 0
	for _, w := range words {
		syl += Syllables(w)
	}
	for _, s := range sents {
		st.Longest = max(st.Longest, len(Words(s)))
	}
	st.AvgSentence = float64(st.Words) / float64(st.Sentences)
	st.Grade = 0.39*st.AvgSentence + 11.8*float64(syl)/float64(st.Words) - 15.59
	return st
}

// BoldTerms returns the distinct bold phrases in Markdown, in order.
func BoldTerms(md string) []string {
	seen := map[string]bool{}
	var out []string
	for _, m := range boldRe.FindAllStringSubmatch(md, -1) {
		t := strings.TrimSpace(m[1])
		if k := normTerm(t); t != "" && !seen[k] {
			seen[k] = true
			out = append(out, t)
		}
	}
	return out
}

// normTerm makes "Neurons" and "neuron" the same term.
func normTerm(t string) string {
	t = strings.ToLower(strings.TrimSpace(t))
	t = strings.TrimSuffix(t, "es")
	return strings.TrimSuffix(t, "s")
}
