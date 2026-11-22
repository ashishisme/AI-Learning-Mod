# Actionable implementation backlog

These are review recommendations, not checked-off spec-kit tasks. Owners and dates are unassigned. **Accepted 2026-11-02:** B01 to B13 are now SPEC-008 tasks T103 to T124; the mapping is in [cloud-beta-design.md](../../specs/008-cloud-beta-deployment/cloud-beta-design.md) section 7. B14 to B16 remain future work.

| ID | Priority | Task and acceptance criteria | Dependency | Proof |
|---|---|---|---|---|
| B01 | P0 | Design Firestore Native data model/transaction boundaries for the Store contract; document contention, audit ordering and privacy. | None | Design review and failure-case matrix. |
| B02 | P0 | Implement/configure managed Store; reject hosted Cloud Run startup on file backend. | B01 | Store contract suite on both backends, parallel seat/invite/session tests, restart persistence. |
| B03 | P0 | Provision daily backups and rehearse isolated restore, with RPO/RTO and retention. | B02, staging project | Timestamped restore drill with record parity and access review. |
| B04 | P0 | Complete staging beta Terraform: Cloud Run, Firestore, Registry, identities, WIF, secrets and scaling. | B02, owner staging values | `terraform fmt/validate/plan`, least-privilege review, no secret values in state. |
| B05 | P0 | Build tag-only, no-traffic staging beta release and rollback workflow. | B04 | Failed gate never deploys; healthy staging revision tested before beta traffic; rollback under 5 min. |
| B06 | P0 | Run staging quickstart and SPEC-007 Task 5, including TLS SSE, restart, scale-to-zero and account continuity. | B03-B05 | Scenario-by-scenario evidence and release decision. |
| B07 | P1 | Bundle all required images and tighten CSP. | None | Six lessons render with GitHub blocked; CSP test. |
| B08 | P1 | Stamp tag/commit/digest into Settings and retention policy into Registry. | B05 | UI equals deployed release; active/rollback images preserved. |
| B09 | P1 | Add p95/error/Firestore/SSE/auth metrics, dashboard and actionable alerts. | B04 | Test alert delivery and no-sensitive-telemetry scan. |
| B10 | P1 | Implement budget delivery and tutor cutoff latch/reset policy. | B02, owner budget channel | Threshold simulation, fail-closed test, audited reset. |
| B11 | P1 | Measure Cloud Run/Firestore/Registry/log/network costs and load behavior. | B06 | Cost worksheet and load report with observed billing separated from estimate. |
| B12 | P2 | Improve interrupted SSE UX, retry/idempotency and drain behavior where measured. | B06 | Disconnect test, no duplicate charge, clear retry state. |
| B13 | P2 | Review accessibility and browser error recovery in staged user journeys. | B06 | Keyboard/screen-reader and slow-network acceptance. |
| B14 | P3 | Specify learner progress/assessment storage, privacy and consent before implementation. | Product/constitution decision | Approved data map and acceptance suite. |
| B15 | P3 | Evaluate in-process AI orchestration, retrieval and model gateway only after tutor policy approval. | B10, product decision | Grounding/safety/cost evaluation and feature-off rollback. |
| B16 | P3 | Create a separate production environment and promotion process for GA. | Beta evidence, GA approval | Isolated project/identities/secrets/data, production release rehearsal and approved cutover. |
