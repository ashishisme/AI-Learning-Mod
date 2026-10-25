# SPEC: NFR-OPS-01, NFR-OPS-04, AC-31, DC-08

# Stage 1: Build Frontend SPA
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Build Go Server
FROM golang:1.23-alpine AS backend-builder
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

# NFR-OPS-04: Remove package managers from production container
RUN rm -rf /sbin/apk /etc/apk /lib/apk

# Switch to non-root user
USER 10001:10001

EXPOSE 8080
ENV PORT=8080
ENV CONTENT_DIR=/app/public-content

ENTRYPOINT ["/app/server"]
