# Data Model: Our Own Lessons

All content is static JSON or notebooks in the repository (DC-09). Nothing new is stored on the server or about learners.

## Lesson track version (existing adaptive format, extended)

Files: `public-content/lessons/<id>.<mode>.json` and `public-content/lang/hi/lessons/<id>.<mode>.json`. `mode` is one of `junior`, `plain-english` or `detailed` (new).

| Field | Type | Rule |
|---|---|---|
| `origin` | `"own"` or absent | **New.** `"own"` marks our original text (R3). Never translated: Hindi must equal English |
| `title`, `intro`, `sections[]`, `miniQuiz[]`, `recap[]`, … | existing | As today (SPEC-002, SPEC-012) |
| `bands` | bool | Kids only. Must be `true` for own Kids lessons (FR-002) |
| `goFurther[]` | `{ "title": string, "url": string, "note": string }` | **New, Detailed only.** 3–5 items (FR-004). `title` and `note` are translated; `url` must equal English. `url` must be https and must not point to `microsoft/AI-For-Beginners` |
| `colabUrl` | string | Detailed only. Must point to `ashishisme/AI-Learning-Mod` `notebooks/<id>.ipynb` (R5). Never translated |

Detailed section order (FR-004), by convention and checked in review:
1. What it is.
2. How it works, with a stepper or Mermaid diagram.
3. Worked example.
4. The activity (`interactiveWidget`).
5. Then `goFurther`.

## English approval ledger (new)

File: `content/review/en.json`, with the same shape as `content/review/hi.json`.

| Field | Rule |
|---|---|
| `language` | `"en"` |
| `entries[].path` | an English lesson file with `origin: own`, `web/src/data/quizzes/en.json`, or `notebooks/<id>.ipynb` |
| `entries[].kind` | `adaptive`, `quiz` or `notebook` |
| `entries[].sourceHash` | sha256 of the approved file. A different hash means stale |
| `entries[].status` | `approved` |
| `entries[].reviewer`, `date` | who approved it, and when |

**Status:** a missing entry is *pending*, a hash mismatch is *stale*, and a hash match is *approved*. `ingest -verify` fails on pending or stale (FR-008).

## Quiz (existing, extended)

`web/src/data/quizzes/<lang>.json` maps a lesson id to `{ title, description, questions[] }`. Add `origin: "own"` per lesson entry. Never translated. Each own quiz's correct answers must appear in that lesson's own text (checked in review, and warned by a test).

## Notebook (new)

`notebooks/<id>.ipynb` is English, uses only Colab's default libraries, and has no network calls except Colab's own. It is approved in the en ledger. It is not part of the build image (`.dockerignore` covers `notebooks/`).

## State transitions for one lesson-track

```text
derived (today) → draft (origin: own, en pending) → en approved → hi draft (hi pending; Hindi shows English + notice)
  → hi approved + recorded → released
```

Any English edit after approval sets en back to stale, and the Hindi to stale.
