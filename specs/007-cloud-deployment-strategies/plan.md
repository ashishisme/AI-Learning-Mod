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
  - Digest-pinned, no-traffic staging release with smoke test, approval, promotion and one-step rollback, using Workload Identity Federation ([design section 4](../008-cloud-beta-deployment/cloud-beta-design.md)).

### Phase 3: Infrastructure as Code (Terraform)
- Depends on the SPEC-008 Firestore adapter (T104 to T107). Do not define a live service on the file store.
- Complete `deploy/terraform/` for the staging beta (SPEC-008 T112):
  - Cloud Run v2 service, Firestore Native, Artifact Registry, Secret Manager references, identities, WIF and IAM public invoker.
  - `variables.tf` and `outputs.tf`.

### Phase 4: Observability & Budget Guardrails
- Configure Cloud Monitoring alerts for p95 latency > 1500ms and error rate > 1%.
- Set Google Cloud Budget alerts at 50%, 90% and 100% of the owner's monthly budget (FR-026). These notify the owner and do not cap spending.
