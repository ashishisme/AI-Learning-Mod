# Feature Specification: Wording Feedback from Beta Learners

**Feature Branch**: `cloud-beta-2` (no feature branch)

**Created**: 2026-11-21

**Status**: Draft

**Input**: User description: "Translation and content feedback from beta learners (SPEC-016). Kannada, Tamil and Hindi are approved only as 'owner (beta)' with no native reviewer; the owner wants live users to review them. Extend the existing learner feedback (FR-047..FR-059, DC-09 c) rather than build a new system: (1) store the interface language with each feedback record and add a 'translation' category; (2) a small 'Report a wording problem' link on each lesson section and clip that opens the existing dialog pre-filled with lesson, section id, journey and language; (3) the admin console lists feedback filtered by language, lesson and category, and exports CSV per language; (4) a documented owner workflow: triage, fix, re-approve as owner (beta), re-record only changed tracks, release; (5) the language menu's beta label links to a one-line explanation inviting wording reports. Out of scope: user accounts, public comments, automatic translation edits. Keep the 180-day retention and no-identity rules; all UI strings translated in hi, kn, ta."

**Relationship to current product**: Learner feedback already exists (SPEC FR-047..FR-059, DC-09 c, AC-46): a learner gives a rating, a category (bug, content, idea, other) and a message of at most 500 characters; a rule check refuses personal details; an AI auditor passes or hides each message; the owner reads passed messages in the admin inbox (filters by status, category, rating, lesson and group; CSV export; new/read/resolved). The interface language is sent today but used only to word the refusal, and is not kept. This feature narrows that system to one job: getting wording problems in the beta languages from real learners to the owner, with enough context to find and fix the exact text. Requirement IDs below are cited as `SPEC-016 FR-xxx`; amendments to `spec/SPEC.md` get permanent IDs in their amendment commit (§12).

## Clarifications

### Session 2026-11-21 (owner)

- Q: In the Kids journey, a link under every section or once per lesson? → A: **Once, at the end of the lesson**, as the plan proposed, and the link is offered **in every language**, English included.
- Q: How should feedback be documented? → A: **Owner asked for the best way.** The decision is under FR-014: the admin inbox is the private record, and the repository keeps only a change log that names the report id and what changed, never the learner's words.
- Q: How do we stop reports capturing phone numbers and emails? → A: **Adversarial tests of the rule check** (FR-015), in all four languages, with the AI auditor still behind it as the meaning-based check.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A learner reports a wrong or awkward sentence where they read it (Priority: P1)

A Tamil learner reading a Detailed lesson finds a sentence that is wrong or unnatural. Next to that section (or the clip step they are watching) they choose "Report a wording problem". The feedback dialog opens already set to the "translation" category, showing which lesson and section it is about, in their language. They type what is wrong and, if they like, a better wording, and send it.

**Why this priority**: This is the whole point: native speakers become the reviewers the beta languages lack. Without the exact place, a report like "this line is wrong" cannot be acted on.

**Independent Test**: With feedback turned on, open a Tamil lesson, report a wording problem on its second section, then confirm the stored record carries category "translation", language `ta`, that lesson, that section, that journey, and the message, and no identity.

**Acceptance Scenarios**:

1. **Given** a learner in Tamil on a lesson section, **When** they choose "Report a wording problem", **Then** the dialog opens in Tamil with category "translation" and a read-only line naming the lesson and section.
2. **Given** a clip step is showing, **When** the learner reports from the clip, **Then** the report also records the step number.
3. **Given** the message contains a phone number, **When** the learner sends it, **Then** it is refused in Tamil exactly as feedback is today, and nothing is stored.
4. **Given** feedback is turned off for the deployment, **Then** no report link is shown anywhere.

---

### User Story 2 - The owner finds and works through reports for one language (Priority: P1)

The owner opens the admin feedback inbox, filters to Kannada and the "translation" category, and sees each report with its lesson, section, journey and step. They export that list as a file to hand to a Kannada-speaking helper, then mark each report read or resolved as they go.

**Why this priority**: Reports are only useful if the owner can sort them by language and place; it completes Story 1.

**Independent Test**: Seed reports in three languages; filter by language and by category; check the counts, the columns and that the exported file contains only the filtered language.

**Acceptance Scenarios**:

1. **Given** passed reports in hi, kn and ta, **When** the owner filters by Kannada, **Then** only Kannada reports are listed, with language, lesson, section, journey and step shown.
2. **Given** a filtered list, **When** the owner exports it, **Then** the file holds exactly the listed reports and the same columns.
3. **Given** reports sent before this feature, **Then** they still list, with the language shown as unknown.

---

### User Story 3 - The owner turns a report into a fix and a release (Priority: P2)

The owner (or an agent working for them) follows a written workflow: confirm the report, change the text in the right lesson or interface file, re-approve that file as "owner (beta)", re-record narration only for the tracks whose text changed, check, release, and mark the report resolved.

**Why this priority**: Without a repeatable workflow, fixes are slow, and re-recording everything would be costly.

**Independent Test**: Follow the workflow for one sample report end to end in a local copy: only the changed file's approval and only its changed tracks are re-done, and the release check passes.

**Acceptance Scenarios**:

1. **Given** one sentence changed in one Tamil lesson, **When** narration is recorded, **Then** only the tracks containing that sentence are re-recorded.
2. **Given** the fix is released, **Then** the owner can mark the report resolved, and the workflow document names every step and command.

---

### User Story 4 - Learners know the language is a beta and that their help is wanted (Priority: P3)

In the language menu, the "(beta)" next to Kannada, Tamil or Hindi leads to one short line, in that language, saying the translation is new and inviting learners to report wording problems from any lesson section.

**Why this priority**: More learners will report if they are asked; it is cheap but not essential.

**Independent Test**: Choose Tamil; activate the beta explanation; the line appears in Tamil, is readable by a screen reader, and can be dismissed with the keyboard.

**Acceptance Scenarios**:

1. **Given** a beta language is chosen, **When** the learner activates the beta explanation, **Then** a one-line invitation appears in that language.
2. **Given** feedback is off, **Then** the explanation says the translation is new but does not invite reports.

---

### Edge Cases

- A learner switches language after opening the dialog: the report keeps the language of the text they were reading when they opened it.
- A section has no id or the lesson is not translated (the English fallback notice is showing): the report records the language the learner chose and marks the text as the English fallback.
- English learners: the link works the same way for English text (useful for typos), with language `en`.
- A report quoting a long passage: the 500-character limit still applies; the dialog says so.
- Repeated reports: the existing limit of 5 submissions per hour applies; the owner sees duplicates as separate rows.
- The AI auditor is down: reports wait hidden, as feedback does today, and appear once passed.
- Kids journey: the link uses the same wording rules as other Kids controls (large target, simple words); no free-text identity fields.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each new feedback record MUST keep the interface language code it was sent in, taken from the list of offered languages; any other value is stored as unknown.
- **FR-002**: The feedback categories MUST add "translation" (shown to learners as a wording problem) alongside bug, content, idea and other.
- **FR-003**: A feedback record MAY carry a section id, a clip step number (1–20) and the journey; each is checked against a strict pattern and refused if malformed. No new free-text field is added.
- **FR-004**: Every lesson section in every journey, and the clip player, MUST offer a "Report a wording problem" control when feedback is enabled, and none when it is not.
- **FR-005**: That control MUST open the existing feedback dialog with category "translation" preselected and a read-only line naming the lesson title and section; the learner may still change the category. The rating stays required, as today.
- **FR-006**: All existing feedback protections MUST apply unchanged: 500-character limit, personal-details refusal in the learner's language, AI audit before the owner sees a message, no identity, network address, session or device details, 5 per hour, deletion after 180 days.
- **FR-007**: The admin inbox MUST filter by language, in addition to the current filters, and show language, section, journey and step for each report.
- **FR-008**: The admin export MUST honour every active filter, including language, and include the new columns.
- **FR-009**: Records stored before this change MUST still load, list and export, with language shown as unknown.
- **FR-010**: Every new learner-facing string MUST exist in English, Hindi, Kannada and Tamil and be approved in each review ledger before release.
- **FR-011**: The language menu MUST give beta languages a short explanation (one line) reachable by keyboard and screen reader; it invites wording reports only when feedback is enabled.
- **FR-012**: A written owner workflow MUST describe: triaging a report, locating the text from its lesson/section/journey/step, editing the file, re-approving it as "owner (beta)", re-recording only changed narration, running the release check, releasing, and marking the report resolved.
- **FR-013**: The new controls MUST meet the project's accessibility floor: contrast at least 4.5:1 in light and dark, targets at least 44×44, no horizontal scroll at 390 px in any language.

- **FR-014**: Feedback MUST be documented in two places only.
  - **The admin inbox** is the record of what learners wrote. It is private, and it deletes each report after 180 days.
  - **A change log in the repository**, `content/review/<code>-changes.md`, gets one line per fix: date, report id, file and section, and a short neutral description of the change, such as "step 3: ‘சரியா’ → ‘சரிதானா’". It MUST NOT copy a learner's message, because the repository is public.
  - The commit that makes a fix names the report id, so a fix can be traced to its report without exposing the report's text.
- **FR-015**: The rule check MUST be covered by adversarial test sets in English, Hindi, Kannada and Tamil:
  - **Refused:** phone numbers written with spaces, dashes, dots, brackets, country codes, full-width or native digits, hidden zero-width characters, or spelled out in words; emails written with "at"/"dot" in words, brackets or the script's own words, in capitals, or with full-width symbols.
  - **Allowed:** wording reports full of lesson numbers, sums, percentages, years, step numbers and maths symbols.

  The AI auditor stays as the second, meaning-based check for anything the rules miss.

### Key Entities

- **Feedback record** (extended): adds language code, optional section id, optional clip step, optional journey. Still no identity. Retention unchanged.
- **Feedback category**: adds "translation".
- **Owner fix workflow**: a document, not data; links a report to the files, ledger entries and narration tracks it touches.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From any lesson section in any language, a learner can send a wording report in under 30 seconds and at most 3 actions before typing.
- **SC-002**: 100% of reports sent through the section control identify language, lesson and section; the owner can find the exact text from a report without asking the learner.
- **SC-003**: The owner can list all reports for one language and export them in under 1 minute.
- **SC-004**: A one-sentence fix in a beta language is released with only the affected narration re-recorded (no more than the tracks containing the changed text).
- **SC-005**: No stored report contains identity data; the existing personal-details checks pass for all four languages.
- **SC-006**: Within 60 days of release, at least one native-speaker report per beta language leads to a released fix (a goal for the owner, not a release gate).

## Assumptions

- Feedback is available where it is today: hosted deployments with feedback turned on. Local and self-hosted copies without it show no report controls.
- The rating stays required for simplicity; for wording reports it reads as "how much does this problem get in the way".
- Journey and section ids are the ones already in the lesson files; clip step numbers start at 1.
- The owner remains the only approver; helpers who read an exported list are not given admin access.
- Reports in English are allowed and treated the same way.
- No new data store, package or third-party service is needed; the existing feedback store is extended.
