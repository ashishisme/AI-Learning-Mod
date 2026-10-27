# Data Model: Migrating Existing Spec

Authoritative schemas live in `spec/SPEC.md §6`; this file maps spec.md Key Entities to them.

## Server-side (static JSON, no database — DC-09)

### Curriculum Index — `public-content/index.json`
| Field | Type | Rules |
|---|---|---|
| `commitSha` | string | 40 hex chars; pinned upstream commit |
| `lessons` | `LessonMeta[]` | ordered by `order` |

### Lesson — `public-content/lessons/<id>.json` (`LessonMeta` + `blocks`)
| Field | Type | Rules |
|---|---|---|
| `id` | string | `^[a-z0-9][a-z0-9_-]{0,63}$`; traversal → 404 |
| `module` | string | grouping key on Home |
| `title` | string | used in citations |
| `order` | int | 0-based, dense |
| `path` | string | upstream path |
| `commitSha` | string | 40 hex chars |
| `colabUrl` | string? | optional outbound link |
| `blocks` | `Block[]` | `markdown`, `code`, `image`, `notebook`; unknown types ignored |

Writes are atomic: failed ingestion must not leave partial files (spec Edge Cases).

### Tutor Interaction (ephemeral, not persisted)
Request `{lessonId, question}`: question 1–500 chars, body ≤ 8 KiB, no unknown fields. Response is `{answer}` or an SSE stream (see `contracts/http-api.md`). Valid answer ends with `[<lesson title> § <heading>]` or is the fallback `I couldn't find that in this lesson. Try rephrasing or ask about a different section.`

## Client-side

### Quiz Item — `web/src/data/quizzes.ts` (static bundle)
`LessonQuiz { lessonId, title, description, questions[] }`; `QuizQuestion { id, prompt, options[], correctIndex, rationale, hintKeyword }`. Validation: `correctIndex` within `options`; `lessonId` matches a lesson `id`. Hints are fetched from the tutor using `hintKeyword`.

### Learner Progress, Settings, Theme — `localStorage` (Zustand `persist`)
See `contracts/client-storage.md`. No learner data is transmitted to the server (FR-005, NFR-PRV-01); the only exception is the user-supplied API key/GitHub token sent per request to test/sync endpoints, never stored server-side.

## State transitions
- Lesson: `incomplete ⇄ completed` via `toggleLesson` / `setLessonCompleted`.
- Quiz session: `question i (unanswered) → answered (feedback shown, optional hint) → next … → score recap`.
- Theme: `system | light | dark`; header toggle switches light ⇄ dark.
- Tutor stream: `idle → streaming (token events) → done (cited | fallback)`; or `→ error` with partial text and retry.
