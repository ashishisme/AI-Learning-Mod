# Feature Specification: Cloud Beta Deployment (Invite-Only Hosted Beta)

**Feature Branch**: `cloud-beta`

**Created**: 2026-11-01

**Status**: Draft (clarified 2026-11-01)

**Input**: User description: "Create spec for cloud deployment" — the first hosted beta of AI Foundations Coach, incorporating the corrected findings of the external architecture & security review (R1–R14) and the code-level verification performed on 2026-11-01.

**Relationship to other specs**: `specs/007-cloud-deployment-strategies/` remains the long-range strategy and cost document. This spec defines what must be true for the **first hosted beta** to go live.

## Clarifications

### Session 2026-11-01

- Q: Daily AI spend ceiling? → A: **US \$1.00 per day**, shared across all instances.
- Q: AI tutor for children in the hosted beta? → A: **Option C**: the tutor is **disabled for all beta users** until a parental-consent / school-onboarding process exists.
- Q: Who can access the beta? → A: **Invite-only, capped at 1,000 users.** Admins generate invite links. Opening a link activates an account and issues a fixed (system-generated) password. Each activated account **expires 2 months after activation** and can be extended by admins.

### Session 2026-11-01 (admin console, owner request)

- Q: What must the admin console cover? → A: **One console** to monitor usage, see cloud costs, see who is accessing the app, and **read feedback** sent from the app. Learners can send feedback from inside the app.
- Q: Which cloud costs can the app show on its own? → A: AI spend is measured by the app itself. Hosting and data-store costs come from the cloud billing source and are shown only when that source is connected; otherwise the console says "not connected" and never shows an invented figure.
- Q: Does feedback identify the learner? → A: **No.** Feedback carries only the group label, lesson, audience mode, app version and time (no Beta ID, address or device details), and its text is checked twice for personal details (a rule check, then an AI auditor, see the 2026-11-02 clarifications) before an admin can read it. This needs a second constitution amendment (DC-09 allows no learner-written text today); see `constitution-amendment-proposal.md`.

### Session 2026-11-02 (beta-phase credential and feedback decisions, owner)

These decisions apply **only to the beta testing phase** and are reconsidered afterwards.

- Q: Do learners choose their own username or password? → A: **No.** The system generates the username (the Beta ID) and the password. There is no manual selection. The password is sent to the browser **once**, at activation, and the learner must copy it then. (The sign-in research report suggested a name picker, an own-password path and recovery codes; none are adopted for the beta.)
- Q: How is personal data kept out of feedback? → A: **Two automatic checks.** First, a deterministic rule check rejects any message containing phone numbers, emails, addresses or similar before anything is stored. Second, an AI auditor reviews each stored message before any admin can read it. Nothing reaches an admin without passing both.
- Q: When does the AI auditor run? → A: **Only when feedback is received.** No feedback means no AI call and no AI cost.

### Session 2026-11-03 (owner rulings on open items T126, T127, T129, T132, T120/T121/T134)

- Q: May a learner's own local AI show the tutor panel while the hosted tutor is off (T126)? → A: **Yes.** The panel is always shown on lessons and is greyed out, pointing to Settings, until a local AI is set up. FR-024 amended.
- Q: Admin sign-in with MFA (T127)? → A: **Not yet.** Admin sign-in stays a personal Google account on the External/Testing consent screen with named test users for the beta; MFA (`OIDC_REQUIRE_MFA`) is deferred and revisited before the beta widens.
- Q: Region for the staging beta (T132)? → A: **asia-south1 (Mumbai)**, as deployed.
- Q: Run the staging acceptance (T120) before opening the release gate, or skip (T134)? → A: **Skip.** The owner approves running the beta without the T120 staging acceptance; T121 records the release details.
- Q: Verify FR-021a in real browsers against the live site (T129)? → A: **Yes**, do it.

### Session 2026-11-02 (cloud beta decisions, owner)

- Q: May the feedback auditor use a third-party API key under FR-023? → A: **Yes**, if the key is retrieved from Secret Manager at runtime using the Cloud Run service account's own identity, limited to `roles/secretmanager.secretAccessor`. It is never hardcoded, never in a plain environment variable and never in GitHub configuration. Under FR-059, deployment configuration names the secret and does not hold its value. Feedback stays hidden until this is working in staging. Access to cloud services stays managed identity only.
- Q: Which region does the staging beta use? → A: **`us-central1` (Iowa).** A later GA environment may choose separately.

## Context: Verified Gaps in the Current Build

These were confirmed in the code on 2026-11-01 and are why this spec exists. They are facts, not requirements.

| # | Current behaviour | Why it matters when hosted |
|---|---|---|
| G1 | The tutor accepts a caller-supplied AI endpoint, key, model and an "ignore TLS certificate" switch on every request | Any visitor can make the server call arbitrary addresses (server-side request forgery) and disable certificate checks |
| G2 | Curriculum re-sync and AI-config-test have no caller authorization | Anyone can trigger content rewrites or outbound calls |
| G3 | Rate limiting is keyed on the network peer address | Behind the cloud front end, all visitors may look like one address |
| G4 | No graceful shutdown on termination signals | In-flight requests are cut off on scale-down or redeploy |
| G5 | Lesson images load from a third-party code-hosting domain | Runtime external dependency; widens the browser security policy |
| G6 | No spend ceiling on AI usage | A traffic spike or abuser can generate an unbounded bill |
| G7 | The app has no notion of users or sign-in | Invite-only access is impossible without it |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Invited learner activates an account and signs in (Priority: P1)

A person receives an invite link from an admin (by email, chat, or printed on a classroom sheet). Opening the link activates their account and shows them a **Beta ID** and a **fixed password** generated by the system. They save it, then use the app. Later, on the same or another device, they sign in with that Beta ID and password.

**Why this priority**: Nobody can use the beta without this. It is the front door.

**Independent Test**: An admin creates one invite. A tester opens the link on a fresh browser, records the credentials, completes a lesson, signs out, and signs back in on a different browser.

**Acceptance Scenarios**:

1. **Given** a valid, unused invite link, **When** the recipient opens it, **Then** an account is activated and they see their Beta ID and password once, with copy and "I've saved it" controls, where "I've saved it" only becomes available after the password has been copied, and the account expiry date (activation + 2 months).
2. **Given** an invite link that has already been used, **When** anyone opens it again, **Then** no new account is created and they see "This invite has already been used. Please sign in."
3. **Given** an activated account, **When** the user enters the correct Beta ID and password on any device, **Then** they are signed in and can use all lessons, simulators and narration.
4. **Given** a visitor who is not signed in, **When** they open any page except sign-in, invite activation, or the public landing notice, **Then** they are taken to the sign-in screen and no lesson content is shown.
5. **Given** a signed-in user on a shared device, **When** they choose "Sign out", **Then** they are signed out and offered a one-step option to clear locally stored progress on that device.

---

### User Story 2 - Admin issues and manages invites within the 1,000-user cap (Priority: P1)

An admin (developer, owner, or designated app admin) signs in to an admin area, generates one or many invite links (optionally tagged with a non-personal label such as "School A – Grade 7"), sees how many seats are used, and can revoke invites or accounts.

**Why this priority**: Equal to Story 1. Without invites there are no users, and without the cap the beta isn't bounded.

**Independent Test**: An admin generates 5 invites, sees the seat count rise by 5, revokes one unused invite, and sees the count drop by 1. With the cap set to 6 for the test, generating 2 more fails with a clear "seat cap reached" message.

**Acceptance Scenarios**:

1. **Given** an admin, **When** they request N invite links, **Then** N unique single-use links are created and can be copied or exported as a list.
2. **Given** active accounts plus unused, unexpired invites already total 1,000, **When** an admin requests another invite, **Then** the request is refused with "Seat cap reached (1,000)". No link is created.
3. **Given** two people open different invites at the same moment as the last seat, **When** both activate, **Then** the total never exceeds 1,000.
4. **Given** an unused invite, **When** an admin revokes it, **Then** the link stops working immediately and its seat is freed.
5. **Given** an active account, **When** an admin revokes it, **Then** the user is signed out everywhere within 5 minutes and cannot sign in again.
6. **Given** an admin, **When** they view the dashboard, **Then** they see seats used / 1,000, active accounts, pending invites, accounts expiring in the next 7 days, and expired accounts.

---

### User Story 3 - Accounts expire after 2 months and admins can extend them (Priority: P1)

Each account works for 2 months from activation. Shortly before expiry the user sees a reminder. After expiry they can't sign in and are told to contact their admin. An admin can extend one account or a whole label group, before or after expiry.

**Why this priority**: Expiry is a core requirement of the beta's access model.

**Independent Test**: With the expiry period shortened for testing, activate an account, wait past expiry, confirm sign-in is refused, extend it as admin, and confirm sign-in works immediately.

**Acceptance Scenarios**:

1. **Given** an account activated on day 0, **When** 2 calendar months pass, **Then** sign-in is refused with "Your beta access has expired. Ask your teacher or admin to extend it," and any existing session ends at its next request.
2. **Given** an account within 7 days of expiry, **When** the user signs in, **Then** they see a non-blocking reminder showing the expiry date.
3. **Given** an active or expired account, **When** an admin extends it by a chosen period (default 2 months), **Then** the new expiry date applies immediately and the user can sign in without new credentials.
4. **Given** a label group (e.g. "School A – Grade 7"), **When** an admin extends the group, **Then** every account in that group is extended in one action.
5. **Given** any extension or revocation, **When** it happens, **Then** it is recorded in an admin audit trail (who, what, when).

---

### User Story 4 - Owner is protected from abuse and runaway cost (Priority: P1)

The owner can leave the beta running unattended. No visitor can misuse the server to reach other systems, alter content, or brute-force accounts. Hosting and AI spend are bounded.

**Why this priority**: Launch blocker. Gaps G1, G2 and G6 make hosting unsafe.

**Independent Test**: Run the abuse test suite (SC-006 to SC-010) against staging. Every attack is refused.

**Acceptance Scenarios**:

1. **Given** the hosted app, **When** a request tries to supply its own AI endpoint, key, model, size limit or certificate-skip instruction, **Then** those inputs are ignored.
2. **Given** the hosted app, **When** anyone (including signed-in learners) calls curriculum re-sync or AI-config-test, **Then** the request is refused with no outbound call or content change.
3. **Given** repeated wrong passwords for one Beta ID, **When** 10 failures occur within 15 minutes, **Then** further attempts for that Beta ID are blocked for 15 minutes, and the same applies per network address.
4. **Given** the tutor is later enabled and the \$1.00 daily ceiling is reached, **When** a user asks a question, **Then** they see "The tutor is resting until tomorrow," and everything else keeps working.
5. **Given** the monthly budget alert is reached, **When** it is crossed, **Then** the owner is notified and the tutor (if enabled) is switched off automatically.

---

### User Story 5 - Operator can deploy, verify and roll back safely (Priority: P2)

The operator ships a new version by tagging a release. The pipeline refuses to deploy if any quality gate fails, traffic only moves once the new version is healthy, and the previous version can be restored in one step. Accounts and invites survive deploys.

**Why this priority**: Needed for a sustainable beta, but a first manual deploy can precede it.

**Independent Test**: Tag a failing release and confirm nothing deploys. Tag a good release and confirm it goes live, the Settings version matches the tag, and existing users stay signed in. Trigger a rollback and confirm the previous version serves traffic within 5 minutes.

**Acceptance Scenarios**:

1. **Given** a tagged release whose tests fail, **When** the pipeline runs, **Then** nothing is deployed and the operator is notified.
2. **Given** a healthy release, **When** it is deployed, **Then** signed-in users remain signed in and accounts, invites and expiry dates are unchanged.
3. **Given** a bad release, **When** the operator triggers rollback, **Then** the previous version serves all traffic within 5 minutes.
4. **Given** any deployed version, **When** a user opens Settings, **Then** the version and build identifier match the deployed release exactly.

---

### User Story 6 - Lessons and images are fully self-contained (Priority: P3)

Every lesson and image is served by the beta itself, so the app keeps working if third-party code-hosting sites are unreachable.

**Why this priority**: Reliability and a tighter browser security policy. Not strictly required to function.

**Independent Test**: Block the third-party code-hosting domain and load all six lessons. Every image renders.

**Acceptance Scenarios**:

1. **Given** third-party code-hosting domains are unreachable, **When** a signed-in user opens any lesson, **Then** all images display.
2. **Given** the hosted app, **When** the browser security policy is inspected, **Then** images, scripts and connections are limited to the app's own origin plus explicitly approved hosts.

---

### User Story 7 - Admin monitors usage, cloud costs and who is accessing the app (Priority: P1)

An admin opens one console and can see, without reading logs, how much the beta is being used, who is using it, and what it is costing.

**Why this priority**: The beta is capped and budgeted. Without visibility the owner cannot tell whether the cap, the budget or the lessons are working.

**Independent Test**: With a seeded set of accounts and activity, an admin signs in and answers, in under one minute: how many people used the app this week, which lesson is read most, who has not signed in for 14 days, and what AI spend is today and this month against budget.

**Acceptance Scenarios**:

1. **Given** activity over the last 30 days, **When** the admin opens Usage, **Then** they see, per day and as totals for today, 7 days and 30 days: active accounts, sign-ins, failed sign-ins, activations, views per lesson, quiz opens, tutor questions (zero while the tutor is off), requests and server errors.
2. **Given** accounts of different groups, **When** the admin opens Users, **Then** each row shows Beta ID, group label, status, expiry, last seen and number of signed-in devices, and a count of accounts active in the last 5 minutes is shown. Rows can be filtered by label and status and sorted by last seen.
3. **Given** the AI spend tally and the monthly budget, **When** the admin opens Costs, **Then** they see today's AI spend against the US $1.00 ceiling, month-to-date AI spend, the monthly budget (default US $30) with the 50% / 90% / 100% thresholds marked, and a month-end projection.
4. **Given** the hosting cost source is not connected, **When** the admin opens Costs, **Then** hosting and data-store cost show as "not connected" with the reason, and no estimate is invented.
5. **Given** any of these views, **When** the admin looks at the data, **Then** it is at most 1 minute old and all dates and times are in IST.

---

### User Story 8 - Learners send feedback; it is checked automatically before admins read it (Priority: P2)

A signed-in learner can tell the team what is wrong or what they like, from any page, in a few taps. Every message is screened by a rule check and an AI auditor before an admin can read it, so personal details never reach the inbox. Admins read, triage and export the screened feedback in the console.

**Why this priority**: The beta exists to learn from real use, and feedback is the main signal. It is P2 because the app works without it, and it must not ship without the screening.

**Independent Test**: A learner sends feedback from a lesson page. A message containing a phone number is refused. A clean message is held until the auditor passes it, then appears for the admin with lesson and group label only; the admin marks it read, then resolved, and exports it.

**Acceptance Scenarios**:

1. **Given** a signed-in learner on any page, **When** they open Feedback, **Then** they can pick a rating (1 to 5), a category (bug, content, idea, other), optionally write up to 500 characters, and send. The form tells them not to include names, phone numbers, emails or addresses.
2. **Given** a message containing an email address, phone number, postal address, government or card number, stated date of birth, link or social handle (including disguised forms such as "name at gmail dot com" or digits spelled out), **When** it is sent, **Then** nothing is stored and the learner sees "Please remove personal details (like phone numbers, emails or addresses) and send again." The reply never repeats the matched text.
3. **Given** a message that passes the rule check, **When** it is saved, **Then** it is marked "waiting for review" and no admin can see it.
4. **Given** a message waiting for review, **When** the AI auditor finds no personal details and nothing abusive or unsafe, **Then** it is marked "passed" and appears in the admin Feedback tab.
5. **Given** a message waiting for review, **When** the auditor flags it, **Then** its text is deleted at once, only the rating, category and flag reason remain, and admins see a count of withheld items but never the text.
6. **Given** the auditor is unavailable, over its budget, or returns an unusable answer, **When** a message is waiting, **Then** it stays hidden from admins and is retried; a message still waiting after 7 days is deleted.
7. **Given** no feedback has been received, **When** time passes, **Then** the AI service is never called.
8. **Given** the Feedback tab, **When** the admin filters by status, category, rating, lesson or label, **Then** only passed items matching show, newest first, with the unread count visible on the tab; they can mark an item read or resolved, delete it, and export the list as CSV, and each of those is recorded in the audit trail.
9. **Given** a learner who has sent 5 feedback items in the last hour, **When** they try to send another, **Then** they are asked to try again later and nothing is stored.
10. **Given** feedback older than 180 days, **When** the daily clean-up runs, **Then** it is deleted.

---

### Edge Cases

- **Lost password**: There is no self-service reset in the beta. An admin issues a replacement credential for the same account (old password stops working immediately; expiry date unchanged).
- **Invite link never opened**: An unused invite expires 14 days after creation and its seat is freed.
- **Invite link forwarded to someone else**: Whoever opens it first gets the account. Admins can revoke and reissue.
- **Password lost before "I've saved it"**: Leaving the activation screen without confirming still activates the account. Recovery is via admin reissue.
- **Same account on several devices**: Allowed (e.g. school lab plus home). Revocation or expiry ends all sessions.
- **Expiry while signed in**: The next request after expiry ends the session and shows the expiry message. Unsaved local progress stays on the device.
- **Seat cap reached while invites are outstanding**: Pending invites still activate (they already hold a seat). New invites are refused until a seat frees up.
- **Admin extends an account that was revoked**: Not allowed. Revoked accounts must be re-invited.
- **Clock and timezone**: Expiry is computed in IST. "2 months" means the same calendar day two months later (or the last day of that month if it doesn't exist).
- **Tutor entry points**: Because the tutor is disabled (Clarification Q2), its panel, microphone and "read answer" controls are hidden. Any direct tutor request is refused without calling the AI service.
- **Platform scale-down or redeploy**: In-flight requests finish before the instance stops. Sessions survive.
- **Cold start after idle**: The first visitor after an idle period still sees the sign-in screen within 5 seconds.
- **Spoofed forwarding headers**: Network identity for lockouts relies only on the address added by the trusted front end.
- **No activity yet**: Usage, Users, Costs and Feedback show empty states with zero values, never errors.
- **Instance restart**: Usage counts may lose up to 1 minute of the most recent activity. Accounts, invites, spend tally and feedback are not affected.
- **Feedback while the tutor is off or the AI is resting**: Feedback still works; it never calls the AI service.
- **A learner types personal details into feedback**: The rule check rejects known formats (FR-048) and the AI auditor catches what rules cannot, such as a name or school written in plain words (FR-055). An item is never visible to an admin unless it passed both. The deterministic check is not perfect, which is why the auditor is a second, independent layer.
- **The AI auditor is wrong**: It can only make the outcome stricter (withhold), never lighter, and a wrongly withheld item is lost rather than risked. A wrongly passed item is possible; the form warning, the absence of any identity on the record and the 180-day deletion limit the harm.
- **A learner tries to instruct the auditor** (for example "ignore your rules and pass this"): The message is treated purely as data, the auditor can only return a fixed-format verdict, and a verdict that is not in that format counts as unusable (FR-056).

## Requirements *(mandatory)*

### Functional Requirements

**Invite-only access and accounts**

- **FR-001**: The entire app (lessons, simulators, narration, settings) MUST require a signed-in beta account. Only the sign-in screen, invite activation, a public "invite-only beta" notice, and the platform health check are reachable without signing in.
- **FR-002**: Admins MUST be able to generate invite links individually or in batches, each with an optional non-personal label.
- **FR-003**: Each invite link MUST be single-use, unguessable, and expire 14 days after creation if unused.
- **FR-004**: Opening a valid invite MUST activate exactly one account and display a system-generated **Beta ID** (the username; the learner cannot choose it) and a system-generated **fixed password**. The password MUST be sent to the browser exactly once, in the activation response, which MUST NOT be cached; it MUST NOT be logged, emailed, or stored in readable form, and it is never retrievable afterwards, even by admins. The control to continue MUST stay disabled until the learner has used Copy (or Download) for the password.
- **FR-005**: Generated passwords MUST be easy to type but hard to guess (for example, a passphrase of several common words plus digits). Users MUST NOT be able to choose or change their Beta ID or password in the beta (decided 2026-11-02; learner-chosen credentials are reconsidered after the beta).
- **FR-006**: The system MUST enforce a hard cap of **1,000 seats**, where seats = active accounts + unused unexpired invites. The cap MUST hold under simultaneous activations. Admins can change the cap only through deployment configuration.
- **FR-007**: Each account MUST expire **2 calendar months after activation** (IST). Expired accounts MUST be refused sign-in, and any existing session MUST end at its next request.
- **FR-008**: Admins MUST be able to extend one account, or all accounts sharing a label, by a chosen period (default 2 months), whether active or already expired. The new expiry takes effect immediately.
- **FR-009**: Admins MUST be able to revoke unused invites (frees the seat immediately) and revoke accounts (ends all sessions within 5 minutes; frees the seat).
- **FR-010**: Admins MUST be able to issue a replacement password for an account. This invalidates the old password immediately without changing expiry.
- **FR-011**: Users MUST see a reminder when their account is within 7 days of expiry, and a clear message explaining how to get an extension once expired.
- **FR-012**: Signed-in sessions MUST persist on a device for up to 14 days or until account expiry, revocation, or sign-out, whichever comes first.
- **FR-013**: After 10 failed sign-in attempts within 15 minutes for a Beta ID, or from one network, further attempts MUST be blocked for 15 minutes.

**Admin area**

- **FR-014**: The admin area MUST be available only to a small, owner-configured list of admins, who sign in with a stronger method than beta passwords (organisation identity with multi-factor authentication).
- **FR-015**: The admin dashboard MUST show seats used / cap, active accounts, pending invites, accounts expiring within 7 days, and expired accounts, filterable by label.
- **FR-016**: Admins MUST be able to export the invite links they just generated (for distribution) and a list of accounts with Beta ID, label, status and expiry date. No passwords are included.
- **FR-017**: Every admin action (create, revoke, extend, reissue) MUST be recorded in an audit trail with admin identity, action, target and time, retained for at least 12 months.

**Hosted-mode safety (launch blockers)**

- **FR-018**: The system MUST run in a *hosted mode* in which the AI provider, credentials and model are set only by deployment configuration.
- **FR-019**: In hosted mode, the system MUST ignore any per-request instruction to change the AI endpoint, credentials, model, response size limit or certificate-verification behaviour.
- **FR-020**: In hosted mode, curriculum re-sync and AI-config-test MUST be unavailable to everyone through the app, with no outbound call or content change.
- **FR-021**: In hosted mode, Settings MUST NOT display the server's AI endpoint, API key, model override or certificate-skip fields. (Curriculum re-sync was removed everywhere on 2026-11-02.)
- **FR-021a** *(owner decision 2026-11-02)*: In hosted mode, Settings MUST let a learner turn on "Use my own local AI" with an address on their own computer (`localhost` or `127.0.0.1` only), a model and an optional key, all kept in that browser. The tutor then appears even when the hosted tutor is off. For each question the browser calls `POST /api/tutor/prepare`, which requires a learner session, applies the same validation, rate limit and safety screen (FR-REV-20) as the hosted tutor, and returns either the safety reply or the lesson prompt, the citation and the fallback. The server never calls a model or spends for this. The browser sends the prompt to the learner's AI, appends the citation to a real answer without one, and shows the fallback otherwise.
- **FR-022**: The server MUST NOT be able to make outbound calls to private network ranges or the cloud provider's internal metadata service.
- **FR-023**: The deployment MUST hold no long-lived AI or code-hosting credentials in configuration or in the shipped image. Access to cloud services MUST use the platform's managed identity with minimum permissions.

**AI tutor (disabled in beta) and spend control**

- **FR-024**: The AI tutor MUST be disabled for all beta users. The hosted tutor refuses every request without calling the AI service. *(Amended 2026-11-03, owner decision, T126:)* the tutor panel stays visible on lessons, greyed out with its input disabled, no microphone or read-aloud, and a pointer to Settings, until the learner connects their own local AI (FR-021a); it then works as FR-021a describes. Re-enabling it requires a future spec covering parental consent / school onboarding. This does not restrict the feedback auditor (FR-055 to FR-059), which sends only screened feedback text and nothing else to the AI service.
- **FR-025**: A global daily AI spend ceiling of **US \$1.00** MUST be enforced across all instances whenever the tutor is enabled. Once reached, the tutor returns "resting until tomorrow" until midnight IST.
- **FR-026**: The owner MUST receive alerts at 50%, 90% and 100% of the monthly hosting budget. At 100%, the tutor (if enabled) MUST switch off automatically until manually re-enabled.

**Availability and operations**

- **FR-027**: The service MUST scale to zero instances when idle and cap the maximum number of instances.
- **FR-028**: On termination, the service MUST stop accepting new requests and let in-flight requests complete before exiting.
- **FR-029**: Accounts, invites, expiry dates and the audit trail MUST survive deploys, restarts and scale-to-zero, and MUST be backed up at least daily.
- **FR-030**: Deployments MUST be triggered from a tagged release, MUST pass all three quality gates (backend tests, browser end-to-end tests, production build), and MUST support one-step rollback.
- **FR-031**: The version and build identifier shown in Settings MUST be stamped from the deployed release.
- **FR-032**: Old build artefacts MUST be cleaned up automatically.

**Content and browser security**

- **FR-033**: All lessons and lesson images MUST be packaged with the release and served from the app's own origin.
- **FR-034**: The browser content-security policy MUST restrict images, scripts and connections to the app's own origin plus explicitly approved hosts. The only approved connection hosts are `http://localhost:*` and `http://127.0.0.1:*`, for FR-021a.

**Privacy (children may be users)**

- **FR-035**: Accounts MUST NOT require or store names, email addresses, phone numbers, dates of birth or any other personal data. An account consists only of Beta ID, protected password, label, status, dates and session records.
- **FR-036**: Admin labels MUST be described in the admin UI as "group labels" with guidance not to enter personal names.
- **FR-037**: Learner progress and preferences MUST remain only in the learner's browser in the beta.
- **FR-038**: Operational logs MUST NOT contain passwords or session secrets, and MUST be retained no longer than 30 days.
- **FR-039**: Expired accounts not extended within 90 days of expiry MUST be deleted automatically. Their seat stays free.

**Admin console: usage, users, costs (FR-040 to FR-046)**

- **FR-040**: The system MUST record usage as aggregate counts per IST day only (accounts active, sign-ins, failed sign-ins, activations, lesson views per lesson, quiz opens, tutor questions, requests, server errors). It MUST NOT keep a per-person activity log, network addresses, browser or device details.
- **FR-041**: The admin console MUST be a single area with tabs: Overview, Users and Invites, Usage, Costs, Feedback, Audit.
- **FR-042**: The Usage view MUST show the FR-040 measures for today, the last 7 days and the last 30 days, with a per-day series, and MUST reflect activity no older than 1 minute.
- **FR-043**: The Users view MUST list each account's Beta ID, group label, status, expiry, last-seen time (1-minute precision) and number of signed-in devices, MUST show how many accounts were active in the last 5 minutes, and MUST support filtering by label and status and sorting by last seen.
- **FR-044**: The Costs view MUST show today's AI spend against the daily ceiling, month-to-date AI spend, the monthly budget (deployment configuration, default US $30) with the 50% / 90% / 100% thresholds marked, and a month-end projection from month-to-date spend.
- **FR-045**: Hosting and data-store costs MUST come from a cloud billing source behind a replaceable interface. When no source is connected the console MUST say so and MUST NOT display an estimated or placeholder amount.
- **FR-046**: All console dates and times MUST be shown in IST, and the console MUST show when each view's data was last refreshed.

**Feedback (FR-047 to FR-059)**

- **FR-047**: Signed-in learners MUST be able to open a Feedback form from any page, with a rating (1 to 5), a category (bug, content, idea, other) and an optional message of up to 500 characters. The form MUST tell the learner not to include names, phone numbers, emails or addresses.
- **FR-048**: Every message MUST pass an automated rule check before anything is stored. The check MUST reject, and store nothing for, messages containing: email addresses; phone numbers in Indian and international formats; postal addresses (house, flat, plot, street, road, lane or sector words with numbers, and postal or PIN codes beside address words); government and financial identifiers (Aadhaar-style, PAN-style, card-like digit runs); dates of birth stated as such; links and social handles; and disguised forms of these (spaced or dotted digits, digits spelled out as words, "at" and "dot" spellings). The reply MUST NOT repeat the matched text and the matched text MUST NOT be logged.
- **FR-049**: Stored feedback MUST contain only rating, category, message, group label, lesson, audience mode, app version, status, time, and its review state (waiting, passed or withheld) with a withheld reason category. It MUST NOT contain the Beta ID, network address, session or device details.
- **FR-050**: Each account MUST be limited to 5 feedback submissions per hour. Submitting feedback MUST NOT call the tutor.
- **FR-051**: Admins MUST be able to list passed feedback newest first, filter by status (new, read, resolved), category, rating, lesson and label, see the unread count, change an item's status, delete an item, and export the filtered list as CSV. Items that are waiting or withheld MUST NOT appear in the list or the export.
- **FR-052**: Changing a feedback item's status, deleting one, and exporting the list MUST be recorded in the audit trail (FR-017).
- **FR-053**: Feedback MUST be deleted automatically 180 days after it was sent.
- **FR-054**: Feedback and usage records MUST be reached only through the store interface and MUST be included in the same backups as accounts (FR-029).
- **FR-055**: After the rule check, every message MUST be reviewed by an AI auditor before any admin can see it. The auditor checks for residual personal details (such as names of people or schools, addresses written in prose, other contact details, in any language) and for abusive or unsafe content.
- **FR-056**: The auditor MUST receive only the message text, with no group label, lesson, account or other context; MUST have no tools or actions; MUST return a verdict in a fixed format (pass, or withhold with a reason from a fixed list); and MUST treat the message strictly as data, so instructions inside a message have no effect. Any reply not in that format counts as unusable. The auditor's free text MUST NOT be stored or shown.
- **FR-057**: The auditor MUST only be able to make the outcome stricter. It MUST NOT be called for a message the rule check rejected, and a "pass" never overrides the rule check.
- **FR-058**: If the auditor is unavailable, over its budget, or unusable, the message MUST stay waiting and hidden from admins and be retried; a message still waiting after 7 days MUST be deleted. The Feedback form MUST be offered only when the auditor is configured.
- **FR-059**: The auditor MUST be called only when feedback has been received (no scheduled or idle calls). Its provider, key and model MUST be set by deployment configuration only (FR-018, FR-019), its calls MUST count against the daily AI spend ceiling (FR-025), and a withheld message's text MUST be deleted immediately.

### Key Entities

- **Invite**: A single-use activation link. Attributes: unique token, label (optional), creating admin, created time, link expiry (created + 14 days), status (pending / used / revoked / expired).
- **Beta account**: Created when an invite is used. Attributes: Beta ID, protected password, label, activated time, expiry time, status (active / expired / revoked), extension history. Contains no personal data.
- **Session**: A signed-in device for an account. Ends on sign-out, 14-day limit, expiry, or revocation.
- **Admin**: An owner-approved person who can manage invites and accounts, identified by a strong organisational sign-in.
- **Audit entry**: Record of an admin action (who, what, target, when).
- **Seat count**: Active accounts + pending invites, never above the cap (1,000).
- **Daily spend tally**: Running estimated AI cost for the day, shared by all instances. Used only when the tutor is enabled.
- **Release**: A tagged version with version number and build identifier. The unit of deployment and rollback.
- **Usage counter**: A count for one measure on one IST day (and, for lesson views, one lesson). Holds no identity.
- **Last seen**: The latest activity time on a beta account, kept at 1-minute precision. Holds no address or device details.
- **Feedback item**: Rating, category, message, group label, lesson, audience mode, app version, status (new / read / resolved), sent time, and review state (waiting / passed / withheld with a reason category). Holds no identity. Message text exists only while waiting or passed.
- **Cost snapshot**: AI spend (measured by the app) plus, when connected, hosting and data-store cost from the billing source, with the time it was read.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An invited person can go from opening the link to viewing their first lesson in under 2 minutes.
- **SC-002**: A returning user can sign in and reach their lesson in under 30 seconds.
- **SC-003**: Signed-in users can open the app and start a lesson within 3 seconds on typical broadband (5 seconds after an idle period).
- **SC-004**: A class of 40 users can sign in and load the same lesson within 2 minutes with no failures.
- **SC-005**: The seat total never exceeds 1,000, including under a test of 50 simultaneous activations for the last 10 seats.
- **SC-006**: 100% of expired or revoked accounts are refused within 5 minutes of expiry or revocation, and 100% of extended accounts can sign in immediately.
- **SC-007**: 100% of attempts to redirect the server to a visitor-chosen address, private network or metadata service are refused, with no outbound connection.
- **SC-008**: 100% of attempts to trigger curriculum re-sync or AI-config-test through the app are refused.
- **SC-009**: Password guessing beyond 10 attempts per 15 minutes per account or network is blocked 100% of the time.
- **SC-010**: AI spend is zero while the tutor is disabled, and never exceeds \$1.00 per day by more than 5% once enabled.
- **SC-011**: Running cost while idle is under US \$2 per month, and total monthly cost at 1,000 users stays within the owner's monthly budget.
- **SC-012**: A spot audit finds zero personal data (names, emails, phone numbers) and zero passwords in stored accounts or logs.
- **SC-013**: A failed release is never deployed, and rollback restores the previous version within 5 minutes with no account data lost.
- **SC-014**: All six lessons render completely with third-party code-hosting domains blocked.
- **SC-015**: An admin can answer "how many people used the app this week, what did it cost, and what are people saying" within 1 minute of signing in.
- **SC-016**: A spot audit of stored usage records and feedback finds zero emails, phone numbers, postal addresses, links, network addresses or Beta IDs.
- **SC-017**: A feedback item that passes both checks appears in the admin console within 5 minutes of being sent while the auditor is available.
- **SC-018**: The rule check rejects 100% of the personal-detail examples in the test corpus (emails, phone numbers, addresses, government and card numbers, dates of birth, links and handles, including disguised forms) and passes 100% of the harmless examples in it.
- **SC-019**: 0 feedback items are visible to an admin without having passed both checks, including when the AI service is down, over budget, or returns unusable answers.
- **SC-020**: With no feedback received, AI spend from the auditor is exactly zero.

## Assumptions

- **"Links generate fixed passwords"** is interpreted as follows: opening an invite link activates an account and shows a system-generated password that stays the same for the account's life (unless an admin reissues it). The link itself is not a permanent login.
- **Admins** are the owner and developers named in deployment configuration. They sign in with organisation identity plus MFA, not with beta passwords.
- **Seat cap counting** includes pending invites so the cap can't be exceeded by late activations. Revoked accounts, expired-unused invites and deleted accounts free their seats. Expired-but-not-deleted accounts keep their seat for 90 days so they can be extended.
- **Constitution amendment required**: Accounts, invites, sessions, the audit trail and the spend tally are persistent server-side state, which conflicts with **DC-09**. This spec assumes an amendment permitting a minimal, personal-data-free account and operational store. See `constitution-amendment-proposal.md`. It must be ratified before `/speckit-plan`.
- **Target platform**: A managed scale-to-zero container platform with a CDN/hosting front end and a managed serverless data store. Products are chosen in `/speckit-plan`. The single-container shape (DC-08) is retained.
- **Front-end request limit**: The hosting front end may cap request duration at about 60 seconds. This doesn't affect the beta while the tutor is disabled. When re-enabled, tutor answers will be capped at 50 seconds.
- **Network identity**: The true client address's position in forwarding headers will be confirmed in staging before lockouts by network are finalised.
- **Monthly budget**: Unless the owner states otherwise, the monthly alert budget is US \$30.
- **Cost reference**: With the tutor disabled and at most 1,000 users, expected running cost is roughly US \$0–5 per month, mostly hosting and data-store usage.
- **Hosting cost feed**: The billing-source adapter (for example a cloud billing export read with the platform's managed identity) is a later step. This spec requires the interface and the honest "not connected" state, not the adapter.
- **Feedback and DC-09**: Feedback holds learner-written text, which the ratified DC-09 (2.1.0) does not allow. A second amendment (2.2.0) was ratified on 2026-11-01 and permits feedback records with the narrowing described in FR-047 to FR-054.
- **Beta-only decisions (2026-11-02)**: System-generated username and password with no manual selection, password sent once, and the two-layer feedback screening apply to the beta phase only. The sign-in research report's other suggestions (generated-name picker, own-password path, recovery codes, reset links, throttling and hashing changes) are not decided by this and remain open.
- **AI auditor and privacy law**: Sending screened feedback text to an AI provider is a disclosure to a third party. COPPA's 2025 amendments (separate consent for third-party disclosure) and India's DPDP rules on processors and children may apply; the operator must use a provider whose terms exclude training on the data and keep a written processor agreement. Counsel should confirm before the beta widens.
- **Out of scope**: Self-service password reset, user-chosen passwords, email delivery of invites (admins distribute links themselves), cross-device progress sync, certificates, payments, school dashboards, and bring-your-own-key in hosted mode.
- **Unchanged behaviour**: Lesson content, audience modes, simulators and narration behave as in the master spec (`spec/SPEC.md`).
