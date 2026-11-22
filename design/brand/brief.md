# Art Direction Brief: AI Foundations Coach Illustration Family

**Version**: 1.0
**Date**: 2026-11-05
**Owner**: AI Foundations Coach Product Team
**Governing Requirements**: SPEC-011 FR-007, FR-008, FR-009, FR-010, FR-011, SC-004

---

## 1. Creative North Star: "Friendly Clay & Wonder"

The visual universe is tactile, friendly, and approachable. It feels like handcrafted clay modeling brought to life with clean vector geometry and vibrant soft lighting. It celebrates learning as a joyful journey without ever feeling noisy or childishly condescending.

### Audience
- **Primary**: Learners aged 8–14 in the Kids journey, plus adult learners seeking an inviting, intuitive entrance into AI fundamentals.
- **Tone**: Warm, encouraging, curious, clear, and reassuring.

---

## 2. Color Palette (The Clay System)

All assets must harmonize with the app's established design tokens:

| Token Name | Hex Code | Role in Imagery |
|---|---|---|
| **Clay Blue** | `#0284C7` / `#38BDF8` | Chip's primary body chassis, sky and digital currents |
| **Sunny Amber** | `#F59E0B` / `#FCD34D` | Chip's glowing antenna orb, badges, eureka lightbulbs |
| **Playful Pink** | `#EC4899` / `#F472B6` | Accents, cheerful energy, celebration ribbons |
| **Growth Emerald** | `#10B981` / `#34D399` | Success markers, tree foliage, neural activation |
| **Curious Indigo** | `#6366F1` / `#818CF8` | Deep backdrop wash, night sky, wisdom elements |
| **Warm Paper / Clay Base** | `#F8FAFC` / `#E2E8F0` | Studio backdrop, pedestals, soft ground |
| **Night Slate** | `#0F172A` / `#1E293B` | High contrast text, dark mode backdrops, outlines |

---

## 3. Character Reference: "Chip the Robot"

Chip is the learner's companion throughout the course.
- **Chassis**: Rounded square head (`rx=16`) in sky-blue gradient (`#38BDF8` to `#0284C7`), silver side bolts / ears (`#94A3B8`).
- **Antenna**: Single central post (`#64748B`) topped with a warm amber glowing orb (`#F59E0B` / `#FDE68A`).
- **Face Screen**: Deep charcoal curved screen (`#0F172A` to `#1E293B`) with expressive cyan glowing dot eyes (`#22D3EE`).
- **Expression**: Expressive, kind, never robotic or intimidating.

### Poses Required:
1. `chip-wave`: Welcoming learner at the trail entrance.
2. `chip-think`: Scratching chin with a lightbulb glow above head.
3. `chip-cheer`: Hands raised with confetti and celebration stars.

---

## 4. Illustration Set Specifications

### 4.1 App Mark (`app-mark`)
- **Dimensions**: Square $100 \times 100$, scalable SVG.
- **Composition**: An iconic silhouette combining Chip's head with a gentle spark/growth node.

### 4.2 Lesson Trail Stop Illustrations (6 Lessons)
1. **Stop 1 (`stop-1-intro`)**: "The Spark of Thought" — Chip holding a glowing magnifying glass over everyday puzzle blocks.
2. **Stop 2 (`stop-2-symbolic`)**: "The Rule Maze" — A gentle labyrinth puzzle with clear decision branches and stepping stones.
3. **Stop 3 (`stop-3-neuralnetworks`)**: "Connecting the Dots" — Interconnected glowing nodes forming a constellation in the shape of a friendly smiling face.
4. **Stop 4 (`stop-4-computervision`)**: "The Magic Lens" — Chip looking through a camera viewfinder that identifies apples and stars with soft bounding outlines.
5. **Stop 5 (`stop-5-nlp`)**: "Words that Flow" — Paper airplanes folded from illustrated letters flying gracefully into an organized speech bubble.
6. **Stop 6 (`stop-7-ethics`)**: "The Fair Balance" — A friendly balance scale weighing hearts, question marks, and magnifying glasses fairly in equilibrium.

### 4.3 Concept Visuals (Small Metaphor Cards)
- `concept-martian-puppy`: A cute robotic puppy learning new tricks with treats.
- `concept-symbolic-maze`: Stepping stones navigating an "If-Then" road fork.
- `concept-neuron-switch`: An intuitive dial lighting up when threshold is met.
- `concept-pixel-grid`: A grid of friendly shaded tiles forming a number 7.
- `concept-word-vectors`: Words placed close together like neighboring fruit in a basket.
- `concept-fairness-scale`: Evenly balanced weights with diverse happy stickers.

---

## 5. Mandatory Content & Integrity Rules (FR-010)

- **NO embedded text**: All labels, captions, and text alternatives are handled via the web app's i18n system.
- **NO third-party trademarks or copyrighted characters**: No logos, no Apple/Google/Microsoft/Disney lookalikes.
- **NO named living artist or brand prompts**: All prompts must describe physical textures (clay, smooth matte vector, studio lighting) rather than referencing individual creators.
- **Trademark Clearance Gate (FR-011)**: Every shipped graphic must pass reverse image search and trademark screening before status is set to `approved`.
