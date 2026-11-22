# Brief: draft Marathi lesson files (SPEC-018 T012)

Repo: `/Users/santoshsharma/Documents/code/AI Learning Mod` (an AI-literacy app for kids and adults in India).
The owner chose "Claude drafts every translation"; the owner reviews later as "owner (beta)". You are writing the
Marathi drafts. Quality matters: natural, correct, warm Marathi that a Pune or Mumbai teacher would be happy with.

## Inputs (read these first)
- English source: `public-content/lessons/<name>.json`
- Hindi translation of the same file (shows the expected structure and the glossary style):
  `public-content/lang/hi/lessons/<name>.json`
- Marathi glossary (owner-confirmed, use these terms): `content/glossary/mr.json`
- Marathi interface strings (already approved; match their names and tone): `web/src/i18n/mr.json`
  Chip is चिप. Look up other names you meet (personas, widgets, journeys) there.
- The list of fields a translation may change: `Translatable[KindAdaptive]` in `internal/i18n/parity.go`.

## Output
`public-content/lang/mr/lessons/<name>.json` (same file name as the English). Write the whole file, then check it.

## Hard rules (a checker enforces them)
1. Same JSON shape as English: same keys, same order is preferred, every array the same length.
2. Translate ONLY the translatable fields. Every other value stays byte-identical to English: ids, `lessonId`, `mode`,
   `origin`, `type`, `scene`, `band`/`bands`, `correctIndex`, `visual`, `clip`, `media`, `cues`, `avatar`, `url`,
   `colabUrl`, `scaffold`, numbers, booleans.
3. Inside translated text keep exactly: fenced code and `code spans`, Markdown link targets `(...)`, bare URLs,
   `{placeholders}`, the number of `§` signs, the number of `<b>` marks, the number of Markdown headings
   (`# ...`) and of list items (`- ` / `1. ` lines). Bold/italics may move to fit Marathi word order.
4. No wordy string may be left in English (the checker flags text identical to English). Short proper names and
   code are fine.
5. Digits: plain ASCII 0-9 (as the interface does), never Marathi numerals.
6. Keep the emoji where the English has them. Use “ ” or ‘ ’ inside text rather than raw ASCII double quotes
   (or escape them) so the JSON stays valid.
7. Clip diagrams (`"type": "clip"`): translate `caption`, `alt` and every `steps[]` item, same count. Each step is
   read aloud by a recorded voice, so it must sound natural spoken, one or two short sentences.

## Style
- Glossary: at the first use of a glossary term in each section, write the Marathi term followed by the English in
  brackets, e.g. **मशीन लर्निंग (machine learning)** (use the exact term in the Marathi glossary); afterwards just the Marathi. Same convention as the Hindi file.
  If you need a technical term the glossary lacks, choose the term most Marathi speakers would recognise (often a
  transliteration) and list it in your report.
- Kids (`*.junior.json`): simple, warm, spoken Marathi for ages 8–11; short sentences; address the child as तुम्ही (see Marathi specifics)
  (as Chip does in the interface). The `teen` layer (12+) may be a little richer. Avoid heavy Sanskrit words where a
  common word exists. Check-in and mini-quiz answers keep the same correct option (do not reorder options).
- Plain English (`*.plain-english.json`): everyday Marathi for adult beginners, तुम्ही, short paragraphs.
- Detailed (`*.detailed.json`): fuller and more precise, still clear; तुम्ही. Worked examples keep their numbers.
- Indian everyday examples in the English stay as they are; do not add new content or drop any.
- Brand and product names (ChatGPT, Google, YouTube...) may stay in Latin script, as in the Hindi file.
- Follow the Hindi file wherever it already made a sensible choice (for example citation text in square brackets).

## Check (run after writing each file, fix until clean)
```bash
cd "/Users/santoshsharma/Documents/code/AI Learning Mod"
go run ./cmd/ingest -verify -audio=false 2>&1 | grep "mr public-content/lang/mr/lessons/<name>\|clip-check: mr <lessonId> " | grep -v "no review entry"
```
Lines that are only `clip-check: mr ... steps=... seconds=...` are informational (that clip passed). Any other line for
your file is a problem to fix. `no review entry` is expected (the owner approves later).

## Do not
- edit any other file (English, Hindi, glossary, ledgers, tests, code); no git commands; no approvals;
- run anything that downloads, records audio or calls an external service.

## Report back (short)
Files written; the final check output (should be empty apart from clip-check info lines); terms you had to choose
that are not in the glossary (Marathi → English); anything the owner should look at.


## Marathi specifics (these override anything above)
- Natural Marathi that a Pune or Mumbai teacher would be happy with; avoid heavy Sanskrit coinages where a common word
  or transliteration is what people say. Devanagari script, ASCII digits 0-9 only (never Devanagari digits).
- Register (owner decision, replicating the Hindi आप fix): address the learner as **तुम्ही** in ALL journeys,
  Kids included, with matching polite verb forms (e.g. "पाहा", "करा", "निवडा"). Never तू.
- Glossary style: e.g. **मशीन लर्निंग (machine learning)** — use the term from `content/glossary/mr.json` with the
  English in brackets at first use in each section.
- Chip is चिप, Nova नोव्हा, Prof. Alan प्रा. ॲलन.
- The English source already contains every content fix made so far (issue #8 and follow-ups). Translate meaning
  faithfully: e.g. a pixel's colour becomes numbers (not one number); a written rule only works on what the computer
  can see; a Turing-game clue is a clue, not proof; a fairness gap is a warning to investigate. Do not reintroduce
  the old wording you may see in other languages' older versions.
- The Marathi interface strings file may not exist yet while you work; use the Hindi file for UI names and
  translate them yourself consistently.
