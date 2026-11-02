# Architecture gap analysis

Status is based on source inspection unless a test result is cited. P0 blocks safe cloud deployment; P1 matters for beta operations; P2 is incremental; P3 is future work. “Potential” means a scenario requiring measurement or external verification.

| ID | Architecture area | Current implementation | Identified gap | Risk | Recommended improvement | Priority | Evidence |
|---|---|---|---|---|---|---|---|
| G01 | Persistence | Local JSON FileStore | No managed store, cross-instance transaction or scale-to-zero durability | Account/audit loss, seat-cap race | Firestore Native adapter; contract/concurrency tests and migration plan | P0 | `cmd/server/main.go:132`; `internal/state/filestore.go:80`; DC-09 |
| G02 | Recovery | File writes are fsynced | No scheduled cloud backup or restore drill | Irrecoverable deletion/corruption | Daily Firestore backups, retention, isolated restore drill | P0 | `deploy/terraform/main.tf`; FR-029 |
| G03 | Release safety | Tagged workflow deploys image | `gcloud run deploy` has no explicit no-traffic or rollback path | Bad release gets traffic | Deploy no traffic, smoke test tag, approval, promote, rollback workflow | P0 | `.github/workflows/deploy.yml:35-62`; FR-030 |
| G04 | Cloud definition | Secret containers and IAM grants only | No Cloud Run, Firestore, Registry, WIF, backup, alerts | No reproducible safe environment | Complete Terraform after state adapter | P0 | `deploy/terraform/main.tf:1-30` |
| G05 | Release identity | Vite build info exists | Workflow does not pass release/build ID into image; image tag is mutable SHA tag | UI and artifact may disagree | Inject tag and immutable digest; assert Settings output | P1 | `web/src/buildInfo.ts`; workflow `:53-62`; FR-031 |
| G06 | Static assets | Lessons packaged; external images permitted | Lesson image dependency on GitHub and broad image CSP | Offline rendering fails; external request | Bundle images; self-origin paths and CSP tests | P1 | `Dockerfile:31-33`; `internal/api/middleware.go:13`; FR-033/034 |
| G07 | Cost guard | Daily tally and displayed threshold status | No hosting billing adapter, alert delivery or automatic persistent cutoff | Owner learns late; tutor could continue | Budget Pub/Sub/monitoring plus independent app policy latch and reset | P1 | `internal/cost/provider.go:30-40`; FR-026 |
| G08 | Scaling | In-process tutor rate limiter, usage flush and feedback worker | Cross-instance behavior unproven | Limits/worker duplication or delayed counts | Audit shared-store invariants; bounded worker lease if needed | P1 | `internal/api/ratelimit.go:25-35`; `cmd/server/main.go:173-216` |
| G09 | Staging proof | Local Go/browser tests | No cloud image build, TLS SSE, restart, restore or rollback evidence | False confidence | Staging acceptance run with timestamps and evidence | P0 | SPEC-007 Task 5; quickstart T099 |
| G10 | Observability | `slog`, health endpoint | No defined latency/error/Firestore/SSE alerts or dashboard | Slow detection | Structured request metrics, p95/error alerts and release dashboard | P1 | `internal/api/health.go`; `deploy/terraform/` |
| G11 | Streaming | Fetch SSE with abort | No resume or reconnect; server drain is 8 seconds | Interrupted lesson answer | Test disconnect/retry UX; show retry, avoid duplicate charges | P2 | `web/src/api.ts:106-186`; `cmd/server/main.go:247-253` |
| G12 | Security | Cookies, CSRF and SSRF guards exist | Cloud IAM/WIF boundary and CSP not fully provisioned | Unauthorized deploy/access | Narrow IAM/WIF subject, secret injection and browser policy | P0 | `internal/api/admin_handlers.go:106`; `internal/api/middleware.go:13`; Terraform |
| G13 | Cost model | SPEC-007 estimates | No live billing data; assumptions may not match usage | Underbudgeting | Measure request, Firestore, logs, egress and AI spend in staging | P1 | `specs/007-cloud-deployment-strategies/spec.md:20-30`; cost provider |
| G14 | Product evolution | Browser-local progress, lesson JSON | Server-side learning intelligence not specified under DC-09 | Premature data collection | Separate product/privacy decision and experiment before persistence | P3 | constitution DC-09; `web/src/store.ts` |

## Spec-kit consistency findings

- **Critical:** SPEC-007 asks for Cloud Run and scale-to-zero, while SPEC-008 plan explicitly defers managed persistence (FR-029) and release controls. Its `tasks.md` has no implementation tasks for those deferred requirements. Keep the cloud rollout blocked until a new dependent task set exists.
- **High:** SPEC-007 cost statement “idle operational cost $0” should be narrowed to compute. Firestore storage, backups, Artifact Registry and logs can have standing charges. Treat the 1M MAU estimate as a model, not verified billing.
- **High:** FR-023 language about no long-lived AI credentials needs clarification for the external feedback auditor; current configuration accepts an API key. Cloud platform access should use managed identity; third-party AI auth may need a separate policy.
- **Medium:** SPEC-008 checklist still records three unresolved clarification markers; the previous user authorized implementation despite it, but the requirements remain a spec-quality issue.
- **Medium:** The current prompt chooses Firestore Native; update plan/tasks before implementation so the design decision is traceable.

No task states or specifications were changed by this analysis. Suggested remediation: revise the SPEC-008 plan, generate new deferred-work tasks, then implement in dependency order.

### Coverage summary for deployment requirements

The SPEC-008 artifact has 59 numbered functional requirements and 102 numbered tasks. This focused review maps the nine explicitly deferred deployment requirements below; it does not claim an exhaustive 59-requirement coverage percentage.

| Requirement | Implementation task in current SPEC-008 tasks? | Finding |
|---|---|---|
| FR-023 managed identity | No | G04/G12 |
| FR-026 alerts and cutoff | No | G07 |
| FR-027 scale limits | No | G04 |
| FR-029 managed state and backups | No | G01/G02 |
| FR-030 release and rollback | No | G03 |
| FR-031 version/build stamp | No | G05 |
| FR-032 artifact cleanup | No | G05 |
| FR-033 packaged images | No | G06 |
| FR-034 CSP | No | G06 |

Verified deficiencies: G01–G07, G09–G10 and G12–G13 are directly supported by source/spec inspection. G08 and G11 are potential multi-instance or interruption risks that need targeted testing; G14 is a future product decision. Critical spec-kit issue count: one cross-artifact coverage conflict with constitution DC-09; high issues: two; ambiguity count within the focused set: one (FR-023 third-party AI key scope); duplication count: zero. SPEC-007 Tasks 3–5 remain open; no unmapped SPEC-007 task was found.
