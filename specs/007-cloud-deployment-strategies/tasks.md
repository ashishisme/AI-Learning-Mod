# Tasks: Cloud Deployment Strategies & Cost Engineering

**Feature ID:** `SPEC-007-DEPLOYMENT-COST-ENGINEERING`  
**Status:** In Progress  

---

- [x] **Task 1: Technical & Financial Cost Architecture**
  - Formulate mathematical cost models for 1K, 10K, 100K, and 1M MAU.
  - Document executive and engineering deployment specifications (`spec.md` & artifact).
- [ ] **Task 2: Dockerfile Modernization**
  - Add `COPY --chown=appuser:appgroup public-content ./public-content` to `Dockerfile`.
  - Add `HEALTHCHECK` directive for `/api/health`.
- [ ] **Task 3: GitHub Actions Deployment Workflow**
  - Create `.github/workflows/deploy.yml` with test gates and Cloud Run deployment.
- [ ] **Task 4: Terraform IaC Module**
  - Author reusable `deploy/terraform/` configuration for Cloud Run + Secret Manager.
- [ ] **Task 5: Production Staging Verification**
  - Validate container build, health endpoint response, and SSE streaming over TLS.

