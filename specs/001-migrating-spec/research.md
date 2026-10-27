# Phase 0 Research: Migrating Existing Spec to Spec Kit Lifecycle

All Technical Context fields were resolvable from the existing codebase and `spec/SPEC.md`; no `NEEDS CLARIFICATION` markers remain. Findings R-01..R-04 are decisions; R-05..R-08 are baseline-vs-code drift discovered while reverse-mapping.

## Decisions

### R-01 Migration strategy
- **Decision**: Reverse-map each `spec.md` FR to existing code and tests; add no product code.
- **Rationale**: The product already passes its gates; the goal is lifecycle parity and traceability (spec → plan → tasks).
- **Alternatives**: Rewrite `spec/SPEC.md` into Spec Kit format (rejected: Constitution I makes `spec/SPEC.md` the ground truth); duplicate all 38 ACs into `specs/` (rejected: duplication will drift).

### R-02 Relationship between `spec/` and `specs/`
- **Decision**: `spec/` stays normative; `specs/001-migrating-spec/` references FR/AC IDs and never restates them.
- **Rationale**: Single source of truth; Constitution Governance requires amendments in `spec/SPEC.md §8` and the constitution together.
- **Alternatives**: Symlink or move `spec/` (rejected: breaks `LAYOUT.md` DC-05 and existing `// SPEC:` code comments).

### R-03 Contract documentation format
- **Decision**: Markdown contracts for the HTTP API and the localStorage keys, derived from `router.go`, handlers and `store.ts`.
- **Rationale**: No OpenAPI tooling is on the DC-06 allowlist; the API is small (8 routes).
- **Alternatives**: OpenAPI YAML (rejected: unneeded artifact with no consumer).

### R-04 Verification approach
- **Decision**: Quickstart reuses the constitution's three-tier gate verbatim (Go tests, Playwright, `npm run build`).
- **Rationale**: Matches SC-006; no new test infrastructure.

## Baseline-vs-code drift (to resolve by spec amendment or follow-up task)

### R-05 Extra endpoints not in `spec/SPEC.md §7.1`
- **Finding**: `router.go` also serves `POST /api/tutor/stream`, `POST /api/config/test` (`FR-SET-03/04`) and `POST /api/ingest/sync` (`FR-ING-09`, `FR-SET-05`). SPEC §7.1 lists only four endpoints, and AC-18 forbids debug-style routes.
- **Resolution**: Documented in `contracts/http-api.md`; follow-up task to confirm §7.1 / LAYOUT mention them.

### R-06 Settings fields differ from spec.md US4
- **Finding**: `spec.md` US4 says settings include "temperature"; code (`store.ts` `AISettings`) has provider, baseUrl, model, apiKey, githubToken, maxBytes, and no temperature. FR-007 says "token budget", which maps to `maxBytes`.
- **Resolution**: Treat code as truth; fix spec.md US4 wording in a follow-up (`/speckit-clarify` or a direct edit).

### R-07 Auto-appended citation for custom providers
- **Finding**: `tutor.go` (~line 369) appends ` [<title> § <defaultSection>]` when a custom-base-URL model omits a citation. This guarantees SC-002's "citation present" mechanically but the heading may not be verified against the answer, which is in tension with Constitution II ("grounded ... verifiable") and FR-TUT-12.
- **Resolution (decided 2026-10-27, T008)**: Current behaviour is allowed. Added `FR-TUT-13` to `spec/SPEC.md` (v2.1.0) as a scoped exception to FR-TUT-06 for custom base URLs. Residual risk: the appended heading is the lesson's first heading and is not matched to the answer, so the citation is not a per-claim guarantee. SC-002 should be read with this exception.

### R-08 Layout drift
- **Finding**: `LAYOUT.md` lists `internal/content/loader.go` and `internal/tutor/service.go`; the repo has only `internal/api` and `internal/ingest`. Also `go.mod` marks `go-github`, `go-openai` as `// indirect` though they are used directly.
- **Resolution**: Follow-up tasks: update `LAYOUT.md` (or add the packages) and run `go mod tidy`.
