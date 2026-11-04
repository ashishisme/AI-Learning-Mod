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
