---
description: "Tasks for SPEC-015: Kannada and Tamil"
---

# Tasks: Kannada and Tamil

**Input**: Design documents from `specs/015-kannada-tamil-languages/` ([plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/language-pack.md](contracts/language-pack.md), [quickstart.md](quickstart.md))

**Tests**: Included. The safety and personal-details rules are a security requirement (US3, SC-003), and the release check and font isolation (SC-004) need automated proof, as for Hindi (AC-48..AC-52).

**Organization**: the phases run in this order:
1. Setup, then the code shared by both scripts (Foundational).
2. US3, safety for both scripts. It is a launch blocker for any language, so it comes before content.
3. US1, Kannada content (the pilot).
4. US2, Tamil content.

## Format: `[ID] [P?] [Story] Description`

## Standing rules

- **Smallest change:** apply `ponytail`.
- **UI:** `impeccable` / `ui-ux-pro-max` within DC-11; no new npm packages; don't run the impeccable engine.
- **Approvals:** the owner approves every Kannada and Tamil file, with `go run ./cmd/review -lang <code> -reviewer "owner (beta)" -approve <paths>`. Claude never records an approval the owner has not given.
- **No Python** in the app; scratchpad drafting scripts only.
- **Downloads** (fonts) need the owner's yes, giving file name, source and size first.
- **Git:** commit, push and tag only when the owner asks, with explicit paths.
- **Browser tests:** from `web/`, `npx playwright test -c playwright.tmp3001.config.ts`.

---

## Phase 1: Setup

- [ ] T001 Amend `spec/SPEC.md` to 2.17.0 in a `docs(spec):` commit:
  - **FR-I18N-05:** the feedback check and safety screen catch the same categories in every listed script (Devanagari, Kannada, Tamil) and its romanised form; every Indian script's digits are folded; zero-width joiner and non-joiner (U+200C/U+200D) are dropped before matching.
  - **Fonts (R12):** each script's font is served by the product and fetched only when that script is on screen; the Kids journey has a Kids font per script.
  - **New ACs:**
    - AC-79 (FR-I18N-05: `internal/api/safety_lang_test.go`, `internal/feedback/check_lang_test.go`);
    - AC-80 (fonts: `web/tests/i18n-foundation.spec.ts`);
    - AC-81 (a Kannada/Tamil learner: `web/tests/languages-kn-ta.spec.ts`).
  - **ACCEPTANCE:** add rows with status "pending".
- [ ] T002 [P] Add `kn` and `ta` to `public-content/languages.json` as `{ "code": "kn", "name": "ಕನ್ನಡ", "speechLang": "kn-IN", "status": "hidden", "beta": true }` and `{ "code": "ta", "name": "தமிழ்", "speechLang": "ta-IN", "status": "hidden", "beta": true }`. Run `go run ./cmd/ingest -verify -audio=false`: a hidden language's problems are warnings only, so it must still exit 0.

---

## Phase 2: Foundational (code for both scripts; both languages stay hidden)

- [ ] T003 [P] In `internal/i18n/fold.go`, add `FoldScripts(r rune) rune`:
  - Devanagari folding as today (`FoldDevanagari`);
  - drop U+200C and U+200D;
  - map the digits of every Indian script to ASCII, using the zero code points now in `internal/feedback/check.go` `digitZeros` (move that list here and reuse it there).

  Add tests to `internal/i18n/fold_test.go`: Kannada "೯೮೭" → "987", Tamil "௯௮௭" → "987", ZWJ/ZWNJ dropped, Hindi cases unchanged.
- [X] T003a [P] (analysis G1, SC-001) Add `i18n.Untranslated` in `internal/i18n/untranslated.go`. It reports a translatable text still identical to English when it has two or more words with letters; single terms ("AI", "ReLU"), placeholders and numbers are allowed. Run it in `i18n.Check`, so an approved language fails and a hidden one warns. Test: `internal/i18n/untranslated_test.go`. Hindi passes it unchanged.
- [ ] T004 Use `i18n.FoldScripts` in `internal/api/safety.go` `normalizeForScreening`, in place of the Devanagari-only fold and the U+0966 digit case, and in `internal/feedback/check.go`. Extend `digitTokenRe` to `[a-z]+|\d+|\p{Devanagari}+|\p{Kannada}+|\p{Tamil}+`. Confirm `go test ./internal/api/ ./internal/feedback/` still passes for English and Hindi.
- [ ] T005 [P] Add `kn` and `ta` entries to every map in `internal/i18n/messages.go`:
  - feedback rejection kinds and text (the `%s` placeholder kept);
  - safety replies per category;
  - `UncitedFallback`.

  Claude drafts these, and the owner approves them with the language in T020/T033. Add a case to `internal/i18n/messages_test.go` (or the existing messages test): every language listed in `languages.json` has every message.
- [X] T005a [P] (analysis G2, FR-013) Add `internal/api/tutor_kn_ta_test.go`. For `kn` and `ta`, the tutor prompt uses that language's lesson, tells the model to answer in it, and cites its heading. The fallback check skips until T005 adds the language's messages; T005 is done when it runs and passes.
- [ ] T006 [P] Fonts, after the owner approves the downloads. Ask first, naming each file, its source and size:
  - Noto Sans Kannada and Noto Sans Tamil, variable woff2 (notofonts / Google Fonts);
  - Baloo Tamma 2 and Baloo Thambi 2, SemiBold/Bold woff2 (Google Fonts).

  Then:
  - put them in `web/public/fonts/`, with their OFL licence text beside them (`OFL-NotoSansKannada.txt`, …);
  - add `@font-face` rules to `web/src/index.css` with `unicode-range` U+0C80–0CFF (Kannada) and U+0B80–0BFF (Tamil);
  - name the Kids fonts only under `[data-journey="junior"]`, as the Latin Kids fonts are;
  - add the script fonts to the body font stacks after Noto Sans Devanagari.
- [ ] T007 [P] In `web/src/services/speechService.ts` persona `preferredKeywords`, add the common Kannada and Tamil device voice names ("Google ಕನ್ನಡ", "Google தமிழ்", and Windows "Valluvar" for Tamil). These are only a fallback; lessons use recordings.
- [ ] T008 [P] Widen `web/tests/i18n-foundation.spec.ts` "English pages never fetch another language or the Devanagari font" (AC-80): no request matching `/\/(hi|kn|ta)\.json|NotoSans(Devanagari|Kannada|Tamil)|Baloo(Tamma|Thambi)/` on English pages. Add one test that a page showing Kannada text requests NotoSansKannada and not NotoSansTamil.

**Checkpoint**:
- `go test ./...` and `npx tsc --noEmit -p .` pass;
- the full Playwright suite passes (only `settings-hosted-local` fails, as always);
- English and Hindi are unchanged.

---

## Phase 3: User Story 3 — feedback and tutor input in Kannada and Tamil are kept safe (Priority: P1) 🔒 launch blocker

**Goal**: personal details and unsafe requests are caught in Kannada and Tamil script, native digits and romanised form.

**Independent Test**: `go test ./internal/api/ ./internal/feedback/` with the `kn_*` and `ta_*` test sets: every blocked case is refused and every clean case passes.

### Tests for User Story 3

- [ ] T009 [P] [US3] Write `internal/api/testdata/kn_safety.json` and `internal/api/testdata/ta_safety.json` in the shape of `hi_safety.json` (`{ "blocked": [{text, category}...], "clean": [...] }`):
  - at least one blocked case per safety category, in script and in romanised form (Kanglish, Tanglish);
  - at least 15 clean lesson questions per language, including words close to the rules (e.g. "kill" in a computing sense, as the English set has).
- [ ] T010 [P] [US3] Write `internal/feedback/testdata/{kn,ta}_personal_details.json` (`[{text, kind}]`) and `{kn,ta}_clean.json`. For each language:
  - every kind (email, phone, address, id_number, dob, link) in script, in native digits (Kannada ೦–೯, Tamil ௦–௯) and in romanised form;
  - street words: ರಸ್ತೆ, ಬಡಾವಣೆ, ನಗರ, ಕ್ರಾಸ್, ಮುಖ್ಯ ರಸ್ತೆ for Kannada; தெரு, சாலை, நகர், வீதி for Tamil;
  - date-of-birth phrases: ಹುಟ್ಟಿದ ದಿನ / ಜನ್ಮದಿನ for Kannada; பிறந்த நாள் / பிறந்தநாள் for Tamil;
  - at least 15 clean feedback sentences each.
- [ ] T011 [US3] Generalise the Hindi-only tests:
  - `internal/api/safety_hi_test.go` → `internal/api/safety_lang_test.go`;
  - `internal/feedback/check_hi_test.go` → `internal/feedback/check_lang_test.go`;
  - each loads every `testdata/<code>_safety.json` / `<code>_personal_details.json` / `<code>_clean.json` it finds and runs the same assertions per language (AC-79).

  Run it: the new Kannada and Tamil cases fail before T012/T013, and Hindi still passes.

### Implementation for User Story 3

- [ ] T012 [US3] In `internal/api/safety.go`, add Kannada and Tamil rules beside the Hindi ones, one per category in `safetyRules`. Use the same `(?:^| )` start (`hiRule`, renamed `scriptRule`) on folded text, and add the romanised forms to the English-letter rules. Make `go test ./internal/api/` pass for kn and ta.
- [ ] T013 [US3] In `internal/feedback/check.go`, add the Kannada and Tamil rule families mirroring the `hi*` ones:
  - email "at/dot" words (ಡಾಟ್/டாட், ಅಟ್/அட்);
  - apps;
  - premises (ಮನೆ ನಂ, ಫ್ಲಾಟ್ / வீடு எண், பிளாட்);
  - postcode (ಪಿನ್ ಕೋಡ್ / பின் கோடு);
  - stated address (ನನ್ನ ವಿಳಾಸ / என் முகவரி);
  - street (T010 words after a number);
  - date of birth.

  Keep `hiStart`/`hiEnd` as the general boundaries (rename to `scriptStart`/`scriptEnd`). Make `go test ./internal/feedback/` pass for kn and ta with no clean sentence refused.

**Checkpoint**: SC-003. Every Kannada and Tamil case is caught, with no false refusals; AC-79 passes.

---

## Phase 4: User Story 1 — a Kannada learner uses the whole course in Kannada (Priority: P1) 🎯 pilot

**Goal**: Kannada is offered as beta with every file approved and every track recorded.

**Independent Test**: [quickstart.md](quickstart.md) steps 1–5 for `kn`.

### Tests for User Story 1

- [ ] T014 [P] [US1] Write `web/tests/languages-kn-ta.spec.ts` (AC-81), with the runtime mocked to offer `kn` (beta). Tests:
  - the menu shows "ಕನ್ನಡ" with the beta label, and choosing it sets `<html lang="kn">` without a reload;
  - a lesson in each journey has no not-translated notice and requests NotoSansKannada;
  - (analysis G3, FR-009) a Kids lesson in Kannada requests the Baloo Tamma 2 font, and a Plain English lesson does not;
  - at 390 px width, no element on Home, Lesson (each journey), Quiz, Settings or Help is wider than the viewport, and every button is ≥ 44×44.

  Skip a test while `web/src/i18n/kn.json` is missing, as `i18n.spec.ts` does for Hindi.

### Implementation for User Story 1

- [ ] T015 [US1] Draft `content/glossary/kn.json` in `hi.json`'s shape (the same English terms). The owner confirms the terms before T016.
- [ ] T016 [US1] Draft `web/src/i18n/kn.json`: every key of `en.json`, with the placeholders `{n}`, `{total}`, `%s` etc. kept. Then run `go run ./cmd/ingest -verify -audio=false` (it prints warnings only while hidden) and `go test ./internal/i18n/`.
- [ ] T017 [US1] Listening test. For each candidate `kn-IN` voice in the speech service's list, run `TTS_ACCESS_TOKEN="$(gcloud auth print-access-token)" TTS_PROJECT=ai-learning-513415 go run ./cmd/narrate -lang kn -sample <voice>` and give the owner the sample files. The owner picks one voice each for chip, nova and alan. Write `content/voices/kn.json` with a note naming the owner and the date.
  - Candidates (checked against the speech service on 2026-11-14):
    - `kn-IN-Wavenet-A`/`C` (female) and `B`/`D` (male), the same family as two of the Hindi voices;
    - the 30 `kn-IN-Chirp3-HD-*` voices, which sound the most natural but cost more per character. Suggested shortlist: Kore, Aoede, Leda (female); Charon, Puck, Orus (male).

    The Standard voices are skipped.
  - Chirp3-HD voices refuse any pitch other than 0 ("This voice does not support pitch parameters"), so `content/voices/kn.json` must set `"pitch": 0` for them; only `speakingRate` may change. Price the chosen mix with `-dry-run` (T021) before recording.
- [ ] T018 [P] [US1] Draft the six Kannada Kids lessons `public-content/lang/kn/lessons/<id>.junior.json` from the English, using the glossary. Keep the structure, `bands`, check-in answers and scene names. Run `go test ./internal/i18n/` after each.
- [ ] T019 [P] [US1] Draft the six Kannada Plain English lessons and the six Detailed lessons (with clip captions and descriptions, the same `clip` names and step counts) in `public-content/lang/kn/lessons/`, plus `web/src/data/quizzes/kn.json` (the same correct answers) and `public-content/lang/kn/index.json` (each title is the start of its Detailed title). Run the parity check and the clip check.
- [ ] T020 [US1] Owner review and approval, all as `owner (beta)`:
  - glossary, `web/src/i18n/kn.json`, the 18 lessons, quizzes, lesson list;
  - the Kannada server messages from T005.

  Give the owner the exact `go run ./cmd/review -lang kn -reviewer "owner (beta)" -approve …` command(s). Then `go run ./cmd/ingest -verify -audio=false` shows no `kn` problem.
  - (analysis U1) The server messages in `internal/i18n/messages.go` are Go code, so the ledger does not cover them. Record the owner's approval here as "Kannada server messages approved by the owner (beta) on <date>, commit <sha>". Any later change to a `kn` message needs a new note.
- [ ] T021 [US1] Run `go run ./cmd/narrate -lang kn -dry-run`, then report the recordings and characters billed. After the owner approves the cost, record with `go run ./cmd/narrate -lang kn` (0 failed).
- [ ] T022 [US1] Owner uploads: `cd "/Users/santoshsharma/Documents/code/AI Learning Mod" && gcloud storage rsync --recursive public-content/audio gs://ai-learning-513415-ai-foundations-coach-narration/audio`. Check that `gcloud storage cat …/audio/kn/manifest.json | shasum` equals the local `shasum public-content/audio/kn/manifest.json`.
- [ ] T023 [US1] Set `kn` to `"status": "approved"` (keep `"beta": true`) in `public-content/languages.json`. Run the release gates:
  - `go run ./cmd/ingest -verify` (with audio) exits 0;
  - `go vet ./...`, `go test ./...`, `go run ./cmd/assetcheck`, `npx tsc --noEmit -p .`;
  - the full Playwright suite, including T014 un-skipped;
  - an owner check by eye (quickstart step 5).
- [ ] T024 [US1] When the owner asks, commit with explicit paths and push `cloud-beta`. Tag `v0.12.0` only on the owner's word; the owner approves promote. Check the live site: `/api/runtime` lists `kn` with beta, the switcher shows it, and a lesson plays Kannada narration.

**Checkpoint**: Kannada is live as beta (SC-001, SC-002, SC-004, SC-006 for `kn`).

---

## Phase 5: User Story 2 — a Tamil learner uses the whole course in Tamil (Priority: P2)

**Goal**: the same as US1 for Tamil, after Kannada is live (FR-002).

**Independent Test**: [quickstart.md](quickstart.md) with `ta`, plus the 390 px overflow check.

- [ ] T025 [US2] Extend `web/tests/languages-kn-ta.spec.ts` with the same cases for `ta` ("தமிழ்", NotoSansTamil, Baloo Thambi 2 on Kids pages only, `<html lang="ta">`, the 390 px width check with the longest Tamil strings).
- [ ] T026 [US2] Draft `content/glossary/ta.json`; the owner confirms the terms.
- [ ] T027 [US2] Draft `web/src/i18n/ta.json` (every key, placeholders kept). Shorten any string that overflows at 390 px and record it in the T033 review notes.
- [ ] T028 [US2] Listening test for `ta-IN` voices (as T017), then `content/voices/ta.json`.
- [ ] T029 [P] [US2] Draft the six Tamil Kids lessons in `public-content/lang/ta/lessons/<id>.junior.json`.
- [ ] T030 [P] [US2] Draft the six Tamil Plain English and six Tamil Detailed lessons (clips kept exact), `web/src/data/quizzes/ta.json` and `public-content/lang/ta/index.json`.
- [ ] T031 [US2] Fix any phone-width overflow found by T025 in the shared components (`web/src/components/*`), using wrapping (`break-words`, `min-w-0`) rather than smaller text. Re-run the Kannada and Hindi tests to confirm nothing regressed.
- [ ] T032 [US2] Run `go run ./cmd/narrate -lang ta -dry-run`, then report and record once the owner approves the cost.
- [ ] T033 [US2] Owner review and approval as `owner (beta)` of every Tamil file (exact commands given) and the Tamil server messages, recorded as a dated note here, as in T020 (analysis U1).
- [ ] T034 [US2] Owner uploads the recordings, then the manifest check (as T022).
- [ ] T035 [US2] Set `ta` to approved (beta kept), run the release gates (as T023), then commit, push and tag the next version when the owner asks.

**Checkpoint**: Tamil is live as beta (SC-001..SC-006 for `ta`).

---

## Phase 6: Polish & cross-cutting

- [ ] T036 [P] Update `docs/adding-a-language.md` with what the Kannada pilot taught:
  - script fonts and the Kids font per script;
  - the generalised safety tests (`<code>_*.json`);
  - `FoldScripts`;
  - voice choice notes.
- [ ] T037 [P] Update the memory file `spec-015-kannada-tamil.md` after each release.
- [ ] T038 Set `spec/ACCEPTANCE.md` AC-79..AC-81 to "PASS (automated)". Close SPEC-015 in its spec status and `spec/SPEC.md` §0 once SC-001..SC-006 hold for both languages.

---

## Dependencies & Execution Order

- **Setup (T001–T002)** comes first; T001 is the `docs(spec):` commit before code.
- **Foundational (T003–T008)** blocks everything else. T004 needs T003. T006 waits on the owner's download approval.
- **US3 (T009–T013)** follows T003/T004. It blocks any language going live (T023, T035), but not content drafting.
- **US1 (T014–T024)** follows the Foundational phase. Drafting (T015–T019) can run alongside US3. T020 needs T005 and T015–T019. T021 needs T017 and T020. T023 needs US3 and T022.
- **US2 (T025–T035)** starts after T024 (Kannada live, FR-002).
- **Polish (T036–T038)** comes last; T037 runs after each release.

### Parallel opportunities

- **Foundational:** T003, T005, T006, T007 and T008 touch different files.
- **US3:** T009 and T010 (the test sets).
- **US1:** T018 and T019 (different lesson files), once T015/T016 are done.
- **US2:** T029 and T030.

## Parallel Example: User Story 1

```text
After the glossary (T015) and interface text (T016):
  T018 Kids lessons kn        (public-content/lang/kn/lessons/*.junior.json)
  T019 Plain/Detailed + quiz  (public-content/lang/kn/lessons/*.{plain-english,detailed}.json, quizzes/kn.json)
```

## Implementation Strategy

### MVP (Kannada beta, v0.12.0)

T001–T013 (code and safety for both scripts), then T014–T024. Stop after Kannada ships and gather feedback before Tamil.

### Incremental delivery

Tamil (T025–T035) reuses everything; it adds only content, the overflow fixes and its own recordings.

## Notes

- Kannada and Tamil keep English digits in lessons, so the clips (SPEC-014), which show numbers, match their captions.
- Any later change to an English lesson or clip makes the `kn`/`ta` approvals stale. Finishing the SPEC-014 clips for lessons 1, 2, 4, 5 and 7 before T018/T019 avoids translating and recording those sections twice.
