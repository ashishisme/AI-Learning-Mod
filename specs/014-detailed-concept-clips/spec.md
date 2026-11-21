# Feature Specification: Concept Micro-Videos Across Curriculum Modes

**Feature Branch**: `cloud-beta-2` (video work not yet committed)

**Created**: 2026-11-14 | **Updated**: 2026-11-15

**Status**: Done (2026-11-21). Every Detailed section has a picture, a clip or a widget; all clips and videos are approved, have no words, and are voiced in hi, kn and ta.

**Input**: User description: "Animated concept clips for lessons. Evolved through owner approvals: transition from static SVG to bespoke fluid 60fps micro-videos rendered with headless Chromium Playwright pipeline; expand with Option B to deliver bespoke micro-videos across all 3 audience modes (Detailed, Junior / Kids, and Plain English) for all 6 core curriculum modules (1-intro, 2-symbolic, 3-neuralnetworks, 4-computervision, 5-nlp, 7-ethics). Junior mode features vector mascot Chip the Robot with cartoon physics; Plain English mode features minimalist dark-mode business/executive infographics; Detailed mode features engineering telemetry and neural topologies. Decoupled multilingual captions and voice narration in English and Hindi; zero baked-in text or audio in video source files; strict ≤ 750 KB payload budget per video; WCAG 2.1 AA touch controls (≥ 44×44 px)."

**Relationship to current product**: This builds on SPEC-012 (audience modes: Detailed, Junior, Plain English) and SPEC-013 (own lesson content). It deploys 18 bespoke 60fps concept micro-videos across the curriculum, powered by the `VideoClipPlayer` component, backed by `design/brand/asset-register.json` SHA-256 gate checks and `cmd/ingest` release gates. Requirement IDs below are cited as `SPEC-014 FR-xxx`.

## Clarifications

### Session 2026-11-14 (owner)
- Q: Picture format: drawn animation vs fluid video? → A: **Fluid 60fps micro-videos** rendered via headless Chromium into dual WebM (VP9) and MP4 (H.264) with poster fallback.
- Q: Sound? → A: **Decoupled voice narration.** English uses device speech synthesis; Hindi uses recorded voice tracks. No music or baked-in audio.
- Q: Multi-mode strategy? → A: **Option B: Bespoke videos per mode.**
  - **Junior (Kids)**: Mascot **Chip the Robot** with playful cartoon physics and Dale-Chall reading levels $\le 3.5$.
  - **Plain English**: Editorial dark-mode business infographics (loan trees, churn risk boundaries, industrial inspection, contract clause attention, hiring compliance audits).
  - **Detailed**: Engineering telemetry, neural topologies, and matrix transformations.

### Session 2026-11-15

- Q: Which form should the concept clips take from now on? → A: **Both kinds.** Videos for the "watch the idea" clip of each lesson in all three journeys (18 videos), and drawn step clips for Detailed worked examples and the other Detailed sections without a picture (lesson 3's two are live in v0.11.0).
- Q: How large may one video file be? → A: **At most 900 KB per file**, WebM and MP4 each checked by the release check; drawn step clips stay at most 100 KB.
- Q: When a video plays with its voice, should the video wait at the end of each section until that caption has been read out? → A: **Yes.** At each cue's end the video holds its last frame until the caption has been read, then carries on; when muted or with no speech, it holds for the caption's reading time.
- Q: For learners who have turned on "reduce motion", what should a video clip do? → A: **No motion.** Play is hidden; Previous and Next jump to each cue's still frame, and each cue's caption is read once unless muted, as with the drawn step clips.
- Q: Have you reviewed and approved all 18 videos and their English captions, as the brand register and English review ledger record? → A: **Yes**, the owner confirms all 18 videos and their English captions are reviewed and approved.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Watch each lesson's key idea move (Detailed Mode) (Priority: P1) 🎯 MVP

A learner in the Detailed journey opens a lesson and reaches the section that explains how the idea works. Instead of only a still diagram, there is a short, smooth video that shows the mechanism moving: in lesson 3, a line tilts step by step as the neuron's weights learn until it separates the two classes. The clip starts with a still poster, plays on tap, lets the learner jump to any of its 5 steps, offers three speeds (0.75×, 1×, 1.25×), and reads each caption aloud in the learner's language.

**Acceptance Scenarios**:
1. **Given** a Detailed lesson with its concept video, **When** the learner opens the lesson, **Then** the video shows its poster frame with a center play overlay and toolbar, not moving until tapped.
2. **Given** a playing video, **When** the learner clicks Pause or any of the 5 top progress cues, **Then** playback pauses or seeks smoothly to the selected chapter.
3. **Given** reduced-motion preference, **When** opened, **Then** there is no Play button and nothing moves; Previous and Next show each cue's still frame with its caption, and the caption is read once unless muted.

---

### User Story 2 - Junior Mode: Learn with Mascot Chip the Robot (Priority: P1)

A child or middle-school learner (ages 8–14) in Junior mode opens a lesson. They see mascot **Chip the Robot** actively demonstrating the concept with animated facial expressions, bouncing gestures, and hands-on metaphors:
- Module 1: Chip rewarding a dog with treats as the neural network learns.
- Module 2: Chip flipping if-then rule switches on a factory control board.
- Module 3: Chip weighing fruits on a pan scale with an interactive threshold pointer.
- Module 4: Chip scanning a giant mosaic pixel grid with a glowing magnifying glass.
- Module 5: Chip snapping magnetic word blocks together to build sentences.
- Module 7: Chip balancing a playground see-saw scale so all children get equal turns.

**Acceptance Scenarios**:
1. **Given** Junior mode is active, **When** navigating to any of the 6 core lessons, **Then** the bespoke Chip cartoon video plays.
2. **Given** Junior captions, **When** the release check runs, **Then** every caption is at reading grade 3.5 or lower, with no sentence over 18 words.

---

### User Story 3 - Plain English Mode: Pragmatic Executive Infographics (Priority: P1)

An adult professional or executive in Plain English mode opens a lesson. Rather than seeing mathematical formulas or juvenile cartoons, they see minimalist dark-mode business workflows:
- Module 1: Handwritten rules checklist vs. automated historical data pattern training.
- Module 2: Branching credit qualification decision tree.
- Module 3: Customer churn risk boundary optimization on tenure vs. engagement.
- Module 4: Industrial vision defect scanner with a sliding 3 × 3 filter.
- Module 5: Legal contract clause contextual attention routing.
- Module 6/7: Corporate hiring equity audit dashboard with disparate impact four-fifths rule calibration.

**Acceptance Scenarios**:
1. **Given** Plain English mode is active, **When** viewing the lesson, **Then** the executive dark-mode infographic video is rendered.
2. **Given** English or Hindi language selection, **Then** the synchronized captions explain the business impact clearly without academic jargon.

---

### User Story 4 - Captions and voice in the learner's language, with nothing sent elsewhere (Priority: P1)

A learner switches between English and Hindi, or mutes audio. The video remains language-neutral (no burned-in text), while typography and narration sync seamlessly without external network requests or tracking.

**Acceptance Scenarios**:
1. **Given** Hindi language mode, **When** playing any video, **Then** Hindi text captions and Hindi speech audio play in sync.
2. **Given** offline mode, **When** loading videos, **Then** every video and poster comes from the product itself, with no outside service.

---

### Edge Cases

- **Slow or no connection.** The lesson shows each clip's poster image; the video downloads only when the learner presses Play.
- **The video cannot play.** The poster stays, and all the captions are shown as a numbered list with the clip's description.
- **No speech on the device, or muted.** The clip still plays; each step or cue holds for its caption's reading time, so the captions can be read.
- **Reduce motion is on.** No clip moves; Previous, Next and the cue targets show still frames, and each caption is read once unless muted.
- **Another sound starts.** Read section, the tutor's voice or another clip pauses the playing clip; a clip's own caption finishing never pauses it.
- **Hindi not yet approved.** The clip does not ship in Hindi: the release check fails until the Hindi lesson has the same clip with approved captions.
- **A caption changes after approval.** Its lesson's approval goes stale and the release check fails until the owner approves again; its recording is redone.

## Requirements *(mandatory)*

### Functional Requirements

**Clips**

- **FR-016**: Each lesson MUST have one "watch the idea" video clip in each journey (Kids, Plain English, Detailed: 18 in all), with a poster image. A video carries no words and no sound of its own.
- **FR-017**: Kids video clips MUST star Chip the Robot, and their captions MUST pass the Kids reading check for ages 8–11 (reading grade 3.5 or lower, no sentence over 18 words).
- **FR-018**: Plain English video clips MUST use everyday work examples (decision trees, customer risk, factory inspection, contract reading, hiring checks) with no maths notation.
- **FR-019**: Every video file MUST be at most 900 KB, and the release check MUST refuse a larger one. A drawn step clip MUST be at most 100 KB.
- **FR-020**: A video clip MUST offer Play/Pause, Previous, Next, a target for each cue, a speed choice (0.75×, 1×, 1.25×, picture only) and Mute, each at least 44 by 44 pixels, keyboard-usable and labelled in the learner's language. The current caption is announced politely to screen readers.
- **FR-021**: Captions and voice MUST come from the lesson text in the learner's language, never from the video.
- **FR-022**: Every video and poster MUST have an approved entry in the brand register, and the release check MUST refuse a file that does not match it.

**Sound**

- **FR-008**: A playing clip MUST have a voice reading each step's caption as that step plays. Hindi uses a recording made with the existing Hindi voices; English uses the device voice, as Read section does today. The next step waits until its caption has been read: a step clip moves on after it, and a video clip holds its last frame at the end of each cue until the caption has been read, then carries on. When muted or when no speech is available, each step or cue holds for its reading time (words ÷ 2.5 + 1 seconds). A caption is never cut off by the next one. No music or sound effects.
- **FR-009**: Only one sound plays at a time: starting a clip stops Read section, the tutor's voice and any other clip, and starting any of those stops the clip.
- **FR-010**: Muting a clip MUST keep every clip muted for the rest of the visit, until the learner unmutes.

**Words, review and release**

- **FR-011**: Clip captions and descriptions MUST be part of the lesson's text, so they are approved in the English review ledger with the lesson and translated and approved in the Hindi review ledger like the rest of the lesson.
- **FR-012**: Each clip MUST have a text description for screen readers that says what it teaches, not only what it looks like.
- **FR-013**: Every number, word and label shown in a clip MUST match the lesson text it illustrates.
- **FR-014**: Clips MUST be releasable one lesson at a time; adding a lesson's clips MUST NOT require any other lesson to change.
- **FR-015**: Clip captions are lesson text: the tutor grounds on them (SPEC FR-TUT-02) like the rest of the section, and may cite the section they are in. The clip's picture is not grounding text.

**Privacy and accessibility**

- Clips use no outside services, tracking or third-party hosting: every file is served by the product itself.
- Controls meet the product's floor: at least 44 by 44 pixels, contrast of 4.5:1 or more, full keyboard use, and the reduced-motion behaviour above.

### Key Entities

- **Video clip**: the "watch the idea" clip of one lesson in one journey (18 in all): a video with a poster image, 5 cues each with a caption, a text description, and a voice per caption.
- **Step clip**: a drawn clip in one Detailed section (worked examples and sections without a picture): its steps, each step's caption, a text description, a voice per step, and a length of 10–30 seconds.
- **Step / cue**: one stage of a clip with one caption; the unit for Pause, Next, Previous and reduced motion.
- **Section picture**: an existing still picture (flowchart, step-by-step diagram, scene); unchanged.
- **Brand register entry**: the owner's approval record for each drawing, video and poster.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 36 Detailed sections show a picture, a clip or (for the 6 activity sections) an interactive widget: up from 22 of 36 today.
- **SC-002**: All 18 video clips and every Detailed step clip are owner-approved and released, in English and Hindi.
- **SC-003**: Every clip can be played, paused, stepped, replayed and muted using only a keyboard, and every control passes the 44-by-44-pixel and 4.5:1 contrast checks in light and dark themes.
- **SC-004**: Under reduced motion, no clip animates (step clips and video clips alike: no Play, still frames only), every caption can still be reached with Previous and Next, and each is read once unless muted.
- **SC-005**: A lesson with its clips opens as fast as it does today on a phone connection: a drawn step clip adds at most 100 KB, and a video clip's poster image loads first while the video itself (at most 900 KB) downloads only when the learner presses Play.
- **SC-006**: Two sounds never play at the same time in any test of clips, Read section and the tutor.
- **SC-007**: Each lesson's clips release without any change to another lesson.
- **SC-008**: All 18 videos and their posters have approved brand-register entries that match the files.
- **SC-009**: Every Kids clip caption passes the Kids reading check (grade 3.5 or lower, no sentence over 18 words).
- **SC-010**: Every video file is at most 900 KB.
- **SC-011**: Every one of the 18 lesson pages with a video clip passes the automated browser tests.

## Assumptions

- Two kinds of clip (clarified 2026-11-15): a video "watch the idea" clip per lesson in each of the three journeys, and drawn step clips for Detailed worked examples and the other Detailed sections without a picture. The 6 activity sections keep their widgets and get no clip. Where a clip's section already has a still picture, the clip replaces it.
- Claude draws every step clip by hand and renders every video; the owner reviews each one before release. (How the videos are made is in the plan.)
- Hindi captions are drafted by Claude and approved by the owner, as in SPEC-009 and SPEC-013.
- English recording stays on hold (SPEC-013), so clip captions are read by the device voice in English and by new recordings, made with the existing Hindi voices, in Hindi (FR-008).
- No new outside services or paid tools are needed.
- Order of work: lesson 3 first (the pilot), then the other five lessons, one release each or grouped as the owner prefers.
