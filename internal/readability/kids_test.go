// SPEC: FR-CNT-08, FR-CNT-09 (SPEC-012), AC-60, AC-61
package readability

import (
	"strings"
	"testing"
)

// A banded lesson that passes every rule.
const goodSection = `{"id":"s1","heading":"A switch","bigIdea":"A neuron is a switch.","bodyMarkdown":"A **neuron** is a tiny switch. It says yes or no.",` +
	`"teen":{"add":"Each clue has a **weight**."},` +
	`"jargonBuster":[{"term":"neuron","simpleExplanation":"A switch.","visual":"neuron-switch"},{"term":"weight","simpleExplanation":"How much a clue counts."}]}`

func lesson(bands bool, sections, recap, quiz string) []byte {
	b := ""
	if bands {
		b = `"bands":true,`
	}
	return []byte(`{"lessonId":"3","mode":"junior",` + b + `"recap":` + recap + `,"sections":[` + sections + `],"miniQuiz":[` + quiz + `]}`)
}

const recap3 = `["a","b","c"]`
const quizOK = `{"question":"A neuron is a…","options":["sandwich","switch"],"correctIndex":1}`

func check(t *testing.T, raw []byte, visualOK bool) ([]Summary, []Finding) {
	t.Helper()
	s, f, err := CheckKidsLesson(raw, func(string) bool { return visualOK })
	if err != nil {
		t.Fatal(err)
	}
	return s, f
}

func rules(fs []Finding) string {
	var out []string
	for _, f := range fs {
		out = append(out, f.Severity+":"+f.Band+":"+f.Rule)
	}
	return strings.Join(out, " ")
}

func TestGoodBandedLessonPasses(t *testing.T) {
	sums, fs := check(t, lesson(true, goodSection, recap3, quizOK), true)
	if len(fs) != 0 {
		t.Fatalf("unexpected findings: %s", rules(fs))
	}
	if len(sums) != 2 || sums[0].Band != Band811 || sums[1].Band != Band1214 || sums[1].MaxNewWords != 2 || sums[0].MaxNewWords != 1 {
		t.Errorf("summaries: %+v", sums)
	}
}

func TestRulesAndSeverity(t *testing.T) {
	long := `{"id":"s1","heading":"H","bigIdea":"B.","diagram":{},"bodyMarkdown":"` + strings.Repeat("word ", 25) + `."}`
	tooMany := `{"id":"s1","heading":"H","bigIdea":"B.","diagram":{},"bodyMarkdown":"**a1** **b2** **c3**","jargonBuster":[{"term":"a1"},{"term":"b2"},{"term":"c3"}]}`
	missing := `{"id":"s1","heading":"H","bigIdea":"B.","diagram":{},"bodyMarkdown":"A **neuron**."}`
	hard := `{"id":"s1","heading":"H","bigIdea":"B.","diagram":{},"bodyMarkdown":"Computational representations necessitate considerable organisational sophistication."}`
	for _, c := range []struct {
		name, section, want string
	}{
		{"long sentence", long, "8-11:long-sentence"},
		{"average sentence", long, "8-11:avg-sentence"},
		{"too many new words", tooMany, "8-11:new-words"},
		{"missing term", missing, "8-11:missing-term"},
		{"grade", hard, "8-11:grade"},
	} {
		for _, bands := range []bool{false, true} {
			want := map[bool]string{false: "WARN:", true: "FAIL:"}[bands] + c.want
			if _, fs := check(t, lesson(bands, c.section, recap3, ``), true); !strings.Contains(rules(fs), want) {
				t.Errorf("%s (bands=%v): want %s, got %s", c.name, bands, want, rules(fs))
			}
		}
	}
}

func TestMissingVisualAlwaysFails(t *testing.T) {
	for _, bands := range []bool{false, true} {
		if _, fs := check(t, lesson(bands, goodSection, recap3, quizOK), false); !strings.Contains(rules(fs), "FAIL:-:missing-visual") {
			t.Errorf("bands=%v: got %s", bands, rules(fs))
		}
	}
}

func TestQuizAnswerOnlyWarns(t *testing.T) {
	quiz := `{"question":"Q","options":["giraffe","elephant"],"correctIndex":1}`
	_, fs := check(t, lesson(true, goodSection, recap3, quiz), true)
	if got := rules(fs); got != "WARN:8-11:quiz-answer WARN:12-14:quiz-answer" {
		t.Errorf("got %s", got)
	}
}

func TestTeenTextOnlyIn1214(t *testing.T) {
	// "weight" is bold only in teen.add with no entry: missing in 12-14, not in 8-11.
	sec := `{"id":"s1","heading":"H","bigIdea":"B.","diagram":{},"bodyMarkdown":"A switch.","teen":{"add":"A **weight**."}}`
	_, fs := check(t, lesson(true, sec, recap3, ``), true)
	if got := rules(fs); got != "FAIL:12-14:missing-term" {
		t.Errorf("got %s", got)
	}
	// teen.body replaces the core text for 12-14.
	sec = `{"id":"s1","heading":"H","bigIdea":"B.","diagram":{},"bodyMarkdown":"A **neuron**.","jargonBuster":[{"term":"neuron"}],"teen":{"body":"No bold here."}}`
	if sums, _ := check(t, lesson(true, sec, recap3, ``), true); sums[1].MaxNewWords != 0 || sums[0].MaxNewWords != 1 {
		t.Errorf("teen.body: %+v", sums)
	}
}

func TestStructureRules(t *testing.T) {
	both := `{"id":"s1","heading":"H","bigIdea":"B.","diagram":{},"bodyMarkdown":"x.","teen":{"add":"a.","body":"b."}}`
	bare := `{"id":"s1","heading":"H","bodyMarkdown":"x."}`
	q := func(band string) string {
		b := ""
		if band != "" {
			b = `"band":"` + band + `",`
		}
		return `{` + b + `"question":"Q","options":["switch","no"],"correctIndex":0}`
	}
	for _, c := range []struct{ name, section, recap, quiz, want string }{
		{"add and body", both, recap3, ``, "teen.add and teen.body are both set"},
		{"no big idea", bare, recap3, ``, "no bigIdea"},
		{"no picture", bare, recap3, ``, "no picture"},
		{"recap size", goodSection, `["a"]`, ``, "recap has 1 items"},
		{"band before core", goodSection, recap3, q("12-14") + "," + q(""), "must come after every other question"},
		{"two band questions", goodSection, recap3, q("") + "," + q("12-14") + "," + q("12-14"), "2 12-14 quiz questions"},
		{"unknown band", goodSection, recap3, q("8-11"), `band "8-11" is not`},
	} {
		_, fs := check(t, lesson(true, c.section, c.recap, c.quiz), true)
		found := false
		for _, f := range fs {
			found = found || (f.Rule == "structure" && f.Severity == Fail && strings.Contains(f.Detail, c.want))
		}
		if !found {
			t.Errorf("%s: want %q, got %+v", c.name, c.want, fs)
		}
		// Structure rules apply only to banded lessons.
		if _, fs := check(t, lesson(false, c.section, c.recap, c.quiz), true); strings.Contains(rules(fs), "structure") {
			t.Errorf("%s: structure rule on an unbanded lesson", c.name)
		}
	}
}
