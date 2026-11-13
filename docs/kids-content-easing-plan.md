# Making the Kids lessons easier to understand — plan

**Status:** Proposal, planning only. Nothing is built yet.
**Date:** 2026-11-12
**Next step:** turn the agreed parts into a spec amendment and a numbered feature (SPEC-012) with `/speckit-specify`.

## Why

Learner feedback says the Kids (8–14) lessons are too complicated. Measuring the six English Kids lessons (`public-content/lessons/*.junior.json`) shows where the weight comes from:

| Lesson | Words | Words per sentence | Reading grade* | Bold terms with no Jargon Buster entry |
|---|---|---|---|---|
| 1 Intro | 500 | 10.4 | 5.3 | Narrow AI (Weak AI), General AI (AGI / Strong AI), top-down, bottom-up, the Turing Test |
| 2 Symbolic AI | 348 | 10.9 | 5.1 | expert system, symbols, IF / THEN |
| 3 Neural networks | 348 | 11.6 | 5.9 | dendrites, axon (plus nucleus, Perceptron, Frank Rosenblatt, 1957, "synaptic weights", "weighted sum") |
| 4 Computer vision | 532 | 9.5 | 4.7 | first / middle / deep layer, red-green-blue, pixel values 0, 128, 255 |
| 5 Language (NLP) | 527 | 11.7 | 5.8 | (all explained) |
| 7 Ethics | 505 | 10.5 | 5.1 | fairness, inclusion, privacy, safety, "tune the dials", "balance the data" |

\*Flesch-Kincaid grade, a standard formula based on sentence length and syllables. It undercounts difficulty for this content, because the main problem is not long words.

What the numbers mean:

- A grade of about 5 suits a 12-year-old. The Kids journey is for ages 8 to 14, and grade 5 is hard for an 8- or 9-year-old reading alone.
- **Too many new ideas, mostly unexplained.** About 31 of 58 bold terms have no Jargon Buster entry. Lesson 1 brings in five big ideas in one go. Lesson 3 teaches brain anatomy and history that the lesson does not need.
- **Adult wording slips in.** For example "the neuron's stubbornness threshold" and "watch the total weighted sum change in real time".
- **The Jargon Buster is a plain list.** It sits at the end of a section, so a child meets a hard word long before its explanation.

## Goals

1. **Easier to read.** Reading grade 3 for ages 8–11 and grade 5–6 for ages 12–14 (Workstream F), with short sentences and everyday words.
2. **Lighter language.** One idea per paragraph, at most two new words per section, and no names, dates or side facts unless the story needs them.
3. **Jargon Buster you can tap, with animation.** A hard word is explained where the child meets it, with a picture or a short animation and a listen button.
4. **More ways to understand than reading.** Pictures first, step-by-step animations, small "try it" moments, and quick check-ins.
5. **Proof it worked.** Fewer "too hard" reports, the reading checks passing, and a real child able to explain the big idea back.

## Not in this plan

- Changing Standard or Plain English lessons. Plain English (grades 6.4–8.9) may need the same treatment later, as a separate decision.
- Changing what each lesson teaches, its order, or the six-stop Chip's Trail.
- New tracking of children. Measurement uses feedback the app already collects, plus tests with a parent watching. No new data about learners is stored (DC-09).
- New npm packages. Animations use CSS and SVG only.

## Workstream A: A writing guide for Kids lessons

Write `content/kids-writing-guide.md` and use it for every rewrite:

- **Sentences:** about 12 words on average, never more than 18.
- **New words:** at most two per section. Each one is in bold and has a Jargon Buster entry.
- **Big idea first:** every section opens with a one-line "Big idea" in Chip's voice.
- **Talk to the reader:** use "you", everyday examples (pets, games, snacks, school), and one analogy per section.
- **Cut what the story does not need:** names, years, anatomy and alternate names (for example "AGI or Strong AI").
- **Optional depth:** extra facts go in a closed "Want to know more?" box, so curious 13–14-year-olds still get them.
- **Banned phrases:** a short list of adult phrases to avoid, such as "threshold", "in real time" and "weighted sum".

**Automatic check.** Add a content check to the existing Go release check (`cmd/ingest -verify`) for Kids lessons. It reports reading grade, longest sentence, new-words-per-section, and bold terms with no Jargon Buster entry. Start it as a warning, and make it fail the build once all six lessons pass. No Python in the build (DC-10).

## Workstream B: Lighter lesson structure

- **Smaller bites.** Split long sections into cards of about 60–80 words, each with one picture or animation. The current lessons have 3–4 sections of up to about 150 words each.
- **Same order every time.** Each card follows: big idea, then a picture or animation, then two or three short sentences, then a check-in.
- **"3 things you learned" recap** at the end of each lesson, before the quiz.
- **Per-lesson cuts**, for example:
  - Lesson 1: keep "AI learns from examples" and one idea of the Turing Test. Move Narrow and General AI and top-down and bottom-up into "Want to know more?".
  - Lesson 3: drop dendrites, nucleus, axon and the 1957 history. Teach "a neuron is a tiny yes/no switch that listens to clues".
  - Lesson 4: drop pixel numbers (0, 128, 255). Show the layers as an animation instead of listing them.

## Workstream C: Tappable Jargon Buster with animation

Today each section ends with a static list of terms, each with a pronounce button.

**Proposed: word cards in the text.**

- A bold word in the lesson is tappable. Tapping it opens a small card next to the word with:
  - the simple explanation;
  - a small picture or a 2–3 second looping animation;
  - a "listen" button.
- The end-of-section list stays as a "Words you learned" review.
- **Animations:** SVG art with CSS movement only (moving and fading, no flashing).
  - Under "reduce motion", every animation shows as a still picture (the existing `prefers-reduced-motion` handling in `web/src/index.css`).
  - Nothing autoplays with sound.
- **Art:** made the same way as the current Kids art, either hand-drawn SVG or Gemini on Vertex (`gemini-2.5-flash-image`, us-central1). Every asset is registered in `design/brand/asset-register.json` and checked by `cmd/assetcheck` (NFR-LIC-05).
- **Size:** about 25 word animations at 2–6 KB each, roughly 100 KB in total, inside the 350 KB budget (NFR-OPS-05). Load each one only when its card opens.
- **Access (DC-11):**
  - word buttons are at least 44×44 px to tap;
  - text contrast is at least 4.5:1 in light and dark;
  - cards open and close with the keyboard, including Escape;
  - screen readers announce each word as a button that opens an explanation.
- **Hindi:** cards read from `content/glossary/hi.json`, so Hindi learners get the same cards.

## Workstream D: Other ways to help kids understand

These are ranked by expected help for the effort:

1. **Picture first.** Six concept pictures already exist (`web/public/brand/concept-*.svg`). Give each card a picture and put it above the text.
2. **Animated steppers.** Twelve sections already use the `stepper` diagram. Add a "Play" button that steps through it with Chip, one step every few seconds. The learner can pause, and it stays still under reduce motion.
3. **Check-ins after each card.** One tap-to-answer question, such as "Which one is a cat?" with two pictures, with Chip's reaction. It builds on the existing quiz component and does not count toward the lesson score.
4. **Read-along highlighting.** While narration plays, highlight the sentence being read. Sentence highlighting already works for device voices but not for recordings.
5. **Simpler "try it" widgets.** The six existing widgets (perceptron, convolution, vector math and others) keep their logic, but get kid wording, fewer sliders and a "Chip's hint" button.
6. **Teach-back with Chip.** The existing `teachBack` becomes a tap-to-pick "Tell Chip the big idea" choice at the end, instead of an open text box.

## Workstream F: Complexity changes with the child's age

Owner direction, 2026-11-12: the Kids journey asks for the child's age band and adjusts how complex the lesson is. There are **two bands**:

| Band | Reading target | What changes |
|---|---|---|
| **8–11** | grade 3 | Short text, picture and animation first, at most 2 new words per card, everyday words in place of technical terms, "Want to know more?" closed. |
| **12–14** | grade 5–6 | Fuller explanations, the real terms (for example "weights", "layers"), "Want to know more?" open, harder "try it" settings, one extra quiz question. |

Why two bands, not three: half the writing, translation and recording, and the clear gap is between younger and older children. An earlier idea split the range into three bands at 8, 10, 12 and 14.

**Risk to watch: 8–11 is a wide band.** An 11-year-old may find grade-3 text babyish. To reduce that risk:

- the 8–11 band keeps "Want to know more?" one tap away;
- its tone avoids baby talk (no "itty-bitty");
- the lesson 3 pilot includes at least one 10–11-year-old in the kid tests.

### How to build the two bands: two options

**Option A: One lesson with an age layer**
- *How it works:* each card has one core text written for 8–11. Additions marked "12+" add the real term, a deeper explanation, or a harder example, and "Want to know more?" opens by default for 12+. The app shows the 12+ additions only when that band is chosen.
- *Good:*
  - one source of truth for each fact;
  - the core text is translated and recorded once;
  - only the 12+ additions are extra Hindi work;
  - a child switching bands sees the same lesson, with more or less detail.
- *Cost:* the lesson data format gains a "12+" marker. Writers must make sure the core text reads well on its own.
- *Fails when:* the 12–14 explanation needs to be *different*, not just longer. In that case the additions read like patches.

**Option B: Two separately written versions** (`*.junior.json` for 8–11 and `*.junior-teen.json` for 12–14)
- *How it works:* each band gets its own fully written lesson.
- *Good:*
  - each version reads naturally for its age;
  - the current data format is kept as it is;
  - writers have the most freedom.
- *Cost:* twice the writing, Hindi translation, Hindi review and Hindi recordings, for every lesson and every later edit. That is about 12 more lesson files and roughly 85 more recordings.
- *Fails when:* a fact is corrected in one version and not the other, or a quiz question fits only one of them.

**Decision (owner, 2026-11-12): Option A,** with Option B as a per-section fallback. The ongoing Hindi lockstep (Workstream E) is the costliest part of this project, and Option A keeps the extra Hindi work to the 12+ additions. The lesson 3 pilot shows whether a 12+ layer reads naturally. Any card where it does not can get a separately written 12+ text.

### Where the age is kept (privacy)

- The child picks the age band on the Kids journey chooser, and can change it later in Settings or the Voice Studio.
- The band is stored **only in the browser**, next to the saved audience mode. It is never sent to the server, never added to feedback records, and never added to logs. An age band from an under-13 audience is information we choose not to hold (see `research_notes/User chosen sign in design/childrens_privacy_law.md`, COPPA "actual knowledge").
- If no band is chosen, the default is 8–11, the simpler band.
- Quizzes: core questions are the same for both bands. The 12–14 band gets one extra question taken from its 12+ additions.

## Workstream E: Hindi has to change at the same time

This is the most expensive part.

- Every change to an English Kids lesson makes its Hindi translation out of date in the review ledger (`content/review/hi.json`). Hindi is an approved language, so the release check fails until the Hindi is updated and re-approved. This happened on 2026-11-09 for a single string.
- The Hindi Kids narration recordings (about half of the 171 files) must be re-recorded for every changed section with `cmd/narrate`. Only changed tracks are re-recorded.
- **Plan:** release one lesson at a time, with English, Hindi, glossary and recordings changed together in one release.

## How we will measure it

- **Reading check:** all six Kids lessons pass Workstream A's check.
- **Feedback:** compare Kids "too hard" or "confusing" reports in the 4 weeks before and after each lesson ships. These come from the existing feedback records; nothing new is collected.
- **Kid tests:** for each rewritten lesson, 3–5 children in each band (8–11, including at least one aged 10–11; and 12–14), with a parent present, read or listen. Each child then says the big idea back in their own words. Passing means at least 4 of 5 children can say it. Record the results in a checklist under the feature's `specs/` folder, with no names.
- **Quiz:** the lesson's mini-quiz still makes sense after the rewrite. Fix any question whose answer was cut.

## Proposed phases

| Phase | What | Why this order |
|---|---|---|
| 0 | Read the actual feedback records. Write the writing guide. Agree on the targets. | Fix the cause the kids actually reported. |
| 1 | **Pilot lesson 3** (neural networks, the hardest at grade 5.9): rewrite, cards, two word animations, kid test. | Proves the approach on one lesson before paying for six. |
| 2 | Build tappable word cards, the animated stepper "Play", and check-ins as reusable parts. | Every later lesson reuses them. |
| 3 | Rewrite lessons 1, 4, 7, 2, 5, one per release, each with its Hindi and recordings. | Keeps the Hindi release check green and the work reviewable. |
| 4 | Turn the reading check into a build failure. Decide whether Plain English gets the same treatment. | Stops the lessons drifting back. |

## Spec impact (for SPEC-012)

- New content requirement: Kids-lesson reading rules, and a check in `cmd/ingest -verify` (new `FR-CNT-*` or `NFR-*` ID).
- New UI requirements: tappable word cards, the animated stepper, check-ins and recap (new `FR-UI-*` IDs). Each one needs reduce-motion, keyboard and 44 px rules.
- Age band: a new choice in the Kids chooser and in Settings, stored only in the browser (amends FR-UI-16; the store's saved format version goes up). A "12+" marker in the lesson data (Option A).
- Lesson data shape: adding a "big idea", "want to know more", check-ins and per-word animations to `*.junior.json` changes the adaptive lesson format (§6 data contracts) and the Hindi translation files.
- NFR-OPS-05 (size budget), NFR-LIC-05 (asset register) and DC-11 (accessibility) apply unchanged.

## Decisions needed from the owner

1. **Age bands: decided 2026-11-12.** Two bands, 8–11 and 12–14. They are built with **Option A**: one lesson with a "12+" layer, and a separately written 12+ text only for a card where the layer reads like a patch (Workstream F).
2. **Pilot first, or all six lessons in one feature?** The plan assumes a pilot first.
3. **Hindi pace.** Can a reviewer re-translate and re-approve Hindi lesson by lesson, in step with English? The ledger records the English source of each approval, so leaving Hindi on the old text while English changes fails the release check. The only way around that is a spec change to how the check treats approved languages.
4. **Who does the kid tests,** and is a parent-present test without recording acceptable?
5. **Art source** for the word animations: hand-drawn SVG, Gemini on Vertex, or both.
