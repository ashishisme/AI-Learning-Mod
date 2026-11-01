# Cloud deployment readiness — 2026-11-02

## Decision

The application is suitable for continued local and **single-instance, invite-only beta** validation with a persistent `/app/data` volume. It is **not ready for the managed scale-to-zero cloud target** in SPEC-008. No cloud deployment or container build was performed in this review.

## Verified application work

- Invite activation, learner sessions, OIDC admin sign-in, revocation, expiry, seat caps, tutor disable and daily AI spend limits ran against a local real server and fake identity provider.
- Feedback rejection, AI audit, fail-closed handling, triage, retention and restart persistence ran against a local real server and fake auditor.
- `go vet ./...`, `go test -race ./...`, TypeScript compilation and production web build passed; the full browser suite passed 110 tests with one optional live-Ollama test skipped. Later focused browser tests passed after UI review fixes.
- Dockerfile already copies `public-content` and checks `/api/health`; SPEC-007 Task 2 was stale. The local host has no Docker CLI, so the image itself has not been built or run here.
- The real-server walkthrough in `specs/008-cloud-beta-deployment/quickstart.md` still has partial checks for scenarios 4, 14, 16 and 19. Keep T099 open until those are verified.

## Deployment gaps

| Area | Current state | Needed before the managed cloud target |
| --- | --- | --- |
| Durable state (FR-029, DC-09) | Transactional JSON file; one instance requires a persistent volume | Managed serverless store, daily backups, restore drill, scale-to-zero durability |
| Platform identity (FR-023) | OIDC for admins; deployment credentials still supplied by environment | Managed workload identity and least-privilege access to cloud services |
| Releases (FR-030..FR-032) | No `.github/workflows/deploy.yml` or deployment IaC | Tagged-release gates, version stamping, one-step rollback, artifact cleanup |
| Scale controls (FR-027) | No cloud service configuration | Explicit min/max instances, concurrency and scale-to-zero settings |
| Budget controls (FR-026) | Console shows thresholds; daily AI ceiling works | Hosting-budget alert delivery and automatic tutor shutoff at 100% |
| Assets and CSP (FR-033..FR-034) | CSP still permits `raw.githubusercontent.com` images | Package lesson images with the release and tighten CSP |
| Cost feed (FR-045) | Hosting/data-store costs correctly say “not connected” | Billing adapter when real cloud costs must appear in the console |
| Staging verification | Local server and browser checks only | Container build, TLS/SSE, trusted-proxy address position, health and rollback in staging |

## Go toolchain

The prior Go 1.23.2 pin was outside Go’s support window. Go’s policy covers the two newest major releases; on this date those are 1.27 and 1.26. `go.mod` now requires Go 1.27.3 and the builder uses the official `golang:1.27.3-alpine3.24` image. The local command selected Go 1.27.3; `go mod tidy -diff`, `go mod verify`, `go vet ./...`, `go test -race ./...`, the host build and a static Linux/amd64 server build passed. The full web gates were also rerun after the version change. The container image itself remains unverified because Docker is unavailable on this host. This upgrade does not close the deployment gaps above.

Sources: [Go release policy and current releases](https://go.dev/doc/devel/release), [official Go Docker tags](https://github.com/docker-library/official-images/blob/master/library/golang).
