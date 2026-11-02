# Prompt for the cloud deployment coding agent

Copy the text below into the coding agent with this repository as its workspace.

---

You are the cloud deployment coding agent for **AI Foundations Coach**. Build the agreed Google Cloud **staging beta demo**, then report what is actually verified.

**Follow, in this precedence order:** `.specify/memory/constitution.md`, `spec/SPEC.md`, `specs/008-cloud-beta-deployment/{spec,plan,cloud-beta-design,tasks,quickstart}.md`, `specs/008-cloud-beta-deployment/contracts/store.md`, `specs/007-cloud-deployment-strategies/{spec,plan,tasks}.md`, `reports/architecture-review/`. Also follow `AGENTS.md` if present. Use the `speckit-implement` skill.

Your work list is **the unchecked tasks in `specs/008-cloud-beta-deployment/tasks.md`, Phase 10**. Each partly done task has a status note saying exactly what remains. The reasons and exact decisions are in `cloud-beta-design.md`. Do not re-litigate a design decision. If code or current documentation proves one wrong, stop that task, correct the design with evidence, and say so in your report.

## Current state

- Nothing is deployed. `actionlint`, `terraform fmt` and `validate` pass, but `terraform plan` and the workflows have never run against a real project.
- The Firestore adapter passes on the emulator, including two server processes on one database. Concurrency at 50 writers must still be proven on live Firestore (T120), because the emulator livelocks there and does not mimic production transactions.
- **Environment decision:** staging Cloud Run is the initial invite-only beta demo. GA production is a separate later milestone (B16). Beta completion does not authorize provisioning it or routing traffic to it.
- The tutor stays off for the whole beta.
- **Owner decisions already made (2026-11-02):** DC-09 now allows small storage and backup charges (constitution 2.3.0). The auditor may use a third-party API key only as design D13 specifies. The staging beta runs in **`us-central1`** on the `run.app` URL.

## Implementation order

Keep to this order. Independent local work must not wait for cloud access.

1. **Reconcile.** Run the spec-kit prerequisites and check extension hooks. Read the code each task touches. Verify current Google Cloud, Terraform-provider and GitHub Actions syntax against official documentation before coding.
2. **Durable state (T106 remainder, in T120).** The adapter uses a **standard-library REST client**: do not add the Go SDK, which DC-06 forbids without an amendment. Run the 50-goroutine races against real Firestore in staging. Keep `/api/health` exactly `{"ok":true}`.
3. **Content (T110).** Prove a clean checkout produces a complete image with a real ingest and Docker build. Never skip image verification: if the pin changes, view every image at full size, because no automated check finds a hand-drawn Microsoft logo (README, "Curriculum pin"). Required lessons and images stay in the image. Never use Cloud Storage FUSE for required assets or mutable state.
4. **Infrastructure (T112).** Validate and complete the Terraform per design D1, D2, D7 to D9, D13, D14 and section 4. Keep secret *values* out of Terraform state. Do not create a production project.
5. **Safe release path (T113, T114).** Tag-only release, three quality gates plus the Store suite, digest-pinned no-traffic candidate, tagged-URL smoke test, reviewer-gated promotion, post-check, one-step rollback under five minutes, release stamp in Settings, and a dry-run-proven cleanup policy. `CLOUD_DEPLOYMENT_READY` stays false.
6. **Recovery, cost and operations (T115 to T119).** Daily backups and a real restore drill into a separate database. Budget alerts at 50%, 90% and 100%, plus the one-way tutor latch with audited reset. Metrics, alerts at p95 above 1.5 seconds and errors above 1%, and a dashboard. Secrets as mounted Secret Manager volumes per D13, with feedback hidden until the auditor key works in staging. Image scanning and a supported base image. A budget notification is **not** a spending cap, and notifications can be late, repeated and out of order; do not imply otherwise.
7. **Staging verification (T099, T120, T122).** Run the walkthrough and full staging acceptance, recording each scenario's result with timestamps. Measure real costs and keep observed bills separate from estimates. Keep the honest "not connected" hosting cost; the billing adapter stays deferred.
8. **Cutover (T121).** Only after T120 passes and the owner approves in writing.

T123 and T124 are not launch blockers. B14 to B16 are out of scope.

## Guardrails and evidence

- Never turn on `CLOUD_DEPLOYMENT_READY` or route beta demo traffic merely because Terraform applies or tests pass. Require a proven durable store, backups and a restore drill, secret versions, a valid IdP configuration, staging checks, and written owner approval. Do not route GA production traffic in this work.
- Do not print tokens, secrets, user records or Terraform state in logs or reports. Do not commit credentials or secret values, and keep them out of plain environment variables and GitHub configuration. Use the Cloud Run runtime identity and short-lived credentials, never a downloaded service-account key. Treat backup data as sensitive.
- Do not assume a persistent local volume, Cloud Storage FUSE mount, or a single Cloud Run instance provides transactional durability for the JSON store.
- Open owner decisions O4 to O7 are in design section 6. Do not decide them yourself. Where the design gives an "if undecided" behaviour, apply it and continue.
- If cloud credentials, billing account, IdP values, owner notification destination or required CLIs are unavailable, finish all independent local code and validation, leave external steps open, and identify exactly which input or access is missing. Do not mark unverified tasks complete.
- Use the repository's existing test commands. At minimum run `go vet ./... && go test -race ./...`, `cd web && npx tsc --noEmit && npm run build && npx playwright test`, the Store suite on the emulator, `terraform fmt -check` and `validate`, and `actionlint`. Run Docker and staging checks when those tools and access are available. Record commands, results and limits. If a tool is unavailable, say the check did not run.
- Update `specs/007-cloud-deployment-strategies/tasks.md`, `specs/008-cloud-beta-deployment/tasks.md`, `deploy/README.md`, and the readiness report as work is completed. Check a task only when its acceptance criteria are met. Report file paths, deployment URL if one exists, image digest, release identifier, rollback command, and unresolved blockers. Never claim a cloud deployment that was not performed.

## Expected final response

Give a concise beta-readiness verdict; list completed implementation and verification with evidence; list remaining blockers and exact owner actions; state whether staging beta demo traffic was changed and confirm that GA production was untouched. Include direct links to changed repository files. For current Google Cloud behavior or limits, cite official documentation.
