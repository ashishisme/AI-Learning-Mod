// SPEC: FR-REV-20, FR-REV-21 (SPEC-006 child safety for the tutor)
package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"unicode"

	"ai-foundations-coach/internal/i18n"
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
	{SafetySelfHarm, hiRule(`मर(?:ना|ने) चाह|मर जा(?:ना|ऊं|ऊंगा|ऊंगी)|आत्महत्या|खुदकुशी|खुद को (?:चोट|मार|नुकसान|खत्म)|(?:अपनी|मेरी) जान (?:ले|दे)|(?:जीना|जिंदा रहना) नहीं चाह|जीने का (?:कोई )?(?:मतलब|फायदा|कारण|मकसद) नहीं|marn[ae] chah|mar jana (?:hai|chah)|mar jaun|khudkushi|a?atmahatya|khud ko (?:hurt|maar|mar|chot|khatam|nuksan)|apni jaan (?:le|de)|(?:jeena|jina|zinda rehna) nahi chah|jeene ka (?:koi )?(?:matlab|fayda|maksad) nahi`)},
	{SafetyExplicit, regexp.MustCompile(`\b(?:porn\w*|nudes?|naked|sex video|sexual content|xxx)\b`)},
	{SafetyExplicit, hiRule(`पोर्न|अश्लील|नंग(?:ा|ी|े)(?: |$)|सेक्स (?:वीडियो|फोटो|फिल्म|कहानी)|सेक्सी|nang[aie](?: |$)|sexy (?:video|photo|pics?)|ashl[ie]e?l|gande (?:video|photo|pics?)`)},
	{SafetyViolence, regexp.MustCompile(`\b(?:(?:mak|build|creat|construct)\w* (?:(?:a|an|some|my|homemade|pipe) )*(?:bombs?|explosives?|weapons?)|how (?:to|(?:do|can|could|would|should) i) (?:kill|hurt|stab|shoot|poison)|(?:want to|wanna|going to|gonna) (?:kill|stab|shoot|hurt) (?:him|her|them|someone|somebody|people|my \w+)|(?:buy|buying|get|getting) a gun)\b`)},
	{SafetyViolence, hiRule(`(?:बम|विस्फोटक|हथियार|बंदूक|गन) (?:कैसे |घर पर )?बना|(?:उसे|उसको|उन्हें|उनको|किसी को|सबको|तुम्हें) (?:मार (?:दूंगा|दूंगी|डालूंगा|डालूंगी|दूं)|जान से मार)|किसी को (?:कैसे )?(?:मारें|मारूं|मारे|मार डालें|जहर दूं|जहर दें)|(?:बंदूक|पिस्तौल|गन) (?:कहां से |कैसे )?(?:खरीद|लेनी|लेना|मिलेगी)|(?:bomb|hathiyar|explosive|bandoo[kq]|gun) (?:kaise |ghar par )?bana|(?:use|usko|unhe|unko|kisi ko|sabko) maa?r (?:dunga|dungi|daa?lunga|daa?lungi|du)|kisi ko (?:kaise )?(?:maa?r(?:e|u|ein)|zeher)|(?:gun|bandoo[kq]|pistol) (?:kahan se |kaise )?(?:kharid|leni|lena|milegi)`)},
	{SafetyPersonalPII, regexp.MustCompile(`\b(?:my (?:home |house |email |e mail )?address is|my (?:cell |mobile |home |phone )(?:phone )?number is|my (?:pass ?word|passcode|pin) is|i live at|i live on \w+ (?:street|st|road|rd|avenue|ave|lane|drive)|heres my (?:home |house |email |e mail )?address|heres my (?:cell |mobile |home )?(?:phone )?number|heres my password)\b`)},
	{SafetyPersonalPII, hiRule(`(?:मेरा|हमारा) (?:घर का )?पता (?:है|यह है|ये है|\d)|(?:मेरे|हमारे) घर का पता|घर का पता (?:है|लिख|यह)|मेरा (?:फोन |मोबाइल )?नंबर (?:है|यह है|ये है|\d)|मेरा पासवर्ड (?:है|यह है|ये है|[a-z]*\d[a-z0-9]*)|mera (?:ghar ka )?(?:pata|address) (?:hai|ye hai|yeh hai|\d)|ghar ka (?:pata|address)|mera (?:phone |mobile )?(?:number|no|nambar) (?:hai|ye hai|yeh hai|\d)|mera password (?:hai|ye hai|yeh hai|[a-z]*\d[a-z0-9]*)`)},
}

// hiRule compiles a Hindi or Hinglish rule. RE2's \b is ASCII-only, so the rule starts at the start of
// the text or after a space instead (SPEC-009 FR-023, research R13). Normalised text has single spaces.
func hiRule(body string) *regexp.Regexp { return regexp.MustCompile(`(?:^| )(?:` + body + `)`) }

// normalizeForScreening stops spacing, punctuation and letter case from defeating the rules. It keeps
// Devanagari vowel signs (marks, not letters), folds nukta and chandrabindu spellings, and turns
// Devanagari digits into ASCII.
func normalizeForScreening(question string) string {
	cleaned := strings.Map(func(r rune) rune {
		if f := i18n.FoldDevanagari(r); f != r {
			return f
		}
		switch {
		case r == '\'' || r == '’':
			return -1
		case r >= 0x0966 && r <= 0x096F:
			return '0' + (r - 0x0966)
		case unicode.IsLetter(r) || unicode.IsDigit(r) || unicode.IsMark(r):
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
	return i18n.SafetyReply(i18n.English.Code, string(c))
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
