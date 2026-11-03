# Feature Specification: Indian Languages (Text and Audio), Starting with Hindi

**Feature Branch**: `009-indian-languages`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "I want to be able to deliver this in different languages. Start with Indian languages. Both audio and text." Planned in `/Users/santoshsharma/.claude/plans/lets-plan-for-next-soft-kahn.md` and approved by the owner on 2026-11-03, with the instruction that it ships as incremental builds.

**Relationship to other specs**: Builds on `specs/008-cloud-beta-deployment/` (hosted beta, privacy rules, feedback checks, local AI under its FR-021a). Requirement IDs below are local to this spec and are cited as "SPEC-009 FR-0xx".

## Clarifications

### Session 2026-11-03 (owner)

- Q: Which languages first? → A: **Hindi first, end to end.** Then 2–3 languages per round on the same process.
- Q: How should narration work? → A: **Pre-recorded before each release** with a cloud text-to-speech service and shipped with the release. A device voice is only a fallback.
- Q: Who translates the app's own content? → A: **An AI drafts it, and a native-speaker reviewer must approve it** before a language is offered. Technical terms keep the English in brackets, for example तंत्रिका नेटवर्क (neural network).
- Q: How is it delivered? → A: **As a series of incremental releases.** Every release keeps English working unchanged, and Hindi appears to learners only once it is approved.

## Context

Today every part of the app is English only. The interface text is written in English throughout, the kids and plain-English lessons and the quizzes exist only in English, and narration uses the device's English voices. The course the app is based on already publishes translations of its base lessons for nine Indian languages (Hindi, Bengali, Marathi, Tamil, Telugu, Kannada, Malayalam, Punjabi, Urdu) at the version the app uses. The app does not use them yet.

Many intended learners in India read and listen more comfortably in their own language, and many desktop devices have no voice for Indian languages other than Hindi, and often not even that.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Learner studies the course in Hindi (Priority: P1)

A learner picks हिन्दी from the language switcher. The interface, the base lessons, the kids and plain-English versions, glossary tips, the mascot's lines and the quizzes all appear in Hindi. Technical terms show the English in brackets the first time they appear in a section. The choice is remembered on that device.

**Why this priority**: It is the core value of the feature, and it is the build (B3) that makes Hindi visible to learners.

**Independent Test**: Choose Hindi on a fresh browser, open each of the six lessons in all three modes and take a quiz. Every learner-facing word is Hindi apart from bracketed technical terms, code and formulas. Reload the page and Hindi is still selected.

**Acceptance Scenarios**:

1. **Given** a signed-in learner on the home page in English, **When** they choose हिन्दी in the header, **Then** the page text switches to Hindi within 1 second, without a reload and without losing their place or progress.
2. **Given** Hindi is chosen, **When** the learner opens lesson 3 in kids mode, **Then** the headings, body, analogies, mini-quiz and teach-back prompt are in Hindi, and "neural network" appears as तंत्रिका नेटवर्क (neural network) at its first use in the section.
3. **Given** Hindi is chosen, **When** the learner takes a quiz, **Then** the questions, choices, explanations, hints and the score message are in Hindi, and scoring works as in English.
4. **Given** Hindi was chosen yesterday on this device, **When** the learner signs in again today, **Then** the app opens in Hindi.
5. **Given** a browser whose preferred languages put Hindi before English, **When** a learner visits for the first time, **Then** the app opens in Hindi. With any other order it opens in English.

---

### User Story 2 - Learner listens to lessons in Hindi (Priority: P1)

A learner with Hindi chosen presses the narration button on a lesson section and hears a natural Hindi recording, in the narration voice they picked (female or male). This works the same on a laptop with no Hindi voice installed as on a phone.

**Why this priority**: The owner asked for audio as well as text. For learners who read slowly in any script, audio is often the main way in. Ships in build B4.

**Independent Test**: On a desktop browser with no Hindi voice installed, choose Hindi and play every narrated section of one lesson in each mode, with each voice. Every section plays a Hindi recording.

**Acceptance Scenarios**:

1. **Given** Hindi is chosen, **When** the learner presses narration on a section, **Then** a Hindi recording starts within 2 seconds on typical broadband, in the selected voice.
2. **Given** a section has no recording yet, **When** the learner presses narration, **Then** the device's Hindi voice reads it if the device has one. Otherwise the button says that narration in Hindi isn't available on this device. It never reads the Hindi text with an English voice.
3. **Given** English is chosen, **When** the learner presses narration, **Then** it behaves exactly as today.

---

### User Story 3 - English learners see no disruption during the rollout (Priority: P1)

While the Hindi work is shipped in stages, a learner using English sees the same app as before, at every release.

**Why this priority**: The owner requires incremental builds. Builds B1 and B2 change how text is delivered without any visible change, so this is what makes shipping them safe.

**Independent Test**: For each release from B1 onward, the full existing English test suite passes unchanged, and an English learner sees identical text on every page.

**Acceptance Scenarios**:

1. **Given** build B1 or B2 is live and Hindi is not yet approved, **When** any learner visits, **Then** no language switcher or Hindi option is shown, and every page looks and reads as before.
2. **Given** a learner's browser prefers Hindi but Hindi is not yet approved, **When** they visit, **Then** the app opens in English.

---

### User Story 4 - Personal details are caught in Hindi too (Priority: P1)

When a learner writes feedback in Hindi, or asks the tutor a question in Hindi or Hinglish, the same personal-details protections apply as for English: phone numbers in Devanagari digits, addresses written in Hindi, identity numbers and contact handles are caught.

**Why this priority**: This is a privacy and safety requirement. Without it, Hindi text would get past the rules that SPEC-008 relies on (its FR-048 and FR-REV-20). Hindi must not be offered before this works, so it ships in B2, before Hindi goes live.

**Independent Test**: Run a Hindi and Hinglish personal-details test set through the feedback form and the tutor question screen. Every example is rejected, and clean Hindi messages pass.

**Acceptance Scenarios**:

1. **Given** Hindi is chosen, **When** a learner submits feedback containing "मेरा नंबर ९८७६५४३२१० है", **Then** the message is rejected, nothing is stored, and the reply names the category in Hindi without repeating the text.
2. **Given** a tutor question in Hinglish containing a home address, **When** it is asked, **Then** the safety reply is shown and the question is not sent to any AI.
3. **Given** a clean Hindi feedback message about a lesson, **When** it is submitted, **Then** it is accepted as in English.

---

### User Story 5 - Owner controls when a language goes live (Priority: P2)

The owner gets AI-drafted translations quickly. A named native-speaker reviewer corrects and approves each file. A language is offered to learners only when everything in it is approved, and a release fails if anything isn't.

**Why this priority**: This is the owner's quality decision, and it protects children's content from unchecked machine translation. It is needed before B3, but it isn't a learner journey in itself.

**Independent Test**: Mark one Hindi file as a draft and attempt a release. The release fails and names the file. Approve it, and the release passes.

**Acceptance Scenarios**:

1. **Given** any Hindi file is still a draft, **When** a release is attempted, **Then** it fails and lists every draft file.
2. **Given** a Hindi file is missing a piece of text that exists in English, **When** a release is attempted, **Then** it fails and names what is missing.
3. **Given** all Hindi files are approved, each with reviewer and date recorded, **When** a release runs, **Then** Hindi is offered to learners.

---

### User Story 6 - Tutor answers in Hindi (Priority: P3)

With Hindi chosen, the tutor answers in Hindi from the Hindi lesson, cites Hindi section headings, and shows its "couldn't find that" and safety replies in Hindi. The microphone listens for Hindi.

**Why this priority**: The hosted tutor is currently off (SPEC-008 FR-024). Today this benefits only learners using their own local AI (SPEC-008 FR-021a). Ships last, in B5.

**Independent Test**: With a local AI set up and Hindi chosen, ask a question about lesson 1. The answer is in Hindi and ends with a Hindi section citation in the usual form.

**Acceptance Scenarios**:

1. **Given** Hindi is chosen and the tutor is available, **When** the learner asks a question, **Then** the answer is in Hindi and cites a Hindi heading as `[<lesson title> § <heading>]`.
2. **Given** the answer has no citation, **When** it completes, **Then** the existing citation rules apply, and any fallback message is in Hindi.
3. **Given** Hindi is chosen, **When** the learner uses the microphone, **Then** speech is recognised as Hindi.

---

### User Story 7 - The next language needs content only (Priority: P3)

After Hindi, adding Tamil, Bengali, Marathi or Telugu needs only that language's translations, glossary, recordings and approval. Nothing about how the app works changes.

**Why this priority**: This is what makes "2–3 languages per round" affordable. It is proven in round 2, not in this feature.

**Independent Test**: Add a second language as content only, using a small test fixture. It appears in the switcher with its lessons and recordings, and no application code changes.

**Acceptance Scenarios**:

1. **Given** a second language with all files approved and recordings produced, **When** it is released, **Then** learners can choose it, and everything in User Stories 1 and 2 holds for it.

### Edge Cases

- **Browser prefers Hindi before approval**: the app opens in English, and no Hindi option is shown (User Story 3).
- **Hindi withdrawn after a learner chose it**: if a later release no longer offers Hindi, the app opens in English and shows a short notice in English. The stored choice is kept for when Hindi returns.
- **One part not translated** (for example a new quiz added in English only): that part shows in English with a "not yet translated" notice in Hindi. The rest of the page stays Hindi. Never a blank area or a raw text key.
- **Translated base lesson is missing an image** the English one has: the English image is shown.
- **Device has no Hindi voice and a recording is missing**: the narration control says narration in Hindi isn't available on this device (User Story 2, scenario 2).
- **Weak connection while audio loads**: the control shows that it is loading, and the learner can stop it. A failed load gives a clear message, not silence.
- **Mixed-language questions** (Hinglish in Latin script): the safety screen and personal-details rules still apply (User Story 4).
- **A small local AI answers in English** even when asked for Hindi: the answer is shown as given, and the citation rules still apply. The learner isn't blocked.
- **Long Hindi words at phone width**: text wraps without clipping or overlap, and controls keep the DC-11 size and contrast floor.
- **Home page search**: search matches lesson titles in the chosen language.
- **Reading-time estimates**: these are shown for the chosen language's text, not copied from English.

## Requirements *(mandatory)*

### Functional Requirements

#### Language choice

- **FR-001**: Learners MUST be able to choose a language from English and every approved language, using a switcher on every learner page and in Settings. In round 1 the only other language is Hindi.
- **FR-002**: The choice MUST be stored only in the learner's browser, and MUST persist across reloads and sign-ins on that device. It MUST NOT be stored by the server. It MAY be sent with individual requests for lesson and tutor content (SPEC-008 FR-037).
- **FR-003**: On a first visit, the app MUST open in Hindi only if Hindi is approved and the browser's preferred languages put Hindi before English. Otherwise it MUST open in English.
- **FR-004**: The page MUST declare its current language, so assistive technology and browser tools treat the text correctly.

#### Text

- **FR-005**: With Hindi chosen, all learner-facing interface text MUST be in Hindi: navigation, home, lesson, quiz, settings, tutor panel, feedback form, sign-in, invite activation, expiry reminders, notices and error messages. The admin console MAY remain in English.
- **FR-006**: Base lessons MUST use the course's own published Hindi translation of the same pinned course version, including its images. Any image it lacks falls back to the English one.
- **FR-007**: Kids and plain-English lessons, glossary tips, mascot lines and quizzes (questions, choices, explanations, hints and result messages) MUST be available in Hindi.
- **FR-008**: The first use of a technical term in each section MUST show the Hindi term followed by the English term in brackets. Code, formulas and lesson citations MUST stay intact and readable.
- **FR-009**: When any part is unavailable in the chosen language, the app MUST show the English version of that part with a visible "not yet translated" notice in the chosen language. It MUST NOT show a blank area, a broken page or a raw text key.
- **FR-010**: Numbers and dates in learner-facing text MUST follow the chosen language's conventions. Times stay in IST.
- **FR-011**: Hindi text MUST render in a font that supports Devanagari, served from the app's own origin (SPEC-008 FR-033, FR-034). At phone width it MUST not clip or overlap, and MUST keep the DC-11 floor (contrast at least 4.5:1 in light and dark, touch targets at least 44×44 px).

#### Audio

- **FR-012**: Every narrated section of every Hindi lesson, in every mode, MUST have a recorded Hindi narration for each narration voice the app offers. Recordings are made before the release, ship with it, and are served from the app's own origin.
- **FR-013**: When a recording is missing, narration MUST fall back to the device's Hindi voice if there is one. If there isn't, the control MUST say that Hindi narration isn't available on this device. Hindi text MUST NOT be read by a voice for another language.
- **FR-014**: A recording MUST be made again only when its source text or voice changes. Releasing unchanged content MUST NOT incur new recording cost.
- **FR-015**: Making recordings MUST happen only as part of preparing a release, never while the site is idle (DC-09). It MUST use the deployment's managed identity, not a long-lived key (SPEC-008 FR-023).
- **FR-016**: English narration MUST keep working exactly as today.

#### Translation and review

- **FR-017**: Translations of the app's own content MAY be drafted automatically. Each translated file MUST carry a review status, plus the reviewer and date once approved.
- **FR-018**: A language MUST NOT be offered to learners unless every one of its files is approved by a named native-speaker reviewer.
- **FR-019**: A release MUST fail if a language it offers has any unapproved file, or lacks any text that exists in English. The failure MUST name each file and item.
- **FR-020**: Each language MUST have a glossary of how key technical terms are rendered, and drafts MUST follow it.
- **FR-021**: The credential used to draft translations automatically MUST NOT be included in the release or in the hosted service's configuration.

#### Safety and privacy

- **FR-022**: The feedback personal-details rule check (SPEC-008 FR-048) MUST reject the same categories in Hindi and Hinglish. That includes numbers in Devanagari or mixed digits, Hindi words for phone, address, PIN code, identity numbers and email, and transliterated forms. Its rejection message MUST be in the chosen language and MUST NOT repeat the text.
- **FR-023**: The tutor's question safety screen (SPEC-008 FR-REV-20) MUST apply equally to Hindi and Hinglish questions.
- **FR-024**: Hindi MUST NOT be offered to learners until FR-022 and FR-023 are in place and tested.

#### Tutor

- **FR-025**: With Hindi chosen, the tutor MUST answer in Hindi using the Hindi lesson, cite Hindi section headings in the existing citation form, and give its fallback and safety replies in Hindi. This applies wherever the tutor is available: today through the learner's own local AI (SPEC-008 FR-021a), and the hosted tutor only after SPEC-008 FR-024 is changed.
- **FR-026**: With Hindi chosen, the microphone input MUST listen for Hindi.

#### Delivery

- **FR-027**: The feature MUST ship as incremental releases:
  - **B1:** language foundation, no visible change.
  - **B2:** translation and review process, plus the Hindi safety rules. No visible change.
  - **B3:** Hindi text goes live.
  - **B4:** Hindi recordings go live.
  - **B5:** the tutor answers in Hindi.

  Every release MUST keep the English experience unchanged, with all existing English tests passing.
- **FR-028**: Adding another language the course already translates MUST need only that language's content, glossary, recordings and approval, with no change to how the app behaves.

### Key Entities

- **Language**: a code and display name (English, हिन्दी) and whether it is approved for learners.
- **Language preference**: the learner's choice. It exists only in that browser.
- **Translated content file**: the Hindi version of one lesson in one mode, a quiz set, or interface text. It carries a review status (draft or approved), reviewer and date.
- **Glossary**: per language, the agreed rendering of each technical term.
- **Narration recording**: one per language, lesson, mode, section and voice. It carries a fingerprint of the exact text it was made from, so unchanged text is never recorded twice.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With Hindi chosen, an automated scan of every learner page finds 0 interface strings in English. Bracketed technical terms, code, formulas and the admin console are excluded.
- **SC-002**: From B3, 100% of the six lessons in all three modes, and 100% of quizzes, are available in Hindi.
- **SC-003**: From B4, 100% of narrated sections have a Hindi recording in each voice. Narration starts within 2 seconds on typical broadband.
- **SC-004**: Hindi narration plays on 100% of tested devices, including desktops with no Hindi voice installed.
- **SC-005**: 0 unapproved translations ever reach learners. A release containing one fails 100% of the time.
- **SC-006**: The Hindi and Hinglish personal-details test set is rejected 100% of the time, and at least 95% of a clean Hindi message set is accepted.
- **SC-007**: At every release from B1, all existing English tests pass, and English pages load no more than 10% slower than before.
- **SC-008**: Switching language takes effect within 1 second, with no loss of lesson position or progress.
- **SC-009**: Re-releasing with unchanged Hindi content incurs zero new recording cost.
- **SC-010**: A native-speaker reviewer signs off every Hindi file. In a sample of 20 sections, at least 18 are rated natural and accurate for the intended age group.
- **SC-011**: At phone width, 0 Hindi screens have clipped or overlapping text, and 100% of controls meet the DC-11 floor.
- **SC-012**: In round 2, a second language is added with 0 changes to application behaviour.

## Assumptions

- The owner names the native-speaker reviewer(s) for Hindi before B3.
- Hindi uses everyday spoken Hindi suitable for school-age learners, not formal or highly Sanskritised vocabulary. Technical terms keep the English in brackets.
- English narration continues to use device voices. Recording English narration is out of scope.
- The admin console stays in English in round 1.
- The hosted tutor stays off (SPEC-008 FR-024). The Hindi tutor is reachable only through a learner's own local AI until that changes.
- Recordings add roughly 30–50 MB to each release per language. This is acceptable for round 1 and will be reviewed if start-up time suffers.
- The course's published translations are under the same licence as the English course, which the app already complies with.
- A cloud text-to-speech service with natural Hindi voices (female and male) can be used through the deployment's managed identity, at a cost of a few US dollars per language per full content change.

## Constraints and Dependencies

- No new software dependencies (DC-06), and no Python anywhere in the build (DC-10).
- Lessons, images, fonts and recordings are static files shipped with the release and served from the app's own origin (DC-09, SPEC-008 FR-033, FR-034).
- Learner preferences stay in the browser (SPEC-008 FR-037). No long-lived credentials (SPEC-008 FR-023).
- Amendments needed: `spec/SPEC.md` FR-ING-02 (allow the course's translation folders) and new interface-language requirements in `spec/SPEC.md` and `spec/ACCEPTANCE.md`, per Constitution Principle I.
- Depends on SPEC-008's personal-details check (FR-048) and tutor safety screen (FR-REV-20), and on its local-AI tutor (FR-021a).

## Out of Scope (this feature)

- Right-to-left layout (needed for Urdu), and base-lesson translation for languages the course does not publish (Gujarati, Odia).
- Translating the admin console.
- Offline use, and recorded English narration.
- Languages beyond Hindi. These follow in later rounds under FR-028.
