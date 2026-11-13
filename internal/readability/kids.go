// SPEC: FR-CNT-08, FR-CNT-09 (SPEC-012); contract specs/012-kids-content-easing/contracts/kids-content-check.md
package readability

import (
	"encoding/json"
	"fmt"
	"strings"
)

// The limits from content/kids-writing-guide.md.
const (
	Band811          = "8-11"
	Band1214         = "12-14"
	MaxGrade811      = 3.5
	MaxGrade1214     = 6.0
	MaxAvgSentence   = 12.0
	MaxSentenceWords = 18
	MaxNewWords811   = 2
	MaxNewWords1214  = 3
)

// Severity of a finding. FAIL makes the release check fail.
const (
	Warn = "WARN"
	Fail = "FAIL"
)

// Finding is one broken rule.
type Finding struct {
	Severity, Band, Section, Rule, Detail string
}

// Summary is one band's measurements of a lesson.
type Summary struct {
	Band         string
	Stats        Stats
	MaxNewWords  int
	MissingTerms int
}

type jargon struct {
	Term   string `json:"term"`
	Visual string `json:"visual"`
}

type choice struct {
	Options      []string `json:"options"`
	CorrectIndex int      `json:"correctIndex"`
}

type kidsLesson struct {
	Bands    bool     `json:"bands"`
	Recap    []string `json:"recap"`
	Sections []struct {
		ID        string `json:"id"`
		Heading   string `json:"heading"`
		BigIdea   string `json:"bigIdea"`
		ChipQuote string `json:"chipQuote"`
		Analogy   struct {
			Description string `json:"description"`
		} `json:"analogy"`
		BodyMarkdown string    `json:"bodyMarkdown"`
		Diagram      *struct{} `json:"diagram"`
		Jargon       []jargon  `json:"jargonBuster"`
		More         *struct {
			Title        string `json:"title"`
			BodyMarkdown string `json:"bodyMarkdown"`
		} `json:"more"`
		Teen *struct {
			Add    string   `json:"add"`
			Body   string   `json:"body"`
			Jargon []jargon `json:"jargonBuster"`
		} `json:"teen"`
	} `json:"sections"`
	MiniQuiz []struct {
		choice
		Band string `json:"band"`
	} `json:"miniQuiz"`
}

// CheckKidsLesson measures an English Kids lesson for both bands. A lesson with "bands": true fails on
// every broken rule except quiz-answer, which is a heuristic and only ever warns; other lessons only
// warn. A word picture that does not exist (visualOK false) always fails.
func CheckKidsLesson(raw []byte, visualOK func(key string) bool) ([]Summary, []Finding, error) {
	var l kidsLesson
	if err := json.Unmarshal(raw, &l); err != nil {
		return nil, nil, err
	}
	sev := Warn
	if l.Bands {
		sev = Fail
	}
	var findings []Finding
	add := func(s, band, section, rule, format string, a ...any) {
		findings = append(findings, Finding{s, band, section, rule, fmt.Sprintf(format, a...)})
	}

	var summaries []Summary
	for _, band := range []string{Band811, Band1214} {
		teen := band == Band1214
		var all, seen strings.Builder // all: what the band reads; seen: all + headings, recap, terms, more
		sum := Summary{Band: band}
		for _, s := range l.Sections {
			body := s.BodyMarkdown
			terms := s.Jargon
			if teen && s.Teen != nil {
				if s.Teen.Body != "" {
					body = s.Teen.Body
				} else if s.Teen.Add != "" {
					body += "\n\n" + s.Teen.Add
				}
				terms = append(append([]jargon{}, terms...), s.Teen.Jargon...)
			}
			for _, part := range []string{s.BigIdea, s.ChipQuote, s.Analogy.Description, body} {
				if part != "" {
					all.WriteString(StripMarkdown(part) + "\n\n")
				}
			}
			seen.WriteString(s.Heading + "\n")
			for _, j := range terms {
				seen.WriteString(j.Term + "\n")
			}
			if s.More != nil {
				seen.WriteString(s.More.Title + "\n" + s.More.BodyMarkdown + "\n")
			}

			bold := BoldTerms(body)
			sum.MaxNewWords = max(sum.MaxNewWords, len(bold))
			if limit := map[bool]int{false: MaxNewWords811, true: MaxNewWords1214}[teen]; len(bold) > limit {
				add(sev, band, s.ID, "new-words", "%d bold words, at most %d", len(bold), limit)
			}
			known := map[string]bool{}
			for _, j := range terms {
				known[normTerm(j.Term)] = true
			}
			for _, b := range bold {
				if !known[normTerm(b)] {
					sum.MissingTerms++
					add(sev, band, s.ID, "missing-term", "%q has no Jargon Buster entry", b)
				}
			}
			if !teen {
				for _, sent := range Sentences(StripMarkdown(s.BigIdea + "\n\n" + s.ChipQuote + "\n\n" + s.Analogy.Description + "\n\n" + s.BodyMarkdown)) {
					if n := len(Words(sent)); n > MaxSentenceWords {
						add(sev, band, s.ID, "long-sentence", "%d words: %q", n, clip(sent))
					}
				}
			}
		}
		for _, r := range l.Recap {
			seen.WriteString(r + "\n")
		}

		sum.Stats = Measure(all.String())
		limit := map[bool]float64{false: MaxGrade811, true: MaxGrade1214}[teen]
		if sum.Stats.Grade > limit {
			add(sev, band, "-", "grade", "grade %.1f, at most %.1f", sum.Stats.Grade, limit)
		}
		if !teen && sum.Stats.AvgSentence > MaxAvgSentence {
			add(sev, band, "-", "avg-sentence", "%.1f words per sentence, at most %.0f", sum.Stats.AvgSentence, MaxAvgSentence)
		}

		text := strings.ToLower(all.String() + seen.String())
		for i, q := range l.MiniQuiz {
			if q.Band != "" && !teen {
				continue
			}
			if q.CorrectIndex < 0 || q.CorrectIndex >= len(q.Options) {
				continue
			}
			if keys := keyWords(q.Options[q.CorrectIndex]); len(keys) > 0 && !anyIn(keys, text) {
				add(Warn, band, "-", "quiz-answer", "miniQuiz[%d] answer %q is not in the lesson text", i, q.Options[q.CorrectIndex])
			}
		}
		summaries = append(summaries, sum)
	}

	for _, s := range l.Sections {
		for _, j := range append(append([]jargon{}, s.Jargon...), teenJargon(s.Teen)...) {
			if j.Visual != "" && !visualOK(j.Visual) {
				add(Fail, "-", s.ID, "missing-visual", "word picture %q has no file or approved register entry", j.Visual)
			}
		}
	}

	if l.Bands {
		for _, s := range l.Sections {
			if s.Teen != nil && s.Teen.Add != "" && s.Teen.Body != "" {
				add(Fail, "-", s.ID, "structure", "teen.add and teen.body are both set")
			}
			if strings.TrimSpace(s.BigIdea) == "" {
				add(Fail, "-", s.ID, "structure", "no bigIdea")
			}
			hasVisual := s.Diagram != nil
			for _, j := range s.Jargon {
				hasVisual = hasVisual || j.Visual != ""
			}
			if !hasVisual {
				add(Fail, "-", s.ID, "structure", "no picture: needs a diagram or a word picture")
			}
		}
		if len(l.Recap) != 3 {
			add(Fail, "-", "-", "structure", "recap has %d items, needs 3", len(l.Recap))
		}
		bandItems, coreAfterBand := 0, false
		for _, q := range l.MiniQuiz {
			switch {
			case q.Band == Band1214:
				bandItems++
			case q.Band != "":
				add(Fail, "-", "-", "structure", "miniQuiz band %q is not %q", q.Band, Band1214)
			case bandItems > 0:
				coreAfterBand = true
			}
		}
		if bandItems > 1 {
			add(Fail, "-", "-", "structure", "%d 12-14 quiz questions, at most 1", bandItems)
		}
		if coreAfterBand {
			add(Fail, "-", "-", "structure", "the 12-14 quiz question must come after every other question")
		}
	}
	return summaries, findings, nil
}

func teenJargon(t *struct {
	Add    string   `json:"add"`
	Body   string   `json:"body"`
	Jargon []jargon `json:"jargonBuster"`
}) []jargon {
	if t == nil {
		return nil
	}
	return t.Jargon
}

var stopWords = map[string]bool{"that": true, "this": true, "with": true, "from": true, "they": true, "them": true,
	"have": true, "what": true, "when": true, "which": true, "will": true, "your": true, "only": true, "more": true,
	"than": true, "into": true, "about": true, "just": true, "like": true, "does": true, "were": true, "been": true}

// keyWords are the answer's words a lesson would have to mention: 4+ letters, not stop words.
func keyWords(answer string) []string {
	var out []string
	for _, w := range Words(answer) {
		if w = strings.ToLower(w); len(w) >= 4 && !stopWords[w] {
			out = append(out, w)
		}
	}
	return out
}

func anyIn(words []string, text string) bool {
	for _, w := range words {
		if strings.Contains(text, normTerm(w)) {
			return true
		}
	}
	return false
}

func clip(s string) string {
	if len(s) > 60 {
		return s[:57] + "..."
	}
	return s
}
