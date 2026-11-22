// SPEC: SPEC-016 FR-006 (FR-048): disguised phone numbers and emails are refused; wording
// reports full of lesson numbers and maths are not.
package feedback

import "testing"

func TestCheckRefusesDisguisedContactDetails(t *testing.T) {
	var items []string
	loadJSON(t, "testdata/adversarial/personal_details.json", &items)
	for _, m := range items {
		if _, found := Check(m); !found {
			t.Errorf("not refused: %q", m)
		}
	}
}

func TestCheckPassesWordingReportsWithNumbers(t *testing.T) {
	var items []string
	loadJSON(t, "testdata/adversarial/clean.json", &items)
	for _, m := range items {
		if kind, found := Check(m); found {
			t.Errorf("refused as %s: %q", kind, m)
		}
	}
}
