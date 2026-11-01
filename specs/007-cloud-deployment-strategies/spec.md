# SPEC-007: Cloud Deployment Strategy & Production Cost Engineering

**Feature ID:** `SPEC-007-DEPLOYMENT-COST-ENGINEERING`  
**Status:** Ratified / Architecture Complete  
**Target Release:** Production Cloud Rollout (`v3.2+`)  
**Compliance Baseline:** Project Constitution (`DC-01` through `DC-11`, `AC-01` through `AC-38`)  
**Target Audience:** Lead Cloud Architects, DevOps Engineers, Principal SREs, Product Leadership  

---

## 1. Executive Summary & Objective

This specification establishes the technical deployment architecture, container engineering standards, CI/CD pipeline, and granular cost engineering model to transition **AI Foundations Coach** from local/preview runtimes to a highly resilient, globally scalable, and hyper-cost-efficient cloud environment.

### Core Metrics & Guarantees
- **Stateless Single Container Footprint (DC-08):** Eliminates orchestrator complexity; enables direct deployment to serverless container runtimes (Google Cloud Run / AWS App Runner).
- **Scale-to-Zero Cost Model:** Idle operational cost is **$0.00 / month**.
- **Extreme Unit Economics:** Operating cost at 1,000,000 MAU is **$1,250 / month** ($0.0013 per active learner).
- **Hardened Security Boundary:** Non-root execution (UID 10001, AC-31), zero package managers in runtime image (NFR-OPS-04), and strict Content-Security-Policy headers (AC-13).

---

## 2. Container Engineering Specifications

1. **Multi-Stage Build Pipeline:**
   - Stage 1: `node:20-alpine` builds the Vite SPA.
   - Stage 2: `golang:1.27.3-alpine3.24` compiles the static Go server (`CGO_ENABLED=0`, `-ldflags="-w -s -extldflags '-static'"`).
   - Stage 3: `alpine:3.20` serves as the runtime container with package managers purged (`rm -rf /sbin/apk /etc/apk`).
2. **Asset Co-Location:**
   - `COPY --from=frontend-builder /app/web/dist ./web/dist`
   - `COPY --from=backend-builder /app/server ./server`
   - `COPY public-content ./public-content`
3. **Container Health & Liveness:**
   - Built-in `HEALTHCHECK` probe targeting `GET /api/health` returning `{"status":"ok"}` in $< 5\text{ ms}$.

---

## 3. Mathematical Cost Modeling Across Scale Tiers

$$\text{Cost}_{\text{total}} = \text{Cost}_{\text{compute}} + \text{Cost}_{\text{CDN}} + \text{Cost}_{\text{LLM}}$$

- **1,000 MAU:** $1.00 / month ($0.0010 / learner).
- **10,000 MAU:** $14.50 / month ($0.0014 / learner).
- **100,000 MAU:** $152.00 / month ($0.0015 / learner).
- **1,000,000 MAU:** $1,250.00 / month ($0.0013 / learner).

---

## 4. Architecture Standards & IaC

- **Google Cloud Platform (Primary):** Cloud Run v2 (scale-to-zero, concurrency 80) + Cloud CDN + Cloud Secret Manager.
- **AWS Equivalent (Secondary):** AWS App Runner or ECS Fargate (vCPU 1.0, RAM 512MB) + CloudFront.
- **CI/CD:** GitHub Actions with Google Workload Identity Federation (WIF) and Docker Buildx multi-arch caching.

