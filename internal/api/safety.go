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
	{SafetySelfHarm, scriptRule(`मर(?:ना|ने) चाह|मर जा(?:ना|ऊं|ऊंगा|ऊंगी)|आत्महत्या|खुदकुशी|खुद को (?:चोट|मार|नुकसान|खत्म)|(?:अपनी|मेरी) जान (?:ले|दे)|(?:जीना|जिंदा रहना) नहीं चाह|जीने का (?:कोई )?(?:मतलब|फायदा|कारण|मकसद) नहीं|marn[ae] chah|mar jana (?:hai|chah)|mar jaun|khudkushi|a?atmahatya|khud ko (?:hurt|maar|mar|chot|khatam|nuksan)|apni jaan (?:le|de)|(?:jeena|jina|zinda rehna) nahi chah|jeene ka (?:koi )?(?:matlab|fayda|maksad) nahi`)},
	{SafetyExplicit, regexp.MustCompile(`\b(?:porn\w*|nudes?|naked|sex video|sexual content|xxx)\b`)},
	{SafetyExplicit, scriptRule(`पोर्न|अश्लील|नंग(?:ा|ी|े)(?: |$)|सेक्स (?:वीडियो|फोटो|फिल्म|कहानी)|सेक्सी|nang[aie](?: |$)|sexy (?:video|photo|pics?)|ashl[ie]e?l|gande (?:video|photo|pics?)`)},
	{SafetyViolence, regexp.MustCompile(`\b(?:(?:mak|build|creat|construct)\w* (?:(?:a|an|some|my|homemade|pipe) )*(?:bombs?|explosives?|weapons?)|how (?:to|(?:do|can|could|would|should) i) (?:kill|hurt|stab|shoot|poison)|(?:want to|wanna|going to|gonna) (?:kill|stab|shoot|hurt) (?:him|her|them|someone|somebody|people|my \w+)|(?:buy|buying|get|getting) a gun)\b`)},
	{SafetyViolence, scriptRule(`(?:बम|विस्फोटक|हथियार|बंदूक|गन) (?:कैसे |घर पर )?बना|(?:उसे|उसको|उन्हें|उनको|किसी को|सबको|तुम्हें) (?:मार (?:दूंगा|दूंगी|डालूंगा|डालूंगी|दूं)|जान से मार)|किसी को (?:कैसे )?(?:मारें|मारूं|मारे|मार डालें|जहर दूं|जहर दें)|(?:बंदूक|पिस्तौल|गन) (?:कहां से |कैसे )?(?:खरीद|लेनी|लेना|मिलेगी)|(?:bomb|hathiyar|explosive|bandoo[kq]|gun) (?:kaise |ghar par )?bana|(?:use|usko|unhe|unko|kisi ko|sabko) maa?r (?:dunga|dungi|daa?lunga|daa?lungi|du)|kisi ko (?:kaise )?(?:maa?r(?:e|u|ein)|zeher)|(?:gun|bandoo[kq]|pistol) (?:kahan se |kaise )?(?:kharid|leni|lena|milegi)`)},
	{SafetyPersonalPII, regexp.MustCompile(`\b(?:my (?:home |house |email |e mail )?address is|my (?:cell |mobile |home |phone )(?:phone )?number is|my (?:pass ?word|passcode|pin) is|i live at|i live on \w+ (?:street|st|road|rd|avenue|ave|lane|drive)|heres my (?:home |house |email |e mail )?address|heres my (?:cell |mobile |home )?(?:phone )?number|heres my password)\b`)},
	{SafetyPersonalPII, scriptRule(`(?:मेरा|हमारा) (?:घर का )?पता (?:है|यह है|ये है|\d)|(?:मेरे|हमारे) घर का पता|घर का पता (?:है|लिख|यह)|मेरा (?:फोन |मोबाइल )?नंबर (?:है|यह है|ये है|\d)|मेरा पासवर्ड (?:है|यह है|ये है|[a-z]*\d[a-z0-9]*)|mera (?:ghar ka )?(?:pata|address) (?:hai|ye hai|yeh hai|\d)|ghar ka (?:pata|address)|mera (?:phone |mobile )?(?:number|no|nambar) (?:hai|ye hai|yeh hai|\d)|mera password (?:hai|ye hai|yeh hai|[a-z]*\d[a-z0-9]*)`)},
	// Kannada and Kanglish (SPEC-015 FR-012)
	{SafetySelfHarm, scriptRule(`ಸಾಯ(?:ಬೇಕು|ಬೇಕೆನಿಸ|ಲು (?:ಇಷ್ಟ|ಬಯಸ|ಬಯಕೆ))|ಆತ್ಮಹತ್ಯೆ|ನನ್ನನ್ನು ನಾನೇ (?:ನೋಯಿಸ|ಕೊಲ್ಲ|ಗಾಯ)|ಬದುಕ(?:ಲು|ುವುದಕ್ಕೆ|ೋಕೆ) ಇಷ್ಟ ?ವಿಲ್ಲ|ಬದುಕ(?:ುವುದರಲ್ಲಿ|ಿನಲ್ಲಿ) (?:ಅರ್ಥ|ಕಾರಣ) ?ವಿಲ್ಲ|ನನ್ನ ಜೀವ (?:ತೆಗೆ|ಕೊನೆ)|saay?abeku|saayoke ishta|a?a?tmahatye|athmahathye|baduk(?:oke|alu|odu) ishta ?illa|nannannu naane (?:noyisi|kolli)`)},
	{SafetyExplicit, scriptRule(`ಅಶ್ಲೀಲ|ಬೆತ್ತಲೆ|ನಗ್ನ|ಸೆಕ್ಸ್ (?:ವಿಡಿಯೋ|ವೀಡಿಯೋ|ಫೋಟೋ|ಚಿತ್ರ)|ashleela|bettale (?:photo|video)`)},
	{SafetyViolence, scriptRule(`ಬಾಂಬ್ (?:ಹೇಗೆ |ಮನೆಯಲ್ಲಿ )?(?:ತಯಾರಿಸ|ಮಾಡುವುದು|ಮಾಡೋದು)|(?:ಅವನನ್ನು|ಅವಳನ್ನು|ಅವರನ್ನು|ಯಾರನ್ನಾದರೂ|ಎಲ್ಲರನ್ನೂ|ನಿನ್ನನ್ನು) (?:ಹೇಗೆ )?ಕೊಲ್ಲ|ಬಂದೂಕು (?:ಎಲ್ಲಿ |ಹೇಗೆ )?(?:ಖರೀದಿಸ|ಕೊಳ್ಳ)|bomb (?:hege |mane alli )?(?:maadodu|madodu|tayarisodu)|(?:avanannu|avalannu|avarannu|yaarannadru) (?:hege )?kol`)},
	{SafetyPersonalPII, scriptRule(`(?:ನನ್ನ|ನಮ್ಮ) (?:ಮನೆಯ |ಮನೆ )?ವಿಳಾಸ|ನನ್ನ (?:ಫೋನ್|ಮೊಬೈಲ್) (?:ನಂಬರ್|ಸಂಖ್ಯೆ)|ನನ್ನ (?:ನಂಬರ್|ಸಂಖ್ಯೆ) \d|ನನ್ನ ಪಾಸ್ವರ್ಡ್|nanna (?:mane |maneya )?(?:address|vilasa)|nanna (?:phone|mobile) (?:number|no|nambar)|nanna (?:number|nambar) \d|nanna password`)},
	// Tamil and Tanglish (SPEC-015 FR-012)
	{SafetySelfHarm, scriptRule(`சாக (?:வேண்டும்|வேணும்|விரும்ப|ஆசை)|சாகணும்|தற்கொலை|என்னை நானே (?:காயப்படுத்த|கொல்ல)|வாழ (?:விருப்பமில்லை|பிடிக்கவில்லை|பிடிக்கல|ஆசையில்லை)|உயிரை (?:மாய்த்துக்கொள்|விட வேண்டும்)|saaga ?(?:venum|vendum|aasai)|saaganum|th?arkolai|vaazha (?:pidikkala|pidikkavillai|virupamillai)|ennai naane (?:kaayapaduth|kolla)`)},
	{SafetyExplicit, scriptRule(`ஆபாச|நிர்வாண|செக்ஸ் (?:வீடியோ|படம்|போட்டோ)|aabaasa|abasa|nirvaana (?:padam|photo)`)},
	{SafetyViolence, scriptRule(`வெடிகுண்டு (?:எப்படி |வீட்டில் )?(?:செய்|தயாரி)|(?:அவனை|அவளை|அவர்களை|ஒருவரை|யாரையாவது|எல்லோரையும்|உன்னை)(?:க்|ப்)? (?:எப்படிக் |எப்படி )?கொல்|துப்பாக்கி (?:எங்கே |எப்படி )?வாங்க|bomb (?:eppadi |veetla )?(?:seivathu|seiyarathu|thayarippathu)|(?:avana|avala|avangala|oruvarai|yaarayavathu) (?:eppadi )?kol`)},
	{SafetyPersonalPII, scriptRule(`(?:என்|என்னுடைய|எங்கள்|எங்க) (?:வீட்டு )?முகவரி|(?:என்|என்னுடைய) (?:போன்|தொலைபேசி|மொபைல்) (?:நம்பர்|எண்)|(?:என்|என்னுடைய) (?:நம்பர்|எண்) \d|(?:என்|என்னுடைய) (?:கடவுச்சொல்|பாஸ்வேர்ட்)|en (?:veettu )?(?:address|mugavari)|en (?:phone|mobile) (?:number|no|nambar)|en (?:number|nambar) \d|en password`)},
	// Marathi and romanised Marathi (SPEC-018, FR-I18N-05 amended 2.23.0). Devanagari like Hindi, so these must not
	// catch clean Hindi questions (testdata/mr_safety.json carries Hindi clean lines, hi_safety.json the reverse).
	{SafetySelfHarm, scriptRule(`मरायच|मरावंसं|मरावसं|आत्महत्या|स्वतःला (?:इजा|मारून|संपव|दुखाप)|जगायच(?:ं|े) नाही|जगण्यात (?:काही )?अर्थ नाही|mala (?:marayach|maraych|maravas)|aatmahatya|atmahatya|swatahla (?:sampav|maar)`)},
	{SafetyExplicit, scriptRule(`अश्लील|नग्न|सेक्स (?:व्हिडिओ|व्हिडीओ|फोटो|चित्र)|ashlil|nagna`)},
	{SafetyViolence, scriptRule(`(?:बॉम्ब|बाँब|स्फोटक|शस्त्र|बंदूक) (?:कसा |कसं |कशी |घरी )?(?:बनवा|तयार कर)|(?:त्याला|तिला|त्यांना|एखाद्याला|कोणाला) (?:कसं |कसा |कशी )?मारायच|मारायचं कसं|bomb (?:kasa )?banv|(?:tyala|tila|konala) (?:kasa )?maraych`)},
	{SafetyPersonalPII, scriptRule(`(?:माझा|आमचा|माझ्या|आमच्या) (?:घरचा )?पत्ता|(?:माझा|माझे) (?:फोन|मोबाईल) (?:नंबर|क्रमांक)|(?:माझा|माझे) पासवर्ड|(?:maza|majha|amcha) (?:gharcha )?(?:patta|address)|(?:maza|majha) password`)},
}

// scriptRule compiles a rule for an Indian script and its romanised form (Hindi, Kannada, Tamil). RE2's \b is
// ASCII-only, so the rule starts at the start of the text or after a space instead (SPEC-009 FR-023, research R13;
// FR-I18N-05 amended 2.18.0). Normalised text has single spaces. Kannada and Tamil words take their endings
// directly, so a rule matches the start of a word and does not need a closing boundary.
func scriptRule(body string) *regexp.Regexp { return regexp.MustCompile(`(?:^| )(?:` + body + `)`) }

// normalizeForScreening stops spacing, punctuation and letter case from defeating the rules. It keeps
// vowel signs (marks, not letters), folds nukta and chandrabindu spellings, drops zero-width joiners, and turns
// every Indian script's digits into ASCII (i18n.FoldScripts, FR-I18N-05 amended 2.18.0).
func normalizeForScreening(question string) string {
	cleaned := strings.Map(func(r rune) rune {
		if f := i18n.FoldScripts(r); f != r {
			return f
		}
		switch {
		case r == '\'' || r == '’':
			return -1
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
