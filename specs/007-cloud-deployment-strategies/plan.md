# Technical Architecture & Plan: SPEC-007

**Feature ID:** `SPEC-007-DEPLOYMENT-COST-ENGINEERING`  
**Status:** In Progress  

---

## 1. Technical Execution Phases

### Phase 1: Container Modernization & Local Verification
- Update `Dockerfile` to bundle `public-content/` into the runner image.
- Add Docker native `HEALTHCHECK` probe instruction.
- Test building and running container locally (`docker build -t ai-coach-test .`).

### Phase 2: CI/CD Pipeline Automation
- Create `.github/workflows/deploy.yml` with:
  - 3-Tier Verification Gate (Go tests + Frontend build + Playwright tests).
  - Docker multi-arch build via Buildx.
  - Deployment step targeting Google Cloud Run with Workload Identity Federation.

### Phase 3: Infrastructure as Code (Terraform)
- Create `deploy/terraform/` module containing:
  - `main.tf` (Cloud Run v2 service, Secret Manager secret, IAM public invoker).
  - `variables.tf` and `outputs.tf`.

### Phase 4: Observability & Budget Guardrails
- Configure Cloud Monitoring alerts for p95 latency > 1500ms and error rate > 1%.
- Set Google Cloud Budget alerts at \$50, \$200, and \$1,000 thresholds.
