// SPEC: SPEC-009 FR-022, FR-023 (research R13); FR-I18N-05 amended 2.18.0 (SPEC-015)

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

// IndianDigitZeros are the code points of zero in the scripts an Indian learner may type digits in: Arabic-Indic,
// Extended Arabic-Indic, Devanagari, Bengali, Gurmukhi, Gujarati, Oriya, Tamil, Telugu, Kannada, Malayalam and
// fullwidth. The next nine code points are one to nine.
var IndianDigitZeros = []rune{0x0660, 0x06F0, 0x0966, 0x09E6, 0x0A66, 0x0AE6, 0x0B66, 0x0BE6, 0x0C66, 0x0CE6, 0x0D66, 0xFF10}

// FoldScripts maps one rune to the form the safety and personal-details rules match on, in every listed script:
// Devanagari spellings are folded (FoldDevanagari), invisible characters such as the zero-width joiner and
// non-joiner are dropped, and every Indian script's digits become ASCII. It returns -1 for a rune to drop and r
// unchanged for everything else, so it fits strings.Map.
func FoldScripts(r rune) rune {
	if f := FoldDevanagari(r); f != r {
		return f
	}
	switch r {
	case 0x200B, 0x200C, 0x200D, 0x2060, 0xFEFF, 0x00AD:
		return -1
	}
	for _, z := range IndianDigitZeros {
		if r >= z && r <= z+9 {
			return '0' + (r - z)
		}
	}
	return r
}
