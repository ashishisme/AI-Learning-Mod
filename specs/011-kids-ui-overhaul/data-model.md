# Data Model: Kids-First UI Overhaul

## Journey preference (browser)

The existing store `ai-foundations-audience-mode` keeps its shape and gains one flag.

| Field | Type | Rule |
| --- | --- | --- |
| `mode` | `standard` \| `junior` \| `plain-english` | Unchanged. `junior` displays as Kids. |
| `hasChosenJourney` | boolean | False only when no preference was ever saved; shows the first-time chooser. |

| Persisted input | Result |
| --- | --- |
| no preference | `standard` until chosen, `hasChosenJourney=false`, chooser shown |
| `standard`, `junior` or `plain-english` | kept exactly, `hasChosenJourney=true` |
| malformed | `standard`, `hasChosenJourney=false` |

`ai-foundations-progress` is not modified.

## Lesson delivery state

| Field | Values | Rule |
| --- | --- | --- |
| `mode` | active AudienceMode | Sent with lesson and tutor requests, as today. |
| `availability` | `ready`, `loading`, `unavailable`, `error` | Unavailable shows the existing message with a journey switch. |
| `servedLang` | language code | Existing translated-language signalling remains. |

## Visual asset register

Machine-readable `design/brand/asset-register.json`, with: `id`, `purpose`, `releaseFiles` + SHA-256, `sourceMaster`, `creator` (for AI art: `model`, `modelVersion`, `prompt`, `references`, `generatedAt`), `rightsBasis`, `rightsEvidence`, `trademarkScreen` (`clear|needs-review|blocked`), `altKey` or `decorative`, `motion`, `status` (`draft|approved|retired`) and reviewers/dates. Only `approved` assets ship.

## Feedback

Unchanged: submissions record `standard`, `junior` or `plain-english`.

