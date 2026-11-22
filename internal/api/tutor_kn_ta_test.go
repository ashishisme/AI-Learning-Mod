// SPEC: SPEC-015 FR-013, US1 scenario 4 (analysis G2)
package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"ai-foundations-coach/internal/i18n"
)

// The tutor answers a Kannada or Tamil learner in that language, from that language's lesson, citing its heading.
func TestTutorPrepareInKannadaAndTamil(t *testing.T) {
	for _, c := range []struct{ code, name, title, heading, body, question string }{
		{"kn", "ಕನ್ನಡ", "ಪಾಠ 1", "ಪರಿಚಯ", "ಎಐ ಉದಾಹರಣೆಗಳಿಂದ ಕಲಿಯುತ್ತದೆ.", "ಎಐ ಹೇಗೆ ಕಲಿಯುತ್ತದೆ?"},
		{"ta", "தமிழ்", "பாடம் 1", "அறிமுகம்", "செயற்கை நுண்ணறிவு எடுத்துக்காட்டுகளிலிருந்து கற்கிறது.", "செயற்கை நுண்ணறிவு எப்படி கற்கிறது?"},
	} {
		t.Run(c.code, func(t *testing.T) {
			dir := setupTestContent(t)
			for rel, body := range map[string]string{
				"languages.json": `{"languages":[{"code":"` + c.code + `","name":"` + c.name + `","speechLang":"` + c.code + `-IN","status":"approved","beta":true}]}`,
				"lang/" + c.code + "/lessons/lesson-1.detailed.json": `{"lessonId":"lesson-1","mode":"detailed","title":"` + c.title +
					`","sections":[{"heading":"` + c.heading + `","bodyMarkdown":"` + c.body + `"}]}`,
			} {
				p := filepath.Join(dir, rel)
				_ = os.MkdirAll(filepath.Dir(p), 0o755)
				if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
					t.Fatal(err)
				}
			}
			router := NewRouter(RouterConfig{ContentDir: dir, Hosted: true, TutorDisabled: true})
			var got TutorPrepareResponse
			rec := postPrepare(router, `{"lessonId":"lesson-1","question":"`+c.question+`","lang":"`+c.code+`"}`)
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil || rec.Code != http.StatusOK {
				t.Fatalf("%d %s", rec.Code, rec.Body.String())
			}
			cite := "[" + c.title + " § " + c.heading + "]"
			if !strings.Contains(got.Messages[1].Content, c.body) {
				t.Errorf("the prompt does not use the %s lesson: %q", c.code, got.Messages[1].Content)
			}
			if !strings.Contains(got.Messages[0].Content, "Answer in "+c.name) || !strings.Contains(got.Messages[0].Content, cite) {
				t.Errorf("system prompt: %q", got.Messages[0].Content)
			}
			if got.Citation != cite {
				t.Errorf("citation %q, want %q", got.Citation, cite)
			}
			// The fallback reply comes from the language's server messages (SPEC-015 T005).
			if i18n.UncitedFallback(c.code) == UncitedFallback {
				t.Skipf("%s server messages not added yet (SPEC-015 T005)", c.code)
			}
			if got.Fallback != i18n.UncitedFallback(c.code) {
				t.Errorf("fallback %q, want the %s one", got.Fallback, c.code)
			}
		})
	}
}
