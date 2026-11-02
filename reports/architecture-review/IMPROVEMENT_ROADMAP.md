# Improvement roadmap

Effort is an estimate for one engineer with repository familiarity, excluding account setup and review delays. The staging environment will serve the initial invite-only beta demo. A distinct production environment is deferred to GA; no GA production traffic changes are part of these phases.

| Phase | Objective and required changes | Affected files | Dependencies and effort | Acceptance, test and recovery |
|---|---|---|---|---|
| 1. Staging beta deployment safety | Firestore Native store, transaction semantics, migration, daily backup/restore, staging Cloud Run/identity/secrets IaC, tagged no-traffic release and rollback | `internal/state/`, `cmd/server/`, `deploy/terraform/`, `.github/workflows/`, specs | Owner provides staging GCP project, billing, IdP, optional demo domain and notification destination; ~3–6 engineer weeks | Concurrent store contract tests; fresh restart and scale-to-zero retain accounts; restore drill; staging auth/TLS/SSE; staging rollback within 5 min. Recovery: previous staging revision plus Firestore backup, never a fresh local state file. |
| 2. Operational excellence | Request IDs, structured metrics, p95/error alerts, dashboard, load test, CSP/self-hosted images, cost review and hardening | `internal/api/`, `web/src/`, `public-content/`, `deploy/terraform/`, reports | Phase 1 staging; ~2–3 weeks | Alert exercise, latency/error load report, no sensitive logs, all lessons render with GitHub blocked. Roll back image/revision if regression; keep monitoring baseline. |
| 3. Learning product maturity | Content versioning, accessibility and error UX, assessment design, optional learner progress architecture | `web/src/`, `public-content/`, new spec | Product and privacy decisions; DC-09 amendment before server-side learner profile; ~3–6 weeks | Usability/accessibility acceptance and privacy review; feature flags or client-only rollback. No collection of child data without approval. |
| 4. Intelligent AI coach | Tutor orchestration, approved-content retrieval, model gateway, evaluation, policy and spend guard | `internal/api/tutor.go`, `internal/spend/`, new modules/specs | Parent/school consent, model policy, cost ceiling, safety eval set; ~4–8 weeks | Tutor remains disabled until safety, grounded-answer, quota, billing-cutoff and manual-reset tests pass. Disable tutor flag is immediate recovery path. |

## Smallest next sprint

Scope Phase 1 to the Store contract and Firestore adapter design/implementation, with a concurrency suite and restore design. Resolve the shape of records and transaction boundaries before adding Cloud Run resources. The sprint is useful without cloud credentials through emulator/unit tests; a live Firestore integration and restore drill remain blocked on a staging project.

## Work that can proceed independently

- Map Store operations and write contention; add deterministic contract tests.
- Self-host lesson images and tighten CSP with browser tests.
- Define workflow no-traffic/rollback scripts and release stamp.
- Prepare dashboards, SLOs and staging runbook.

## External prerequisites

For beta: staging GCP project ID, billing account (region decided: `us-central1`), IAM/WIF administrator, IdP issuer/client, optional demo domain (the design defaults to the `run.app` URL), secret versions, owner alert destination, retention/RPO/RTO decisions and beta demo cutover approval. Production project and cutover decisions are GA work. Do not include secret values in tickets or reports.
