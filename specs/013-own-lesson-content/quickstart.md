# Quickstart: validate one lesson release

For one lesson-track (for example Kids lesson 1), after it is written.

1. **Reading check (Kids only):** `go run ./cmd/ingest -verify -audio=false` shows no `FAIL` for the lesson, in both bands.
2. **Owner review:** read the lesson in the app (`./start.sh`, plus `go run ./cmd/devidp` while `AUTH_REQUIRED=true`). Then run `go run ./cmd/review -lang en -reviewer "owner" -approve public-content/lessons/1-intro.junior.json`.
3. **Hindi:** translate, then have the owner approve with `go run ./cmd/review -lang hi -reviewer "owner (beta)" -approve public-content/lang/hi/lessons/1-intro.junior.json`. Record with `TTS_ACCESS_TOKEN="$(gcloud auth print-access-token)" TTS_PROJECT=ai-learning-513415 go run ./cmd/narrate -lang hi`, then check with `go run ./cmd/narrate -lang hi -check`.
4. **Pictures:** `go run ./cmd/assetcheck` passes; every new picture is approved in the register.
5. **Gates:** `go run ./cmd/ingest -verify` exits 0; `go test ./...` passes; Playwright passes. Stop any local app on 3000/8080 first. Re-record the English text baseline only for the changed lesson, after checking the diff.
6. **Detailed only:** open the lesson in the Detailed journey and confirm sections, Read section buttons, "Go further", and that "Open in Colab" opens `ashishisme/AI-Learning-Mod/.../notebooks/<id>.ipynb`. Then run the notebook top to bottom in Colab without errors.
7. **Originality:** compare side by side with Microsoft's lesson, and check that no sentence is copied or closely paraphrased (SC-006).
8. **Release:** merge to `cloud-beta`, tag, and the owner approves `staging-promote`.

Open point: notebook links use the `cloud-beta` branch until releases move to `main` (research R5).
