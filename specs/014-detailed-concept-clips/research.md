# Research: Concept Clips for Detailed Lessons

All decisions below resolve the plan's open points. Nothing in the Technical Context is left as NEEDS CLARIFICATION.

## R1. How a clip draws and moves

- **Decision**: A clip is one hand-written SVG file, `web/public/brand/clips/<name>.svg`, shown with `<img>`. Each step is a group `<g id="s1">` … `<g id="sN">`. The page shows step *n* by loading `<name>.svg#sN`. The SVG's own CSS shows only the `:target` step and plays that step's entrance animation (at most 2 s). The page always names a step, and the still picture is `#s1`.
- **Rationale**: This is how scene pictures already work (`ScenePicture.tsx`, `#play` on `:target`). An SVG loaded as an image cannot run script or load anything else. The page security rule (`img-src 'self'`) needs no change, and no SVG markup is ever put into the page, which keeps constitution Principle IV (no text interpreted as HTML).
- **Alternatives considered**:
  - Put the SVG markup into the page and drive it from React: rejected, because it injects markup into the page and needs a sanitising step.
  - Draw clips in canvas code: rejected, because every clip would become app code, and drawings could no longer go through the brand-files register.
  - One SVG file per step: rejected, as 19 clips × up to 8 files is too many register entries.

## R2. Words stay out of the picture

- **Decision**: Clip SVGs carry no words, only shapes, icons, arrows, numbers and the symbols `+ − × = %`. Every word lives in the step captions, which are lesson text.
- **Rationale**: Captions are then translated and approved through the Hindi ledger like the rest of the lesson (SPEC-014 FR-011). The same SVG serves English and Hindi, and FR-013 (numbers match the text) can be checked against one source. Lesson 5's "king − man + woman" uses icons (crown, person) with the words in the caption.
- **Alternatives considered**: One SVG per language, rejected because it doubles the drawings and approvals.

## R3. Lesson data shape

- **Decision**: A clip is a section `diagram` with `type: "clip"`, a new `clip` field naming the SVG, the existing `steps[]` as captions, `alt` as the screen-reader description, and `caption` as the clip's title line.
- **Rationale**: `steps[]`, `alt` and `caption` are already translatable in the Hindi parity rules (`internal/i18n/parity.go`). `clip` is not in the translatable list, so parity forces Hindi to name the same file as English. A whole-file review ledger fingerprint already covers captions (FR-011). It is the smallest change to the format.
- **Alternatives considered**: Putting the name in `diagram.content`, rejected because `content` is translatable, so a Hindi file could point at a different drawing.

## R4. Sound and pacing

- **Decision**: Play reads step *n*'s caption, then waits 600 ms and moves to step *n+1*. In English it uses the device voice (`speechService.speak`); in Hindi it uses the recording for track `<lesson>/detailed/section-<id>-clip-<n>` (`speechService.playRecording`, with the learner's voice persona), falling back to the device voice if the recording is missing. A step never advances before its entrance animation ends. When muted, or when sound fails, each step holds for `words / 2.5 + 1` seconds.
- **Rationale**: It reuses the one player that already keeps one sound at a time (`speechService.stop()` on every new speak). It follows the existing rule of a Hindi recording first, then the device voice (`AudioNarrationButton`). The voice sets the pace, so captions and speech never drift apart.
- **Alternatives considered**: A fixed timer per step, rejected because device voices vary in speed and the voice would be cut off.

## R5. One sound at a time, and knowing it was stopped

- **Decision**: The clip claims the shared audio state (`useAudioStore.activeTrackId = <clip track>`, `isPlaying`). When `activeTrackId` changes to anything else (Read section, the tutor, another clip), the clip pauses on its current step. Starting a clip calls `speechService.stop()` first.
- **Rationale**: Read section buttons already stop each other this way. A stopped utterance's `onEnd` is swallowed by `speechService`'s generation guard, so the clip must watch the store instead of waiting for `onEnd`.

## R6. Mute for the visit

- **Decision**: Add `clipsMuted` to the audio store, kept in memory only (not persisted). Mute stops the voice and the clip continues on the muted timing (R4).
- **Rationale**: FR-010 says "for the rest of the visit". The existing `isMuted` mutes all narration and is a different control, so it is left alone.

## R7. Theme and contrast

- **Decision**: Every clip draws its own light panel background (`#FFFFFF` or `#FFFBEB`). Shapes and numbers are checked at 4.5:1 or better against that panel. The page draws the controls, which use the existing theme tokens in light and dark.
- **Rationale**: An SVG shown as `<img>` cannot see the app's theme toggle. A fixed panel keeps DC-11 contrast true in both themes, as the word and scene pictures already do.

## R8. Checks

- **Decision**: A new `clip-check` runs in `go run ./cmd/ingest -verify`, next to `kids-check`. For each `type: "clip"` diagram it checks:
  - the SVG exists under `web/public/brand/clips/` and is at most 100 KB;
  - it has groups `s1`…`sN` matching the number of steps;
  - there are 3–8 steps, each caption is 4–35 words, and the estimated length (Σ words / 2.5 + 1) is 10–30 s;
  - `alt` is not empty;
  - no `<text>` element contains letters (R2);
  - the file has no `<script>`, no `on*=` attribute and no outside reference (`href` not starting with `#`).

  `cmd/assetcheck` already refuses any file in `web/public/brand/` without an approved register entry. `cmd/narrate` adds clip-step tracks, and `-verify -audio` then fails if a Hindi recording is missing or stale.
- **Rationale**: This uses the same gates as SPEC-012 and SPEC-013. A clip cannot ship unapproved, too long, wordy, or without its Hindi voice.

## R9. Where each clip goes (19 clips)

| Lesson | Concept clip (section) | Section clips filling gaps |
|---|---|---|
| 1 | `turing-test`, replaces its flowchart | `defining-ai`, `worked-example` |
| 2 | `chaining`, replaces its stepper | `knowledge-representation`, `worked-example` |
| 3 | `perceptron-learning`, replaces its stepper (pilot) | `machine-learning-basics`, `worked-example` |
| 4 | `convolution`, fills a gap | `vision-tasks`, `worked-example` |
| 5 | `embeddings`, replaces its flowchart | `nlp-tasks`, `worked-example` |
| 7 | `sources-of-bias`, replaces its stepper | `principles`, `measuring-fairness`, `worked-example` |

The result is 30 of 36 sections with a picture or clip, and the 6 activity sections with their widget (SC-001). Replacing an existing picture follows the spec assumption ("the clip replaces it").

## R10. Cost of Hindi recordings

- **Decision**: Run `go run ./cmd/narrate -lang hi -dry-run` after the captions are approved, to get the character count and price before recording. That is about 19 clips × 5 steps ≈ 95 tracks, × 3 voices.
- **Rationale**: Same practice as SPEC-013.
