# Contract: Kids lesson file, banded format (SPEC-012)

These files are `public-content/lessons/<id>.junior.json` and `public-content/lang/hi/lessons/<id>.junior.json`. Every field is optional and added to the current adaptive format, so old files stay valid (FR-023). Field meanings and rules are in [data-model.md §2](../data-model.md).

## Example (one card, abridged)

```json
{
  "lessonId": "3-neuralnetworks",
  "mode": "junior",
  "bands": true,
  "title": "Brain Switches",
  "recap": [
    "A neuron is a tiny yes/no switch.",
    "It listens to clues and adds them up.",
    "Lots of switches together can spot a cat."
  ],
  "sections": [
    {
      "id": "switch",
      "heading": "A tiny yes/no switch",
      "bigIdea": "A neuron is a tiny switch that says yes or no.",
      "bodyMarkdown": "Think of a **neuron** as a light switch. It listens to clues. If enough clues say yes, it turns on.",
      "teen": {
        "add": "Each clue has a **weight**: how much the switch cares about it. Big weight, big say."
      },
      "jargonBuster": [
        { "term": "neuron", "simpleExplanation": "A tiny switch that says yes or no.", "visual": "neuron-switch" }
      ],
      "more": { "title": "Who thought of this?", "bodyMarkdown": "Scientists first built one in the 1950s." },
      "checkIn": {
        "question": "What does a neuron say?",
        "options": ["Yes or no", "A whole story"],
        "correctIndex": 0,
        "explanation": "Just yes or no!"
      }
    }
  ],
  "miniQuiz": [
    { "question": "A neuron is like a…", "options": ["switch", "sandwich"], "correctIndex": 0 },
    { "band": "12-14", "question": "What does a weight change?", "options": ["How much a clue counts", "The colour"], "correctIndex": 0 }
  ]
}
```

In this example `weight` is bold only in `teen.add`. It needs a `jargonBuster` entry, either in the core list or in `teen.jargonBuster`.

## Compatibility

- **Server:** no change. `GET /api/lessons/{id}?mode=junior` serves the file as it is. The band is **never** a parameter.
- **Tutor grounding (Principle II):** unchanged. The tutor keeps grounding on the lesson text it reads today, and section headings stay the citation targets.
- **Hindi:** a translation must have the same sections, the same `teen` presence per section, the same `checkIn` option count, and the same `band` items. The parity check enforces this.
