---
description: "Task list for SPEC-013: Our Own Lessons"
---

# Tasks: Our Own Lessons

**Input**: design documents in `specs/013-own-lesson-content/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)

**Tests**: included. The spec's acceptance scenarios and FR-008 are release gates, and the project ships every behaviour change with a Go or Playwright test.

**Organization**: Phase 2 is the Phase A code release that every lesson depends on. Then one phase per user story, then Polish. Inside a story, each lesson is its own release (FR-010).

**Lesson ids**: `1-intro`, `2-symbolic`, `3-neuralnetworks`, `4-computervision`, `5-nlp`, `7-ethics`.

**Owner-gated tasks** are marked **(owner)**. Claude prepares everything, then stops and asks. Never record an approval, or approve `staging-promote`, on the owner's behalf.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 Kids, US2 Plain English, US3 Detailed, US4 retire Microsoft

## Per-lesson release steps (used by every content task below)

These are the quickstart steps. "Release" in a task means all of them:
1. `go run ./cmd/ingest -verify -audio=false` shows no `FAIL` for the lesson.
2. **(owner)** The owner reads it and approves the English: `go run ./cmd/review -lang en -reviewer "owner" -approve <path>`.
3. Claude drafts the Hindi file. **(owner)** The owner approves it: `go run ./cmd/review -lang hi -reviewer "owner (beta)" -approve <path>`.
4. Record the Hindi: `go run ./cmd/narrate -lang hi`, then check with `-check`.
5. `go run ./cmd/assetcheck` passes; `go test ./...` and Playwright pass on ports 3001/8081. Re-record the English baseline for this lesson only.
6. Originality check against Microsoft's lesson (SC-006). Then commit, merge to `cloud-beta`, tag. **(owner)** The owner approves `staging-promote`.

---

## Phase 1: Setup

- [X] T001 Create `notebooks/` with a `README.md` saying each `<id>.ipynb` is our own learner notebook. Notebooks are English only, use only Colab's default libraries, make no network calls except Colab's own, and never run in the build or app (DC-10 note from plan.md).
- [X] T002 [P] Create an empty English ledger `content/review/en.json`: `{"language":"en","entries":[]}`. Its shape matches `content/review/hi.json`.

---

## Phase 2: Foundational (Phase A, one code release)

**Purpose**: the English approval gate, the `detailed` mode, the tutor grounding fix, the "Detailed" label and the Colab rule. Every content release depends on these.

**⚠️ CRITICAL**: no lesson may be marked `"origin": "own"` until T004–T007 are merged.

### Spec amendment (first, §12)

- [X] T003 `spec:` commit to `spec/SPEC.md`. Give SPEC-013 FR-001..017 permanent ids. Amend FR-UI-08: Colab links may point only to `ashishisme/AI-Learning-Mod` `notebooks/<id>.ipynb`; derived lessons keep their current link until replaced. Add the `detailed` mode to the lesson API section. Add tutor grounding on the shown version to §7.3.1, with the citation format unchanged. Add the en ledger to the release checks. Bump the spec version and the version row.

### English approval ledger (FR-008, research R2, R3)

- [X] T004 In `internal/i18n/ledger.go`, add `EnglishTargets(root string) ([]Target, error)`. It returns:
  - every `public-content/lessons/*.json` whose top-level `"origin"` is `"own"` (kind `adaptive`);
  - `web/src/data/quizzes/en.json` when any entry has `"origin": "own"` (kind `quiz`);
  - every `notebooks/*.ipynb` (kind `notebook`).
  Status rules: no entry is *pending*; an entry whose `sourceHash` differs from the file's sha256 is *stale*; a match is *approved*. `translationHash` is unused for `en`.
- [X] T005 [P] Add tests in `internal/i18n/ledger_en_test.go`, using a temp root:
  - a file without `origin` is not a target;
  - an `origin: own` lesson with no entry is pending;
  - editing it after approval makes it stale;
  - an own quiz entry makes `en.json` a target;
  - each notebook is a target.
- [X] T006 In `cmd/review/`, `-lang en` lists `EnglishTargets` as `approved | pending | stale`. `-lang en -reviewer <name> -approve <path>...` writes `content/review/en.json`. Each entry has `path`, `kind`, `sourceHash`, `status: "approved"`, `reviewer` and `date`. Approving a path that isn't a target is an error.
- [X] T007 In `cmd/ingest/`, make `-verify` fail on the en ledger. Print `en <path>: pending`, or `en <path>: stale: the text changed after approval`, and exit 1. Add a test next to the existing verify tests in `cmd/ingest/`.
- [X] T008 Update the `Dockerfile` build stage. Add `COPY content/review ./content/review` if it isn't copied already, plus `COPY notebooks ./notebooks`, before `RUN ... ingest -verify`, so the gate sees the notebooks. Do not copy `notebooks/` into the runtime stage. This replaces the `.dockerignore` idea in data-model.md, because the build-time gate needs the files.

### Detailed mode (FR-003, FR-017, research R1, R6, R7)

- [X] T009 [P] In `internal/api/lessons.go` line ~110, accept `mode=detailed` beside `junior` and `plain-english`. Keep the lookup order: language file, then English, then the standard lesson.
- [X] T010 [P] Add `detailed` everywhere a mode list is hard-coded:
  - `internal/i18n/ledger.go` `Targets` (line ~126), so Hindi `<id>.detailed.json` is a translation target;
  - `internal/narration/text.go` `modesInUse` (line 24);
  - any parity code in `internal/i18n/parity.go` that lists modes.
  `goFurther[].title` and `goFurther[].note` are translatable; `goFurther[].url`, `origin` and `colabUrl` must equal English.
- [X] T011 Add a Go test in `internal/api/` (next to the existing lesson mode tests). `GET /api/lessons/<id>?mode=detailed` returns `sections` when `<id>.detailed.json` exists, and the standard `blocks` when it doesn't.
- [X] T012 [P] In `web/src/api.ts` lines 441 and 467, widen the mode type to `"junior" | "plain-english" | "detailed"`. Add `origin?: "own"` and `goFurther?: { title: string; url: string; note: string }[]` to the adaptive payload type.
- [X] T013 Update `web/src/pages/Lesson.tsx`. When `audienceMode === 'standard'`, call `fetchAdaptiveLesson(id, 'detailed')`:
  - if it returns sections, render `AdaptiveLessonView` (Read section buttons included);
  - otherwise keep the Markdown view.
  Colab rule (FR-016): use `colabUrl` only when it starts with `https://colab.research.google.com/github/ashishisme/AI-Learning-Mod/`; otherwise keep today's link for derived lessons only. No `colabUrl` on a Detailed lesson means no Colab button.
- [X] T014 In `web/src/components/AdaptiveLessonView.tsx`, render `goFurther`, when present, after the last section as a list headed `t('adaptive.goFurther')`. Links open in a new tab with `rel="noreferrer"`. Meet DC-11 contrast and the 44 px targets.
- [ ] T015 [P] Add `adaptive.goFurther` ("Go further" / "और जानें") to `web/src/i18n/en.json` and `hi.json` (done). **(owner)** Approve `web/src/i18n/hi.json` with `go run ./cmd/review -lang hi -reviewer "owner (beta)" -approve web/src/i18n/hi.json`. The journey rename to "Detailed" moved to T040a, because FR-017 shows it only once the first Detailed lesson ships.
- [X] T016 Add `web/tests/detailed-lesson.spec.ts`. Route-mock `/api/lessons/1-intro?mode=detailed` with a small sections payload that has `goFurther` and an own `colabUrl`. Assert:
  - the Standard journey shows sections and `standard-read-section` buttons;
  - "Go further" links are there;
  - `colab-button` href points to `ashishisme/AI-Learning-Mod`;
  - an unmocked lesson still shows the Markdown view;
  (The "Detailed" label check moved to T040a.)

### Tutor grounds on the version shown (research R4)

- [X] T017 Change `loadTutorPrompt` in `internal/api/tutor.go` (line ~613):
  - when `req.Mode` is `junior`, `plain-english` or `detailed` and that mode's file exists for the language (or in English), build the lesson text as `## <heading>\n<body>` per section, and include the 12+ text for a banded Kids lesson;
  - otherwise use the standard blocks, as today.
  Keep the citation format `[<lesson title> § <heading>]`, the fallback, `MaxLessonBytes` truncation and the injection-defence block verbatim.
- [X] T018 Add tests in `internal/api/tutor_prepare_test.go`:
  - Kids mode grounds on the junior file's headings;
  - detailed grounds on `<id>.detailed.json`;
  - an unknown mode, or a missing file, falls back to the standard blocks;
  - Hindi uses the Hindi mode file when it exists.
- [X] T019 Update `web/src/components/TutorPanel.tsx`: send `mode: 'detailed'` when the page is showing a Detailed lesson, and the current mode otherwise. Check that `internal/feedback/service.go` line 70 still accepts the journey value `standard`; no change is expected.

### Release Phase A

- [ ] T020 Run the gates: `go test ./...`, `go run ./cmd/ingest -verify`, `go run ./cmd/review -lang en` (no targets yet), and Playwright on 3001/8081. Commit, merge to `cloud-beta`, tag `v0.7.0`. **(owner)** The owner approves `staging-promote`.

**Checkpoint**: lessons can now be marked `own` and are gated; Detailed lessons render when present.

---

## Phase 3: User Story 1 - Every Kids lesson is ours (Priority: P1) 🎯 MVP

**Goal**: Kids lessons 1, 2, 4, 5 and 7 rewritten in the SPEC-012 banded format; lesson 3 marked own.

**Independent Test**: one rewritten Kids lesson passes the reading check in both bands, has en and hi approvals and Hindi recordings, and ships alone (spec US1 test).

Rules for every Kids file:
- `"origin": "own"` and `bands: true`;
- each card has a big idea and a picture (diagram, `scene` or a jargon `visual`);
- a three-item recap, then the quiz;
- the lesson's existing `interactiveWidget` is kept;
- `scaffold` and `scene` are never translated.

- [ ] T021 [US1] Add `"origin": "own"` to `public-content/lessons/3-neuralnetworks.junior.json` and its Hindi file. Release it with the per-lesson steps. Hindi needs re-approval only because the hash changed.
- [ ] T022 [P] [US1] Draw lesson 1 pictures as hand-made SVGs: word pictures 240×140 in `design/brand/source/words/`, scenes 320×180 in `design/brand/source/scenes/`, with any tap-to-play under 5 s and a still frame under reduced motion. Copy them to `web/public/brand/` and register them as `draft` in `design/brand/asset-register.json`. **(owner)** The owner approves the art.
- [ ] T023 [US1] Rewrite `public-content/lessons/1-intro.junior.json` with the Turing game. Then follow the per-lesson release steps with `public-content/lang/hi/lessons/1-intro.junior.json`, and update `web/tests/lesson.spec.ts` for any changed headings.
- [ ] T024 [P] [US1] Draw lesson 2 pictures, as in T022.
- [ ] T025 [US1] Rewrite `public-content/lessons/2-symbolic.junior.json` with the Rover expert system (`ExpertSystemWidget`). Release it, and keep `web/tests/lesson-2-symbolic.spec.ts` passing.
- [ ] T026 [P] [US1] Draw lesson 4 pictures, as in T022.
- [ ] T027 [US1] Rewrite `public-content/lessons/4-computervision.junior.json` with the Convolution lab. Release it, and keep `web/tests/lesson-4-computervision.spec.ts` passing.
- [ ] T028 [P] [US1] Draw lesson 5 pictures, as in T022.
- [ ] T029 [US1] Rewrite `public-content/lessons/5-nlp.junior.json` with Word vector maths. Release it, and keep `web/tests/lesson-5-nlp.spec.ts` passing.
- [ ] T030 [P] [US1] Draw lesson 7 pictures, as in T022.
- [ ] T031 [US1] Rewrite `public-content/lessons/7-ethics.junior.json` with the Bias detective. Release it, and keep `web/tests/lesson-7-ethics.spec.ts` passing.
- [ ] T032 [US1] Add a Go test in `cmd/ingest/kids_check_test.go`: every `*.junior.json` has `"origin": "own"` and `bands: true`. Enable it after T031.

**Checkpoint**: the whole Kids journey is ours (SC-002).

---

## Phase 4: User Story 2 - Plain English lessons are ours (Priority: P2)

**Goal**: all six Plain English lessons rewritten, with everyday examples, no maths and the same activity.

**Independent Test**: one rewritten Plain English lesson is owner-approved in en and hi and ships alone.

Each file: `"origin": "own"`, same card format, the existing `interactiveWidget` and `realWorld` kept, and new wording and examples (spec US2 scenario 2).

- [ ] T033 [P] [US2] Rewrite `public-content/lessons/1-intro.plain-english.json`. Release it.
- [ ] T034 [P] [US2] Rewrite `public-content/lessons/2-symbolic.plain-english.json`. Release it.
- [ ] T035 [P] [US2] Rewrite `public-content/lessons/3-neuralnetworks.plain-english.json`. Release it.
- [ ] T036 [P] [US2] Rewrite `public-content/lessons/4-computervision.plain-english.json`. Release it.
- [ ] T037 [P] [US2] Rewrite `public-content/lessons/5-nlp.plain-english.json`. Release it.
- [ ] T038 [P] [US2] Rewrite `public-content/lessons/7-ethics.plain-english.json`. Release it.

These are drafted in parallel, but each one is approved and released alone (FR-010).

**Checkpoint**: the Plain English journey is ours.

---

## Phase 5: User Story 3 - Detailed lessons, notebooks and quizzes (Priority: P2)

**Goal**: six Detailed lessons, each with our own notebook and rewritten quiz. The Standard journey, shown as "Detailed", serves ours.

**Independent Test**: one Detailed lesson ships alone. The Standard journey shows it with Read section buttons, Go further and our Colab link, while the other lessons still show the old text (spec US3 test).

Each `public-content/lessons/<id>.detailed.json` has:
- `"origin": "own"`;
- sections in this order: what it is, how it works (stepper or Mermaid), worked example, the activity, then `goFurther` with 3–5 items `{title, url, note}`. Each `url` must be https and must not point to `microsoft/AI-For-Beginners`;
- `colabUrl` = `https://colab.research.google.com/github/ashishisme/AI-Learning-Mod/blob/cloud-beta/notebooks/<id>.ipynb`;
- our own SVGs in place of the Microsoft images.

Each `notebooks/<id>.ipynb` runs the worked example step by step, using only Colab's default libraries. Each rewritten quiz entry in `web/src/data/quizzes/en.json` gets `"origin": "own"`, every correct answer appears in that lesson's text, and it has a Hindi entry in `hi.json`.

- [ ] T039 [US3] Add a Go test in `internal/i18n/` or `cmd/ingest/` that checks every `*.detailed.json`:
  - `goFurther` has 3–5 items with https urls and no `microsoft/AI-For-Beginners`;
  - `colabUrl` matches the own-repo pattern;
  - `notebooks/<id>.ipynb` exists.
- [ ] T040 [US3] Lesson 1: write `public-content/lessons/1-intro.detailed.json`, `notebooks/1-intro.ipynb` and the `1-intro` quiz in `web/src/data/quizzes/en.json` (and `hi.json`). Release it, approving all three in the en ledger. **(owner)** Run the notebook in Colab.
- [ ] T040a [US3] With T040, rename the journey in `web/src/i18n/en.json` and `hi.json`: `journey.standard.name` and `adaptive.modeStandard` become "Detailed" / "विस्तृत", and update `journey.standard.desc`, `adaptive.modeStandardDesc` and `help.modesBody` to match. The stored value stays `standard` (`web/src/store.ts` line 139). Add an assertion to `web/tests/detailed-lesson.spec.ts` that the chooser says "Detailed". **(owner)** Approve the Hindi.
- [ ] T041 [US3] Lesson 2: `2-symbolic.detailed.json`, `notebooks/2-symbolic.ipynb` and its quiz. Release it.
- [ ] T042 [US3] Lesson 3: `3-neuralnetworks.detailed.json`, `notebooks/3-neuralnetworks.ipynb` and its quiz. Release it.
- [ ] T043 [US3] Lesson 4: `4-computervision.detailed.json`, `notebooks/4-computervision.ipynb` and its quiz. Release it.
- [ ] T044 [US3] Lesson 5: `5-nlp.detailed.json`, `notebooks/5-nlp.ipynb` and its quiz. Release it.
- [ ] T045 [US3] Lesson 7: `7-ethics.detailed.json`, `notebooks/7-ethics.ipynb` and its quiz. Release it.
- [ ] T046 [US3] Update `web/tests/quiz.spec.ts` and `web/tests/tutor.spec.ts` for the new quiz wording and Detailed citations (spec US3 scenario 4).

**Checkpoint**: all 18 track versions, 6 quizzes and 6 notebooks are ours (SC-001).

---

## Phase 6: User Story 4 - Retire Microsoft's course (Priority: P3)

**Goal**: nothing from Microsoft's course ships, is fetched or is named.

**Independent Test**: a release builds with no network access to Microsoft's repository, and a text search finds no reference to it (SC-003, SC-004).

**Precondition**: `go run ./cmd/review -lang en` shows every lesson, quiz and notebook approved, and no derived file ships.

- [ ] T047 [US4] `spec:` commit amending `spec/SPEC.md`:
  - §1 now describes our own course;
  - §6.1 removes the curriculum source;
  - §7.3.1 gets the new identity line, with the grounding, citation and safety rules unchanged;
  - FR-UI-08 drops the Microsoft link pattern;
  - NFR-LIC-01..03: remove the attribution, and rewrite NFR-LIC-03 so `public-content/` is committed source rather than ingest output.
- [ ] T048 [US4] Remove the lesson import:
  - the fetch, pin and Markdown conversion in `cmd/ingest/`, keeping `-verify` and its gates;
  - the pinned commit and the logo blocklist;
  - the ingest steps in `.github/workflows/deploy.yml`.
- [ ] T049 [P] [US4] Delete `public-content/assets/` (Microsoft images), the base standard lessons `public-content/lessons/<id>.json`, and the base Hindi lessons. Update `public-content/index.json` so the lesson list no longer needs them, with ids unchanged (FR-011).
- [ ] T050 [US4] In `web/src/pages/Lesson.tsx`:
  - remove the Markdown standard view and the Microsoft Colab fallback at line ~104;
  - the Standard journey always uses `detailed`;
  - remove the `lesson.modeUnavailable` fallback copy where it no longer applies.
- [ ] T051 [P] [US4] Remove the attribution:
  - `web/src/components/Attribution.tsx` and its uses;
  - the HelpModal link;
  - `widget.basedOn` in `web/src/i18n/en.json` and `hi.json`;
  - delete or rewrite `web/tests/attribution.spec.ts` so it asserts no Microsoft footer or link.
- [ ] T052 [US4] Rewrite the `SystemPrompt` identity line in `internal/api/tutor.go` line 36. It currently reads "You are a teaching assistant for Microsoft AI-For-Beginners." It becomes this course's assistant. Leave the rest of the prompt verbatim, and update the tutor tests.
- [ ] T053 [P] [US4] Update `README.md` and the licence notice, keeping the MIT credit only where the licence still needs it.
- [ ] T054 [US4] Add the SC-003 check: a Go test or verify step that greps `public-content/`, `web/src/`, `web/public/` and `internal/` for `AI-For-Beginners` and `microsoft/`, and fails on a hit. Allowed exceptions are listed in the test. Release with the per-lesson step 6.

**Checkpoint**: Microsoft's course is no longer used (SC-003, SC-004).

---

## Phase 7: Polish & Cross-Cutting

- [ ] T055 [P] Update `docs/own-content-plan.md` and memory `spec-013-own-lessons.md` after each phase.
- [ ] T056 Run `web/tests/progress.spec.ts` after each release to confirm no saved progress is lost (SC-005). It is part of the full Playwright run.
- [ ] T057 Close SPEC-013 in `spec/SPEC.md` and the spec status once SC-001..007 are met.

---

## Dependencies & Execution Order

- **Setup (T001–T002)** comes before Phase 2.
- **Foundational (T003–T020)** blocks every story:
  - T003 comes first;
  - T004 → T005/T006/T007 → T008;
  - T009–T016 can be worked in parallel with the ledger work;
  - T017 → T018 → T019;
  - T020 releases it all.
- **US1** starts after T020. Each lesson's picture task (T022, T024, T026, T028, T030) comes before its rewrite. Lessons release one at a time.
- **US2** starts after T020. It is independent of US1, but the plan orders it after Kids so topics and examples are settled.
- **US3** starts after T020. Each quiz and notebook releases with its lesson's Detailed version.
- **US4** starts only after US1–US3 are complete for every lesson (FR-012).

## Parallel Opportunities

- Phase 2: T005, T009, T010, T012 and T015 touch different files.
- US1: all picture tasks (T022, T024, T026, T028, T030) can be drawn together while lesson text is in review.
- US2: all six drafts (T033–T038) can be written together; releases stay one per lesson.
- US4: T049, T051 and T053 are independent removals.

```text
# Example: Phase 2 kickoff in parallel
T005 ledger tests          internal/i18n/ledger_en_test.go
T009 API mode              internal/api/lessons.go
T012 web types             web/src/api.ts
T015 Detailed label        web/src/i18n/{en,hi}.json
```

## Implementation Strategy

- **MVP**: Phase 1, Phase 2 (release v0.7.0), then T021–T023: Kids lesson 3 marked own, and Kids lesson 1 rewritten and released alone. This proves the full loop: draft, owner en approval, Hindi, recording, gate, release.
- **Incremental**: one lesson-track per release (research R9), in this order: Kids, then Plain English, then Detailed with its quiz and notebook, then the removal release.
- **Owner time**: each release needs one en review and one hi review. Batch the picture approvals with the text review.
