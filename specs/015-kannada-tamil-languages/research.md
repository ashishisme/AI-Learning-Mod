# Research: Kannada and Tamil

The point of SPEC-009 was that a new language should mostly be content. These findings check that against the code: what already works for any language, and what is still tied to Hindi.

## R1. What already works for any language (no change)

| Part | Where | Why it needs no change |
|---|---|---|
| Language list, beta label, hidden status | `public-content/languages.json`, `internal/i18n` | Read from the file. FR-I18N-10 beta is already supported. |
| Interface text and quizzes | `web/src/i18n/index.ts`, `web/src/data/quizzes.ts` | Both load `<code>.json` by `import.meta.glob`, so a new file is picked up. |
| Lessons, lesson list, fallback notice | `internal/api/lessons.go`, `public-content/lang/<code>/` | Served by code. The English fallback shows the "not translated yet" notice. |
| Review ledgers, parity, release check | `cmd/review`, `internal/i18n/parity.go`, `cmd/ingest -verify` | Per-language files `content/review/<code>.json`. |
| Narration tracks and recording | `internal/narration`, `cmd/narrate`, `content/voices/<code>.json` | Per language; `-sample` runs the listening test. |
| Clips (SPEC-014) | `internal/ingest/clips.go` | Checks every `lang/*` folder, so Hindi rules apply to `kn` and `ta`. |
| Tutor language | `i18n.AnswerInstruction` | Uses the language's own name and code. |
| Sentence splitting for read-along | `speechService.ts` (`[.!?;\n।॥]`), `cmd/narrate` | Kannada and Tamil end sentences with `.`. The pilot confirms this on real text. |
| Digits in feedback | `internal/feedback/check.go` `digitZeros` | Already folds Tamil (U+0BE6) and Kannada (U+0CE6) digits. |

`internal/i18n/second_language_test.go` already proves a fixture Tamil works with content files only.

## R2. What is tied to Hindi (needs work)

| Gap | Where | Decision |
|---|---|---|
| **Safety rules** | `internal/api/safety.go`: `hiRule` rules are Devanagari and Hinglish only; `normalizeForScreening` folds only Devanagari digits | Add Kannada and Tamil rules plus their romanised forms (Kanglish, Tanglish), with the same `(?:^\| )` start boundary. Generalise the digit fold to every Indian script (reuse `digitZeros` from feedback, moved to `internal/i18n`). |
| **Personal-details rules** | `internal/feedback/check.go`: `hi*` patterns (email "at/dot" words, apps, premises, postcode, stated address, street words, date of birth) and `digitTokenRe` (`\p{Devanagari}`) | Add the same rule families per script: "ಡಾಟ್/டாட்", "ಪಿನ್ ಕೋಡ್/பின் கோடு", "ವಿಳಾಸ/முகவரி", street words ("ರಸ್ತೆ", "ಬಡಾವಣೆ"; "தெரு", "சாலை", "நகர்"), "ಹುಟ್ಟಿದ ದಿನ/பிறந்த நாள்". Extend `digitTokenRe` to `\p{Kannada}` and `\p{Tamil}`. Keep `hiStart`/`hiEnd` as general script boundaries. |
| **Spelling folds** | `i18n.FoldDevanagari` | Kannada and Tamil have no nukta. The common variants are zero-width joiner/non-joiner (U+200C/D) in typed text, so drop those for every script. |
| **Test sets** | `internal/api/testdata/hi_safety.json` (`blocked`/`clean`), `internal/feedback/testdata/hi_personal_details.json` (`[{text, kind}]`), `hi_clean.json` | Add `kn_*` and `ta_*` sets in the same shapes: script, native digits and romanised forms. The tests load every `<code>_*.json`. |
| **Server messages** | `internal/i18n/messages.go`: feedback rejections and kinds, safety replies, the uncited fallback | Add `kn` and `ta` entries. Claude drafts them and the owner approves them with the language. |
| **Fonts** | `web/src/index.css`: only Noto Sans Devanagari (by `unicode-range`); the Kids fonts are Latin-only | Add Noto Sans Kannada and Noto Sans Tamil (variable woff2) with their script ranges (U+0C80–0CFF; U+0B80–0BFF). For Kids, add Baloo Tamma 2 (Kannada) and Baloo Thambi 2 (Tamil), named only under `[data-journey="junior"]`. All are OFL, self-hosted in `web/public/fonts/` with the licence beside them. Downloading these files needs the owner's yes, with file names, source and sizes. |
| **Device voice names** | `speechService.ts` persona `preferredKeywords` list Hindi voices | Add the common Kannada and Tamil device voice names (e.g. "Google ಕನ್ನಡ", "Google தமிழ்"). These are only a fallback, since lessons use recordings. |
| **Font test** | `i18n-foundation.spec.ts` "English pages never fetch … the Devanagari font" | Widen it to the Kannada and Tamil fonts and catalogues (SC-004). |

## R3. Voices

- **Decision:** run the listening test with `go run ./cmd/narrate -lang kn -sample <voice>` for each candidate `kn-IN` voice from the speech service's current list, and the same for `ta-IN`. The owner picks one voice per persona: Chip (bright), Nova (warm), Alan (calm, deeper). Record the choice and date in `content/voices/<code>.json`, as Hindi does.
- **Why:** it's the same process as Hindi (T055 in SPEC-009). `-sample` needs the language's UI greeting, so the interface text is drafted first.
- **Rejected:** choosing voices without listening, since some voices mispronounce English terms kept in the text.

## R4. Translation drafting

- **Decision:** Claude drafts every file from the English, using a glossary first (`content/glossary/kn.json`, `ta.json`, in `hi.json`'s shape). It keeps:
  - Markdown, numbers, link addresses and clip structure;
  - English technical terms in brackets the first time they appear, as Hindi does.

  Scratchpad generators are dev tooling only (DC-10). `go test ./internal/i18n/` (parity) and `go run ./cmd/ingest -verify` run after each file.
- **Order inside a language:**
  1. glossary;
  2. interface text;
  3. Kids, then Plain English, then Detailed lessons;
  4. quizzes;
  5. lesson list (its titles must start the Detailed titles).
- **Rejected:** `cmd/translate` with Gemini (owner chose Claude), and doing both languages at once (owner chose Kannada first).

## R5. Approval

- **Decision:** the owner approves each language's files as `owner (beta)` with `go run ./cmd/review -lang <code> -reviewer "owner (beta)" -approve <paths>`. The language entry has `"beta": true`.
- **Note:** FR-I18N-10 lets a beta language launch without recordings. The owner chose to record anyway, so `languages.json` goes to `approved` only after `-verify` with audio passes.

## R6. Size and cost

- **Text:** 18 lesson files (6 of them Detailed, with clips), a quiz file, 623 interface strings and server messages per language. Hindi took the same volume.
- **Recordings:** about the Hindi count (435 files, about 132 MB) plus SPEC-014 clip steps, for each language. `narrate -dry-run` prices it before recording, and the owner approves the cost.
- **Image size:** the release build copies recordings from the bucket, so each language adds about 130 MB to the image. That's within Cloud Run limits; noted for the owner.

## R7. Releases

- Kannada: v0.12.0 (or the next minor) once `kn` is approved and recorded. Tamil comes in the release after.
- The concept-clip work for the other lessons (SPEC-014) can run alongside. Each new clip adds captions to translate and record in every approved language, so finishing clips first saves re-recording.
