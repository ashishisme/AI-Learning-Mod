---

description: "Task list for migrating the existing spec to the Spec Kit lifecycle"
---

# Tasks: Migrating Existing Spec to Spec Kit Lifecycle

**Input**: Design documents from `/specs/001-migrating-spec/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: No new tests are requested. The app is already implemented, so "verify" tasks run the existing suites and "trace" tasks confirm each FR maps to code and tests. No product behaviour changes except the drift fixes (R-05..R-08), which are doc/config amendments unless noted.

**Organization**: Grouped by user story so each can be verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1..US4 from spec.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the verification baseline before touching any documents.

- [X] T001 Run `go test -v ./internal/api ./cmd/ingest` from repo root and record the pass count (expect 15+) in `specs/001-migrating-spec/checklists/review.md`
- [X] T002 [P] Run `cd web && npm ci && npx playwright test` and record the pass count (expect 24+) in `specs/001-migrating-spec/checklists/review.md`
- [X] T003 [P] Run `cd web && npm run build` (`tsc --noEmit && vite build`) and record the result in `specs/001-migrating-spec/checklists/review.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Resolve baseline-vs-code drift so story verification is judged against accurate documents.

**⚠️ CRITICAL**: Complete before the user story phases.

- [X] T004 Amend `spec/SPEC.md` §7.1 to add `POST /api/tutor/stream`, `POST /api/config/test` and `POST /api/ingest/sync` per `specs/001-migrating-spec/contracts/http-api.md` (R-05); keep AC-18 wording intact
- [X] T005 [P] Correct `specs/001-migrating-spec/spec.md` User Story 4 and FR-007: replace "temperature" with the real fields (provider, baseUrl, model, apiKey, githubToken, `maxBytes` token budget) from `web/src/store.ts` (R-06)
- [X] T006 [P] Update `spec/LAYOUT.md` to drop the nonexistent `internal/content/loader.go` and `internal/tutor/service.go` entries, or note that tutor and content logic live in `internal/api/` (R-08)
- [X] T007 [P] Run `go mod tidy` in repo root so `github.com/google/go-github/v66` and `github.com/sashabaranov/go-openai` are direct requirements in `go.mod`/`go.sum`; re-run T001 afterwards (R-08)
- [X] T008 Allow the auto-citation behaviour in `internal/api/tutor.go` (~line 369) for custom base URLs (R-07). Decision: amend the spec, not the code. Added `FR-TUT-13` to `spec/SPEC.md` (v2.1.0) and recorded it in `specs/001-migrating-spec/research.md`
- [X] T008a Add an AC for FR-TUT-13 to `spec/SPEC.md` §10 and `spec/ACCEPTANCE.md`, and confirm `internal/api/tutor_test.go` covers a custom-base-URL response with no citation (appended) and a short response (fallback); add the test if missing (change control rule 3)

**Checkpoint**: Documents match the code; verification baseline is green.

---

## Phase 3: User Story 1 - Curriculum Ingestion and Lesson Browsing (Priority: P1) 🎯 MVP

**Goal**: FR-001, FR-002, FR-004 traceable to code and tests; home and lesson pages verified.

**Independent Test**: Quickstart §3 rows US1 and US1 edge.

- [ ] T009 [P] [US1] Confirm `cmd/ingest/main.go` and `internal/ingest/ingest.go` ingest from the pinned SHA, and that failed runs leave no partial files; add a trace line to `specs/001-migrating-spec/checklists/requirements.md` mapping FR-001 to `cmd/ingest/ingest_test.go`
- [ ] T010 [P] [US1] Confirm `internal/api/lessons.go` returns 200/400/404/500 for `/api/lessons/{id}` and 503 `{"error":"content not generated"}` for `/api/lessons`; check that `internal/api/lessons_test.go` covers each status, and note any gap in `specs/001-migrating-spec/checklists/review.md`
- [ ] T011 [P] [US1] Confirm `web/src/components/MarkdownBlock.tsx` uses `rehype-sanitize` with a restrictive schema (no scripts, iframes, `on*` handlers, `javascript:` links) and that `web/tests/security.spec.ts` asserts it
- [ ] T012 [US1] Perform the manual Quickstart US1 scenarios against a running server (`/`, `/lesson/:id`, empty `CONTENT_DIR`) and record results in `specs/001-migrating-spec/checklists/review.md`

---

## Phase 4: User Story 2 - Grounded AI Tutor with Live Streaming (Priority: P1)

**Goal**: FR-003 traceable; citation, fallback and SSE behaviour verified.

**Independent Test**: Quickstart §3 rows US2 and US2 edge.

- [ ] T013 [P] [US2] Confirm `internal/api/tutor.go` clears the write deadline (`SetWriteDeadline(time.Time{})`) and enforces 8 KiB body, 500-char question, 404/413/429/502/503/504 statuses per `contracts/http-api.md`; map to `internal/api/tutor_test.go` and `ratelimit_test.go` in `specs/001-migrating-spec/checklists/requirements.md`
- [ ] T014 [P] [US2] Confirm the system prompt and user-message format in `internal/api/tutor.go` match `spec/SPEC.md` §7.3 verbatim
- [ ] T015 [P] [US2] Confirm `web/src/components/TutorPanel.tsx` keeps partial text and offers retry on interrupted streams, and that `web/tests/tutor.spec.ts` and `web/tests/errors.spec.ts` cover it
- [ ] T016 [US2] Perform the manual Quickstart US2 scenarios (in-lesson question, off-topic question, prompt-injection attempt) and record the results in `specs/001-migrating-spec/checklists/review.md`

---

## Phase 5: User Story 3 - Interactive Knowledge Checks and Quizzes (Priority: P2)

**Goal**: FR-006 traceable to `Quiz.tsx` and `quizzes.ts`.

**Independent Test**: Quickstart §3 row US3.

- [ ] T017 [P] [US3] Validate `web/src/data/quizzes.ts` against `data-model.md`: every `correctIndex` is within its `options`, and every `lessonId` matches an ingested lesson `id`
- [ ] T018 [P] [US3] Confirm `web/src/pages/Quiz.tsx` shows sequential questions, rationale on answer, "Need a hint?" via the tutor using `hintKeyword`, and a score recap; map to `web/tests/quiz.spec.ts`
- [ ] T019 [US3] Perform the manual Quickstart US3 scenario at `/quiz/:id` and record the result in `specs/001-migrating-spec/checklists/review.md`

---

## Phase 6: User Story 4 - Local Learner State, Theme, and Configuration (Priority: P3)

**Goal**: FR-005, FR-007, FR-008 traceable; storage keys match `contracts/client-storage.md`.

**Independent Test**: Quickstart §3 row US4.

- [ ] T020 [P] [US4] Confirm `web/src/store.ts` uses keys `ai-foundations-progress`, `ai-foundations-settings`, `ai-foundations-theme` and that `web/tests/progress.spec.ts` and `web/tests/theme.spec.ts` reload-verify persistence
- [ ] T021 [P] [US4] Confirm `web/src/components/SettingsModal.tsx` provides model selection, `maxBytes` budget, Test Connection (latency via `internal/api/config.go`) and sync trigger (`internal/api/ingest_sync.go`); map to `web/tests/settings.spec.ts`, `web/tests/sync.spec.ts`, `config_test.go`, `ingest_sync_test.go`
- [ ] T022 [P] [US4] Check light and dark contrast ≥ 4.5:1 and 44×44 px targets in `web/src/index.css` and `web/src/App.tsx`; record the results in `specs/001-migrating-spec/checklists/review.md`
- [ ] T023 [US4] Confirm the GitHub token and API key are sent only in the bodies of `/api/config/test` and `/api/ingest/sync` and are never logged (NFR-SEC-01) by grepping `internal/api/` for `slog` calls

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T024 Re-run T001–T003 after all amendments and confirm the three-tier gate is green (SC-006)
- [ ] T025 [P] Verify `README.md` references the Spec Kit workflow and `specs/001-migrating-spec/`
- [ ] T026 Re-check `.specify/memory/constitution.md` principles against the final state; update the Constitution Check table in `specs/001-migrating-spec/plan.md` if anything changed
- [ ] T027 Stage only explicit paths (never `git add .` or `-A`, per Constitution V) and commit with a `docs:` prefix

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phases 3–6 (independent of each other) → Phase 7.
- T007 and T008 require T001 re-run before Phase 7.
- Within a story, `[P]` confirm tasks come before the manual scenario task.
- US1 and US2 (both P1) are the MVP; US3 then US4 follow by priority.

## Parallel Example

```text
Phase 1: T002, T003 together after T001 starts.
Phase 2: T005, T006, T007 together; T004 and T008 sequential.
Phase 3: T009, T010, T011 together, then T012.
Phases 3–6 can run concurrently across stories.
```

## Implementation Strategy

1. **MVP**: Phases 1–2 plus US1 (Phase 3), which gives a verified baseline and accurate documents for the core flow.
2. Add US2, then US3, then US4, each independently verifiable.
3. Finish with Phase 7 and the commit.
