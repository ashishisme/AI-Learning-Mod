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

### Languages (SPEC-009)

Languages are listed in `public-content/languages.json`. A language marked `hidden` is built and checked but not offered to learners. Only a reviewed PR changes it to `approved`.

To add a language, follow [docs/adding-a-language.md](docs/adding-a-language.md).

- **Base lessons** come from the course's own translation at the same pin: `go run ./cmd/ingest` ingests every listed language, and `go run ./cmd/ingest -lang hi` ingests just one. Translated images are new images, so **review them for logos as above** before a language is approved.
- **App-written content** (kids and plain-English lessons, quizzes, UI text) is drafted with `go run ./cmd/translate -lang hi [-kind adaptive|quiz|ui] [-only <path>] [-force] [-dry-run]`. It uses the glossary in `content/glossary/<code>.json` and records each draft in `content/review/<code>.json`.
- **Review:** a native reviewer corrects each file in a PR, then approves it with `go run ./cmd/review -lang hi -reviewer "Name" -approve <path>…`. `go run ./cmd/review -lang hi` lists every file as draft, approved, stale or missing. Any later change to the file or its English source makes the approval stale.
- **Release gate:** `go run ./cmd/ingest -verify` prints `LANG PATH: reason` for anything missing, draft, stale or structurally different from English. Such a line fails the build for an approved language and is a warning for a hidden one.

**Recorded narration** (Google Cloud Text-to-Speech) is made on the owner's machine and kept in the private bucket that Terraform creates (output `github_variables.GCP_NARRATION_BUCKET`). The release build copies it into the image.

```bash
B=gs://<project>-ai-foundations-coach-narration
gcloud storage rsync --recursive "$B/audio" public-content/audio   # what is already recorded
export TTS_ACCESS_TOKEN="$(gcloud auth print-access-token)" TTS_PROJECT=<project>
go run ./cmd/narrate -lang hi -sample hi-IN-Wavenet-A             # listening test for one voice
go run ./cmd/narrate -lang hi -dry-run                            # what would be recorded, characters billed
go run ./cmd/narrate -lang hi                                     # records only new or changed text
gcloud storage rsync --recursive public-content/audio "$B/audio"
```

Choose one voice per persona (Chip, Nova, Prof. Alan) in `content/voices/<code>.json` before the first full run. An approved language fails the release build if any narrated track is missing or out of date. On a device without recordings, the app uses a voice in the learner's language if the device has one, and otherwise says so. It never reads Hindi in an English voice.

**`cmd/translate` runs only on the owner's machine.** It reads `TRANSLATE_API_KEY`, `TRANSLATE_MODEL` and (for a non-OpenAI endpoint) `TRANSLATE_BASE_URL` from the environment, never prints the key, and sends only the text being translated. Never put this key in GitHub Actions, Terraform, Secret Manager or the image (SPEC-009 FR-021). `-dry-run` needs no key and shows the field and character counts.

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
In hosted mode the AI endpoint, key and model come only from the server's environment. Settings overrides and AI-config-test are disabled, and the server refuses to connect to private or cloud-metadata addresses.

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
| `HOSTED_MODE` | `false` (`true` in the Docker image) | Public deployment: AI settings come only from the server environment, per-request overrides are ignored, AI-config-test is disabled, and connections to private or metadata addresses are refused |
| `TRUSTED_PROXY_HOPS` | `0` | Reverse proxies in front of the server (`1` on Cloud Run). Rate limits then count each visitor separately |

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

## ☁️ Google Cloud Platform (GCP) Deployment

The production deployment of **AI Foundations Coach** runs on **Google Cloud Platform (GCP)** using **Cloud Run v2**, **Cloud Firestore Native mode**, **Google Secret Manager**, **Artifact Registry**, and automated **GitHub Actions CI/CD** authenticated via keyless **Workload Identity Federation (WIF)**.

```
                              [ GitHub Actions Release Workflow ]
                                               │
                                 (Workload Identity Federation)
                                               ▼
[ User / Learner Browser ] ──HTTPS──▶ [ Cloud Run v2 Service ]
                                      Region: asia-south1 (Mumbai)
                                               │
               ┌───────────────────────────────┼───────────────────────────────┐
               ▼                               ▼                               ▼
     [ Cloud Firestore Native ]      [ Secret Manager ]             [ Artifact Registry ]
     - Standard Edition              - session-secret (volume mount)- Multi-arch images
     - Collection single-field index - oidc-client-secret (volume)  - Automatic SBOM
     - Daily 14-day Backups          - auditor-api-key (optional)
```

### 1. Architecture & Security Highlights

* **Serverless & Cost-Optimized:** Scales automatically to zero when idle ($0.00 base cost).
* **Zero Long-Lived Service Account Keys:** GitHub Actions authenticates through OpenID Connect (OIDC) Workload Identity Pools.
* **Secret Container Volume Mounting:** Cloud Run strictly mounts secrets directly from Google Secret Manager (`SESSION_SECRET_FILE`, `OIDC_CLIENT_SECRET_FILE`) to eliminate runtime environment variable leakage.
* **Strict Client-Side Privacy:** All user lesson progress, quiz attempts, and client tokens remain in the browser's local store.

---

### 2. Required Infrastructure Parameters

Configure your parameters in `deploy/terraform/terraform.tfvars`:

| Parameter | Description | Example / Default |
| :--- | :--- | :--- |
| `project_id` | Google Cloud Project ID | `your-gcp-project-id` |
| `region` | Compute & Firestore location | `asia-south1` |
| `service_name` | Name for Cloud Run & Artifact Registry | `ai-foundations-coach` |
| `github_repository` | GitHub `owner/repo` authorized for WIF | `your-org/your-repo` |
| `billing_account` | GCP Billing Account ID for budget alerts | `000000-000000-000000` |
| `owner_alert_email`| Notification email for cost and health alerts| `admin@example.com` |
| `oidc_issuer` | Identity provider issuer URL | `https://accounts.google.com` |
| `oidc_client_id` | Google OAuth Client ID for Admin console | `<YOUR_GOOGLE_OAUTH_CLIENT_ID>` |
| `admin_emails` | Comma-separated admin email allowlist | `admin@example.com` |

---

### 3. One-Time Infrastructure Provisioning (Google Cloud Shell)

We recommend bootstrapping from [Google Cloud Shell](https://shell.cloud.google.com/), where the Google Cloud SDK and network authentication are pre-configured.

1. **Clone the repository and enter the Terraform directory:**
   ```bash
   git clone -b cloud-beta https://github.com/<YOUR_GITHUB_ORG>/AI-Learning-Mod.git
   cd AI-Learning-Mod/deploy/terraform
   ```

2. **Ensure official Terraform binary is available:**
   ```bash
   sudo curl -fsSL https://releases.hashicorp.com/terraform/1.9.8/terraform_1.9.8_linux_amd64.zip -o /tmp/tf.zip
   sudo unzip -q -o /tmp/tf.zip -d /usr/local/bin
   sudo rm -f /tmp/tf.zip
   ```

3. **Initialize and provision Terraform:**
   ```bash
   export GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token)
   export CLOUDSDK_CORE_PROJECT="<YOUR_GCP_PROJECT_ID>"

   /usr/local/bin/terraform init -upgrade
   /usr/local/bin/terraform apply -auto-approve
   ```

4. **Populate Secret Manager with your secrets:**
   ```bash
   # Session signing key (generates random 32 bytes)
   head -c 32 /dev/urandom | base64 | tr -d '\n' | gcloud secrets versions add ai-foundations-coach-session-secret \
     --project="<YOUR_GCP_PROJECT_ID>" --data-file=-

   # Google OAuth Client Secret
   printf "%s" "<YOUR_GOOGLE_OAUTH_CLIENT_SECRET>" | gcloud secrets versions add ai-foundations-coach-oidc-client-secret \
     --project="<YOUR_GCP_PROJECT_ID>" --data-file=-

   # Optional auditor API key
   printf "none" | gcloud secrets versions add ai-foundations-coach-auditor-api-key \
     --project="<YOUR_GCP_PROJECT_ID>" --data-file=-
   ```

5. **Retrieve the live service URL:**
   ```bash
   gcloud run services describe ai-foundations-coach --region <YOUR_GCP_REGION> --format='value(status.url)'
   ```
   > **Note:** In the Google Cloud Console (APIs & Services ➔ Credentials), add `<YOUR_LIVE_URL>/api/auth/admin/callback` to your OAuth 2.0 Client ID's **Authorized Redirect URIs**.

---

### 4. GitHub Actions Automated CI/CD Setup

Continuous deployment is triggered on version tags (`v*`).

1. **Configure Repository Variable:**
   In your repository: **Settings ➔ Secrets and variables ➔ Actions ➔ Variables**, create:
   * `CLOUD_DEPLOYMENT_READY` = `true`

2. **Configure Environment Variables:**
   Under **Settings ➔ Environments**, verify the `staging` and `staging-promote` environments have the following variables (generated by Terraform output):
   * `GCP_PROJECT_ID`: `<YOUR_GCP_PROJECT_ID>`
   * `GCP_REGION`: `<YOUR_GCP_REGION>`
   * `GCP_SERVICE`: `ai-foundations-coach`
   * `GCP_ARTIFACT_REPOSITORY`: `ai-foundations-coach`
   * `GCP_DEPLOY_SERVICE_ACCOUNT`: `ai-foundations-coach-deploy@<YOUR_GCP_PROJECT_ID>.iam.gserviceaccount.com`
   * `GCP_WORKLOAD_IDENTITY_PROVIDER`: `projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/ai-foundations-coach-github/providers/github-actions`

3. **Deploy a Release:**
   Tag and push to main/cloud-beta:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
   The workflow runs Go tests, Playwright browser suites, and Firestore emulator integration, builds a multi-arch container, performs zero-downtime candidate smoke tests, and promotes traffic.

---

### 5. Runtime Environment Variables Reference

| Variable | Purpose / Default |
| :--- | :--- |
| `AUTH_REQUIRED` | Require learner sign-in; defaults off locally, forced on in hosted mode |
| `STATE_BACKEND` | `file` (default for local development) or `firestore` (required on Cloud Run) |
| `STATE_FILE` | Persistent JSON state path; required when `STATE_BACKEND=file` |
| `FIRESTORE_PROJECT_ID` | GCP Project holding the Cloud Firestore database |
| `SESSION_SECRET_FILE` | Path to mounted secret file for cookie signing (required on Cloud Run) |
| `OIDC_CLIENT_SECRET_FILE` | Path to mounted secret file for Google OAuth (required on Cloud Run) |
| `PUBLIC_BASE_URL` | Public canonical base URL for invite links and OIDC callback validation |
| `OIDC_ISSUER` | OIDC issuer URL (e.g. `https://accounts.google.com`) |
| `OIDC_CLIENT_ID` | OIDC Client ID |
| `OIDC_REQUIRE_MFA` | Enforce Multi-Factor Authentication claim for administrator sign-ins |
| `ADMIN_EMAILS` | Comma-separated allowlist of administrator emails |
| `SEAT_CAP` | Maximum allowed active accounts and pending invites (default `1000`) |
| `TUTOR_ENABLED` | Enable or disable the hosted AI tutor |
| `DAILY_SPEND_CEILING_USD` | Shared daily hosted AI spend ceiling (default `1.00`) |
| `MONTHLY_BUDGET_USD` | Monthly budget ceiling for cost controls (default `30`) |

---

### Using your own local AI on the hosted site

The hosted server cannot reach a learner's computer, so the learner's browser talks to their AI directly (FR-021a). In **Settings → Your own AI on this computer**, tick **Use my own local AI**, then:

1. Start Ollama so it accepts the site, for example `OLLAMA_ORIGINS=https://<your-site> ollama serve`.
2. Pull a model: `ollama pull llama3.2:1b`.
3. Click **Check connection**, pick the model, and save. If the browser asks to let the site reach devices on your network, allow it.

Only `localhost` and `127.0.0.1` addresses are accepted. Each question is first checked by the server (`POST /api/tutor/prepare`, the same safety screen as the hosted tutor), then sent from the browser to the local AI. The server makes no AI call and spends nothing.

Browser support, as tested on 2026-11-04 (T129):

- **Chrome (macOS):** works. Chrome blocks the first request until the learner allows the site to reach devices on their local network, from the prompt at the left of the address bar. A Check connection pressed before allowing stays on "Checking…", so reload the page and press it again.
- **Edge, Firefox, Safari and LM Studio:** not tested yet.

Speed depends on the learner's computer. On a 4-core Intel laptop with 8 GB of memory and no GPU, `llama3.2:1b` took about 100 seconds to start answering and 2 to 3 minutes to finish, because the prompt carries the lesson text. Answers from a model this small can be wrong: the citation shows which lesson section to check.

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
- Hindi text uses [Noto Sans Devanagari](https://github.com/notofonts/devanagari) (Devanagari subset, variable weight), © 2022 The Noto Project Authors, under the [SIL Open Font License 1.1](web/public/fonts/OFL.txt). It is served from the app's own origin and loaded only when Devanagari text is on screen (SPEC-009 R12).

