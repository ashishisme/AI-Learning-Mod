# Marathi: terms to align (SPEC-018), collected from the drafters' reports, 2026-11-22

Pick one form per term, add it to `content/glossary/mr.json`, then replace the other forms in every Marathi file.

## Lesson 2 (symbolic)
- information → माहिती; knowledge → ज्ञान; logic → तर्कशास्त्र; frames → फ्रेम; slot → रकाना
- explanation facility → स्पष्टीकरण सुविधा; knowledge acquisition bottleneck → ज्ञान मिळवण्यातली अडचण
- hierarchy → श्रेणीरचना; subject / predicate / object → कर्ता / विधेय / कर्म; hypothesis → गृहीतक; pass → फेरी
- safe mode → सुरक्षित मोड; hibernate → सुप्तावस्थेत जाणे; emergency halt → आपत्कालीन थांबा; link / node → दुवा / बिंदू

## Lesson 4 (vision)
- segmentation → सेगमेंटेशन; pose estimation → पोझ ओळख (weak; or शरीराची ठेवण ओळखणे); adversarial example → ॲडव्हर्सरियल उदाहरण
- max pooling → मॅक्स पूलिंग; array → ॲरे; greyscale image → करड्या छटांची प्रतिमा; column / row → स्तंभ / ओळ
- positive / negative weights → धन / ऋण वजनं; random → यादृच्छिक; computer eyes → संगणकाचे डोळे

## Lesson 7 (ethics)
- unfair / historical / representation / measurement bias → अन्यायकारक / ऐतिहासिक / प्रतिनिधित्वातील / मापनातील पक्षपात
- equal opportunity → समान संधी; documentation → दस्तऐवजीकरण; feature importance → वैशिष्ट्यांचं महत्त्व; red-teaming → रेड-टीमिंग
- shortlist → शॉर्टलिस्ट / प्राथमिक यादी (pick one); selection rate → निवड दर; yes rate (Kids) → ‘हो’चा दर
- calibration: अंशांकन in Detailed, जुळवणी in a clip caption (pick one)

## Open points for the owner
- `mascot.name`: चिप (as in Kannada and Tamil) or Latin "Chip" (as in Hindi)?
- Clips over 30 s (the checker only warns, but keep them under 30 s to match other languages): 2-symbolic rover-diagnosis 31.8 s, 2-symbolic plain-decision-tree 30.2 s, 7-ethics hiring-audit 30.6 s.
- 2-symbolic Kids last clip step says Chip "proves" it's a duck (from the English): consider softer wording in English and all languages.
- The Hindi 2-symbolic plain clip step 1 adds "पचास हज़ार", which is not in the English. This is a Hindi deviation; check it.

## Lesson 1 (intro)
- computer → संगणक (Hindi used a transliteration); imitation game → नकलेचा खेळ; benchmark → बेंचमार्क; judge → परीक्षक
- cut-off → मर्यादा; suspicious phrase → संशयास्पद वाक्यांश; top-down / bottom-up → वरून खाली / खालून वर; clue → सुगावा
- Chinese room → “चिनी खोली” युक्तिवाद; draughts → चेकर्स (confirm); AI winter(s) → एआय हिवाळा (singular in body; English is plural)

## Lesson 5 (NLP)
- word map → शब्दांचा नकाशा; NER → नामित घटक ओळख; speech recognition / synthesis → भाषण ओळख / भाषण निर्मिती
- question answering → प्रश्नांची उत्तरे देणे; summarisation → सारांश काढणे; text classification → मजकुराचे वर्गीकरण
- subword tokenisation → उपशब्द टोकनीकरण; distributional hypothesis → वितरणात्मक गृहीतक; n-gram / bigram → एन-ग्राम / बायग्राम
- RNN → रिकरंट न्यूरल नेटवर्क; pre-trained → पूर्व-प्रशिक्षित; smoothing → मोजण्या गुळगुळीत करणे (smoothing); chat app → चॅट ॲप (neuter)
- attention → लक्ष (glossary; Hindi used अटेंशन); hallucination → भ्रम (glossary; Hindi used हैलुसिनेशन)
- **Examples adapted for Marathi** (case endings): tokenisation words, “मांजर जाऊन बसली…”, “वाढदिवसाच्या हार्दिक…”, पान (leaf/page) for bank, “आधी अभ्यास, मग खेळ” for dog-bites-man, bigram sentences (probabilities unchanged). The owner should check these read naturally.

## Interface strings (web/src/i18n/mr.json, 646 keys)
- Journeys: मुले / सोपी भाषा / सविस्तर (no English in brackets, kept short for 390 px).
- Possibly long at 390 px: widget.vector.word.Kitten/Puppy, settings.reset, quiz.markComplete.
- Unsure: adaptive.jargonBuster “अवघड शब्द, सोपा अर्थ”, kids.continue.stop “टप्पा {n}”, widget.vector.eq.royalty.name,
  tutor.subtitleJunior (“फालतू” is casual), settings.budget, settings.model, widget.conv.activeLens, help.grounded.
- Chip treated as masculine (“चिप म्हणतो”).
