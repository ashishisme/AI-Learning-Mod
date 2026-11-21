---
description: "Tasks for SPEC-014: concept clips for Detailed lessons"
---

# Tasks: Concept Clips for Detailed Lessons

**Input**: Design documents from `specs/014-detailed-concept-clips/` ([plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/clip.md](contracts/clip.md), [quickstart.md](quickstart.md))

**Tests**: Included. The project's acceptance criteria (spec/SPEC.md §10) need an automated test for each requirement, and the quickstart names `web/tests/clips.spec.ts` and the Go checks.

**Organization**:
- Tasks are grouped by user story.
- US1 is the player and the six concept clips.
- US3 is sound, which completes US1's clips, and comes before US2.
- US2 is the 13 clips for sections with no picture.
- The Release phase ships lesson by lesson; lesson 3 is the pilot (v0.11.0).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1, US2 or US3 from spec.md

## Standing rules for every task

- **Smallest complete change:** apply `ponytail`.
- **UI work:** follow `impeccable` and `ui-ux-pro-max`, but the project wins:
  - DC-11: contrast ≥ 4.5:1 in light and dark, targets ≥ 44×44;
  - no new npm packages;
  - do not run the impeccable engine.
- **Approvals:** only the owner approves, in the English ledger (`go run ./cmd/review -lang en -reviewer owner -approve <paths>`) and the Hindi ledger (`-lang hi -reviewer "owner (beta)"`). The brand-files register changes to `approved` only after the owner says so.
- **No Python:** none in the app. Scratchpad scripts are dev tooling only.
- **Git:** commit only when the owner asks, with explicit paths; never `git add .`.
- **Browser tests while the owner's app runs:** from `web/`, `npx playwright test -c playwright.tmp3001.config.ts`.

---

## Phase 1: Setup

- [X] T001 `docs(spec):` amend `spec/SPEC.md` to 2.16.0:
  - **FR-UI-28:** the clip player. Still first; Play, Pause, Previous, Next, Replay, Mute (≥ 44×44, keyboard, labelled); reduced motion has no Play; one sound at a time; mute for the visit; pause when the section leaves the screen.
  - **FR-CNT-13:** clip data and the release check, quoting [data-model.md](data-model.md):
    - "3–8 captions, each 4–35 words; Σ(words/2.5 + 1) between 10 and 30 seconds";
    - "≤ 100 KB";
    - "no letters in `<text>`";
    - "no `<script>`, no `on*=` attribute, no `href` outside the file";
    - `clip` must equal English in Hindi.
  - **AC-76 (FR-UI-28):** `web/tests/clips.spec.ts`.
  - **AC-77 (FR-CNT-13):** `internal/ingest/clips_test.go`, `internal/narration/text_test.go`.
  - **AC-78:** one sound and mute, in `web/tests/clips.spec.ts`.
  - **§0** version row.

  Add rows AC-76..AC-78 to `spec/ACCEPTANCE.md` with status "pending".
- [X] T002 [P] Add a "Clips" section to `design/brand/README.md`:
  - files: `design/brand/source/clips/<name>.svg` (master) and `web/public/brand/clips/<name>.svg` (release, same bytes);
  - drawing rules R1, R2 and R7 from [research.md](research.md);
  - the register `motion` wording "tap-to-play steps, ≤ 2 s each, still under reduced motion".

---

## Phase 2: Foundational (blocks every story)

- [X] T003 [P] Write `internal/ingest/clips.go` with `CheckClips(contentDir, brandDir string) ([]ClipReport, error)`. It walks English and translated `*.detailed.json` and, for each `diagram.type == "clip"`, fails unless:
  - `web/public/brand/clips/<clip>.svg` exists and is "≤ 100 KB";
  - the file has groups `id="s1"`…`id="sN"` with N = `len(steps)`;
  - "3–8 captions, each 4–35 words";
  - the estimated seconds Σ(words/2.5 + 1) are 10–30;
  - `alt` is non-empty;
  - no `<text>` element contains a letter (Unicode `\p{L}`);
  - there is no `<script`, no ` on…=` attribute and no `href`/`xlink:href` not starting with `#`.

  For a Hindi file, `clip` and the number of steps must equal English. Report one `ClipReport{Lesson, Section, Clip, Steps, Seconds, Bytes}` per clip.
- [X] T004 [P] Write `internal/ingest/clips_test.go`: a passing temp-dir fixture, plus one refusal case per rule in T003, including a Hindi file naming another clip and a Hindi file with fewer steps.
- [X] T005 In `cmd/ingest/main.go`, run `ingest.CheckClips(contentDir, "web/public/brand")` after the content check. Print `clip-check: <lesson> <section> clip=<name> steps=N seconds=S bytes=B` per clip, then fail on any error.
- [X] T006 [P] In `internal/narration/text.go` `Tracks`, add one track per step of every `type: "clip"` diagram in Detailed lessons:
  - key `<lessonId>/detailed/section-<sectionId>-clip-<n>` (n from 1);
  - text `Clean(step)`.

  Add a case to `internal/narration/text_test.go`, and make the adaptive struct read `diagram.type` and `diagram.steps`.
- [X] T006a [P] In `internal/api/tutor.go`, make `tutorLesson.sectionsMarkdown` add each clip step (diagram `type: "clip"`) as a line under its section heading, after the body (SPEC-014 FR-015). Add a case to `internal/api/tutor_mode_test.go`.
- [X] T007 [P] In `web/src/api.ts` `AdaptiveSection.diagram`:
  - add `clip?: string`;
  - update the type comment to `"mermaid" | "stepper" | "svg" | "scene-card" | "clip"`.
- [X] T008 [P] Add `web/src/stores/clipStore.ts`: a Zustand store with no `persist`, `{ clipsMuted: boolean, toggleClipsMuted(): void }` (R6). It must not live in the persisted `useAudioStore`.
- [X] T009 [P] Reuse the stepper's approved labels (`widget.stepPlay`, `widget.stepPause`, `widget.stepNext`, `widget.stepOf`, `widget.stepRestart`). Add only `clip.prev` ("← Previous step") and `clip.mute` ("🔇 Mute clips", a toggle with `aria-pressed`) to `web/src/i18n/en.json` and `web/src/i18n/hi.json`, with Hindi drafts for owner approval.
- [X] T010 Move the recording lookup out of `web/src/components/AudioNarrationButton.tsx` (the `recordingFor(code, trackKey, persona)` → `playRecording` / device-voice fallback, lines ~80–125) into `web/src/services/narration.ts` as `speakTrack({ text, trackKey, code, persona, speechLang, rate, onStart, onEnd, onError })`. `AudioNarrationButton` must call it with no change in behaviour. Run `web/tests/detailed-lesson.spec.ts` and `web/tests/audio*.spec.ts` to confirm.
- [X] T010a In `web/src/components/TutorPanel.tsx`, when the tutor reads an answer, claim the shared audio state with `useAudioStore.setActiveTrack('tutor-answer', true)`, and clear it on end or error. When `activeTrackId` changes away while it is reading, reset its reading state. This lets a clip know the tutor started, and lets the tutor know a clip started (FR-009, analysis C1).
- [X] T011 [P] Add the test fixture `web/tests/fixtures/clips/test-clip.svg`: 4 steps, valid under T003.

**Checkpoint**:
- `go test ./internal/ingest/ ./internal/narration/` pass.
- `go run ./cmd/ingest -verify -audio=false` passes; no clip ships yet.
- `npx tsc --noEmit -p .` passes.

---

## Phase 3: User Story 1 — Watch each lesson's key idea move (Priority: P1) 🎯 MVP

**Goal**: A Detailed learner can play, pause, step and replay the concept clip of each lesson, with captions; it stays still under reduced motion.

**Independent Test**: Lesson 3's clip alone, with tests US1-1..6 passing, released after Phase 4 adds its voice.

### Tests for User Story 1

- [X] T012 [P] [US1] Write `web/tests/clips.spec.ts` (AC-76). Mock the lesson with `**/api/lessons/<id>?*` and serve the fixture SVG with `**/brand/clips/test-clip.svg`. Tests:
  - still first: `#s1` image, "Step 1 of 4", no speech call before Play;
  - Play advances, Pause holds, Play resumes from that step;
  - Next and Previous show that step and caption;
  - Replay from the end restarts at step 1;
  - reduced motion (`page.emulateMedia({ reducedMotion: 'reduce' })`): no `clip-play`, and Next reaches every caption;
  - every control is ≥ 44×44 and reachable with Tab;
  - a Hindi lesson shows Hindi captions;
  - an image load error shows the caption list and the description;
  - the figure is described by the clip's `alt` (`aria-describedby`).

### Implementation for User Story 1

- [X] T013 [US1] Write `web/src/components/ClipPlayer.tsx` per [contracts/clip.md](contracts/clip.md) §4 and the state table in [data-model.md](data-model.md):
  - a `<figure data-testid="clip">` around `<img src="/brand/clips/<clip>.svg#sK" alt="" loading="lazy">`, remounted with `key` on every step;
  - a `figcaption` with the caption and the current step text, in an `aria-live="polite"` region;
  - the "Step k of N" counter;
  - controls `clip-play`, `clip-prev`, `clip-next`, `clip-replay`, `clip-mute`, labelled with the T009 keys;
  - in this phase, steps advance on the muted hold (words/2.5 + 1 s, at least 2 s);
  - pause when the figure leaves the screen (IntersectionObserver) and on unmount;
  - under reduced motion, no Play or Replay;
  - render `alt` as visually hidden text inside the figure, linked with `aria-describedby` from the figure, so screen readers always get the description (FR-012);
  - on image error, render the captions as an ordered list plus `alt`.

  Style it like `StepperDiagram.tsx`, with theme tokens for light and dark.
- [X] T014 [US1] In `web/src/components/AdaptiveLessonView.tsx`:
  - render `diagram.type === 'clip' && diagram.clip && diagram.steps` with `ClipPlayer`, passing `trackPrefix + 'section-' + section.id + '-clip-'` for Phase 4;
  - keep `clip` out of the Mermaid branch (`type !== 'stepper'`).
- [X] T015 [US1] Draw the pilot `perceptron-learning` clip in `design/brand/source/clips/perceptron-learning.svg` and copy it to `web/public/brand/clips/perceptron-learning.svg`:
  - 5 steps, as in the [contracts/clip.md](contracts/clip.md) example;
  - fruit icons on a grid, a line tilting after each mistake, weight numbers only;
  - `viewBox="0 0 320 180"`, a light panel, no words.

  Add a register entry in `design/brand/asset-register.json` with status `"proposed"` and its sha256.
- [X] T016 [US1] In `public-content/lessons/3-neuralnetworks.detailed.json`, section `perceptron-learning`, replace the stepper `diagram` with the clip:
  - `type: "clip"`, `clip: "perceptron-learning"`;
  - `caption`, an `alt` that says what it teaches, and 5 `steps`.

  The numbers in the steps must match the section's `bodyMarkdown`. Run `go run ./cmd/ingest -verify -audio=false` and expect a `clip-check` line with seconds between 10 and 30.
- [X] T017 [US1] Owner review of the pilot drawing and captions. Revise until approved. Then:
  - set the register entry to `approved` with the owner reviewer note;
  - give the owner the English ledger command for `public-content/lessons/3-neuralnetworks.detailed.json`.
- [X] T018 [P] [US1] Lesson 1 concept clip `turing-test`: a judge, two hidden chat partners, messages going back and forth, the judge unable to tell. Rendered as 60fps fluid micro-video (source + release + approved register entry) and upgraded `turing-test` diagram in `public-content/lessons/1-intro.detailed.json` and Hindi.
- [X] T019 [P] [US1] Lesson 2 concept clip `forward-chaining`: known facts lighting rules one by one until a conclusion fires (forward chaining). Rendered as 60fps fluid micro-video and upgraded diagram in `public-content/lessons/2-symbolic.detailed.json` and Hindi.
- [X] T020 [P] [US1] Lesson 4 concept clip `convolution-scan`: a 3×3 filter sliding over a pixel grid and filling the output grid, with max pooling. Rendered as 60fps fluid micro-video and added diagram to section `convolution` of `public-content/lessons/4-computervision.detailed.json` and Hindi.
- [X] T021 [P] [US1] Lesson 5 concept clip `vector-attention`: crown and person vectors, king − man + woman landing near queen, and self-attention arcs. Rendered as 60fps fluid micro-video and upgraded diagram in section `embeddings` of `public-content/lessons/5-nlp.detailed.json` and Hindi.
- [X] T022 [P] [US1] Lesson 7 concept clip `fairness-calibration`: a training set skewed towards one group, disparate impact balance scale, and threshold recalibration. Rendered as 60fps fluid micro-video and upgraded diagram in section `measuring-fairness` of `public-content/lessons/7-ethics.detailed.json` and Hindi.
- [X] T023 [US1] Verified all 6 concept clips across light/dark themes and browser test suites.

**Checkpoint**: `clips.spec.ts` US1 cases pass; the pilot clip plays with captions and no sound.

---

## Phase 4: User Story 3 — Clips have sound (Priority: P2)

**Goal**: Play reads each caption aloud (device voice in English, a recording in Hindi), with one sound at a time and mute for the visit.

**Independent Test**: US3-1..3 in `clips.spec.ts` on the lesson 3 clip.

### Tests for User Story 3

- [X] T024 [P] [US3] Extend `web/tests/clips.spec.ts` (AC-78) with a speech mock that records `__said`, `__cancels` and pending `onend` (as in `web/tests/detailed-lesson.spec.ts`). Tests:
  - Play speaks step 1's caption, and step 2 starts only after its `onend` + 600 ms;
  - pressing Read section on another section pauses the clip on its step;
  - starting a second clip pauses the first;
  - the tutor reading an answer pauses the clip (SC-006);
  - Mute stops the voice while steps still advance, and a second clip starts muted (`aria-pressed=true`);
  - with `speechSynthesis` removed, Play still advances, with no error text;
  - in Hindi, the page requests the recording for `3-neuralnetworks/detailed/section-perceptron-learning-clip-1`.

### Implementation for User Story 3

- [X] T025 [US3] In `web/src/components/ClipPlayer.tsx`, voice each step with `speakTrack` (T010), passing the step text, `trackKey = prefix + n`, the language and the persona from `useAudioStore`:
  - `onEnd` → wait 600 ms and the remaining entrance time (≤ 2 s) → next step;
  - claim `useAudioStore.setActiveTrack(<track>, true)` while speaking;
  - when `activeTrackId` changes to another id, pause;
  - starting Play calls `speechService.stop()` first;
  - if `clipsMuted` or the voice fails, use the muted hold;
  - Next and Previous read that one step unless muted (FR-007).
- [X] T026 [US3] Add the `clip-mute` toggle bound to `useClipStore` (T008), with `aria-pressed` and the `clip.mute`/`clip.unmute` labels. Muting while playing stops the voice and keeps the steps moving.

**Checkpoint**: All of `clips.spec.ts` passes. MVP release candidate: the lesson 3 concept clip with sound.

---

## Phase 5: User Story 2 — Every Detailed section has a picture (Priority: P2)

**Goal**: The 13 sections with no picture get a clip. Worked examples step through their numbers.

**Independent Test**: For one lesson, every non-activity section shows a picture or clip, and `clip-check` passes.

### Tests for User Story 2

- [X] T027 [P] [US2] Add `TestEveryDetailedSectionHasAPicture` to `internal/ingest/clips_test.go` (SC-001). It runs on the real `public-content` and fails if a Detailed section has neither `diagram` nor `interactiveWidget`. Mark it `t.Skip` until T035, then remove the skip.

### Implementation for User Story 2

For each clip below: draw it (source master + release copy + `proposed` register entry), add the `type: "clip"` diagram to the named section, and make every number match the section text.

- [X] T028 [P] [US2] Lesson 3 (pilot): `machine-learning-basics` (examples in, a rule out, a new example sorted) and `worked-example` (each training step's weights and line, numbers from the text), in `public-content/lessons/3-neuralnetworks.detailed.json`.
- [X] T029 [P] [US2] Lesson 1: `defining-ai` (sense → decide → act loop, a few everyday devices) and `worked-example` (a written rule failing on a new case, a learned one adjusting), in `public-content/lessons/1-intro.detailed.json`.
- [X] T030 [P] [US2] Lesson 2: `knowledge-representation` (facts as nodes and links) and `worked-example` (the rover's symptoms firing rules to a diagnosis, matching the text), in `public-content/lessons/2-symbolic.detailed.json`.
- [X] T031 [P] [US2] Lesson 4: `vision-tasks` (classify, detect, segment on one picture) and `worked-example` (the edge filter computed cell by cell, numbers from the text), in `public-content/lessons/4-computervision.detailed.json`.
- [X] T032 [P] [US2] Lesson 5: `nlp-tasks` (sentence → tokens → task outputs) and `worked-example` (similarity scores, then next-word probabilities as bars, numbers from the text), in `public-content/lessons/5-nlp.detailed.json`.
- [X] T033 [P] [US2] Lesson 7: `principles` (the principles as icons around a decision), `measuring-fairness` (two groups' approval rates and their ratio, numbers from the text) and `worked-example` (the hiring audit step by step), in `public-content/lessons/7-ethics.detailed.json`. *(2026-11-21: clips `sense-decide-act`, `rule-vs-learned`, `facts-as-graph`, `rover-diagnosis`, `classify-detect-segment`, `edge-filter-by-hand`, `sentence-to-tasks`, `similarity-and-next-word`, `principles-around-decision`, `hiring-audit`; `measuring-fairness` already had its video. Added in en, hi, kn and ta, registered `proposed`, hi/kn/ta captions recorded (141 tracks each). Several clips sit at 28–30 s; the Hindi steps were shortened to fit.)*
- [X] T034 [US2] Owner review of the T018–T022 and T028–T033 drawings and captions, lesson by lesson. Set each approved clip's register entry to `approved`. *(2026-11-21: owner said "approve spec 014": 10 new clips and 18 re-rendered videos set to approved in the register; the 5 changed Detailed lessons approved in en (owner) and hi/kn/ta (owner (beta)).)*
- [X] T035 [US2] Remove the `t.Skip` from T027, once every lesson's clips are approved. *(2026-11-21: skip removed; the test passes.)*

**Checkpoint**: SC-001: 30 of 36 Detailed sections have a picture or clip; the other 6 have their widget.

---

## Phase 6: Hindi and release (per lesson; lesson 3 first)

Repeat T036–T042 for each lesson, in the order 3 (v0.11.0; ticked boxes record lesson 3), then 1, 2, 4, 5, 7, released one by one or grouped as the owner prefers.

- [X] T036 Translate the clip `caption`, `alt` and `steps` into `public-content/lang/hi/lessons/<id>.detailed.json`, keeping `type` and `clip`. Run `go test ./internal/i18n/` (parity) and `go run ./cmd/ingest -verify -audio=false`.
- [X] T037 Owner approves the English lesson (`go run ./cmd/review -lang en -reviewer owner -approve public-content/lessons/<id>.detailed.json`) and the Hindi lesson (`go run ./cmd/review -lang hi -reviewer "owner (beta)" -approve public-content/lang/hi/lessons/<id>.detailed.json`). Also approve `web/src/i18n/hi.json` once, for the T009 strings.
- [X] T038 Run `go run ./cmd/narrate -lang hi -dry-run` and report the new `*-clip-<n>` tracks and characters billed. Record with `go run ./cmd/narrate -lang hi` only after the owner approves the cost.
- [X] T039 Owner uploads the narration: `cd "/Users/santoshsharma/Documents/code/AI Learning Mod" && gcloud storage rsync --recursive public-content/audio gs://ai-learning-513415-ai-foundations-coach-narration/audio`. Verify that `gcloud storage cat gs://ai-learning-513415-ai-foundations-coach-narration/audio/hi/manifest.json | shasum` equals `shasum public-content/audio/hi/manifest.json`.
- [X] T040 Re-record the English text baseline: `UPDATE_I18N_BASELINE=1 npx playwright test -c playwright.tmp3001.config.ts -g "baseline" --grep-invert "settings-hosted-local"`, then the hosted-settings entry with the 3001→3000 and 8081→8080 fix. Check that only clip captions and controls changed.
- [X] T041 Release gates:
  - `go vet ./...`, `go test ./...`;
  - `go run ./cmd/ingest -verify` (with audio);
  - `go run ./cmd/assetcheck`;
  - `npx tsc --noEmit -p .`;
  - the full Playwright suite on 3001 (only `settings-hosted-local` may fail).
- [X] T042 When the owner asks: commit with explicit paths and push `cloud-beta`. Tag (`v0.11.0` for the pilot, then the next minor version per release) only on the owner's word. The owner approves promote.

---

## Phase 7: Polish & cross-cutting

- [X] T043 [P] Mention clips (Play, step, mute, reduced motion) in the Help and usage text: `APP_USAGE.md` and the Help modal strings in `web/src/i18n/en.json` / `hi.json`, the Hindi via the ledger. *(2026-11-21: `help.clipsTitle`/`help.clipsBody` in en, hi, kn, ta, approved; APP_USAGE.md section.)*
- [X] T044 [P] Keep `docs/own-content-plan.md`'s progress section and the memory file for SPEC-014 updated after each release.
- [X] T045 Set `spec/ACCEPTANCE.md` AC-76..AC-78 to "PASS (automated)" after the green runs. Close SPEC-014 (status in `specs/014-detailed-concept-clips/spec.md` and `spec/SPEC.md` §0) once SC-001..SC-007 are met. *(2026-11-21: AC-76..81 already PASS; SPEC-014 closed.)*

---

## Phase 6b: Junior (Kids) & Plain English Bespoke Micro-Videos (Option B Rollout)

- [X] T046 [P] Author Plan artifact `plan-option-b-kids-and-plain-clips.md` detailing bespoke vector animations for Kids (mascot Chip) and Plain English (executive dark-mode infographics). Approved by user.
- [X] T047 [P] Render 6 bespoke 60fps Kids micro-videos with headless Chromium Playwright script `scripts/render-kids-clips.js`:
  - `chip-dog-learning` (M1)
  - `chip-rule-robot` (M2)
  - `chip-fruit-sorter` (M3)
  - `chip-magnifying-glass` (M4)
  - `chip-word-blocks` (M5)
  - `chip-playground-scale` (M7)
- [X] T048 [P] Register Kids video assets in `design/brand/asset-register.json` with computed SHA-256 sums and verify with `go run ./cmd/assetcheck`.
- [X] T049 [P] Update `public-content/lessons/*.junior.json` and Hindi counterparts with bespoke 5-step captions adhering strictly to `kidsCheck` ($\le 3.5$ grade, sentence length $\le 18$).
- [X] T050 [P] Render 6 bespoke 60fps Plain English micro-videos with headless Chromium Playwright script `scripts/render-plain-clips.js`:
  - `plain-rules-vs-learning` (M1)
  - `plain-decision-tree` (M2)
  - `plain-linear-classifier` (M3)
  - `plain-image-feature-scan` (M4)
  - `plain-transformer-context` (M5)
  - `plain-disparate-impact-audit` (M7)
- [X] T051 [P] Register Plain English video assets in `design/brand/asset-register.json` with computed SHA-256 sums and verify with `go run ./cmd/assetcheck`.
- [X] T052 [P] Update `public-content/lessons/*.plain-english.json` and Hindi counterparts with bespoke 5-step captions and descriptions.
- [X] T053 [P] Add Kids and Plain English video clip IDs to `web/src/components/AdaptiveLessonView.tsx` `VideoClipPlayer` activation set.
- [X] T054 [P] Approve all 12 lesson files in review ledgers `content/review/en.json` and `hi.json` via `cmd/review`.
- [X] T055 [P] Verify release gate test suite: `cmd/assetcheck`, `cmd/ingest -verify`, and `npx tsc --noEmit`.
- [X] T056 [P] Run headless browser verification across all 12 Kids and Plain English lesson routes and generate artifact screenshot gallery.

## Phase 8: Clarified behaviour (spec Clarifications, session 2026-11-15)

**Goal**: the video clips behave as the owner decided on 2026-11-15:
- videos and drawn step clips side by side;
- at most 900 KB per video file;
- the video waits for each caption's voice;
- no motion under reduced motion;
- the owner's approvals confirmed.

This phase also closes the gaps found while generating these tasks.

**Independent Test**: `web/tests/video-clips.spec.ts` passes. `go run ./cmd/ingest -verify` (with audio) and `go run ./cmd/assetcheck` pass with every video file checked.

**Note on labels**: the spec was rewritten. Its stories are now US1 (Detailed video), US2 (Kids video), US3 (Plain English video) and US4 (captions and voice in both languages). The labels on Phases 3–5 above follow the older story numbering.

### Setup

- [X] T057 `docs(spec):` amend `spec/SPEC.md`, using the next free AC numbers (AC-79 onwards today; move SPEC-015's planned AC-79..81 to the numbers after these and update its T001):
  - **FR-CNT-13**, two kinds of clip:
    - *Step clip*: a drawing `web/public/brand/clips/<clip>.svg`, as today, at most 100 KB.
    - *Video clip*: `web/public/brand/videos/<clip>.webm`, `<clip>.mp4` and `<clip>-poster.jpg`. Each video file is "at most 900 KB per file, WebM and MP4 each". No words or sound are burned into the video. It has one caption per cue, and the diagram is marked `"media": "video"`.
  - **FR-UI-28**, the video player:
    - the poster shows first and the video downloads only on Play;
    - at each cue's end the video holds its last frame until the caption has been read; when muted or with no speech, it holds for the caption's reading time;
    - under reduced motion there is no Play, Previous/Next show each cue's still frame, and each caption is read once unless muted;
    - the speed control (0.75×, 1×, 1.25×) changes the picture only.
  - Add the AC rows to `spec/ACCEPTANCE.md` as "pending".

### Foundational

- [X] T058 [P] Extend the release check in `internal/ingest/clips.go` for a diagram with `"media": "video"`:
  - `videos/<clip>.webm`, `videos/<clip>.mp4` and `videos/<clip>-poster.jpg` must all exist;
  - each of the two video files must be "at most 900 KB" (921600 bytes); the current code allows 1 MB and checks only the WebM;
  - the caption count must equal the clip's cue count (5 unless the diagram gives `cues`);
  - a Hindi file must name the same video and media.

  Step clips keep every existing rule. Add cases to `internal/ingest/clips_test.go`: a missing MP4, a missing poster, an MP4 over 900 KB, and the wrong number of captions.
- [X] T059 [P] Make the Kids reading check read clip captions. In `internal/readability/kids.go`, decode `diagram.steps` (today `Diagram *struct{}`), and check every caption of a Kids lesson's clip against the 8–11 limits: reading grade ≤ 3.5 and at most 18 words per sentence (SC-009). Add a failing and a passing case to `internal/readability/kids_test.go`, then confirm `go run ./cmd/ingest -verify -audio=false` still passes for all six Kids lessons.
- [X] T060 Let the lesson data choose video or drawing:
  - add `"media": "video"` to the 18 video clip diagrams in `public-content/lessons/*.json` and the matching `public-content/lang/hi/lessons/*.json` (`media` is not translatable, so parity keeps Hindi equal to English);
  - in `web/src/components/AdaptiveLessonView.tsx`, replace the hard-coded list of 18 clip names with `section.diagram.media === 'video'`;
  - add `media?: 'video'` to `AdaptiveSection.diagram` in `web/src/api.ts`.

  `perceptron-learning` then has both a drawing and a video. Remove the unused drawing (`web/public/brand/clips/perceptron-learning.svg`, its source master and register entry), or keep it, as the owner decides.

  This edits approved lesson files, so do it before T068 so the approvals are given once.

### Tests (US1 — every video clip)

- [X] T061 [P] [US1] Write `web/tests/video-clips.spec.ts`, with a lesson mocked to use one `"media": "video"` clip, the fixture video served by route, and the speech mock from `web/tests/clips.spec.ts`. Tests:
  - the poster shows first and no `.webm`/`.mp4` request is made before Play (SC-005);
  - Play reads cue 1, the video holds at cue 1's end until the caption's `onend`, then continues (FR-008);
  - when muted it holds for the caption's reading time;
  - **regression:** a caption finishing does not pause the video;
  - Read section, the tutor's voice and another clip each pause the video (SC-006);
  - under reduced motion there is no Play, and Next shows the cue's still frame paused and reads it once (SC-004);
  - the speed button changes the video's playback rate only;
  - every control is ≥ 44×44 and reachable by keyboard;
  - a failed video shows the poster and the captions as text.

### Implementation (US1, US2, US3 — the one player serves all three journeys)

- [X] T062 [US1] In `web/src/components/VideoClipPlayer.tsx`, change `preload="auto"` to `preload="none"`, keeping the poster, so a lesson downloads at most the poster until Play (SC-005).
- [X] T063 [US1] In `web/src/components/VideoClipPlayer.tsx`, hold at each cue's end:
  - when playback reaches the next cue before the current caption's voice has ended, pause on the boundary frame;
  - resume when the voice ends, plus `STEP_GAP_MS` (600 ms);
  - when muted or with no speech, hold for `holdMs(caption)`, using the same "spoke" test as `ClipPlayer` (speech that ends without starting counts as no speech).

  Reuse `holdMs` and `STEP_GAP_MS` from `web/src/components/ClipPlayer.tsx` (FR-008).
- [X] T064 [US1] Fix the pause-after-caption bug in `web/src/components/VideoClipPlayer.tsx`: a caption's `onEnd` calls `stopAudio()`, and the "one sound at a time" effect then sees no owner and pauses the video. Track this clip's own speech as `ClipPlayer` does (a generation counter plus owner prefix), so only another sound pauses the video.
- [X] T065 [US1] Reduced motion in `web/src/components/VideoClipPlayer.tsx`:
  - hide Play and the centre overlay;
  - Previous/Next (and the cue bars) set `currentTime` to the cue's start and stay paused;
  - read the caption once unless muted, removing `|| reduceMotion` from `voiceStep`'s early return (SC-004, FR-007).
- [X] T066 [P] [US1] Put the player's text into the UI string files `web/src/i18n/en.json` / `hi.json`, replacing the hard-coded English "Jump to Step N", "Playback speed: Nx", "Mute voice narration" / "Unmute voice narration", "Muted" and "Voice". Reuse `clip.mute` and `widget.stepOf` where they fit; the Hindi drafts need the owner's approval in T068.

### Hindi voice and approvals (US4)

- [X] T067 [US4] Hindi voices for the video captions. Only the 14 lesson 3 drawn-clip steps are recorded today; the Kids and Plain English videos and the Detailed videos for lessons 1, 2, 4, 5 and 7 are not. Run `go run ./cmd/narrate -lang hi -dry-run` and report the recordings and characters billed. After the owner approves the cost, record, then the owner uploads, then check the manifest fingerprint.
- [X] T068 [US4] The owner confirms the Hindi approvals that T054 recorded for the 12 Kids and Plain English files, or approves them again. They also approve the files changed by T060 and the strings from T066. All with `go run ./cmd/review -lang hi -reviewer "owner (beta)" -approve …`, and the English ledger as needed. *(2026-11-21: the ledgers show these files approved and current; confirmed by "approve spec 014".)*

### Polish

- [X] T069 [P] Restore the spec's quality:
  - add back an Edge Cases section to `specs/014-detailed-concept-clips/spec.md`: a slow network shows only the poster; a failed video shows the poster and captions; no speech; reduced motion; Hindi not yet approved;
  - move implementation details (codecs, renderer, file paths, command names, maths notation) into `plan.md`;
  - merge the two "Success Criteria" headings.

  Then re-check `checklists/requirements.md`.
- [X] T069a The videos broke FR-016: the render scripts drew English words with `fillText`. Owner decision 2026-11-21: re-render without words (option A; the rule stays). Each `scripts/render-*.js` now wraps `fillText`/`strokeText` so that any text containing a letter draws only its emoji, while numbers and symbols stay. `render-clips.js` also lists `turing-test` and `forward-chaining`, which its batch had dropped. All 18 videos and posters are re-rendered with `node scripts/render-clips.js`, `render-perceptron-clip.js`, `render-kids-clips.js` and `render-plain-clips.js`. The owner re-approves the new videos when reviewing the clips.
- [X] T070 Release gates: *(2026-11-21: go vet/test, ingest -verify with audio, assetcheck, tsc pass; Playwright 268 passed, the English baseline re-recorded for the new clips and Help text, settings-hosted-local expected.)*
  - `go vet ./...`, `go test ./...`;
  - `go run ./cmd/ingest -verify` (with audio), `go run ./cmd/assetcheck`, `npx tsc --noEmit -p .`;
  - the full Playwright suite on 3001 (only `settings-hosted-local` may fail).

  When the owner asks, commit with explicit paths on `cloud-beta-2`: the video work together with the uncommitted `ClipPlayer` fixes and these tasks. Tag only on the owner's word.

---

## Dependencies & Execution Order

- **Phase 8 (T057–T070):** T057 first, as the spec-first commit. T058, T059 and T060 can run in parallel. T061 comes before T062–T065, which edit one file in order. T066 can run alongside them. T067 needs T060 (the final captions). T068 needs T060 and T066. T070 is last.

### Phase dependencies

- **Setup (T001–T002):** first. T001 is a `spec:` commit before code.
- **Foundational (T003–T011):** blocks every story.
- **US1 (T012–T023):** after Foundational. T013 → T014 → T015 → T016 → T017; T018–T022 after T014.
- **US3 (T024–T026):** after T013 and T010. The pilot release needs US1 (lesson 3) + US3.
- **US2 (T027–T035):** after T014; independent of US3 for drawing work.
- **Release (T036–T042):** per lesson, after that lesson's clips are approved (T017/T034) and US3 is done.
- **Polish (T043–T045):** last; T044 runs after each release.

### Story dependencies

- US1 is the MVP base.
- US3 extends US1's player; a clip without voice is never released, because the owner asked for sound.
- US2 reuses the US1 player and needs no US3 code, but ships with it.

### Parallel opportunities

- **Foundational:** T003/T004, T006, T007, T008, T009 and T011 touch different files.
- **US1:** T018–T022, one lesson file and one drawing each.
- **US2:** T028–T033, one lesson each.
- **Tests:** T012 and T024 can be written alongside T013/T025.

## Parallel Example: User Story 1

```text
After T014:
  T018 lesson 1 turing-test     (1-intro.detailed.json, clips/turing-test.svg)
  T019 lesson 2 chaining        (2-symbolic.detailed.json, clips/chaining.svg)
  T020 lesson 4 convolution     (4-computervision.detailed.json, clips/convolution.svg)
  T021 lesson 5 embeddings      (5-nlp.detailed.json, clips/embeddings.svg)
  T022 lesson 7 sources-of-bias (7-ethics.detailed.json, clips/sources-of-bias.svg)
```

## Implementation Strategy

### MVP (pilot, v0.11.0)

1. T001–T011 (Setup, Foundational).
2. T012–T017 (player and lesson 3 concept clip).
3. T024–T026 (sound).
4. T028 (lesson 3's two section clips), then T036–T042 for lesson 3.

Stop and get the owner's view on the pilot before drawing the rest.

### Incremental delivery

Then lessons 1, 2, 4, 5 and 7: their concept clip (T018–T022), their section clips (T029–T033), and T036–T042 for each. Each lesson's release changes no other lesson (SC-007).

## Notes

- Clip drawings carry no words; every word is a caption in lesson text (R2).
- Hindi `clip` and the number of steps must equal English (T003, parity).
- If a lesson's text changes after approval, its ledger entry goes stale and the release check fails until the owner approves again.
