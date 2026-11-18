// SPEC: AC-82 (FR-I18N-05 amended 2.18.0)
package i18n

import (
	"strings"
	"testing"
)

// Kannada and Tamil digits become ASCII and zero-width joiners go, while Hindi folding is unchanged.
func TestFoldScripts(t *testing.T) {
	for in, want := range map[string]string{
		"೯೮೭೬೫":          "98765", // Kannada digits
		"௯௮௭௬௫":          "98765", // Tamil digits
		"९८७६५":          "98765", // Devanagari digits
		"ಕ‍ಕ":            "ಕಕ",    // zero-width joiner dropped
		"ಕ‌ಕ":            "ಕಕ",    // zero-width non-joiner dropped
		"फ़ोन":           "फोन",   // nukta folded, as before
		"plain text 123": "plain text 123",
	} {
		if got := strings.Map(FoldScripts, in); got != want {
			t.Errorf("FoldScripts(%q) = %q, want %q", in, got, want)
		}
	}
}
