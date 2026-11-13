# Contract: Kids content check (SPEC-012 FR-022)

**Runs in:** `go run ./cmd/ingest -verify` (and therefore the release workflow's verify step). It covers English `public-content/lessons/*.junior.json`, and is written in Go (DC-10).

## Output

There is one line per finding, printed to stderr:

```
kids-check: <WARN|FAIL> <lesson>.junior <band> section=<id> rule=<rule> <detail>
```

At the end there is one summary table per lesson and band:

```
kids-check: 3-neuralnetworks 8-11  grade=3.1 avgSentence=9.8 longest=16 maxNewWords=2 missingTerms=0
kids-check: 3-neuralnetworks 12-14 grade=5.4 avgSentence=11.2 longest=18 maxNewWords=3 missingTerms=0
```

## Rules and severity

| rule | Lesson with `bands: true` | Lesson without |
|---|---|---|
| `grade` (8–11 ≤ 3.5, 12–14 ≤ 6.0) | FAIL | WARN |
| `avg-sentence` (≤ 12, 8–11 core) | FAIL | WARN |
| `long-sentence` (≤ 18 words) | FAIL | WARN |
| `new-words` (≤ 2 bold per core section) | FAIL | WARN |
| `missing-term` (bold with no jargon entry) | FAIL | WARN |
| `structure` (data-model §2 validation rules) | FAIL | n/a |
| `missing-visual` (`visual` key with no file or register entry) | FAIL | FAIL |
| `quiz-answer` (answer words not found in the band's text) | WARN | WARN |

- **Exit code:** non-zero if there is any FAIL. WARN lines never change the exit code.
- **Grade formula:** Flesch-Kincaid, `0.39·words/sentences + 11.8·syllables/words − 15.59`, using the vowel-group syllable count of the measurement script so that numbers match the plan's baseline table.
