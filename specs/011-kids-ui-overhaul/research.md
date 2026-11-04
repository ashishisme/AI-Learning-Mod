# Research: Kids-First UI Overhaul

## R1 — Three learner journeys stay (owner decision, 2026-11-04)

**Decision:** Keep `AudienceMode = 'standard' | 'junior' | 'plain-english'` in learner state and API calls, unchanged.

**Why:** The owner chose to keep Standard. It is the full course lesson that the tutor grounds on and cites, and adults and technical learners use it. Removing it was reviewed and dropped.

## R2 — First-time chooser on the existing store

**Decision:** Keep the `ai-foundations-audience-mode` local-storage key and its values. Add a `hasChosenJourney` flag: false only when no preference has ever been saved, which shows the chooser once. Any saved preference, including `standard`, is kept and counts as chosen.

**Why:** Returning learners keep exactly what they had. A migration was considered only for removing Standard, so it is no longer needed.

## R3 — Standard keeps the canonical lesson

**Decision:** Standard keeps rendering the ingested upstream lesson, with its attribution and the upstream image blocklist. When a Kids or Plain English lesson is missing, the learner sees the existing not-available message and can switch journey.

**Why:** It keeps today's behaviour and licensing controls.

## R4 — Static 3D-style, not live 3D

**Decision:** Use original SVG for mark/UI/concept art and pre-rendered responsive AVIF/WebP for selected 3D-style heroes. Motion is subtle CSS/SVG and respects `prefers-reduced-motion`.

**Why:** It provides depth/delight with predictable mobile performance and no runtime 3D cost. WebGL/three.js was rejected due to bundle, GPU, accessibility and maintenance cost.

## R5 — Rights are a release gate

**Decision:** Every visual gets a register entry covering ID, purpose, files/checksums, creator/method, source master, ownership/licence, approvals, trademark screen, alt text and release status. Draft/unverified assets cannot ship.

**Why:** Original art is still copyright-protected; the practical goal is clear product ownership/licensing and no confusing third-party association. “AI generated” alone was rejected as rights proof.

## R6 — Cost-conscious visual system

**Decision:** Start vector-first and limit production to one mark, three Chip poses, six lesson illustrations, six concept graphics and reusable motifs. Create high-res masters once; serve small local responsive derivatives.

**Why:** It controls commissioning/generation spend, review work, egress and page weight. A unique 3D scene per card/route was rejected as high-cost, low-learning-value decoration.

## R7 — Accessible liveliness

**Decision:** Put saturated colour in surfaces/illustrations, retain tested text neutrals, use icon plus localized label/name for actions, and ensure colour/animation is never the sole information channel.

**Why:** Lively must stay readable for Hindi readers, low-vision learners and motion-sensitive learners. Neon text or celebration-only feedback was rejected.

## R8 — Parity

**Decision:** Release verification confirms every released language has all six lessons in all three journeys, and the localized visual copy they need. The existing `ingest -verify` gate already checks the lessons; the asset register check adds the visuals.

**Why:** A redesigned journey with missing text or art would look broken.

