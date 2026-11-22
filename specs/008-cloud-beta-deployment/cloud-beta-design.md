# Cloud beta design

**Feature**: SPEC-008 and SPEC-007 | **Date**: 2026-11-02 | **Status**: Application code built and tested locally; cloud resources written but unverified; nothing deployed. Task state is in [tasks.md](./tasks.md).

This turns the agreed recommendations in [`reports/architecture-review/`](../../reports/architecture-review/) into one buildable design for the **staging Cloud Run beta demo**. The constitution and `spec/SPEC.md` take precedence over this file. A GA production environment is a later milestone (B16) and is not designed here.

Work is tracked in [`tasks.md`, Phase 10](./tasks.md). Section 6 lists the decisions only the owner can make.

## 1. Decisions

| # | Area | Decision | Why |
|---|---|---|---|
| D1 | Shape | One Go and SPA image on Cloud Run v2. No CDN, external load balancer or Cloud Armor by default. | Cost and security reviews. Reassess only on measured latency, abuse or custom-domain need. |
| D2 | State | Firestore Standard edition, Native mode, `(default)` database, in `asia-south1` (Mumbai) with the service (confirmed 2026-11-03: Firestore `(default)` is in `asia-south1`, Native mode). | Target architecture and owner decision O3. [`us-central1` is a supported regional location with a 99.99% uptime SLA; the location cannot be changed after creation](https://docs.cloud.google.com/firestore/native/docs/locations). |
| D3 | Firestore client | Hand-written REST client using `net/http` and `encoding/json`. **Not** the Go SDK. | DC-06 and AC-29 require an amendment for any new module. REST keeps the module graph unchanged. |
| D4 | Credentials | Runtime tokens come from the metadata server. Never a service-account key. Only the Firestore client and token fetch use these fixed hosts. | FR-023. The SSRF guard must keep blocking the metadata address for any configurable URL. |
| D5 | Backend selection | `STATE_BACKEND=file\|firestore`, default `file`. If `K_SERVICE` is set (Cloud Run) and the backend is not `firestore`, startup fails. | DC-09 still allows the file store for development, tests and self-hosting. A Cloud Run revision can never run on it. |
| D6 | Readiness | `/api/health` stays exactly `{"ok":true}` (NFR-REL-02). The server performs one store read before it starts listening and exits on failure, so a passing startup probe means the store was reachable at boot. | Meets the "startup success means it can serve" recommendation without a new endpoint. |
| D7 | Scaling | `min=0`, `max=2`, concurrency 80, 1 vCPU, 512 MiB, request timeout 300 s. These are starting values, to be revised from T122 measurements. | FR-027. `max=2` deliberately exercises cross-instance behaviour during the beta. |
| D8 | CPU billing | **Instance-based billing** with `min=0`. | Under request-based billing, code outside a request [gets no CPU](https://docs.cloud.google.com/run/docs/configuring/billing-settings). That would stall the feedback auditor worker, the 30-second usage flush and the hourly sweep. An idle instance stops within 15 minutes and the service still scales to zero. T122 measures the cost. |
| D9 | Idle retention | A daily Cloud Scheduler `GET /api/health` wakes the service. The sweep already runs at startup (`cmd/server/main.go`). | At zero instances no sweep runs, so FR-039 and FR-053 deletions would stall on a quiet service. No new endpoint. Firestore TTL was rejected: it would add a second deletion path, and [TTL policies are not in backups](https://docs.cloud.google.com/firestore/native/docs/backups). |
| D10 | Shutdown | Drain plus final flush must finish inside Cloud Run's [10-second SIGTERM window](https://docs.cloud.google.com/run/docs/container-contract). Today's 8-second drain leaves about 2 seconds. Set drain to 6 s and bound the flush to 3 s. | Otherwise usage counts can be lost on shutdown. |
| D11 | Public URL | Use the `run.app` URL for `PUBLIC_BASE_URL` and the OIDC redirect. A custom domain is optional and not needed for the beta. | *(Region is now `asia-south1`, O3 2026-11-03: recheck Cloud Run domain-mapping support there before planning a custom domain; the note below was written for `us-central1`.)* `us-central1` does offer domain mapping, but [Google says it is preview and not production-ready](https://docs.cloud.google.com/run/docs/mapping-custom-domains). The recommended alternative is a load balancer, which D1 avoids. |
| D12 | Tutor | Off for the whole beta. Before it can ever be enabled, the T116 latch must pass its tests. | Cost review and roadmap Phase 4. |
| D14 | Platform logs | Exclude Cloud Run request logs, and keep other logs 30 days. Cloud Run metrics are unaffected, so latency and error alerts still work. | Request logs can hold client addresses, user agents and full URLs, including invite tokens at `GET /invite/<token>` (SC-012, FR-038). Confirm on a real service in T120. |
| D13 | Secrets | Mount each secret from Secret Manager as a Cloud Run volume and read it from a file, named by `SESSION_SECRET_FILE`, `OIDC_CLIENT_SECRET_FILE` and `FEEDBACK_AUDITOR_API_KEY_FILE`. On Cloud Run, startup fails if a plain `SESSION_SECRET`, `OIDC_CLIENT_SECRET` or `FEEDBACK_AUDITOR_API_KEY` is set. Read the auditor key on each audit, so rotation needs no deploy. The session and OIDC secrets are read once at startup. | Owner decision O2. [A mounted secret is fetched from Secret Manager when read, while a secret environment variable is fixed at instance start](https://docs.cloud.google.com/run/docs/configuring/services/secrets). No new client code or module. O2 names the auditor key; its "no plain environment variables" rule is applied to all three so there is one mechanism. |

## 2. Firestore data model

| Collection | Document ID | Notes |
|---|---|---|
| `invites` | `tokenHash` | Activation is the hot race, so a transactional get by ID locks one document. `GetInviteByID` queries the `id` field. |
| `accounts` | `betaId` | |
| `sessions` | `tokenHash` | `DeleteSessionsFor` and `CountSessionsFor` query `betaId`. |
| `audit` | existing `<UTC ts>-<seq>` ID | `meta/auditSeq` is incremented in the same transaction. Order and page on a numeric `seq` field, because the ID's one-second timestamp comes from each instance's clock. |
| `counters` | escaped key, with a plain `key` field | `AddCounter` is a transactional read and write because it returns the new value. `ListCounters(prefix)` is a range query on `key`. `DeleteCountersWhere` lists, filters in Go, then deletes. |
| `attempts` | `id:<betaId>` or `ip:<HMAC of address>` | See N6. |
| `feedback` | `id` | `claimedUntil` in the record stops two instances reviewing one item. |

Every record is stored as JSON in one unindexed `data` field, plus only the fields queries need (`id`, `betaId`, `key`, `seq`, `value`). IDs from user input, such as a typed Beta ID, are mapped to a safe form, so they cannot produce an invalid or different document path.

Do **not** store the state as one JSON document. A document is [limited to 1 MiB](https://docs.cloud.google.com/firestore/quotas) and every write would contend.

## 3. Transaction rules

These extend [`contracts/store.md`](./contracts/store.md). They apply to both backends.

1. **Functions may run more than once.** Firestore [re-runs a transaction on conflict](https://docs.cloud.google.com/firestore/native/docs/manage-data/transactions). Every `Do` and `DoCounters` closure must reset what it captures and have no side effects outside `Tx`. `CreateInvites` already resets `links`; `Sweep` does not reset its `res` counts. The test harness runs each closure twice on the file store, so this is proven without a cloud.
2. **Read errors poison the transaction.** `Tx` methods return no error. On a read failure the adapter records the first error and returns zero values. `Do` then returns that error, in preference to whatever `fn` returned, and discards all writes. This matches the existing `fileTx.violation` pattern and prevents an outage from looking like "invite not found".
3. **Writes are buffered until commit.** Firestore requires reads before writes. The adapter keeps writes in memory, overlays them on later reads to honour the contract's "sees its own writes", and sends them at commit. Reads use `batchGet`, which reports a missing document explicitly. Google states the [emulator does not mimic production transaction behaviour](https://docs.cloud.google.com/firestore/native/docs/emulator), so only T120 can prove this on live Firestore.
4. **No batching on Firestore.** `DoCounters` behaves like `Do` and `Flush` is a no-op. In-memory batching would hide the spend reservation from other instances and break FR-025. `usage.Recorder` already batches per instance.
5. **Bounded failure.** Retry `ABORTED` a few times with backoff under a short deadline, then return an error so the request fails closed.
6. **Short transactions.** `Sweep` currently scans and rewrites everything in one `Do`. On Firestore that holds locks across up to about 1,000 accounts, 5,000 sessions and 20,000 feedback items, against [270-second and 10 MiB limits](https://docs.cloud.google.com/firestore/native/docs/manage-data/transactions). Split it: find candidates in a `View`, then delete in small transactions that re-check each record. Hooks change accordingly.
7. **Seat cap.** `seatsUsed` scans accounts and invites inside the transaction. Keep it, because pending invites expire by time and a stored count would drift. First touch a guard counter (`lock:seats`), so concurrent batches queue on one document instead of aborting each other. T106 must prove "50 goroutines, 10 seats, exactly 10" on the emulator.
8. **Best-effort writes need a policy.** Callers using `_ = store.Do(...)` could not fail before. `loginFailed` (`lockout.go:73`) would now lose a lockout attempt silently during an outage. T109 logs each such failure and makes lockout fail closed.

**Per-request cost.** Each signed-in request reads two documents (`sessions`, `accounts`). The plan's "under 1 ms" session check no longer holds on Firestore. Add no cache until T122 measures a need, and any cache must keep SC-006's 5-minute limit. The [free tier's 50,000 reads a day](https://docs.cloud.google.com/firestore/quotas) covers about 25,000 signed-in requests; confirm that it applies to the `(default)` database.

## 4. Release flow

```text
tag v* ─▶ verify and store-emulator ─▶ build ─▶ candidate and smoke ─▶ promote and post-check
```

| Job | GitHub environment | What it does |
|---|---|---|
| `verify` | none | Go tests, production build, Chromium tests, Store contract on the emulator. |
| `build` | `staging` | Pinned ingest (N3), multi-arch build with `BUILD_*` and `RELEASE_TAG` args, push, capture the digest, scan. |
| `candidate` | `staging` | `gcloud run deploy --image <repo>@sha256:... --no-traffic --tag rc-<tag>`, then smoke |
| smoke (`deploy/scripts/smoke.sh`) | | Exact health body, `/api/runtime` release matches, CSP header allows no other origin, protected API returns 401, SPA loads, a bundled image arrives as an image. Run on the tagged URL, then on the public URL. |
| `promote` | `staging-promote` (required reviewer) | Record the current revision, then `update-traffic --to-revisions <new>=100`. |
| `post-check` | `staging` | Repeat the smoke on the public URL. On failure, roll back automatically. |

- **Rollback:** a separate `rollback.yml`, dispatched on a release tag with a revision input, running `update-traffic --to-revisions <rev>=100`. Target: under 5 minutes. Cloud Run [does not re-run health checks on rollback](https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration), so it repeats the post-check. Each release's Firestore fields must remain readable by the previous release, or rollback is unsafe.
- **The tagged URL has limits.** `PUBLIC_BASE_URL` still names the public URL, so OIDC redirects and invite links leave the candidate revision. Full sign-in is therefore proven in T120, not in `smoke`.
- **WIF trust:** `assertion.repository == "ashishisme/AI-Learning-Mod"`, `assertion.ref` starts with `refs/tags/v`, and `assertion.environment` is `staging` or `staging-promote`. Add a `v*` deployment tag rule to both environments. The reviewer sits on `staging-promote` only, so a rollback never waits for approval.
- **Identities:** runtime gets `roles/datastore.user` and accessor on named secrets only. Deploy gets `roles/run.developer` on the service, `roles/artifactregistry.writer` on the repository, and `roles/iam.serviceAccountUser` on the runtime identity only. Neither can restore backups. Verify these role choices during T112.
- **Terraform and gcloud ownership:** Terraform owns the service, and `gcloud` owns the image and traffic. Use `ignore_changes` on both and remove the `image` variable. The first revision needs a bootstrap image, because the [docs do not cover `--no-traffic` on a first deploy](https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration). Test it.
- **Release stamp:** `.git` is dockerignored, so `RELEASE_TAG`, `BUILD_NUMBER`, `BUILD_COMMIT` and `BUILD_DATE` are build arguments. Settings shows them and `/api/runtime` reports the tag. A digest is only known after the build and Terraform owns the environment, so a digest variable would be wiped on every apply. Deploying by digest already makes the release immutable, so the digest goes in the release summary.
- **Cleanup policy:** keep recent `v*` tags and use dry-run first. Multi-arch images have untagged child manifests, so prove the policy cannot delete those of the active or rollback image. Cloud Run [only needs `linux/amd64` in the manifest](https://docs.cloud.google.com/run/docs/container-contract), so arm64 adds build time and this risk with no runtime benefit here. It stays only because SPEC-007 asks for it.

## 5. Findings the review did not cover

| ID | Finding | Evidence | Resolution |
|---|---|---|---|
| N1 | DC-09 required a store that "costs nothing when idle", but [each backup is billed for storage](https://docs.cloud.google.com/firestore/native/docs/backups) and FR-029 requires backups. The review narrowed this claim in SPEC-007 only. | Constitution III; `spec/SPEC.md` DC-09 | **Resolved**: O1, constitution 2.3.0 |
| N2 | The Firestore Go SDK is not on the dependency allowlist. | DC-06, AC-29, `go.mod` | D3 |
| N3 | **A clean CI checkout has no `index.json` and no base lessons**: they are gitignored and the workflow never runs ingest. `cmd/ingest` also follows upstream `main`, so a rerun is not reproducible as NFR-LIC-03 requires. | `.gitignore:8-12`; `internal/ingest/ingest.go:106`; `.github/workflows/deploy.yml` | T110 |
| N4 | The Store contract assumes transactions cannot fail or re-run. | `internal/state/store.go`; `Sweep` in `service_expiry.go` | Section 3 |
| N5 | Background work would stall on Cloud Run with the default billing mode. | `cmd/server/main.go:174-216` | D8, D9, D10 |
| N6 | Lockout keys hold the raw client address. Plan and `store.go` allow an address only in the short lockout window, but a daily backup would keep it for the whole retention period. | `internal/auth/lockout.go:26` | T108 |
| N8 | Request logs can hold client addresses and invite tokens in URLs. | `GET /invite/<token>`; Cloud Logging `LogEntry` fields | D14; confirm in T120 |
| N9 | **Two upstream sketchnotes contain a hand-drawn Microsoft logo**, which NFR-LIC-02 forbids. It is too small to see in a thumbnail, and a colour search misses it. | Symbolic AI and NLP sketchnotes | Left out by content hash; the build refuses them; a new pin needs a human review (README, "Curriculum pin") |
| N7 | AC-30 is marked PASS, but its check matches 13 tracked files (12 adaptive lessons and `.env.example`). The runtime base `alpine:3.20` [reached end of support on 2026-04-01](https://endoflife.date/alpine-linux). | `spec/ACCEPTANCE.md:34`; `Dockerfile` | T123, T119 |

Budget notifications [may repeat, arrive out of order, and arrive hours late](https://docs.cloud.google.com/billing/docs/how-to/budgets-programmatic-notifications). The T116 latch is therefore one-way and idempotent, and the existing spend reservation remains the real ceiling.

## 6. Owner decisions

**Decided 2026-11-02**

| ID | Decision | Outcome |
|---|---|---|
| O1 | DC-09's idle-cost rule | **Approved.** Now reads "no idle compute or provisioned capacity; small storage and backup charges are allowed". Applied as constitution 2.3.0 and in `spec/SPEC.md`. Hosted cutover still needs written owner approval (T121). |
| O2 | Third-party auditor API key under FR-023 | **Approved**, retrieved from Secret Manager at runtime by the service's own identity with `roles/secretmanager.secretAccessor`. Never hardcoded, in a plain environment variable or in GitHub configuration. See D13. Feedback stays hidden until this works in staging. |
| O3 | Region | **`asia-south1` (Mumbai)** for the staging beta, as deployed. The owner confirmed this on 2026-11-03 (T132), replacing the earlier `us-central1` (Iowa) plan. A later GA environment may choose separately. |

**Accepted consequences of O3.** The product runs on IST and the plan cites DPDP, which suggests learners in India:

- Every request crosses between India and Iowa, on top of the server time that the p95 alert measures. T122 must also measure load times from India.
- Accounts, feedback text and backups are held in the US. The plan's existing action for counsel to confirm DPDP implications now covers this too, and should finish before the beta widens.
- The Firestore location is permanent, so a later move means migrating data to a new database.

**Still open**

| ID | Decision | Recommendation | If undecided |
|---|---|---|---|
| O4 | Backup retention and recovery targets. | Daily schedule, 14-day retention, RPO 24 hours, RTO 4 hours. Deleted records survive in backups until they age out, so this extends the effective FR-053 window by 14 days. | No restore drill sign-off. |
| O5 | Has a real beta run on a persistent volume? | If not, start empty and build no migration tool. If so, add a one-off import before T120. | Assume none, and state that assumption in the T120 record. |
| O6 | AC-30 wording. | Exempt `*.junior.json` and `*.plain-english.json`, which are the repo's own authored adaptations. | T123 stays open. Does not block the beta. |
| O7 | External inputs. | Staging project, billing account, IAM/WIF admin, IdP values, secret versions, budget amount, alert destination, and beta cutover approval. | External steps stay open. |

Hosting cost in the console stays "not connected". FR-045 permits this, so the billing adapter remains deferred.

## 7. Backlog traceability

| Backlog | Tasks | Backlog | Tasks |
|---|---|---|---|
| B01, B02 | T104-T109 | B09 | T117 |
| B03 | T115 | B10 | T116 |
| B04 | T112 | B11 | T122 |
| B05 | T113 | B12, B13 | T124 |
| B06 | T120, T121 | B14, B15 | Out of scope; new spec needed |
| B07 | T110, T111 | B16 | Out of scope; GA milestone |
| B08 | T114 | | |
