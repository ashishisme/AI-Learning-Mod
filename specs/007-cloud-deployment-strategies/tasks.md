# Tasks: Cloud Deployment Strategies & Cost Engineering

**Feature ID:** `SPEC-007-DEPLOYMENT-COST-ENGINEERING`  
**Status:** In Progress  

---

- [x] **Task 1: Technical & Financial Cost Architecture**
  - Formulate mathematical cost models for 1K, 10K, 100K, and 1M MAU.
  - Document executive and engineering deployment specifications (`spec.md` & artifact).
- [x] **Task 2: Dockerfile Modernization** (verified 2026-11-02; image build still pending Task 5)
  - Add `COPY --chown=appuser:appgroup public-content ./public-content` to `Dockerfile`.
  - Add `HEALTHCHECK` directive for `/api/health`.
- [ ] **Task 3: GitHub Actions Deployment Workflow** (written, not yet run on GitHub; tracked by SPEC-008 T110, T113 and T114)
  - Create `.github/workflows/deploy.yml` with test gates and a no-traffic staging release, promotion and rollback.
- [ ] **Task 4: Terraform IaC Module** (written, not yet validated; tracked by SPEC-008 T112)
  - Author reusable `deploy/terraform/` configuration for the staging beta on Cloud Run, Firestore and Secret Manager.
- [ ] **Task 5: Staging Beta Verification** (tracked by SPEC-008 T120)
  - Validate container build, health endpoint response, and SSE streaming over TLS.

