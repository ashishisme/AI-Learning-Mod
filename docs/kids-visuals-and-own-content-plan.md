# Kids visuals, next improvements, and moving to our own content

Draft, 2026-11-13. Proposal only; nothing here is decided until the owner says so.

## 1. Pictures and motion for Kids lessons

### Recommendation: our own SVG, animated with CSS, not GIFs

| | Our SVG (static or CSS-animated) | GIF | Lottie / video |
|---|---|---|---|
| File size | 1–15 KB | 200 KB–2 MB | 20–200 KB plus a player |
| Dark mode | recolours with the theme | fixed colours | fixed |
| Hindi and future languages | labels come from the lesson JSON | text is baked into the image | text baked in |
| Pause, reduced motion (WCAG 2.2.2, DC-11) | plays on tap, stops on reduced motion | autoplays, cannot be paused | possible |
| New dependency | none | none | a new npm package (needs a plan decision) |
| Rights | hand-drawn by us, already the brand rule | depends on the source | depends |

So: **hand-authored SVG for everything, with short CSS animations that play when tapped, last 5 seconds or less, and are replaced by a still frame under reduced motion.** It looks like a GIF to a kid, but works in both themes and in Hindi. The existing `concept-*.svg` and Chip poses already follow this pattern and the asset register (`design/brand/asset-register.json`, `go run ./cmd/assetcheck`).

Richer scene pictures (a kid on a bike, a fruit stall) can be AI-drafted, but only as drafts: per `design/brand/README.md` we record the model, prompt and date, the owner approves, and we redraw or trace to SVG (or ship a WebP of 60 KB or less) with no text in the image.

### Three kinds of picture per lesson

1. **Word pictures** (T034): one small picture per bold word, shown in its word card. 240×140, static.
2. **Card pictures**: one per card, shown above the text. Every card in a banded lesson needs one (the `structure` rule). Static, or a tap-to-play loop.
3. **Animated explainers**: two or three per lesson, for the idea that is easiest to show and hardest to say. They play on tap.

### Lesson 3 shopping list (cards 3–5 block `bands: true` today)

| Card | Picture | Motion |
|---|---|---|
| 1 Meet the Neuron | neuron as a switch with clue envelopes arriving (reuse `concept-neuron-switch`) | envelopes fly in, light turns on |
| 2 Some Clues Count More | three sliders: sweet up, round middle, sticker at zero | sliders move, total bar grows |
| 3 Easy or Picky? | two friends, one thumbs-up, one arms crossed | none |
| 4 A Neuron in a Computer | a kid wobbling on a bike, then riding straight | wobble, then steady |
| 5 Train Your Own Neuron | apple and lemon on a scale-like sorter | none (the widget is the motion) |
| words | neuron, weight, bias, perceptron (+ weighted sum, layer for 12+) | static |

About 10 SVGs, 3 with motion. Each needs a register entry and owner approval.

### Code needed (small)

- A `scene` field on a section (key of `web/public/brand/scenes/<key>.svg`) so a card can have a picture without a diagram or word picture. The data model already names "a scene card" as one way to meet the picture rule, but there is no field yet.
- An `<AnimatedPicture>` that shows the still frame first, plays on tap, and never plays under `prefers-reduced-motion`.
- `assetcheck` and the `missing-visual` rule cover `scenes/` as well as `words/`.

This would be a small spec amendment (SPEC §12) before building.

## 2. Other ways to make Kids lessons better (in order)

1. **Test with kids (T046).** Five kids, one lesson, watch where they stop. Nothing else on this list is as reliable.
2. **Chip reacts.** On a check-in answer, Chip switches to `chip-cheer` or `chip-think` (art exists).
3. **Do, then read.** Open some cards with a one-tap action ("tap the clues you'd use to spot an apple") before the text.
4. **Stickers for finishing a lesson**, kept on the device only (DC-09). No points, streaks or leaderboards.
5. **One lesson, five minutes.** Lesson 3 is now five cards; keep the others to five or six.
6. **A page for parents and teachers**: what each lesson teaches, in plain words, and that nothing about the child leaves the device.
7. **Fix the Hindi widget setting**: Hindi lessons 2, 4, 5 and 7 have `scaffold` translated, so their trainers lose guided steps. The fix is to treat `scaffold` as never translated in `internal/i18n/parity.go`. It re-stales those four Hindi lessons.

## 3. Writing our own content instead of Microsoft's

### Where Microsoft's course is used today

| Part | Source today |
|---|---|
| Standard lessons (`public-content/lessons/<id>.json`) | ingested from `microsoft/AI-For-Beginners` at a pinned commit |
| 38 images in `public-content/assets/` | from that course |
| Lesson topics and numbering (1–5, 7) | follow that course |
| Kids and Plain English lessons | written by us, but from those lessons |
| Hindi Standard lessons | translated from that course's English |
| Attribution footer, README, SPEC §1, NFR-LIC-01..03 | name the course |
| Tutor system prompt (SPEC §7.3.1) | "You are a teaching assistant for Microsoft AI-For-Beginners." |
| SPEC-010 (pending) | plans to take more from upstream |

The MIT licence lets us keep using it while we replace it, so this can go lesson by lesson; the attribution stays until no derived text or image ships.

### Proposed order

1. **Kids first.** Each rewritten Kids lesson, written fresh in our own words with our own pictures, is already our content. Lesson 3 is done.
2. **Plain English next**, the same way.
3. **Standard last.** Write our own Standard lessons (same topics is fine; the text, examples, structure and images must be ours). Then drop the ingest step, the upstream images, the brand blocklist and the pinned commit.
4. **Then** update the attribution, README, SPEC §1 and §7.3.1, and close SPEC-010.

This needs a new spec (SPEC-013) because it changes SPEC §1, §6.1, §7.3.1 and NFR-LIC-01..03.

### Decisions for the owner

1. Keep the Standard track on Microsoft's text until our own replaces it, or remove it sooner?
2. Close SPEC-010 (upstream translation sync) now?
3. Keep the same lesson topics and numbering, or design our own path (for example, adding a lesson on AI in daily life, or on generative AI)?
4. Who writes the Standard lessons: you, with me drafting, or me drafting for your review?
