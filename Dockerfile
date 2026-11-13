# SPEC: NFR-OPS-01, NFR-OPS-04, AC-31, DC-08

# Stage 1: Build Frontend SPA
# Builders run natively on the build machine, so a multi-architecture release needs no emulation here.
FROM --platform=$BUILDPLATFORM node:24-alpine AS frontend-builder
# FR-031: stamped by the release workflow. .git is not in the build context, so these are the only source.
ARG BUILD_NUMBER=0
ARG BUILD_COMMIT=unknown
ARG BUILD_DATE=
ARG RELEASE_TAG=
ENV BUILD_NUMBER=$BUILD_NUMBER BUILD_COMMIT=$BUILD_COMMIT BUILD_DATE=$BUILD_DATE RELEASE_TAG=$RELEASE_TAG
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Build Go Server
FROM --platform=$BUILDPLATFORM golang:1.27.4-alpine3.24 AS backend-builder
ARG TARGETARCH
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY cmd/ ./cmd/
COPY internal/ ./internal/
# FR-033: refuse to build an image with missing lessons or damaged or forbidden images.
COPY public-content ./public-content
# SPEC-009 FR-017: the language gate compares each translation with its English source and its review
# ledger. These files are read here only; none of them reaches the runtime image from this stage.
COPY content ./content
COPY web/src/i18n ./web/src/i18n
COPY web/src/data/quizzes ./web/src/data/quizzes
# SPEC-012 FR-CNT-09: Kids word and scene pictures must exist and be approved in the register.
COPY design/brand/asset-register.json ./design/brand/asset-register.json
COPY web/public/brand ./web/public/brand
# SPEC-013 FR-008: the English approval gate hashes our notebooks. Build stage only, never the runtime image.
COPY notebooks ./notebooks
RUN CONTENT_DIR=public-content go run ./cmd/ingest -verify
RUN CGO_ENABLED=0 GOOS=linux GOARCH=$TARGETARCH go build -trimpath -ldflags="-w -s" -o /app/server ./cmd/server

# Stage 3: Minimal non-root production runtime
FROM alpine:3.24 AS runner
ARG RELEASE_TAG=
ENV RELEASE_TAG=$RELEASE_TAG
WORKDIR /app

# NFR-OPS-01, AC-31: Create non-root user with non-zero UID (10001)
RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup

# Copy compiled frontend assets and backend server binary
COPY --from=frontend-builder --chown=appuser:appgroup /app/web/dist ./web/dist
COPY --from=backend-builder --chown=appuser:appgroup /app/server ./server

# Generated lessons (run cmd/ingest before building) plus the committed adaptive lessons.
COPY --chown=appuser:appgroup public-content ./public-content

# NFR-OPS-04: Remove package managers from production container
RUN rm -rf /sbin/apk /etc/apk /lib/apk

# SPEC-008: state directory for the JSON state file when self-hosting. Mount a persistent volume at
# /app/data; the container filesystem alone does not survive a restart. Cloud Run refuses this backend
# and uses Firestore instead.
RUN mkdir -p /app/data && chown appuser:appgroup /app/data

# Switch to non-root user
USER 10001:10001

EXPOSE 8080
ENV PORT=8080
ENV CONTENT_DIR=/app/public-content
ENV STATE_FILE=/app/data/state.json
# Safe by default for a public deployment: AI settings come only from server configuration.
# For a private local container that needs the Settings overrides
# (for example a host Ollama), run with -e HOSTED_MODE=false.
ENV HOSTED_MODE=true

# Uses busybox wget, which the base image provides (apk itself is removed above).
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/api/health" || exit 1

ENTRYPOINT ["/app/server"]
