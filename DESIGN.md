---
name: AI Foundations Coach
description: A calm study desk for learning AI, with a brighter room for kids.
colors:
  study-blue: "#2563eb"
  study-blue-deep: "#1d4ed8"
  study-blue-wash: "#eff6ff"
  paper: "#f8fafc"
  card-white: "#ffffff"
  ink: "#0f172a"
  ink-soft: "#334155"
  pencil-grey: "#64748b"
  rule-line: "#e2e8f0"
  night-desk: "#0f172a"
  night-card: "#1e293b"
  night-ink: "#f1f5f9"
  night-pencil: "#94a3b8"
  success-green: "#10b981"
  sunny-amber: "#fcd34d"
  sunny-wash: "#fffbeb"
  alert-red: "#dc2626"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans Devanagari, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.2
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans Devanagari, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans Devanagari, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.55
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans Devanagari, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans Devanagari, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "0.05em"
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.study-blue-deep}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "#1e40af"
  card:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  card-dark:
    backgroundColor: "{colors.night-desk}"
    textColor: "{colors.night-ink}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  mode-tab-active:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.study-blue}"
    rounded: "{rounded.lg}"
    padding: "6px 12px"
  chip-filter-active:
    backgroundColor: "{colors.study-blue}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
  kids-banner:
    backgroundColor: "{colors.sunny-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.3xl}"
    padding: "24px"
---

<!-- Captured 2026-11-04 from the shipped code (v0.4.3), before the SPEC-011 Kids-first overhaul. It records today's look as the baseline; the overhaul will replace parts of it deliberately. -->

# Design System: AI Foundations Coach

## Overview

**Creative North Star: "The Friendly Study Desk"**

The app is a tidy, approachable place to study. Pages sit on a pale paper background, content lives on white cards with soft rounded corners, and a single study blue marks what you can act on. Dark mode turns the desk into a quiet night study, slate on deep navy, and keeps the same layout.

Density is moderate and text-led. Lessons, quizzes and the tutor are read more than clicked, so the system gives prose room and keeps chrome small. The Kids journey brightens the same desk rather than replacing it: warm amber banners, coloured icon tiles and Chip the robot appear, while the grid, cards and controls stay the same.

The intended feel for controls is **bouncy and playful** (owner, 2026-11-04). Today's controls are clear, solid and dependable, so that feel is the direction of the SPEC-011 overhaul, not yet the implementation.

**Key Characteristics:**
- One accent colour, study blue, for action and progress.
- White or deep-navy cards on a paper or night background, separated by a thin border and a light shadow.
- Generous rounding: cards 16 px, banners 24 px, chips and pills fully round.
- System fonts, with Noto Sans Devanagari served by the app for Hindi.
- Kids adds warmth (amber, indigo and purple washes, Chip) on top of the same structure.

## Colors

A cool, low-saturation desk with one confident blue and a few warm accents reserved for Kids and status.

### Primary
- **Study Blue** (#2563eb): selected filters, progress bars, the active mode tab's text, links and focus rings. It is the only colour that means "act here".
- **Study Blue Deep** (#1d4ed8): solid primary buttons such as "Ask Tutor", where white text needs extra contrast.
- **Study Blue Wash** (#eff6ff): the background of guide notes and the subtle accent fill.

### Secondary
- **Sunny Amber** (#fcd34d) on **Sunny Wash** (#fffbeb): the Kids mascot banner and its glow, and notices that need warmth rather than alarm.

### Tertiary
- **Success Green** (#10b981): correct answers, completion and the "Online" status, usually as a 20% tint.

### Neutral
- **Paper** (#f8fafc): the page background in light mode.
- **Card White** (#ffffff): cards, the header and dialogs.
- **Ink** (#0f172a): headings and body text in light mode.
- **Ink Soft** (#334155): secondary text in light mode.
- **Pencil Grey** (#64748b): captions, hints and metadata.
- **Rule Line** (#e2e8f0): card borders and dividers.
- **Night Desk** (#0f172a) and **Night Card** (#1e293b): the dark-mode page and raised surfaces.
- **Night Ink** (#f1f5f9) and **Night Pencil** (#94a3b8): dark-mode text and captions.
- **Alert Red** (#dc2626): errors only.

### Named Rules
**The One Blue Rule.** Study blue is the only interactive colour. Kids colours decorate; they never mark a button or link.

**The Contrast Floor Rule.** Every text and control pair meets 4.5:1 in light and dark (DC-11). Tints carry backgrounds, never text.

## Typography

**Display Font:** the system UI stack (with Noto Sans Devanagari for Hindi)
**Body Font:** the same stack
**Label/Mono Font:** the same stack; code uses the browser's monospace

**Character:** neutral and native. The app reads like the learner's own device, and Devanagari is never a mismatched fallback.

### Hierarchy
- **Display** (800, 1.875rem, 1.2): the page hero, such as "Artificial Intelligence Foundations".
- **Headline** (700, 1.5rem, 1.33): section and lesson titles.
- **Title** (700, 1.125rem, 1.55): card titles and panel headings.
- **Body** (400, 1rem, 1.625): lesson prose, kept to readable line lengths inside the card.
- **Label** (600, 0.75rem, 0.05em, uppercase in English): tags, field labels and small headings like "CURRICULUM MASTERY".

### Named Rules
**The No Tiny Text Rule.** Nothing a learner must read is under 12 px. A few chips use 11 px today, and the overhaul should raise them.

## Layout

A single centred column, `max-w-4xl` (896 px) on the home page, with 16 px side gutters on phones. A sticky 56 px header holds the brand, language switcher, help, settings and sign-out. Content stacks vertically in cards with 24 px padding and 24 to 32 px gaps.

Spacing follows Tailwind's 4 px scale, mostly 8, 12, 16 and 24 px. The layout is phone-first: everything fits 360 px without sideways scrolling, and `scroll-padding-top` keeps focused items clear of the sticky header.

## Elevation & Depth

Flat with soft lift. Surfaces are flat and bordered, and a light shadow (`shadow-sm`) only separates a card from the page. Hover lifts a lesson card one step (`shadow-md`). Gradients, blurred glows and inner shadows on icon tiles are Kids-only accents. The header uses a translucent white with backdrop blur.

### Shadow Vocabulary
- **Card rest** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): every card and panel.
- **Card hover** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): lesson cards on hover.
- **Tile inset** (`box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.05)`): Kids metaphor icon tiles.

### Named Rules
**The Flat-By-Default Rule.** Depth answers state (hover, focus, open). A surface never gets a heavier shadow just to look important.

## Shapes

Soft and generous. Cards use 16 px corners, Kids banners and guide notes 24 px, buttons and inputs 8 to 12 px, and pills, chips, avatars and progress bars are fully round. Borders are 1 px; Kids banners use 2 px for a chunkier, friendlier edge.

## Components

### Buttons
- **Shape:** gently rounded (8 px), at least 44 px tall.
- **Primary:** Study Blue Deep with white text, 10 px by 16 px padding, semibold.
- **Hover / Focus:** a deeper blue on hover; a 2 px study-blue focus ring with a 2 px offset.
- **Secondary:** white or slate-100 surface with a thin border and ink text.

### Chips
- **Style:** small rounded rectangles (6 px) for module filters; fully round status pills.
- **State:** selected is Study Blue with white text; unselected is slate-100 with pencil-grey text.

### Cards / Containers
- **Corner Style:** 16 px.
- **Background:** Card White, or Night Desk in dark mode.
- **Shadow Strategy:** card rest, card hover on lesson cards.
- **Border:** 1 px Rule Line, or slate-800 in dark mode.
- **Internal Padding:** 24 px; 32 px for empty and error states.

### Inputs / Fields
- **Style:** white field, 1 px slate-300 border, 8 to 12 px corners, at least 44 px tall.
- **Focus:** the study-blue focus ring.

### Navigation
- **Style:** a sticky translucent header with a thin bottom rule. Header controls are compact bordered pills at least 44 px. A green dot on Settings shows when a local AI is connected.

### Journey Switcher
- A segmented control: a slate-100 track holding three tabs (Standard, Kids, Plain English). The active tab is a raised white chip with study-blue text and a light shadow.

### Chip Mascot Banner (Kids)
- A warm amber gradient banner (24 px corners, 2 px amber border) with a soft blurred glow, Chip's 80 px avatar tile and a speech line. It is the Kids journey's signature.

## Do's and Don'ts

### Do:
- **Do** keep study blue (#2563eb, #1d4ed8 for solid buttons) as the only action colour.
- **Do** give every control a 44 px target and a visible 2 px focus ring.
- **Do** keep Standard and Plain English on the calm desk; brighten only the Kids journey.
- **Do** serve fonts and images from the app's own address, including Noto Sans Devanagari.
- **Do** respect reduced motion: transitions collapse to instant (index.css).

### Don't:
- **Don't** set readable text below 12 px.
- **Don't** use a Kids accent colour for a button or link.
- **Don't** rely on emoji as the only carrier of meaning; the overhaul replaces them with original illustrations.
- **Don't** use upstream course images with third-party logos (the brand blocklist stays in force).
