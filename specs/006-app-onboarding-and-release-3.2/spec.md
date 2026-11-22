# Feature Specification: App Onboarding, Help Modal & 3.2.0-GA Release

**Feature ID**: `SPEC-006-ONBOARDING-RELEASE`  
**Branch**: `revise-cld-v1`  
**Status**: In Progress  
**Authors**: Antigravity & Engineering Team  
**Compliance**: Project Constitution (DC-01..11, Rule 10 Git Discipline, Zero External DB/Asset Bloat)  

---

## 1. Problem Statement

1. **User Onboarding & Discoverability**:
   - The app has extensive multi-track interactive capabilities, Audio Studio 2.0, speech-to-text, and simulators, but lacks an in-app walkthrough and quick-reference guide.
   - Users need immediate in-app access to usage instructions, keyboard shortcuts, and audience mode explanations.
2. **Local Developer Operations (1-Click Run)**:
   - Starting the Go backend and Vite frontend separately requires managing multiple terminal sessions.
   - Users need dead-simple `start.sh` and `stop.sh` scripts that handle process daemonization, PID tracking, and health checks.
3. **Build Identity & Attribution Transparency**:
   - The application is distributed as freeware by Qunisphere Pvt Limited, Bangalore.
   - Users and educators need clean attribution and build identity (version, commit hash, build date) visible directly in Settings.

---

## 2. Functional Requirements

### FR-HELP-01: In-App Help & Onboarding Modal
- A modal dialog accessible via the top navigation bar (`❓ Help`) and footer link.
- Displays quick-start instructions, simulator cheat-sheet, audio studio tips, and AI tutor guidelines.
- Keyboard accessible (`Esc` to close) with accessible ARIA attributes.

### FR-RUN-01: 1-Click Startup & Shutdown Scripts
- Root `./start.sh` starts the Go backend on `:8080` and Vite dev server on `:3000` with PID tracking in `.app.pids` and `.web.pid`.
- Root `./stop.sh` cleanly terminates both processes and cleans up PID files.
- Logs directed to `logs/server.log` and `logs/web.log`.

### FR-REL-01: Release 3.2.0-GA Branding & Freeware Attribution
- Footer explicitly states: "Developed and distributed as freeware by Qunisphere Pvt Limited, Bangalore."
- Settings modal displays live build identity (version `3.2.0-GA`, git commit SHA, build timestamp).
- Documentation includes comprehensive user guide in `APP_USAGE.md`.

---

## 3. Success Metrics
- Zero compilation errors (`go test ./...` and `npm run build`).
- Single-click start and stop workflow verified.
- Help modal accessible on mobile and desktop viewports.

