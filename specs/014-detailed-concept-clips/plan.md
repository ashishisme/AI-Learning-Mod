# Implementation Plan: Concept Clips for Detailed Lessons

**Branch**: `cloud-beta` (spec folder `014-detailed-concept-clips`) | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/014-detailed-concept-clips/spec.md`

## Summary

This plan adds 19 step-by-step animated clips to the Detailed journey:
- 6 "watch the idea" clips, one per lesson;
- 13 clips for sections that have no picture today.

Each clip is a hand-drawn SVG of 3–8 steps, shown as an image. The page moves between steps with `#sK`, as scene pictures already do with `#play`. Captions are lesson text in the section's `diagram.steps`, so the existing English and Hindi ledgers approve them and the Hindi parity check covers them.

On Play, each caption is read aloud: by the device voice in English, and by a recording in Hindi. The clip keeps one sound at a time through the existing speech player and shared audio state. A new `ClipPlayer` component handles controls, reduced motion and mute. A new `clip-check` in the release check enforces steps, length, size and the no-words and safety rules. Lesson 3 is the pilot.

## Technical Context

**Language/Version**: Go 1.27.4 (checks, narration); TypeScript 5 + React 18 (page)

**Primary Dependencies**: existing only: React, Zustand, Tailwind, the narration pipeline (`cmd/narrate`, Google TTS as today). No new npm or Go packages.

**Storage**: committed files only:
- clip drawings in `web/public/brand/clips/`;
- clip data in the Detailed lesson JSON (English and Hindi);
- Hindi recordings in `public-content/audio/hi/`, uploaded to the narration bucket by the owner.

**Testing**: Go tests (`internal/narration`, `internal/i18n`, `cmd/ingest`, `cmd/assetcheck`); Playwright (`web/tests/clips.spec.ts`, plus updated Detailed and baseline specs)

**Target Platform**: the existing single-container web app (Cloud Run), on modern desktop and phone browsers

**Project Type**: web application (Go API + React SPA)

**Performance Goals**: each clip ≤ 100 KB (SC-005). Clip images load lazily, so a lesson opens as fast as today.

**Constraints**:
- DC-10: no Python in the build or runtime.
- DC-11: contrast ≥ 4.5:1 in light and dark, controls ≥ 44×44.
- Constitution IV: no markup is put into the page.
- The page security rule is unchanged (`img-src 'self'`).
- English recording stays on hold.

**Scale/Scope**: 19 clips, about 95 steps, 6 lessons × 2 languages, about 95 Hindi tracks × 3 voices

## Constitution Check

*GATE: checked before Phase 0 research and again after Phase 1 design.*

| Principle / constraint | Check | Result |
|---|---|---|
| I. Spec-first; amendments in `spec/SPEC.md` | New FR-UI-28 (clip player), FR-CNT-13 (clip data and release check), AC-76..AC-78 in a `spec:` amendment commit before code | Pass |
| II. Tutor grounding and citations | Captions are lesson text, and pictures are not cited (SPEC-014 FR-015); the tutor is unchanged | Pass |
| III. DC-01 stack, no new packages | React/Zustand/Tailwind only; SVG + CSS; no new npm package | Pass |
| III. DC-09 static content | Clips and captions are committed files | Pass |
| III. DC-10 no Python | Go checks; Python scratchpad scripts are dev tooling only, never shipped | Pass |
| IV. DC-11 contrast and targets | Clip panel colours fixed and checked; controls use the theme tokens, ≥ 44×44 | Pass |
| IV. Text never interpreted as HTML | SVG shown via `<img>` only; captions rendered as text | Pass |
| V. Git discipline | Explicit paths; no `git add .` | Pass |
| Review ledgers (SPEC-009, SPEC-013) | English and Hindi lesson files re-approved by the owner after clips are added | Pass |

No violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/014-detailed-concept-clips/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R10
├── data-model.md
├── quickstart.md
├── contracts/clip.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
spec/SPEC.md                              # FR-UI-28, FR-CNT-13, AC-76..78
web/public/brand/clips/<name>.svg         # 19 new drawings
design/brand/source/clips/<name>.svg      # source masters (register rule)
design/brand/asset-register.json          # one approved entry per clip
public-content/lessons/<id>.detailed.json           # diagram type "clip"
public-content/lang/hi/lessons/<id>.detailed.json   # Hindi captions
public-content/audio/hi/…                 # Hindi clip-step recordings + manifest
internal/narration/text.go                # clip-step tracks
internal/ingest/clips.go (+ _test)        # clip-check
cmd/ingest/main.go                        # runs clip-check
web/src/api.ts                            # diagram.clip field
web/src/components/ClipPlayer.tsx         # new
web/src/components/AdaptiveLessonView.tsx # render type "clip"
web/src/store.ts                          # clipsMuted (not persisted)
web/src/i18n/en.json, hi.json             # control labels
web/tests/clips.spec.ts                   # new
```

**Structure Decision**: The existing web application layout. The one new component sits beside `StepperDiagram` and `ScenePicture` and follows their patterns. The recording lookup inside `AudioNarrationButton` is moved into a shared helper in `web/src/services/narration.ts`, so the clip player reuses it instead of copying it.

## Delivery

- **Phase A** (code, no content): `spec:` amendment, then:
  - `ClipPlayer`, the store flag and labels;
  - `clip-check`;
  - narration tracks;
  - tests with a fixture clip.

  Release only after Phase B, because nothing visible changes before then.
- **Phase B** (pilot, lesson 3): three clips (`perceptron-learning`, `machine-learning-basics`, `worked-example`), then:
  1. owner review of the drawings and English captions;
  2. Hindi captions, owner approval;
  3. Hindi recording (dry run, price, record);
  4. owner upload and manifest check;
  5. release v0.11.0.
- **Phase C**: lessons 1, 2, 4, 5, 7 the same way, one lesson per release or grouped as the owner prefers.
- **Phase D**: close SPEC-014 once SC-001..007 are met.

## Complexity Tracking

None.
