# AI Learning Mod (AI Foundations Coach) Constitution

## Core Principles

### I. Master Specification Ground Truth
- The normative specification is strictly anchored in `spec/SPEC.md`.
- All acceptance criteria are tracked in `spec/ACCEPTANCE.md` (AC-01 through AC-38).
- Repository layout must conform to `spec/LAYOUT.md`.
- No new feature, branch, or refactor may violate or remove baseline requirements without an explicit spec amendment.

### II. Grounded & Citable AI Responses (Non-Negotiable)
- All AI tutor responses must strictly adhere to `FR-TUT-06` and `FR-TUT-12`.
- Responses must be grounded in lesson content and provide section citations formatted as `[<lesson title> § <heading>]` or emit the fallback `"I couldn't find that in this lesson. Try rephrasing or ask about a different section."`.
- Streaming token delivery (`FR-TUT-11`) over SSE must maintain write-deadline safety (`http.ResponseController.SetWriteDeadline(time.Time{})`) to prevent socket termination during CPU evaluation.

### III. Technology Constraints (DC-01 .. DC-11)
- **Backend (DC-02)**: Go 1.23 using standard library `net/http` router only (`http.NewServeMux()` with Go 1.22+ method+path patterns). No third-party routers allowed.
- **Frontend (DC-01)**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand with local persistence.
- **Ingestion (DC-03)**: Go CLI using `github.com/google/go-github/v66`.
- **Zero Database (DC-09)**: No database, ORM, session store, or server-side persistent state in v1/v2. Lessons are stored as static JSON files generated during ingestion.
- **Zero Python (DC-10)**: No Python code anywhere in the build, backend, or runtime.
- **Single Container (DC-08)**: Single container image serves both SPA frontend and API on one port.

### IV. Quality & Accessibility Floor (DC-11)
- WCAG contrast ratio must be ≥ 4.5:1 across both light and dark themes.
- Accessible touch and click targets (minimum 44x44px or padded equivalent).
- Markdown output rendered by AI must be sanitized using AST pipelines (`rehype-sanitize` with restrictive schema disallowing scripts, iframes, and `on*` event handlers).

### V. Git Discipline & Safety
- **Rule 10 Mandatory**: Never use `git add .` or `git add -A`. All staged files must be specified by explicit file paths.
- Never commit secret environment files (`.env`, `.env.local`), temporary scratch files, or `web/dist`.
- Keep commit messages descriptive and prefixed by conventional commit types (`feat:`, `fix:`, `test:`, `docs:`).

## Quality Gates & Verification Matrix

Every new phase, PR, or implementation task MUST pass the three-tier verification gate:
1. **Backend Unit & Contract Suite**: `go test -v ./internal/api` (All 15+ tests passing).
2. **Frontend Playwright E2E Suite**: `cd web && npx playwright test` (All 24+ tests passing).
3. **TypeScript & Production Bundling**: `cd web && npm run build` (`tsc --noEmit && vite build`).

## Governance

- This Constitution supersedes informal prompt requests. If an implementation plan conflicts with this Constitution, the Constitution takes precedence.
- Proposed amendments to architecture constraints (DC-*) require updating `spec/SPEC.md §8` and this document simultaneously.

**Version**: 2.0.0 | **Ratified**: 2026-10-26 | **Governing Baseline**: `spec/SPEC.md`
