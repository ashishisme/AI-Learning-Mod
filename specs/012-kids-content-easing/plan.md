# Implementation Plan: Easier Kids Lessons

**Branch**: `012-kids-content-easing` (planned; work currently sits on `cloud-beta`) | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/012-kids-content-easing/spec.md`

## Summary

The Kids lessons will be rewritten to reading grade 3 for ages 8–11, with a "12+" layer for ages 12–14 (Option A). Kids get tappable word cards with small SVG animations, stepper Play, unscored check-ins and a recap.

**Approach:**
- A "card" is an existing lesson section, split shorter (R1), so narration, parity and rendering keep working.
- The 12+ layer, recap, check-ins and word visuals are new **optional** fields on the current adaptive lesson JSON (R2, [contracts/lesson-format.md](./contracts/lesson-format.md)).
- The age band is one more field in the browser-only audience store (R3).
- A Go content check in `cmd/ingest -verify` blocks rewritten lessons and only warns on the others (R8).

**Delivery order:** pilot lesson 3 first, then the remaining lessons one per release, each shipping with its Hindi text and changed recordings.

## Technical Context

**Language/Version**: Go 1.27.3 for the backend, content check and narration tooling. TypeScript with React 18 for the web app.

**Primary Dependencies**: the existing stack: Vite, Tailwind, Zustand, `react-markdown`, and the Go standard library. **No new packages.**

**Storage**: static lesson JSON shipped with the release, plus browser `localStorage` (the audience store goes to v2). No server-side state.

**Testing**: `go test ./...` (new `internal/readability` tests, parity tests), Playwright (new `kids-bands`, `kids-word-cards` and `kids-aids` specs), `cmd/ingest -verify`, `cmd/assetcheck`.

**Target Platform**: the single container on Cloud Run (unchanged). Browsers: current evergreen browsers on school tablets and phones, down to 320 px wide.

**Project Type**: web app (Go API plus React SPA in one image).

**Performance Goals**: a word card opens in under 0.5 s (SC-005). No added home-page first-load weight (NFR-OPS-05). Word art is about 25 SVGs of 2–6 KB each, loaded on tap.

**Constraints**:
- DC-09: the band stays on the device.
- DC-10: no Python.
- DC-11: 44 px targets and 4.5:1 contrast.
- Reduce motion is respected everywhere.
- The Hindi ledger stays green on every release.

**Scale/Scope**:
- 6 Kids lessons, about 20 → about 45 sections in total.
- About 25 word visuals.
- About 30 new Hindi recordings per lesson (R9).
- About 6 UI touch points:
  - `AdaptiveLessonView`;
  - `JargonBusterTooltip` → word card;
  - `StepperDiagram`;
  - `JourneyChooser`;
  - `SettingsModal`;
  - `store.ts`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. SPEC.md ground truth | PASS, amendment required | FR-UI-16 is amended (band choice, store v2). New FR-UI and FR-CNT IDs come with one AC each, in a separate `spec:` commit before code (§12). |
| II. Grounded tutor | PASS | Tutor grounding and citations are unchanged. Headings stay the citation targets. |
| III. DC-01 stack | PASS | React, TS, Vite, Tailwind and Zustand only. There is no new npm package (R4 rejects Lottie). |
| III. DC-02 / DC-03 | PASS | No router or ingestion-source changes. |
| III. DC-09 minimal state | PASS | The band lives in browser storage only, and a test asserts it never appears in any request (contracts/ui-behaviour.md). |
| III. DC-10 zero Python | PASS | The content check is Go (`internal/readability`). The scratchpad Python script was used only for measuring. |
| III. DC-08 single container | PASS | No change. |
| IV. DC-11 floor | PASS by design | 44 px word buttons, 4.5:1 in both themes, keyboard and Escape on cards, reduce-motion stills. Asserted in Playwright. |
| V. Git discipline | PASS | Explicit paths only. Separate `spec:` commit. No `web/dist` or scratch files. |
| Quality gates | PASS | `go test`, Playwright and `npm run build`, plus `cmd/ingest -verify` and `cmd/assetcheck`. |

**Post-design re-check (after Phase 1):** still PASS. One spec wording tweak is needed: FR-022's "quiz answer no longer in the lesson" can only be a warning, because it is a heuristic (research R8). Fold this into the amendment commit or `/speckit-clarify`.

## Project Structure

### Documentation (this feature)

```text
specs/012-kids-content-easing/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R10 decisions
├── data-model.md        # age band, banded lesson fields, parity paths, narration tracks
├── quickstart.md        # validation steps
├── contracts/
│   ├── lesson-format.md
│   ├── kids-content-check.md
│   └── ui-behaviour.md
├── checklists/
│   ├── requirements.md
│   └── kid-tests.md     # created in Phase 1 of delivery (pilot)
└── tasks.md             # /speckit-tasks
```

### Source code (repository root)

```text
content/
└── kids-writing-guide.md                 # NEW: FR-001 rules, banned phrases, card pattern

public-content/
├── lessons/<id>.junior.json              # REWRITE per lesson (bands, recap, teen, checkIn, visual)
├── lang/hi/lessons/<id>.junior.json      # REWRITE in lockstep
└── audio/hi/<id>/junior/…                # changed and -teen tracks re-recorded (cmd/narrate)

internal/
├── readability/                          # NEW: FK grade, sentences, bold terms, rules (Go)
│   ├── readability.go
│   └── readability_test.go
├── ingest/ingest.go                      # verify calls readability for *.junior.json
├── i18n/parity.go                        # add translatable paths (data-model §4)
└── narration/text.go                     # add section-<id>-teen track; bigIdea in core text

design/brand/
├── asset-register.json                   # register each word visual
└── source/words/*.svg                    # source masters

web/
├── public/brand/words/<key>.svg          # NEW: word art, CSS keyframes and reduce-motion still
├── src/api.ts                            # optional fields on AdaptiveLessonPayload/Section
├── src/store.ts                          # audience store v2: ageBand
├── src/components/
│   ├── AdaptiveLessonView.tsx            # band filtering, bigIdea, more, checkIn, recap, read-along
│   ├── WordCard.tsx                      # NEW: replaces JargonBusterTooltip for Kids
│   ├── StepperDiagram.tsx                # Play / Pause
│   ├── JourneyChooser.tsx                # band step after Kids
│   └── SettingsModal.tsx                 # band setting (junior only)
├── src/services/speechService.ts         # recording position → sentence index (R7)
├── src/i18n/{en,hi}.json                 # new UI strings
└── tests/
    ├── kids-bands.spec.ts                # NEW
    ├── kids-word-cards.spec.ts           # NEW
    ├── kids-aids.spec.ts                 # NEW
    └── lesson-3-neuralnetworks.spec.ts   # UPDATE for rewritten Kids text
```

**Structure decision:** use the existing Go and React layout. The only new code units are `internal/readability` and `web/src/components/WordCard.tsx`. Everything else is an extension of a current file.

## Delivery phases

| Phase | Contents | Exit gate |
|---|---|---|
| **0. Groundwork** | <ul><li>The SPEC.md amendment commit.</li><li>`content/kids-writing-guide.md`.</li><li>`internal/readability` and the verify hook (warn-only for all lessons).</li><li>Read the real Kids feedback records.</li></ul> | Verify passes, and six lessons print WARN baselines that match the plan table. |
| **1. Platform** | <ul><li>Store v2 band.</li><li>Chooser and settings.</li><li>Banded rendering.</li><li>WordCard.</li><li>Stepper Play.</li><li>Check-in.</li><li>Recap.</li><li>Read-along.</li><li>Parity paths.</li><li>`-teen` narration track.</li></ul> All of these have tests using fixture lessons. | Playwright, `go test` and build all green. Unrewritten lessons render unchanged (FR-023). |
| **2. Pilot: lesson 3** | <ul><li>English rewrite (`bands: true`).</li><li>The first word visuals and their register entries.</li><li>Hindi lockstep, re-approval and recording.</li><li>The kid test.</li></ul> | Verify blocks on lesson 3 and passes. At least 4 of 5 children per band pass. No 10–11-year-old calls it babyish. **Owner go/no-go.** |
| **3. Rollout** | Lessons 1, 4, 7, 2, 5, one per release, each with Hindi and recordings. | Same gate per lesson. The Hindi ledger is green every release. |
| **4. Close** | All six lessons have `bands: true`, so the check blocks everywhere. Owner decision on Plain English. | SC-001 met. SC-003 feedback comparison recorded. |

## Risks

| Risk | Mitigation |
|---|---|
| The core plus 12+ text reads like patches | Option B fallback per section (`teen.body`). The pilot proves it. |
| No Hindi reviewer at release pace | The rollout pauses. The release check is not loosened (spec assumption). |
| The read-along estimate drifts on recordings | SSML timepoints fallback (R7), decided after the pilot. |
| The rewritten lesson 3 breaks existing tests | Update `lesson-3-neuralnetworks.spec.ts` in the same change. |
| The 8–11 band feels babyish to 11-year-olds | Writing-guide tone rules, "Want to know more?" one tap away, and SC-004 in the pilot. |

## Complexity Tracking

There are no constitution violations, so there is nothing to justify.
