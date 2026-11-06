# Feature Specification: Kids-First UI Overhaul

**Feature Branch**: `011-kids-ui-overhaul`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Create a next major upgrade plan for this UI change. We will review and implement via speckit package. I believe we need to remove the standard mode, improve the kids mode to be more lively and colourful, and plan this as part of a UI overhaul."

**Relationship to current product**: This is the next major learner-facing release after the Hindi beta work. It keeps SPEC-002's three journeys, Standard, Kids and Plain English, and redesigns how they look, with the biggest change in the Kids journey. Requirement IDs below are cited as `SPEC-011 FR-xxx`.

## Clarifications

### Session 2026-11-04 (owner)

- Q: Remove Standard mode? → A: **No. Standard stays a learner-selectable journey.** The overhaul keeps all three journeys and every other input: the livelier Kids journey, original visual assets with a rights gate, accessibility, performance, and English and Hindi support.
- Q: What does the Kids home look like? → A: **"Chip's Trail"** (confirmed brief: [kids-home-brief.md](./kids-home-brief.md)).
    - **Layout:** a large Continue card with Chip on top, and six illustrated, always-open stops below on a winding path.
    - **Search:** search and module filters are removed from the Kids home only.
    - **Kids look:** the UI UX Pro Max proposal is approved for the Kids layer: clay style; blue, amber and pink; Baloo 2 and Comic Neue, self-hosted.
    - **Baseline:** today's look is recorded in `/DESIGN.md`.
- Q: Who makes the art (FR-009)? → A: **Generated with AI: Gemini or Imagen on the project's own Vertex AI, or hand-authored SVG where that serves better.**
    - **Owner and reviewer:** the owner commissions every image and approves it.
    - **The asset register records for each asset:**
        - the model and version, the exact prompt and the date;
        - the reference images used, which may only be our own assets, never third-party art or a named artist's style;
        - the owner's approval and the trademark screen.
    - **Rights:** "AI generated" alone is not rights proof (research R5). The register entry and the owner's approval are what let an asset ship.
- Q: Page-weight budget (SC-006 against SPEC-009 SC-007)? → A: **Implement within SC-006's +350 KB and mark the result for a performance review once built.**
    - **The review measures** first-load weight and load time against v0.4.3, the same way as SPEC-009 T090.
    - **The decision:** whether to keep the budget or trim. Hero art and fonts load after first paint where possible.
    - **SPEC-009 SC-007:** its "no more than 10% slower" stays the target the review reports against.

### Session 2026-11-05

- Q: Where should the redesigned three-journey switcher be placed on the Home and Lesson pages? (FR-004) → A: **Option A: Dedicated sub-header toolbar on both Home and Lesson pages, placed directly above the main content with 44 px segmented buttons.**
- Q: What should happen to active audio narration when a learner switches journeys mid-lesson? (FR-004, FR-016) → A: **Option B: Stop audio immediately and reset scroll to the top of the lesson so the learner starts the new journey from the beginning.**
- Q: What fallback representation should be displayed when an original illustration fails to load or is blocked by client privacy/content blockers? (FR-008, FR-015) → A: **Option B: Outlined placeholder box with a subtle concept icon and the localized descriptive text alternative.**
- Q: How should the Voice Studio (Voice Persona) selector be arranged alongside the three-journey switcher in the new sub-header toolbar? (FR-004, FR-014) → A: **Option C: Display the 3 journey tabs plus a compact 44 px icon button (robot face 🤖) for Voice Studio on all screen sizes.**
- Q: What specific contrast ratio threshold should be enforced by the automated accessibility test across all three journeys? (FR-014, SC-005) → A: **At least 4.5:1 for all text, including large text and headings, in light and dark themes, as required by the project constitution.**

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start a lively kids learning journey (Priority: P1)

A child opens the course and immediately understands that it is an interactive learning adventure. They can begin the Kids journey, see Chip as a consistent guide, and move through lessons that use colourful original visuals, clear short sections, and inviting learning activities.

**Why this priority**: The overhaul must make the Kids experience easy to find and immediately valuable, while the other journeys stay one choice away.

**Independent Test**: A first-time learner can open the home page, begin the Kids journey, complete one lesson activity and its quiz, and return to the curriculum with their completion recorded.

**Acceptance Scenarios**:

1. **Given** a learner has no saved audience preference, **When** they open the home page, **Then** they see a clear choice between the Kids, Plain English and Standard journeys, with a short explanation of each.
2. **Given** a learner chooses the Kids journey, **When** they open any of the six lessons, **Then** the lesson opens in Kids mode, and the journey switcher still offers Plain English and Standard.
3. **Given** a learner completes an activity or quiz, **When** the result is shown, **Then** they receive a clear celebratory response that does not rely on colour alone.
4. **Given** a learner returns later, **When** they open the course, **Then** their chosen journey and browser-local progress are retained.

---

### User Story 2 - Switch to Plain English or Standard when it better fits the learner (Priority: P1)

An adult or older learner can select Plain English or Standard from the entry choice or a consistent journey switcher. Plain English gives clear, practical explanations without the visual intensity of the Kids journey. Standard gives the full course lesson.

**Why this priority**: A livelier Kids journey must not make the course less useful for adults and technical learners.

**Independent Test**: A learner can select Plain English or Standard from the home page or lesson page, read a lesson, use the tutor, and switch back to Kids without losing lesson progress.

**Acceptance Scenarios**:

1. **Given** a learner selects Plain English, **When** they enter a lesson, **Then** the lesson uses the existing Plain English explanation and its adult-oriented guide voice.
2. **Given** a learner changes journeys while reading, **When** the alternative journey is available, **Then** the displayed explanation changes and the learner remains on the same lesson.
3. **Given** a learner changes journeys, **When** they return to the curriculum, **Then** their completion status and saved preference remain intact.

---

### User Story 3 - Learn with original visual assets (Priority: P2)

Learners encounter a consistent original visual identity: a distinct app logo, Chip illustrations, and lesson graphics that explain the concept being taught. Visuals make the course livelier while keeping text readable and focused.

**Why this priority**: A major UI overhaul needs product-owned visual assets so the experience is distinctive and safe to use commercially.

**Independent Test**: A learner can visit the home page and all six lessons in light and dark themes, see the intended illustrations, and access equivalent information and descriptions without relying on the graphics.

**Acceptance Scenarios**:

1. **Given** a learner opens the home page, **When** it finishes loading, **Then** they see an original app mark and one original hero illustration that identify the product.
2. **Given** a learner opens each lesson, **When** a visual is shown, **Then** it reinforces the lesson concept and has meaningful text alternative where it conveys learning content.
3. **Given** an illustration cannot load, **When** the learner continues, **Then** the lesson remains usable and readable.
4. **Given** a learner uses Hindi, **When** they view a visual card or learning prompt, **Then** its surrounding UI and text alternative are available in Hindi.

---

### User Story 4 - Use the redesigned app accessibly on any supported screen (Priority: P1)

Learners can use the colourful redesign on a phone, tablet, or desktop in light and dark themes. They can reach all actions by keyboard and understand actions without relying solely on colour, motion, or a particular image.

**Why this priority**: The redesign serves children and adult learners with a wide range of devices and access needs.

**Independent Test**: At phone and desktop widths, a keyboard-only learner can choose a journey, open every lesson, switch journeys, complete a quiz, open help and settings, and return home without clipped content or hidden focus.

**Acceptance Scenarios**:

1. **Given** a learner uses a 360 px-wide phone, **When** they view a home page, lesson, quiz, settings panel, or help panel, **Then** no essential content is clipped or requires page-level horizontal scrolling.
2. **Given** a learner uses keyboard navigation, **When** focus moves through a screen, **Then** the focus indication is visible and is not covered by the sticky header or a panel.
3. **Given** a learner prefers reduced motion, **When** they use the Kids journey, **Then** state changes remain understandable without continuous or distracting animation.
4. **Given** a learner uses light or dark theme, **When** they read normal-sized text or use a control, **Then** it meets the product contrast and target-size floor.

### Edge Cases

- A saved preference exists from an earlier release, including Standard: it is kept as it is, and the learner does not see the first-time chooser again.
- A learner changes journey while viewing a lesson: any active audio narration stops immediately and the scroll position resets to the top of the lesson to begin the new presentation from the start.
- A Kids or Plain English lesson is missing or temporarily unavailable: the learner sees a clear message and can switch journey or return to the curriculum.
- The learner changes language after choosing a journey: the chosen journey remains selected and translated presentation text loads for the selected language.
- An original graphic is unavailable or disabled for reduced data/privacy blockers: an outlined placeholder box displays a subtle concept icon and the localized text alternative, and the associated learning outcome remains clear without layout shift.
- The device cannot play animation: the static first frame communicates the same state and purpose.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The learner-facing product MUST offer three journeys: Kids, Plain English and Standard.
- **FR-002**: All three journeys MUST share the redesigned look (navigation, typography, colour system, cards and controls). The Kids journey adds the lively visual system in FR-007.
- **FR-003**: A first-time learner MUST receive an understandable choice between the three journeys before beginning a lesson; no choice may be framed as less capable or less correct.
- **FR-004**: A learner's selected journey MUST persist on their device and MUST be changeable from a dedicated sub-header toolbar directly below the top navigation bar on both the home page and lesson pages, with segmented buttons of at least 44 px touch target size alongside a compact 44 px icon button for Voice Studio. Changing journey inside a lesson MUST stop any active audio narration and reset the scroll position to the top of the lesson.
- **FR-005**: A preference saved by an earlier release, including Standard, MUST be kept unchanged, along with browser-local progress, quizzes, audio settings, language choice and theme preference.
- **FR-006**: Every one of the six lessons MUST provide all three journeys before this release ships.
- **FR-007**: The Kids journey MUST use a consistent visual system comprising Chip guidance, an original app mark, concept-relevant illustrations, clear activity states, and celebratory completion feedback.
- **FR-008**: Kids graphics MUST support comprehension, use text alternatives when they carry learning meaning, and MUST NOT be the sole source of instructional information. When an illustration fails to load or is blocked, an outlined placeholder box displaying the localized text alternative and a subtle concept icon MUST be rendered.
- **FR-009**: The release MUST use product-owned or appropriately licensed original visual assets. Each new visual asset MUST have a recorded creator, ownership or licence basis, source file, usage location, and reviewer approval.
- **FR-010**: The release MUST not use third-party logos, lookalike marks, copied character designs, unverified web images, or prompts requesting a living artist's or brand's style.
- **FR-011**: The app mark and illustration set MUST have a documented trademark-conflict review before public release.
- **FR-012**: The redesign MUST maintain current attribution for the upstream curriculum and MUST keep the existing upstream-image brand exclusion controls in force.
- **FR-013**: Kids journey visuals and controls MUST work in English and Hindi, including localized labels and text alternatives.
- **FR-014**: The redesign MUST meet the project constitution's contrast floor (minimum 4.5:1 for all text, including large text and headings), 44 px targets or equivalent padding, keyboard operation, visible focus, and reduced motion in light and dark themes.
- **FR-015**: New visual assets MUST be delivered at an appropriate size for their display, load only when needed, and preserve the existing English first-load performance target.
- **FR-016**: The release MUST retain a concise, non-animated representation for every essential animated or 3D-style visual state.
- **FR-017**: The Standard journey MUST keep presenting the canonical course lesson, with its upstream attribution and image-screening controls unchanged.
- **FR-018**: Product analytics and feedback MUST keep recording the learner's journey as Standard, Kids or Plain English.

### Key Entities

- **Learner journey**: The learner-selected presentation of a lesson: Kids, Plain English or Standard.
- **Visual asset record**: The ownership, provenance, source, localization, delivery variants, and approval details for a product-owned graphic.
- **Illustration family**: The related set of original app mark, Chip renders, lesson illustrations, and small learning visuals that share one visual language.
- **Concept visual**: An illustration that supports a specific lesson outcome and has associated accessible text.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of learner-facing routes let the learner reach all three journeys, from the home page and within a lesson.
- **SC-002**: 100% of preferences saved by earlier releases are kept, with existing local learner data intact.
- **SC-003**: All six lessons pass the defined phone and desktop visual review in English and Hindi, light and dark themes, with no page-level horizontal overflow.
- **SC-004**: 100% of learning-relevant visual assets have a completed visual asset record and approval before release.
- **SC-005**: 100% of primary learner actions meet the target-size (>= 44 px), contrast (>= 4.5:1 for all text, including headings), keyboard, and reduced-motion acceptance checks in light and dark themes.
- **SC-006**: The English home page's initial downloaded asset weight increases by no more than 350 KB compressed compared with the release immediately before this feature. *(2026-11-04: accepted for the build, then subject to a performance review against SPEC-009 SC-007's 10% load-time target.)*
- **SC-007**: In moderated usability review, at least 8 of 10 representative learners can identify their current journey and change it without help.
- **SC-008**: At least 8 of 10 representative child learners can state the goal of an activity after completing its first screen.

## Assumptions

- The current Kids, Plain English and Standard lesson content remains the starting point; the overhaul improves presentation, interactivity, and visual identity without changing the course's learning outcomes.
- First-time learners choose a journey rather than receiving a hidden default. Their choice persists locally.
- The next major release includes the original asset set planned for the UI overhaul: app mark, core Chip illustrations, six lesson illustrations, and six small concept visuals.
- Three-dimensional visual treatment is delivered as optimized static or lightly animated imagery rather than interactive 3D models in this release.
- The current English and Hindi language workflow remains in force. Any changed learner-facing text is translated, reviewed, and narrated where required.
- The three-mode learner presentation in the master specification stays. The new visual-asset rights and performance requirements need adding to `spec/SPEC.md` and `spec/ACCEPTANCE.md` before release.
