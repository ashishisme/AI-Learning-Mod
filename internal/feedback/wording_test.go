// SPEC: SPEC-016 FR-001..FR-003, FR-007..FR-009 (FR-I18N-11, AC-85, AC-86)
package feedback

import (
	"errors"
	"strings"
	"testing"
)

func TestWordingReportKeepsLanguageSectionAndStep(t *testing.T) {
	s, _, _ := newSvc(t)
	in := clean
	in.Category, in.LessonID, in.Mode, in.Lang, in.SectionID, in.Step = "translation", "5-nlp", "standard", "ta", "worked-example", 3
	seedPassed(t, s, "A", in)
	items, _, _, _, err := s.List(bg, Filter{})
	if err != nil || len(items) != 1 {
		t.Fatalf("%v %v", items, err)
	}
	if x := items[0]; x.Category != "translation" || x.Lang != "ta" || x.SectionID != "worked-example" || x.Step != 3 {
		t.Errorf("stored %+v", x)
	}
}

func TestWordingReportFieldsAreValidated(t *testing.T) {
	s, _, _ := newSvc(t)
	for name, mut := range map[string]func(*Input){
		"lang upper":      func(i *Input) { i.Lang = "TA" },
		"lang long":       func(i *Input) { i.Lang = "tamil" },
		"section spaces":  func(i *Input) { i.SectionID = "worked example" },
		"section leading": func(i *Input) { i.SectionID = "-x" },
		"section long":    func(i *Input) { i.SectionID = strings.Repeat("a", 65) },
		"step 21":         func(i *Input) { i.Step = 21 },
		"step negative":   func(i *Input) { i.Step = -1 },
	} {
		in := clean
		in.Category = "translation"
		mut(&in)
		if err := s.Submit(bg, "BETA-"+name, "", in); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s: got %v", name, err)
		}
	}
}

func TestLanguageFilterAndCSVColumns(t *testing.T) {
	s, _, _ := newSvc(t)
	for _, lang := range []string{"hi", "kn", "ta", ""} {
		in := clean
		in.Lang, in.SectionID, in.Step = lang, "intro", 2
		seedPassed(t, s, "L"+lang, in)
	}
	for f, want := range map[string]int{"": 4, "kn": 1, "unknown": 1, "en": 0} {
		if _, total, _, _, _ := s.List(bg, Filter{Lang: f}); total != want {
			t.Errorf("lang %q: %d, want %d", f, total, want)
		}
	}
	out, err := s.CSV(bg, "admin", Filter{Lang: "kn"})
	if err != nil {
		t.Fatal(err)
	}
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	if len(lines) != 2 || !strings.HasSuffix(lines[0], ",lang,section,step") || !strings.HasSuffix(lines[1], ",kn,intro,2") {
		t.Errorf("csv:\n%s", out)
	}
}
