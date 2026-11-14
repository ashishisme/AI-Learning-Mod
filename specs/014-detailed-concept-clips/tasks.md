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
- [ ] T018 [P] [US1] Lesson 1 concept clip `turing-test`: a judge, two hidden chat partners, messages going back and forth, the judge unable to tell. Draw it (source + release + `proposed` register entry) and replace the `turing-test` section's flowchart in `public-content/lessons/1-intro.detailed.json`.
- [ ] T019 [P] [US1] Lesson 2 concept clip `chaining`: known facts lighting rules one by one until a conclusion fires (forward chaining). Draw it and replace the stepper in section `chaining` of `public-content/lessons/2-symbolic.detailed.json`.
- [ ] T020 [P] [US1] Lesson 4 concept clip `convolution`: a 3×3 filter sliding over a pixel grid and filling the output grid, with numbers matching the section text. Draw it and add it to section `convolution` (no picture today) of `public-content/lessons/4-computervision.detailed.json`.
- [ ] T021 [P] [US1] Lesson 5 concept clip `embeddings`: crown and person icons as arrows, king − man + woman landing near queen. Draw it and replace the flowchart in section `embeddings` of `public-content/lessons/5-nlp.detailed.json`.
- [ ] T022 [P] [US1] Lesson 7 concept clip `sources-of-bias`: a training set skewed towards one group, a decision line fitting it, and one under-represented person tipped to the wrong side. Draw it and replace the stepper in section `sources-of-bias` of `public-content/lessons/7-ethics.detailed.json`.
- [ ] T023 [US1] Update tests that assert the replaced pictures: grep `web/tests` for the old flowchart or stepper text of sections `turing-test`, `chaining`, `perceptron-learning`, `embeddings` and `sources-of-bias`, and change them to expect `[data-testid="clip"]`.

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
- [ ] T029 [P] [US2] Lesson 1: `defining-ai` (sense → decide → act loop, a few everyday devices) and `worked-example` (a written rule failing on a new case, a learned one adjusting), in `public-content/lessons/1-intro.detailed.json`.
- [ ] T030 [P] [US2] Lesson 2: `knowledge-representation` (facts as nodes and links) and `worked-example` (the rover's symptoms firing rules to a diagnosis, matching the text), in `public-content/lessons/2-symbolic.detailed.json`.
- [ ] T031 [P] [US2] Lesson 4: `vision-tasks` (classify, detect, segment on one picture) and `worked-example` (the edge filter computed cell by cell, numbers from the text), in `public-content/lessons/4-computervision.detailed.json`.
- [ ] T032 [P] [US2] Lesson 5: `nlp-tasks` (sentence → tokens → task outputs) and `worked-example` (similarity scores, then next-word probabilities as bars, numbers from the text), in `public-content/lessons/5-nlp.detailed.json`.
- [ ] T033 [P] [US2] Lesson 7: `principles` (the principles as icons around a decision), `measuring-fairness` (two groups' approval rates and their ratio, numbers from the text) and `worked-example` (the hiring audit step by step), in `public-content/lessons/7-ethics.detailed.json`.
- [ ] T034 [US2] Owner review of the T018–T022 and T028–T033 drawings and captions, lesson by lesson. Set each approved clip's register entry to `approved`.
- [ ] T035 [US2] Remove the `t.Skip` from T027, once every lesson's clips are approved.

**Checkpoint**: SC-001: 30 of 36 Detailed sections have a picture or clip; the other 6 have their widget.

---

## Phase 6: Hindi and release (per lesson; lesson 3 first)

Repeat T036–T042 for each lesson, in the order 3 (v0.11.0; ticked boxes record lesson 3), then 1, 2, 4, 5, 7, released one by one or grouped as the owner prefers.

- [X] T036 Translate the clip `caption`, `alt` and `steps` into `public-content/lang/hi/lessons/<id>.detailed.json`, keeping `type` and `clip`. Run `go test ./internal/i18n/` (parity) and `go run ./cmd/ingest -verify -audio=false`.
- [X] T037 Owner approves the English lesson (`go run ./cmd/review -lang en -reviewer owner -approve public-content/lessons/<id>.detailed.json`) and the Hindi lesson (`go run ./cmd/review -lang hi -reviewer "owner (beta)" -approve public-content/lang/hi/lessons/<id>.detailed.json`). Also approve `web/src/i18n/hi.json` once, for the T009 strings.
- [X] T038 Run `go run ./cmd/narrate -lang hi -dry-run` and report the new `*-clip-<n>` tracks and characters billed. Record with `go run ./cmd/narrate -lang hi` only after the owner approves the cost.
- [ ] T039 Owner uploads the narration: `cd "/Users/santoshsharma/Documents/code/AI Learning Mod" && gcloud storage rsync --recursive public-content/audio gs://ai-learning-513415-ai-foundations-coach-narration/audio`. Verify that `gcloud storage cat gs://ai-learning-513415-ai-foundations-coach-narration/audio/hi/manifest.json | shasum` equals `shasum public-content/audio/hi/manifest.json`.
- [X] T040 Re-record the English text baseline: `UPDATE_I18N_BASELINE=1 npx playwright test -c playwright.tmp3001.config.ts -g "baseline" --grep-invert "settings-hosted-local"`, then the hosted-settings entry with the 3001→3000 and 8081→8080 fix. Check that only clip captions and controls changed.
- [X] T041 Release gates:
  - `go vet ./...`, `go test ./...`;
  - `go run ./cmd/ingest -verify` (with audio);
  - `go run ./cmd/assetcheck`;
  - `npx tsc --noEmit -p .`;
  - the full Playwright suite on 3001 (only `settings-hosted-local` may fail).
- [ ] T042 When the owner asks: commit with explicit paths and push `cloud-beta`. Tag (`v0.11.0` for the pilot, then the next minor version per release) only on the owner's word. The owner approves promote.

---

## Phase 7: Polish & cross-cutting

- [ ] T043 [P] Mention clips (Play, step, mute, reduced motion) in the Help and usage text: `APP_USAGE.md` and the Help modal strings in `web/src/i18n/en.json` / `hi.json`, the Hindi via the ledger.
- [ ] T044 [P] Keep `docs/own-content-plan.md`'s progress section and the memory file for SPEC-014 updated after each release.
- [ ] T045 Set `spec/ACCEPTANCE.md` AC-76..AC-78 to "PASS (automated)" after the green runs. Close SPEC-014 (status in `specs/014-detailed-concept-clips/spec.md` and `spec/SPEC.md` §0) once SC-001..SC-007 are met.

---

## Dependencies & Execution Order

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
