# Kids lesson writing guide

This is how to write and rewrite the Kids lessons (`public-content/lessons/*.junior.json` and their translations). It covers SPEC FR-CNT-08 and FR-CNT-09, and SPEC-012 FR-001 to FR-004.

`go run ./cmd/ingest -verify -audio=false` checks the numbers below. A lesson marked `"bands": true` fails the release check if it breaks one. An unmarked lesson only warns.

## Who you are writing for

There are two age bands, and both read the same lesson:

| Band | Reads | Reading grade | What they see |
|---|---|---|---|
| **8–11** | the core text | at most **3.5** | core only, with "Want to know more?" closed |
| **12–14** | core plus the 12+ parts | at most **6.0** | core, then `teen` text, with "Want to know more?" open |

Write the core for a confident 8-year-old who is reading alone. The core must make complete sense on its own. The 12+ parts add to it, and nothing in the core should need them.

## The numbers (core text)

- Keep sentences to about **12 words on average**, and **never more than 18**.
- Bold at most **2 new words per section**. Every bold word needs a `jargonBuster` entry in the same section.
- Each section has about **60–80 words** of core body. If it is longer, split it into two sections.

"Core text" is `bigIdea`, `chipQuote`, `analogy.description` and `bodyMarkdown`.

## Every section (a card) has the same shape

1. **`bigIdea`**: one line in Chip's voice that says the point. For example: "A neuron is a tiny switch that says yes or no."
2. **A picture**: a `diagram`, a scene card, or a word picture (`visual` on a jargon entry). It is shown above the text.
3. **Two or three short sentences** in `bodyMarkdown`.
4. **Optionally, a `checkIn`**: one tap-to-answer question with 2 or 3 options. Pictures and emoji are fine. It is never scored.

The lesson ends with a **`recap`** of exactly three short lines ("3 things you learned"). Then come the mini-quiz and the teach-back. The teach-back is a tap-to-pick choice of 2–3 options.

## How to sound

- Talk to the reader: "you", "your", "let's".
- Use everyday things: pets, games, snacks, school, sport, phones.
- Give one analogy per section, and keep it through the section.
- Be warm, not babyish. No "itty-bitty", "teeny", "super-duper" or "little buddy". An 11-year-old should not feel talked down to.
- Prefer short, common words: "use" not "utilise", "find" not "determine", "check" not "verify", "a lot" not "numerous".

## What to leave out of the core

These go in **`more`** ("Want to know more?") or are cut:

- people's names and years ("Frank Rosenblatt, 1957");
- body parts and anatomy (dendrites, axon, nucleus);
- alternate names ("General AI, also called AGI or Strong AI");
- exact numbers that the idea does not need (pixel values 0, 128, 255);
- a second idea that the section's big idea does not need.

## Banned phrases (adult wording)

Do not use these in core text. Say the plain thing instead.

| Avoid | Say |
|---|---|
| threshold | "how many yeses it needs" |
| in real time | "right away" / "as you watch" |
| weighted sum | "add up the clues" (12+ may say "weights") |
| stubbornness threshold | "how hard it is to switch on" |
| tune the dials | "change the settings" |
| balance the data | "use examples from everyone" |
| leverage, utilise, facilitate | use, help |
| paradigm, methodology | way |

## Writing the 12+ layer (`teen`)

- **`teen.add`** is the usual choice. It is a sentence or two added after the core: the real term ("weights", "layers"), one step deeper, or a harder example. It can bold up to one more word. That word needs an entry in `jargonBuster` or `teen.jargonBuster`.
- **`teen.body`** replaces the core body for 12–14. Use it only when an addition would read like a patch, because the older explanation has to be *different* and not just longer. Never set both `add` and `body`.
- **The extra quiz question** has `"band": "12-14"` and is the *last* item in `miniQuiz`. There is at most one per lesson.

## Hindi and other approved languages

Every change ships with its translation in the same release, using the same sections, the same `teen` parts and the same quiz items. The `visual` keys are the same as in English. Show the Hindi term first, with the English in brackets at first use (SPEC-009 FR-008), following `content/glossary/hi.json`. The Hindi reviewer re-approves the lesson, and changed narration is re-recorded with `cmd/narrate`.

## Before you hand it in

1. `go run ./cmd/ingest -verify -audio=false` shows your lesson's `8-11` and `12-14` summary lines within the limits, with no FAIL.
2. Read the core out loud. If you run out of breath, the sentence is too long.
3. Every quiz question can still be answered from the text the band sees.
