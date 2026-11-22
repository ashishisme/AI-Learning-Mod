---
description: "Task list for SPEC-012 Easier Kids Lessons"
---

# Tasks: Easier Kids Lessons

**Input**: Design documents from `specs/012-kids-content-easing/`: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included. SPEC.md §12 needs one acceptance check per new requirement, and the constitution's three-tier gate applies.

**Organization**: Grouped by user story (spec.md US1–US6), so each story can be built and tested on its own.

**Pilot rule**: Stories US1–US5 deliver **lesson 3 only** (`3-neuralnetworks`). Rolling out the other lessons is Phase 9.

**Release rule**: any change to `public-content/lessons/3-neuralnetworks.junior.json` stales the Hindi ledger. US1, US2 and US5 content therefore ships in **one** release (see Dependencies).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on unfinished tasks).
- **[Story]**: the user story the task belongs to (US1–US6).

---

## Phase 1: Setup (shared groundwork)

**Purpose**: the spec amendment and the writing rules that every later task follows.

- [X] T001 Amend `spec/SPEC.md` following §12. Do it as its own commit, `spec: add FR-CNT-08..09, FR-UI-20..25, amend FR-UI-16 — easier Kids lessons`, with no code in it. Steps:
  - bump to version 2.11.0;
  - add **FR-CNT-08**, Kids writing rules and content check. Use SPEC-012 FR-001 and FR-022, worded so that the quiz-answer item is a warning only (research R8);
  - add **FR-CNT-09**, the banded Kids lesson format, from FR-002–004, FR-007, FR-008 and FR-019;
  - amend **FR-UI-16** to add the age band, browser-only, default 8–11, store v2 (FR-005, FR-006, FR-009);
  - add the UI requirements:
    - **FR-UI-20**: banded rendering and unrewritten lessons unchanged (FR-007–FR-009, FR-023);
    - **FR-UI-21**: word cards (FR-010–FR-013);
    - **FR-UI-22**: stepper Play (FR-014);
    - **FR-UI-23**: check-ins, recap and teach-back (FR-004, FR-015, FR-016);
    - **FR-UI-24**: widget wording by band (FR-017);
    - **FR-UI-25**: read-along for recordings (FR-018);
  - add one AC per requirement, AC-60 onward, naming the test files from this list;
  - get the owner's approval of the wording before committing.
- [X] T002 [P] Write `content/kids-writing-guide.md`, the FR-001 rules:
  - 8–11 core text: FK ≤ 3.5, average sentence ≤ 12 words, longest ≤ 18;
  - 12–14 text: FK ≤ 6;
  - at most 2 bold new words per section;
  - the card pattern: big idea, then visual, then 2–3 short sentences, then an optional check-in;
  - tone rules with no baby talk;
  - what to move to "Want to know more?";
  - the banned-phrase list: "threshold", "in real time", "weighted sum" and others;
  - how to write `teen.add` versus `teen.body` (contracts/lesson-format.md).
- [ ] T003 [P] Read the existing Kids feedback records in the admin console (junior mode, per lesson). Write the "too hard / confusing" baseline counts for the 4 weeks before the pilot into `specs/012-kids-content-easing/checklists/feedback-baseline.md`, with no message text copied.
- [X] T004 [P] Create `specs/012-kids-content-easing/checklists/kid-tests.md` as a template. It needs:
  - a table per lesson and band: child number, age (no name), band, big idea in their words, pass/fail, and an "is it for little kids?" yes/no;
  - the pass rule: ≥ 4 of 5 per band, at least one aged 10–11 in 8–11.

---

## Phase 2: Foundational (blocks every story)

**Purpose**: the lesson format fields, parity, and the content check in warning mode. Nothing user-visible changes yet.

**⚠️ CRITICAL**: finish this phase before starting any story phase.

- [X] T005 [P] Add the optional SPEC-012 fields to the TypeScript types in `web/src/api.ts`:
  - on `AdaptiveLessonPayload`: `bands?: true`, `recap?: string[]`, and `miniQuiz[].band?: "12-14"`;
  - on `AdaptiveSection`: `bigIdea?: string`, `more?: { title?: string; bodyMarkdown: string }`, `teen?: { add?: string; body?: string; jargonBuster?: {term; simpleExplanation; visual?}[] }` and `checkIn?: ChoiceQuestion`;
  - on each `jargonBuster` item: `visual?: string`.

  Follow data-model.md §2 exactly.
- [X] T006 [P] Add the data-model §4 paths to `Translatable[KindAdaptive]` in `internal/i18n/parity.go`: `recap[]`, `sections[].bigIdea`, `sections[].more.title`, `sections[].more.bodyMarkdown`, `sections[].teen.add`, `sections[].teen.body`, `sections[].teen.jargonBuster[].term`, `sections[].teen.jargonBuster[].simpleExplanation`, `sections[].checkIn.question`, `sections[].checkIn.options[]`, `sections[].checkIn.explanation`. Leave `bands`, `miniQuiz[].band`, `jargonBuster[].visual` and `checkIn.correctIndex` out, so they must equal the English values.
- [X] T007 [P] Add parity tests to `internal/i18n/parity_test.go`:
  - a translated `teen.add` passes;
  - a changed `visual` fails;
  - a missing `teen` object on one side fails;
  - a changed `miniQuiz[].band` fails.
- [X] T008 Create the `internal/readability/readability.go` package (pure Go, DC-10), with these functions:
  - `Grade(text) float64`: Flesch-Kincaid `0.39·words/sentences + 11.8·syllables/words − 15.59`, with vowel-group syllables and a trailing `e` dropped, to match `scratchpad/readability.py`;
  - `Sentences(text) []string`;
  - `BoldTerms(markdown) []string`;
  - `StripMarkdown(md) string`.
- [X] T009 [P] Write `internal/readability/readability_test.go`. It covers:
  - known FK values for fixed sentences;
  - sentence splitting on `. ! ?` and line breaks;
  - bold extraction, including `**IF / THEN**`;
  - a check that grades for the current `public-content/lessons/3-neuralnetworks.junior.json` are within ±0.2 of the plan baseline 5.9.
- [X] T010 Add `internal/readability/kids.go` with `CheckKidsLesson(raw []byte) (Report, []Finding)`. It parses a junior lesson into a local struct and computes, per band:
  - 8–11: core text, which is `bigIdea` + `chipQuote` + `analogy.description` + `bodyMarkdown`;
  - 12–14: core text plus `teen.add`, or with `teen.body` in place of `bodyMarkdown`.

  It reports `grade`, `avgSentence`, `longest`, `maxNewWords` and `missingTerms`, and emits findings for the rules `grade`, `avg-sentence`, `long-sentence`, `new-words`, `missing-term`, `missing-visual` and `quiz-answer`. Every finding has severity **WARN** for now; blocking comes in US6. Thresholds and output follow contracts/kids-content-check.md.
- [X] T011 Hook the check into `verify` in `cmd/ingest/main.go`, after `ingest.VerifyContent`:
  - for each `public-content/lessons/*.junior.json`, run `readability.CheckKidsLesson`;
  - print `kids-check: <WARN|FAIL> <lesson>.junior <band> section=<id> rule=<rule> <detail>` per finding, and the per-band summary line, to the `out` writer;
  - set exit 1 only for FAIL.
- [X] T012 Run `go run ./cmd/ingest -verify -audio=false`. Confirm exit 0 and WARN lines for all six lessons, with summary grades within ±0.2 of the plan table (1: 5.3, 2: 5.1, 3: 5.9, 4: 4.7, 5: 5.8, 7: 5.1). Add a test for the hook in `cmd/ingest/kids_check_test.go` that writes a temp junior file and asserts the line format.

**Checkpoint**: the format is defined, parity knows the new fields, and the check prints baselines. Stories can start.

---

## Phase 3: User Story 1 - A younger child can read and follow a lesson (Priority: P1) 🎯 MVP

**Goal**: lesson 3 rewritten to the 8–11 rules, with a big idea, a visual first, "Want to know more?" and a recap.

**Independent test**: the reading check on lesson 3 shows an 8–11 grade ≤ 3.5, and the lesson shows a big idea and visual first on every card, a closed "Want to know more?", and the recap before the quiz.

### Tests for User Story 1

- [X] T013 [P] [US1] Write `web/tests/kids-aids.spec.ts` (recap and big-idea parts) against a fixture banded lesson. Put the fixture in `web/tests/fixtures/` and serve it through route interception, following the existing fixtures pattern. Assert:
  - every section shows `bigIdea` before the body, and a visual above the text;
  - `more` is closed and opens on one tap;
  - `lesson-recap` shows 3 items after the last section and before the mini-quiz.

### Implementation for User Story 1

- [X] T014 [US1] In `web/src/components/AdaptiveLessonView.tsx`, for junior lessons, render each section in this order:
  1. `bigIdea`, as a Chip line;
  2. the visual (`diagram`, or the first jargon `visual`) **above** the body;
  3. the body;
  4. `more` as a closed disclosure. Use `<details>` or a button with `aria-expanded`, and give the toggle a min 44×44 px target.

  Also render `recap` as a `data-testid="lesson-recap"` block before `miniQuiz`. Add the UI strings `adaptive.bigIdea`, `adaptive.wantToKnowMore` and `adaptive.recapTitle` to `web/src/i18n/en.json` and `web/src/i18n/hi.json`.
- [X] T015 [US1] Include `bigIdea` in the narrated core text in `internal/narration/text.go`, placing it after `chipQuote`. Mirror this in `web/src/services/narrationText.ts` `sectionNarration`, so device voice and recordings read the same text. Update `internal/narration/text_test.go`.
- [X] T016 [US1] Rewrite `public-content/lessons/3-neuralnetworks.junior.json` using `content/kids-writing-guide.md`:
  - split it into cards of about 60–80 words of core text, each with `bigIdea`;
  - teach "a neuron is a tiny yes/no switch that listens to clues";
  - move or cut dendrites, nucleus, axon, Rosenblatt and 1957 into `more` or remove them;
  - bold at most 2 terms per section, each with a `jargonBuster` entry;
  - add a 3-item `recap`;
  - keep every existing `miniQuiz` question answerable, or rewrite it;
  - **do not set `bands: true` yet** (US6 does).
- [X] T017 [US1] Run `go run ./cmd/ingest -verify -audio=false`. Iterate on T016 until lesson 3's 8–11 summary shows `grade ≤ 3.5`, `avgSentence ≤ 12`, `longest ≤ 18`, `maxNewWords ≤ 2` and `missingTerms = 0`.
- [X] T018 [US1] Update `web/tests/lesson-3-neuralnetworks.spec.ts` for the rewritten Kids text. Do not weaken any Standard or Plain English assertions.

**Checkpoint**: lesson 3 reads at grade ≤ 3.5 in English. It must not be released until US5 (Hindi) is done.

---

## Phase 4: User Story 2 - A child picks an age band and the lesson adjusts (Priority: P1)

**Goal**: the 8–11 / 12–14 choice, which reveals 12+ parts, opens "more" and adds one quiz question, and which never leaves the device.

**Independent test**: in a fresh browser, choosing Kids → 12–14 shows the 12+ parts and the extra question. Switching to 8–11 hides them. No request contains the band.

### Tests for User Story 2

- [X] T019 [P] [US2] Write `web/tests/kids-bands.spec.ts`, covering contracts/ui-behaviour.md "Age band". Assert:
  - after Kids is chosen, the chooser shows `age-band-8-11` and `age-band-12-14`, and Skip leaves 8–11;
  - 12–14 shows `teen.add` text, `teen.body` replacement text, `teen.jargonBuster` terms, `more` open by default, and one extra quiz question shown last;
  - 8–11 shows none of these;
  - changing the band in Settings updates the open lesson, and quiz position and progress are kept;
  - **every** request URL, header and body during a lesson and a feedback submit contains neither `ageBand`, `8-11` nor `12-14`. Capture these with `page.on('request')`;
  - a v1 saved store `{mode:"junior",hasChosenJourney:true}` migrates to `ageBand:"8-11"` with mode kept;
  - a lesson without `bands: true` renders the same in both bands (FR-023).

### Implementation for User Story 2

- [X] T020 [US2] In `web/src/store.ts`, change the `ai-foundations-audience-mode` store:
  - add `ageBand: "8-11" | "12-14"` (default `"8-11"`) and a `setAgeBand` action;
  - raise `version` from 1 to **2**;
  - extend `migrate`: version < 1 applies the existing rule and then sets `ageBand: "8-11"`; version 1 keeps `mode` and `hasChosenJourney` and sets `ageBand: "8-11"`.
- [X] T021 [US2] Add a band step in `web/src/components/JourneyChooser.tsx` after the learner picks Kids. It has two buttons, "I'm 8–11" (`age-band-8-11`) and "I'm 12–14" (`age-band-12-14`), with min 44×44 px targets and 4.5:1 contrast in both themes, plus Skip, which keeps 8–11. Add the strings to `web/src/i18n/en.json` and `web/src/i18n/hi.json`.
- [X] T022 [P] [US2] Add the band setting to `web/src/components/SettingsModal.tsx`, shown only when `mode === "junior"`, and to the Voice Studio menu in `web/src/components/VoicePersonaSelector.tsx` with the same rule. Both use `setAgeBand`.
- [X] T023 [US2] Add band filtering in `web/src/components/AdaptiveLessonView.tsx`. It applies only when `payload.bands === true` and the mode is junior:
  - 12–14: append `teen.add` after the body, or use `teen.body` in place of the body; merge `teen.jargonBuster` into the section's terms; open `more` by default; show `miniQuiz` items with `band:"12-14"`; force nothing on widget `scaffold`;
  - 8–11: hide all of the above, and force widget `scaffold: "guided"`.

  Keep quiz progress keyed by the core indexes, so that band items, which are always last, don't shift them.
- [X] T024 [US2] Add the `section-<id>-teen` narration track. In `internal/narration/text.go` `Tracks`, emit `<lesson>/junior/section-<id>-teen` with the text of `teen.add` or `teen.body` when either is present. In `web/src/components/AdaptiveLessonView.tsx`, in 12–14, play the teen track after the core track. With `teen.body`, play only the teen track. Add cases to `internal/narration/text_test.go`.
- [X] T025 [US2] Add the 12+ layer to `public-content/lessons/3-neuralnetworks.junior.json`:
  - `teen.add` per card, for the real terms ("weights", "layers") and a fuller explanation;
  - `teen.body` only where an addition reads like a patch, and noted in the commit message;
  - a `teen.jargonBuster` for any term bold only in teen text;
  - one `band:"12-14"` quiz item, last in `miniQuiz`.

  Iterate until the 12–14 summary from `go run ./cmd/ingest -verify -audio=false` shows `grade ≤ 6.0`.

**Checkpoint**: both bands work on lesson 3 in English, and the band never leaves the device.

---

## Phase 5: User Story 5 - Hindi learners get the same easier lessons at the same time (Priority: P1)

**Goal**: lesson 3's Hindi Kids text, 12+ parts, word entries and recordings ship with the English, approved.

**Independent test**: with English changed and Hindi stale, `go run ./cmd/ingest -verify` fails. After the Hindi update and re-approval, it passes.

- [X] T026 [US5] Write a Go test in `cmd/ingest/kids_check_test.go` that copies the content into a temp dir, changes an English junior section, and asserts that `verify` returns 1 with a ledger message for `hi`. This locks in the lockstep gate.
- [X] T027 [US5] Translate the rewritten lesson into `public-content/lang/hi/lessons/3-neuralnetworks.junior.json`:
  - the same section ids and order;
  - the same `teen` presence per section;
  - the same `checkIn` option counts and `band` items;
  - `visual` values identical to English;
  - Hindi term first with the English in brackets at first use (SPEC-009 FR-008), following `content/glossary/hi.json`.

  Add any new terms to `content/glossary/hi.json`.
- [X] T028 [US5] Run `go run ./cmd/ingest -verify -audio=false` and fix every parity problem for `hi`. Then ask the owner and Hindi reviewer to approve. **Do not approve on their behalf.** The approval command is `go run ./cmd/review -lang hi -reviewer "<reviewer>" -approve public-content/lang/hi/lessons/3-neuralnetworks.junior.json`, plus `content/glossary/hi.json` if it changed.
- [X] T029 [US5] Re-record the changed Hindi tracks with `go run ./cmd/narrate -lang hi`. Hash-based skipping re-records only the changed `section-*` and new `section-*-teen` tracks, about 36 MP3s. Confirm that unchanged tracks were skipped, and that `go run ./cmd/ingest -verify` (with audio) exits 0. This needs GCP auth.
- [ ] T030 [US5] Extend `web/tests/narration-hi.spec.ts`: in Hindi Kids 12–14, the teen recording plays after the core recording for a section with `teen.add`.

**Checkpoint (MVP release gate)**: US1 + US2 + US5 on lesson 3 pass every gate. Next comes the kid test (T046) and the owner's go/no-go.

---

## Phase 6: User Story 3 - A child taps a hard word and sees it explained (Priority: P2)

**Goal**: bold words open in-place word cards with an explanation, an animated SVG and a listen button.

**Independent test**: every bold word in lesson 3 opens a card. Keyboard, Escape, reduce motion, mute and screen reader all behave as in contracts/ui-behaviour.md.

### Tests for User Story 3

- [X] T031 [P] [US3] Write `web/tests/kids-word-cards.spec.ts`. Assert:
  - each bold term is `button[data-testid="word-<term>"]` with `aria-haspopup="dialog"`, `aria-expanded`, and a bounding box ≥ 44×44 px;
  - Enter opens `role="dialog"` with the explanation, an `img` with alt from `adaptive.wordPicture`, and a listen control;
  - Escape, close and outside-tap all close it, and focus returns to the word;
  - only one card is open at a time;
  - at a 320 px viewport the card is fully inside the viewport;
  - with `isMuted:true` the listen control is the FR-UI-19 muted control, and speak is called 0 times;
  - with `reducedMotion: 'reduce'` the page loads;
  - an image that fails to load leaves the text and listen button and no broken image;
  - contrast is ≥ 4.5:1 in light and dark, using the method in `web/tests/redesign-a11y.spec.ts`.

### Implementation for User Story 3

- [X] T032 [US3] Create `web/src/components/WordCard.tsx`, a non-modal dialog anchored to the word button:
  - it has explanation, image, and listen;
  - the listen button reuses the glossary pronounce path through `speechService.speak`, which already honours mute;
  - Escape, close and outside click close it, and focus returns to the trigger;
  - its position is clamped to the viewport;
  - only one card is open at a time, via a shared open-id state in the component's parent;
  - the `<img>` is rendered only while open, from `/brand/words/<visual>.svg`, with an `onError` handler that hides it.

  Add `adaptive.wordPicture` ("Picture: {term}") and `adaptive.closeWord` to `web/src/i18n/en.json` and `web/src/i18n/hi.json`.
- [X] T033 [US3] Make bold words tappable in Kids lessons. In `web/src/components/AdaptiveLessonView.tsx`, when the lesson is junior, pass a custom `strong` renderer to the section's `MarkdownBlock`. It renders a `WordCard` trigger when the bold text matches, case-insensitively, a term in the section's visible terms (core, plus teen in 12–14), and plain `<strong>` otherwise. Keep the end-of-section list, retitled "Words you learned" (`adaptive.wordsYouLearned`).
- [X] T034 [P] [US3] Create the lesson-3 word art as `web/public/brand/words/<key>.svg`, one per lesson-3 term with a `visual`. Each file:
  - is 2–6 KB, with no text in the art;
  - has a 2–3 s loop using CSS `@keyframes` with only `transform` and `opacity`, and no flashing;
  - has `@media (prefers-reduced-motion: reduce) { * { animation: none } }` showing a meaningful still frame.

  Put the masters in `design/brand/source/words/`. The source is hand-made SVG, or a Gemini draft on the project's Vertex AI (us-central1) traced to SVG, with the owner approving each one.
- [X] T035 (owner approved all nine lesson-3 pictures on 2026-11-13: six word pictures and three scenes) [US3] Register each new SVG in `design/brand/asset-register.json`, following the `app-mark` entry pattern: `status`, `trademarkScreen`, `creator` (with model, version, prompt and date if AI-drafted), `rightsEvidence`, `releaseFiles` with sha256, and `sourceMaster`. Run `go run ./cmd/assetcheck` until it passes. Set `status:"approved"` only after the owner approves.
- [X] T036 [US3] Add `visual` keys to the lesson-3 `jargonBuster` entries in `public-content/lessons/3-neuralnetworks.junior.json` and `public-content/lang/hi/lessons/3-neuralnetworks.junior.json`, with identical values. In `internal/readability/kids.go`, make the `missing-visual` rule check both `web/public/brand/words/<key>.svg` and the register entry. This change re-stales the Hindi ledger, so re-run T028's approval request. Also add `COPY design/brand/asset-register.json ./design/brand/asset-register.json` and `COPY web/public/brand/words ./web/public/brand/words` before the `ingest -verify` step in the builder stage of `Dockerfile`. Without them, the image build's verify step can't see the word pictures and fails with `missing-visual`.

**Checkpoint**: word cards work on lesson 3, accessibly, in both languages.

---

## Phase 7: User Story 4 - A child understands by watching and trying (Priority: P2)

**Goal**: stepper Play, unscored check-ins, tap-to-pick teach-back, band-aware widgets, and read-along for recordings.

**Independent test**: in lesson 3, the stepper plays and pauses, a check-in answered right and wrong leaves the score unchanged, teach-back is tap-only, and the recording highlights sentences.

### Tests for User Story 4

- [X] T037 [P] [US4] Extend `web/tests/kids-aids.spec.ts`. Assert:
  - `stepper-play` advances one step about every 3 s and `stepper-pause` stops it;
  - under `reducedMotion:'reduce'`, `stepper-play` is absent and Next still works;
  - `check-in-<sectionId>` answered right and wrong shows Chip's reaction, and saved progress/score localStorage is byte-identical before and after;
  - teach-back has 2–3 tap options and no text input;
  - in 8–11 a widget renders guided with a "Chip's hint" button;
  - while a mocked recording plays, exactly one sentence has `data-reading="true"` and it moves forward as `currentTime` advances.

### Implementation for User Story 4

- [X] T038 [P] [US4] Add Play and Pause to `web/src/components/StepperDiagram.tsx` (`stepper-play`, `stepper-pause`):
  - it uses `setInterval` at 3000 ms and stops at the last step;
  - the interval is cleared on unmount and on Pause;
  - Play is hidden when `window.matchMedia('(prefers-reduced-motion: reduce)').matches`;
  - targets are ≥ 44×44 px;
  - the strings go in both i18n files.
- [X] T039 [P] [US4] Render `section.checkIn` with the existing `ChoiceCard` in `web/src/components/AdaptiveLessonView.tsx` (`data-testid="check-in-<sectionId>"`), with Chip's reaction. Do not write its result to the progress or quiz stores.
- [X] T040 [US4] Add read-along for recordings:
  - in `web/src/services/speechService.ts` `playRecording`, accept an `onSentence(index)` callback;
  - on `timeupdate`, compute the index from `currentTime / duration` against the cumulative character share of each sentence, using the same sentence split as device-voice highlighting;
  - in `web/src/components/AdaptiveLessonView.tsx`, set `data-reading="true"` on that sentence (research R7).
- [ ] T041 [US4] Write the lesson-3 content for this story in English and Hindi (`public-content/lessons/3-neuralnetworks.junior.json`, `public-content/lang/hi/lessons/3-neuralnetworks.junior.json`):
  - one `checkIn` per card where it helps;
  - teach-back with 2–3 options;
  - widget `instruction`, `hints` and `successMessage` in kid wording, with a "Chip's hint" hint.

  Re-run parity, then ask the owner and reviewer to re-approve (T028 process), and re-record the changed tracks (T029 process).

**Checkpoint**: all lesson aids work on lesson 3.

---

## Phase 8: User Story 6 - The owner can see that it worked and that it stays easy (Priority: P3)

**Goal**: rewritten lessons are blocked from drifting back, and the results are recorded.

**Independent test**: an unchanged lesson only warns. Lesson 3 with `bands: true` passes. Adding a 25-word sentence to lesson 3 fails verify with `rule=long-sentence`.

- [X] T042 [US6] In `internal/readability/kids.go`:
  - make the severity FAIL for every rule except `quiz-answer` when the lesson has `bands: true`, and WARN otherwise, following the contracts/kids-content-check.md table;
  - keep `missing-visual` always FAIL;
  - add the `structure` rules from data-model.md §2:
    - `teen.add` and `teen.body` never both set;
    - every `band:"12-14"` quiz item after all core items;
    - at most one band item;
    - `recap` of exactly 3;
    - every section has `bigIdea` and a visual;
    - every bold in teen text has a core or teen term.
- [X] T043 [P] [US6] Extend `internal/readability/kids_test.go` with one fixture per rule, each in both severity modes, plus a fixture showing that `quiz-answer` stays WARN under `bands: true`.
- [X] T044 [US6] Set `"bands": true` in `public-content/lessons/3-neuralnetworks.junior.json` and `public-content/lang/hi/lessons/3-neuralnetworks.junior.json`. Run `go run ./cmd/ingest -verify -audio=false` and confirm exit 0. Temporarily add a 25-word sentence and confirm exit 1 with `rule=long-sentence`, then revert it. Re-approve Hindi (T028 process).
- [ ] T045 [US6] After release, record lesson 3's 4-week "too hard / confusing" count next to the T003 baseline in `specs/012-kids-content-easing/checklists/feedback-baseline.md` (SC-003).
- [ ] T046 [US6] Kid test for lesson 3, run by the owner with a parent present and no recording. Do 3–5 children per band, including at least one aged 10–11. Fill in `specs/012-kids-content-easing/checklists/kid-tests.md`. **Owner go/no-go** for Phase 9 rests on SC-002 and SC-004.

**Checkpoint**: lesson 3 is locked at its reading level, and the pilot results are recorded.

---

## Phase 9: Rollout, one lesson per release (repeats US1–US5 content work)

Each lesson is its own release. Every task repeats T016/T017 (core text), T025 (12+), T027–T029 (Hindi, approval, recordings), T034–T036 (word art, register, visuals), T041 (check-ins, teach-back, widgets) and T044 (`bands: true`), then T046 (kid test).

- [ ] T047 Lesson 1. Edit `public-content/lessons/1-intro.junior.json` and `public-content/lang/hi/lessons/1-intro.junior.json`:
  - keep "AI learns from examples" and one idea of the Turing Test;
  - move Narrow/General AI and top-down/bottom-up into `more`, or into `teen.add` for 12–14;
  - update `web/tests/lesson.spec.ts` and any lesson-1 Kids assertions.
- [ ] T048 Lesson 4. Edit `public-content/lessons/4-computervision.junior.json` and `public-content/lang/hi/lessons/4-computervision.junior.json`:
  - drop the pixel numbers 0/128/255 from the core text;
  - show the layers through the stepper Play;
  - update `web/tests/lesson-4-computervision.spec.ts`.
- [ ] T049 Lesson 7. Edit `public-content/lessons/7-ethics.junior.json` and `public-content/lang/hi/lessons/7-ethics.junior.json`:
  - give fairness, inclusion, privacy and safety word cards;
  - remove "tune the dials" and "balance the data" phrasing;
  - update `web/tests/lesson-7-ethics.spec.ts`.
- [ ] T050 Lesson 2. Edit `public-content/lessons/2-symbolic.junior.json` and `public-content/lang/hi/lessons/2-symbolic.junior.json`:
  - give expert system, symbols and IF / THEN word cards;
  - update `web/tests/lesson-2-symbolic.spec.ts`.
- [ ] T051 Lesson 5. Edit `public-content/lessons/5-nlp.junior.json` and `public-content/lang/hi/lessons/5-nlp.junior.json`:
  - shorten the sentences, which average 11.7 words today, to the 8–11 target;
  - update `web/tests/lesson-5-nlp.spec.ts`.

---

## Phase 10: Polish and cross-cutting

- [ ] T052 [P] Update `spec/ACCEPTANCE.md` rows AC-60 onward from T001 to PASS, each with its test file, as each requirement's tests pass.
- [ ] T053 [P] Write the release perf note in `specs/012-kids-content-easing/checklists/perf-review.md`. Compare English home first-load weight with the previous release and expect +0 KB, because word art loads in lessons on tap. Include lesson-3 load time against SPEC-009 SC-007's 10% target and the owner's keep-or-trim decision (NFR-OPS-05).
- [ ] T054 Run the full constitution gate: `go test ./...`, `cd web && npx playwright test`, `cd web && npm run build`, `go run ./cmd/ingest -verify`, `go run ./cmd/assetcheck`. All must pass before each release tag.
- [ ] T055 [P] Run `specs/012-kids-content-easing/quickstart.md` steps 1–5 end to end, and fix any step that no longer matches.
- [ ] T056 After all six lessons have `bands: true` (SC-001), record the owner's decision on giving Plain English the same treatment in `specs/012-kids-content-easing/checklists/feedback-baseline.md`. Do not start that work in this feature.

---

## Dependencies and execution order

### Phase order

- **Setup (T001–T004):** T001 comes before any code commit. T002–T004 can run in parallel.
- **Foundational (T005–T012)** blocks every story.
- **US1 → US2 → US5** is the MVP chain on lesson 3:
  - US2 builds on US1's rewritten file (T025 edits the same JSON as T016);
  - US5 translates the final English, so it comes after T016 and T025.
- **US3 and US4** need only Foundational for their code (T031–T033, T037–T040). Their lesson-3 content tasks (T036, T041) come after US5, because they re-stale the Hindi ledger.
- **US6:** T042 and T043 can start after Foundational. T044 comes after the lesson-3 content is final (T036, T041). T046 comes after the pilot release.
- **Rollout (T047–T051)** comes after the owner's go/no-go at T046, in the order 1, 4, 7, 2, 5.
- **Polish:** T052 runs continuously. T053 and T054 run before each release tag.

### Release rule

English and Hindi changes to a lesson **always** ship together. Never tag a release with T016 or T025 done and T028 unapproved. `go run ./cmd/ingest -verify` enforces this.

### Within a story

Write the test task first and confirm it fails, then do the code tasks, then the content tasks, then verify.

## Parallel examples

```text
# Foundational, all at once:
T005 web/src/api.ts types
T006 internal/i18n/parity.go paths   (+ T007 tests)
T008 internal/readability/readability.go   (+ T009 tests)

# After Foundational, separate developers:
US3 code: T031, T032, T033   |   US4 code: T037, T038, T039, T040   |   US6 code: T042, T043

# Inside US3:
T034 word SVGs   ||   T031 Playwright spec
```

## Implementation strategy

1. **MVP:** Setup, then Foundational, then US1, US2 and US5 on lesson 3. This gives easier text in both bands and in Hindi. Release it and run the kid test (T046).
2. **Increment:** US3 (word cards), then US4 (aids), on lesson 3, released together with US6's `bands: true` lock.
3. **Owner go/no-go,** based on SC-002 and SC-004.
4. **Rollout:** Phase 9, one lesson per release, each passing the same gate.
5. **Close:** Phase 10, with SC-001 met and the Plain English decision recorded.
