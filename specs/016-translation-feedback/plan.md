# Implementation Plan: Wording Feedback from Beta Learners

**Branch**: `cloud-beta-2` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

## Summary

Extend the existing feedback system so wording reports arrive with their exact place. A report records the language, section, clip step and journey. Learners send one from a link on each section and clip, and the owner sees the new fields in the admin inbox. There is no new store, package or service. Most of the work is four small extensions:
- the record and its validation;
- the submit handler;
- the admin filter and CSV;
- three UI entry points.

Two documents complete it: an owner workflow, and the strings in four languages.

## Technical Context

- **Stack (DC-01)**: a Go API (`internal/feedback`, `internal/api`, `internal/state`) and a React, TypeScript, Vite, Tailwind and Zustand SPA. No new npm or Go packages.
- **Storage (DC-09 c)**: the existing feedback store, Firestore when hosted and the file store locally.
  - Feedback records are JSON documents, so the new optional fields need no migration.
  - Old records read with an empty language, shown as "unknown".
- **Testing**:
  - Go unit tests in `internal/feedback` and `internal/api`;
  - Playwright, extending `web/tests/feedback.spec.ts`, and the per-language spec for 390 px.
- **Constraints**:
  - no identity data;
  - 500 characters;
  - 5 an hour;
  - 180-day retention;
  - DC-11 (4.5:1 contrast, 44×44 targets);
  - DC-10 (no Python).

## Constitution Check

- **Spec first.** `spec/SPEC.md` is amended before any code:
  - FR-047..FR-059: the new category and context fields;
  - DC-09 c: adds language, section, clip step and journey to "context fields";
  - new acceptance rows from AC-85.
- **Privacy.** The new fields are fixed-pattern codes, never free text. The language must be in the offered list. The section id must match `^[a-z0-9][a-z0-9-]{0,63}$`. The step must be from 1 to 20, and the journey one of `junior`, `plain-english` or `standard`. PASS.
- **No new dependencies.** PASS.

## Design

### 1. Record and validation (`internal/feedback/service.go`, `internal/state` Feedback type)

- **`Input`**: adds `Lang`, `SectionID`, `Step` and `Journey`. `validate` checks each against the patterns above.
- **Categories**: the allowed set gains `translation`.
- **The language**: it is checked by the handler against `i18n.Set`, the offered languages (approved, plus any `beta`). An unknown code gives `ErrInvalid`.
- **Mode and journey**: `Mode` already holds the journey. `Journey` reuses it, so no duplicate field is needed. Only `Lang`, `SectionID` and `Step` are new.
- **Storage**: the new fields are stored on `state.Feedback` and returned on `Item`. The auditor and retention are unchanged.

### 2. Submit handler (`internal/api/usage_handlers.go` `submitFeedback`)

- Passes `lang`, `sectionId` and `step` through.
- `lang` already arrives, because the dialog sends it today. The handler now stores it, after checking it against the offered languages.

### 3. Admin (`internal/api/admin_insights.go`, `web/src/pages/admin/FeedbackInbox.tsx`)

- **Filter**: `feedbackFilter` reads `lang`, and `feedback.Filter` gains `Lang`. The filter value `unknown` selects records with no language.
- **CSV**: gains the columns `lang`, `section`, `step` and `mode`. It uses the same filter.
- **Inbox**: gains a Language select (All, the offered languages, unknown), a Category option `translation`, and columns for Language and Place. Place reads as lesson › section › step, plus the journey.

### 4. Learner UI

- **`FeedbackDialog.tsx`**: accepts an optional `context: { lessonId, sectionId?, step?, mode, title }` and an `initialCategory`.
  - It shows a read-only "About: <lesson title> › <section heading>" line.
  - It adds `translation` to the category select.
  - `lang` is captured when the dialog opens, which covers the edge case of switching language mid-report.
- **`AdaptiveLessonView.tsx`**: a small "Report a wording problem" text button at the end of each section, shown only when `feedbackEnabled`. It is at least 44×44 and wraps at 390 px. It opens the dialog with that section's context.
- **`ClipPlayer.tsx` / `VideoClipPlayer.tsx`**: the same control in the player's control row, passing the current step.
- **`LanguageSwitcher.tsx`**: when the chosen language has `beta`, a "(beta)" info button opens a one-line popover.
  - The line reads `language.betaNote`, or `language.betaNoteInvite` when feedback is on.
  - The popover is keyboard-dismissable, with `aria-describedby`.
- **Strings**: `feedback.report`, `feedback.translation`, `feedback.about`, `language.betaNote`, `language.betaNoteInvite`.
  - They go into `web/src/i18n/en.json`, `hi.json`, `kn.json` and `ta.json`.
  - Each needs approval in the ledgers: `-lang en -reviewer owner`, and `-lang hi|kn|ta -reviewer "owner (beta)"`.

### 5. Owner workflow (`docs/fixing-a-translation.md`, new)

1. **Triage** in the inbox: filter by language and `translation`, then mark the report read.
2. **Locate the text.** The lesson, journey and section map to `public-content/lang/<code>/lessons/<lesson>.<mode>.json` and the section with that `id`. A step points at `diagram.steps[step-1]`. A report with no section is about interface text, in `web/src/i18n/<code>.json`.
3. **Edit, then check** that file: `go run ./cmd/ingest -verify -audio=false | grep "<code> <path>"`.
4. **Re-approve** the file: `go run ./cmd/review -lang <code> -reviewer "owner (beta)" -approve <path>`.
5. **Re-record what changed**: `go run ./cmd/narrate -lang <code> -dry-run`, then record. Only tracks whose text hash changed are recorded. Then the owner runs the rsync, and you check the manifest.
6. **Release** through the gates and a tag. The owner approves promote.
7. **Mark the report resolved**, and add any glossary change to `content/glossary/<code>.json`.

### 6. Tests (spec FR → test)

| FR | Test |
|----|------|
| FR-001, FR-003 | `internal/feedback/service_test.go`: a valid lang, section and step are stored. A bad lang (not offered), a malformed section, or a step of 0 or 21 gives ErrInvalid. |
| FR-002 | Same file: `translation` is accepted. |
| FR-006 | Existing PII and auditor tests, plus one kn and one ta PII refusal with the new fields set. |
| FR-007, FR-008, FR-009 | `internal/api/feedback_handlers_test.go`: filtering by `lang` and by `unknown`; the CSV columns and filter; an old record without lang. |
| FR-004, FR-005 | `web/tests/feedback.spec.ts`. With feedback on, the section link opens the dialog with category `translation` and the about line, and the POST body carries lang, sectionId and mode. With feedback off, there is no link. A clip report carries `step`. |
| FR-010 | `go run ./cmd/ingest -verify` (ledgers), plus the i18n key-parity test. |
| FR-011 | `web/tests/feedback.spec.ts`: the beta note opens in Tamil and closes with Esc, and it invites reports only when feedback is on. |
| FR-013 | `languages-kn-ta.spec.ts` at 390 px: no overflow, and targets of at least 44. The axe and contrast checks already in the suite. |
| FR-012 | The document exists. A dry run of the workflow on one sample edit is recorded in tasks.md. |

## Phases

1. **Spec amendment**, as a `spec:` commit: SPEC.md FR-047..059, DC-09 c, and AC-85..AC-88.
2. **Backend**: record, validation, handler, admin filter and CSV, with tests.
3. **Learner UI**: dialog context, section and clip links, the beta note, with tests.
4. **Strings**: en, then Claude drafts hi, kn and ta, then the owner approves all four.
5. **Workflow document**, with a sample run-through.
6. **Release gates and release.** The owner tags and approves promote.

## Decisions (owner, 2026-11-21)

- **Kids journey:** one report link at the lesson end, with lesson context and no section. Other journeys: one per section and in the clip player. Offered in all four languages.
- **Documenting feedback:** the inbox is the private record; `content/review/<code>-changes.md` logs each fix (date, report id, file › section, neutral before → after) with no learner text; commits name the report id. Step 7 of the workflow writes the log line.
- **PII tests:** `internal/feedback/check_adversarial_test.go` with `testdata/adversarial/{personal_details,clean}.json`, added 2026-11-21. They found one gap, emails with "(dot)" or "[dot]", which is fixed in `check.go`. Grow the sets with every new trick seen in the inbox.

## Risks

- **Spam.** The existing hourly limit and the AI auditor apply.
- **Feedback off locally.** Run the tests with feedback enabled through the existing test setup used by `feedback.spec.ts`.

## Next

Run `/speckit-tasks` to break this into tasks, then `/speckit-implement`.
