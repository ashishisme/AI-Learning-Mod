# Implementation Plan: Marathi and Telugu

**Branch**: `cloud-beta-2` | **Date**: 2026-11-22 | **Spec**: [spec.md](spec.md)

Follow `docs/adding-a-language.md` and the SPEC-015 tasks, which were proven twice.

## Code (Phase A, for both languages)

| Area | Marathi | Telugu |
|---|---|---|
| `public-content/languages.json` | `mr`, "मराठी", `mr-IN`, hidden | `te`, "తెలుగు", `te-IN`, hidden |
| Fonts (`web/src/index.css`, `web/public/fonts`) | None needed: the Devanagari fonts already ship. | Noto Sans Telugu (variable) and Baloo Tammudu 2, with `unicode-range: U+0C00-0C7F`. **The downloads need the owner's yes.** |
| Digit folding (`internal/i18n/fold.go`) | Already folds Devanagari. | Already folds Telugu digits (U+0C66–0C6F). |
| Personal-details rules (`internal/feedback/check.go`) | Marathi phrases: माझा/माझी नंबर, मोबाईल, पत्ता, घर, ई-मेल. | Telugu phrases: నా నంబర్, ఫోన్, చిరునామా, ఇల్లు, ఈమెయిల్. |
| Safety rules (`internal/api/safety.go`) | Marathi phrases. | Telugu phrases. |
| Test sets | `internal/feedback/testdata/mr_{clean,personal_details}.json`, `internal/api/testdata/mr_safety.json` | The same with `te_` |
| Server messages (`internal/i18n/messages.go`) | mr | te |
| Browser tests (`web/tests/languages-kn-ta.spec.ts`) | Add `mr` to `LANGS`. | Add `te` to `LANGS`. |

## Content (Phase B: Marathi, then Phase C: Telugu)

1. **Glossary.** Copy the term list from `content/glossary/ta.json` (130 terms; kn.json has only 72). The owner confirms the main terms.
2. **Interface strings,** 646 keys. Shorten any that overflow at 390 px.
3. **Lessons and quizzes.** 18 lessons, drafted by parallel subagents with a brief like `specs/015-kannada-tamil-languages/translation-brief.md`, then a term-alignment pass. Plus the quizzes and `index.json`.
4. **Owner approval** as owner (beta).
5. **Recording:** the listening test, then a dry run with its cost, then the owner's yes, then recording. The owner uploads and we check the manifest.
6. **Release:**
   - switch the language to approved with beta;
   - run the gates;
   - tag, and the owner approves promote;
   - check it live.

## Cost

- **Recordings:** about 831 per language. Kannada's 274k characters cost about $8, so expect **about $8–12 per language**.
- **Fonts:** free (OFL). The download needs the owner's yes.
- **Storage:** about 85 MB per language in the bucket, well under ₹10 a month.

## Risks

- **Marathi and Hindi look alike.** The safety and personal-details rules must be tested with each other's sentences, so that neither language blocks the other's clean text.
- **Telugu words are long**, as Tamil's are. The header and tab wrapping fixes from 2026-11-21 already apply, and the tests run at 390, 768, 1024 and 1280 px.
- **Register:** decided on 2026-11-22: Marathi uses तुम्ही everywhere, Kids included, replicating the Hindi आप decision.
