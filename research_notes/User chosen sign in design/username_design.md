# Username design for an invite-only children's learning-app beta (no personal data collected)

Research date: 2026-11-02. Research depth was limited (about 16 tool calls); several primary pages returned HTTP 403 (Roblox help, Khan Academy support, ICO pages) and were seen only via search snippets. Claims are marked accordingly. Items under "Inferences" are my reasoning, not sourced facts.

## 1. Uniqueness and normalisation (case folding, NFKC/NFC, character set, length)

### Takeaway
No standard mandates an ASCII-only alphabet, but the standards' own machinery (RFC 8265, UTS #39) exists to tame Unicode risk, and OWASP says to use allowlists. For a children's app with a 1,000-account cap, the lowest-risk option is a tiny ASCII allowlist, lowercased, with an exact byte match on the canonical form. This is an inference from the sources, not a published recommendation.

### Cited Findings
- RFC 8265 (October 2017, Standards Track, obsoletes RFC 7613) UsernameCaseMapped applies: width mapping, case mapping (lowercase), NFC normalisation, then a directionality rule; comparison is octet-for-octet after enforcement; empty string not allowed. — [RFC 8265](https://www.rfc-editor.org/rfc/rfc8265.html)
- RFC 8265 says CaseMapped is generally preferred over CasePreserved because skipping case mapping can cause false accepts in authentication/authorisation and confuse users. — [RFC 8265](https://www.rfc-editor.org/rfc/rfc8265.html)
- RFC 8265 moved from SASLprep's NFKC to NFC; code points with compatibility equivalents (e.g. long s, roman numeral four), private-use code points, surrogates and symbols are disallowed by the IdentifierClass. — [RFC 8265](https://www.rfc-editor.org/rfc/rfc8265.html)
- RFC 8265 allows "@" in usernames (so email-like strings are valid) and says it gives no detailed confusables guidance; section 8.5 defers to UTS #39 for Unicode code points in usernames. — [RFC 8265](https://www.rfc-editor.org/rfc/rfc8265.html)
- RFC 8265 section 8.1 notes a wide character range must be balanced against difficulty of reproducing characters across devices and input methods. — [RFC 8265](https://www.rfc-editor.org/rfc/rfc8265.html)
- UTS #39 v18.0.0 (revision 34, dated 2026-08-27) defines restriction levels, the first being "ASCII-Only" and the second "Single Script"; identifiers should be limited to Identifier_Status=Allowed characters; ZWJ/ZWNJ restricted to specific contexts. — [UTS #39](https://unicode.org/reports/tr39/)
- OWASP Input Validation Cheat Sheet (current version, undated page): define what you accept and reject the rest (allowlist); define one normalisation policy applied before validation, storage and comparison; "Normalization is not sanitization"; compatibility normalisation can erase meaningful distinctions; enforce length limits; bound input length before regex; use full-match; treat regex timeout as failure. It gives no username-specific rules. — [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- OWASP Authentication Cheat Sheet: User ID's job is unique identification; ideally IDs are randomly generated to avoid predictable/sequential IDs; the page does not give case-insensitivity rules. — [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- OWASP WSTG-IDNT-05 "Weak or Unenforced Username Policy" covers predictable username structures that enable enumeration (summary via search snippet only; page fetch redirected). — [WSTG IDNT-05](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/03-Identity_Management_Testing/05-Testing_for_Weak_or_Unenforced_Username_Policy)
- ChessKid (child platform) restricts custom usernames to 3-20 alphanumeric characters, hyphen/underscore allowed but not first or last, no spaces. (Undated help article.) — [ChessKid help](https://support.chesskid.com/article/4816-usernames-and-custom-usernames)
- Roblox usernames reportedly 3-20 chars, letters/numbers/underscore: only from low-quality SEO pages, not verified against the official page. — unverified, see Gaps.

### Inferences
- With ASCII `[a-z0-9]` plus an optional single separator, there is no NFC/NFKC question, no mixed-script risk, no bidi or invisible-character risk, and UTS #39 "ASCII-Only" level is satisfied by construction. Casefold = ASCII lowercase; compare exact bytes. This is the RFC 8265 CaseMapped result for the ASCII subset, so it is standards-compatible.
- If non-ASCII is ever wanted (e.g. children's names in other scripts are not needed because no real names), apply: reject invalid UTF-8, NFC, lowercase, UTS #39 Identifier_Status=Allowed, single-script (or Highly Restrictive), then a skeleton-collision check across existing accounts. Go: golang.org/x/text/secure/precis implements RFC 8265 (not verified in this session; check before relying on it).
- Pick a uniqueness key = canonical lowercase form, stored in a UNIQUE column; separately store display form only if casing is preserved (recommend not: display = canonical).
- Confusable ASCII pairs still exist (l/1/I, O/0, rn/m, vv/w). Consider also a skeleton-style collision check in ASCII (map 0->o, 1/l->i, etc.) to refuse near-duplicates. This is my design suggestion, not a standard.
- Length: 3-20 is the common pattern seen in child platforms (ChessKid verified); with a generator, 12-24 chars covers adjective+animal+2 digits.

### Gaps
- Official Roblox, Minecraft, Scratch, Seesaw, ABCmouse, Google Classroom username rules were not obtained.
- No IETF text found that specifically recommends ASCII-only for children's apps. The ASCII recommendation is derived.
- Whether golang.org/x/text/secure/precis is current/maintained was not checked.

## 2. Impersonation, homoglyphs, reserved names, invisible characters

### Takeaway
Unicode is the main source of homoglyph and invisible-character problems; an ASCII allowlist removes most of them. Reserved names must be reserved on the canonical (and ideally skeleton) form, since OWASP WSTG tests that unregistered users cannot pick names like admin or moderator.

### Cited Findings
- UTS #39 defines skeletons (NFD, remove Default_Ignorable, map to prototypes); two strings are confusable if skeletons match; mixed-script confusables have no shared script; whole-script confusables (e.g. Latin vs Cyrillic) are flagged, and the spec warns the data flags many legitimate strings so report scripts involved. — [UTS #39](https://unicode.org/reports/tr39/)
- UTS #39 General Security Profile excludes unassigned, private-use, deprecated, default-ignorable and non-NFKC characters. — [UTS #39](https://unicode.org/reports/tr39/)
- RFC 8265 gives the example that treating superscript one as digit one would enable spoofing, and disallows compatibility-equivalent code points. — [RFC 8265](https://www.rfc-editor.org/rfc/rfc8265.html)
- OWASP WSTG IDNT-04: ensure unregistered users cannot select reserved usernames such as admin or moderator (snippet-level). — [WSTG IDNT-04](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/03-Identity_Management_Testing/04-Testing_for_Account_Enumeration_and_Guessable_User_Account)

### Inferences
- Reserve (on lowercase and on skeleton-folded form, and also as prefixes/with digits appended, e.g. admin1, admin-): admin, administrator, root, teacher, tutor, mod, moderator, support, help, staff, system, owner, operator, bot, ai, tester, null, undefined, anonymous, plus the product name and group labels, and any group-label strings.
- Since display of usernames to other learners may be minimal (accounts have only username, group, dates), impersonation matters most in operator/teacher admin views. Render usernames in admin UI as plain text, never as links, and escape for HTML.
- Strip nothing silently: reject disallowed characters (including whitespace and zero-width characters) rather than "cleaning", per OWASP's preference for allowlist-reject over cleaning. Trim only leading/trailing ASCII space before validation, if at all.

### Gaps
- No quantified data on actual impersonation incidents in children's learning apps.

## 3. Filtering: real names, school names, emails, phone numbers, profanity; free text vs generated names

### Takeaway
Children's platforms generally tell kids not to use real names but enforce it with human review or generated names, not detection. Word-list filters cannot reliably detect real names or school names. The strongest control is removing free text: offer a generated or pick-from-lists username. Profanity lists are a secondary safety net with known failure modes.

### Cited Findings
- Khan Academy support: for child accounts "strongly encourage" not using real names or other identifying information in usernames; separate privacy article says avoid real names, nicknames or other identifying info. For under-13 accounts the parent sets the username. (Search snippets of support.khanacademy.org; direct fetch returned 403; applies to main Khan Academy, not Khan Academy Kids.) — [Khan Academy support](https://support.khanacademy.org/hc/en-us/articles/216368447-What-are-the-basic-requirements-for-usernames)
- Scratch: teacher resources and a forum state guidelines prohibit real names, addresses, emails, school names; I did not retrieve Scratch's official text. — [Scratch Discuss](https://scratch.mit.edu/discuss/post/1875908) (secondary; weak)
- ChessKid: kids get computer-generated usernames; any custom username must be approved by staff (approval can take several days); must be suitable for young children. Article does not address personal info rules. (Undated.) — [ChessKid help](https://support.chesskid.com/article/4816-usernames-and-custom-usernames)
- Roblox: policy says do not use your own name or other personal information in your username (via a third-party record of Roblox's privacy policy, not primary). — [ConductAtlas record](https://conductatlas.com/platform/roblox/roblox-privacy-policy/provision/CA-P-049008/do-not-use-personal-information-in-username/)
- Animal Jam reportedly uses adjective+animal style names and discourages personal details (via search summary only; not verified from a primary source). 
- ICO Children's Code data-sharing guidance (via search summary; page returned 403): profile options such as gaming avatars or system-generated usernames can help protect children's identity characteristics; sharing settings off by default. — [ICO data sharing between users](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/how-to-use-our-guidance-for-standard-one-best-interests-of-the-child/best-interests-framework/data-sharing-between-users/)
- ICO Children's Code data minimisation: collect and retain only the minimum personal data needed for elements the child is actively and knowingly engaged in; do not use nudge techniques to lead children to provide unnecessary personal data. Code in force 2 September 2020, transition ended 2 September 2021. — [ICO data minimisation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/8-data-minimisation/); [Simmons & Simmons](https://www.simmons-simmons.com/en/publications/ckgs2ty6aadwl0a43e3avb7r3/ico-s-age-appropriate-design-code-comes-into-force)
- ICO 2019 draft code reportedly said to avoid collecting real-world identifiers where possible, using avatars and usernames; unconfirmed whether the final text keeps the wording. — [ESRB blog summary](https://www.esrb.org/privacy-certified-blog/the-icos-age-appropriate-design-code-default-settings-and-data-minimization/)
- Scunthorpe problem: AOL's 1996 filter blocked residents of Scunthorpe, Penistone, Lightwater, Middlesex; fixes include whitelists of known false positives; context-aware understanding is hard. — [Wikipedia](https://en.wikipedia.org/wiki/Scunthorpe_problem)
- A word-list filter library's documentation says any word-list profanity filter will fail as users obfuscate input and should be a first pass, not a replacement for human moderation. — [ProfanityDetector (via ecosyste.ms)](https://awesome.ecosyste.ms/projects/github.com%2Fstephenhaunts%2Fprofanitydetector)
- FTC amended COPPA Rule published in Federal Register 22 April 2025; one year to comply with provisions lacking an earlier date; adds biometric and government-ID examples to personal information; persistent identifiers used for internal operations require disclosure. — [Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/ftc-publishes-final-coppa-rule-amendments)

### Inferences
- Real names, school names, emails and phone numbers cannot be reliably detected in free text: names are open-ended, and any allowed pattern can encode them (jsmith2014, mrsjonesclass). Cheap partial checks: reject any digit run of 5+ digits (phone-like), reject strings containing "@" or "." (already excluded by alphabet), reject strings matching a list of local school/town names and the group labels. These catch careless cases only.
- Therefore the key privacy control is not to offer free text, or to offer constrained choice: pick adjective + animal (+ 2 digits) from curated lists, or pick two words from curated lists. Curated lists of a few hundred words each give tens of thousands of combinations, far above the 1,000 cap, no profanity filter needed if the lists are vetted once by a human (including checking all concatenations for accidental words and cross-language homographs, e.g. substrings across word boundaries).
- Free text for adults only is a possible compromise but creates two classes and cannot be verified without collecting age; the spec forbids DOB. Recommend generated names for all, with a "shuffle" button; optionally allow a limited custom suffix from a preset (colour/number/emoji-less).
- If free text is nevertheless allowed: use a denylist applied to the canonical form with leetspeak folding (0->o, 1->i/l, 3->e, 4->a, 5->s, 7->t, $->s), repeated-character collapse, and substring matching for long unambiguous terms only, whole-word/exact match for short ones, plus an allowlist for known false positives (the Scunthorpe fix). Accept residual failure; add an operator review queue/ability to rename or disable a learner. Multilingual lists needed if the cohort is multilingual.
- COPPA relevance (US): a username that works like online contact information is a risk; ours has no messaging, so the risk appears low, but a legal check is needed; I did not verify the final COPPA text on screen/user names (see Gaps). Note COPPA applies to under-13; the app targets about 8+.
- The username should never be shown to other learners unless a feature needs it (ICO: sharing off by default). With no social features, the privacy exposure of a username is small.

### Gaps
- Official primary pages for Roblox, Minecraft, Scratch, Seesaw, ABCmouse, Google Classroom, Khan Academy Kids username policies were not retrieved (403s or SEO noise). Google Classroom and Seesaw typically use teacher-provisioned accounts, which is unverified here.
- No peer-reviewed or regulator evidence found that generated names are safer than free text; supporting evidence is product practice (ChessKid, Animal Jam) and the ICO suggestion via search summary.
- No detailed technical source on leetspeak normalisation for profanity filters was found.
- Final COPPA 16 CFR 312.2 wording on "screen or user name" and "online contact information" was not verified.
- Final ICO text on usernames could not be fetched directly.

## 4. Account enumeration: sign-up "username taken" oracle, sign-in errors, rate limiting

### Takeaway
Sign-in must return one generic message with identical status, body and timing for unknown user, wrong password, and disabled account. A "username taken" response at sign-up is an unavoidable oracle when the user picks the name, which is another reason to use server-generated or server-offered names and to gate sign-up behind a single-use invite token and per-token/per-IP rate limits.

### Cited Findings
- OWASP Authentication Cheat Sheet: login must give a generic error regardless of whether the user ID or password is wrong, the account does not exist, or it is locked/disabled (e.g. "Login failed; Invalid user ID or password."). — [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- Same page: for registration, "This user ID is already in use." is the incorrect example; correct example relies on emailing a link ("A link to activate your account has been emailed to the address provided."), which only works where email exists. — [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- Same page: HTTP status codes and response timing can leak account state; run the same steps (including password hashing) for every attempt. — [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- Same page: track failed-login counters per account rather than only per IP; exponential lockout is an option; lockout can enable denial of service; CAPTCHA is defence-in-depth and best shown after a few failures. — [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- OWASP WSTG IDNT-04: same message and response length for incorrect requests; compare error text, length, titles and timing. — [WSTG IDNT-04](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/03-Identity_Management_Testing/04-Testing_for_Account_Enumeration_and_Guessable_User_Account)
- NIST SP 800-63B (as shown on the 63-4 page, dated 26 Aug 2025; read only the first ~100k of ~289k characters): verifiers SHALL limit consecutive failed attempts on a single account to no more than 100 (upper bound; lower limits allowed); optional mitigations include bot-detection challenges and increasing delays; single-factor passwords minimum 15 characters, SHOULD allow at least 64 characters, SHALL NOT impose composition rules, SHALL NOT require periodic change; passwords must be checked against a blocklist of commonly used/compromised values; context-specific words including the username and derivatives must be in the blocklist. — [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)
- NIST: if the subscriber cannot authenticate, Sec. 4.2 recovery SHALL be used; recovery codes are a described mechanism (Sec 4.2 text not read). — [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)

### Inferences
- Because the invite link is single use, the "taken" oracle can only be probed by someone holding a valid invite, and each invite allows few attempts. Bind attempts to the invite token: for example, max 5 name checks per token, then require the server to offer fresh suggestions. Also limit per IP. Taken-name disclosure then leaks at most a handful of names per invite, and the cap is 1,000 accounts.
- Best design: do not let the user probe at all. The server returns N (say 5) freshly generated available names; the client picks one; the server reserves it for a short time bound to the invite; the final submit is atomic with a UNIQUE constraint and, on a collision, returns new suggestions. No "is X taken?" endpoint.
- If free text is allowed, return the same response shape for "taken" and "not allowed" (generic "choose another name") to avoid leaking whether a name exists versus is filtered or reserved; accept that the existence of a taken name is still inferable via submit.
- Sign-in: do a dummy hash comparison for unknown usernames; same status code (e.g. 401) and JSON body; uniform artificial delay is optional if hashing dominates. Apply rate limits per username and per IP with generic responses; consider returning the same generic error while locked. Set a lockout that expires (the NIST 100 cap is an upper bound; choose far lower, e.g. 5-10 with exponential backoff, mindful of children mistyping and shared school IPs).
- A short username space makes enumeration easy by guessing (adjective-animal lists are public if the code is). For a 1,000-account closed beta the result is that a valid username is guessable by a determined attacker, so protect with password strength and rate limiting, not secrecy of usernames. Consider treating the generated name as non-secret and the password as the only secret.

### Gaps
- NIST 63B-4 text on recovery (Sec. 4.2) and on any enumeration language was not read (truncated fetch). A claim that NIST has no enumeration requirement is NOT established.
- OWASP Forgot Password Cheat Sheet was not fetched.

## 5. Recommendation and other risks

### Takeaway
Recommended policy: server-generated names only (or choose from five generated suggestions, with reroll), ASCII lowercase letters and digits with hyphen separators, no free text in v1. Combine with single-use invite tokens, rate limits, and a password policy aligned with NIST. This follows from the evidence above but is my synthesis; no source mandates it.

### Cited Findings
- (Evidence for each element is cited in sections 1-4 above; no new sources here.) Key supports: ICO suggests system-generated usernames protect identity [ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/how-to-use-our-guidance-for-standard-one-best-interests-of-the-child/best-interests-framework/data-sharing-between-users/) (via summary); ChessKid assigns generated names by default and moderates custom ones [ChessKid](https://support.chesskid.com/article/4816-usernames-and-custom-usernames); OWASP prefers allowlists and generic errors [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html); NIST 63B-4 allows long passwords and prohibits composition rules [NIST](https://pages.nist.gov/800-63-4/sp800-63b.html).

### Inferences
Concrete policy (all my proposal):
1. Charset: `[a-z0-9]` plus `-` as a single internal separator; regex `^[a-z0-9]+(-[a-z0-9]+)*$` (linear, no catastrophic backtracking), length 3-24 after canonicalisation; reject, never clean. Check length before regex.
2. Canonical form: lowercase ASCII; stored in a UNIQUE column; compared by exact byte match; display equals canonical. Reject any non-ASCII byte and any control character at the door (so no NFC/NFKC code in v1).
3. Generator: curated adjectives (about 200) and animals/objects (about 200), 4-8 letters each, hand-reviewed in English (and any cohort language); digits 10-99 appended; show 5 options with "more"; server picks options with crypto/rand and pre-checks availability, no username-availability endpoint; reserve chosen name against the invite token for about 10 minutes.
4. Filters on the generator output only: reserved-name list, skeleton collision check, a profanity/denylist check on the concatenated string with leetspeak folding as a safety net, and a quick manual review of the word lists (the Scunthorpe issue arises mostly from substring matching across the concatenation).
5. Free text: not in v1. If product demands it, restrict to adults only is not verifiable (no DOB); instead allow a "personalised suffix" chosen from a list. Otherwise use the full filter stack in section 3 plus operator rename/disable.
6. Don't display usernames to other learners; if a leaderboard exists, use a separate generated alias or only the group label.
7. Errors: single generic sign-in error; same status/body/timing; per-account and per-IP limits; invite token attempt limits; sign-up "name no longer available, here are new options".
8. Password: min 8 (children) to 15 (NIST single-factor requirement for 63B-4 is 15; this app is not necessarily under NIST scope; weigh usability for 8-year-olds), allow 64+, no composition rules, blocklist common passwords and the username and derivatives; hash with argon2id or bcrypt (Go stdlib lacks them; x/crypto needed, which breaks a strict "stdlib only" posture, scrypt is also in x/crypto).

Other risks and improvements noticed (my analysis, unsourced beyond above):
- No email means no recovery: offer one-time recovery codes shown once at sign-up (NIST describes recovery codes) or operator-issued reset by a new invite link tied to the same account. Operator reset must not rely on user-supplied identity claims; a child may be socially engineered. Document how the operator verifies who is asking, without collecting personal data.
- Invite link security: 128-bit random token, single use, expiry, hash the token at rest, send over HTTPS, do not put it in logs or Referer (use Referrer-Policy: no-referrer, strip from URL after load), invalidate on use atomically (race: two submits). Links are bearer secrets and may be forwarded, so a forwarded link allows anyone to claim the seat.
- Group label is a quasi-identifier; with 1,000 accounts and small groups, username plus group plus dates could identify a child to the operator. Keep group labels non-identifying (not class or school names) and keep dates coarse if not needed.
- Logs and analytics: IP addresses and user agents are personal data under UK GDPR; the "no personal data" claim should be checked against server logs, rate-limiter state and the backend reverse proxy.
- Cap of 1,000: enforce in the same transaction as insert; protects against invite-farming; ensure the cap errors are generic.
- Shared devices (school/home): do not persist sessions long; session cookie HttpOnly, SameSite, Secure; offer sign-out; avoid password managers autofill leaking generated names.
- Typing difficulty for young children: hyphens and digits are error-prone; consider no digits but 3 words, or show the name big with a printable card. Don't use confusable ASCII (l/1/I, O/0) in digits suffix: avoid 0 and 1 in the suffix.
- Legal: UK ICO Children's Code, COPPA (US, if under-13 US children), GDPR-K; a username that is a persistent identifier tied to a child is personal data under GDPR even without a name. The spec's claim that no personal data is collected should say "no direct identifiers" and plan for DPIA-light assessment (not verified legal advice).
- Suggestion feature: the account for under-13 in the US may need parental consent under COPPA if any personal information is collected; I did not verify whether a username plus password hash alone qualifies; get legal confirmation.

### Gaps
- Legal analysis not verified against primary texts (COPPA final rule, UK GDPR, ICO standards beyond summaries).
- Did not evaluate Go library choices or run tests.
