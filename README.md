# 🎬 Script Automation Studio
### AI Script Automation, Storyboard Prompts & YouTube Growth Suite

> An all-in-one AI production suite engineered for content creators, YouTubers, social media growth managers, documentary filmmakers, and educators. Transforms raw ideas, rough notes, or unformatted video transcripts into 100% original, viral-retention voiceover scripts, shot-by-shot cinematic storyboard prompts, YouTube CTR metadata packages, and thumb-stopping visual concepts.

🌐 **Launch the Live Web App**: [https://script-automation-studio.ai.studio/](https://script-automation-studio.ai.studio/)  
👑 **Created by**: Muhammad Tehseen Irshad  
🏷️ **Brand**: Moni Visual Pro  
⚡ **Access**: Instant Web App & PWA — or run locally in 1 click via `run-app.bat` (Windows) / `run-app.sh` (Linux & macOS) with zero Firebase setup.  
📄 **License**: [MIT License](./LICENSE.md)

---

## 📑 Table of Contents

1. [Overview & Why Script Automation Studio?](#1-overview--why-script-automation-studio)
2. [Instant Access & Web App Installation (PWA)](#2-instant-access--web-app-installation-pwa)
3. [Local Standalone Mode, Launcher Scripts & Multi-Provider LLM](#3-local-standalone-mode-launcher-scripts--multi-provider-llm)
   - [Security Model for Local Clones](#security-model-for-local-clones)
   - [Quick Start: Windows (`run-app.bat` & `build.bat`)](#quick-start-windows-run-appbat--buildbat)
   - [Quick Start: Linux & macOS (`run-app.sh` & `build.sh`)](#quick-start-linux--macos-run-appsh--buildsh)
   - [OS-Specific Notes (Windows, macOS & Linux)](#os-specific-notes-windows-macos--linux)
   - [Multi-Provider LLM Engine & Built-In Local Engine](#multi-provider-llm-engine--built-in-local-engine)
4. [Quick Start: The 4-Step Production Pipeline](#4-quick-start-the-4-step-production-pipeline)
5. [Left Sidebar: Core Script Configuration Engine](#5-left-sidebar-core-script-configuration-engine)
   - [Voice Persona (Speaker)](#voice-persona-speaker)
   - [Domain (50+ SEO Niches)](#domain-50-seo-niches)
   - [Tutorial & Literature Tool (50+ Tones)](#tutorial--literature-tool-50-tones)
   - [Transformation Option (Multi-Language Engine)](#transformation-option-multi-language-engine)
   - [Target Audience (8-Tier Demographic Engine)](#target-audience-8-tier-demographic-engine)
   - [Target Regions / Countries](#target-regions--countries)
   - [Script Length (Word Count vs. Video Duration)](#script-length-word-count-vs-video-duration)
   - [Greeting (Prefix)](#greeting-prefix)
   - [Custom Hook Input & Sectional Structuring](#custom-hook-input--sectional-structuring)
   - [Fast Lite Mode Toggle](#fast-lite-mode-toggle)
6. [Script Workspace: Input Sources & Polished Voiceover](#6-script-workspace-input-sources--polished-voiceover)
   - [Input Source: Topic, Video URL & Files](#input-source-topic-video-url--files)
   - [RAW SOURCE SCRIPT Box & Voice Speech-to-Text](#raw-source-script-box--voice-speech-to-text)
   - [POLISHED V.O. SCRIPT Output Box & Audio TTS Player](#polished-vo-script-output-box--audio-tts-player)
7. [Cinematic Storyboard & Scene Prompt Creator](#7-cinematic-storyboard--scene-prompt-creator)
   - [TRANSCRIPT INPUT & Parameters](#transcript-input--parameters)
   - [Duration-Based Shots Calculator](#duration-based-shots-calculator)
   - [GENERATED SCENE PROMPTS & Storyboard Manager](#generated-scene-prompts--storyboard-manager)
8. [YouTube & Social Media Growth Strategist Suite](#8-youtube--social-media-growth-strategist-suite)
   - [Growth Strategist Sidebar Toggles](#growth-strategist-sidebar-toggles)
   - [Video Transcript Input](#video-transcript-input)
   - [CTR YT & SM Output Breakdown](#ctr-yt--sm-output-breakdown)
9. [Thumbnail Director & Tagline Studio](#9-thumbnail-director--tagline-studio)
   - [Thumbnail Design Sidebar Controls](#thumbnail-design-sidebar-controls)
   - [Thumbnail Transcript Input & Character Photo Upload](#thumbnail-transcript-input--character-photo-upload)
   - [YT Thumbnails Prompt Output (Google Flow, Nano Banana 2 & Flux 1)](#yt-thumbnails-prompt-output-google-flow-nano-banana-2--flux-1)
10. [Top Navigation, Themes & In-App Documentation](#10-top-navigation-themes--in-app-documentation)
11. [Optimal Configuration Presets Reference](#11-optimal-configuration-presets-reference)
12. [Brand, Author & License](#12-brand-author--license)

---

## 1. Overview & Why Script Automation Studio?

**Script Automation Studio** is designed and architected by **Muhammad Tehseen Irshad** under the **Moni Visual Pro** brand. 

Content creators face three major bottlenecks:
1. **Scriptwriter's Block & Plagiarism Risks**: Rewriting existing articles or transcripts manually takes hours, and generic AI often produces robotic, copyrighted, or hallucinated output.
2. **Visual Storyboard Formatting**: Translating a 10-minute script into 40+ specific B-roll prompts for Runway, Kling, Midjourney, or Flux requires meticulous framing, lighting, and camera angle notation.
3. **Packaging & Algorithm Discoverability**: High-retention hooks, 10 high-CTR title variations, SEO descriptions, timestamped chapters, and click-worthy thumbnail concepts are often treated as an afterthought.

**Script Automation Studio** solves all three in a single, fluid workspace. From an initial raw idea or video link, creators can generate:
- 100% plagiarism-free voiceover scripts in 40+ languages and dialects (including Urdu Nastaliq, Roman Urdu, and polished English).
- Exact shot-by-shot cinematic storyboard prompts with an automated B-roll duration calculator.
- Complete YouTube & TikTok CTR metadata packages (titles, descriptions, timestamps, tags, hashtags).
- Precision thumbnail prompts for Google Flow, Nano Banana 2, and Flux 1 (including ComfyUI node fields and negative prompts).

---

## 2. Instant Access & Web App Installation (PWA)

Use the live cloud web application immediately without installing anything, **or** clone the repository from GitHub to run 100% locally using the automated launcher scripts (Section 3):

### 👉 **[https://script-automation-studio.ai.studio/](https://script-automation-studio.ai.studio/)**

### 📱 1-Click Desktop & Mobile App (PWA)
- **Windows / macOS / Linux**: Open the link in Google Chrome, Microsoft Edge, or Brave. Click the **Install App** icon in the address bar to add **Script Automation Studio** as a dedicated desktop application with native windowing and offline caching.
- **Android / iOS**: Open the link in Chrome or Safari. Tap **Share / Options** ➔ **Add to Home Screen** to run it as a full-screen mobile app with microphone permissions.

---

## 3. Local Standalone Mode, Launcher Scripts & Multi-Provider LLM

When you clone this repository from GitHub, **no Firebase project, authentication, or cloud account is required**. The app automatically detects local standalone mode and runs directly against your `.env` configuration or in-app Settings.

### Security Model for Local Clones
The provided launcher scripts (`run-app.bat` / `run-app.sh`) and build scripts (`build.bat` / `build.sh`) enforce strict security defaults:
- **Zero-Secret Repository**: `.gitignore` ignores all `.env*` files (except `.env.example`) and `firebase-applet-config.json`, ensuring your personal API keys are never committed to Git.
- **Auto-Generated CSPRNG Secret**: On first run, the launcher copies `.env.example` to `.env` and automatically writes a cryptographically random 256-bit `ENCRYPTION_SECRET` (generated via Node `crypto.randomBytes(32)`) without printing it to the terminal.
- **Owner-Only File Permissions (Linux/macOS)**: `run-app.sh` enforces `chmod 600 .env` so only your local user account can read your API keys.
- **Pre-Flight Safety Checks**: Scripts verify **Node.js v18+**, block unsafe working-directory edge cases, and check whether port `3000` is already in use before starting the server.

---

### Quick Start: Windows (`run-app.bat` & `build.bat`)

1. Install **Node.js 20 LTS** from [https://nodejs.org/](https://nodejs.org/) (check *"Automatically install PATH"* during setup).
2. Clone or download this repository and open the folder.
3. **Run in 1 Click**: Double-click **`run-app.bat`** (or run from PowerShell / Command Prompt):
   ```bat
   :: Start local development server (installs dependencies & generates .env on first run)
   run-app.bat

   :: Start and automatically open http://localhost:3000 in your browser
   run-app.bat --open

   :: Build & launch optimized production server (dist\server.cjs)
   run-app.bat --prod
   ```
4. **Standalone Build Only**: Run **`build.bat`** to verify TypeScript and create the production bundle inside `.\dist`:
   ```bat
   build.bat
   :: Optional: clean reinstall node_modules first
   build.bat --reinstall
   ```

---

### Quick Start: Linux & macOS (`run-app.sh` & `build.sh`)

1. Open your Terminal inside the cloned repository folder and make the scripts executable once:
   ```bash
   chmod +x run-app.sh build.sh
   ```
2. Launch the studio:
   ```bash
   # Start local development server (bootstraps .env & installs dependencies on first run)
   ./run-app.sh

   # Start and automatically open http://localhost:3000 in your default browser
   ./run-app.sh --open

   # Build (if needed) & run optimized production server (NODE_ENV=production)
   ./run-app.sh --prod
   ```
3. **Standalone Build Only**: Run **`./build.sh`** to run TypeScript checks (`npm run lint`) and output the production bundle (`dist/server.cjs` + `dist/index.html`):
   ```bash
   ./build.sh
   # Optional: clean reinstall dependencies before building
   ./build.sh --reinstall
   ```

---

### OS-Specific Notes (Windows, macOS & Linux)

#### 🪟 Windows 10 / 11
- **Windows SmartScreen**: If Windows shows *"Windows protected your PC"* when double-clicking `run-app.bat` from a `.zip` download, click **More info** ➔ **Run anyway** (the `.bat` file is plain-text and fully inspectable).
- **Windows Defender Firewall**: On first launch, Windows may ask to allow Node.js on private networks — click **Allow access** (or leave only *Private networks* checked).
- **Localhost IPv6 Latency with Ollama / LM Studio**: On Windows, `localhost` sometimes resolves to `::1` before `127.0.0.1`. Use **`http://127.0.0.1:1234/v1`** (LM Studio) or **`http://127.0.0.1:11434/v1`** (Ollama) in `.env` or Settings for instant connection.
- **Line Endings in Git**: If using Git Bash on Windows, keep `.sh` scripts with LF endings if you plan to run them inside WSL2.

#### 🍎 macOS (Apple Silicon M1–M4 & Intel)
- **Installing Node.js**: Install via Homebrew (`brew install node`) or the official macOS `.pkg` installer from [https://nodejs.org/](https://nodejs.org/). Verify with `node -v` (requires v18+, recommended v20 LTS).
- **Executable Permission**: If downloaded as a `.zip` from GitHub, macOS strips `+x` permissions; run `chmod +x run-app.sh build.sh` once in Terminal.
- **Microphone Dictation**: macOS requires granting Terminal / Chrome / Safari **Microphone permission** under *System Settings ➔ Privacy & Security ➔ Microphone* to use voice dictation.
- **Ollama / LM Studio on Apple Silicon**: Unified memory on M-series Macs lets you run quantized 7B–32B models offline smoothly via `http://127.0.0.1:11434/v1` (Ollama) or `http://127.0.0.1:1234/v1` (LM Studio).

#### 🐧 Linux (Ubuntu, Debian, Fedora, Arch)
- **Avoid `sudo`**: Never run `./run-app.sh`, `./build.sh`, or `npm install` with `sudo` — doing so creates root-owned files in `node_modules` and `.env`. Install Node.js 20 LTS cleanly via [`nvm`](https://github.com/nvm-sh/nvm) or NodeSource/distro packages.
  - *Ubuntu / Debian example*:
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```
  - *Fedora*: `sudo dnf install -y nodejs`
  - *Arch*: `sudo pacman -S nodejs npm`
- **Executable Bit**: Run `chmod +x run-app.sh build.sh` before running `./run-app.sh`.
- **Headless / SSH Servers**: Avoid passing `--open` over SSH without X11/Wayland; open `http://<server-ip>:3000` in your workstation browser or tunnel port `3000` via SSH (`ssh -L 3000:127.0.0.1:3000 user@host`).
- **Ollama on Linux**: Make sure the systemd service is active (`sudo systemctl status ollama`) and point `LOCAL_LLM_URL` to `http://127.0.0.1:11434/v1`.

---

### Multi-Provider LLM Engine & Built-In Local Engine
- **Online Published Web App**: Supports **Google Gemini**, **OpenAI**, and **Anthropic Claude** (API keys encrypted per user).
- **Local GitHub Clone (`STANDALONE_MODE=true`)**: Supports all 3 cloud APIs **plus** two offline local options in **Configure AI Provider -> Local Engine**:
  1. **Built-In Engine (`local-engine/` — Recommended, Zero External Apps Needed)**:
     - **Step 1 (`local-engine/bin/`)**: Download **`llama-b12202-bin-win-vulkan-x64.zip`** (Windows Vulkan GPU + CPU) or your macOS/Linux release from [llama.cpp Releases](https://github.com/ggml-org/llama.cpp/releases) and extract its files inside **`local-engine/bin/`** (`llama-server.exe` or `llama-server`).
     - **Step 2 (`local-engine/models/`)**: Download any **Qwen `.gguf`** model (e.g., `Qwen2.5-7B-Instruct-Q4_K_M.gguf` or `Qwen3-8B-Q4_K_M.gguf`) with 1 click inside the **Configure AI Provider** modal (or copy `.gguf` files manually into **`local-engine/models/`**).
     - **Step 3 (GPU / CPU Mode)**: Choose **GPU + CPU (Vulkan Offload)** or **CPU Only Mode** and click **Start & Activate Built-In Engine** (`http://127.0.0.1:1279/v1`).
  2. **External Local Server (LM Studio / Ollama / Bionic LLM Studio)**:
     - Set `LOCAL_LLM_URL=http://127.0.0.1:1234/v1` (LM Studio) or `http://127.0.0.1:11434/v1` (Ollama) and `LOCAL_LLM_MODEL=your-model-name`.
     - Cost: **$0.00** forever, 100% private & offline.

> **Custom Port**: If port `3000` is already busy on your machine, set `PORT=3001` (or any free port) inside `.env` and re-run `run-app.bat` / `./run-app.sh`.

---

## 4. Quick Start: The 4-Step Production Pipeline

```
[1. Input Source]           [2. Core Settings]           [3. Generation]               [4. Publishing Suite]
• Raw Text / Outlines  ──>  • 50+ SEO Domains      ──>   • Polished Voiceover Script   ──>  • 10 High-CTR Titles
• Topic Generator           • 50+ Narrative Tones        • Plagiarism-Free (100%)           • SEO Description & Tags
• Video URL / PDF File      • 8 Demographic Tiers        • Multi-Language Translation       • Timestamps & Chapters
• Speech-to-Text Mic        • Target Countries           • Cinematic Storyboard Shots       • Thumbnail AI Prompts
```

1. **Input Your Content**: Type a topic, paste a video URL, drag-and-drop a file, or speak into the Speech-to-Text microphone.
2. **Configure Your Strategy**: Set your niche domain, tone, demographic audience, and target duration/word count.
3. **Generate Voiceover**: Click **GENERATE SCRIPT**. Preview delivery with the built-in **Listen AI (TTS)** voice player.
4. **Deploy Media & Metadata**: Send your script directly into the **Storyboard Creator** for camera prompts, the **Growth Strategist** for titles/tags, and the **Thumbnail Director** for visual concepts.

---

## 5. Left Sidebar: Core Script Configuration Engine

The left sidebar gives you precision control over how the AI writes, formats, and sounds. Every setting directly impacts audience retention and search engine performance.

---

### Voice Persona (Speaker)
- **What It Does**: Switches between **FEMALE** and **MALE** speaker personas for voiceover synthesis and text phrasing.
- **Available Options**: `FEMALE` | `MALE`
- **Why You Need to Adjust This**:
  - **Female Persona**: Optimized for emotional storytelling, healthcare, beauty, self-care, mindfulness, lifestyle vlogs, educational explainers, and welcoming customer tutorials.
  - **Male Persona**: Engineered for deep authoritative documentaries, investigative crime, historical retrospectives, automotive, finance/crypto, sports commentary, and high-energy trailers.
  - *Algorithmic Impact*: Aligning vocal cadence and pronoun usage with your channel's established host voice builds strong brand consistency and subscriber trust.

---

### Domain (50+ SEO Niches)
- **What It Does**: Selects from over 50 specialized industry niches to inject authentic vocabulary, technical terms, and search-optimized keyword clusters.
- **Searchable Dropdown**: Features real-time search filtering.
- **Categories Include**:
  - *Artificial Intelligence (AI)*, *Cybersecurity & Ethical Hacking*, *Computer Science*, *Data Science & Big Data*, *Cloud Computing & DevOps*, *Software Engineering & Coding*, *Web Development & SaaS*.
  - *Finance, Crypto & Investing*, *Digital Marketing & SEO*, *E-Commerce & Dropshipping*, *Real Estate & Property Investment*.
  - *Medical, Health & Biotech*, *Neuroscience & Psychology*, *Fitness, Bodybuilding & Wellness*.
  - *Islamic Studies & Spiritual Reminders*, *Motivation & High Performance*, *Life Coaching & Personal Growth*.
  - *History & Archaeology*, *Geopolitics & World History*, *Documentary Filmmaking*, *Film & Cinema Studies*.
  - *Astronomy & Astrophysics*, *Science & Space Exploration*, *Quantum Physics & Computing*, *Nuclear Energy & Physics*.
  - *Civil Engineering*, *Mechanical & Robotics Engineering*, *Electrical Engineering*, *3D Modeling & CAD Design*, *CGI & VFX Production*, *Animation & Motion Graphics*.
  - *Gaming & Esports*, *Food & Culinary Arts*, *Food Vlogging & Street Food*, *Travel, Adventure & Culture*, *Fashion & Luxury Lifestyle*.
- **Why You Need to Adjust This**:
  - Generic AI sounds robotic. Selecting **Medical, Health & Biotech** instructs the model to use clinical terminology and balanced disclaimers. Selecting **Finance & Crypto** ensures accurate trading terms and risk management context. Selecting **Islamic Studies** embeds dignified phrasing, Quranic references, and proper greetings.
  - Elevates organic YouTube search discoverability by embedding high-intent niche keywords throughout the script.

---

### Tutorial & Literature Tool (50+ Tones)
- **What It Does**: Calibrates the emotional frequency, rhythm, and literary style of the narration.
- **Searchable Dropdown**: Filter instantly by typing keywords like *Hype*, *Storyteller*, *Analytical*, *Poetic*, or *Conversational*.
- **Tones Include**:
  - *Fast Paced Explainer (YouTube/FB)* — snappy, zero-fluff, dynamic transitions for Shorts and Reels.
  - *Dramatic Narrative (Hyped)* — suspense-building, cinematic pauses for true crime and historical events.
  - *Warm Friendly Conversational* — relatable, cozy companion tone for vlogs and lifestyle reviews.
  - *Academic & Research Expert* — rigorous, thesis-driven, evidence-backed educational essays.
  - *Comedy & Sarcastic Commentary* — witty, observational humor for pop-culture and gaming critiques.
  - *Poetic Relatable (Shayari Vibe)* — lyrical, rhythmic Urdu/Hindi cadence with deep emotional resonance.
  - *Luxury & Premium Elegance* — sophisticated, understated vocabulary for luxury real estate, fashion, and supercars.
  - *Scientific Skeptic & Mythbuster* — analytical debunking structure with logical proof points.
  - *Islamic / Religious Tone* — humble, respectful, spiritually uplifting reflection.
  - *Soft Whisper / ASMR Relaxation* — gentle pacing and soothing phonetic delivery.
- **Why You Need to Adjust This**:
  - Viewer drop-off occurs when the emotional tone mismatches the video topic. A high-energy workout video needs *High Energy Motivational Masterclass*, while a bedtime meditation requires *Bedtime Storyteller*.

---

### Transformation Option (Multi-Language Engine)
- **What It Does**: Selects the target language and script writing system for the polished output.
- **Available Languages (40+ Systems)**:
  - 🇵🇰 **اردو تحریر (Nastaliq Script)**: Authentic right-to-left Urdu typography.
  - 🇵🇰 **Urdu Roman (Latin Alphabet)**: English letters phonetically spelling spoken Urdu/Hindi.
  - 🇬🇧 **English (Polished/Fluent)**: Grammatically impeccable international English.
  - 🇮🇳 **Hindi Script (Urdu Wording & Accent)**: Devanagari alphabet preserving authentic spoken Hindustani cadence.
  - 🇪🇸 Spanish, 🇫🇷 French, 🇩🇪 German, 🇸🇦 Arabic, 🇧🇩 Bengali, 🇧🇷 Portuguese, 🇷🇺 Russian, 🇯🇵 Japanese, 🇨🇳 Chinese Simplified, 🇹🇼 Chinese Traditional, 🇮🇩 Indonesian, 🇹🇷 Turkish, 🇮🇹 Italian, 🇰🇷 Korean, 🇮🇷 Persian / Farsi, 🇦🇫 Pashto, 🇵🇰 Sindhi, 🇮🇳 Punjabi, 🇻🇳 Vietnamese, 🇹🇭 Thai, 🇵🇭 Tagalog, and more.
- **Why You Need to Adjust This**:
  - **Urdu Roman** is the highest-converting script format for South Asian creators on YouTube Shorts, TikTok, and Instagram Reels because teleprompters and voiceover artists can read it effortlessly.
  - **Nastaliq Urdu** serves traditional broadcast, Islamic reminders, and formal publications.
  - **English Polished** unlocks international CPMs in Tier-1 countries (US, UK, Canada, Australia).

---

### Target Audience (8-Tier Demographic Engine)
- **What It Does**: Adapts sentence complexity, vocabulary, pace, cultural honorifics, and relatable analogies to a specific age demographic.
- **Demographic Tiers**:
  1. `All Ages · Universal Audience`: Balanced, clear, inclusive, and universally relatable phrasing.
  2. `Children / Kids (Up to 10 Years)`: Playful, wonder-filled, simple vocabulary, lively expressive cues.
  3. `Teenagers & Youth (Up to 20 Years)`: Fast-paced, high-retention hooks, dynamic rhythm, modern analogies.
  4. `Young Adults (Up to 30 Years)`: Ambitious, actionable, career/lifestyle growth perspective.
  5. `Adults & Professionals (Up to 40 Years)`: Analytical, articulate, practical, evidence-backed high-value prose.
  6. `Men & Mature Adults (Up to 50 Years)`: Seasoned, authoritative, pragmatic, leadership-focused delivery.
  7. `Senior Men & Veterans (Up to 60 Years)`: Dignified, composed, classic vocabulary, respectful honorifics.
  8. `Old / Elders & Seniors (Up to 80 Years)`: Highly respectful, calm, soothing, unhurried, crystal-clear wording.
- **Why You Need to Adjust This**:
  - A script designed for teenagers will bore senior professionals if filled with slang, while a children's video will fail if loaded with academic jargon. Matching demographic tiers guarantees viewers feel spoken to directly.

---

### Target Regions / Countries
- **What It Does**: Customizes regional slang, localized currencies, geographic metaphors, and cultural touchpoints.
- **Supported Regions**: Pakistan, India, Bangladesh, Saudi Arabia, UAE, United Kingdom, United States, Canada, Australia, Germany, France, Japan, Turkey, and 25+ more.
- **Why You Need to Adjust This**:
  - A finance video targeted to Pakistan will reference PKR, State Bank of Pakistan, and local inflation indices. The same script targeted to the United States will reference USD, the Federal Reserve, and 401(k) accounts. Selecting your target country ensures instant local relevance.

---

### Script Length (Word Count vs. Video Duration)
- **What It Does**: Sets your precise script output volume using two intuitive calculation modes.
  - **By Word Count**: Manual slider or number input (0 to 20,000 words) with one-click presets: `300 words`, `1500 words`, `10,000 words`, and `20,000 words`.
  - **By Video Duration**: Enter desired target video minutes (e.g., 15 minutes). The engine automatically calculates the target volume using standard spoken voiceover pacing (~145 words per minute).
- **Why You Need to Adjust This**:
  - **60-Second Shorts / Reels**: Keep word count strictly between **120 and 150 words** so the voiceover never rushes.
  - **10-Minute YouTube Explainer**: Set between **1,400 and 1,600 words** to comfortably hit mid-roll ad thresholds without stretching thin.

---

### Greeting (Prefix)
- **What It Does**: Customizes the opening line of your video script.
- **Presets**: `Asslamoalaikum` (Default for Islamic & South Asian channels), `Adaab`, `Namaste`, `Greetings`, `Welcome`, `None`, plus a custom text input field.
- **Why You Need to Adjust This**:
  - Your opening 3 seconds establish community rapport. Islamic channels maintain tradition with *Asslamoalaikum*, corporate presenters use *Welcome*, and fast-paced faceless channels select *None* to jump straight into the hook.

---

### Custom Hook Input & Sectional Structuring
- **What It Does**:
  - **Custom Hook Input Box**: Enter your own custom opening question or curiosity gap (e.g., *"Kya aap jante hain?"*, *"What if everything you knew about AI was wrong?"*).
  - **Include Hooks, Body & Conclusion Toggle**: Forces the generator to structure the output into a proven 3-act retention framework:
    1. **Curiosity Hook (0–5s)**: Stops the scroll and introduces an irresistible mystery.
    2. **Core Body**: High-value narrative points with natural conversational momentum.
    3. **Call-To-Action (CTA)**: Frictionless conclusion directing viewers to subscribe, like, or comment.
- **Why You Need to Adjust This**:
  - 70% of viewers abandon online videos within the first 10 seconds if there is no strong hook. Enabling this structure guarantees maximum audience retention curves on YouTube and TikTok analytics.

---

### Fast Lite Mode Toggle
- **What It Does**: Strips out visual bracketed cues (such as `[B-Roll: Close up shot of engine]`) and generates pure, unformatted voiceover text at maximum speed.
- **Why You Need to Adjust This**:
  - Toggle **ON** when you already have your video footage and only need a clean voiceover script for audio recording or AI speech synthesis.
  - Toggle **OFF** when you need full directorial guidance with camera shot suggestions embedded between narration lines.

---

## 6. Script Workspace: Input Sources & Polished Voiceover

The main upper workspace features a side-by-side editing interface designed for speed, revision, and audio preview.

---

### Input Source: Topic, Video URL & Files
Above the script boxes, the **Input Source** switcher lets you import content four different ways:
1. **● Topic**: Type any topic title (e.g., *"How Black Holes Bend Space-Time"*), specify your word count limit, and click **GENERATE DRAFT**. The engine researches and creates a comprehensive first draft from scratch.
2. **● Video URL**: Paste any YouTube, Facebook, TikTok, or Instagram video link and click **GET YOUTUBE TRANSCRIPT** to automatically extract and format the underlying video dialogue.
3. **● Files**: Drag and drop `.txt` or standard `.pdf` documents (research papers, scripts, ebook chapters) to load them directly into the workspace.
4. **Insert Sample Script Button**: Instantly loads a production-grade sample script to test different transformation modes and tones.

---

### RAW SOURCE SCRIPT Box & Voice Speech-to-Text
- **Textarea Area**: Paste your rough outlines, bullet points, article snippets, or messy notes.
- **Real-Time Character Counter**: Displays live character volume in the top-right header badge.
- **🎙️ Speech-to-Text Mic (Gemini Voice Scriptwriter)**: Click the microphone icon to dictate ideas verbally. A live animated waveform displays while the AI transcribes your voice in real-time. Click **Finish & Save Script** when done.
- **🗑️ Clear Button**: Empties the box with one click to begin a fresh project.
- **Why You Need This**:
  - You do not need to write polished sentences in the Raw box. The engine takes fragmented thoughts and transforms them into cohesive, professional prose.

---

### POLISHED V.O. SCRIPT Output Box & Audio TTS Player
- **Output Screen**: Displays the fully transformed, plagiarism-free script formatted with headings, paragraph breaks, and visual cues.
- **100% Plagiarism-Free Badge**: Real-time verification badge confirming zero duplicate phrasing.
- **🎙️ Voice Speaker Dropdown**: Filter and select available speech synthesis voices installed in your browser.
- **🔊 LISTEN AI (TTS Player)**: Synthesizes your script into natural spoken audio directly inside the app, letting you hear the cadence before recording.
- **➕ INSERT Button**: Transfers the polished script down into the **Transcript Input** of the Scene Splitter or Growth Strategist with one click.
- **📋 COPY TXT Button**: Copies the entire script to your clipboard.
- **💾 DOWNLOAD Button**: Saves the script as a formatted `.txt` file onto your device.

---

## 7. Cinematic Storyboard & Scene Prompt Creator

Located directly below the script workspace, this studio divides long scripts into timestamped, camera-ready scenes for video editors and AI video/image generators (Midjourney, Runway, Kling, Pika, Flux).

---

### TRANSCRIPT INPUT & Parameters
- **Paste Box**: Paste your voiceover script or click **INSERT** to pull it down from the polished script box above.
- **CATEGORY Dropdown**: Synced with your 50+ SEO domains to ensure scene visuals match your exact topic aesthetic.
- **SCENES Input (1 to 100)**: Specify how many individual scene shots you want the video divided into.
- **FORMAT Dropdown**:
  - `16:9 (Horizontal)`: YouTube and cinematic widescreen.
  - `9:16 (Vertical)`: TikTok, YouTube Shorts, Instagram Reels.
  - `1:1 (Square)`: Social media carousels and album covers.
  - `None`: Unrestricted framing.
- **PROMPT LINES Depth**: Set the descriptive depth of each scene prompt (between 3 and 50 lines; default is **15 lines** of cinematic lighting, camera angle, actor emotion, and environment instructions).
- **🎙️ Voice Explainer Mic**: Dictate custom scene directions verbally.

---

### Duration-Based Shots Calculator
- **How to Open**: Click the **Calculator icon** next to the Scenes count input.
- **Inputs**:
  - `VIDEO MINS`: Video length in minutes (e.g., 10 minutes).
  - `VIDEO SECS`: Remaining seconds (e.g., 30 seconds).
  - `SHOT TIME (SEC)`: Average duration of each B-roll shot on screen (e.g., 6 seconds per cut for fast-paced videos, 10 seconds for calm explainers).
- **Automated Output**:
  - Calculates the exact **Total Shots Required** and automatically sets the **SCENES** input count to match your timeline.

---

### GENERATED SCENE PROMPTS & Storyboard Manager
- **GENERATE SCENE PROMPTS Button**: Triggers the AI director to build your storyboard.
- **Individual Scene Cards**:
  - **Line Count Badge**: Shows exact prompt depth (e.g., *15 Lines*).
  - **Copy Button**: Copies that single scene's prompt.
  - **.TXT Button**: Downloads an individual scene prompt file.
  - **Regen Button**: Regenerates that specific scene while keeping the rest of your storyboard intact.
  - **Editable Textbox**: Tweak prompt wording directly on the card.
- **Batch Actions**:
  - **COPY ALL**: Copies all numbered scenes to clipboard.
  - **.TXT Download**: Exports complete storyboard as a plain-text production sheet.
  - **.DOCX Download**: Exports formatted Word document ready for client or team review.
  - **CLEAR**: Resets storyboard workspace.

---

## 8. YouTube & Social Media Growth Strategist Suite

Faceless and automated channels require comprehensive metadata to trigger YouTube's recommendation algorithm. This suite turns your script into a complete CTR package.

---

### Growth Strategist Sidebar Toggles
Control which metadata components get generated with dedicated switches:
- **Title Option**: Generates **10 High-CTR Title Variations** in English, Urdu, and Hindi.
- **SEO Description**: Writes a 3-paragraph search-optimized summary with keywords naturally embedded.
- **Chronological Timestamps**: Generates YouTube video chapters with timestamps (e.g., `00:00 - Introduction`). Includes a **Time Estimator (Duration)** input box (e.g., `10:00` or `15:30`) to calculate realistic chapter intervals.
- **Hashtags**: Generates **15 Viral Hashtags** tailored to trending search categories.
- **SEO Keywords Tags**: Generates **15 Comma-Separated Video Tags** ready to paste into YouTube Studio's tag box.

---

### Video Transcript Input
- Paste your completed script or click **INSERT POLISHED VO**.
- Features an **Import File** button for `.txt`/`.pdf` transcripts and a **Speech-to-Text Mic**.

---

### CTR YT & SM Output Breakdown
- **GEN CTR Button**: Generates the complete metadata package.
- **Individual "Copy Key" & "Regenerate" Buttons**: Each metadata card (Titles, Description, Timestamps, Hashtags, Tags) has its own independent regenerate button so you can refresh titles without losing your description.
- **COPY ALL & .TXT Download**: Export your complete SEO package in seconds.

---

## 9. Thumbnail Director & Tagline Studio

Thumbnails account for over 80% of click-through rate decisions. This studio directs high-impact thumbnail compositions, typography overlays, and negative prompts.

---

### Thumbnail Design Sidebar Controls
- **Transformation Option (Language)**: Select overlay text language (Urdu, Hindi, English, Arabic, Spanish, etc.).
- **Target Niche**: Synced with your 50+ domain categories for relevant background themes.
- **Prompt text Headline (Optional)**: Input your desired primary text (e.g., *"SECRET REVEALED"*).
- **Prompt Small Tagline (Optional)**: Input your secondary teaser text (e.g., *"99% of people miss this"*).
- **🎨 Thumbnail Background Color & Gradient**:
  - `PRESET`: Dark Green & Black, Neon Green & Deep Charcoal, Neon Blue & Dark Purple, Sunset Orange & Crimson, Neon Red & Charcoal.
  - `SOLID`: Color picker for any custom solid hex color.
  - `GRADIENT`: Two color pickers (Color A & Color B) with a **Live Gradient Preview Bar**.
- **✍️ Thumbnail Text Color Overlay**:
  - `PRESETS`: Neon Green & White, Golden Yellow & White.
  - `CUSTOM COLOR`: Pick Primary Text and Accent/Shadow colors. Includes 6 one-click quick swatches (*Blue Highlight & White*, *Neon Green & Silver*, *Golden Yellow*, *Sunset Orange*, *Electric Pink*, *Vivid Purple*) plus a **Live Contrast Preview**.

---

### Thumbnail Transcript Input & Character Photo Upload
- Paste your transcript or click **INSERT POLISHED VO**.
- **📸 Character Pic (Optional)**: Click to attach a PNG/JPG photo of your channel host, mascot, or brand avatar. The AI will weave this exact character's features into the visual prompt.

---

### YT Thumbnails Prompt Output (Google Flow, Nano Banana 2 & Flux 1)
- **External Google Flow Link**: Directly opens Google's advanced image generation playground (`https://labs.google/fx/tools/flow`).
- **Engine Selector**:
  1. **Nano Banana 2**:
     - *Cinematic Visual Specification*: High-detail scene prompt describing background lighting, facial expression, and focal depth.
     - *Overlay Headline*: Punchy, high-contrast headline text in your chosen language.
     - *Overlay Tagline*: Supporting curiosity tagline.
  2. **Flux 1**:
     - *Scene Prompt (Positive)*: Pure visual English prompt with zero text or letters.
     - *Negative Prompt (Anti-Text)*: Anti-artifact prompt filtering out distorted hands, watermarks, and gibberish letters.
     - *Poster Text Overlay Node Fields*: Code-ready node parameters (`heading_text`, `tagline_text`, `text_color`, `stroke_color`, `stroke_width`, `heading_y_percent`, `tagline_y_percent`).
     - *EmptyLatentImage Dimensions*: Exact pixel dimensions for ComfyUI / Flux nodes (e.g., Width 1024, Height 1820).
- **Google Flow Studio Integration**: Copy your Flux 1 or Nano Banana 2 prompts directly into **Google Flow** (`https://labs.google/fx/tools/flow`) or ComfyUI to render the final thumbnail image.

---

## 10. Top Navigation, Themes & In-App Documentation

- **🔴 Red / 🔵 Blue Brand Switcher**: Toggles primary and secondary accent palettes across all panels and controls.
- **☀️ Day / 🌙 Night Mode**: Switches between pure crisp high-contrast **Day Mode** (`#000000` black typography on `#FAFAFA`/`#FFFFFF`) and **Night Mode** (`#FFFFFF` white typography on `#141414`/`#1A1A1A`).
- **⚙️ Settings**: Configures your preferred AI provider, model tier, and generation preferences.
- **🔑 API Key**: Securely configure your own key for **Google Gemini**, **OpenAI**, **Anthropic Claude**, or a **Local LLM** endpoint (LM Studio, Ollama, Bionic LLM Studio).
- **📖 Tutorial & User Manual Center (Book Icon)**:
  - Click the **Book Open icon** in the top navigation to view the built-in manual center.
  - Download offline documentation bundles anytime:
    - `COMPLETE_USER_GUIDE_TUTORIAL.txt`
    - `PROMPT_ENGINEERING_MASTERCLASS.txt`
    - `BUTTONS_AND_CONTROLS_REFERENCE.txt`
    - `COMPLETE_USER_GUIDE.md`
    - Interactive formatted HTML guides (`User Guide`, `Masterclass`, `Controls`) with full Day/Night & Red/Blue theme synchronization.

---

## 11. Optimal Configuration Presets Reference

| Video Format | Recommended Transformation | Target Word Count | Recommended Tone | Voice Persona | Key Controls to Enable |
|---|---|---|---|---|---|
| **YouTube Shorts / TikTok / Reels** | Shorts / Reels Script (60s) or Urdu Roman | 120 – 150 words | Fast Paced Explainer | Energetic / Hype | Hooks & CTA Toggle: ON, 9:16 Aspect Ratio |
| **Long-Form Explainer (10–15 Min)** | English Polished or Urdu Roman | 1,400 – 2,200 words | Science-Based / Deep Informative | Professional Male/Female | Fast Lite: OFF, Shots Calculator: Enabled |
| **Documentary / Crime / Mystery** | Documentary Style | 800 – 1,500 words | Dramatic Narrative (Hyped) | Deep Documentary Narrator | Flux 1 Engine, 16:9 Landscape Storyboard |
| **Islamic Spiritual Reminder** | اردو تحریر or Urdu Roman | 300 – 600 words | Islamic / Religious Tone | Warm Friendly / Calm Storyteller | Greeting: *Asslamoalaikum*, Regional Nuances |
| **Tech & AI News Breakdown** | English or Roman Urdu | 500 – 800 words | Exciting Tech Enthusiast | Energetic | 10 High-CTR Titles, Timestamps, 15 Viral Hashtags |

---

## 12. Brand, Author & License

- **Software Name**: Script Automation Studio
- **Brand**: Moni Visual Pro
- **Architect & Author**: Muhammad Tehseen Irshad
- **Live Web App**: [https://script-automation-studio.ai.studio/](https://script-automation-studio.ai.studio/)
- **License**: MIT License (see [LICENSE.md](./LICENSE.md))

