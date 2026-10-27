# Implementation Plan: Migrating Existing Spec to Spec Kit Lifecycle

**Branch**: `001-migrating-spec` | **Date**: 2026-10-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-migrating-spec/spec.md`

## Summary

Bring the already-implemented AI Foundations Coach (curriculum ingestion, static lesson serving, grounded SSE tutor, quizzes, settings drawer, local progress, themes) under the Spec Kit lifecycle. This is a **migration/alignment** feature, not greenfield: the technical approach is to treat `spec/SPEC.md`, `spec/ACCEPTANCE.md` and `spec/LAYOUT.md` as the normative baseline, reverse-map each `spec.md` requirement (FR-001..FR-008) to the existing code and tests, document the real interface contracts, record drift between baseline and code, and keep the three-tier verification gate green. No behavioural change to the product is planned.

## Technical Context

**Language/Version**: Go 1.23.2 (backend + ingest CLI); TypeScript with React 18.3 (frontend)

**Primary Dependencies**: Backend: stdlib `net/http` (Go 1.22 method+path mux), `github.com/google/go-github/v66`, `github.com/sashabaranov/go-openai`, `log/slog`. Frontend: Vite 5, Tailwind 3, `react-router-dom` 6, `react-markdown` + `remark-gfm` + `rehype-highlight` + `rehype-raw` + `rehype-sanitize`, `zustand` 4 with `persist`

**Storage**: Static JSON files under `public-content/` (`index.json`, `lessons/<id>.json`); browser `localStorage` for progress, settings and theme. No database (DC-09)

**Testing**: `go test -v ./internal/api` (+ `cmd/ingest` tests); Playwright E2E in `web/tests/*.spec.ts`; `tsc --noEmit && vite build`

**Target Platform**: Single Linux container (non-root) serving SPA and API on one port; modern evergreen browsers

**Project Type**: web-application (Go API + embedded React SPA)

**Performance Goals**: FCP < 1.2 s (SC-001); tutor time-to-first-token < 800 ms on standard providers (SC-003)

**Constraints**: WCAG AA contrast ≥ 4.5:1; 44×44 px targets; SSE write deadline cleared; no Python; no third-party router; rate-limited tutor; 8 KiB tutor body cap

**Scale/Scope**: Single-tenant, read-mostly; one upstream curriculum (~tens of lessons), 8 FR groups, 38 acceptance criteria

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-research | Post-design |
|---|---|---|---|
| I. Spec ground truth | Plan anchors on `spec/SPEC.md`, `ACCEPTANCE.md`, `LAYOUT.md`; removes no baseline requirement | PASS | PASS |
| II. Grounded AI | Tutor contract keeps `[<title> § <heading>]` citation / fallback phrase, SSE write-deadline reset | PASS | PASS |
| III. Tech constraints (DC-01..11) | No new dependency, router, DB, or Python introduced | PASS | PASS |
| IV. Quality/a11y floor | Contrast, touch targets, `rehype-sanitize` retained | PASS | PASS |
| V. Git discipline | Explicit-path staging only; no `.env`/`web/dist` | PASS | PASS |
| Verification matrix | Quickstart documents all three gates | PASS | PASS |

No violations; Complexity Tracking is empty. Drift items found in research (R-05..R-07) are baseline-vs-code inconsistencies to be resolved by spec amendment (Constitution Governance), not by plan deviation.

## Project Structure

### Documentation (this feature)

```text
specs/001-migrating-spec/
├── plan.md              # This file
├── research.md          # Phase 0: decisions + baseline/code drift findings
├── data-model.md        # Phase 1: entities, storage keys, validation
├── quickstart.md        # Phase 1: end-to-end validation guide
├── contracts/
│   ├── http-api.md      # REST/SSE endpoint contract
│   └── client-storage.md# localStorage contract
├── checklists/          # Existing (requirements.md, review.md)
└── tasks.md             # Phase 2 (/speckit-tasks) - NOT created here
```

### Source Code (repository root)

```text
cmd/
├── ingest/              # Ingestion CLI (go-github, pinned SHA)  - FR-001
└── server/main.go       # HTTP entrypoint                         - FR-002/003
internal/
├── api/                 # Handlers, middleware, rate limit, tutor, config test, ingest sync
└── ingest/ingest.go     # Ingestion library
public-content/          # Generated, gitignored
spec/                    # Normative baseline (SPEC, ACCEPTANCE, LAYOUT, AGENT)
web/
├── src/
│   ├── api.ts, store.ts, App.tsx, main.tsx, index.css
│   ├── components/      # MarkdownBlock, TutorPanel, SettingsModal, Attribution
│   ├── pages/           # Home, Lesson, Quiz
│   └── data/quizzes.ts  # Static quiz bank
└── tests/*.spec.ts      # Playwright E2E
```

**Structure Decision**: Existing web-application layout (Go `cmd/` + `internal/`, React SPA under `web/`) is retained unchanged. This feature adds only documentation under `specs/001-migrating-spec/`.

## Requirement → Implementation Map

| Spec FR | Implementation | Verification |
|---|---|---|
| FR-001 ingest | `cmd/ingest/main.go`, `internal/ingest/ingest.go` | `cmd/ingest/ingest_test.go` |
| FR-002 serve lessons/health | `internal/api/lessons.go`, `health.go`, `router.go` | `lessons_test.go`, `health_test.go`, `routes_test.go` |
| FR-003 tutor | `internal/api/tutor.go`, `ratelimit.go`, `middleware.go` | `tutor_test.go`, `ratelimit_test.go`, `web/tests/tutor.spec.ts` |
| FR-004 sanitize | `web/src/components/MarkdownBlock.tsx` | `web/tests/security.spec.ts` |
| FR-005 local progress | `web/src/store.ts` (`ai-foundations-progress`) | `web/tests/progress.spec.ts` |
| FR-006 quiz | `web/src/pages/Quiz.tsx`, `data/quizzes.ts` | `web/tests/quiz.spec.ts` |
| FR-007 settings | `web/src/components/SettingsModal.tsx`, `internal/api/config.go`, `ingest_sync.go` | `config_test.go`, `ingest_sync_test.go`, `settings.spec.ts`, `sync.spec.ts` |
| FR-008 themes | `web/src/index.css`, `App.tsx` | `web/tests/theme.spec.ts` |

## Complexity Tracking

No constitution violations to justify.
