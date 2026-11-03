# Research: Indian Languages (Hindi first)

All Technical Context unknowns are resolved below. Facts marked **verified** were checked against the repository or the upstream course on 2026-11-03. Facts marked **verify at build** are vendor facts (prices, voice names) that must be re-checked when the task runs.

## R1. UI text mechanism

- **Decision:** An in-house `web/src/i18n/index.ts` with flat dotted keys in `en.json` and `hi.json`. It exports `useT()`, which returns `t(key, vars?)`.
  - Interpolation uses `{name}`.
  - Plurals use `key.one` and `key.other`, picked with `Intl.PluralRules`.
  - A missing key falls back to the English string. It never shows the raw key.
  - `hi.json` is loaded with dynamic `import()`, so English users never download it.
- **Rationale:** DC-06 forbids new packages. About 300 strings don't justify an i18n framework. Dynamic import keeps the English bundle the same size (SC-007).
- **Alternatives considered:** i18next or react-intl (rejected: new dependency, needs a DC-06 amendment). Keeping strings in TS objects (rejected: the Go release gate can't parse TS to check key parity).

## R2. Where language content lives

- **Decision:** English stays at `public-content/index.json` and `public-content/lessons/`. Each other language mirrors that under `public-content/lang/<code>/`.
  - Hand-translated adaptive lessons are committed.
  - Ingested base lessons are generated at build and git-ignored, as English base lessons already are (**verified**: `.gitignore` lines 8–12; only `*.junior.json` and `*.plain-english.json` are tracked).
- **Rationale:** Moving English would risk B1 for no gain. A mirrored layout lets `LessonsHandler` reuse its code with a different root.
- **Alternatives considered:** Language suffixes such as `1-intro.hi.json` (rejected: they collide with the existing `<id>.<mode>.json` naming).

## R3. Which languages are offered

- **Decision:** A committed `public-content/languages.json` holds `[{code, name, status}]`.
  - The server reads it at start and exposes only `status: "approved"` entries (plus `en`) in `/api/runtime.languages`.
  - The frontend shows the switcher only when that list has more than one entry.
  - `cmd/ingest -verify` refuses `approved` for a language whose ledger isn't fully approved and current.
- **Rationale:** One switch per language, controlled in review, needing no code change (FR-018, FR-028). Lets B2 ship Hindi files that stay hidden.
- **Alternatives considered:** An environment variable or Terraform flag (rejected: approval would be split from the content it approves).

## R4. Review and approval

- **Decision:** A committed review ledger at `content/review/<lang>.json`, with one entry per translated file. Each entry holds:
  - `path`
  - `kind` (`base`, `adaptive`, `quiz`, `ui`)
  - `sourceHash`: SHA-256 of the English source, or of the upstream translated README for `base`
  - `translationHash`: SHA-256 of the translated file as approved
  - `status` (`draft`, `approved`)
  - `reviewer`
  - `date`

  The gate recomputes both hashes. A changed translation after approval, or changed English source, makes the entry stale, and the release fails, naming it.
- **Rationale:** Base lessons are regenerated every build, so approval can't live inside them. One mechanism for every kind of file. Hashes prevent silent edits after sign-off (FR-017–FR-019).
- **Alternatives considered:** A `review` block inside each file (rejected: lost on regeneration of base lessons, and it can be edited together with the content).

## R5. Base lessons from upstream translations

- **Decision:** `internal/ingest` gains a language mode. It walks `translations/<lang>/lessons/<folder>/README.md` at the pinned SHA and rewrites images the same way as English.
- **Facts (verified):**
  - At `392d0df…`, `translations/` has hi, bn, mr, ta, te, kn, ml, pa, ur (and ne). It has no gu or or.
  - `translations/hi/lessons/` has `1-Intro`, `2-Symbolic`, `3-NeuralNetworks`, `4-ComputerVision`, `5-NLP` and `7-Ethics`.
  - Hindi READMEs link images as `../../../../translated_images/hi/<name>.<hash>.webp`, so diagrams are localised too.
- **Implications:**
  - The asset downloader must resolve repo-root `translated_images/` paths and accept `.webp`. Check the content type served by `http.FileServer` (`image/webp`) in the asset test.
  - Use the English image when a translated one is missing (FR-006).
  - Quiz links point at `ff-quizzes.netlify.app` and keep the existing link handling.
- **Alternatives considered:** Translating base lessons with `cmd/translate` (rejected for languages upstream already covers; reserved for gu and or in a later round).

## R6. Lesson API and fallback

- **Decision:**
  - `GET /api/lessons?lang=hi` and `GET /api/lessons/{id}?lang=hi[&mode=…]` serve from `lang/hi/` when the language is approved and the file exists. Otherwise they serve English.
  - Both always set `Content-Language` to the language actually served.
  - An unknown or unapproved `lang` is treated as English. It is never used in a file path: it is looked up in the approved set first.
- **Rationale:** Per-file fallback gives the "not yet translated" notice (FR-009) without a schema change. The allowlist blocks path traversal.
- **Alternatives considered:** A `lang` field in the lesson JSON (rejected: schema change across ingest and the UI for no benefit over a header).

## R7. Quizzes

- **Decision:** Move `QUIZ_DATA` out of `web/src/data/quizzes.ts` into `web/src/data/quizzes/en.json`, keeping the types in TS. `hi.json` has the same shape and is dynamically imported. A quiz that `hi.json` doesn't list falls back to English with the notice.
- **Rationale:** The gate can check key parity in JSON. Quizzes remain bundled, so no new endpoint is needed.

## R8. Translation drafting (`cmd/translate`)

- **Decision:** A Go CLI using `go-openai`, with the base URL, key and model taken from the environment (`TRANSLATE_BASE_URL`, `TRANSLATE_API_KEY`, `TRANSLATE_MODEL`).
  - It translates only allowlisted string fields per file kind and keeps keys, code, links, `§` and Markdown structure. It checks that the Markdown structure round-trips and rejects the draft if not.
  - It injects `content/glossary/<lang>.json` into the prompt and writes a `draft` ledger entry.
  - It never overwrites a file whose ledger entry is `approved` and current unless `-force` is given.
  - It runs only on the owner's machine (FR-021). The key is never in CI, Terraform or the image.
- **Rationale:** Meets "AI draft + native review" with existing dependencies, and keeps credentials off the platform.

## R9. Text-to-speech service and voices

- **Decision:** Google Cloud Text-to-Speech `v1/text:synthesize` over REST with the standard library. Output is `audioEncoding: MP3`, with three `hi-IN` voices mapped to the personas Chip, Nova and Prof. Alan, named in `content/voices/hi.json`.
- **Facts:**
  - The API caps each request at 5,000 bytes of input, which is about 1,600 Devanagari characters (**verify at build**).
  - Hindi has Standard, WaveNet, Neural2 and Chirp 3 HD voices (**verify at build** for exact names and prices). Pick the most natural voice per persona in a listening test.
  - At about 75,000 characters per language, a full re-record costs a few US dollars at premium-voice prices (**verify at build**).
- **Implementation notes:**
  - Split text at sentence ends (`।`, `.`, `?`, `!`) under the byte cap, and join the MP3 parts by concatenation (same encoding).
  - Auth uses the bearer token from `gcloud auth print-access-token` in CI (Workload Identity), so there's no key (FR-015, SPEC-008 FR-023).
  - IAM: enable `texttospeech.googleapis.com`, and give the deploy service account `roles/serviceusage.serviceUsageConsumer` on the project (**verify at build** whether a narrower role exists).
- **Rationale:** It covers all nine upstream languages, needs no client library, and fits the existing Workload Identity setup.
- **Alternatives considered:**
  - Device voices only (rejected by the owner).
  - Azure or AWS (rejected: a second cloud identity).
  - Recording in the browser at runtime (rejected: cost while idle, breaking DC-09).

## R10. Recording cache and packaging

- **Decision:**
  - `cmd/narrate` reads content, builds each track's text with the **same rule as the UI** (heading + Chip quote + body, Markdown stripped exactly as `speechService.ts:169-172` does, ported to Go), and hashes `voice + text`.
  - It writes `public-content/audio/<lang>/…mp3` and `manifest.json`. It synthesises only hashes that are missing from the local cache directory.
  - The release job syncs the cache with `gcloud storage rsync gs://<bucket> <dir>` before and after. A lifecycle rule deletes objects not touched for 365 days.
- **Rationale:** Zero cost for unchanged content (FR-014, SC-009). No Cloud Storage client code. Audio stays out of git.
- **Gate:** `narrate -check` fails a release if any narrated track of an approved language is missing from the manifest or has a stale hash (FR-012, SC-003).

## R11. Playback

- **Decision:**
  - `AudioNarrationButton` asks a small `narration.ts` for the language's manifest, loaded once and cached, and plays the track with an `HTMLAudioElement`, reusing the existing active-track and stop handling.
  - Without a recording, `speechService` picks a voice whose `lang` starts with the chosen language. If there is none, the button shows "Hindi narration isn't available on this device" (FR-013).
  - `speechService.ts:125` stops filtering to `en` only.
- **Track IDs:** the existing `id` props (`intro-guide-note`, section track IDs, `chip-mascot-greeting`) prefixed by lesson and mode, so the manifest key equals the UI key.

## R12. Font

- **Decision:** Commit Noto Sans Devanagari (SIL OFL 1.1) as two pre-subset `woff2` weights (400, 700), with an `@font-face` `unicode-range: U+0900-097F, U+1CD0-1CFF, U+A8E0-A8FF`, so browsers fetch it only when Devanagari is on screen. Add `OFL.txt` and an entry in the licence notes.
- **Rationale:** Consistent rendering on devices without a Devanagari system font, at zero cost to English pages (SC-007).

## R13. Hindi and Hinglish personal-details and safety rules

- **Facts (verified):**
  - `internal/feedback/check.go` `normalizeForCheck` already lower-cases and turns non-ASCII digits into ASCII, so Devanagari phone digits reach the digit-run checks.
  - All keyword patterns in `check.go` and `internal/api/safety.go` use `\b`, which in Go's RE2 matches only ASCII word boundaries, so it never matches next to Devanagari letters.
- **Decision:** Add per-category Hindi and Hinglish keyword patterns with explicit boundaries `(?:^|[\s\p{P}])…(?:$|[\s\p{P}])`:
  - Personal details: फ़ोन, मोबाइल, नंबर, पता, गली, मकान, पिन कोड, आधार, ईमेल.
  - Hinglish: mera number, mera pata, ghar ka pata, aadhaar.
  - The safety categories (self-harm, explicit, violence).

  Back them with a committed corpus (`testdata/hi_personal_details.json`, `testdata/hi_clean.json`) and tests: 100% rejection and at least 95% clean acceptance (SC-006). Rejection and safety replies are localised by `lang`.
- **Rationale:** FR-022–FR-024. This is the condition for showing Hindi at all.

## R14. Tutor in Hindi (B5)

- **Decision:**
  - Add `Lang string \`json:"lang,omitempty"\`` to `TutorRequest`, validated against the approved set.
  - `loadTutorPrompt` reads the lesson from `lang/<code>/` and adds "Answer in simple Hindi (Devanagari), keeping technical terms with English in brackets".
  - Citations keep `[<title> § <heading>]` with the Hindi headings.
  - `UncitedFallback` and `SafetyReply` become per-language maps, after the Principle II amendment.
  - Speech recognition uses `lang = 'hi-IN'`.
- **Rationale:** FR-025 and FR-026, with the smallest change to the prepared-prompt path that SPEC-008 FR-021a already uses.
