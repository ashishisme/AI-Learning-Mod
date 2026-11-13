# Contract: Kids lesson UI behaviour (SPEC-012)

These are the observable behaviours that the Playwright tests assert. Test ids are listed so the tests and the code agree.

## Age band chooser and setting (FR-005, FR-006, FR-009)

- After the learner picks Kids in `JourneyChooser`, a band step offers **"I'm 8–11"** and **"I'm 12–14"**, with test ids `age-band-8-11` and `age-band-12-14`. A Skip choice keeps 8–11.
- Settings and the Voice Studio show the same two options when mode is `junior`.
- Changing the band re-renders the open lesson in place, and lesson progress and the quiz position are kept.
- No network request body, URL or header contains `8-11`, `12-14` or `ageBand`. The test checks every request made during a lesson and during a feedback submit.

## Word card (FR-010 – FR-013)

- A bold word with an entry renders as `button[data-testid="word-<term>"]` with `aria-haspopup="dialog"`, `aria-expanded`, and a tap area of at least 44×44 px.
- When opened, it shows `role="dialog"` labelled by the term, containing:
  - the explanation;
  - `img` with alt text from a new translated key `adaptive.wordPicture` ("Picture: {term}"), or no image if it fails to load;
  - a listen control. While muted, this is the FR-UI-19 muted control, which plays nothing.
- Escape, the close button, or a tap outside closes the card, and focus returns to the word.
- Only one card is open at a time. On a 320 px screen the card stays fully inside the viewport.
- Under `prefers-reduced-motion: reduce`, the SVG shows its still frame (the SVG's own media query).

## Stepper Play (FR-014)

- `stepper-play` and `stepper-pause` buttons sit next to the existing Next and Show-all buttons. Play advances one step every 3 s, and stops at the last step or on Pause.
- Under reduce motion, Play is not rendered.

## Check-in, recap, teach-back (FR-004, FR-015, FR-016)

- `check-in-<sectionId>` uses `ChoiceCard`. Answering shows Chip's reaction, and the saved lesson score and progress are byte-identical before and after.
- `lesson-recap` shows the 3 items, placed after the last section and before `miniQuiz`.
- Teach-back is unchanged: a tap-to-pick `ChoiceCard`.

## Read-along (FR-018)

- While a recording plays, the section's "speaking" strip shows the sentence estimated from the playback position, marked `data-reading="true"`. This is the same strip device voices already fill, so device-voice behaviour is unchanged.
- **12+ narration:** in 12–14, a section with `teen.add` has a second button, "Read the 12+ part", that plays the `section-<id>-teen` track. A section with `teen.body` has one button, which plays the teen track.

## Contrast and theme (DC-11)

- Every new text colour pair is at least 4.5:1 in light and dark themes, checked the same way as `web/tests/redesign-a11y.spec.ts`.
