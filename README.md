# AI Foundations Coach

[![Go Version](https://img.shields.io/badge/Go-1.23-00ADD8?style=flat-square&logo=go)](https://golang.org)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

A self-paced, multimodal artificial intelligence curriculum platform derived from [microsoft/AI-For-Beginners](https://github.com/microsoft/AI-For-Beginners). Learn artificial intelligence from fundamental concepts to deep neural networks, computer vision, natural language processing, and ethical AI with **3 adaptive audience modes**, **hands-on interactive simulators**, **Audio Studio 2.0 narration**, and a grounded **AI teaching assistant** that runs completely offline with local models or in the cloud.

---

## 🌟 Highlights & Key Features

### 1. 🎚️ 3-Tier Adaptive Learning Modes
Every curriculum module provides three purpose-built learning experiences accessible via a single click:
* **Standard (Beginner):** Complete academic foundations derived from Microsoft AI-For-Beginners.
* **Kids Mode (Ages 8–14):** Guided by **Chip the Robot 🤖**, featuring toy block models, everyday physical metaphors, gamified quizzes, and Flesch-Kincaid Grade 4–6 cognitive pacing.
* **Plain English:** Hosted by **Nova 🎙️**, providing executive analogies, workplace intuition, and jargon-free explanations for non-technical professionals.

### 2. 🕹️ 6 Embedded Interactive Simulators
Each lesson embeds a hands-on mathematical simulation widget directly into the reading flow:
* **Lesson 1 (Introduction):** *Turing Test Scenario Game* — evaluate conversational dialogues to guess whether a human or bot wrote them.
* **Lesson 2 (Symbolic AI):** *Mars Rover Expert System* — toggle sensor telemetry (dust storm, low battery, rock obstacle) and watch forward-chaining rules trigger emergency responses in real time.
* **Lesson 3 (Neural Networks):** *Perceptron Fruit Sorter* — drag weight sliders ($w_1, w_2$) and bias ($b$) to classify sweet apples versus sour lemons with a live threshold activation meter.
* **Lesson 4 (Computer Vision):** *3×3 Convolution Filter Matrix Lab* — slide Sobel, sharpen, blur, and outline kernels across a 6×6 pixel grid to inspect feature extraction math live.
* **Lesson 5 (NLP & Embeddings):** *Word2Vec Semantic Space & Math Lab* — solve word vector analogies like `King - Man + Woman = Queen` and `Paris - France + Japan = Tokyo` on an interactive 2D coordinate map.
* **Lesson 6 (Ethical AI):** *AI Bias Detective* — adjust training dataset skew and toggle fairness mitigations to audit candidate selection against the EEOC 80% Disparate Impact rule.

### 3. 🎙️ Audio Studio 2.0 & Multi-Modal Voice
* **Asynchronous Neural Voice Discovery:** Automatically ranks and prioritizes high-fidelity local TTS voices (Apple Natural, Google US, Microsoft Neural).
* **3 Dedicated Personas:**
  - 🤖 **Chip the Robot:** Expressive, upbeat, and encouraging for young learners.
  - 🎙️ **Nova:** Calm, warm, and conversational for adult professionals.
  - 🎓 **Prof. Alan:** Measured, authoritative, and academic for standard lectures.
* **Glowing Karaoke Sentence Tracker:** Real-time visual highlight synchronized sentence-by-sentence with audio playback.
* **Speech-to-Text "Talk to Chip":** Tap the 🎙️ microphone icon in the AI Teaching Assistant panel to speak questions aloud.
* **Jargon Buster Pronunciation Badges:** One-click 🔊 audio buttons beside every technical term in lesson glossary cards.

### 4. 🤖 Grounded AI Teaching Assistant
* **Strict Citation Enforcement:** All tutor answers cite `[Lesson Title § Section]`. Uncited assertions or speculative hallucinations are strictly filtered out.
* **Prompt Injection Defense:** Multi-layered system prompts protect lesson contexts from override or manipulation.
* **Real-Time Token Streaming:** Server-Sent Events (`text/event-stream`) deliver smooth, progressive token streaming with zero-write-deadline socket handling.

### 5. 🧠 Dual AI Backends (Local-First or Cloud)
* **100% Local & Offline (Ollama):** Run completely private with local models like `llama3.2:1b`, `deepseek-r1`, or `phi3` on `http://localhost:11434`.
* **Cloud LLM Support:** Full compatibility with OpenAI (`gpt-4o-mini`, `gpt-4o`) or any OpenAI-compatible API gateway (OmniRoute, vLLM, LM Studio).
* **Demo Simulation Mode:** Run out-of-the-box with `MOCK_TUTOR=true` without needing any API keys or local LLM setup.

### 6. 🔒 Local-First Privacy & Zero Telemetry
* All progress, quiz scores, and settings persist strictly in browser `localStorage`.
* Zero tracking cookies, zero analytics scripts, and zero server telemetry.
* Strict Content Security Policy (CSP), anti-clickjacking headers, and HTML sanitization enforced on all endpoints.

---

## 🚀 Quickstart Guide (Local Development)

### 1-Click Startup (Recommended)
You can start both the Go backend and Vite frontend dev servers with a single command:

```bash
# 1. Start both servers in background with auto-healthcheck:
./start.sh

# 2. Open in your browser:
# http://localhost:3000

# 3. Stop both servers at any time:
./stop.sh
```

*(Server logs are written to `logs/server.log` and frontend logs to `logs/web.log`)*

---

### Automated Dependency Check
Verify all runtimes, modules, and plugins before manual setup:
```bash
./scripts/check-dependencies.sh
```
*(To auto-install missing dependencies, run `./scripts/check-dependencies.sh --install`)*

---

### Option A: Local Ollama (Recommended — Free & Private)

1. **Install and run Ollama:**
   ```bash
   ollama serve
   # In a separate terminal, pull a lightweight model:
   ollama pull llama3.2:1b
   ```

2. **Configure `.env` in the repository root:**
   ```env
   PORT=8080
   CONTENT_DIR=public-content
   AI_BASE_URL=http://localhost:11434/v1
   AI_MODEL=llama3.2:1b
   AI_MAX_BYTES=1500
   ```

3. **Start the application:**
   ```bash
   # Terminal 1: Go Backend Server
   export $(grep -v '^#' .env | xargs) && go run ./cmd/server

   # Terminal 2: Web Dev Server
   cd web
   npm install
   npm run dev
   ```

4. Open **http://localhost:3000** in your browser!

---

### Option B: Cloud OpenAI

1. **Configure `.env`:**
   ```env
   PORT=8080
   CONTENT_DIR=public-content
   OPENAI_API_KEY="sk-..."
   AI_MODEL=gpt-4o-mini
   ```

2. **Start the server:**
   ```bash
   export $(grep -v '^#' .env | xargs) && go run ./cmd/server
   ```

---

### Option C: Instant Demo Simulation Mode (Zero Setup)

Run immediately without any LLM installed or API key:
```bash
# Terminal 1: Backend with mock simulation enabled
PORT=8080 CONTENT_DIR=public-content MOCK_TUTOR=true go run ./cmd/server

# Terminal 2: Frontend
npm --prefix web run dev
```

---

## 🐳 How to Deploy

### Curriculum pin

A release ingests `microsoft/AI-For-Beginners` at commit `392d0df1b2647cbee104942390551f1ed9e072c8` (NFR-LIC-03), set by `INGEST_PINNED_SHA` in `.github/workflows/deploy.yml`.

**Changing the pin needs a human image review.** NFR-LIC-02 forbids Microsoft logos and brand assets, and no automated check can find a hand-drawn one. At a size where a thumbnail looked clean, two sketchnotes turned out to have the logo. When the pin changes:

1. Run ingest, then view every file in `public-content/assets/` at full size. Zoom in on sketchnotes.
2. Add the content hash of any image with a logo to `brandedImages` in `internal/ingest/ingest.go`. It is then left out of the lessons, and the build refuses it.
3. Update the image count in `web/tests/lesson-assets.spec.ts`.

Review record for the current pin (2026-11-02): 22 images reviewed. 2 left out for a Microsoft logo (the Symbolic AI and NLP sketchnotes), 20 kept. Licensing beyond the upstream MIT grant was not checked for each image.

### 1. Docker Deployment (Single Multi-Stage Container)
The application compiles into an optimized non-root container (`UID 10001`):

```bash
# Generate the lessons first: the image bundles public-content/ as it is at build time.
# INGEST_PINNED_SHA is the upstream commit a release uses (see "Curriculum pin"). The image build
# fails if the content is incomplete or an image is damaged.
GITHUB_TOKEN=<your-token> INGEST_PINNED_SHA=392d0df1b2647cbee104942390551f1ed9e072c8 go run ./cmd/ingest

# Build production image
docker build -t ai-foundations-coach .

# Run a private local container with a host Ollama. HOSTED_MODE=false allows the private address:
docker run -p 8080:8080 \
  -e HOSTED_MODE=false \
  -e OPENAI_BASE_URL="http://host.docker.internal:11434/v1" \
  -e OPENAI_MODEL="llama3.2:1b" \
  ai-foundations-coach

# Run a public deployment (the image default is HOSTED_MODE=true):
docker run -p 8080:8080 -e OPENAI_API_KEY=<key> -e TRUSTED_PROXY_HOPS=1 ai-foundations-coach
```
In hosted mode the AI endpoint, key and model come only from the server's environment. Settings overrides, curriculum sync and AI-config-test are disabled, and the server refuses to connect to private or cloud-metadata addresses.

Access the application at **http://localhost:8080**.

---

### 2. Standalone Binary Deployment
Build the self-contained Go server and static distribution bundle:

```bash
# 1. Build frontend distribution
npm --prefix web run build

# 2. Compile Go backend binary
go build -o bin/server ./cmd/server

# 3. Run production binary
./bin/server
```
The Go server automatically serves the compiled frontend assets from `web/dist/` on port `8080`.

---

### 3. Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Port for the HTTP backend server |
| `CONTENT_DIR` | `public-content` | Path to curriculum JSON lessons |
| `OPENAI_BASE_URL` | *(empty)* | OpenAI-compatible or Ollama endpoint (for example `http://localhost:11434/v1`) |
| `OPENAI_MODEL` | `gpt-4o-mini` | Default LLM model identifier |
| `OPENAI_API_KEY` | *(empty)* | API key for OpenAI (leave blank for local Ollama) |
| `MOCK_TUTOR` | `false` | When `true`, simulates grounded AI tutor responses offline |
| `TUTOR_MAX_LESSON_BYTES` | `12000` | Truncation budget for curriculum context passed to the LLM |
| `HOSTED_MODE` | `false` (`true` in the Docker image) | Public deployment: AI settings come only from the server environment, per-request overrides are ignored, curriculum sync and AI-config-test are disabled, and connections to private or metadata addresses are refused |
| `TRUSTED_PROXY_HOPS` | `0` | Reverse proxies in front of the server (`1` on Cloud Run). Rate limits then count each visitor separately |
| `INGEST_SYNC_ENABLED` | `false` | Allows `POST /api/ingest/sync` (Settings "Sync Latest"). Local use only; ignored when `HOSTED_MODE` is on |

---

## 📖 How to Use the Application

> 📘 **Full Visual Walkthrough:** For complete screenshots, tips, and step-by-step guides for young learners, see **[APP_USAGE.md](APP_USAGE.md)**.

1. **Browse Lessons:**
   From the home dashboard, select any of the 6 core modules:
   - **Module 1:** Introduction to Artificial Intelligence
   - **Module 2:** Symbolic AI & Knowledge Systems
   - **Module 3:** Neural Networks & Perceptrons
   - **Module 4:** Computer Vision & Convolutions
   - **Module 5:** Natural Language Processing & Embeddings
   - **Module 6:** Ethical and Responsible AI

2. **Switch Audience Modes:**
   At the top of any lesson, click between **Standard**, **Kids (8–14)**, or **Plain English**. The explanations, metaphors, and visual representations adjust instantly without page reload.

3. **Interact with Kid-Friendly Simulators:**
   Engage with the embedded interactive widgets to develop physical intuition:
   - **Lesson 1:** *The Turing Test Stage* — Vote on mystery dialogues and pull open the velvet curtain to spot the bot (`🤖` vs `🧑‍💻`).
   - **Lesson 2:** *Mars Rover Live Lab* — Sweep dust off solar panels, swivel the antenna to Earth, and watch forward-chaining rules diagnose emergencies.
   - **Lesson 3:** *Sparky the Brain Cell* — Drop fruit onto the conveyor scale and tune Sparky's sweetness/roundness dials until his lightbulb fires (`💡`).
   - **Lesson 4:** *Robot Magic Sunglasses* — Pick pixel drawings (Cat `🐱`, Rocket `🚀`) and slide 3×3 edge filters across the pixel canvas.
   - **Lesson 5:** *Word Constellations* — Calculate analogies (`King - Man + Woman = Queen`) across an interactive deep space galaxy map.
   - **Lesson 6:** *The AI Fairness See-Saw* — Audit Space Academy applicant data and watch the see-saw balance scale level out as bias mitigation is applied.

4. **Listen with Audio Studio 2.0:**
   Open the **Audio Studio Settings** bar in the top right to select your preferred narrator persona (**Chip 🤖**, **Nova 🎙️**, or **Prof. Alan 🎓**), adjust reading speed, and follow along with live karaoke tracking.

5. **Chat with the AI Teaching Assistant:**
   Scroll to the bottom of any lesson:
   - Type a question or click the **🎙️ microphone icon** to speak your question aloud ("Talk to Chip").
   - The assistant streams grounded explanations cited with exact section references.
   - Click **🔊 Read Answer Aloud** to hear the response spoken.

6. **Settings & Dynamic Build Info:**
   Click the **Model / Settings button ⚙️** in the top navigation to configure your AI model, adjust context budgets, test connection latency, or inspect the dynamic application version and build date.

7. **Built-in Interactive Help (`❓ Help`):**
   Click the **❓ Help** button in the top navigation bar (or in the footer) to access the integrated guide covering:
   - **How to use the app:** Quick tour of adaptive modes, simulators, audio studio, and tutor.
   - **How to use local LLM:** Step-by-step instructions for downloading Ollama, running `ollama serve`, and pulling models (`llama3.2:1b`).
   - **About & Freeware Notice:** Software background and license details.

---

## Invite-only cloud beta

The beta uses one server instance and a persistent state file. Mount a volume at `/app/data`; the container's default is `STATE_FILE=/app/data/state.json`. For example, run the built image with `-v coach-data:/app/data`. Do not run multiple replicas against this file store. Set `ADMIN_EMAILS` to the first administrator's organisation email before startup; that person then signs in through the configured OIDC provider and can create invite links.

For local testing, start the development identity provider with `go run ./cmd/devidp -addr 127.0.0.1:9100`, then set the OIDC variables below and run `go run ./cmd/server`. The development provider is for local use only.

| Variable | Purpose / default |
| --- | --- |
| `AUTH_REQUIRED` | Require learner sign-in; default off outside hosted mode |
| `STATE_BACKEND` | `file` (default; development, tests, self-hosting) or `firestore` (required on Cloud Run) |
| `STATE_FILE` | Persistent JSON state path; required with auth on the file backend |
| `FIRESTORE_PROJECT_ID` | Project holding the Firestore database; required with the firestore backend |
| `SESSION_SECRET` | Cookie signing secret, at least 32 bytes; required with auth |
| `PUBLIC_BASE_URL` | Public URL used for invite links and OIDC callbacks |
| `OIDC_ISSUER` | Organisation identity provider issuer URL |
| `OIDC_CLIENT_ID` | OIDC client ID |
| `OIDC_CLIENT_SECRET` | OIDC client secret |
| `OIDC_REQUIRE_MFA` | Require an MFA claim for admin sign-in |
| `ADMIN_EMAILS` | Comma-separated allowlist of admin email addresses |
| `SEAT_CAP` | Maximum active accounts plus pending invites; default `1000` |
| `TUTOR_ENABLED` | Tutor on/off; defaults off in hosted mode and on otherwise |
| `DAILY_SPEND_CEILING_USD` | Shared daily AI spend ceiling; default `1.00` |
| `AI_PRICE_INPUT_PER_MTOK` | Estimated input price per million tokens; default `0.15` |
| `AI_PRICE_OUTPUT_PER_MTOK` | Estimated output price per million tokens; default `0.60` |
| `MONTHLY_BUDGET_USD` | Admin cost view budget; default `30` |
| `BUDGET_PUSH_AUDIENCE`, `BUDGET_PUSH_SERVICE_ACCOUNT` | Turn on the verified budget notification route that can switch the tutor off; set both or neither |
| `FEEDBACK_AUDITOR_BASE_URL` | AI feedback auditor endpoint; set with the next two variables |
| `FEEDBACK_AUDITOR_API_KEY` | Auditor API key; keep out of source control |
| `SESSION_SECRET_FILE`, `OIDC_CLIENT_SECRET_FILE`, `FEEDBACK_AUDITOR_API_KEY_FILE` | File holding that secret, such as a mounted Secret Manager volume. Required on Cloud Run, where the plain variables are refused |
| `FEEDBACK_AUDITOR_MODEL` | Auditor model; all three auditor variables enable feedback |

---

## 📐 Spec-Driven Development (SDD)

This repository is developed following strict **Spec-Driven Development** governed by [GitHub Spec Kit](https://github.com/github/spec-kit) and the project constitution (`.specify/memory/constitution.md`). Every feature is designed, ratified, and tested before release.

> For complete details on constitutional constraints (DC-01..11), agent skills, and verification gates, see **[SPEC_DRIVEN_DEVELOPMENT.md](SPEC_DRIVEN_DEVELOPMENT.md)**.

### Run Verification Test Suite
```bash
# Go unit tests
go test ./...

# End-to-end browser regression suite
cd web && npm test
```

---

## 📄 Attribution & Licensing

- **Developed and distributed as freeware by Qunisphere Pvt Limited, Bangalore.**
- Curriculum content is derived from [microsoft/AI-For-Beginners](https://github.com/microsoft/AI-For-Beginners) under the [MIT License](https://github.com/microsoft/AI-For-Beginners/blob/main/LICENSE). This project is independent and not affiliated with, sponsored by, or endorsed by Microsoft.
- Application source code, simulators, and architecture are released under the [MIT License](LICENSE).

