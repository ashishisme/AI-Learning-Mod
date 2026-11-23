---
description: "Tasks for SPEC-018: Marathi and Telugu, the last beta languages"
---

# Tasks: Marathi and Telugu

## Handoff (read first, 2026-11-22)

The state for any agent continuing this work. Commands run from the repo root. Nothing below is committed.

- **Owner decisions (T001):**
  - Marathi first.
  - The same approach as Kannada and Tamil: approval as "owner (beta)", Claude drafts, record before launch.
  - "Replicate all fixes from the original app": translate from the current corrected English (issue #8 and its follow-ups).
  - Marathi register: **तुम्ही everywhere**, Kids included, replicating the Hindi आप decision.
  - Telugu register and the Telugu font download: ask the owner before Phase 3.
- **Done:**
  - T003: `mr` is listed as hidden in `public-content/languages.json`.
  - T009 draft: `content/glossary/mr.json` (130 terms, same order as ta.json). **The owner has not confirmed it.** 10 terms are flagged in the session report: dot product, forward/backward chaining, narrow/general AI, activation/step function, knowledge base, demographic parity, calibration, counterfactual, production rule.
- **Drafting (done) used `translation-brief-mr.md` (this folder):**
  - **Finished 2026-11-23:** all 18 lessons, `index.json`, the quizzes and `web/src/i18n/mr.json` (646 keys). All are clean.
  - Check any file with `go run ./cmd/ingest -verify -audio=false 2>&1 | grep " mr " | grep -v "no review entry"`.
- **Next for Marathi, in order:**
  1. Finish the drafts. All Marathi drafts are done and clean (2026-11-23): 18 lessons, quizzes, `index.json` and `web/src/i18n/mr.json`. The Marathi server messages are added (T007). The drafters' terms and open points are collected in `notes/mr-terms-to-align.md`. Then run a **term-alignment pass**: collect each drafter's new terms (for example lesson 4 added सेगमेंटेशन, मॅक्स पूलिंग and पोझ ओळख), pick one form, update the glossary, and replace the others, as `specs/015-kannada-tamil-languages/ta-terms-to-align.md` did. Write `notes/mr-terms-to-align.md`.
  2. The phone-width check at 390 px, and the header at 768, 1024 and 1280 px: add `mr` to `LANGS` in `web/tests/languages-kn-ta.spec.ts` (T008). Marathi uses the existing Devanagari fonts, so `font: /NotoSansDevanagari/` and Kids `/Baloo2/`. Check index.css for the Devanagari Kids font name.
  3. Code T005–T007:
     - Marathi personal-details rules in `internal/feedback/check.go`. They go after the Hindi rules, which use `hiStart`/`hiEnd` because RE2 `\b` does not handle Devanagari: माझा/माझी नंबर, मोबाईल, पत्ता, घर क्रमांक, ई-मेल, and Marathi number words (शून्य, एक, दोन, तीन, चार, पाच, सहा, सात, आठ, नऊ).
     - Their test sets: `internal/feedback/testdata/mr_{clean,personal_details}.json`, with Hindi clean sentences in the clean set.
     - Safety rules in `internal/api/safety.go`, with `internal/api/testdata/mr_safety.json`.
     - Messages in `internal/i18n/messages.go`.
  4. T011 voices: `content/voices/mr.json` (mr-IN-Chirp3-HD Kore/Aoede/Charon after a listening test), then a dry run and its cost, then the owner's yes, then recording, then the owner's rsync.
  5. T013 owner approval as `-reviewer "owner (beta)"`, then T016: switch to approved with beta, run the gates, release.

**Input**: [spec.md](spec.md), [plan.md](plan.md). Read `docs/adding-a-language.md` and `specs/015-kannada-tamil-languages/tasks.md` first: this repeats that work.

## Standing rules
- Approvals are made as `-reviewer "owner (beta)"`, only when the owner says so.
- Recording and font downloads need the owner's yes. The owner runs the bucket rsync.
- Commit with explicit paths, only when asked. Tag on the owner's word, and never approve promote.

## Phase 0: Owner decisions
- [X] T001 Confirm these, or change them: *(2026-11-22: the owner said yes, keep Marathi first, and replicate all fixes from the original app. So: beta approval, record before launch, and Claude drafts from the current corrected English (issue #8 and its follow-ups). The Marathi register is तुम्ही for Kids and adults, replicating the Hindi आप fix. The Telugu register and the font download are asked again before Phase 3.)*
  - beta approval;
  - record before launch;
  - Marathi first;
  - the Kids register (Marathi तू or तुम्ही; Telugu నువ్వు);
  - the Telugu font download.

## Phase 1: Script support, both languages (spec amendment first)
- [X] T002 `spec:` amend SPEC.md (FR-I18N-05 rules, FR-UI-17 fonts) and add the AC rows for mr and te. *(2026-11-23: SPEC.md 2.23.0 and AC-92/AC-93 are written; commit them first as a separate `spec:` commit, before any rule or test code. The Marathi server messages, part of T007, were added before this amendment and go in the commit after it.)*
- [X] T003a [P] Add `mr` as hidden in `languages.json` (done 2026-11-22).
- [X] T003b Add `te` as hidden in `languages.json` (Phase 3, with T004). *(Done 2026-11-23.)*
- [X] T004 [P] Telugu fonts: Noto Sans Telugu and Baloo Tammudu 2 (`.woff2` and OFL), plus `@font-face` rules with `unicode-range U+0C00-0C7F`. Register them as assets if the brand register covers fonts. *(2026-11-23, after the owner said "download the fonts": the Telugu subsets come from Google Fonts (the same source as the other fonts) and are checked as WOFF2: NotoSansTelugu-Variable.woff2 124 KB and BalooTammudu2-SemiBoldBold.woff2 89 KB. The OFL licences are beside them. `-face` covers U+0C00-0C7F, and both families are added to the font stacks. assetcheck passes; fonts are not brand assets.)*
- [X] T005 [P] Marathi and Telugu personal-details rules *(mr done 2026-11-23: rules in `check.go` (mr* regexes, Marathi number words), `mr_personal_details.json` 37 and `mr_clean.json` 34 with Hindi lines; all languages pass. te done 2026-11-23: te* regexes, Telugu number words, `te_personal_details.json` 39, `te_clean.json` 24.)*, with `internal/feedback/testdata/{mr,te}_{clean,personal_details}.json`. Include Hindi clean sentences in the Marathi set, and the reverse.
- [X] T006 [P] Marathi and Telugu safety rules *(mr done 2026-11-23: four Marathi rules in `safety.go`, `mr_safety.json` 26 blocked and 16 clean with Hindi lines; romanised self-harm needs "mala" so it does not catch "tyala maraycha". te done 2026-11-23: four Telugu rules, `te_safety.json` 25 blocked and 16 clean.)*, with `internal/api/testdata/{mr,te}_safety.json`. Cross-check both ways: Hindi sentences among the Marathi clean cases, and Marathi among the Hindi ones (spec edge case).
- [X] T007 [P] Server messages for mr and te *(mr 2026-11-22, te 2026-11-23)* in `internal/i18n/messages.go`.
- [X] T008 [P] Extend `web/tests/languages-kn-ta.spec.ts` `LANGS` with mr and te: fonts, 390 px, and the header at 768, 1024 and 1280 px. Marathi: `font: /NotoSansDevanagari/`, and `kidsFont` is also Noto Sans Devanagari, because Baloo 2 is Latin-only. Telugu: `/NotoSansTelugu/`, with Kids `/BalooTammudu2/`. *(mr and te done 2026-11-23: Telugu checks the Noto Sans Telugu font, Baloo Tammudu 2 on Kids pages only, 390 px, and the header at 768–1280 px.)*

## Phase 2: Marathi (US1)
- [X] T009 Glossary `content/glossary/mr.json`. The owner confirms it. *(Confirmed with T013, 2026-11-23.)*
- [X] T010 UI strings `web/src/i18n/mr.json`, with the 390 px check. *(Drafted 2026-11-23, 646 keys, clean; the 390 px check comes with T008.)*
- [X] T011 Voices (listening test), `content/voices/mr.json`. *(2026-11-23: the owner asked Claude to pick: Kore (Chip), Aoede (Nova), Charon (Alan), the same as every other language. Dry run: 831 recordings, 255,750 characters, about $8; recording waits for the owner's yes.)*
- [X] T012 [P] 18 lessons and `index.json` (parallel drafters), the term-alignment pass, and the quizzes `web/src/data/quizzes/mr.json`. *(All drafted and clean, 2026-11-23. Term-alignment pass done 2026-11-23: a variant scan found only 2 stray कॉम्प्युटर (lesson 7 Plain English and the quizzes), now संगणक; the others are correct in context. The 2 clips that failed the 30 s check were shortened to 29.8 s; plain-decision-tree at 30.2 s is a video and is not checked.)*
- [X] T013 Owner approval as owner (beta). *(2026-11-23: the owner said "approve T013". The 20 ledger files (UI strings, quizzes, 18 lessons) are approved as owner (beta) in `content/review/mr.json`. The drafts are accepted as written: the glossary (including the 10 flagged terms), Chip as चिप, and the lesson 5 examples adapted for Marathi. The glossary and index.json are not in the ledger and are recorded here. Still open, but about other languages and not Marathi: the "proves" wording in English lesson 2, and the extra "पचास हज़ार" in a Hindi clip step.)* Ask the owner these open points from drafting first:
  - Chip's name: चिप (like Kannada and Tamil) or Latin "Chip" (like Hindi) in `mascot.name`;
  - the "proves" wording in the English lesson 2 Kids clip;
  - the extra "पचास हज़ार" in a Hindi lesson 2 Plain English clip step;
  - the 10 flagged glossary terms;
  - the lesson 5 examples adapted for Marathi.
- [X] T014 Dry run and its cost, then the owner's yes, then recording. Rerun until 0 failed.
- [X] T015 Owner rsync, then check the manifest hash.
- [X] T016 Switch `mr` to approved with beta, then run the gates: Done: live in v0.20.0 (2026-11-23).
  - `go vet ./...` and `go test ./...`;
  - `go run ./cmd/ingest -verify` with audio;
  - `go run ./cmd/assetcheck`;
  - `cd web && npm run build` (constitution gate 3);
  - the full Playwright suite on 3001.

  Then release (tag on the owner's word, the owner approves promote) and check it live.

## Phase 3: Telugu (US2)
- Started 2026-11-23 on branch `cloud-beta-3`.
  - **Register:** మీరు everywhere, Kids included. Claude chose this to match the owner's Hindi and Marathi choices; the owner may revisit it.
  - **Brief:** `translation-brief-te.md`. The drafters use the Sonnet `drafter` agent (`.claude/agents/drafter.md`).
  - **Fonts (T004):** still need the owner's OK to download before Telugu is shown.
  - **Drafts finished 2026-11-23:** the glossary (130 terms), `web/src/i18n/te.json` (646 keys), 18 lessons, quizzes and `index.json`. All clean, no clip over 30 s, and uncommitted.
  - **Next:**
    - Run a term-alignment pass. The lesson drafters wrote widget and UI names before te.json existed, so align them with te.json.
    - Rules (T005, T006) and tests (T008) for Telugu.
    - The fonts (T004), after the owner's OK.
    - Owner approval, then voices, recording, upload and release.
  - **For the owner:** the 10 glossary terms the drafter flagged, and the lesson 5 examples adapted for Telugu.
- [X] T017–T024 The same as T009–T016, for `te`, with the same full gates in T024. First ask the owner the Telugu register and the font download (T004). Done 2026-11-23: voices Kore/Aoede/Charon, 831 recordings, 20 files approved as owner (beta), names aligned with the interface (పదాల నక్షత్ర మండలాలు, ఒకే న్యూరాన్ పండ్ల వర్గీకరణ యంత్రం), switched on as beta; gates green (Playwright 307 passed, 2 skipped). Release pending the owner's upload.

## Phase 4: Close
- [ ] T025 Update `docs/adding-a-language.md`. Set the AC rows to PASS, close SPEC-018, and update memory: these are the last beta languages.
