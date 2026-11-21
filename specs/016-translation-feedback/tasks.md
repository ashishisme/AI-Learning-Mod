---
description: "Tasks for SPEC-016: wording feedback from beta learners"
---

# Tasks: Wording Feedback from Beta Learners

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**: Included. Every FR maps to an automated test (plan §6, spec/SPEC.md §10).

## Standing rules

- **Smallest complete change:** apply `ponytail`.
- **UI work:** follow `impeccable` and `ui-ux-pro-max`, but the project wins:
  - DC-11: contrast ≥ 4.5:1 in light and dark, targets ≥ 44×44;
  - no new npm or Go packages;
  - do not run the impeccable engine.
- **Approvals:**
  - English strings need no ledger entry;
  - hi/kn/ta: `go run ./cmd/review -lang <code> -reviewer "owner (beta)" -approve web/src/i18n/<code>.json`, after the owner says so.
- **Git:** commit only when the owner asks, with explicit paths. Tag only on the owner's word, and never approve promote.
- **Browser tests while the owner's app runs:** from `web/`, `npx playwright test -c playwright.tmp3001.config.ts`.

## Phase 1: Setup (spec first)

- [X] T001 `spec:` amend `spec/SPEC.md` to 2.19.0:
  - **FR-047..FR-059 (feedback):** add the category `translation`. Records may carry the interface language (one of the offered codes), a section id (`^[a-z0-9][a-z0-9-]{0,63}$`) and a clip step (1–20). The section and clip report entry points (Kids: one per lesson, at the end). The admin filter and CSV by language. The beta note in the language menu.
  - **DC-09 (c):** context fields add language, section and clip step.
  - **spec/ACCEPTANCE.md:** add AC-85..AC-88, all pending:
    - AC-85: record and validation;
    - AC-86: admin filter and CSV;
    - AC-87: report entry points and beta note;
    - AC-88: adversarial personal-details tests.

## Phase 2: Foundational (record and validation, blocks every story)

- [X] T002 Write the tests first, in `internal/feedback/service_test.go`. These are stored:
  - `Lang`, `SectionID`, `Step`;
  - category `translation`.

  These give `ErrInvalid`:
  - a section id not matching `^[a-z0-9][a-z0-9-]{0,63}$`;
  - a step outside 1–20;
  - a lang that is not 2–3 lowercase letters.

  Also: a record with no lang lists with `Lang == ""`.
- [X] T003 Add `Lang string json:"lang,omitempty"`, `SectionID string json:"sectionId,omitempty"` and `Step int json:"step,omitempty"` to `state.Feedback` in `internal/state/store.go`. Nothing is needed for the Firestore or file store beyond the struct.
- [X] T004 In `internal/feedback/service.go`:
  - `Input` gains `Lang`, `SectionID` and `Step`;
  - `validate` accepts `translation` and the patterns above;
  - `Submit` copies the fields into the record;
  - `Item` returns them;
  - `Filter` gains `Lang`, where `"unknown"` matches an empty one;
  - the CSV adds the columns `lang`, `section`, `step` and `mode`.

## Phase 3: US1 — a learner reports a wording problem where they read it (P1)

**Independent test**: with feedback on, a Tamil section report sends category `translation`, `lang: ta`, the lesson, section and mode.

- [X] T005 [US1] In `internal/api/usage_handlers.go` `submitFeedback`:
  - read `sectionId` and `step`;
  - store `lang` only if `langs` offers it, otherwise answer 400;
  - leave the refusal-language behaviour as it is.

  Test in `internal/api/feedback_lang_test.go`: a stored record keeps `ta`, an unknown `xx` gets 400, and an absent lang stores "".
- [X] T006 [US1] Strings `feedback.report` ("Report a wording problem"), `feedback.translation` ("Wording problem") and `feedback.about` ("About: {place}"):
  - add them to `web/src/i18n/en.json`;
  - draft them in `hi.json`, `kn.json` and `ta.json`, following each glossary.
- [X] T007 [US1] In `web/src/components/FeedbackDialog.tsx`:
  - add the optional props `context?: { lessonId: string; sectionId?: string; step?: number; mode: string; place: string }` and `initialCategory?`;
  - add the `translation` option;
  - show the read-only about line;
  - capture `lang` when the dialog opens;
  - send `sectionId` and `step`.
- [X] T008 [US1] Make `FeedbackButton` (`web/src/components/FeedbackButton.tsx`) or a small shared opener open the dialog with a context. Reuse the existing gating on `feedbackEnabled` and the session.
- [X] T009 [US1] Add the report link in `web/src/components/AdaptiveLessonView.tsx`:
  - in Plain English and Detailed, a text button at the end of each section, with that section's id and heading;
  - in Kids (`junior`), one button at the lesson end, with no section;
  - it must be at least 44×44 and wrap at 390 px;
  - hide it when feedback is off.
- [X] T010 [US1] Add the same control to the control rows of `web/src/components/ClipPlayer.tsx` and `VideoClipPlayer.tsx`, passing the current step (1-based) and the section id.
- [X] T011 [US1] Tests in `web/tests/feedback.spec.ts`:
  - with feedback on and Tamil chosen, the section link opens the dialog in Tamil with `translation` and the about line, and the POST body has `lang: 'ta'`, `sectionId` and `mode`;
  - a clip report carries `step`;
  - the Kids journey shows exactly one link;
  - with feedback off, there are no links;
  - switching language after opening keeps the first `lang`.

## Phase 4: US2 — the owner works through reports by language (P1)

**Independent test**: seeded hi, kn and ta reports filter by language. The CSV holds only the filtered rows and has the new columns.

- [X] T012 [US2] In `internal/api/admin_insights.go`, `feedbackFilter` reads `lang`. Tests in `internal/api/feedback_handlers_test.go`:
  - filtering by `kn` and by `unknown`;
  - the CSV honours the filter and its header has `lang,section,step,mode`;
  - an old record without a lang still lists.
- [X] T013 [US2] In `web/src/pages/admin/FeedbackInbox.tsx`:
  - a Language select (All, the offered languages from the runtime, Unknown);
  - `translation` in the Category select;
  - columns Language and Place (lesson › section › step · mode).

  Extend the admin test in `web/tests/feedback.spec.ts` (`mockAdmin`).

## Phase 5: US3 — from report to fix (P2)

- [X] T014 [US3] Write `docs/fixing-a-translation.md`, following the owner workflow in plan §5:
  1. triage;
  2. locate the text;
  3. edit and check;
  4. re-approve as owner (beta);
  5. `narrate -dry-run`, record, the owner's rsync, and the manifest check;
  6. release;
  7. mark resolved;
  8. add a line to `content/review/<code>-changes.md`: date, report id, file › section, before → after. Never copy the learner's message.

  Link it from `docs/adding-a-language.md`.
- [X] T015 [US3] Create `content/review/hi-changes.md`, `kn-changes.md` and `ta-changes.md`, each with a header and the column format. Do one sample run-through on a scratch copy and note it here (FR-012, SC-004).

## Phase 6: US4 — the beta note (P3)

- [X] T016 [US4] Add the strings `language.betaNote` ("This translation is new.") and `language.betaNoteInvite` ("This translation is new. If a sentence reads wrong, use “Report a wording problem” in any lesson.") to all four UI files.
- [X] T017 [US4] In `web/src/components/LanguageSwitcher.tsx`, when the chosen language has `beta`, add a 44×44 info button. It opens a one-line note: `betaNoteInvite` when feedback is on, `betaNote` otherwise. It closes with Esc, returns focus, and uses `aria-describedby`. Test in `web/tests/feedback.spec.ts`.

## Phase 7: Polish and release

- [X] T018 [P] Extend `web/tests/languages-kn-ta.spec.ts` (390 px) with feedback on: the report links and beta note cause no overflow and stay at least 44×44.
- [X] T019 [P] Grow `internal/feedback/testdata/adversarial/*.json` with English and Hindi-specific cases seen during T011. The set must stay green.
- [X] T020 The owner approves the hi, kn and ta UI strings, recorded as owner (beta). *(2026-11-21: owner said "approve and record all pending".)*
- [ ] T021 Turn feedback on in production. This is an owner decision with a cost:
  - set `feedback_auditor` (`base_url`, `model`) in the untracked tfvars;
  - add the auditor key secret;
  - `terraform apply`.

  Until then, production shows no report links (FR-004).
  - **Cost estimate (2026-11-21):**
    - One audit sends the fixed prompt (about 300 tokens) plus the message (500 characters at most, about 400 tokens in Indic scripts), and gets back at most 60 tokens. So it is at most about 750 tokens in and 60 out.
    - With a Flash-Lite-class model at about $0.10 per million input tokens and $0.40 per million output tokens (check the current price list first), one audit costs about $0.0001.
    - 1,000 reports a month cost about $0.10, and 10,000 about $1.
    - The auditor key secret adds about $0.06 a month.
    - The existing daily AI spend ceiling caps it, and each learner can send at most 5 reports an hour.
- [X] T022 Release gates: *(2026-11-21: go vet/test, ingest -verify with audio, assetcheck, tsc pass; Playwright 270 passed plus the reruns, English baseline re-recorded; settings-hosted-local expected.)*
  - go vet and test;
  - `ingest -verify` with audio;
  - assetcheck;
  - tsc;
  - the full Playwright suite on 3001, re-recording the English baseline if the Help or lesson text changed.

  When the owner asks: commit, push, and tag. The owner approves promote.
- [ ] T023 Set AC-85..AC-88 to PASS (automated). Set the spec status to Done, and update the memory file.

## Progress notes (2026-11-21)

- **Done (T001–T019), not committed:**
  - SPEC.md 2.19.0 FR-I18N-11, plus AC-85..88.
  - Backend: the record, validation, handler, admin filter and CSV. An unknown language code is stored as "" rather than refused, so the existing refusal-language behaviour is kept.
  - The dialog place line, `ReportWordingButton` (sections, clips, Kids lesson end), the inbox Language filter and Place column, and the beta note.
  - Strings in en, hi, kn and ta.
  - The browser tests are in `web/tests/wording-feedback.spec.ts`, not `feedback.spec.ts`.
  - The 390 px check now runs with feedback on.
  - `docs/fixing-a-translation.md` and `content/review/{hi,kn,ta}-changes.md`.
- **Adversarial personal-details tests:** they found two gaps, both fixed in `check.go`: emails written with "(dot)" or "[dot]", and spelled-out digits split by a comma.
- **T015 dry run:** one Tamil clip step edited. The result was 1 stale file, and 3 tracks (one per voice, 210 characters) to re-record. The file was restored afterwards.
- **Open:**
  - T020: owner approval of the hi, kn and ta UI strings. `ingest -verify` flags them stale until then.
  - T021: production feedback is off. `feedbackEnabled` is false because the tfvars have no `feedback_auditor`.
  - T022: the release.
  - T023: close.

## Dependencies

- T001 comes first.
- T002, T003 and T004 block everything after them.
- US1 (T005–T011) and US2 (T012–T013) can run in parallel after T004.
- US3 and US4 come after US1.
- T020 needs T006 and T016.
- T021 is independent, but it is needed for production use.
- T022 and T023 come last.

## MVP

T001–T013: learners can report, and the owner can filter and export. The beta note and the workflow doc follow.
