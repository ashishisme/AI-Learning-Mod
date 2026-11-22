# Data Model: Kannada and Tamil

Every shape below already exists for Hindi. This feature adds one instance per language.

## Language entry (`public-content/languages.json`)

```json
{ "code": "kn", "name": "ಕನ್ನಡ", "speechLang": "kn-IN", "status": "hidden", "beta": true }
{ "code": "ta", "name": "தமிழ்", "speechLang": "ta-IN", "status": "hidden", "beta": true }
```

| State | Learners see it | Release check |
|---|---|---|
| `hidden` | no | problems are warnings |
| `approved` + `beta` | yes, labelled beta | problems fail the build; recordings are checked (`-verify` with audio) |

A language moves from hidden to approved only when every file is approved and current and every track is recorded (owner decision: record before launch).

## Per-language files

| File | Shape | Rule |
|---|---|---|
| `public-content/lang/<code>/index.json` | as English | same ids and order; each title starts its Detailed title |
| `public-content/lang/<code>/lessons/<id>.<mode>.json` × 18 | as English | parity: same structure, clip names and step counts (FR-CNT-13) |
| `web/src/i18n/<code>.json` | key → string | every English key, placeholders kept |
| `web/src/data/quizzes/<code>.json` | as English | same correct answers |
| `content/glossary/<code>.json` | as `hi.json` | the owner confirms each term |
| `content/voices/<code>.json` | as `hi.json` | one voice per persona: chip, nova, alan |
| `content/review/<code>.json` | ledger | `owner (beta)` approval per file, with source and translation hashes |
| `public-content/audio/<code>/…` + `manifest.json` | as Hindi | every track × 3 personas, current |

## Per-language code entries

| Where | Entry |
|---|---|
| `internal/i18n/messages.go` | feedback rejection text and kinds, safety replies, the uncited fallback |
| `internal/api/safety.go` | script and romanised rules per safety category |
| `internal/feedback/check.go` | personal-details rules per kind (email, phone, address, id_number, dob, link) |
| `internal/api/testdata/<code>_safety.json` | `{ "blocked": [...], "clean": [...] }` |
| `internal/feedback/testdata/<code>_personal_details.json` | `[{ "text", "kind" }]` |
| `internal/feedback/testdata/<code>_clean.json` | `[ "text" ]`, ordinary sentences that must pass |
| `web/src/index.css` | `@font-face` for Noto Sans `<script>` (script `unicode-range`) and the Kids Baloo for the script |
| `web/public/fonts/` | the woff2 files and their OFL licence |
