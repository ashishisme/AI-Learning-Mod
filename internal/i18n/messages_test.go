// SPEC: SPEC-009 FR-022, FR-024
package i18n

import (
	"path/filepath"
	"strings"
	"testing"
)

func TestMessagesCoverEveryLanguageAndKind(t *testing.T) {
	kinds := []string{"email", "phone", "address", "id_number", "date_of_birth", "link"}
	for lang := range piiTemplates {
		for _, k := range kinds {
			if _, ok := piiKindLabels[lang][k]; !ok {
				t.Errorf("%s: no label for %s", lang, k)
			}
		}
		for _, c := range []string{"self-harm", "personal-info", "other"} {
			if safetyReplies[lang][c] == "" {
				t.Errorf("%s: no safety reply for %s", lang, c)
			}
		}
	}
	if got := FeedbackRejection("xx", "phone"); got != "Please remove personal details (phone) and send again." {
		t.Errorf("unknown language: %q", got)
	}
	if got := FeedbackRejection("hi", "something-new"); got == "" || got == FeedbackRejection("en", "something-new") {
		t.Errorf("unknown kind in Hindi: %q", got)
	}
	if SafetyReply("hi", "violence") != SafetyReply("hi", "explicit") || SafetyReply("hi", "") != "" {
		t.Error("explicit and violence share a reply, and no category has none")
	}
}

// SPEC-015 T005: every language listed in public-content/languages.json has its own copy of every server
// message, so none of its learners gets an English reply.
func TestEveryListedLanguageHasEveryMessage(t *testing.T) {
	langs, err := Load(filepath.Join("..", "..", "public-content"))
	if err != nil {
		t.Fatal(err)
	}
	for _, l := range langs.All() {
		if l.Code == English.Code {
			continue
		}
		for kind := range piiKindLabels[English.Code] {
			if _, ok := piiKindLabels[l.Code][kind]; !ok {
				t.Errorf("%s: no label for personal detail %q", l.Code, kind)
			}
		}
		if tpl, ok := piiTemplates[l.Code]; !ok || !strings.Contains(tpl[0], "%s") || tpl[1] == "" {
			t.Errorf("%s: feedback rejection templates missing or without %%s", l.Code)
		}
		for cat := range safetyReplies[English.Code] {
			if safetyReplies[l.Code][cat] == "" {
				t.Errorf("%s: no safety reply for %q", l.Code, cat)
			}
		}
		if uncitedFallbacks[l.Code] == "" {
			t.Errorf("%s: no uncited fallback", l.Code)
		}
	}
}
