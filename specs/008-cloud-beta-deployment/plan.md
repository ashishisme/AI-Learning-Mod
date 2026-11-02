# Implementation Plan: Invite-Only Access (G7), Spend Ceiling (G6) and Admin Console

**Branch**: `008-cloud-beta-deployment` (working branch `cloud-beta`) | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-cloud-beta-deployment/spec.md`

## Summary

This plan covers the two launch blockers that remain after hosted-mode hardening (G1–G4 are done), plus the admin console the owner asked for:

- **G7**: the app has no users. Add invite-only accounts, sessions, and an admin area (FR-001..FR-017, FR-035..FR-039).
- **G6**: AI spend is unbounded. Disable the tutor for beta users (FR-024) and enforce a shared US $1.00/day ceiling whenever it is enabled (FR-025).
- **Admin console** (FR-040..FR-046): one console with Overview, Users and Invites, Usage, Costs, Feedback and Audit tabs, to monitor usage, see who is accessing the app and what it costs.
- **Feedback** (FR-047..FR-059): learners send feedback from inside the app; a deterministic rule check and then an AI auditor screen every message before admins can read, triage and export it in the console.

Approach, in one paragraph: a new `internal/auth` package holds all domain logic (invites, accounts, passwords, sessions, lockouts, audit, IST calendar-month maths, OIDC verification) behind a transactional `Store` interface; a transactional JSON file store implements it for development, tests and the single-instance beta. A new `internal/spend` package keeps the daily tally in the same store and reserves worst-case cost before each AI call. `internal/usage` counts activity in memory and flushes aggregate counts to the store every 30 seconds; `internal/feedback` runs the deterministic personal-details check, stores feedback as "waiting", and drives the AI auditor that releases or withholds it; `internal/cost` reads costs through a replaceable provider (AI spend now, cloud billing later). `internal/api` adds the HTTP handlers and a session gate that wraps every `/api/*` route except a short allowlist. The React app gains a sign-in screen, an invite-activation page, an expiry banner, and an admin dashboard. Everything is standard library only: no router, ORM, or new module dependency.

**Cloud beta scope (added 2026-11-02)**: FR-023, FR-026, FR-027, FR-029..FR-034 were deferred from the sections below and are now planned in [cloud-beta-design.md](./cloud-beta-design.md), with tasks in [tasks.md Phase 10](./tasks.md). The owner's environment decision is that **the staging Cloud Run environment is the invite-only beta demo**; a separate production environment is a GA milestone. Until the Firestore adapter and its restore drill are proven, no Cloud Run deployment runs: the file store stays limited to development, tests and single-instance self-hosting on a persistent volume. The hosting/data-store billing adapter stays deferred (FR-045 requires only the interface and the honest "not connected" state).

## Technical Context

**Language/Version**: Go 1.27.3 (backend; upgraded 2026-11-02), TypeScript 5 + React 18 + Vite (frontend)

**Primary Dependencies**: Go standard library only (`net/http`, `crypto/*`, `encoding/json`). Frontend: existing React, React Router, Zustand. **No new modules.** PBKDF2-HMAC-SHA256 remains implemented in-package and pinned by RFC 7914 test vectors; the toolchain upgrade does not change stored password hashes.

**Storage**: `auth.Store` interface (transactional). Implementation now: JSON file, in-memory working copy, mutex-serialised transactions, atomic write (temp file + rename). Managed adapter for Cloud Run: Firestore Standard edition in Native mode over a standard-library REST client, behind the same interface (DC-09 amended, DC-06; see cloud-beta-design.md).

**Testing**: `go test ./...` (unit, concurrency with `-race`, end-to-end router tests with a fake OIDC provider on `httptest`), Playwright for UI flows, `tsc --noEmit && vite build`.

**Target Platform**: Single Linux container (DC-08), non-root UID 10001. Beta demo: Cloud Run v2 in the staging project with no CDN or external load balancer by default. Self-hosted file-store runs need a state directory writable by that user.

**Project Type**: Web application (Go API + React SPA served by the same binary).

**Performance Goals**: Sign-in p95 under 500 ms on one shared vCPU; 40 simultaneous sign-ins complete inside 2 minutes (SC-004). Session check adds under 1 ms per request on the file store (in-memory lookup). On Firestore it is two document reads per request; its latency is measured in T122 against the p95 1.5-second alert.

**Constraints**: No personal data about learners (FR-035); no password or token in logs (FR-038); passwords never retrievable (FR-004); seat cap exact under concurrency (SC-005); revoked and expired accounts refused on the next request (SC-006); self-hosting without auth keeps working.

**Scale/Scope**: 1,000 seats; at most ~5,000 live sessions; 180 days of usage counters (~ 60 keys per day) and feedback (assume ≤ 20,000 items); a state file well under 10 MB. Counter-only changes are flushed in batches so they do not rewrite the file per request.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

Constitution 2.3.0 (DC-09 amended and ratified three times: 2026-11-01 for 2.1.0 access records and counters and 2.2.0 feedback records; 2026-11-02 for 2.3.0 hosted store cost wording).

| Rule | Status | Note |
| --- | --- | --- |
| I. Master spec ground truth | Pass | Amendment applied to `spec/SPEC.md` §8 alongside the constitution, as Governance requires. New behaviour is covered by SPEC-008; baseline FR/AC unchanged. |
| II. Grounded & citable tutor | Pass | Tutor behaviour unchanged. It is gated (disabled / resting) before the model call, never after. |
| III. DC-02 stdlib router only | Pass | Go 1.22 method+path patterns on `http.ServeMux`. |
| III. DC-01 frontend stack | Pass | React + TS + Vite + Tailwind + Zustand. |
| III. DC-09 minimal state (2.3.0) | Pass for accounts, sessions, audit, spend tally, usage counts, last-seen | Access-control records and operational counters only; no personal data; store interface; no ORM; file store only for dev/tests/single instance, and refused on Cloud Run (T107). Firestore meets the 2.3.0 hosted store wording: no idle compute or provisioned capacity, with small storage and backup charges allowed. |
| III. DC-06 dependency allowlist | Pass by design | The Firestore adapter uses a standard-library REST client, so no module is added and no amendment is needed. T106 re-checks `go mod graph`. |
| III. DC-09 for feedback | Pass (amendment 2 ratified 2026-11-01) | Feedback holds learner-written text with the ratified narrowing: no identity, ≤500 chars, 180-day deletion. The text is rejected by a rule check if it contains personal details and then audited before admins can read it, which is stricter than the amendment's "scrubbed" wording; the review-state fields are processing metadata, like `status`. |
| III. DC-10 zero Python | Pass | Python is used only to cross-check a test vector at authoring time and is not committed. |
| III. DC-08 single container | Pass | One image. Needs a writable state directory only with the file store. |
| IV. Quality floor (DC-11) | Pass | New screens: labelled inputs, ≥44px targets, ≥4.5:1 contrast in both themes. |
| V. Git discipline | Pass | Explicit paths only; conventional commit prefixes. |
| Quality gates | Pass | `go test ./...`, Playwright, `npm run build` must all pass before completion. |

## Project Structure

### Documentation (this feature)

```text
specs/008-cloud-beta-deployment/
├── spec.md
├── plan.md                  # This file
├── research.md              # Phase 0
├── data-model.md            # Phase 1
├── quickstart.md            # Phase 1
├── cloud-beta-design.md     # Staging beta design: Firestore, Cloud Run, release, owner decisions
├── contracts/
│   ├── http-api.md          # Phase 1: learner, admin, console, feedback, runtime endpoints
│   └── store.md             # Phase 1: Store/Tx interface contract
└── tasks.md                 # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
cmd/
├── server/main.go           # + auth/spend/usage config, sweeper goroutine, flush on shutdown
└── devidp/main.go           # development-only fake OIDC provider (never built into the image)

internal/
├── state/
│   ├── store.go             # Store/Tx interfaces and record types (Invite, Account, Session, Audit, Feedback, Counter)
│   ├── filestore.go         # transactional JSON file store, batched counter flush
│   └── firestorestore.go    # planned (T105): Firestore Native over REST for Cloud Run
├── auth/
│   ├── password.go          # PBKDF2-HMAC-SHA256, passphrase + Beta ID generation
│   ├── wordlist.go          # 256 child-safe words
│   ├── ist.go               # IST zone, AddMonths, day keys
│   ├── service.go           # invites, activation, login, sessions, admin ops, lockout, audit, sweep
│   ├── cookie.go            # HMAC-signed cookies (OIDC flow state, admin session)
│   ├── oidc.go              # discovery, PKCE flow, RS256 ID-token verification
│   └── fakeidp/             # fake OIDC provider (used by tests and cmd/devidp)
├── spend/tally.go           # reserve / settle against the daily IST counter
├── usage/recorder.go        # in-memory counters + last-seen, 30 s flush, series queries
├── feedback/
│   ├── check.go             # deterministic personal-details check (reject, never redact)
│   ├── auditor.go           # AI auditor client, fixed-format verdict, fail-closed worker
│   └── service.go           # submit, rate limit, list/filter (passed only), status, CSV, retention
├── cost/provider.go         # CostProvider interface; AI-spend provider; "not connected" billing stub
└── api/
    ├── auth_handlers.go     # /api/auth/*
    ├── admin_handlers.go    # /api/admin/* (accounts, invites, audit)
    ├── admin_insights.go    # /api/admin/overview, usage, users, costs
    ├── feedback_handlers.go # POST /api/feedback, /api/admin/feedback*
    ├── session_gate.go      # FR-001 gate, CSRF + Origin checks, usage hook
    ├── router.go            # wiring (RouterConfig gains Auth, Spend, Usage, Feedback, Cost, TutorEnabled)
    └── tutor.go             # + enabled flag, spend reserve/settle, usage count

web/src/
├── store.ts                 # + useAuthStore, runtime flags
├── api.ts                   # + auth, admin, feedback calls, 401 guard
├── pages/
│   ├── SignIn.tsx, Invite.tsx
│   └── admin/{AdminLayout,Overview,UsersInvites,Usage,Costs,FeedbackInbox,Audit}.tsx
├── components/{ExpiryBanner,AuthGate,FeedbackButton,FeedbackDialog,charts/BarSeries}.tsx
└── App.tsx                  # routes, header (Beta ID, Feedback, sign out)

web/tests/auth.spec.ts, admin-console.spec.ts, feedback.spec.ts
```

**Structure Decision**: record types and the store live in `internal/state`; domain logic lives in `internal/auth`, `internal/spend`, `internal/usage`, `internal/feedback` and `internal/cost` with no `net/http` handlers (except the OIDC HTTP client), so the file store can later be swapped for a managed one without touching handlers. HTTP concerns stay in `internal/api`, matching the existing layering.

## Key Design Decisions

(Rationale and alternatives in [research.md](./research.md).)

1. **Gate, not per-route checks.** When auth is on, one middleware wraps all `/api/*` except `health`, `runtime`, `auth/*`. Static SPA assets stay public (they contain no lesson text; lessons come from the API).
2. **Auth mode.** `HOSTED_MODE=true` always implies auth. `AUTH_REQUIRED=true` enables it for non-hosted runs. The server refuses to start with auth on and a missing secret, state path, or OIDC setting.
3. **Learner sessions are server-side and revocable**: random 256-bit token in an HttpOnly cookie; only its SHA-256 is stored. Lifetime = min(14 days, account expiry). Validity (session, account status, expiry) is re-checked on every request, which gives immediate revocation (better than the 5-minute SC-006 limit).
4. **Invites are POST-activated.** The link opens a page with an "Activate" button; activation is a `POST`. This stops chat-app link previews and mail scanners from consuming single-use links.
5. **Passwords**: system-generated 4-word passphrase + 3 digits (~42 bits), stored as PBKDF2-HMAC-SHA256 (200,000 iterations, per-account salt). Unknown Beta IDs run a dummy hash to avoid a timing oracle.
6. **Lockout** (FR-013): failures tracked per existing Beta ID and per client address (10 in 15 min → blocked 15 min), using the trusted-proxy address helper. A blocked key refuses even the correct password.
7. **Seat cap** is enforced inside the same store transaction that creates invites. Activation converts a pending invite into an account, so it never changes the seat count and cannot fail on the cap.
8. **Admin sign-in**: OIDC authorization code + PKCE (S256) + `state` + `nonce`; ID token verified with RS256 against the provider's JWKS; email must be verified and in `ADMIN_EMAILS`. OIDC flow state and the 8-hour admin session are HMAC-signed cookies (no store writes, no new tables). CSRF: per-session token in `X-CSRF-Token` plus `Origin` check on every admin write.
9. **Spend ceiling**: before each AI call, reserve the worst-case cost (estimated input + max output tokens) against `spend:<IST date>`; settle to actual (or a conservative estimate for streams) afterwards. Reservation under the ceiling means real spend can never exceed it (SC-010). At the ceiling the tutor answers "The tutor is resting until tomorrow." and everything else keeps working.
10. **Tutor in hosted mode is off by default** (FR-024): `TUTOR_ENABLED` defaults to `false` when hosted and `true` otherwise. Disabled requests are refused with the existing `503 tutor disabled` before any model client is built, and the UI hides the panel.
11. **Admin console = one SPA area** at `/admin` with six tabs, all reading from `GET /api/admin/*` JSON endpoints. Charts are plain SVG/CSS bars (no chart library). Each response carries `generatedAt` (IST) so the UI can show freshness (FR-046).
12. **Usage is counted, not logged** (FR-040/FR-044). A `usage.Recorder` keeps per-day counters and a `lastSeen` map in memory, updated by the session gate and a few handlers (lesson view, quiz open, tutor question, sign-in, activation). It flushes to the store every 30 seconds and on shutdown (loss on crash ≤ 30 s, within the spec's 1-minute allowance). No IP, user agent or per-person event is ever recorded. "Active now" = last seen within 5 minutes from the in-memory map; daily active accounts = a counter bumped the first time an account is seen each IST day.
13. **Costs are honest** (FR-044/FR-045). `cost.Provider` returns AI spend from the spend tally (today and month-to-date from daily counters), the configured monthly budget (`MONTHLY_BUDGET_USD`, default 30), threshold flags at 50/90/100%, and a linear month-end projection. A second provider slot is for hosting/data-store cost; until an adapter exists it reports `connected:false` with a reason, and the UI shows "not connected", never a number.
14. **Feedback is screened twice before an admin can see it** (amendment 2 ratified; beta decision 2026-11-02). (a) `POST /api/feedback` requires a learner session and is limited to 5 per account per hour (counter keyed by a hash of the Beta ID and hour, so the record holds no identity). (b) A deterministic check (`internal/feedback/check.go`) runs first and **rejects** the whole message, storing nothing, if it finds emails, phone numbers, postal addresses, government/card numbers, stated dates of birth, links or handles, including disguised forms. It rejects and does not redact, because a redacted remainder can still carry part of an address. The reply names the category, never the matched text. (c) A message that passes is stored as `waiting`, invisible to admins. (d) An AI auditor (`internal/feedback/auditor.go`) is invoked only for waiting items (a submit-triggered worker plus the hourly sweep for retries, which calls the AI only if something is waiting). It gets the message text only, no tools, and must answer in a fixed JSON verdict; anything else counts as unusable. `pass` makes the item visible; `withhold` deletes the text immediately and keeps only rating, category and a reason category. (e) Fail closed: unavailable, over budget or unusable keeps the item waiting and hidden; waiting items older than 7 days are deleted. (f) Feedback is offered in the UI only when the auditor is configured. Admins list, filter, mark read or resolved, delete and export **passed** items only; each action writes an audit entry. A daily sweep deletes items older than 180 days.
15. **The auditor is a controlled, separate AI use** (FR-056..FR-059). Provider, key and model come from `FEEDBACK_AUDITOR_BASE_URL`, `FEEDBACK_AUDITOR_API_KEY`, `FEEDBACK_AUDITOR_MODEL` (deployment configuration only; the hosted-mode network guard applies). Calls reserve and settle against the same daily spend counter as the tutor (`internal/spend`), so the US $1.00 ceiling covers both. The prompt places the message inside a delimited data block and tells the model it is untrusted; the parser accepts only `{"verdict":"pass"|"withhold","reason":"<enum>"}` with `reason` from a fixed list (`personal_details`, `contact_details`, `address`, `abusive`, `unsafe`, `injection_attempt`, `unclear`), and anything else is unusable. The auditor can only tighten: it is never called for a message the rule check rejected. This does not reopen FR-024, which concerns the tutor.
16. **Expiry**: two calendar months in IST (`Asia/Kolkata` as a fixed +05:30 zone, so the Alpine image needs no tzdata), clamped to month end. Extension base is `max(now, current expiry)`.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| File store loses data on scale-to-zero, redeploy, or a second instance | The file store is for self-hosting on a persistent volume only. Cloud Run startup is refused without the Firestore backend (T107), and traffic waits on the restore drill and staging acceptance (T115, T120). **Do not launch on ephemeral disk.** |
| Firestore outage or transaction conflict during a request | Bounded retries, then fail closed; read errors can never look like "not found" (cloud-beta-design.md section 3; T105, T106). |
| Hand-written PBKDF2 / JWT verification | Known-answer tests (RFC 7914 vectors), alg pinned to RS256 (reject `none`/HS*), `kid` required, issuer/audience/expiry/nonce checks, negative tests for each. |
| Passphrase entropy vs offline attack if the state file leaks | Hashed with 200k iterations and salt; ~42 bits plus a 40-bit random Beta ID; lockout limits online guessing. Iteration count is stored per hash so it can be raised later. |
| CPU cost of PBKDF2 under a login flood | Per-address request limiter on login/activate (reuses `RateLimiter`), plus lockout. |
| State file corruption on crash | Write to temp file, fsync, rename; load fails loudly instead of starting empty. |
| Children type personal details into feedback | Two layers: deterministic rejection of known formats, then an AI auditor before any admin can read it; visible warning; no identity attached; waiting/withheld text never shown; 180-day deletion. Neither layer is perfect (a name in plain words can slip past the rules; the auditor can miss), so the residual risk is the owner's to accept. |
| Feedback text is sent to a third-party AI provider | Only screened message text is sent (no label, lesson, account or IP); provider terms must exclude training and retention beyond the call; written processor agreement; counsel to confirm COPPA third-party-disclosure and DPDP implications before the beta widens. |
| Prompt injection through feedback text | Text is delimited as untrusted data; no tools; strict JSON verdict from a fixed enum; the auditor can only withhold; deterministic rejection runs first and is never overridden; tests with injection strings. |
| Auditor cost or outage blocks feedback | Fail closed (items wait, hidden); calls count against the daily ceiling; zero calls with zero feedback; waiting items expire after 7 days. |
| Usage counters rewrite the state file too often | Counters are batched in memory and flushed every 30 s; only access-control writes flush immediately. |
| Console shows a cost that is wrong or invented | AI spend is labelled "estimated" (token-based); hosting cost is shown only from a connected source; otherwise "not connected". |
| Admin account takeover | IdP-enforced MFA (optional `OIDC_REQUIRE_MFA` also checks the `amr` claim), email allowlist, 8-hour sessions, audit trail. |

## Complexity Tracking

| Violation / exception | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Hand-written Firestore REST client | DC-06 requires an amendment for any new module, and the SDK would add a large transitive graph | The Go SDK would save code but needs a constitution amendment. The emulator covers the client's behaviour locally and in CI; live behaviour is proven in staging (T120). |
| In-package PBKDF2 and ID-token verification | No `x/crypto` available; spec and owner require no new dependencies | A third-party JWT library adds supply-chain surface for a 150-line verifier; known-answer and negative tests cover the risk. |
| `cmd/devidp` and `internal/auth/fakeidp` | Admin flow cannot be exercised locally or in tests without an identity provider | Mocking inside handlers would leave the real redirect/token/JWKS path untested. Not built into the production image (`go build ./cmd/server` only). |
