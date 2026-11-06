# AI Foundations Coach: Application Usage Guide 📖

Welcome to the **AI Foundations Coach**! This guide walks you through every feature of the application, from 1-click startup to using adaptive audience modes, playing with interactive simulators, using Audio Studio 2.0, and speaking with the grounded AI Teaching Assistant.

---

## ⚡ 1-Minute Quick Start

### 1. Start the Application
In your terminal, navigate to the repository and run:
```bash
./start.sh
```
This automatically:
- Checks and cleans up any old processes on ports `8080` and `3000`.
- Starts the **Go Backend API Server** (`http://localhost:8080`).
- Starts the **Vite React Web UI** (`http://localhost:3000`).
- Redirects and stores logs under `logs/server.log` and `logs/web.log`.

### 2. Open the App in Your Browser
Open **[http://localhost:3000](http://localhost:3000)** in Chrome, Safari, Firefox, or Edge.

### 3. Stop the Application Anytime
```bash
./stop.sh
```

---

## 🎚️ 3 Adaptive Audience Journeys & Chip's Trail

### First-Time Journey Chooser
When launching the application for the first time, learners are greeted by a friendly three-way chooser presenting all three journeys equally:
- **Kids (Ages 8–14)**: Guided by Chip the Robot with colourful clay cards, tactile illustrations, and Chip's Trail.
- **Plain English**: Friendly everyday non-technical intuitions, jargon busters, and relatable workplace analogies.
- **Standard**: Canonical technical curriculum derived from Microsoft AI-For-Beginners with formal definitions and architecture diagrams.

Your journey preference is saved in this browser and can be switched anytime.

### Dedicated Sub-Header Toolbar
A dedicated toolbar sits directly below the top application bar on both Home and Lesson pages:
- **Segmented 44 px Tabs**: Switch between Standard, Kids, and Plain English at any point. Mid-lesson switches stop narration and reset scroll to the top.
- **Compact Voice Studio (`🤖`)**: Open voice persona and mute controls.

### Kids Home: Chip's Trail
Young explorers in Kids mode experience a playful, focused curriculum interface:
- **Continue Card**: Displays Chip alongside the next unfinished lesson stop with a direct 1-click action to jump straight in.
- **Winding Trail Path**: 6 illustrated stops on a winding path showing your status (*Done*, *You are here*, or *Next*). When completing a lesson, Chip hops forward along the trail!
- **Celebration Banner**: Finishing all six stops shows a recap with replay and quiz links.

| Journey | Target Audience | Guide Persona | Characteristics |
| :--- | :--- | :--- | :--- |
| **🎓 Standard** | University & Adult Learners | Prof. Alan | Canonical academic foundations. Complete formulas, architecture diagrams, and formal definitions. |
| **🚀 Kids (Ages 8–14)** | Young Explorers & Middle School | **Chip the Robot 🤖** | Story-driven trail with original approved clay illustrations, everyday physical metaphors, and Flesch-Kincaid Grade 4–6 reading levels. |
| **💡 Plain English** | Non-Technical Professionals | **Nova 🎙️** | Executive summaries, workplace intuitions, zero math barriers, and relatable everyday analogies. |

---

## 🕹️ 6 Hands-On Interactive Simulators

Each lesson embeds a mathematical playground designed to build physical intuition:

### 1. Lesson 1: The Turing Test Stage (`TuringWidget`)
* **Theme:** *Behind the Velvet Curtain: Spot the Bot!*
* **How to Play:** Read the two mystery answers given to the detective's question. Vote on whether **Terminal A** or **Terminal B** is the AI. 
* **The Magic:** Clicking a choice slides open the animated velvet curtain to reveal either the robot (`🤖`) or human contestant (`🧑‍💻`) with sound effects!

### 2. Lesson 2: The Mars Rover Live Lab (`ExpertSystemWidget`)
* **Theme:** *The Giant Book of If-Then Rules (Symbolic AI)*
* **How to Play:** Inspect the interactive animated Mars Rover character exploring the red planet.
* **Interactive Controls:**
  - **🧹 Solar Panels:** Click the solar panels to sweep away Martian dust with sparkles (`✨`).
  - **🔋 Battery Voltage:** Toggle normal (14V) vs. low (<10V) battery levels.
  - **📡 Antenna Dish:** Rotate the dish to align with Earth or simulate communication blackout.
  - **🌙 Environment:** Toggle between daytime sun and starry Martian night with the moon **Phobos** (`🌕`).
  - **🛠️ Auto-Fix Button:** Restore all systems to 100% nominal in a single tap.
* **Observe:** Watch the **If-Then Rules** fire with real-time green/red badges (`Fired 🔥`) and see the rover's digital face react: `( ^‿^ )` when nominal, or flashing red siren `( >_< 🚨 )` during emergencies!

### 3. Lesson 3: Sparky the Brain Cell (`PerceptronWidget`)
* **Theme:** *Single Neuron Fruit Sorter*
* **How to Play:** Teach an artificial neuron how to tell sweet apples apart from sour lemons.
* **Interactive Controls:**
  - **🛒 Conveyor Belt:** Drop an **Apple 🍎**, **Lemon 🍋**, or **Mystery Fruit 🍇** onto the input scales.
  - **🍬 Sugar Sensitivity (Weight $w_1$):** Adjust how much Sparky loves sweetness.
  - **⚽ Roundness Sensitivity (Weight $w_2$):** Adjust how much Sparky values spherical shape.
  - **⚖️ Pickiness Meter (Bias $b$):** Change the activation hurdle.
* **The Magic:** When the weighted sum reaches zero or higher, Sparky’s lightbulb lights up bright yellow (`💡`), his eyes celebrate `( ⚡^‿^⚡ )`, and he shoots the fruit into the Apple Basket!

### 4. Lesson 4: Robot Magic Sunglasses (`ConvolutionWidget`)
* **Theme:** *Computer Vision 3×3 Matrix Filter Lab*
* **How to Play:** Discover how self-driving cars and facial recognition software detect edges.
* **Interactive Controls:**
  - **🎨 Pixel Art Presets:** Pick a **Pixel Cat 🐱**, **Space Rocket 🚀**, or draw your own by clicking the 6×6 squares!
  - **🕶️ Magic Lenses:** Switch between *Vertical Edges*, *Horizontal Edges*, *Crisp Sharpen*, *Gentle Blur*, and *Outline Ridge*.
  - **🔍 Sliding Lens Window:** Click on the 4×4 output grid to slide the cyan magnifying glass across the drawing and watch the mathematical multiplication calculate in real time.

### 5. Lesson 5: Word Constellations (`VectorMathWidget`)
* **Theme:** *Semantic Embeddings & Outer Space Word Math*
* **How to Play:** Experience how AI calculates with meanings like numbers.
* **Interactive Controls:**
  - **Choose a Word Formula:**
    - `👑 King - 👨 Man + 👩 Woman = 👸 Queen`
    - `🐾 Puppy - 🐕 Dog + 🐈 Cat = 🐱 Kitten`
    - `🗼 Paris - 🇫🇷 France + 🇯🇵 Japan = 🏯 Tokyo`
  - **Explore the Galaxy:** Click any star node in the 2D constellation map to inspect its coordinates in space.

### 6. Lesson 6: The AI Fairness See-Saw (`BiasDetectiveWidget`)
* **Theme:** *Responsible AI & Algorithmic Bias Detective*
* **How to Play:** Act as the ethics auditor for the Space Academy admissions algorithm.
* **Interactive Controls:**
  - **Historical Training Data Slider:** Adjust training balance from 50% to 95% Earth Base vs. Mars Colony.
  - **Animated See-Saw:** Watch the playground balance scale tilt downward when the training data is skewed (`🔴 Tilted Disparity`).
  - **Audited & Mitigated Toggle:** Activate fairness re-calibration to level out the scale (`🟢 Fair & Balanced`) and meet the EEOC 80% impact rule.

---

## 🎙️ Audio Studio 2.0 & Voice Controls

1. **Floating Audio Controller:** Click the floating speaker button on any lesson to open playback controls.
2. **Switching Narrator Personas:**
   - 🤖 **Chip the Robot:** Upbeat, friendly, and encouraging.
   - 🎙️ **Nova the Storyteller:** Warm, conversational, and natural.
   - 🎓 **Prof. Alan:** Calm, articulate, and insightful.
3. **Live Karaoke Tracking:** As audio narrates, the active sentence and words highlight in real time so students can read along.
4. **Jargon Pronunciation:** Click the small **🔊** badge beside technical terms in glossary boxes to hear their exact phonetic pronunciation.

---

## 🌐 Learning in Hindi (and other languages)

Once Hindi is switched on for the site, a **language menu** appears in the header and in **Settings**. Each language is shown in its own script, for example **हिन्दी**.

1. **Switch language:** pick a language from the menu. The page changes at once, without reloading or losing your progress, and the app remembers your choice on this device only.
2. **First visit:** if your browser prefers Hindi to English, the app opens in Hindi. Otherwise it opens in English.
3. **Not translated yet:** if a lesson or quiz isn't available in your language yet, it's shown in English, with a blue note saying so.
4. **Hindi narration:**
   - Where recorded Hindi narration exists, the 🔊 buttons play it in your chosen narrator's voice.
   - Otherwise the app uses a Hindi voice on your device, if it has one. Most Android phones and many Windows PCs do. On a Mac, add one in System Settings → Accessibility → Spoken Content.
   - If your device has no Hindi voice, the app says so instead of reading Hindi with an English voice.
5. **Tutor in Hindi:** with Hindi chosen, the tutor answers in Hindi, cites the Hindi lesson's sections, and the microphone listens for Hindi.

---

## 🤖 AI Teaching Assistant & Speech-to-Text

Scroll to the bottom of any lesson to chat with the AI Coach:
1. **Text Q&A:** Type your question in the prompt box and hit Enter. The AI streams grounded answers with clickable section references (e.g. `[Lesson 2 § Working Memory]`).
2. **🎙️ Voice Q&A ("Talk to Chip"):** Click the microphone button in the tutor input box to speak your question aloud.
3. **🔊 Read Answer Aloud:** Click the audio button on any tutor reply to have your chosen narrator persona read the answer back to you.

---

## ❓ Help Option & Built-in Interactive Guide

Click the **❓ Help** button in the top navigation bar (or click *❓ Help & Setup Guide* in the footer) at any time to open the interactive help modal.

The Help window contains three dedicated tabs:
1. **📖 How to Use the App:**
   - **3 Adaptive Modes:** Switch between *Standard*, *Kids (8–14)* with Chip 🤖, and *Plain English* with Nova 🎙️ on any lesson.
   - **6 Kid-Friendly Simulators:** Hands-on visual playgrounds (Turing curtain, Mars Rover live lab, Sparky the brain cell fruit sorter, Magic Sunglasses convolution filter, Word galaxy constellations, and the AI Fairness see-saw).
   - **Audio Studio 2.0:** Read along with live karaoke sentence highlighting and neural voice personas.
   - **AI Teaching Assistant:** Grounded, citation-enforced answers with voice input ("Talk to Chip").

2. **🦙 How to Use Local LLM (Ollama):**
   - **Step 1 — Download Ollama:** Visit [ollama.com/download](https://ollama.com/download) for macOS, Linux, or Windows.
   - **Step 2 — Start the Engine:** Run `ollama serve` in your terminal.
   - **Step 3 — Download a Model:** In a new terminal window, run:
     ```bash
     ollama pull llama3.2:1b
     ```
     *(Alternative models supported: `llama3.2:3b`, `deepseek-r1:1.5b`, `phi3`)*
   - **Step 4 — Connect in the App:** Open **Settings ⚙️** (top right), verify Provider is **Local Ollama** (`http://localhost:11434/v1`), set Model Name to `llama3.2:1b`, and click **Test Connection** to verify green ping latency.

3. **🏢 About & Freeware Attribution:**
   - **Developed and distributed as freeware by Qunisphere Pvt Limited, Bangalore.**
   - Freely available for educators, students, classrooms, and curious minds worldwide.

---

## ⚙️ Settings & Configuration

Click the **⚙️ Settings** icon in the top-right navigation bar:
* **AI Provider:** Toggle between **Local Ollama** (`http://localhost:11434/v1`), **Cloud OpenAI**, or **Custom Gateway**.
* **Model Selection:** Switch between models (e.g. `llama3.2:1b`, `gpt-4o-mini`).
* **Test Connection:** Live latency ping to confirm your AI endpoint is reachable.
* **Theme:** Toggle between **Dark Mode** and **Light Mode**.

---

## 🏢 Freeware Notice & Attribution

- **Developed and distributed as freeware by Qunisphere Pvt Limited, Bangalore.**
- Curriculum content is derived from [microsoft/AI-For-Beginners](https://github.com/microsoft/AI-For-Beginners) under the [MIT License](https://github.com/microsoft/AI-For-Beginners/blob/main/LICENSE).
- Application code, simulators, and audio pipeline released under the [MIT License](LICENSE).

---

## 🛑 Summary of Terminal Commands

```bash
# Start both servers (Go + Vite):
./start.sh

# Stop both servers:
./stop.sh

# View live background logs:
tail -f logs/server.log logs/web.log

# Run verification tests:
cd web && npm test
```

