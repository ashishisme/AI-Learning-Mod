# Feature Specification: Easier Kids Lessons

**Feature Branch**: `012-kids-content-easing`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "Feedback suggests that the content is complicated for kids. Let's plan easing out the content. We want to make the content easier to read, less heavy language, a jargon buster with animations, and other ways to make the kids understand the content. Complexity should change with the age selection: 8–11 and 12–14, built as Option A (one lesson with a 12+ layer)." Source plan: [docs/kids-content-easing-plan.md](../../docs/kids-content-easing-plan.md).

**Relationship to current product**: This builds on SPEC-011 (Kids-First UI Overhaul) and SPEC-009 (Hindi). It changes only the Kids journey's lesson text and lesson-page aids. Standard and Plain English are unchanged. Requirement IDs below are cited as `SPEC-012 FR-xxx`. They are amendments to `spec/SPEC.md` and will get permanent IDs in the amendment commit, following §12.

## Clarifications

### Session 2026-11-12 (owner)

- Q: How many age bands? → A: **Two: 8–11 and 12–14.** A three-band split (8–10, 10–12, 12–14) was dropped.
- Q: How are the two bands built? → A: **Option A: one lesson with a "12+" layer.** The core text is written for 8–11, and tagged additions appear only for 12–14. A separately written 12+ text is allowed only for an individual card where the layer reads like a patch. Two full versions per band were rejected because Hindi translation, review and recordings would double.
- Q: Where is the age band kept? → A: **Only in the learner's browser.** It is never sent to the server, put in feedback or logged. The default is 8–11.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A younger child can read and follow a lesson (Priority: P1)

A child aged 8–11 opens a Kids lesson. Each part of the lesson is a short card. The card opens with one "big idea" line from Chip, then shows a picture, then two or three short sentences in everyday words. No card brings in more than two new words. Extra facts such as names, dates and alternate terms sit in a closed "Want to know more?" box.

**Why this priority**: Learner feedback says the Kids lessons are too hard. The measured reading grade of 4.7–5.9 is above what an 8- or 9-year-old reads alone. Easier text is the core fix, and every other story builds on it.

**Independent Test**: Rewrite one lesson (the pilot, lesson 3) to the Kids writing rules. Run the reading check on it, then have 3–5 children aged 8–11 read or listen to it and say the big idea back.

**Acceptance Scenarios**:

1. **Given** a rewritten Kids lesson, **When** the reading check runs, **Then** the 8–11 text reports reading grade 3.5 or lower, average sentence length of 12 words or fewer, no sentence over 18 words, and no more than 2 new words per card.
2. **Given** a child in the 8–11 band, **When** they open a rewritten lesson, **Then** every card opens with a big-idea line and a picture or animation, followed by its short text.
3. **Given** a card with optional depth, **When** the child opens the lesson, **Then** "Want to know more?" is closed and opens with one tap.
4. **Given** a rewritten lesson, **When** the child reaches the end, **Then** a "3 things you learned" recap appears before the mini-quiz.

---

### User Story 2 - A child picks an age band and the lesson adjusts (Priority: P1)

When a child chooses the Kids journey, they also pick "8–11" or "12–14". The choice can be changed later. For 12–14 the same lesson shows extra "12+" parts: the real technical term, a fuller explanation or a harder example. "Want to know more?" starts open, and the quiz has one extra question.

**Why this priority**: The 8–14 range is too wide for one reading level. Without bands, simplifying for 8-year-olds would talk down to 13-year-olds.

**Independent Test**: In a fresh browser, choose Kids and then 12–14. Confirm the 12+ parts and the extra quiz question appear. Switch to 8–11 and confirm they disappear. Confirm the band never appears in any request sent from the browser.

**Acceptance Scenarios**:

1. **Given** a first-time learner choosing the Kids journey, **When** the chooser appears, **Then** it offers 8–11 and 12–14. If the child skips the choice, 8–11 is used.
2. **Given** the 12–14 band, **When** a rewritten lesson opens, **Then** every 12+ addition is shown, "Want to know more?" is open, and the quiz has one more question than in the 8–11 band.
3. **Given** the 8–11 band, **When** the same lesson opens, **Then** no 12+ addition is shown, and the core text reads as complete on its own.
4. **Given** either band, **When** the child changes the band in Settings, **Then** the open lesson updates without losing the child's progress.
5. **Given** any band, **When** the browser sends a request or a learner submits feedback, **Then** the age band is not included.

---

### User Story 3 - A child taps a hard word and sees it explained (Priority: P2)

A child meets a bold word such as "neuron" in the text. They tap it, and a small card opens next to the word. The card gives a one-line explanation and a short looping animation or picture, with a listen button. The child closes it and carries on reading. The end-of-section list stays as "Words you learned".

**Why this priority**: About 31 of 58 bold Kids terms have no explanation today. The explanation also comes too late, at the end of the section. Explaining a word where the child meets it gives the most help for each hard word.

**Independent Test**: Open a rewritten lesson. Tap each bold word and check that each one opens a card with an explanation, a visual and a listen button. Repeat with reduce motion on, then with the keyboard only, then with a screen reader.

**Acceptance Scenarios**:

1. **Given** a rewritten Kids lesson, **When** the content check runs, **Then** every bold term has a word-card entry in every approved language.
2. **Given** a bold word, **When** the child taps or presses Enter on it, **Then** its card opens with explanation, visual and listen button. Escape, a close button, or a tap outside closes it and returns focus to the word.
3. **Given** reduce motion is on, **When** a card opens, **Then** the visual is a still picture.
4. **Given** sound is muted (SPEC FR-UI-19), **When** a card opens, **Then** its listen control shows the muted state and plays nothing.
5. **Given** a screen reader, **When** it reaches a bold word, **Then** it announces the word as a button that opens an explanation.

---

### User Story 4 - A child understands by watching and trying, not only reading (Priority: P2)

Step-by-step diagrams get a "Play" button that walks through the steps with Chip. The child can pause. After each card, a one-tap check-in such as "Which one is a cat?" gives Chip's reaction and does not count toward the score. At the end, the child picks the big idea to "tell Chip" instead of typing it. The "try it" activities get kid wording, fewer controls and a "Chip's hint".

**Why this priority**: Pictures, motion and quick checks help children who struggle with text. This builds on parts the lessons already have (12 step-by-step diagrams, 6 activities, the quiz and teach-back).

**Independent Test**: In a rewritten lesson, play and pause a stepper, answer a check-in correctly and then wrongly, and complete the tell-Chip choice. Check that the lesson score is unchanged by check-ins.

**Acceptance Scenarios**:

1. **Given** a step-by-step diagram, **When** the child presses Play, **Then** it advances one step every few seconds until it ends or the child presses Pause. Under reduce motion it does not auto-advance, and the child steps through by hand.
2. **Given** a check-in, **When** the child answers, **Then** Chip reacts to right and wrong answers and the lesson score does not change.
3. **Given** the end of a rewritten lesson, **When** the tell-Chip step appears, **Then** the child picks from 2–3 options by tapping, with no typing needed.
4. **Given** a "try it" activity in the 8–11 band, **When** it opens, **Then** it shows kid wording, no more controls than are needed for the big idea, and a "Chip's hint" button.
5. **Given** a recorded narration is playing, **When** each sentence is read, **Then** that sentence is highlighted, as it already is for device voices.

---

### User Story 5 - Hindi learners get the same easier lessons at the same time (Priority: P1)

Each rewritten Kids lesson is released with its Hindi text, Hindi word cards and re-recorded Hindi narration in the same release. A Hindi learner never sees an easier English lesson next to an old Hindi one.

**Why this priority**: Hindi is an approved language. Any English change makes the Hindi review out of date and fails the release check, so English cannot ship alone.

**Independent Test**: For the pilot lesson, run the release check with both languages updated and approved (it passes). Then run it with English updated and Hindi left stale (it fails).

**Acceptance Scenarios**:

1. **Given** a rewritten lesson, **When** it is released, **Then** its Hindi lesson text, 12+ additions, word cards and changed narration tracks are in the same release and approved.
2. **Given** a narration section whose text did not change, **When** recordings are refreshed, **Then** that track is not re-recorded.

---

### User Story 6 - The owner can see that it worked and that it stays easy (Priority: P3)

A content check reports, for every Kids lesson:
- reading grade per band;
- longest sentence;
- new words per card;
- bold terms with no word card.

It starts as a warning and becomes a release blocker once all six lessons pass. The owner also compares "too hard" feedback before and after each lesson ships, and records the kid-test results, with no names.

**Why this priority**: Without a check, later edits drift back to adult wording. Without measurement, we can't tell whether the rewrite helped.

**Independent Test**: Run the content check on an unchanged lesson and on a rewritten lesson. It warns on the first and passes the second.

**Acceptance Scenarios**:

1. **Given** the check is in warning mode, **When** a Kids lesson breaks a rule, **Then** the release check prints the rule, the lesson and the card, and still passes.
2. **Given** all six lessons pass and the check is switched to blocking, **When** a Kids lesson breaks a rule, **Then** the release check fails.

---

### Edge Cases

- **Skipped band choice:** the child skips or closes the chooser, so 8–11 is used. A learner who chose Kids before this feature shipped also gets 8–11, and keeps their audience mode and progress.
- **Band change mid-lesson:** progress and quiz state are kept. If the child has already answered the 12+ quiz question and switches to 8–11, that question no longer counts toward the score.
- **Layer reads like a patch:** that card uses a separately written 12+ text instead (Option B fallback), and both texts still follow the writing rules for their band.
- **Bold word inside a word card:** card text is plain, and cards do not open other cards.
- **Tiny screens:** on a 320 px-wide screen the word card fits inside the screen and never covers its own close button.
- **Missing visual:** if a word's animation fails to load, the card shows its text and listen button, with no broken image.
- **Hindi lesson missing a 12+ addition:** the release check fails. Hindi does not fall back to the English 12+ text.
- **Quiz answers cut by the rewrite:** any quiz question whose answer is no longer in the core text (or in the 12+ text, for the extra question) fails the content check.
- **Unrewritten lessons:** during the rollout, lessons that are not yet rewritten behave as today in both bands. They get no 12+ additions and no extra quiz question.

## Requirements *(mandatory)*

### Functional Requirements

**Writing and structure**

- **FR-001**: The project MUST have a Kids writing guide. It sets these targets:
  - 8–11 text: reading grade 3.5 or lower, average sentence 12 words or fewer, longest sentence 18 words;
  - 12–14 text: reading grade 6 or lower;
  - at most 2 new words per card;
  - one big-idea line per card;
  - a short list of banned adult phrases.
- **FR-002**: Each rewritten Kids lesson MUST be made of cards of about 60–80 words of core text. Each card follows the same order: big idea, then picture or animation, then short text, then an optional check-in.
- **FR-003**: Facts the story does not need, such as names, dates, anatomy and alternate names, MUST move into a "Want to know more?" box or be cut.
- **FR-004**: Each rewritten lesson MUST end with a "3 things you learned" recap before the mini-quiz.

**Age bands**

- **FR-005**: The Kids journey MUST offer two age bands, 8–11 and 12–14, when the Kids journey is chosen and later in Settings. The default is 8–11.
- **FR-006**: The age band MUST be stored only on the learner's device, next to the saved audience mode. It MUST NOT be sent to the server, included in feedback or written to logs.
- **FR-007**: Lesson content MUST support marking any part of a card as a "12+" addition, shown only in the 12–14 band. A card MAY instead carry a complete separate 12+ text.
- **FR-008**: In the 12–14 band, "Want to know more?" MUST start open, and the quiz MUST add one question drawn from the 12+ additions. In 8–11 it starts closed and has no extra question.
- **FR-009**: Changing the band MUST update the open lesson without losing progress.

**Word cards (Jargon Buster)**

- **FR-010**: Every bold term in a rewritten Kids lesson MUST open a word card in place. The card has a one-line explanation, a picture or a short (2–3 second) looping animation, and a listen control that follows mute (FR-UI-19).
- **FR-011**: Word-card animations MUST be movement and fading only, with no flashing and no sound on their own. Each animation MUST show as a still under reduce motion and load only when its card opens.
- **FR-012**: Word cards MUST open and close by touch and keyboard (including Escape), return focus to the word, and be announced by screen readers as buttons. Tap targets are at least 44×44 px and text contrast is at least 4.5:1 in light and dark (DC-11).
- **FR-013**: The end-of-section term list MUST stay as a "Words you learned" review.

**Other aids**

- **FR-014**: Step-by-step diagrams in Kids lessons MUST offer Play and Pause. Under reduce motion they MUST NOT auto-advance.
- **FR-015**: Rewritten cards MAY have one tap-to-answer check-in with Chip's reaction. Check-ins MUST NOT change the lesson score.
- **FR-016**: The Kids teach-back MUST be a tap-to-pick choice of 2–3 options.
- **FR-017**: In the 8–11 band, "try it" activities MUST use kid wording, show only the controls the big idea needs, and offer a "Chip's hint". Their underlying behaviour is unchanged.
- **FR-018**: While recorded narration plays, the sentence being read MUST be highlighted, as it already is for device voices.

**Languages, assets and checks**

- **FR-019**: Each rewritten lesson MUST ship with matching approved Hindi in the same release. That includes the core text, 12+ additions, word cards and re-recorded narration for changed sections only.
- **FR-020**: Every new picture and animation MUST be registered with its source and owner approval in the asset register, and pass the existing asset check.
- **FR-021**: New visuals MUST stay within the existing page-weight budget.
- **FR-022**: The release check MUST report for each Kids lesson and band:
  - reading grade;
  - longest sentence;
  - new words per card;
  - bold terms with no word card;
  - quiz questions whose answer is no longer in the lesson.
  It starts as a warning and becomes blocking once all six lessons pass.
- **FR-023**: Lessons that are not yet rewritten MUST keep working unchanged in both bands.

### Key Entities

- **Age band**: the learner's chosen reading level, 8–11 or 12–14. It lives on the device only and defaults to 8–11.
- **Lesson card**: one bite of a Kids lesson, with a big idea, a visual, the core text, optional 12+ additions or a separate 12+ text, an optional "Want to know more?" box and an optional check-in.
- **Word card**: a term's simple explanation, its visual (still and animated), and its narration. It exists for each approved language.
- **Check-in**: one tap-to-answer question attached to a card, with two or three options and Chip's reactions. It is not scored.
- **Kids content report**: the output of the content check for each lesson and band.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All six Kids lessons meet the reading targets in FR-001 for both bands, with 0 bold terms missing a word card.
- **SC-002**: In kid tests of each rewritten lesson, at least 4 of 5 children in each band can say the big idea back in their own words. This includes at least one child aged 10–11 in the 8–11 group.
- **SC-003**: In the 4 weeks after each lesson ships, Kids "too hard" or "confusing" feedback for that lesson is lower than in the 4 weeks before. This comes from existing feedback records only.
- **SC-004**: No 10–11-year-old in the pilot kid test describes the 8–11 text as "for little kids". This checks the risk that 8–11 is too wide a band.
- **SC-005**: A word card opens in under half a second after a tap on a typical school device.
- **SC-006**: There are 0 accessibility regressions. Every new control meets the 44 px and 4.5:1 rules, and all motion respects reduce motion.
- **SC-007**: The Hindi release check stays green for every release in the rollout.

## Assumptions

- **Scope and rollout:** this feature covers all six Kids lessons. It is delivered pilot-first:
  - lesson 3 (neural networks, the hardest) is rewritten and kid-tested first, as a go/no-go gate;
  - then the reusable aids (word cards, stepper Play, check-ins) are built;
  - then the remaining lessons ship one per release, in the order 1, 4, 7, 2, 5.
- **Hindi:** a Hindi reviewer can re-approve each lesson in step with English. If not, rollout pauses rather than changing how the release check treats approved languages.
- **Kid tests:** the owner runs them with a parent present, with no audio or video recording and no names stored. Results go in a checklist under this feature's folder.
- **Art:** the art follows SPEC-011's rule: owner-approved art generated on the project's own Vertex AI, or hand-made SVG, each recorded in the asset register. About 25 word animations are expected.
- **Out of scope:**
  - Standard and Plain English lessons;
  - lesson topics and order;
  - Chip's Trail;
  - any new tracking of learners.
  Plain English may get the same treatment later, as a separate decision.
- **Existing parts reused:** concept pictures, the step-by-step diagram, the quiz, teach-back, the glossary and the reduce-motion handling are all reused. No new third-party packages are expected.
- **Spec amendments:** the age band amends SPEC FR-UI-16, which adds the band choice and raises the saved-settings version. The lesson card, 12+ marker, word-card and check-in fields change the §6 lesson data contract and the Hindi translation files.
