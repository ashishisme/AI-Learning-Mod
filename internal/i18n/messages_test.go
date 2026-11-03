// SPEC: SPEC-009 FR-022, FR-024
package i18n

import "testing"

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
