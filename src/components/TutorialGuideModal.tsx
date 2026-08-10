import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getThemeConfig } from "../lib/themeConfig";
import {
  X,
  BookOpen,
  Download,
  Search,
  FileText,
  Sliders,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Layers,
  Wand2,
  Terminal,
  Zap,
  Video
} from "lucide-react";

export const TutorialGuideModal: React.FC = () => {
  const { isTutorialModalOpen, setIsTutorialModalOpen, currentTheme, currentBrand } = useAuth();
  const theme = getThemeConfig(currentTheme, currentBrand);

  const [activeTab, setActiveTab] = useState<"download" | "dictionary" | "prompts" | "matrix">("download");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isTutorialModalOpen) return null;

  const downloadableFiles = [
    {
      name: "COMPLETE_USER_GUIDE_TUTORIAL.txt",
      path: "/docs/COMPLETE_USER_GUIDE_TUTORIAL.txt",
      size: "8 KB",
      format: "Plain Text (.txt)",
      description: "Exhaustive user guide explaining every single button, control, dropdown, field, and workflow in the studio."
    },
    {
      name: "PROMPT_ENGINEERING_MASTERCLASS.txt",
      path: "/docs/PROMPT_ENGINEERING_MASTERCLASS.txt",
      size: "5 KB",
      format: "Plain Text (.txt)",
      description: "Step-by-step masterclass on writing prompts, commands, raw ideas, and high-retention script structures."
    },
    {
      name: "BUTTONS_AND_CONTROLS_REFERENCE.txt",
      path: "/docs/BUTTONS_AND_CONTROLS_REFERENCE.txt",
      size: "6 KB",
      format: "Plain Text (.txt)",
      description: "Complete itemized reference dictionary of all UI controls, toggles, parameters, and action triggers."
    },
    {
      name: "COMPLETE_USER_GUIDE.md",
      path: "/docs/COMPLETE_USER_GUIDE.md",
      size: "7 KB",
      format: "Markdown (.md)",
      description: "Markdown version of the complete user manual with formatted headings, code blocks, and cheat sheets."
    }
  ];

  const controlsList = [
    {
      category: "Main Input Controls",
      name: "Raw Script / Idea Box",
      purpose: "Primary input field for pasting raw thoughts, rough notes, article text, or YouTube video transcripts.",
      bestSetting: "Paste bullet points or raw outlines; the AI expands and structures them automatically.",
      action: "Type or Paste text into the box."
    },
    {
      category: "Main Input Controls",
      name: "Clear Input Button",
      purpose: "Instantly flushes the raw text box clean to start a new project.",
      bestSetting: "Click when switching to a completely new script topic.",
      action: "Empties text area."
    },
    {
      category: "Main Input Controls",
      name: "Paste From Clipboard",
      purpose: "One-click shortcut to paste clipboard contents straight into the generator.",
      bestSetting: "Use after copying text from browser or notes app.",
      action: "Appends copied text."
    },
    {
      category: "Main Input Controls",
      name: "Load Sample Preset",
      purpose: "Populates a high-performing example script to quickly test AI transformation modes.",
      bestSetting: "Great for first-time users or testing speed.",
      action: "Fills sample text."
    },
    {
      category: "Configuration Dropdowns",
      name: "Domain Selector (50+ Topics)",
      purpose: "Applies domain-specific context, technical jargon, and background knowledge.",
      bestSetting: "Match exact video niche (e.g., AI, Civil Engineering, Finance, Islamic, Gaming).",
      action: "Click to filter or select domain."
    },
    {
      category: "Configuration Dropdowns",
      name: "Tutorial & Literature Tool Tone (50+ Tones)",
      purpose: "Sets the emotional frequency, rhythm, and literary style of the voiceover speaker.",
      bestSetting: "Use 'Fast Paced Explainer' for Shorts, 'Dramatic Narrative' for documentaries, or 'Warm Friendly' for vlogs.",
      action: "Click to filter or select tone."
    },
    {
      category: "Configuration Dropdowns",
      name: "Script Transformation Mode",
      purpose: "Defines output format and primary language (English, Urdu, Roman Urdu, Dual Language, Shorts, Documentary).",
      bestSetting: "Select 'Shorts/Reels (60s)' for vertical video or 'Roman Urdu' for South Asian audiences.",
      action: "Selects transformation engine."
    },
    {
      category: "Configuration Dropdowns",
      name: "Voice Persona",
      purpose: "Adjusts tone of voice, pacing, and delivery style for voiceover synthesis.",
      bestSetting: "'Deep Documentary Narrator' for mystery/crime, 'Energetic Hype' for tech/gaming.",
      action: "Sets speaker persona."
    },
    {
      category: "Output & Length Settings",
      name: "Word Count / Length Target",
      purpose: "Target word count or duration calculation (100 words ~ 45s, 300 words ~ 2 min, 600 words ~ 4 min).",
      bestSetting: "120-150 words for 60-second vertical reels; 600+ words for long YouTube videos.",
      action: "Slide or type number."
    },
    {
      category: "Output & Length Settings",
      name: "Greetings Prefix",
      purpose: "Pre-populates opening greeting line.",
      bestSetting: "'Assalamualaikum' for Islamic/Pakistani content, 'Hello Guys' for general YouTube.",
      action: "Selects greeting."
    },
    {
      category: "Output & Length Settings",
      name: "Hooks, Body & Conclusion Toggle",
      purpose: "Forces 3-part retention structure: Hook (0-5s), Core Body, Call-To-Action (CTA).",
      bestSetting: "Always keep ON for viral retention on YouTube and social media.",
      action: "Toggle ON/OFF."
    },
    {
      category: "Output & Length Settings",
      name: "Fast Lite Mode Toggle",
      purpose: "Bypasses B-Roll visual notes for ultra-fast generation of clean voiceover text.",
      bestSetting: "Turn ON if you only need the voice text quickly without visual scene cues.",
      action: "Toggle ON/OFF."
    },
    {
      category: "Output & Length Settings",
      name: "Target Country Audience",
      purpose: "Adapts cultural slang, local currency, and geographic relevance.",
      bestSetting: "Select Pakistan, India, USA, UK, or UAE depending on primary viewers.",
      action: "Select country."
    },
    {
      category: "Action Buttons",
      name: "Generate Polished Script",
      purpose: "Sends prompt and configuration to Google Gemini AI to construct the final script.",
      bestSetting: "Click when all parameters are selected.",
      action: "Executes generation pipeline."
    },
    {
      category: "Action Buttons",
      name: "Shots Calculator (Scene Splitter)",
      purpose: "Calculates video duration, total camera shots, and splits script into B-roll scenes with visual prompts.",
      bestSetting: "Use after generating script to get complete video editing scene breakdown.",
      action: "Opens B-Roll Scene Splitter."
    },
    {
      category: "Action Buttons",
      name: "Check Plagiarism",
      purpose: "Verifies script uniqueness score and originality.",
      bestSetting: "Use before publishing to ensure 100% unique script output.",
      action: "Runs plagiarism scan."
    }
  ];

  const promptExamples = [
    {
      title: "Viral Tech Shorts Prompt",
      rawInput: "Explain why Quantum Computers will replace regular computers in 2026. Keep it exciting for teenagers.",
      recommendedSettings: "Shorts / Reels (60s) | Exciting Tech Enthusiast | Energetic Hype Persona | Hooks ON | 140 Words",
      outputStructure: "Hook: 'What if your phone could solve 10,000 years of math in 3 seconds?' -> Body: Explains qubit superposition simply -> CTA: 'Subscribe for daily tech mind-blows!'"
    },
    {
      title: "History / Crime Documentary Script",
      rawInput: "The mystery of DB Cooper skyjacking in 1971. How he jumped out of a plane with $200k and vanished.",
      recommendedSettings: "Documentary Style | Dramatic Narrative | Deep Documentary Narrator | History | 800 Words",
      outputStructure: "Visual Cues: [B-Roll: Rain-slicked runway in 1971, flickering cabin lights] -> Suspenseful narrative breakdown -> Unresolved theories."
    },
    {
      title: "Islamic Spiritual Reminder (Roman Urdu)",
      rawInput: "Patience (Sabr) in hard times and why Allah tests the people He loves.",
      recommendedSettings: "Roman Urdu / Hindi | Islamic / Religious Tone | Warm Storyteller | Greetings: Assalamualaikum",
      outputStructure: "Opening: 'Assalamualaikum Dosto, jab zindagi mushkil ho jaye...' -> Quranic context -> Comforting conclusion."
    }
  ];

  const downloadTextFile = (content: string, filename: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadAllInOneFile = () => {
    const combinedContent = `================================================================================
SCRIPT AUTOMATION STUDIO - COMPLETE DOCUMENTATION BUNDLE
================================================================================

1. USER MANUAL & CONTROLS DICTIONARY
${controlsList.map(c => `
[${c.name}] (${c.category})
• Purpose: ${c.purpose}
• Best Setting: ${c.bestSetting}
• Action: ${c.action}
`).join("")}

================================================================================
2. PROMPT ENGINEERING & COMMAND MASTERCLASS
${promptExamples.map(p => `
[${p.title}]
• Input Prompt: "${p.rawInput}"
• Recommended Configuration: ${p.recommendedSettings}
• Output Structure: ${p.outputStructure}
`).join("")}

================================================================================
Generated by Script Automation Studio.
================================================================================`;

    downloadTextFile(combinedContent, "SCRIPT_AUTOMATION_STUDIO_COMPLETE_DOCUMENTATION.txt");
  };

  const filteredControls = controlsList.filter(
    item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col border overflow-hidden transition-all duration-300 ${
          theme.isLight ? "bg-[#FFFFFF] border-[#E5E5E5] text-[#000000]" : "bg-[#141414] border-[#2A2A2A] text-white"
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${
            theme.isLight ? "bg-[#F7F7F7] border-[#E5E5E5]" : "bg-[#1A1A1A] border-[#2A2A2A]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-2xl shadow-md border"
              style={{ backgroundColor: `${theme.accentColor}20`, borderColor: theme.accentColor }}
            >
              <BookOpen className="h-5 w-5" style={{ color: theme.accentColor }} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold font-mono tracking-tight flex items-center gap-2">
                <span>Tutorials & User Manual Center</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm" style={{ backgroundColor: theme.accentColor, color: "#ffffff" }}>
                  Downloadable Text Files
                </span>
              </h2>
              <p className={`text-xs font-mono ${theme.isLight ? "text-[#555555]" : "text-[#BDBDBD]"}`}>
                Exhaustive guide to every button, setting, prompt command, and best selection option
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadAllInOneFile}
              className="px-3.5 py-2 rounded-2xl font-mono text-xs font-bold text-white shadow-lg flex items-center gap-1.5 transition-all cursor-pointer border"
              style={{ backgroundColor: theme.accentColor, borderColor: theme.accentColor }}
              title="Download Complete Text Documentation Bundle"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download Complete Manual (.TXT)</span>
            </button>
            <button
              onClick={() => setIsTutorialModalOpen(false)}
              className={`p-2 rounded-2xl border transition-colors cursor-pointer ${
                theme.isLight ? "hover:bg-[#EAEAEA] border-[#E5E5E5]" : "hover:bg-[#252525] border-[#2A2A2A]"
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`px-6 py-2 border-b flex items-center gap-2 overflow-x-auto scrollbar-none ${
            theme.isLight ? "bg-[#FAFAFA] border-[#E5E5E5]" : "bg-[#111111] border-[#2A2A2A]"
          }`}
        >
          <button
            onClick={() => setActiveTab("download")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer border ${
              activeTab === "download"
                ? "shadow-md text-white border-transparent"
                : (theme.isLight ? "border-transparent text-[#444444] hover:text-[#000000]" : "border-transparent text-[#AAAAAA] hover:text-white")
            }`}
            style={activeTab === "download" ? { backgroundColor: theme.accentColor } : {}}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Downloadable Text Files</span>
          </button>

          <button
            onClick={() => setActiveTab("dictionary")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer border ${
              activeTab === "dictionary"
                ? "shadow-md text-white border-transparent"
                : (theme.isLight ? "border-transparent text-[#444444] hover:text-[#000000]" : "border-transparent text-[#AAAAAA] hover:text-white")
            }`}
            style={activeTab === "dictionary" ? { backgroundColor: theme.accentColor } : {}}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Buttons & Controls Dictionary</span>
          </button>

          <button
            onClick={() => setActiveTab("prompts")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer border ${
              activeTab === "prompts"
                ? "shadow-md text-white border-transparent"
                : (theme.isLight ? "border-transparent text-[#444444] hover:text-[#000000]" : "border-transparent text-[#AAAAAA] hover:text-white")
            }`}
            style={activeTab === "prompts" ? { backgroundColor: theme.accentColor } : {}}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Prompting & Command Masterclass</span>
          </button>

          <button
            onClick={() => setActiveTab("matrix")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer border ${
              activeTab === "matrix"
                ? "shadow-md text-white border-transparent"
                : (theme.isLight ? "border-transparent text-[#444444] hover:text-[#000000]" : "border-transparent text-[#AAAAAA] hover:text-white")
            }`}
            style={activeTab === "matrix" ? { backgroundColor: theme.accentColor } : {}}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Best Selection Matrix</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* TAB 1: DOWNLOADABLE FILES */}
          {activeTab === "download" && (
            <div className="space-y-6">
              <div
                className="p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                style={{ backgroundColor: `${theme.accentColor}10`, borderColor: `${theme.accentColor}40` }}
              >
                <div className="space-y-1">
                  <h3 className="text-sm font-bold font-mono flex items-center gap-2" style={{ color: theme.accentColor }}>
                    <Download className="h-4 w-4" />
                    <span>Downloadable Tutorial Text Files Available</span>
                  </h3>
                  <p className={`text-xs font-mono ${theme.isLight ? "text-[#444444]" : "text-[#CCCCCC]"}`}>
                    You can download these standalone text (.txt) and markdown (.md) guide files directly to your device or view their contents below.
                  </p>
                </div>
                <button
                  onClick={downloadAllInOneFile}
                  className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-white shadow-lg shrink-0 flex items-center gap-2 transition-transform hover:scale-105 cursor-pointer"
                  style={{ backgroundColor: theme.accentColor }}
                >
                  <Download className="h-4 w-4" />
                  <span>Download All (.TXT Bundle)</span>
                </button>
              </div>

              {/* Grid of Downloadable Files */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {downloadableFiles.map((file, idx) => (
                  <div
                    key={file.name}
                    className={`p-5 rounded-2xl border space-y-3 transition-all hover:shadow-lg ${
                      theme.isLight ? "bg-[#F9F9F9] border-[#E5E5E5]" : "bg-[#1A1A1A] border-[#2E2E2E]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-black/10 border border-white/10">
                          <FileText className="h-5 w-5" style={{ color: theme.accentColor }} />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold font-mono truncate max-w-[220px]">{file.name}</h4>
                          <span className={`text-[10px] font-mono ${theme.isLight ? "text-[#666666]" : "text-[#AAAAAA]"}`}>
                            Format: {file.format} • Size: {file.size}
                          </span>
                        </div>
                      </div>
                      <a
                        href={file.path}
                        download={file.name}
                        className="px-3 py-1.5 rounded-xl font-mono text-xs font-bold text-white shadow flex items-center gap-1.5 transition-all cursor-pointer border"
                        style={{ backgroundColor: theme.accentColor, borderColor: theme.accentColor }}
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                    <p className={`text-xs font-mono leading-relaxed ${theme.isLight ? "text-[#444444]" : "text-[#CCCCCC]"}`}>
                      {file.description}
                    </p>
                    <div className="pt-2 border-t flex items-center justify-between text-[10px] font-mono opacity-80" style={{ borderColor: theme.isLight ? "#E5E5E5" : "#2E2E2E" }}>
                      <span>Ready for offline reading</span>
                      <a href={file.path} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1" style={{ color: theme.secondaryAccentColor }}>
                        <span>View Raw</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: BUTTONS & CONTROLS DICTIONARY */}
          {activeTab === "dictionary" && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4" style={{ color: theme.accentColor }} />
                <input
                  type="text"
                  placeholder="Search any button, dropdown, input box, or control setting..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full rounded-2xl py-2.5 pl-10 pr-10 text-xs font-mono border focus:outline-none transition-all ${
                    theme.isLight ? "bg-[#F5F5F5] border-[#E5E5E5] text-[#000000]" : "bg-[#1A1A1A] border-[#2E2E2E] text-white"
                  }`}
                  style={{ borderColor: searchQuery ? theme.accentColor : undefined }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2.5 text-xs font-mono font-bold cursor-pointer"
                    style={{ color: theme.accentColor }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Controls Dictionary List */}
              <div className="space-y-3">
                {filteredControls.map((control, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border space-y-2 transition-all hover:border-white/40 ${
                      theme.isLight ? "bg-[#F9F9F9] border-[#E5E5E5]" : "bg-[#181818] border-[#2A2A2A]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full border shadow-sm" style={{ backgroundColor: `${theme.accentColor}20`, color: theme.accentColor, borderColor: `${theme.accentColor}50` }}>
                          {control.category}
                        </span>
                        <h4 className="text-xs font-extrabold font-mono">{control.name}</h4>
                      </div>
                      <span className={`text-[10px] font-mono ${theme.isLight ? "text-[#666666]" : "text-[#AAAAAA]"}`}>
                        {control.action}
                      </span>
                    </div>

                    <p className={`text-xs font-mono leading-relaxed ${theme.isLight ? "text-[#333333]" : "text-[#DDDDDD]"}`}>
                      <strong>Purpose:</strong> {control.purpose}
                    </p>

                    <p className={`text-xs font-mono leading-relaxed ${theme.isLight ? "text-[#555555]" : "text-[#BBBBBB]"}`}>
                      <strong style={{ color: theme.secondaryAccentColor }}>Best Setting / Selection:</strong> {control.bestSetting}
                    </p>
                  </div>
                ))}
                {filteredControls.length === 0 && (
                  <div className="text-center py-8 font-mono text-xs opacity-60">
                    No controls match your search "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PROMPTING & COMMAND MASTERCLASS */}
          {activeTab === "prompts" && (
            <div className="space-y-6">
              <div className={`p-4 rounded-2xl border space-y-2 ${theme.isLight ? "bg-[#F5F5F5] border-[#E5E5E5]" : "bg-[#1A1A1A] border-[#2E2E2E]"}`}>
                <h3 className="text-sm font-bold font-mono flex items-center gap-2" style={{ color: theme.accentColor }}>
                  <Terminal className="h-4 w-4" />
                  <span>How to Write Prompts & Commands for 10/10 Script Results</span>
                </h3>
                <p className={`text-xs font-mono leading-relaxed ${theme.isLight ? "text-[#444444]" : "text-[#CCCCCC]"}`}>
                  You do NOT need perfect grammar or formal formatting in the raw script input box. What matters most is <strong>Context</strong>, <strong>Angle</strong>, and <strong>Target Audience</strong>.
                </p>
              </div>

              {/* Examples Cards */}
              <div className="space-y-4">
                {promptExamples.map((item, index) => (
                  <div
                    key={index}
                    className={`p-5 rounded-2xl border space-y-3 ${
                      theme.isLight ? "bg-[#F9F9F9] border-[#E5E5E5]" : "bg-[#181818] border-[#2A2A2A]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold font-mono flex items-center gap-2" style={{ color: theme.accentColor }}>
                        <Sparkles className="h-4 w-4" />
                        <span>{item.title}</span>
                      </h4>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(item.rawInput);
                          setCopiedIndex(index);
                          setTimeout(() => setCopiedIndex(null), 2000);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                          copiedIndex === index
                            ? "bg-green-600 text-white border-green-600"
                            : (theme.isLight ? "bg-white border-[#E5E5E5]" : "bg-[#222222] border-[#333333]")
                        }`}
                      >
                        {copiedIndex === index ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Copied Prompt</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Input Prompt</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className={`p-3 rounded-xl border text-xs font-mono font-bold ${theme.isLight ? "bg-white border-[#E5E5E5] text-[#111111]" : "bg-[#111111] border-[#2E2E2E] text-white"}`}>
                      "{item.rawInput}"
                    </div>

                    <div className="text-xs font-mono space-y-1">
                      <p><strong style={{ color: theme.secondaryAccentColor }}>Recommended Configuration:</strong> {item.recommendedSettings}</p>
                      <p className={`opacity-80 ${theme.isLight ? "text-[#444444]" : "text-[#CCCCCC]"}`}><strong>Output Structure:</strong> {item.outputStructure}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: BEST SELECTION MATRIX */}
          {activeTab === "matrix" && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border space-y-2 ${theme.isLight ? "bg-[#F5F5F5] border-[#E5E5E5]" : "bg-[#1A1A1A] border-[#2E2E2E]"}`}>
                <h3 className="text-sm font-bold font-mono flex items-center gap-2" style={{ color: theme.accentColor }}>
                  <Zap className="h-4 w-4" />
                  <span>Platform Selection Cheat Sheet</span>
                </h3>
                <p className={`text-xs font-mono leading-relaxed ${theme.isLight ? "text-[#444444]" : "text-[#CCCCCC]"}`}>
                  Use these optimal preset selections for your target video platform:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-5 rounded-2xl border space-y-2 ${theme.isLight ? "bg-[#F9F9F9] border-[#E5E5E5]" : "bg-[#181818] border-[#2A2A2A]"}`}>
                  <h4 className="text-xs font-bold font-mono flex items-center gap-2" style={{ color: theme.accentColor }}>
                    <Video className="h-4 w-4" />
                    <span>YouTube Shorts / TikTok / Reels</span>
                  </h4>
                  <ul className="text-xs font-mono space-y-1.5 opacity-90 leading-relaxed">
                    <li>• <strong>Transformation:</strong> Shorts / Reels Script (60s)</li>
                    <li>• <strong>Word Count:</strong> 120 - 150 words</li>
                    <li>• <strong>Tone:</strong> Fast Paced Explainer</li>
                    <li>• <strong>Voice Persona:</strong> Energetic Hype Creator</li>
                    <li>• <strong>Hooks & CTA:</strong> Always Enabled (ON)</li>
                  </ul>
                </div>

                <div className={`p-5 rounded-2xl border space-y-2 ${theme.isLight ? "bg-[#F9F9F9] border-[#E5E5E5]" : "bg-[#181818] border-[#2A2A2A]"}`}>
                  <h4 className="text-xs font-bold font-mono flex items-center gap-2" style={{ color: theme.secondaryAccentColor }}>
                    <Video className="h-4 w-4" />
                    <span>Long-Form YouTube Explainer (5-10 Min)</span>
                  </h4>
                  <ul className="text-xs font-mono space-y-1.5 opacity-90 leading-relaxed">
                    <li>• <strong>Transformation:</strong> Explainer Video (2-3 Min) / Polisher</li>
                    <li>• <strong>Word Count:</strong> 600 - 1200 words</li>
                    <li>• <strong>Tone:</strong> Science-Based / Professional Clear</li>
                    <li>• <strong>Voice Persona:</strong> Professional Male/Female</li>
                    <li>• <strong>Fast Lite Mode:</strong> Disabled (Keep Visual B-Roll Notes)</li>
                  </ul>
                </div>

                <div className={`p-5 rounded-2xl border space-y-2 ${theme.isLight ? "bg-[#F9F9F9] border-[#E5E5E5]" : "bg-[#181818] border-[#2A2A2A]"}`}>
                  <h4 className="text-xs font-bold font-mono flex items-center gap-2" style={{ color: theme.accentColor }}>
                    <Video className="h-4 w-4" />
                    <span>Urdu / Hindi Cultural Vlogs</span>
                  </h4>
                  <ul className="text-xs font-mono space-y-1.5 opacity-90 leading-relaxed">
                    <li>• <strong>Transformation:</strong> Roman Urdu / Hindi Creator</li>
                    <li>• <strong>Tone:</strong> Warm Friendly Conversational or Food Blogger</li>
                    <li>• <strong>Greeting:</strong> Assalamualaikum / Hey Everyone</li>
                    <li>• <strong>Audience:</strong> Pakistan / India</li>
                  </ul>
                </div>

                <div className={`p-5 rounded-2xl border space-y-2 ${theme.isLight ? "bg-[#F9F9F9] border-[#E5E5E5]" : "bg-[#181818] border-[#2A2A2A]"}`}>
                  <h4 className="text-xs font-bold font-mono flex items-center gap-2" style={{ color: theme.secondaryAccentColor }}>
                    <Video className="h-4 w-4" />
                    <span>Crime & History Documentaries</span>
                  </h4>
                  <ul className="text-xs font-mono space-y-1.5 opacity-90 leading-relaxed">
                    <li>• <strong>Transformation:</strong> Documentary Style</li>
                    <li>• <strong>Word Count:</strong> 800 - 1500 words</li>
                    <li>• <strong>Tone:</strong> Dramatic Narrative</li>
                    <li>• <strong>Voice Persona:</strong> Deep Documentary Narrator</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`px-6 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono ${
            theme.isLight ? "bg-[#F7F7F7] border-[#E5E5E5]" : "bg-[#1A1A1A] border-[#2A2A2A]"
          }`}
        >
          <span className="opacity-80">
            Need help? Click <strong>Download All (.TXT Bundle)</strong> to get complete offline text manuals.
          </span>
          <button
            onClick={downloadAllInOneFile}
            className="px-4 py-2 rounded-xl font-bold text-white shadow flex items-center gap-1.5 cursor-pointer border shrink-0"
            style={{ backgroundColor: theme.accentColor, borderColor: theme.accentColor }}
          >
            <Download className="h-4 w-4" />
            <span>Download All Text Manuals</span>
          </button>
        </div>
      </div>
    </div>
  );
};
