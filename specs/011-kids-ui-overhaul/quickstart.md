# Quickstart: Validate the Kids-First UI Overhaul

## Preconditions

- The visual-asset rights and performance additions to SPEC-001 and the acceptance trace are ratified.
- Every served visual is `approved` in the asset register with rights/trademark review reference.
- All six lessons exist in all three journeys, in English and Hindi.

## Local gates

```sh
go test ./...
npm --prefix web test -- --project=chromium
npm --prefix web run build
```

The feature asset/content verifier must fail for a missing journey lesson, missing/unapproved record, derivative checksum mismatch, unsupported file or byte-budget breach.

## Flow checks

1. Empty preference: home shows the Kids, Plain English and Standard choice.
2. Choose Kids; refresh, open a lesson and its quiz, switch language and theme: the selection and progress persist.
3. Switch to Plain English, then Standard: route, language and progress remain; the lesson representation changes.
4. Seed a saved `mode: "standard"` plus completed progress: refresh opens Standard with progress intact, and the chooser is not shown.
5. Simulate a missing Kids lesson: the not-available message offers a journey switch.

## Accessibility, performance and rights

Across Home, six lessons and quizzes; all three journeys; English/Hindi; light/dark; 360 px/desktop: no overflow or clipped Hindi, keyboard/focus/44 px actions, localized alternatives, at least 4.5:1 contrast for all text including headings, no colour-only information and reduced-motion-safe visuals.

On throttled mobile, added initial visual transfer is ≤350 KB and off-screen art is lazy. Verify served checksums/statuses, continuing upstream attribution/image-blocklist checks, and obtain design, content/accessibility and rights/trademark owner approvals before deployment.

