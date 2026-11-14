# Contract: Clip in a lesson, its drawing and its narration

## 1. Lesson JSON (section `diagram`)

```json
{
  "id": "perceptron-learning",
  "heading": "3. How a Perceptron Learns",
  "bodyMarkdown": "…",
  "diagram": {
    "type": "clip",
    "clip": "perceptron-learning",
    "caption": "Watch the line learn",
    "alt": "A line between apples and pears tilts a little after each mistake until every fruit is on the correct side.",
    "steps": [
      "Two kinds of fruit sit on a grid, and a first guess draws a line between them.",
      "One pear lands on the apple side, so the neuron made a mistake.",
      "The weights change by the learning rate, and the line tilts towards the pear.",
      "Another pass finds one more mistake, and the line tilts again.",
      "Now every fruit is on its own side, so training stops."
    ]
  }
}
```

The Hindi file has the same `type`, `clip` and number of `steps`; `caption`, `alt` and each step are translated.

## 2. Drawing (`web/public/brand/clips/<clip>.svg`)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" role="img">
  <style>
    .s { display: none }
    .s:target { display: inline }
    .s:target .move { animation: in 1.6s ease-out 1 both }
    @keyframes in { from { transform: rotate(-12deg) } to { transform: none } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important } }
  </style>
  <rect width="320" height="180" rx="16" fill="#FFFBEB"/>
  <g id="s1" class="s">…</g>
  <g id="s2" class="s">…</g>
</svg>
```

The page always names a step: the still picture is `#s1`. It shows step K as `<img src="/brand/clips/<clip>.svg#sK" alt="">`, remounted on every step change so its entrance plays. The text description is given by the surrounding figure (`alt` above), not on the image.

## 3. Narration

- Track key: `<lessonId>/detailed/section-<sectionId>-clip-<n>`, with n starting at 1.
- `internal/narration.Tracks` adds one track per step of every `type: "clip"` diagram in the translated Detailed lessons.
- `web/src/services/narrationText.ts` needs no change: a caption is spoken after `cleanForSpeech`, the twin of `narration.Clean`.

## 4. Page controls (FR-006)

The clip is a `<figure data-testid="clip">`. The `figcaption` holds the caption and the current step's text (an `aria-live="polite"` region).

| Control | Test id | Label (reused key, en) |
|---|---|---|
| Play / Pause | `clip-play` (`aria-pressed`) | `widget.stepPlay` "▶ Play" / `widget.stepPause` "⏸ Pause" |
| Previous | `clip-prev` | `clip.prev` "← Previous step" |
| Next | `clip-next` | `widget.stepNext` "Next step ➜" |
| Play again | `clip-replay` (when ended) | `widget.stepRestart` "↺ Start again" |
| Mute | `clip-mute` (`aria-pressed`, label unchanged) | `clip.mute` "🔇 Mute clips" |

- Every control is at least 44 by 44 px.
- A step counter (`widget.stepOf`, "Step k of N") is shown.
- Under reduced motion `clip-play` and `clip-replay` are absent.
