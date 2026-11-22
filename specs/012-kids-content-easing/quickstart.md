# Quickstart: validating SPEC-012

Run from the repo root. These steps prove the feature works end to end, and are repeated for each lesson as it ships.

## Prerequisites

- Go 1.27.3, plus Node and npm as used by `web/`.
- For Hindi recordings only: GCP auth for `cmd/narrate` (see SPEC-009 quickstart).

## 1. Content check (US1, US6)

```bash
go run ./cmd/ingest -verify -audio=false
```

- **Before any rewrite:** exit 0, with `kids-check: WARN …` lines for all six lessons.
- **After the pilot:** the `3-neuralnetworks` summary lines show 8–11 `grade ≤ 3.5` and 12–14 `grade ≤ 6.0`, `missingTerms=0` and no FAIL. To confirm blocking works, temporarily add a 25-word sentence to a core body in lesson 3. The check must then exit non-zero with `rule=long-sentence`.

Contract: [contracts/kids-content-check.md](./contracts/kids-content-check.md).

## 2. Hindi lockstep (US5)

```bash
go run ./cmd/ingest -verify            # with audio: changed Hindi tracks must exist
go run ./cmd/review -lang hi -reviewer "<reviewer>" -approve public-content/lang/hi/lessons/3-neuralnetworks.junior.json
```

- With English lesson 3 changed and Hindi left stale, verify fails on the ledger.
- After the Hindi update and re-approval, verify passes.
- `go run ./cmd/narrate -lang hi` records only the changed and `-teen` tracks.

## 3. Browser tests (US2–US4)

```bash
cd web && npx playwright test kids-bands kids-word-cards kids-aids audio-mute
```

These cover every behaviour in [contracts/ui-behaviour.md](./contracts/ui-behaviour.md):
- the band chooser and the no-band-in-requests check;
- word cards with keyboard, Escape and reduce motion;
- stepper Play and Pause;
- check-ins that leave the score unchanged;
- the recap;
- the muted listen control on word cards.

## 4. Constitution gates

```bash
go test ./...
cd web && npx playwright test && npm run build
go run ./cmd/assetcheck
```

All must pass.

## 5. Manual checks (each released lesson)

- **Kid tests:** record 3–5 children per band, including at least one aged 10–11, in `checklists/kid-tests.md`. A lesson passes when at least 4 of 5 children in each band say the big idea.
- **Page weight:** this feature adds no first-load weight to the home page (NFR-OPS-05). Record this in the release's perf note.
- **Feedback:** compare Kids "too hard" feedback for the lesson in the admin console, 4 weeks before and 4 weeks after release (SC-003).
