// SPEC: SPEC-009 FR-022, FR-024; SPEC-015 T005 (Kannada, Tamil); FR-048 and FR-REV-21 (no message ever repeats the learner's text)

package i18n

import "strings"

// Server-written replies by language. Each is fixed text: none quotes what the learner typed.
// A language missing here falls back to English, so a new language can ship before its replies.

var piiKindLabels = map[string]map[string]string{
	"en": {"email": "email", "phone": "phone", "address": "address", "id_number": "id number", "date_of_birth": "date of birth", "link": "link"},
	"hi": {"email": "ईमेल", "phone": "फ़ोन नंबर", "address": "पता", "id_number": "पहचान संख्या", "date_of_birth": "जन्मतिथि", "link": "लिंक या सोशल मीडिया"},
	"kn": {"email": "ಇಮೇಲ್", "phone": "ಫೋನ್ ಸಂಖ್ಯೆ", "address": "ವಿಳಾಸ", "id_number": "ಗುರುತಿನ ಸಂಖ್ಯೆ", "date_of_birth": "ಹುಟ್ಟಿದ ದಿನಾಂಕ", "link": "ಲಿಂಕ್ ಅಥವಾ ಸಾಮಾಜಿಕ ಮಾಧ್ಯಮ"},
	"ta": {"email": "மின்னஞ்சல்", "phone": "தொலைபேசி எண்", "address": "முகவரி", "id_number": "அடையாள எண்", "date_of_birth": "பிறந்த தேதி", "link": "இணைப்பு அல்லது சமூக ஊடகம்"},
}

var piiTemplates = map[string][2]string{
	// [0] names the kind, [1] is used when the kind is unknown.
	"en": {"Please remove personal details (%s) and send again.", "Please remove personal details (like phone numbers, emails or addresses) and send again."},
	"hi": {"कृपया निजी जानकारी (%s) हटाकर फिर से भेजें।", "कृपया निजी जानकारी (जैसे फ़ोन नंबर, ईमेल या पता) हटाकर फिर से भेजें।"},
	"kn": {"ದಯವಿಟ್ಟು ವೈಯಕ್ತಿಕ ವಿವರಗಳನ್ನು (%s) ತೆಗೆದು ಮತ್ತೆ ಕಳುಹಿಸಿ.", "ದಯವಿಟ್ಟು ವೈಯಕ್ತಿಕ ವಿವರಗಳನ್ನು (ಫೋನ್ ಸಂಖ್ಯೆ, ಇಮೇಲ್ ಅಥವಾ ವಿಳಾಸದಂತಹವು) ತೆಗೆದು ಮತ್ತೆ ಕಳುಹಿಸಿ."},
	"ta": {"தயவுசெய்து தனிப்பட்ட விவரங்களை (%s) நீக்கிவிட்டு மீண்டும் அனுப்புங்கள்.", "தயவுசெய்து தனிப்பட்ட விவரங்களை (தொலைபேசி எண், மின்னஞ்சல் அல்லது முகவரி போன்றவை) நீக்கிவிட்டு மீண்டும் அனுப்புங்கள்."},
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
	"kn": {
		"self-harm":     "ನೀನು ಯಾರಿಗಾದರೂ ಹೇಳಿದ್ದು ನನಗೆ ನಿಜವಾಗಿಯೂ ಸಂತೋಷ ತಂದಿದೆ. ನಾನು ಪಾಠಕ್ಕೆ ಸಹಾಯ ಮಾಡುವವನು ಮಾತ್ರ, ಆದ್ದರಿಂದ ಇದರಲ್ಲಿ ಸಹಾಯ ಮಾಡಲಾರೆ, ಆದರೆ ನಂಬಿಕೆಯ ದೊಡ್ಡವರು ಮಾಡಬಲ್ಲರು. ದಯವಿಟ್ಟು ಈಗಲೇ ನಿನ್ನ ತಂದೆ-ತಾಯಿ, ಶಿಕ್ಷಕರು ಅಥವಾ ಶಾಲೆಯ ಸಲಹೆಗಾರರೊಂದಿಗೆ ಮಾತನಾಡು. ನೀನು ಅಪಾಯದಲ್ಲಿದ್ದರೆ, 112 ಗೆ ಕರೆ ಮಾಡು.",
		"personal-info": "ಖಾಸಗಿ ವಿಷಯಗಳನ್ನು ಖಾಸಗಿಯಾಗಿಯೇ ಇಡೋಣ! ದಯವಿಟ್ಟು ಇಲ್ಲಿ ನಿನ್ನ ವಿಳಾಸ, ಫೋನ್ ಸಂಖ್ಯೆ ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್ ಬರೆಯಬೇಡ. ಬದಲಿಗೆ ಪಾಠದ ಬಗ್ಗೆ ಕೇಳು, ಮತ್ತು ವೈಯಕ್ತಿಕ ವಿಷಯಗಳ ಬಗ್ಗೆ ನಂಬಿಕೆಯ ದೊಡ್ಡವರೊಂದಿಗೆ ಮಾತನಾಡು.",
		"other":         "ಇದರಲ್ಲಿ ನಾನು ಸಹಾಯ ಮಾಡಲಾರೆ. ಈ ಪಾಠದಲ್ಲಿ AI ಕಲಿಯಲು ನಿನಗೆ ಸಹಾಯ ಮಾಡಲು ನಾನು ಇಲ್ಲಿದ್ದೇನೆ. ಪಾಠದ ಬಗ್ಗೆ ಕೇಳು, ಅಥವಾ ಬೇರೆ ಪ್ರಶ್ನೆಗಳಿಗೆ ತಂದೆ-ತಾಯಿ ಅಥವಾ ಶಿಕ್ಷಕರೊಂದಿಗೆ ಮಾತನಾಡು.",
	},
	"ta": {
		"self-harm":     "நீ யாரிடமாவது சொன்னதில் எனக்கு உண்மையிலேயே மகிழ்ச்சி. நான் பாடத்துக்கு உதவுபவன் மட்டுமே, அதனால் இதில் உதவ முடியாது, ஆனால் நம்பிக்கையான பெரியவர் உதவ முடியும். தயவுசெய்து இப்போதே உன் பெற்றோர், ஆசிரியர் அல்லது பள்ளி ஆலோசகரிடம் பேசு. நீ ஆபத்தில் இருந்தால், 112 ஐ அழை.",
		"personal-info": "தனிப்பட்ட விஷயங்களைத் தனிப்பட்டதாகவே வைப்போம்! தயவுசெய்து இங்கே உன் முகவரி, தொலைபேசி எண் அல்லது கடவுச்சொல்லை எழுதாதே. அதற்குப் பதிலாக பாடத்தைப் பற்றிக் கேள், தனிப்பட்ட விஷயங்களுக்கு நம்பிக்கையான பெரியவரிடம் பேசு.",
		"other":         "இதில் என்னால் உதவ முடியாது. இந்தப் பாடத்தில் AI கற்க உனக்கு உதவவே நான் இங்கே இருக்கிறேன். பாடத்தைப் பற்றிக் கேள், அல்லது மற்ற கேள்விகளுக்குப் பெற்றோர் அல்லது ஆசிரியரிடம் பேசு.",
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

// Tutor replies (FR-TUT-06 as amended by SPEC-009; Constitution II, 2.4.0). English is the exact text
// the constitution fixes; another language's text ships only once that language is approved.
var uncitedFallbacks = map[string]string{
	"en": "I couldn't find that in this lesson. Try rephrasing or ask about a different section.",
	"hi": "मुझे यह इस पाठ में नहीं मिला। सवाल को दूसरे शब्दों में पूछकर देखो, या किसी और हिस्से के बारे में पूछो।",
	"kn": "ಇದು ಈ ಪಾಠದಲ್ಲಿ ನನಗೆ ಸಿಗಲಿಲ್ಲ. ಪ್ರಶ್ನೆಯನ್ನು ಬೇರೆ ಪದಗಳಲ್ಲಿ ಕೇಳಿ ನೋಡು, ಅಥವಾ ಬೇರೆ ಭಾಗದ ಬಗ್ಗೆ ಕೇಳು.",
	"ta": "இந்தப் பாடத்தில் இதை என்னால் கண்டுபிடிக்க முடியவில்லை. கேள்வியை வேறு வார்த்தைகளில் கேட்டுப் பார், அல்லது வேறு பகுதியைப் பற்றிக் கேள்.",
}

// UncitedFallback replaces a tutor answer that cites no lesson section.
func UncitedFallback(lang string) string {
	if s, ok := uncitedFallbacks[lang]; ok {
		return s
	}
	return uncitedFallbacks[English.Code]
}

// AnswerInstruction tells the model which language to answer in; English needs none.
func AnswerInstruction(l Language) string {
	if l.Code == English.Code || l.Code == "" {
		return ""
	}
	return "LANGUAGE: Answer in " + l.Name + " (" + l.Code + "), in simple everyday words a school student understands. " +
		"Write a technical term in " + l.Name + " followed by the English term in brackets the first time you use it. " +
		"Keep the citation format exactly as instructed, using the lesson title and heading as they appear in the lesson."
}
