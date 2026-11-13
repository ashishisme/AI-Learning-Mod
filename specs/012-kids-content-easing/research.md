# Research: Easier Kids Lessons (SPEC-012)

Every decision below was checked against the current code on 2026-11-12. Paths are repo-relative.

## R1. A "card" is an existing lesson section

- **Decision:** we do not add a new card type. A card is an `AdaptiveSection`, and long sections are split into more, shorter sections.
- **Rationale:** a lot of existing behaviour is already keyed to the section:
  - narration tracks are keyed `<lesson>/<mode>/section-<id>` (`internal/narration/text.go:104`);
  - the Jargon Buster, diagram, widget and listen button all attach to a section in `web/src/components/AdaptiveLessonView.tsx`;
  - Hindi parity walks `sections[]` (`internal/i18n/parity.go`).

  Splitting sections reuses all of it.
- **Alternatives considered:** a `cards[]` array inside each section. Rejected because it needs a new renderer, new narration keys and new parity paths for the same result.

## R2. How the 12+ layer is stored (Option A)

- **Decision:**
  - Each section gets an optional `teen` object:
    - `add` is Markdown appended after the core body in 12–14;
    - `body` is a full replacement body, the Option B fallback for one card;
    - `jargonBuster` holds extra term entries.
  - A quiz question marked `"band": "12-14"` is shown only in that band. Such questions come last in `miniQuiz`, so the core question indexes don't move.
  - The lesson-level `"bands": true` marks a rewritten lesson.
- **Rationale:** each fact has one source. The 8–11 text is the base, with nothing to subtract, so the core text must read as complete on its own, which is what FR-007 requires. Putting teen questions last keeps saved quiz progress valid when the band changes.
- **Alternatives considered:**
  - Inline `:::teen` blocks inside the Markdown. Rejected because they are hard to translate safely and invisible to the parity check.
  - Separate `*.junior-teen.json` files (Option B everywhere). Rejected by the owner.

## R3. Where the age band is kept

- **Decision:** add `ageBand: "8-11" | "12-14"` to the existing `ai-foundations-audience-mode` store (`web/src/store.ts:160`) and raise its version from 1 to 2. The migration keeps the mode and `hasChosenJourney` and sets `ageBand: "8-11"`.
- **Rationale:** FR-006 says the band sits next to the audience mode. This store already persists only in the browser, and it already has a migration pattern. No request or feedback payload reads the store.
- **Alternatives considered:** a new store. Rejected because it adds a second migration path for one field.

## R4. Word-card art and animation

- **Decision:**
  - One SVG per word in `web/public/brand/words/<key>.svg`, each with its own CSS `@keyframes` (transform and opacity only).
  - Each SVG also carries `@media (prefers-reduced-motion: reduce)` that stops the animation on a still frame.
  - A jargon entry names its art with `visual: "<key>"`.
  - The card renders `<img>` only once it is open, so the file loads on first open.
  - Every file is registered in `design/brand/asset-register.json` and checked by `cmd/assetcheck`.
- **Rationale:**
  - Media queries are evaluated inside SVG images in current browsers, so reduce motion needs no JS.
  - There is no new npm package.
  - The same art serves Hindi, because the art has no words in it.
  - NFR-OPS-05 limits the **home page first load**, and these files load only inside lessons, on tap.
- **Alternatives considered:**
  - Lottie/JSON animations. Rejected because they need a new npm package.
  - GIF/WebP. Rejected because reduce motion can't stop them and they are 10× larger.
  - Markdown images in `public-content/assets`. Rejected because that path is for course images with content-hashed names.
- **Art source (spec assumption):** SPEC-011 rule. Hand-made SVG is preferred for the animated parts. Gemini on the project's Vertex AI may draft the stills, and the owner approves each one.

## R5. Tappable words in the text

- **Decision:**
  - Bold text in a Kids section body that matches a `jargonBuster` term, case-insensitive, in the same section (core or teen) renders as a button that opens the word card.
  - The card replaces the hover tooltip in `web/src/components/JargonBusterTooltip.tsx`.
  - The card is a small non-modal dialog: Escape closes it, focus returns to the word, a tap outside closes it, and it is kept inside the viewport down to 320 px.
- **Rationale:** writers already bold new words, so no new markup is needed. The content check (R8) enforces that every bold word has an entry. The existing tooltip is hover-driven and `pointer-events-none`, so it fails on touch and with screen readers.
- **Alternatives considered:** explicit `[[term]]` markup. Rejected because it is one more thing to translate and keep in sync.

## R6. Stepper Play, check-ins, teach-back, widgets

- **Stepper:** add Play and Pause to `web/src/components/StepperDiagram.tsx`, advancing one step every 3 s. Under `prefers-reduced-motion` Play is hidden and the existing Next button stays.
- **Check-in:** `section.checkIn` is a `ChoiceQuestion`, rendered with the existing `ChoiceCard`. Its result is never written to progress or score.
- **Teach-back (FR-016):** this is **already met**. `teachBack` is a `ChoiceQuestion` rendered as a tap-to-pick choice (`AdaptiveLessonView.tsx:294`). The work is content only: 2–3 options.
- **Widgets (FR-017):** widgets already have `scaffold: "guided" | "standard"` and `hints[]`.
  - 8–11 shows the widget as guided.
  - 12–14 uses `standard` when the content sets it.
  - "Chip's hint" is the existing hints button with kid wording.
  - The widget code is unchanged except for respecting the band.

## R7. Read-along highlighting for recordings (FR-018)

- **Decision:** estimate each sentence's time from its share of the track's characters, based on the audio's `duration` and `timeupdate`, and highlight the current sentence.
- **Rationale:** no new data, no change to how Hindi tracks are recorded, and it works on the 171 existing files. The pilot kid test checks whether the drift is noticeable.
- **Alternatives considered:** Cloud TTS SSML `<mark>` timepoints stored in the manifest. This is accurate but changes `cmd/narrate` and needs every track re-recorded. Kept as the fallback if the estimate drifts by more than one sentence.

## R8. The Kids content check

- **Decision:** a Go package `internal/readability` called from `cmd/ingest -verify`. It reports per English Kids lesson and band (contract: [contracts/kids-content-check.md](./contracts/kids-content-check.md)):
  - FK grade;
  - average and longest sentence;
  - bold terms per section;
  - bold terms with no entry;
  - quiz questions with no matching answer words.

  It **blocks** for lessons with `"bands": true` and only **warns** for the others.
- **Rationale:**
  - DC-10 rules out Python, and `scratchpad/readability.py` was only used for measuring.
  - Blocking per lesson keeps rewritten lessons from slipping while unrewritten ones keep passing. Once all six lessons have `bands: true`, the check blocks everywhere, which is FR-022's end state with no global switch to flip.
- **Quiz rule:** "the answer is no longer in the lesson" can't be decided exactly. The check looks for the correct option's content words (4+ letters, not stop words) in the lesson text, and this rule **stays a warning even in blocking lessons**. The reviewer confirms each warning by hand. → **Spec tweak needed:** FR-022 should say this item is a warning. Raise it in `/speckit-clarify` or in the amendment commit.
- **Hindi:** reading grade formulas are English-only, so Hindi readability is the reviewer's job. The structural rules still apply to Hindi files through parity, because same sections and same terms come for free.

## R9. Hindi lockstep and recordings

- **Decision:**
  - A rewritten lesson ships English, Hindi, Hindi parity paths, ledger re-approval and changed recordings in one release.
  - New narrated text is:
    - the section body for the core text, keeping today's key;
    - a second track `section-<id>-teen` for `teen.add` or `teen.body`, recorded for each of the 3 personas;
    - the check-in question.
  - The word-card listen button speaks through the existing glossary "Pronounce" path, not a recording.
- **Rationale:** `narration.Hash` re-records only changed text. Splitting sections changes their ids, so that lesson's Hindi Kids tracks are re-recorded about once per lesson. Estimate for lesson 3: about 8 sections + 4 teen tracks × 3 personas ≈ 36 MP3s.
- **Alternatives considered:** recording word cards. Rejected for now because it would add about 25 × 3 × languages files for very short text.

## R10. Measuring

- **Kid tests:** a checklist at `specs/012-kids-content-easing/checklists/kid-tests.md` with band, age (not name), the child's big-idea answer, and pass or fail.
- **Feedback before and after:** use the admin console's existing feedback list, filtered by lesson and `junior` mode. Nothing new is collected (DC-09).
