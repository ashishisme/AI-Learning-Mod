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
  kids-blue: "#2563eb"
  kids-amber: "#f59e0b"
  kids-pink: "#ec4899"
  kids-background: "#eff6ff"
  kids-border: "#bfdbfe"
  kids-night-background: "#0b1220"
  kids-night-card: "#111a2e"
  kids-night-border: "#1e3a8a"
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
  kids-card: "20px"
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
  kids-trail-card:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.kids-card}"
    padding: "24px"
---

<!-- Refreshed 2026-11-06 from the SPEC-011 Kids layer in web/src/index.css. -->

# Design System: AI Foundations Coach

## Overview

**Creative North Star: "The Friendly Study Desk"**

Standard and Plain English retain a tidy study desk. Pages sit on a pale paper background, content lives on white cards with soft rounded corners, and study blue marks what you can act on. Dark mode turns the desk into a quiet night study, slate on deep navy, and keeps the same layout.

Density is moderate and text-led in Standard and Plain English. The Kids journey uses Chip's Trail: a Continue card and six illustrated stops, with clay cards and blue, amber and pink accents. Its lesson and quiz surfaces use the same Kids tokens.

Kids controls are bouncy and playful, while Standard and Plain English remain calm. The three-journey switcher sits in a sub-header toolbar on Home and Lesson pages.

**Key Characteristics:**
- Study blue for shared actions; the Kids layer also uses amber and pink.
- White or deep-navy cards on a paper or night background, separated by a thin border and a light shadow.
- Generous rounding: cards 16 px, banners 24 px, chips and pills fully round.
- System fonts, with Noto Sans Devanagari served by the app for Hindi.
- Kids uses 20 px clay cards with 3 px borders and self-hosted Baloo 2 and Comic Neue for Latin text.

## Colors

A cool, low-saturation desk for Standard and Plain English; a brighter blue, amber and pink Kids layer.

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

**The Kids Palette Rule.** The Kids layer uses blue `#2563eb`, amber `#f59e0b`, pink `#ec4899`, light background `#eff6ff`, and dark background `#0b1220`. Text uses `--kids-ink` and `--kids-ink-muted`, never an accent colour without a checked contrast pairing.

## Typography

**Display Font:** the system UI stack in Standard and Plain English; Baloo 2 in Kids for Latin text, with Noto Sans Devanagari for Hindi.
**Body Font:** the system UI stack in Standard and Plain English; Comic Neue in Kids for Latin text, with Noto Sans Devanagari for Hindi.
**Label/Mono Font:** the same stack; code uses the browser's monospace

**Character:** neutral and native. The app reads like the learner's own device, and Devanagari is never a mismatched fallback.

### Hierarchy
- **Display** (800, 1.875rem, 1.2): the page hero, such as "Artificial Intelligence Foundations".
- **Headline** (700, 1.5rem, 1.33): section and lesson titles.
- **Title** (700, 1.125rem, 1.55): card titles and panel headings.
- **Body** (400, 1rem, 1.625): lesson prose, kept to readable line lengths inside the card.
- **Label** (600, 0.75rem, 0.05em, uppercase in English): tags, field labels and small headings like "CURRICULUM MASTERY".

### Named Rules
**The No Tiny Text Rule.** Nothing a learner must read is under 12 px.

## Layout

A single centred column, `max-w-4xl` (896 px) on the home page, with 16 px side gutters on phones. A sticky 56 px header holds the brand, language switcher, help, settings and sign-out. Content stacks vertically in cards with 24 px padding and 24 to 32 px gaps.

Kids home replaces search and filters with a Continue card and six always-open illustrated stops. The three-journey switcher and Voice Studio button sit in a toolbar below the header on Home and Lesson pages.

Spacing follows Tailwind's 4 px scale, mostly 8, 12, 16 and 24 px. The layout is phone-first: everything fits 360 px without sideways scrolling, and `scroll-padding-top` keeps focused items clear of the sticky header.

## Elevation & Depth

Flat with soft lift. Surfaces are flat and bordered, and a light shadow (`shadow-sm`) only separates a card from the page. Hover lifts a lesson card one step (`shadow-md`). Gradients, blurred glows and inner shadows on icon tiles are Kids-only accents. The header uses a translucent white with backdrop blur.

### Shadow Vocabulary
- **Card rest** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): every card and panel.
- **Card hover** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): lesson cards on hover.
- **Kids clay** (`box-shadow: 4px 4px 0 0 rgb(37 99 235 / 0.18), inset -2px -2px 6px 0 rgb(15 23 42 / 0.06)`): Kids trail cards in light mode.

### Named Rules
**The Flat-By-Default Rule.** Depth answers state (hover, focus, open). A surface never gets a heavier shadow just to look important.

## Shapes

Soft and generous. Standard cards use 16 px corners, Kids trail cards use 20 px corners and 3 px borders, buttons and inputs use 8 to 12 px corners, and pills, chips, avatars and progress bars are fully round.

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
- It sits in a sub-header toolbar on Home and Lesson pages, with 44 px targets and a compact Voice Studio button. Switching within a lesson stops narration and scrolls to the top.

### Chip Mascot Banner (Kids)
- A warm amber gradient banner (24 px corners, 2 px amber border) with a soft blurred glow, Chip's 80 px avatar tile and a speech line. It is the Kids journey's signature.

## Do's and Don'ts

### Do:
- **Do** use study blue (#2563eb, #1d4ed8 for solid buttons) for shared actions and the approved Kids palette in Kids surfaces.
- **Do** give every control a 44 px target and a visible 2 px focus ring.
- **Do** keep Standard and Plain English on the calm desk; brighten only the Kids journey.
- **Do** serve fonts and images from the app's own address, including Noto Sans Devanagari.
- **Do** respect reduced motion: transitions collapse to instant (index.css).

### Don't:
- **Don't** set readable text below 12 px.
- **Don't** use a Kids accent colour for text without meeting the 4.5:1 contrast floor.
- **Don't** rely on emoji as the only carrier of meaning; the overhaul replaces them with original illustrations.
- **Don't** use upstream course images with third-party logos (the brand blocklist stays in force).
