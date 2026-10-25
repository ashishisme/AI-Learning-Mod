# AGENT DIRECTIVE — Implement SPEC-001

You are implementing `spec/SPEC.md` verbatim. The spec, not this file,
is the source of truth.

## Rules

1. **Read `spec/SPEC.md` completely before writing any code.** If
   anything in it is ambiguous, halt and report the specific section
   with a proposed amendment; do not resolve it by assumption.
2. **Every file you create or edit must trace to at least one
   `FR-*`, `NFR-*`, or `DC-*` ID.** Record the mapping in the commit
   message or PR body as `SPEC: FR-UI-03, NFR-SEC-03`.
3. **Do not add behavior not in the spec.** If a natural feature is
   not covered, halt and propose an amendment.
4. **Every AC in §10 must have a corresponding automated test** whose
   name or annotation includes the AC ID. Tests are deliverable
   requirements, not optional.
5. **Do not modify `spec/`.** Amendments are made by the human owner.
6. **Do not disable guardrails to make tests pass.** If an NFR blocks
   an AC, fix the AC implementation or halt.
7. **Do not add dependencies outside DC-06.**
8. **Do not refactor beyond the spec.** No renaming, restructuring,
   or formatting of files not required to satisfy a requirement.
9. **Do not run destructive commands** (`git push --force`,
   `reset --hard` on shared refs, `rm -rf` outside the repo, etc.).
10. **Do not stage or commit** `.env*`, `public-content/`, `web/dist`,
    `web/node_modules`, or `bin/`. Never `git add -A` or `git add .`.
11. **UI Craft & Motion Skills.** When implementing or refining frontend
    components and pages, you MUST apply the design, typography, and motion
    practices from the `frontend-design` and `impeccable` skills (`craft-floor`:
    contrast ≥4.5:1, comfortable reading measure 65–75ch, purposeful CSS
    micro-interactions, no generic card or kicker cliches, styled browser
    surfaces). All animations shall use Tailwind CSS transitions/keyframes
    without exceeding the DC-06 dependency allowlist.

## Completion checklist

Before declaring done, produce:

1. **File tree** of everything created.
2. **Traceability matrix** (`spec/ACCEPTANCE.md`) fully populated:
   every AC has a `PASS`, `FAIL`, or `N/A (reason)`.
3. **Command transcript** for:
   - `go vet ./...`
   - `go build ./...`
   - `go test ./...`
   - `cd web && npx tsc --noEmit && npm run build`
   - `docker build -t ai-foundations-coach .`
   - `docker run --rm ai-foundations-coach id -u`
   - `git ls-files | grep -E '^(\.env|public-content|web/dist|web/node_modules|bin/)'`
4. **Pinned upstream SHA** recorded from the last successful ingest.
5. **Deviation log**: any requirement that could not be met, with
   the specific ID, the reason, and a proposed amendment.

A single failing AC blocks completion. Do not mark done with pending
FAILs.
