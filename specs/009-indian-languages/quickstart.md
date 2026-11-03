# Quickstart: validating each build

Prerequisites: Go 1.27.3, Node 24, and the repository at `009-indian-languages`. Lessons are generated with `go run ./cmd/ingest`. For B4, `gcloud` must be signed in to the staging project.

## B1: foundation, no visible change (`v0.2.0`)

```bash
go test ./internal/api/ ./internal/i18n/
cd web && npm run build && npx playwright test --project=chromium
```

Expected:
- The full suite passes with no English test edited, apart from string lookups that now go through keys (SC-007).
- `curl -s localhost:8080/api/runtime | jq .languages` returns only `en`.
- `curl -sI 'localhost:8080/api/lessons/1-intro?lang=hi'` returns `Content-Language: en`.
- `curl -sI 'localhost:8080/api/lessons/1-intro?lang=../x'` also returns `en`, and no file outside `public-content` is read.
- The English page network log shows no `hi.json` and no Devanagari font request.

## B2: pipelines and safety, still hidden (`v0.2.1`)

```bash
go run ./cmd/ingest -lang hi                 # writes public-content/lang/hi/...
go run ./cmd/translate -lang hi -dry-run     # prints field and character counts, no API call
go run ./cmd/ingest -verify                  # passes; prints Hindi drafts as warnings (hidden)
go test ./internal/feedback/ ./internal/api/ -run 'Hindi|Hinglish'
```

Expected:
- 100% of `testdata/hi_personal_details.json` is rejected, and at least 95% of `testdata/hi_clean.json` is accepted (SC-006).
- Setting `"status":"approved"` for Hindi while any entry is a draft makes `-verify` exit 1 and list each draft (SC-005).

## B3: Hindi text live (`v0.3.0`)

Precondition: the reviewer has approved every ledger entry, and `languages.json` has Hindi as `approved`.

```bash
go run ./cmd/ingest -verify                  # exit 0
cd web && npx playwright test --project=chromium tests/i18n.spec.ts
```

Expected:
- **Switcher:** it shows English and हिन्दी, the switch applies in under 1 s, and `<html lang="hi">` is set. The choice survives a reload.
- **Lessons and quizzes:** all six lessons in three modes and all quizzes render in Hindi (SC-002).
- **No English left:** the scan of learner pages finds no English UI strings (SC-001).
- **Fallback:** removing one Hindi adaptive file locally shows the English version with the Hindi "not yet translated" notice.
- **Layout:** at 360 px width, nothing clips (SC-011).

## B4: Hindi audio live (`v0.3.1`)

```bash
go run ./cmd/narrate -lang hi -cache .narration-cache -dry-run   # tracks and characters to bill
TTS_ACCESS_TOKEN=$(gcloud auth print-access-token) go run ./cmd/narrate -lang hi -cache .narration-cache
go run ./cmd/narrate -lang hi -cache .narration-cache            # second run: 0 synthesised (SC-009)
go run ./cmd/narrate -lang hi -check                              # exit 0
```

Expected:
- **Playback:** in Hindi, every narrated section plays a recording in each persona, starting in under 2 s.
- **Fallback:** on a desktop with no Hindi voice, recordings still play (SC-004). Deleting one MP3 locally falls back to the device's Hindi voice, or shows "not available on this device". It never uses an English voice.

## B5: tutor in Hindi (`v0.3.2`)

Precondition: the Constitution Principle II amendment is ratified.

- **Local AI:** with Ollama set up (SPEC-008 FR-021a) and Hindi chosen, a question about lesson 1 gets a Hindi answer that ends with `[<हिन्दी शीर्षक> § <हिन्दी उपशीर्षक>]`.
- **Safety:** a Hinglish address in the question returns the Hindi safety reply, and nothing is sent to the model.
- **Microphone:** it recognises Hindi speech.
