#!/usr/bin/env bash
# Start the API server with a local Ollama (or any OpenAI-compatible server) as the default tutor backend.
# The browser's Settings drawer can still override endpoint/model per user.
# Usage: ./scripts/run-with-ollama.sh [base_url] [model]
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export OPENAI_BASE_URL="${1:-${OPENAI_BASE_URL:-http://localhost:11434/v1}}"
export OPENAI_MODEL="${2:-${OPENAI_MODEL:-llama3.2:1b}}"
echo "Tutor backend: ${OPENAI_BASE_URL}  model: ${OPENAI_MODEL}"
exec go run ./cmd/server
