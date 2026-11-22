# Tamil terms to align (SPEC-015, step 4 of the Handoff)

Terms each drafter chose that are not in `content/glossary/ta.json`. In the alignment pass, pick one term per concept across the interface, the lessons and the quizzes (the interface term wins), apply it everywhere, and add the new terms to the glossary.

## Quizzes (`web/src/data/quizzes/ta.json`, drafted 2026-11-19, check clean)
- top-down / bottom-up: மேலிருந்து கீழ் / கீழிருந்து மேல்
- AI winter: ஏஐ குளிர்காலம்
- tokenisation: டோக்கனாக்கம்
- user interface: பயனர் இடைமுகம்; screen: திரை
- source code: சோர்ஸ் கோடு; program: நிரல்; programmer: நிரலாளர்
- sub-goal: துணை இலக்கு
- class (in an ontology): வகை (not வகுப்பு, which reads as a school class)
- convolutional neural network: கன்வல்யூஷனல் நியூரல் நெட்வொர்க்; CNN: சிஎன்என்
- channels: சேனல்கள்; colour patches: வண்ணத் திட்டுகள்
- chat assistant: சாட் உதவியாளர் (alternative அரட்டை உதவியாளர்)
- algorithmic bias: அல்காரிதப் பாரபட்சம்
- true positive rate: உண்மை நேர்மறை விகிதம்
- adverse impact: பாதகமான தாக்கம்
- product (multiplication): பெருக்கற்பலன்
- database: தரவுத்தளம்
- ID number: அடையாள எண் (ID)

Notes from the quiz drafter: the English quizzes have no Kids questions, so all use நீங்கள். Rationales keep the English `[Lesson § …]` reference, as in `kn.json`.

## Lessons
(Add each lesson drafter's list here as it reports.)

### 4-computervision (3 files, drafted 2026-11-19, checks clean)
- convolutional neural network கன்வல்யூஷனல் நியூரல் நெட்வொர்க் (CNN); kernel கெர்னல்; channel சேனல்; stride ஸ்ட்ரைடு; padding பேடிங்; pooling / max pooling பூலிங் / மேக்ஸ் பூலிங்
- image classification படத்தை வகைப்படுத்துதல்; object detection பொருள் கண்டறிதல்; segmentation பிரிவாக்கம்; OCR ஒளியியல் எழுத்து அறிதல்; pose estimation உடல் நிலை மதிப்பீடு; adversarial example எதிர்நிலை உதாரணம்
- array அணி; probability நிகழ்தகவு; classification layer வகைப்படுத்தும் அடுக்கு; confidence score நம்பிக்கை மதிப்பெண்; blind spot குருட்டுப் புள்ளி; detector கண்டறிவான்
- magnifying glass உருப்பெருக்கிக் கண்ணாடி (matches UI); sliding window ஜன்னல் (formal சாளரம்); blur / sharpen filter மங்கல் / கூர்மையாக்கும் ஃபில்டர்; vertical / horizontal edge செங்குத்து / கிடைமட்ட விளிம்பு (as UI); column நெடுவரிசை; row வரிசை; vision AI பார்வை ஏஐ
- Notes: millions kept as மில்லியன் (numbers unchanged); "human in the loop" paraphrased in plain-english §4 (glossary has முடிவில் மனிதர்); face unlock translated (முகம் பார்த்துத் திறத்தல்) where kn/hi transliterated.

### 3-neuralnetworks (3 files, drafted 2026-11-19, checks clean)
- artificial neuron செயற்கை நியூரான்; activation செயல்படுத்தல் (Plain; kn/hi transliterated); supervised learning மேற்பார்வைக் கற்றல்; loss இழப்பு; classification வகைப்படுத்தல்; regression ரிக்ரெஷன்; overfitting ஓவர்ஃபிட்டிங்; test data சோதனைத் தரவு; score (z) மதிப்பெண்
- step function படிச் சார்பு; sigmoid சிக்மாய்டு (ReLU, XOR in Latin); perceptron learning rule பெர்செப்ட்ரான் கற்றல் விதி; epoch எபோக்; linearly separable நேர்கோட்டால் பிரிக்கக்கூடியவை; hidden layer மறை அடுக்கு; gradient descent கிரேடியன்ட் டிசென்ட்; error பிழை; random சீரற்ற; non-linear நேரியல் அல்லாத
- Kids: clue துப்பு; spark தீப்பொறி; switch on ஆன் ஆகு; picky கறாரான (UI widget uses கண்டிப்பு, align); firing ஃபயரிங் (teen layer, quoting the word; glossary fire = தூண்டப்படு); mystery fruit மர்மப் பழம்
- Notes: weight "sign" glossed (நேர்மறை அல்லது எதிர்மறை) in Detailed; the detailed `fruit-sorter-by-hand` clip steps read formulas like "w₁ = 1.2" aloud: listen after recording.

### 2-symbolic (3 files, drafted 2026-11-19, checks clean)
- if-then rules ‘இப்படி என்றால்’ விதிகள் (as UI); rule-based AI விதி அடிப்படையிலான ஏஐ; knowledge representation அறிவுப் பிரதிநிதித்துவம்; production rule உற்பத்தி விதி (as UI); logic தர்க்கவியல்; semantic network சொற்பொருள் வலையமைப்பு; frames ஃபிரேம்கள்; explanation facility விளக்க வசதி; knowledge acquisition bottleneck அறிவுச் சேகரிப்புத் தடை
- triple மும்மை (alt டிரிபிள்); subject/predicate/object எழுவாய்/பயனிலை/செயப்படுபொருள்; rule fires இயங்கு (as UI; glossary தூண்டப்படு is for neurons); sub-goal துணை இலக்கு (as quizzes); hypothesis கருதுகோள்; data-/goal-driven தரவு சார்ந்த / இலக்கு சார்ந்த; data/information/knowledge தரவு/தகவல்/அறிவு; decision tree முடிவு மரம்; deduce ஊகித்தறி; "is a"/"has part" ஒரு வகை / பகுதியாகக் கொண்டது
- Notes: cousin rendered உறவுக்காரத் தம்பி (plain); "over a hundred million" → பத்து கோடிக்கும் மேற்பட்ட; IF/THEN written as plain Tamil conditionals; MYCIN, Python, Wikidata kept in Latin in body text.

### 7-ethics (3 files, drafted 2026-11-19, checks clean)
- unfair / algorithmic / historical / representation / measurement bias: நியாயமற்ற / அல்காரிதம் / வரலாற்றுப் / பிரதிநிதித்துவப் / அளவீட்டுப் பாரபட்சம் (quizzes say அல்காரிதப் பாரபட்சம்: align)
- proxy ப்ராக்ஸி (மாறி); feedback loop பின்னூட்டச் சுழற்சி; demographic parity மக்கள்தொகைச் சமநிலை; equal opportunity சம வாய்ப்பு; true positive rate உண்மை நேர்மறை விகிதம் (as quizzes); calibration அளவுத்திருத்தம்; black box கருப்புப் பெட்டி; explainability விளக்கத்தன்மை; accountability பொறுப்புக்கூறல்; documentation ஆவணப்படுத்தல்; model card மாதிரி அட்டை; datasheets for datasets தரவுத்தொகுப்புகளுக்கான டேட்டாஷீட்கள்; feature importance அம்ச முக்கியத்துவம்; counterfactual explanation மாற்று நிலை விளக்கம் (coined, weakest); red-teaming ரெட்-டீமிங்; reliability நம்பகத்தன்மை; privacy தனியுரிமை; inclusiveness அனைவரையும் உள்ளடக்குதல்; shortlist குறும்பட்டியலிடு; AI Act ஏஐ சட்டம்; fairness detective நியாயத் துப்பறிவாளர்
- Notes: AI says "yes" as ‘சரி’ (alt ஆம்); skin tone கருமை / வெளிர் நிற, Black patients கறுப்பின நோயாளிகள்: check they read sensitively; kids "same word, two meanings" box adds ஆங்கிலத்தில்; safety and security both பாதுகாப்பு.

### 5-nlp (3 files, drafted 2026-11-19, checks clean)
- chat app சாட் ஆப்; chat assistant சாட் உதவியாளர் (as quizzes); language AI மொழி ஏஐ; word map / map of meaning சொல் வரைபடம் / அர்த்த வரைபடம்; tokenisation டோக்கனாக்கம் (as quizzes); analogy ஒப்புமை
- subword tokenisation துணைச்சொல் டோக்கனாக்கம்; vocabulary சொற்களஞ்சியம்; bag of words சொற்பை; cosine similarity கொசைன் ஒற்றுமை; distributional hypothesis பரவல் கருதுகோள்; n-gram / bigram என்-கிராம் / பைகிராம்; context window சூழல் சாளரம் (alt கான்டெக்ஸ்ட் விண்டோ; 4-computervision uses ஜன்னல் for window: align); pre-trained முன்பயிற்சி; fine-tuned நுட்பமாகச் சீரமைக்கப்படுகின்றன; smoothing மென்மையாக்குதல்
- sentiment analysis உணர்வுப் பகுப்பாய்வு; named entity recognition பெயர்ச் சொல் அடையாளம் காணுதல்; text classification உரை வகைப்படுத்தல்; machine translation இயந்திர மொழிபெயர்ப்பு; question answering கேள்வி-பதில்; summarisation சுருக்கம் எழுதுதல்; speech recognition / synthesis பேச்சு அறிதல் / உருவாக்கம்; RNN ரிகரண்ட் நியூரல் நெட்வொர்க்குகள்; probability நிகழ்தகவு; dimension பரிமாணம்; coordinates ஆயத்தொலைவுகள்; representation குறிப்பீடு
- **Fix in alignment:** backpropagation is spelled பேக்ப்ராபகேஷன் here; the glossary says பேக்ப்ரொபகேஷன்.
- Notes: examples localised for Tamil (token splits keep the same piece counts and IDs; "bank" → ஆறு river/six; "dog bites man" → நாய் கடித்த மனிதன் / மனிதன் கடித்த நாய்; telescope sentence → the Kannada old-books sentence; "unjumpable" → யானைக்குட்டிகள்); Kids "the cat sat on the …" uses verb-then-place order (பூனை போய் உட்கார்ந்தது → "பாயில்"): check it reads well.
