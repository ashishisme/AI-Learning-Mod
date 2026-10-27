# Dependencies, Modules & Plugins Guide

This document outlines all system requirements, backend modules, frontend packages, and Spec-Driven Development (SDD) AI agent plugins required to run, test, and develop **AI Foundations Coach**.

---

## ⚡ Quick Start: Automatic Dependency Verification

Whenever you clone or download this repository, run the built-in pre-flight dependency checker:

```bash
# Direct shell script check
./scripts/check-dependencies.sh

# Or with automatic dependency resolution:
./scripts/check-dependencies.sh --install

# Or via npm from the web directory:
npm --prefix web run check:deps
```

---

## 📦 Required Modules & Tooling Summary

### 1. Backend Runtime (Go)
- **Runtime:** Go `>= 1.22` (Recommended: Go 1.23+)
- **Architecture Standard (Constitution DC-01):** Go standard library `net/http` router only. Zero heavy framework bloat (no Gin, Fiber, or Echo).
- **Core Modules (`go.mod`):**
  - Go Standard Library (`net/http`, `encoding/json`, `os`, `path/filepath`, `strings`, `sync`)
- **Verification:**
  ```bash
  go version
  go mod verify
  ```

### 2. Frontend SPA Runtime (Node.js & npm)
- **Runtime:** Node.js `>= 18.0.0` & npm `>= 9.0.0`
- **Build Tool:** Vite 5 + TypeScript 5
- **Production Dependencies (`web/package.json`):**
  - `react` (`^18.3.1`) & `react-dom`: Declarative UI engine
  - `react-router-dom` (`^6.28.0`): Client-side routing
  - `zustand` (`^4.5.5`): Lightweight state store (persists theme and audience mode to `localStorage`)
  - `mermaid` (`^12.2.0`): Dynamic SVG flowchart and architecture diagram generation
  - `react-markdown` (`^9.0.1`), `remark-gfm`, `rehype-highlight`, `rehype-raw`, `rehype-sanitize`: Markdown lesson parser
- **Development & Testing Dependencies:**
  - `@playwright/test` (`^1.48.0`): End-to-end browser regression testing
  - `tailwindcss` (`^3.4.14`), `postcss`, `autoprefixer`: Modern styling system
  - `typescript` (`^5.6.3`): Static type validation
  - `@vitejs/plugin-react` (`^4.3.3`): Vite HMR React compiler
- **Installation & Verification:**
  ```bash
  cd web
  npm install
  npm test         # Runs Playwright E2E suite
  npm run build    # Validates TypeScript & compiles bundle
  ```

### 3. Content Auditing & Readability Tools (Python)
- **Runtime:** Python `>= 3.10` (Recommended: Python 3.11+)
- **Python Packages (`scripts/requirements.txt`):**
  - `textstat` (`>= 0.7.3`): Flesch-Kincaid grade level & reading ease calculation
  - `pyyaml` (`>= 6.0.1`): Specification & frontmatter parsing
  - `requests` (`>= 2.31.0`): API payload testing
- **Installation:**
  ```bash
  pip install -r scripts/requirements.txt
  python scripts/audit_lesson.py --help
  ```

### 4. Spec-Driven Development (SDD) & AI Agent Plugins
Configured under `.agents/skills/` and `.specify/`:
- **GitHub Spec Kit (`specify-cli`):**
  - CLI command: `specify`
  - Install: `pip install git+https://github.com/github/spec-kit.git`
  - Check: `specify check`
- **Google Antigravity CLI (`agy`):**
  - CLI command: `agy`
  - Install: `curl -fsSL https://antigravity.google/cli/install.sh | bash`
- **Claude Code CLI (`claude`):**
  - CLI command: `claude`
  - Install: `npm install -g @anthropic-ai/claude-code`
- **Integrated Agent Skills (`.agents/skills/`):**
  - `speckit-specify`: Scaffolds formal specifications
  - `speckit-plan`: Synthesizes constitutional technical plans
  - `speckit-tasks`: Decomposes plans into dependency-ordered tasks
  - `speckit-implement`: Implements phased tasks
  - `speckit-checklist`: Acceptance criteria checklists
  - `speckit-constitution`: Architectural principles governance

---

## 🚀 Running the Project

```bash
# 1. Start the Backend API (port 8080)
go run ./cmd/server

# 2. In a separate terminal, start Frontend Dev Server (port 3000)
cd web && npm run dev

# 3. Access in browser:
http://localhost:3000
```
