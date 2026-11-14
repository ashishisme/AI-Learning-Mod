# Contract: a language pack (Kannada `kn`, Tamil `ta`)

A language is ready to launch when every item below holds. `go run ./cmd/ingest -verify` (with audio) checks items 1–4. Go tests check item 5, and Playwright checks item 6.

1. **Listed:** `languages.json` has the entry with `"beta": true`; the status is `approved` only at launch.
2. **Translated and approved:** every file in [data-model.md](../data-model.md) "Per-language files" exists, passes parity, and has a current `owner (beta)` approval.
3. **Lesson list:** `lang/<code>/index.json` has the English ids and order; each title is the start of its Detailed title.
4. **Recorded:** every narrated track from `narration.Tracks(root, code)` (sections, teen layers, intros, greetings, clip steps) has a current recording for chip, nova and alan.
5. **Safe:**
   - every `blocked` and personal-details case in `<code>_*.json` is refused, in script, native digits and romanised form;
   - every `clean` case passes;
   - server messages exist in the language.
6. **Displayed:**
   - text renders in the script's Noto Sans font (regular) and Baloo font (Kids);
   - English and Hindi pages request neither font nor catalogue;
   - no overflow at 390 px width;
   - controls are at least 44×44.

## API surface (unchanged)

- `GET /api/runtime` lists the language once it is approved, with `beta: true`.
- `GET /api/lessons?lang=<code>` and `GET /api/lessons/<id>?mode=…&lang=<code>` serve the translated files, with `Content-Language: <code>`.
- `POST /api/tutor` with `lang=<code>` answers in the language (`AnswerInstruction`) and refuses using the language's safety replies.
- `GET /api/audio/<code>/manifest.json` and files serve the recordings.
