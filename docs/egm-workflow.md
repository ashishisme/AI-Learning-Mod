# Elephant–Goldfish Model in this project

The [Elephant–Goldfish Model (EGM)](https://github.com/google/elephant-goldfish-model) is an optional design aid for features with meaningful product or architecture decisions. It complements the [Spec Kit workflow](../SPEC_DRIVEN_DEVELOPMENT.md). The project constitution, `spec/SPEC.md`, `spec/ACCEPTANCE.md`, and the active `specs/<feature>/` artifacts remain the sources of record.

## Setup

The EGM plugin is installed for Codex CLI from the `google/elephant-goldfish-model` marketplace. On another machine, run:

```sh
codex plugin marketplace add google/elephant-goldfish-model
codex plugin add egm@egm
```

Start a new Codex session after installation and select the EGM skill from the skill picker. Install the **whole plugin**: its skills read bundled reviewer personas and document standards. The [upstream setup guide](https://github.com/google/elephant-goldfish-model/blob/main/docs/codex.md) also describes the desktop plugin.

## Feature workflow

1. For a feature with unresolved trade-offs, use `egm-brainstorm` to explore the idea. Give it `spec/SPEC.md`, `spec/ACCEPTANCE.md`, `.specify/memory/constitution.md`, and relevant existing feature artifacts as project context. Save its concept brief under the new `specs/<feature>/` directory.
2. Run `speckit-specify` and `speckit-clarify` as needed. Use `egm-draft` when a detailed design document would help settle architecture or behavior. Save the draft with the feature artifacts.
3. Run `egm-review` on the draft before finalizing `speckit-plan`. Supply the draft and the specific source files the reviewers should read. Reviewers need fresh subagent contexts; if the current session cannot provide those, do not treat a same-context critique as an EGM Goldfish review.
4. Triage findings with `egm-resolve` or directly in the feature discussion. Record accepted decisions in `spec.md`, `plan.md`, contracts, and `research.md` as appropriate. Record rejected findings with a short reason in the review artifact. Spec Kit artifacts remain authoritative.
5. Continue with `speckit-tasks`, `speckit-analyze`, `speckit-implement`, and the normal tests and release gates. An EGM review is evidence for design quality, not a substitute for implementation tests or owner approval.

Use `egm-drift-report` when a design may have diverged from code, especially before revising a shipped feature. Reconcile each actionable difference by updating the code or the source-of-record specification. Do not add a mandatory weekly run until the pilot proves useful.

## Bugs and GitHub Issues

Document each bug in a [GitHub Issue](https://github.com/ashishisme/AI-Learning-Mod/issues) with reproduction steps, expected and actual behavior, cause when known, fix, and verification. Link the implementing commit and release, then close the issue after the fix is verified. A small bug fix does not need the full EGM design workflow. Use EGM review when a bug exposes a broader design decision.

## Pilot and limits

Pilot EGM on one upcoming feature that has genuine design choices. Compare its findings with `speckit-analyze`; keep only the steps that find useful issues. EGM's fresh reviewer context excludes earlier conversation turns, but [Codex host instruction files may still reach reviewers](https://github.com/google/elephant-goldfish-model/blob/main/docs/harnesses.md#delegation). Put assumptions to challenge in the review brief rather than relying on them being hidden. Do not put secrets or learner data in EGM artifacts or reviewer context.
