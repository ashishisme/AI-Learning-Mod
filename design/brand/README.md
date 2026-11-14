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
5. This folder is for product-owned art only. No outside image, font or sound is used (SPEC-013, SPEC-014).

## Clips (SPEC-014, SPEC FR-CNT-13)

A clip is a step-by-step animated picture for a Detailed lesson section.

- Files: the master is `source/clips/<name>.svg`; the release copy is `web/public/brand/clips/<name>.svg`, with the same bytes.
- Steps: `viewBox="0 0 320 180"`, with one group `<g id="sK" class="s">` per step. Only the `:target` step shows (`.s { display: none } .s:target { display: inline }`). The page always loads a step, and the still picture is `#s1`.
- Motion: each step's entrance animation lasts 2 s or less, and `@media (prefers-reduced-motion: reduce)` turns all animation off. In the register, set `motion` to "tap-to-play steps, ≤ 2 s each, still under reduced motion".
- No words: shapes, icons, numbers and `+ − × = %` only. Every word is a caption in the lesson text, so it is translated and approved there.
- Colour: draw your own light panel (`#FFFFFF` or `#FFFBEB`), with content at 4.5:1 or better against it. The picture cannot see the app's dark theme.
- Safety: no `<script>`, no `on…=` attributes, and no `href` outside the file. Keep it at 100 KB or less.
- Alt: `decorative`. The description is the lesson's `diagram.alt`.
