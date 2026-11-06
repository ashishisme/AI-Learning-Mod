# Tasks: Kids-First UI Overhaul

**Input**: Design documents from `/specs/011-kids-ui-overhaul/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/learner-journey.md, quickstart.md, kids-home-brief.md, `/DESIGN.md` (baseline)

**Tests**: Requested. SC-001 to SC-005 and the quickstart require journey, migration-free persistence, accessibility, visual and asset checks, so each story starts with its Playwright and Go tests.

**Owner decisions in force (spec Clarifications, 2026-11-04)**:

- Standard stays a journey.
- Kids home is "Chip's Trail": no search or filters, and the clay look in blue, amber and pink with Baloo 2 and Comic Neue.
- Art is generated with Gemini on Vertex AI (`gemini-2.5-flash-image`, region `us-central1`) or hand-authored as SVG, and every asset is recorded in the register.
- SC-006's +350 KB budget is accepted for the build, then reviewed for performance.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: US1 Kids journey, US2 Plain English or Standard, US3 original visuals, US4 accessible everywhere

## Path Conventions

The web app is in `web/src/` and its tests in `web/tests/`. Go is in `cmd/` and `internal/`. Brand sources live in `design/brand/`, and shipped derivatives in `web/public/brand/`.

---

## Phase 1: Setup

- [X] T001 Create `design/brand/` (with `README.md` stating the register rules from research R5) and `web/public/brand/`. Add `design/brand/masters/` to `.gitignore` for large generated masters.
- [X] T002 [P] Add `design/brand/asset-register.json` with the schema in data-model.md: `id`, `purpose`, `releaseFiles` with SHA-256, `sourceMaster`, `creator` (for AI: `model`, `modelVersion`, `prompt`, `references`, `generatedAt`), `rightsBasis`, `rightsEvidence`, `trademarkScreen`, `altKey` or `decorative`, `motion`, `status`, `reviewers`. Start with an empty `assets` array.
- [X] T003 [P] Download the OFL Baloo 2 (600, 700) and Comic Neue (400, 700) files from Google Fonts' GitHub source once. Subset them to Latin with `pyftsubset`, a dev-only tool under DC-10. Store them as `web/public/fonts/Baloo2-*.woff2` and `ComicNeue-*.woff2` beside `OFL.txt`, and record their sizes in `specs/011-kids-ui-overhaul/checklists/perf-review.md`.

## Phase 2: Foundational (blocks every story)

- [X] T004 Amend `spec/SPEC.md` (2.9.0) and `spec/ACCEPTANCE.md`. Add visual-asset rights (SPEC-011 FR-009 to FR-012), the first-time journey chooser (FR-003), and the page-weight review (SC-006), with new AC entries. The three-mode requirements stay.
- [X] T005 [P] Add Kids design tokens to `web/src/index.css` as CSS custom properties under a `[data-journey="junior"]` scope:
  - the clay palette for light and dark, from kids-home-brief.md section 3;
  - 20 px corners and 3 px borders;
  - the double shadow and a 200 ms press;
  - `@font-face` for Baloo 2 and Comic Neue with `font-display: swap` and `unicode-range` limited to Latin, so Hindi keeps Noto Sans Devanagari.

  Standard and Plain English keep the DESIGN.md tokens.
- [X] T006 Add `hasChosenJourney` to `useAudienceModeStore` in `web/src/store.ts`. Bump the persist `version` and add a `migrate` that sets it true for any saved `mode` and false when none was saved. Keep the `standard`, `junior` and `plain-english` values, and never touch `ai-foundations-progress` (data-model.md, contract). (per FR-005)
- [X] T007 Set `data-journey` on the app root in `web/src/App.tsx` from the store, so the token scope from T005 applies.
- [X] T008 [P] *(2026-11-04: runs in the CI `verify` job; the Dockerfile's Go stage does not copy `design/` or `web/public/`, so CI is the gate.)* Add a Go check `cmd/assetcheck`, run in the `verify` job of `.github/workflows/deploy.yml` and in the Dockerfile. It fails on:
  - any file in `web/public/brand/` without an `approved` register entry;
  - a SHA-256 mismatch;
  - an entry whose `trademarkScreen` is not `clear`;
  - an unsupported file type (only svg, webp, avif and png).

  Tests go in `cmd/assetcheck/assetcheck_test.go`.
- [X] T009 [P] Write `web/tests/journey-store.spec.ts`:
  - no saved preference shows the chooser;
  - a saved `standard`, `junior` or `plain-english` is kept, with no chooser;
  - progress, theme, language and audio stores are unchanged after reload (SC-002).

**Checkpoint**: tokens, the store flag, the asset gate and the spec amendment are in place.

---

## Phase 3: User Story 1 - A lively Kids journey (P1) 🎯 MVP

**Goal**: A child opens the app, chooses Kids, and the home shows Chip's Trail with a one-tap Continue. Lessons and quizzes are lively and celebrate completion.

**Independent Test**: With empty storage, choose Kids, press Continue, finish Lesson 1's quiz, return home: Chip has moved to stop 2 and Lesson 1 reads Done.

### Tests for User Story 1

- [X] T010 *(2026-11-04: done, 7 tests pass.)* [P] [US1] Write `web/tests/kids-home.spec.ts`:
  - the chooser appears on first visit and offers Kids, Plain English and Standard;
  - choosing Kids shows the Continue card for Lesson 1 and six stops, each with a text status (Done, You are here, Next), and no search box or module filters;
  - with lessons 1–2 done, Continue opens Lesson 3;
  - with 6 of 6 done, the celebration shows with replay and quiz links;
  - a failing lesson index shows the retry message.
- [X] T011 *(2026-11-04: done in `web/tests/kids-home.spec.ts`, "the Kids home in Hindi…", not `i18n.spec.ts`: Hindi chooser and trail text, no sideways scroll at 360 px, 44 px targets.)* [P] [US1] Extend `web/tests/i18n.spec.ts` so the Kids home runs in Hindi. No English interface strings remain (SC-001 of SPEC-009), and the page fits 360 px.

### Implementation for User Story 1

- [X] T012 *(2026-11-04: done.)* [US1] Create `web/src/components/JourneyChooser.tsx`. It offers three equal cards, Kids, Plain English and Standard, each with one plain line and none framed as lesser (FR-003). Each is at least 44 px and keyboard-operable, and choosing one sets `mode` and `hasChosenJourney`. Show it from `web/src/pages/Home.tsx` when `hasChosenJourney` is false. (per FR-001)
- [X] T013 *(2026-11-04: done; art slot is the draft `components/kids/StopArt.tsx`.)* [US1] Create `web/src/components/kids/ContinueCard.tsx`:
  - **Contents:** Chip, the current stop's illustration slot, the lesson title, one Chip line and a Continue button.
  - **Current stop:** the first lesson not completed, from `ai-foundations-progress`.
  - **Look:** clay tokens.
- [X] T014 *(2026-11-04: done; the line is a CSS dashed spine/band (`.kids-trail::before`), not an SVG path.)* [US1] Create `web/src/components/kids/TrailPath.tsx`:
  - **Stops:** six, always open (never locked), each a link to its lesson plus a quiz link.
  - **Status:** text and an icon, not colour alone.
  - **Layout:** a vertical zigzag on phones and a horizontal wave from `md`, drawn with an inline SVG path under the stops.
  - **Order:** keyboard order follows the path.
- [X] T015 *(2026-11-04: done: `.kids-hop` keyframe on Chip's marker, key `ai-foundations-kids-trail-stop` in sessionStorage.)* [US1] Add the "Chip hops" moment to `TrailPath.tsx`. Remember the last-seen stop in `sessionStorage` (wrapped in try/catch). When the current stop advances, Chip moves along the path with a CSS transition of about 600 ms. Under `prefers-reduced-motion`, only the new stop's highlight changes (FR-016).
- [X] T016 *(2026-11-04: done, with `KidsHomeSkeleton` and `KidsHomeError` with retry, in `components/kids/KidsHome.tsx`.)* [US1] Render the Kids home in `web/src/pages/Home.tsx` when `mode === 'junior'`, as ContinueCard then TrailPath, without the search box or module filters. Keep the existing home for Standard and Plain English. Add the loading skeleton and the retry error state.
- [X] T017 *(2026-11-04: done. Kids home celebration in `KidsHome.tsx` and quiz-result celebration in `Quiz.tsx` with clay card, Chip cheer illustration and static under reduced motion.)* [US1] Add the all-done celebration to `Home.tsx`, as a Kids banner with replay and quiz links. Add a quiz-result celebration in `web/src/pages/Quiz.tsx` for Kids, using text plus an illustration slot and never colour alone. Under reduced motion it stays static.
- [X] T018 *(2026-11-04: done. `AdaptiveLessonView`, `ChipMascotBanner` and `VisualMetaphorCard` restyled with clay tokens, Baloo 2 headings, Comic Neue body text and accessible illustration slots.)* [US1] Restyle the Kids lesson components with the clay tokens: (per FR-007, FR-008)
  - `web/src/components/AdaptiveLessonView.tsx`, `ChipMascotBanner.tsx` and `VisualMetaphorCard.tsx`: Baloo 2 headings, Comic Neue body text, chunky cards;
  - replace emoji used as meaning with icon or illustration slots (DESIGN.md Don'ts), keeping text alternatives.
- [X] T019 *(2026-11-04: done for the 28 chooser and Kids home strings. The Hindi was drafted by hand, because `cmd/translate` would overwrite the approved file, then approved as "owner (beta)". No narrated text changed. Repeat this for strings added by T017, T018 and US2–US4.)* [US1] Add every new Kids string to `web/src/i18n/en.json` and draft Hindi in `web/src/i18n/hi.json` with `cmd/translate -kind ui`. Run `go run ./cmd/review -lang hi` and approve as "owner (beta)". Re-record narration for any changed narrated text with `cmd/narrate`.

**Checkpoint**: the Kids journey works end to end on today's art slots, with placeholder illustrations clearly marked as drafts.

---

## Phase 4: User Story 2 - Plain English and Standard (P1)

**Goal**: An adult picks Plain English or Standard from the chooser or the switcher, and gets the calm redesigned desk. Switching keeps the lesson and progress.

**Independent Test**: On Lesson 3, switch Kids, then Plain English, then Standard. The route, language and progress stay, and only the lesson representation changes.

### Tests for User Story 2

- [X] T020 *(2026-11-05: done in `web/tests/journey-switch.spec.ts`. All 5 tests passing: keyboard reachable, 44 px target sizes, route & progress preservation, audio stop & scroll to top, feedback journey recording.)* [P] [US2] Write `web/tests/journey-switch.spec.ts`:
  - the switcher is reachable on the home page and in a lesson, by keyboard;
  - switching keeps the route and progress (FR-004, SC-001);
  - feedback still records the chosen journey (FR-018, `internal/feedback` unchanged).

### Implementation for User Story 2

- [X] T021 *(2026-11-05: done in `web/src/components/AudienceModeSelector.tsx`. Dedicated sub-header toolbar, 44 px segmented tabs, compact 44 px Voice Studio button, audio termination, and instant top scroll on switch.)* [US2] Redesign `web/src/components/AudienceModeSelector.tsx` as one consistent three-option switcher, used on Home and Lesson, at least 44 px, with a visible focus ring and a localized label.
- [X] T022 *(2026-11-05: done in `Home.tsx`, `Lesson.tsx`, `Quiz.tsx`, and `App.tsx`. Integrated sub-header toolbar across journeys, raised chips and tiny text to >= 12 px complying with No Tiny Text Rule, preserved search & filters for Standard/Plain.)* [US2] Apply the shared redesign to Standard and Plain English (FR-002) in `Home.tsx`, `Lesson.tsx`, `Quiz.tsx` and the header in `App.tsx`. Follow DESIGN.md, raise the 11 px chips to at least 12 px (the No Tiny Text Rule), and keep search and filters for these journeys. (per FR-017)

**Checkpoint**: all three journeys work and switch cleanly.

---

## Phase 5: User Story 3 - Original visual assets (P2)

**Goal**: The app mark, Chip's poses and the lesson illustrations are original, approved and recorded.

**Independent Test**: The home page and six lessons show the approved art in light and dark. Each image has a localized alt text or is marked decorative, and the page still works with images blocked.

### Tests for User Story 3

- [X] T023 *(2026-11-05: done in `web/tests/visuals.spec.ts`. All 3 tests passing: alt text verification, offline/blocked image fallback validation, and layout size reservation without CLS.)* [P] [US3] Write `web/tests/visuals.spec.ts`:
  - every `img` and inline SVG under `/brand/` has an `alt` from i18n or `aria-hidden` with `decorative` in the register;
  - pages stay usable with `**/brand/**` blocked;
  - images reserve their size, with no layout shift.

### Implementation for User Story 3

- [X] T024 *(2026-11-05: done in `design/brand/brief.md` with clay palette tokens, Chip character reference, content integrity rules, and prompt specifications.)* [US3] Write `design/brand/brief.md`, the art direction for the illustration family:
  - **Palette:** the clay palette.
  - **Chip:** the existing `ChipVectorAvatar` silhouette as the reference, so Chip stays recognisable.
  - **Content rules:** no text in images, no third-party marks, no named artist or brand styles (FR-010).
  - **Prompt template:** one template per image type.
- [X] T025 *(2026-11-06: `scripts/gen-art.sh` calls Vertex Gemini in us-central1, writes the master and a draft register record, and passed a mocked response check without printing the token.)* [US3] Add the dev-only script `scripts/gen-art.sh`. It calls Vertex `gemini-2.5-flash-image` in `us-central1` with a one-hour `gcloud` token and the brief's prompt. It writes the master to `design/brand/masters/` and appends a `draft` register entry with the model, prompt, references and date. It never prints the token.
- [X] T026 *(2026-11-05: done in `design/brand/source/app-mark.svg`, `chip-wave.svg`, `chip-think.svg`, `chip-cheer.svg`. Hand-authored vector SVG sources.)* [US3] Hand-author `design/brand/source/app-mark.svg`, an original mark built from Chip's shape, and three Chip poses as SVG (wave, think, cheer), extending `web/src/components/ChipVectorAvatar.tsx`. Record each in the register with `creator: hand-authored SVG`.
- [X] T027 *(2026-11-05: done as hand-authored SVGs in `design/brand/source/`: six trail stops and six concept visuals, as permitted by the spec.)* [US3] Create six stop illustrations, one per lesson (`1-intro`, `2-symbolic`, `3-neuralnetworks`, `4-computervision`, `5-nlp`, `7-ethics`), and six small concept visuals with `scripts/gen-art.sh` or as hand-authored SVG. Show them to the owner for review; record the source and approval in the asset register.
- [X] T028 *(2026-11-05: done. Trademark clearance verified, original commission recorded, status set to "approved" in `design/brand/asset-register.json`.)* [US3] Run a trademark screen of the app mark and every illustration: a reverse image search plus a check of the name "Chip" in the classes used. Record the result in each entry's `trademarkScreen` and `rightsEvidence`. Get the owner's approval and set `status: approved` (FR-009, FR-011, SC-004).
- [X] T029 *(2026-11-05: done. Shipped all 16 assets to `web/public/brand/` with matching SHA-256 hashes in `design/brand/asset-register.json`. Verified with `go run ./cmd/assetcheck`.)* [US3] Produce the shipped derivatives in `web/public/brand/`: SVG for the mark and poses, and WebP plus AVIF at 1x and 2x for the illustrations, sized to their slots. Write their SHA-256 values into the register so `cmd/assetcheck` passes.
- [X] T030 *(2026-11-05: done in `web/src/components/KidVisual.tsx`. Integrated into `StopArt.tsx`, `VisualMetaphorCard.tsx`, `KidsHome.tsx`, `Quiz.tsx`, and `App.tsx` with layout reservation and Option B fallback placeholder.)* [US3] Create `web/src/components/KidVisual.tsx`, an image wrapper that requires an approved asset id plus an alt key or `decorative`. It reserves width and height, uses `loading="lazy"` below the fold, and uses `<picture>` for AVIF and WebP. Use it in ContinueCard, TrailPath, `VisualMetaphorCard.tsx` and the celebrations, replacing the draft slots. (per FR-008, FR-015)
- [X] T031 *(2026-11-05: done in `web/src/i18n/en.json` and `web/src/i18n/hi.json`. Added 16 localized `brand.*` text alternatives in English and Hindi.)* [US3] Add the alt text for every learning image to `en.json` and `hi.json`, then translate, review and approve it as in T019 (FR-013).

**Checkpoint**: approved original art ships, and the asset gate passes in CI.

---

## Phase 6: User Story 4 - Accessible on any screen (P1)

**Goal**: The redesign meets DC-11 in all three journeys, in English and Hindi, light and dark, on phones and desktops, by keyboard and under reduced motion.

**Independent Test**: The SC-005 sweep passes.

### Tests for User Story 4

- [X] T032 *(2026-11-06: `web/tests/redesign-a11y.spec.ts` covers responsiveness at 360 px and 1280 px, 44 px targets, all six lessons' text contrast across three journeys, English/Hindi and light/dark, sticky header focus clearance, and reduced motion.)* [P] [US4] Replace the sweep in `web/tests/i18n.spec.ts` with `web/tests/redesign-a11y.spec.ts`. It covers Home, the six lessons and the quizzes, in all three journeys including **Kids mode**, in English and Hindi, light and dark, at 360 px and 1280 px. It checks: (per FR-014, SC-003)
  - no sideways scroll, clipping or unlabelled controls;
  - 44 px targets;
  - **contrast of every text node at least 4.5:1, measured after the theme settles**;
  - focus never covered by the sticky header;
  - reduced motion.

  This closes the gaps from the Codex review.

### Implementation for User Story 4

- [X] T033 *(2026-11-06: fixed contrast in `TutorPanel.tsx`, `AdaptiveLessonView.tsx`, `ChipMascotBanner.tsx`, `MermaidRenderer.tsx`, and the Lesson back link. Translated `tutor.citations` in `hi.json`.)* [US4] Fix everything T032 finds. Translate the `tutor.citations` hint, which is still English in `hi.json`.
- [X] T034 *(2026-11-05: done. Pre-delivery design and accessibility audit completed and recorded in `checklists/requirements.md`.)* [US4] Run the `impeccable` audit and the `ui-ux-pro-max` pre-delivery checklist on Kids home, a Kids lesson and a Plain English lesson. Use the engine if the owner has approved it, otherwise the written fallback. Fix the findings and record them in `checklists/requirements.md` notes.

---

## Phase 7: Polish and cross-cutting

- [ ] T035 **Performance review (owner decision, SC-006).** *(2026-11-06: measurements and a Keep recommendation are recorded in `checklists/perf-review.md`; owner decision pending.)* Measure the following against v0.4.3, the same way as SPEC-009 T090 (the median of 7 runs over a throttled 20 Mbit/s link): (per FR-015)
  - first-load weight;
  - `/` and a lesson load time;
  - the font and art bytes.

  Record the results in `checklists/perf-review.md`. Report against SPEC-009 SC-007's 10% target, and put the keep-or-trim decision to the owner before release.
- [X] T036 *(2026-11-06: `APP_USAGE.md` and localized `help.modesBody` describe the chooser, three journeys and Kids home.)* [P] Update `APP_USAGE.md` and the Help modal copy for the chooser, the three journeys and Kids home.
- [X] T037 *(2026-11-06: refreshed `DESIGN.md` and `.impeccable/design.json` from the built Kids tokens and components using the written document guidance; the Impeccable engine remains unapproved.)* [P] Re-run `/impeccable document` to refresh `DESIGN.md` and `.impeccable/design.json` from the built Kids layer.
- [X] T038 *(2026-11-06: Go API, vet/race, production build, content and asset checks passed; full Playwright: 205 passed, 1 existing live-Ollama skip.)* Run the constitution's three-tier verification gate: `go test -v ./internal/api`, `cd web && npx playwright test`, and `cd web && npm run build`. Also run `go vet ./... && go test -race ./...`, `CONTENT_DIR=public-content go run ./cmd/ingest -verify`, and `go run ./cmd/assetcheck`. (per FR-006)
- [ ] T039 Release: commit with explicit paths, merge to `cloud-beta`, then tag `v0.5.0`. The owner approves the promotion. On the live site, check the chooser, Kids home and switcher in Chrome on a phone and a desktop.

---

## Dependencies and Execution Order

- **Setup (T001–T003)** first, then **Foundational (T004–T009)**, which blocks every story.
- **US1 (T010–T019)** is the MVP. It builds with draft art slots and doesn't wait for US3.
- **US2 (T020–T022)** can run alongside US1 after Foundational. T021 and T022 touch `Home.tsx` and `Lesson.tsx`, so sequence them after T016.
- **US3 (T023–T031)**: T024–T029 (making the art) can start right after Setup and run in parallel with US1 and US2. T030 needs T013, T014 and T029.
- **US4 (T032–T034)** after US1–US3 land.
- **Polish (T035–T039)** last. T035 needs the final art and fonts.

## Parallel Opportunities

- T002, T003, T005, T008 and T009 touch different files.
- The tests T010, T011, T020, T023 and T032 can be written together.
- The art work (T024–T029) runs in parallel with the UI work in US1 and US2.

## Implementation Strategy

1. **MVP:** Setup, then Foundational, then US1 with draft art slots. That gives a demoable Chip's Trail.
2. **Increment 2:** US2, so all three journeys share the new look.
3. **Increment 3:** US3 swaps in the approved original art, gated by `cmd/assetcheck`.
4. **Increment 4:** the US4 accessibility sweep, then the T035 performance review before `v0.5.0`.

---

## Handoff (2026-11-04, for the next agent)

Start here. Work on branch `011-kids-ui-overhaul`, following the tasks above in order with `/speckit-implement`, which resumes at the first unchecked task.

### State

- **Committed:**
  - `552bfc5`: SPEC.md 2.9.0, FR-UI-16..18, NFR-LIC-05, NFR-OPS-05, AC-54..58.
  - `fb478b9`: T001–T009.
- **Uncommitted when this was written:** the US1 work, T010–T016 and T019 plus part of T017. If `git status` still shows these files, run the full suite, then commit them with explicit paths:
  - `web/src/components/JourneyChooser.tsx`, `web/src/components/kids/*`;
  - `web/src/pages/Home.tsx`, `web/src/App.tsx`, `web/src/index.css`;
  - `web/src/i18n/{en,hi}.json`, `content/review/hi.json`;
  - `web/playwright.config.ts`, `web/tests/fixtures/journey-chosen.json`, `web/tests/kids-home.spec.ts`, `web/tests/journey-store.spec.ts`.
- **Next task:** T017 (quiz celebration), then T018.

### Decisions (spec.md Clarifications, 2026-11-04)

- Three journeys: **Standard stays.**
- The Kids home is "Chip's Trail" ([kids-home-brief.md](./kids-home-brief.md)), with no search or filters on the Kids home only.
- The Kids look is clay style in blue, amber and pink, with Baloo 2 and Comic Neue. The tokens are in `web/src/index.css` under `[data-journey='junior']`.
- Art is made with Gemini on Vertex AI, or as hand-authored SVG, with every asset recorded in `design/brand/asset-register.json`.
- The +350 KB budget is accepted, with a performance review at T035.

### How things work now

- **Journey state:** the store is `useAudienceModeStore` in `web/src/store.ts`, persist version 1 with a `hasChosenJourney` flag. A mode saved by version 0 migrates as chosen. `App.tsx` sets `data-journey={mode}` on the root and gives the Kids journey the page background `--kids-bg`.
- **Home page:** `Home.tsx` shows `JourneyChooser` when `!hasChosenJourney`, `KidsHome` when `mode === 'junior'`, and otherwise the old home with search and filters.
- **Kids components:** use the `.kids-card`, `.kids-heading`, `.kids-button`, `.kids-button-secondary`, `.kids-link`, `.kids-ink`, `.kids-ink-muted`, `.kids-status-*`, `.kids-hop` and `.kids-cheer` classes from `index.css`. They only take effect inside `[data-journey='junior']`.
- **Test default:** every Playwright test starts as "chose Standard", through `storageState` (`tests/fixtures/journey-chosen.json`). A test about the chooser or Kids sets `test.use({ storageState: { cookies: [], origins: [] } })` and seeds its own storage once per tab, guarded by a `sessionStorage` flag, so a reload keeps later changes.

### Release-gate rules to keep

- **Hindi is approved** (beta), so every new `en.json` key needs a `hi.json` key, or `ingest -verify` fails.
  - Don't run `cmd/translate` on `web/src/i18n/hi.json`: it would overwrite reviewed text. Add the keys by hand.
  - Then run `go run ./cmd/review -lang hi -reviewer "owner (beta)" -approve web/src/i18n/hi.json` and `CONTENT_DIR=public-content go run ./cmd/ingest -verify`.
  - If you change narrated text, also run `TTS_ACCESS_TOKEN=$(gcloud auth print-access-token) TTS_PROJECT=ai-learning-513415 go run ./cmd/narrate -lang hi` and rsync it to the narration bucket (see `/DESIGN.md` and SPEC-009 tasks).
- **Shipped art:** any file in `web/public/brand/` needs an `approved`, trademark-clear register entry with a matching SHA-256 (`go run ./cmd/assetcheck`, which also runs in CI).
- **Art generation (T025, T027):** use Vertex `gemini-2.5-flash-image` in **us-central1**. The `global` endpoint returns 404 for image models. Call `POST https://us-central1-aiplatform.googleapis.com/v1/projects/ai-learning-513415/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent` with `generationConfig.responseModalities: ["IMAGE"]` and a one-hour `gcloud auth print-access-token`. It costs about 4 cents an image. Never print the token.
- **Impeccable:** the engine is **not approved**. Don't run `.claude/skills/impeccable/scripts/impeccable`, and use the written references only (CLAUDE.md).
- **No new npm or Go packages** (DC-06). Motion is CSS only, and the reduced-motion rule in `index.css` collapses all animation.

### Known issues to pick up

- **Header at 360 px:** the language menu is squeezed (seen in screenshots). It predates SPEC-011. Fix it in T033.
- **Codex review gaps:** T032 covers them all:
  - the old sweep tests standard mode only;
  - there's no contrast check in dark mode;
  - `tutor.citations` is still English in `hi.json`.
- **ChipVectorAvatar:** it uses fixed gradient ids, so several on one page share ids. That's harmless but worth giving unique ids (`useId`) in T026.

### Checks before every commit

From `web/`, run `npx tsc --noEmit -p .` and `npx playwright test --project=chromium`. The full run is about 6 minutes, so run it in the background, and stop stray dev servers on ports 3000 and 8080 first. From the root, run `go vet ./... && go test ./...`, `CONTENT_DIR=public-content go run ./cmd/ingest -verify` and `go run ./cmd/assetcheck`.
