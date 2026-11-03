// SPEC: FR-048, SC-018
package feedback

import (
	"regexp"
	"strings"

	"ai-foundations-coach/internal/i18n"
)

// Kinds of personal detail the rule check reports. The matched text itself is never returned.
const (
	KindEmail       = "email"
	KindPhone       = "phone"
	KindAddress     = "address"
	KindIDNumber    = "id_number"
	KindDateOfBirth = "date_of_birth"
	KindLink        = "link"
)

const (
	monthName = `(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)`
	tlds      = `(?:com|in|org|net|edu|gov|io|ac|ly|app|dev|xyz|info|co\.in|co\.uk|org\.in|ac\.in)`
)

var (
	emailRe = regexp.MustCompile(`[a-z0-9._%+\-]+@[a-z0-9\-]+(?:\.[a-z0-9\-]+)*\.[a-z]{2,}`)
	// "name at gmail dot com", "name (at) gmail.com"
	spokenEmailRe = regexp.MustCompile(`[a-z0-9._\-]+\s*(?:\bat\b|\(at\)|\[at\])\s*[a-z0-9\-]+(?:\s+dot\s+|\s*\.\s*)` + tlds + `\b`)

	linkRe = regexp.MustCompile(`https?://|\bwww\.|\b[a-z0-9\-]+\.` + tlds + `\b|\b(?:t|wa)\.me/`)
	// "@asha_k", "my insta", "add me on snapchat"
	handleRe = regexp.MustCompile(`(?:^|\s)@[a-z0-9_.]{2,}|\b(?:my|add me on|follow me on|find me on|message me on|text me on)\s+(?:insta(?:gram)?|snap(?:chat)?|telegram|whatsapp|facebook|fb|tiktok|discord)\b`)

	// A number, one or two name words, then a street word: "12 MG Road", "27 Rose Garden Road".
	// At least one word between them, so "2 road signs" is fine. "2 cars on the road" has three.
	streetRe = regexp.MustCompile(`\b\d+[a-z]?(?:[\s,/\-]+[a-z.']+){1,2}[\s,]+(?:street|st|road|rd|lane|ln|avenue|ave|marg|nagar|colony|apartments?|apts|layout|enclave|vihar|highway|boulevard|blvd|drive)\b`)
	// "House no. 27", "flat 4B", "plot 12", "sector 9"
	premisesRe = regexp.MustCompile(`\b(?:house|flat|plot|door|apartment|apt|ward|sector|h\.?\s?no)\.?\s*(?:no\.?|number|#)?\s*[:\-]?\s*\d+[a-z]?\b`)
	postcodeRe = regexp.MustCompile(`\b(?:pin\s?code|pin|zip\s?code|zip|post\s?code|postal\s?code)\s*(?:code|is)?\s*[:\-]?\s*\d{5,6}\b`)
	statedAddr = regexp.MustCompile(`\b(?:i live at|i live on|we live at|we live on|my (?:home |house )?address|my house is (?:at|on|near)|my house number)\b`)

	panRe = regexp.MustCompile(`\b[a-z]{5}\d{4}[a-z]\b`)

	datePart = `(?:\d{1,2}(?:st|nd|rd|th)?[\s/\-.]+(?:\d{1,2}|` + monthName + `)(?:[\s/\-.,]+\d{2,4})?|` + monthName + `\s+\d{1,2}(?:st|nd|rd|th)?(?:[\s,]+\d{2,4})?|\d{4}[\-/.]\d{1,2}[\-/.]\d{1,2})`
	dobRe    = regexp.MustCompile(`\b(?:my birthday|my birth\s?date|my date of birth|date of birth|my dob|dob|born on|i was born)\b(?:\s*(?:is|was|:|-|on|in))*\s*(?:` + datePart + `|\d{4}\b)`)

	digitTokenRe = regexp.MustCompile(`[a-z]+|\d+|\p{Devanagari}+`)

	numberWords = map[string]int{"zero": 1, "oh": 1, "one": 1, "two": 1, "three": 1, "four": 1, "five": 1, "six": 1, "seven": 1, "eight": 1, "nine": 1,
		// Hindi and Hinglish. "do" (two) is left out: it is also an English word.
		"शून्य": 1, "एक": 1, "दो": 1, "तीन": 1, "चार": 1, "पांच": 1, "छह": 1, "छः": 1, "सात": 1, "आठ": 1, "नौ": 1,
		"shunya": 1, "ek": 1, "teen": 1, "chaar": 1, "char": 1, "paanch": 1, "panch": 1, "chhe": 1, "chhah": 1, "saat": 1, "aath": 1, "nau": 1}
	repeatWords = map[string]int{"double": 2, "triple": 3}
)

// Hindi and Hinglish rules (SPEC-009 FR-022). RE2's \b only knows ASCII word characters, so rules
// that start or end on Devanagari use hiStart and hiEnd as their boundaries (research R13).
// Text has been through normalizeForCheck, so nukta and chandrabindu spellings are already folded.
const (
	hiStart = `(?:^|[\s\p{P}])`
	hiEnd   = `(?:$|[\s\p{P}])`
	hiMonth = `(?:जनवरी|फरवरी|मार्च|अप्रैल|अप्रेल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|अक्तूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर)`
	hiDate  = `(?:\d{1,2}[\s/\-.]+(?:\d{1,2}|` + hiMonth + `|` + monthName + `)(?:[\s/\-.,]+\d{2,4})?|` + hiMonth + `\s+\d{1,2}|\d{4}[\-/.]\d{1,2}[\-/.]\d{1,2}|\d{4})`
	hiApps  = `(?:इंस्टा|इंस्टाग्राम|स्नैपचैट|स्नैप|टेलीग्राम|व्हाट्सएप|व्हाट्सऐप|फेसबुक|यूट्यूब)`
	enApps  = `(?:insta(?:gram)?|snap(?:chat)?|telegram|whatsapp|facebook|fb|youtube|yt|discord)`
)

var (
	// "आशा@gmail.com", and "आशा एट जीमेल डॉट कॉम"
	hiEmailRe = regexp.MustCompile(`[^\s@]+@[a-z0-9\-]+(?:\.[a-z0-9\-]+)*\.[a-z]{2,}|` +
		hiStart + `\S+\s+(?:एट|ऐट)\s+\S+\s+(?:डॉट|डोट)\s+(?:कॉम|इन|ऑर्ग|नेट|com|in|org|net)` + hiEnd)

	hiLinkRe = regexp.MustCompile(hiStart + `डॉट\s*(?:कॉम|इन|ऑर्ग|नेट)` + hiEnd + `|` +
		// "मेरा इंस्टा", "व्हाट्सएप पर मैसेज करो", "mera insta", "snapchat pe add karo"
		hiStart + `(?:(?:मेरा|मेरी|मेरे)\s+` + hiApps + `|` + hiApps + `\s+(?:पर|पे)\s+(?:मुझे\s+)?(?:फॉलो|ऐड|एड|मैसेज|जोड))|` +
		`\b(?:mera|meri|mere)\s+` + enApps + `\b|\b` + enApps + `\s+(?:pe|par)\s+(?:mujhe\s+)?(?:follow|add|message|msg|dm|text)\b`)

	// "मकान नं. 27", "गली नंबर 4", "सेक्टर 9", "makaan no 15". घर and गली need a number word,
	// so "गली क्रिकेट" and "घर 2 बजे" pass.
	hiPremisesRe = regexp.MustCompile(hiStart + `(?:(?:मकान|फ्लैट|प्लॉट|प्लाट|सेक्टर|वार्ड)\s*(?:नं\.?|नंबर|संख्या|क्रमांक)?|(?:घर|गली)\s*(?:नं\.?|नंबर|संख्या))\s*[:\-]?\s*\d+|` +
		`\b(?:(?:makaan|makan)\s*(?:no\.?|number|nambar)?|(?:ghar|gali|galli)\s*(?:no\.?|number|nambar))\s*[:\-]?\s*\d+`)
	hiPostcodeRe = regexp.MustCompile(hiStart + `(?:पिन\s?कोड|पिनकोड|पिन|जिप\s?कोड|जिप)\s*(?:है|:|-)?\s*\d{5,6}\b|\b(?:pin\s?code|pincode|pin|zip)\s*(?:hai|:|-)\s*\d{5,6}\b`)
	// "मेरा पता", "घर का पता", "mera address". A bare पता also means "know" ("मुझे नहीं पता"), so it needs an owner.
	hiStatedAddr = regexp.MustCompile(hiStart + `(?:(?:मेरा|हमारा)\s+पता|घर\s+का\s+पता)` + hiEnd + `|\b(?:mera|hamara)\s+(?:pata|address)\b|\bghar\s+ka\s+(?:pata|address)\b`)
	// "45 शांति नगर": a number, one or two words, then a street word, as streetRe.
	hiStreetRe = regexp.MustCompile(`\d+[a-z]?(?:[\s,/\-]+[\p{Devanagari}a-z.']+){1,2}[\s,]+(?:रोड|मार्ग|नगर|कॉलोनी|कालोनी|गली|मोहल्ला|विहार|एन्क्लेव|अपार्टमेंट|लेन|स्ट्रीट|चौक)` + hiEnd)

	// A date after "मेरा जन्मदिन", "जन्म तिथि" or "mera birthday", or "मैं 2014 में पैदा हुआ".
	// Someone else's birth ("ट्यूरिंग का जन्म 1912 में") passes, as in English.
	hiDobRe = regexp.MustCompile(hiStart + `(?:(?:मेरा|मेरी|मेरे)\s+(?:जन्मदिन|जन्म\s?दिन|जन्म\s?तिथि|जन्म|बर्थडे|बर्थ\s?डे|डेट\s+ऑफ\s+बर्थ)|जन्म\s?तिथि|डीओबी)(?:\s*(?:है|था|थी|हुआ|हुई|का|की|को|तारीख|:|-))*\s*` + hiDate + `|` +
		hiStart + `मैं\s+` + hiDate + `\s+(?:में|को)\s+पैदा|` +
		`\b(?:mera|meri|mere)\s+(?:birthday|bday|janamdin|janmdin|janam\s?din|dob|date of birth|janm\s?tithi|janam)\b(?:\s*(?:hai|tha|thi|ko|ka|ki|is|:|-))*\s*(?:` + datePart + `|\d{4}\b)|` +
		`\bmain\s+(?:` + datePart + `|\d{4})\s+(?:mein|me|main|ko)\s+paida\b`)
)

// Other scripts' digits an Indian learner may type, by the code point of their zero.
var digitZeros = []rune{0x0660, 0x06F0, 0x0966, 0x09E6, 0x0A66, 0x0AE6, 0x0B66, 0x0BE6, 0x0C66, 0x0CE6, 0x0D66, 0xFF10}

// normalizeForCheck lower-cases, removes invisible characters, turns other digits into ASCII and
// folds Devanagari spelling variants.
func normalizeForCheck(s string) string {
	return strings.ToLower(strings.Map(func(r rune) rune {
		if f := i18n.FoldDevanagari(r); f != r {
			return f
		}
		switch r {
		case 0x200B, 0x200C, 0x200D, 0x2060, 0xFEFF, 0x00AD:
			return -1
		case 0x00A0, 0x202F:
			return ' '
		case 0xFF20:
			return '@'
		case 0xFF0E:
			return '.'
		}
		for _, z := range digitZeros {
			if r >= z && r <= z+9 {
				return '0' + (r - z)
			}
		}
		return r
	}, s))
}

// digitRunKind looks for a long run of digits or spelled-out digits, with only spaces and phone
// punctuation between them. Words and other punctuation end a run, so "10 out of 10" is two short
// runs and "10:30 12:45" is not a number at all.
func digitRunKind(s string) (string, bool) {
	best := ""
	runDigits, runStart := 0, -1
	prevEnd := -1
	repeat := 1
	flush := func(end int) {
		if runDigits >= 7 {
			text := s[runStart:end]
			// A plain decimal such as 3.14159 is not a phone number.
			if !isDecimal(text) {
				kind := KindPhone
				digits := onlyDigits(text)
				plus := runStart > 0 && s[runStart-1] == '+'
				switch {
				case plus:
				case len(digits) >= 13:
					kind = KindIDNumber
				case len(digits) == 12 && !(strings.HasPrefix(digits, "91") && digits[2] >= '6' && digits[2] <= '9'):
					kind = KindIDNumber
				}
				if best == "" || kind == KindIDNumber {
					best = kind
				}
			}
		}
		runDigits, runStart = 0, -1
	}
	for _, loc := range digitTokenRe.FindAllStringIndex(s, -1) {
		tok := s[loc[0]:loc[1]]
		isDigits := tok[0] >= '0' && tok[0] <= '9'
		_, isWord := numberWords[tok]
		rep, isRepeat := repeatWords[tok]
		if prevEnd >= 0 && !strings.ContainsFunc(s[prevEnd:loc[0]], func(r rune) bool { return !strings.ContainsRune(" \t\n\r+().-", r) }) && runStart >= 0 {
			// still contiguous
		} else if runStart >= 0 {
			flush(prevEnd)
		}
		switch {
		case isRepeat:
			repeat = rep
			if runStart < 0 {
				runStart = loc[0]
			}
		case isDigits:
			if runStart < 0 {
				runStart = loc[0]
			}
			runDigits += len(tok)
			repeat = 1
		case isWord:
			if runStart < 0 {
				runStart = loc[0]
			}
			runDigits += repeat
			repeat = 1
		default:
			if runStart >= 0 {
				flush(prevEnd)
			}
			repeat = 1
		}
		prevEnd = loc[1]
	}
	if runStart >= 0 {
		flush(prevEnd)
	}
	return best, best != ""
}

var decimalRe = regexp.MustCompile(`^\d{1,3}\.\d+$`)

func isDecimal(s string) bool { return decimalRe.MatchString(s) }

func onlyDigits(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// Check reports the kind of the first personal detail found. It uses deterministic rules only and
// is not perfect: a name written in plain words passes here and is left to the AI auditor. The
// matched text is never returned or logged.
func Check(message string) (kind string, found bool) {
	s := normalizeForCheck(message)
	squeezed := strings.Join(strings.Fields(s), "") // "a . b @ g m a i l . c o m"
	switch {
	case emailRe.MatchString(s), emailRe.MatchString(squeezed), spokenEmailRe.MatchString(s), hiEmailRe.MatchString(s):
		return KindEmail, true
	case dobRe.MatchString(s), hiDobRe.MatchString(s):
		return KindDateOfBirth, true
	case linkRe.MatchString(s), handleRe.MatchString(s), hiLinkRe.MatchString(s):
		return KindLink, true
	case streetRe.MatchString(s), premisesRe.MatchString(s), postcodeRe.MatchString(s), statedAddr.MatchString(s),
		hiPremisesRe.MatchString(s), hiPostcodeRe.MatchString(s), hiStatedAddr.MatchString(s), hiStreetRe.MatchString(s):
		return KindAddress, true
	case panRe.MatchString(s):
		return KindIDNumber, true
	}
	return digitRunKind(s)
}
