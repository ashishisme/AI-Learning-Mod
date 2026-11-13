# AI Learning Mod (AI Foundations Coach) Constitution

## Core Principles

### I. Master Specification Ground Truth
- The normative specification is strictly anchored in `spec/SPEC.md`.
- All acceptance criteria are tracked in `spec/ACCEPTANCE.md` (AC-01 through AC-38).
- Repository layout must conform to `spec/LAYOUT.md`.
- No new feature, branch, or refactor may violate or remove baseline requirements without an explicit spec amendment.

### II. Grounded & Citable AI Responses (Non-Negotiable)
- All AI tutor responses must strictly adhere to `FR-TUT-06` and `FR-TUT-12`.
- Responses must be grounded in lesson content and provide section citations formatted as `[<lesson title> § <heading>]` or emit the fallback `"I couldn't find that in this lesson. Try rephrasing or ask about a different section."` or its approved translation in the learner's language (amended 2.4.0, 2026-11-03, SPEC-009: an approved language's fallback is reviewed like its other text; grounding and citations remain mandatory in every language).
- Streaming token delivery (`FR-TUT-11`) over SSE must maintain write-deadline safety (`http.ResponseController.SetWriteDeadline(time.Time{})`) to prevent socket termination during CPU evaluation.

### III. Technology Constraints (DC-01 .. DC-11)
- **Backend (DC-02)**: Go 1.27.4 using standard library `net/http` router only (`http.NewServeMux()` with Go 1.22+ method+path patterns). No third-party routers allowed.
- **Frontend (DC-01)**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand with local persistence.
- **Ingestion (DC-03)**: Go CLI using `github.com/google/go-github/v66`.
- **Minimal State (DC-09, amended 2.3.0)**: Lessons remain static JSON packaged with the release. Server-side persistent state is permitted **only** for:
  (a) access-control records: invites, pseudonymous beta accounts, sessions, and admin audit entries;
  (b) operational counters: the daily AI spend tally, rate-limit counters, aggregate usage counts per day, and a last-seen time per beta account;
  (c) learner feedback records: a rating, a category, a message of at most 500 characters scrubbed of emails, phone numbers and links, and context fields (group label, lesson, audience mode, app version, time), with no Beta ID, network address, session or device details, deleted automatically after 180 days.
  Such state MUST NOT contain personal data (names, emails, phone numbers, dates of birth), or learner question or answer text from the AI tutor; MUST be reached only through a store interface; MUST NOT introduce an ORM; and in a hosted deployment MUST be held in a managed serverless store with no idle compute or provisioned capacity; small storage and backup charges are allowed. A local file-backed implementation of the interface is permitted for development, tests and single-instance self-hosting. Learner progress and preferences remain browser-local.
  (a) access-control records: invites, pseudonymous beta accounts, sessions, and admin audit entries;
  (b) operational counters: the daily AI spend tally and rate-limit counters.
  Such state MUST NOT contain personal data (names, emails, phone numbers, dates of birth), learner question text, or answers; MUST be reached only through a store interface; MUST NOT introduce an ORM; and in a hosted deployment MUST be held in a managed serverless store with no idle compute or provisioned capacity; small storage and backup charges are allowed. A local file-backed implementation of the interface is permitted for development, tests and single-instance self-hosting. Learner progress and preferences remain browser-local.
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

**Version**: 2.4.1 | **Ratified**: 2026-10-26 | **Last Amended**: 2026-11-13 (DC-02: Go 1.27.4 for GO-2026-6859, ratified by the owner, 2.4.1; Principle II fallback may be the approved translation in the learner's language, ratified by the owner, 2.4.0; DC-09 hosted store cost wording, 2.3.0; DC-02 was Go 1.27.3 in 2.2.1; DC-09 access records and feedback remain as ratified in 2.1.0 and 2.2.0) | **Governing Baseline**: `spec/SPEC.md`
