# Feature Specification: Pilot Lesson 1 - Adaptive Audience Modes ("Junior Explorer" & "Plain English")

**Feature ID**: `SPEC-002-PILOT-L01`  
**Target Lesson**: `1-intro.json` ("Introduction to AI")  
**Status**: Proposal / Draft for Review  
**Author**: SDD Pair Team  

---

## 1. Executive Summary & Objective

Transform **Lesson 1 ("Introduction to AI")** from its collegiate, research-heavy baseline into an engaging, multi-modal learning experience tailored for two underserved audiences:
1. **Junior Explorers (Kids aged 8–14)**: Narrative-driven, gamified physical metaphors, vibrant SVG diagrams, and playful micro-interactions.
2. **Plain English Learners (Non-Tech Adults)**: Jargon-free, relatable real-world analogies (cooking, driving, smartphone apps), focusing on everyday utility without patronizing tone.

### The Spec-First Invariant
> **Normative Invariant**: Canonical content in `public-content/lessons/1-intro.json` MUST remain immutable. The adaptive layer serves as a decoupled projection over the canonical source, ensuring zero data loss or drift.

---

## 2. User Scenarios & Prioritized User Stories

### User Story 1 (P1 - MVP Core): Kid-Friendly Reading & Visual Metaphors with "Chip the Robot"
**As a** 10-year-old student exploring AI for the first time,  
**I want** to read Lesson 1 guided by "Chip the Robot" with fun pictures and diagrams,  
**So that** I understand what AI is without getting overwhelmed by dense academic paragraphs.

- **Mascot Guide ("Chip the Robot") Profile**:
  - **Persona**: Curious, cheerful, speaks directly to the reader ("Hey explorer!").
  - **Visual Cue**: Cute cartoon retro-modern robot with expressive digital eyes.
  - **Catchphrase**: *"Let's crack the code together!"*
  - **Educational Function**: Appears at the beginning of each major concept to frame the physical metaphor.
- **Independent Test**: Selecting "Junior Explorer" mode renders Lesson 1 with Grade 5 vocabulary, Chip's narrative framing, and an animated SVG diagram.
- **Acceptance Scenarios**:
  1. **Given** Lesson 1 is open in Standard mode, **When** the user clicks "Kids (8-14)", **Then** the content immediately updates to the Junior Explorer version featuring Chip the Robot in `< 100ms`.
  2. **Given** Junior Explorer mode is active, **When** the user reads "The Top-Down vs Bottom-Up Approach", **Then** Chip explains the concept using the "Giant Rulebook vs Looking at 1,000 Photos" analogy.

---

### User Story 2 (P2): Plain English Mode for Non-Tech Adults
**As a** non-technical professional or curious adult,  
**I want** to learn AI foundations through everyday workplace and home examples,  
**So that** I understand the difference between Narrow AI and General AI without confusing mathematical jargon.

- **Independent Test**: Selecting "Plain English" presents the same technical concepts using everyday analogies (e.g., GPS navigation, spam filters) accompanied by "Jargon Buster" tooltips.
- **Acceptance Scenarios**:
  1. **Given** Plain English mode is active, **When** reading about "Weak AI vs Strong AI", **Then** the text uses the terms "Single-Job AI vs Sci-Fi Super-Brains" with clear examples like Siri and chess computers.
  2. **Given** a technical term (e.g. *Algorithm*), **When** viewed in Plain English mode, **Then** an inline tooltip explains it as *"A step-by-step recipe a computer follows"*.

---

### User Story 3 (P1 - MVP Core): Interactive "Human or Bot?" Turing Test Widget
**As an** interactive learner in Junior or Plain English mode,  
**I want** to play a short "Human or Bot?" mini-game directly inside the lesson,  
**So that** I can experience how Alan Turing's Imitation Game works through actual observation.

- **Widget Behavioral Specification**:
  - **Initial State**: Presents two chat windows labeled `Terminal A` and `Terminal B`.
  - **Interaction**: The user clicks a prompt button (e.g., *"Ask both terminals: 'What did you eat for breakfast today?'"* or *"Ask: 'Can you write a poem about homework?'"*).
  - **Responses**:
    - One terminal gives a human response with quirky personality/hesitation.
    - The other gives an AI response that is either overly precise or cleverly synthetic.
  - **Guessing Mechanism**: User clicks `[ Terminal A is AI ]` or `[ Terminal B is AI ]`.
  - **Resolution**: Reveals the truth with an educational breakdown of *why* it's hard to tell, grounding Turing's 1950 thesis.

---

### User Story 4 (P2): AI Content Review, Audit & Refinement Loop
**As a** content curator or educator,  
**I want** an automated AI reviewer that audits any adapted lesson payload and suggests targeted refinements,  
**So that** I can iteratively improve readability, factual fidelity, and age appropriateness before publishing.

- **Review Dimensions Evaluated by AI**:
  1. **Fidelity & Precision**: Ensures simplified metaphors do not teach scientifically incorrect concepts.
  2. **Cognitive Appropriateness**: Audits sentence length, tone, vocabulary, and Flesch-Kincaid grade level.
  3. **Engagement & Fun**: Checks if the mascot (Chip) voice is energetic and kid-friendly without sounding condescending.
  4. **Safety & Ethics**: Confirms child-safety standards and bias-free examples.
- **Workflow / Command**:
  - `python3 scripts/audit_lesson.py --file <path> --mode <junior|plain-english>`
  - Generates a **Structured Audit Report** (Scores 1–10 across dimensions, identified weak spots, and suggested JSON diffs).
  - Enables one-click or prompt-guided update of the JSON payload.

---

## 3. Lesson 1 Pilot Content Mapping Specification

Every section in canonical Lesson 1 maps to explicit storytelling and visual anchors:

| Canonical Section | Junior Explorer (Kids 8–14) | Plain English (Non-Tech Adults) | Visual / Diagram Spec |
| :--- | :--- | :--- | :--- |
| **What is AI?** | *"Teaching Robots How to Think"*<br>Hook: A friendly robot named Chip arrives from space and needs to learn what a dog is. | *"Making Computers Helpful, Not Just Calculators"*<br>Hook: Traditional software is a strict calculator; AI is a pattern-detecting helper. | **Illustration Card**: Chip the Robot observing pets with a magnifying glass. |
| **Weak AI vs Strong AI** | *"Single-Trick Ponies vs Movie Super-Robots"*<br>Clarifies that all real AI today is 'Narrow AI' (like a chess wizard that can't tie its shoes). | *"Specialized Tools vs Theoretical Super-Intelligence"*<br>Contrasts today's practical tools (spam filters, speech-to-text) with science-fiction tropes. | **Comparison Matrix**: Side-by-side cartoon comparing a chess-playing toaster with humanoid sci-fi robots. |
| **The Turing Test** | *"The Curtain Guessing Game"*<br>Imagine texting two pen pals behind a curtain: one is your best friend, one is a computer. Can you tell who is who? | *"The Imitation Game in Plain English"*<br>Explaining Alan Turing's 1950 thought experiment in terms of modern customer service chatbots. | **Mermaid Sequence Diagram**: User sending chat messages to Terminal A (Human) and Terminal B (Bot). |
| **Top-Down vs Bottom-Up** | *"The 10,000-Page Rulebook vs Learning from Looking"*<br>Explaining that writing rules for every dog ear shape is impossible, so we show 1,000 photos instead. | *"Explicit Rules vs Learning from Historical Data"*<br>Compares traditional programming (Excel macros) with machine learning (Spotify recommendations). | **Interactive SVG Flowchart**: Visualizing the two pathways (Handwritten Rules vs Data Pattern Hunting). |

---

## 4. Requirements Specification

### Functional Requirements
- **`FR-ADAPT-01`**: The system MUST store adapted lesson payloads separately from the canonical lesson, using the naming convention `public-content/lessons/{id}.{mode}.json`.
- **`FR-ADAPT-02`**: The mode selector MUST offer three selectable states: `standard` (default), `junior` (kids 8–14), and `plain-english`.
- **`FR-ADAPT-03`**: In `junior` mode, Flesch-Kincaid reading grade level MUST NOT exceed Grade 6.
- **`FR-ADAPT-04`**: Every technical section in `junior` and `plain-english` modes MUST include at least one concrete analogy and one visual diagram.
- **`FR-ADAPT-05`**: The lesson payload schema for adapted modes MUST conform to the `AdaptiveLessonPayload` contract.
- **`FR-ADAPT-06`**: The active audience mode MUST persist in browser storage across sessions.

### Non-Functional Requirements
- **`NFR-PERF-01`**: Switching between modes for a loaded lesson MUST execute within `< 50ms` (zero network roundtrip when preloaded).
- **`NFR-SAFE-01`**: All content and analogies in `junior` mode MUST pass child-friendly safety standards (no violence, fear triggers, or dark patterns).
- **`NFR-ACC-01`**: All diagrams and visual cards MUST provide descriptive `alt` text for screen readers.

---

## 5. Data Contract (`AdaptiveLessonPayload`)

```typescript
interface AdaptiveLessonPayload {
  lessonId: string;           // e.g. "1-intro"
  mode: "junior" | "plain-english";
  title: string;              // e.g. "Teaching Robots How to Think 🤖"
  readingTimeMinutes: number; // e.g. 6
  narrativeHook: string;
  sections: Array<{
    id: string;
    heading: string;
    analogy: {
      metaphorName: string;
      description: string;
    };
    bodyMarkdown: string;
    diagram?: {
      type: "mermaid" | "svg" | "interactive-card";
      content: string;
      caption: string;
    };
    jargonBuster?: Array<{
      term: string;
      simpleExplanation: string;
    }>;
  }>;
  quickCheckQuiz: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
}
```

---

## 6. Verification & Acceptance Gate (Definition of Done)

Before declaring Pilot Lesson 1 complete:
1. **Flesch-Kincaid Reading Score Audit**: Automated test asserts reading score `<= 6.0` for Junior mode.
2. **Concept Parity Check**: 100% of the 4 core concepts in canonical Lesson 1 are represented in the adapted schema.
3. **Interactive Visual Test**: The Mermaid diagram and Turing Test card render correctly without visual clipping on mobile and desktop.
4. **Instant Switch Verification**: Automated Cypress / Playwright test verifies mode toggle occurs in `< 50ms`.
