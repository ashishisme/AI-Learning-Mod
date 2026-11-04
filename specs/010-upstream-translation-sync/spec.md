# Feature Specification: Take Up the Upstream Course's Translation Sync

**Feature Branch**: `010-upstream-translation-sync` (not created yet)

**Created**: 2026-11-04

**Status**: **Pending.** Nothing is built until the start condition below is met. Do not run `/speckit-plan` before then.

**Input**: User description: "Review the update on the git repo (source). Looks like there are translations available: https://github.com/microsoft/AI-For-Beginners/pull/780. Can we use them?" Then: "Ok create a spec for this but keep it pending."

**Relationship to other specs**: This builds on `specs/009-indian-languages/`, in particular its base-lesson ingest, the review ledger, the release gate, the logo blocklist and FR-I18N-10 (beta). It also follows the "Curriculum pin" rules in `README.md` (NFR-LIC-02, NFR-LIC-03). Requirement IDs below are local to this spec and are cited as "SPEC-010 FR-0xx".

## Start condition (why this is pending)

Work starts only when **all** of these are true:

1. Upstream PR [microsoft/AI-For-Beginners#780](https://github.com/microsoft/AI-For-Beginners/pull/780) ("chore(i18n): sync translations with latest source changes") is **merged into `main`**.
2. The owner asks for it.

Hindi being in the PR is no longer needed. We keep our own Hindi (see Clarifications).

**State when this spec was written (2026-11-04):**

- The PR was open and 44% done, with 24 of 54 languages finished. Hindi, Bengali, Marathi, Telugu, Punjabi and Urdu were still queued. Tamil, Kannada and Malayalam were finished.
- The PR is an automated re-translation (Co-op Translator, Localizeflow) of translations that already exist. It brings no new languages.
- Upstream `main` was 61 commits ahead of our pin (`392d0df…`). The only English change in the six lessons we ship was a link fix in `lessons/3-NeuralNetworks/README.md`.
- On `main`, only one Hindi file had changed since the pin, and it is a sub-lesson README we do not ingest.

**How to check:** `curl -s https://api.github.com/repos/microsoft/AI-For-Beginners/pulls/780 | jq '{state, merged, merged_at}'`, then read the PR's language table.

## Clarifications

### Session 2026-11-04 (owner)

- Q: Use the translations from PR #780 now? → A: **No.** Wait for the merge, and keep this spec pending.
- Q: Take the upstream re-translation of Hindi? → A: **No. Keep our Hindi version, because that work is complete.** The Hindi base lessons, images and approvals stay exactly as they ship in v0.4.1, whatever upstream does to `translations/hi`. A pin change may bring the English fixes and other languages, but never upstream Hindi text.
- Q: What if upstream later changes a Hindi technical term? → A: **It's a glossary decision, not an automatic re-sync.** Our Hindi follows the source's terms as of pin `392d0df` (SPEC-009, Session 2026-11-04). If upstream picks a different term, the owner decides whether to change the glossary. If so, our files are edited, reviewed and re-recorded the same way.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Move the pin for English fixes while our Hindi stays exactly as approved (Priority: P1)

The owner moves the course pin to the merged upstream commit. English learners get the upstream fixes, such as the corrected Overfitting link. Hindi learners see the same Hindi they see today: the same base lessons, images, approvals and narration. Nothing on the live site breaks.

**Why this priority**: Hindi is live as a beta, and its translation and review are complete. Taking upstream's machine re-translation would throw that work away and need a fresh review. A plain pin move would also re-ingest `translations/hi` and overwrite our files.

**Independent Test**: In a branch, move the pin and re-ingest. Then:
- confirm every Hindi file under `public-content/lang/hi/` is byte-identical to v0.4.1;
- confirm `ingest -verify` names only the Hindi lessons whose **English** source changed (expected: Neural Networks, for the link fix);
- re-confirm those entries and confirm the gate passes;
- tag a release, and confirm `/api/runtime` reports it with Hindi still offered.

**Acceptance Scenarios**:

1. **Given** the PR is merged, **When** the owner moves `INGEST_PINNED_SHA` and re-ingests, **Then** the Hindi base lessons and Hindi images are not re-fetched from upstream. They stay as approved for v0.4.1.
2. **Given** an English lesson changed upstream, **When** `ingest -verify` runs, **Then** the matching Hindi lesson shows as stale against the new English, and the release is blocked until it is re-confirmed. That stops our Hindi from quietly falling behind a real content change.
3. **Given** the English change is one the Hindi already handles, or a small one we bring across by hand (such as the link fix), **When** the reviewer re-approves it with `cmd/review`, **Then** the gate passes, and the Hindi text is our own, edited only where we chose.
4. **Given** the new pin brings new or changed images for other languages, **When** they have not had the logo review, **Then** the pin change is not merged. Any branded image found is added to `brandedImages` before release.
5. **Given** the pin has moved, **When** a learner opens any Hindi page or plays narration, **Then** nothing they see or hear has changed.

---

### User Story 2 - Tamil, Kannada and Malayalam base lessons as the start of round 2 (Priority: P2)

The owner adds Tamil, Kannada and Malayalam to `languages.json` as **hidden**. The refreshed base lessons are ingested for review, and our own content (Kids, Plain English, quizzes, interface) is drafted with `cmd/translate`. Learners see nothing until each language is approved.

**Why this priority**: These three were already finished in PR #780, and they are Indian languages from the round 2 plan. A hidden language never blocks a release, so this is safe to do in parallel.

**Independent Test**: With the three languages hidden:
- `ingest -verify` passes, with warnings only;
- `/api/runtime` still lists only English and Hindi;
- `cmd/review -lang ta` lists the Tamil base lessons as drafts.

**Acceptance Scenarios**:

1. **Given** `ta`, `kn` and `ml` are listed as hidden, **When** ingest runs at the new pin, **Then** their base lessons and images are written, and the release gate prints warnings only.
2. **Given** a hidden language, **When** a learner opens the language menu, **Then** it is not shown.
3. **Given** a new language's translated images, **When** they are ingested, **Then** they go through the same logo review as Hindi did before that language can be approved.

---

### User Story 3 - A clear report of what an upstream pin change would alter (Priority: P3)

Before moving the pin, the owner can see what would change for each language:
- the lessons whose text changes;
- the images added, removed or changed;
- whether the change is reworded translation only, or also a change in the English.

**Why this priority**: The upstream sync rewords text the reviewer may already have approved. For example, Tamil replaced its own word for "neural network" with the English term written in Tamil script. The owner needs that size and nature of change in front of them to decide whether a pin move is worth a re-review.

**Independent Test**: Run the report between the current pin and a later upstream commit. Check it against the upstream compare view for one language.

**Acceptance Scenarios**:

1. **Given** two upstream commits, **When** the owner runs the report, **Then** it prints per language the changed lesson files we ingest, with lines added and removed, and the changed image files. It ignores files we do not ingest (notebooks, sub-lesson READMEs, licence files).
2. **Given** the report shows only English link fixes for a language, **When** the owner moves the pin, **Then** the review step for that language covers only those files.

### Edge Cases

- **The PR merges with or without Hindi:** it makes no difference. Our Hindi is kept either way.
- **The PR is closed without merging:** this spec stays pending until a later upstream sync is merged. The start condition then applies to that one.
- **A later upstream change adds real new English content to a lesson we ship:** the Hindi lesson goes stale (FR-004). We bring the new part into our Hindi ourselves, with `cmd/translate` for that file and the reviewer's approval. We never take upstream's Hindi.
- **A Hindi lesson exists upstream that we do not have yet:** it is not taken automatically. Adding it is a separate decision by the owner.
- **Upstream changes an image's file name but not its content:** the logo blocklist matches by content hash, so a renamed branded image stays blocked.
- **A new upstream image breaks the size or type checks in `-verify`:** the pin change is not merged until it is fixed or dropped.
- **Someone pins the PR's branch head instead of a `main` commit:** this is not allowed (FR-001). The branch can be force-pushed, and its commits can disappear.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The course pin MUST point to a commit on upstream `main`. A pull request branch or an unmerged commit is never allowed.
- **FR-002**: A pin change MUST go through the human image review in `README.md` ("Curriculum pin") for every new or changed image in every listed language. Its result MUST be recorded next to the existing review record.
- **FR-003**: Any branded image found in that review MUST be added to the blocklist, with its credit line removed, before the pin change is merged.
- **FR-004**: After a pin change, every translated base lesson whose **English** source changed MUST show as stale in the review ledger. The release gate MUST refuse it for an approved language, beta included, until a reviewer approves it again. The gate already does this, and this spec keeps it.
- **FR-005**: A pin change MUST NOT alter the app's own content (Kids and Plain English lessons, quizzes, interface text) or its recorded narration.
- **FR-009**: A pin change MUST NOT overwrite the Hindi base lessons or Hindi images that are already approved. Our Hindi is kept as the source of truth, and upstream `translations/hi` is not ingested over it. Any change to our Hindi is made by us, then reviewed and approved with `cmd/review`.
- **FR-010**: The same rule SHOULD apply to any language once it is approved. Upstream translations seed a new language, but they never replace one we have reviewed.
- **FR-006**: New languages taken from the sync MUST be listed as hidden until their review is complete. A hidden language MUST NOT block a release.
- **FR-007**: The owner SHOULD be able to get a report of what a pin change alters, per language, limited to the files we ingest (User Story 3).
- **FR-008**: Undoing a pin change MUST need only a revert of the pin and the ledger, and then a release.

### Key Entities

- **Course pin**: The upstream commit every release builds its base lessons from (`INGEST_PINNED_SHA`).
- **Upstream translation sync**: An upstream change that re-translates existing languages after English edits. PR #780 is the first one we have seen.
- **Pin change report**: For each language, the ingested lessons and images that differ between two pins.
- **Review ledger entry**: Exists today. It goes stale when the English source or the translation changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a pin change, no release ships an unreviewed changed Hindi base lesson. The gate blocks 100% of them.
- **SC-002**: A pin change, including the report, image review, re-approval and release, takes the owner under 2 hours when fewer than 10 files change.
- **SC-003**: Every Hindi file, including base lessons, images, the app's own content and narration, is byte-identical before and after a pin change. The only exceptions are edits we made and approved ourselves.
- **SC-004**: The live site stays on the previous release until the new one passes the gate. Learner-facing downtime is zero.
- **SC-005**: No branded image reaches learners from the new pin.

## Assumptions

- The upstream course keeps the folder layout `translations/<lang>/lessons/<N-Name>/README.md` and `translated_images/<lang>/`. If it changes, ingest needs updating, and that is outside this spec.
- The reviewer for Hindi is the same native reviewer planned in SPEC-009 T050, or the owner under the beta exception (FR-I18N-10).
- Our Hindi is a deliberate fork of the upstream Hindi from pin `392d0df…`, decided by the owner on 2026-11-04. Upstream Hindi changes are not tracked after that.
- How Hindi is kept out of a re-ingest (for example, an approved language is skipped by ingest, or each language has its own pin) is left to `/speckit-plan`.
- Starting round 2 (US2) also needs the round 2 language choice confirmed by the owner. SPEC-009 suggested Tamil, Bengali, Marathi and Telugu, and only Tamil was finished in this PR.
- No new packages are needed (DC-06). The report in FR-007 can use the Go standard library, or the upstream compare API at review time.
