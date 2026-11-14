// SPEC: SPEC-009 FR-012, research R10 (one narration text rule for the screen and the recordings)

// Package narration builds the text of every narrated track and checks that its recordings exist and
// are current. The rule matches web/src/services/narrationText.ts; content/fixtures/narration-text.json
// keeps the two in step.
package narration

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

var (
	linkRe     = regexp.MustCompile(`\[([^\]]+)\]\([^)]+\)`)
	tagRe      = regexp.MustCompile(`</?[^>]+(>|$)`)
	markRe     = regexp.MustCompile("[*_#`~>]")
	listNumRe  = regexp.MustCompile(`([0-9]+)\.\s+`)
	modesInUse = []string{"junior", "plain-english", "detailed"}
)

// Clean strips Markdown the way the browser does before speaking: links become their text, HTML tags
// go, then the marks *_#`~> go, and list numbers keep one space.
func Clean(s string) string {
	s = linkRe.ReplaceAllString(s, "$1")
	s = tagRe.ReplaceAllString(s, "")
	s = markRe.ReplaceAllString(s, "")
	s = listNumRe.ReplaceAllString(s, "$1. ")
	return strings.TrimSpace(s)
}

// Section is what a section's "Read section" button says, before cleaning.
func Section(heading, chipQuote, body, chipSays string) string {
	quote := ""
	if chipQuote != "" {
		quote = chipSays + chipQuote + ". "
	}
	return heading + ". " + quote + body
}

// Track is one narrated piece of text. Key is "<lessonId>/<mode>/<trackId>", or "global/<trackId>" for
// text that is the same in every lesson; trackId is the narration button's id in the UI.
type Track struct {
	Key  string
	Text string // cleaned, as it is spoken
}

type adaptive struct {
	LessonID string `json:"lessonId"`
	Mode     string `json:"mode"`
	Intro    string `json:"intro"`
	Mascot   struct {
		Greeting string `json:"greeting"`
	} `json:"mascot"`
	Sections []struct {
		ID           string `json:"id"`
		Heading      string `json:"heading"`
		ChipQuote    string `json:"chipQuote"`
		BigIdea      string `json:"bigIdea"`
		BodyMarkdown string `json:"bodyMarkdown"`
		Teen         struct {
			Add  string `json:"add"`
			Body string `json:"body"`
		} `json:"teen"`
		Diagram struct {
			Type  string   `json:"type"`
			Steps []string `json:"steps"`
		} `json:"diagram"`
	} `json:"sections"`
}

// Tracks lists every narrated track of a language from its translated adaptive lessons under
// public-content/lang/<code>/lessons and its UI catalogue (for "Chip says: " and the default greeting).
func Tracks(root, code string) ([]Track, error) {
	ui, err := catalogue(root, code)
	if err != nil {
		return nil, err
	}
	var out []Track
	add := func(key, raw string) {
		if text := Clean(raw); text != "" {
			out = append(out, Track{Key: key, Text: text})
		}
	}
	add("global/chip-mascot-greeting", ui["adaptive.chipGreeting"])
	for _, mode := range modesInUse {
		files, err := filepath.Glob(filepath.Join(root, "public-content", "lang", code, "lessons", "*."+mode+".json"))
		if err != nil {
			return nil, err
		}
		for _, f := range files {
			raw, err := os.ReadFile(f)
			if err != nil {
				return nil, err
			}
			var l adaptive
			if err := json.Unmarshal(raw, &l); err != nil {
				return nil, fmt.Errorf("%s: %w", f, err)
			}
			prefix := l.LessonID + "/" + l.Mode + "/"
			add(prefix+"intro-guide-note", l.Intro)
			add(prefix+"chip-mascot-greeting", l.Mascot.Greeting)
			for i, s := range l.Sections {
				id := s.ID
				if id == "" {
					id = fmt.Sprint(i) // the UI's fallback: section-<index>
				}
				add(prefix+"section-"+id, Section(s.Heading, s.ChipQuote, CoreBody(s.BigIdea, s.BodyMarkdown), ui["narration.chipSays"]))
				// SPEC FR-CNT-09 (SPEC-012): the 12+ part of a banded Kids section is its own track.
				teen := s.Teen.Body
				if teen == "" {
					teen = s.Teen.Add
				}
				add(prefix+"section-"+id+"-teen", teen)
				// SPEC FR-CNT-13 (SPEC-014): each step of a clip is read on its own while the clip plays.
				if s.Diagram.Type == "clip" {
					for n, step := range s.Diagram.Steps {
						add(fmt.Sprintf("%ssection-%s-clip-%d", prefix, id, n+1), step)
					}
				}
			}
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Key < out[j].Key })
	return out, nil
}

// catalogue is the language's UI text over the English one, as the app shows it.
func catalogue(root, code string) (map[string]string, error) {
	merged := map[string]string{}
	for _, c := range []string{"en", code} {
		raw, err := os.ReadFile(filepath.Join(root, "web", "src", "i18n", c+".json"))
		if errors.Is(err, os.ErrNotExist) && c != "en" {
			continue
		} else if err != nil {
			return nil, err
		}
		var m map[string]string
		if err := json.Unmarshal(raw, &m); err != nil {
			return nil, fmt.Errorf("%s.json: %w", c, err)
		}
		for k, v := range m {
			merged[k] = v
		}
	}
	return merged, nil
}

// CoreBody is a section's narrated body: its big idea (SPEC-012 banded Kids lessons) and then its text.
// web/src/services/narrationText.ts coreBody is its twin.
func CoreBody(bigIdea, body string) string {
	if bigIdea == "" {
		return body
	}
	return bigIdea + "\n\n" + body
}
