# Plan: moving from Microsoft's course to our own lessons

Draft, 2026-11-13. This is the plan for the SPEC-013 spec. Nothing changes in the app until SPEC-013 is approved.

## 1. What the owner asked for (2026-11-13)

1. **Detailed lessons** of our own, replacing the Standard track that is ingested from `microsoft/AI-For-Beginners`.
2. **Lessons by age**: recreate lessons for each age group, or add our own content to the existing ones.
3. **Reuse the animations and widgets** we already have wherever we can.
4. **Record both English and Hindi** narration for the new content.

## 2. What we have today

| Lesson | Standard (Microsoft, Markdown) | Kids (ours) | Plain English (ours) | Widget we own | Art we own |
|---|---|---|---|---|---|
| 1 Intro to AI | 16.5k chars | 4 sections | 4 sections | Turing guessing game | `concept-martian-puppy` |
| 2 Symbolic AI | 19.5k chars | 3 sections | 3 sections | Mars Rover expert system | `concept-symbolic-maze` |
| 3 Neural networks | 4.9k chars | 5 sections, rewritten for SPEC-012 | 3 sections | Perceptron fruit sorter | `concept-neuron-switch` |
| 4 Computer vision | 1.5k chars | 4 sections | 4 sections | Convolution filter lab | `concept-pixel-grid` |
| 5 NLP | 7.3k chars | 4 sections | 4 sections | Word vector maths | `concept-word-vectors` |
| 7 Ethics | 4.4k chars | 4 sections | 4 sections | Bias detective | `concept-fairness-scale` |

Also ours:
- Chip in three poses (`chip-wave`, `chip-think`, `chip-cheer`);
- the step-by-step diagram player (`StepperDiagram`, with Play and Pause);
- word cards;
- age bands with a 12+ layer;
- check-ins, recaps and read-along;
- the Hindi recording pipeline (`cmd/narrate`).

Microsoft's material is the Standard text, its 38 images, the lesson topics and numbering, the tutor's instruction to act as "a teaching assistant for Microsoft AI-For-Beginners", and the attribution.

Standard lessons 3 and 4 are short: 4.9k and 1.5k characters. Our "Detailed" lessons will be longer than the text they replace.

## 3. Proposal

### 3.1 Three tracks, all ours

| Track | Who | Replaces | Shape |
|---|---|---|---|
| **Kids**, one lesson with two bands | 8–11, plus a 12+ layer for 12–14 | today's Kids | SPEC-012 format: 5–6 short sections, big idea, pictures, check-ins, recap |
| **Plain English** | adult beginners | today's Plain English | the same sections format, with everyday examples and no maths |
| **Detailed** | learners who want depth (today's Standard) | the Microsoft Standard track | our own sections format, longer: maths where it helps, worked examples, a short "go further" list |

**Recommendation on "recreate or append":** recreate.

- **Kids:** already one lesson for both age bands, through the 12+ layer, so no new "teen" track is needed.
- **Plain English:** rewrite in place, reusing whatever is already ours.
- **Detailed:** write fresh. Do not append to the Microsoft text: anything built on it stays a derived work that needs the attribution.

Detailed uses the same sections format as Kids and Plain English, not Markdown. It then gets the following for free:
- Read section buttons and recordings;
- read-along highlighting;
- Hindi parity checks;
- the review ledger.

### 3.2 Reuse map

| Lesson | Kids | Plain English | Detailed |
|---|---|---|---|
| 1 | Turing game (guided), martian puppy | Turing game | Turing game + new stepper "how a test is judged" |
| 2 | Rover lab (guided) | Rover lab | Rover lab + a "write your own rule" panel (small addition) |
| 3 | Perceptron sorter (guided), neuron switch | Perceptron sorter | Perceptron sorter with weights shown + stepper on the learning rule |
| 4 | Convolution lab (guided), pixel grid | Convolution lab | Convolution lab with kernel values + stepper on pooling |
| 5 | Word vector maths (guided), word vectors | Word vector maths | Word vector maths with cosine similarity shown |
| 7 | Bias detective (guided), fairness scale | Bias detective | Bias detective + a short case study |

New art follows `docs/kids-visuals-and-own-content-plan.md`: hand-made SVGs that play a short animation when tapped and stay still under reduced motion. About 10 per Kids lesson and fewer for the other tracks. The 38 Microsoft images are replaced only in Detailed. The Kids and Plain English tracks never used them.

### 3.3 Recording English and Hindi

- **This reverses the 2026-11-09 decision** in `concepts_brief.md`, which kept English on the device voice.
- **Its reasons have mostly gone:**
  - Recorded playback no longer loses captions: read-along now highlights recordings (FR-UI-25).
  - The pipeline already exists for Hindi.
- **Its remaining costs:**
  - A spec amendment to FR-I18N-07/08, plus about 7 code places that skip English.
  - A listening test to pick one en-US voice per persona (`content/voices/en.json`).
  - Every English edit makes its recording stale. The recorder's `-check` already reports that.
- **Proposal:** record English only for our new lessons, as each one is approved. Lessons not yet rewritten keep the device voice.
- **Cost:** run `go run ./cmd/narrate -dry-run` per language for the character count, then price it before recording.

### 3.4 Order of work

| Phase | Work | Done when |
|---|---|---|
| 0 | SPEC-013: tracks, Detailed format, English recordings, retire ingest (amends SPEC §1, §6.1, §7.3.1, FR-I18N-07/08, NFR-LIC-01..03) | spec committed |
| 1 | Kids lessons 1, 2, 4, 5, 7 rewritten like lesson 3, with pictures; `bands: true` on each | reading check passes, owner approves, Hindi approved, EN+HI recorded |
| 2 | Plain English 1–7 rewritten | same |
| 3 | Detailed 1–7 written; widgets get their Detailed panels | same, plus a per-lesson tutor check |
| 4 | Switch Standard to Detailed; remove ingest, Microsoft images, pinned commit, brand blocklist; new tutor prompt; attribution updated; close SPEC-010 | no Microsoft-derived text or image ships |

Each lesson goes through the same steps:
1. Draft in English.
2. Reading check (Kids only).
3. Owner review.
4. Hindi translation.
5. Hindi approval in the review ledger.
6. Record English and Hindi.
7. Update the text baselines and tests.
8. Release.

Kids lesson 3 already went through steps 1–5 in SPEC-012.

## 4. Decisions still needed

1. **Topics and numbering.** Keep lessons 1–5 and 7, or add our own, such as "AI in daily life" or "generative AI"? Adding a topic is easiest after phase 1.
2. **Who writes Detailed:** Claude drafts and the owner reviews (assumed), or the owner writes?
3. **English recordings:** confirm reversing the 2026-11-09 decision, and how much to spend once the dry-run gives the character count.
4. **SPEC-010** (upstream translation sync) closes in phase 4. Close it now instead, so no effort goes into upstream text?
