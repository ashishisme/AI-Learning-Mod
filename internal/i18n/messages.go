// SPEC: SPEC-009 FR-022, FR-024; FR-048 and FR-REV-21 (no message ever repeats the learner's text)

package i18n

import "strings"

// Server-written replies by language. Each is fixed text: none quotes what the learner typed.
// A language missing here falls back to English, so a new language can ship before its replies.

var piiKindLabels = map[string]map[string]string{
	"en": {"email": "email", "phone": "phone", "address": "address", "id_number": "id number", "date_of_birth": "date of birth", "link": "link"},
	"hi": {"email": "ईमेल", "phone": "फ़ोन नंबर", "address": "पता", "id_number": "पहचान संख्या", "date_of_birth": "जन्मतिथि", "link": "लिंक या सोशल मीडिया"},
}

var piiTemplates = map[string][2]string{
	// [0] names the kind, [1] is used when the kind is unknown.
	"en": {"Please remove personal details (%s) and send again.", "Please remove personal details (like phone numbers, emails or addresses) and send again."},
	"hi": {"कृपया निजी जानकारी (%s) हटाकर फिर से भेजें।", "कृपया निजी जानकारी (जैसे फ़ोन नंबर, ईमेल या पता) हटाकर फिर से भेजें।"},
}

// FeedbackRejection is the reply when feedback holds a personal detail of the given kind.
func FeedbackRejection(lang, kind string) string {
	tpl, ok := piiTemplates[lang]
	if !ok {
		lang, tpl = English.Code, piiTemplates[English.Code]
	}
	if label, ok := piiKindLabels[lang][kind]; ok {
		return strings.Replace(tpl[0], "%s", label, 1)
	}
	return tpl[1]
}

// Safety reply keys match the tutor's SafetyCategory values.
var safetyReplies = map[string]map[string]string{
	"en": {
		"self-harm":     "I'm really glad you told someone. I'm just a lesson helper, so I can't help with this, but a trusted adult can. Please talk to a parent, teacher or school counselor right now. If you are in danger, call your local emergency number.",
		"personal-info": "Let's keep private things private! Please don't share your address, phone number or passwords here. Ask me about the lesson instead, and talk to a trusted adult about anything personal.",
		"other":         "That's not something I can help with. I'm here to help you learn about AI in this lesson. Try asking about the lesson, or talk to a parent or teacher about other questions.",
	},
	"hi": {
		"self-harm":     "मुझे सच में खुशी है कि तुमने किसी को बताया। मैं सिर्फ़ पाठ में मदद करने वाला हूँ, इसलिए इसमें मदद नहीं कर सकता, पर कोई भरोसेमंद बड़ा कर सकता है। कृपया अभी अपने माता-पिता, शिक्षक या स्कूल काउंसलर से बात करो। अगर तुम ख़तरे में हो, तो 112 पर कॉल करो।",
		"personal-info": "निजी बातें निजी ही रखें! कृपया यहाँ अपना पता, फ़ोन नंबर या पासवर्ड न लिखें। इसके बजाय पाठ के बारे में पूछें, और निजी बातों के लिए किसी भरोसेमंद बड़े से बात करें।",
		"other":         "इसमें मैं मदद नहीं कर सकता। मैं इस पाठ में AI सीखने में तुम्हारी मदद के लिए हूँ। पाठ के बारे में पूछो, या दूसरे सवालों के लिए माता-पिता या शिक्षक से बात करो।",
	},
}

// SafetyReply is Chip's reply to a question the safety screen blocked. Explicit and violence share
// one reply. An empty category has no reply.
func SafetyReply(lang, category string) string {
	if category == "" {
		return ""
	}
	replies, ok := safetyReplies[lang]
	if !ok {
		replies = safetyReplies[English.Code]
	}
	if r, ok := replies[category]; ok {
		return r
	}
	return replies["other"]
}
