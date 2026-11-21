# Fixing a translation from a learner report

This guide is for the owner, or an agent working for the owner. It turns a learner's "Report a wording problem" into a released fix (SPEC-016, FR-I18N-11). Run every command from the repository root.

**Privacy rule.** Learner messages stay in the admin inbox. That inbox is private and deletes each report after 180 days. Never copy a message into the repository, a commit, an issue or a chat, because the repository is public. Refer to a report only by its id.

## 1. Triage

1. Open **Admin → Feedback**, then filter by **Language** and the **translation** category.
2. For each report, read the Place column: `lesson › section › step · journey`. Then:
   - mark it **read** when you take it;
   - **delete** it if it is not about wording.
3. To hand a batch to a native-speaking helper, use **Export CSV** with the filters set. Give the file only to that helper, and delete it afterwards.

## 2. Find the text

| The report names | The text is in |
|---|---|
| lesson, section, journey | `public-content/lang/<code>/lessons/<lesson>.<mode>.json`, in the section whose `"id"` matches. The journeys map as `junior` → `junior`, `plain-english` → `plain-english`, and `standard` → `detailed`. |
| a step | The same section's `diagram.steps[step − 1]`. Change `caption` and `alt` if they repeat the same words. |
| a lesson but no section (Kids) | Anywhere in `<lesson>.junior.json`. Read the whole lesson. |
| no lesson | Interface text in `web/src/i18n/<code>.json`. |

## 3. Edit, then check

- Keep the glossary term. If the report shows the glossary itself is wrong, change `content/glossary/<code>.json` too, then fix every use of the term:
  ```bash
  grep -rl "<old term>" public-content/lang/<code> web/src/i18n/<code>.json
  ```
- A clip step is read aloud and must stay under the 30-second clip limit. Keep the wording short.
- Run the check:
  ```bash
  go run ./cmd/ingest -verify -audio=false 2>&1 | grep "<code> <path>" | grep -v "no review entry"
  go test ./internal/i18n/
  ```

## 4. Re-approve

```bash
go run ./cmd/review -lang <code> -reviewer "owner (beta)" -approve <path>
```

## 5. Re-record only what changed

```bash
export TTS_ACCESS_TOKEN="$(gcloud auth print-access-token)" TTS_PROJECT=ai-learning-513415
go run ./cmd/narrate -lang <code> -dry-run   # lists only the tracks whose text changed
go run ./cmd/narrate -lang <code>
```

Then the owner uploads the recordings:

```bash
cd "/Users/santoshsharma/Documents/code/AI Learning Mod" && gcloud storage rsync --recursive public-content/audio gs://ai-learning-513415-ai-foundations-coach-narration/audio
```

Check that `gcloud storage cat gs://ai-learning-513415-ai-foundations-coach-narration/audio/<code>/manifest.json | shasum -a 256` matches `shasum -a 256 public-content/audio/<code>/manifest.json`.

## 6. Log the fix

Add one line to `content/review/<code>-changes.md`. Describe the change neutrally, never in the learner's words:

```
| 2026-11-21 | f3a9c2e1b0d4 | lang/ta/lessons/5-nlp.detailed.json › worked-example › step 2 | ‘சரியா’ → ‘சரிதானா’ |
```

## 7. Release

1. Run the release checks:
   - `go vet ./...` and `go test ./...`;
   - `go run ./cmd/ingest -verify`;
   - `go run ./cmd/assetcheck`;
   - `npx tsc --noEmit -p web`;
   - the Playwright suite.
2. Commit with explicit paths and name the report id, for example: `fix(ta): 5-nlp worked-example step 2 wording (feedback f3a9c2e1b0d4)`.
3. Tag a release; the owner approves promote.
4. After the release, mark the report **resolved** in the inbox.
