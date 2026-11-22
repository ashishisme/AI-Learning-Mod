# Implementation Plan: Our Own Lessons

**Branch**: `013-own-lesson-content` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/013-own-lesson-content/spec.md`

## Summary

Replace every Microsoft-derived lesson, quiz and image with our own, one lesson at a time, then stop using Microsoft's course entirely.

Most of the work is writing. The code changes are small and come first, because every lesson release depends on them:

1. **An English approval record (FR-008).** The existing Hindi review ledger tool gets an `en` ledger. A lesson or quiz file marked `"origin": "own"` must have a current owner approval, or the release check fails.
2. **A Detailed track (FR-003, FR-017).** A new `detailed` lesson mode in the same section format as Kids and Plain English, served to the Standard journey whenever it exists. The journey is shown as "Detailed". Its "Open in Colab" button opens our own notebook for that lesson (FR-016), stored in `notebooks/<id>.ipynb` in this repository.
3. **The tutor grounds on the version on screen.** Today it always reads the Standard (Microsoft) lesson, even for Kids and Plain English learners, so its citations don't match the page. It will read the section-format version for the learner's journey when one exists.

Then the content work: Kids lessons 1, 2, 4, 5 and 7, then Plain English, then Detailed with its notebook, then quizzes. Each one is drafted by Claude, approved by the owner, translated, approved and recorded in Hindi, and released alone. The last phase removes the ingest step, Microsoft images, notebooks, pinned commit, logo blocklist and attribution, and rewrites the tutor's identity line.

## Technical Context

**Language/Version**: Go 1.27.4 (server, CLIs); TypeScript with React 18 (web)

**Primary Dependencies**: no new dependencies. Go standard library `net/http`; React, Vite, Tailwind, Zustand, react-markdown and React Router 7, all already in use

**Storage**: committed static lesson JSON in `public-content/lessons/` and `public-content/lang/hi/lessons/` (DC-09); review ledgers in `content/review/<lang>.json`; quizzes in `web/src/data/quizzes/<lang>.json`; pictures in `web/public/brand/` with `design/brand/asset-register.json`

**Testing**: `go test ./...`; Playwright (`web/tests/`); release checks `go run ./cmd/ingest -verify`, `go run ./cmd/assetcheck`, `go run ./cmd/review -lang <code>`, `go run ./cmd/narrate -lang hi -check`

**Target Platform**: Cloud Run container (Linux) and evergreen browsers, including phones

**Project Type**: web application (Go API serving a React single-page app)

**Performance Goals**: unchanged: lessons are static files; a Detailed lesson is about the size of today's Standard Markdown (2–20 KB)

**Constraints**: DC-01 stack; DC-10 no Python in build or runtime; DC-11 contrast at least 4.5:1 and targets at least 44×44 px; no new npm packages; lesson ids and URLs unchanged (FR-011); one lesson per release (FR-010)

**Scale/Scope**: 6 lessons × 3 tracks = 18 track versions, 6 quizzes, 6 notebooks, about 60 new pictures, Hindi for all lesson and quiz text (notebooks stay English)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status | Notes |
|---|---|---|
| Spec before code (§12) | Pass | SPEC-013 amends `spec/SPEC.md` (§1, §6.1, §7.3.1, FR-UI-08, NFR-LIC-01..03) in a `spec:` commit before each code change that needs it |
| Principle II, tutor grounding and citations | Pass | The tutor keeps the same grounding instruction, citation format and fallback. Only its lesson source (the version on screen) and, in the last phase, its one identity line change. The injection-defence block stays verbatim |
| DC-01 stack, no new npm packages | Pass | Existing components only (`AdaptiveLessonView`, widgets, `ScenePicture`, `WordCard`) |
| DC-02 Go stdlib router | Pass | One more accepted `mode` value |
| DC-09 static lessons | Pass | Lessons stay static JSON shipped with the release |
| DC-10 no Python | Pass | Ledger and checks are Go. Notebooks contain Python, but DC-10 covers the build, backend and runtime: a notebook is learner material that runs only in the learner's own Colab session. Nothing in the build or the server reads or runs it |
| DC-11 accessibility | Pass | Detailed reuses the audited card layout |
| NFR-LIC-01..03 | Amended in the last phase | Attribution stays until nothing derived ships (FR-012). NFR-LIC-03 (`public-content/` is a build artifact from a pinned commit) is rewritten when ingest is removed |
| NFR-LIC-05 asset register | Pass | Every new picture is registered and approved by the owner |

Re-check after Phase 1: no new violations.

## Project Structure

### Documentation (this feature)

```text
specs/013-own-lesson-content/
├── spec.md
├── plan.md              # this file
├── research.md          # decisions R1–R9
├── data-model.md        # lesson origin, Detailed lesson, English ledger, quiz
├── quickstart.md        # how to validate one lesson release
├── contracts/
│   ├── detailed-lesson.md   # Detailed lesson JSON and API mode
│   └── english-ledger.md    # en ledger and review CLI
└── tasks.md             # from /speckit-tasks
```

### Source Code (repository root)

```text
cmd/review/                  # -lang en: approve English lesson and quiz files
cmd/ingest/                  # -verify: en ledger check; removed in the last phase
cmd/narrate/                 # records the detailed mode in Hindi
internal/i18n/ledger.go      # Targets: detailed mode; en "origin": "own" targets
internal/i18n/parity.go      # detailed lessons compared like adaptive ones
internal/api/lessons.go      # accepts mode=detailed
internal/api/tutor.go        # grounds on the shown version; identity line (last phase)
internal/readability/        # unchanged (Kids only)
public-content/lessons/      # <id>.junior.json, <id>.plain-english.json, <id>.detailed.json
public-content/lang/hi/lessons/
web/src/pages/Lesson.tsx     # Standard journey shows Detailed when it exists; no Colab then
web/src/components/AdaptiveLessonView.tsx  # goFurther list; detailed tone
web/src/i18n/{en,hi}.json    # "Detailed" journey label, Go further heading
web/src/data/quizzes/        # rewritten quizzes
web/public/brand/            # new pictures
notebooks/                   # new: <id>.ipynb, one per Detailed lesson, owner-approved
content/review/en.json       # new: English owner approvals
web/tests/                   # detailed-lesson.spec.ts, own-content.spec.ts, tutor grounding
```

**Structure Decision**: no new modules. Detailed is a third adaptive mode beside `junior` and `plain-english`, so serving, parity, Hindi review, narration, read-along and Read section all work through the code paths they already use.

## Phases

| Phase | What | Releases |
|---|---|---|
| A. Foundation | English ledger and `origin: own` check; `detailed` mode in API, parity, narration and the web; journey label; Colab rule; tutor grounds on the shown version | one code release |
| B. Kids | Lessons 1, 2, 4, 5, 7 rewritten in the SPEC-012 format, with pictures; lesson 3 marked `origin: own` | one per lesson |
| C. Plain English | All six lessons rewritten | one per lesson |
| D. Detailed | All six Detailed lessons, each with our own notebook | one per lesson |
| E. Quizzes | All six quizzes rewritten (they can ship with each lesson's Detailed release) | with D |
| F. Retire Microsoft | Remove ingest, `public-content/assets/`, base Hindi lessons, the Microsoft Colab link pattern, pinned commit, logo blocklist, attribution; rewrite tutor identity line, SPEC §1, README, Help; amend NFR-LIC-01..03 | one release |

## Complexity Tracking

No constitution violations to justify.
