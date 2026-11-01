// SPEC: FR-REV-20, FR-REV-21 (SPEC-006 child safety for the tutor)
package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"unicode"
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
// Rules run on normalizeForScreening output: lowercase words separated by single
// spaces, with apostrophes removed and other punctuation treated as a space.
var safetyRules = []struct {
	category SafetyCategory
	re       *regexp.Regexp
}{
	{SafetySelfHarm, regexp.MustCompile(`\b(?:(?:kill|hurt|harm|cutt?|stabb?|shoot|hang|poison|starve?|drown)(?:ing|s)? my ?self|suicid\w*|self ?harm\w*|unalive\w*|want(?:s|ed)? to die|wanna die|wish i (?:was|were) dead|wish i could die|end(?:ing)? my (?:own )?life|tak(?:e|ing) my (?:own )?life|end(?:ing)? it all|(?:dont|do not) (?:want to|wanna) (?:live|be alive|exist|be here anymore)|better off dead|no reason to live)\b`)},
	{SafetyExplicit, regexp.MustCompile(`\b(?:porn\w*|nudes?|naked|sex video|sexual content|xxx)\b`)},
	{SafetyViolence, regexp.MustCompile(`\b(?:(?:mak|build|creat|construct)\w* (?:(?:a|an|some|my|homemade|pipe) )*(?:bombs?|explosives?|weapons?)|how (?:to|(?:do|can|could|would|should) i) (?:kill|hurt|stab|shoot|poison)|(?:want to|wanna|going to|gonna) (?:kill|stab|shoot|hurt) (?:him|her|them|someone|somebody|people|my \w+)|(?:buy|buying|get|getting) a gun)\b`)},
	{SafetyPersonalPII, regexp.MustCompile(`\b(?:my (?:home |house |email |e mail )?address is|my (?:cell |mobile |home |phone )(?:phone )?number is|my (?:pass ?word|passcode|pin) is|i live at|i live on \w+ (?:street|st|road|rd|avenue|ave|lane|drive)|heres my (?:home |house |email |e mail )?address|heres my (?:cell |mobile |home )?(?:phone )?number|heres my password)\b`)},
}

// normalizeForScreening stops spacing, punctuation and letter case from defeating the rules.
func normalizeForScreening(question string) string {
	cleaned := strings.Map(func(r rune) rune {
		switch {
		case r == '\'' || r == '’':
			return -1
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			return unicode.ToLower(r)
		default:
			return ' '
		}
	}, question)
	return strings.Join(strings.Fields(cleaned), " ")
}

// ScreenQuestion returns the category of the first matching rule, or SafetyNone.
func ScreenQuestion(question string) SafetyCategory {
	normalized := normalizeForScreening(question)
	for _, r := range safetyRules {
		if r.re.MatchString(normalized) {
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
