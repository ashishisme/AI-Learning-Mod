#!/usr/bin/env bash
# Development-only Vertex art helper. Masters stay out of the release bundle.
set -euo pipefail

asset_id=""
prompt=""
reference=""
alt_key=""
while [[ $# -gt 0 ]]; do
  [[ $# -ge 2 ]] || { echo "Missing argument value" >&2; exit 2; }
  case "$1" in
    --id) asset_id="$2" ;;
    --prompt) prompt="$2" ;;
    --ref) reference="$2" ;;
    --alt-key) alt_key="$2" ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
  shift 2
done

[[ "$asset_id" =~ ^[a-z0-9][a-z0-9-]*$ ]] || { echo "Use a lowercase hyphenated asset id" >&2; exit 2; }
[[ -n "$prompt" ]] || { echo "--prompt is required" >&2; exit 2; }
[[ -n "${GCP_PROJECT:-}" ]] || { echo "Set GCP_PROJECT" >&2; exit 2; }
command -v gcloud >/dev/null || { echo "gcloud is required" >&2; exit 2; }
command -v node >/dev/null || { echo "node is required" >&2; exit 2; }

register="${ASSET_REGISTER:-design/brand/asset-register.json}"
masters_dir="${ART_MASTERS_DIR:-design/brand/masters}"
model="gemini-2.5-flash-image"
endpoint="https://us-central1-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT}/locations/us-central1/publishers/google/models/${model}:generateContent"
if [[ -n "$reference" ]]; then
  [[ -f "$reference" ]] || { echo "Reference file not found" >&2; exit 2; }
  case "$(realpath "$reference")" in
    "$(realpath design/brand)"/*) ;;
    *) echo "Reference must be a product-owned file under design/brand" >&2; exit 2 ;;
  esac
fi

ASSET_ID="$asset_id" REGISTER="$register" node -e '
  const fs = require("fs");
  const d = JSON.parse(fs.readFileSync(process.env.REGISTER, "utf8"));
  if (d.assets.some(a => a.id === process.env.ASSET_ID)) {
    console.error("Asset id already exists in the register"); process.exit(2);
  }
'

token="$(gcloud auth print-access-token)"
[[ -n "$token" ]] || { echo "gcloud returned no access token" >&2; exit 1; }
mkdir -p "$masters_dir"
payload_file="$(mktemp)"
response_file="$(mktemp)"
trap 'rm -f "$payload_file" "$response_file"' EXIT

PROMPT="$prompt" REFERENCE="$reference" node -e '
  const fs = require("fs");
  const parts = [{ text: process.env.PROMPT }];
  if (process.env.REFERENCE) {
    const file = process.env.REFERENCE;
    const ext = file.toLowerCase().split(".").pop();
    const mimeType = {png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp"}[ext];
    if (!mimeType) { console.error("Reference must be PNG, JPEG or WebP"); process.exit(2); }
    parts.push({inlineData:{mimeType,data:fs.readFileSync(file).toString("base64")}});
  }
  process.stdout.write(JSON.stringify({
    contents:[{role:"user",parts}],
    generationConfig:{responseModalities:["IMAGE"]}
  }));
' > "$payload_file"

curl --fail --silent --show-error -X POST \
  -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  --data-binary "@$payload_file" "$endpoint" > "$response_file"
unset token

ASSET_ID="$asset_id" PROMPT="$prompt" REFERENCE="$reference" ALT_KEY="$alt_key" \
REGISTER="$register" MASTERS_DIR="$masters_dir" MODEL="$model" \
node - "$response_file" <<'NODE'
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const response = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const parts = response.candidates?.flatMap(c => c.content?.parts ?? []) ?? [];
const image = parts.find(p => p.inlineData?.data || p.inline_data?.data);
if (!image) { console.error('Vertex returned no image; register unchanged'); process.exit(1); }
const inline = image.inlineData ?? image.inline_data;
const mime = inline.mimeType ?? inline.mime_type;
const extension = {'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[mime];
if (!extension) { console.error('Unsupported image MIME type'); process.exit(1); }
const bytes = Buffer.from(inline.data, 'base64');
if (!bytes.length) { console.error('Vertex returned an empty image'); process.exit(1); }
const register = JSON.parse(fs.readFileSync(process.env.REGISTER, 'utf8'));
const id = process.env.ASSET_ID;
if (register.assets.some(a => a.id === id)) { console.error('Asset id already exists'); process.exit(2); }
const master = path.join(process.env.MASTERS_DIR, `${id}.${extension}`);
fs.writeFileSync(master, bytes, {flag:'wx'});
register.assets.push({
  id, purpose:'Draft generated illustration', status:'draft', trademarkScreen:'needs-review',
  sourceMaster:{path:master,sha256:crypto.createHash('sha256').update(bytes).digest('hex')},
  creator:{method:'AI generation',model:process.env.MODEL,modelVersion:process.env.MODEL,
    prompt:process.env.PROMPT,references:process.env.REFERENCE?[process.env.REFERENCE]:[],generatedAt:new Date().toISOString()},
  rightsBasis:'Product-owned commission pending owner review',rightsEvidence:'',
  altKey:process.env.ALT_KEY||null,decorative:!process.env.ALT_KEY,
  motion:'static',releaseFiles:[],reviewers:[]
});
fs.writeFileSync(process.env.REGISTER, JSON.stringify(register,null,2)+'\n');
console.log(`Draft ${id} saved to ${master} and ${process.env.REGISTER}`);
NODE
