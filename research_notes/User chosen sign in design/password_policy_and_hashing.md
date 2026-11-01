# Password policy and password hashing for user-chosen passwords (children-friendly Go 1.23 stdlib-only app)

Research date: 2026-11-02. Some items rest on search snippets or my own benchmark and are labelled. Items from my background knowledge that I could not re-verify are in Gaps, not Cited Findings.

## (1) Password rules to enforce (NIST SP 800-63B-4, OWASP, children)

### Takeaway
NIST 800-63B-4 (final 2025-07-31) requires 15 characters minimum when the password is the only factor and 8 when it is one factor of MFA. It requires a blocklist check, bans composition rules and forced rotation, and wants 64+ characters allowed. A children's app with no recovery cannot realistically demand 15 characters from 8-year-olds, so it needs a documented, risk-based deviation: a lower minimum, compensated by blocklist checks and strict throttling, or generated word-based passphrases.

### Cited Findings
- SP 800-63B-4 final is dated 07/31/25 and supersedes SP 800-63B of 03/02/2020. — [NIST CSRC (via search summary)](https://csrc.nist.gov/pubs/sp/800/63/B/4/final)
- Passwords used as single-factor authentication: verifiers SHALL require at least 15 characters. Passwords used only inside MFA: at least 8. — [NIST SP 800-63B-4 sec 3.1.1](https://pages.nist.gov/800-63-4/sp800-63b.html)
- Verifiers SHOULD permit at least 64 characters. They SHOULD accept printing ASCII, space and Unicode, and each code point counts as one character. — [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)
- Verifiers SHALL NOT impose other composition rules. Periodic rotation is prohibited, and a change is forced only on evidence of compromise. — [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)
- Verifiers SHALL check new passwords against a blocklist of commonly used, expected or compromised values. The check is on the whole password, not substrings. Examples are breach corpora, dictionary words, and context-specific words such as the service name or username. Rejected users must be told why and must pick another. The list SHOULD be large enough to block likely guesses before the attempt limit is reached. — [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)
- Verifiers SHALL allow password managers and autofill and SHOULD permit paste. They SHOULD offer a "show password" option. They SHOULD apply NFC normalization before hashing. They SHALL verify the whole password without truncation. Trimming leading and trailing whitespace is allowed if the minimum length is still met. Hints visible to unauthenticated users, and knowledge-based or security questions, are prohibited. — [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)
- Passwords SHALL be salted (salt at least 32 bits) and hashed with a suitable scheme, and a keyed hash step SHOULD be added. — [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)
- OWASP Authentication Cheat Sheet: minimum 8 with MFA and 15 without, citing NIST. Allow at least 64 characters. Do not silently truncate. Allow all characters including Unicode and whitespace. No composition rules and no periodic rotation. Screen against common and breached lists (Pwned Passwords service or a self-hosted copy). — [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- Children and text passwords: studies report young children struggle with textual passwords (they recall the word or phrase but not capitalization or digits). Picture-based schemes (KidzPass, ages 4-7; KidsPic, ages 6-11) beat alphanumeric passwords on memorability in some studies. A 2016 study of 13 children aged 6-12 found graphical passwords had a lower success rate. A school system where students drew four icons reported an 87% success rate over eight months. Samples are small. — [search summary of Carleton/arXiv 1610.09743 and related](https://arxiv.org/pdf/1610.09743)
- Pwned Passwords range API: send only the first 5 hex characters of the SHA-1 (or NTLM) hash to `api.pwnedpasswords.com/range/{prefix}`. It needs no API key and has no rate limit. The `Add-Padding: true` header pads each response to 800-1,000 entries. The full hash set can be downloaded for offline use, and a Pwned Passwords Downloader tool exists. Pwned Passwords has no attribution requirement. — [HIBP API v3](https://haveibeenpwned.com/API/v3#PwnedPasswords)
- NCSC's 100k most-used passwords file is in SecLists (`100k-most-used-passwords-NCSC.txt`). It is derived from HIBP data, and 123456 appeared in about 23.2 million breached accounts. A separate Burnett-derived `10_million_password_list_top_100000.txt` also exists. — [search results via Bitwarden/Security Magazine](https://bitwarden.com/resources/ncsc-password-list.md)

### Inferences
- NIST's 15-character floor applies to single-factor passwords. This app is single-factor, so a 4-8 character child password formally fails the NIST SHALL. The defensible position is to document it as a risk-accepted deviation: no PII, no recovery, low-value data. Compensate with a large blocklist, strict throttling, and no-reuse-by-construction (accounts exist only in this app).
- Recommended policy (my proposal, not from a source):
  - Minimum 8 characters, counted in Unicode code points after NFC and trim. Accept 6 only for a "kid mode" if the blocklist is the strict one (see below), otherwise keep 8. A passphrase of 2-3 simple words usually reaches 8+ characters.
  - Offer a "suggest a passphrase" button (three words from a ~2,000-word kid-safe list, or about 33 bits per 3 words; 4 words about 44 bits). Generated suggestions fit the old machine-generated 42-bit design and suit children best. Allow up to 128 characters (above NIST's 64 floor), with a cap to bound hashing cost.
  - No composition rules, no rotation, allow paste and show-password.
  - Reject: password equals or contains the username, app name or "learning" variants, all-same character, simple sequences (123456, abcdef, qwerty), repeated short patterns, and anything in the blocklist.
  - Picture passwords are an optional future path, not a stdlib problem: the picture sequence can be encoded to a string and hashed the same way, but the entropy of 4 icons from a grid of 9 to 16 is only about 12 to 16 bits. That would only be safe with very strict throttling, so I would not recommend it as the only credential.
- The child-population risk is mainly shoulder-surfing and classmates guessing, not offline cracking. Throttling and a low-guessability blocklist matter more than raw length.

### Gaps
- No primary source found on a NIST position for authenticating children or minors (the excerpt of 63B-4 read does not mention them). Section beyond character 200,000 of the NIST page was not read.
- No quantitative study found of acceptable minimum length for 8-year-olds.
- I did not read NIST 800-63B-4's rationale on why 15 vs 8; the numbers come from the normative text only.

## (2) Blocklist and breached-password checks without third parties

### Takeaway
Embed a list in the Go binary with `//go:embed`: the NCSC/HIBP-derived top 100,000 (about 1 MB raw, less compressed) is a reasonable size; it keeps all checking offline. The HIBP k-anonymity API is privacy-light (5-character prefix, no key) but still makes an outbound call at registration time that leaks a prefix and IP; offline is simpler for a children's app.

### Cited Findings
- HIBP range API sends only a 5-character hash prefix and supports padding. — [HIBP API v3](https://haveibeenpwned.com/API/v3#PwnedPasswords)
- The full dataset can be downloaded for self-hosting. — [HIBP API v3](https://haveibeenpwned.com/API/v3#PwnedPasswords)
- NIST wants the blocklist to include context-specific words such as service name and username. — [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)
- OWASP names Pwned Passwords or a self-hosted copy, and says SecLists lists exist but update frequency is not guaranteed. — [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

### Inferences
- Size estimate (assumption): 100,000 entries at about 9 bytes average is about 0.9 MB raw. This is trivial next to a Cloud Run container. Load into a `map[string]struct{}` at start (about a few MB of RAM), or keep the sorted list and binary-search it.
- Embed approach: `//go:embed common_passwords.txt` into a `string`, split on newlines once at init. Lowercase the candidate and also check the candidate with trailing digits stripped (to catch `password1`). Add a small kid-specific list (colours, animals, school, family names, "iloveyou", "minecraft", "roblox", "fortnite", class and teacher names) because general breach lists under-represent child choices.
- Privacy trade-off of live HIBP: the call reveals to HIBP/Cloudflare the server's IP and a 5-hex-character prefix (about 1 in 1,048,576 buckets), not the password. For a no-PII children's app this is probably acceptable legally, but it adds a runtime dependency, a failure mode (fail open or closed), and a third-party network call that a school privacy review may question. Offline avoids all of that. Use padding if you do call it.
- Also run a rejection step for the generated passphrase suggestions so they are never in the blocklist (they will not be).

### Gaps
- I did not verify the exact current file sizes or licences of SecLists/NCSC lists, nor find a license statement for embedding them in a distributed binary; check before shipping. The NCSC list URL was not fetched directly.
- Did not verify whether the HIBP downloaded dataset licence permits redistribution inside an app (it is large, about 40 GB, so not suited to embedding anyway; this size figure is from my background knowledge and unverified).

## (3) Strength meter

### Takeaway
Use a simple client-side length-and-blocklist hint, optionally zxcvbn-ts; the server must enforce policy independently. Evidence says meters help mostly when stringent, and the effect depends on account importance.

### Cited Findings
- OWASP recommends a strength meter and suggests the zxcvbn-ts library; check the maturity of other-language ports. — [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- A 2012 USENIX study of 14 meters found significant increases in resistance to cracking only with meters that scored stringently, and stricter meters annoyed users more. — [USENIX Security 2012, Ur et al. (via search)](https://www.usenix.org/conference/usenixsecurity12/technical-sessions/presentation/ur)
- A 2013 Berkeley study (Egelman et al.) found meters changed behaviour for important accounts when changing passwords, with no impact for unimportant accounts. — [Egelman et al. (via search)](https://blues.cs.berkeley.edu/wp-content/uploads/2014/07/p2379-egelman.pdf)
- NIST 63B-4 section 3.1.1 as read does not address strength meters. — [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)
- My search found no study testing zxcvbn's feedback itself.

### Inferences
- For stdlib-only Go and a child audience, a custom front-end bar (length plus "too common" from a small shipped list or server check endpoint) is enough. zxcvbn is a JS dependency of significant size and tuned to English adult patterns; for children's passphrases it will mis-score. The server-side blocklist is the real control.
- A "check" endpoint that tests a candidate password should itself be rate limited and must not log the password.

### Gaps
- No evidence found on strength meters with children.

## (4) Hashing: algorithms, parameters, options in the Go standard library

### Takeaway
Go 1.23 stdlib has no password-hashing KDF at all; `crypto/pbkdf2` (and `crypto/hkdf`, `crypto/sha3`) arrive in Go 1.24. Go 1.25 and 1.26 release notes mention no scrypt, argon2 or bcrypt. The practical options are: upgrade to Go 1.24+ and use stdlib PBKDF2 at OWASP's 600,000 iterations, or keep the hand-rolled PBKDF2 but raise to 600,000. Argon2id is OWASP's first choice but needs x/crypto (vendored or as a dependency).

### Cited Findings
- OWASP Password Storage: Argon2id minimum m=19 MiB (19456 KiB), t=2, p=1; equivalents 46 MiB/t=1, 12 MiB/t=3, 9 MiB/t=4, 7 MiB/t=5. — [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- scrypt: N=2^17 (128 MiB), r=8, p=1 minimum; alternatives N=2^16/p=2, 2^15/p=3, 2^14/p=5, 2^13/p=10. — [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- bcrypt: work factor at least 10, 72-byte input limit (enforce max 72 bytes); legacy systems only. — [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- PBKDF2: HMAC-SHA256 600,000 iterations; HMAC-SHA512 220,000; HMAC-SHA1 1,400,000 (legacy). For FIPS-140 compliance use PBKDF2 with HMAC-SHA-256 and at least 600,000 iterations. PBKDF2 is permitted by NIST SP 800-63B-4. — [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- OWASP pepper guidance: a pepper is secret, stored apart from the hash (vault or HSM), adds no guarantees alone and is defence in depth. Pre-hash (mixed in before) or post-hash (HMAC of the hash). If compromised it must be changed, which forces password resets. — [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- OWASP warns that some PBKDF2 implementations re-hash long passwords on every iteration, creating a denial-of-service risk; pre-hashing helps but needs a salt. — [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- Go 1.24 (Feb 2025) added `crypto/pbkdf2` (RFC 8018), `crypto/hkdf` (RFC 5869) and `crypto/sha3` (FIPS 202), all based on the existing x/crypto packages, plus FIPS 140-3 mechanisms (Go Cryptographic Module v1.0.0 under test at a CMVP lab). — [Go 1.24 release notes](https://go.dev/doc/go1.24)
- `pbkdf2.Key[Hash hash.Hash](h func() Hash, password string, salt []byte, iter, keyLength int) ([]byte, error)`; the docs recommend a salt of at least 8 bytes (RFC) and a good random salt, and give no minimum iteration count. — [pkg.go.dev/crypto/pbkdf2](https://pkg.go.dev/crypto/pbkdf2)
- Go 1.25 (Aug 2025) release notes list no scrypt/argon2/bcrypt/pbkdf2 changes. — [Go 1.25 release notes](https://go.dev/doc/go1.25)
- Go 1.26 (Feb 2026) release notes list no scrypt/argon2/bcrypt/pbkdf2/hkdf changes; it adds `crypto/hpke`. — [Go 1.26 release notes](https://go.dev/doc/go1.26)
- x/crypto argon2 `IDKey` recommends (RFC 9106 sec 4) time=1, memory 2 GiB, threads=4, or time=3, memory 64 MiB, threads=4 if memory is limited. x/crypto is BSD-3-Clause. — [pkg.go.dev/golang.org/x/crypto/argon2](https://pkg.go.dev/golang.org/x/crypto/argon2)
- Cloud Run: CPU below 1 vCPU (0.08 to 1) requires request-based billing, first-generation execution environment, and maximum concurrency 1. Memory above 512 MiB requires at least 0.5 vCPU. Startup CPU boost gives 2 vCPU during startup for limits of 1 or less. — [Cloud Run CPU docs](https://docs.cloud.google.com/run/docs/configuring/cpu)

### My benchmark (method and assumptions; not from a source)
- Method: a naive PBKDF2-HMAC-SHA256 (single 32-byte block, one `hmac.New` reused with `Reset`, stdlib `crypto/sha256`) on Go 1.23.2, macOS, Intel i5-8257U @ 1.4 GHz (turbo higher), single thread, mean of 5 runs.
- Result: 200,000 iterations took about 143 ms; 600,000 iterations took about 404 ms.
- Cloud Run caveat: I could not measure Cloud Run. The CPU is a different, probably similar-or-slower core, and a 0.25 vCPU limit may stretch wall time. If the limit is a CPU quota, a single-thread burst could take up to about 4x longer (about 0.6 s at 200k and 1.6 s at 600k). This scaling is an assumption, not a measurement; benchmark in the deployed service.

### Inferences
- Concurrency effect: with under 1 vCPU, Cloud Run forces concurrency 1, so each instance handles one sign-in at a time. 40 near-simultaneous sign-ins therefore either queue on one instance or trigger autoscaling to multiple cold-started instances. Using my laptop numbers: 40 serial verifications take about 5.7 s at 200k or about 16 s at 600k on one core, and 4x that at a 0.25 vCPU quota. That is borderline for a class sign-in at 600k on 0.25 vCPU; use at least 1 vCPU (which also permits concurrency above 1) or accept 200k-300k.
- Hand-rolled vs stdlib PBKDF2: functionally identical. Going to Go 1.24+ gets a reviewed implementation, the FIPS module path, and less code to own. Go 1.23.2 is out of security support by now (Go supports the two latest majors; with 1.26 released, only 1.25 and 1.26 are supported; this support policy is background knowledge, verify at go.dev/doc/devel/release). An upgrade is therefore a security recommendation in its own right.
- Option comparison:
  - Hand-rolled PBKDF2 on 1.23: zero dependency, but you own constant-time compare, encoding and tests; must raise from 200k to 600k to meet OWASP's current number or document the shortfall.
  - Upgrade to Go 1.24+ and use `crypto/pbkdf2`: lowest-risk choice; still PBKDF2 (GPU-friendly, no memory hardness).
  - Vendor `x/crypto/argon2` (+ `blake2b`, `internal/cpu` pieces) by copying under BSD-3-Clause, keeping the licence text: best algorithm, but a vendored fork of crypto code must be kept in sync with fixes. `go mod vendor` of a pinned x/crypto version is cleaner than hand copying and is what most teams do.
  - Add x/crypto as a normal dependency: simplest argon2id, one extra, widely audited, supply-chain surface; the prior constraint "standard library only" is the project's rule, not a technical limit.
  - Argon2id at OWASP's 19 MiB, t=2, p=1 uses about 19 MiB per hash; 40 concurrent verifications need about 760 MiB, which exceeds a small instance's memory. That is a further argument for either serialising verification with a semaphore or staying with PBKDF2.
- Recommendation: (a) near term, upgrade to Go 1.24+ (ideally 1.25/1.26) and use stdlib `crypto/pbkdf2` with HMAC-SHA256; (b) iterations 600,000 on at least 1 vCPU, or fall back to a documented 300,000 if 0.25 to 0.5 vCPU is kept, with rationale and a version tag in the stored hash so parameters can be raised on next login; (c) if x/crypto is ever allowed, prefer argon2id with a concurrency semaphore. Store as `pbkdf2-sha256$iter$salt$hash`, 16-byte random salt, 32-byte output, `subtle.ConstantTimeCompare`.
- Pepper: worth adding as cheap defence in depth when the store moves to a managed store (hash leakage from a database exfiltration no longer crackable without the secret), and NIST 63B-4 says a keyed hash SHOULD be added. Cost: secret in Secret Manager, a rotation plan (key id stored with hash; keep old peppers to verify, rehash on login), and no ability to recover if the secret is lost (all users locked out, with no recovery path in this app). Post-hash HMAC with a key id is the easiest to rotate. With a file-backed store inside the same container, a pepper in env/secret still helps if only the file leaks (for example, a backup).
- Login-flood DoS: at 0.4 s per verify (or about 1.6 s at 0.25 vCPU) an attacker can saturate one instance with a few requests per second. Mitigations: do the cheap checks first (per-IP and per-account throttles before hashing), a global bounded semaphore for hash work (for example, number of CPUs), a request timeout, and a maximum password length (128) to bound input. For unknown usernames, still perform a dummy hash verify to keep timing uniform (OWASP asks for consistent timing); throttle that path too so it is not an amplifier.

### Gaps
- No Cloud Run measurements; the benchmark is from a laptop.
- I did not read the Go FIPS 140-3 doc to see whether `pbkdf2` enforces a minimum key length, salt length or iteration count in FIPS mode (the Go 1.24 notes page and pkg.go.dev did not say). Check `go.dev/doc/security/fips140` before enabling FIPS mode, since a hard error there would break sign-in.
- Did not verify Go's current support window or whether x/crypto has newer argon2 guidance.
- I did not independently verify OWASP's equal-defence claims.

## (5) Lockout and rate limiting for user-chosen passwords

### Takeaway
NIST caps consecutive failures at 100 per authenticator (upper bound; lower is allowed) and endorses increasing delays (example 30 s to an hour) over hard lockout. For children, hard per-account lockout is a harassment vector, so use progressive delay per account plus per-address limits and a global hash-work cap.

### Cited Findings
- NIST 63B-4 sec 3.2.2: verifier SHALL protect against online guessing and limit consecutive failed attempts on a single account to no more than 100 by disabling the authenticator (100 is an upper bound; lower limits are permitted). Optional techniques: bot challenges, increasing delays after failures (example 30 seconds up to an hour), risk-based controls. Failures should be cleared after a successful authentication. — [NIST SP 800-63B-4 sec 3.2.2](https://pages.nist.gov/800-63-4/sp800-63b.html)
- NIST activation secrets (a different authenticator type, such as a device PIN): at most 10 consecutive failures, with usability guidance to allow at least 10 attempts and tell users how long they must wait. — [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)
- OWASP: tie the lockout counter to the account rather than the source IP; tune threshold, observation window and duration; use exponential lockout with a cap; avoid lockout-based denial of service; return the same message and similar timing whether the user or password is wrong or the account is locked; CAPTCHA is defence in depth, ideally shown only after a few failures; log failures and lockouts. — [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

### Inferences
- Sources conflict slightly: OWASP prefers account-based counters (to defeat IP rotation); the plan has both account and address limits. Keep both: per-account catches distributed guessing, per-address catches spraying across accounts (one guess at many usernames). Spraying is the main risk with 1,000 accounts and child-chosen passwords: an attacker tries a few top passwords on every account, so per-account limits never trigger.
- Why user-chosen changes the math: with a machine-generated 42-bit password, 10 failures per 15 minutes was far more than enough. With chosen passwords, the top few thousand guesses succeed against some fraction of accounts, so the blocklist (rejecting the top 100k) is what makes online guessing tractable. Rate limit gives about 960 guesses/day/account at 10 per 15 min, which exceeds a 100k blocklist's coverage only after about 100 days; plain lockout caps it harder.
- Proposed numbers (mine, to be tuned):
  - Per account: free 5 failures; then delays 5 s, 15 s, 30 s, 1 min, 5 min, capped at 15 min per attempt; reset on success. Do not hard-lock; the account owner can still sign in with the right password after the wait, but a classmate hammering the account only slows themselves. Optionally, apply the delay to attempts from unrecognised devices only (device cookie issued after a successful login, "device-bound throttling"), so a child on their usual device is never locked out by a harasser. This is only a convenience, since cookies can be cleared.
  - Hard ceiling per account: 100 failures in 24 h, matching NIST, then require a teacher/admin reset (a manual path is needed because there is no recovery).
  - Per address: 20 failed attempts per 15 min per IP, with a school-NAT consideration: a classroom shares one public IP, and 40 children mistyping could trip this. Count failures not attempts, key on IP plus username for the slower tier, and raise the per-IP failure limit to about 60 per 15 min with delay (not block) beyond.
  - Global: bounded concurrent hash operations, and a global failure rate alarm.
  - Enumeration: same response and timing for unknown user and wrong password; do a dummy hash for unknown users.
- Proof-of-work (CAPTCHA-free): a client-side hash puzzle after 3 failures is feasible, but it adds JS complexity and burdens low-end school devices; I rate it as optional and secondary.
- State storage: counters held in process memory vanish on instance restart and are per-instance on Cloud Run, so an attacker spread over instances gets a multiple of the limit. Persist counters in the store (or a single-instance max-instances=1 deployment) or the limits are not meaningful. This is a concrete risk with concurrency 1 and autoscaling.

### Gaps
- No primary source on lockout policy for child-directed services. OWASP's "permanent lockout after cap" statement conflicts with the DoS concern and I did not find guidance reconciling them for no-recovery systems.
- Cloud Run client IP handling (X-Forwarded-For trust) not researched; using the wrong header makes per-address limits spoofable.

## (6) Recommendation (summary)

### Takeaway
Policy: min 8 code points (NFC, trimmed), max 128, no composition rules, embedded 100k blocklist plus kid and contextual list, offered passphrase generator. Hash: PBKDF2-HMAC-SHA256, 600,000 iterations on Go 1.24+ stdlib (300,000 documented fallback on very small instances), 16-byte salt, versioned format, optional HMAC pepper with key id. Throttle: progressive per-account delay, per-address failure cap, persisted counters, global hash semaphore, NIST 100-failure ceiling with admin reset.

### Cited Findings
- See sections 1, 4 and 5 for the sources behind each element. The specific numbers in this section other than OWASP/NIST figures are my proposals.

### Inferences
- Other significant risks and improvements noticed:
  - Go 1.23.2 is likely past support; moving to a supported Go release also gives stdlib PBKDF2 and FIPS tooling (support policy unverified, see Gaps).
  - The 200,000 PBKDF2 iterations in the plan is one third of OWASP's 600,000; either raise it or record a justified exception.
  - Existing machine-generated accounts: keep verifying with the old hash format and rehash to the new parameters on next successful login; do not force a mass reset.
  - No-recovery design: a forgotten child password means a teacher/admin reset flow is mandatory; design it (who can reset, how the child is told, force-change on first use) before launch. Admin reset is also the point to apply the NIST 100-failure disable.
  - Do not log passwords or candidate passwords in the strength-check endpoint or access logs; set `Cache-Control: no-store` on auth responses.
  - Per-instance in-memory throttles under Cloud Run autoscaling (see section 5) are the likely largest practical hole.
  - A file-backed hash store inside a container is ephemeral on Cloud Run; losing it loses all accounts. This matters more once users choose passwords they care about.
  - Timing: use `subtle.ConstantTimeCompare` and uniform paths for known and unknown users.

### Gaps
- Not researched: HTTPS/cookie/session settings, CSRF, and COPPA/GDPR-K obligations for a children's service (the app stores no PII, but usernames chosen by children may be personal data).
- Not researched: Go `x/crypto` vendoring licence mechanics beyond the BSD-3-Clause statement.
