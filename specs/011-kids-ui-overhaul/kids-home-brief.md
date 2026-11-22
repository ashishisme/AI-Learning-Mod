# Kids home brief: "Chip's Trail"

Confirmed by the owner on 2026-11-04 (`/impeccable shape kids-home`). This is the input for the SPEC-011 tasks on the Kids home. Visual tokens live in `/DESIGN.md`, which records today's baseline; the Kids layer below extends it.

## 1. Job and audience

- **Who:** a child of about 8–12, alone on their own phone, tablet or laptop, signed in with an invite.
- **When:** usually returning, in English or Hindi.
- **Mode:** an app screen the child uses, so it must be precise and easy to scan, with Kids-level delight on top.

## 2. Outcome and proof

- **Returning learner:** one tap from opening the app to the next lesson.
- **Sense of place:** at a glance, the child can see where they are among the six lessons.
- **First visit:** the journey chooser (FR-003), then Lesson 1 with Chip's welcome.
- **Proof:** the page shows only real progress from browser storage, never invented points or claims.

## 3. Direction

- **First viewport:** Chip, plus one large **Continue** card for the current stop: illustration, lesson title, one Chip line, the button.
- **Below it:** a winding path of six illustrated stops.
- **Visual world:** the calm desk layout from DESIGN.md, with a Kids layer from the approved UI UX Pro Max proposal:
    - chunky 20 px corners, 3 px borders and soft double shadows;
    - blue, amber and pink (light: `#2563EB`, `#F59E0B`, `#EC4899`; dark: `#60A5FA`, `#FBBF24`, `#F472B6`; all text pairs at least 4.5:1);
    - Baloo 2 headings and Comic Neue body text, self-hosted, plus Noto Sans Devanagari for Hindi.
- **Signature moment:** after finishing a lesson, Chip hops to the next stop on the path. Under reduced motion, the new stop is simply highlighted.

## 4. Scope and boundaries

- **In:** a production-grade Kids home only: route `/` when the journey is Kids.
- **Untouched:** the Standard and Plain English home pages (they keep the calm desk and keep search and filters), lessons, quizzes, the header and Settings.
- **Removed on the Kids home:** the search box and module filter chips (owner, 2026-11-04).
- **Never:** locks or gated stops, since all six stay open. Future stops read "not visited yet", never "locked".
- **Also out:** streaks, points pressure, emoji as icons, and anything that looks like an ad.

## 5. States and ranges

- Progress from 0 of 6 to 6 of 6.
- **First visit:** chooser first, then Continue opens Lesson 1.
- **Middle:** done, current and upcoming stops.
- **All done:** a celebration, plus "replay a lesson" and "try the quizzes".
- **Loading:** a quiet skeleton of the path.
- **Can't load lessons:** a clear message with a retry.
- **Hindi:** strings run about 30% longer, and the not-translated notice must fit.
- **Narrow screens:** 360 px phones.

## 6. Interaction and layout

- **Phone portrait first:** the Continue card on top, and the path running down the screen in a zigzag.
- **Desktop:** a horizontal wave.
- **Each stop:** illustration, number and title, plus a status shown in words as well as colour: Done, You are here, Next.
- **Every stop opens its lesson,** with a link to its quiz.
- **Keyboard:** the order follows the path, every target is at least 44 px, and the focus ring is visible.
- **Header:** the journey switcher stays reachable there, quietly.

## 7. Constraints and open decisions

- **Binding:**
    - CSS-only motion, with no new npm packages (DC-06);
    - fonts and art served by the app itself;
    - the DC-11 floor;
    - English and Hindi, with any changed text translated, reviewed and narrated.
- **Build path:** code-led, with no comps, while the Impeccable engine is unapproved.
- **Still open, not for the builder to invent:**
    1. **Art** for Chip's poses and the six stop illustrations: who makes it, and FR-009 rights with an asset register entry.
    2. **The page-weight budget:** SC-006's +350 KB conflicts with SPEC-009's "no more than 10% slower". The self-hosted fonts (about 60–80 KB) count against it.
