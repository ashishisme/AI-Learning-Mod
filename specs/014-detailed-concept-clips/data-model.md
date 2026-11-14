# Data Model: Concept Clips

## Clip (in a Detailed lesson section)

A section's `diagram` with `type: "clip"`. English: `public-content/lessons/<id>.detailed.json`. Hindi: `public-content/lang/hi/lessons/<id>.detailed.json`.

| Field | Type | Rule | Translatable |
|---|---|---|---|
| `type` | `"clip"` | fixed | no |
| `clip` | string | kebab-case name; file `web/public/brand/clips/<clip>.svg` exists | no (Hindi must equal English) |
| `caption` | string | the clip's title line, shown under the picture | yes |
| `alt` | string | required, non-empty; says what the clip teaches (FR-012) | yes |
| `steps` | string[] | 3–8 captions, each 4–35 words; Σ(words/2.5 + 1) between 10 and 30 seconds | yes, same count |

Each word and number in a caption that the picture shows must match the lesson text (FR-013). The owner checks this in review; the release check verifies only counts and lengths.

## Clip drawing (`web/public/brand/clips/<name>.svg`)

| Part | Rule |
|---|---|
| Size | ≤ 100 KB; `viewBox="0 0 320 180"` |
| Steps | groups `<g id="s1">` … `<g id="sN">`, N = `steps.length` |
| Default view | the page always loads a step; the still picture is `#s1` |
| Step view | `#sK`: only step K shown; its entrance animation ≤ 2 s |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` turns every animation off |
| Words | none: no letters in `<text>` (numbers and `+ − × = %` allowed) |
| Safety | no `<script>`, no `on*=` attribute, no `href` outside the file |
| Background | own light panel; content ≥ 4.5:1 against it |
| Register | an approved entry in `design/brand/asset-register.json` (`motion` describes it, e.g. "tap-to-play steps, ≤ 2 s each, still under reduced motion") |

## Clip step narration track

| Field | Value |
|---|---|
| Key | `<lessonId>/detailed/section-<sectionId>-clip-<n>` (n from 1) |
| Text | step n's caption, cleaned by the narration text rule (`narration.Clean`) |
| Hindi | recorded per voice persona into `public-content/audio/hi/`, listed in its manifest |
| English | none recorded; the device voice reads the caption |

## Clip player state (in the page, per clip)

| State | Moves to | When |
|---|---|---|
| still (step 1) | playing | Play |
| playing (step k) | playing (step k+1) | step k's voice ends (or the muted hold ends), plus 600 ms |
| playing (step N) | ended | step N finishes |
| playing | paused (step k) | Pause, another sound starts, the section leaves the screen, the page changes |
| paused (step k) | playing (step k) | Play |
| any | showing step k±1 | Next / Previous (stops the voice, then reads that step once unless muted) |
| ended | playing (step 1) | Replay |

Under reduced motion there is no Play, only Previous and Next; each move reads that step once unless muted (FR-007).

Shared audio state (`useAudioStore`): `activeTrackId` is set to the clip's track while it speaks. A change to any other id pauses the clip (R5). `clipsMuted` (new, not persisted) lasts for the visit (FR-010).
