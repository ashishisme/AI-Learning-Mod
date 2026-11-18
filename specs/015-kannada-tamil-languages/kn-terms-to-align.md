# Kannada terms to align (SPEC-015, before T020)

The drafting subagents chose these terms, which are not in the glossary. Pick one term per concept across the
lessons and quizzes, then add the agreed terms to `content/glossary/kn.json` for the owner to reconfirm. Each entry
below gives the term and the file it came from.

## Known clashes
Rule of thumb: where the approved interface (`web/src/i18n/kn.json`) already has a term, the lessons and quizzes follow it.

- **pattern:** ಪ್ಯಾಟರ್ನ್ (quizzes, 3-neuralnetworks, 7-ethics) or ವಿನ್ಯಾಸ (4-computervision). Both avoid ಮಾದರಿ, which the glossary uses for "model".
- **feature map:** ಫೀಚರ್ ಮ್ಯಾಪ್ (quizzes) or ವೈಶಿಷ್ಟ್ಯ ನಕ್ಷೆ (4-computervision, matching the widget).
- **attention / self-attention:** ಗಮನ / ಸ್ವ-ಗಮನ (quizzes) or ಅಟೆನ್ಷನ್ / ಸೆಲ್ಫ್-ಅಟೆನ್ಷನ್ (5-nlp; its Kids caption says ಗಮನದ ಬೆಳಕು).
- **hallucination:** ಎಐ ಭ್ರಮೆ (quizzes) or ಭ್ರಮೆ (5-nlp). These are close; keep one form.
- **fairness audit:** ನ್ಯಾಯಸಮ್ಮತತೆಯ ಪರಿಶೋಧನೆ (quizzes) or ನ್ಯಾಯಸಮ್ಮತತೆಯ ಪರಿಶೀಲನೆ (7-ethics, matching the interface's ನ್ಯಾಯ ಪರಿಶೀಲಕ).
- **four-fifths rule:** ಐದರಲ್ಲಿ ನಾಲ್ಕು ಭಾಗದ ನಿಯಮ (quizzes) or ಐದರಲ್ಲಿ ನಾಲ್ಕರ ನಿಯಮ (7-ethics).
- **human oversight:** ಮಾನವ ಮೇಲ್ವಿಚಾರಣೆ (quizzes) or ಮನುಷ್ಯರ ಮೇಲ್ವಿಚಾರಣೆ (7-ethics).
- **self-attention spelling:** ಸೆಲ್ಫ್-ಅಟೆನ್ಷನ್ (5-nlp) or ಸೆಲ್ಫ್-ಅಟೆನ್ಶನ್ (7-ethics); see attention above.
- **feature:** ಲಕ್ಷಣ (3-neuralnetworks) or ವೈಶಿಷ್ಟ್ಯ (7-ethics, the interface, and 4's ವೈಶಿಷ್ಟ್ಯ ನಕ್ಷೆ).
- **decision boundary:** ತೀರ್ಮಾನದ ಗಡಿರೇಖೆ (3-neuralnetworks) or ಗಡಿರೇಖೆ (quizzes). These fit together; keep ತೀರ್ಮಾನ in line with the "inference engine" choice.
- **fire (neuron):** ಫೈರ್ ಆಗು / ಆನ್ ಆಗು (3-neuralnetworks, widget) or ಸಕ್ರಿಯವಾಗು (quizzes).
- **working memory:** ಕಾರ್ಯ ಸ್ಮರಣೆ (2-symbolic, matching the interface) or ಕಾರ್ಯ ಸ್ಮೃತಿ (3-neuralnetworks recall).
- **inference engine:** ತೀರ್ಮಾನ ಯಂತ್ರ (2-symbolic, matching the interface) or ತೀರ್ಮಾನ ಎಂಜಿನ್ (quizzes).
- **inheritance:** ಆನುವಂಶಿಕತೆ (2-symbolic) or ಬಳುವಳಿ (quizzes, chosen to keep a pun in a wrong option).
- **fact:** ಸಂಗತಿ (2-symbolic) or ಸತ್ಯಗಳು (the rover widget in the interface; this means "truths"). The interface string may need changing, which needs owner re-approval of kn.json.
- **sensor:** ಸೆನ್ಸರ್ (2-symbolic) or ಸಂವೇದಕ (interface).
- **forward chaining:** 2-symbolic agrees with the quizzes (ಮುಂದಕ್ಕೆ ಸಾಗುವ ತರ್ಕ); only 7-ethics says ಫಾರ್ವರ್ಡ್ ಚೈನಿಂಗ್.
- **dot product:** ಡಾಟ್ ಪ್ರಾಡಕ್ಟ್ (4-computervision) or ಡಾಟ್ ಗುಣಲಬ್ಧ (5-nlp).

## Quizzes (`web/src/data/quizzes/kn.json`)
- **Kinds of AI:** narrow / general AI ಸೀಮಿತ / ಸಾಮಾನ್ಯ ಎಐ; top-down / bottom-up ಮೇಲಿನಿಂದ-ಕೆಳಗೆ / ಕೆಳಗಿನಿಂದ-ಮೇಲೆ; AI winter ಎಐ ಚಳಿಗಾಲ.
- **Turing test:** judge ತೀರ್ಪುಗಾರರು.
- **Expert systems:**
  - inference engine ತೀರ್ಮಾನ ಎಂಜಿನ್ (ಅನುಮಾನ avoided, since it means doubt);
  - user interface ಬಳಕೆದಾರ ಇಂಟರ್‌ಫೇಸ್;
  - forward / backward chaining ಮುಂದಕ್ಕೆ / ಹಿಂದಕ್ಕೆ ಸಾಗುವ ತರ್ಕ;
  - ontology ಆಂಟಾಲಜಿ;
  - inheritance ಬಳುವಳಿ (Hindi transliterates it).
- **Neural networks:** learning rate ಕಲಿಕೆಯ ದರ; boundary ಗಡಿರೇಖೆ; fires ಸಕ್ರಿಯವಾಗು.
- **Vision:** feature map ಫೀಚರ್ ಮ್ಯಾಪ್ (lesson 4 uses ವೈಶಿಷ್ಟ್ಯ ನಕ್ಷೆ, as the widget does: **align**); channel ಚಾನೆಲ್.
- **Language:** tokenisation ಟೋಕನೀಕರಣ; attention / self-attention ಗಮನ / ಸ್ವ-ಗಮನ; language model ಭಾಷಾ ಮಾದರಿ; hallucination ಎಐ ಭ್ರಮೆ.
- **Fairness:**
  - algorithmic bias ಅಲ್ಗಾರಿದಮ್ ಪಕ್ಷಪಾತ;
  - fairness audit ನ್ಯಾಯಸಮ್ಮತತೆಯ ಪರಿಶೋಧನೆ;
  - selection rate ಆಯ್ಕೆ ದರ;
  - true positive rate ನಿಜ ಧನಾತ್ಮಕ ದರ;
  - four-fifths rule ಐದರಲ್ಲಿ ನಾಲ್ಕು ಭಾಗದ ನಿಯಮ;
  - adverse impact ಪ್ರತಿಕೂಲ ಪರಿಣಾಮ;
  - human in the loop “ನಿರ್ಧಾರದಲ್ಲಿ ಮನುಷ್ಯ”;
  - human oversight ಮಾನವ ಮೇಲ್ವಿಚಾರಣೆ.

## 4-computervision (all three files)
- **Everyday words:** edge ಅಂಚು; grid ಜಾಲರಿ; line ಗೆರೆ; dark / bright ಗಾಢ / ತಿಳಿ; blur ಮಸುಕು; magnifying glass ಭೂತಗನ್ನಡಿ; pattern ವಿನ್ಯಾಸ; outline ಹೊರರೇಖೆ; vertical / horizontal ಲಂಬ / ಅಡ್ಡ.
- **Kids:** sliding window ಜಾರುವ ಕಿಟಕಿ; face unlock ಫೇಸ್ ಅನ್‌ಲಾಕ್; clue ಸುಳಿವು.
- **Plain English:** vision AI ದೃಷ್ಟಿ ಎಐ; training data ತರಬೇತಿ ದತ್ತಾಂಶ; confidence score ಖಚಿತತೆಯ ಅಂಕ; blind spots ಕುರುಡು ಜಾಗಗಳು; input ಇನ್‌ಪುಟ್.
- **Detailed:**
  - vision tasks: image classification ಚಿತ್ರ ವರ್ಗೀಕರಣ; object detection ವಸ್ತು ಪತ್ತೆ; segmentation ಸೆಗ್ಮೆಂಟೇಶನ್; OCR ಆಪ್ಟಿಕಲ್ ಅಕ್ಷರ ಗುರುತಿಸುವಿಕೆ; pose estimation ಭಂಗಿ ಅಂದಾಜು;
  - images and arrays: array ಅರೇ; channel ಚಾನೆಲ್; greyscale ಬೂದುಬಣ್ಣದ; output ಹೊರಹರಿವು;
  - convolution: kernel ಕರ್ನಲ್; feature map ವೈಶಿಷ್ಟ್ಯ ನಕ್ಷೆ; stride ಸ್ಟ್ರೈಡ್; padding ಪ್ಯಾಡಿಂಗ್;
  - networks: pooling ಪೂಲಿಂಗ್; backpropagation ಬ್ಯಾಕ್‌ಪ್ರೊಪಗೇಶನ್; activation ಆಕ್ಟಿವೇಶನ್; parameter ಪ್ಯಾರಾಮೀಟರ್; probability ಸಂಭವನೀಯತೆ; adversarial example ಅಡ್ವರ್ಸರಿಯಲ್ ಉದಾಹರಣೆ;
  - maths: dot product ಡಾಟ್ ಪ್ರಾಡಕ್ಟ್; random ಯಾದೃಚ್ಛಿಕ.

## 5-nlp (all three files)
- **Splitting text:** tokenisation ಟೋಕನೀಕರಣ; subword tokenisation ಪದಭಾಗ ಟೋಕನೀಕರಣ; vocabulary ಶಬ್ದಕೋಶ; bag of words ಪದಗಳ ಚೀಲ.
- **Meaning:** word map ಪದಗಳ ನಕ್ಷೆ; analogy ಹೋಲಿಕೆ (as the widget says).
- **Models:** transformer ಟ್ರಾನ್ಸ್‌ಫಾರ್ಮರ್; language model ಭಾಷಾ ಮಾದರಿ; large language model ದೊಡ್ಡ ಭಾಷಾ ಮಾದರಿ; context window ಕಾಂಟೆಕ್ಸ್ಟ್ ವಿಂಡೋ; n-gram ಎನ್-ಗ್ರಾಮ್; bigram ಬೈಗ್ರಾಮ್; smoothing ಸುಗಮಗೊಳಿಸುವುದು.
- **Maths:** cosine similarity ಕೊಸೈನ್ ಸಾಮ್ಯತೆ; distributional hypothesis ವಿತರಣಾ ಊಹೆ.
- **Tasks:** text classification ಪಠ್ಯ ವರ್ಗೀಕರಣ; sentiment analysis ಭಾವನೆ ವಿಶ್ಲೇಷಣೆ; named entity recognition ಹೆಸರಿನ ಘಟಕ ಗುರುತಿಸುವಿಕೆ; machine translation ಯಂತ್ರ ಅನುವಾದ; question answering ಪ್ರಶ್ನೋತ್ತರ; summarisation ಸಾರಾಂಶ ರಚನೆ; speech recognition / synthesis ಮಾತು ಗುರುತಿಸುವಿಕೆ / ಸಂಶ್ಲೇಷಣೆ.
- **Training:** pre-train ಪೂರ್ವ-ತರಬೇತಿಗೊಳಿಸು; fine-tune ಸೂಕ್ಷ್ಮವಾಗಿ ಹೊಂದಿಸು; recurrent neural network ರಿಕರೆಂಟ್ ನ್ಯೂರಲ್ ನೆಟ್‌ವರ್ಕ್.
- **Shared with lesson 4:** grid ಜಾಲರಿ matches lesson 4; parameter ಪ್ಯಾರಾಮೀಟರ್ and backpropagation ಬ್ಯಾಕ್‌ಪ್ರೊಪಗೇಶನ್ match too.

## 2-symbolic (all three files)
- **Rules:** if-then rules ‘ಹಾಗಿದ್ದರೆ’ ನಿಯಮಗಳು (as the widget says); IF / THEN part ‘ಆದರೆ’ / ‘ಆಗ’ ಭಾಗ; production rule ಉತ್ಪಾದನಾ ನಿಯಮ; rule firing ನಿಯಮ ಜಾರಿ; fact ಸಂಗತಿ; conclusion ತೀರ್ಮಾನ; sub-goal ಉಪಗುರಿ.
- **Knowledge:** knowledge representation ಜ್ಞಾನ ನಿರೂಪಣೆ; semantic network ಅರ್ಥ ಜಾಲ; frame ಫ್ರೇಮ್; slot ಖಾನೆ; knowledge graph ನಾಲೆಡ್ಜ್ ಗ್ರಾಫ್; triple ತ್ರಿವಳಿ; subject / predicate / object ಕರ್ತೃ / ವಿಧೇಯ / ಕರ್ಮ.
- **Expert systems:** explanation facility ವಿವರಣಾ ಸೌಲಭ್ಯ; knowledge acquisition bottleneck ಜ್ಞಾನ ಸಂಗ್ರಹಣೆಯ ಅಡಚಣೆ; decision tree ನಿರ್ಧಾರ ಮರ.

## 3-neuralnetworks (all three files)
- **Neurons:** input / output ಇನ್‌ಪುಟ್ / ಔಟ್‌ಪುಟ್; artificial neuron ಕೃತಕ ನ್ಯೂರಾನ್; activation function ಆಕ್ಟಿವೇಶನ್ ಫಂಕ್ಷನ್; picky ಚೂಸಿ (widget); spark ಕಿಡಿ.
- **Supervised learning:** supervised learning ಮೇಲ್ವಿಚಾರಣೆಯ ಕಲಿಕೆ; label ಲೇಬಲ್; parameter ಪ್ಯಾರಾಮೀಟರ್; loss ನಷ್ಟ (Hindi says लॉस); classification ವರ್ಗೀಕರಣ; classifier ವರ್ಗೀಕಾರಕ; regression ರಿಗ್ರೆಷನ್; overfitting ಓವರ್‌ಫಿಟ್ಟಿಂಗ್; test data ಪರೀಕ್ಷಾ ದತ್ತಾಂಶ.
- **Perceptron learning:** learning rate ಕಲಿಕೆಯ ದರ (matches the quizzes); epoch ಎಪಾಕ್; linearly separable ರೇಖೀಯವಾಗಿ ಬೇರ್ಪಡಿಸಬಹುದಾದ; non-linear ರೇಖೀಯವಲ್ಲದ; step function ಮೆಟ್ಟಿಲು; score ಅಂಕ; error ದೋಷ; feature space ಲಕ್ಷಣಗಳ ಜಾಗ.
- **Deep networks:** hidden layer ಗುಪ್ತ ಪದರ; gradient descent ಗ್ರೇಡಿಯೆಂಟ್ ಡಿಸೆಂಟ್; sigmoid ಸಿಗ್ಮಾಯ್ಡ್; ReLU and XOR kept in Latin script.
- **Other:** churn risk ಬಿಟ್ಟುಹೋಗುವ ಅಪಾಯ.

## 7-ethics (all three files)
- **Bias:** unfair bias ಅನ್ಯಾಯದ ಪಕ್ಷಪಾತ; algorithmic bias ಅಲ್ಗಾರಿದಮ್ ಪಕ್ಷಪಾತ; historical / representation / measurement bias ಐತಿಹಾಸಿಕ / ಪ್ರಾತಿನಿಧ್ಯ / ಅಳತೆಯ ಪಕ್ಷಪಾತ.
- **Fairness measures:**
  - human in the loop ನಿರ್ಧಾರದಲ್ಲಿ ಮನುಷ್ಯ;
  - selection rate ಆಯ್ಕೆ ದರ and disparate impact ratio ಅಸಮಾನ ಪರಿಣಾಮದ ಅನುಪಾತ (both already in the interface);
  - demographic parity ಜನಸಂಖ್ಯಾ ಸಮಾನತೆ; equal opportunity ಸಮಾನ ಅವಕಾಶ;
  - true positive rate ನಿಜ ಧನಾತ್ಮಕ ದರ; calibration ಕ್ಯಾಲಿಬ್ರೇಶನ್; error rate ದೋಷ ದರ.
- **Data and models:** proxy ಪ್ರಾಕ್ಸಿ; feedback loop ಫೀಡ್‌ಬ್ಯಾಕ್ ಲೂಪ್; feature ವೈಶಿಷ್ಟ್ಯ; attribute ಗುಣಲಕ್ಷಣ; sampling ನಮೂನೆ ಆಯ್ಕೆ.
- **Accountability:**
  - black box ಕಪ್ಪು ಪೆಟ್ಟಿಗೆ; explainability ವಿವರಣೀಯತೆ; transparency ಪಾರದರ್ಶಕತೆ; accountability ಹೊಣೆಗಾರಿಕೆ; privacy ಖಾಸಗಿತನ;
  - model card ಮಾದರಿ ಕಾರ್ಡ್; counterfactual explanation ಪ್ರತಿವಾಸ್ತವಿಕ ವಿವರಣೆ (coined; may read stiffly); red-teaming ರೆಡ್-ಟೀಮಿಂಗ್; feature importance ವೈಶಿಷ್ಟ್ಯಗಳ ಪ್ರಾಮುಖ್ಯತೆ.
- **Decisions:** shortlist ಕಿರುಪಟ್ಟಿ; threshold ಮಿತಿ; cutoff ಕಟ್‌ಆಫ್; mystery shopper ರಹಸ್ಯ ಗ್ರಾಹಕ.

## Owner notes from the drafts
- **7-ethics Kids words:** the Kids text uses the everyday ನ್ಯಾಯ / ನ್ಯಾಯಯುತ / ಅನ್ಯಾಯ, and the glossary's ನ್ಯಾಯಸಮ್ಮತತೆ only where "fairness" is a named term. "One-sided" became ಒಂದೇ ಬಗೆಯ.
- **7-ethics Kids quiz:** one wrong option, "rides a roller coaster", is a pun on "loop" that doesn't work in Kannada (Hindi changed it to a swing). The owner decides.
- **7-ethics conversions:** postcode became ಪಿನ್ ಕೋಡ್; £2,000 is kept.
- **7-ethics captions:** the voiced captions for `plain-disparate-impact-audit` and `fairness-calibration` are free spoken Kannada. Worth a read-aloud check.
- **3-neuralnetworks numbers:** "86 billion" became 86 ಬಿಲಿಯನ್, ಅಂದರೆ 8,600 ಕೋಟಿ.
- **3-neuralnetworks analogy:** the bread-and-yeast example is kept as in English (Hindi changed it to dal and masala).
- **3-neuralnetworks names:** Rosenblatt, Minsky and Papert are written in Kannada script with the Latin in brackets.
- **2-symbolic examples:** "well over a hundred million" became ಹತ್ತು ಕೋಟಿಗಿಂತಲೂ ಹೆಚ್ಚು; "coat" became ರೇನ್‌ಕೋಟ್.
- **2-symbolic clip:** the Plain English clip follows the English, which has no "fifty thousand" income threshold. The Hindi clip added one.
- **Chip's grammar:** Chip takes neuter verbs (ಚಿಪ್ ಕೇಳುತ್ತದೆ), as the interface does.
- **5-nlp examples rewritten for Kannada,** as Hindi did:
  - the token splits, with token counts unchanged;
  - the next-word examples;
  - bank / river bank became ಕಾಲು;
  - dog bites man;
  - the ambiguous sentence.

  All numbers and probabilities are unchanged.
- **5-nlp addition:** the Detailed notebook line adds “with English examples” (ಇಂಗ್ಲಿಷ್ ಉದಾಹರಣೆಗಳೊಂದಿಗೆ), as Hindi does.
- **5-nlp videos:** the videos have English words drawn in, such as King/Queen. The Kannada voice describes the same scene but won't match those words (the SPEC-014 burned-in text issue).
- Large numbers in Detailed are given in Indian units, as in Hindi: 36 million is 3.6 ಕೋಟಿ.
- Chip is ಚಿಪ್ in `mascot.name`; Hindi keeps "Chip".
