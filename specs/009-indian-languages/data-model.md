# Data Model: Indian Languages

Everything here is a static file or browser-local state. Nothing is stored server-side (DC-09). Shapes are defined in [contracts/content-files.md](./contracts/content-files.md).

## Language

- **Fields**:
  - `code`: BCP 47 primary tag such as `hi`. Pattern `^[a-z]{2,3}$`.
  - `name`: native display name, e.g. `हिन्दी`.
  - `status`: `hidden` or `approved`.
  - `speechLang`: e.g. `hi-IN`, for device voices and speech recognition.
- **Source**: `public-content/languages.json`. English (`en`) is implicit and always approved.
- **Rules**: Only `approved` languages appear in `/api/runtime.languages` and the switcher (FR-001, FR-018). Setting `approved` is accepted by the gate only when the language's review ledger is fully approved and current, and the narration manifest is complete (from B4).
- **Lifecycle**: `hidden` → `approved` happens in a reviewed PR. The reverse withdraws the language, and learners fall back to English with a notice.

## LanguagePreference (browser only)

- **Fields**:
  - `code`: the chosen language.
  - `chosenAt`: an ISO date, used only to tell a first visit from a later one.
- **Source**: the `localStorage` key `ai-foundations-language`, through Zustand `persist`.
- **Rules**:
  - On a first visit, the default is `hi` only if Hindi is approved and comes before `en` in `navigator.languages` (FR-003).
  - A stored code that is no longer approved shows English and keeps the stored value.
  - It is never written server-side (FR-002).

## TranslatedFile

- **Kinds**:
  - `base`: generated from upstream, at `public-content/lang/<code>/lessons/<id>.json`.
  - `adaptive`: committed, at `…/<id>.junior.json` and `…/<id>.plain-english.json`.
  - `quiz`: `web/src/data/quizzes/<code>.json`.
  - `ui`: `web/src/i18n/<code>.json`.
- **Rules**: It has the same keys and structure as its English counterpart (FR-019). Technical terms show the English in brackets at first use per section (FR-008). Code, links and `§` are preserved.

## ReviewEntry (ledger)

- **Fields**:
  - `path`
  - `kind`
  - `sourceHash`: SHA-256 of the English source file, or of the upstream translated README for `base`.
  - `translationHash`: SHA-256 of the translated file at approval.
  - `status`: `draft` or `approved`.
  - `reviewer`: a name or handle (no contact details).
  - `date`: ISO date.
- **Source**: `content/review/<code>.json`.
- **States**: `draft` → `approved` (reviewer and date set). An `approved` entry becomes **stale** if either hash no longer matches. Stale counts as not approved.
- **Rules**: The gate fails if any entry for an approved language is a draft or stale, or if any English file has no entry (FR-017–FR-019).

## GlossaryTerm

- **Fields**:
  - `en`: e.g. `neural network`.
  - `target`: e.g. `तंत्रिका नेटवर्क`.
  - `note`: optional usage note.
- **Source**: `content/glossary/<code>.json`.
- **Rules**: `cmd/translate` must use `target` and append ` (en)` at first use per section. Reviewers edit the glossary in the same PR as the content.

## VoiceMapping

- **Fields**:
  - `persona`: `chip`, `nova` or `alan`.
  - `voice`: the TTS voice name.
  - `speakingRate`
  - `pitch`
- **Source**: `content/voices/<code>.json`.
- **Rules**: One voice per persona offered in the UI (FR-012).

## NarrationTrack

- **Fields**:
  - `key`: `<lessonId>/<mode>/<trackId>` or `global/<trackId>`.
  - `persona`
  - `file`: a path under `public-content/audio/<code>/`.
  - `hash`: SHA-256 of `voice` + normalised text.
  - `bytes`
  - `seconds`
- **Source**: `public-content/audio/<code>/manifest.json`, generated.
- **Rules**: Text is built by the same rule as the UI (R10). A track is re-synthesised only when its hash is missing from the cache (FR-014). Every narrated track of an approved language must be present and current (FR-012).

## Relationships

```text
Language 1─* TranslatedFile 1─1 ReviewEntry
Language 1─1 Glossary 1─* GlossaryTerm
Language 1─1 VoiceMapping set ─* NarrationTrack
TranslatedFile(adaptive) 1─* NarrationTrack (one per narrated section × persona)
LanguagePreference *─1 Language (browser only)
```
