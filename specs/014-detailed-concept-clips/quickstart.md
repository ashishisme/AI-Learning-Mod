# Quickstart: validating concept clips

Run from the repository root unless noted. While your app runs on 3000/8080, browser tests use the temporary 3001 config.

## 1. Content and drawings are valid

```bash
go run ./cmd/ingest -verify -audio=false   # prints clip-check lines; exits 0
go run ./cmd/assetcheck                     # every clip SVG approved and matching the register
go test ./internal/narration/ ./internal/i18n/ ./cmd/ingest/
```

Expected:
- One `clip-check` line per clip, with its steps, estimated seconds (10–30) and size (≤ 100 KB).
- Hindi parity passes: same `clip` name and step count as English.

## 2. Hindi narration covers every step

```bash
go run ./cmd/narrate -lang hi -dry-run      # lists *-clip-<n> tracks and characters billed
go run ./cmd/ingest -verify                 # with audio: fails if any clip step recording is missing
```

## 3. The page behaves (Playwright)

```bash
cd web && npx playwright test -c playwright.tmp3001.config.ts tests/clips.spec.ts
```

The spec covers:
- **Still first:** step 1 shows, nothing sounds before Play (US1-1).
- **Play, Pause, Next, Previous, Replay:** the step counter and caption follow each control (US1-2..4).
- **Reduced motion:** no Play button, and Next/Previous still reach every caption (US1-5, SC-004).
- **Hindi:** Hindi captions show, and the recording URL is requested for `section-<id>-clip-<n>` (US1-6).
- **One sound:** pressing Read section on another section pauses the clip (US3-2, SC-006).
- **Mute:** muting one clip keeps the next one muted; the clip keeps moving (US3-1, FR-010).
- **Sound fails:** with speech unavailable, the clip still plays with captions and shows no error (US3-3).
- **Controls:** every control is at least 44×44 and reachable by keyboard (SC-003).

## 4. By eye (owner review)

Open `/lesson/3-neuralnetworks`, choose Detailed, then play "Watch the line learn" in light and dark, on a phone width and with sound. Check that:
- the numbers in the picture match the caption and the lesson text;
- the clip runs 10–30 s;
- nothing in the picture has words.
