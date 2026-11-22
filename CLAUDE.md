# CLAUDE.md

Project instructions for Claude Code in this repository. The constitution (`.specify/memory/constitution.md`) and `spec/SPEC.md` still take precedence over anything below.

## Skills to use for all coding

- **All code changes**: apply `ponytail` (smallest complete change). It never overrides the spec: finish every file and test a requirement or task needs.
- **Any UI or frontend work** (pages, components, forms, the admin console, copy, motion): use `impeccable` for design direction and craft, and `ui-ux-pro-max` for style, palette, typography, chart and accessibility lookups. Where they disagree with the project, the project wins: DC-01 stack (React, TypeScript, Vite, Tailwind, Zustand), DC-11 floor (contrast at least 4.5:1 in light and dark, targets at least 44x44px), no new npm packages without a plan decision.
- **Diagrams** (architecture, flow, sequence, ER, state, timeline) in specs, plans and docs: use `diagram-design`, and run its `scripts/self_check.py` on each generated file.
- `ui-ux-pro-max` is queried with `python3 "$(git rev-parse --show-toplevel)/.claude/skills/ui-ux-pro-max/scripts/search.py" "<query>" --domain <domain>`. These skill scripts are development tooling only; DC-10 (no Python in the build, backend or runtime) still applies to the app.

## impeccable engine: ask first

`impeccable` normally runs `.claude/skills/impeccable/scripts/impeccable context` each session. That launcher downloads a native engine binary (version in `scripts/VERSION`) from the project's GitHub releases into `~/.impeccable` the first time it runs. Do not run it, and do not enable `/impeccable hooks`, without the owner's approval. Until then use the skill's own fallback: read `PRODUCT.md` and `DESIGN.md` directly if they exist.
