# Implementation Plan: Recorded English Narration

**Branch**: `cloud-beta-2` | **Date**: 2026-11-22 | **Spec**: [spec.md](spec.md)

## Summary

English joins the recorded languages with the same recorder, manifest, track keys and personas. The work is five small code changes, a voice choice, one recording run and the owner's upload. There is no new package and no new infrastructure.

## Where English is excluded today

| Place | Today | Change |
|---|---|---|
| `cmd/narrate/main.go` | It skips `i18n.English` when it picks `speechLang`, so `-lang en` gives "is not a language". | Accept `en` with speechLang `en-US`. |
| `internal/narration/text.go` `Tracks` | It reads `public-content/lang/<code>/lessons`. | For `en`, read `public-content/lessons`. `catalogue("en")` already works. |
| `internal/api/audio.go` | It refuses `code == English`. | Serve `en`. English is always offered. |
| `web/src/services/narration.ts` | `recordingFor` and `speakTrack` return early for `en`. | Remove those early returns. English text plays its English recording wherever it is shown, including as fallback in another language (changed during implementation; see the spec edge case). |
| `cmd/ingest` recordings check | Only listed non-English languages are checked. Approved ones fail and beta ones warn. | Check `en` too, always as warnings (SPEC-017 FR-005). |
| `content/voices/en.json` | It doesn't exist. | Chip, Nova and Prof. Alan as `en-US-Chirp3-HD-*` voices, picked by a listening test. |
| `cmd/narrate` `-prune` (added during implementation) | Not present. | Drops manifest entries whose text or voice changed, with no network. |
| `Dockerfile` (added during implementation) | The runtime copies `public-content` from the build context. | The build stage runs `narrate -lang en -prune`, and the runtime copies `public-content` from the build stage, so a release never serves old English audio for new text. |

The release pipeline already copies every language from the bucket (`gcloud storage rsync gs://…/audio public-content/audio`), so it needs no change.

## Cost

- **Estimate:** Kannada was 690 tracks and 273,750 characters, about $8. English: measured by the T008 dry run at **277 tracks (831 recordings), 236,346 characters, about $7 once**. The estimate before the dry run before anything is billed.
- **Listening test:** about 6–9 short samples, a few cents.
- **Storage:** about 85 MB more in the bucket, well under ₹10 a month.

## Tests

| FR | Test |
|---|---|
| FR-002 | `internal/narration/text_test.go`: `Tracks(root, "en")` reads `public-content/lessons` and gives the same keys as `Tracks(root, "hi")`. `cmd/narrate`: `-lang en -dry-run` is accepted. |
| FR-003 | `internal/api/audio_test.go`: `/api/audio/en/manifest.json` is served behind the session gate; path traversal is still refused. |
| FR-004 | `web/tests` (a new spec, or the narration tests): with English chosen and a manifest that has the track, the MP3 is requested. With a stale or missing track, the device voice is used. Fallback content: English text shown in Hindi plays the English recording too. |
| FR-005 | `cmd/ingest` test: a stale English recording prints a warning, and the exit code is 0. |

## Phases

1. **Spec amendment** (`spec:` commit): amend FR-I18N-07 and FR-I18N-08, so that English is recorded like the other languages but missing English recordings only warn. Add the AC rows.
2. **Code:** the five changes above, with their tests.
3. **Voices:** the listening test (`go run ./cmd/narrate -lang en -sample en-US-Chirp3-HD-<Name>`). The owner picks one voice per persona, and the choice goes into `content/voices/en.json`.
4. **Record:** a dry run to report the cost, then the owner's yes, then recording. The owner uploads with rsync, and we check the manifest.
5. **Release:** the gates, a tag, and the owner's promote. Then check the live site: an English lesson plays MP3s from `/api/audio/en/`.
