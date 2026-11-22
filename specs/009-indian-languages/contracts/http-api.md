# HTTP API changes: Indian languages

These changes add to `specs/008-cloud-beta-deployment/contracts/http-api.md`. All learner routes stay behind the session gate. `lang` is never stored server-side (FR-002).

## `lang` parameter

- **Syntax**: `^[a-z]{2,3}$`.
- **Accepted values**: `en`, or a code listed as `approved` in `public-content/languages.json`.
- **Anything else**: a missing, malformed, unknown or hidden `lang` is treated as `en`. It returns no error and is never used to build a file path.

## `GET /api/runtime` (B1)

A new field is added:

```json
{ "...existing fields...": "...", "languages": [ { "code": "en", "name": "English", "speechLang": "en-IN" }, { "code": "hi", "name": "हिन्दी", "speechLang": "hi-IN" } ] }
```

The list contains only approved languages, and English always comes first. Before B3 the list is `[en]` only, so the UI shows no switcher.

## `GET /api/lessons?lang=<code>` (B1)

- Serves `public-content/lang/<code>/index.json` when the language is approved and the file exists. Otherwise it serves `public-content/index.json`.
- The response header `Content-Language: <code actually served>` is always set.
- The body shape is unchanged.

## `GET /api/lessons/{id}?lang=<code>[&mode=junior|plain-english]` (B1)

- **Order of lookup**: `lang/<code>/lessons/<id>.<mode>.json`, then `lang/<code>/lessons/<id>.json` (base, when no mode was asked for), then the English equivalents under the existing rules.
- **Language served**: `Content-Language` reports the language of the file actually returned. If the learner asked for `hi` and gets `en`, the UI shows the "not yet translated" notice (FR-009).
- **Errors**: `404` and `400` behaviour for `id` and `mode` is unchanged.
- **Usage counting**: the per-request usage counting from SPEC-008 FR-040 is unchanged. Language is not counted.

## `GET /assets/...`, `/lesson-assets/...`, `/audio/<code>/...`, `/fonts/...` (B1, B4)

- These are static files from the app's own origin through the existing SPA file server.
- **Content types**:
  - `.webp`: `image/webp`
  - `.mp3`: `audio/mpeg`
  - `.woff2`: `font/woff2`
  - `.json` (the manifest): `application/json`
- **Gating**: audio and the manifest are open paths (like `/assets`), so `<audio>` can load them. They hold course content only.

## `POST /api/feedback` (B2)

- The request is unchanged.
- **Language of replies**: a `lang` field is accepted (allowlisted). It changes only the language of the rejection message. Rejection categories now cover Hindi and Hinglish (FR-022).
- **Privacy**: the rejection response still names only the category, never the matched text.

## `POST /api/tutor`, `/api/tutor/stream`, `/api/tutor/prepare` (B5)

- **Request**: `TutorRequest` gains `"lang": "<code>"`, which is optional, allowlisted, and still subject to unknown-field rejection.
  - With `lang=hi`, the prompt uses `lang/hi/lessons/<id>…` and tells the model to answer in Hindi.
- **Safety and fallback replies**:
  - `ScreenQuestion` covers Hindi and Hinglish, and its replies are in the requested language.
  - `prepare` returns `fallback` in the requested language.
- **Citations**: the `[<title> § <heading>]` form is unchanged, using Hindi titles and headings.
- **Precondition**: the Constitution Principle II amendment is ratified before this ships.
