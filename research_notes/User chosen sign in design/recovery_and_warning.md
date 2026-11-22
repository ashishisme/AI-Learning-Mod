# Account recovery and credential-saving warnings for a pseudonymous, no-PII sign-in used partly by children

Research date: 2026-11-02. Research budget (about 15 tool calls) was used; several items could not be verified and are listed under Gaps. NIST SP 800-63B-4 section 4.2 (Account Recovery) could not be fetched (HTTP 404/403 and a PDF that could not be decoded); only sections 3.1.1 and 3.1.2 were read.

## 1. Real-world cost of no-recovery, and what education platforms do

### Takeaway
No public data was found on lockout rates, support load or abandonment from password loss for children or classroom products. Every education platform examined has a human or admin-assisted reset path (teacher, parent or school); none relies on "lost = gone". Code.org, ClassDojo and Seesaw give young learners non-memorised credentials (picture/secret words, QR, text codes).

### Cited Findings
- Code.org: picture-password and secret-word accounts are reset or revealed by the teacher on the section Roster page ("Reset Password" or "Show Secret" button); teachers cannot see personal-email passwords but can send a reset email. Minimum 6 characters on teacher reset. — [Code.org support](https://support.code.org/hc/en-us/articles/202447276), [Code.org: view/print student login info](https://support.code.org/hc/en-us/articles/204182908)
- Code.org: if a student is not in the teacher's section and cannot receive email, only verified teachers may request a reset link via support@code.org (the verified-teacher check is their identity control). — [Code.org support](https://support.code.org/hc/en-us/articles/14959625319565)
- Code.org lets teachers print or email student login information to share with parents and students at home. — [Code.org support](https://support.code.org/hc/en-us/articles/204182908)
- Scratch: a Teacher Account can reset student passwords (My Classes, class, Students tab, Account Settings per student). If the student set their own email, the teacher cannot see the reset link. — [Scratch Help: reset my students' passwords](https://mitscratch.freshdesk.com/en/support/solutions/articles/4000156813-how-do-i-reset-my-students-passwords-)
- Scratch: one user reported CSV-uploaded passwords failing and having to reset each manually (97 accounts). Single anecdote. — [ScratchEd forum](https://scratched.gse.harvard.edu/discussions/how-do-i/teacher-account-csv-uploaded-passwords-are-not-working.html)
- Seesaw: Home Learning Student Codes can be reset per student or for the whole class by the teacher at any time, e.g. if compromised. Seesaw's own articles do not describe recovering a lost code; one school guide tells families to contact the school. — [Seesaw: reset student passwords](https://help.seesaw.me/hc/en-us/articles/206447475-How-to-reset-student-passwords), [Seesaw: sign in for remote learning](https://help.seesaw.me/hc/en-us/articles/360040333811)
- Seesaw code format/lifetime is described inconsistently across secondary sources (16-letter text code plus QR valid one year vs 12-digit code expiring after 90 days); not verified against current Seesaw docs. — [Seesaw remote learning](https://help.seesaw.me/hc/en-us/articles/360040419652)
- ClassDojo: students sign in via individual QR code, class QR, class text code (6 characters) or Google; a missing QR is replaced by the teacher; teachers can reset passwords and, if no parent email is attached, generate a temporary password. — [ClassDojo help: student login](https://help.classdojo.com/hc/en-us/articles/210542566-How-Do-I-Log-Into-My-Student-Account-), [ClassDojo QR login](https://help.classdojo.com/hc/en-us/articles/360023367251-How-Students-Can-Login-With-an-Individual-QR-Code), [school FAQ](https://www.rcboe.org//cms/lib/GA01903614/Centricity/Domain/1746/Class%20Dojo%20StudentAccountFAQ.pdf)
- Khan Academy: child accounts are reset by the parent from the parent account; a community thread shows the remaining pain point is forgetting the login email/username of the child. Teacher-managed students with email use "Forgot password". — [Khan Academy help: reset child's password](https://support.khanacademy.org/hc/ka/articles/202260314-How-do-I-reset-my-child-s-password), [community thread](https://support.khanacademy.org/hc/es/community/posts/31312530059021-Accessing-child-account), [teacher quick start](https://support.khanacademy.org/hc/en-us/articles/360031102971)
- Google Workspace for Education delegated teacher reset: only a third-party Marketplace add-on (last updated Nov 2021) was found; reviewers note no per-OU granularity. Official Google admin docs were not retrieved. — [Marketplace add-on](https://workspace.google.com/marketplace/app/password_manager/518171919243)
- Kahoot and Duolingo for Schools: not covered by search results.

### Inferences
- The universal pattern is delegated reset by someone who already knows the child (teacher/parent). This product has no teachers in the loop (admins only), so the equivalent is a gap: admins do not know the learners.
- Platforms that skip memorised passwords for young children (QR, text code, picture) are solving the same problem; a printed/QR "login card" is the closest no-PII analogue.
- Scratch and ClassDojo show a second-order risk: reset links go to whoever's email is on file; here there is no email, so the reset channel must be admin-mediated.

### Gaps
- No published lockout/abandonment/support-ticket rates for children or classroom products found. Do not cite any figure.
- Google Classroom/Workspace admin reset docs, Kahoot, Duolingo for Schools mechanisms not verified.

## 2. Low-privacy-cost mitigations

### Takeaway
Best fit for a no-PII beta: one-time recovery codes (a) plus an admin-issued reset bound to the same account (c) and a printable login card (e). Passkeys (b) are a good adult/older-child enhancement but not a safe sole credential and are not feasible with Go stdlib alone. Secret questions (f) should be rejected.

### Cited Findings
**(a) Recovery codes**
- NIST SP 800-63B-4 sec 3.1.2 "look-up secrets": at least 6 decimal digits or equivalent, generated by an approved RNG; single-use; must be stored hashed; secrets under 112 bits must be salted (salt >= 32 bits) and hashed with a suitable password hashing scheme and rate-limited; delivery must be secure. No specified number of codes. — [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)
- OWASP: after a suspected compromise, rely on previously established evidence such as saved recovery codes rather than recently changed recovery data; invalidate sessions and outstanding reset codes after recovery. — [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- Usability: in a 2024 study (281 users of an E2EE email service plus 197 Reddit posts), most participants did save the provider's recovery code; password managers were the most common of six storage strategies; confusion about what the code can restore and lost/non-working codes were obstacles. — [Höltervennhoff et al., USENIX Security 2024](https://www.usenix.org/conference/usenixsecurity24/presentation/h%C3%B6ltervennhoff)
- Backup codes (as QR) were judged acceptable for "ordinary" accounts; for high-stakes accounts users preferred trusted-person recovery. — [Stavova et al., WISTP 2016](https://crocs.fi.muni.cz/public/papers/wistp2016)

**(b) Passkeys/WebAuthn**
- Passkeys need support from both the OS/browser and the site; Google Password Manager syncs passkeys across devices on the same Google account; Apple apps default to Apple Passwords. Search found nothing confirming how Google/Apple treat passkeys on child or supervised accounts. — [Descope overview (third party)](https://www.descope.com/blog/post/manage-passkeys-apple-google-microsoft)
- Go: the maintained go-webauthn library appears to depend on fxamacker/cbor (secondhand evidence only); WebAuthn verification needs CBOR, COSE key parsing and attestation handling, none of which are in the Go standard library. — [fxamacker/webauthn](https://pkg.go.dev/github.com/fxamacker/webauthn), [go-ruby-webauthn wrapper description](https://pkg.go.dev/github.com/go-ruby-webauthn/webauthn)

**(f) Secret questions / KBA**
- NIST 800-63B-4 sec 3.1.1.2: verifiers must not prompt subscribers to use KBA or security questions when choosing passwords. — [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)
- OWASP: security questions should not be the sole reset mechanism because answers are guessable. — [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- Hints visible to unauthenticated claimants are prohibited (NIST 3.1.1) — relevant to any "password hint" idea. — [NIST](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)

**(c)-(e), (g), (h)**: platform precedent for (c)/(d)/(e) is in section 1 (teacher reset, Seesaw/ClassDojo QR/text codes). No sources found specifically on remember-me tokens as recovery.

### Inferences (design analysis, not sourced facts)
- (a) 8 to 10 single-use codes is a common industry pattern but NIST sets no number; for this app 1 to 3 codes is probably enough and less to lose. Use >=112-bit random codes if you want to skip salted slow hashing, otherwise hash with the same scheme as passwords; for children a pronounceable 3 to 4 word or grouped format (e.g. 4x4 characters, no 0/O/1/l) reduces transcription errors. A recovery code resets the password only; it must not log in directly, to keep it a recovery factor.
- (b) Passkeys: synced passkeys give recovery via the platform account, but a child on a shared school device may have no personal platform account; device-bound keys on shared devices are tied to the wrong person. Treat as optional add-on, not for beta. Verify browser support as of Nov 2026 directly (not researched). Stdlib-only verification is not realistic; with "none" attestation you still need CBOR and COSE ES256/RS256 parsing, which is a few hundred lines but security-sensitive; prefer the vetted library if a dependency is acceptable.
- (c) Re-invite-and-migrate: an admin generates a new one-time link bound to the same account ID that sets a new password; no data is lost if progress is server-side, but progress is browser local storage only, so a new device/browser means progress is lost regardless of password recovery. This is the bigger cost than the password itself.
- (d) Delegated teacher role: contradicts the stated model (admins only); worth a later "class group" feature, since every comparable platform has it.
- (e) Login card/QR: a printable or downloadable card (username + password or recovery code) fits classrooms and mirrors Code.org/ClassDojo; risk is a plaintext password on paper; shoulder-surfing is lower-risk than forgotten login for children.
- (g) Remember-me: long-lived device token reduces how often the password is needed, so forgotten passwords surface later; on shared devices it creates a risk of the next child entering the account. Use only on explicit opt-in, "this is my own device".
- (h) Fresh invite and lose progress: acceptable for a beta with up to 1,000 accounts if the warning is honest, but it orphans a username; admins need a way to retire the old account.

### Gaps
- NIST 800-63B-4 section 4.2 (account recovery wording, "saved/issued recovery codes", notification rules) not read.
- WebAuthn Level 3 status, Nov 2026 browser support, and Go dependency list of go-webauthn not verified against primary sources.
- No evidence on child behaviour with recovery codes specifically.

## 3. Preventing admin-assisted reset becoming a social-engineering hole

### Takeaway
With only a pseudonymous username there is nothing to verify identity against, so the safe design is to make the admin reset a re-issue that proves nothing about identity, limit what it can grant, and add proof factors that exist without PII (a previously issued recovery code, a link delivered through the organisation's own channel).

### Cited Findings
- OWASP: a recovery path must always exist, even via support proving identity; use uniform responses for existing/non-existing accounts, rate-limit reset requests, do not lock accounts on forgotten-password attacks; after recovery invalidate sessions and outstanding reset tokens and notify via registered channels. Reset tokens: CSPRNG, single-use, expiring, bound to the user, stored hashed. — [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- Code.org restricts email-based reset links for out-of-section students to verified teachers; Seesaw/ClassDojo/Scratch tie reset authority to the teacher who owns the class. — see section 1 links.

### Inferences
- Proof options without PII: (1) the requester quotes the username plus the activation/invite batch or class code that the cohort lead received out of band; (2) the organisation contact (not the child) makes the request, from a known organisation address; (3) a recovery code, if saved; (4) a challenge only the legitimate learner can answer from inside the app, e.g. an account-specific token printed on the login card.
- Controls: reset issues a single-use, short-expiry link (not a chosen password shown to the admin, so admins never know the learner's password); log admin, time and account; rate-limit per admin; force sign-out of existing sessions; show the learner a visible "your password was reset on <date>" notice at next login; a reset must not extend account expiry; consider two-person approval for accounts flagged as sensitive.
- Because progress is only in local storage, a hijacker gets no server-held learner data except what the account exposes; quantify what an attacker gains (profile, any AI-tutor history stored server-side) before deciding how strict to be.

### Gaps
- No documented incidents or sources found on social-engineering of education-platform support resets.

## 4. Warning and UX: getting people to save credentials

### Takeaway
Evidence is thin and mostly from recovery-code and sync-key contexts. Best-supported patterns: make saving a required step with a verification action (1Password type-it-back), offer password-manager/download/print/copy options, and explain precisely what is and is not recoverable.

### Cited Findings
- Most users of an E2EE service did save recovery codes; password managers most common; misconceptions about what the provider can restore were a main obstacle. — [USENIX Security 2024](https://www.usenix.org/conference/usenixsecurity24/presentation/h%C3%B6ltervennhoff)
- 1Password makes users type the recovery code back before setup completes; a lost code can only be replaced by generating a new one. — [1Password Community](https://www.1password.community/1password-at-home-31/improve-the-recovery-code-backup-process-20720)
- Opt-in Signal PIN reminders went unconfirmed by about a quarter of surveyed participants; mandatory reminders may work better but may annoy. — [SoK: Web Authentication in the Age of E2EE](https://arxiv.org/pdf/2406.18226)
- An old Mozilla Sync bug thread (anecdotal) argues that showing a key during setup scared users without making them write it down. — [Mozilla Bugzilla 727832](https://bugzilla.mozilla.org/show_bug.cgi?id=727832)
- NIST: password hints visible to unauthenticated users are prohibited. — [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)

### Inferences (proposed wording; not user-tested)
Child-facing (aim for about reading age 8 to 9, short sentences, one idea per screen):
> "Keep your secret key safe. This is the only way to get back in if you forget your password. Nobody can look it up for you. Ask a grown-up to help you write it down or take a picture. Then type it here to show you saved it."
Adult/teen:
> "Save your recovery code now. We don't keep your email or phone, so we can't recover this account if you lose both your password and this code. If you do, an administrator can give you a new sign-in link, but your progress on this device may be lost. [Copy] [Download] [Print]. Type the first and last group to continue."
- Behaviours to use: required typed confirmation of part of the code (not a checkbox); Copy/Download/Print buttons and a note that password managers can store it; shown once after sign-up, then offer "regenerate" from Settings; allow screenshot (phones are how many children will save it) rather than discouraging it, with a note to keep it private; avoid "your account will be deleted" fear wording.
- Plain-language tips: say "forget" and "sign in", avoid "credentials" and "recover"; put the consequence in the first sentence; keep to one decision per screen for children; test with a few 8 to 10 year olds.

### Gaps
- No controlled study found on forced acknowledgement, download/print buttons or screenshot behaviour; no reading-level study sourced (do not cite a grade level as evidence).
- Common Sense / UK ICO Children's Code guidance on authentication not retrieved.

## 5. Recommendation (ranked for the beta)

### Takeaway
Adopt (1) a single-use recovery code with typed confirmation, (2) an admin-issued single-use reset link with logging and a visible notice, (3) a printable/downloadable login card; add honest warning copy. Defer passkeys, teacher role, remember-me; reject secret questions.

### Inferences (effort and impact are my estimates)
1. Recovery code at sign-up, hashed, resets password only, regenerable in Settings. Effort: small to medium. Impact: high; no PII; NIST-aligned.
2. Admin reset as a single-use expiring link (never reveal or choose the learner's password), audited, rate-limited, sessions revoked, learner notified at next login; out-of-band proof via cohort/organisation contact. Effort: small (admin tool already exists; change from password issue to link). Impact: high; removes admin-knows-password risk.
3. Login card (print/download/QR of username plus recovery code; never the password). Effort: small. Impact: medium to high for classrooms.
4. Warning copy as in section 4, with typed confirmation. Effort: small. Impact: high.
5. Defer: passkeys as an optional second credential after beta (medium to large effort; dependency decision), delegated group/teacher reset role (medium), opt-in remember-me (small, shared-device risk).
6. Reject: secret questions/hints (NIST, OWASP).
Fallback (h): fresh invite and orphaned account is acceptable only as the last resort and must be stated in the warning.

### Other risks and improvements noticed
- Progress held only in browser local storage means losing the device/browser or clearing site data loses progress even with a perfect password recovery; on shared school devices it can also expose one child's progress to another. Consider server-side progress or an export/import file, and say so in the warning.
- Accounts expire after 2 months: an expired and a forgotten account look the same to a child; make the expiry message distinct and tell them who extends it.
- A 15-character minimum for single-factor passwords (NIST 800-63B-4) is hard for children; consider passphrase generation (three random words) offered by default, with a blocklist check, rather than composition rules (which NIST prohibits). — [NIST](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)
- Uniform responses and rate limiting on sign-in and username existence checks prevent username enumeration of children's pseudonyms. — [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- Legal: under-13 and under-16 consent rules (COPPA, GDPR-K, UK Children's Code) were not researched; no-PII design helps but confirm with counsel.

### Gaps
- Items marked "not researched" or "not verified" above need follow-up before they appear in a final report.
