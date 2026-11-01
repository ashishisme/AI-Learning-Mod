# SPEC: NFR-OPS-01, NFR-OPS-04, AC-31, DC-08

# Stage 1: Build Frontend SPA
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Build Go Server
FROM golang:1.27.3-alpine3.24 AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY cmd/ ./cmd/
COPY internal/ ./internal/
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server ./cmd/server

# Stage 3: Minimal non-root production runtime
FROM alpine:3.20 AS runner
WORKDIR /app

# NFR-OPS-01, AC-31: Create non-root user with non-zero UID (10001)
RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup

# Copy compiled frontend assets and backend server binary
COPY --from=frontend-builder --chown=appuser:appgroup /app/web/dist ./web/dist
COPY --from=backend-builder --chown=appuser:appgroup /app/server ./server

# Generated lessons (run cmd/ingest before building) plus the committed adaptive lessons.
# Owned by the app user so CONTENT_DIR stays writable for curriculum sync.
COPY --chown=appuser:appgroup public-content ./public-content

# NFR-OPS-04: Remove package managers from production container
RUN rm -rf /sbin/apk /etc/apk /lib/apk

# SPEC-008: state directory for the JSON state file. Mount a persistent volume at /app/data for the
# single-instance beta; the container filesystem alone does not survive a restart.
RUN mkdir -p /app/data && chown appuser:appgroup /app/data

# Switch to non-root user
USER 10001:10001

EXPOSE 8080
ENV PORT=8080
ENV CONTENT_DIR=/app/public-content
ENV STATE_FILE=/app/data/state.json
# Safe by default for a public deployment: AI settings come only from server configuration
# and curriculum sync is off. For a private local container that needs the Settings overrides
# (for example a host Ollama), run with -e HOSTED_MODE=false.
ENV HOSTED_MODE=true

# Uses busybox wget, which the base image provides (apk itself is removed above).
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/api/health" || exit 1

ENTRYPOINT ["/app/server"]
