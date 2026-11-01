# Alternatives and complements to username+password sign-in for classroom and children's web apps (research as of 2 Nov 2026)

Method note: about 15 tool calls. Several primary pages (Code.org and Seesaw help centres) returned HTTP 403 on direct fetch, so those facts come from search-result excerpts of the primary pages. Several topics were NOT verified from primary sources (WebAuthn browser tables, FIDO/NCSC/CISA child guidance, Google "Sign in with QR", Scratch, Nearpod, Padlet, Microsoft/ClassLink details). They are listed under Gaps rather than asserted. Publication dates are given where the source showed them; many help-centre pages are undated.

## 1. Catalogue and comparison of sign-in options

### Takeaway
Products built for classes mostly avoid learner-chosen passwords for young children. They use teacher-generated credentials (picture passwords and secret words, QR badges, class codes) or no account at all (join code plus nickname). All of these keep the teacher or admin in the recovery loop, which fits an invite-only beta with group admins and no email.

### Cited Findings
- Code.org: teacher-managed "picture password" and "secret word" sections. Picture passwords are suggested for roughly ages 4-8 and secret words for ages 9-12. Code.org generates the credentials, and a secret-word login is a randomly generated word pair per student. Teachers can view and reset them on the Roster page, and can print login cards or download a CSV. Students enter a 6-letter section code, pick their name, then click their picture or type their words. Teachers tell students not to share their picture or words with classmates. — [Code.org Picture Password or Secret Word Sections](https://support.code.org/hc/en-us/articles/22047054952973) (snippet only; page returned 403), [Code.org forum](https://forum.code.org/t/passwords-word-vs-pictorial/21310)
- Seesaw: several student sign-in methods. A class QR code or 6-digit text code is used at school, and the class QR code keeps students signed in for up to a year or until the class is archived. Individual "Home Learning Codes" (16 digits per Seesaw's own page, though one district guide says 12) are for use at home, and students see only work tagged to them. The QR must be scanned with Seesaw's built-in scanner. Email/SSO classes need a join code once, then email/password. — [Seesaw Codes](https://help.seesaw.me/hc/en-us/articles/4424230271501-Seesaw-Codes), [Seesaw QR troubleshooting](https://help.seesaw.me/hc/en-gb/articles/204626715-Troubleshooting-your-Class-QR-Code) (via search excerpts)
- Clever Badges: a QR badge shown to the device webcam instead of typing credentials. Districts describe it as for the youngest students, with the age range varying by district (PreK-1, PreK-2, TK-2, pre-k to 3). Teachers print or generate the badges. If a badge fails, a teacher can generate a one-time backup login code. San Diego Unified says badges work only for the Clever portal and not for Chromebook device login, while SFUSD says they can sign into Chromebooks. A Kentucky district notes students may need to sign out of the Chromebook at the end of a session or the badge screen may not appear. I found no official Clever help-centre page, only district pages. — [San Diego Unified badge page](https://www.itd.sandiegounified.org/it_resources/clever_portal_information/clever_badges), [SFUSD](https://help.sfusd.edu/hc/en-us/articles/360007837974), [Fayette KY](https://sites.google.com/fayette.kyschools.us/ecurriculum-support/home/other/clever)
- ClassDojo: students log in via dojo.me using an individual or class QR code. The teacher chooses the student login method in class settings (QR, text code, Google sign-in). A lost code is replaced by the teacher. Parents can pull up the child's QR from their parent account. — [ClassDojo help: students can log in with an individual QR code](https://help.classdojo.com/hc/en-us/articles/360023367251-How-Students-Can-Login-With-an-Individual-QR-Code), [How students log into ClassDojo](https://help.classdojo.com/hc/en-us/articles/115004688443-How-Students-can-Log-into-ClassDojo)
- Kahoot: players join by PIN with only a nickname. Kahoot's teacher trust page says students can join without creating accounts and that only data needed to run learning is collected. Nickname generator and moderation tools exist to handle inappropriate names. — [Kahoot trust centre: for teachers](https://trust.kahoot.com/teachers/)
- Blooket: join by code plus nickname. Accounts are needed only for stats, homework mode and so on. This comes from third-party guides and I could not confirm it from Blooket's own pages (unverified). — [ScreenWise guide](https://screenwiseapp.com/guides/parents-guide-to-blooket) (third party)
- Graphical passwords and children: Assal, Imran and Chiasson (Carleton, arXiv, 31 Oct 2016) tested three PassTiles variants with children and adults. Children recalled best when the images were distinct objects, both groups preferred graphical to their existing schemes, and memorisation strategies differ between children and adults. Sample sizes were not visible in the abstract. — [arXiv 1610.09743](https://arxiv.org/abs/1610.09743)
- KidsPic (Ratakonda, Mehrpouyan and Fails, Boise State, International Journal of Child-Computer Interaction, 2022): 40 children aged 6-11 had significantly more memorability problems with alphanumeric passwords than with a pick-a-picture-sequence scheme. — [Boise State listing](https://experts.boisestate.edu/en/publications/pictures-are-easier-to-remember-than-spellings-designing-and-eval/) (via search summary)
- KidzPass (Renaud, Volkamer, Mayer and Grimm, AIS Transactions on Human-Computer Interaction, 2021): a configurable graphical framework tested with 4-7 year olds, who mostly preferred it to text passwords. Personalised images maximise memorability but take a long time to obtain. — [KIT repository](https://publikationen.bibliothek.kit.edu/1000144473) (via search summary)
- Passkeys on shared devices: a vendor blog argues passkeys fit poorly on kiosks and shared terminals because a passkey must belong to someone, and that device-bound passkeys do not help on a library or shared computer. Synced passkeys depend on a platform cloud account (Apple, Google, Microsoft). Recovery after device loss is the main risk. These are opinion and vendor sources. — [MojoAuth](https://mojoauth.com/blog/when-passkeys-are-the-wrong-answer-kiosks-shared-devices-frontline-workers.md), [EdTech Magazine, 28 Feb 2025](https://edtechmagazine.com/k12/article/2025/02/are-passkeys-right-your-k-12-schools)
- Go and WebAuthn: no WebAuthn in the Go standard library. Third-party options exist (go-webauthn, small pure-Go libraries such as passkey-go that handle CBOR, COSE and authData parsing for ES256 only). Pitfalls: ES256 signatures are ASN.1 DER, and synced passkeys report signCount 0, so a strict increasing-counter check locks out real users. — [DEV: passkey-go](https://dev.to/aethiopicuschan/passkey-go-webauthnpasskey-assertion-verification-in-pure-go-3219), [pkg.go.dev webauthncose](https://pkg.go.dev/github.com/gmulhearn/webauthn/protocol/webauthncose) (secondary sources)
- UK NCSC direction (via school-focused secondary sources): longer memorable passphrases rather than short complex passwords, no forced periodic changes, passkeys preferred where supported. I found no NCSC page specific to primary-age pupils. — [gov.uk schools cyber security standard](https://Www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/cyber-security-standards-for-schools-and-colleges) (points to NCSC material)
- Password education should be age appropriate (Renaud and Prior, 2020), and a 2025 Scottish study (Lamond et al.) found primary cybersecurity teaching centres on passwords. I did not read either paper in full. — [Strathprints](https://strathprints.strath.ac.uk/82713/1/Renaud_Prior_TC_2020_Password_education_should_be_age_appropriate.pdf), [Lamond et al. 2025](https://strathprints.strath.ac.uk/93943)

Comparison (my synthesis from the above; the ratings are judgement, not measured):

| Option | Child usability | Shared device | PII needed | Recovery without email | Go stdlib effort |
|---|---|---|---|---|---|
| 1 Learner-chosen user+pass | Weak under about 10 (see memorability studies) | Poor: browser save-password prompts, forgotten passwords | None if username is a pseudonym | Admin reset only | Low (bcrypt/argon2 is x/crypto, not stdlib; stdlib has only HMAC/SHA/scrypt-free primitives) |
| 2 Generated passphrase / picture / secret words | Good (Code.org model) | Good; printable cards | None | Admin re-issue | Low-medium |
| 3 Class code + name picker (+ secret) | Very good | Very good | Needs a roster label; use nicknames or avatars, not real names | Admin | Low |
| 4 QR badge / login card | Very good, needs a camera or typed fallback code | Good, but badge theft or shoulder surfing | None | Admin reprints | Low (QR image generation needs a library or client-side JS; the token is just a random string) |
| 5 Teacher-delivered magic link / OTP | Good | Good | None | Admin issues | Low (crypto/rand and a hashed token) |
| 6 Passkeys | Not for under-12s in practice; needs a platform account | Poor on shared machines | None, but ties to a Google/Apple/Microsoft account | Weak | High (needs third-party lib or hand-rolled CBOR/COSE) |
| 7 SSO (Workspace, Entra, Clever, ClassLink) | Good once set up | Good | Yes: name and email from the school | School | High plus onboarding and approvals |
| 8 Guest / local-only | Excellent | Excellent | None | N/A | None |
| 9 Invite plus remember-this-device | Good | Needs a clear "this is a shared computer" choice | None | Admin re-invites | Low-medium |

### Inferences
- Code.org's picture-password and secret-word sections and Seesaw/ClassDojo/Clever QR codes are the nearest precedent for a no-email, teacher-recovery model. The ages Code.org assigns (picture 4-8, words 9-12) map onto the beta's 8 to adult range as: secret words or QR/card for about 8-12, learner-chosen password optional for older learners and adults.
- A system-generated credential removes the password-creation problem (weak and reused passwords) and the need for a password-strength UI.
- Passkeys are an adult or later enhancement. Build cost and shared-machine fit are both poor for the beta.

### Gaps
- No direct fetch of Code.org, Seesaw or Clever official pages (403 or none found), so claims rest on search excerpts and district pages.
- Nearpod, Padlet, Scratch and Google "Sign in with QR" were not researched.
- Sample sizes and ages of the PassTiles study were not retrieved.
- Security of generated secret words (entropy of a two-word pair) was not found in a source. Needs a calculation against the actual wordlist size and a rate limit.

## 2. Evidence by age band and national guidance

### Takeaway
Small studies (tens of participants) consistently show children remember picture or object-based secrets better than text, with the strongest results for ages 4-11. I found no large study for ages 12 and up in this pass, and I did not retrieve NCSC/CISA child-specific guidance.

### Cited Findings
- Ages 6-11: pictures beat alphanumeric on memorability (n=40) — [Boise State](https://experts.boisestate.edu/en/publications/pictures-are-easier-to-remember-than-spellings-designing-and-eval/)
- Ages 4-7: KidzPass preferred over text — [KIT](https://publikationen.bibliothek.kit.edu/1000144473)
- Children recall distinct-object images best — [arXiv](https://arxiv.org/abs/1610.09743)
- Code.org age guidance (4-8 picture, 9-12 secret words) — [Code.org](https://support.code.org/hc/en-us/articles/22047054952973)
- NCSC (via secondary): length over complexity, no forced rotation — [gov.uk standards](https://Www.gov.uk/guidance/meeting-digital-and-technology-standards-in-schools-and-colleges/cyber-security-standards-for-schools-and-colleges)

### Inferences
- For 8-12, generated secret words or picture-plus-name logins have better evidence than child-chosen text passwords. For teens and adults, a chosen passphrase is acceptable.
- Evidence is lab-scale and Western. Nothing found on India-specific, multi-lingual or low-literacy settings.

### Gaps
- No CISA or NCSC child-specific authentication guidance retrieved. No CHI/SOUPS/IDC paper beyond those above. Shoulder-surfing resistance of picture schemes was only mentioned as claimed in the KidsPic dissertation, not verified.

## 3. Shared-device patterns and browser leakage

### Takeaway
Pages cannot reliably stop browsers saving passwords. On a shared lab machine the controls that work are server-side (short sessions, explicit sign-out, not using a password field for the secret) rather than HTML attributes.

### Cited Findings
- A Chromium developer stated in 2013 that Chrome wanted to ignore autocomplete="off" for password fields, mainly because of shared and public computers. — [W3C public-webapps thread, Oct-Dec 2013](https://lists.w3.org/Archives/Public/public-webapps/2013OctDec/1070.html)
- A Stack Overflow thread reports that hiding tricks stopped working as of Aug 2021 and Chrome may prompt even without form submission (discussion, unverified). — [Stack Overflow mirror](https://backiee.wasmer.app/http_stackoverflow_com/questions/27280461/prevent-chrome-from-prompting-to-save-password-from-input-box)
- The reliable lever is the browser or managed policy setting ("Offer to save passwords"), not the page. — same thread; Chrome settings path chrome://password-manager/settings
- Clever Badges: Chromebooks may need explicit sign-out between students or the badge screen does not appear. — [Fayette KY](https://sites.google.com/fayette.kyschools.us/ecurriculum-support/home/other/clever)
- Seesaw class QR keeps a device signed in for up to a year, which is the opposite of shared-device hygiene (they mitigate by teacher control). — [Seesaw](https://help.seesaw.me/hc/en-us/articles/4424230271501-Seesaw-Codes)

### Inferences
- A generated "secret words" credential typed into a plain text input (not type=password, autocomplete off, name not matching password-manager heuristics) reduces save prompts on shared machines, but this is not guaranteed (unverified; test on Chrome, Edge, Safari, Samsung Internet).
- Progress stored only in the browser is itself a shared-device privacy issue: the next child on a lab machine sees the previous child's local data unless sign-out clears it. A visible "clear my progress on this computer" or "shared computer" mode is needed. This should be tested rather than assumed.
- Lab of 30-40 machines: printed cards with QR or short code and a teacher-visible class link scale best. Auto sign-out after inactivity plus a big "I'm done" button is cheap.

### Gaps
- No quantitative study of save-password prompt rates on school Chromebooks. No current Chrome developer documentation fetched.

## 4. Personal data per option and the "no names, emails, phone, DOB" rule

### Takeaway
Options 1-5, 8 and 9 can all be run with no PII if usernames or display names are system-generated or pseudonyms. SSO (7) requires names and emails, and passkeys (6) rely on a platform account, so both conflict with the rule or sit outside the beta's control.

### Cited Findings
- Kahoot says it collects only data needed to run games and does not require student accounts. — [Kahoot](https://trust.kahoot.com/teachers/)
- India DPDP Rules were notified 14 Nov 2025 (per one outlet) and require verifiable parental consent for processing children's (under 18) data, and restrict tracking and behavioural monitoring. Educational institutions have a narrow exemption for tracking strictly needed for educational activities and child safety, with prohibition on behavioural targeting, profiling and monetising. Commentary is by law firms and news outlets and draft versus final wording and rule numbering differ across sources. — [Biometric Update, Nov 2025](https://www.biometricupdate.com/202511/india-notifies-its-sweeping-digital-personal-data-protection-rules), [MediaNama, Nov 2025](https://www.medianama.com/2025/11/223-dpdp-rules-tracking-children-parental-consent/), [Bar & Bench](https://www.barandbench.com/law-firms/view-point/childs-personal-data-and-privacy-analysing-the-draft-dpdp-rules-2025)

### Inferences
- A pseudonymous account (random handle, group label) may still count as personal data under DPDP if it links to a person, and the operator is not a school, so the educational-institution exemption may not apply to it. This needs legal review. It is the single most important compliance question, and I did not resolve it.
- Typed usernames are a leak risk: children may use real names. Generate handles (adjective-animal) or let the admin set the display name.
- The group label should not contain a school or child name.

### Gaps
- Final DPDP Rules text and its treatment of pseudonymous IDs and non-institution operators were not read from the official Gazette.

## 5. Recommendation (ranked, with effort and impact)

### Takeaway
Do not make learner-chosen username+password the only or primary method for under-12s. Make the invite link the entry point, give each learner a system-generated credential (secret words or a short code) delivered by the admin on a printable card or QR, and add a remember-this-device token with a visible shared-computer mode. Keep chosen passwords only as an optional path for older learners.

### Inferences (my judgement; effort estimates are rough)
1. Build now: generated secret-words (two or three words from a curated, child-safe, translated list) or short code as the credential, with generated pseudonymous handle. Admin bulk-creates with group label and prints cards, with a CSV and a typed fallback. Effort low-medium (about 2-4 days). Impact high: removes weak passwords, forgotten passwords, real-name usernames.
2. Build now: QR on the same card that encodes the invite or login token. QR is only a transport for the code, not a new credential. Effort low if the QR is rendered client-side. Impact medium-high for 30-40 machine labs.
3. Build now: remember-this-device token (random 256-bit, stored hashed server-side, httpOnly Secure SameSite cookie, short TTL on shared mode, revocable by admin) plus "this is a shared computer" default for lab sessions: idle sign-out, clear local progress button. Effort medium. Impact high for shared devices.
4. Build now: rate limiting and lockout on code guessing, hash stored secrets, make codes single use for first activation, admin reset and re-issue. Effort low-medium. Required whichever option is chosen, because short child-friendly secrets are low entropy.
5. Optional: keep username+password as a choice for ages 13+/adults and for self-motivated learners, with the generated handle still the default. Effort already spent.
6. Defer: guest local-only mode as a try-before-invite flow (cheap, but progress lost and conflicts with an invite-only beta), passkeys for adults and admins (needs third-party Go library, adds recovery problems), SSO/Clever/ClassLink (requires school contracts, PII, and approvals; out of reach for a beta).
- Direct answer: add a non-password alternative for under-12s now. Do not drop username+password entirely, because adults and older learners are in scope and the code is built.

### Other risks and improvements noticed
- Progress only in the browser: clearing site data, switching browser or using a different lab machine loses it, and for shared machines it leaks between children. Consider small server-side progress keyed to the pseudonymous account, which is itself a data-protection decision.
- Go stdlib has no password hashing function (bcrypt/argon2 are in golang.org/x/crypto). Using x/crypto departs from "stdlib-only"; scrypt is also in x/crypto. Not verified against the repo; check the repo's go.mod.
- Insecure first impression risk: invite links in WhatsApp or school chat can be forwarded or previewed by link scanners that consume a one-time token. Use a confirm button (POST) rather than activating on GET. This is an engineering inference, not sourced.
- Secret words shown on classroom projectors or printed cards: advise per-learner cards in sealed envelopes or teacher-held lists, as Code.org does by teaching students to keep it private.
- DPDP compliance for a children's service is the largest unresolved legal question (see section 4).

### Gaps
- No usability testing evidence for Indian multilingual contexts, no cost data, and no measurement of the recommended flow. The ranking is judgement based on a small set of sources.
