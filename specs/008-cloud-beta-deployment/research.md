# Research: Invite-Only Access, Spend Ceiling, Admin Console, Feedback

**Feature**: SPEC-008 (G7, G6, FR-040..FR-054) | **Date**: 2026-11-01

No `NEEDS CLARIFICATION` items remain. Owner decisions already taken (data store, admin sign-in, DC-09 amendment 1, Spec Kit order) are recorded as inputs. Each section below is Decision / Rationale / Alternatives.

## R1. State store

- **Decision**: a transactional `state.Store` interface (`Do(fn func(Tx) error) error`) with a JSON file implementation: whole state in memory, one mutex, each transaction runs on a copy and is swapped in only if it succeeds; access-control changes are written immediately (temp file, fsync, rename); counter-only changes are written by a 5-second batcher.
- **Rationale**: the owner chose interface + file store; a coarse serialised transaction is the simplest correct way to make the seat cap and single-use invites exact. A managed store maps the same `Tx` methods onto its own transactions.
- **Alternatives**: SQLite (needs a CGO or pure-Go module, a new dependency, and still dies with the disk on scale-to-zero); Firestore now (cannot be run or tested here, adds an SDK); append-only log (more code, no benefit at 1,000 users).

## R2. Password storage

- **Decision**: PBKDF2-HMAC-SHA256, 200,000 iterations, 16-byte random salt, 32-byte output, encoded `pbkdf2-sha256$<iter>$<salt>$<hash>`; verify with `subtle.ConstantTimeCompare`; iteration count read from the stored string so it can be raised later; unknown Beta IDs verify against a fixed dummy hash.
- **Rationale (at planning time)**: `golang.org/x/crypto` (bcrypt/scrypt/argon2) was not in `go.sum` or the module cache, and Go 1.23 had no `crypto/pbkdf2` (added in 1.24). PBKDF2 is ~20 lines over `crypto/hmac`, is FIPS-accepted, and passwords here are machine-generated with ~42 bits of entropy, so the work factor matters less than for human-chosen passwords. The project moved to Go 1.27.3 on 2026-11-02; the tested in-package hash implementation remains to preserve stored-hash behavior.
- **Alternatives**: upgrade to Go 1.24 for stdlib `pbkdf2` (toolchain change outside this feature's scope); plain salted SHA-256 (too fast); adding `x/crypto` (new dependency, excluded by the owner's constraints).
- **Verification**: RFC 7914 §11 vectors (`passwd`/`salt`/1 iteration/64 bytes, and `Password`/`NaCl`/80000/64) hard-coded in a test; vectors cross-checked once with Python's `hashlib.pbkdf2_hmac` at authoring time (not committed).

## R3. Credentials format

- **Decision**: Beta ID `BETA-XXXX-XXXX`, 8 characters from a 32-symbol alphabet without `0 O 1 I` (40 bits, `crypto/rand`, checked for uniqueness inside the transaction). Password: 4 words from a 256-word list of short, child-safe words plus a 3-digit number, e.g. `maple-tiger-river-cloud-482` (32 + 10 = 42 bits). Input is normalised (case, spaces, dashes, optional `BETA` prefix dash) before comparison.
- **Rationale**: FR-005 asks for easy to type, hard to guess. 42 bits behind a 10-failures-per-15-minutes lockout, with a 40-bit ID the attacker must also know, is far beyond online guessing; PBKDF2 plus salt covers offline attack on a leaked state file.
- **Alternatives**: random characters (hard for children to type); 6 words (longer to copy); a system word list (contains offensive words, unsuitable for children).

## R4. Sessions

- **Decision**: 256-bit random token in an `HttpOnly; SameSite=Lax; Path=/` cookie (`Secure` when `PUBLIC_BASE_URL` is https); only its SHA-256 is stored; lifetime `min(14 days, account expiry)`; the gate re-checks session, account status and expiry on every request and deletes the session on failure.
- **Rationale**: server-side sessions give instant revocation (FR-009, SC-006) at a cost of one in-memory lookup. Hashing the stored token means a leaked state file cannot be replayed.
- **Alternatives**: signed stateless tokens (cannot be revoked within 5 minutes without a denylist); sliding sessions (extra writes per request, no requirement).

## R5. Invite activation

- **Decision**: invite link `/invite/<token>` opens a page; activation is `POST /api/auth/activate`. Token is 256-bit random, stored as SHA-256 plus a separate short public ID used by admins for list and revoke. Responses distinguish used (409), expired or revoked (410), unknown (404).
- **Rationale**: chat apps and mail scanners prefetch links; a GET that consumed the invite would burn it before the learner opens it. The single-use guarantee comes from the store transaction (check pending, mark used, create account, all in one `Do`).
- **Alternatives**: GET activation (prefetch problem); one-time code typed by the user (worse for classroom handouts).

## R6. Seat cap

- **Decision**: `seatsUsed = accounts with status active or expired (not revoked) + pending invites not past their 14 days`. Creating `n` invites runs in one transaction and refuses the whole batch if `seatsUsed + n > SEAT_CAP`. Activation turns a pending invite into an account, so it never changes the count.
- **Rationale**: matches the spec's assumption that expired accounts keep their seat for 90 days; makes SC-005 provable with a concurrency test (50 goroutines creating invites with 10 seats free, exactly 10 succeed; 50 goroutines activating one token, exactly 1 succeeds).
- **Alternatives**: counting only active accounts (spec assumption says otherwise); optimistic counters (race-prone).

## R7. Lockout

- **Decision**: failure timestamps kept per `id:<BETAID>` (existing accounts only) and per `ip:<address>`. Ten failures inside 15 minutes block the key until 15 minutes after the latest failure; a blocked key refuses even a correct password and returns 429. A success clears the ID key. Address comes from the existing `clientHost(r, trustedHops)`. Pruned in the daily sweep and opportunistically when the table exceeds 5,000 keys.
- **Rationale**: FR-013 and SC-009. Tracking unknown IDs would let an attacker grow the store, so unknown IDs only count against the address.
- **Alternatives**: in-memory only (resets on restart and on a second instance); counting unknown IDs (unbounded growth).

## R8. Admin sign-in (OIDC)

- **Decision**: authorization-code flow with PKCE (S256), `state` and `nonce`; discovery from `OIDC_ISSUER/.well-known/openid-configuration` cached for 1 hour; `client_secret_post` at the token endpoint; ID token must be RS256 (anything else, including `none`, is rejected), signed by a JWKS key matching `kid`, with `iss`, `aud` (and `azp` if several), `exp`, `iat` (2-minute skew) and `nonce` all valid, `email_verified` not false, and the lower-cased email in `ADMIN_EMAILS`. Optional `OIDC_REQUIRE_MFA=true` additionally requires `amr` to contain `mfa`.
- **Rationale**: owner decision. MFA is enforced by the identity provider; the app only checks identity and allowlist.
- **Alternatives**: static admin token (no MFA, rejected by FR-014); IAP header (cloud-specific, untestable here).
- **State handling**: the in-flight login state and the 8-hour admin session are HMAC-SHA256 signed cookies (`SESSION_SECRET`, at least 32 bytes), so no store writes or tables are needed. Admin sessions cannot be revoked early; removing an email from `ADMIN_EMAILS` takes effect on restart, and the allowlist is re-checked on every request.

## R9. CSRF

- **Decision**: learner and admin writes require `Content-Type: application/json`; admin writes also require `X-CSRF-Token` equal (constant time) to the token inside the signed admin cookie, and an `Origin` header, when present, whose host equals the request host.
- **Rationale**: `SameSite=Lax` already blocks cross-site POST cookies in modern browsers; the token and Origin check are defence in depth for the admin area.
- **Alternatives**: SameSite only (single layer); per-form tokens for learners (no state-changing learner action beyond sign-out and feedback).

## R10. Gate scope

- **Decision**: when auth is on, wrap every `/api/*` route except `/api/health`, `/api/runtime`, `/api/auth/*` and the admin routes (which have their own check). Static SPA files stay public.
- **Rationale**: FR-001 forbids lesson content without sign-in; lessons, quizzes and tutor are all API responses, so one choke point is easier to audit than per-handler checks. SPA assets contain no lesson text.
- **Alternatives**: per-handler checks (easy to forget one); gating static files (would block the sign-in page itself).

## R11. Auth mode switch

- **Decision**: `HOSTED_MODE=true` always turns auth on; `AUTH_REQUIRED=true` turns it on for non-hosted runs; otherwise the app behaves exactly as today. Startup fails with a clear list if auth is on and `SESSION_SECRET`, `STATE_FILE`, `PUBLIC_BASE_URL`, `OIDC_*` or `ADMIN_EMAILS` is missing.
- **Rationale**: hosted without auth contradicts FR-001; failing fast avoids a deployed server that nobody can administer.
- **Alternatives**: allowing `AUTH_REQUIRED=false` on a hosted server (a footgun).

## R12. IST calendar months

- **Decision**: `time.FixedZone("IST", 5*3600+1800)`. `AddMonths(t, n)` converts to IST, adds `n` months to year/month, keeps the day clamped to the last day of the target month and the time of day, converts back to UTC for storage. Extension base is `max(now, current expiry)`.
- **Rationale**: India has no daylight saving, and a fixed zone avoids needing tzdata in the Alpine image. Extending from `now` for expired accounts prevents an extension that is still in the past.
- **Alternatives**: `time.LoadLocation("Asia/Kolkata")` (fails without tzdata); `time.AddDate` in UTC (wrong day boundary, overflows month ends).

## R13. Spend ceiling

- **Decision**: counter `spend:<IST date>` in micro-US-dollars. Before an AI call, `Reserve(estIn, maxOut)` computes worst-case cost (`ceil(tokens × pricePerMillionMicro / 1e6)`), and in one transaction refuses if `current + reserve > ceiling`. After the call `Settle` replaces the reserve with the actual cost (response usage when present, otherwise a conservative bytes÷3 token estimate). Prices come from `AI_PRICE_INPUT_PER_MTOK` / `AI_PRICE_OUTPUT_PER_MTOK` (defaults for `gpt-4o-mini`: 0.15 / 0.60). Ceiling `DAILY_SPEND_CEILING_USD`, default 1.00. If the store fails, the tutor fails closed.
- **Rationale**: reserving worst case before spending means the tally can never exceed the ceiling, which is stricter than SC-010's 5% allowance. At default prices a worst-case request reserves about US $0.001, so ~1,000 requests fit in a day.
- **Alternatives**: check-then-spend (concurrent requests overshoot); post-hoc billing API (delayed, needs cloud credentials).
- **Known approximation**: the streaming client does not expose token usage, so streamed answers settle on an estimate. The estimate is intentionally high.

## R14. Tutor off in hosted beta

- **Decision**: `TUTOR_ENABLED` defaults to `false` when hosted and `true` otherwise. When off, `/api/tutor*` returns the existing `503 {"error":"tutor disabled"}` before any model client is built, and `/api/runtime` reports `tutorEnabled:false` so the UI hides the panel, microphone and read-aloud controls (FR-024).
- **Rationale**: reuses an error path the UI already understands; hiding is a UI concern, refusal is a server concern.
- **Alternatives**: removing the route (changes 404 vs 503 contract tests rely on).

## R15. Usage counting

- **Decision**: `usage.Recorder` holds `map[key]int64` counters and `map[betaID]time` last-seen in memory behind one mutex; `Inc(key)` is O(1). A goroutine flushes both to the store every 30 seconds and on graceful shutdown (counter-only transaction, written by the store's batcher). Counted measures: `req`, `err5xx`, `signin_ok`, `signin_fail`, `activation`, `dau` (first sighting of an account each IST day, detected by comparing `LastSeenAt`'s IST date), `lesson:<id>`, `quiz`, `tutor_q`. Series queries read counters for N days and add the unflushed in-memory delta.
- **Rationale**: FR-040 asks for counts, not a log. Memory plus periodic flush avoids a file rewrite per request and keeps the 1-minute freshness target.
- **Alternatives**: write per request (I/O storm); external metrics service (cost, new infrastructure, and it would hold request data outside our control).
- **Privacy**: no IP, user agent, query string or Beta ID is placed in a counter key.

## R16. Cost view

- **Decision**: `cost.Provider` interface returning a `Snapshot{AI{Today, MonthToDate, Ceiling, Budget, Thresholds, Projection}, Hosting{Connected bool, Reason string, Items []LineItem}, GeneratedAt}`. The AI part is computed from `spend:` counters; hosting is a stub that returns `Connected:false, Reason:"Cloud billing source is not connected"`. Month projection = month-to-date ÷ elapsed days × days in month (IST), shown only after day 3 to avoid wild numbers.
- **Rationale**: owner wants cloud costs in the console, but real billing data needs cloud credentials and an adapter that cannot be tested here (FR-023 also forbids long-lived credentials). The interface keeps the console and API stable; the honest empty state satisfies FR-045.
- **Alternatives**: showing an estimate from instance-seconds (would be wrong and invented); embedding a billing console iframe (blocked by the CSP and `frame-ancestors`).

## R17. Feedback

- **Decision**: message limit 500 characters (runes), rating 1..5, category in `{bug, content, idea, other}`, lesson id must match the existing id pattern or be empty, mode in `{standard, junior, plain-english}`. Scrub order: URLs (`https?://`, `www.`), emails, digit runs of 7 or more digits allowing `+ ( ) - .` and spaces between digits; each replaced with `[removed]`. Rate limit: counter `fbrate:<sha256(betaID)[:16]>:<IST hour>` with limit 5; the counter key is hashed so the feedback record and counters carry no identity. Stored status `new`; admin transitions `new → read → resolved` (any direction allowed). CSV export escapes quotes and prefixes cells starting with `= + - @` with `'` to prevent spreadsheet formula injection. Retention sweep at 180 days.
- **Rationale**: FR-047..FR-054. Scrub is deliberately simple and documented as partial; the other protections (warning, no identity, deletion) carry the rest.
- **Alternatives**: no free text (loses the main signal); ML-based PII detection (dependency, false confidence); storing Beta ID for follow-up (conflicts with FR-049 and the privacy intent).

## R18. Admin console UI

- **Decision**: one `/admin` route with a tab bar (Overview, Users and Invites, Usage, Costs, Feedback, Audit). Overview shows seat gauge, active now, 7-day active accounts, AI spend today vs ceiling, unread feedback, and accounts expiring in 7 days. Usage shows a 30-day bar series per measure and a lesson-views table. Charts are inline SVG bars with text alternatives (a table toggle) for accessibility. Polling every 30 seconds while the tab is visible.
- **Rationale**: no chart dependency; the data sets are small; text alternatives satisfy DC-11.
- **Alternatives**: a chart library (bundle weight, supply chain); server-rendered pages (breaks the single-SPA pattern).

## R19. Cleanup sweep

- **Decision**: a goroutine runs at start and then hourly: delete accounts expired more than 90 days (FR-039) and their sessions; delete sessions past expiry; mark invites past 14 days as expired (computed on read) and delete them after 90 days; prune lockout keys older than 15 minutes; delete feedback older than 180 days; delete usage counters older than 400 days and spend counters older than 400 days. Each deletion batch is one transaction. Sweeps write no audit entries except account deletion (`account.purge`, actor `system`).
- **Rationale**: FR-039, FR-053, bounded state size.

## R20. Dependencies and tooling

- **Decision**: no new Go modules, no new npm packages. `cmd/devidp` and `internal/auth/fakeidp` provide a local OIDC provider for tests and manual runs; they are not part of `go build ./cmd/server`.
- **Rationale**: owner constraint and supply-chain surface.

## Open items carried forward (not blocking the plan)

- Amendment 2 was ratified on 2026-11-01; feedback tasks are unblocked.
- Confirm in staging where the real client address sits in `X-Forwarded-For` (`TRUSTED_PROXY_HOPS`), per the spec's assumption.
- Managed store adapter and the hosting-cost adapter are separate follow-ups.

## R17 update (2026-11-02): two-layer feedback screening (beta decision)

- **Decision**: replace "scrub and store" with "reject on a rule match, then AI audit before admins can see it". The rule check rejects (stores nothing) on emails, phone numbers (Indian and international, including digit words and spaced digits), postal addresses, Aadhaar/PAN/card-like numbers, stated dates of birth, links and handles. A message that passes is stored as `waiting`; an AI auditor then returns a fixed-format verdict; only `passed` items are visible to admins. The auditor runs only when feedback has been received and fails closed.
- **Rationale**: redaction can leave fragments (for example "12 [removed], Bengaluru"), so rejecting is the safer rule for "no personal data". Rules catch formats but cannot recognise a name or school written in words; a model can. Using both removes the weaknesses of each. The privacy-law research flagged the feedback form as the main accidental-collection exposure.
- **Alternatives**: scrub-only (leaves residue; rejected); AI-only (non-deterministic, costs on every submission, can be talked around; rejected as the only layer); human review of every item (needs an admin to read possibly personal data; rejected); no free text (loses the main signal).
- **Auditor design**: untrusted-data prompt, no tools, strict JSON enum verdict, can only tighten, never called after a rejection, counted against the spend ceiling, configuration-only provider. Verified assumptions: none yet; the prompt-injection resistance of the chosen model must be tested with the injection corpus in the tasks.
- **Open legal point (from the privacy-law notes)**: sending child-written text to a third-party provider is a disclosure; COPPA's 2025 amendments require separate parental consent for some third-party disclosures, and DPDP restricts processing likely to harm children. Mitigate with a no-training processor agreement and minimal data; counsel to confirm.
- **Beta-only**: credential rules (system-generated Beta ID and password, shown once and copied) and this screening apply to the beta phase; the sign-in research's other options stay open.
