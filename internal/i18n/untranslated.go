// SPEC: SPEC-015 SC-001 (analysis G1)
package i18n

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"unicode"
)

// Untranslated lists the translatable texts of a translated file that are still exactly the English
// text. A single word ("AI", "ReLU", "XOR") and text with no letters (numbers, symbols) may stay as
// they are; anything longer was left untranslated.
func Untranslated(root string, t Target) []string {
	var en, tr any
	for _, f := range []struct {
		p string
		v *any
	}{{t.Source, &en}, {t.Path, &tr}} {
		raw, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(f.p)))
		if err != nil || json.Unmarshal(raw, f.v) != nil {
			return nil // Parity reports missing and invalid files
		}
	}
	var out []string
	if t.Kind == KindQuiz { // keyed by lesson, as Parity walks it
		e, ok1 := en.(map[string]any)
		r, ok2 := tr.(map[string]any)
		if ok1 && ok2 {
			for _, k := range sortedKeys(e) {
				sameText(t.Kind, "*", k, e[k], r[k], &out)
			}
		}
		return out
	}
	sameText(t.Kind, "", "", en, tr, &out)
	return out
}

func sameText(kind, pattern, shown string, en, tr any, out *[]string) {
	switch e := en.(type) {
	case map[string]any:
		t, ok := tr.(map[string]any)
		if !ok {
			return
		}
		for _, k := range sortedKeys(e) {
			next := join(pattern, k)
			if kind == KindUI {
				next = "" // a flat catalogue: every value is translatable
			}
			sameText(kind, next, join(shown, k), e[k], t[k], out)
		}
	case []any:
		t, ok := tr.([]any)
		if !ok || len(t) != len(e) {
			return
		}
		for i := range e {
			sameText(kind, pattern+"[]", fmt.Sprintf("%s[%d]", shown, i), e[i], t[i], out)
		}
	case string:
		if t, ok := tr.(string); ok && t == e && (kind == KindUI || translatable(kind, pattern)) && wordy(e) {
			*out = append(*out, shown+": still in English: "+quote(e))
		}
	}
}

// wordy is true for text of two or more words that contain letters. Placeholders ({count}, %s) are not words.
func wordy(s string) bool {
	n := 0
	for _, w := range strings.Fields(s) {
		if strings.HasPrefix(w, "{") || strings.HasPrefix(w, "%") {
			continue
		}
		if strings.IndexFunc(w, unicode.IsLetter) >= 0 {
			n++
		}
	}
	return n >= 2
}
