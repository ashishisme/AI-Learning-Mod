---
description: "Tasks for SPEC-017: recorded English narration"
---

# Tasks: Recorded English Narration

## Handoff (read first, 2026-11-22)

The state for any agent continuing this work. Commands run from the repo root.

- **Done (T001–T007), NOT committed:**
  - SPEC.md 2.22.0 and AC-91.
  - English supported in `cmd/narrate` (`-lang en`, with a new `-prune` option), `internal/narration/text.go` (`LessonsDir`), `internal/api/audio.go`, `cmd/ingest` (warn-only English check), `web/src/services/narration.ts`, and the `Dockerfile` (the build prunes stale English, and the runtime copies `public-content` from the build stage).
  - Tests are in `cmd/narrate/narrate_test.go`, `internal/narration/text_test.go`, `internal/api/audio_test.go`, `internal/api/auth_handlers_test.go`, `cmd/ingest/verify_lang_test.go` and `web/tests/narration-hi.spec.ts`. All pass.
  - The owner chose the voices Kore (Chip), Aoede (Nova) and Charon (Alan), in `content/voices/en.json`.
- **T008–T009 done 2026-11-22:** 831 English MP3s recorded. `go run ./cmd/narrate -lang en -check` reports all present and current; a dry run reports 0 remaining. The English audio was uploaded to the narration bucket, and the local and remote manifest SHA-256 both equal `d677006495394a38436a8efc62a58561d65072728e1d35403caa634d8d20a345`.
- **Next:** T010 gates, then T011 commit, tag and promote (owner only), then T011a, then T012.
- **Shares the commit with:** the uncommitted Tamil header fix (`web/src/App.tsx`, `AuthGate.tsx`, `LanguageSwitcher.tsx` and the header test in `web/tests/languages-kn-ta.spec.ts`). The owner asked to ship it as v0.18.1 and hasn't said "go" yet. Commit those files separately.
- **Not covered by a local test:** the `Dockerfile` change, because there is no Docker on the Mac. The first release's build log must show `en: pruned N` (T011a).

**Input**: [spec.md](spec.md), [plan.md](plan.md)

## Standing rules

- Apply `ponytail` (the smallest complete change). No new packages.
- Commit with explicit paths, and only when the owner asks. Tag only on the owner's word, and never approve promote.
- Recording costs money: always run the dry run and report the cost, then record only after the owner says yes.
- Claude cannot upload to the bucket: the owner runs the rsync.

## Phase 1: Spec

- [X] T001 `spec:` amend `spec/SPEC.md` to 2.22.0, and add the AC rows to `spec/ACCEPTANCE.md`:
  - FR-I18N-07: English is recorded and shipped like the other languages.
  - FR-I18N-08: "English narration is unchanged" becomes "English uses its recordings when they are present and current, otherwise the device voice".
  - FR-I18N-07: missing or stale English recordings only warn.

## Phase 2: Code (US1, US2, US3)

- [X] T002 [P] `cmd/narrate/main.go`: accept `-lang en` with speechLang `en-US`.
- [X] T003 [P] `internal/narration/text.go`: for `en`, `Tracks` reads `public-content/lessons/*.<mode>.json`. Test that the keys match the Hindi keys.
- [X] T004 [P] `internal/api/audio.go`: serve `en`. Add a test for the session gate and path checks.
- [X] T005 [P] `web/src/services/narration.ts`: remove the `en` early returns in `recordingFor` and `speakTrack`. English text plays its English recording wherever it is shown, fallback content included (changed during implementation). Add a browser test.
- [X] T006 `cmd/ingest`: check English recordings as warnings only. Add a test.

## Phase 3: Voices and recording

- [X] T007 Listening test: `TTS_ACCESS_TOKEN="$(gcloud auth print-access-token)" TTS_PROJECT=ai-learning-513415 go run ./cmd/narrate -lang en -sample en-US-Chirp3-HD-<Name>` for 2–3 candidates per persona.
  - Start with Kore, Aoede and Charon, which are the voices the other languages use.
  - The owner picks.
  - Write `content/voices/en.json` (chip, nova, alan, all at pitch 0).
- [X] T008 Run `go run ./cmd/narrate -lang en -dry-run` and report the tracks and characters, then wait for the owner's yes. Record with `go run ./cmd/narrate -lang en`, and rerun until 0 failed. Done 2026-11-22: 831 MP3s; `-check` passed and a dry run found 0 remaining.
- [X] T009 Upload and compare manifest hashes (done 2026-11-22):
  ```bash
  cd "/Users/santoshsharma/Documents/code/AI Learning Mod" && gcloud storage rsync --recursive public-content/audio gs://ai-learning-513415-ai-foundations-coach-narration/audio
  ```
  Then check that the bucket's `audio/en/manifest.json` hash equals the local one.

## Phase 4: Release

- [X] T010 Run the gates: *(2026-11-23: go vet/test, ingest -verify with audio, assetcheck, npm run build, Playwright 290 passed and 1 skipped.)*
  - for the first English-audio release, `go run ./cmd/narrate -lang en -check` must report every recording present and current (SC-001); later releases may warn and use the device voice for changed tracks;
  - go vet and test;
  - `ingest -verify` with audio;
  - assetcheck and tsc;
  - the production build, `cd web && npm run build` (constitution quality gate 3);
  - the full Playwright suite on 3001.
  - **2026-11-22 local result:** English `-check`, `go vet ./...`, `go test ./...`, `go run ./cmd/assetcheck`, TypeScript and production build passed. Playwright on 3001 ran 291 tests: 288 passed, 1 skipped, 2 failed. Both failures were test setup issues (device-voice test found new English MP3s; Settings baseline assumed port 3000); both were corrected and passed when rerun individually. `go run ./cmd/ingest -verify` is blocked by the uncommitted SPEC-018 Marathi drafts: clips `mr 2-symbolic worked-example` (31.8 s) and `mr 7-ethics worked-example` (30.6 s) exceed the 30 s limit. Re-run the full gate after those drafts are corrected.
- [ ] T011 When the owner asks, commit, push and tag. The owner approves promote. Then check the live site: English Kids, Plain English and Detailed sections, a clip step and the greeting each play `/api/audio/en/…` MP3s in their persona voice; check a phone and desktop browser.
- [ ] T011a After promote, check the stale-audio guard on the live site: the image build ran `narrate -lang en -prune` (the release log shows "en: pruned N"), and `/api/audio/en/manifest.json` lists only current tracks (compare with `go run ./cmd/narrate -lang en -check` on the released commit).
- [ ] T012 Set the AC rows to PASS and close SPEC-017. Update memory: English is no longer on hold.

## Dependencies

- T001 comes first.
- T002–T006 can run in parallel.
- T007 needs T002.
- T008 needs T003 and T007.
- T009 needs T008.
- T010–T012 come last.
