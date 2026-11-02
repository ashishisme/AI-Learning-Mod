# Cloud deployment readiness — 2026-11-02

## Decision

The application is suitable for continued local validation and single-instance self-hosting on a persistent `/app/data` volume. It is **not ready for the agreed target: an invite-only beta demo on staging Cloud Run** with durable managed state. No cloud deployment or container build was performed in this review.

## Agreed direction (realigned 2026-11-02)

The owner accepted the `reports/architecture-review/` recommendations. Staging is the beta demo and GA production is a later milestone. The buildable design is [`cloud-beta-design.md`](../specs/008-cloud-beta-deployment/cloud-beta-design.md), and the work is `specs/008-cloud-beta-deployment/tasks.md` Phase 10. 

**Implementation update (2026-11-02):** application work for T099, T104, T105, T107 and T111 is complete, and T106, T108 to T110, T112 to T114 and T116 to T119 are partly done. See `tasks.md` Phase 10 for each task's state. Nothing is deployed. Later the same day, with tools approved by the owner: the Store contract, privacy scan and two server processes passed on the Firestore emulator; `terraform validate` and `actionlint` passed. Still not run: Docker image build, `terraform plan`, a real ingest, and anything on Google Cloud. A full-size image review found a Microsoft logo in two sketchnotes (NFR-LIC-02); they are now left out of the release.

Latest local gates, against a fresh server build: `go vet`, `go test -race`, `tsc` and the production build passed; the browser suite gave 116 passed and 1 skipped (the optional live-Ollama test).

That work also found gaps the review did not cover. The most serious: a clean CI checkout lacks `index.json` and the base lessons, the Firestore Go SDK needs a DC-06 amendment (the design avoids it with a REST client), and DC-09's "costs nothing when idle" conflicted with billed backups.

**Owner decisions, 2026-11-02:** DC-09 now allows small storage and backup charges (constitution 2.3.0). The feedback auditor may use a third-party API key retrieved from Secret Manager at runtime by the service's own identity, and feedback stays hidden until that works in staging. The staging beta runs in `us-central1`. Hosted cutover still needs written owner approval.

## 2026-11-02 implementation update

Added a tag-triggered GitHub Actions workflow with all three quality gates,
multi-architecture image build and Workload Identity Federation deployment steps.
Its deploy job remains gated by `CLOUD_DEPLOYMENT_READY`. Added a Terraform
starter module for Secret Manager secret containers and runtime IAM grants. A
Cloud Run service has deliberately not been defined while the application still
requires a local JSON `STATE_FILE`; enabling scale-to-zero now would lose state.
See `deploy/README.md` for the remaining release prerequisites. Docker,
Terraform, gcloud and gh are unavailable on this host, so no container build,
Terraform plan or staging deployment was run.

## Verified application work

- Invite activation, learner sessions, OIDC admin sign-in, revocation, expiry, seat caps, tutor disable and daily AI spend limits ran against a local real server and fake identity provider.
- Feedback rejection, AI audit, fail-closed handling, triage, retention and restart persistence ran against a local real server and fake auditor.
- `go vet ./...`, `go test -race ./...`, TypeScript compilation and production web build passed; the full browser suite passed 110 tests with one optional live-Ollama test skipped. Later focused browser tests passed after UI review fixes.
- Dockerfile already copies `public-content` and checks `/api/health`; SPEC-007 Task 2 was stale. The local host has no Docker CLI, so the image itself has not been built or run here.
- The real-server walkthrough in `specs/008-cloud-beta-deployment/quickstart.md` still has partial checks for scenarios 4, 14, 16 and 19. Keep T099 open until those are verified.

## Deployment gaps

| Area | Current state | Needed before the managed cloud target |
| --- | --- | --- |
| Durable state (FR-029, DC-09) | Transactional JSON file; one instance requires a persistent volume | Firestore Native adapter, daily backups, restore drill, scale-to-zero durability (T104 to T109, T115) |
| Platform identity (FR-023) | OIDC for admins; deployment credentials still supplied by environment | Runtime and deploy identities, WIF limited to the repository, release tags and staging environments; secrets as mounted Secret Manager volumes (T112, T118) |
| Releases (FR-030..FR-032) | Draft workflow deploys straight to traffic with a mutable tag | No-traffic digest release, smoke test, approval, stamping, one-step rollback, artifact cleanup (T113, T114) |
| Scale controls (FR-027) | No cloud service configuration | `min=0`, `max=2`, instance-based billing so background work runs (T109, T112) |
| Budget controls (FR-026) | Console shows thresholds; daily AI ceiling works | Alert delivery to the owner and a one-way tutor latch; alerts do not cap spending (T116) |
| Assets and CSP (FR-033..FR-034) | CI does not package base lessons; CSP permits `raw.githubusercontent.com` images | Pinned ingest at release, bundled images, tightened CSP (T110, T111) |
| Cost feed (FR-045) | Hosting/data-store costs correctly say “not connected” | Stays deferred; FR-045 allows it. Measure real costs in staging (T122) |
| Staging verification | Local server and browser checks only | Container build, TLS/SSE, trusted-proxy address position, health, restore and rollback in staging (T120) |

## Go toolchain

The prior Go 1.23.2 pin was outside Go’s support window. Go’s policy covers the two newest major releases; on this date those are 1.27 and 1.26. `go.mod` now requires Go 1.27.3 and the builder uses the official `golang:1.27.3-alpine3.24` image. The local command selected Go 1.27.3; `go mod tidy -diff`, `go mod verify`, `go vet ./...`, `go test -race ./...`, the host build and a static Linux/amd64 server build passed. The full web gates were also rerun after the version change. The container image itself remains unverified because Docker is unavailable on this host. This upgrade does not close the deployment gaps above.

Sources: [Go release policy and current releases](https://go.dev/doc/devel/release), [official Go Docker tags](https://github.com/docker-library/official-images/blob/master/library/golang).
