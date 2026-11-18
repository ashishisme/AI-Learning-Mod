# Data Model: Concept Clips & Multi-Mode 60fps Micro-Videos

## Clip Diagram in Adaptive Lessons

A section's `diagram` with `type: "clip"`. Supported in:
- Detailed: `public-content/lessons/<id>.detailed.json` (& `public-content/lang/hi/lessons/<id>.detailed.json`)
- Junior (Kids): `public-content/lessons/<id>.junior.json` (& `public-content/lang/hi/lessons/<id>.junior.json`)
- Plain English: `public-content/lessons/<id>.plain-english.json` (& `public-content/lang/hi/lessons/<id>.plain-english.json`)

| Field | Type | Rule | Translatable |
|---|---|---|---|
| `type` | `"clip"` | fixed | no |
| `clip` | string | kebab-case name; matches `<clip>.webm`, `<clip>.mp4`, and `<clip>-poster.jpg` in `web/public/brand/videos/` (or `<clip>.svg` in `web/public/brand/clips/`) | no (Hindi must equal English) |
| `caption` | string | the clip's title line, shown under the picture/video | yes |
| `alt` | string | required, non-empty; says what the clip teaches (FR-012) | yes |
| `steps` | string[] | 3–8 captions, each 4–35 words; Σ(words/2.5 + 1) between 10 and 30 seconds; Junior mode strictly $\le 18$ words, grade $\le 3.5$ | yes, same count |

## Multi-Mode 60fps Video Catalog

| Journey Mode | Clip ID | Module | Theme / Visual Mechanism |
|---|---|---|---|
| **Junior (Kids)** | `chip-dog-learning` | 1-intro | Chip giving dog treat rewards during pattern training |
| **Junior (Kids)** | `chip-rule-robot` | 2-symbolic | Chip operating if-then logic control switches |
| **Junior (Kids)** | `chip-fruit-sorter` | 3-neuralnetworks | Chip weighing fruits on a pan scale with boundary pointer |
| **Junior (Kids)** | `chip-magnifying-glass` | 4-computervision | Chip examining giant pixel mosaic with magnifying glass |
| **Junior (Kids)** | `chip-word-blocks` | 5-nlp | Chip connecting magnetic word blocks into sentences |
| **Junior (Kids)** | `chip-playground-scale` | 7-ethics | Chip balancing playground see-saw so all teams get fair turns |
| **Plain English** | `plain-rules-vs-learning` | 1-intro | Hand-coded rules vs machine learning from historical data |
| **Plain English** | `plain-decision-tree` | 2-symbolic | Loan qualification branching decision tree |
| **Plain English** | `plain-linear-classifier` | 3-neuralnetworks | Customer churn risk boundary iteration on scatter plot |
| **Plain English** | `plain-image-feature-scan` | 4-computervision | Industrial quality camera scanning with 3x3 filter |
| **Plain English** | `plain-transformer-context` | 5-nlp | Legal contract clause contextual attention routing |
| **Plain English** | `plain-disparate-impact-audit` | 7-ethics | Corporate hiring equity audit dashboard with four-fifths rule |
| **Detailed** | `turing-test` | 1-intro | Interrogator terminal measuring imitation vs human delays |
| **Detailed** | `forward-chaining` | 2-symbolic | Deduction cascade firing rules through active memory graph |
| **Detailed** | `perceptron-learning` | 3-neuralnetworks | Dynamic weights shifting decision boundary upon error updates |
| **Detailed** | `convolution-scan` | 4-computervision | 3x3 sliding filter, ReLU activation, 2x2 max pooling |
| **Detailed** | `vector-attention` | 5-nlp | Vector math ($\vec{King} - \vec{Man} + \vec{Woman} \approx \vec{Queen}$) & self-attention arcs |
| **Detailed** | `fairness-calibration` | 7-ethics | Group-calibrated threshold sliders & disparate impact balance |

## Video Asset Package (`web/public/brand/videos/<name>.*`)

| Derivative | Specification | Budget Ceiling |
|---|---|---|
| WebM | VP9 codec, $800 \times 450$ resolution @ 60fps, variable bitrate (~380–450 kbps) | $\le 750\text{ KB}$ ($\le 850\text{ KB}$ for convolution) |
| MP4 | H.264 / AVC1 codec, $800 \times 450$ resolution @ 60fps, profile baseline (~450–550 kbps) | $\le 750\text{ KB}$ |
| Poster | JPEG image, $800 \times 450$ resolution, quality 85% | $\le 25\text{ KB}$ |
| Register | SHA-256 registered in `design/brand/asset-register.json` | 100% hash match verified by `cmd/assetcheck` |

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
