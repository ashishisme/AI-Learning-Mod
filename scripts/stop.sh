#!/usr/bin/env bash
# Stop script for AI Foundations Coach (Go Backend + Vite Web UI)
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="${ROOT_DIR}/.app.pids"
WEB_PID_FILE="${ROOT_DIR}/.web.pid"

echo "=================================================="
echo "🛑 Stopping AI Foundations Coach Application"
echo "=================================================="

# 1. Stop via PID files if present
for FILE in "${PID_FILE}" "${WEB_PID_FILE}"; do
  if [ -f "${FILE}" ]; then
    while IFS= read -r pid; do
      if [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null; then
        echo "Stopping PID ${pid}..."
        kill "${pid}" 2>/dev/null || true
      fi
    done < "${FILE}"
    rm -f "${FILE}"
  fi
done

# 2. Force-clear any lingering processes on ports 8080 and 3000
for PORT in 8080 3000; do
  PIDS=$(lsof -i :${PORT} -sTCP:LISTEN -t 2>/dev/null || true)
  if [ -n "${PIDS}" ]; then
    echo "Clearing lingering listener on port ${PORT} (PID ${PIDS})..."
    kill -9 ${PIDS} 2>/dev/null || true
  fi
done

sleep 1

echo "✅ All application servers (port 8080 & port 3000) have been stopped."
echo "=================================================="
