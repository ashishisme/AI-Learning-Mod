# Feature Specification: Kannada and Tamil

**Feature Branch**: `cloud-beta` (no feature branch; work continues on `cloud-beta`)

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Add Kannada (kn) and Tamil (ta) as learner languages, following docs/adding-a-language.md and the SPEC-009 language framework. Owner decisions 2026-11-14: the owner approves the text as 'owner (beta)'; record narration before launch; Kannada first as the pilot, then Tamil; Claude drafts every translation with a per-language glossary."

**Relationship to current product**: This uses the language framework of SPEC-009 (Hindi), which was built so that a new language is mostly content and review: a language list entry, translated lesson files, quizzes and interface text, a review ledger, recorded narration and the release check. It covers every lesson version written in SPEC-013 and every clip caption from SPEC-014. Requirement IDs below are cited as `SPEC-015 FR-xxx`. Any amendment to `spec/SPEC.md` gets a permanent ID in its amendment commit, following §12.

## Clarifications

### Session 2026-11-14 (owner)

- Q: Who approves the Kannada and Tamil text? → A: **The owner, as "owner (beta)"**, as with Hindi. There is no native reviewer for now, so each language is labelled beta in the language menu.
- Q: Recorded voices or device voices at launch? → A: **Record before launch.** A listening test picks three voices per language; every narrated track is recorded before the language is offered.
- Q: Both together or one first? → A: **Kannada first, as the pilot, then Tamil.**
- Q: Who drafts the translations? → A: **Claude**, using a per-language glossary, as with Hindi.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A Kannada learner uses the whole course in Kannada (Priority: P1)

A learner who reads Kannada picks "ಕನ್ನಡ" in the language menu, where it is labelled beta. From then on the menus, buttons, lesson list, all three journeys of every lesson (Kids, Plain English, Detailed), the clip captions, the quizzes and the help are in Kannada, written in Kannada script and shown in a font that renders it correctly. Read section, read-along and clips play recorded Kannada voices. The tutor answers in Kannada and cites the Kannada lesson.

**Why this priority**: Kannada is the pilot. It proves the new script's fonts, safety rules, voices and layout before Tamil repeats the same work.

**Independent Test**: With only Kannada added, a learner can switch to Kannada, complete one lesson in each journey with recorded narration, take its quiz and ask the tutor a question, with no English text left on those screens and no broken glyphs.

**Acceptance Scenarios**:

1. **Given** Kannada is offered, **When** the learner opens the language menu, **Then** it lists "ಕನ್ನಡ" with a beta label, and choosing it changes the page language without a reload.
2. **Given** Kannada is chosen, **When** the learner opens any lesson in any journey, **Then** the lesson is the approved Kannada version, with no "not translated yet" notice.
3. **Given** Kannada is chosen, **When** the learner presses Read section or plays a clip, **Then** a recorded Kannada voice reads it.
4. **Given** Kannada is chosen, **When** the learner asks the tutor a question, **Then** the answer is in Kannada and cites a Kannada section heading, or gives the approved Kannada "couldn't find that" reply.
5. **Given** Kannada is chosen, **When** the learner takes a quiz, **Then** every question, option and explanation is in Kannada and the correct answers match English.
6. **Given** a learner who never chooses Kannada, **When** they use the site in English, **Then** no Kannada font or text is downloaded.

---

### User Story 2 - A Tamil learner uses the whole course in Tamil (Priority: P2)

The same as Story 1 for Tamil ("தமிழ்"), after Kannada has shipped. Tamil words are often long, so every screen is checked at phone width for text that overflows or is cut off.

**Why this priority**: It reuses everything proven by the Kannada pilot, so it comes second.

**Independent Test**: As Story 1, in Tamil, plus a phone-width check of every screen with the longest Tamil strings.

**Acceptance Scenarios**:

1. **Given** Tamil is offered, **When** the learner chooses "தமிழ்", **Then** Story 1's scenarios 1–6 hold in Tamil.
2. **Given** Tamil is chosen on a phone-width screen, **When** the learner visits each page, **Then** no text overflows its box or the page width, and no control shrinks below 44 by 44 pixels.

---

### User Story 3 - Feedback and tutor input in Kannada and Tamil are kept safe (Priority: P1)

A learner writes feedback or a tutor question in Kannada or Tamil script, in Kannada or Tamil digits, or in the language typed in English letters. Personal details (phone numbers, emails, addresses, ID numbers, dates of birth) are caught exactly as they are in English and Hindi, and unsafe requests get the approved safety reply in the learner's language.

**Why this priority**: This is a security requirement. Without it, personal details written in the new script would get past the check, so a language cannot launch without it.

**Independent Test**: Run the existing personal-details and safety test sets translated into each script, in native digits and in common romanised spellings; every case is caught, and no normal sentence is wrongly refused.

**Acceptance Scenarios**:

1. **Given** feedback with a phone number written in Kannada digits, **When** it is sent, **Then** it is refused with the Kannada message asking to remove personal details.
2. **Given** a Tamil address written in Tamil script with a street word such as "தெரு", **When** it is sent, **Then** it is refused.
3. **Given** a romanised Kannada or Tamil sentence giving a date of birth, **When** it is sent, **Then** it is refused.
4. **Given** an ordinary question about the lesson in either language, **When** it is sent, **Then** it is accepted.

---

### Edge Cases

- **A file changes after approval.** Its approval goes stale and the release check fails for that language until the owner approves again, as for Hindi.
- **A recording is missing.** The language is not approved for launch until every narrated track is recorded and current (record before launch).
- **The learner's device has no Kannada or Tamil voice.** Recorded voices are used, so the device voice is never needed for lessons; only the tutor's spoken answer depends on it, and it says when no voice is available (SPEC-009 FR-013).
- **Mixed text.** Technical terms kept in English inside Kannada or Tamil sentences (as Hindi keeps "AI") render in the right fonts and are read correctly.
- **Digits.** Lesson numbers and worked-example numbers stay in the same digits as English, so the clips (which show numbers) match their captions.
- **Kids journey.** The Kids pages use a child-friendly font for each script, as they do for Latin script.
- **Switching languages mid-lesson.** Progress and quiz results are kept; only the language changes.
- **Hindi keeps working.** Adding Kannada and Tamil changes nothing for Hindi or English learners.

## Requirements *(mandatory)*

### Functional Requirements

**Languages and switching**

- **FR-001**: The language menu MUST offer Kannada ("ಕನ್ನಡ") and Tamil ("தமிழ்"), each labelled beta, once that language is approved for launch. Before then the language MUST stay hidden while still being built and checked.
- **FR-002**: Kannada MUST ship first; Tamil MUST ship only after Kannada is live. Each language is released on its own.

**Content**

- **FR-003**: For each language, every learner-facing text MUST be translated: the interface text, the lesson list, all 18 lesson versions (6 lessons × Kids, Plain English, Detailed) including clip captions and descriptions, the quizzes, and the tutor's and server's own messages.
- **FR-004**: Each translated lesson MUST keep the English structure exactly (sections, steps, quiz answers, clip names and step counts), as the existing translation checks require.
- **FR-005**: Each language MUST have a glossary of the key course terms, used consistently across all its files and confirmed by the owner.
- **FR-006**: Every translated file MUST carry the owner's approval as "owner (beta)", and the release check MUST fail for any file that is missing, unapproved or stale.

**Voices**

- **FR-007**: For each language the owner MUST pick three voices (one for each narrator persona) from a listening test before recording.
- **FR-008**: Every narrated track of a language (lesson sections, intros, greetings, read-along and clip steps) MUST be recorded and current before that language launches.

**Display**

- **FR-009**: Kannada and Tamil text MUST render in a font made for the script, in both the regular and the Kids journeys. The fonts are served by the product itself and are downloaded only when that script is on screen.
- **FR-010**: Every page MUST fit a phone-width screen in each language with no overflowing or clipped text, and every control MUST stay at least 44 by 44 pixels with contrast of at least 4.5:1 in light and dark themes.

**Safety and privacy**

- **FR-011**: The personal-details check MUST catch phone numbers, emails, addresses, ID numbers and dates of birth written in each script, in that script's own digits, and in common romanised spellings.
- **FR-012**: The safety check MUST catch unsafe requests written in each script and in romanised form, and reply in the learner's language.

**Tutor**

- **FR-013**: The tutor MUST answer in the learner's language, ground its answer in that language's lesson, cite a section heading in that language, and use the approved fallback reply in that language when the lesson does not cover the question.

### Key Entities

- **Language entry**: code (`kn`, `ta`), name in its own script, speech language, status (hidden or approved) and the beta flag.
- **Translated files**: per language, the lesson list, 18 lesson versions, quizzes and interface text, each with an approval record.
- **Glossary**: per language, the agreed translation of each key term.
- **Voice choice**: per language, one voice for each of the three narrator personas.
- **Recordings**: per language, one recording per narrated track per persona.
- **Script rules**: per language, the patterns that catch personal details and unsafe requests in that script, its digits and romanised spellings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Kannada learner, and later a Tamil learner, can complete every lesson in all three journeys, every quiz and a tutor question entirely in their language: 0 untranslated strings on any learner page.
- **SC-002**: 100% of narrated tracks in each language have a current recording at launch.
- **SC-003**: 100% of the translated personal-details and safety test cases are caught in each script, native digits and romanised form, with no ordinary test sentence refused.
- **SC-004**: English and Hindi pages download no Kannada or Tamil font, and their text and behaviour are unchanged (existing tests pass).
- **SC-005**: At phone width, no page in either language has text overflowing its box or the page.
- **SC-006**: Every translated file carries a current owner approval; the release check passes for each language with no warnings.

## Assumptions

- The owner approves as "owner (beta)" without reading the language natively, as for Hindi; the beta label tells learners. A native reviewer can be added later and approve files again.
- Notebooks stay in English, as they are for Hindi; the Colab button opens the English notebook.
- The Kids reading check stays English-only; Kids translations keep the same short sentences.
- Narration uses the same speech service as Hindi, which offers Kannada and Tamil voices.
- Both scripts end sentences with a full stop, so the sentence splitting for read-along and narration needs no change; this is confirmed during the pilot.
- Translation and recording costs are priced with the existing dry runs before anything is billed.
- The release flow, review ledgers and release check are reused unchanged.
