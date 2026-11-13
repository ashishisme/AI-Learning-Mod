# Contract: English owner approvals

## CLI

```text
go run ./cmd/review -lang en                        # list targets: approved | pending | stale
go run ./cmd/review -lang en -reviewer "owner" -approve <path>...
```

Targets:
- every `public-content/lessons/*.json` with `"origin": "own"`;
- `web/src/data/quizzes/en.json`, when any entry has `origin: own`;
- every `notebooks/*.ipynb`.

## Release check

`go run ./cmd/ingest -verify` prints `en <path>: pending` or `en <path>: stale: the text changed after approval` and exits 1 when any target is not approved. It is the same gate, run at the same places (local, CI verify job, Docker build), as the Hindi ledger.

## Ledger file

`content/review/en.json`, shape as in [data-model.md](../data-model.md).
