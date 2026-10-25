# UI Craft & Design Motion Guidelines

These rules apply whenever designing, creating, or modifying frontend interfaces in `web/`:

## 1. Design & Typography Principles (from `frontend-design` & `impeccable`)
- **Authoritative Technical Aesthetics:** Ground designs in the subject matter (machine learning, laboratory, telemetry benches) with crisp layout and zero wasted pixels.
- **Typography Scale:** Body text measure between 65–75ch for prose reading comfort; clear typographic weight steps; balanced headings; no kicker/eyebrow labels above main headings.
- **Contrast & Depth:** Maintain WCAG contrast ≥4.5:1 for body and ≥3:1 for large text. Declare elevation once: subtle 1px border or calibrated soft shadow, never unmotivated ghost cards or thick colored border stripes.
- **Browser Surfaces:** Style browser defaults (`::selection`, custom scrollbar thumbs, focus-visible rings) from the project palette.

## 2. Micro-Interactions & Transitions (from `impeccable:animate`)
- **Purposeful Motion:** Use CSS easing (`transition-all duration-200 ease-out`) for interactive controls.
- **Interactive Feedback:** Provide instant active state transitions (`active:scale-[0.98]` or `active:scale-95`) on buttons and checkboxes.
- **State Changes:** Smooth progress fill transitions and animated activity pulses during asynchronous operations.

## 3. Dependency Constraints (DC-01, DC-06, NFR-SEC-03, NFR-PRV-02)
- All animations must be implemented using pure Tailwind CSS and vanilla CSS keyframes.
- Do not import external animation engines (e.g. Framer Motion, GSAP) without an amendment.
- Do not load third-party Google Fonts or CDN scripts.
- Never use `dangerouslySetInnerHTML`.
