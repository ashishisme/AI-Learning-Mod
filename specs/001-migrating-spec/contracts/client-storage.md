# Client Storage Contract

All learner state lives in browser `localStorage` via Zustand `persist` (`web/src/store.ts`). Nothing here is sent to the server except where noted.

| Key | Shape | Spec |
|---|---|---|
| `ai-foundations-progress` | `{state:{completedLessons: Record<lessonId, boolean>}, version}` | FR-PRG-01, FR-005 |
| `ai-foundations-settings` | `{state:{settings:{provider, baseUrl, model, apiKey, githubToken, maxBytes}}, version}` | FR-SET-02 |
| `ai-foundations-theme` | `{state:{theme:'light'\|'dark'\|'system'}, version}` | FR-UI-15, FR-008 |

## Rules
- `provider` ∈ `local | openai | custom`. Defaults: `local`, `http://localhost:11434/v1`, `llama3.2:1b`, empty keys, `maxBytes` 1500.
- `isDrawerOpen` is in-memory only (not persisted fields of interest).
- Theme applies the `dark` class on `<html>` on rehydrate and on change.
- `apiKey` / `githubToken` are sent only in the body of `/api/config/test` and `/api/ingest/sync`.
- Storage access may fail (private mode); UI must still render with defaults.
