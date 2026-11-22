# Invite links, hard seat cap and sign-in abuse resistance (small invite-only Go app on Cloud Run)

Research date: 2 Nov 2026. About 17 tool calls. Pages fetched were live versions, and most OWASP pages carry no visible date. "Inference" means my reasoning, not a source. "Unverified" means I could not confirm it from a primary source in this session.

## 1. Token design and URL placement

### Takeaway
A 256-bit CSPRNG token with only its hash stored already exceeds every guidance document found. The remaining design choices are URL placement and header hygiene. OWASP puts reset tokens in the query string with `Referrer-Policy: no-referrer`. A fragment is a stronger option that no fetched source covers. The W3C Capability URL draft names the leakage channels.

### Cited Findings
- OWASP Forgot Password sheet requires tokens that are "long enough to protect against brute-force attacks", generated with a CSPRNG, single use, expiring, invalidated after use. It gives no bit count. It says tokens are passed in the query string, and the reset page should send Referrer-Policy `no-referrer`. It does NOT say to hash tokens; it only says "stored in a secure manner". It also says to rate-limit token brute forcing and per account. — [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- OWASP Session Management: session IDs need at least 64 bits of entropy from a CSPRNG, with 128 bits suggested for custom IDs. A 256-bit invite token far exceeds this. — [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- W3C TAG "Good Practices for Capability URLs" (First Public Working Draft, 18 Feb 2014; not expected to become a Recommendation). It says capability URLs appear in server logs and browser history, and that history-sync services and toolbars can collect them. Third-party scripts on the page can read and record the URL. Links off the page leak the URL via `Referer`, so use `rel="noreferrer"`. URLs should expire; return 410 or 404 afterwards. The draft does not compare path, query and fragment, and does not name Referrer-Policy. It describes `history.replaceState()` to swap in a canonical URL, at the cost of bookmarking. — [W3C Capability URLs](https://www.w3.org/TR/capability-urls/)
- Slack's link-unfurl bot identifies as `Slackbot-LinkExpanding`, fetches as little as it can using HTTP Range headers, responds to links posted into channels, and caches globally for about 30 minutes. — [Slack robots](https://api.slack.com/robots)

### Inferences
- Hash-at-rest with unsalted SHA-256 is adequate for a 256-bit random token. Lookups are by hash, so there is no practical timing oracle on the token. Compare the hash with `subtle.ConstantTimeCompare` only if comparing in application code. A DB lookup by hash needs no extra comparison. (Unverified: no primary source fetched for "no salt needed for high-entropy tokens".)
- Fragment placement (`/join#token`) is never sent to the server, so it stays out of access logs, Cloud Run request logs, Referer headers and proxy logs. The page JS reads it and POSTs it in the body. The cost is that it needs JS, and the W3C draft does not address fragments, so this rests on how URLs work, not on the cited source. This is the strongest log-leak defence. The path/query alternative is acceptable only if you redact request URLs in logs and send `Referrer-Policy: no-referrer`.
- Use `Cache-Control: no-store` on the activation page and responses carrying the token. After load, call `history.replaceState` to strip the fragment (the W3C draft warns this prevents bookmarking, which is acceptable for a single-use link).
- Format: base64url or Crockford base32 of 32 random bytes from `crypto/rand`. Avoid ambiguous characters if printed sheets are typed by hand (a typed 256-bit token is 52 base32 characters, which is long; see section 3 for short codes).
- Printed sheets and classroom projectors expose the link to everyone in view, so a separately handed short code adds a second factor.

### Gaps
- No primary source found stating a minimum bit count for invite or reset tokens (OWASP is qualitative). NIST SP 800-63B-4 section 3.1.3.2 covers out-of-band secrets (at least six decimal digits, rate limiting if under 64 bits); I did not find a rule for invite tokens.
- No source found that tests fragment-token flows in link scanners.

## 2. Link previews and scanner prefetch

### Takeaway
Preview bots and email scanners do fetch URLs before a human clicks, and several vendors and projects report single-use tokens burned this way. "Interstitial page, then button, then POST" is the widely adopted mitigation. Do not rely on a scanner not running JavaScript.

### Cited Findings
- Slack's unfurler fetches when a link is posted (see Section 1). Other preview bots (Google Messages bot, Buffer, Meta) fetch the exact URL once after sharing and may cache results. Sources are blogs and agent-directories, so weak. — [WebSearch results: infidigit](https://www.infidigit.com/blog/google-messages-bot/), [KnownAgents BufferLinkPreviewBot](https://knownagents.com/agents/bufferlinkpreviewbot)
- Reported cases: Outlook Safe Links breaks magic-login links with "Invalid or expired login token". — [PhotoAI report](https://ideasbugs.featurebase.app/p/outlook-safe-links-breaks-photoai-magic-login-links-with-invalid); [Supabase auth issue 1214](https://www.github.com/supabase/auth/issues/1214); [Atlassian plugin vendor note](https://thepluginpeople.atlassian.net/wiki/spaces/JEMHC/pages/3856236545/Security+Scanners+consuming+one+time+links)
- An IBM community blog (20 Jun 2025) says Safe Links does a HEAD request and that Microsoft changed Safe Links to avoid one-time-token patterns. This is a vendor-adjacent claim, unverified against Microsoft documentation. — [IBM community](https://community.ibm.com/community/user/blogs/akshat-rastogi/2025/06/20/safe-links-and-one-time-tokens-in-v10010)
- OWASP CSRF: `SameSite=Lax` still sends cookies on top-level GET navigations, so any state-changing GET is exposed; state changes should use POST. — [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

### Inferences
- GET must be side-effect-free (RFC 9110 defines GET and HEAD as safe methods; I did not fetch it, so unverified here). The proposal of an "Activate" button doing a POST is the correct pattern. Also make HEAD harmless.
- Weaknesses remain. Headless-browser scanners that render JS and auto-click are possible but I found no source showing buttons being auto-clicked (a gap). A cheap hardening: require a user gesture plus a short code or a typed confirmation, or have the POST include a CSRF/one-time page nonce set when the page loads.
- Interstitial plus bind-to-short-code: the admin gives a 6-8 character code verbally, printed separately, or on the sheet, and the activation POST needs link token plus code. A scanner holding only the link cannot activate. Rate-limit code attempts per invite (for example 5 wrong tries kills the invite).
- School web filters and classroom proxies may also fetch; behaviour is vendor-specific, and I found no source. Treat as unknown and test with the target school filters.
- QR codes encode the same URL, so scanners and phones behave as with links; a QR on a projector is shoulder-surfable by the whole class.

### Gaps
- No documentation found for WhatsApp, Telegram, Teams, iMessage fetch behaviour (GET/HEAD, timing) or for Proofpoint. Only Slack's robots page was fetched.
- No primary Microsoft documentation found for Safe Links HEAD/GET behaviour.

## 3. Link sharing and forwarding

### Takeaway
No source addresses this classroom scenario directly. The sound response is to make a forwarded link low-value: bind to a second factor, scope by group label, cap per label, and give admins fast revoke/reissue plus visibility.

### Cited Findings
- W3C capability URL draft: capability URLs should expire, with examples of single use or one week; return 410/404 after. — [W3C](https://www.w3.org/TR/capability-urls/)
- OWASP: rate limit token guessing and requests per account. — [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)

### Inferences
- First-come-first-served is inherent: whoever POSTs first wins. A class-chat post means an uninvited child or outsider may take the seat while the intended one finds "already used". Mitigations, ranked: (1) short code read out or printed separately, required at activation; (2) per-label quotas, so one label cannot consume the whole cap; (3) admin dashboard showing label, created, used-at, and coarse activation IP/time, with one-click revoke and reissue; (4) shorter expiry for classroom links (for example 24-72 hours; 14 days is long if links are on printed sheets or chats), with admin extend; (5) an "approval" flag on a label that lets the account be created but held for admin approval.
- Detect: alert when an invite is used from an unexpected address, when many wrong-code attempts hit one invite, or when a label's activations exceed its roster size.
- Maintain a 410-style "link no longer valid" message that does not reveal whether used, expired or revoked.

### Gaps
- No empirical data found on forwarding rates or best expiry windows for school invites.

## 4. Atomic cap and uniqueness

### Takeaway
Check-then-write is the classic bug. Under the current single-writer mutex, do count, uniqueness check, invite consume and account insert inside one critical section and persist atomically. In managed stores, put uniqueness in the key and the cap in a single transactional counter (or serializable transaction).

### Cited Findings
- PostgreSQL docs: under Read Committed and Repeatable Read, two transactions can each count rows, see room, and both insert (write skew); enforcing business rules at Repeatable Read "is not likely to work correctly without careful use of explicit locks". Serializable avoids this but "must be prepared to retry" on SQLSTATE 40001. Serializable can still raise unique violations even after an explicit check, so also handle those. — [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- Firestore transactions: reads must come before writes; a concurrent edit makes Firestore re-run the entire transaction; retries are finite; transaction functions can run more than once, so don't mutate app state inside them. The page does not say whether queries or aggregation counts can be used inside transactions. — [Firestore transactions](https://docs.cloud.google.com/firestore/docs/manage-data/transactions)
- Firestore counters: a single document cannot be updated at an unlimited rate; use distributed counters (shards) for higher rates. — [Firestore counters](https://docs.cloud.google.com/firestore/docs/solutions/counters)
- Cloud Run container contract: instances serve multiple concurrent requests by default; filesystem is in-memory and ephemeral; scales to zero by default. — [Cloud Run container contract](https://docs.cloud.google.com/run/docs/container-contract)

### Inferences
- File store on Cloud Run: the instance filesystem is ephemeral and not shared, so a file store only works with min and max instances of 1 and durable storage (volume/GCS). A second instance or a restart silently breaks the cap. (Cloud Run volume mounts were not fetched, so unverified for this deployment.) Flag this as a major risk if not already handled.
- Single-writer pattern: mutex, then load state, verify invite hash exists and is unused and unexpired, verify username not present (case-folded and Unicode-normalised), verify `accounts + live unused invites < 1000`, write a temp file, fsync, atomic rename. Make the seat count a stored field or derive it inside the lock, never outside it.
- Seat accounting detail: seats = accounts + unexpired unused invites. Consuming an invite converts one invite seat to one account seat, so count is unchanged; this activation never needs a cap check, the cap check belongs at invite creation. Important: if expiry reduces invite seats over time, concurrent generation is the only place the cap can break. Do the check inside the same lock/transaction.
- Postgres: `UNIQUE` index on normalised username; invite consume as `UPDATE invites SET used_at=now() WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() RETURNING ...` (atomic compare-and-set); cap via a single-row `seats` counter updated with `UPDATE ... SET n=n+1 WHERE n<1000` in the same transaction, or Serializable with retry. Counting queries in Read Committed are unsafe (above).
- Firestore: username as document ID (`create` fails if it exists), invite doc keyed by token hash consumed inside a transaction, cap as one counter document. At 1,000 seats the write rate is trivially low, so the hot-counter problem does not apply and sharding would be over-engineering. Eventual consistency is not an issue for single-document strongly consistent reads. (Firestore uniqueness-by-ID is my reasoning; not quoted from a fetched page.)
- Spanner: not researched; use read-write transactions with a unique secondary index (unverified).
- Cap as DoS target: an attacker needs a valid invite, so risk is mostly insider/mistake. Safeguards: per-label quota, reserved admin seats, admin approval for new activations, per-address activation rate limit, alert at 80% and 95%, and no public self-signup.

### Gaps
- Spanner and Cloud SQL docs not fetched. No source for Firestore queries/counts inside transactions.

## 5. Sign-in abuse

### Takeaway
Per-account lockout enables targeted lockout of a child's account. OWASP itself warns of this and suggests throttling and recovery paths. NIST caps consecutive failures at 100 per authenticator. 10 per 15 minutes per account is stricter than needed.

### Cited Findings
- OWASP Authentication: lockout can be abused for denial of service; failure counters should be per account, not source IP; exponential lockout durations; generic error messages; equalise response time; password minimum length 8 with MFA and 15 without; check against breached passwords; MFA is "by far the best defense". — [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- NIST SP 800-63B-4 section 3.2.2: no more than 100 consecutive failed attempts per authenticator; agencies may set lower. Section 3.1.1.2: single-factor passwords at least 15 characters; blocklist of common/compromised passwords checked; no other composition rules; allow justification when rejected. — [NIST 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)
- OWASP Credential Stuffing: IP blocking is not a sole or primary defence; use graduated responses, multiple time windows, device and connection fingerprinting, CAPTCHA only on suspicious logins, breached-password screening, non-guessable usernames, notify users of suspicious events and let them review sessions; log volume metrics. — [OWASP Credential Stuffing](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html)
- Google Cloud external HTTP(S) LB appends two values: `<client-ip>,<load-balancer-ip>`; it does not verify anything before them, so leftmost entries are forgeable. — [GCP load balancing](https://docs.cloud.google.com/load-balancing/docs/https)
- General guidance: parse X-Forwarded-For from the right, skipping known trusted hops. — [StackHawk](https://stackhawk.com/blog/do-you-trust-your-x-forwarded-for-header), unverified blog

### Inferences
- Direct *.run.app Cloud Run requests: I could not fetch a Cloud Run page documenting XFF (the request-headers URL returned 404; the container contract page does not cover it). The Google front end presumably appends the client IP, but the hop count differs between direct Cloud Run and Cloud Run behind a load balancer (one more entry). Unverified; verify empirically by sending a forged XFF and inspecting the received header. Use the entry counted from the right with the configured trusted hops, never the leftmost.
- Better than hard per-account lockout: (a) throttle per account+address pair, so an attacker from address A does not block the child's login from address B; (b) exponential delay not hard lock; (c) keep a lower per-account global ceiling (for example up to the NIST 100) that triggers a challenge or admin-reset instead of lockout; (d) per-address cap across all accounts to stop stuffing; (e) bypass for sessions already trusted. School networks share one NAT address, so per-address limits must be generous, otherwise a whole class locks out. This is a real risk for classrooms.
- User-chosen passwords: enforce 15+ characters (NIST single-factor) or allow passphrases with min 8 only with a second factor; check against a breached list (offline Pwned Passwords list or k-anonymity API); no composition rules; hash with Argon2id/bcrypt/scrypt (OWASP Password Storage sheet not fetched; unverified here).
- Enumeration: username choice at activation reveals taken names; acceptable but rate-limit the check, and do not provide a live availability endpoint. Login must return one generic message and equalise timing by always hashing a dummy password for unknown users.
- Monitoring for a small operator: log (without passwords) failures by account and address, alert on failure spikes, lockout counts, activation bursts, wrong-code attempts, cap at 80/95%. Cloud Logging log-based metrics and alert policies are suitable (not fetched; unverified).

### Gaps
- No Cloud Run-specific XFF primary source. No OWASP numeric lockout threshold found; the OWASP page gives no figure for attempts.

## 6. Session management on shared devices

### Takeaway
14-day sessions are long for school computers. OWASP suggests idle timeouts of 15-30 minutes for low-risk apps; NIST AAL1 allows up to 30 days overall with optional inactivity timeout. Choose by device risk.

### Cited Findings
- OWASP: idle timeouts 2-5 minutes for high-value, 15-30 minutes for low-risk; absolute timeout e.g. 4-8 hours for office apps; enforce server-side; regenerate session ID after privilege change (login); invalidate server-side at logout; cookie `Secure`, `HttpOnly`, `SameSite=Strict` or `Lax`; `__Host-` prefix recommended (Secure, no Domain, Path=/); `Clear-Site-Data` at logout, but `"cache"` clears all stored responses. — [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- NIST 800-63B-4: reauthentication at AAL1 no more than 30 days; AAL2 24 hours overall and 1 hour inactivity (SHOULD). — [NIST 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)
- OWASP CSRF: use synchronizer token or signed double-submit cookie; `Sec-Fetch-Site` as primary signal with Origin/Referer fallback; `Origin: null` is not same-origin evidence; login CSRF needs pre-session tokens; SameSite is defence in depth only. — [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

### Inferences
- Offer "This is a shared computer" at sign-in that gives a short session (for example end of day, 1-2 hour idle). Default to a shorter session (for example 24h absolute, plus idle) for children on school devices; keep 14 days only for a "remember me" on a home device.
- Sign-out should revoke server-side, send `Clear-Site-Data: "cookies", "storage"` and prompt to clear locally stored progress (localStorage/IndexedDB) on shared machines; avoid `"cache"` (clears everything).
- Add CSRF defence to every state-changing endpoint: `Sec-Fetch-Site`/Origin check in Go middleware plus SameSite=Lax cookie; JSON-only endpoints with a custom header.
- Provide "sign out everywhere" and an admin session-revoke.

### Gaps
- Nothing found on child-specific guidance (COPPA/GDPR-K are out of scope here, but accounts for children with chosen usernames raise privacy duties; flag for legal review).

## 7. Recommendation and ranked improvements

### Takeaway
Keep the GET page then POST design and strengthen it: fragment token, second-factor short code, group quotas, shorter default expiry, fine-grained lockout.

### Hardened activation design (inference, built on cited sources)
1. Admin creates invite: 32 random bytes, store SHA-256, label, expiry (default 72h for classroom; max 14 days), optional 6-8 character code stored hashed.
2. Link `https://host/join#<token>`. GET returns a static page (`Cache-Control: no-store`, `Referrer-Policy: no-referrer`, no third-party scripts). JS strips the fragment from the address bar.
3. User enters username, password (15+ chars, breached check) and the short code, presses Activate. POST includes a CSRF/page nonce and the token in the body, with an Origin check.
4. Server, inside one lock/transaction: hash token, compare-and-set consume, check code attempts, normalise-unique username, insert account. Generic failure message. Rate limit per address and per invite.
5. New session ID, cookie `__Host-` prefixed, HttpOnly, Secure, SameSite=Lax.

### Ranked improvements
| Rank | Change | Effort | Impact |
|---|---|---|---|
| 1 | Confirm the file store is safe on Cloud Run (single instance, durable storage), else cap and uniqueness silently break | Low | High |
| 2 | Keep activation POST-only; GET and HEAD side-effect free | Low (already planned) | High |
| 3 | Token in fragment, `no-referrer`, `no-store`, redact URLs in logs | Low | Medium-High |
| 4 | Cap check and uniqueness inside one lock/transaction; unique normalised username | Low | High |
| 5 | Replace per-account hard lockout with per account+address throttling and exponential delay; generous per-NAT address limit | Medium | High (children's DoS) |
| 6 | Verify XFF handling empirically; use rightmost-trusted-hops parsing | Low | High |
| 7 | Short code bound to invite, separately delivered | Medium | High vs forwarding |
| 8 | Per-label quotas, admin revoke/reissue, approval flag, 80/95% cap alerts | Medium | Medium-High |
| 9 | 15+ char passwords plus breached-password check; Argon2id | Low-Medium | High |
| 10 | Shared-device mode, shorter default session, Clear-Site-Data at sign-out | Medium | Medium-High |
| 11 | CSRF middleware (`Sec-Fetch-Site` + Origin) on all state-changing routes | Low | Medium-High |

### Other risks noticed
- Ephemeral Cloud Run filesystem and multi-instance later (see Section 4).
- Shared school NAT addresses make per-address lockout a classroom-wide DoS.
- Children's data: privacy and consent obligations (unverified, needs legal review).
- Projected/printed links expose the token to onlookers; the short code mitigates.

### Gaps
- Not covered by sources: WhatsApp/Telegram/Teams/iMessage/Proofpoint behaviour, Spanner, Cloud Run XFF primary documentation, empirical forwarding data, RFC 9110 safe-method text (not fetched), SP 800-90 and RFC 6265bis (not fetched).
