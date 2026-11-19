# Brief: draft Kannada lesson files (SPEC-015 T018/T019)

Repo: `/Users/santoshsharma/Documents/code/AI Learning Mod` (an AI-literacy app for kids and adults in India).
The owner chose "Claude drafts every translation"; the owner reviews later as "owner (beta)". You are writing the
Kannada drafts. Quality matters: natural, correct, warm Kannada that a Bengaluru/Mysuru teacher would be happy with.

## Inputs (read these first)
- English source: `public-content/lessons/<name>.json`
- Hindi translation of the same file (shows the expected structure and the glossary style):
  `public-content/lang/hi/lessons/<name>.json`
- Kannada glossary (owner-confirmed, use these terms): `content/glossary/kn.json`
- Kannada interface strings (already approved; match their names and tone): `web/src/i18n/kn.json`
  Chip is ಚಿಪ್. Look up other names you meet (personas, widgets, journeys) there.
- The list of fields a translation may change: `Translatable[KindAdaptive]` in `internal/i18n/parity.go`.

## Output
`public-content/lang/kn/lessons/<name>.json` (same file name as the English). Write the whole file, then check it.

## Hard rules (a checker enforces them)
1. Same JSON shape as English: same keys, same order is preferred, every array the same length.
2. Translate ONLY the translatable fields. Every other value stays byte-identical to English: ids, `lessonId`, `mode`,
   `origin`, `type`, `scene`, `band`/`bands`, `correctIndex`, `visual`, `clip`, `media`, `cues`, `avatar`, `url`,
   `colabUrl`, `scaffold`, numbers, booleans.
3. Inside translated text keep exactly: fenced code and `code spans`, Markdown link targets `(...)`, bare URLs,
   `{placeholders}`, the number of `§` signs, the number of `<b>` marks, the number of Markdown headings
   (`# ...`) and of list items (`- ` / `1. ` lines). Bold/italics may move to fit Kannada word order.
4. No wordy string may be left in English (the checker flags text identical to English). Short proper names and
   code are fine.
5. Digits: plain ASCII 0-9 (as the interface does), never Kannada numerals.
6. Keep the emoji where the English has them. Use “ ” or ‘ ’ inside text rather than raw ASCII double quotes
   (or escape them) so the JSON stays valid.
7. Clip diagrams (`"type": "clip"`): translate `caption`, `alt` and every `steps[]` item, same count. Each step is
   read aloud by a recorded voice, so it must sound natural spoken, one or two short sentences.

## Style
- Glossary: at the first use of a glossary term in each section, write the Kannada term followed by the English in
  brackets, e.g. **ಯಂತ್ರ ಕಲಿಕೆ (machine learning)**; afterwards just the Kannada. Same convention as the Hindi file.
  If you need a technical term the glossary lacks, choose the term most Kannada speakers would recognise (often a
  transliteration) and list it in your report.
- Kids (`*.junior.json`): simple, warm, spoken Kannada for ages 8–11; short sentences; address the child as ನೀನು
  (as Chip does in the interface). The `teen` layer (12+) may be a little richer. Avoid heavy Sanskrit words where a
  common word exists. Check-in and mini-quiz answers keep the same correct option (do not reorder options).
- Plain English (`*.plain-english.json`): everyday Kannada for adult beginners, ನೀವು, short paragraphs.
- Detailed (`*.detailed.json`): fuller and more precise, still clear; ನೀವು. Worked examples keep their numbers.
- Indian everyday examples in the English stay as they are; do not add new content or drop any.
- Brand and product names (ChatGPT, Google, YouTube...) may stay in Latin script, as in the Hindi file.
- Follow the Hindi file wherever it already made a sensible choice (for example citation text in square brackets).

## Check (run after writing each file, fix until clean)
```bash
cd "/Users/santoshsharma/Documents/code/AI Learning Mod"
go run ./cmd/ingest -verify -audio=false 2>&1 | grep "kn public-content/lang/kn/lessons/<name>\|clip-check: kn <lessonId> " | grep -v "no review entry"
```
Lines that are only `clip-check: kn ... steps=... seconds=...` are informational (that clip passed). Any other line for
your file is a problem to fix. `no review entry` is expected (the owner approves later).

## Do not
- edit any other file (English, Hindi, glossary, ledgers, tests, code); no git commands; no approvals;
- run anything that downloads, records audio or calls an external service.

## Report back (short)
Files written; the final check output (should be empty apart from clip-check info lines); terms you had to choose
that are not in the glossary (Kannada → English); anything the owner should look at.

## Using this brief for Tamil (T029–T030)

Swap these into the brief above:
- language code `ta`; output `public-content/lang/ta/lessons/<name>.json`, quizzes `web/src/data/quizzes/ta.json`;
- glossary `content/glossary/ta.json`, interface strings `web/src/i18n/ta.json` (Chip is சிப், Nova நோவா, Prof. Alan பேரா. ஆலன்);
- natural Tamil a Chennai or Madurai teacher would be happy with: avoid both heavy pure-Tamil coinages and Sanskrit-heavy forms where a common word exists;
- register: Kids address the child as நீ, adults get நீங்கள்;
- glossary style: **இயந்திரக் கற்றல் (machine learning)** at first use in each section;
- digits plain ASCII 0-9, never Tamil numerals;
- the check uses `ta` in place of `kn`.
