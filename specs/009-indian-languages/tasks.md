---

description: "Tasks for 009-indian-languages: Hindi text and audio, shipped as incremental builds B1–B5"
---

# Tasks: Indian Languages (Text and Audio), Starting with Hindi

**Input**: Design documents from `/specs/009-indian-languages/`: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included. The constitution's quality gates (`go test ./...`, Playwright, `npm run build`) apply to every build, and the spec's success criteria (SC-001, SC-005, SC-006, SC-007, SC-009) are defined as automated checks. Within each story, write the tests first and confirm they fail.

**Organization**: Phases follow the **delivery order** set by FR-027 (B1 → B5), not strict priority. US1 and US2 (P1) depend on the B1/B2 work in US3, US4 and US5. Each build ends with a release task.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1–US7 from spec.md
- **`[external]`**: Needs a person or a cloud console (reviewer, owner, Cloud Shell)

## Path Conventions

Web application in one repository. Go is under `cmd/` and `internal/`, the React SPA under `web/src/`, content under `public-content/` and `content/`, and specs under `specs/009-indian-languages/`.

---

## Phase 1: Setup (shared infrastructure, B1)

**Purpose**: Files and folders every build relies on.

- [X] T001 Add to `.gitignore` the generated per-language base lessons and index, the audio, and the narration cache, while keeping the committed adaptive translations tracked. The rules are `public-content/lang/*/index.json`, `public-content/lang/*/lessons/*`, `!public-content/lang/*/lessons/*.junior.json`, `!public-content/lang/*/lessons/*.plain-english.json`, `public-content/audio/` and `.narration-cache/`. Also add the matching negation for `public-content/languages.json`, which is under the existing `public-content/*` ignore rule.
- [X] T002 [P] Create `public-content/languages.json` with exactly `{ "languages": [ { "code": "hi", "name": "हिन्दी", "speechLang": "hi-IN", "status": "hidden" } ] }`, per contracts/content-files.md
- [X] T003 [P] Download Noto Sans Devanagari (SIL OFL 1.1) as pre-subset `woff2` files, weights 400 and 700, from the Google Fonts Devanagari subset. Save them as `web/public/fonts/NotoSansDevanagari-400.woff2` and `web/public/fonts/NotoSansDevanagari-700.woff2`, with `web/public/fonts/OFL.txt`. Add the font and licence to the licences section of `README.md` (NFR-LIC, R12). Don't add any build-time font tool (DC-10). **Done 2026-11-03:** Google Fonts serves one variable-weight file for 400–700, so a single `web/public/fonts/NotoSansDevanagari-Variable.woff2` (117 KB) replaces the two files.
- [X] T004 [P] Create `content/glossary/hi.json` (`{ "language": "hi", "terms": [] }`) seeded with at least 25 course terms. Include artificial intelligence, machine learning, neural network, perceptron, algorithm, dataset, training, model, convolution, embedding, token, bias, expert system, rule and the Turing test, each with `en`, `target` and `note`.
- [X] T005 [P] Create `content/review/hi.json` as `{ "language": "hi", "entries": [] }` and `content/voices/hi.json` with personas `chip`, `nova` and `alan`. Each persona has fields `voice` (empty until T055), `speakingRate` 1.0 and `pitch` 0, per contracts/content-files.md.

---

## Phase 2: Foundational (blocking prerequisites, B1)

**Purpose**: The language plumbing used by every story. **No story work starts until this phase is complete.**

- [X] T006 [P] Write `internal/i18n/languages_test.go`. Loading `public-content/languages.json` returns `en` first and only `approved` entries. Codes must match `^[a-z]{2,3}$`, and anything else is rejected at load. A missing file means `[en]` only. `Resolve(code)` returns `en` for an empty, malformed, unknown or `hidden` code.
- [X] T007 Implement `internal/i18n/languages.go` (`Load(contentDir)`, `Approved()`, `Resolve(code) string`, `Lookup(code) (Language, bool)`) so T006 passes. Fields are `code`, `name`, `speechLang` and `status` (`hidden` | `approved`), per data-model.md "Language".
- [X] T008 [P] Extend `internal/api/lessons_test.go` with these checks. `GET /api/lessons?lang=hi` and `GET /api/lessons/{id}?lang=hi[&mode=junior|plain-english]` serve from `lang/hi/` when Hindi is approved and the file exists. They fall back per file to English otherwise, and always set `Content-Language` to the language served. `lang=../x`, `lang=HI`, `lang=zz` and a hidden `hi` all serve English and never read outside `contentDir`. Existing 404/400 and usage-count behaviour is unchanged. **Done 2026-11-03:** in `internal/api/lessons_lang_test.go`.
- [X] T009 Implement `?lang=` in `internal/api/lessons.go` (`GetIndex`, `GetLesson`). Use the lookup order in contracts/http-api.md, resolve `lang` only through `i18n.Resolve`, and set the `Content-Language` header. Pass the loaded languages from `NewRouter` in `internal/api/router.go` so T008 passes.
- [X] T010 Add `Languages []LanguageInfo` (`code`, `name`, `speechLang`) to `RuntimeInfo` in `internal/api/router.go`. Update the exact-JSON expectations in `TestRuntimeEndpointReportsHostedMode` in `internal/api/hosted_test.go`, and add a case with Hindi approved. Plus `TestRuntimeListsApprovedLanguages`; a broken `languages.json` offers English only instead of failing.
- [X] T011 [P] Create `web/src/i18n/index.ts`:
  - **`useT()`**: returns `t(key, vars?)`. `{name}` is interpolated. `count` picks `key.one`/`key.other` with `Intl.PluralRules`. A missing key returns the English string, never the raw key.
  - **`loadCatalog(code)`**: loads `./<code>.json` with dynamic `import()` and caches it. `en.json` is imported statically.
  - **Formatters**: `formatNumber` and `formatDate`, using `Intl` with the chosen locale and time zone `Asia/Kolkata`.
- [X] T012 [P] Add `useLanguageStore` to `web/src/store.ts`:
  - **Persistence**: `persist` key `ai-foundations-language`, with fields `code` and `chosenAt`, per data-model.md "LanguagePreference".
  - **First visit**: `hi` only if Hindi is in `useRuntimeStore().languages` and `hi` precedes `en` in `navigator.languages`. Otherwise `en`.
  - **Stored code no longer approved**: show English and keep the stored value.
  - **Page language**: set `document.documentElement.lang` on every change.
  - Extend `useRuntimeStore.load` to keep `languages`.
- [X] T013 Update `web/src/api.ts` so `fetchLessons`, `fetchLesson` and `fetchAdaptiveLesson` add `lang=<chosen>` when it isn't `en`, and return the served language from `Content-Language` alongside the payload, e.g. `{ data, servedLang }`. Update the callers in `web/src/pages/Home.tsx`, `web/src/pages/Lesson.tsx` and `web/src/components/AdaptiveLessonView.tsx` without changing behaviour.
- [X] T014 [P] Add `@font-face` rules for `Noto Sans Devanagari` 400/700 to `web/src/index.css`, with `font-display: swap` and `unicode-range: U+0900-097F, U+1CD0-1CFF, U+A8E0-A8FF`. Append the family to the existing `font-family` stack so English pages never fetch it (R12, SC-007).

**Checkpoint**: The server and client both understand `lang`, and English behaves exactly as before.

---

## Phase 3: User Story 3 - English learners see no disruption (Priority: P1) — build B1 `v0.2.0`

**Goal**: Every learner-facing string runs through `t()` with an English catalogue, and nothing visible changes (FR-027, SC-007).

**Independent Test**: The full existing English Playwright and Go suites pass. `/api/runtime.languages` is `[en]`, so no switcher shows, and English pages request neither `hi.json` nor the Devanagari font.

### Tests for User Story 3

- [X] T015 [P] [US3] Create `web/tests/i18n-foundation.spec.ts`. With runtime `languages: [en]`, no element `[data-testid="language-switcher"]` exists. Snapshot visible text of Home, Lesson (standard, junior and plain-english), Quiz and Settings and compare it to fixed expectations taken from the current English UI. Collect the page's network requests and assert none match `/hi\.json|NotoSansDevanagari/`. **Done 2026-11-03:** the English text of the six pages was recorded **before** any string moved, into the platform-neutral `web/tests/fixtures/english-text-baseline.json` (Playwright snapshots are per-OS and CI runs Linux). Diagrams are awaited, and it was stable over 3 repeated runs. Re-record only on purpose with `UPDATE_I18N_BASELINE=1`.

### Implementation for User Story 3

- [X] T016 [US3] Create `web/src/i18n/en.json` and convert `web/src/pages/Home.tsx` and `web/src/pages/Lesson.tsx` to `t('home.*')` and `t('lesson.*')`, with the English values exactly as today **Done 2026-11-03:** 36 keys; baseline unchanged.
- [X] T017 [US3] Move `QUIZ_DATA` from `web/src/data/quizzes.ts` into `web/src/data/quizzes/en.json`. Keep the `QuizOption`, `QuizQuestion` and `LessonQuiz` types in `web/src/data/quizzes.ts`, with a `loadQuizzes(code)` that returns English for `en`. Convert `web/src/pages/Quiz.tsx` UI strings to `t('quiz.*')`, using plural keys for the score.
- [X] T018 [US3] Convert `web/src/components/SettingsModal.tsx`, `web/src/components/LocalLLMSettings.tsx` and `web/src/components/HelpModal.tsx` to `t('settings.*')` and `t('help.*')`
- [X] T019 [US3] Convert `web/src/components/TutorPanel.tsx`, `web/src/components/FeedbackDialog.tsx` and `web/src/components/FeedbackButton.tsx` to `t('tutor.*')` and `t('feedback.*')`
- [X] T020 [US3] Convert `web/src/pages/SignIn.tsx`, `web/src/pages/Invite.tsx`, `web/src/components/AuthGate.tsx` and `web/src/components/ExpiryBanner.tsx` to `t('auth.*')` and `t('expiry.*')`. Dates go through `formatDate`, and IST is unchanged.
- [X] T021 [US3] Convert these to `t('adaptive.*')` and `t('narration.*')`, including `narration.chipSays` = `"Chip says: "` used in section narration text:
  - `web/src/components/AdaptiveLessonView.tsx`
  - `web/src/components/ChipMascotBanner.tsx`
  - `web/src/components/AudienceModeSelector.tsx`
  - `web/src/components/VoicePersonaSelector.tsx`
  - `web/src/components/AudioNarrationButton.tsx`
  - `web/src/components/JargonBusterTooltip.tsx`
- [X] T022 [US3] Convert the widgets to `t('widget.*')`: `web/src/components/PerceptronWidget.tsx`, `ConvolutionWidget.tsx`, `ExpertSystemWidget.tsx`, `VectorMathWidget.tsx`, `BiasDetectiveWidget.tsx`, `TuringWidget.tsx`, `StepperDiagram.tsx`, `WidgetFrame.tsx`, `ChoiceCard.tsx`, `VisualMetaphorCard.tsx`, `Attribution.tsx` and the `web/src/components/charts/*` labels. The admin pages under `web/src/pages/admin/` stay English and unconverted (spec Assumptions).
- [X] T023 [US3] Amend `spec/SPEC.md` with FR-I18N-01 (interface text comes from per-language catalogues with English fallback), FR-I18N-02 (`lang` on the lesson API with per-file fallback and `Content-Language`) and FR-I18N-03 (runtime lists approved languages). Add AC-47 (AC-39..46 were taken by SPEC-008) to `spec/ACCEPTANCE.md`, pointing to `internal/api/lessons_lang_test.go`, `internal/i18n/languages_test.go` and `web/tests/i18n-foundation.spec.ts`, as Constitution Principle I requires.
- [ ] T024 [US3] Release B1. Run `go test ./...`, `cd web && npm run build && npx playwright test --project=chromium`, and compare the English JS bundle size with `v0.1.2` (no more than 10% larger, SC-007). Commit with explicit paths, push `009-indian-languages`, and open a PR to `cloud-beta`. After merge, tag `v0.2.0` and confirm `/api/runtime.languages` on the live site is `[en]`.

**Checkpoint**: B1 is live, English is unchanged, and the foundation is in production.

---

## Phase 4: User Story 4 - Personal details are caught in Hindi too (Priority: P1) — build B2

**Goal**: The feedback rule check and the tutor safety screen reject Hindi and Hinglish personal details and unsafe questions (FR-022–FR-024). This is the precondition for showing Hindi.

**Independent Test**: The Hindi and Hinglish corpora are rejected 100% of the time, and at least 95% of clean Hindi passes (SC-006).

### Tests for User Story 4

- [X] T025 [P] [US4] Create `internal/feedback/testdata/hi_personal_details.json`, with at least 60 examples across every FR-048 category:
  - phone numbers in Devanagari, ASCII and mixed digits;
  - Hindi addresses (मकान नं, गली, पिन कोड);
  - Aadhaar and PAN;
  - email written out in Hindi;
  - handles;
  - dates of birth (मेरा जन्मदिन);
  - Hinglish (mera number, ghar ka pata);
  - links.

  Also create `internal/feedback/testdata/hi_clean.json`, with at least 60 clean Hindi and Hinglish feedback messages about lessons, including ones with lesson numbers and years that must pass.
- [X] T026 [P] [US4] Create `internal/feedback/check_hi_test.go`. Every `hi_personal_details.json` item is rejected with its expected category, and at least 95% of `hi_clean.json` is accepted. The existing English corpus results are unchanged.
- [X] T027 [P] [US4] Create `internal/api/testdata/hi_safety.json`, with Hindi and Hinglish examples for each `SafetyCategory`, including self-harm, explicit, violence and personal details. Create `internal/api/safety_hi_test.go`: each example maps to its category, and no clean Hindi lesson question is blocked.

### Implementation for User Story 4

- [X] T028 [US4] Add Hindi and Hinglish patterns to `internal/feedback/check.go`. Use explicit boundaries `(?:^|[\s\p{P}])…(?:$|[\s\p{P}])` rather than `\b`, which in Go RE2 is ASCII-only (R13). Keep `normalizeForCheck` digit folding. Make T026 pass.
- [X] T029 [US4] Add Hindi and Hinglish patterns to each category in `internal/api/safety.go` with the same boundary rule, so T027 passes. `normalizeForScreening` must keep Devanagari letters and fold digits.
- [X] T030 [US4] Add `internal/i18n/messages.go` with per-language feedback rejection messages (one per category, never echoing text) and safety replies, for `en` and `hi`. Use `en` when `lang` isn't approved. Accept an optional allowlisted `lang` field on `POST /api/feedback` in its handler under `internal/api/`, use it only for the reply language, and extend that handler's tests.
- [X] T031 [US4] Send `lang` from `web/src/components/FeedbackDialog.tsx`, and show the localised rejection message it returns

**Checkpoint**: The safety rules work for Hindi. Hindi is still hidden.

---

## Phase 5: User Story 5 - Owner controls when a language goes live (Priority: P2) — build B2 `v0.2.1`

**Goal**: Hindi files can be produced and reviewed. A language is offered only when its ledger is fully approved and current, and a release fails otherwise (FR-017–FR-021).

**Independent Test**: An approved Hindi entry with one draft or stale file makes `go run ./cmd/ingest -verify` exit 1 and name it. With everything approved, it exits 0.

### Tests for User Story 5

- [X] T032 [P] [US5] Create `internal/ingest/ingest_lang_test.go` with a fake upstream (an `httptest` server for the tree and raw files). Ingest with `lang=hi` writes `public-content/lang/hi/index.json` and `lang/hi/lessons/<id>.json` from `translations/hi/lessons/<folder>/README.md`. It resolves `../../../../translated_images/hi/<name>.webp` into the shared asset store with `image/webp`, uses the English image when a translated one is missing (FR-006), and skips missing translated lessons with a log line.
- [X] T033 [P] [US5] Create `internal/i18n/ledger_test.go` covering states `draft` → `approved` and `stale` when `sourceHash` or `translationHash` changes. A missing entry for any English file of an approved language is reported. Status values are exactly `draft` | `approved`, and kinds are exactly `base` | `adaptive` | `quiz` | `ui`.
- [X] T034 [P] [US5] Create `internal/i18n/parity_test.go`. A UI catalogue missing a key, a quiz missing a question or option, or an adaptive lesson missing an allowlisted field is reported. So is a translation that changes an ID, URL, code span, fenced code or the number of `§` citations. A plural set may differ in categories only per `Intl` rules.
- [X] T035 [P] [US5] Create `cmd/ingest/verify_lang_test.go`:
  - **Approved:** `-verify` exits 1 for an approved language with a draft, stale or missing entry or a parity failure. It prints one `LANG PATH: reason` line each.
  - **Hidden:** it exits 0 and prints the same lines as warnings.
  - **No Hindi:** the English-only checks are unchanged.
- [X] T036 [P] [US5] Create `cmd/translate/translate_test.go` with a fake OpenAI-compatible server:
  - Only allowlisted fields are sent.
  - Glossary terms appear in the prompt.
  - A response that breaks the Markdown structure is rejected and nothing is written.
  - An `approved` and current file is not overwritten without `-force`.
  - `-dry-run` makes no request.
  - The key never appears in output.

### Implementation for User Story 5

- [X] T037 [US5] Add the language pass in `internal/ingest/ingest.go`: walk `translations/<lang>/lessons/*` at the pinned SHA, resolve repo-root `translated_images/<lang>/` and `.webp`, and write under `lang/<code>/`. Add the `-lang` flag in `cmd/ingest/main.go`; with no flag, run every language in `languages.json`. Make T032 pass, and keep FR-ING-02's English behaviour unchanged.
- [X] T038 [US5] Implement `internal/i18n/ledger.go`: load `content/review/<code>.json`, SHA-256 hex hashes, and the `Check(contentRoot, code) []Problem` function that T033 tests
- [X] T039 [US5] Implement `internal/i18n/parity.go` with the field allowlists from contracts/content-files.md (adaptive, quiz, ui) and the preservation checks, so T034 passes
- [X] T040 [US5] Wire ledger and parity into `go run ./cmd/ingest -verify` in `cmd/ingest/main.go`. Approved problems fail and hidden ones warn, so T035 passes. The Dockerfile already runs `ingest -verify`, so no Dockerfile change is needed. *(2026-11-03: it was needed after all. The build stage now copies `content/`, `web/src/i18n` and `web/src/data/quizzes`, which the gate reads.)*
- [X] T041 [US5] Implement `cmd/translate/main.go` per contracts/cli.md:
  - flags `-lang`, `-kind adaptive|quiz|ui|all`, `-only`, `-force` and `-dry-run`;
  - environment `TRANSLATE_BASE_URL`, `TRANSLATE_API_KEY` and `TRANSLATE_MODEL`;
  - uses `go-openai`;
  - prompt rules: everyday Hindi for school-age learners, the English term in brackets at first use per section, the glossary;
  - upserts `draft` ledger entries.

  Make T036 pass. Document in `README.md` that it runs only on the owner's machine and that the key is never put in CI, Terraform or the image (FR-021).
- [X] T042 [US5] Amend `spec/SPEC.md`: FR-ING-02 now allows `translations/<lang>/` for languages in `languages.json` (marked "amended by SPEC-009, 2026-11-03"), and FR-I18N-04 adds the review ledger and release gate. Add AC-48 to `spec/ACCEPTANCE.md`, pointing at `cmd/ingest/verify_lang_test.go`, `internal/i18n/ledger_test.go` and `internal/feedback/check_hi_test.go`.
- [ ] T043 [US5] Release B2. Run `go run ./cmd/ingest -lang hi` and `go run ./cmd/translate -lang hi -dry-run` locally to confirm both run cleanly, then the full suites. Commit, open a PR and merge, then tag `v0.2.1`. Confirm the live `/api/runtime.languages` is still `[en]` (Hindi hidden).

**Checkpoint**: B2 is live. The Hindi pipeline and safety rules are in production, with Hindi still hidden.

---

## Phase 6: User Story 1 - Learner studies the course in Hindi (Priority: P1) — build B3 `v0.3.0` 🎯 first learner-visible increment

**Goal**: An approved Hindi UI, base lessons, kids and plain-English lessons and quizzes, with a switcher (FR-001–FR-011).

**Independent Test**: Choose हिन्दी. All six lessons in three modes and all quizzes are Hindi. No English UI string remains on learner pages. The choice survives a reload, and the `<html lang="hi">` attribute is set.

### Tests for User Story 1

- [X] T044 [P] [US1] Create `web/tests/i18n.spec.ts`, mocking runtime `languages: [en, hi]`:
  - **Switching:** the switcher in the header and in Settings switches in under 1 s, with no reload and no loss of progress. `<html lang="hi">` is set, and the choice persists across a reload.
  - **First visit:** with `navigator.languages = ['hi-IN','en']` the app opens in Hindi. With `['en','hi']` it opens in English.
  - **Fallback notice:** when the lesson response has `Content-Language: en` while Hindi is chosen, `[data-testid="not-translated-notice"]` shows in Hindi.
  - **Quiz:** a quiz renders Hindi prompts and options and scores correctly.
  - **No English left (SC-001):** walk the visible text of Home, Lesson (three modes), Quiz, Settings, the tutor panel and the feedback form. Assert no visible string equals a value in `en.json`, except entries allowlisted as technical terms.
- [ ] T045 [P] [US1] Add a Playwright case in `web/tests/i18n.spec.ts` at a 360×740 viewport, for Hindi Home, Lesson and Quiz. No element has `scrollWidth` greater than `clientWidth`, and all buttons and links are at least 44×44 px (SC-011, DC-11).

### Implementation for User Story 1

- [X] T046 [P] [US1] Create `web/src/components/LanguageSwitcher.tsx`. It renders only when `languages.length > 1`, shows each language's native `name`, uses `data-testid="language-switcher"` and has a 44 px minimum target and an accessible label. Place it in the header in `web/src/App.tsx` and in `web/src/components/SettingsModal.tsx`. Use the `impeccable` and `ui-ux-pro-max` skills for its design (CLAUDE.md).
- [X] T047 [P] [US1] Create `web/src/components/NotTranslatedNotice.tsx` (`data-testid="not-translated-notice"`, text `t('lesson.notTranslated')`). Show it in `web/src/pages/Lesson.tsx` and `web/src/components/AdaptiveLessonView.tsx` when `servedLang` differs from the chosen language, and in `web/src/pages/Quiz.tsx` when the quiz came from English.
- [X] T048 [US1] Make `loadQuizzes(code)` in `web/src/data/quizzes.ts` load `quizzes/<code>.json` dynamically, falling back per quiz to English and flagging it for the notice. In `web/src/pages/Home.tsx`, make search match titles in the chosen language and show reading time from the served content.
- [ ] T049 [US1] *(2026-11-03, in progress: `ingest -lang hi` is done (6 base lessons). The 12 adaptive lessons are drafted with Vertex `google/gemini-3.8-flash` (`global`). `web/src/i18n/hi.json` and `web/src/data/quizzes/hi.json` were still being translated at handoff; see T080.)* Run `go run ./cmd/ingest -lang hi` and `go run ./cmd/translate -lang hi -kind all`. This produces drafts for the 12 adaptive lessons under `public-content/lang/hi/lessons/`, for `web/src/data/quizzes/hi.json` and for `web/src/i18n/hi.json`. Add ledger `draft` entries for the 6 generated base lessons. Run `go run ./cmd/ingest -verify`, which should show warnings only, and commit the drafts.
- [ ] T050 [US1] `[external]` The owner names the native-speaker reviewer. The reviewer corrects every Hindi file and `content/glossary/hi.json` in PRs, then sets each ledger entry to `approved` with `reviewer` and `date`. Rate 20 sampled sections natural and accurate for the age group, needing at least 18 (SC-010), and record the result in `specs/009-indian-languages/checklists/hindi-review.md`.
- [ ] T051 [US1] *(2026-11-03, partly done: the app-wide 44 px and clipping fixes are in commit 07a4a51. The Devanagari line-height and wrapping review waits for hi.json.)* Review the Hindi screens at 360 px and on desktop with the `impeccable` and `ui-ux-pro-max` skills: line height for Devanagari, wrapping of long words, and contrast in light and dark. Fix any styling in `web/src/index.css` or the affected components so T045 passes.
- [ ] T052 [US1] Set Hindi to `"status": "approved"` in `public-content/languages.json`. `go run ./cmd/ingest -verify` must exit 0, and T044 and T045 must pass.
- [X] T053 [US1] Add FR-I18N-06 (learner language choice, browser-only, first-visit rule, not-translated notice) to `spec/SPEC.md`. Add AC-49 to `spec/ACCEPTANCE.md`, pointing at `web/tests/i18n.spec.ts`.
- [ ] T054 [US1] Release B3. Run the full suites, then commit, open a PR, merge and tag `v0.3.0`. On the live site, check `/api/runtime.languages` includes `hi`, and run the quickstart B3 checks in Chrome on desktop and Android.

**Checkpoint**: Hindi text is live (MVP for learners).

---

## Phase 7: User Story 2 - Learner listens to lessons in Hindi (Priority: P1) — build B4 `v0.3.1`

**Goal**: Recorded Hindi narration for every narrated track in each persona, with a device-voice fallback and never an English voice (FR-012–FR-016).

**Independent Test**: On a desktop with no Hindi voice, every narrated section of one lesson plays a Hindi recording in each persona. A second `narrate` run synthesises 0 tracks.

### Tests for User Story 2

- [ ] T055 [P] [US2] `[external]` Run a listening test of candidate `hi-IN` voices with `go run ./cmd/narrate -lang hi -cache .narration-cache -only global/chip-mascot-greeting` once T059 exists, one candidate per persona. Record the chosen voices in `content/voices/hi.json`, and recheck current Cloud TTS prices and the 5,000-byte limit (R9).
- [X] T056 [P] [US2] Create `internal/narration/text_test.go` from the shared fixture `content/fixtures/narration-text.json` (input fields and expected text). It covers heading plus the Chip quote plus body, link stripping, removal of `*_#`~>`, HTML stripping and keeping list numbering, matching `web/src/services/speechService.ts:169-172`.
- [X] T057 [P] [US2] Create `cmd/narrate/narrate_test.go` with a fake TTS server:
  - Splitting stays under 5,000 bytes at `।`, `.`, `?` and `!` boundaries.
  - Parts are joined into one MP3.
  - A cache hit makes 0 requests (SC-009).
  - The manifest matches contracts/content-files.md.
  - `-check` fails for a missing or stale track and passes when current.
  - `-dry-run` makes no request.
  - The token is never printed.
- [X] T058 [P] [US2] Create `web/tests/narration-hi.spec.ts`:
  - With Hindi and a mocked manifest and MP3, the section button plays an `<audio>` source `/audio/hi/...-<persona>.mp3`, and the stop control works.
  - With the track missing and a mocked `speechSynthesis` that has a `hi-IN` voice, it speaks with that voice.
  - With no Hindi voice, `t('narration.unavailable')` shows and no English voice is used.
  - English narration is unchanged.
  - Using the same fixture as T056, the browser text builder gives the same strings.

### Implementation for User Story 2

- [X] T059 [US2] Implement `internal/narration/text.go` (track keys `<lessonId>/<mode>/<trackId>` and `global/<trackId>`, and the text rule) and `cmd/narrate/main.go` per contracts/cli.md:
  - flags `-lang`, `-cache`, `-check`, `-dry-run` and `-only`;
  - environment `TTS_ACCESS_TOKEN` and `TTS_ENDPOINT`;
  - REST `v1/text:synthesize` with MP3 output through `net/http`;
  - output to `public-content/audio/<lang>/` and `manifest.json`.

  Make T056 and T057 pass.
- [X] T060 [US2] Have `go run ./cmd/ingest -verify` in `cmd/ingest/main.go` run the `narrate -check` logic for every approved language that has narrated tracks, so the Dockerfile's verify step blocks a release with missing or stale audio (FR-012)
- [X] T061 [P] [US2] Create `web/src/services/narrationText.ts` (the same rule as T059, using `t('narration.chipSays')`) and use it in `web/src/components/AdaptiveLessonView.tsx` and `web/src/components/ChipMascotBanner.tsx` in place of the inline string building
- [X] T062 [US2] Create `web/src/services/narration.ts`, which loads `/audio/<code>/manifest.json` once per language and caches it. Update `web/src/components/AudioNarrationButton.tsx` to play the recorded track for the selected persona through `HTMLAudioElement`. Reuse the active-track and stop handling, and add loading, stop and error states. Fall back to `speechService` when the manifest lacks the track.
- [X] T063 [US2] Update `web/src/services/speechService.ts` so voice choice prefers voices whose `lang` starts with the chosen `speechLang`. The English-only filter at line 125 applies only for `en`. A non-English text with no matching voice returns "unavailable" and is never spoken with an English voice (FR-013).
- [X] T064 [US2] Make sure `.mp3`, `.webp`, `.woff2` and the manifest are served with `audio/mpeg`, `image/webp`, `font/woff2` and `application/json`, and that `/audio/` is reachable like `/assets/`. Check `openPath` in `internal/api/session_gate.go` and the static handler in `internal/api/router.go`, and add a test in `internal/api/spa_fallback_test.go`.
- [X] T065 [US2] *(2026-11-03, owner choice: recordings are made on the owner's Mac, so the bucket holds the recordings and the deploy account only reads it; no CI synthesis role yet. `terraform plan`/`apply` in Cloud Shell is still to do.)* In `deploy/terraform/main.tf` and `deploy/terraform/variables.tf`, add:
  - the `texttospeech.googleapis.com` API;
  - a Cloud Storage bucket `${var.service_name}-narration-cache` (uniform access, a lifecycle rule to delete after 365 days, no public access);
  - for the deploy service account, `roles/serviceusage.serviceUsageConsumer` on the project and `roles/storage.objectAdmin` on the bucket only;
  - an output `narration_cache_bucket`.

  Run `terraform fmt` and `terraform validate`. `[external]` Then run `terraform plan`/`apply` in Cloud Shell.
- [X] T066 [US2] *(2026-11-03: the build job copies recordings from `GCP_NARRATION_BUCKET` instead of synthesising; earlier `-verify` steps use `-audio=false`. Synthesis in CI is a later step.)* In `.github/workflows/deploy.yml`, add the steps in the build job between `google-github-actions/auth` and the image build:
  1. `gcloud storage rsync gs://<cache-bucket> .narration-cache`
  2. `TTS_ACCESS_TOKEN=$(gcloud auth print-access-token) go run ./cmd/narrate -lang <each approved> -cache .narration-cache`
  3. `gcloud storage rsync .narration-cache gs://<cache-bucket>`

  Take the bucket from a new environment variable `GCP_NARRATION_CACHE_BUCKET`, and add it to the variable list in `scripts/automate_deployment.sh`.
- [X] T067 [US2] Add FR-I18N-07 (recorded narration per approved language, cache by text hash, release gate) and FR-I18N-08 (device-voice fallback, never another language's voice) to `spec/SPEC.md`, and AC-50 to `spec/ACCEPTANCE.md`
- [ ] T068 [US2] Release B4. Run the full suites, then commit, open a PR, merge and tag `v0.3.1`. Record the image size and cold-start time against `v0.3.0`, and the TTS characters billed, in `specs/009-indian-languages/checklists/hindi-review.md`. Re-tag a no-content-change release and confirm 0 characters are billed (SC-009).

**Checkpoint**: Hindi audio is live.

---

## Phase 8: User Story 6 - Tutor answers in Hindi (Priority: P3) — build B5 `v0.3.2`

**Goal**: Hindi answers, citations, fallback and safety replies, and a Hindi microphone (FR-025, FR-026).

**Independent Test**: With a local AI and Hindi chosen, an answer about lesson 1 is in Hindi and cites a Hindi heading. A Hinglish address gets the Hindi safety reply, and no model is called.

- [X] T069 [US6] `[external]` Get the owner's ratification of a Constitution Principle II amendment in `.specify/memory/constitution.md`: the fallback is the quoted English text "or its approved translation in the learner's language". Add the matching note to FR-TUT-06 in `spec/SPEC.md`. **Blocks T071–T074.**
- [X] T070 [P] [US6] Extend `internal/api/tutor_prepare_test.go` and `internal/api/tutor_test.go`:
  - With `"lang":"hi"`, the prompt uses `lang/hi/lessons/1-intro.json`, the system prompt has the Hindi-answer instruction, `citation` uses the Hindi title and heading, and `fallback` and the safety replies are the `hi` messages.
  - `"lang":"zz"` behaves as `en`.
  - Unknown fields are still rejected.
- [X] T071 [US6] Add `Lang string \`json:"lang,omitempty"\`` to `TutorRequest` in `internal/api/tutor.go`, validated through `i18n.Resolve`. `loadTutorPrompt` reads from `lang/<code>/` with English fallback and appends "Answer in simple Hindi (Devanagari), keeping technical terms with English in brackets." Make `UncitedFallback` and `SafetyReply` come from `internal/i18n/messages.go`, and update `internal/api/tutor_prepare.go` so T070 passes.
- [X] T072 [US6] Send `lang` from `askTutorStream` and the local-AI path in `web/src/api.ts`. In `web/src/components/TutorPanel.tsx`, set speech recognition `lang` to the chosen language's `speechLang` (FR-026).
- [X] T073 [P] [US6] Add a Hindi case to `web/tests/cloud-hardening.spec.ts`. With Hindi chosen and a mocked `/api/tutor/prepare` and local AI, the request carries `lang: "hi"`, the answer streams and the Hindi citation is appended. Also check that the recognition `lang` is `hi-IN`.
- [ ] T074 [US6] *(2026-11-03: FR-I18N-09 and AC-51 are written in SPEC.md 2.7.0 and ACCEPTANCE.md, and the code is done and tested. Only the release part is left.)* Add FR-I18N-09 (tutor in the learner's language) to `spec/SPEC.md` and AC-51 to `spec/ACCEPTANCE.md`. Release B5: run the full suites, commit, open a PR, merge and tag `v0.3.2`.

**Checkpoint**: All Hindi stories are live.

---

## Phase 9: User Story 7 - The next language needs content only (Priority: P3)

**Goal**: Prove FR-028 before round 2.

**Independent Test**: A second fixture language is served, verified and listed with no code change.

- [X] T075 [P] [US7] Create `internal/i18n/second_language_test.go`. Using a temp `contentDir` with a fixture language `ta`, write `languages.json` (approved), a ledger with approved entries and current hashes, and translated files. Assert `/api/runtime.languages` lists it, the lessons API serves it with `Content-Language: ta`, `ingest -verify` passes, and no Go or TS source references `"hi"` outside catalogues and fixtures (grep the source tree).
- [X] T076 [US7] Write `docs/adding-a-language.md`:
  1. add the code to `languages.json` as hidden;
  2. `ingest -lang`;
  3. `translate`;
  4. glossary;
  5. voices and a listening test;
  6. review and ledger approval;
  7. set to approved;
  8. release.

  Note that Urdu needs right-to-left layout, and that Gujarati and Odia need base-lesson translation (out of scope). Link it from `README.md`.

---

## Phase 10: Polish and cross-cutting concerns

- [X] T077 [P] Update `README.md` (language support, `cmd/translate`, `cmd/narrate`, owner-only key handling) and `APP_USAGE.md` (how learners switch language and use Hindi narration)
- [ ] T078 Run `/speckit-converge` for `specs/009-indian-languages` after B5, and act on its findings
- [ ] T079 [P] Review the whole Hindi learner journey against DC-11 in light and dark with the `impeccable` skill, in both themes, and fix any findings

---

## Dependencies and execution order

### Phase dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: after Setup. Blocks every story.
- **US3 (Phase 3, B1)**: after Foundational. Release B1 (T024) before starting B2 work on `main`/`cloud-beta`.
- **US4 (Phase 4) and US5 (Phase 5), together B2**: after B1. US4 and US5 are independent of each other and can run in parallel. T043 releases both.
- **US1 (Phase 6, B3)**: after B2. It needs US4 (FR-024: no Hindi before the safety rules) and US5 (ledger, ingest, translate).
- **US2 (Phase 7, B4)**: after B3. Narration needs approved Hindi adaptive text. T059 can be built in parallel with Phase 6.
- **US6 (Phase 8, B5)**: after B3. It needs T069 (the constitution amendment) and is independent of B4.
- **US7 (Phase 9)**: after B3. It can run alongside B4 and B5.
- **Polish (Phase 10)**: after B5.

### Story dependency graph

```text
Setup → Foundational → US3 (B1) ─┬─ US4 ─┐
                                 └─ US5 ─┴→ US1 (B3) ─┬→ US2 (B4)
                                                      ├→ US6 (B5, needs T069)
                                                      └→ US7
```

### Within each story

Tests come first and must fail. Then libraries in `internal/` before CLIs and handlers, then the UI, then the spec amendment, then the release task.

### Parallel opportunities

- **Setup:** T002–T005.
- **Foundational:** T006, T008, T011, T012, T014 (tests and new files). T007 → T009 → T010 run in order.
- **US4:** T025–T027 together, then T028 and T029 in parallel (different files).
- **US5:** T032–T036 together. T037, T038 and T039 in parallel, then T040 and T041.
- **US4 and US5:** whole phases in parallel by two people.
- **US1:** T044–T047 together.
- **US2:** T056–T058 and T061 together. T065 (Terraform) in parallel with T062–T063.

### Parallel example: User Story 5

```text
Task: "T032 internal/ingest/ingest_lang_test.go"
Task: "T033 internal/i18n/ledger_test.go"
Task: "T034 internal/i18n/parity_test.go"
Task: "T035 cmd/ingest/verify_lang_test.go"
Task: "T036 cmd/translate/translate_test.go"
then: "T037 ingest.go" ∥ "T038 ledger.go" ∥ "T039 parity.go"
```

---

## Implementation strategy

### Increment order (FR-027)

1. **B1 `v0.2.0`:** Phases 1–3. The foundation goes to production with English unchanged.
2. **B2 `v0.2.1`:** Phases 4–5. Safety rules and the translation and review pipeline. Hindi is hidden.
3. **B3 `v0.3.0`:** Phase 6, the **first learner-visible increment (MVP)**: Hindi text.
4. **B4 `v0.3.1`:** Phase 7. Hindi audio.
5. **B5 `v0.3.2`:** Phase 8, after the constitution amendment. Hindi tutor.
6. **Round 2 readiness:** Phases 9–10.

### Notes

- Every release keeps all existing English tests green (SC-007). A change to an English test is allowed only where the string now comes through `t()` with the same text.
- **Commits:** commit by explicit path only (Constitution V, Rule 10), with conventional commit prefixes.
- **External tasks:** T050 (reviewer), T055 (listening test), T065 apply, and T069 (ratification) need people. Schedule them early so they don't block a build.

---

## Handoff (2026-11-03): where the work stands

Read this first if you are picking the feature up.

### Git

- **Branch:** `009-indian-languages`.
- **Pushed to origin:** B1 (`ae906bf`) and B2 (`e65edf4`) only. No PR yet, because the `gh` CLI isn't installed and the GitHub connector failed. Open the PR from https://github.com/ashishisme/AI-Learning-Mod/compare/cloud-beta...009-indian-languages.
- **Committed locally, not pushed:**
  - B3: `5bd7150` spec, `cd5da1d` code, `07a4a51` the 44 px fixes;
  - B4: `2ec299e` spec, `6094eec` code.
- **Uncommitted** (all tests pass): B5 (the tutor in Hindi), the Constitution 2.4.0 amendment, SPEC 2.7.0, the second-language test and guide (T075, T076), APP_USAGE and README updates (T077), the translator retry and `-record-base`, the URL-punctuation fix in parity, and the topic-label catalogue keys. Also uncommitted are the Hindi drafts under `public-content/lang/hi/` and `content/review/hi.json`.
- **How to commit:** with explicit paths only (Rule 10), and the spec change in its own commit (`spec: add FR-I18N-09, AC-51, amend FR-TUT-06 and Constitution II …`).
- **Delete before committing:** `web/zz-audit.mjs` is a throwaway audit script; delete it after T081.

### Environment on the owner's Mac

- **`gcloud`:** at `~/google-cloud-sdk/bin/gcloud` (not on PATH for agents), signed in as the owner, project `ai-learning-513415`.
- **Terraform:** `/usr/local/bin/terraform` v1.9.8. The configuration validates, but has **not** been planned or applied (T065).
- **GitHub token:** a working one is in `.env`, which is ignored by git.
- **Translate env:**
  - `TRANSLATE_BASE_URL=https://aiplatform.googleapis.com/v1/projects/ai-learning-513415/locations/global/endpoints/openapi`
  - `TRANSLATE_MODEL=google/gemini-3.8-flash`
  - `TRANSLATE_API_KEY=$(~/google-cloud-sdk/bin/gcloud auth print-access-token)`, valid for one hour.
- **Hindi preview:**
  - Run a server with `CONTENT_DIR` pointing at a copy of `public-content` whose `languages.json` marks `hi` approved, without the `.env` auth settings. Then run `vite` on port 3000.
  - The repository's `languages.json` keeps Hindi **hidden** until T052.

### What learners would see today, with Hindi switched on in the preview

- **Hindi:** all 6 base lessons (the course's own translation) and all 12 Kids and Plain English lessons (AI drafts).
- **English until T080 and T081:** UI chrome, quizzes, topic labels and voice-studio text.

### Owner decisions already taken

See spec.md "Clarifications, later session" and plan.md "Implementation decisions and deviations".

### Next tasks

- [ ] T080 Finish the Hindi UI catalogue and quizzes. The background run started at handoff may have written `web/src/i18n/hi.json` and `web/src/data/quizzes/hi.json`; check with `go run ./cmd/ingest -verify` (warnings list what's missing). Otherwise run `go run ./cmd/translate -lang hi -only web/src/i18n/hi.json` and `-only web/src/data/quizzes/hi.json` with the translate env above. Then rerun the UI file once, so it includes the `module.*` keys added after the run started.
- [ ] T081 With the Hindi preview running, run `node web/zz-audit.mjs`, which lists visible English per page: Home, Settings, Help, the voice studio, every lesson in 3 modes, every quiz.
  - Move every leftover string into `web/src/i18n/en.json` with the same English text, so the B1 baseline stays green, and render it through `t()`.
  - Names (Chip, Nova, Prof. Alan) and code may stay.
  - Then translate the UI file again, until the audit lists only names and code. The SC-001 test in `web/tests/i18n.spec.ts` then runs, because `hi.json` exists, and must pass, together with the 360 px test (T045).
- [ ] T082 Run `go run ./cmd/translate -lang hi -record-base`. Then `go run ./cmd/ingest -verify` should list only drafts, plus "no recordings yet" for audio.
- [ ] T083 Run the full suites (`go vet ./... && go test -race ./...`, and `cd web && npx tsc --noEmit -p . && npx playwright test --project=chromium`). Commit B5 (spec, then code), the docs and the Hindi drafts by explicit path. Ask the owner before pushing.
- [ ] T084 `[external]` The owner reviews the 20 new translated images in `public-content/assets/*.webp` for Microsoft logos (NFR-LIC-02). Add any offending content hash to `brandedImages` in `internal/ingest/ingest.go`.
- [ ] T085 `[external]` The owner applies Terraform in Cloud Shell (narration bucket, TTS and Storage APIs) and sets the GitHub variable `GCP_NARRATION_BUCKET` (`automate_deployment.sh` does this).
- [ ] T086 Voice listening test (T055):
  - Run `go run ./cmd/narrate -lang hi -sample <voice>` for a few `hi-IN` WaveNet or Neural2 voices, with `TTS_ACCESS_TOKEN` and `TTS_PROJECT=ai-learning-513415` set.
  - The owner picks one voice per persona, and they go into `content/voices/hi.json`.
  - Then run `narrate -lang hi` and `gcloud storage rsync` to the bucket. Re-record after the reviewer's corrections, because only changed text is recorded again.
- [ ] T087 Releases, in order, with owner approval at each outward step: push the branch, PR to `cloud-beta`, merge, then tag `v0.2.0` (B1) through `v0.3.2` (B5) as the plan describes. Hindi stays hidden until T050 (reviewer approval) and T052 (status `approved`).
