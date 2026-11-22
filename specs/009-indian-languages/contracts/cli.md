# Build-time CLI contracts

All three CLIs are Go programs (DC-10). They exit `0` on success, `1` on a check failure, and `2` on a usage or configuration error. They never print credentials.

## `cmd/ingest` (extended)

| Invocation | Behaviour |
|---|---|
| `go run ./cmd/ingest` | As today, plus a pass for each language in `languages.json` (hidden or approved). It writes `public-content/lang/<code>/{index.json,lessons/<id>.json}` from `translations/<code>/lessons/…` at the pinned SHA. Missing translated lessons are skipped and logged. |
| `go run ./cmd/ingest -lang hi` | Only the Hindi pass. |
| `go run ./cmd/ingest -verify` | The existing English checks, plus these for every `approved` language (fails on any): a ledger entry missing, draft or stale; a key or field missing compared to English, for the UI catalogue, quizzes and adaptive lessons; a translated file with code spans, URLs or citations changed; and, from B4, `narrate -check` failing. It prints one line per problem: `LANG PATH: reason`. `hidden` languages are checked and their problems printed as warnings, but they don't fail the build, so B2 can ship drafts. |

## `cmd/translate` (new; owner machine only)

```text
go run ./cmd/translate -lang hi [-kind adaptive|quiz|ui|all] [-only <path>] [-force] [-dry-run]
env: TRANSLATE_BASE_URL, TRANSLATE_API_KEY, TRANSLATE_MODEL   (never set in CI, Terraform or the image)
```

- **Fields**: translates allowlisted fields only (see content-files.md), using `content/glossary/<lang>.json`.
- **Output**: writes the translated file and upserts a `draft` ledger entry with `sourceHash` and `translationHash`.
- **Protection**: refuses to overwrite a file whose ledger entry is `approved` and current, unless `-force` is given.
- **Validation**: rejects a draft whose Markdown structure (headings, lists, code fences, links) differs from the English source. It reports the field and does not write.
- **`-dry-run`**: prints the field count and estimated characters. It makes no API call.

## `cmd/narrate` (new; owner machine, B4)

```text
go run ./cmd/narrate -lang hi [-only <trackKey>] [-check] [-dry-run] [-sample <voice>]
env: TTS_ACCESS_TOKEN (from `gcloud auth print-access-token`), TTS_PROJECT (billing project), TTS_ENDPOINT (default https://texttospeech.googleapis.com)
```

- **Tracks**: every narrated track of the language's translated adaptive lessons plus the default greeting, built by the shared text rule (`internal/narration`, `web/src/services/narrationText.ts`), in each persona (`chip`, `nova`, `alan`). Its hash is `sha256(voice|speakingRate|pitch + "\n" + text)`.
- **Cache**: the output folder itself. A track whose manifest hash matches and whose file exists is never recorded again, so a second run bills 0 characters. Otherwise the text is split under 4,800 bytes at `।`, `.`, `?` or `!`, synthesised as MP3 and the parts joined.
- **Output**: `public-content/audio/<lang>/<lessonId>/<mode>/<trackId>-<persona>.mp3` (or `global/…`) and `manifest.json`, saved after every recording. A full run removes recordings of tracks that no longer exist.
- **`-check`**: no API call; exit 1 if any track is missing, out of date or has no voice chosen.
- **`-dry-run`**: lists the recordings to make and the characters billed.
- **`-sample <voice>`**: listening test; records the greeting to `narration-sample-<voice>.mp3` only.
- **Storage and release** (owner's choice, 2026-11-03): recordings are made on the owner's machine and kept in the private bucket `<project>-<service>-narration` (`gcloud storage rsync` down, `narrate`, rsync up). The release build copies them into the image; the Dockerfile's `ingest -verify` fails an approved language with any missing or stale recording. CI steps that run before the copy use `ingest -verify -audio=false`. Generating inside CI is a later step.
