# Nexa & Gotham Typography System + 8-Tier Target Audience Engine

Unifies the entire Script Automation Studio interface under the **Nexa** and **Gotham** geometric font families across every surface (navbar, cards, buttons, lightboxes/modals, inputs, and dropdowns) and upgrades the **Target Audience** selector into a custom themed 8-tier demographic engine that dynamically adapts AI script generation wording, pacing, and cultural honorifics.

## User Review & Critical Decisions

> [!IMPORTANT]
> Both design and UX choices have been confirmed from your answers and are baked into this plan.

- **Confirmed Decision 1 — Global Font Family**: Apply a combined **Nexa** and **Gotham** geometric sans-serif font stack across all UI elements (cards, navbar, buttons, lightboxes/modals, badges, inputs, and dropdowns), replacing the previous `Inter` / `Sora` / `JetBrains Mono` mix while preserving `Noto Nastaliq Urdu` strictly for Urdu script output and `tabular-nums` for aligned numbers.
- **Confirmed Decision 2 — Target Audience Selector Style**: Replace the native 3-option `<select>` box with a **custom themed dropdown card** featuring age-range badges, clear demographic labels, and speaking-style subtitles matching the Domain and Tone selector cards.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Global Nexa & Gotham Typography**: Every visual surface—from the sticky top navbar and workspace glass cards to buttons, dropdown menus, and modal lightboxes (Auth, API Key, Settings, Admin Command Console, Image Studio, and Tutorials)—renders in the clean, modern geometric **Nexa / Gotham** typeface family.
  2. **8-Tier Demographic Target Audience Selector**: Expands audience targeting to cover **All Ages (Universal)**, **Children / Kids (Up to 10)**, **Teenagers (Up to 20)**, **Young Adults (Up to 30)**, **Adults (Up to 40)**, **Mature Men / Adults (Up to 50)**, **Senior Men (Up to 60)**, and **Elders / Old (Up to 80)**.
  3. **Demographic-Aware AI Script Generation**: The backend AI prompt engine adapts vocabulary complexity, sentence rhythm, emotional hooks, and cultural honorifics (across English, Urdu Nastaliq, Roman Urdu, Hindi Devanagari, and 40+ languages) to match the exact age bracket selected.
- **Target Audience / Persona**: Content creators, YouTube automation producers, educators, and voiceover scriptwriters targeting specific age demographics.
- **Key Value**: Eliminates the inconsistent monospace/coding font appearance across buttons and dropdowns in favor of a cohesive studio-grade geometric brand identity, while giving creators fine-grained demographic control over script tone and wording.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Unified Studio Typography**:
   - On page load, all headings, card titles, navbar controls, buttons, dropdown triggers, option lists, and lightbox dialogs render in the **Nexa / Gotham** font stack.
   - Numeric counters (word counts, durations, timestamps, scene counts) automatically apply `tabular-nums` so numbers align cleanly without reverting to a jarring coding monospace font.
2. **Selecting a Target Audience**:
   - In the left control column, the **Target Audience** card displays the currently active demographic along with its age badge (e.g., `All Ages`, `Up to 10 Yrs`, `21–30 Yrs`, `61–80 Yrs`).
   - Clicking the trigger opens a themed dropdown list showing all **8 audience tiers**, each with an age badge, title, and a brief description of the writing style.
   - Selecting any option updates the active state immediately and shows a quick summary of the linguistic style below the trigger.
3. **Generating Audience-Tailored Scripts**:
   - Clicking **Generate** (or generating a draft from a Topic) sends the selected audience ID to the backend, which injects the specific age-group vocabulary, pacing, and honorific rules into the Gemini system instructions.

### Visual Identity & Theme
- **Aesthetic Direction**: High-craft dark/day SaaS studio interface with crisp geometric typography and high-contrast red (`#FF073A`) and blue (`#2774FC`) brand accents.
- **Typography & Hierarchy**:
  - **Primary UI & Display Stack (`--font-sans`, `--font-display`, `--font-mono`)**: `"Nexa", "Gotham", "Montserrat", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif` loaded via CDN stylesheets with geometric webfont fallbacks so every device renders authentic geometric letterforms.
  - **Urdu Script Exception (`.font-nastaliq`)**: Preserves `"Noto Nastaliq Urdu"` exclusively for Urdu Nastaliq script output blocks.
  - **Numeric Discipline**: Enforces `font-variant-numeric: tabular-nums` across counters, timers, and data tables.
- **Interactive Feedback & Motion**: Smooth dropdown expand/collapse transitions, active selection highlights using the active brand accent color, and single-line truncation safety on all buttons and badges.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Unified Geometric Font Stack Over Monospace UI Labels**
  - *Chosen Approach*: Map `--font-sans`, `--font-display`, and `--font-mono` (plus global element selectors for `button`, `input`, `select`, `textarea`, `option`, cards, navbar, and modals) to the **Nexa / Gotham** family stack.
  - *Why*: Previously, utility classes like `font-mono` caused buttons, badges, and dropdown items to render in `JetBrains Mono` (a code editor font). Mapping the theme tokens and UI selectors to the Nexa/Gotham stack immediately unifies the entire website without breaking existing component layout classes.
  - *Alternatives Considered*: Editing hundreds of individual `className` strings in isolation without updating theme tokens—passed over because centralizing the font stack in theme tokens plus global UI selectors guarantees 100% coverage across all cards, modals, and dropdowns.

- **Decision 2: 8-Tier Demographic Prompt Engineering**
  - *Chosen Approach*: Define 8 structured demographic profiles with explicit linguistic directives (vocabulary level, pacing, hooks, and Urdu/Hindi/English cultural honorifics) shared between the UI and the AI generation engine:
    1. **All Ages (`all`)**: Universal, inclusive, clear, and engaging for the whole family (`For All Ages`).
    2. **Children & Kids (`children_10`)**: Playful, curiosity-filled, ultra-simple words, lively expressions (`Up to 10 Years`).
    3. **Teenagers (`teenagers_20`)**: Fast-paced, high-retention, energetic hooks, modern relatable examples (`Up to 20 Years`).
    4. **Young Adults (`young_30`)**: Dynamic, aspirational, actionable, career & lifestyle growth focus (`Up to 30 Years`).
    5. **Adults (`adults_40`)**: Analytical, articulate, evidence-backed, practical & persuasive (`Up to 40 Years`).
    6. **Mature Men & Adults (`men_50`)**: Seasoned, authoritative, pragmatic, leadership & stability focus (`Up to 50 Years`).
    7. **Senior Men (`men_60`)**: Dignified, composed, classic vocabulary, respectful honorifics (`Up to 60 Years`).
    8. **Elders & Old (`old_80`)**: Warm, soothing, unhurried, crystal-clear, deeply respectful honorifics (`Up to 80 Years`).
  - *Why*: Ensures that selecting a target audience visibly and meaningfully transforms the generated voiceover script in every language.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     GLOBAL TYPOGRAPHY ENGINE (CSS)                       │
│  Nexa + Gotham Webfonts ──► --font-sans / --font-display / --font-mono   │
│  Applied to: Body · Navbar · Glass Cards · Buttons · Modals · Dropdowns  │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                TARGET AUDIENCE SELECTOR CARD (Frontend)                  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Active Badge ("Up to 30 Yrs" / "For All") + Custom Dropdown List   │  │
│  │  • all          ──► Universal Audience (For All Ages)              │  │
│  │  • children_10  ──► Children & Kids (Up to 10 Years)               │  │
│  │  • teenagers_20 ──► Teenagers & Youth (Up to 20 Years)             │  │
│  │  • young_30     ──► Young Adults (Up to 30 Years)                  │  │
│  │  • adults_40    ──► Adults & Professionals (Up to 40 Years)        │  │
│  │  • men_50       ──► Mature Men & Adults (Up to 50 Years)           │  │
│  │  • men_60       ──► Senior Men (Up to 60 Years)                    │  │
│  │  • old_80       ──► Elders & Seniors (Up to 80 Years)              │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ POST { targetAudience, ... }
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│               DEMOGRAPHIC PROMPT ADAPTER (Backend Server)                │
│   Maps selected targetAudience ID ──► Age-Specific Linguistic Directive   │
│  • Injects into /api/generate (4-language parallel script rephraser)     │
│  • Injects into /api/generate-topic (Topic-to-Script draft generator)    │
└──────────────────────────────────────────────────────────────────────────┘
```

### Interactive Component & State Mapping
- **Target Audience Dropdown State**:
  - Controlled by `targetAudience` (defaulting to `"all"` or `"adults_40"`) and `isAudienceDropdownOpen` boolean state.
  - Clicking any of the 8 audience options updates `targetAudience`, closes the dropdown panel, and displays the selected audience's badge and style summary on the card.
- **Backend Demographic Prompt Resolution**:
  - Both `/api/generate` and `/api/generate-topic` resolve `targetAudience` (supporting both the new 8-tier IDs and any legacy values) into detailed instructions governing sentence length, emotional tone, cultural politeness markers (`Aap`, `Janab`, `Buzurgo` vs. casual `Dosto`), and narrative pacing.
