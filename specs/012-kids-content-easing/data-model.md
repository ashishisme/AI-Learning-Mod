# Data Model: Easier Kids Lessons (SPEC-012)

There is no server-side state. Both entities below are either static lesson JSON shipped with the release or browser-local state (DC-09).

## 1. Age band (browser only)

**Store:** `ai-foundations-audience-mode` in `web/src/store.ts`, version 1 → **2**.

| Field | Type | Rule |
|---|---|---|
| `mode` | `AudienceMode` | unchanged |
| `hasChosenJourney` | boolean | unchanged |
| `ageBand` | `"8-11" \| "12-14"` | **new**, default `"8-11"` |

- **Migration v1 → v2:** keep `mode` and `hasChosenJourney`, and set `ageBand: "8-11"`. Migration v0 → v2 applies the existing v0 rule, then sets the default band.
- **Never leaves the device.** The band is not a query parameter. The lesson request stays `GET /api/lessons/{id}?mode=junior&lang=…`, and the full lesson, 12+ parts included, is filtered in the browser. No feedback, usage or tutor payload reads `ageBand`.
- **Applies only when `mode === "junior"`.** Other journeys ignore it.

## 2. Kids lesson (adaptive lesson, `mode: "junior"`)

These are new optional fields on the existing `AdaptiveLessonPayload` and `AdaptiveSection` (`web/src/api.ts:378`). The full shape is in [contracts/lesson-format.md](./contracts/lesson-format.md).

```
AdaptiveLessonPayload
  bands?: true                    # this lesson follows SPEC-012 rules; the content check blocks on it
  recap?: string[3]               # "3 things you learned", shown before miniQuiz
  miniQuiz[]
    band?: "12-14"                # shown only in 12–14; such items come after all core items
  sections[]                      # one section = one card (60–80 words of core text)
    bigIdea?: string              # one line in Chip's voice, shown first
    more?: { title?, bodyMarkdown }  # "Want to know more?": closed in 8–11, open in 12–14
    teen?:
      add?: string                # Markdown appended after bodyMarkdown in 12–14
      body?: string               # replaces bodyMarkdown in 12–14 (Option B fallback for one card)
      jargonBuster?: JargonEntry[]  # extra terms used only in teen text
    checkIn?: ChoiceQuestion      # one tap-to-answer, not scored
    jargonBuster[]
      visual?: string             # key of web/public/brand/words/<key>.svg
```

### Validation rules (content check, for lessons with `bands: true`)

| Rule | Source |
|---|---|
| `teen.add` and `teen.body` are never both set | FR-007 |
| every `band: "12-14"` quiz item comes after every core item | R2 |
| at most one `band: "12-14"` quiz item | FR-008 |
| `recap` has exactly 3 items | FR-004 |
| every section has `bigIdea` and a visual: a `diagram`, a `visual` on a jargon entry, or a scene card | FR-002 |
| every `**bold**` in a core body has a matching core `jargonBuster` term; every bold in teen text has a match in core or teen terms | FR-010 |
| at most 2 bold terms per core section | FR-001 |
| every `visual` key exists in `web/public/brand/words/` and in the asset register | FR-020 |
| core text (`bigIdea` + `chipQuote` + `analogy.description` + `bodyMarkdown`): FK ≤ 3.5, average sentence ≤ 12 words, longest ≤ 18 | FR-001 |
| core + teen text: FK ≤ 6 | FR-001 |
| quiz answer words found in the band's text | FR-022 (warning only, R8) |

### Band rendering (what each band sees)

| Part | 8–11 | 12–14 |
|---|---|---|
| `bodyMarkdown` | shown | shown, then `teen.add`, or replaced by `teen.body` |
| `teen.jargonBuster` | hidden | added to the section's terms |
| `more` | closed | open |
| `miniQuiz` with `band` | hidden | shown last |
| widget `scaffold` | forced `guided` | as written |
| narration | `section-<id>` | `section-<id>`, then `section-<id>-teen` |

A lesson **without** `bands: true` renders exactly as today in both bands (FR-023).

## 3. Word card (derived, not stored separately)

A word card is built from a `jargonBuster` entry: `term`, `simpleExplanation` and `visual`. Hindi gets its own cards from the Hindi lesson file's translated entries, and `visual` must equal the English value (parity).

## 4. Hindi parity paths (additions to `internal/i18n/parity.go` `Translatable[KindAdaptive]`)

```
recap[]
sections[].bigIdea
sections[].more.title          sections[].more.bodyMarkdown
sections[].teen.add            sections[].teen.body
sections[].teen.jargonBuster[].term   sections[].teen.jargonBuster[].simpleExplanation
sections[].checkIn.question    sections[].checkIn.options[]   sections[].checkIn.praise   sections[].checkIn.explanation
```

`bands`, `miniQuiz[].band`, `jargonBuster[].visual` and `checkIn.correctIndex` are not translatable, so they must equal the English values.

## 5. Narration tracks (Hindi recordings)

| Key | Text | When it is re-recorded |
|---|---|---|
| `<lesson>/junior/section-<id>` | core: heading, chipQuote, bigIdea, body | the text hash changes (existing rule) |
| `<lesson>/junior/section-<id>-teen` | `teen.add` or `teen.body` | **new**, when present |

There are 3 personas per track (`narration.Personas`). Word cards and check-ins use device speech, with no recordings.
