// SPEC: SPEC-009 FR-019, FR-008
package i18n

import (
	"strings"
	"testing"
)

func parityOf(t *testing.T, root, path, kind, source, body string) string {
	t.Helper()
	write(t, root, path, body)
	return strings.Join(Parity(root, Target{Path: path, Source: source, Kind: kind}), "\n")
}

func TestParityUICatalogue(t *testing.T) {
	root := fixture(t)
	const p, src = "web/src/i18n/hi.json", "web/src/i18n/en.json"
	for _, c := range []struct{ body, want string }{
		{`{"n.count.one":"{count} चीज़","n.count.other":"{count} चीज़ें"}`, "missing key a.hello"},
		{`{"a.hello":"नमस्ते","n.count.other":"{count} चीज़ें"}`, "a.hello: placeholders changed"},
		{`{"a.hello":"नमस्ते {name}","n.count.other":"{count} चीज़ें","a.extra":"x"}`, "key a.extra is not in English"},
	} {
		if got := parityOf(t, root, p, KindUI, src, c.body); !strings.Contains(got, c.want) {
			t.Errorf("%s: want %q, got %q", c.body, c.want, got)
		}
	}
	// Plural categories follow the language's own rules: .one may be absent and .few may be added.
	if got := parityOf(t, root, p, KindUI, src, `{"a.hello":"नमस्ते {name}","n.count.other":"{count} चीज़ें","n.count.few":"{count} चीज़ें"}`); got != "" {
		t.Errorf("plural set: %s", got)
	}
}

func TestParityQuiz(t *testing.T) {
	root := fixture(t)
	const p, src = "web/src/data/quizzes/hi.json", "web/src/data/quizzes/en.json"
	q := func(questions string) string {
		return `{"1-intro":{"lessonId":"1-intro","title":"परिचय","description":"वि","questions":[` + questions + `]}}`
	}
	for _, c := range []struct{ body, want string }{
		{`{}`, "missing quiz 1-intro"},
		{q(``), "1-intro.questions: must have 1 items"},
		{q(`{"id":"q1","prompt":"प्र","options":["क"],"correctIndex":1,"rationale":"का","hintKeyword":"कु"}`), "1-intro.questions[0].options: must have 2 items"},
		{q(`{"id":"q1","prompt":"प्र","options":["क","ख"],"correctIndex":0,"rationale":"का","hintKeyword":"कु"}`), "1-intro.questions[0].correctIndex: must stay 1"},
		{q(`{"id":"प्र1","prompt":"प्र","options":["क","ख"],"correctIndex":1,"rationale":"का","hintKeyword":"कु"}`), `1-intro.questions[0].id: is never translated and must stay "q1"`},
		{q(`{"id":"q1","options":["क","ख"],"correctIndex":1,"rationale":"का","hintKeyword":"कु"}`), "1-intro.questions[0]: missing field prompt"},
	} {
		if got := parityOf(t, root, p, KindQuiz, src, c.body); !strings.Contains(got, c.want) {
			t.Errorf("want %q, got %q", c.want, got)
		}
	}
}

func TestParityAdaptiveLesson(t *testing.T) {
	root := fixture(t)
	const p, src = "public-content/lang/hi/lessons/1-intro.junior.json", "public-content/lessons/1-intro.junior.json"
	lesson := func(id, heading, body string) string {
		return `{"lessonId":"1-intro","mode":"junior","title":"शी","sections":[{"id":"` + id + `",` + heading + `"bodyMarkdown":"` + body + `"}]}`
	}
	good := "`x` को [दस्तावेज़](https://a.b) पर देखें §1"
	for _, c := range []struct{ body, want string }{
		{lesson("s1", ``, good), "sections[0]: missing field heading"},
		{lesson("खंड1", `"heading":"शी",`, good), `sections[0].id: is never translated`},
		{lesson("s1", `"heading":"शी",`, "`y` को [दस्तावेज़](https://a.b) पर देखें §1"), "sections[0].bodyMarkdown: code spans changed"},
		{lesson("s1", `"heading":"शी",`, "`x` को [दस्तावेज़](https://c.d) पर देखें §1"), "sections[0].bodyMarkdown: links changed"},
		{lesson("s1", `"heading":"शी",`, "`x` को [दस्तावेज़](https://a.b) पर देखें"), "sections[0].bodyMarkdown: § citations: 1 in English, 0 here"},
	} {
		if got := parityOf(t, root, p, KindAdaptive, src, c.body); !strings.Contains(got, c.want) {
			t.Errorf("want %q, got %q", c.want, got)
		}
	}
	if got := parityOf(t, root, p, KindAdaptive, src, lesson("s1", `"heading":"शी",`, good)); got != "" {
		t.Errorf("good translation: %s", got)
	}
}

func TestPreserved(t *testing.T) {
	fence := "```python\nprint(1)\n```"
	for _, c := range []struct{ en, tr, want string }{
		{"Run " + fence, "चलाएँ " + fence, ""},
		{"Run " + fence, "चलाएँ ```python\nprint(2)\n```", "fenced code changed"},
		{"## A\n- one\n- two", "## क\n- एक", "list items: 2 in English, 1 here"},
		{"## A", "क", "headings: 1 in English, 0 here"},
		{"see https://x.y/z", "देखें https://x.y/z", ""},
		{"see https://x.y/z", "देखें https://x.y", "URLs changed"},
		{"such as http://localhost:11434/v1.", "जैसे http://localhost:11434/v1।", ""},
		{"<b>{n}</b> left", "<b>{n}</b> बाकी", ""},
		{"<b>{n}</b> left", "{n} बाकी", "<b> marks: 1 in English, 0 here"},
	} {
		if got := Preserved(c.en, c.tr); got != c.want {
			t.Errorf("Preserved(%q, %q) = %q, want %q", c.en, c.tr, got, c.want)
		}
	}
}
