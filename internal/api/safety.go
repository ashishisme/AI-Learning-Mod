// SPEC: FR-REV-20, FR-REV-21 (SPEC-006 child safety for the tutor)
package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
)

// SafetyCategory identifies why a question was not sent to the model.
type SafetyCategory string

const (
	SafetyNone        SafetyCategory = ""
	SafetySelfHarm    SafetyCategory = "self-harm"
	SafetyExplicit    SafetyCategory = "explicit"
	SafetyViolence    SafetyCategory = "violence"
	SafetyPersonalPII SafetyCategory = "personal-info"
)

// A deliberately small, conservative screen. It is a first line of defence in
// front of the model, not a replacement for the provider's own moderation.
var safetyRules = []struct {
	category SafetyCategory
	re       *regexp.Regexp
}{
	{SafetySelfHarm, regexp.MustCompile(`(?i)\b(kill myself|hurt myself|harm myself|suicide|suicidal|want to die|end my life|cut myself)\b`)},
	{SafetyExplicit, regexp.MustCompile(`(?i)\b(porn\w*|nudes?|naked|sex video|sexual content|xxx)\b`)},
	{SafetyViolence, regexp.MustCompile(`(?i)\b(make a bomb|build a bomb|how to kill|how to hurt|make a weapon|buy a gun)\b`)},
	{SafetyPersonalPII, regexp.MustCompile(`(?i)\b(my (home )?address is|my phone number is|my password is|i live at)\b`)},
}

// ScreenQuestion returns the category of the first matching rule, or SafetyNone.
func ScreenQuestion(question string) SafetyCategory {
	for _, r := range safetyRules {
		if r.re.MatchString(question) {
			return r.category
		}
	}
	return SafetyNone
}

// SafetyReply returns a short, kind message in Chip's voice for a blocked question.
// It never repeats the learner's text back (FR-REV-21: nothing from the question is echoed or stored).
func SafetyReply(c SafetyCategory) string {
	switch c {
	case SafetySelfHarm:
		return "I'm really glad you told someone. I'm just a lesson helper, so I can't help with this, but a trusted adult can. Please talk to a parent, teacher or school counselor right now. If you are in danger, call your local emergency number."
	case SafetyPersonalPII:
		return "Let's keep private things private! Please don't share your address, phone number or passwords here. Ask me about the lesson instead, and talk to a trusted adult about anything personal."
	case SafetyExplicit, SafetyViolence:
		return "That's not something I can help with. I'm here to help you learn about AI in this lesson. Try asking about the lesson, or talk to a parent or teacher about other questions."
	default:
		return ""
	}
}

// writeSafetyReply answers a blocked question in the same wire format the client expects.
func writeSafetyReply(w http.ResponseWriter, isStream bool, reply string) {
	if isStream {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.WriteHeader(http.StatusOK)
		tok, _ := json.Marshal(map[string]any{"token": reply})
		fmt.Fprintf(w, "data: %s\n\n", tok)
		done, _ := json.Marshal(map[string]any{"done": true, "cited": true})
		fmt.Fprintf(w, "data: %s\n\n", done)
		fmt.Fprintf(w, "data: [DONE]\n\n")
		if f, ok := w.(http.Flusher); ok {
			f.Flush()
		}
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(TutorResponse{Answer: reply})
}
