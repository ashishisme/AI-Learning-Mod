# Implementation Plan: Kannada and Tamil

**Branch**: `cloud-beta` (spec folder `015-kannada-tamil-languages`) | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/015-kannada-tamil-languages/spec.md`

## Summary

Add Kannada, then Tamil, as beta languages that the owner approves, with recorded voices, using the SPEC-009 language framework.

Most of the work is content:
- glossary and interface text;
- 18 lesson versions, including clip captions;
- quizzes and the lesson list;
- voices and recordings.

Claude drafts it and the owner approves each file as `owner (beta)`.

The code work is the Hindi-only parts found in [research.md](research.md) R2:
- **Safety and personal-details rules:** Kannada/Tamil script and romanised (Kanglish/Tanglish) rules, all Indian digits folded, and zero-width joiners dropped.
- **Server messages:** Kannada and Tamil entries.
- **Fonts:** self-hosted Noto Sans Kannada and Tamil, plus the Baloo Tamma 2 and Baloo Thambi 2 Kids fonts, each loaded only when its script is on screen.
- **Device voice names:** Kannada and Tamil added to the fallback list.
- **Tests:** the font test widened, and the safety test sets loaded per language.

The code lands once and covers both scripts. Content ships Kannada first (v0.12.0), then Tamil.

## Technical Context

**Language/Version**: Go 1.27.4; TypeScript 5 + React 18

**Primary Dependencies**: existing only. The fonts are files, not packages: four OFL woff2 files, downloaded with the owner's approval.

**Storage**: committed content files; recordings in the narration bucket (about 130 MB per language)

**Testing**: Go (`internal/api`, `internal/feedback`, `internal/i18n`, `cmd/ingest`), Playwright (i18n specs plus a new `languages-kn-ta.spec.ts`)

**Target Platform**: existing web app on Cloud Run; phone and desktop browsers

**Project Type**: web application (Go API + React SPA)

**Performance Goals**: English and Hindi pages fetch no new font or catalogue (SC-004). Script fonts load only on Kannada or Tamil pages.

**Constraints**:
- DC-10: no Python in the app.
- DC-11: contrast ≥ 4.5:1 and targets ≥ 44×44 in both scripts at 390 px.
- No new npm packages.
- The page security rule is unchanged: fonts are self-hosted.
- Downloads need the owner's yes.

**Scale/Scope**: 2 languages × (18 lessons + quizzes + 623 strings + glossary + messages + about 480 recordings)

## Constitution Check

| Principle / constraint | Check | Result |
|---|---|---|
| I. Spec-first | `spec/SPEC.md` amendment for per-script safety and personal-details rules (FR-I18N-05 scope), fonts (R12 extension) and AC rows, committed before code | Pass |
| II. Tutor grounding | Unchanged: `AnswerInstruction` plus Kannada/Tamil fallback text; citations stay in the lesson's language | Pass |
| III. DC-01 stack, no new packages | Fonts are static files, not npm packages | Pass |
| III. DC-09 static content | All content is committed files | Pass |
| III. DC-10 no Python | Drafting scripts are scratchpad dev tooling only | Pass |
| IV. DC-11 | Phone-width and contrast checks per language (FR-010) | Pass |
| IV. Text never interpreted as HTML | Unchanged rendering | Pass |
| Personal data (DC-09 state rules) | Stronger: new script rules stop personal details in feedback | Pass |
| V. Git discipline | Explicit paths | Pass |

No violations.

## Project Structure

### Documentation

```text
specs/015-kannada-tamil-languages/
├── spec.md  plan.md  research.md  data-model.md  quickstart.md
├── contracts/language-pack.md
└── checklists/requirements.md
```

### Source Code

```text
spec/SPEC.md, spec/ACCEPTANCE.md                 # amendment
internal/i18n/fold.go                            # all-script digits, joiners
internal/i18n/messages.go                        # kn, ta messages
internal/api/safety.go (+ testdata/kn_*, ta_*)   # script + romanised rules
internal/feedback/check.go (+ testdata/kn_*, ta_*)
web/src/index.css, web/public/fonts/             # Noto Sans Kannada/Tamil, Baloo Tamma 2/Thambi 2 + OFL
web/src/services/speechService.ts                # device voice names (fallback)
web/tests/i18n-foundation.spec.ts                # font test widened
web/tests/languages-kn-ta.spec.ts                # new
public-content/languages.json                     # kn, ta (hidden → approved, beta)
public-content/lang/{kn,ta}/…                    # index + 18 lessons
web/src/i18n/{kn,ta}.json, web/src/data/quizzes/{kn,ta}.json
content/glossary/{kn,ta}.json, content/voices/{kn,ta}.json, content/review/{kn,ta}.json
public-content/audio/{kn,ta}/…                   # recordings (bucket)
docs/adding-a-language.md                        # lessons learned
```

**Structure Decision**: the existing layout. Script support is added next to the Hindi rules in the same files, so each language's rules sit side by side.

## Delivery

1. **A, code for both scripts:**
   - spec amendment;
   - folds, safety and personal-details rules, with test sets in both scripts;
   - server messages;
   - fonts (after the owner approves the downloads);
   - device voice names;
   - font test.

   Both languages stay hidden, so nothing changes for learners.
2. **B, Kannada content:**
   - glossary (owner confirms), then interface text, then the listening test (owner picks the voices);
   - lessons (Kids, Plain English, Detailed), quizzes, lesson list;
   - owner approves each file as `owner (beta)`;
   - dry run, cost approval, recording, owner upload;
   - set `approved` + beta, run the checks, release v0.12.0.
3. **C, Tamil content:** the same as B, with the 390 px overflow check for long words; release in the next version.
4. **D:** update `docs/adding-a-language.md` with what the pilot taught, then close SPEC-015.

## Complexity Tracking

None.
