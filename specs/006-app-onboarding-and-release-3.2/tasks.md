# Tasks: App Onboarding, Help Modal & 3.2.0-GA Release

**Feature ID**: `SPEC-006-ONBOARDING-RELEASE`  
**Status**: In Progress  

---

- [x] **Task 1: Add Help Modal State & Trigger**
  - Add `useHelpStore` in `web/src/store.ts`.
  - Add `❓ Help` button to navigation header in `web/src/App.tsx`.
- [x] **Task 2: Implement HelpModal Component**
  - Create `web/src/components/HelpModal.tsx` with user guide, simulator tips, and keyboard shortcuts.
- [x] **Task 3: Update Attribution & Docs**
  - Add Qunisphere freeware attribution to `web/src/components/Attribution.tsx` and `README.md`.
  - Add `APP_USAGE.md` visual walkthrough.
- [x] **Task 4: Implement 1-Click Startup & Shutdown**
  - Create `start.sh` and `stop.sh` in project root with PID management and logs.
  - Update `.gitignore` for `.app.pids`, `.web.pid`, `logs/`, and `server`.
- [x] **Task 5: Spec Kit Course Correction & Traceability**
  - Update `.specify/feature.json` to point to `specs/006-app-onboarding-and-release-3.2`.
  - Update `SPEC_DRIVEN_DEVELOPMENT.md` Traceability Index.
  - Run full quality gates (Go tests + Frontend build).
- [x] **Task 6: Git Staging & Commit per Constitution Rule 10**
  - Explicitly stage files (`git add <file>`), no `git add .`.
  - Commit with conventional commit message.
