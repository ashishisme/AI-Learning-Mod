# Implementation Plan: Indian Languages (Text and Audio), Starting with Hindi

**Branch**: `009-indian-languages` (cut from `cloud-beta`) | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-indian-languages/spec.md`

## Summary

Deliver the course in Hindi, text and recorded audio, as five incremental releases that never change the English experience (FR-027):

| Build | Tag | Delivers | Learner-visible |
|---|---|---|---|
| B1 | `v0.2.0` | Language store, in-house `t()`, `en.json`, learner strings moved to keys, `?lang=` on lessons with English fallback, `languages` in `/api/runtime`, Devanagari font loaded only for Devanagari text | No |
| B2 | `v0.2.1` | Ingest of `translations/hi`, `cmd/translate`, review ledger and release gate, Hindi and Hinglish rules in the personal-details check and the safety screen | No (Hindi present but not approved, so hidden) |
| B3 | `v0.3.0` | Approved Hindi text: UI, base lessons, kids and plain-English lessons, quizzes. Switcher appears | **Hindi text** |
| B4 | `v0.3.1` | `cmd/narrate`, Cloud TTS in the release job, cached audio, recorded playback with device-voice fallback | **Hindi audio** |
| B5 | `v0.3.2` | Tutor `lang` field, Hindi prompt, translated fallback and safety replies, microphone `hi-IN`. Needs a Constitution II amendment first (see Constitution Check) | Tutor in Hindi |

Approach in one paragraph. A language becomes visible only when it is listed as `approved` in `public-content/languages.json` **and** the release gate confirms every file in the review ledger, `content/review/<lang>.json`, still has its approved hash. English stays exactly where it is today, at `public-content/index.json` and `public-content/lessons/`. Each other language mirrors that layout under `public-content/lang/<code>/`, so the existing loaders take a different root, and a missing file falls back to English per file. UI strings are flat JSON catalogues loaded with a dynamic `import()`, so the English bundle doesn't grow. Recordings are MP3 files made by a Go CLI that calls Google Cloud Text-to-Speech over REST with the deploy identity's access token, cached in a Cloud Storage bucket by text hash, and packaged into the image. The browser plays a recording when the per-language manifest lists the track, and otherwise uses the device's Hindi voice, never an English one.

## Technical Context

**Language/Version**: Go 1.27.3 (server and CLIs), TypeScript 5 + React 18 + Vite (frontend).

**Primary Dependencies**: Existing only (DC-06):
- **Go:** the standard library, `go-github` (ingest) and `go-openai` (`cmd/translate`).
- **Frontend:** React, React Router, Zustand, react-markdown and the rehype/remark set.

No i18n library. Plurals use `Intl.PluralRules`, and dates and numbers use `Intl`.

**Storage**: Static files only (DC-09):
- **Committed:**
  - `public-content/lang/hi/lessons/*.{junior,plain-english}.json`
  - `web/src/i18n/{en,hi}.json`
  - `web/src/data/quizzes/{en,hi}.json`
  - `content/glossary/hi.json`
  - `content/review/hi.json`
  - `public-content/languages.json`
- **Generated at build:** `public-content/lang/hi/{index.json,lessons/<id>.json}` from upstream, and `public-content/audio/hi/**`.
- **Cloud:** a Cloud Storage bucket used only as the build-time recording cache. Nothing is stored server-side for learners. The language preference lives in browser `localStorage` (FR-002).

**Testing**:
- **Go:**
  - `go test ./...` covers the lesson `lang` fallback, the ingest translation path with a fake upstream, the ledger gate, `narrate` caching against a fake TTS server, the Hindi personal-details corpus and the tutor `lang` field.
  - `cmd/ingest -verify` is the release gate.
- **Browser:** Playwright covers the switcher, Hindi rendering, fallback notices, recorded playback (mocked) and device-voice fallback.
- **Build:** `npm run build`.

**Target Platform**: The same single container on Cloud Run (DC-08). Browsers are current Chrome, Edge, Firefox and Safari on desktop and Android. Hindi audio must not depend on installed voices (SC-004).

**Project Type**: Web application (Go API + React SPA in one binary), plus three build-time Go CLIs: `cmd/ingest` (extended), `cmd/translate` (new) and `cmd/narrate` (new).

**Performance Goals**: The language switch applies in under 1 second (SC-008). Narration starts in under 2 seconds on broadband (SC-003). English pages are no more than 10% slower (SC-007), so the Hindi catalogue and font must never load for English.

**Constraints**:
- No new dependencies (DC-06) and no Python (DC-10).
- Assets come from the app's own origin under the existing CSP (SPEC-008 FR-033, FR-034). `font-src` and `media-src` fall under `default-src 'self'`.
- No long-lived credentials (SPEC-008 FR-023): TTS uses Workload Identity tokens in CI, and the translate key is used only on the owner's machine.
- Learner preference stays in the browser (FR-002).
- Hindi stays hidden until FR-022 and FR-023 pass (FR-024).

**Scale/Scope**:
- **Content:** 6 lessons × 3 modes, 6 quiz sets, and about 300 UI strings on the learner journey (admin stays English).
- **Narration:** about 22,000 narrated English characters across the 12 adaptive lessons, so about 25,000 in Hindi. With 3 voice personas (Chip, Nova, Prof. Alan), that's about 75,000 characters per language per full re-record, about 90 minutes of audio, and about 20–30 MB of MP3 per language.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

Constitution 2.3.0.

| Rule | Status | Note |
| --- | --- | --- |
| I. Master spec ground truth | Pass, with amendments scheduled | `spec/SPEC.md` FR-ING-02 is amended to allow `translations/<lang>/` (B2). New FR-I18N-01..08 and AC-47..AC-52 (AC-39..46 belong to SPEC-008) go into `spec/SPEC.md` and `spec/ACCEPTANCE.md` in the build that implements them. |
| II. Grounded & citable responses | **Blocks B5 only** | The citation form `[<title> § <heading>]` still holds, and `citationRegex` keys on `§`. But Principle II quotes the fallback verbatim in English. A Hindi fallback needs a ratified Principle II amendment ("or its approved translation in the learner's language") before B5. B1–B4 don't touch the tutor. |
| III. DC-01 frontend stack | Pass | React + TS + Vite + Tailwind + Zustand. In-house `t()`. |
| III. DC-02 stdlib router | Pass | `?lang=` handled in the existing handlers. |
| III. DC-03 ingestion | Pass | The `go-github` tree walk is extended. |
| III. DC-06 dependency allowlist | Pass | No new packages. `cmd/translate` uses `go-openai`, and `cmd/narrate` uses `net/http`. |
| III. DC-08 single container | Pass | Audio and fonts are in the image. |
| III. DC-09 minimal state | Pass | All language content is static and packaged. No new server state. |
| III. DC-10 zero Python | Pass | The CLIs are in Go. The font is a pre-subset `woff2` downloaded once and committed. No subsetting tool runs in the build. |
| IV. Quality floor (DC-11) | Pass by design | Hindi screens are checked at 360 px for wrapping, contrast and 44 px targets, with an `impeccable` / `ui-ux-pro-max` review in B3. |
| V. Git discipline | Pass | Explicit paths. Generated `lang/*/lessons/<id>.json` and `audio/` are git-ignored. |
| Quality gates | Pass | `go test ./...`, Playwright and `npm run build` at every build. |

**Post-design re-check (after Phase 1)**: unchanged. The only open item is the Principle II amendment, tracked as the first B5 task and owner-ratified.

## Project Structure

### Documentation (this feature)

```text
specs/009-indian-languages/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R14
├── data-model.md        # Phase 1: entities and files
├── quickstart.md        # Phase 1: validation per build
├── contracts/
│   ├── http-api.md      # ?lang= on lessons, runtime languages, tutor lang
│   ├── content-files.md # layouts and JSON shapes: catalogues, ledger, manifest, glossary
│   └── cli.md           # cmd/ingest, cmd/translate, cmd/narrate flags and exit codes
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
cmd/
├── ingest/main.go            # + -lang flag, translations walk, -verify ledger/key-parity/manifest gate
├── translate/main.go         # NEW: AI draft → draft ledger entries (owner machine only)
└── narrate/main.go           # NEW: Cloud TTS → public-content/audio/<lang>/, manifest, cache dir
internal/
├── ingest/ingest.go          # translations/<lang>/lessons/*, translated_images/<lang>/*.webp
├── i18n/                     # NEW: languages.json loader, ledger + hash verify, key parity (shared by ingest -verify)
├── api/lessons.go            # ?lang= with per-file fallback + Content-Language header
├── api/router.go             # RuntimeInfo.Languages
├── api/tutor.go, tutor_prepare.go   # B5: TutorRequest.Lang, Hindi prompt/fallback
├── api/safety.go             # Hindi + Hinglish patterns, non-ASCII boundaries
└── feedback/check.go         # Hindi + Hinglish personal-details rules
content/
├── glossary/hi.json          # NEW
└── review/hi.json            # NEW: review ledger
public-content/
├── languages.json            # NEW (committed)
├── lang/hi/lessons/*.junior.json, *.plain-english.json   # committed translations
├── lang/hi/{index.json,lessons/<id>.json}                # generated (ignored)
└── audio/hi/<lesson>/<mode>/<track>-<persona>.mp3 + manifest.json  # generated (ignored)
web/
├── public/fonts/NotoSansDevanagari-*.woff2 + OFL.txt     # NEW
└── src/
    ├── i18n/{index.ts,en.json,hi.json}                   # NEW: useT(), loader, Intl helpers
    ├── store.ts                                          # + useLanguageStore
    ├── api.ts                                            # lang on lesson + tutor calls; reads Content-Language
    ├── data/quizzes/{en,hi}.json + quizzes.ts (types + loader)
    ├── services/speechService.ts                         # language-aware voice choice, no English for hi
    ├── components/AudioNarrationButton.tsx               # recorded track first, then device voice
    ├── components/LanguageSwitcher.tsx                   # NEW
    └── components/*, pages/*                             # strings → t('…') (learner journey)
deploy/terraform/main.tf      # B4: texttospeech API, cache bucket, deploy SA roles
.github/workflows/deploy.yml  # B4: narrate step between auth and image build
```

**Structure Decision**: Keep the existing single web-application layout. English content does not move, so B1 carries no content risk. Every other language mirrors the English layout under `public-content/lang/<code>/`, so the lesson handlers only switch their root directory. Build-time tooling stays in `cmd/`, with the shared verification logic in `internal/i18n`. The release gate is the existing `cmd/ingest -verify`, which already runs in CI and in the Dockerfile.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principle II amendment (localised fallback text) before B5 | The spec requires the fallback in Hindi (FR-025) | Showing the English fallback in a Hindi session breaks FR-005 and confuses young learners. Deferring B5 indefinitely drops a spec requirement |
