# Technical Architecture & Plan: SPEC-006

**Feature ID**: `SPEC-006-ONBOARDING-RELEASE`  
**Branch**: `revise-cld-v1`  
**Status**: In Progress  

---

## 1. Technical Architecture

### 1.1 State Management for Help Modal
- Add `useHelpStore` to `web/src/store.ts` with `isHelpOpen: boolean` and `setHelpOpen(open: boolean)`.
- Mount `HelpModal.tsx` in `web/src/App.tsx`.

### 1.2 HelpModal Component
- Responsive modal with tabbed or sectioned content:
  - 🚀 Getting Started & Audience Modes
  - 🎮 Simulator Guide (Lessons 1–6)
  - 🎙️ Audio Studio & Tutor Tips
  - ⌨️ Keyboard Shortcuts & FAQ

### 1.3 1-Click Process Automation
- `start.sh`: Check if servers already running $\rightarrow$ start `go run ./cmd/server` in background $\rightarrow$ start `npm run dev` in background $\rightarrow$ wait for healthcheck on `localhost:8080/api/health` $\rightarrow$ output clear URLs.
- `stop.sh`: Read PIDs from `.app.pids` and `.web.pid` $\rightarrow$ terminate processes $\rightarrow$ clean up files.

### 1.4 Attribution & Build Identity
- Update `web/src/components/Attribution.tsx` with Qunisphere freeware notice.
- Pass build constants (`__APP_VERSION__`, `__COMMIT_HASH__`, `__BUILD_DATE__`) into `SettingsModal.tsx`.

## 2. Quality Gates
1. Go test suite: `go test -v ./...`
2. Frontend build: `cd web && npx tsc --noEmit && npm run build`
3. Git hygiene: verify no `.app.pids`, `.web.pid`, `logs/`, or `server` binary tracked in git.
