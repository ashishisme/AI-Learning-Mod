# Feature Specification: Recorded English Narration

**Feature Branch**: `cloud-beta-2` (no feature branch)

**Created**: 2026-11-22

**Status**: In progress (T001–T007 done; recording T008 running, 2026-11-22)

**Input**: User description: "Record English instead of browser audio." Owner decisions 2026-11-22: US English voices (en-US); all three journeys; a missing or stale English recording warns and falls back to the device voice, and does not block a release.

**Relationship to current product**: Hindi, Kannada and Tamil play recorded voices (FR-I18N-07). English, the default language, still uses the device's own voice (FR-I18N-08, "English narration is unchanged"; the SPEC-013 decision put English recording on hold). That voice varies from device to device, often sounds robotic, and some devices have no good English voice. English learners therefore get the weakest audio in the course. This feature records English with the same recorder, track keys and personas as the other languages. Requirement IDs are cited as `SPEC-017 FR-xxx`; the `spec/SPEC.md` amendment gets a permanent ID (§12).

## Clarifications

### Session 2026-11-22 (owner)

- Q: Which accent? → A: **US English (en-US)**.
- Q: Which journeys? → A: **All three**: Kids, Plain English and Detailed.
- Q: What happens to a release when an English recording is missing or stale? → A: **It warns, and that track falls back to the device voice**, as the beta languages do.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An English learner hears a natural recorded voice (Priority: P1)

A learner in English presses play on a lesson section, a clip step or Chip's greeting. They hear a natural recorded voice for that journey's persona (Chip in Kids, Nova in Plain English, Prof. Alan in Detailed), the same on every device.

**Why this priority**: English is the default language and probably the largest audience, and it now has the worst audio.

**Independent Test**: Play a Kids section, a Plain English section, a Detailed clip step and the greeting in English. Each plays an MP3 from `/api/audio/en/…`, and the device voice is not used.

**Acceptance Scenarios**:

1. **Given** English is chosen and a recording exists, **When** the learner plays a section, **Then** the recording for that journey's persona plays.
2. **Given** a section's text was edited after recording, **When** the updated release is built and the learner plays it, **Then** the device voice reads the new text. The build prunes the old recording from the manifest before it can be served with that release.
3. **Given** the learner switches to Hindi, **Then** Hindi recordings play, as today.

### User Story 2 - The owner records and updates English cheaply (Priority: P1)

The owner runs the usual dry run, which reports the tracks and characters, then records and uploads. After a text edit, only the changed tracks are recorded again.

**Independent Test**: The dry run lists 277 English tracks, which is 831 recordings across the three voices and 236,346 characters. A second run after changing one sentence lists only the tracks with that sentence.

### User Story 3 - Releases are not held up by English audio (Priority: P2)

A release that changes English text goes out even before the new text is recorded. The release check lists the missing or stale English tracks as warnings.

**Independent Test**: Change one English sentence. `ingest -verify` still exits 0 and prints a warning that names the stale track.

### Edge Cases

- Content that falls back to English in another language (a not-yet-translated file) plays the English recording too: it is the same English text, and the build keeps only current English recordings (`narrate -lang en -prune`), so the audio always matches. (Changed during implementation, 2026-11-22.)
- Muted, or reduced motion on: the same rules as today.
- Clip captions: recorded per step, like the other languages.
- A device with no English voice: recordings still play, which is an improvement.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: English MUST have a voice file (`content/voices/en.json`) with one en-US voice per persona, chosen by a listening test.
- **FR-002**: The recorder MUST accept English. Its tracks come from the English lesson files and the English UI text, with the same keys as the other languages.
- **FR-003**: English recordings MUST be served at `/api/audio/en/…` behind the same session gate as the other languages.
- **FR-004**: English text (in English, or shown as a fallback in another language) MUST play its English recording when one is listed. A release lists only recordings that match the current text and voice, because the build prunes stale ones (`narrate -lang en -prune`). Otherwise the device voice is used, as today.
- **FR-005**: A missing or stale English recording MUST be a warning in `ingest -verify`, never a failure.
- **FR-006**: The rest of FR-I18N-07 applies to English: a recording is identified by the hash of its voice, settings and text; only changed tracks are recorded again; and the token is short-lived and never stored.

## Success Criteria *(mandatory)*

- **SC-001**: 100% of English narrated tracks are recorded at launch.
- **SC-002**: The one-off recording costs at most $10 (measured: 236,346 characters, about $7). A one-sentence edit costs a few cents.
- **SC-003**: No release is blocked by English audio.
- **SC-004**: An English learner hears the same voice on any device or browser.

## Assumptions

- The voices use the same Google Cloud Text-to-Speech Chirp3-HD family and billing project as the other languages.
- The recordings, about 80–90 MB, sit in the existing narration bucket and are copied into each release the same way as the other languages.
- The English lesson texts are already approved in the English ledger. Recording does not need a new approval.
