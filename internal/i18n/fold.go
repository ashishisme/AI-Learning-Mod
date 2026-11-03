// SPEC: SPEC-009 FR-022, FR-023 (research R13)

package i18n

// FoldDevanagari maps the spellings of one Devanagari word to a single form, so the safety and
// personal-details rules match however a learner types it:
//   - the nukta is dropped (फ़ोन and फोन, ज़िंदा and जिंदा), whether typed as a sign or precomposed;
//   - chandrabindu becomes anusvara (हूँ and हूं, पाँच and पांच).
//
// It returns -1 for a rune to drop, and r unchanged for everything else, so it fits strings.Map.
func FoldDevanagari(r rune) rune {
	switch {
	case r == 0x093C: // nukta sign
		return -1
	case r == 0x0901: // chandrabindu
		return 0x0902
	case r >= 0x0958 && r <= 0x095F: // क़ ख़ ग़ ज़ ड़ ढ़ फ़ य़, precomposed
		return nuktaBase[r-0x0958]
	}
	return r
}

var nuktaBase = [8]rune{0x0915, 0x0916, 0x0917, 0x091C, 0x0921, 0x0922, 0x092B, 0x092F}
