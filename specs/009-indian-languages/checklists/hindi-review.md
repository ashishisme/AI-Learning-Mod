# Hindi release record

**Purpose**: Measurements and review status for the Hindi releases (SPEC-009 T068, T050).
**Updated**: 2026-11-04

## Releases

| Tag | Date | What changed for Hindi | Learners see |
| --- | --- | --- | --- |
| v0.4.2 | 2026-11-04 | One vocabulary with the source course: न्यूरल नेटवर्क, वेक्टर. 10 files re-approved, 9 recordings redone | Hindi (beta), recorded voices |
| v0.4.1 | 2026-11-03 | 171 recorded narration tracks (57 × Chip, Nova, Alan) | Hindi (beta), recorded voices |
| v0.4.0 | 2026-11-03 | Hindi offered as a beta (FR-I18N-10), device voices | Hindi (beta) |
| v0.3.3 | 2026-11-03 | Hindi drafts completed, still hidden | English only |
| v0.3.2 | 2026-11-03 | B1 to B5 code, Hindi hidden | English only |

## Size and start-up (T068)

| Build | Image, compressed (linux/amd64) | Container start-up |
| --- | --- | --- |
| v0.1.x, English only | 15.4 MiB | Under Cloud Run's ~5.1 s histogram bucket |
| v0.3.x to v0.4.0, Hindi text | 17.0 MiB | Same bucket |
| v0.4.1 and later, with recorded audio | 63.8 MiB | Same bucket |

Cloud Run reports start-up latency only in histogram buckets, so the exact change from the audio is below what it can show. Every revision from 00001 to 00015 sits in the same bucket.

## English speed against v0.1.2 (SC-007, T090)

Measured 2026-11-04 on this Mac. Both builds served the same English lessons from their own server, in Chromium with no cache, over a throttled link (20 Mbit/s down, 20 ms latency). Each figure is the median of 7 loads.

| Measure | v0.1.2 | Now (v0.4.3) | Change |
| --- | --- | --- | --- |
| JS and CSS an English visitor downloads first, gzip | 447.3 KiB | 455.5 KiB | +1.8% |
| All JS, gzip (Hindi text is in separate files English never fetches) | 1,728.2 KiB | 1,759.4 KiB | +1.8% |
| `/` until the network is quiet | 1,127 ms | 1,146 ms | +1.7% |
| `/lesson/1-intro` until the network is quiet | 2,216 ms | 2,253 ms | +1.7% |

The Devanagari font (117 KiB) downloads only when Devanagari text is on screen (`unicode-range`). Both changes are within the 10% limit.

## Narration start (SC-003, T093)

Measured 2026-11-04 with the current server and the real recordings, over the same throttled link: from pressing "यह भाग पढ़ें" on the Kids lesson 1 to the recorded Chip track playing. The 7 runs took 202, 207, 208, 214, 220, 235 and 561 ms, a median of 214 ms, against a 2-second target. The live site adds about 0.13 s of connection time from India (SPEC-008 T122).

## Text-to-speech characters billed

| Run | Characters | Note |
| --- | --- | --- |
| First full recording (v0.4.1) | about 225,000 across 3 voices | 171 tracks |
| Re-run with unchanged text | 0 | SC-009 |
| v0.4.2 vocabulary change | 3,393 | 3 tracks × 3 voices |

## Review status (T050)

- All 20 Hindi files are approved as "owner (beta)" under FR-I18N-10.
- A native speaker's review is still open. Use `go run ./cmd/review -lang hi`, then re-record any changed tracks with `go run ./cmd/narrate -lang hi`, and drop `beta` from `public-content/languages.json`.
- Terms follow the source course's Hindi full lessons (SPEC-009, Session 2026-11-04). The glossary is `content/glossary/hi.json`.

## Interface and accessibility review (T051, T079)

Reviewed 2026-11-04 in Chromium at 360×740 and 1280×900, in light and dark themes. All six Hindi lessons were checked in Kids mode, covering their lesson-specific widgets.

- Devanagari text wrapped without horizontal page overflow at either viewport.
- Interactive controls had a 44 px minimum target; text fields and sliders now receive that floor in `web/src/index.css`.
- Each lesson has one main landmark. `scroll-padding-top: 4rem` keeps focused content clear of the 56 px sticky header.
- Keyboard traversal reached visible controls, and no unlabelled interactive control was found in the checked views.
- `npm --prefix web test -- --project=chromium tests/i18n.spec.ts` passed: 14 tests.

The Impeccable engine was not run because `CLAUDE.md` requires owner approval before its launcher downloads a native binary. Its documented fallback references and the UI UX Pro Max accessibility guidance were used instead.
