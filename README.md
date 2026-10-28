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

### 1. Automated Dependency Check
Verify all runtimes, modules, and plugins before starting:
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

### 1. Docker Deployment (Single Multi-Stage Container)
The application compiles into an optimized non-root container (`UID 10001`):

```bash
# Build production image
docker build -t ai-foundations-coach .

# Run container with local Ollama or cloud OpenAI:
docker run -p 8080:8080 \
  -e AI_BASE_URL="http://host.docker.internal:11434/v1" \
  -e AI_MODEL="llama3.2:1b" \
  ai-foundations-coach
```
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
| `AI_BASE_URL` | `http://localhost:11434/v1` | URL for the OpenAI-compatible or Ollama API |
| `AI_MODEL` | `llama3.2:1b` | Default LLM model identifier |
| `OPENAI_API_KEY` | *(empty)* | API key for OpenAI (leave blank for local Ollama) |
| `MOCK_TUTOR` | `false` | When `true`, simulates grounded AI tutor responses offline |
| `AI_MAX_BYTES` | `4000` | Truncation budget for curriculum context passed to the LLM |

---

## 📖 How to Use the Application

1. **Browse Lessons:**
   From the home dashboard, select any of the 6 core modules:
   - Module 1: Introduction to Artificial Intelligence
   - Module 2: Symbolic AI & Knowledge Systems
   - Module 3: Neural Networks & Perceptrons
   - Module 4: Computer Vision & Convolutions
   - Module 5: Natural Language Processing & Embeddings
   - Module 6: Ethical and Responsible AI

2. **Switch Audience Modes:**
   At the top of any lesson, click between **Standard**, **Kids (8–14)**, or **Plain English**. The explanations, metaphors, and visual representations adjust instantly without page reload.

3. **Interact with Simulators:**
   Engage with the embedded interactive widgets (Fruit sorter, Mars Rover diagnostic system, Convolution filter lab, Word2Vec scatter plot, or Bias Detective) to develop physical intuition for the mathematical concepts.

4. **Listen with Audio Studio 2.0:**
   Open the **Audio Studio Settings** bar in the top right to select your preferred narrator persona (**Chip 🤖**, **Nova 🎙️**, or **Prof. Alan 🎓**), adjust reading speed, and follow along with live karaoke tracking.

5. **Chat with the AI Teaching Assistant:**
   Scroll to the bottom of any lesson:
   - Type a question or click the **🎙️ microphone icon** to speak your question aloud.
   - The assistant streams grounded explanations cited with exact section references.
   - Click **🔊 Read Answer Aloud** to hear the response spoken.

6. **Settings & Dynamic Build Info:**
   Click the **Model / Settings button ⚙️** in the top navigation to configure your AI model, adjust context budgets, test connection latency, or inspect the dynamic application version and build date.

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

- Curriculum content is derived from [microsoft/AI-For-Beginners](https://github.com/microsoft/AI-For-Beginners) under the [MIT License](https://github.com/microsoft/AI-For-Beginners/blob/main/LICENSE). This project is independent and not affiliated with, sponsored by, or endorsed by Microsoft.
- Application source code, simulators, and architecture are released under the [MIT License](LICENSE).
