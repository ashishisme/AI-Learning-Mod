// SPEC: SPEC-015 SC-001 (analysis G1)
package i18n

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestUntranslatedFindsTextLeftInEnglish(t *testing.T) {
	root := t.TempDir()
	write := func(p, body string) {
		f := filepath.Join(root, filepath.FromSlash(p))
		if err := os.MkdirAll(filepath.Dir(f), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(f, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	write("web/src/i18n/en.json", `{"a.hi":"Read section","a.ai":"AI","a.n":"{count} / {total}","a.ok":"Next step"}`)
	write("web/src/i18n/kn.json", `{"a.hi":"Read section","a.ai":"AI","a.n":"{count} / {total}","a.ok":"ಮುಂದಿನ ಹೆಜ್ಜೆ"}`)
	write("public-content/lessons/1-intro.detailed.json", `{"lessonId":"1-intro","mode":"detailed","title":"What AI is","sections":[{"id":"what-it-is","heading":"What it is","bodyMarkdown":"AI learns from examples."}]}`)
	write("public-content/lang/kn/lessons/1-intro.detailed.json", `{"lessonId":"1-intro","mode":"detailed","title":"ಎಐ ಎಂದರೇನು","sections":[{"id":"what-it-is","heading":"What it is","bodyMarkdown":"ಎಐ ಉದಾಹರಣೆಗಳಿಂದ ಕಲಿಯುತ್ತದೆ."}]}`)
	write("web/src/data/quizzes/en.json", `{"1-intro":{"lessonId":"1-intro","questions":[{"id":"q1","prompt":"What does AI learn from?","options":["Examples","Rules"]}]}}`)
	write("web/src/data/quizzes/kn.json", `{"1-intro":{"lessonId":"1-intro","questions":[{"id":"q1","prompt":"What does AI learn from?","options":["ಉದಾಹರಣೆಗಳು","ನಿಯಮಗಳು"]}]}}`)

	got := map[string]string{}
	for _, tg := range []Target{
		{Path: "web/src/i18n/kn.json", Source: "web/src/i18n/en.json", Kind: KindUI},
		{Path: "public-content/lang/kn/lessons/1-intro.detailed.json", Source: "public-content/lessons/1-intro.detailed.json", Kind: KindAdaptive},
		{Path: "web/src/data/quizzes/kn.json", Source: "web/src/data/quizzes/en.json", Kind: KindQuiz},
	} {
		got[tg.Kind] = strings.Join(Untranslated(root, tg), "\n")
	}
	// Two or more English words left as they were are reported, in every kind of file.
	for kind, want := range map[string]string{KindUI: "a.hi", KindAdaptive: "sections[0].heading", KindQuiz: "questions[0].prompt"} {
		if !strings.Contains(got[kind], want) {
			t.Errorf("%s: want %q reported, got %q", kind, want, got[kind])
		}
	}
	// A single term, a placeholder line, ids and translated text are fine.
	for _, ok := range []string{"a.ai", "a.n", "a.ok", "what-it-is", "title", "bodyMarkdown", "options"} {
		for kind, g := range got {
			if strings.Contains(g, ok) {
				t.Errorf("%s: %q should not be reported: %q", kind, ok, g)
			}
		}
	}
}
