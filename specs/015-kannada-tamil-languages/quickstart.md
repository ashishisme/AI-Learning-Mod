# Quickstart: validating Kannada (then Tamil)

Run these from the repository root. Swap `kn` for `ta` for Tamil.

## 1. Content is complete and approved

```bash
go test ./internal/i18n/                    # parity, including clips
go run ./cmd/ingest -verify -audio=false    # no "kn …" lines: every file approved and current
```

## 2. Voices

```bash
export TTS_ACCESS_TOKEN="$(gcloud auth print-access-token)" TTS_PROJECT=ai-learning-513415
go run ./cmd/narrate -lang kn -sample kn-IN-<voice>    # listening test, one per candidate
go run ./cmd/narrate -lang kn -dry-run                 # recordings and characters billed
go run ./cmd/narrate -lang kn                          # after the owner approves the cost
cd "/Users/santoshsharma/Documents/code/AI Learning Mod" && gcloud storage rsync --recursive public-content/audio gs://ai-learning-513415-ai-foundations-coach-narration/audio
go run ./cmd/ingest -verify                            # with audio: passes
```

## 3. Safety

```bash
go test ./internal/api/ ./internal/feedback/   # kn_safety.json, kn_personal_details.json, kn_clean.json
```

## 4. Page (from `web/`, port 3001 while the owner's app runs)

```bash
npx playwright test -c playwright.tmp3001.config.ts tests/i18n.spec.ts tests/i18n-foundation.spec.ts tests/languages-kn-ta.spec.ts
```

Expected:
- With `kn` offered, the menu shows "ಕನ್ನಡ (beta)".
- A Kannada lesson in each journey has no not-translated notice, and the Kannada font loads.
- English pages fetch no `kn.json` and no Kannada font.
- At 390 px, nothing overflows.

## 5. By eye (owner)

Switch to ಕನ್ನಡ and open lesson 3 in each journey. Check that:
- Read section and a clip play the chosen voices;
- the tutor answers in Kannada;
- the Kids pages use the rounded Kids font.
