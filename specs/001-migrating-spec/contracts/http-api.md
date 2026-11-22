# HTTP API Contract

Source of truth: `spec/SPEC.md §7.1`, extended with routes registered in `internal/api/router.go`. All JSON responses use `Content-Type: application/json`. Unmatched non-`/api` paths fall through to the SPA.

| Method | Path | Spec | Purpose |
|---|---|---|---|
| GET | `/api/health` | NFR-REL-02 | Liveness |
| GET | `/api/lessons` | FR-CNT | Curriculum index |
| GET | `/api/lessons/{id}` | FR-CNT | One lesson |
| POST | `/api/tutor` | FR-TUT | Grounded answer (JSON, or SSE when `Accept: text/event-stream`) |
| POST | `/api/tutor/stream` | FR-TUT-11 | Same handler, always SSE |
| POST | `/api/config/test` | FR-SET-03/04 | Provider connectivity + latency |
| POST | `/api/ingest/sync` | FR-ING-09, FR-SET-05 | Live curriculum sync |

## GET /api/health
`200 {"ok":true}` (exactly).

## GET /api/lessons
`200` `{commitSha, lessons: LessonMeta[]}` · `503 {"error":"content not generated"}`.

## GET /api/lessons/{id}
`200` Lesson · `400` invalid id · `404` unknown id or traversal · `500` malformed on-disk JSON.

## POST /api/tutor
Request (≤ 8 KiB): `{"lessonId": string, "question": string}`

| Status | Meaning |
|---|---|
| 200 | `{"answer": string}` |
| 400 | empty question, > 500 chars, invalid body, unknown fields |
| 404 | unknown lesson |
| 413 | body > 8 KiB |
| 429 | rate limited; `Retry-After: 60` |
| 502 | provider error |
| 503 | tutor disabled |
| 504 | provider timeout |

### SSE variant
`Content-Type: text/event-stream`; the server clears the write deadline (`SetWriteDeadline(time.Time{})`) per Constitution II. Events, each `data: <json>\n\n`:

| Payload | Meaning |
|---|---|
| `{"token": "<text>"}` | Incremental answer text |
| `{"done": true, "cited": true}` | Stream complete, citation present |
| `{"done": true, "cited": false, "fallback": "<text>"}` | No citation; client shows fallback |
| `event: error` + `{"error": "..."}` | Failure (e.g. `tutor disabled`) |
| `[DONE]` | Terminator |

The client must keep partial text and offer retry if the stream ends without `done`/`[DONE]`.

## POST /api/config/test
Request (≤ 4 KiB): `{baseUrl?, model?, apiKey?}`. Response: `{ok, latencyMs, error?, models?, activeModel?}`. Defaults: `http://localhost:11434/v1`, `llama3.2:1b`. Non-POST → 405.

## POST /api/ingest/sync
Request: `{githubToken?}`. Response: `{ok, commitSha?, lessonsCount?, durationMs, error?}`. Token is used for the request only and never persisted or logged (NFR-SEC-01).

## Cross-cutting
- Security headers/CSP and panic recovery via `middleware.go` (AC-13, AC-15).
- IP rate limiting on tutor routes (`ratelimit.go`, AC-14).
- No `/debug`, `/pprof`, `/metrics` routes (AC-18).
