# Quickstart: Validating the Migrated Spec

Proves the existing app still satisfies `spec.md` end to end. Contracts: [http-api](./contracts/http-api.md), [client-storage](./contracts/client-storage.md). Entities: [data-model](./data-model.md).

## Prerequisites
- Go 1.23+, Node 18+, `GITHUB_TOKEN` (ingestion only), optional `OPENAI_API_KEY` or a local OpenAI-compatible endpoint (default Ollama at `http://localhost:11434/v1`).

## 1. Verification gate (Constitution, SC-006)
```bash
go test -v ./internal/api ./cmd/ingest      # expect 15+ passing
cd web && npm ci && npx playwright test      # expect 24+ passing
cd web && npm run build                      # tsc --noEmit && vite build
```

## 2. Run the app
```bash
GITHUB_TOKEN=... go run ./cmd/ingest         # writes public-content/ (US1)
cd web && npm run build && cd ..
go run ./cmd/server                          # PORT defaults to 8080
```

## 3. Scenario checks
| Story | Steps | Expected |
|---|---|---|
| US1 | `curl :8080/api/health`; open `/`, then a lesson | `{"ok":true}`; modules, progress, sanitized lesson, Colab button |
| US1 edge | Start with empty `CONTENT_DIR` | `/api/lessons` 503; UI shows ingestion prompt |
| US2 | Ask an in-lesson question in the tutor panel | Streamed tokens, ends `[<title> § <heading>]` |
| US2 edge | Ask an off-topic question | Fallback phrase |
| US3 | Open `/quiz/<id>`, answer, click "Need a hint?" | Rationale shown, hint fetched, score recap |
| US4 | Toggle theme, reload; Settings → Test Connection; mark lesson complete, reload | Theme and progress persist; latency reported |
| Security | Inject `<script>` / `javascript:` content | Stripped by `rehype-sanitize` |

## 4. Drift review
Confirm follow-ups R-05..R-08 in [research.md](./research.md) are resolved or ticketed before sign-off.
