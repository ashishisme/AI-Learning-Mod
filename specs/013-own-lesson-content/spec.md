# Feature Specification: Our Own Lessons

**Feature Branch**: `013-own-lesson-content`

**Created**: 2026-11-13

**Status**: Done. Released in v0.10.0 and closed 2026-11-14.

**Input**: User description: "Own lessons instead of Microsoft AI-For-Beginners content. Replace all Microsoft-derived lesson text, images, topic dependency, tutor prompt wording and attribution with our own original content, following docs/own-content-plan.md and the owner decisions of 2026-11-13." Source plan: [docs/own-content-plan.md](../../docs/own-content-plan.md).

**Relationship to current product**: This builds on SPEC-012 (Easier Kids Lessons), whose banded lesson format, reading check, word and scene pictures, and Hindi review flow it reuses. It replaces the curriculum source described in `spec/SPEC.md` §1, §6.1, §7.3.1, FR-UI-08 and NFR-LIC-01..03. SPEC-010 (upstream translation sync) is closed and is not built. Requirement IDs below are cited as `SPEC-013 FR-xxx`. They are amendments to `spec/SPEC.md` and get permanent IDs in the amendment commit, following §12.

## Clarifications

### Session 2026-11-13 (owner)

- Q: New topics or the same ones? → A: **Recreate the existing lessons 1–5 and 7, keeping the gist of each.** No new topics for now.
- Q: Who writes the lessons? → A: **Claude writes every lesson; the owner reviews** before it ships.
- Q: Record English narration for the new lessons? → A: **Not now.** English stays on the device voice. Only Hindi is recorded. This keeps the 2026-11-09 decision in `concepts_brief.md` in force.
- Q: SPEC-010? → A: **Closed, not built.**
- Q: Notebooks (FR-016)? → A: **Write our own.** Each Detailed lesson ships with our own hands-on notebook, and its "Open in Colab" button opens ours instead of Microsoft's.
- Q: Journey name (FR-017)? → A: **"Detailed".** The interface renames "Standard" to "Detailed". The stored journey value does not change, so learners stay in it.
- Q: Recreate per age, or add our content to the existing lessons? → A: **Recreate.** Kids, Plain English and a new Detailed track are each written fresh. Nothing is appended to Microsoft's text, because anything built on it would still be a derived work.

### Session 2026-11-14

- Q: How should the owner's check that no lesson copies or closely paraphrases Microsoft's original be recorded, so SPEC-013 can be closed? (SC-006) → A: The owner confirms the check is done; it is recorded here as met (owner check 2026-11-14), with no separate checklist.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every Kids lesson is ours and easy to read (Priority: P1)

A child aged 8–14 opens any Kids lesson (1, 2, 3, 4, 5 or 7). Each one is written in our own words, in the format lesson 3 already uses: short cards, each with a big idea and a picture, a 12+ layer for older children, check-ins, a recap, and the lesson's own "try it" activity. Every picture is our own. A Hindi learner gets the same lesson in Hindi, with recorded narration.

**Why this priority**: Kids is the journey we have invested in most, lesson 3 has proved the format, and the Kids text is already ours in wording. Rewriting the remaining five lessons removes the last link between the Kids journey and Microsoft's course, and fixes the reading level, which feedback says is too hard.

**Independent Test**: Rewrite one lesson (lesson 1). Run the reading check for both age bands, show it to the owner for review, approve the Hindi, and release it alone. Then check that no sentence, example or picture in it comes from Microsoft's lesson.

**Acceptance Scenarios**:

1. **Given** a rewritten Kids lesson, **When** the reading check runs, **Then** it passes the SPEC-012 limits for both age bands, with no failures.
2. **Given** a rewritten Kids lesson, **When** a learner opens it, **Then** every card has a big idea and a picture (diagram, scene or word picture), and the lesson ends with a three-item recap before the quiz.
3. **Given** a rewritten Kids lesson, **When** the owner has not recorded an approval of its English text, **Then** the release check fails for that lesson.
4. **Given** a rewritten Kids lesson in Hindi, **When** a Hindi learner opens it, **Then** it is the approved Hindi translation and each narrated part plays its Hindi recording.

---

### User Story 2 - Plain English lessons are ours (Priority: P2)

An adult beginner picks Plain English and opens any lesson. It is written fresh in our own words, using everyday examples and no maths, in the same card format as today. It keeps the lesson's own "try it" activity.

**Why this priority**: Plain English is the second-largest audience, and like Kids it is already in our card format, so it can be rewritten lesson by lesson without new features.

**Independent Test**: Rewrite one Plain English lesson, have the owner approve it, approve its Hindi, and release it alone.

**Acceptance Scenarios**:

1. **Given** a rewritten Plain English lesson, **When** a learner opens it, **Then** each section covers the same gist as before in new wording, and the lesson's activity still works.
2. **Given** a rewritten Plain English lesson, **When** it is compared with Microsoft's lesson, **Then** no sentence is copied or closely paraphrased, and no Microsoft image is used.

---

### User Story 3 - Learners who want depth get our Detailed lessons (Priority: P2)

A learner who wants the full lesson, today's Standard journey, opens a lesson and gets our own Detailed version instead of Microsoft's Markdown text. It uses the same card format as the other journeys but goes deeper: the idea, how it works step by step, a worked example (with simple maths where it helps), the lesson's activity with more controls shown, and a short "go further" list. It can be listened to section by section, like every other lesson.

**Why this priority**: The Standard track is where most Microsoft text and all 38 Microsoft images live. Replacing it is the bulk of the work, and it needs Kids and Plain English done first so the topics and examples are settled.

**Independent Test**: Write one Detailed lesson, have the owner approve it, approve its Hindi, release it alone, and confirm that the Standard journey now shows it for that lesson, while other lessons still show the old text until they are replaced.

**Acceptance Scenarios**:

1. **Given** a lesson with a Detailed version, **When** a learner in the Standard journey opens it, **Then** they see the Detailed version, with a Read section button on every section.
2. **Given** a lesson without a Detailed version yet, **When** a learner in the Standard journey opens it, **Then** they see the existing text, as today. (Transition only: since v0.10.0 every lesson has a Detailed version, and Detailed is the fallback, SPEC FR-CNT-12.)
3. **Given** a Detailed lesson, **When** a learner reaches its activity, **Then** it is the same activity as in Kids and Plain English, showing more of the numbers behind it.
4. **Given** a Detailed lesson, **When** the tutor answers a question about it, **Then** the answer is grounded in and cites the Detailed lesson's sections.

---

### User Story 4 - Microsoft's course is no longer used anywhere (Priority: P3)

Once all lessons in all three tracks are ours, nothing from Microsoft's course ships or is fetched. The product describes itself as its own course, the tutor describes itself as this course's assistant, and the attribution to Microsoft is removed.

**Why this priority**: It can only happen after Stories 1–3 are finished for every lesson, and it is mostly removal.

**Independent Test**: After the last lesson is replaced, build a release and confirm that no file, image, link, prompt or label mentions or comes from Microsoft's course, and that a release can be built with no network access to it.

**Acceptance Scenarios**:

1. **Given** every lesson replaced, **When** a release is built, **Then** it does not download, read or pin anything from Microsoft's course.
2. **Given** every lesson replaced, **When** a learner browses any page, **Then** there is no "Curriculum based on microsoft/AI-For-Beginners" footer and no link to that repository.
3. **Given** every lesson replaced, **When** the tutor is asked who it is, **Then** it describes itself as the assistant for this course, without naming Microsoft's course.
4. **Given** every lesson replaced, **When** a learner takes a quiz, **Then** every question is one we wrote for our lessons.

---

### Edge Cases

- **A learner partway through a lesson when it is replaced.** Lesson ids stay the same, so saved progress (completed lessons, quiz results) is kept. Section-level positions are not saved today, so nothing is lost.
- **Mixed tracks during the transition.** Some lessons are ours and some are still derived. The attribution footer and licence text stay until no derived text, image or quiz ships anywhere (FR-012). Ended with v0.10.0: nothing derived ships, and the footer and notice are gone.
- **Hindi lags English.** A rewritten English lesson whose Hindi is not approved yet is shown in English to Hindi learners with the existing "not translated yet" notice. Hindi learners never see the old Hindi text for a replaced lesson.
- **The tutor during the transition.** Its grounding uses whichever version of the lesson is shown, so its citations always match the page.
- **Search engines and shared links.** Lesson URLs do not change.
- **The owner rejects a draft.** It does not ship. The previous version stays live until a revised draft is approved.
- **Activities that relied on Microsoft's examples.** Each activity keeps working; any example data it shows is reviewed and replaced with our own if it was taken from the course.

## Requirements *(mandatory)*

### Functional Requirements

**Content**

- **FR-001**: Every lesson (1, 2, 3, 4, 5, 7) in every track (Kids, Plain English, Detailed) MUST be original text written for this product, covering the same topic and gist as today's lesson. No sentence may be copied from or closely paraphrase Microsoft's course.
- **FR-002**: Kids lessons MUST use the SPEC-012 banded format (`bands: true`) and pass the Kids reading check for both age bands with no failures.
- **FR-003**: Plain English and Detailed lessons MUST use the same card format as Kids and Plain English today (sections with a heading, body, optional diagram, activity and glossary), so they get Read section buttons, read-along, Hindi parity checks and the review ledger.
- **FR-004**: Each Detailed lesson MUST include, in this order: what the idea is, how it works step by step, at least one worked example, the lesson's activity, and a short "go further" list of 3–5 items. "Go further" links may point only to neutral, freely available sources, not to Microsoft's course.
- **FR-005**: Each lesson MUST keep its existing activity (Turing game, Rover lab, Perceptron sorter, Convolution lab, Word vector maths, Bias detective) in all three tracks. Detailed MAY show more of the activity's numbers, but it uses the same activity.
- **FR-006**: Every picture in a new lesson MUST be our own: an existing product picture (Chip, concept pictures, word and scene pictures) or a new one drawn for this product and approved in the asset register. No Microsoft image may appear in a replaced lesson.
- **FR-007**: Each lesson's quiz MUST be rewritten for the new lesson, with every correct answer found in the lesson text, in English and Hindi.

**Review and release**

- **FR-008**: Every new English lesson file and quiz MUST have an owner approval record, and the release check MUST fail for any new lesson or quiz without one, or whose text changed after approval. The record works the same way as the Hindi review ledger: who approved it, the date, and a fingerprint of the approved text.
- **FR-009**: Every new lesson MUST have an approved Hindi translation and current Hindi recordings before it is released in Hindi. Until then, Hindi learners see the new English lesson with the "not translated yet" notice.
- **FR-010**: Lessons MUST be releasable one at a time. Replacing one lesson in one track MUST NOT require any other lesson to change.
- **FR-011**: Lesson ids and URLs MUST stay the same, so learners keep their progress and links keep working.

**Removing Microsoft's course (after every lesson is replaced)**

- **FR-012**: While any shipped lesson, quiz or image is still derived from Microsoft's course, the attribution footer (NFR-LIC-01) and licence notice MUST stay. They MUST be removed only when nothing derived ships.
- **FR-013**: After the last replacement, the release build MUST NOT download, read or pin Microsoft's course: the lesson import step, its pinned commit, the Microsoft images and the Microsoft-logo blocklist are removed.
- **FR-014**: The tutor's instructions (SPEC §7.3.1) MUST describe it as the assistant for this course and MUST keep the grounding, citation and safety rules unchanged.
- **FR-015**: The product's description (SPEC §1, README, Help) MUST describe it as its own course. Any statement that the product is independent of Microsoft MAY stay only where it is needed to avoid confusion, and MUST NOT link to Microsoft's repository.
- **FR-016**: Each Detailed lesson MUST ship with our own hands-on notebook covering its worked example, and its "Open in Colab" button (FR-UI-08) MUST open that notebook from this product's repository, never Microsoft's. A notebook runs only in the learner's Colab session; nothing in it runs in the product.
- **FR-017**: The Standard journey MUST be presented to learners as "Detailed" (in English and Hindi) once its first Detailed lesson ships. Learners who already chose it stay in it.

### Key Entities

- **Lesson**: one topic (1–5, 7), with a stable id, title and module, and up to three tracks.
- **Track version**: one lesson's text for one journey (Kids, Plain English, Detailed), in the card format. Marked as ours or derived.
- **Owner approval record**: for an English lesson or quiz file: who approved it, when, and a fingerprint of the approved text. A text change makes it stale.
- **Hindi translation and recordings**: as in SPEC-009 and SPEC-012, per track version.
- **Activity**: an interactive widget shared by a lesson's three tracks.
- **Picture**: a product-owned image in the asset register (concept, word, scene, Chip).
- **Quiz**: the questions for one lesson, in English and Hindi.
- **Notebook**: one hands-on notebook per Detailed lesson, in our repository, owner-approved like a lesson.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 18 track versions (6 lessons × 3 tracks), all 6 quizzes and all 6 notebooks are our own, owner-approved, and released, in English and Hindi.
- **SC-002**: Every Kids lesson passes the reading check for both age bands, with reading grade 3.5 or lower for 8–11.
- **SC-003**: After the final phase, a text search of the shipped product and its build finds zero references to Microsoft's course or repository, and zero Microsoft images.
- **SC-004**: A release can be built with no access to Microsoft's repository.
- **SC-005**: No learner loses saved progress or quiz results when a lesson is replaced, measured by the existing progress tests passing after each release.
- **SC-006**: In an owner check of each released lesson against Microsoft's original, no sentence is copied or closely paraphrased. Met: owner check recorded 2026-11-14.
- **SC-007**: Each lesson's release, from draft to live, needs no change to any other lesson.

## Assumptions

- Order of work, as in the plan: Kids lessons 1, 2, 4, 5, 7 first (3 is done), then Plain English, then Detailed, then removal (FR-012–FR-017).
- "Keeping the gist" means the same topic, the same main ideas, and the same activity. Examples, stories, structure and wording are new.
- The Kids lesson 3 rewritten in SPEC-012 already counts as ours. Its quiz is rewritten with the others (FR-007).
- Hindi translation is drafted by Claude and approved by the owner or reviewer, as in SPEC-009. Recordings use the existing Hindi voices.
- English recording stays on hold. If it is enabled later, it needs its own spec amendment (FR-I18N-07/08).
- The approval record for English (FR-008) reuses the shape and tooling of the Hindi review ledger.
- The licence (MIT) allows the derived lessons to stay live until each is replaced, with the attribution in place.
- Existing activities are product code and need no rewrite, except where they show example data taken from the course.
