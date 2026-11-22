// SPEC: SPEC-009 FR-019, FR-008; contracts/content-files.md "Lesson and quiz files"

package i18n

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

// Translatable lists the fields of each kind a translation may change, as walk paths: ".key" for an
// object field, "[]" for an array element, "*" for a quiz's lesson key. Every other value (ids, modes,
// types, numbers, booleans, avatars, correct answers) must equal the English one.
var Translatable = map[string][]string{
	KindAdaptive: {
		"title", "intro", "mascot.name", "mascot.greeting",
		"sections[].realWorld", "recall[].question", "recall[].options[]", "recall[].explanation",
		"sections[].heading", "sections[].chipQuote", "sections[].bodyMarkdown",
		"sections[].analogy.metaphorName", "sections[].analogy.description",
		"sections[].jargonBuster[].term", "sections[].jargonBuster[].simpleExplanation",
		"sections[].diagram.caption", "sections[].diagram.alt", "sections[].diagram.content", "sections[].diagram.steps[]",
		"sections[].interactiveWidget.title", "sections[].interactiveWidget.instruction", "sections[].interactiveWidget.goal",
		"sections[].interactiveWidget.predictionPrompt",
		"sections[].interactiveWidget.successMessage", "sections[].interactiveWidget.hints[]",
		"sections[].interactiveWidget.scenario.userPrompt", "sections[].interactiveWidget.scenario.terminalA",
		"sections[].interactiveWidget.scenario.terminalB", "sections[].interactiveWidget.scenario.explanation",
		"miniQuiz[].question", "miniQuiz[].options[]", "miniQuiz[].praise", "miniQuiz[].explanation",
		"teachBack.prompt", "teachBack.options[]", "teachBack.explanation",
		// SPEC FR-CNT-09 (SPEC-012): banded Kids lessons. bands, miniQuiz[].band, jargonBuster[].visual and
		// checkIn.correctIndex are left out on purpose: they must equal the English values. So are
		// sections[].scene and interactiveWidget.scaffold (a mode, "guided" or "free", not text).
		"recap[]", "sections[].bigIdea", "sections[].more.title", "sections[].more.bodyMarkdown",
		"sections[].teen.add", "sections[].teen.body",
		"sections[].teen.jargonBuster[].term", "sections[].teen.jargonBuster[].simpleExplanation",
		"sections[].checkIn.question", "sections[].checkIn.options[]", "sections[].checkIn.praise",
		"sections[].checkIn.explanation",
		// SPEC-013: Detailed lessons. goFurther[].url, origin and colabUrl must equal English.
		"goFurther[].title", "goFurther[].note",
	},
	KindQuiz: {
		"*.title", "*.description", "*.questions[].prompt", "*.questions[].options[]",
		"*.questions[].rationale", "*.questions[].hintKeyword",
	},
}

func translatable(kind, p string) bool {
	for _, a := range Translatable[kind] {
		if a == p {
			return true
		}
	}
	return false
}

// Parity compares a translated file with its English source.
func Parity(root string, t Target) []string {
	var en, tr any
	for _, f := range []struct {
		p string
		v *any
	}{{t.Source, &en}, {t.Path, &tr}} {
		raw, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(f.p)))
		if err != nil {
			return []string{err.Error()}
		}
		if err := json.Unmarshal(raw, f.v); err != nil {
			return []string{fmt.Sprintf("%s is not valid JSON: %v", f.p, err)}
		}
	}
	if t.Kind == KindUI {
		return uiParity(en, tr)
	}
	var out []string
	if t.Kind == KindQuiz {
		enMap, ok1 := en.(map[string]any)
		trMap, ok2 := tr.(map[string]any)
		if !ok1 || !ok2 {
			return []string{"quiz file must be an object keyed by lesson"}
		}
		for _, k := range sortedKeys(enMap) {
			if _, ok := trMap[k]; !ok {
				out = append(out, "missing quiz "+k)
				continue
			}
			walk(t.Kind, "*", k, enMap[k], trMap[k], &out)
		}
		for _, k := range sortedKeys(trMap) {
			if _, ok := enMap[k]; !ok {
				out = append(out, "quiz "+k+" is not in English")
			}
		}
		return out
	}
	walk(t.Kind, "", "", en, tr, &out)
	return out
}

// walk compares two JSON values. pattern is the allowlist path, shown is the path for messages.
func walk(kind, pattern, shown string, en, tr any, out *[]string) {
	at := func(s string) string {
		if shown == "" {
			return s
		}
		return shown + ": " + s
	}
	switch e := en.(type) {
	case map[string]any:
		t, ok := tr.(map[string]any)
		if !ok {
			*out = append(*out, at("must be an object, as in English"))
			return
		}
		for _, k := range sortedKeys(e) {
			v, ok := t[k]
			if !ok {
				*out = append(*out, at("missing field "+k))
				continue
			}
			walk(kind, join(pattern, k), join(shown, k), e[k], v, out)
		}
		for _, k := range sortedKeys(t) {
			if _, ok := e[k]; !ok {
				*out = append(*out, at("field "+k+" is not in English"))
			}
		}
	case []any:
		t, ok := tr.([]any)
		if !ok || len(t) != len(e) {
			*out = append(*out, at(fmt.Sprintf("must have %d items, as in English", len(e))))
			return
		}
		for i := range e {
			walk(kind, pattern+"[]", fmt.Sprintf("%s[%d]", shown, i), e[i], t[i], out)
		}
	case string:
		t, ok := tr.(string)
		switch {
		case !ok:
			*out = append(*out, at("must be text, as in English"))
		case !translatable(kind, pattern):
			if t != e {
				*out = append(*out, at("is never translated and must stay "+quote(e)))
			}
		default:
			if r := Preserved(e, t); r != "" {
				*out = append(*out, at(r))
			}
		}
	default: // numbers, booleans, null
		if fmt.Sprint(en) != fmt.Sprint(tr) {
			*out = append(*out, at(fmt.Sprintf("must stay %v, as in English", en)))
		}
	}
}

var pluralSuffix = regexp.MustCompile(`\.(zero|one|two|few|many|other)$`)

// uiParity checks a flat catalogue. A plural set needs its .other form; its other categories follow
// the language's own plural rules (Intl.PluralRules), so they may differ from English.
func uiParity(en, tr any) []string {
	e, ok1 := en.(map[string]any)
	t, ok2 := tr.(map[string]any)
	if !ok1 || !ok2 {
		return []string{"catalogue must be a flat object of strings"}
	}
	var out []string
	for _, k := range sortedKeys(e) {
		ev, _ := e[k].(string)
		tv, ok := t[k].(string)
		if !ok {
			if m := pluralSuffix.FindString(k); m != "" && m != ".other" {
				if _, has := t[strings.TrimSuffix(k, m)+".other"]; has {
					continue
				}
			}
			out = append(out, "missing key "+k)
			continue
		}
		if r := Preserved(ev, tv); r != "" {
			out = append(out, k+": "+r)
		}
	}
	for _, k := range sortedKeys(t) {
		if _, ok := e[k]; ok {
			continue
		}
		if m := pluralSuffix.FindString(k); m != "" {
			if _, ok := e[strings.TrimSuffix(k, m)+".other"]; ok {
				continue // a plural category English does not need
			}
		}
		out = append(out, "key "+k+" is not in English")
	}
	return out
}

var (
	fenceRe       = regexp.MustCompile("(?s)```.*?```")
	codeSpanRe    = regexp.MustCompile("`[^`\n]+`")
	linkTargetRe  = regexp.MustCompile(`\]\(([^)\s]+)`)
	bareURLRe     = regexp.MustCompile(`https?://[^\s)<>"'\]]+`)
	placeholderRe = regexp.MustCompile(`\{[A-Za-z0-9_]+\}`)
	headingRe     = regexp.MustCompile(`(?m)^#{1,6}\s`)
	listItemRe    = regexp.MustCompile(`(?m)^\s*(?:[-*+]|\d+\.)\s`)
)

// Preserved reports how a translation broke what must survive translation, or "" if nothing did:
// fenced code and code spans unchanged, the same link targets and URLs, the same number of §
// citations, {placeholders} and <b> marks, and the same Markdown headings and list items.
func Preserved(en, tr string) string {
	enFences, trFences := fenceRe.FindAllString(en, -1), fenceRe.FindAllString(tr, -1)
	if !sameItems(enFences, trFences) {
		return "fenced code changed"
	}
	en, tr = fenceRe.ReplaceAllString(en, ""), fenceRe.ReplaceAllString(tr, "")
	checks := []struct {
		name string
		find func(string) []string
	}{
		{"code spans changed", func(s string) []string { return codeSpanRe.FindAllString(s, -1) }},
		{"links changed", func(s string) []string { return submatches(linkTargetRe, s) }},
		{"URLs changed", func(s string) []string { return urls(s) }},
		{"placeholders changed", func(s string) []string { return placeholderRe.FindAllString(s, -1) }},
	}
	for _, c := range checks {
		if !sameItems(c.find(en), c.find(tr)) {
			return c.name
		}
	}
	counts := []struct {
		name  string
		count func(string) int
	}{
		{"§ citations", func(s string) int { return strings.Count(s, "§") }},
		{"<b> marks", func(s string) int { return strings.Count(s, "<b>") }},
		{"headings", func(s string) int { return len(headingRe.FindAllString(s, -1)) }},
		{"list items", func(s string) int { return len(listItemRe.FindAllString(s, -1)) }},
	}
	for _, c := range counts {
		if a, b := c.count(en), c.count(tr); a != b {
			return fmt.Sprintf("%s: %d in English, %d here", c.name, a, b)
		}
	}
	return ""
}

// urls lists the bare URLs in s, without the sentence punctuation that may follow one: a translation
// may end the sentence with its own full stop (Hindi '।') after an unchanged URL.
func urls(s string) []string {
	var out []string
	for _, u := range bareURLRe.FindAllString(s, -1) {
		out = append(out, strings.TrimRight(u, ".,;:!?।॥"))
	}
	return out
}

func submatches(re *regexp.Regexp, s string) []string {
	var out []string
	for _, m := range re.FindAllStringSubmatch(s, -1) {
		out = append(out, m[1])
	}
	return out
}

func sameItems(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	a, b = append([]string(nil), a...), append([]string(nil), b...)
	sort.Strings(a)
	sort.Strings(b)
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func sortedKeys(m map[string]any) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func join(a, b string) string {
	if a == "" {
		return b
	}
	return a + "." + b
}

func quote(s string) string {
	if r := []rune(s); len(r) > 40 {
		s = string(r[:40]) + "…"
	}
	return fmt.Sprintf("%q", s)
}
