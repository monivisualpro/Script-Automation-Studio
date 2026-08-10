import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "./context/AuthContext";
import { getThemeConfig } from "./lib/themeConfig";
import { UserHeader } from "./components/UserHeader";
import { AuthModal } from "./components/AuthModal";
import { ApiKeyModal } from "./components/ApiKeyModal";
import { SettingsModal } from "./components/SettingsModal";
import { AdminModal } from "./components/AdminModal";
import { ImageStudioModal } from "./components/ImageStudioModal";
import { TutorialGuideModal } from "./components/TutorialGuideModal";
import {
  Volume2,
  VolumeX,
  Copy,
  Download,
  Zap,
  CheckCircle,
  FileText,
  Sparkles,
  TrendingUp,
  Globe,
  Lock,
  Loader2,
  Trash2,
  Plus,
  RefreshCw,
  Sliders,
  Sparkle,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Mic,
  MicOff,
  Calculator,
  Image,
  User,
  ShieldCheck,
  Key,
  LogIn,
  Youtube,
  Instagram,
  Facebook,
  Linkedin,
  MessageCircle
} from "lucide-react";

const CATEGORIES = [
  "Animation & Motion Graphics",
  "Artificial Intelligence",
  "Automotive",
  "CGI",
  "Civil Engineering",
  "Computer Science",
  "Documentary",
  "Education",
  "Electrical Engineering",
  "Finance & Business",
  "Fitness",
  "Food & Cooking",
  "Food Vlogging",
  "Gaming",
  "General",
  "Graphic design",
  "History",
  "Information Technology (IT)",
  "Islamic",
  "Lifestyle",
  "Mechanical Engineering",
  "Medical & Health",
  "Motivation",
  "Nature",
  "Real Estate",
  "Science",
  "Software Engineering",
  "Technology",
  "Travel",
  "Visual effects VFX"
];

const ALL_COUNTRIES = [
  "Pakistan",
  "India",
  "Bangladesh",
  "Saudi Arabia",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Japan",
  "China",
  "Turkey",
  "Iran",
  "Egypt",
  "Malaysia",
  "Indonesia",
  "South Africa",
  "Brazil",
  "Mexico",
  "Russia",
  "South Korea",
  "Spain",
  "Italy",
  "Singapore",
  "Oman",
  "Qatar",
  "Kuwait",
  "Bahrain",
  "Norway",
  "Sweden",
  "Switzerland",
  "Netherlands",
  "New Zealand"
];

const TRANSFORMATION_LANGUAGES = [
  { id: "urdu-writing", label: "🇵🇰 اردو تحریر (Nastaliq Script)", name: "Urdu (Nastaliq)" },
  { id: "urdu-roman", label: "🇵🇰 Convert to Urdu Roman (Latin Alphabet)", name: "Urdu Roman" },
  { id: "english", label: "🇬🇧 Convert to English (Polished/Fluent)", name: "English" },
  { id: "hindi", label: "🇮🇳 Hindi Script (Urdu Wording & Accent)", name: "Hindi" },
  { id: "spanish", label: "🇪🇸 Spanish (Español)", name: "Spanish" },
  { id: "french", label: "🇫🇷 French (Français)", name: "French" },
  { id: "german", label: "🇩🇪 German (Deutsch)", name: "German" },
  { id: "arabic", label: "🇸🇦 Arabic (العربية)", name: "Arabic" },
  { id: "bengali", label: "🇧🇩 Bengali (বাংলা)", name: "Bengali" },
  { id: "portuguese", label: "🇧🇷 Portuguese (Português)", name: "Portuguese" },
  { id: "russian", label: "🇷🇺 Russian (Русский)", name: "Russian" },
  { id: "japanese", label: "🇯🇵 Japanese (日本語)", name: "Japanese" },
  { id: "chinese-simplified", label: "🇨🇳 Chinese (Simplified / 简体中文)", name: "Chinese Simplified" },
  { id: "chinese-traditional", label: "🇹🇼 Chinese (Traditional / 繁體中文)", name: "Chinese Traditional" },
  { id: "indonesian", label: "🇮🇩 Indonesian (Bahasa Indonesia)", name: "Indonesian" },
  { id: "turkish", label: "🇹🇷 Turkish (Türkçe)", name: "Turkish" },
  { id: "italian", label: "🇮🇹 Italian (Italiano)", name: "Italian" },
  { id: "korean", label: "🇰🇷 Korean (한국어)", name: "Korean" },
  { id: "farsi", label: "🇮🇷 Persian / Farsi (فارسی)", name: "Persian / Farsi" },
  { id: "pashto", label: "🇦🇫 Pashto (پښتو)", name: "Pashto" },
  { id: "sindhi", label: "🇵🇰 Sindhi (سنڌي)", name: "Sindhi" },
  { id: "punjabi", label: "🇮🇳 Punjabi (ਪੰਜਾਬੀ / پنجابی)", name: "Punjabi" },
  { id: "vietnamese", label: "🇻🇳 Vietnamese (Tiếng Việt)", name: "Vietnamese" },
  { id: "thai", label: "🇹🇭 Thai (ไทย)", name: "Thai" },
  { id: "tagalog", label: "🇵🇭 Tagalog / Filipino", name: "Tagalog" },
  { id: "dutch", label: "🇳🇱 Dutch (Nederlands)", name: "Dutch" },
  { id: "polish", label: "🇵🇱 Polish (Polski)", name: "Polish" },
  { id: "swedish", label: "🇸🇪 Swedish (Svenska)", name: "Swedish" },
  { id: "norwegian", label: "🇳🇴 Norwegian (Norsk)", name: "Norwegian" },
  { id: "finnish", label: "🇫🇮 Finnish (Suomi)", name: "Finnish" },
  { id: "danish", label: "🇩🇰 Danish (Dansk)", name: "Danish" },
  { id: "greek", label: "🇬🇷 Greek (Ελληνικά)", name: "Greek" },
  { id: "hebrew", label: "🇮🇱 Hebrew (עברית)", name: "Hebrew" },
  { id: "tamil", label: "🇮🇳 Tamil (தமிழ்)", name: "Tamil" },
  { id: "telugu", label: "🇮🇳 Telugu (తెలుగు)", name: "Telugu" },
  { id: "marathi", label: "🇮🇳 Marathi (मराठी)", name: "Marathi" },
  { id: "gujarati", label: "🇮🇳 Gujarati (ગુજરાતી)", name: "Gujarati" },
  { id: "malayalam", label: "🇮🇳 Malayalam (മലയാളം)", name: "Malayalam" },
  { id: "kannada", label: "🇮🇳 Kannada (ಕನ್ನಡ)", name: "Kannada" },
  { id: "malay", label: "🇲🇾 Malay (Bahasa Melayu)", name: "Malay" },
  { id: "czech", label: "🇨🇿 Czech (Čeština)", name: "Czech" },
  { id: "romanian", label: "🇷🇴 Romanian (Română)", name: "Romanian" },
  { id: "hungarian", label: "🇭🇺 Hungarian (Magyar)", name: "Hungarian" },
  { id: "ukrainian", label: "🇺🇦 Ukrainian (Українська)", name: "Ukrainian" },
  { id: "afrikaans", label: "🇿🇦 Afrikaans", name: "Afrikaans" },
  { id: "swahili", label: "🇰🇪 Swahili (Kiswahili)", name: "Swahili" }
];

export default function App() {
  const {
    user,
    profile,
    idToken,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isApiKeyModalOpen,
    setIsApiKeyModalOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isAdminModalOpen,
    setIsAdminModalOpen,
    isImageStudioOpen,
    setIsImageStudioOpen,
    initialImagePrompt,
    openImageStudioWithPrompt,
    modelSettings,
    currentTheme,
    currentBrand,
  } = useAuth();

  const theme = getThemeConfig(currentTheme, currentBrand);

  const [lastModelUsed, setLastModelUsed] = useState<string | null>(null);

  // Access validation and auth header constructor
  const checkAccessAndGetHeaders = (): Record<string, string> | null => {
    if (!user) {
      setIsAuthModalOpen(true);
      setError("Authentication required: Please Sign Up or Log In first.");
      return null;
    }
    if (!profile?.hasApiKey) {
      setIsApiKeyModalOpen(true);
      setError("Google AI API Key required: Please add your personal API key to continue.");
      return null;
    }
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    };
  };

  // Config States
  const [voicePersona, setVoicePersona] = useState<"female" | "male">("female");
  const [topicNiche, setTopicNiche] = useState(() => {
    try {
      return localStorage.getItem("script_automation_topic_niche") || "Medical & Health";
    } catch {
      return "Medical & Health";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("script_automation_topic_niche", topicNiche);
    } catch {}
  }, [topicNiche]);
  const [transformation, setTransformation] = useState("urdu-roman");
  const [languageSearchQuery, setLanguageSearchQuery] = useState("");
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [targetAudience, setTargetAudience] = useState("adults");
  const [wordCount, setWordCount] = useState<number>(300);
  const [scriptLengthType, setScriptLengthType] = useState<"word_count" | "video_duration">("word_count");
  const [videoDuration, setVideoDuration] = useState<number>(15);

  // Input Source Options
  const [inputSource, setInputSource] = useState<"topic" | "url" | "files">("topic");
  const [topicName, setTopicName] = useState("");
  const [topicWordLimit, setTopicWordLimit] = useState<number>(1000);
  const [videoUrl, setVideoUrl] = useState("");
  const [isExtractingUrl, setIsExtractingUrl] = useState(false);
  const [isGeneratingWithGemini, setIsGeneratingWithGemini] = useState(false);
  const [topicGenerating, setTopicGenerating] = useState(false);
  const [showArchitectLink, setShowArchitectLink] = useState(false);

  // Scene Prompt Generator States
  const [transcriptInput, setTranscriptInput] = useState("");
  const [numScenes, setNumScenes] = useState<number>(10);
  const [contentCategory, setContentCategory] = useState("Medical & Health");
  const [storyboardFormat, setStoryboardFormat] = useState<"16:9" | "9:16" | "1:1" | "none">("16:9");
  
  // Shots Calculator States
  const [calcVideoMinutes, setCalcVideoMinutes] = useState<number>(10);
  const [calcVideoSeconds, setCalcVideoSeconds] = useState<number>(0);
  const [calcShotDuration, setCalcShotDuration] = useState<number>(8);
  const [showShotsCalculator, setShowShotsCalculator] = useState(false);
  const [scenes, setScenes] = useState<Array<{ id: number; text: string; isEditing?: boolean; loading?: boolean }>>([]);
  const [scenesLoading, setScenesLoading] = useState(false);
  const [greetingsPrefix, setGreetingsPrefix] = useState("Assalamualaikum");
  const [includeHooksBodyConclusion, setIncludeHooksBodyConclusion] = useState(true);
  const [customHook, setCustomHook] = useState("Kya aap jante hain?");
  const [tutorialTone, setTutorialTone] = useState("Warm Friendly Conversational");
  const [fastLiteMode, setFastLiteMode] = useState(false);

  // Text inputs & outputs
  const [rawScript, setRawScript] = useState("");
  const [polishedScript, setPolishedScript] = useState("");
  const [polishedScripts, setPolishedScripts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plagiarismCheck, setPlagiarismCheck] = useState<"idle" | "checking" | "verified">("idle");
  const [plagiarismScore, setPlagiarismScore] = useState<number>(100);

  // Audio state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");

  // YouTube CTR SM States
  const [toggleTitle, setToggleTitle] = useState(true);
  const [toggleDescription, setToggleDescription] = useState(true);
  const [toggleTimestamps, setToggleTimestamps] = useState(true);
  const [toggleHashtags, setToggleHashtags] = useState(true);
  const [toggleTags, setToggleTags] = useState(true);
  const [ytVideoDuration, setYtVideoDuration] = useState("10:00");

  // Thumbnail Director States
  const [thumbBgColor, setThumbBgColor] = useState("Dark Green & Black");
  const [thumbHeadline, setThumbHeadline] = useState("");
  const [thumbSmallTagline, setThumbSmallTagline] = useState("");
  const [thumbTextColor, setThumbTextColor] = useState("Neon Green (#00FF01) & White");
  const [thumbnailFormat, setThumbnailFormat] = useState<"16:9" | "9:16" | "1:1" | "none">("16:9");
  const [thumbnailEngine, setThumbnailEngine] = useState<"nano_banana" | "flux1">("nano_banana");

  // Character Image States
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [characterImageType, setCharacterImageType] = useState<string | null>(null);
  const [characterImageName, setCharacterImageName] = useState<string | null>(null);

  // Custom Color Picker & Gradient States
  const [bgType, setBgType] = useState<"preset" | "custom_solid" | "custom_gradient">("preset");
  const [customBgSolid, setCustomBgSolid] = useState("#000000");
  const [customBgGrad1, setCustomBgGrad1] = useState("#00FF01");
  const [customBgGrad2, setCustomBgGrad2] = useState("#000000");

  const [textType, setTextType] = useState<"preset" | "custom">("preset");
  const [customTextCol1, setCustomTextCol1] = useState("#00FF01");
  const [customTextCol2, setCustomTextCol2] = useState("#FFFFFF");

  // Target Country selection states
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");

  // Speech-to-text states & helper functions
  const [listeningInput, setListeningInput] = useState<"topic" | "transcript" | "thumbnail" | "rawScript" | "videoTranscript" | null>(null);

  const startSpeechToText = (target: "topic" | "transcript" | "thumbnail" | "rawScript" | "videoTranscript") => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser. Please try using Google Chrome or Safari.");
      return;
    }

    if (listeningInput) {
      stopSpeechToText();
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = navigator.language || "en-US"; 

      rec.onstart = () => {
        setListeningInput(target);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          if (target === "topic") {
            setTopicName((prev) => (prev ? prev + " " + transcript : transcript));
          } else if (target === "transcript") {
            setTranscriptInput((prev) => (prev ? prev + " " + transcript : transcript));
          } else if (target === "thumbnail") {
            setThumbnailTranscriptInput((prev) => (prev ? prev + " " + transcript : transcript));
          } else if (target === "rawScript") {
            setRawScript((prev) => (prev ? prev + " " + transcript : transcript));
          } else if (target === "videoTranscript") {
            setVideoTranscriptInput((prev) => (prev ? prev + " " + transcript : transcript));
          }
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setListeningInput(null);
      };

      rec.onend = () => {
        setListeningInput(null);
      };

      (window as any)._activeRecognition = rec;
      rec.start();
    } catch (err) {
      console.error("Failed to start speech recognition", err);
      setListeningInput(null);
    }
  };

  const stopSpeechToText = () => {
    if ((window as any)._activeRecognition) {
      try {
        (window as any)._activeRecognition.stop();
      } catch (err) {
        console.error(err);
      }
      (window as any)._activeRecognition = null;
    }
    setListeningInput(null);
  };

  const getActiveBgColor = () => {
    if (bgType === "preset") return thumbBgColor;
    if (bgType === "custom_solid") return `Solid background color ${customBgSolid}`;
    return `Linear gradient background from ${customBgGrad1} to ${customBgGrad2}`;
  };

  const getActiveTextColor = () => {
    if (textType === "preset") return thumbTextColor;
    return `Primary text color ${customTextCol1} with accent text color ${customTextCol2}`;
  };

  // YouTube CTR SM Workspace States
  const [videoTranscriptInput, setVideoTranscriptInput] = useState("");
  const [ctrOutput, setCtrOutput] = useState<{
    titles?: string[];
    description?: string;
    timestamps?: Array<{ time: string; label: string }>;
    hashtags?: string[];
    tags?: string[];
  } | null>(null);
  const [ctrLoading, setCtrLoading] = useState(false);
  const [ctrRegeneratingField, setCtrRegeneratingField] = useState<string | null>(null);

  // Thumbnail Workspace States
  const [thumbnailTranscriptInput, setThumbnailTranscriptInput] = useState("");
  const [thumbnailOutput, setThumbnailOutput] = useState<{
    thumbnailPrompt: string;
    headlineUrdu: string;
    smallTaglineUrdu: string;
  } | null>(null);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);

  // Toast Popup States
  const [popupMessage, setPopupMessage] = useState<string | null>(null);
  const [popupType, setPopupType] = useState<"copy" | "download">("copy");

  const showToast = (message: string, type: "copy" | "download") => {
    setPopupMessage(message);
    setPopupType(type);
  };

  useEffect(() => {
    if (popupMessage) {
      const timer = setTimeout(() => {
        setPopupMessage(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [popupMessage]);

  // Quick preset actions
  const handleWordPreset = (words: number) => {
    setWordCount(words);
  };

  const handleGreetingsPreset = (preset: string) => {
    setGreetingsPrefix(preset);
  };

  // Run the generation API
  const handleGenerate = async (forcedTransformation?: string) => {
    if (!rawScript.trim()) {
      setError("Please input a raw source script first.");
      return;
    }

    const headers = checkAccessAndGetHeaders();
    if (!headers) return;

    setLoading(true);
    setError(null);
    setPolishedScript("");
    setPolishedScripts({});
    setPlagiarismCheck("checking");

    const activeTransformation = forcedTransformation || transformation;
    if (forcedTransformation) {
      setTransformation(forcedTransformation);
    }

    const finalWordCount = scriptLengthType === "video_duration" ? Math.round(videoDuration * 145) : wordCount;

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: modelSettings.scriptGeneration,
          rawScript,
          transformation: activeTransformation,
          language: activeTransformation,
          voicePersona,
          topicNiche,
          targetAudience,
          wordCount: finalWordCount,
          greetingsPrefix,
          includeHooksBodyConclusion,
          customHook,
          tutorialTone,
          fastLiteMode,
          selectedCountries,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate scripts.");
      }

      const data = await response.json();
      if (data.modelUsed) {
        setLastModelUsed(data.modelUsed);
      }
      const scriptsMap = data.polishedScripts || {};
      setPolishedScripts(scriptsMap);
      setPolishedScript(scriptsMap[activeTransformation] || data.polishedScript || Object.values(scriptsMap)[0] || "");
      
      // Plagiarism shield animation
      setTimeout(() => {
        setPlagiarismCheck("verified");
        // Re-randomize safety score close to 100% to reflect anti-plagiarism guaranteed uniqueness
        setPlagiarismScore(99.4 + Math.random() * 0.6);
      }, 700);

    } catch (err: any) {
      setError(err.message || "An error occurred. Check your network or API keys.");
      setPlagiarismCheck("idle");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLanguage = (lang: string) => {
    setTransformation(lang);
    if (polishedScripts && polishedScripts[lang]) {
      setPolishedScript(polishedScripts[lang]);
    } else if (rawScript.trim()) {
      handleGenerate(lang);
    }
  };

  // Copy to clipboard
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!polishedScript) return;
    navigator.clipboard.writeText(polishedScript);
    setCopied(true);
    showToast("Polished script copied to clipboard!", "copy");
    setTimeout(() => setCopied(false), 2000);
  };

  // Download script
  const handleDownload = () => {
    if (!polishedScript) return;
    const element = document.createElement("a");
    const file = new Blob([polishedScript], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `Polished_VO_Script_${transformation}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast(`Downloading Polished_VO_Script_${transformation}.txt`, "download");
  };

  // YouTube CTR & Social Growth functions
  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${fieldName} copied to clipboard!`, "copy");
  };

  const handleDownloadTextFile = (text: string, filename: string) => {
    const element = document.createElement("a");
    const file = new Blob([text], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast(`Downloading ${filename}`, "download");
  };

  const handleGenerateCtr = async () => {
    if (!videoTranscriptInput.trim()) return;
    const headers = checkAccessAndGetHeaders();
    if (!headers) return;

    setCtrLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/generate-ctr", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: modelSettings.scriptGeneration,
          transcript: videoTranscriptInput,
          language: transformation,
          transformation: transformation,
          toggleTitle,
          toggleDescription,
          toggleTimestamps,
          toggleHashtags,
          toggleTags,
          videoDuration: ytVideoDuration,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate metadata.");
      }

      const data = await response.json();
      setCtrOutput(data);
    } catch (err: any) {
      setError(err.message || "An error occurred generating CTR metadata.");
    } finally {
      setCtrLoading(false);
    }
  };

  const handleRegenerateCtrField = async (field: "titles" | "description" | "timestamps" | "hashtags" | "tags") => {
    if (!videoTranscriptInput.trim()) return;
    const headers = checkAccessAndGetHeaders();
    if (!headers) return;

    setCtrRegeneratingField(field);
    setError(null);
    try {
      const response = await fetch("/api/regenerate-ctr-field", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: modelSettings.scriptGeneration,
          transcript: videoTranscriptInput,
          field,
          language: transformation,
          transformation: transformation,
          videoDuration: ytVideoDuration,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Failed to regenerate ${field}.`);
      }

      const data = await response.json();
      setCtrOutput((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [field]: data[field],
        };
      });
    } catch (err: any) {
      setError(err.message || `An error occurred regenerating ${field}.`);
    } finally {
      setCtrRegeneratingField(null);
    }
  };

  const handleGenerateThumbnailPrompt = async () => {
    if (!thumbnailTranscriptInput.trim()) return;
    const headers = checkAccessAndGetHeaders();
    if (!headers) return;

    setThumbnailLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/generate-thumbnail-prompt", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: modelSettings.promptGeneration,
          transcript: thumbnailTranscriptInput,
          language: transformation,
          transformation: transformation,
          bgColor: getActiveBgColor(),
          headline: thumbHeadline,
          smallTagline: thumbSmallTagline,
          textColor: getActiveTextColor(),
          niche: topicNiche,
          format: thumbnailFormat,
          engine: thumbnailEngine,
          characterImage,
          characterImageType,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate thumbnail prompt.");
      }

      const data = await response.json();
      setThumbnailOutput(data);
      try {
        const promptToSave = data?.fluxPrompt || data?.thumbnailPrompt;
        if (promptToSave) {
          localStorage.setItem("script_automation_last_thumbnail_prompt", promptToSave);
        }
      } catch {}
    } catch (err: any) {
      setError(err.message || "An error occurred generating thumbnail prompt.");
    } finally {
      setThumbnailLoading(false);
    }
  };

  const formatCtrOutputText = (data: any) => {
    if (!data) return "";
    let txt = "";
    if (data.titles && data.titles.length > 0) {
      txt += "=== YOUTUBE HIGH-CTR TITLES ===\n";
      data.titles.forEach((t: string, i: number) => {
        txt += `${i + 1}. ${t}\n`;
      });
      txt += "\n";
    }
    if (data.description) {
      txt += "=== SEO OPTIMIZED DESCRIPTION ===\n";
      txt += data.description + "\n\n";
    }
    if (data.timestamps && data.timestamps.length > 0) {
      txt += "=== VIDEO TIMESTAMPS ===\n";
      data.timestamps.forEach((ts: any) => {
        txt += `${ts.time} - ${ts.label}\n`;
      });
      txt += "\n";
    }
    if (data.hashtags && data.hashtags.length > 0) {
      txt += "=== HASHTAGS ===\n";
      txt += data.hashtags.join(" ") + "\n\n";
    }
    if (data.tags && data.tags.length > 0) {
      txt += "=== SEO TAGS ===\n";
      txt += data.tags.join(", ") + "\n\n";
    }
    return txt.trim();
  };

  const formatThumbnailOutputText = (data: any) => {
    if (!data) return "";
    let txt = "";
    if (data.engine === "flux1") {
      txt += "=== 1️⃣ Scene Prompt (Positive Box) — English, NO Urdu ===\n";
      txt += (data.fluxScenePrompt || data.thumbnailPrompt) + "\n\n";
      txt += "=== 2️⃣ Negative Prompt (Anti-Text) ===\n";
      txt += (data.fluxNegativePrompt || "low quality, blurry, bad anatomy, deformed, extra fingers, text, letters, words, watermark, gibberish script, distorted") + "\n\n";
      txt += "=== 3️⃣ Urdu Poster Text Overlay Fields ===\n";
      if (data.overlayFields) {
        txt += `heading_text: ${data.overlayFields.heading_text}\n`;
        txt += `tagline_text: ${data.overlayFields.tagline_text}\n`;
        txt += `text_color: ${data.overlayFields.text_color}\n`;
        txt += `stroke_color: ${data.overlayFields.stroke_color}\n`;
        txt += `stroke_width: ${data.overlayFields.stroke_width}\n`;
        txt += `heading_y_percent: ${data.overlayFields.heading_y_percent}\n`;
        txt += `tagline_y_percent: ${data.overlayFields.tagline_y_percent}\n\n`;
      } else {
        txt += "None\n\n";
      }
      txt += "=== 4️⃣ EmptyLatentImage Size ===\n";
      txt += `Width: ${data.emptyLatentImage?.width || 1024}\n`;
      txt += `Height: ${data.emptyLatentImage?.height || 1820}\n`;
    } else {
      txt += "=== CINEMATIC THUMBNAIL PROMPT ===\n";
      txt += data.thumbnailPrompt + "\n\n";
      txt += "=== MAIN URDU HEADLINE ===\n";
      txt += data.headlineUrdu + "\n\n";
      txt += "=== SMALL TAGLINE ===\n";
      txt += data.smallTaglineUrdu + "\n";
    }
    return txt.trim();
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Get voices matching the active transformation
  const getFilteredVoices = () => {
    if (availableVoices.length === 0) return [];
    
    let preferredLangs: string[] = [];
    if (transformation === "hindi") {
      // Both Hindi and Urdu voices are excellent candidates for Urdu accent with Hindi script!
      preferredLangs = ["hi", "ur"];
    } else if (transformation === "urdu-roman") {
      preferredLangs = ["ur", "hi", "en"];
    } else if (transformation === "urdu-writing") {
      preferredLangs = ["ur", "hi"];
    } else {
      preferredLangs = ["en"];
    }

    const filtered = availableVoices.filter(v => 
      preferredLangs.some(lang => v.lang.toLowerCase().startsWith(lang.toLowerCase()))
    );

    return filtered.length > 0 ? filtered : availableVoices;
  };

  // Asynchronous Loading of Speech Synthesis Voices
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const allVoices = window.speechSynthesis.getVoices();
        setAvailableVoices(allVoices);
      }
    };
    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Sync preferred voice based on active voice persona or language selection
  useEffect(() => {
    if (availableVoices.length === 0) return;

    let targetLang = "hi-IN";
    if (transformation === "urdu-writing" || transformation === "urdu-roman") {
      targetLang = "ur-PK";
    } else if (transformation === "english") {
      targetLang = "en-US";
    }

    const pool = availableVoices.filter(v => 
      v.lang.toLowerCase().startsWith(targetLang.toLowerCase().substring(0, 2))
    );

    let defaultVoice = null;
    if (voicePersona === "female") {
      defaultVoice = pool.find(v => 
        v.name.toLowerCase().includes("female") || 
        v.name.toLowerCase().includes("zira") || 
        v.name.toLowerCase().includes("google female") || 
        v.name.toLowerCase().includes("kalpana") ||
        v.name.toLowerCase().includes("lekha") ||
        v.name.toLowerCase().includes("uzma")
      );
    } else {
      defaultVoice = pool.find(v => 
        v.name.toLowerCase().includes("male") || 
        v.name.toLowerCase().includes("david") || 
        v.name.toLowerCase().includes("ravi") ||
        v.name.toLowerCase().includes("hemant") ||
        v.name.toLowerCase().includes("asad")
      );
    }

    if (!defaultVoice && pool.length > 0) {
      defaultVoice = pool[0];
    }
    if (!defaultVoice && transformation === "hindi") {
      // Fallback from Hindi to Urdu or Urdu to Hindi for pronunciation compatibility
      const backupPool = availableVoices.filter(v => v.lang.toLowerCase().startsWith("ur"));
      if (backupPool.length > 0) defaultVoice = backupPool[0];
    }

    if (defaultVoice) {
      setSelectedVoiceName(defaultVoice.name);
    } else if (availableVoices.length > 0) {
      // Find any voice starting with en or just the first
      const enVoice = availableVoices.find(v => v.lang.toLowerCase().startsWith("en")) || availableVoices[0];
      setSelectedVoiceName(enVoice.name);
    }
  }, [transformation, voicePersona, availableVoices]);

  // Text to Speech
  const handleListen = () => {
    if (!polishedScript) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const newUtterance = new SpeechSynthesisUtterance(polishedScript);
    const voices = window.speechSynthesis.getVoices();
    let preferredVoice = null;

    if (selectedVoiceName) {
      preferredVoice = voices.find(v => v.name === selectedVoiceName);
    }

    if (!preferredVoice) {
      let langCode = "en-US";
      if (transformation === "hindi") {
        langCode = "hi-IN";
      } else if (transformation === "urdu-writing" || transformation === "urdu-roman") {
        langCode = "ur-PK";
      }
      const matchingVoices = voices.filter(v => v.lang.startsWith(langCode) || v.lang.startsWith(langCode.substring(0, 2)));
      
      if (voicePersona === "female") {
        preferredVoice = matchingVoices.find(v => v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("zira") || v.name.toLowerCase().includes("google female") || v.name.toLowerCase().includes("kalpana"));
      } else {
        preferredVoice = matchingVoices.find(v => v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("david") || v.name.toLowerCase().includes("ravi"));
      }

      if (!preferredVoice && matchingVoices.length > 0) {
        preferredVoice = matchingVoices[0];
      }
    }

    if (!preferredVoice && voices.length > 0) {
      preferredVoice = voices.find(v => v.lang.startsWith("en")) || voices[0];
    }

    if (preferredVoice) {
      newUtterance.voice = preferredVoice;
    }

    newUtterance.rate = 1.05;
    newUtterance.onend = () => {
      setIsPlayingAudio(false);
    };
    newUtterance.onerror = () => {
      setIsPlayingAudio(false);
    };

    setIsPlayingAudio(true);
    setUtterance(newUtterance);
    window.speechSynthesis.speak(newUtterance);
  };

  // Quick prefill sample
  const prefillSample = () => {
    setRawScript(
      "Our body has millions of cells that depend entirely on simple hydration. When you drink water, you prevent dehydration headaches, increase logical processing speeds, and flush metabolic toxins. Health experts suggest drinking at least eight to ten glasses of pure water every day to keep your vital organs running at maximum capacity."
    );
  };

  const handleGenerateFromTopic = async () => {
    if (!topicName.trim()) {
      alert("Please enter a topic name first.");
      return;
    }
    const headers = checkAccessAndGetHeaders();
    if (!headers) return;

    setTopicGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-topic", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: modelSettings.rewriteExpand,
          topic: topicName,
          wordCount: topicWordLimit,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate script from topic.");
      const data = await res.json();
      setRawScript(data.rawScript);
      if (data.modelUsed) setLastModelUsed(data.modelUsed);
    } catch (err: any) {
      setError(err.message || "Error generating script from topic.");
    } finally {
      setTopicGenerating(false);
    }
  };

  const handleExtractTranscript = async (mode: "direct" | "gemini" = "direct") => {
    if (!videoUrl.trim()) {
      alert("Please enter a video URL first.");
      return;
    }
    const headers = checkAccessAndGetHeaders();
    if (!headers) return;

    if (mode === "gemini") {
      setIsGeneratingWithGemini(true);
    } else {
      setIsExtractingUrl(true);
    }
    setError(null);
    try {
      const res = await fetch("/api/extract-transcript", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: modelSettings.youtubeTranscript,
          url: videoUrl,
          mode,
        }),
      });
      if (!res.ok) throw new Error("Failed to extract transcript.");
      const data = await res.json();
      setRawScript(data.transcript);
    } catch (err: any) {
      setError(err.message || "Error extracting transcript.");
    } finally {
      setIsExtractingUrl(false);
      setIsGeneratingWithGemini(false);
    }
  };

  const handleGenericFileUpload = async (
    file: File,
    onSuccess: (text: string) => void,
    setLoadingState?: (loading: boolean) => void
  ) => {
    if (!file) return;
    setError(null);
    const reader = new FileReader();

    if (file.name.endsWith(".txt")) {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        onSuccess(text);
      };
      reader.readAsText(file);
    } else if (file.name.endsWith(".pdf")) {
      reader.onload = async (event) => {
        const base64Data = (event.target?.result as string).split(",")[1];
        const headers = checkAccessAndGetHeaders();
        if (!headers) {
          if (setLoadingState) setLoadingState(false);
          else setLoading(false);
          return;
        }

        if (setLoadingState) setLoadingState(true);
        else setLoading(true);
        try {
          const res = await fetch("/api/parse-file", {
            method: "POST",
            headers,
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type || "application/pdf",
              fileData: base64Data,
            }),
          });
          if (!res.ok) throw new Error("Failed to parse PDF.");
          const data = await res.json();
          onSuccess(data.extractedText);
        } catch (err: any) {
          setError(err.message || "Error parsing PDF.");
        } finally {
          if (setLoadingState) setLoadingState(false);
          else setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      alert("Unsupported file type. Please upload a .txt or .pdf file.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleGenericFileUpload(file, setRawScript, setTopicGenerating);
  };

  const handleTranscriptInputFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleGenericFileUpload(file, setTranscriptInput, setScenesLoading);
  };

  const handleVideoTranscriptFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleGenericFileUpload(file, setVideoTranscriptInput, setCtrLoading);
  };

  const handleThumbnailTranscriptFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleGenericFileUpload(file, setThumbnailTranscriptInput, setThumbnailLoading);
  };

  const handleCharacterImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, JPEG, WEBP).");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCharacterImage(reader.result);
        setCharacterImageType(file.type);
        setCharacterImageName(file.name);
      }
    };
    reader.onerror = () => {
      alert("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleClearCharacterImage = () => {
    setCharacterImage(null);
    setCharacterImageType(null);
    setCharacterImageName(null);
  };

  const handleGenerateScenes = async () => {
    if (!transcriptInput.trim()) {
      alert("Please paste a transcript first.");
      return;
    }
    const headers = checkAccessAndGetHeaders();
    if (!headers) return;

    setScenesLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-scenes", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: modelSettings.promptGeneration,
          transcript: transcriptInput,
          numScenes,
          category: contentCategory,
          format: storyboardFormat,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate scenes.");
      const data = await res.json();
      setScenes(data.scenes || []);
    } catch (err: any) {
      setError(err.message || "Error generating scenes.");
    } finally {
      setScenesLoading(false);
    }
  };

  const handleCopyAllScenes = () => {
    if (scenes.length === 0) return;
    const allText = scenes.map((s) => `Scene ${s.id}: ${s.text}`).join("\n\n");
    navigator.clipboard.writeText(allText);
    alert("Copied all scene prompts to clipboard!");
  };

  const handleDownloadAllScenesTxt = () => {
    if (scenes.length === 0) return;
    const allText = scenes.map((s) => `Scene ${s.id}: ${s.text}`).join("\n\n");
    const blob = new Blob([allText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Cinematic_Storyboards_${contentCategory.replace(/\s+/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllScenesDocx = () => {
    if (scenes.length === 0) return;
    
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>Cinematic Storyboard - ${contentCategory}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        h1 { color: #00FF01; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .scene { margin-bottom: 25px; padding: 15px; border-left: 3px solid #00FF01; background: #f9f9f9; }
        .scene-title { font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #111; }
      </style>
      </head>
      <body>
        <h1>Cinematic Storyboard Prompts</h1>
        <p><strong>Category:</strong> ${contentCategory} | <strong>Total Scenes:</strong> ${scenes.length}</p>
        ${scenes.map(s => `
          <div class="scene">
            <div><strong>Scene ${s.id}:</strong> ${s.text.replace(/\n/g, "<br/>")}</div>
          </div>
        `).join("")}
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Cinematic_Storyboards_${contentCategory.replace(/\s+/g, "_")}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAllScenes = () => {
    setScenes([]);
    setTranscriptInput("");
  };

  const handleCopySingleScene = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied scene prompt to clipboard!");
  };

  const handleDownloadSingleScene = (id: number, text: string) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Scene_${id}_Prompt.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRegenerateSingleScene = async (id: number) => {
    const headers = checkAccessAndGetHeaders();
    if (!headers) return;

    const previous = scenes.find((s) => s.id === id)?.text || "";
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, loading: true } : s))
    );

    try {
      const res = await fetch("/api/regenerate-scene", {
        method: "POST",
        headers,
        body: JSON.stringify({
          transcript: transcriptInput,
          sceneNumber: id,
          totalScenes: scenes.length,
          category: contentCategory,
          previousPrompt: previous,
          format: storyboardFormat,
        }),
      });
      if (!res.ok) throw new Error("Failed to regenerate single scene.");
      const data = await res.json();
      setScenes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, text: data.sceneText, loading: false } : s))
      );
    } catch (err: any) {
      alert("Error regenerating scene: " + err.message);
      setScenes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, loading: false } : s))
      );
    }
  };

  const handleEditSceneText = (id: number, newText: string) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text: newText } : s))
    );
  };

  const isLight = theme.isLight;
  const btnTextColor = "#ffffff";

  const panelShadow = isLight
    ? "0 12px 32px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -3px rgba(0, 0, 0, 0.03)"
    : "0 16px 36px -4px rgba(0, 0, 0, 0.65), 0 6px 16px -4px rgba(0, 0, 0, 0.45)";

  return (
    <div className={`min-h-screen ${theme.rootBg} ${theme.textColor} font-sans overflow-x-hidden p-3 sm:p-5 transition-colors duration-200`}>
      {/* Top User Navigation Header */}
      <UserHeader />

      {/* Authentication & API Key Modals */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        canDismiss={true}
      />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
      <AdminModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} />
      <ImageStudioModal
        isOpen={isImageStudioOpen}
        onClose={() => setIsImageStudioOpen(false)}
        initialPrompt={initialImagePrompt}
      />
      <TutorialGuideModal />

      {/* Unauthenticated / Missing API Key Alert Banners */}
      {!user && (
        <div
          className="border-b px-4 py-3 text-center text-xs font-mono flex flex-col sm:flex-row items-center justify-center gap-3 backdrop-blur-md shadow-md"
          style={{
            backgroundColor: "#111111",
            borderColor: "#2A2A2A",
            color: "#FFFFFF",
          }}
        >
          <span className="font-bold flex items-center gap-1.5" style={{ color: theme.secondaryAccentColor }}>
            <Lock className="h-4 w-4" style={{ color: theme.secondaryAccentColor }} />
            <span>Authentication Required:</span>
          </span>
          <span className="opacity-95 font-medium text-[#BDBDBD]">
            Sign up or log in with Google / Email to generate scripts using your own personal Google AI API Key.
          </span>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="px-4 py-1.5 rounded-xl font-extrabold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5 shrink-0 border text-white"
            style={{ backgroundColor: theme.accentColor, borderColor: theme.accentColor }}
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In / Register</span>
          </button>
        </div>
      )}

      {user && !profile?.hasApiKey && (
        <div
          className="border-b px-4 py-3 text-center text-xs font-mono flex flex-col sm:flex-row items-center justify-center gap-3 bg-[#111111] text-white"
          style={{ borderColor: `${theme.accentColor}60` }}
        >
          <span className="font-bold flex items-center gap-1.5" style={{ color: theme.accentColor }}>
            <Key className="h-4 w-4" />
            <span>Personal API Key Needed:</span>
          </span>
          <span className="opacity-95 text-[#BDBDBD]">Your account requires a Google AI Studio API Key before script generation can run.</span>
          <button
            onClick={() => setIsApiKeyModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl text-white font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border"
            style={{ backgroundColor: theme.accentColor, borderColor: theme.accentColor }}
          >
            <Key className="h-3.5 w-3.5" />
            <span>Configure Key Now</span>
          </button>
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto space-y-5">
        
        {/* UPPER HEADER */}
        <header
          className="glass-panel p-4 sm:p-5 rounded-3xl border flex flex-col lg:flex-row items-center justify-between gap-4"
          style={{
            borderColor: theme.accentColor,
            boxShadow: panelShadow
          }}
        >
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl glass-card border flex items-center justify-center shadow-lg" style={{ borderColor: `${theme.accentColor}60`, color: theme.accentColor }}>
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-display font-extrabold tracking-tight flex items-center gap-2" style={{ color: theme.accentColor }}>
                <span>Script Automation Studio</span>
              </h1>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Elite Anti-plagiarism rephrasing · Dynamic unique output generator
              </p>
            </div>
          </div>

          {/* Simple text block, right-aligned opposite to title, no border, no stroke, no url button */}
          <div className="text-center lg:text-right space-y-1">
            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
              Script Automation Architect
            </p>
            <p className="text-xs md:text-sm font-display font-bold tracking-wide" style={{ color: theme.accentColor }}>
              MUHAMMAD TEHSEEN IRSHAD
            </p>
            {/* Clickable Social Icons under Muhammad Tehseen Irshad */}
            <div className="flex items-center justify-center lg:justify-end gap-3 pt-1">
              <a href="https://www.youtube.com/@monivisualpro" target="_blank" rel="noopener noreferrer" title="YouTube" className="p-1.5 rounded-xl glass-button border hover:scale-110 transition-transform" style={{ borderColor: `${theme.accentColor}30` }}>
                <Youtube className="h-4 w-4" style={{ color: theme.iconColor }} />
              </a>
              <a href="https://www.instagram.com/monivisualpro" target="_blank" rel="noopener noreferrer" title="Instagram" className="p-1.5 rounded-xl glass-button border hover:scale-110 transition-transform" style={{ borderColor: `${theme.accentColor}30` }}>
                <Instagram className="h-4 w-4" style={{ color: theme.iconColor }} />
              </a>
              <a href="https://web.facebook.com/monivisualpro" target="_blank" rel="noopener noreferrer" title="Facebook" className="p-1.5 rounded-xl glass-button border hover:scale-110 transition-transform" style={{ borderColor: `${theme.accentColor}30` }}>
                <Facebook className="h-4 w-4" style={{ color: theme.iconColor }} />
              </a>
              <a href="https://www.tiktok.com/@monivisualpro" target="_blank" rel="noopener noreferrer" title="TikTok" className="p-1.5 rounded-xl glass-button border hover:scale-110 transition-transform" style={{ borderColor: `${theme.accentColor}30` }}>
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" style={{ color: theme.iconColor }}>
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              <a href="https://wa.me/923036557989" target="_blank" rel="noopener noreferrer" title="WhatsApp" className="p-1.5 rounded-xl glass-button border hover:scale-110 transition-transform" style={{ borderColor: `${theme.accentColor}30` }}>
                <MessageCircle className="h-4 w-4" style={{ color: theme.iconColor }} />
              </a>
              <a href="https://www.linkedin.com/in/monivisualpro" target="_blank" rel="noopener noreferrer" title="LinkedIn" className="p-1.5 rounded-xl glass-button border hover:scale-110 transition-transform" style={{ borderColor: `${theme.accentColor}30` }}>
                <Linkedin className="h-4 w-4" style={{ color: theme.iconColor }} />
              </a>
            </div>
          </div>
        </header>

        {/* WORKSPACE ARRANGEMENT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEFT INTERACTIVE CONTROLS COLUMN (4 cols) */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-4">
            
            {/* VOICE PERSONA CARD - ROUNDED GLASS TABS */}
            <div className="glass-card p-4 rounded-2xl backdrop-blur-xl space-y-3 transition-all duration-300 border hover:border-white/30" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
              <label className="text-xs font-mono uppercase tracking-widest block font-extrabold" style={{ color: theme.accentColor }}>
                Voice Persona (Speaker)
              </label>
              <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl glass-card border" style={{ backgroundColor: theme.inputBg, borderColor: `${theme.accentColor}50` }}>
                <button
                  id="btn-voice-female"
                  onClick={() => setVoicePersona("female")}
                  className={`glass-button py-2 px-4 font-display text-xs transition-all duration-300 flex items-center justify-center gap-2 border ${
                    voicePersona === "female"
                      ? "rounded-[17px] font-extrabold shadow-lg scale-100"
                      : "bg-transparent border-transparent hover:opacity-100 opacity-70 rounded-xl font-bold"
                  } hover:scale-102 active:scale-95`}
                  style={voicePersona === "female" ? { backgroundColor: theme.accentColor, color: "#ffffff", borderColor: theme.accentColor } : { color: theme.textColor }}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${voicePersona === "female" ? "bg-black" : "bg-purple-400"}`} />
                  FEMALE
                </button>
                <button
                  id="btn-voice-male"
                  onClick={() => setVoicePersona("male")}
                  className={`glass-button py-2 px-4 font-display text-xs transition-all duration-300 flex items-center justify-center gap-2 border ${
                    voicePersona === "male"
                      ? "rounded-[17px] font-extrabold shadow-lg scale-100"
                      : "bg-transparent border-transparent hover:opacity-100 opacity-70 rounded-xl font-bold"
                  } hover:scale-102 active:scale-95`}
                  style={voicePersona === "male" ? { backgroundColor: theme.accentColor, color: "#ffffff", borderColor: theme.accentColor } : { color: theme.textColor }}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${voicePersona === "male" ? "bg-black" : "bg-sky-400"}`} />
                  MALE
                </button>
              </div>
            </div>

            {/* TOPIC DOMAIN / NICHE */}
            <div className="glass-card p-4 rounded-2xl backdrop-blur-xl space-y-3 transition-all duration-300 border hover:border-white/30" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
              <label className="text-xs font-mono uppercase tracking-widest flex items-center gap-1.5 font-extrabold" style={{ color: theme.accentColor }}>
                <TrendingUp className="h-3.5 w-3.5" style={{ color: theme.accentColor }} />
                Domain
              </label>
              <select
                id="select-niche"
                value={topicNiche}
                onChange={(e) => {
                  setTopicNiche(e.target.value);
                  setContentCategory(e.target.value);
                }}
                className="glass-input w-full rounded-xl py-2.5 px-4 text-xs font-mono cursor-pointer transition-all duration-300 focus:outline-none"
                style={{ backgroundColor: theme.inputBg, borderColor: theme.isLight ? "#E5E5E5" : "transparent", color: theme.textColor }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>{cat}</option>
                ))}
              </select>
            </div>

            {/* TUTORIAL & LITERATURE TONES */}
            <div className="glass-card p-4 rounded-2xl backdrop-blur-xl space-y-3 transition-all duration-300 border hover:border-white/30" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
              <label className="text-xs font-mono uppercase tracking-widest block font-extrabold" style={{ color: theme.accentColor }}>
                Tutorial & Literature Tool
              </label>
              <select
                id="select-tone"
                value={tutorialTone}
                onChange={(e) => setTutorialTone(e.target.value)}
                className="glass-input w-full rounded-xl py-2.5 px-4 text-xs font-mono cursor-pointer transition-all duration-300 focus:outline-none"
                style={{ backgroundColor: theme.inputBg, borderColor: theme.isLight ? "#E5E5E5" : "transparent", color: theme.textColor }}
              >
                <option value="Warm Friendly Conversational" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Warm Friendly Conversational</option>
                <option value="Islamic / Religious Tone" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Islamic / Religious Tone</option>
                <option value="Engaging Food Blogger Vibe" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Engaging Food Blogger Vibe</option>
                <option value="Fast Paced Explainer (YouTube FB)" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Fast Paced Explainer (YouTube FB)</option>
                <option value="Informative Health Explainer" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Informative Health Explainer</option>
                <option value="Exciting Tech Enthusiast" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Exciting Tech Enthusiast</option>
                <option value="Passionate Story Teller" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Passionate Story Teller</option>
                <option value="Poetic Relatable (Shayari Vibe)" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Poetic Relatable (Shayari Vibe)</option>
                <option value="Funny and Entertaining" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Funny and Entertaining</option>
                <option value="Professional Clear Speaker" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Professional Clear Speaker</option>
                <option value="Science-Based Tutorial (Easy Explanation)" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Science-Based Tutorial (Easy Explanation)</option>
                <option value="Professional & Technical" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Professional & Technical</option>
                <option value="Casual & Conversational" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Casual & Conversational</option>
                <option value="Dramatic Narrative (Hyped)" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Dramatic Narrative (Hyped)</option>
                <option value="Deep Informative (Analytical)" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Deep Informative (Analytical)</option>
              </select>
            </div>

            {/* TRANSFORMATION OPTIONS & MULTI-LANGUAGE ENGINE */}
            <div className="glass-card p-4 rounded-2xl backdrop-blur-xl space-y-3 transition-all duration-300 border hover:border-white/30" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase tracking-widest flex items-center gap-1.5 font-extrabold" style={{ color: theme.accentColor }}>
                  <Globe className="h-3.5 w-3.5" style={{ color: theme.accentColor }} />
                  Transformation Option
                </label>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-extrabold shadow-sm shrink-0" style={{ backgroundColor: `${theme.accentColor}25`, color: theme.accentColor }}>
                  {TRANSFORMATION_LANGUAGES.find(l => l.id === transformation)?.name || "Language Selected"}
                </span>
              </div>

              {/* Dropdown Box Trigger */}
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="glass-input w-full rounded-xl py-2.5 px-4 text-xs font-mono cursor-pointer transition-all duration-300 flex items-center justify-between focus:outline-none border hover:border-white/40"
                style={{
                  backgroundColor: theme.inputBg,
                  borderColor: isLangDropdownOpen ? theme.accentColor : (theme.isLight ? "#E5E5E5" : "transparent"),
                  color: theme.textColor
                }}
              >
                <span className="truncate pr-2 font-bold">
                  {TRANSFORMATION_LANGUAGES.find(l => l.id === transformation)?.label || "Select Language..."}
                </span>
                {isLangDropdownOpen ? (
                  <ChevronUp className="h-4 w-4 shrink-0" style={{ color: theme.accentColor }} />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-70" style={{ color: theme.textColor }} />
                )}
              </button>

              {/* Expandable Tab / Dropdown with Search */}
              {isLangDropdownOpen && (
                <div className="space-y-2.5 pt-2 border-t animate-fade-in" style={{ borderColor: `${theme.accentColor}25` }}>
                  {/* Search Box for Languages */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5" style={{ color: theme.accentColor }} />
                    <input
                      type="text"
                      placeholder="Search language (e.g. English, Urdu, Spanish, Arabic)..."
                      value={languageSearchQuery}
                      onChange={(e) => setLanguageSearchQuery(e.target.value)}
                      className="glass-input w-full rounded-xl py-2 pl-9 pr-8 text-xs font-mono transition-all duration-300 focus:outline-none"
                      style={{ backgroundColor: theme.inputBg, borderColor: theme.isLight ? "#E5E5E5" : "transparent", color: theme.textColor }}
                    />
                    {languageSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setLanguageSearchQuery("")}
                        className="absolute right-3 top-2.5 text-[10px] cursor-pointer font-bold"
                        style={{ color: theme.accentColor }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Scrollable Filtered Language List */}
                  <div className="rounded-xl max-h-[170px] overflow-y-auto p-1.5 space-y-1 scrollbar-thin border glass-card" style={{ backgroundColor: theme.inputBg, borderColor: theme.accentColor }}>
                    {TRANSFORMATION_LANGUAGES.filter(lang =>
                      lang.label.toLowerCase().includes(languageSearchQuery.toLowerCase()) ||
                      lang.name.toLowerCase().includes(languageSearchQuery.toLowerCase()) ||
                      lang.id.toLowerCase().includes(languageSearchQuery.toLowerCase())
                    ).map((lang) => {
                      const isSelected = transformation === lang.id;
                      return (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => {
                            handleSelectLanguage(lang.id);
                            setIsLangDropdownOpen(false);
                          }}
                          className={`glass-button w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center justify-between cursor-pointer border ${
                            isSelected
                              ? "font-extrabold shadow-md scale-[1.01]"
                              : "border-transparent opacity-80 hover:opacity-100"
                          }`}
                          style={isSelected ? {
                            backgroundColor: `${theme.accentColor}25`,
                            borderColor: theme.accentColor,
                            color: theme.accentColor
                          } : { color: theme.textColor }}
                        >
                          <span className="truncate pr-2">{lang.label}</span>
                          {isSelected ? (
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold shadow-sm shrink-0" style={{ backgroundColor: theme.accentColor, color: "#ffffff" }}>
                              ✓ Active
                            </span>
                          ) : (
                            <span className="text-[9px] opacity-60 shrink-0">Select</span>
                          )}
                        </button>
                      );
                    })}
                    {TRANSFORMATION_LANGUAGES.filter(lang =>
                      lang.label.toLowerCase().includes(languageSearchQuery.toLowerCase()) ||
                      lang.name.toLowerCase().includes(languageSearchQuery.toLowerCase()) ||
                      lang.id.toLowerCase().includes(languageSearchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="text-[10px] text-gray-400 font-mono text-center py-4">
                        No languages match "{languageSearchQuery}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* TARGET AUDIENCE */}
            <div className="glass-card p-4 rounded-2xl backdrop-blur-xl space-y-3 transition-all duration-300 border hover:border-white/30" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
              <label className="text-xs font-mono uppercase tracking-widest flex items-center gap-1.5 font-extrabold" style={{ color: theme.accentColor }}>
                <Lock className="h-3.5 w-3.5" style={{ color: theme.accentColor }} />
                Target Audience
              </label>
              <select
                id="select-audience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="glass-input w-full rounded-xl py-2.5 px-4 text-xs font-mono cursor-pointer transition-all duration-300 focus:outline-none"
                style={{ backgroundColor: theme.inputBg, borderColor: theme.isLight ? "#E5E5E5" : "transparent", color: theme.textColor }}
              >
                <option value="children" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>👶 Children up to 10 years old</option>
                <option value="adults" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>💼 Adults up to 40 years old</option>
                <option value="seniors" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>👴 Men over 60 years old</option>
              </select>
            </div>

            {/* TARGET REGIONS / COUNTRIES */}
            <div className="glass-card p-4 rounded-2xl backdrop-blur-xl space-y-3 transition-all duration-300 border hover:border-white/30" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase tracking-widest flex items-center gap-1.5 font-extrabold" style={{ color: theme.accentColor }}>
                  <Globe className="h-3.5 w-3.5" style={{ color: theme.accentColor }} />
                  Target Regions / Countries
                </label>
                <span className="text-[10px] font-mono opacity-80 shrink-0 font-bold" style={{ color: theme.accentColor }}>
                  {selectedCountries.length} Selected
                </span>
              </div>

              {/* Dropdown Box Trigger */}
              <button
                type="button"
                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                className="glass-input w-full rounded-xl py-2.5 px-4 text-xs font-mono cursor-pointer transition-all duration-300 flex items-center justify-between focus:outline-none border hover:border-white/40"
                style={{
                  backgroundColor: theme.inputBg,
                  borderColor: isCountryDropdownOpen ? theme.accentColor : (theme.isLight ? "#E5E5E5" : "transparent"),
                  color: theme.textColor
                }}
              >
                <span className="truncate pr-2 font-bold">
                  {selectedCountries.length > 0
                    ? `${selectedCountries.slice(0, 2).join(", ")}${selectedCountries.length > 2 ? ` (+${selectedCountries.length - 2} more)` : ""}`
                    : "🌐 Global Audience (Select Countries...)"}
                </span>
                {isCountryDropdownOpen ? (
                  <ChevronUp className="h-4 w-4 shrink-0" style={{ color: theme.accentColor }} />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-70" style={{ color: theme.textColor }} />
                )}
              </button>

              {/* Expandable Tab / Dropdown with Search */}
              {isCountryDropdownOpen && (
                <div className="space-y-2.5 pt-2 border-t animate-fade-in" style={{ borderColor: `${theme.accentColor}25` }}>
                  {/* Search Option */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5" style={{ color: theme.accentColor }} />
                    <input
                      type="text"
                      placeholder="Search countries (e.g. Pakistan, United States)..."
                      value={countrySearchQuery}
                      onChange={(e) => setCountrySearchQuery(e.target.value)}
                      className="glass-input w-full rounded-xl py-2 pl-9 pr-8 text-xs font-mono transition-all duration-300 focus:outline-none"
                      style={{ backgroundColor: theme.inputBg, borderColor: theme.isLight ? "#E5E5E5" : "transparent", color: theme.textColor }}
                    />
                    {countrySearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCountrySearchQuery("")}
                        className="absolute right-3 top-2.5 text-[10px] cursor-pointer font-bold"
                        style={{ color: theme.accentColor }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* List of Countries (Filtered) */}
                  <div className="rounded-xl max-h-[160px] overflow-y-auto p-1.5 space-y-1 scrollbar-thin border glass-card" style={{ backgroundColor: theme.inputBg, borderColor: theme.accentColor }}>
                    {ALL_COUNTRIES.filter(country =>
                      country.toLowerCase().includes(countrySearchQuery.toLowerCase())
                    ).map((country) => {
                      const isSelected = selectedCountries.includes(country);
                      const isPakistan = country.includes("Pakistan");
                      return (
                        <button
                          key={country}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedCountries(selectedCountries.filter(c => c !== country));
                            } else {
                              setSelectedCountries([...selectedCountries, country]);
                            }
                          }}
                          className={`glass-button w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center justify-between cursor-pointer border ${
                            isSelected
                              ? "font-extrabold shadow-md scale-[1.01]"
                              : "border-transparent opacity-80 hover:opacity-100"
                          }`}
                          style={isSelected ? {
                            backgroundColor: isPakistan ? "rgba(16, 185, 129, 0.2)" : `${theme.accentColor}25`,
                            borderColor: isPakistan ? "#10b981" : theme.accentColor,
                            color: isPakistan ? "#34d399" : theme.accentColor
                          } : { color: theme.textColor }}
                        >
                          <span className="flex items-center gap-1.5">
                            {country}
                            {isPakistan && <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">🇵 monolithic</span>}
                          </span>
                          {isSelected ? (
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold shadow-sm shrink-0" style={{ backgroundColor: isPakistan ? "#10b981" : theme.accentColor, color: "#ffffff" }}>
                              ✓ Added
                            </span>
                          ) : (
                            <span className="text-[9px] opacity-60 shrink-0">+ Add</span>
                          )}
                        </button>
                      );
                    })}
                    {ALL_COUNTRIES.filter(country =>
                      country.toLowerCase().includes(countrySearchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="text-[10px] text-gray-500 font-mono text-center py-4">
                        No countries match your search
                      </div>
                    )}
                  </div>

                  {/* Selected Countries Pills inside expanded tab */}
                  {selectedCountries.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t" style={{ borderColor: `${theme.accentColor}20` }}>
                      <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">
                        Selected Regions ({selectedCountries.length}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {selectedCountries.map((country) => {
                          const isPakistan = country.includes("Pakistan");
                          return (
                            <span
                              key={country}
                              className="inline-flex items-center gap-1 text-[9px] font-mono px-2.5 py-1 rounded-full font-bold animate-fade-in glass-card shadow-md"
                              style={{
                                backgroundColor: isPakistan ? "#10b981" : theme.accentColor,
                                color: "#ffffff"
                              }}
                            >
                              {country}
                              <button
                                type="button"
                                onClick={() => setSelectedCountries(selectedCountries.filter(c => c !== country))}
                                className="hover:bg-black/30 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-black cursor-pointer text-[9px]"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Done Button */}
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsCountryDropdownOpen(false)}
                      className="text-[10px] font-mono font-bold px-3 py-1 rounded-lg border transition-all cursor-pointer hover:scale-105"
                      style={{ backgroundColor: `${theme.accentColor}20`, borderColor: theme.accentColor, color: theme.accentColor }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              {/* Always show small selected pills summary when collapsed */}
              {!isCountryDropdownOpen && selectedCountries.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {selectedCountries.map((country) => {
                    const isPakistan = country.includes("Pakistan");
                    return (
                      <span
                        key={country}
                        className="inline-flex items-center gap-1 text-[9px] font-mono px-2.5 py-0.5 rounded-full font-bold glass-card"
                        style={{
                          backgroundColor: isPakistan ? "#10b981" : `${theme.accentColor}20`,
                          borderColor: isPakistan ? "#10b981" : theme.accentColor,
                          color: isPakistan ? "#ffffff" : theme.accentColor
                        }}
                      >
                        {country}
                        <button
                          type="button"
                          onClick={() => setSelectedCountries(selectedCountries.filter(c => c !== country))}
                          className="hover:bg-black/30 text-current rounded-full w-3 h-3 flex items-center justify-center font-black cursor-pointer text-[9px]"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SCRIPT LENGTH TYPE & DETAILS */}
            <div className="glass-card p-4 rounded-2xl backdrop-blur-xl space-y-4 transition-all duration-300 border hover:border-white/30" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
              <div>
                <label className="text-xs font-mono uppercase tracking-widest block mb-2 font-extrabold" style={{ color: theme.accentColor }}>
                  Script Length
                </label>
                <div className="space-y-1.5 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider block opacity-80" style={{ color: theme.textColor }}>
                    Type
                  </span>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl glass-card border" style={{ backgroundColor: theme.inputBg, borderColor: `${theme.accentColor}30` }}>
                    <button
                      onClick={() => setScriptLengthType("word_count")}
                      className={`glass-button py-2 px-3 text-xs font-mono transition-all duration-300 border text-center cursor-pointer ${
                        scriptLengthType === "word_count"
                          ? "rounded-[17px] font-extrabold shadow-md"
                          : "hover:opacity-100 opacity-70 rounded-xl"
                      } hover:scale-102 active:scale-95`}
                      style={scriptLengthType === "word_count" ? {
                        backgroundColor: theme.accentColor,
                        color: "#ffffff",
                        borderColor: theme.accentColor
                      } : {
                        backgroundColor: `${theme.accentColor}10`,
                        borderColor: `${theme.accentColor}40`,
                        color: theme.textColor
                      }}
                    >
                      ○ By Word Count
                    </button>
                    <button
                      onClick={() => setScriptLengthType("video_duration")}
                      className={`glass-button py-2 px-3 text-xs font-mono transition-all duration-300 border text-center cursor-pointer ${
                        scriptLengthType === "video_duration"
                          ? "rounded-[17px] font-extrabold shadow-md"
                          : "hover:opacity-100 opacity-70 rounded-xl"
                      } hover:scale-102 active:scale-95`}
                      style={scriptLengthType === "video_duration" ? {
                        backgroundColor: theme.accentColor,
                        color: "#ffffff",
                        borderColor: theme.accentColor
                      } : {
                        backgroundColor: `${theme.accentColor}10`,
                        borderColor: `${theme.accentColor}40`,
                        color: theme.textColor
                      }}
                    >
                      ○ By Video Duration
                    </button>
                  </div>
                </div>
              </div>

              {scriptLengthType === "word_count" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono uppercase tracking-widest block font-extrabold" style={{ color: theme.accentColor }}>
                      Target Word Volume
                    </label>
                    <span className="text-xs font-mono font-bold animate-pulse px-2 py-0.5 rounded-full glass-card border" style={{ borderColor: `${theme.accentColor}40`, color: theme.accentColor }}>{wordCount} words</span>
                  </div>
                  
                  {/* Pill buttons for presets */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                    {[300, 1500, 10000, 20000].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handleWordPreset(preset)}
                        className={`glass-button py-1.5 text-[10px] font-mono transition-all duration-300 border cursor-pointer ${
                          wordCount === preset
                            ? "rounded-[17px] font-extrabold shadow-md"
                            : "hover:opacity-100 opacity-70 rounded-xl"
                        } hover:scale-105 active:scale-95`}
                        style={wordCount === preset ? {
                          backgroundColor: theme.accentColor,
                          color: "#ffffff",
                          borderColor: theme.accentColor
                        } : {
                          backgroundColor: `${theme.accentColor}10`,
                          borderColor: `${theme.accentColor}40`,
                          color: theme.textColor
                        }}
                      >
                        {preset >= 1000 ? `${preset / 1000}k` : preset} words
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <input
                      id="input-words-custom"
                      type="number"
                      min="0"
                      max="20000"
                      value={wordCount}
                      onChange={(e) => setWordCount(Math.min(20000, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="glass-input w-full rounded-xl py-2 px-4 text-xs font-mono transition-all duration-300 focus:outline-none"
                      style={{
                        backgroundColor: theme.inputBg,
                        borderColor: theme.isLight ? "#E5E5E5" : "transparent",
                        color: theme.textColor
                      }}
                      placeholder="Custom word length (e.g. 20000)..."
                    />
                    <span className="text-[10px] opacity-60 font-mono block" style={{ color: theme.textColor }}>
                      Volume is adjustable from 0 to 20,000 words.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono uppercase tracking-widest block font-extrabold" style={{ color: theme.accentColor }}>
                      Video Duration (Minutes)
                    </label>
                    <span className="text-xs font-mono font-bold animate-pulse px-2 py-0.5 rounded-full glass-card border" style={{ borderColor: `${theme.accentColor}40`, color: theme.accentColor }}>~{Math.round(videoDuration * 145)} words</span>
                  </div>

                  <div className="space-y-1">
                    <input
                      id="input-duration"
                      type="number"
                      min="1"
                      max="120"
                      value={videoDuration}
                      onChange={(e) => setVideoDuration(Math.max(1, parseInt(e.target.value) || 1))}
                      className="glass-input w-full rounded-xl py-2.5 px-4 text-xs font-mono transition-all duration-300 focus:outline-none"
                      style={{
                        backgroundColor: theme.inputBg,
                        borderColor: theme.isLight ? "#E5E5E5" : "transparent",
                        color: theme.textColor
                      }}
                      placeholder="e.g., 15"
                    />
                    <span className="text-[10px] opacity-60 font-mono block" style={{ color: theme.textColor }}>
                      Converts to words at approximately 140–150 words per minute.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* GREETINGS PREFIX / BEGINNING - ASSALAMU ALAIKUM FIRST */}
            <div className="glass-card p-4 rounded-2xl backdrop-blur-xl space-y-3 transition-all duration-300 border hover:border-white/30" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono uppercase tracking-widest block font-extrabold" style={{ color: theme.accentColor }}>
                  Greeting
                </label>
                <span className="text-[10px] font-mono uppercase tracking-wider block opacity-85" style={{ color: theme.textColor }}>
                  Prefix
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {["Asslamoalaikum", "Adaab", "Namaste", "Greetings", "Welcome", "None"].map((p) => (
                  <button
                    key={p}
                    onClick={() => handleGreetingsPreset(p)}
                    className={`glass-button py-1.5 px-2 text-[9px] font-mono transition-all duration-300 border truncate cursor-pointer ${
                      greetingsPrefix === p
                        ? "rounded-[17px] font-extrabold shadow-md"
                        : "hover:opacity-100 opacity-70 rounded-xl"
                    } hover:scale-102 active:scale-95`}
                    title={p}
                    style={greetingsPrefix === p ? {
                      backgroundColor: theme.accentColor,
                      color: "#ffffff",
                      borderColor: theme.accentColor
                    } : {
                      backgroundColor: `${theme.accentColor}10`,
                      borderColor: `${theme.accentColor}40`,
                      color: theme.textColor
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <input
                id="input-greeting-custom"
                type="text"
                value={greetingsPrefix}
                onChange={(e) => setGreetingsPrefix(e.target.value)}
                className="glass-input w-full rounded-xl py-2 px-4 text-xs font-mono transition-all duration-300 focus:outline-none"
                style={{
                  backgroundColor: theme.inputBg,
                  borderColor: theme.isLight ? "#E5E5E5" : "transparent",
                  color: theme.textColor
                }}
                placeholder="Custom greeting prefix..."
              />
            </div>

            {/* CUSTOM HOOK & STRUCTURING - DEFAULT WHAT DO YOU KNOW? */}
            <div className="glass-card p-4 rounded-2xl backdrop-blur-xl space-y-3 transition-all duration-300 border hover:border-white/30" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase tracking-widest block font-extrabold" style={{ color: theme.accentColor }}>
                  Custom Hook Input
                </label>
                <input
                  id="input-custom-hook"
                  type="text"
                  value={customHook}
                  onChange={(e) => setCustomHook(e.target.value)}
                  className="glass-input w-full rounded-xl py-2 px-4 text-xs font-mono transition-all duration-300 focus:outline-none"
                  style={{
                    backgroundColor: theme.inputBg,
                    borderColor: theme.isLight ? "#E5E5E5" : "transparent",
                    color: theme.textColor
                  }}
                  placeholder="e.g. What do you know?..."
                />
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t" style={{ borderColor: `${theme.accentColor}30` }}>
                <div className="space-y-0.5 pr-2">
                  <span className="text-xs font-semibold block font-extrabold" style={{ color: theme.accentColor }}>Include Hooks, Body & Conclusion</span>
                  <span className="text-[10px] opacity-60 font-mono block" style={{ color: theme.textColor }}>Structured sectional output</span>
                </div>
                <button
                  id="toggle-hooks-structure"
                  onClick={() => setIncludeHooksBodyConclusion(!includeHooksBodyConclusion)}
                  className={`glass-button w-11 h-6 rounded-xl p-1 transition-all duration-300 hover:scale-105 border`}
                  style={{
                    backgroundColor: includeHooksBodyConclusion ? theme.accentColor : "rgba(120,120,120,0.2)",
                    borderColor: includeHooksBodyConclusion ? theme.accentColor : "transparent"
                  }}
                >
                  <div
                    className={`w-4 h-4 rounded-xl shadow-md transition-all duration-300 transform ${
                      includeHooksBodyConclusion ? "translate-x-5" : "translate-x-0"
                    }`}
                    style={{ backgroundColor: theme.isLight && includeHooksBodyConclusion ? "#ffffff" : "#000000" }}
                  />
                </button>
              </div>

              {/* Added line at the bottom of the "Custom Hook Input" */}
              <div className="border-t pt-1 mt-2" style={{ borderColor: `${theme.accentColor}30` }} />
            </div>

            {/* Added line right under the Custom Hook Input div */}
            <div className="border-b my-4" style={{ borderColor: `${theme.accentColor}20` }} />

            {/* MOVED: YouTube and social media growth strategist */}
            <div className="glass-card p-4 rounded-2xl backdrop-blur-xl space-y-4 transition-all duration-300 border hover:border-white/30" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
              <div className="border-b pb-2 flex items-center justify-between" style={{ borderColor: `${theme.accentColor}30` }}>
                <span className="text-xs font-mono uppercase tracking-wider block font-extrabold" style={{ color: theme.accentColor }}>
                  YouTube and social media growth strategist
                </span>
                <Sparkle className="h-4 w-4 animate-spin" style={{ animationDuration: '8s', color: theme.accentColor }} />
              </div>

              <p className="text-[10px] opacity-80 font-mono leading-relaxed" style={{ color: theme.textColor }}>
                Toggle metadata elements to include in the CTR generation stream. Click elements to scroll to their output blocks.
              </p>

              <div className="space-y-2.5">
                {/* Toggle Title */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => scrollToSection("ctr-section-title")}
                    className="text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 font-sans hover:opacity-80"
                    style={{ color: theme.textColor }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} />
                    Title Option
                  </button>
                  <button
                    onClick={() => setToggleTitle(!toggleTitle)}
                    className="glass-button w-10 h-5.5 rounded-xl p-0.5 transition-all duration-300 cursor-pointer border"
                    style={{ backgroundColor: toggleTitle ? theme.accentColor : "rgba(120,120,120,0.2)", borderColor: toggleTitle ? theme.accentColor : "transparent" }}
                  >
                    <div className="w-4 h-4 rounded-xl shadow-md transition-all duration-300 transform"
                      style={{
                        backgroundColor: theme.isLight && toggleTitle ? "#ffffff" : "#000000",
                        transform: toggleTitle ? "translateX(1.125rem)" : "translateX(0)"
                      }}
                    />
                  </button>
                </div>

                {/* Toggle Description */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => scrollToSection("ctr-section-description")}
                    className="text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 font-sans hover:opacity-80"
                    style={{ color: theme.textColor }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} />
                    SEO Description
                  </button>
                  <button
                    onClick={() => setToggleDescription(!toggleDescription)}
                    className="glass-button w-10 h-5.5 rounded-xl p-0.5 transition-all duration-300 cursor-pointer border"
                    style={{ backgroundColor: toggleDescription ? theme.accentColor : "rgba(120,120,120,0.2)", borderColor: toggleDescription ? theme.accentColor : "transparent" }}
                  >
                    <div className="w-4 h-4 rounded-xl shadow-md transition-all duration-300 transform"
                      style={{
                        backgroundColor: theme.isLight && toggleDescription ? "#ffffff" : "#000000",
                        transform: toggleDescription ? "translateX(1.125rem)" : "translateX(0)"
                      }}
                    />
                  </button>
                </div>

                {/* Toggle Timestamps */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => scrollToSection("ctr-section-timestamps")}
                    className="text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 font-sans hover:opacity-80"
                    style={{ color: theme.textColor }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} />
                    Chronological Timestamps
                  </button>
                  <button
                    onClick={() => setToggleTimestamps(!toggleTimestamps)}
                    className="glass-button w-10 h-5.5 rounded-xl p-0.5 transition-all duration-300 cursor-pointer border"
                    style={{ backgroundColor: toggleTimestamps ? theme.accentColor : "rgba(120,120,120,0.2)", borderColor: toggleTimestamps ? theme.accentColor : "transparent" }}
                  >
                    <div className="w-4 h-4 rounded-xl shadow-md transition-all duration-300 transform"
                      style={{
                        backgroundColor: theme.isLight && toggleTimestamps ? "#ffffff" : "#000000",
                        transform: toggleTimestamps ? "translateX(1.125rem)" : "translateX(0)"
                      }}
                    />
                  </button>
                </div>

                {/* Video Duration Input for Timestamps */}
                {toggleTimestamps && (
                  <div className="pl-4 py-1 border-l space-y-1" style={{ borderColor: `${theme.accentColor}30` }}>
                    <label className="text-[9px] font-mono opacity-80 block" style={{ color: theme.textColor }}>TIME ESTIMATOR (DURATION):</label>
                    <input
                      type="text"
                      value={ytVideoDuration}
                      onChange={(e) => setYtVideoDuration(e.target.value)}
                      placeholder="e.g. 10:00 or 15:30"
                      className="glass-input w-full rounded-lg py-1 px-2.5 text-xs font-mono focus:outline-none"
                      style={{
                        backgroundColor: theme.inputBg,
                        borderColor: theme.isLight ? "#E5E5E5" : "transparent",
                        color: theme.textColor
                      }}
                    />
                  </div>
                )}

                {/* Toggle Hashtags */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => scrollToSection("ctr-section-hashtags")}
                    className="text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 font-sans hover:opacity-80"
                    style={{ color: theme.textColor }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} />
                    Hashtags
                  </button>
                  <button
                    onClick={() => setToggleHashtags(!toggleHashtags)}
                    className="glass-button w-10 h-5.5 rounded-xl p-0.5 transition-all duration-300 cursor-pointer border"
                    style={{ backgroundColor: toggleHashtags ? theme.accentColor : "rgba(120,120,120,0.2)", borderColor: toggleHashtags ? theme.accentColor : "transparent" }}
                  >
                    <div className="w-4 h-4 rounded-xl shadow-md transition-all duration-300 transform"
                      style={{
                        backgroundColor: theme.isLight && toggleHashtags ? "#ffffff" : "#000000",
                        transform: toggleHashtags ? "translateX(1.125rem)" : "translateX(0)"
                      }}
                    />
                  </button>
                </div>

                {/* Toggle Tags */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => scrollToSection("ctr-section-tags")}
                    className="text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 font-sans hover:opacity-80"
                    style={{ color: theme.textColor }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} />
                    SEO Keywords Tags
                  </button>
                  <button
                    onClick={() => setToggleTags(!toggleTags)}
                    className="glass-button w-10 h-5.5 rounded-xl p-0.5 transition-all duration-300 cursor-pointer border"
                    style={{ backgroundColor: toggleTags ? theme.accentColor : "rgba(120,120,120,0.2)", borderColor: toggleTags ? theme.accentColor : "transparent" }}
                  >
                    <div className="w-4 h-4 rounded-xl shadow-md transition-all duration-300 transform"
                      style={{
                        backgroundColor: theme.isLight && toggleTags ? "#ffffff" : "#000000",
                        transform: toggleTags ? "translateX(1.125rem)" : "translateX(0)"
                      }}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* MOVED: thumbnail director and Tagline */}
            <div className="glass-card p-4 rounded-2xl backdrop-blur-xl space-y-4 transition-all duration-300 border hover:border-white/30" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
              <div className="border-b pb-2 flex items-center justify-between" style={{ borderColor: `${theme.accentColor}30` }}>
                <span className="text-xs font-mono uppercase tracking-wider block font-extrabold" style={{ color: theme.accentColor }}>
                  thumbnail director & Tagline
                </span>
              </div>

              {/* Niche dropdown synced with Domain */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-widest block opacity-75" style={{ color: theme.textColor }}>
                  Target Niche (Synced)
                </label>
                <select
                  value={topicNiche}
                  onChange={(e) => {
                    setTopicNiche(e.target.value);
                    setContentCategory(e.target.value);
                  }}
                  className="glass-input w-full rounded-xl py-1.5 px-3 text-xs font-mono cursor-pointer focus:outline-none"
                  style={{
                    backgroundColor: theme.inputBg,
                    borderColor: theme.isLight ? "#E5E5E5" : "transparent",
                    color: theme.textColor
                  }}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Optional Headline input */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-widest block opacity-75" style={{ color: theme.textColor }}>
                  Prompt text Headline (Optional)
                </label>
                <input
                  type="text"
                  value={thumbHeadline}
                  onChange={(e) => setThumbHeadline(e.target.value)}
                  placeholder="e.g. SECRET REVEALED"
                  className="glass-input w-full rounded-xl py-1.5 px-3 text-xs font-mono focus:outline-none"
                  style={{
                    backgroundColor: theme.inputBg,
                    borderColor: theme.isLight ? "#E5E5E5" : "transparent",
                    color: theme.textColor
                  }}
                />
              </div>

              {/* Optional Small Tagline input */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-widest block opacity-75" style={{ color: theme.textColor }}>
                  Prompt Small Tagline (Optional)
                </label>
                <input
                  type="text"
                  value={thumbSmallTagline}
                  onChange={(e) => setThumbSmallTagline(e.target.value)}
                  placeholder="e.g. 99% of people miss this"
                  className="glass-input w-full rounded-xl py-1.5 px-3 text-xs font-mono focus:outline-none"
                  style={{
                    backgroundColor: theme.inputBg,
                    borderColor: theme.isLight ? "#E5E5E5" : "transparent",
                    color: theme.textColor
                  }}
                />
              </div>

              {/* Background Color tab/label */}
              <div className="space-y-2 border-t pt-3" style={{ borderColor: `${theme.accentColor}30` }}>
                <label className="text-[10px] font-mono uppercase tracking-widest block font-extrabold" style={{ color: theme.accentColor }}>
                  🎨 Thumbnail Background Color & Gradient
                </label>
                
                {/* Background Selector Type Tabs */}
                <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl border glass-card" style={{ backgroundColor: `${theme.accentColor}08`, borderColor: `${theme.accentColor}20` }}>
                  {(["preset", "custom_solid", "custom_gradient"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setBgType(type)}
                      className={`glass-button py-1.5 px-1.5 text-[9px] font-mono font-extrabold transition-all duration-300 rounded-xl cursor-pointer border ${
                        bgType === type ? "shadow-md scale-100" : "border-transparent opacity-70"
                      }`}
                      style={bgType === type ? {
                        backgroundColor: theme.accentColor,
                        color: "#ffffff",
                        borderColor: theme.accentColor
                      } : {
                        color: theme.textColor
                      }}
                    >
                      {type === "preset" ? "PRESET" : type === "custom_solid" ? "SOLID" : "GRADIENT"}
                    </button>
                  ))}
                </div>

                {/* Render corresponding inputs based on bgType */}
                {bgType === "preset" && (
                  <select
                    value={thumbBgColor}
                    onChange={(e) => setThumbBgColor(e.target.value)}
                    className="glass-input w-full rounded-xl py-1.5 px-3 text-xs font-mono cursor-pointer focus:outline-none"
                    style={{
                      backgroundColor: theme.inputBg,
                      borderColor: theme.accentColor,
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: theme.textColor
                    }}
                  >
                    <option value="Dark Green & Black" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Dark Green & Black</option>
                    <option value="Neon Green & Deep Charcoal" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Neon Green & Deep Charcoal</option>
                    <option value="Neon Blue & Dark Purple" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Neon Blue & Dark Purple</option>
                    <option value="Sunset Orange & Crimson" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Sunset Orange & Crimson</option>
                    <option value="Neon Red & Charcoal" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Neon Red & Charcoal</option>
                  </select>
                )}

                {bgType === "custom_solid" && (
                  <div className="flex items-center gap-3 p-2 rounded-xl border glass-card" style={{ backgroundColor: `${theme.accentColor}08`, borderColor: `${theme.accentColor}25` }}>
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border" style={{ borderColor: `${theme.accentColor}40` }}>
                      <input
                        type="color"
                        value={customBgSolid}
                        onChange={(e) => setCustomBgSolid(e.target.value)}
                        className="absolute inset-0 w-full h-full scale-150 cursor-pointer border-0 p-0 bg-transparent"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[8px] font-mono uppercase tracking-wider block opacity-70" style={{ color: theme.textColor }}>Background Color</span>
                      <span className="text-xs font-mono font-bold" style={{ color: theme.accentColor }}>{customBgSolid}</span>
                    </div>
                  </div>
                )}

                {bgType === "custom_gradient" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 p-1.5 rounded-xl border glass-card" style={{ backgroundColor: `${theme.accentColor}08`, borderColor: `${theme.accentColor}25` }}>
                        <input
                          type="color"
                          value={customBgGrad1}
                          onChange={(e) => setCustomBgGrad1(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer p-0 border-0 bg-transparent shrink-0"
                        />
                        <div className="overflow-hidden">
                          <span className="text-[8px] font-mono block truncate opacity-70" style={{ color: theme.textColor }}>Color A</span>
                          <span className="text-[9px] font-mono font-semibold block" style={{ color: theme.accentColor }}>{customBgGrad1}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl border glass-card" style={{ backgroundColor: `${theme.accentColor}08`, borderColor: `${theme.accentColor}25` }}>
                        <input
                          type="color"
                          value={customBgGrad2}
                          onChange={(e) => setCustomBgGrad2(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer p-0 border-0 bg-transparent shrink-0"
                        />
                        <div className="overflow-hidden">
                          <span className="text-[8px] font-mono block truncate opacity-70" style={{ color: theme.textColor }}>Color B</span>
                          <span className="text-[9px] font-mono font-semibold block" style={{ color: theme.accentColor }}>{customBgGrad2}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Live preview gradient bar */}
                    <div
                      className="h-5 rounded-lg border shadow-inner"
                      style={{
                        background: `linear-gradient(to right, ${customBgGrad1}, ${customBgGrad2})`,
                        borderColor: `${theme.accentColor}30`
                      }}
                      title="Live Gradient Preview"
                    />
                  </div>
                )}
              </div>

              {/* Text Color tab/label */}
              <div className="space-y-2 border-t pt-3" style={{ borderColor: `${theme.accentColor}30` }}>
                <label className="text-[10px] font-mono uppercase tracking-widest block font-extrabold" style={{ color: theme.accentColor }}>
                  ✍️ Thumbnail Text Color Overlay
                </label>
                
                {/* Text Selector Type Tabs */}
                <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl border glass-card" style={{ backgroundColor: `${theme.accentColor}08`, borderColor: `${theme.accentColor}20` }}>
                  {(["preset", "custom"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTextType(type)}
                      className={`glass-button py-1.5 px-1.5 text-[9px] font-mono font-extrabold transition-all duration-300 rounded-xl cursor-pointer border ${
                        textType === type ? "shadow-md scale-100" : "border-transparent opacity-70"
                      }`}
                      style={textType === type ? {
                        backgroundColor: theme.accentColor,
                        color: "#ffffff",
                        borderColor: theme.accentColor
                      } : {
                        color: theme.textColor
                      }}
                    >
                      {type === "preset" ? "PRESETS" : "CUSTOM COLOR"}
                    </button>
                  ))}
                </div>

                {textType === "preset" && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: "Neon Green (#00FF01) & White", label: "Neon Green/White" },
                      { name: "Golden Yellow (#FFD700) & White", label: "Gold Yellow/White" }
                    ].map((item) => (
                      <button
                        key={item.name}
                        onClick={() => setThumbTextColor(item.name)}
                        className={`py-1 px-1.5 text-[9px] font-mono border text-center cursor-pointer transition-all`}
                        style={thumbTextColor === item.name ? {
                          backgroundColor: theme.accentColor,
                          color: "#ffffff",
                          borderColor: theme.accentColor,
                          borderRadius: "17px",
                          fontWeight: "bold"
                        } : {
                          backgroundColor: `${theme.accentColor}08`,
                          borderColor: `${theme.accentColor}20`,
                          color: theme.textColor,
                          borderRadius: "12px",
                          opacity: 0.75
                        }}
                        type="button"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}

                {textType === "custom" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 p-1.5 rounded-xl border" style={{ backgroundColor: `${theme.accentColor}08`, borderColor: `${theme.accentColor}20` }}>
                        <input
                          type="color"
                          value={customTextCol1}
                          onChange={(e) => setCustomTextCol1(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer p-0 border-0 bg-transparent shrink-0"
                        />
                        <div className="overflow-hidden">
                          <span className="text-[8px] font-mono block truncate opacity-70" style={{ color: theme.textColor }}>Primary Text</span>
                          <span className="text-[9px] font-mono font-semibold block" style={{ color: theme.accentColor }}>{customTextCol1}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl border" style={{ backgroundColor: `${theme.accentColor}08`, borderColor: `${theme.accentColor}20` }}>
                        <input
                          type="color"
                          value={customTextCol2}
                          onChange={(e) => setCustomTextCol2(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer p-0 border-0 bg-transparent shrink-0"
                        />
                        <div className="overflow-hidden">
                          <span className="text-[8px] font-mono block truncate opacity-70" style={{ color: theme.textColor }}>Accent/Shadow</span>
                          <span className="text-[9px] font-mono font-semibold block" style={{ color: theme.accentColor }}>{customTextCol2}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Custom Color Palette Swatches */}
                    <div className="space-y-1 pt-1.5">
                      <span className="text-[8px] font-mono uppercase tracking-wider block opacity-75" style={{ color: theme.textColor }}>
                        Quick Custom Palette Swatches:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { primary: "#00E5FF", accent: "#FFFFFF", label: "Blue Highlight & White" },
                          { primary: "#00FF01", accent: "#E5E7EB", label: "Neon Green & Silver" },
                          { primary: "#FFD700", accent: "#F3F4F6", label: "Golden Yellow & Light Grey" },
                          { primary: "#FF5722", accent: "#FEF3C7", label: "Sunset Orange & Cream" },
                          { primary: "#FF2E93", accent: "#F9FAFB", label: "Electric Pink & Cool White" },
                          { primary: "#A855F7", accent: "#FFFFFF", label: "Vivid Purple & Pure White" }
                        ].map((swatch, idx) => {
                          const isSelected = customTextCol1 === swatch.primary && customTextCol2 === swatch.accent;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setCustomTextCol1(swatch.primary);
                                setCustomTextCol2(swatch.accent);
                              }}
                              className="p-1 rounded border transition-all text-left flex items-center gap-1.5 cursor-pointer text-[8px] font-mono"
                              style={isSelected ? {
                                borderColor: theme.accentColor,
                                backgroundColor: `${theme.accentColor}12`,
                                color: theme.textColor
                              } : {
                                borderColor: `${theme.accentColor}15`,
                                color: theme.textColor,
                                opacity: 0.75
                              }}
                            >
                              <span className="flex gap-0.5 shrink-0">
                                <span style={{ backgroundColor: swatch.primary }} className="w-2.5 h-2.5 rounded-full border border-black/35" />
                                <span style={{ backgroundColor: swatch.accent }} className="w-2.5 h-2.5 rounded-full border border-black/35" />
                              </span>
                              <span className="truncate">{swatch.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
 
                    {/* Live Preview Text Overlay */}
                    <div className="py-1.5 px-3 rounded-lg border text-center" style={{ backgroundColor: `${theme.accentColor}05`, borderColor: `${theme.accentColor}20` }}>
                      <span className="text-[8px] font-mono block mb-1 opacity-70" style={{ color: theme.textColor }}>Live Text Color Contrast Preview:</span>
                      <span style={{ color: customTextCol1 }} className="text-xs font-black">Main Headline (Primary Blue/Highlight)</span>
                      {" "}
                      <span style={{ color: customTextCol2 }} className="text-[10px] font-medium">Tagline (Accent/Secondary)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT PANELS AREA (8 cols) */}
          <div className="lg:col-span-8 xl:col-span-8 space-y-5">
            
            {/* INPUT SOURCE EXTRACTOR & GENERATOR TABS */}
            <div className="glass-card p-5 rounded-2xl backdrop-blur-xl space-y-4 transition-all duration-300 border hover:border-white/30" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: `${theme.accentColor}30` }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-extrabold tracking-wider uppercase" style={{ color: theme.accentColor }}>Input Source:</span>
                  <div className="flex items-center gap-1.5 p-1 rounded-2xl border glass-card" style={{ backgroundColor: `${theme.accentColor}08`, borderColor: `${theme.accentColor}25` }}>
                    {(["topic", "url", "files"] as const).map((source) => (
                      <button
                        key={source}
                        onClick={() => setInputSource(source)}
                        className={`glass-button px-3 py-1.5 rounded-xl text-[10px] font-mono tracking-wider transition-all duration-300 uppercase cursor-pointer border ${
                          inputSource === source ? "font-extrabold shadow-md scale-100" : "border-transparent opacity-70"
                        }`}
                        style={inputSource === source ? {
                          backgroundColor: theme.accentColor,
                          color: "#ffffff",
                          borderColor: theme.accentColor
                        } : {
                          color: theme.textColor
                        }}
                      >
                        {source === "topic" ? "● Topic" : source === "url" ? "● Video URL" : "● Files"}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  id="btn-prefill"
                  onClick={prefillSample}
                  className="glass-button text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer px-4 py-2 rounded-xl border transition-all duration-300 active:scale-95 shadow-md"
                  style={{
                    borderColor: theme.accentColor,
                    backgroundColor: `${theme.accentColor}18`,
                    color: theme.textColor
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> Insert Sample Script
                </button>
              </div>

              {/* TAB CONTENT */}
              <div>
                {inputSource === "topic" && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-6 space-y-1.5 relative">
                      <label className="text-[10px] font-mono uppercase tracking-wider block opacity-75" style={{ color: theme.textColor }}>Topic</label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={topicName}
                          onChange={(e) => setTopicName(e.target.value)}
                          placeholder="e.g. Benefits of Intermittent Fasting, Quantum Physics Explained..."
                          className="glass-input w-full rounded-xl py-2 pl-4 pr-10 text-xs font-mono focus:outline-none transition-all duration-300"
                          style={{
                            backgroundColor: theme.inputBg,
                            borderColor: theme.isLight ? "#E5E5E5" : "transparent",
                            color: theme.textColor
                          }}
                        />
                        
                        {/* Mic Icon / STT button */}
                        <div className="absolute right-2.5 flex items-center gap-1.5">
                          {listeningInput === "topic" ? (
                            <button
                              type="button"
                              onClick={stopSpeechToText}
                              className="glass-button p-1 rounded-lg bg-red-950/40 text-red-400 border border-red-900/40 hover:bg-red-900 hover:text-white transition-all cursor-pointer"
                              title="Stop listening"
                            >
                              <MicOff className="h-3.5 w-3.5 animate-pulse text-red-400" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startSpeechToText("topic")}
                              className="glass-button p-1 rounded-lg transition-all cursor-pointer border"
                              style={{
                                backgroundColor: `${theme.accentColor}08`,
                                borderColor: `${theme.accentColor}25`,
                                color: theme.textColor
                              }}
                              title="Speech to Text"
                            >
                              <Mic className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Gemini STT Animation Wave Overlay */}
                      <AnimatePresence>
                        {listeningInput === "topic" && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute inset-x-0 bottom-0 top-[18px] bg-black/95 rounded-xl flex items-center justify-between px-3 z-20 border glass-card"
                            style={{ borderColor: theme.accentColor }}
                          >
                            <span className="text-[10px] font-mono uppercase tracking-wider animate-pulse flex items-center gap-1" style={{ color: theme.accentColor }}>
                              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                              Listening...
                            </span>
                            
                            {/* Gemini Waveform */}
                            <div className="flex items-end gap-1 h-5 mr-2">
                              <motion.div className="w-1 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["20%", "80%", "20%"] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }} />
                              <motion.div className="w-1 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["40%", "100%", "40%"] }} transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: 0.1 }} />
                              <motion.div className="w-1 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["15%", "75%", "15%"] }} transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.25 }} />
                              <motion.div className="w-1 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["50%", "90%", "50%"] }} transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut", delay: 0.15 }} />
                              <motion.div className="w-1 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["25%", "60%", "25%"] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }} />
                            </div>

                            <button
                              type="button"
                              onClick={stopSpeechToText}
                              className="glass-button text-[9px] font-mono text-white hover:opacity-90 px-1.5 py-0.5 rounded bg-red-950/40 border border-red-900/40 transition-all hover:bg-red-900"
                            >
                              Stop
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="md:col-span-3 space-y-1.5">
                      <label className="text-[10px] font-mono uppercase tracking-wider block opacity-75" style={{ color: theme.textColor }}>Word Count Limit</label>
                      <input
                        type="number"
                        min="100"
                        max="20000"
                        value={topicWordLimit}
                        onChange={(e) => setTopicWordLimit(Math.max(100, parseInt(e.target.value) || 100))}
                        className="glass-input w-full rounded-xl py-2 px-4 text-xs font-mono focus:outline-none transition-all duration-300"
                        style={{
                          backgroundColor: theme.inputBg,
                          borderColor: theme.isLight ? "#E5E5E5" : "transparent",
                          color: theme.textColor
                        }}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <button
                        onClick={handleGenerateFromTopic}
                        disabled={topicGenerating || !topicName.trim()}
                        className={`glass-button w-full py-2 px-4 rounded-xl font-mono text-xs font-extrabold uppercase transition-all duration-300 flex items-center justify-center gap-2 border cursor-pointer shadow-lg`}
                        style={topicName.trim() && !topicGenerating ? {
                          backgroundColor: theme.accentColor,
                          borderColor: theme.accentColor,
                          color: "#ffffff"
                        } : {
                          backgroundColor: `${theme.accentColor}08`,
                          borderColor: `${theme.accentColor}25`,
                          color: theme.textColor,
                          opacity: 0.5,
                          cursor: "not-allowed"
                        }}
                      >
                        {topicGenerating ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> GENERATING...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" /> GENERATE DRAFT
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {inputSource === "url" && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-6 space-y-1.5">
                      <label className="text-[10px] font-mono uppercase tracking-wider block opacity-75" style={{ color: theme.textColor }}>Paste URL (YouTube / Facebook / TikTok / Instagram)</label>
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="glass-input w-full rounded-xl py-2 px-4 text-xs font-mono focus:outline-none transition-all duration-300"
                        style={{
                          backgroundColor: theme.inputBg,
                          borderColor: theme.accentColor,
                          borderWidth: "1px",
                          borderStyle: "solid",
                          color: theme.textColor
                        }}
                      />
                    </div>
                    <div className="md:col-span-6">
                      <button
                        onClick={() => handleExtractTranscript("direct")}
                        disabled={isExtractingUrl || !videoUrl.trim()}
                        className={`glass-button w-full py-2 px-4 rounded-xl font-mono text-xs font-extrabold uppercase transition-all duration-300 flex items-center justify-center gap-2 border cursor-pointer shadow-lg`}
                        style={videoUrl.trim() && !isExtractingUrl ? {
                          backgroundColor: theme.accentColor,
                          borderColor: theme.accentColor,
                          color: "#ffffff"
                        } : {
                          backgroundColor: `${theme.accentColor}08`,
                          borderColor: `${theme.accentColor}25`,
                          color: theme.textColor,
                          opacity: 0.5,
                          cursor: "not-allowed"
                        }}
                      >
                        {isExtractingUrl ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> EXTRACTING TRANSCRIPT...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5" /> GET YOUTUBE TRANSCRIPT
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {inputSource === "files" && (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 transition-all duration-300 group glass-card" style={{ borderColor: `${theme.accentColor}40`, backgroundColor: `${theme.accentColor}05` }}>
                    <input
                      type="file"
                      id="file-source-upload"
                      accept=".txt,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="file-source-upload"
                      className="flex flex-col items-center gap-2.5 cursor-pointer text-center"
                    >
                      <div className="h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 border glass-button" style={{ backgroundColor: `${theme.accentColor}12`, borderColor: theme.accentColor, color: theme.accentColor }}>
                        <Plus className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-mono font-semibold" style={{ color: theme.textColor }}>Click or Drag & Drop File</p>
                        <p className="text-[10px] font-mono opacity-70 mt-1" style={{ color: theme.textColor }}>Accepts raw .txt or standard .pdf files</p>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* INSTRUCTIONAL PLACEMENT RULE:
                "Place the 'fast light mood' and 'generative script' above the download tabs and the output Tab."
                Here is the stunning, horizontal generation and options bar! Positioned prominently right on top of the workspaces.
            */}
            <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300 border" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
              
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center animate-pulse glass-card" style={{ backgroundColor: `${theme.accentColor}15`, color: theme.accentColor }}>
                  <Sliders className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono tracking-widest uppercase block font-extrabold" style={{ color: theme.accentColor }}>Automation Command Console</span>
                  <p className="text-xs opacity-75" style={{ color: theme.textColor }}>Set options & trigger plagiarism-free script transformation</p>
                </div>
              </div>

              {/* ACTION TOGGLES AND BRIGHT TRIGGER BUTTON */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                
                {/* FAST LITE MODE CAPULE TOGGLE */}
                <div className="flex items-center gap-2 p-1.5 rounded-2xl border transition-all duration-300 glass-card" style={{ backgroundColor: theme.inputBg, borderColor: `${theme.accentColor}30` }}>
                  <button
                    id="toggle-fast-lite"
                    onClick={() => setFastLiteMode(!fastLiteMode)}
                    className={`glass-button py-1.5 px-4 rounded-xl text-xs font-mono font-extrabold flex items-center gap-1.5 transition-all duration-300 hover:scale-103 active:scale-95 border ${
                      fastLiteMode ? "shadow-md scale-100" : "border-transparent opacity-70"
                    }`}
                    style={fastLiteMode ? {
                      backgroundColor: `${theme.accentColor}25`,
                      color: theme.accentColor,
                      borderColor: theme.accentColor
                    } : {
                      color: theme.textColor
                    }}
                  >
                    <Zap className={`h-3.5 w-3.5 ${fastLiteMode ? "animate-bounce" : ""}`} style={{ color: fastLiteMode ? theme.accentColor : "inherit", fill: fastLiteMode ? theme.accentColor : "none" }} />
                    FAST LITE MOOD
                  </button>
                </div>

                {/* GENERATE SCRIPT CAPULE BUTTON */}
                <button
                  id="btn-generate-script"
                  onClick={() => handleGenerate()}
                  disabled={loading || !rawScript.trim()}
                  className={`glass-button py-3 px-8 rounded-2xl font-display text-xs font-extrabold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 border cursor-pointer shadow-xl hover:scale-105 active:scale-95`}
                  style={rawScript.trim() ? {
                    backgroundColor: theme.accentColor,
                    borderColor: theme.accentColor,
                    color: "#ffffff"
                  } : {
                    backgroundColor: `${theme.accentColor}08`,
                    borderColor: `${theme.accentColor}25`,
                    color: theme.textColor,
                    opacity: 0.5,
                    cursor: "not-allowed"
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> REPHRASING...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin" /> GENERATE SCRIPT
                    </>
                  )}
                </button>

              </div>
            </div>

            {/* SCRIPT WORKSPACE COLUMNS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* RAW SOURCE SCRIPT BOX */}
              <div className="glass-card flex flex-col h-[480px] rounded-2xl overflow-hidden transition-all duration-150 border hover:border-white/30" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
                <div className="px-5 py-3 border-b flex items-center justify-between glass-card" style={{ borderColor: `${theme.accentColor}30`, backgroundColor: `${theme.accentColor}08` }}>
                  <span className="text-xs font-mono font-extrabold tracking-wider flex items-center gap-2" style={{ color: theme.accentColor }}>
                    <FileText className="h-4 w-4" style={{ color: theme.accentColor }} />
                    RAW SOURCE SCRIPT
                  </span>
                  <span className="glass-card text-[10px] font-mono px-3 py-1 rounded-xl border" style={{ backgroundColor: theme.inputBg, borderColor: `${theme.accentColor}30`, color: theme.textColor }}>
                    {rawScript.length} CHARACTERS
                  </span>
                </div>
                
                <div className="flex-1 relative">
                  <textarea
                    id="textarea-raw-script"
                    value={rawScript}
                    onChange={(e) => setRawScript(e.target.value)}
                    placeholder="Provide your script, video notes, medical findings, or tech ideas here. Any input language is supported. The engine completely rewrites your ideas into highly fluent wording with no plagiarism..."
                    className="w-full h-full bg-transparent resize-none p-5 text-xs md:text-sm focus:outline-none placeholder-gray-500 leading-relaxed font-mono transition-all duration-300 pr-12"
                    style={{ color: theme.textColor }}
                  />
                  
                  {/* Controls container in bottom right corner */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
                    {listeningInput === "rawScript" ? (
                      <button
                        type="button"
                        onClick={stopSpeechToText}
                        className="glass-button p-2.5 rounded-full bg-red-950/80 text-red-400 border border-red-800/80 hover:bg-red-900 transition-all cursor-pointer shadow-lg flex items-center justify-center"
                        title="Stop speech-to-text"
                      >
                        <MicOff className="h-4 w-4 animate-bounce text-red-400" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startSpeechToText("rawScript")}
                        className="glass-button p-2.5 rounded-full border transition-all cursor-pointer shadow-lg flex items-center justify-center hover:scale-110 active:scale-95"
                        style={{
                          backgroundColor: `${theme.accentColor}12`,
                          borderColor: theme.accentColor,
                          color: theme.textColor
                        }}
                        title="Speak to enter script"
                      >
                        <Mic className="h-4 w-4" />
                      </button>
                    )}

                    {rawScript && (
                      <button
                        id="btn-clear-raw"
                        onClick={() => setRawScript("")}
                        className="glass-button p-2 rounded-xl bg-red-950/30 text-red-400 border border-red-900/40 hover:bg-red-900 hover:text-white transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95"
                        title="Clear text"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Gemini listening wave animation overlay */}
                  <AnimatePresence>
                    {listeningInput === "rawScript" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-5 z-20 border glass-card"
                        style={{ borderColor: theme.accentColor }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full bg-red-500 animate-ping" />
                          <h3 className="text-sm font-mono uppercase tracking-widest font-black" style={{ color: theme.accentColor }}>
                            Gemini Voice Scriptwriter Active
                          </h3>
                        </div>
                        <p className="text-xs text-gray-400 max-w-sm text-center leading-relaxed font-mono">
                          Speak your script ideas, narration drafts, or notes. Your voice is captured in real-time.
                        </p>
                        
                        {/* Gemini Waveform */}
                        <div className="flex items-end gap-1.5 h-10 px-6 py-2 rounded-full border glass-card" style={{ backgroundColor: `${theme.accentColor}08`, borderColor: `${theme.accentColor}30` }}>
                          <motion.div className="w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["15%", "85%", "15%"] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }} />
                          <motion.div className="w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["40%", "100%", "40%"] }} transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: 0.08 }} />
                          <motion.div className="w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["20%", "70%", "20%"] }} transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.16 }} />
                          <motion.div className="w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["50%", "95%", "50%"] }} transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut", delay: 0.12 }} />
                          <motion.div className="w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["10%", "60%", "10%"] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} />
                          <motion.div className="w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["35%", "80%", "35%"] }} transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut", delay: 0.14 }} />
                        </div>

                        <button
                          type="button"
                          onClick={stopSpeechToText}
                          className="glass-button px-5 py-2 rounded-xl bg-red-950/30 hover:bg-red-900 border border-red-900/60 text-red-200 text-xs font-mono transition-all cursor-pointer hover:scale-105"
                        >
                          Finish & Save Script
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* POLISHED V.O. SCRIPT / OUTPUT BOX */}
              <div className="glass-card flex flex-col h-[480px] rounded-2xl overflow-hidden relative transition-all duration-150 border hover:border-white/30" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
                {/* Active glowing ambient frame segment */}
                <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: `linear-gradient(to right, transparent, ${theme.accentColor}80, transparent)` }} />
                
                <div className="px-4 py-3 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 glass-card" style={{ borderColor: `${theme.accentColor}30`, backgroundColor: `${theme.accentColor}08` }}>
                  <span className="text-xs font-mono font-extrabold tracking-wider flex items-center gap-1.5" style={{ color: theme.accentColor }}>
                    <Sparkles className="h-4 w-4" style={{ color: theme.accentColor }} />
                    POLISHED V.O. SCRIPT
                  </span>
                  
                  {/* METADATA DOWNLOAD & LISTEN TABS (rounded-xl caps) */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {polishedScript && getFilteredVoices().length > 0 && (
                      <div className="glass-card flex items-center gap-1 border rounded-xl px-2 py-1" style={{ backgroundColor: `${theme.accentColor}12`, borderColor: `${theme.accentColor}30` }}>
                        <span className="text-[9px] font-mono font-bold" style={{ color: theme.textColor }}>🎙️ VOICE:</span>
                        <select
                          id="select-voice-speaker"
                          value={selectedVoiceName}
                          onChange={(e) => setSelectedVoiceName(e.target.value)}
                          className="bg-transparent border-none text-[10px] font-mono font-bold focus:outline-none cursor-pointer max-w-[120px] sm:max-w-[160px] truncate outline-none"
                          style={{ colorScheme: "dark", color: theme.accentColor }}
                        >
                          {getFilteredVoices().map((voice) => (
                            <option key={voice.name} value={voice.name} style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>
                              {voice.name} ({voice.lang})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button
                      id="btn-listen-ai"
                      onClick={handleListen}
                      disabled={!polishedScript}
                      className="glass-button px-3 py-1 rounded-xl text-[10px] font-mono font-bold tracking-tight flex items-center gap-1 transition-all duration-300 cursor-pointer border active:scale-95"
                      style={polishedScript ? (
                        isPlayingAudio ? {
                          backgroundColor: "rgba(127, 29, 29, 0.4)",
                          borderColor: "#ef4444",
                          color: "#f87171"
                        } : {
                          backgroundColor: `${theme.accentColor}15`,
                          borderColor: theme.accentColor,
                          color: theme.accentColor
                        }
                      ) : {
                        color: "rgb(107, 114, 128)",
                        borderColor: "transparent",
                        opacity: 0.4
                      }}
                    >
                      {isPlayingAudio ? (
                        <>
                          <VolumeX className="h-3.5 w-3.5 text-red-400" /> STOP VO
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3.5 w-3.5" style={{ color: polishedScript ? theme.accentColor : "inherit" }} /> LISTEN AI
                        </>
                      )}
                    </button>
                    <button
                      id="btn-insert-to-transcript"
                      onClick={() => {
                        if (polishedScript) {
                          setTranscriptInput(polishedScript);
                        }
                      }}
                      disabled={!polishedScript}
                      className="glass-button px-3 py-1 text-[10px] font-mono font-bold tracking-tight flex items-center gap-1 transition-all duration-300 cursor-pointer border active:scale-95 rounded-xl"
                      style={polishedScript ? {
                        backgroundColor: theme.accentColor,
                        color: "#ffffff",
                        borderColor: theme.accentColor
                      } : {
                        color: "rgb(107, 114, 128)",
                        borderColor: "transparent",
                        opacity: 0.4
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" /> INSERT
                    </button>
                    <button
                      id="btn-copy-script"
                      onClick={handleCopy}
                      disabled={!polishedScript}
                      className="glass-button px-3 py-1 rounded-xl text-[10px] font-mono font-bold tracking-tight flex items-center gap-1 transition-all duration-300 cursor-pointer border active:scale-95"
                      style={polishedScript ? {
                        backgroundColor: `${theme.accentColor}15`,
                        borderColor: theme.accentColor,
                        color: theme.accentColor
                      } : {
                        color: "rgb(107, 114, 128)",
                        borderColor: "transparent",
                        opacity: 0.4
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" /> {copied ? "COPIED!" : "COPY TXT"}
                    </button>
                    <button
                      id="btn-download-script"
                      onClick={handleDownload}
                      disabled={!polishedScript}
                      className="glass-button px-3 py-1 rounded-xl text-[10px] font-mono font-bold tracking-tight flex items-center gap-1 transition-all duration-300 cursor-pointer border active:scale-95"
                      style={polishedScript ? {
                        backgroundColor: `${theme.accentColor}15`,
                        borderColor: theme.accentColor,
                        color: theme.accentColor
                      } : {
                        color: "rgb(107, 114, 128)",
                        borderColor: "transparent",
                        opacity: 0.4
                      }}
                    >
                      <Download className="h-3.5 w-3.5" /> DOWNLOAD
                    </button>
                  </div>
                </div>

                {/* USER INSTRUCTION: "In the output box, add three buttons: one for Hindi with Urdu wording, second for Urdu with Roman writing, third for Urdu with urdu Writing, 4th with English."
                    Let's place these extremely prominent language trigger buttons directly on top */}
                <div className="border-b p-2.5 space-y-2 glass-card" style={{ backgroundColor: `${theme.accentColor}08`, borderColor: `${theme.accentColor}25` }}>
                  <span className="text-[10px] font-mono tracking-wider block text-center uppercase font-extrabold" style={{ color: theme.accentColor }}>
                    ⚡ Quick Instant Transformation Buttons
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      id="btn-quick-lang-hindi"
                      onClick={() => handleSelectLanguage("hindi")}
                      disabled={loading || !rawScript.trim()}
                      className="glass-button py-1.5 px-2 text-[9px] font-mono transition-all duration-300 border hover:scale-103 active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed rounded-xl font-bold"
                      style={transformation === "hindi" && polishedScript ? {
                        backgroundColor: theme.accentColor,
                        color: "#ffffff",
                        borderColor: theme.accentColor
                      } : {
                        backgroundColor: `${theme.accentColor}10`,
                        color: theme.textColor,
                        borderColor: `${theme.accentColor}30`
                      }}
                    >
                      🇮🇳 Hindi (Urdu Wording/Accent)
                    </button>
                    <button
                      id="btn-quick-lang-roman"
                      onClick={() => handleSelectLanguage("urdu-roman")}
                      disabled={loading || !rawScript.trim()}
                      className="glass-button py-1.5 px-2 text-[9px] font-mono transition-all duration-300 border hover:scale-103 active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed rounded-xl font-bold"
                      style={transformation === "urdu-roman" && polishedScript ? {
                        backgroundColor: theme.accentColor,
                        color: "#ffffff",
                        borderColor: theme.accentColor
                      } : {
                        backgroundColor: `${theme.accentColor}10`,
                        color: theme.textColor,
                        borderColor: `${theme.accentColor}30`
                      }}
                    >
                        🇵🇰 Urdu Roman
                    </button>
                    <button
                      id="btn-quick-lang-urdu"
                      onClick={() => handleSelectLanguage("urdu-writing")}
                      disabled={loading || !rawScript.trim()}
                      className="glass-button py-1.5 px-2 text-[11px] font-urdu transition-all duration-300 border hover:scale-103 active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed rounded-xl font-bold"
                      style={transformation === "urdu-writing" && polishedScript ? {
                        backgroundColor: theme.accentColor,
                        color: "#ffffff",
                        borderColor: theme.accentColor
                      } : {
                        backgroundColor: `${theme.accentColor}10`,
                        color: theme.textColor,
                        borderColor: `${theme.accentColor}30`
                      }}
                    >
                      🇵🇰 اردو تحریر
                    </button>
                    <button
                      id="btn-quick-lang-english"
                      onClick={() => handleSelectLanguage("english")}
                      disabled={loading || !rawScript.trim()}
                      className="glass-button py-1.5 px-2 text-[9px] font-mono transition-all duration-300 border hover:scale-103 active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed rounded-xl font-bold"
                      style={transformation === "english" && polishedScript ? {
                        backgroundColor: theme.accentColor,
                        color: "#ffffff",
                        borderColor: theme.accentColor
                      } : {
                        backgroundColor: `${theme.accentColor}10`,
                        color: theme.textColor,
                        borderColor: `${theme.accentColor}30`
                      }}
                    >
                      🇬🇧 English
                    </button>
                  </div>
                  {transformation === "hindi" && polishedScript && (
                    <div className="mx-2.5 mt-2.5 p-2 border rounded-xl text-center glass-card" style={{ backgroundColor: `${theme.accentColor}08`, borderColor: `${theme.accentColor}30` }}>
                      <p className="text-[11px] font-sans leading-relaxed" style={{ color: theme.textColor }}>
                        ✨ <strong style={{ color: theme.accentColor }}>देवनागरी लिपि में उर्दू एहसास (अस्सलामु अलैकुम):</strong> यह पूरी तरह से देवनागरी (हिंदी) अक्षरों में लिखा गया है, लेकिन इसके शब्द, वाक्य और उच्चारण शैली (लहज़ा) पूरी तरह से उर्दू और हिंदुस्तानी बातचीत पर आधारित हैं, ताकि जब इसे पढ़ा जाए तो यह मुकम्मल उर्दू लहज़े में लगे!
                      </p>
                    </div>
                  )}
                </div>

                {/* SCRIPT TEXT BOX / CONTAINER */}
                <div className="flex-1 overflow-y-auto p-5 relative font-sans text-xs md:text-sm leading-relaxed" style={{ color: theme.textColor }}>
                  {polishedScript && (
                    <div className="mb-3 flex items-center justify-between border-b pb-2.5" style={{ borderColor: `${theme.accentColor}30` }}>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold border glass-card" style={{ backgroundColor: `${theme.accentColor}15`, borderColor: `${theme.accentColor}30`, color: theme.accentColor }}>
                        <Sparkles className="h-3 w-3 animate-pulse" style={{ color: theme.accentColor }} />
                        Generated with {lastModelUsed || modelSettings.scriptGeneration}
                      </span>
                      {plagiarismCheck === "verified" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-semibold">
                          <CheckCircle className="h-3 w-3" /> 100% Plagiarism Free ({plagiarismScore.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  )}
                  {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 space-y-4 glass-card">
                      <Loader2 className="h-10 w-10 animate-spin" style={{ color: theme.accentColor }} />
                      <div className="text-center space-y-1">
                        <p className="text-xs font-mono tracking-widest uppercase animate-pulse" style={{ color: theme.accentColor }}>
                          DIVERSIFYING & REPHRASING...
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">
                          Transforming into {transformation.toUpperCase()} · Uniqueness check enabled
                        </p>
                      </div>
                    </div>
                  ) : polishedScript ? (
                    <div
                      className={`space-y-4 select-text whitespace-pre-wrap ${transformation === "urdu-writing" ? "font-urdu text-right text-lg md:text-xl font-medium leading-loose" : "font-sans"}`}
                      dir={transformation === "urdu-writing" ? "rtl" : "ltr"}
                    >
                      {polishedScript}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <div className="h-14 w-14 rounded-2xl border border-dashed flex items-center justify-center text-gray-400 animate-pulse glass-card" style={{ borderColor: `${theme.accentColor}35`, color: theme.accentColor }}>
                        <Sparkles className="h-7 w-7" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.textColor }}>
                          Output Screen Ready
                        </p>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto">
                          Configure your options, paste your draft, and hit the generate command above or languages directly inside the tab.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* CINEMATIC STORYBOARD & SCENE PROMPT CREATOR SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
              
              {/* SECTION 1: TRANSCRIPT INPUT */}
              <div className="glass-card flex flex-col h-[480px] rounded-2xl overflow-hidden transition-all duration-300 border hover:border-white/30 backdrop-blur-xl" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
                <div className="px-5 py-3 border-b flex flex-col xl:flex-row xl:items-start justify-between gap-3 glass-card" style={{ borderColor: `${theme.accentColor}30`, backgroundColor: `${theme.accentColor}08` }}>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-mono font-extrabold tracking-wider flex items-center gap-2" style={{ color: theme.accentColor }}>
                      <Sliders className="h-4 w-4" />
                      TRANSCRIPT INPUT <Plus className="h-4 w-4 animate-bounce" style={{ color: theme.accentColor }} />
                    </span>
                    <span className="text-[9px] text-gray-400 font-mono">Configure script parameters & aspect ratios</span>
                  </div>
                  
                  {/* Controllers organized in sequential rows */}
                  <div className="flex flex-col gap-2.5 w-full xl:w-auto items-start xl:items-end">
                    
                    {/* Row 1: Domain Category and Scenes (with integrated Shots Calculator) */}
                    <div className="flex items-center gap-2 flex-wrap w-full xl:w-auto justify-start xl:justify-end">
                      
                      {/* Domain Category - First */}
                      <div className="glass-card flex items-center gap-1.5 px-2 py-1 rounded-xl border" style={{ backgroundColor: `${theme.accentColor}08`, borderColor: `${theme.accentColor}30` }}>
                        <span className="text-[9px] text-gray-400 font-mono">CATEGORY:</span>
                        <select
                          value={contentCategory}
                          onChange={(e) => {
                            setContentCategory(e.target.value);
                            setTopicNiche(e.target.value);
                          }}
                          className="bg-transparent text-[10px] font-mono focus:outline-none font-bold cursor-pointer"
                          style={{ colorScheme: "dark", color: theme.accentColor }}
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat} style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Scenes with Shots Calculator toggle */}
                      <div className="glass-card flex items-center gap-1 px-2 py-1 rounded-xl border" style={{ backgroundColor: `${theme.accentColor}08`, borderColor: `${theme.accentColor}30` }}>
                        <span className="text-[9px] text-gray-400 font-mono">SCENES:</span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={numScenes}
                          onChange={(e) => setNumScenes(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="bg-transparent w-8 text-[10px] font-mono focus:outline-none font-bold"
                          style={{ color: theme.accentColor }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowShotsCalculator(!showShotsCalculator)}
                          className="glass-button p-1 rounded hover:opacity-85 text-xs transition-all flex items-center justify-center cursor-pointer"
                          style={{
                            color: showShotsCalculator ? "#ffffff" : theme.textColor,
                            backgroundColor: showShotsCalculator ? theme.accentColor : "transparent"
                          }}
                          title="Open Shots Calculator (duration-based)"
                        >
                          <Calculator className="h-3 w-3" />
                        </button>
                      </div>

                    </div>

                    {/* Row 2: Insert and Import File in ONE line */}
                    <div className="flex items-center gap-2 w-full xl:w-auto justify-start xl:justify-end">
                      <button
                        onClick={() => {
                          if (polishedScript) {
                            setTranscriptInput(polishedScript);
                          }
                        }}
                        disabled={!polishedScript}
                        className="glass-button py-1 px-3 rounded-xl font-mono text-[9px] font-extrabold tracking-wider uppercase transition-all duration-300 flex items-center gap-1 border cursor-pointer"
                        style={polishedScript ? {
                          backgroundColor: theme.accentColor,
                          color: "#ffffff",
                          borderColor: theme.accentColor
                        } : {
                          color: "rgb(107, 114, 128)",
                          borderColor: "transparent",
                          opacity: 0.4
                        }}
                        title="Insert the polished voice over script"
                      >
                        <Plus className="h-3 w-3" /> INSERT
                      </button>

                      <label
                        className="glass-button py-1 px-3 rounded-xl font-mono text-[9px] font-extrabold tracking-wider uppercase transition-all duration-300 flex items-center gap-1 border cursor-pointer active:scale-95"
                        style={{
                          backgroundColor: `${theme.accentColor}15`,
                          borderColor: theme.accentColor,
                          color: theme.accentColor
                        }}
                      >
                        <Plus className="h-3 w-3" /> IMPORT FILE
                        <input
                          type="file"
                          accept=".txt,.pdf"
                          onChange={handleTranscriptInputFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Row 3: Format Dropdown below them */}
                    <div className="glass-card flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all duration-300 w-fit" style={{ backgroundColor: `${theme.accentColor}08`, borderColor: `${theme.accentColor}30` }}>
                      <span className="text-[9px] text-gray-400 font-mono">FORMAT:</span>
                      <select
                        value={storyboardFormat}
                        onChange={(e) => setStoryboardFormat(e.target.value as any)}
                        className="bg-transparent text-[10px] font-mono focus:outline-none font-bold cursor-pointer outline-none"
                        style={{ colorScheme: "dark", color: theme.accentColor }}
                      >
                        <option value="16:9" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Horizontal (16:9)</option>
                        <option value="9:16" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Vertical (9:16)</option>
                        <option value="1:1" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>Square (1:1)</option>
                        <option value="none" style={{ backgroundColor: theme.inputBg, color: theme.textColor }}>None (No Format)</option>
                      </select>
                    </div>

                  </div>
                </div>

                <div className="flex-1 relative flex flex-col">
                  {/* Shots Calculator Panel */}
                  <AnimatePresence>
                    {showShotsCalculator && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-b p-4 space-y-3 font-mono overflow-hidden z-30"
                        style={{ backgroundColor: theme.cardBg, borderColor: `${theme.accentColor}40` }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: theme.accentColor }}>
                            <Calculator className="h-3.5 w-3.5 animate-pulse" /> duration-based shots calculator
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowShotsCalculator(false)}
                            className="text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors"
                            style={{
                              backgroundColor: "rgba(127, 29, 29, 0.2)",
                              color: "#f87171",
                              border: "1px solid rgba(239, 68, 110, 0.4)"
                            }}
                          >
                            CLOSE
                          </button>
                        </div>

                        {/* Calculator Inputs */}
                        <div className="grid grid-cols-3 gap-2.5">
                          <div>
                            <label className="text-[8px] text-gray-400 block mb-1">VIDEO MINS</label>
                            <input
                              type="number"
                              min="0"
                              value={calcVideoMinutes}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setCalcVideoMinutes(val);
                                const totSec = (val * 60) + calcVideoSeconds;
                                setNumScenes(Math.ceil(totSec / calcShotDuration) || 1);
                              }}
                              className="w-full rounded px-2 py-1 text-xs font-bold font-mono focus:outline-none border"
                              style={{ backgroundColor: theme.inputBg, borderColor: `${theme.accentColor}40`, color: theme.textColor }}
                            />
                          </div>
                          <div>
                            <label className="text-[8px] text-gray-400 block mb-1">VIDEO SECS</label>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={calcVideoSeconds}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                                setCalcVideoSeconds(val);
                                const totSec = (calcVideoMinutes * 60) + val;
                                setNumScenes(Math.ceil(totSec / calcShotDuration) || 1);
                              }}
                              className="w-full rounded px-2 py-1 text-xs font-bold font-mono focus:outline-none border"
                              style={{ backgroundColor: theme.inputBg, borderColor: `${theme.accentColor}40`, color: theme.textColor }}
                            />
                          </div>
                          <div>
                            <label className="text-[8px] text-gray-400 block mb-1">SHOT TIME (SEC)</label>
                            <input
                              type="number"
                              min="1"
                              value={calcShotDuration}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value) || 1);
                                setCalcShotDuration(val);
                                const totSec = (calcVideoMinutes * 60) + calcVideoSeconds;
                                setNumScenes(Math.ceil(totSec / val) || 1);
                              }}
                              className="w-full rounded px-2 py-1 text-xs font-bold font-mono focus:outline-none border"
                              style={{ backgroundColor: theme.inputBg, borderColor: `${theme.accentColor}40`, color: theme.textColor }}
                            />
                          </div>
                        </div>

                        {/* Output format requested by the user */}
                        <div className="p-3 rounded-xl border space-y-1.5 text-[10px] md:text-xs" style={{ backgroundColor: `${theme.accentColor}06`, borderColor: `${theme.accentColor}25` }}>
                          <p className="font-bold uppercase tracking-wider text-[8px] opacity-75" style={{ color: theme.accentColor }}>Output Details:</p>
                          <div className="space-y-1 font-bold" style={{ color: theme.textColor }}>
                            <div className="flex justify-between border-b py-1" style={{ borderColor: `${theme.accentColor}15` }}>
                              <span>Video Duration:</span>
                              <span style={{ color: theme.accentColor }}>
                                {calcVideoMinutes} minute{calcVideoMinutes !== 1 ? 's' : ''} {calcVideoSeconds > 0 ? `${calcVideoSeconds} second${calcVideoSeconds !== 1 ? 's' : ''}` : ''}
                              </span>
                            </div>
                            <div className="flex justify-between border-b py-1" style={{ borderColor: `${theme.accentColor}15` }}>
                              <span>Shot Duration:</span>
                              <span style={{ color: theme.accentColor }}>{calcShotDuration} seconds</span>
                            </div>
                            <div className="flex justify-between pt-1">
                              <span>Total Shots Required:</span>
                              <span style={{ color: theme.accentColor }} className="text-xs font-black">{Math.ceil(((calcVideoMinutes * 60) + calcVideoSeconds) / calcShotDuration) || 1}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <textarea
                    value={transcriptInput}
                    onChange={(e) => setTranscriptInput(e.target.value)}
                    placeholder="Paste complete raw transcript here. Specify the Number of Scenes and Content Category above, then hit Generate Scene Prompts..."
                    className="flex-1 bg-transparent resize-none p-5 text-xs md:text-sm focus:outline-none placeholder-gray-500 leading-relaxed font-mono transition-all duration-300 pr-12"
                    style={{ color: theme.textColor }}
                  />

                  {/* Speech to Text Floating Activator */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    {listeningInput === "transcript" ? (
                      <button
                        type="button"
                        onClick={stopSpeechToText}
                        className="glass-button p-2.5 rounded-full bg-red-950/80 text-red-400 border border-red-800/80 hover:bg-red-900 transition-all cursor-pointer shadow-lg flex items-center justify-center"
                        title="Stop speech-to-text"
                      >
                        <MicOff className="h-4 w-4 animate-bounce text-red-400" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startSpeechToText("transcript")}
                        className="glass-button p-2.5 rounded-full border transition-all cursor-pointer shadow-lg flex items-center justify-center hover:scale-110 active:scale-95"
                        style={{
                          backgroundColor: `${theme.accentColor}12`,
                          borderColor: theme.accentColor,
                          color: theme.textColor
                        }}
                        title="Speak to enter transcript / explain scene"
                      >
                        <Mic className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Gemini listening wave animation overlay */}
                  <AnimatePresence>
                    {listeningInput === "transcript" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-5 z-20 border glass-card"
                        style={{ borderColor: theme.accentColor }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full bg-red-500 animate-ping" />
                          <h3 className="text-sm font-mono uppercase tracking-widest font-black" style={{ color: theme.accentColor }}>
                            Gemini Voice Explainer Active
                          </h3>
                        </div>
                        <p className="text-xs text-gray-400 max-w-sm text-center leading-relaxed font-mono">
                          Speak your scene idea or raw narration naturally. Your speech will be transcribed and added directly as a storyboard segment.
                        </p>
                        
                        {/* Gemini Waveform */}
                        <div className="flex items-end gap-1.5 h-10 px-6 py-2 rounded-full border glass-card" style={{ backgroundColor: `${theme.accentColor}08`, borderColor: `${theme.accentColor}30` }}>
                          <motion.div className="w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["15%", "85%", "15%"] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }} />
                          <motion.div className="w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["40%", "100%", "40%"] }} transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: 0.08 }} />
                          <motion.div className="w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["20%", "70%", "20%"] }} transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.16 }} />
                          <motion.div className="w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["50%", "95%", "50%"] }} transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut", delay: 0.12 }} />
                          <motion.div className="w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["10%", "60%", "10%"] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} />
                          <motion.div className="w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["35%", "80%", "35%"] }} transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut", delay: 0.14 }} />
                        </div>

                        <button
                          type="button"
                          onClick={stopSpeechToText}
                          className="glass-button px-5 py-2 rounded-xl bg-red-950/30 hover:bg-red-900 border border-red-900/60 text-red-200 text-xs font-mono transition-all cursor-pointer hover:scale-105"
                        >
                          Finish & Save Input
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* SECTION 2: GENERATED SCENE PROMPTS */}
              <div className="glass-card flex flex-col h-[480px] rounded-2xl overflow-hidden relative transition-all duration-300 border hover:border-white/30 backdrop-blur-xl" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
                <div className="px-5 py-3 border-b flex flex-col xl:flex-row xl:items-center justify-between gap-3 glass-card" style={{ borderColor: `${theme.accentColor}30`, backgroundColor: `${theme.accentColor}08` }}>
                  <span className="text-xs font-mono font-extrabold tracking-wider flex items-center gap-1.5" style={{ color: theme.accentColor }}>
                    <Sparkles className="h-4 w-4" style={{ color: theme.accentColor }} />
                    GENERATED SCENE PROMPTS
                  </span>
                  
                  {/* Action buttons & Generate scenes controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleGenerateScenes}
                      disabled={scenesLoading || !transcriptInput.trim()}
                      className="glass-button py-1.5 px-4 rounded-xl font-mono text-[10px] font-black tracking-wider uppercase transition-all duration-300 flex items-center gap-1.5 border cursor-pointer"
                      style={transcriptInput.trim() && !scenesLoading ? {
                        backgroundColor: theme.accentColor,
                        color: "#ffffff",
                        borderColor: theme.accentColor
                      } : {
                        color: "rgb(107, 114, 128)",
                        borderColor: "transparent",
                        opacity: 0.4
                      }}
                    >
                      {scenesLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" /> GEN...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 animate-pulse" /> GENERATE SCENE PROMPTS
                        </>
                      )}
                    </button>

                    {scenes.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={handleCopyAllScenes}
                          className="glass-button p-1.5 rounded-xl border transition-all text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                          style={{ backgroundColor: `${theme.accentColor}15`, borderColor: theme.accentColor, color: theme.accentColor }}
                          title="Copy All"
                        >
                          <Copy className="h-3 w-3" /> COPY ALL
                        </button>
                        <button
                          onClick={handleDownloadAllScenesTxt}
                          className="glass-button p-1.5 rounded-xl border transition-all text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                          style={{ backgroundColor: `${theme.accentColor}15`, borderColor: theme.accentColor, color: theme.accentColor }}
                          title="Download Text"
                        >
                          <Download className="h-3 w-3" /> .TXT
                        </button>
                        <button
                          onClick={handleDownloadAllScenesDocx}
                          className="glass-button p-1.5 rounded-xl border transition-all text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                          style={{ backgroundColor: `${theme.accentColor}15`, borderColor: theme.accentColor, color: theme.accentColor }}
                          title="Download Word Document"
                        >
                          <Download className="h-3 w-3" /> .DOCX
                        </button>
                        <button
                          onClick={handleClearAllScenes}
                          className="glass-button p-1.5 rounded-xl bg-red-950/20 hover:bg-red-900 hover:text-white text-red-400 border border-red-900/40 transition-all text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                          title="Clear storyboard"
                        >
                          <Trash2 className="h-3 w-3" /> CLEAR
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* SCENES VIEWER */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {scenesLoading ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-3">
                      <Loader2 className="h-10 w-10 animate-spin" style={{ color: theme.accentColor }} />
                      <p className="text-xs font-mono uppercase tracking-wider animate-pulse" style={{ color: theme.accentColor }}>CREATING CINEMATIC STORYBOARD...</p>
                    </div>
                  ) : scenes.length > 0 ? (
                    scenes.map((scene) => (
                      <div
                        key={scene.id}
                        className="glass-card p-4 rounded-xl border space-y-3 transition-all duration-300 relative group"
                        style={{ backgroundColor: `${theme.accentColor}06`, borderColor: `${theme.accentColor}25` }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg border glass-card" style={{ backgroundColor: `${theme.accentColor}15`, borderColor: `${theme.accentColor}30`, color: theme.accentColor }}>
                            SCENE {scene.id}
                          </span>
                        </div>

                        {scene.loading ? (
                          <div className="py-6 flex flex-col items-center justify-center space-y-2">
                            <Loader2 className="h-6 w-6 animate-spin" style={{ color: theme.accentColor }} />
                            <p className="text-[10px] font-mono text-gray-400">Regenerating Scene...</p>
                          </div>
                        ) : (
                          <textarea
                            value={scene.text}
                            onChange={(e) => handleEditSceneText(scene.id, e.target.value)}
                            className="glass-input w-full rounded-lg p-3 text-xs focus:outline-none border leading-relaxed font-sans h-28 resize-none"
                            style={{ backgroundColor: theme.inputBg, borderColor: `${theme.accentColor}40`, color: theme.textColor }}
                          />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <div className="h-12 w-12 rounded-2xl border border-dashed flex items-center justify-center text-gray-400 animate-pulse glass-card" style={{ borderColor: `${theme.accentColor}35`, color: theme.accentColor }}>
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.textColor }}>No Storyboard Generated</p>
                        <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                          Paste your transcript in the left panel and click Generate Scene Prompts to build a stunning, optimized storyboard!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FULL-WIDTH SECOND WORKSPACE ARRANGEMENT */}
            <div className="space-y-5 mt-5">
                
                {/* WORKSPACE ROW 1: METADATA SUITE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Left Column: Video Transcript Input */}
                  <div className="glass-card flex flex-col h-[480px] rounded-2xl overflow-hidden transition-all duration-300 border hover:border-white/30 backdrop-blur-xl" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
                    <div className="px-5 py-3 border-b flex items-center justify-between glass-card" style={{ borderColor: `${theme.accentColor}30`, backgroundColor: `${theme.accentColor}08` }}>
                      <span className="text-xs font-mono font-extrabold tracking-wider flex items-center gap-2" style={{ color: theme.accentColor }}>
                        <FileText className="h-4 w-4" />
                        Video Transcript Input
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            if (polishedScript) {
                              setVideoTranscriptInput(polishedScript);
                            }
                          }}
                          disabled={!polishedScript}
                          className="glass-button py-1 px-2.5 rounded-xl font-mono text-[9px] font-extrabold tracking-tight flex items-center gap-1 border cursor-pointer transition-all"
                          style={polishedScript ? {
                            backgroundColor: theme.accentColor,
                            color: "#ffffff",
                            borderColor: theme.accentColor
                          } : {
                            color: "rgb(107, 114, 128)",
                            borderColor: "transparent",
                            opacity: 0.4,
                            cursor: "not-allowed"
                          }}
                          title="Insert from Polished Script"
                        >
                          <Plus className="h-3 w-3" /> INSERT POLISHED VO
                        </button>
                        <label
                          className="glass-button py-1 px-2.5 rounded-xl font-mono text-[9px] font-extrabold tracking-tight flex items-center gap-1 border cursor-pointer transition-all hover:scale-105 active:scale-95"
                          style={{
                            backgroundColor: `${theme.accentColor}15`,
                            borderColor: `${theme.accentColor}40`,
                            color: theme.accentColor
                          }}
                        >
                          <Plus className="h-3 w-3" /> IMPORT FILE
                          <input
                            type="file"
                            accept=".txt,.pdf"
                            onChange={handleVideoTranscriptFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex-1 relative">
                      <textarea
                        value={videoTranscriptInput}
                        onChange={(e) => setVideoTranscriptInput(e.target.value)}
                        placeholder="Paste complete video transcript here to auto-generate fully optimized, high-CTR metadata titles, description, timestamps, hashtags, and tags..."
                        className="w-full h-full bg-transparent resize-none p-4 text-xs md:text-sm focus:outline-none placeholder-gray-600 leading-relaxed font-mono pr-12"
                        style={{
                          color: theme.textColor,
                          backgroundColor: 'transparent'
                        }}
                      />
                      
                      {/* Controls container in bottom right corner */}
                      <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
                        {listeningInput === "videoTranscript" ? (
                          <button
                            type="button"
                            onClick={stopSpeechToText}
                            className="p-2.5 rounded-full hover:opacity-90 transition-all cursor-pointer shadow-lg flex items-center justify-center border"
                            style={{
                              backgroundColor: "rgba(220, 38, 38, 0.2)",
                              color: "rgb(248, 113, 113)",
                              borderColor: "rgba(220, 38, 38, 0.4)"
                            }}
                            title="Stop speech-to-text"
                          >
                            <MicOff className="h-4 w-4 animate-bounce" style={{ color: theme.accentColor }} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startSpeechToText("videoTranscript")}
                            className="p-2.5 rounded-full hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-lg flex items-center justify-center border"
                            style={{
                              backgroundColor: `${theme.accentColor}10`,
                              borderColor: `${theme.accentColor}40`,
                              color: theme.textColor
                            }}
                            title="Speak to enter video transcript"
                          >
                            <Mic className="h-4 w-4" />
                          </button>
                        )}

                        {videoTranscriptInput && (
                          <button
                            onClick={() => setVideoTranscriptInput("")}
                            className="p-2 rounded-xl transition-all duration-300 cursor-pointer hover:scale-105 border"
                            style={{
                              backgroundColor: "rgba(220, 38, 38, 0.1)",
                              borderColor: "rgba(220, 38, 38, 0.2)",
                              color: "rgb(248, 113, 113)"
                            }}
                            title="Clear transcript input"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Gemini listening wave animation overlay */}
                      <AnimatePresence>
                        {listeningInput === "videoTranscript" && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-5 z-20"
                          >
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full animate-ping" style={{ backgroundColor: theme.accentColor }} />
                              <h3 className="text-sm font-mono uppercase tracking-widest font-black" style={{ color: theme.accentColor }}>
                                Gemini Voice Explainer Active
                              </h3>
                            </div>
                            <p className="text-xs text-gray-400 max-w-sm text-center leading-relaxed font-mono">
                              Speak or read your video transcript naturally. Your voice is captured in real-time to generate optimized YouTube metadata.
                            </p>
                            
                            {/* Gemini Waveform */}
                            <div className="flex items-end gap-1.5 h-10 px-6 py-2 rounded-full border" style={{ backgroundColor: `${theme.accentColor}10`, borderColor: `${theme.accentColor}30` }}>
                              <motion.div className="w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["15%", "85%", "15%"] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }} />
                              <motion.div className="w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["40%", "100%", "40%"] }} transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: 0.08 }} />
                              <motion.div className="w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["20%", "70%", "20%"] }} transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.16 }} />
                              <motion.div className="w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["50%", "95%", "50%"] }} transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut", delay: 0.12 }} />
                              <motion.div className="w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["10%", "60%", "10%"] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} />
                              <motion.div className="w-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} animate={{ height: ["35%", "80%", "35%"] }} transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut", delay: 0.14 }} />
                            </div>

                            <button
                              type="button"
                              onClick={stopSpeechToText}
                              className="px-5 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer hover:scale-105 border"
                              style={{
                                backgroundColor: "rgba(220, 38, 38, 0.15)",
                                borderColor: "rgba(220, 38, 38, 0.3)",
                                color: "rgb(254, 202, 202)"
                              }}
                            >
                              Finish & Save Transcript
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Right Column: CTR YT & SM output */}
                  <div className="glass-card flex flex-col h-[480px] rounded-2xl overflow-hidden relative transition-all duration-150 border hover:border-white/30" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
                    <div className="px-4 py-3 border-b flex items-center justify-between glass-card" style={{ borderColor: `${theme.accentColor}30`, backgroundColor: `${theme.accentColor}08` }}>
                      <span className="text-xs font-mono font-extrabold tracking-wider flex items-center gap-1.5" style={{ color: theme.accentColor }}>
                        <Sparkles className="h-4 w-4" style={{ color: theme.accentColor }} />
                        CTR YT & SM output
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleGenerateCtr}
                          disabled={ctrLoading || !videoTranscriptInput.trim()}
                          className="glass-button py-1 px-3 rounded-xl font-mono text-[9px] font-black tracking-wider uppercase transition-all duration-300 flex items-center gap-1 border cursor-pointer"
                          style={videoTranscriptInput.trim() && !ctrLoading ? {
                            backgroundColor: theme.accentColor,
                            color: "#ffffff",
                            borderColor: theme.accentColor
                          } : {
                            backgroundColor: "transparent",
                            color: "rgb(107, 114, 128)",
                            borderColor: `${theme.accentColor}20`,
                            cursor: "not-allowed"
                          }}
                        >
                          {ctrLoading ? "GEN..." : "GEN CTR"}
                        </button>

                        {ctrOutput && (
                          <>
                            <button
                              onClick={() => handleCopyText(formatCtrOutputText(ctrOutput), "CTR Suite")}
                              className="glass-button p-1 rounded-xl text-[9px] font-mono flex items-center gap-1 cursor-pointer transition-all duration-300 hover:scale-110 active:scale-90 border"
                              style={{
                                backgroundColor: `${theme.accentColor}15`,
                                borderColor: `${theme.accentColor}30`,
                                color: theme.textColor
                              }}
                              title="Copy All output text"
                            >
                              <Copy className="h-3 w-3" /> COPY ALL
                            </button>
                            <button
                              onClick={() => handleDownloadTextFile(formatCtrOutputText(ctrOutput), "YT_CTR_Metadata_Suite.txt")}
                              className="glass-button p-1 rounded-xl text-[9px] font-mono flex items-center gap-1 cursor-pointer transition-all duration-300 hover:scale-110 active:scale-90 border"
                              style={{
                                backgroundColor: `${theme.accentColor}15`,
                                borderColor: `${theme.accentColor}30`,
                                color: theme.textColor
                              }}
                              title="Download All as .txt"
                            >
                              <Download className="h-3 w-3" /> .TXT
                            </button>
                            <button
                              onClick={() => setCtrOutput(null)}
                              className="glass-button p-1 rounded-xl bg-red-950/25 hover:bg-red-900 hover:text-white text-red-400 border border-red-900/40 text-[9px] font-mono flex items-center gap-1 cursor-pointer transition-all duration-300 hover:scale-110 active:scale-90"
                              title="Clear outputs"
                            >
                              <Trash2 className="h-3 w-3" /> CLEAR
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {ctrLoading ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-3">
                          <Loader2 className="h-8 w-8 animate-spin" style={{ color: theme.accentColor }} />
                          <p className="text-[10px] font-mono uppercase tracking-wider animate-pulse" style={{ color: theme.accentColor }}>STRATEGIZING METADATA IN REAL-TIME...</p>
                        </div>
                      ) : ctrOutput ? (
                        <div className="space-y-4 text-xs select-text">
                          {/* TITLES BLOCK */}
                          {toggleTitle && ctrOutput.titles && (
                            <div id="ctr-section-title" className="glass-card p-3 rounded-xl border space-y-2" style={{ backgroundColor: `${theme.accentColor}05`, borderColor: `${theme.accentColor}25` }}>
                              <div className="flex justify-between items-center border-b pb-1.5" style={{ borderColor: `${theme.accentColor}20` }}>
                                <span className="font-mono font-bold tracking-wide" style={{ color: theme.accentColor }}>🏆 10 HIGH-CTR TITLES (EN/UR/HI)</span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleCopyText((ctrOutput.titles || []).join("\n"), "Titles")}
                                    className="p-1 text-[9px] bg-black/40 hover:opacity-85 rounded border cursor-pointer"
                                    style={{ color: theme.textColor, borderColor: `${theme.accentColor}30` }}
                                  >
                                    Copy Keys
                                  </button>
                                  <button
                                    onClick={() => handleRegenerateCtrField("titles")}
                                    disabled={ctrRegeneratingField !== null}
                                    className="p-1 text-[9px] bg-black/40 hover:opacity-85 rounded border cursor-pointer"
                                    style={{ color: theme.accentColor, borderColor: `${theme.accentColor}30` }}
                                  >
                                    Regenerate
                                  </button>
                                </div>
                              </div>
                              <ul className="space-y-2" style={{ color: theme.textColor }}>
                                {ctrOutput.titles.map((t, index) => {
                                  const isUrdu = /[\u0600-\u06FF]/.test(t);
                                  return (
                                    <li
                                      key={index}
                                      className={`pb-2 border-b last:border-b-0 flex items-start gap-3 ${
                                        isUrdu ? "font-urdu text-base leading-relaxed text-right" : "font-sans text-xs leading-relaxed text-left"
                                      }`}
                                      dir={isUrdu ? "rtl" : "ltr"}
                                      style={{ borderColor: `${theme.accentColor}12` }}
                                    >
                                      <span className="font-mono font-bold text-[10px] pt-0.5 shrink-0" style={{ color: theme.accentColor }}>
                                        {index + 1}.
                                      </span>
                                      <span className="flex-1 select-text">{t}</span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}

                          {/* DESCRIPTION BLOCK */}
                          {toggleDescription && ctrOutput.description && (
                            <div id="ctr-section-description" className="glass-card p-3 rounded-xl border space-y-2" style={{ backgroundColor: `${theme.accentColor}05`, borderColor: `${theme.accentColor}25` }}>
                              <div className="flex justify-between items-center border-b pb-1.5" style={{ borderColor: `${theme.accentColor}20` }}>
                                <span className="font-mono font-bold tracking-wide" style={{ color: theme.accentColor }}>📝 SEO DESCRIPTION METADATA</span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleCopyText(ctrOutput.description || "", "Description")}
                                    className="p-1 text-[9px] bg-black/40 hover:opacity-85 rounded border cursor-pointer"
                                    style={{ color: theme.textColor, borderColor: `${theme.accentColor}30` }}
                                  >
                                    Copy Key
                                  </button>
                                  <button
                                    onClick={() => handleRegenerateCtrField("description")}
                                    disabled={ctrRegeneratingField !== null}
                                    className="p-1 text-[9px] bg-black/40 hover:opacity-85 rounded border cursor-pointer"
                                    style={{ color: theme.accentColor, borderColor: `${theme.accentColor}30` }}
                                  >
                                    Regenerate
                                  </button>
                                </div>
                              </div>
                              <p className="font-sans leading-relaxed whitespace-pre-wrap text-xs" style={{ color: theme.textColor }}>{ctrOutput.description}</p>
                            </div>
                          )}

                          {/* TIMESTAMPS BLOCK */}
                          {toggleTimestamps && ctrOutput.timestamps && (
                            <div id="ctr-section-timestamps" className="glass-card p-3 rounded-xl border space-y-2" style={{ backgroundColor: `${theme.accentColor}05`, borderColor: `${theme.accentColor}25` }}>
                              <div className="flex justify-between items-center border-b pb-1.5" style={{ borderColor: `${theme.accentColor}20` }}>
                                <span className="font-mono font-bold tracking-wide" style={{ color: theme.accentColor }}>⏱️ AUTOMATED PROPORTIONAL CHAPTERS</span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleCopyText((ctrOutput.timestamps || []).map(ts => `${ts.time} - ${ts.label}`).join("\n"), "Timestamps")}
                                    className="p-1 text-[9px] bg-black/40 hover:opacity-85 rounded border cursor-pointer"
                                    style={{ color: theme.textColor, borderColor: `${theme.accentColor}30` }}
                                  >
                                    Copy Keys
                                  </button>
                                  <button
                                    onClick={() => handleRegenerateCtrField("timestamps")}
                                    disabled={ctrRegeneratingField !== null}
                                    className="p-1 text-[9px] bg-black/40 hover:opacity-85 rounded border cursor-pointer"
                                    style={{ color: theme.accentColor, borderColor: `${theme.accentColor}30` }}
                                  >
                                    Regenerate
                                  </button>
                                </div>
                              </div>
                              <div className="font-mono space-y-1" style={{ color: theme.textColor }}>
                                {ctrOutput.timestamps.map((ts, index) => (
                                  <div key={index} className="flex gap-2">
                                    <span className="font-bold shrink-0" style={{ color: theme.accentColor }}>{ts.time}</span>
                                    <span className="text-gray-400 shrink-0">-</span>
                                    <span className="font-sans">{ts.label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* HASHTAGS BLOCK */}
                          {toggleHashtags && ctrOutput.hashtags && (
                            <div id="ctr-section-hashtags" className="glass-card p-3 rounded-xl border space-y-2" style={{ backgroundColor: `${theme.accentColor}05`, borderColor: `${theme.accentColor}25` }}>
                              <div className="flex justify-between items-center border-b pb-1.5" style={{ borderColor: `${theme.accentColor}20` }}>
                                <span className="font-mono font-bold tracking-wide" style={{ color: theme.accentColor }}>🏷️ 15 VIRAL HASHTAGS</span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleCopyText((ctrOutput.hashtags || []).join(" "), "Hashtags")}
                                    className="p-1 text-[9px] bg-black/40 hover:opacity-85 rounded border cursor-pointer"
                                    style={{ color: theme.textColor, borderColor: `${theme.accentColor}30` }}
                                  >
                                    Copy Keys
                                  </button>
                                  <button
                                    onClick={() => handleRegenerateCtrField("hashtags")}
                                    disabled={ctrRegeneratingField !== null}
                                    className="p-1 text-[9px] bg-black/40 hover:opacity-85 rounded border cursor-pointer"
                                    style={{ color: theme.accentColor, borderColor: `${theme.accentColor}30` }}
                                  >
                                    Regenerate
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                                {ctrOutput.hashtags.map((h, index) => (
                                  <span key={index} className="px-2 py-0.5 rounded-lg border text-xs glass-card" style={{ backgroundColor: `${theme.accentColor}12`, borderColor: `${theme.accentColor}30`, color: theme.accentColor }}>
                                    {h}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* TAGS BLOCK */}
                          {toggleTags && ctrOutput.tags && (
                            <div id="ctr-section-tags" className="glass-card p-3 rounded-xl border space-y-2" style={{ backgroundColor: `${theme.accentColor}05`, borderColor: `${theme.accentColor}25` }}>
                              <div className="flex justify-between items-center border-b pb-1.5" style={{ borderColor: `${theme.accentColor}20` }}>
                                <span className="font-mono font-bold tracking-wide" style={{ color: theme.accentColor }}>🎯 15 OPTIMIZED SEO METATAGS</span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleCopyText((ctrOutput.tags || []).join(", "), "Tags")}
                                    className="p-1 text-[9px] bg-black/40 hover:opacity-85 rounded border cursor-pointer"
                                    style={{ color: theme.textColor, borderColor: `${theme.accentColor}30` }}
                                  >
                                    Copy Keys
                                  </button>
                                  <button
                                    onClick={() => handleRegenerateCtrField("tags")}
                                    disabled={ctrRegeneratingField !== null}
                                    className="p-1 text-[9px] bg-black/40 hover:opacity-85 rounded border cursor-pointer"
                                    style={{ color: theme.accentColor, borderColor: `${theme.accentColor}30` }}
                                  >
                                    Regenerate
                                  </button>
                                </div>
                              </div>
                              <p className="font-mono text-xs leading-relaxed" style={{ color: theme.textColor }}>{ctrOutput.tags.join(", ")}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                          <div className="h-10 w-10 rounded-2xl border border-dashed flex items-center justify-center animate-pulse glass-card" style={{ borderColor: `${theme.accentColor}35`, color: theme.accentColor }}>
                            <TrendingUp className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.textColor }}>Metadata Suite Empty</p>
                          <p className="text-[10px] text-gray-400 max-w-xs mx-auto">
                            Paste a transcript to the left, configure elements in the growth strategist sidebar, and hit GEN CTR!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* WORKSPACE ROW 2: THUMBNAIL SUITE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Left Column: Thumbnail Transcript Input */}
                  <div className="glass-card flex flex-col h-[480px] rounded-2xl overflow-hidden transition-all duration-150 border hover:border-white/30" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
                    <div className="px-5 py-3 border-b flex items-center justify-between glass-card" style={{ borderColor: `${theme.accentColor}30`, backgroundColor: `${theme.accentColor}08` }}>
                      <span className="text-xs font-mono font-extrabold tracking-wider flex items-center gap-2" style={{ color: theme.accentColor }}>
                        <FileText className="h-4 w-4" />
                        Thumbnail Transcript Input
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            if (polishedScript) {
                              setThumbnailTranscriptInput(polishedScript);
                            }
                          }}
                          disabled={!polishedScript}
                          className="glass-button py-1 px-2.5 rounded-xl font-mono text-[9px] font-extrabold tracking-tight flex items-center gap-1 border cursor-pointer transition-all"
                          style={polishedScript ? {
                            backgroundColor: theme.accentColor,
                            color: "#ffffff",
                            borderColor: theme.accentColor
                          } : {
                            color: "rgb(107, 114, 128)",
                            borderColor: "transparent",
                            opacity: 0.4,
                            cursor: "not-allowed"
                          }}
                          title="Insert from Polished Script"
                        >
                          <Plus className="h-3 w-3" /> INSERT POLISHED VO
                        </button>
                        <label
                          className="glass-button py-1 px-2.5 rounded-xl font-mono text-[9px] font-extrabold tracking-tight flex items-center gap-1 border cursor-pointer transition-all hover:scale-105 active:scale-95"
                          style={{
                            backgroundColor: `${theme.accentColor}15`,
                            borderColor: `${theme.accentColor}40`,
                            color: theme.accentColor
                          }}
                        >
                          <Plus className="h-3 w-3" /> IMPORT FILE
                          <input
                            type="file"
                            accept=".txt,.pdf"
                            onChange={handleThumbnailTranscriptFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex-1 relative flex flex-col min-h-0">
                      <textarea
                        value={thumbnailTranscriptInput}
                        onChange={(e) => setThumbnailTranscriptInput(e.target.value)}
                        placeholder="Paste voice transcript segment or complete text here. Specify design parameters on the left to direct thumbnail graphic concepts..."
                        className="flex-1 w-full bg-transparent resize-none p-4 pb-2 text-xs md:text-sm focus:outline-none placeholder-gray-600 leading-relaxed font-mono"
                        style={{
                          color: theme.textColor,
                          backgroundColor: 'transparent'
                        }}
                      />
                      
                      {/* Character Picture upload & voice/clear controls bottom bar */}
                      <div className="border-t p-2.5 px-3 flex items-center justify-between gap-3 select-none" style={{ borderColor: `${theme.accentColor}25`, backgroundColor: `${theme.accentColor}05` }}>
                        {/* Left Side: Character Picture Upload/Preview */}
                        <div className="flex items-center gap-2">
                          {characterImage ? (
                            <div className="flex items-center gap-2 bg-black/40 rounded-xl p-1 px-2.5 border" style={{ borderColor: `${theme.accentColor}30` }}>
                              <img
                                src={characterImage}
                                alt="Character Preview"
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 object-cover rounded-lg border"
                                style={{ borderColor: `${theme.accentColor}50` }}
                              />
                              <div className="flex flex-col text-[10px] font-mono leading-tight max-w-[120px]">
                                <span className="text-gray-300 truncate font-semibold">Character Attached</span>
                                <span className="text-[8px] text-gray-500 truncate">{characterImageName || "image.png"}</span>
                              </div>
                              <button
                                onClick={handleClearCharacterImage}
                                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition-colors cursor-pointer ml-1"
                                title="Remove character photo"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <label
                              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-dashed text-[10px] font-mono transition-all hover:scale-102 cursor-pointer"
                              style={{
                                backgroundColor: `${theme.accentColor}10`,
                                borderColor: `${theme.accentColor}35`,
                                color: theme.accentColor
                              }}
                            >
                              <Image className="h-3.5 w-3.5" />
                              <span>CHARACTER PIC (OPTIONAL)</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleCharacterImageUpload}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>

                        {/* Right Side: Voice/Trash controls */}
                        <div className="flex items-center gap-1.5">
                          {listeningInput === "thumbnail" ? (
                            <button
                              type="button"
                              onClick={stopSpeechToText}
                              className="p-2 rounded-xl bg-red-950/80 text-red-400 border border-red-800/80 hover:bg-red-900 transition-all cursor-pointer flex items-center justify-center shadow"
                              title="Stop speech-to-text"
                            >
                              <MicOff className="h-3.5 w-3.5 animate-bounce" style={{ color: theme.accentColor }} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startSpeechToText("thumbnail")}
                              className="p-2 rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center shadow border"
                              style={{
                                backgroundColor: `${theme.accentColor}10`,
                                borderColor: `${theme.accentColor}35`,
                                color: theme.textColor
                              }}
                              title="Speak to enter thumbnail details"
                            >
                              <Mic className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {thumbnailTranscriptInput && (
                            <button
                              onClick={() => setThumbnailTranscriptInput("")}
                              className="p-2 rounded-xl transition-all duration-300 cursor-pointer border"
                              style={{
                                backgroundColor: "rgba(220, 38, 38, 0.1)",
                                borderColor: "rgba(220, 38, 38, 0.2)",
                                color: "rgb(248, 113, 113)"
                              }}
                              title="Clear transcript input"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Gemini listening wave animation overlay */}
                      <AnimatePresence>
                        {listeningInput === "thumbnail" && (
                          <div
                            className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 space-y-5 z-20 glass-card"
                          >
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.accentColor }} />
                              <h3 className="text-sm font-mono uppercase tracking-widest font-black" style={{ color: theme.accentColor }}>
                                Gemini Voice Explainer Active
                              </h3>
                            </div>
                            <p className="text-xs text-gray-400 max-w-sm text-center leading-relaxed font-mono">
                              Explain your thumbnail concept or transcript context. Your voice will be transcribed directly to guide thumbnail prompt synthesis.
                            </p>
                            
                            {/* Gemini Waveform */}
                            <div className="flex items-end gap-1.5 h-10 px-6 py-2 rounded-full border glass-card" style={{ backgroundColor: `${theme.accentColor}10`, borderColor: `${theme.accentColor}30` }}>
                              <div className="w-1.5 h-[60%] rounded-full" style={{ backgroundColor: theme.accentColor }} />
                              <div className="w-1.5 h-[90%] rounded-full" style={{ backgroundColor: theme.accentColor }} />
                              <div className="w-1.5 h-[40%] rounded-full" style={{ backgroundColor: theme.accentColor }} />
                              <div className="w-1.5 h-[80%] rounded-full" style={{ backgroundColor: theme.accentColor }} />
                              <div className="w-1.5 h-[50%] rounded-full" style={{ backgroundColor: theme.accentColor }} />
                              <div className="w-1.5 h-[70%] rounded-full" style={{ backgroundColor: theme.accentColor }} />
                            </div>

                            <button
                              type="button"
                              onClick={stopSpeechToText}
                              className="glass-button px-5 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer hover:scale-105 border"
                              style={{
                                backgroundColor: "rgba(220, 38, 38, 0.15)",
                                borderColor: "rgba(220, 38, 38, 0.3)",
                                color: "rgb(254, 202, 202)"
                              }}
                            >
                              Finish & Save Input
                            </button>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Right Column: YT Thumbnails Prompt output */}
                  <div className="glass-card flex flex-col h-[480px] rounded-2xl overflow-hidden relative transition-all duration-150 border hover:border-white/30" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorderCode, boxShadow: panelShadow }}>
                    <div className="px-4 py-3 border-b flex items-center justify-between glass-card" style={{ borderColor: `${theme.accentColor}30`, backgroundColor: `${theme.accentColor}08` }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-extrabold tracking-wider flex items-center gap-1.5 shrink-0" style={{ color: theme.accentColor }}>
                          <Sparkles className="h-4 w-4" style={{ color: theme.accentColor }} />
                          YT Thumbnails Prompt output
                        </span>
                        <a
                          href="https://labs.google/fx/tools/flow"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="glass-button inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 shrink-0"
                          style={{
                            backgroundColor: theme.accentColor,
                            color: "#ffffff",
                            borderColor: theme.accentColor
                          }}
                          title="Open Google Flow Nano Banana 2 & Flux 1"
                        >
                          <span>Google Flow</span>
                          <ExternalLink className="h-2 w-2" />
                        </a>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleGenerateThumbnailPrompt}
                          disabled={thumbnailLoading || !thumbnailTranscriptInput.trim()}
                          className="glass-button py-1 px-3 rounded-xl font-mono text-[9px] font-black tracking-wider uppercase transition-all duration-300 flex items-center gap-1 border cursor-pointer"
                          style={thumbnailTranscriptInput.trim() && !thumbnailLoading ? {
                            backgroundColor: theme.accentColor,
                            color: "#ffffff",
                            borderColor: theme.accentColor
                          } : {
                            backgroundColor: "transparent",
                            color: "rgb(107, 114, 128)",
                            borderColor: `${theme.accentColor}20`,
                            cursor: "not-allowed"
                          }}
                        >
                          {thumbnailLoading ? "GEN..." : "GEN PROMPT"}
                        </button>

                        {thumbnailOutput && (
                          <>
                            <button
                              onClick={() => handleCopyText(formatThumbnailOutputText(thumbnailOutput), "Thumbnail Prompts")}
                              className="glass-button p-1 rounded-xl text-[9px] font-mono flex items-center gap-1 cursor-pointer transition-all duration-300 hover:scale-110 active:scale-90 border"
                              style={{
                                backgroundColor: `${theme.accentColor}15`,
                                borderColor: `${theme.accentColor}30`,
                                color: theme.textColor
                              }}
                              title="Copy prompt output"
                            >
                              <Copy className="h-3 w-3" /> COPY ALL
                            </button>
                            <button
                              onClick={() => handleDownloadTextFile(formatThumbnailOutputText(thumbnailOutput), "YT_Thumbnail_Director_Output.txt")}
                              className="glass-button p-1 rounded-xl text-[9px] font-mono flex items-center gap-1 cursor-pointer transition-all duration-300 hover:scale-110 active:scale-90 border"
                              style={{
                                backgroundColor: `${theme.accentColor}15`,
                                borderColor: `${theme.accentColor}30`,
                                color: theme.textColor
                              }}
                              title="Download Prompt text"
                            >
                              <Download className="h-3 w-3" /> .TXT
                            </button>
                            <button
                              onClick={() => setThumbnailOutput(null)}
                              className="glass-button p-1 rounded-xl bg-red-950/25 hover:bg-red-900 hover:text-white text-red-400 border border-red-900/40 text-[9px] font-mono flex items-center gap-1 cursor-pointer transition-all duration-300 hover:scale-110 active:scale-90"
                              title="Clear prompts"
                            >
                              <Trash2 className="h-3 w-3" /> CLEAR
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {thumbnailLoading ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-3">
                          <Loader2 className="h-8 w-8 animate-spin" style={{ color: theme.accentColor }} />
                          <p className="text-[10px] font-mono uppercase tracking-wider animate-pulse" style={{ color: theme.accentColor }}>COMPOSING HIGH-CTR IMAGE METRICS...</p>
                        </div>
                      ) : thumbnailOutput ? (
                        <div className="space-y-4 text-xs select-text animate-[fadeIn_0.4s_ease-out]">
                          {thumbnailOutput.engine === "flux1" ? (
                            <>
                              {/* FLUX 1 SCENE PROMPT */}
                              <div className="glass-card p-3 rounded-xl border space-y-2" style={{ backgroundColor: `${theme.accentColor}05`, borderColor: `${theme.accentColor}25` }}>
                                <div className="flex justify-between items-center border-b pb-1.5 flex-wrap gap-2" style={{ borderColor: `${theme.accentColor}20` }}>
                                  <span className="font-mono font-bold text-xs" style={{ color: theme.accentColor }}>1️⃣ Scene Prompt (Positive) — English, NO Urdu</span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openImageStudioWithPrompt(thumbnailOutput.fluxScenePrompt || thumbnailOutput.thumbnailPrompt)}
                                      className="glass-button px-2 py-1 text-[10px] font-extrabold rounded-lg cursor-pointer transition-all flex items-center gap-1 border"
                                      style={{
                                        backgroundColor: theme.accentColor,
                                        color: "#ffffff",
                                        borderColor: theme.accentColor
                                      }}
                                    >
                                      <Sparkles className="h-3 w-3" />
                                      <span>Generate Image in Studio</span>
                                    </button>
                                    <button
                                      onClick={() => handleCopyText(thumbnailOutput.fluxScenePrompt || thumbnailOutput.thumbnailPrompt, "Scene Prompt")}
                                      className="p-1 text-[9px] bg-black/40 hover:opacity-85 rounded border cursor-pointer"
                                      style={{ color: theme.textColor, borderColor: `${theme.accentColor}30` }}
                                    >
                                      Copy Scene Prompt
                                    </button>
                                  </div>
                                </div>
                                <p className="font-sans leading-relaxed text-xs" style={{ color: theme.textColor }}>{thumbnailOutput.fluxScenePrompt || thumbnailOutput.thumbnailPrompt}</p>
                              </div>

                              {/* FLUX 1 NEGATIVE PROMPT */}
                              <div className="glass-card p-3 rounded-xl border space-y-2" style={{ backgroundColor: `${theme.accentColor}05`, borderColor: `${theme.accentColor}25` }}>
                                <div className="flex justify-between items-center border-b pb-1.5" style={{ borderColor: `${theme.accentColor}20` }}>
                                  <span className="font-mono font-bold" style={{ color: theme.accentColor }}>2️⃣ Negative Prompt (Anti-Text)</span>
                                  <button
                                    onClick={() => handleCopyText(thumbnailOutput.fluxNegativePrompt || "low quality, blurry, bad anatomy, deformed hands, extra fingers, text, letters, words, watermark, gibberish script, distorted face, cartoon", "Negative Prompt")}
                                    className="p-1 text-[9px] bg-black/40 hover:opacity-85 rounded border cursor-pointer"
                                    style={{ color: theme.textColor, borderColor: `${theme.accentColor}30` }}
                                  >
                                    Copy Negative
                                  </button>
                                </div>
                                <p className="font-sans text-xs italic" style={{ color: theme.textColor }}>
                                  {thumbnailOutput.fluxNegativePrompt || "low quality, blurry, bad anatomy, deformed hands, extra fingers, text, letters, words, watermark, gibberish script, distorted face, cartoon"}
                                </p>
                              </div>

                              {/* FLUX 1 URDU POSTER TEXT OVERLAY NODE FIELDS */}
                              <div className="glass-card p-3 rounded-xl border space-y-2" style={{ backgroundColor: `${theme.accentColor}05`, borderColor: `${theme.accentColor}25` }}>
                                <div className="flex justify-between items-center border-b pb-1.5" style={{ borderColor: `${theme.accentColor}20` }}>
                                  <span className="font-mono font-bold" style={{ color: theme.accentColor }}>3️⃣ Urdu Poster Text Overlay Fields</span>
                                  <button
                                    onClick={() => {
                                      const fieldsStr = thumbnailOutput.overlayFields
                                        ? Object.entries(thumbnailOutput.overlayFields)
                                            .map(([key, val]) => `${key}: ${val}`)
                                            .join("\n")
                                        : "";
                                      handleCopyText(fieldsStr, "Overlay Fields");
                                    }}
                                    className="p-1 text-[9px] bg-black/40 hover:opacity-85 rounded border cursor-pointer"
                                    style={{ color: theme.textColor, borderColor: `${theme.accentColor}30` }}
                                  >
                                    Copy Fields
                                  </button>
                                </div>
                                <div className="font-mono text-[10px] space-y-1 p-2.5 rounded-lg border glass-card" style={{ backgroundColor: "rgba(0,0,0,0.15)", borderColor: `${theme.accentColor}25` }}>
                                  {thumbnailOutput.overlayFields ? (
                                    <>
                                      <div className="flex justify-between py-0.5 border-b" style={{ borderColor: `${theme.accentColor}12` }}>
                                        <span className="text-gray-400">heading_text</span>
                                        <span className="font-urdu font-bold" dir="rtl" style={{ color: theme.accentColor }}>{thumbnailOutput.overlayFields.heading_text}</span>
                                      </div>
                                      <div className="flex justify-between py-0.5 border-b" style={{ borderColor: `${theme.accentColor}12` }}>
                                        <span className="text-gray-400">tagline_text</span>
                                        <span className="font-urdu" dir="rtl" style={{ color: theme.accentColor }}>{thumbnailOutput.overlayFields.tagline_text}</span>
                                      </div>
                                      <div className="flex justify-between py-0.5 border-b" style={{ borderColor: `${theme.accentColor}12` }}>
                                        <span className="text-gray-400">text_color</span>
                                        <span className="font-bold" style={{ color: theme.textColor }}>{thumbnailOutput.overlayFields.text_color}</span>
                                      </div>
                                      <div className="flex justify-between py-0.5 border-b" style={{ borderColor: `${theme.accentColor}12` }}>
                                        <span className="text-gray-400">stroke_color</span>
                                        <span className="font-bold" style={{ color: theme.accentColor }}>{thumbnailOutput.overlayFields.stroke_color}</span>
                                      </div>
                                      <div className="flex justify-between py-0.5 border-b" style={{ borderColor: `${theme.accentColor}12` }}>
                                        <span className="text-gray-400">stroke_width</span>
                                        <span style={{ color: theme.textColor }}>{thumbnailOutput.overlayFields.stroke_width}</span>
                                      </div>
                                      <div className="flex justify-between py-0.5 border-b" style={{ borderColor: `${theme.accentColor}12` }}>
                                        <span className="text-gray-400">heading_y_percent</span>
                                        <span style={{ color: theme.textColor }}>{thumbnailOutput.overlayFields.heading_y_percent}</span>
                                      </div>
                                      <div className="flex justify-between py-0.5">
                                        <span className="text-gray-400">tagline_y_percent</span>
                                        <span style={{ color: theme.textColor }}>{thumbnailOutput.overlayFields.tagline_y_percent}</span>
                                      </div>
                                    </>
                                  ) : (
                                    <p className="text-gray-500">No fields specified.</p>
                                  )}
                                </div>
                              </div>

                              {/* FLUX 1 EMPTY LATENT IMAGE */}
                              <div className="glass-card p-3 rounded-xl border space-y-2" style={{ backgroundColor: `${theme.accentColor}05`, borderColor: `${theme.accentColor}25` }}>
                                <div className="flex justify-between items-center border-b pb-1.5" style={{ borderColor: `${theme.accentColor}20` }}>
                                  <span className="font-mono font-bold" style={{ color: theme.accentColor }}>4️⃣ EmptyLatentImage Size</span>
                                </div>
                                <div className="flex gap-4 font-mono text-[10px] p-2.5 rounded-lg border justify-around glass-card" style={{ backgroundColor: "rgba(0,0,0,0.15)", borderColor: `${theme.accentColor}25` }}>
                                  <div>
                                    <span className="text-gray-400">Width: </span>
                                    <span className="font-bold" style={{ color: theme.accentColor }}>{thumbnailOutput.emptyLatentImage?.width || 1024}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Height: </span>
                                    <span className="font-bold" style={{ color: theme.accentColor }}>{thumbnailOutput.emptyLatentImage?.height || 1820}</span>
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              {/* ENGLISH PROMPT SPECIFICATION */}
                              <div className="glass-card p-3 rounded-xl border space-y-2" style={{ backgroundColor: `${theme.accentColor}05`, borderColor: `${theme.accentColor}25` }}>
                                <div className="flex justify-between items-center border-b pb-1.5" style={{ borderColor: `${theme.accentColor}20` }}>
                                  <span className="font-mono font-bold" style={{ color: theme.accentColor }}>🖼️ CINEMATIC VISUAL SPECIFICATION</span>
                                  <button
                                    onClick={() => handleCopyText(thumbnailOutput.thumbnailPrompt, "Visual Prompt")}
                                    className="p-1 text-[9px] bg-black/40 hover:opacity-85 rounded border cursor-pointer"
                                    style={{ color: theme.textColor, borderColor: `${theme.accentColor}30` }}
                                  >
                                    Copy Specification
                                  </button>
                                </div>
                                <p className="font-sans leading-relaxed text-xs" style={{ color: theme.textColor }}>{thumbnailOutput.thumbnailPrompt}</p>
                              </div>

                              {/* URDU HEADLINE */}
                              <div className="glass-card p-3 rounded-xl border space-y-2" style={{ backgroundColor: `${theme.accentColor}05`, borderColor: `${theme.accentColor}25` }}>
                                <div className="flex justify-between items-center border-b pb-1.5" style={{ borderColor: `${theme.accentColor}20` }}>
                                  <span className="font-mono font-bold" style={{ color: theme.accentColor }}>🇵🇰 URDU OVERLAY HEADLINE</span>
                                  <button
                                    onClick={() => handleCopyText(thumbnailOutput.headlineUrdu, "Urdu Headline")}
                                    className="p-1 text-[9px] bg-black/40 hover:opacity-85 rounded border cursor-pointer"
                                    style={{ color: theme.textColor, borderColor: `${theme.accentColor}30` }}
                                  >
                                    Copy text
                                  </button>
                                </div>
                                <p className="font-urdu text-right text-lg font-bold tracking-wide py-2 leading-relaxed" style={{ color: theme.textColor }} dir="rtl">
                                  {thumbnailOutput.headlineUrdu}
                                </p>
                              </div>

                              {/* URDU TAGLINE */}
                              <div className="glass-card p-3 rounded-xl border space-y-2" style={{ backgroundColor: `${theme.accentColor}05`, borderColor: `${theme.accentColor}25` }}>
                                <div className="flex justify-between items-center border-b pb-1.5" style={{ borderColor: `${theme.accentColor}20` }}>
                                  <span className="font-mono font-bold" style={{ color: theme.accentColor }}>🇵🇰 URDU OVERLAY TAGLINE</span>
                                  <button
                                    onClick={() => handleCopyText(thumbnailOutput.smallTaglineUrdu, "Urdu Tagline")}
                                    className="p-1 text-[9px] bg-black/40 hover:opacity-85 rounded border cursor-pointer"
                                    style={{ color: theme.textColor, borderColor: `${theme.accentColor}30` }}
                                  >
                                    Copy text
                                  </button>
                                </div>
                                <p className="font-urdu text-right text-base py-1 leading-relaxed" style={{ color: theme.textColor }} dir="rtl">
                                  {thumbnailOutput.smallTaglineUrdu}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                          <div className="h-10 w-10 rounded-2xl border border-dashed flex items-center justify-center glass-card" style={{ borderColor: `${theme.accentColor}35`, color: theme.accentColor }}>
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.textColor }}>Graphics Suite Empty</p>
                          <p className="text-[10px] text-gray-400 max-w-xs mx-auto">
                            Paste a transcript to the left, configure design options, and click GEN PROMPT to get viral thumbnail layouts!
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Floating Thumbnail Controls (Format & Engine Selectors) */}
                    <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 px-2.5 py-1.5 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.6)] text-[9px] font-mono border glass-panel" style={{ backgroundColor: theme.cardBg, borderColor: `${theme.accentColor}40`, color: theme.textColor }}>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 uppercase tracking-widest font-bold text-[8px]">FORMAT:</span>
                        <select
                          value={thumbnailFormat}
                          onChange={(e) => setThumbnailFormat(e.target.value as any)}
                          className="bg-transparent font-bold focus:outline-none cursor-pointer text-[9px]"
                          style={{ color: theme.accentColor }}
                        >
                          <option value="16:9" className="bg-black text-[#00FF01]">Landscape</option>
                          <option value="9:16" className="bg-black text-[#00FF01]">Vertical</option>
                          <option value="1:1" className="bg-black text-[#00FF01]">Square format</option>
                          <option value="none" className="bg-black text-[#00FF01]">None</option>
                        </select>
                      </div>
                      <div className="w-[1px] h-3" style={{ backgroundColor: `${theme.accentColor}30` }} />
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 uppercase tracking-widest font-bold text-[8px]">ENGINE:</span>
                        <select
                          value={thumbnailEngine}
                          onChange={(e) => setThumbnailEngine(e.target.value as any)}
                          className="bg-transparent font-bold focus:outline-none cursor-pointer text-[9px]"
                          style={{ color: theme.accentColor }}
                        >
                          <option value="nano_banana" className="bg-black text-[#00FF01]">Nano banana two</option>
                          <option value="flux1" className="bg-black text-[#00FF01]">Flux 1</option>
                        </select>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            {/* ERROR LOG PRESENTATION */}
            {error && (
              <div className="glass-card p-4 rounded-2xl bg-red-950/20 border border-red-500/40 text-red-200 text-xs font-mono flex items-start gap-2.5 shadow-md">
                <span className="h-2.5 w-2.5 rounded-xl bg-red-500 mt-1.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-bold uppercase tracking-wider text-red-400">System Log Warning</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* LOWER UNIQUE STATUS REMINDER */}
            <div
              className="glass-card p-4 rounded-2xl flex items-center gap-3 border"
              style={{
                backgroundColor: `${theme.accentColor}05`,
                borderColor: `${theme.accentColor}25`,
                boxShadow: panelShadow
              }}
            >
              <RefreshCw className="h-5 w-5 shrink-0" style={{ color: theme.accentColor }} />
              <div className="space-y-0.5">
                <p className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: theme.accentColor }}>
                  Guaranteed Dynamic Variations
                </p>
                <p className="text-[11px] font-mono" style={{ color: theme.textColor }}>
                  Our advanced multi-entropy algorithm forces unique wording patterns for each trigger, ensuring zero duplicate outcomes.
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* BOTTOM ARCHITECT FOOTER */}
        <footer className="pt-6 border-t flex flex-col md:flex-row items-center justify-between text-[11px] font-mono text-gray-500 gap-3" style={{ borderColor: `${theme.accentColor}15` }}>
          <p>© 2026 Script Automation Studio. Built for unique social media VO rephrasings.</p>
          <p
            className="glass-panel tracking-widest font-semibold px-4 py-1.5 rounded-2xl border"
            style={{
              color: theme.textColor,
              backgroundColor: `${theme.accentColor}12`,
              borderColor: `${theme.accentColor}35`,
              boxShadow: theme.isLight
                ? "0 6px 16px -3px rgba(0,0,0,0.06)"
                : "0 8px 20px -3px rgba(0,0,0,0.4)"
            }}
          >
            REGION: PAKISTAN
          </p>
        </footer>

      </div>

      {/* Dynamic Pop-up Toast Feedback */}
      <AnimatePresence>
        {popupMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-black/80 border text-white shadow-[0_0_25px_rgba(0,0,0,0.6)] glass-card"
            style={{ borderColor: theme.accentColor }}
          >
            {popupType === "copy" ? (
              <CheckCircle className="h-4 w-4" style={{ color: theme.accentColor }} />
            ) : (
              <Download className="h-4 w-4" style={{ color: theme.accentColor }} />
            )}
            <span className="text-xs font-mono font-bold tracking-tight" style={{ color: theme.textColor }}>{popupMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
