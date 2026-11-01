#!/usr/bin/env bash
# Start script for AI Foundations Coach (Go Backend + Vite Web UI)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${ROOT_DIR}/logs"
PID_FILE="${ROOT_DIR}/.app.pids"
WEB_PID_FILE="${ROOT_DIR}/.web.pid"

mkdir -p "${LOG_DIR}"

echo "=================================================="
echo "🚀 Starting AI Foundations Coach Application"
echo "=================================================="

# 1. Clean up any existing instances first
if [ -f "${PID_FILE}" ] || [ -f "${WEB_PID_FILE}" ] || lsof -i :8080 -sTCP:LISTEN -t >/dev/null 2>&1 || lsof -i :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "🧹 Ensuring ports 8080 and 3000 are clean..."
  "${ROOT_DIR}/scripts/stop.sh" >/dev/null 2>&1 || true
  sleep 1
fi

# 2. Load .env if present
if [ -f "${ROOT_DIR}/.env" ]; then
  echo "📋 Loading environment variables from .env..."
  set -a
  # shellcheck source=/dev/null
  source <(grep -v '^#' "${ROOT_DIR}/.env" | sed -E 's/^[[:space:]]*export[[:space:]]+//')
  set +a
fi

# 3. Start Go Backend (Port 8080)
echo "⚙️ Starting Go backend server (port 8080)..."
cd "${ROOT_DIR}"
nohup go run ./cmd/server </dev/null > "${LOG_DIR}/server.log" 2>&1 &
SERVER_PID=$!
echo "${SERVER_PID}" > "${PID_FILE}"

# 4. Start Vite Frontend (Port 3000) detached from TTY
echo "💻 Starting Vite frontend dev server (port 3000)..."
cd "${ROOT_DIR}/web"
node -e "
  const fs = require('fs');
  const out = fs.openSync('${LOG_DIR}/web.log', 'a');
  const err = fs.openSync('${LOG_DIR}/web.log', 'a');
  const child = require('child_process').spawn('./node_modules/.bin/vite', [], {
    detached: true,
    stdio: ['ignore', out, err]
  });
  fs.writeFileSync('${WEB_PID_FILE}', String(child.pid));
  child.unref();
"

# 5. Health Check: Wait up to 5 seconds for both ports to respond
echo "⏳ Waiting for services to initialize..."
HEALTHY=false
for i in {1..10}; do
  if lsof -i :8080 -sTCP:LISTEN -t >/dev/null 2>&1 && lsof -i :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    HEALTHY=true
    break
  fi
  sleep 0.5
done

if [ "$HEALTHY" = true ]; then
  echo ""
  echo "✅ Application successfully started and running!"
  echo "--------------------------------------------------"
  echo "🌐 Web Frontend:    http://localhost:3000"
  echo "🔌 Backend API:     http://localhost:8080"
  echo "📄 Server Logs:     ${LOG_DIR}/server.log"
  echo "📄 Web Logs:        ${LOG_DIR}/web.log"
  echo "--------------------------------------------------"
  echo "To stop both servers at any time, run: ./scripts/stop.sh"
  echo "=================================================="
else
  echo "⚠️ Services launched, checking port status:"
  lsof -i :8080 -i :3000 || true
  echo "Please check ${LOG_DIR}/server.log and ${LOG_DIR}/web.log if issues occur."
fi
