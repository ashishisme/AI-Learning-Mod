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

## `cmd/narrate` (new; release job and owner machine)

```text
go run ./cmd/narrate -lang hi -cache <dir> [-check] [-dry-run]
env: TTS_ACCESS_TOKEN (from `gcloud auth print-access-token`), TTS_ENDPOINT (default https://texttospeech.googleapis.com)
```

- **Track text**: builds each narrated track's text by the shared rule. Its hash is `sha256(voice + "\n" + text)`.
- **Cache**: if `<cache>/<hash>.mp3` exists, it is copied. Otherwise the text is split under 5,000 bytes at sentence ends, synthesised, joined, and stored in the cache.
- **Output**: writes `public-content/audio/<lang>/…` and `manifest.json`.
- **`-check`**: makes no API call. It fails if any narrated track of the language is missing from the manifest, or has a hash that differs from the current text.
- **`-dry-run`**: prints the tracks to synthesise and the characters to be billed.
- **Release job order (B4)**: `ingest` → `auth` → `gcloud storage rsync gs://<cache-bucket> .narration-cache` → `narrate -lang <each approved>` → `gcloud storage rsync .narration-cache gs://<cache-bucket>` → image build (the Dockerfile's `ingest -verify` runs `narrate -check`).
