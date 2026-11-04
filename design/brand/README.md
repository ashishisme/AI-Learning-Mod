# Brand assets (SPEC-011)

Original visual assets for AI Foundations Coach: the app mark, Chip's poses, lesson illustrations and concept visuals.

## Folders

- `source/` holds editable sources that are small enough for git (hand-authored SVG).
- `masters/` holds large generated originals. It is git-ignored, and the register records each master's SHA-256.
- `../../web/public/brand/` holds the shipped derivatives. Only files with an `approved` register entry may be there, and `go run ./cmd/assetcheck` enforces it in CI.

## Rules (SPEC-011 FR-009 to FR-012, research R5)

1. Every asset has an entry in `asset-register.json` before it ships: purpose, files and checksums, creator, rights basis and evidence, trademark screen, alt text key (or `decorative`), motion, status and reviewers.
2. AI-generated art records the model and version, the exact prompt, any reference images, and the date. Reference images may only be our own assets.
3. "AI generated" is not rights proof on its own. The owner's approval and a clear trademark screen are what let an asset ship.
4. Never use third-party logos or lookalike marks, copied characters, unverified web images, or prompts that name a living artist's or a brand's style.
5. Upstream course images stay under the existing brand blocklist in `internal/ingest/ingest.go`. This folder is for product-owned art only.
