# Implementation Plan: Kids-First UI Overhaul

**Branch**: `011-kids-ui-overhaul` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-kids-ui-overhaul/spec.md`

## Summary

Keep the three learner journeys, **Standard**, **Kids** (`junior`) and **Plain English** (owner decision 2026-11-04: Standard stays). Add a first-time journey chooser, give all three journeys the redesigned look, and make Kids markedly livelier. Build a colourful, original visual system around Chip and lesson illustrations, delivered as responsive SVG and compressed raster derivatives with provenance records. Add the visual-asset rights and performance requirements to SPEC-001 and the acceptance trace.

## Technical Context

**Language/Version**: Go 1.27.3; TypeScript 5, React 18, Vite and Tailwind CSS.

**Primary Dependencies**: Existing React Router, Zustand, react-markdown, rehype/remark and Go standard-library API. No new runtime dependency.

**Storage**: Browser `localStorage` for journey choice and progress; static lesson content in `public-content/`; tracked product visual manifest and source SVGs.

**Testing**: `go test ./...`; Playwright journey, visual and accessibility coverage; `npm --prefix web run build`; asset provenance/performance release checks.

**Target Platform**: Existing Cloud Run single-container web application; current desktop and mobile Chrome, Edge, Firefox and Safari.

**Project Type**: Go API + React SPA, with static visual assets prepared before build.

**Performance Goals**: New initial-route visual transfer ≤350 KB compressed; no image-driven layout shift; responsive selection/navigation at 360 px.

**Constraints**:

- Preserve upstream attribution, content-image screening, privacy posture and no-Microsoft-assets rule.
- Standard, Kids and Plain English all stay selectable; existing preferences and progress are untouched.
- Interactive targets ≥44 × 44 CSS px; all text, including headings, meets the constitution's ≥4.5:1 contrast floor; respect reduced motion.
- Product visuals must be original, commissioned with exclusive rights, or carry a compatible written licence and recorded provenance. No third-party trademarks, lookalikes or imitation of recognisable brand/living-artist styles.
- Source masters stay outside the deployable bundle; only reviewed derivatives ship.

**Scale/Scope**: Three journeys × six lessons × English/Hindi × light/dark × phone/desktop; a mark, three Chip poses, six lesson illustrations, six concept graphics and reusable motifs.

## Constitution Check

*GATE: Passed before Phase 0 research. Re-checked after Phase 1 design.*

| Rule | Status | Plan response |
| --- | --- | --- |
| Master spec ground truth | Pass with amendment | Add visual-asset rights and performance requirements and their ACs to `spec/SPEC.md` and `spec/ACCEPTANCE.md`. The three-mode requirements stay. |
| Grounded tutor | Pass | Unchanged: the tutor grounds on the Standard lesson and cites its headings, which learners can still open. |
| Existing stack/allowlist | Pass | React, Tailwind, Zustand, Go and local assets only; no packages or image CDN. |
| Minimal state | Pass | The journey choice stays in browser storage; no new learner server state. |
| Single container/CSP | Pass | Approved derivatives are served from the app origin; no external visual runtime. |
| Quality floor | Pass by design | Coverage includes 360 px/desktop, English/Hindi, light/dark, keyboard, reduced motion, journey choice, assets and performance. |
| Git discipline/licensing | Pass with governance | Track source vectors/manifest/derivatives only; link large editable masters by immutable controlled-storage ID/checksum. |

**Post-design re-check:** unchanged. The spec amendment and asset-register rights sign-off are release blockers.

## Project Structure

### Documentation

```text
specs/011-kids-ui-overhaul/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/learner-journey.md
├── checklists/requirements.md
└── tasks.md                 # created by /speckit-tasks
```

### Source Code

```text
spec/{SPEC.md,ACCEPTANCE.md}             # prerequisite normative amendment
design/brand/                            # source SVGs and asset register
web/public/brand/                        # reviewed deployable SVG/AVIF/WebP derivatives
web/src/
├── store.ts                             # first-time chooser flag on the existing mode store
├── i18n/{en,hi}.json                    # localized journey/alt copy
├── components/{JourneyChooser,AudienceModeSelector,KidVisual,
│   ChipVectorAvatar,VisualMetaphorCard}.tsx
└── pages/{Home,Lesson,Quiz}.tsx         # kids-first presentation
public-content/lang/hi/lessons/*.{junior,plain-english}.json
web/tests/                               # journey choice, a11y and visual coverage
```

**Structure Decision**: Keep the current SPA/API topology. `design/brand/` holds lightweight editable vectors and auditable register; controlled storage holds large native/3D masters. `web/public/brand/` has only release-approved derivatives. Learner pages keep requesting the journey the learner chose, as today.

## Delivery Sequence

1. Ratify scope/visual governance: amend SPEC-001 and acceptance trace; create brand brief, asset register, custody/approval roles, trademark screen and budgets.
2. Journey choice: add a first-time chooser for the three journeys and a consistent switcher on the home page and in lessons. Keep saved preferences, progress and settings as they are.
3. Release parity: all six lessons in all three journeys, in English and Hindi, as today.
4. Kids-first surfaces: vibrant Kids home, lesson and quiz, progress celebration, Chip variants and original metaphor illustrations. Plain English and Standard get the shared redesigned look, with a calmer palette.
5. Produce approved original assets: mark, source vectors, static 3D-style images and mobile derivatives; record each in the manifest and enforce the asset gate.
6. Prove release quality: journey choice, language, accessibility, motion, narrow-screen, performance and provenance tests, a Hindi device review, and owner approvals.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Controlled external master-art storage | High-resolution editable 3D masters are unsuitable for deployable/git history | Deploying masters bloats release; keeping no master reference fails provenance. |
