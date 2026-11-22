# Feature Specification: Marathi and Telugu (last beta languages)

**Feature Branch**: `cloud-beta-2` (no feature branch)

**Created**: 2026-11-22

**Status**: In progress (Marathi drafted 2026-11-23)

**Input**: User description: "Next phase is Telugu and Marathi languages, which will be the last for POC/Beta."

**Relationship to current product**: This follows SPEC-015 (Kannada and Tamil) and `docs/adding-a-language.md`, which lists what that work taught. A new language is mostly content: a language list entry, translated lessons, quizzes and interface text, a glossary, a review ledger and recorded narration. The only code is script support: fonts, and the safety and personal-details rules. With these two, the course has six languages: English, Hindi, Kannada, Tamil, Marathi and Telugu. **No more languages are planned for the POC/beta.**

## Assumptions carried from SPEC-015 (owner may change)

- The owner approves every file as **"owner (beta)"**, and the language menu labels each language as beta. Native readers report problems through "Report a wording problem" (SPEC-016).
- **Record before launch** with the Chirp3-HD voices Kore (Chip), Aoede (Nova) and Charon (Prof. Alan), subject to a listening test.
- **Claude drafts every file** with a per-language glossary, aligns terms afterwards, and checks phone width.
- **Marathi first, then Telugu.** Marathi reuses the Devanagari fonts and digit folding, so it is the cheaper pilot. Telugu needs new fonts.
- Register (owner decision 2026-11-22): Marathi uses **तुम्ही everywhere, Kids included**, replicating the Hindi आप decision. Telugu: ask the owner before Phase 3 (informal నువ్వు for Kids, like Kannada and Tamil, or మీరు everywhere).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A Marathi learner uses the whole course in Marathi (Priority: P1)
A learner picks "मराठी (बीटा)". Everything is in Marathi:
- the interface, all six lessons in all three journeys, the quizzes and the clip captions;
- the recorded voices;
- the Devanagari fonts: Noto Sans Devanagari in every journey, Kids included, as for Hindi;
- a refusal message in Marathi if they write a phone number in feedback.

**Independent Test**: The same checks as Kannada (SPEC-015 US1), for `mr`: language menu, fonts, no "not translated" notice, recordings, and the 390 px width check.

### User Story 2 - A Telugu learner uses the whole course in Telugu (Priority: P2)
The same for "తెలుగు (బీటా)", with the Noto Sans Telugu font and Baloo Tammudu 2 on Kids pages.

### Edge Cases
- Marathi and Hindi share a script. Marathi pages must never fetch a Telugu, Kannada or Tamil font, and the Marathi safety rules must not mistake Hindi words for Marathi ones, or the reverse.
- Telugu has long words: the header and journey tabs must wrap, not overlap (the 2026-11-21 Tamil header fix and test).
- Feedback in Marathi or Telugu: the rule check refuses phone numbers, emails and addresses written in the script, in its native digits, or in romanised form.

## Requirements *(mandatory)*

- **FR-001**: Add `mr` and `te` to `public-content/languages.json`: first as hidden, then approved with beta.
- **FR-002**: Every learner-facing file is translated and approved as owner (beta): the UI strings, 18 lessons, the quizzes, `index.json` and a glossary.
- **FR-003**: Fonts:
  - Marathi reuses Noto Sans Devanagari in every journey, Kids included (Baloo 2 covers Latin characters only; Hindi Kids works the same way).
  - Telugu adds Noto Sans Telugu and Baloo Tammudu 2, self-hosted under OFL, each fetched only when its script is on screen.
- **FR-004**: Personal-details and safety rules, with test sets `testdata/mr_*.json` and `testdata/te_*.json`, cover each language's own words for "my number", "my address" and so on. Server messages exist in both languages.
- **FR-005**: Every narrated track is recorded in both languages before launch. Missing recordings block an approved language, as for Kannada and Tamil.
- **FR-006**: The existing language tests are extended to `mr` and `te`: the menu, fonts, no notice, the 390 px check, and the header at tablet and desktop widths.

## Success Criteria *(mandatory)*

- **SC-001**: Both languages are live as beta, with 0 untranslated learner-facing strings.
- **SC-002**: The recordings cost about $8–12 per language, about $20 for both.
- **SC-003**: Each language's personal-details test set passes 100%.
- **SC-004**: There is no overflow at 390 px, and no header overlap at 768–1280 px.
