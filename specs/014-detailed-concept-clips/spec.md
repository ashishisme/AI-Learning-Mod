# Feature Specification: Concept Clips for Detailed Lessons

**Feature Branch**: `cloud-beta` (no feature branch; work continues on `cloud-beta` as in SPEC-013)

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Animated concept clips for Detailed lessons. Owner decisions 2026-11-14: animated SVG first (no video files for now); do all Detailed clips: every Detailed section that has no picture today (20 of 36) plus one 'watch the idea' clip per lesson on its key mechanism (1 Turing test conversation, 2 rule tree firing, 3 perceptron line tilting as weights learn, 4 filter sliding over pixels, 5 king - man + woman word arrows, 7 skewed data tipping a decision); add sound to clips. Build on the existing scene picture (still first, plays on tap, reduced motion shows the still or stepper), hand-written by Claude, owner reviews, approved in the asset register; captions from lesson text, translated to Hindi via the review ledger; play/pause/step controls; 10-30 seconds; accessible (DC-11). Real video is a later spec."

**Relationship to current product**: This builds on SPEC-013 (every lesson is ours) and on the scene pictures of SPEC-012 (`spec/SPEC.md` FR-UI-27: a still picture first, played on tap, never animated under reduced motion). It adds a new kind of picture, the **clip**, to the Detailed journey only. Requirement IDs below are cited as `SPEC-014 FR-xxx`. They are amendments to `spec/SPEC.md` and get permanent IDs in the amendment commit, following §12.

## Clarifications

### Session 2026-11-14 (owner)

- Q: Picture format first: drawn animation or video files? → A: **Drawn animation first.** Video files are a later spec.
- Q: Which clips? → A: **All Detailed clips**: every Detailed section without a picture, plus one "watch the idea" clip per lesson.
- Q: Sound? → A: **Clips have sound.**
- Q: What is the sound? → A: **A voice reads each step's caption.** Hindi is recorded; English uses the device voice. No music or effects (FR-008).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Watch each lesson's key idea move (Priority: P1)

A learner in the Detailed journey opens a lesson and reaches the section that explains how the idea works. Instead of only a still diagram, there is a short clip that shows the mechanism moving: in lesson 3, a line tilts step by step as the neuron's weights learn until it separates the two kinds of fruit. The clip starts as a still picture, plays when the learner taps Play, can be paused and stepped through, shows captions that say what is happening, and has sound.

**Why this priority**: The six mechanisms (Turing test, rule tree, perceptron learning, filter sliding, word arithmetic, skewed data) are the ideas learners find hardest to picture from text alone, and each one is about change over time, which a still picture cannot show.

**Independent Test**: Make the lesson 3 clip only. Have the owner approve it and its captions, approve the Hindi captions, and release it. A learner in Detailed lesson 3 can play, pause, step, replay and mute it, and can read every caption.

**Acceptance Scenarios**:

1. **Given** a Detailed lesson with its concept clip, **When** the learner opens the lesson, **Then** the clip shows as a still picture with a Play button and a caption, and nothing moves or sounds until they press Play.
2. **Given** a playing clip, **When** the learner presses Pause, **Then** it stops on the current step, and Play continues from there.
3. **Given** a clip, **When** the learner uses Next step or Previous step, **Then** the clip shows that step as a still picture with that step's caption.
4. **Given** a clip that has finished, **When** the learner presses Play again, **Then** it plays from the start.
5. **Given** a learner who has asked their device for reduced motion, **When** they open the lesson, **Then** no animation plays; the clip shows its steps as stills they can move through with Next and Previous, with the same captions.
6. **Given** a Hindi learner, **When** they open a lesson whose Hindi captions are approved, **Then** the captions and the sound are in Hindi.

---

### User Story 2 - Every Detailed section has a picture (Priority: P2)

A learner reading a Detailed lesson gets a picture or clip in every section, not only in some. The sections that have none today are the opening "what it is" section and the worked example in every lesson, and the filter and fairness sections in lessons 4 and 7. Worked examples become clips that walk through the numbers one step at a time.

**Why this priority**: Detailed is the deepest track and has the fewest pictures (16 of 36 sections). Worked examples are where learners most often lose the thread, and a stepped clip lets them follow one calculation at a time.

**Independent Test**: Add the missing pictures to one lesson. Check that every non-activity section of that lesson now has a picture or clip, that each is approved, and that the lesson can be released without any other lesson changing.

**Acceptance Scenarios**:

1. **Given** a Detailed lesson after this feature, **When** a learner scrolls through it, **Then** every section except the activity section shows a picture or a clip.
2. **Given** a worked-example clip, **When** the learner steps through it, **Then** each step shows one stage of the calculation, and the numbers match the lesson text exactly.
3. **Given** a section picture or clip, **When** a screen reader reaches it, **Then** it reads a text description of what the picture teaches.

---

### User Story 3 - Clips have sound (Priority: P2)

A learner who plays a clip hears it, so they can watch the picture instead of reading captions. The sound can be muted, and muting is remembered for the rest of the visit. Starting the section's Read button or another clip stops the clip's sound, so two sounds never play at once.

**Why this priority**: The owner asked for sound. It makes the clips usable without reading every caption, which matters most on a phone.

**Independent Test**: Play the lesson 3 clip with sound on, then press Read section on another section: the clip's sound stops. Mute a clip: the next clip plays silently until unmuted.

**Acceptance Scenarios**:

1. **Given** a clip, **When** the learner presses Play, **Then** its sound plays with the animation; **When** they press Mute, **Then** the sound stops and the animation continues.
2. **Given** a clip playing with sound, **When** the learner starts Read section, the tutor's spoken answer, or another clip, **Then** the first clip stops.
3. **Given** the device cannot play the sound, **When** the learner plays a clip, **Then** the clip still plays with captions and no error is shown.

---

### Edge Cases

- **The lesson text changes after a clip is approved.** The clip's captions are part of the lesson's approved text, so the release check fails until the owner approves again (as for any text change, SPEC FR-CNT-10).
- **Hindi captions not approved yet.** The lesson's clips do not ship: the release check fails until the Hindi lesson has the same clips with approved captions, so a Hindi learner never sees missing or stale captions.
- **A clip's picture fails to load.** The section shows its caption list and text description in place of the picture; the rest of the lesson works.
- **The learner leaves the section or the lesson while a clip plays.** The clip and its sound stop.
- **Small screens.** The clip fits the screen width with no sideways scrolling, and its controls stay at least 44 by 44 pixels.
- **Activity sections.** They keep their interactive widget and get no clip; the widget is already the moving picture.
- **Kids and Plain English.** They do not change in this feature.

## Requirements *(mandatory)*

### Functional Requirements

**Clips and pictures**

- **FR-001**: Each Detailed lesson (1, 2, 3, 4, 5, 7) MUST have one concept clip showing its key mechanism: 1 a Turing-test conversation, 2 a rule tree firing step by step, 3 a line tilting as a neuron's weights learn, 4 a filter sliding over pixels, 5 word arrows doing "king − man + woman", 7 a skewed dataset tipping a decision. It is placed in the section that explains that mechanism.
- **FR-002**: Every Detailed section except the activity section MUST show a picture or a clip. The 14 sections without one today get a new picture or clip; every worked-example section gets a stepped clip.
- **FR-003**: A clip MUST be made of 3 to 8 steps, each with a caption, and MUST last 10 to 30 seconds when played through, estimated as the sum over its steps of (caption words ÷ 2.5 + 1) seconds.
- **FR-004**: Every clip and new picture MUST be drawn for this product, recorded in the asset register, and approved by the owner. No outside image, font, sound or footage is used.

**Playing**

- **FR-005**: A clip MUST first show as a still picture of its first step with its caption. It MUST NOT move or make sound until the learner presses Play.
- **FR-006**: A clip MUST offer Play, Pause, Next step, Previous step, Replay and Mute, each at least 44 by 44 pixels, usable by keyboard and screen reader, labelled in the learner's language.
- **FR-007**: Under reduced motion a clip MUST NOT animate. It shows its steps as stills with Next and Previous and the same captions. Sound plays only for the step the learner moves to, and only if they have not muted it.

**Sound**

- **FR-008**: A playing clip MUST have a voice reading each step's caption as that step plays. Hindi uses a recording made with the existing Hindi voices; English uses the device voice, as Read section does today. The next step waits until its caption has been read. No music or sound effects.
- **FR-009**: Only one sound plays at a time: starting a clip stops Read section, the tutor's voice and any other clip, and starting any of those stops the clip.
- **FR-010**: Muting a clip MUST keep every clip muted for the rest of the visit, until the learner unmutes.

**Words, review and release**

- **FR-011**: Clip captions and descriptions MUST be part of the lesson's text, so they are approved in the English review ledger with the lesson and translated and approved in the Hindi review ledger like the rest of the lesson.
- **FR-012**: Each clip MUST have a text description for screen readers that says what it teaches, not only what it looks like.
- **FR-013**: Every number, word and label shown in a clip MUST match the lesson text it illustrates.
- **FR-014**: Clips MUST be releasable one lesson at a time; adding a lesson's clips MUST NOT require any other lesson to change.
- **FR-015**: Clip captions are lesson text: the tutor grounds on them (SPEC FR-TUT-02) like the rest of the section, and may cite the section they are in. The clip's picture is not grounding text.

### Key Entities

- **Clip**: an animated picture in one Detailed section: its steps, each step's caption, a text description, an optional sound per step, and a fixed length of 10–30 seconds.
- **Step**: one still frame of a clip with one caption; the unit for Pause, Next, Previous and reduced motion.
- **Section picture**: an existing still picture (flowchart, step-by-step diagram, scene); unchanged.
- **Asset register entry**: the owner's approval record for each new drawing.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 36 Detailed sections show a picture, a clip or (for the 6 activity sections) an interactive widget: up from 22 of 36 today.
- **SC-002**: All 19 clips are owner-approved and released, in English and Hindi.
- **SC-003**: Every clip can be played, paused, stepped, replayed and muted using only a keyboard, and every control passes the 44-by-44-pixel and 4.5:1 contrast checks in light and dark themes.
- **SC-004**: Under reduced motion, no clip animates, and every caption can still be reached.
- **SC-005**: A Detailed lesson with its clips opens as fast as it does today on a phone connection: each clip adds no more than 100 KB to the lesson.
- **SC-006**: Two sounds never play at the same time in any test of clips, Read section and the tutor.
- **SC-007**: Each lesson's clips release without any change to another lesson.

## Assumptions

- Detailed only. Kids and Plain English may reuse the concept clips in a later spec.
- "All Detailed clips" means the 14 sections without a picture plus the six concept clips. The 6 activity sections keep their widgets and get no clip. Where a concept clip's section already has a still picture, the clip replaces it.
- Claude draws every clip by hand, as with the scene and concept pictures; the owner reviews each one before release.
- Hindi captions are drafted by Claude and approved by the owner, as in SPEC-009 and SPEC-013.
- English recording stays on hold (SPEC-013), so clip captions are read by the device voice in English and by new recordings, made with the existing Hindi voices, in Hindi (FR-008).
- No new outside services or paid tools are needed.
- Order of work: lesson 3 first (the pilot), then the other five lessons, one release each or grouped as the owner prefers.
