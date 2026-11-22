# Research: Our Own Lessons

Decisions for SPEC-013. Each one has its reason and the options that were turned down.

## R1. Detailed lessons are a third adaptive mode

- **Decision:** a Detailed lesson is `public-content/lessons/<id>.detailed.json`, in the same section format as `<id>.junior.json` and `<id>.plain-english.json`, plus an optional `goFurther` list. The API accepts `?mode=detailed`. In the Standard journey the page asks for `mode=detailed` first. If the server answers with sections it shows `AdaptiveLessonView`, and if it answers with the old blocks it shows the Markdown, as today.
- **Why:** Detailed then gets everything the section format already has: Read section buttons with recordings, read-along, word cards, scenes, Hindi parity, the review ledger and narration. It also works lesson by lesson (FR-010). The server already falls back to the standard lesson when a mode file is missing.
- **Turned down:** our own Markdown in `<id>.json`. That keeps the old renderer, has no per-section recordings, and is overwritten by ingest until ingest is removed. A new renderer was turned down as more code for no gain.

## R2. English owner approvals reuse the review ledger

- **Decision:** `content/review/en.json`, with the same shape as `hi.json`. Each entry has the path, kind, a `sourceHash` of the approved English text, status, reviewer and date; `translationHash` is not used. `go run ./cmd/review -lang en -approve <paths>` writes it. Any lesson file with `"origin": "own"`, any quiz in an own lesson, and each notebook is a target. `ingest -verify` fails when a target has no entry or its hash changed.
- **Why:** the owner already knows the Hindi workflow. Approval is tied to the exact text, so an edit after approval shows up. One tool covers both languages.
- **Turned down:** a field in the lesson file (`approvedBy`), because it can't detect edits made after approval. A Git pull request review, because there is no PR flow on this repository and it isn't checked at release.

## R3. `"origin": "own"` marks replaced content

- **Decision:** a top-level `"origin": "own"` in a lesson file, and on a quiz entry. Files without it are treated as derived. Kids lesson 3 gets it as soon as Phase A lands.
- **Why:** this is what the release check (R2) and the attribution rule (FR-012) key on. When every lesson, quiz and notebook is `own`, Phase F can start, and a test can prove it.
- **Turned down:** a separate list file, which drifts from the content.

## R4. The tutor grounds on the version on screen

- **Decision:** `loadTutorPrompt` uses `req.Mode` (`junior`, `plain-english` or `detailed`). If that mode's file exists for the language (or in English), it builds the lesson text from its sections as `## <heading>` plus the body. A banded Kids lesson includes the 12+ text. Without a mode file it uses the standard blocks, as today. The citation format `[<lesson title> § <heading>]` and the fallback stay the same.
- **Why:** today a Kids learner is answered from Microsoft's Standard text, and its section names don't exist on their page. Grounding on the shown version makes citations match (spec edge case) and stops the tutor depending on derived text once lessons are replaced.
- **Turned down:** always grounding on Detailed. It would give Kids learners answers and citations from a page they can't see.

## R5. Our own notebooks

- **Decision:** `notebooks/<id>.ipynb` in this repository, one per Detailed lesson, English only. Each one runs the lesson's worked example step by step, using only libraries Colab has by default. The Detailed lesson's `colabUrl` is `https://colab.research.google.com/github/ashishisme/AI-Learning-Mod/blob/<release-branch>/notebooks/<id>.ipynb`. FR-UI-08 is amended to allow only this repository's URLs. Notebooks are owner-approved through the en ledger (R2).
- **Why:** the owner chose to write our own. Colab opens public GitHub files directly, so there is nothing to host.
- **Release branch:** releases ship from `cloud-beta`, and `main` is behind, so links use `cloud-beta` until the owner moves releases to `main`. This is noted as an open point in the quickstart.
- **Turned down:** notebooks in Hindi. Code comments and outputs stay English, and the lesson around them is translated. This can be revisited with SPEC-009 reviewers.

## R6. Journey label "Detailed"

- **Decision:** only the display strings change: `journey.standard*` / `mode.standard*` and the audience tab, in English and Hindi ("विस्तृत"). The stored value `standard` stays, so the store needs no migration.
- **Why:** FR-017. Learners keep their choice.

## R7. Hindi for Detailed replaces the "base" Hindi

- **Decision:** `public-content/lang/hi/lessons/<id>.detailed.json` is an adaptive-kind translation target. When it exists, Hindi Standard-journey learners see it instead of the base Hindi lesson, which is Microsoft's translation. Until it is approved, Hindi learners see the English Detailed lesson with the "not translated yet" notice. The base files go in Phase F.
- **Why:** this is the spec's edge case: Hindi learners never see the old Hindi text for a replaced lesson.

## R8. Pictures

- **Decision:** reuse the concept pictures, Chip and the lesson 3 word and scene pictures. Draw new word and scene pictures per lesson as in SPEC-012 (hand-authored SVG, tap-to-play under 5 s, still under reduced motion), registered as drafts and approved by the owner before they ship. Detailed lessons use diagrams (stepper, Mermaid) and our own SVGs in place of the 38 Microsoft images.

## R9. Order and release unit

- **Decision:** Phase A is one code release. Then each lesson-track is its own release: draft, then owner English approval, then Hindi draft, approval and recording, then tests, then a tag. The quiz and notebook ride with the Detailed release of the same lesson.
- **Why:** FR-010 and the owner's review time. Each release is small enough to review in one sitting.
