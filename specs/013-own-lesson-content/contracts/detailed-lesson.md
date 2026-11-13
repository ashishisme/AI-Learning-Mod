# Contract: Detailed lessons and the lesson API

## `GET /api/lessons/{id}?mode=detailed[&lang=hi]`

- `mode` accepts `junior`, `plain-english` and now `detailed`. Any other value is ignored, as today.
- Lookup order, unchanged: the language's `<id>.detailed.json`, then English `<id>.detailed.json`, then the standard lesson.
- A **200 with `sections`** is a Detailed lesson. The `Content-Language` header, or served language, says which language came back.
- A **200 with `blocks`** means there is no Detailed version yet. The page shows the standard lesson as today, including the Colab button only if `colabUrl` points to this repository (FR-016, R5).

## Web behaviour (Standard journey, shown as "Detailed")

| Server answer | Page |
|---|---|
| sections | `AdaptiveLessonView` with Read section buttons, `goFurther` list, "Open in Colab" to our notebook |
| blocks | the existing Markdown view (derived lesson, until replaced) |

## `POST /api/tutor` grounding

- Request field `mode` (existing) is `junior`, `plain-english`, `detailed`, or empty for standard.
- The grounding text is the section-format file for that mode and language when it exists, otherwise the standard blocks.
- The citation format `[<lesson title> § <heading>]` is unchanged. Headings are the section headings the learner sees.
