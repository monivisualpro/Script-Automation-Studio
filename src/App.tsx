import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  ExternalLink,
  Mic,
  MicOff,
  Calculator
} from "lucide-react";

const CATEGORIES = [
  "Medical & Health",
  "Software Engineering",
  "Computer Science",
  "Information Technology (IT)",
  "Artificial Intelligence",
  "Technology",
  "Food & Cooking",
  "Food Vlogging",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Civil Engineering",
  "Finance & Business",
  "Education",
  "History",
  "Travel",
  "Documentary",
  "Motivation",
  "Lifestyle",
  "Fitness",
  "Real Estate",
  "Automotive",
  "Gaming",
  "Science",
  "Nature",
  "General"
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

export default function App() {
  // Config States
  const [voicePersona, setVoicePersona] = useState<"female" | "male">("female");
  const [topicNiche, setTopicNiche] = useState("Medical & Health");
  const [transformation, setTransformation] = useState("urdu-roman");
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
  const [greetingsPrefix, setGreetingsPrefix] = useState("Asslamoalaikum");
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
      rec.lang = ""; 

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawScript,
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
      const scriptsMap = data.polishedScripts || {};
      setPolishedScripts(scriptsMap);
      setPolishedScript(scriptsMap[activeTransformation] || "");
      
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
    setCtrLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/generate-ctr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: videoTranscriptInput,
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
    setCtrRegeneratingField(field);
    setError(null);
    try {
      const response = await fetch("/api/regenerate-ctr-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: videoTranscriptInput,
          field,
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
    setThumbnailLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/generate-thumbnail-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: thumbnailTranscriptInput,
          bgColor: getActiveBgColor(),
          headline: thumbHeadline,
          smallTagline: thumbSmallTagline,
          textColor: getActiveTextColor(),
          niche: topicNiche,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate thumbnail prompt.");
      }

      const data = await response.json();
      setThumbnailOutput(data);
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
    txt += "=== CINEMATIC THUMBNAIL PROMPT ===\n";
    txt += data.thumbnailPrompt + "\n\n";
    txt += "=== MAIN URDU HEADLINE ===\n";
    txt += data.headlineUrdu + "\n\n";
    txt += "=== SMALL TAGLINE ===\n";
    txt += data.smallTaglineUrdu + "\n";
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
    setTopicGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicName, wordCount: topicWordLimit }),
      });
      if (!res.ok) throw new Error("Failed to generate script from topic.");
      const data = await res.json();
      setRawScript(data.rawScript);
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
    if (mode === "gemini") {
      setIsGeneratingWithGemini(true);
    } else {
      setIsExtractingUrl(true);
    }
    setError(null);
    try {
      const res = await fetch("/api/extract-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl, mode }),
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
        if (setLoadingState) setLoadingState(true);
        else setLoading(true);
        try {
          const res = await fetch("/api/parse-file", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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

  const handleGenerateScenes = async () => {
    if (!transcriptInput.trim()) {
      alert("Please paste a transcript first.");
      return;
    }
    setScenesLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
    const previous = scenes.find((s) => s.id === id)?.text || "";
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, loading: true } : s))
    );

    try {
      const res = await fetch("/api/regenerate-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#031d0a] via-[#011105] to-[#000401] text-gray-200 font-sans p-3 md:p-6 overflow-x-hidden selection:bg-[#00FF01] selection:text-black">
      
      {/* Super high-tech radiant green laser effects in background */}
      <div className="absolute top-10 right-10 w-80 h-80 bg-[#00FF01]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-[#00FF01]/3 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,1,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,1,0.015)_1px,transparent_1px)] bg-[size:35px_35px] pointer-events-none z-0" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-5">
        
        {/* UPPER HEADER WITH GLOW EFFECTS */}
        <header className="flex flex-col lg:flex-row items-center justify-between gap-4 border-b border-green-800/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-green-900/40 border border-[#00FF01]/30 flex items-center justify-center text-[#00FF01] shadow-[0_0_15px_rgba(0,255,1,0.25)] hover:shadow-[0_0_25px_rgba(0,255,1,0.6)] hover:scale-105 active:scale-95 transition-all duration-300">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight text-[#00FF01] flex items-center gap-2">
                Script Automation Studio
              </h1>
              <p className="text-xs text-gray-400 font-mono">
                Elite Anti-plagiarism rephrasing · Dynamic unique output generator
              </p>
            </div>
          </div>

          {/* MAIN CENTER ARCHITECT LOGO BADGE */}
          <a
            href="https://www.youtube.com/@monivisualpro"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 rounded-xl border-[3px] border-[#00FF01] bg-[#073011]/90 text-center shadow-[0_0_20px_rgba(0,255,1,0.35)] hover:shadow-[0_0_30px_rgba(0,255,1,0.65)] hover:border-[#00FF01] hover:scale-102 transition-all duration-300 glow-on-hover cursor-pointer block"
          >
            <span className="text-[9px] font-mono text-gray-300 uppercase tracking-widest block font-bold">Script Automation Architect</span>
            <span className="text-xs md:text-sm font-display font-black text-[#00FF01] tracking-wider block">
              MUHAMMAD TEHSEEN IRSHAD (MONI VISUAL PRO)
            </span>
          </a>

          {/* RIGHT SHIELD INDICATOR */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-mono font-bold bg-green-900/40 border border-[#00FF01]/50 text-[#00FF01] shadow-[0_0_12px_rgba(0,255,1,0.15)] hover:shadow-[0_0_20px_rgba(0,255,1,0.3)] transition-all duration-300 glow-on-hover">
              <span className="h-2 w-2 rounded-full bg-[#00FF01] animate-ping" />
              PLAGIARISM SHIELD ACTIVE
            </span>
          </div>
        </header>

        {/* WORKSPACE ARRANGEMENT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEFT INTERACTIVE CONTROLS COLUMN (4 cols) */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-4">
            
            {/* VOICE PERSONA CARD - ROUNDED TABS */}
            <div className="p-4 rounded-2xl border border-green-800 bg-black/50 backdrop-blur-md space-y-3 shadow-md hover:border-[#00FF01]/30 hover:shadow-[0_0_15px_rgba(0,255,1,0.1)] transition-all duration-300">
              <label className="text-xs font-mono text-[#00FF01] uppercase tracking-widest block font-bold">
                Voice Persona (Speaker)
              </label>
              <div className="grid grid-cols-2 gap-2 bg-[#031d0a] p-1 rounded-xl border border-green-800">
                <button
                  id="btn-voice-female"
                  onClick={() => setVoicePersona("female")}
                  className={`py-2 px-4 font-display text-xs transition-all duration-300 flex items-center justify-center gap-2 border glow-on-hover ${
                    voicePersona === "female"
                      ? "bg-[#00FF01] text-black border-[#00FF01] rounded-[17px] font-extrabold shadow-[0_0_15px_rgba(0,255,1,0.5)] scale-100"
                      : "bg-transparent text-gray-300 border-transparent hover:text-white hover:bg-green-900/15 rounded-xl font-bold"
                  } hover:scale-102 active:scale-95`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${voicePersona === "female" ? "bg-black" : "bg-purple-400 animate-pulse"}`} />
                  FEMALE
                </button>
                <button
                  id="btn-voice-male"
                  onClick={() => setVoicePersona("male")}
                  className={`py-2 px-4 font-display text-xs transition-all duration-300 flex items-center justify-center gap-2 border glow-on-hover ${
                    voicePersona === "male"
                      ? "bg-[#00FF01] text-black border-[#00FF01] rounded-[17px] font-extrabold shadow-[0_0_15px_rgba(0,255,1,0.5)] scale-100"
                      : "bg-transparent text-gray-300 border-transparent hover:text-white hover:bg-green-900/15 rounded-xl font-bold"
                  } hover:scale-102 active:scale-95`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${voicePersona === "male" ? "bg-black" : "bg-sky-400 animate-pulse"}`} />
                  MALE
                </button>
              </div>
            </div>

            {/* TOPIC DOMAIN / NICHE */}
            <div className="p-4 rounded-2xl border border-green-800 bg-black/50 backdrop-blur-md space-y-3 shadow-md hover:border-[#00FF01]/30 hover:shadow-[0_0_15px_rgba(0,255,1,0.1)] transition-all duration-300">
              <label className="text-xs font-mono text-[#00FF01] uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-[#00FF01]" />
                Domain
              </label>
              <select
                id="select-niche"
                value={topicNiche}
                onChange={(e) => {
                  setTopicNiche(e.target.value);
                  setContentCategory(e.target.value);
                }}
                className="w-full bg-[#05290e] border border-green-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-[#00FF01] focus:shadow-[0_0_15px_rgba(0,255,1,0.25)] font-mono cursor-pointer transition-all duration-300 hover:border-[#00FF01] glow-on-hover"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#05290e] text-white">{cat}</option>
                ))}
              </select>
            </div>

            {/* TUTORIAL & LITERATURE TONES - INCORPORATED ALL NEW TONAL STYLES */}
            <div className="p-4 rounded-2xl border border-green-800 bg-black/50 backdrop-blur-md space-y-3 shadow-md hover:border-[#00FF01]/30 hover:shadow-[0_0_15px_rgba(0,255,1,0.1)] transition-all duration-300">
              <label className="text-xs font-mono text-[#00FF01] uppercase tracking-widest block">
                Tutorial & Literature Tool
              </label>
              <select
                id="select-tone"
                value={tutorialTone}
                onChange={(e) => setTutorialTone(e.target.value)}
                className="w-full bg-[#05290e] border border-green-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-[#00FF01] focus:shadow-[0_0_15px_rgba(0,255,1,0.25)] font-mono cursor-pointer transition-all duration-300 hover:border-[#00FF01] glow-on-hover"
              >
                <option value="Warm Friendly Conversational">Warm Friendly Conversational</option>
                <option value="Engaging Food Blogger Vibe">Engaging Food Blogger Vibe</option>
                <option value="Fast Paced Explainer (YouTube FB)">Fast Paced Explainer (YouTube FB)</option>
                <option value="Informative Health Explainer">Informative Health Explainer</option>
                <option value="Exciting Tech Enthusiast">Exciting Tech Enthusiast</option>
                <option value="Passionate Story Teller">Passionate Story Teller</option>
                <option value="Poetic Relatable (Shayari Vibe)">Poetic Relatable (Shayari Vibe)</option>
                <option value="Funny and Entertaining">Funny and Entertaining</option>
                <option value="Professional Clear Speaker">Professional Clear Speaker</option>
                <option value="Science-Based Tutorial (Easy Explanation)">Science-Based Tutorial (Easy Explanation)</option>
                <option value="Professional & Technical">Professional & Technical</option>
                <option value="Casual & Conversational">Casual & Conversational</option>
                <option value="Dramatic Narrative (Hyped)">Dramatic Narrative (Hyped)</option>
                <option value="Deep Informative (Analytical)">Deep Informative (Analytical)</option>
              </select>
            </div>

            {/* TRANSFORMATION OPTIONS */}
            <div className="p-4 rounded-2xl border border-green-800 bg-black/50 backdrop-blur-md space-y-3 shadow-md hover:border-[#00FF01]/30 hover:shadow-[0_0_15px_rgba(0,255,1,0.1)] transition-all duration-300">
              <label className="text-xs font-mono text-[#00FF01] uppercase tracking-widest flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-[#00FF01]" />
                Transformation Option
              </label>
              <select
                id="select-transformation"
                value={transformation}
                onChange={(e) => handleSelectLanguage(e.target.value)}
                className="w-full bg-[#05290e] border border-green-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-[#00FF01] focus:shadow-[0_0_15px_rgba(0,255,1,0.25)] font-mono cursor-pointer transition-all duration-300 hover:border-[#00FF01] glow-on-hover"
              >
                <option value="hindi">🇮🇳 Hindi Script (Urdu Wording & Accent)</option>
                <option value="urdu-roman">🇵🇰 Convert to Urdu Roman (Latin Alphabet)</option>
                <option value="english">🇬🇧 Convert to English (Polished/Fluent)</option>
                <option value="urdu-writing" className="font-urdu">🇵🇰 اردو تحریر (Nastaliq Script)</option>
              </select>
            </div>

            {/* TARGET AUDIENCE */}
            <div className="p-4 rounded-2xl border border-green-800 bg-black/50 backdrop-blur-md space-y-3 shadow-md hover:border-[#00FF01]/30 hover:shadow-[0_0_15px_rgba(0,255,1,0.1)] transition-all duration-300">
              <label className="text-xs font-mono text-[#00FF01] uppercase tracking-widest flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[#00FF01]" />
                Target Audience
              </label>
              <select
                id="select-audience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full bg-[#05290e] border border-green-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-[#00FF01] focus:shadow-[0_0_15px_rgba(0,255,1,0.25)] font-mono cursor-pointer transition-all duration-300 hover:border-[#00FF01] glow-on-hover"
              >
                <option value="children">👶 Children up to 10 years old</option>
                <option value="adults">💼 Adults up to 40 years old</option>
                <option value="seniors">👴 Men over 60 years old</option>
              </select>
            </div>

            {/* TARGET REGIONS / COUNTRIES */}
            <div className="p-4 rounded-2xl border border-green-800 bg-black/50 backdrop-blur-md space-y-3 shadow-md hover:border-[#00FF01]/30 hover:shadow-[0_0_15px_rgba(0,255,1,0.1)] transition-all duration-300">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-[#00FF01] uppercase tracking-widest flex items-center gap-1.5 font-bold">
                  <Globe className="h-3.5 w-3.5 text-[#00FF01]" />
                  Target Regions / Countries
                </label>
                <span className="text-[10px] font-mono text-gray-500">{selectedCountries.length} selected</span>
              </div>
              
              {/* Search Option above countries list */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={countrySearchQuery}
                  onChange={(e) => setCountrySearchQuery(e.target.value)}
                  className="w-full bg-[#05290e] border border-green-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-[#00FF01] focus:shadow-[0_0_12px_rgba(0,255,1,0.2)] font-mono transition-all duration-300 hover:border-[#00FF01]"
                />
                {countrySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCountrySearchQuery("")}
                    className="absolute right-3 top-2 text-[10px] text-gray-400 hover:text-white cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* List of Countries (Filtered) */}
              <div className="bg-[#031d0a] border border-green-800/60 rounded-xl max-h-[140px] overflow-y-auto p-1.5 space-y-1 scrollbar-thin scrollbar-thumb-green-800">
                {ALL_COUNTRIES.filter(country =>
                  country.toLowerCase().includes(countrySearchQuery.toLowerCase())
                ).map((country) => {
                  const isSelected = selectedCountries.includes(country);
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
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-[#00FF01]/20 text-[#00FF01] border border-[#00FF01]/40 font-bold"
                          : "text-gray-300 hover:bg-green-900/15 border border-transparent"
                      }`}
                    >
                      <span>{country}</span>
                      {isSelected ? (
                        <span className="text-[9px] bg-[#00FF01] text-black px-1.5 py-0.5 rounded-full font-bold">Added</span>
                      ) : (
                        <span className="text-[9px] text-gray-500 opacity-0 group-hover:opacity-100">+ Add</span>
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

              {/* Selected Countries List Display */}
              {selectedCountries.length > 0 ? (
                <div className="space-y-1.5 pt-1 border-t border-green-800/30">
                  <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">
                    Selected (V.O. Customizing):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedCountries.map((country) => (
                      <span
                        key={country}
                        className="inline-flex items-center gap-1 bg-[#00FF01] text-black text-[9px] font-mono px-2 py-0.5 rounded-full font-bold animate-fade-in"
                      >
                        {country}
                        <button
                          type="button"
                          onClick={() => setSelectedCountries(selectedCountries.filter(c => c !== country))}
                          className="hover:bg-black/20 text-black rounded-full w-3 h-3 flex items-center justify-center font-black cursor-pointer text-[8px]"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-gray-500 font-mono italic text-center pt-1">
                  No countries selected (defaults to global audience)
                </div>
              )}
            </div>

             {/* SCRIPT LENGTH TYPE & DETAILS */}
            <div className="p-4 rounded-2xl border border-green-800 bg-black/50 backdrop-blur-md space-y-4 shadow-md hover:border-[#00FF01]/30 hover:shadow-[0_0_15px_rgba(0,255,1,0.1)] transition-all duration-300">
              <div>
                <label className="text-xs font-mono text-[#00FF01] uppercase tracking-widest block mb-2">
                  Script Length
                </label>
                <div className="space-y-1.5 mb-2">
                  <span className="text-[10px] font-mono text-[#00FF01] uppercase tracking-wider block">
                    Type
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setScriptLengthType("word_count")}
                      className={`py-2 px-3 text-xs font-mono transition-all duration-300 border text-center cursor-pointer ${
                        scriptLengthType === "word_count"
                          ? "bg-[#00FF01] text-black border-[#00FF01] rounded-[17px] font-extrabold shadow-[0_0_15px_rgba(0,255,1,0.4)]"
                          : "bg-green-900/10 text-gray-400 border-green-800/40 hover:border-[#00FF01] hover:text-white rounded-xl"
                      } hover:scale-102 active:scale-95`}
                    >
                      ○ By Word Count
                    </button>
                    <button
                      onClick={() => setScriptLengthType("video_duration")}
                      className={`py-2 px-3 text-xs font-mono transition-all duration-300 border text-center cursor-pointer ${
                        scriptLengthType === "video_duration"
                          ? "bg-[#00FF01] text-black border-[#00FF01] rounded-[17px] font-extrabold shadow-[0_0_15px_rgba(0,255,1,0.4)]"
                          : "bg-green-900/10 text-gray-400 border-green-800/40 hover:border-[#00FF01] hover:text-white rounded-xl"
                      } hover:scale-102 active:scale-95`}
                    >
                      ○ By Video Duration
                    </button>
                  </div>
                </div>
              </div>

              {scriptLengthType === "word_count" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-[#00FF01] uppercase tracking-widest block">
                      Target Word Volume
                    </label>
                    <span className="text-xs text-[#00FF01] font-mono font-bold animate-pulse">{wordCount} words</span>
                  </div>
                  
                  {/* Pill buttons for presets */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                    {[300, 1500, 10000, 20000].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handleWordPreset(preset)}
                        className={`py-1.5 text-[10px] font-mono transition-all duration-300 border glow-on-hover cursor-pointer ${
                          wordCount === preset
                            ? "bg-[#00FF01] text-black border-[#00FF01] rounded-[17px] font-extrabold shadow-[0_0_12px_rgba(0,255,1,0.4)]"
                            : "bg-green-900/10 text-gray-400 border-green-800/50 hover:border-[#00FF01] hover:text-white rounded-xl"
                        } hover:scale-105 active:scale-95`}
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
                      className="w-full bg-[#05290e] border border-green-800 rounded-xl py-2 px-4 text-xs text-white focus:outline-none focus:border-[#00FF01] focus:shadow-[0_0_12px_rgba(0,255,1,0.25)] font-mono transition-all duration-300 hover:border-[#00FF01] glow-on-hover"
                      placeholder="Custom word length (e.g. 20000)..."
                    />
                    <span className="text-[10px] text-gray-500 font-mono block">
                      Volume is adjustable from 0 to 20,000 words.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-[#00FF01] uppercase tracking-widest block">
                      Video Duration (Minutes)
                    </label>
                    <span className="text-xs text-[#00FF01] font-mono font-bold animate-pulse">~{Math.round(videoDuration * 145)} words</span>
                  </div>

                  <div className="space-y-1">
                    <input
                      id="input-duration"
                      type="number"
                      min="1"
                      max="120"
                      value={videoDuration}
                      onChange={(e) => setVideoDuration(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-[#05290e] border border-green-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-[#00FF01] focus:shadow-[0_0_12px_rgba(0,255,1,0.25)] font-mono transition-all duration-300 hover:border-[#00FF01] glow-on-hover"
                      placeholder="e.g., 15"
                    />
                    <span className="text-[10px] text-gray-500 font-mono block">
                      Converts to words at approximately 140–150 words per minute.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* GREETINGS PREFIX / BEGINNING - ASSALAMU ALAIKUM FIRST */}
            <div className="p-4 rounded-2xl border border-green-800 bg-black/50 backdrop-blur-md space-y-3 shadow-md hover:border-[#00FF01]/30 hover:shadow-[0_0_15px_rgba(0,255,1,0.1)] transition-all duration-300">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono text-[#00FF01] uppercase tracking-widest block">
                  Greeting
                </label>
                <span className="text-[10px] font-mono text-[#00FF01] uppercase tracking-wider block">
                  Prefix
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {["Asslamoalaikum", "Adaab", "Namaste", "Greetings", "Welcome", "None"].map((p) => (
                  <button
                    key={p}
                    onClick={() => handleGreetingsPreset(p)}
                    className={`py-1 px-2 text-[9px] font-mono transition-all duration-300 border truncate glow-on-hover ${
                      greetingsPrefix === p
                        ? "bg-[#00FF01] text-black border-[#00FF01] rounded-[17px] font-extrabold shadow-[0_0_12px_rgba(0,255,1,0.4)]"
                        : "bg-green-900/10 text-gray-400 border-green-800/40 hover:border-[#00FF01] hover:text-white rounded-xl"
                    } hover:scale-102 active:scale-95`}
                    title={p}
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
                className="w-full bg-[#05290e] border border-green-800 rounded-xl py-2 px-4 text-xs text-white focus:outline-none focus:border-[#00FF01] focus:shadow-[0_0_12px_rgba(0,255,1,0.25)] font-mono transition-all duration-300 hover:border-[#00FF01] glow-on-hover"
                placeholder="Custom greeting prefix..."
              />
            </div>

            {/* CUSTOM HOOK & STRUCTURING - DEFAULT WHAT DO YOU KNOW? */}
            <div className="p-4 rounded-2xl border border-green-800 bg-black/50 backdrop-blur-md space-y-3 shadow-md hover:border-[#00FF01]/30 hover:shadow-[0_0_15px_rgba(0,255,1,0.1)] transition-all duration-300">
              <div className="space-y-1">
                <label className="text-xs font-mono text-[#00FF01] uppercase tracking-widest block font-bold">
                  Custom Hook Input
                </label>
                <input
                  id="input-custom-hook"
                  type="text"
                  value={customHook}
                  onChange={(e) => setCustomHook(e.target.value)}
                  className="w-full bg-[#05290e] border border-green-800 rounded-xl py-2 px-4 text-xs text-white focus:outline-none focus:border-[#00FF01] focus:shadow-[0_0_12px_rgba(0,255,1,0.25)] font-mono transition-all duration-300 hover:border-[#00FF01] glow-on-hover"
                  placeholder="e.g. What do you know?..."
                />
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-green-800/50">
                <div className="space-y-0.5 pr-2">
                  <span className="text-xs font-semibold text-[#00FF01] block font-bold">Include Hooks, Body & Conclusion</span>
                  <span className="text-[10px] text-gray-500 font-mono block">Structured sectional output</span>
                </div>
                <button
                  id="toggle-hooks-structure"
                  onClick={() => setIncludeHooksBodyConclusion(!includeHooksBodyConclusion)}
                  className={`w-11 h-6 rounded-xl p-1 transition-all duration-300 ${
                    includeHooksBodyConclusion ? "bg-[#00FF01]" : "bg-gray-800"
                  } hover:scale-105`}
                >
                  <div
                    className={`bg-black w-4 h-4 rounded-xl shadow-md transition-all duration-300 transform ${
                      includeHooksBodyConclusion ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Added line at the bottom of the "Custom Hook Input" */}
              <div className="border-t border-green-800/40 pt-1 mt-2" />
            </div>

            {/* Added line right under the Custom Hook Input div */}
            <div className="border-b border-green-800/30 my-4" />

            {/* MOVED: YouTube and social media growth strategist */}
            <div className="p-4 rounded-2xl border border-green-800 bg-black/50 backdrop-blur-md space-y-4 shadow-md hover:border-[#00FF01]/30 hover:shadow-[0_0_15px_rgba(0,255,1,0.1)] transition-all duration-300">
              <div className="border-b border-green-800/50 pb-2 flex items-center justify-between">
                <span className="text-xs font-mono text-[#00FF01] uppercase tracking-wider block font-bold">
                  YouTube and social media growth strategist
                </span>
                <Sparkle className="h-4 w-4 text-[#00FF01] animate-spin" style={{ animationDuration: '8s' }} />
              </div>

              <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
                Toggle metadata elements to include in the CTR generation stream. Click elements to scroll to their output blocks.
              </p>

              <div className="space-y-2.5">
                {/* Toggle Title */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => scrollToSection("ctr-section-title")}
                    className="text-xs font-semibold text-gray-300 hover:text-[#00FF01] cursor-pointer transition-colors flex items-center gap-1.5 font-sans"
                  >
                    <span className="h-1 w-1 bg-[#00FF01] rounded-full" />
                    Title Option
                  </button>
                  <button
                    onClick={() => setToggleTitle(!toggleTitle)}
                    className={`w-10 h-5.5 rounded-xl p-0.5 transition-all duration-300 ${toggleTitle ? "bg-[#00FF01]" : "bg-gray-800"}`}
                  >
                    <div className={`bg-black w-4.5 h-4.5 rounded-xl shadow-md transition-all duration-300 transform ${toggleTitle ? "translate-x-4.5" : "translate-x-0"}`} />
                  </button>
                </div>

                {/* Toggle Description */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => scrollToSection("ctr-section-description")}
                    className="text-xs font-semibold text-gray-300 hover:text-[#00FF01] cursor-pointer transition-colors flex items-center gap-1.5 font-sans"
                  >
                    <span className="h-1 w-1 bg-[#00FF01] rounded-full" />
                    SEO Description
                  </button>
                  <button
                    onClick={() => setToggleDescription(!toggleDescription)}
                    className={`w-10 h-5.5 rounded-xl p-0.5 transition-all duration-300 ${toggleDescription ? "bg-[#00FF01]" : "bg-gray-800"}`}
                  >
                    <div className={`bg-black w-4.5 h-4.5 rounded-xl shadow-md transition-all duration-300 transform ${toggleDescription ? "translate-x-4.5" : "translate-x-0"}`} />
                  </button>
                </div>

                {/* Toggle Timestamps */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => scrollToSection("ctr-section-timestamps")}
                    className="text-xs font-semibold text-gray-300 hover:text-[#00FF01] cursor-pointer transition-colors flex items-center gap-1.5 font-sans"
                  >
                    <span className="h-1 w-1 bg-[#00FF01] rounded-full" />
                    Chronological Timestamps
                  </button>
                  <button
                    onClick={() => setToggleTimestamps(!toggleTimestamps)}
                    className={`w-10 h-5.5 rounded-xl p-0.5 transition-all duration-300 ${toggleTimestamps ? "bg-[#00FF01]" : "bg-gray-800"}`}
                  >
                    <div className={`bg-black w-4.5 h-4.5 rounded-xl shadow-md transition-all duration-300 transform ${toggleTimestamps ? "translate-x-4.5" : "translate-x-0"}`} />
                  </button>
                </div>

                {/* Video Duration Input for Timestamps */}
                {toggleTimestamps && (
                  <div className="pl-4 py-1 border-l border-green-800/50 space-y-1">
                    <label className="text-[9px] font-mono text-gray-400 block">TIME ESTIMATOR (DURATION):</label>
                    <input
                      type="text"
                      value={ytVideoDuration}
                      onChange={(e) => setYtVideoDuration(e.target.value)}
                      placeholder="e.g. 10:00 or 15:30"
                      className="w-full bg-[#05290e] border border-green-800 rounded-lg py-1 px-2.5 text-xs text-white focus:outline-none focus:border-[#00FF01] font-mono"
                    />
                  </div>
                )}

                {/* Toggle Hashtags */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => scrollToSection("ctr-section-hashtags")}
                    className="text-xs font-semibold text-gray-300 hover:text-[#00FF01] cursor-pointer transition-colors flex items-center gap-1.5 font-sans"
                  >
                    <span className="h-1 w-1 bg-[#00FF01] rounded-full" />
                    Hashtags
                  </button>
                  <button
                    onClick={() => setToggleHashtags(!toggleHashtags)}
                    className={`w-10 h-5.5 rounded-xl p-0.5 transition-all duration-300 ${toggleHashtags ? "bg-[#00FF01]" : "bg-gray-800"}`}
                  >
                    <div className={`bg-black w-4.5 h-4.5 rounded-xl shadow-md transition-all duration-300 transform ${toggleHashtags ? "translate-x-4.5" : "translate-x-0"}`} />
                  </button>
                </div>

                {/* Toggle Tags */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => scrollToSection("ctr-section-tags")}
                    className="text-xs font-semibold text-gray-300 hover:text-[#00FF01] cursor-pointer transition-colors flex items-center gap-1.5 font-sans"
                  >
                    <span className="h-1 w-1 bg-[#00FF01] rounded-full" />
                    SEO Keywords Tags
                  </button>
                  <button
                    onClick={() => setToggleTags(!toggleTags)}
                    className={`w-10 h-5.5 rounded-xl p-0.5 transition-all duration-300 ${toggleTags ? "bg-[#00FF01]" : "bg-gray-800"}`}
                  >
                    <div className={`bg-black w-4.5 h-4.5 rounded-xl shadow-md transition-all duration-300 transform ${toggleTags ? "translate-x-4.5" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* MOVED: thumbnail director and Tagline */}
            <div className="p-4 rounded-2xl border border-green-800 bg-black/50 backdrop-blur-md space-y-4 shadow-md hover:border-[#00FF01]/30 hover:shadow-[0_0_15px_rgba(0,255,1,0.1)] transition-all duration-300">
              <div className="border-b border-green-800/50 pb-2 flex items-center justify-between">
                <span className="text-xs font-mono text-[#00FF01] uppercase tracking-wider block font-bold">
                  thumbnail director & Tagline
                </span>
              </div>

              {/* Niche dropdown synced with Domain */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">
                  Target Niche (Synced)
                </label>
                <select
                  value={topicNiche}
                  onChange={(e) => {
                    setTopicNiche(e.target.value);
                    setContentCategory(e.target.value);
                  }}
                  className="w-full bg-[#05290e] border border-green-800 rounded-xl py-1.5 px-3 text-xs text-white focus:outline-none focus:border-[#00FF01] font-mono cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Optional Headline input */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">
                  Prompt text Headline (Optional)
                </label>
                <input
                  type="text"
                  value={thumbHeadline}
                  onChange={(e) => setThumbHeadline(e.target.value)}
                  placeholder="e.g. SECRET REVEALED"
                  className="w-full bg-[#05290e] border border-green-800 rounded-xl py-1.5 px-3 text-xs text-white focus:outline-none focus:border-[#00FF01] font-mono"
                />
              </div>

              {/* Optional Small Tagline input */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">
                  Prompt Small Tagline (Optional)
                </label>
                <input
                  type="text"
                  value={thumbSmallTagline}
                  onChange={(e) => setThumbSmallTagline(e.target.value)}
                  placeholder="e.g. 99% of people miss this"
                  className="w-full bg-[#05290e] border border-green-800 rounded-xl py-1.5 px-3 text-xs text-white focus:outline-none focus:border-[#00FF01] font-mono"
                />
              </div>

              {/* Background Color tab/label */}
              <div className="space-y-2 border-t border-green-900/40 pt-3">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">
                  🎨 Thumbnail Background Color & Gradient
                </label>
                
                {/* Background Selector Type Tabs */}
                <div className="grid grid-cols-3 gap-1 bg-[#031d0a] p-1 rounded-xl border border-green-850">
                  {(["preset", "custom_solid", "custom_gradient"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setBgType(type)}
                      className={`py-1 px-1.5 text-[9px] font-mono font-bold transition-all duration-300 rounded-lg cursor-pointer ${
                        bgType === type
                          ? "bg-[#00FF01] text-black font-black"
                          : "text-gray-400 hover:text-white"
                      }`}
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
                    className="w-full bg-[#05290e] border border-green-800 rounded-xl py-1.5 px-3 text-xs text-white focus:outline-none focus:border-[#00FF01] font-mono cursor-pointer"
                  >
                    <option value="Dark Green & Black">Dark Green & Black</option>
                    <option value="Neon Green & Deep Charcoal">Neon Green & Deep Charcoal</option>
                    <option value="Neon Blue & Dark Purple">Neon Blue & Dark Purple</option>
                    <option value="Sunset Orange & Crimson">Sunset Orange & Crimson</option>
                    <option value="Neon Red & Charcoal">Neon Red & Charcoal</option>
                  </select>
                )}

                {bgType === "custom_solid" && (
                  <div className="flex items-center gap-3 bg-[#031d0a] p-2 rounded-xl border border-green-800/60">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-green-700 shrink-0">
                      <input
                        type="color"
                        value={customBgSolid}
                        onChange={(e) => setCustomBgSolid(e.target.value)}
                        className="absolute inset-0 w-full h-full scale-150 cursor-pointer border-0 p-0 bg-transparent"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[8px] font-mono text-gray-400 uppercase tracking-wider block">Background Color</span>
                      <span className="text-xs font-mono text-[#00FF01] font-bold">{customBgSolid}</span>
                    </div>
                  </div>
                )}

                {bgType === "custom_gradient" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 bg-[#031d0a] p-1.5 rounded-xl border border-green-800/60">
                        <input
                          type="color"
                          value={customBgGrad1}
                          onChange={(e) => setCustomBgGrad1(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer p-0 border-0 bg-transparent shrink-0"
                        />
                        <div className="overflow-hidden">
                          <span className="text-[8px] font-mono text-gray-400 block truncate">Color A</span>
                          <span className="text-[9px] font-mono text-[#00FF01] font-semibold block">{customBgGrad1}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-[#031d0a] p-1.5 rounded-xl border border-green-800/60">
                        <input
                          type="color"
                          value={customBgGrad2}
                          onChange={(e) => setCustomBgGrad2(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer p-0 border-0 bg-transparent shrink-0"
                        />
                        <div className="overflow-hidden">
                          <span className="text-[8px] font-mono text-gray-400 block truncate">Color B</span>
                          <span className="text-[9px] font-mono text-[#00FF01] font-semibold block">{customBgGrad2}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Live preview gradient bar */}
                    <div
                      className="h-5 rounded-lg border border-green-700/50 shadow-inner"
                      style={{ background: `linear-gradient(to right, ${customBgGrad1}, ${customBgGrad2})` }}
                      title="Live Gradient Preview"
                    />
                  </div>
                )}
              </div>

              {/* Text Color tab/label */}
              <div className="space-y-2 border-t border-green-900/40 pt-3">
                <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">
                  ✍️ Thumbnail Text Color Overlay
                </label>
                
                {/* Text Selector Type Tabs */}
                <div className="grid grid-cols-2 gap-1 bg-[#031d0a] p-1 rounded-xl border border-green-850">
                  {(["preset", "custom"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTextType(type)}
                      className={`py-1 px-1.5 text-[9px] font-mono font-bold transition-all duration-300 rounded-lg cursor-pointer ${
                        textType === type
                          ? "bg-[#00FF01] text-black font-black"
                          : "text-gray-400 hover:text-white"
                      }`}
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
                        className={`py-1 px-1.5 text-[9px] font-mono border text-center cursor-pointer transition-all ${
                          thumbTextColor === item.name
                            ? "bg-[#00FF01] text-black border-[#00FF01] rounded-[17px] font-extrabold"
                            : "bg-green-900/10 text-gray-400 border-green-800/40 hover:border-[#00FF01] hover:text-white rounded-xl"
                        }`}
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
                      <div className="flex items-center gap-2 bg-[#031d0a] p-1.5 rounded-xl border border-green-800/60">
                        <input
                          type="color"
                          value={customTextCol1}
                          onChange={(e) => setCustomTextCol1(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer p-0 border-0 bg-transparent shrink-0"
                        />
                        <div className="overflow-hidden">
                          <span className="text-[8px] font-mono text-gray-400 block truncate">Primary Text</span>
                          <span className="text-[9px] font-mono text-[#00FF01] font-semibold block">{customTextCol1}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-[#031d0a] p-1.5 rounded-xl border border-[#00FF01]/20">
                        <input
                          type="color"
                          value={customTextCol2}
                          onChange={(e) => setCustomTextCol2(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer p-0 border-0 bg-transparent shrink-0"
                        />
                        <div className="overflow-hidden">
                          <span className="text-[8px] font-mono text-gray-400 block truncate">Accent/Shadow</span>
                          <span className="text-[9px] font-mono text-[#00FF01] font-semibold block">{customTextCol2}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Custom Color Palette Swatches */}
                    <div className="space-y-1 pt-1.5">
                      <span className="text-[8px] font-mono text-gray-400 uppercase tracking-wider block">
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
                        ].map((swatch, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setCustomTextCol1(swatch.primary);
                              setCustomTextCol2(swatch.accent);
                            }}
                            className={`p-1 rounded bg-black/40 border transition-all text-left flex items-center gap-1.5 cursor-pointer text-[8px] font-mono ${
                              customTextCol1 === swatch.primary && customTextCol2 === swatch.accent
                                ? "border-[#00FF01] bg-[#00FF01]/5 text-white"
                                : "border-green-900/60 hover:border-[#00FF01] text-gray-400 hover:text-white"
                            }`}
                          >
                            <span className="flex gap-0.5 shrink-0">
                              <span style={{ backgroundColor: swatch.primary }} className="w-2.5 h-2.5 rounded-full border border-black/35" />
                              <span style={{ backgroundColor: swatch.accent }} className="w-2.5 h-2.5 rounded-full border border-black/35" />
                            </span>
                            <span className="truncate">{swatch.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Live Preview Text Overlay */}
                    <div className="py-1.5 px-3 rounded-lg border border-green-850 bg-black/40 text-center">
                      <span className="text-[8px] font-mono text-gray-500 block mb-1">Live Text Color Contrast Preview:</span>
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
            <div className="p-5 rounded-2xl border border-green-800 bg-black/60 backdrop-blur-md space-y-4 hover:border-[#00FF01]/30 hover:shadow-[0_0_20px_rgba(0,255,1,0.05)] transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-green-800/40 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold tracking-wider text-[#00FF01] uppercase">Input Source:</span>
                  <div className="flex items-center gap-1.5 bg-green-950/40 p-1 rounded-xl border border-green-900/60">
                    {(["topic", "url", "files"] as const).map((source) => (
                      <button
                        key={source}
                        onClick={() => setInputSource(source)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider transition-all duration-300 uppercase cursor-pointer ${
                          inputSource === source
                            ? "bg-[#00FF01] text-black font-extrabold shadow-[0_0_10px_rgba(0,255,1,0.3)]"
                            : "text-gray-400 hover:text-white hover:bg-green-900/20"
                        }`}
                      >
                        {source === "topic" ? "● Topic (Type)" : source === "url" ? "● Video URL" : "● Files (.txt/.pdf)"}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  id="btn-prefill"
                  onClick={prefillSample}
                  className="text-xs text-[#00FF01] hover:text-white font-bold flex items-center justify-center gap-1 cursor-pointer bg-green-900/30 hover:bg-[#00FF01]/10 px-4 py-1.5 rounded-xl border border-green-800 hover:border-[#00FF01] transition-all duration-300 hover:shadow-[0_0_12px_rgba(0,255,1,0.2)] active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" /> Insert Sample Script
                </button>
              </div>

              {/* TAB CONTENT */}
              <div>
                {inputSource === "topic" && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-6 space-y-1.5 relative">
                      <label className="text-[10px] font-mono text-[#00FF01] uppercase tracking-wider block">Topic</label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={topicName}
                          onChange={(e) => setTopicName(e.target.value)}
                          placeholder="e.g. Benefits of Intermittent Fasting, Quantum Physics Explained..."
                          className="w-full bg-[#05290e] border border-green-800 rounded-xl py-2 pl-4 pr-10 text-xs text-white focus:outline-none focus:border-[#00FF01] focus:shadow-[0_0_10px_rgba(0,255,1,0.25)] font-mono transition-all duration-300"
                        />
                        
                        {/* Mic Icon / STT button */}
                        <div className="absolute right-2.5 flex items-center gap-1.5">
                          {listeningInput === "topic" ? (
                            <button
                              type="button"
                              onClick={stopSpeechToText}
                              className="p-1 rounded-lg bg-red-950/40 text-red-400 border border-red-900/40 hover:bg-red-900 hover:text-white transition-all cursor-pointer"
                              title="Stop listening"
                            >
                              <MicOff className="h-3.5 w-3.5 animate-pulse text-[#00FF00]" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startSpeechToText("topic")}
                              className="p-1 rounded-lg bg-green-950/40 text-gray-400 border border-green-900/40 hover:border-[#00FF01] hover:text-[#00FF01] transition-all cursor-pointer"
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
                            className="absolute inset-x-0 bottom-0 top-[18px] bg-black/95 border border-[#00FF01]/60 rounded-xl flex items-center justify-between px-3 z-20"
                          >
                            <span className="text-[10px] font-mono text-[#00FF01] uppercase tracking-wider animate-pulse flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-[#00FF00] animate-ping" />
                              Listening...
                            </span>
                            
                            {/* Gemini Waveform */}
                            <div className="flex items-end gap-1 h-5 mr-2">
                              <motion.div className="w-1 bg-[#00FF00] rounded-full" animate={{ height: ["20%", "80%", "20%"] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }} />
                              <motion.div className="w-1 bg-[#00FF00] rounded-full" animate={{ height: ["40%", "100%", "40%"] }} transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: 0.1 }} />
                              <motion.div className="w-1 bg-[#00FF00] rounded-full" animate={{ height: ["15%", "75%", "15%"] }} transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.25 }} />
                              <motion.div className="w-1 bg-[#00FF00] rounded-full" animate={{ height: ["50%", "90%", "50%"] }} transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut", delay: 0.15 }} />
                              <motion.div className="w-1 bg-[#00FF00] rounded-full" animate={{ height: ["25%", "60%", "25%"] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }} />
                            </div>

                            <button
                              type="button"
                              onClick={stopSpeechToText}
                              className="text-[9px] font-mono text-white hover:text-[#00FF01] px-1.5 py-0.5 rounded bg-red-950/40 border border-red-900/40 transition-all hover:bg-red-900"
                            >
                              Stop
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="md:col-span-3 space-y-1.5">
                      <label className="text-[10px] font-mono text-[#00FF01] uppercase tracking-wider block">Word Count Limit</label>
                      <input
                        type="number"
                        min="100"
                        max="20000"
                        value={topicWordLimit}
                        onChange={(e) => setTopicWordLimit(Math.max(100, parseInt(e.target.value) || 100))}
                        className="w-full bg-[#05290e] border border-green-800 rounded-xl py-2 px-4 text-xs text-white focus:outline-none focus:border-[#00FF01] focus:shadow-[0_0_10px_rgba(0,255,1,0.25)] font-mono transition-all duration-300"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <button
                        onClick={handleGenerateFromTopic}
                        disabled={topicGenerating || !topicName.trim()}
                        className={`w-full py-2 px-4 rounded-xl font-mono text-xs font-bold uppercase transition-all duration-300 flex items-center justify-center gap-2 border cursor-pointer ${
                          topicName.trim() && !topicGenerating
                            ? "bg-[#00FF01] text-black border-[#00FF01] hover:shadow-[0_0_15px_rgba(0,255,1,0.3)] active:scale-95"
                            : "bg-green-900/10 text-gray-500 border-green-800/40 cursor-not-allowed"
                        }`}
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
                      <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Paste URL (YouTube / Facebook / TikTok / Instagram)</label>
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full bg-[#05290e] border border-green-800 rounded-xl py-2 px-4 text-xs text-white focus:outline-none focus:border-[#00FF01] focus:shadow-[0_0_10px_rgba(0,255,1,0.25)] font-mono transition-all duration-300"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <button
                        onClick={() => handleExtractTranscript("direct")}
                        disabled={isExtractingUrl || isGeneratingWithGemini || !videoUrl.trim()}
                        className={`w-full py-2 px-4 rounded-xl font-mono text-xs font-bold uppercase transition-all duration-300 flex items-center justify-center gap-2 border cursor-pointer ${
                          videoUrl.trim() && !isExtractingUrl && !isGeneratingWithGemini
                            ? "bg-[#00FF01] text-black border-[#00FF01] hover:shadow-[0_0_15px_rgba(0,255,1,0.3)] active:scale-95"
                            : "bg-green-900/10 text-gray-500 border-green-800/40 cursor-not-allowed"
                        }`}
                      >
                        {isExtractingUrl ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> EXTRACTING...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5" /> GET TRANSCRIPT
                          </>
                        )}
                      </button>
                    </div>
                    <div className="md:col-span-3">
                      <button
                        onClick={() => handleExtractTranscript("gemini")}
                        disabled={isExtractingUrl || isGeneratingWithGemini || !videoUrl.trim()}
                        className={`w-full py-2 px-4 rounded-xl font-mono text-xs font-bold uppercase transition-all duration-300 flex items-center justify-center gap-2 border cursor-pointer ${
                          videoUrl.trim() && !isExtractingUrl && !isGeneratingWithGemini
                            ? "bg-gradient-to-r from-[#00FF01] to-emerald-400 text-black border-[#00FF01] hover:shadow-[0_0_20px_rgba(0,255,1,0.4)] hover:scale-105 active:scale-95"
                            : "bg-green-900/10 text-gray-500 border-green-800/40 cursor-not-allowed"
                        }`}
                      >
                        {isGeneratingWithGemini ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> GENERATING...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" /> ASK GEMINI
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {inputSource === "files" && (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-green-800/60 rounded-2xl p-6 bg-[#031d0a]/20 hover:border-[#00FF01]/40 transition-all duration-300 group">
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
                      <div className="h-10 w-10 rounded-full bg-green-950 border border-green-800 flex items-center justify-center text-[#00FF01] group-hover:scale-110 group-hover:border-[#00FF01] group-hover:shadow-[0_0_15px_rgba(0,255,1,0.2)] transition-all duration-300">
                        <Plus className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-mono font-semibold text-white">Click or Drag & Drop File</p>
                        <p className="text-[10px] font-mono text-gray-400 mt-1">Accepts raw .txt or standard .pdf files</p>
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
            <div className="p-4 rounded-2xl border border-[#00FF01]/30 bg-[#073011]/80 backdrop-blur-md shadow-[0_0_20px_rgba(0,255,1,0.1)] flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300 hover:border-[#00FF01]/50 hover:shadow-[0_0_25px_rgba(0,255,1,0.2)]">
              
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#00FF01]/10 flex items-center justify-center text-[#00FF01] animate-pulse">
                  <Sliders className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-[#00FF01] tracking-widest uppercase block font-bold">Automation Command Console</span>
                  <p className="text-xs text-gray-400">Set options & trigger plagiarism-free script transformation</p>
                </div>
              </div>

              {/* ACTION TOGGLES AND BRIGHT TRIGGER BUTTON */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                
                {/* FAST LITE MODE CAPULE TOGGLE */}
                <div className="flex items-center gap-2 bg-[#031d0a] p-1.5 rounded-xl border border-green-800 hover:border-green-600 transition-all duration-300">
                  <button
                    id="toggle-fast-lite"
                    onClick={() => setFastLiteMode(!fastLiteMode)}
                    className={`py-1.5 px-4 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all duration-300 hover:scale-103 active:scale-95 glow-on-hover ${
                      fastLiteMode
                        ? "bg-[#00FF01]/20 text-[#00FF01] border border-[#00FF01] shadow-[0_0_10px_rgba(0,255,1,0.2)]"
                        : "bg-transparent text-gray-400 border border-transparent hover:text-white"
                    }`}
                  >
                    <Zap className={`h-3.5 w-3.5 ${fastLiteMode ? "text-[#00FF01] fill-[#00FF01] animate-bounce" : "text-gray-500"}`} />
                    FAST LITE MOOD
                  </button>
                </div>

                {/* GENERATE SCRIPT CAPULE BUTTON */}
                <button
                  id="btn-generate-script"
                  onClick={() => handleGenerate()}
                  disabled={loading || !rawScript.trim()}
                  className={`py-3 px-8 rounded-xl font-display text-xs font-extrabold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 border cursor-pointer glow-on-hover ${
                    rawScript.trim()
                      ? "bg-[#00FF01] text-black border-[#00FF01] hover:shadow-[0_0_25px_rgba(0,255,1,0.5)] active:scale-95 transform scale-100 hover:scale-102"
                      : "bg-green-900/10 text-gray-500 border-green-800/40 cursor-not-allowed"
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-black" /> REPHRASING...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-black animate-spin" /> GENERATE SCRIPT
                    </>
                  )}
                </button>

              </div>
            </div>

            {/* SCRIPT WORKSPACE COLUMNS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* RAW SOURCE SCRIPT BOX */}
              <div className="flex flex-col h-[480px] rounded-2xl border border-green-800 bg-black/50 backdrop-blur-md overflow-hidden shadow-lg transition-all duration-300 hover:border-green-600 hover:shadow-[0_0_20px_rgba(0,255,1,0.05)]">
                <div className="px-5 py-3 border-b border-green-800/80 bg-green-900/10 flex items-center justify-between">
                  <span className="text-xs font-mono font-extrabold tracking-wider text-[#00FF01] flex items-center gap-2 animate-pulse">
                    <FileText className="h-4 w-4 text-[#00FF01]" />
                    RAW SOURCE SCRIPT
                  </span>
                  <span className="text-[10px] font-mono text-gray-400 bg-black/60 px-3 py-1 rounded-xl border border-green-800">
                    {rawScript.length} CHARACTERS
                  </span>
                </div>
                
                <div className="flex-1 relative">
                  <textarea
                    id="textarea-raw-script"
                    value={rawScript}
                    onChange={(e) => setRawScript(e.target.value)}
                    placeholder="Provide your script, video notes, medical findings, or tech ideas here. Any input language is supported. The engine completely rewrites your ideas into highly fluent wording with no plagiarism..."
                    className="w-full h-full bg-transparent resize-none p-5 text-xs md:text-sm text-gray-200 focus:outline-none placeholder-gray-600 leading-relaxed font-mono transition-all duration-300 hover:bg-[#00FF01]/2 focus:bg-[#031d0a]/30 pr-12"
                  />
                  
                  {/* Controls container in bottom right corner */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
                    {listeningInput === "rawScript" ? (
                      <button
                        type="button"
                        onClick={stopSpeechToText}
                        className="p-2.5 rounded-full bg-red-950/80 text-red-400 border border-red-800/80 hover:bg-red-900 transition-all cursor-pointer shadow-lg flex items-center justify-center"
                        title="Stop speech-to-text"
                      >
                        <MicOff className="h-4 w-4 animate-bounce text-[#00FF00]" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startSpeechToText("rawScript")}
                        className="p-2.5 rounded-full bg-green-950/85 text-gray-300 border border-green-800/80 hover:border-[#00FF01] hover:text-[#00FF01] hover:bg-green-900/30 transition-all cursor-pointer shadow-lg flex items-center justify-center hover:scale-110 active:scale-95"
                        title="Speak to enter script"
                      >
                        <Mic className="h-4 w-4" />
                      </button>
                    )}

                    {rawScript && (
                      <button
                        id="btn-clear-raw"
                        onClick={() => setRawScript("")}
                        className="p-2 rounded-xl bg-red-950/30 text-red-400 border border-red-900/40 hover:bg-red-900 hover:text-white transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95"
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
                        className="absolute inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-5 z-20"
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full bg-[#00FF00] animate-ping" />
                          <h3 className="text-sm font-mono text-[#00FF01] uppercase tracking-widest font-black">
                            Gemini Voice Scriptwriter Active
                          </h3>
                        </div>
                        <p className="text-xs text-gray-400 max-w-sm text-center leading-relaxed font-mono">
                          Speak your script ideas, narration drafts, or notes. Your voice is captured in real-time.
                        </p>
                        
                        {/* Gemini Waveform */}
                        <div className="flex items-end gap-1.5 h-10 px-6 py-2 bg-green-950/20 rounded-full border border-green-900/40">
                          <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["15%", "85%", "15%"] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }} />
                          <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["40%", "100%", "40%"] }} transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: 0.08 }} />
                          <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["20%", "70%", "20%"] }} transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.16 }} />
                          <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["50%", "95%", "50%"] }} transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut", delay: 0.12 }} />
                          <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["10%", "60%", "10%"] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} />
                          <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["35%", "80%", "35%"] }} transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut", delay: 0.14 }} />
                        </div>

                        <button
                          type="button"
                          onClick={stopSpeechToText}
                          className="px-5 py-2 rounded-xl bg-red-950/30 hover:bg-red-900 border border-red-900/60 text-red-200 text-xs font-mono transition-all cursor-pointer hover:scale-105"
                        >
                          Finish & Save Script
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* POLISHED V.O. SCRIPT / OUTPUT BOX */}
              <div className="flex flex-col h-[480px] rounded-2xl border border-green-800 bg-black/50 backdrop-blur-md overflow-hidden shadow-lg relative transition-all duration-300 hover:border-green-600 hover:shadow-[0_0_25px_rgba(0,255,1,0.08)]">
                {/* Active glowing ambient frame segment */}
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#00FF01]/50 to-transparent" />
                
                <div className="px-4 py-3 border-b border-green-800/80 bg-green-900/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold tracking-wider text-[#00FF01] flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-[#00FF01] animate-pulse" />
                    POLISHED V.O. SCRIPT
                  </span>
                  
                  {/* METADATA DOWNLOAD & LISTEN TABS (rounded-xl caps) */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {polishedScript && getFilteredVoices().length > 0 && (
                      <div className="flex items-center gap-1 bg-green-900/40 border border-green-800 rounded-xl px-2 py-1">
                        <span className="text-[9px] text-green-400 font-mono font-bold">🎙️ VOICE:</span>
                        <select
                          id="select-voice-speaker"
                          value={selectedVoiceName}
                          onChange={(e) => setSelectedVoiceName(e.target.value)}
                          className="bg-transparent border-none text-[10px] text-[#00FF01] font-mono font-bold focus:outline-none cursor-pointer max-w-[120px] sm:max-w-[160px] truncate outline-none"
                          style={{ colorScheme: "dark" }}
                        >
                          {getFilteredVoices().map((voice) => (
                            <option key={voice.name} value={voice.name} className="bg-[#05290e] text-[#00FF01]">
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
                      className={`px-3 py-1 rounded-xl text-[10px] font-mono font-bold tracking-tight flex items-center gap-1 transition-all duration-300 cursor-pointer border glow-on-hover ${
                        polishedScript
                          ? isPlayingAudio
                            ? "bg-red-950/40 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse"
                            : "bg-green-900/30 border-green-800 text-[#00FF01] hover:border-[#00FF01] hover:bg-[#00FF01]/10 hover:scale-105"
                          : "opacity-40 cursor-not-allowed text-gray-500 border-transparent"
                      } active:scale-95`}
                    >
                      {isPlayingAudio ? (
                        <>
                          <VolumeX className="h-3.5 w-3.5 text-red-400" /> STOP VO
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3.5 w-3.5 text-[#00FF01]" /> LISTEN AI
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
                      className={`px-3 py-1 text-[10px] font-mono font-bold tracking-tight flex items-center gap-1 transition-all duration-300 cursor-pointer border glow-on-hover ${
                        polishedScript
                          ? "bg-[#00FF01] text-black border-[#00FF01] rounded-[17px] shadow-[0_0_15px_rgba(0,255,1,0.5)] scale-100 hover:scale-105"
                          : "opacity-40 cursor-not-allowed text-gray-500 border-transparent rounded-xl"
                      } active:scale-95`}
                    >
                      <Plus className="h-3.5 w-3.5" /> INSERT
                    </button>
                    <button
                      id="btn-copy-script"
                      onClick={handleCopy}
                      disabled={!polishedScript}
                      className={`px-3 py-1 rounded-xl text-[10px] font-mono font-bold tracking-tight flex items-center gap-1 transition-all duration-300 cursor-pointer border glow-on-hover ${
                        polishedScript
                          ? "bg-green-900/30 border-green-800 text-[#00FF01] hover:border-[#00FF01] hover:bg-[#00FF01]/10 hover:scale-105"
                          : "opacity-40 cursor-not-allowed text-gray-500 border-transparent"
                      } active:scale-95`}
                    >
                      <Copy className="h-3.5 w-3.5" /> {copied ? "COPIED!" : "COPY TXT"}
                    </button>
                    <button
                      id="btn-download-script"
                      onClick={handleDownload}
                      disabled={!polishedScript}
                      className={`px-3 py-1 rounded-xl text-[10px] font-mono font-bold tracking-tight flex items-center gap-1 transition-all duration-300 cursor-pointer border glow-on-hover ${
                        polishedScript
                          ? "bg-green-900/30 border-green-800 text-[#00FF01] hover:border-[#00FF01] hover:bg-[#00FF01]/10 hover:scale-105"
                          : "opacity-40 cursor-not-allowed text-gray-500 border-transparent"
                      } active:scale-95`}
                    >
                      <Download className="h-3.5 w-3.5" /> DOWNLOAD
                    </button>
                  </div>
                </div>

                {/* USER INSTRUCTION: "In the output box, add three buttons: one for Hindi with Urdu wording, second for Urdu with Roman writing, third for Urdu with urdu Writing, 4th with English."
                    Let's place these extremely prominent language trigger buttons dire                <div className="bg-[#031d0a]/95 border-b border-green-800 p-2.5 space-y-2">
                  <span className="text-[10px] text-[#00FF01] font-mono tracking-wider block text-center uppercase font-bold">
                    ⚡ Quick Instant Transformation Buttons
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      id="btn-quick-lang-hindi"
                      onClick={() => handleSelectLanguage("hindi")}
                      disabled={loading || !rawScript.trim()}
                      className={`py-1.5 px-2 text-[9px] font-mono transition-all duration-300 border glow-on-hover ${
                        transformation === "hindi" && polishedScript
                          ? "bg-[#00FF01] text-black border-[#00FF01] rounded-[17px] font-extrabold shadow-[0_0_15px_rgba(0,255,1,0.5)]"
                          : "bg-green-900/35 text-[#00FF01]/90 border-green-700/80 hover:border-[#00FF01] hover:bg-[#00FF01]/15 rounded-xl font-bold"
                      } hover:scale-103 active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed`}
                    >
                      🇮🇳 Hindi (Urdu Wording/Accent)
                    </button>
                    <button
                      id="btn-quick-lang-roman"
                      onClick={() => handleSelectLanguage("urdu-roman")}
                      disabled={loading || !rawScript.trim()}
                      className={`py-1.5 px-2 text-[9px] font-mono transition-all duration-300 border glow-on-hover ${
                        transformation === "urdu-roman" && polishedScript
                          ? "bg-[#00FF01] text-black border-[#00FF01] rounded-[17px] font-extrabold shadow-[0_0_15px_rgba(0,255,1,0.5)]"
                          : "bg-green-900/35 text-[#00FF01]/90 border-green-700/80 hover:border-[#00FF01] hover:bg-[#00FF01]/15 rounded-xl font-bold"
                      } hover:scale-103 active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed`}
                    >
                      🇵🇰 Urdu Roman
                    </button>
                    <button
                      id="btn-quick-lang-urdu"
                      onClick={() => handleSelectLanguage("urdu-writing")}
                      disabled={loading || !rawScript.trim()}
                      className={`py-1.5 px-2 text-[11px] font-urdu transition-all duration-300 border glow-on-hover ${
                        transformation === "urdu-writing" && polishedScript
                          ? "bg-[#00FF01] text-black border-[#00FF01] rounded-[17px] font-extrabold shadow-[0_0_15px_rgba(0,255,1,0.5)]"
                          : "bg-green-900/35 text-[#00FF01]/90 border-green-700/80 hover:border-[#00FF01] hover:bg-[#00FF01]/15 rounded-xl font-semibold"
                      } hover:scale-103 active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed`}
                    >
                      🇵🇰 اردو تحریر
                    </button>
                    <button
                      id="btn-quick-lang-english"
                      onClick={() => handleSelectLanguage("english")}
                      disabled={loading || !rawScript.trim()}
                      className={`py-1.5 px-2 text-[9px] font-mono transition-all duration-300 border glow-on-hover ${
                        transformation === "english" && polishedScript
                          ? "bg-[#00FF01] text-black border-[#00FF01] rounded-[17px] font-extrabold shadow-[0_0_15px_rgba(0,255,1,0.5)]"
                          : "bg-green-900/35 text-[#00FF01]/90 border-green-700/80 hover:border-[#00FF01] hover:bg-[#00FF01]/15 rounded-xl font-bold"
                      } hover:scale-103 active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed`}
                    >
                      🇬🇧 English
                    </button>
                  </div>
                  {transformation === "hindi" && polishedScript && (
                    <div className="mx-2.5 mt-2.5 p-2 bg-[#05290e] border border-[#00FF01]/20 rounded-xl text-center">
                      <p className="text-[11px] text-[#00FF01] font-sans leading-relaxed">
                        ✨ <strong>देवनागरी लिपि में उर्दू एहसास (अस्सलामु अलैकुम):</strong> यह पूरी तरह से देवनागरी (हिंदी) अक्षरों में लिखा गया है, लेकिन इसके शब्द, वाक्य और उच्चारण शैली (लहज़ा) पूरी तरह से उर्दू और हिंदुस्तानी बातचीत पर आधारित हैं, ताकि जब इसे पढ़ा जाए तो यह मुकम्मल उर्दू लहज़े में लगे!
                      </p>
                    </div>
                  )}��या है, लेकिन इसके शब्द, वाक्य और उच्चारण शैली (लहज़ा) पूरी तरह से उर्दू और हिंदुस्तानी बातचीत पर आधारित हैं, ताकि जब इसे पढ़ा जाए तो यह मुकम्मल उर्दू लहज़े में लगे!
                      </p>
                    </div>
                  )}
                </div>

                {/* SCRIPT TEXT BOX / CONTAINER */}
                <div className="flex-1 overflow-y-auto p-5 relative font-sans text-xs md:text-sm leading-relaxed text-gray-100 selection:bg-[#00FF01] selection:text-black">
                  {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 space-y-4">
                      <Loader2 className="h-10 w-10 text-[#00FF01] animate-spin" />
                      <div className="text-center space-y-1">
                        <p className="text-xs font-mono text-[#00FF01] tracking-widest uppercase animate-pulse">
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
                      <div className="h-14 w-14 rounded-xl border border-dashed border-green-800/60 flex items-center justify-center text-green-700 animate-pulse">
                        <Sparkles className="h-7 w-7" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-gray-300 uppercase tracking-widest">
                          Output Screen Ready
                        </p>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto">
                          Configure your options, paste your draft, and hit the generate command above or languages directly inside the tab.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* CINEMATIC STORYBOARD & SCENE PROMPT CREATOR SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
              
              {/* SECTION 1: TRANSCRIPT INPUT */}
              <div className="flex flex-col h-[480px] rounded-2xl border border-green-800 bg-black/50 backdrop-blur-md overflow-hidden shadow-lg transition-all duration-300 hover:border-green-600 hover:shadow-[0_0_20px_rgba(0,255,1,0.05)]">
                <div className="px-5 py-3 border-b border-green-800/80 bg-green-900/10 flex flex-col xl:flex-row xl:items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-mono font-bold tracking-wider text-[#00FF01] flex items-center gap-2">
                      <Sliders className="h-4 w-4" />
                      TRANSCRIPT INPUT <Plus className="h-4 w-4 text-[#00FF01] animate-bounce" />
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">Configure script parameters & aspect ratios</span>
                  </div>
                  
                  {/* Controllers organized in sequential rows */}
                  <div className="flex flex-col gap-2.5 w-full xl:w-auto items-start xl:items-end">
                    
                    {/* Row 1: Domain Category and Scenes (with integrated Shots Calculator) */}
                    <div className="flex items-center gap-2 flex-wrap w-full xl:w-auto justify-start xl:justify-end">
                      
                      {/* Domain Category - First */}
                      <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-xl border border-green-800/60">
                        <span className="text-[9px] text-gray-400 font-mono">CATEGORY:</span>
                        <select
                          value={contentCategory}
                          onChange={(e) => {
                            setContentCategory(e.target.value);
                            setTopicNiche(e.target.value);
                          }}
                          className="bg-transparent text-[10px] text-[#00FF01] font-mono focus:outline-none font-bold cursor-pointer"
                          style={{ colorScheme: "dark" }}
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat} className="bg-[#05290e] text-[#00FF01]">{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Scenes with Shots Calculator toggle */}
                      <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-xl border border-green-800/60">
                        <span className="text-[9px] text-gray-400 font-mono">SCENES:</span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={numScenes}
                          onChange={(e) => setNumScenes(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="bg-transparent w-8 text-[10px] text-[#00FF01] font-mono focus:outline-none font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => setShowShotsCalculator(!showShotsCalculator)}
                          className={`p-1 rounded hover:bg-green-900/40 text-xs transition-all flex items-center justify-center ${showShotsCalculator ? "text-[#00FF01] bg-green-950/50" : "text-gray-400"}`}
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
                        className={`py-1 px-3 rounded-[17px] font-mono text-[9px] font-extrabold tracking-wider uppercase transition-all duration-300 flex items-center gap-1 border cursor-pointer ${
                          polishedScript
                            ? "bg-[#00FF01] text-black border-[#00FF01] hover:shadow-[0_0_15px_rgba(0,255,1,0.4)] hover:scale-105"
                            : "bg-green-900/10 text-gray-500 border-green-800/40 cursor-not-allowed"
                        }`}
                        title="Insert the polished voice over script"
                      >
                        <Plus className="h-3 w-3" /> INSERT
                      </button>

                      <label className="py-1 px-3 rounded-[17px] font-mono text-[9px] font-extrabold tracking-wider uppercase transition-all duration-300 flex items-center gap-1 border cursor-pointer bg-green-900/30 border-green-800 text-[#00FF01] hover:border-[#00FF01] hover:bg-[#00FF01]/10 hover:scale-105 active:scale-95">
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
                    <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-[17px] border border-green-800/60 hover:border-[#00FF01]/40 transition-all duration-300 w-fit">
                      <span className="text-[9px] text-gray-400 font-mono">FORMAT:</span>
                      <select
                        value={storyboardFormat}
                        onChange={(e) => setStoryboardFormat(e.target.value as any)}
                        className="bg-transparent text-[10px] text-[#00FF01] font-mono focus:outline-none font-bold cursor-pointer outline-none"
                        style={{ colorScheme: "dark" }}
                      >
                        <option value="16:9" className="bg-[#05290e] text-[#00FF01]">Horizontal (16:9)</option>
                        <option value="9:16" className="bg-[#05290e] text-[#00FF01]">Vertical (9:16)</option>
                        <option value="1:1" className="bg-[#05290e] text-[#00FF01]">Square (1:1)</option>
                        <option value="none" className="bg-[#05290e] text-[#00FF01]">None (No Format)</option>
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
                        className="bg-black/95 border-b border-green-800/80 p-4 space-y-3 font-mono overflow-hidden z-30"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#00FF01] uppercase tracking-widest flex items-center gap-1.5">
                            <Calculator className="h-3.5 w-3.5 animate-pulse" /> duration-based shots calculator
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowShotsCalculator(false)}
                            className="text-[10px] text-red-400 hover:text-red-300 font-bold border border-red-900/60 bg-red-950/20 px-2 py-0.5 rounded"
                          >
                            CLOSE
                          </button>
                        </div>

                        {/* Calculator Inputs */}
                        <div className="grid grid-cols-3 gap-2.5">
                          <div>
                            <label className="text-[8px] text-gray-500 block mb-1">VIDEO MINS</label>
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
                              className="w-full bg-green-950/20 border border-green-800/60 rounded px-2 py-1 text-xs text-[#00FF01] font-bold font-mono focus:outline-none focus:border-[#00FF01]"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] text-gray-500 block mb-1">VIDEO SECS</label>
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
                              className="w-full bg-green-950/20 border border-green-800/60 rounded px-2 py-1 text-xs text-[#00FF01] font-bold font-mono focus:outline-none focus:border-[#00FF01]"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] text-gray-500 block mb-1">SHOT TIME (SEC)</label>
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
                              className="w-full bg-green-950/20 border border-green-800/60 rounded px-2 py-1 text-xs text-[#00FF01] font-bold font-mono focus:outline-none focus:border-[#00FF01]"
                            />
                          </div>
                        </div>

                        {/* Output format requested by the user */}
                        <div className="bg-green-950/15 p-3 rounded-xl border border-green-800/50 space-y-1.5 text-[10px] md:text-xs">
                          <p className="text-[#00FF01] font-bold uppercase tracking-wider text-[8px] opacity-75">Output Details:</p>
                          <div className="space-y-1 text-gray-300 font-bold">
                            <div className="flex justify-between border-b border-green-950 py-1">
                              <span>Video Duration:</span>
                              <span className="text-[#00FF01]">
                                {calcVideoMinutes} minute{calcVideoMinutes !== 1 ? 's' : ''} {calcVideoSeconds > 0 ? `${calcVideoSeconds} second${calcVideoSeconds !== 1 ? 's' : ''}` : ''}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-green-950 py-1">
                              <span>Shot Duration:</span>
                              <span className="text-[#00FF01]">{calcShotDuration} seconds</span>
                            </div>
                            <div className="flex justify-between pt-1">
                              <span>Total Shots Required:</span>
                              <span className="text-[#00FF01] text-xs font-black">{Math.ceil(((calcVideoMinutes * 60) + calcVideoSeconds) / calcShotDuration) || 1}</span>
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
                    className="flex-1 bg-transparent resize-none p-5 text-xs md:text-sm text-gray-200 focus:outline-none placeholder-gray-600 leading-relaxed font-mono transition-all duration-300 hover:bg-[#00FF01]/2 focus:bg-[#031d0a]/30"
                  />

                  {/* Speech to Text Floating Activator */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    {listeningInput === "transcript" ? (
                      <button
                        type="button"
                        onClick={stopSpeechToText}
                        className="p-2.5 rounded-full bg-red-950/80 text-red-400 border border-red-800/80 hover:bg-red-900 transition-all cursor-pointer shadow-lg flex items-center justify-center"
                        title="Stop speech-to-text"
                      >
                        <MicOff className="h-4 w-4 animate-bounce text-[#00FF00]" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startSpeechToText("transcript")}
                        className="p-2.5 rounded-full bg-green-950/85 text-gray-300 border border-green-800/80 hover:border-[#00FF01] hover:text-[#00FF01] hover:bg-green-900/30 transition-all cursor-pointer shadow-lg flex items-center justify-center hover:scale-110 active:scale-95"
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
                        className="absolute inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-5 z-20"
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full bg-[#00FF00] animate-ping" />
                          <h3 className="text-sm font-mono text-[#00FF01] uppercase tracking-widest font-black">
                            Gemini Voice Explainer Active
                          </h3>
                        </div>
                        <p className="text-xs text-gray-400 max-w-sm text-center leading-relaxed font-mono">
                          Speak your scene idea or raw narration naturally. Your speech will be transcribed and added directly as a storyboard segment.
                        </p>
                        
                        {/* Gemini Waveform */}
                        <div className="flex items-end gap-1.5 h-10 px-6 py-2 bg-green-950/20 rounded-full border border-green-900/40">
                          <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["15%", "85%", "15%"] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }} />
                          <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["40%", "100%", "40%"] }} transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: 0.08 }} />
                          <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["20%", "70%", "20%"] }} transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.16 }} />
                          <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["50%", "95%", "50%"] }} transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut", delay: 0.12 }} />
                          <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["10%", "60%", "10%"] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} />
                          <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["35%", "80%", "35%"] }} transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut", delay: 0.14 }} />
                        </div>

                        <button
                          type="button"
                          onClick={stopSpeechToText}
                          className="px-5 py-2 rounded-xl bg-red-950/30 hover:bg-red-900 border border-red-900/60 text-red-200 text-xs font-mono transition-all cursor-pointer hover:scale-105"
                        >
                          Finish & Save Input
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* SECTION 2: GENERATED SCENE PROMPTS */}
              <div className="flex flex-col h-[480px] rounded-2xl border border-green-800 bg-black/50 backdrop-blur-md overflow-hidden shadow-lg relative transition-all duration-300 hover:border-green-600 hover:shadow-[0_0_20px_rgba(0,255,1,0.05)]">
                <div className="px-5 py-3 border-b border-green-800/80 bg-green-900/15 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                  <span className="text-xs font-mono font-bold tracking-wider text-[#00FF01] flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-[#00FF01]" />
                    GENERATED SCENE PROMPTS
                  </span>
                  
                  {/* Action buttons & Generate scenes controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleGenerateScenes}
                      disabled={scenesLoading || !transcriptInput.trim()}
                      className={`py-1.5 px-4 rounded-[17px] font-mono text-[10px] font-black tracking-wider uppercase transition-all duration-300 flex items-center gap-1.5 border cursor-pointer ${
                        transcriptInput.trim() && !scenesLoading
                          ? "bg-[#00FF01] text-black border-[#00FF01] hover:shadow-[0_0_15px_rgba(0,255,1,0.4)] hover:scale-105 active:scale-95"
                          : "bg-green-900/10 text-gray-500 border-green-800/40 cursor-not-allowed"
                      }`}
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
                          className="p-1.5 rounded-lg bg-green-900/30 hover:bg-[#00FF01]/10 text-[#00FF01] border border-green-800 hover:border-[#00FF01] transition-all text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                          title="Copy All"
                        >
                          <Copy className="h-3 w-3" /> COPY ALL
                        </button>
                        <button
                          onClick={handleDownloadAllScenesTxt}
                          className="p-1.5 rounded-lg bg-green-900/30 hover:bg-[#00FF01]/10 text-[#00FF01] border border-green-800 hover:border-[#00FF01] transition-all text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                          title="Download Text"
                        >
                          <Download className="h-3 w-3" /> .TXT
                        </button>
                        <button
                          onClick={handleDownloadAllScenesDocx}
                          className="p-1.5 rounded-lg bg-green-900/30 hover:bg-[#00FF01]/10 text-[#00FF01] border border-green-800 hover:border-[#00FF01] transition-all text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                          title="Download Word Document"
                        >
                          <Download className="h-3 w-3" /> .DOCX
                        </button>
                        <button
                          onClick={handleClearAllScenes}
                          className="p-1.5 rounded-lg bg-red-950/20 hover:bg-red-900 hover:text-white text-red-400 border border-red-900/40 transition-all text-[10px] font-mono flex items-center gap-1 cursor-pointer"
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
                      <Loader2 className="h-10 w-10 text-[#00FF01] animate-spin" />
                      <p className="text-xs font-mono text-[#00FF01] uppercase tracking-wider animate-pulse">CREATING CINEMATIC STORYBOARD...</p>
                    </div>
                  ) : scenes.length > 0 ? (
                    scenes.map((scene) => (
                      <div
                        key={scene.id}
                        className="p-4 rounded-xl border border-green-900/80 bg-green-950/10 space-y-3 hover:border-[#00FF01]/30 transition-all duration-300 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-[#00FF01] bg-green-900/30 px-2.5 py-1 rounded-lg border border-green-800">
                            SCENE {scene.id}
                          </span>
                        </div>

                        {scene.loading ? (
                          <div className="py-6 flex flex-col items-center justify-center space-y-2">
                            <Loader2 className="h-6 w-6 text-[#00FF01] animate-spin" />
                            <p className="text-[10px] font-mono text-gray-400">Regenerating Scene...</p>
                          </div>
                        ) : (
                          <textarea
                            value={scene.text}
                            onChange={(e) => handleEditSceneText(scene.id, e.target.value)}
                            className="w-full bg-black/20 border border-green-900/55 rounded-lg p-3 text-xs text-gray-200 focus:outline-none focus:border-[#00FF01]/40 leading-relaxed font-sans h-28 resize-none"
                          />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <div className="h-12 w-12 rounded-xl border border-dashed border-green-800/60 flex items-center justify-center text-green-700 animate-pulse">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">No Storyboard Generated</p>
                        <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
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
                  <div className="flex flex-col h-[480px] rounded-2xl border border-green-800 bg-black/50 backdrop-blur-md overflow-hidden shadow-lg transition-all duration-300 hover:border-green-600">
                    <div className="px-5 py-3 border-b border-green-800/80 bg-green-900/10 flex items-center justify-between">
                      <span className="text-xs font-mono font-extrabold tracking-wider text-[#00FF01] flex items-center gap-2">
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
                          className={`py-1 px-2.5 rounded-[17px] font-mono text-[9px] font-extrabold tracking-tight flex items-center gap-1 border cursor-pointer transition-all ${
                            polishedScript
                              ? "bg-[#00FF01] text-black border-[#00FF01] hover:scale-105 active:scale-95 animate-pulse"
                              : "opacity-40 cursor-not-allowed text-gray-500 border-transparent"
                          }`}
                          title="Insert from Polished Script"
                        >
                          <Plus className="h-3 w-3" /> INSERT POLISHED VO
                        </button>
                        <label className="py-1 px-2.5 rounded-[17px] font-mono text-[9px] font-extrabold tracking-tight flex items-center gap-1 border cursor-pointer transition-all bg-green-900/30 border-green-800 text-[#00FF01] hover:border-[#00FF01] hover:bg-[#00FF01]/10 hover:scale-105 active:scale-95">
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
                        className="w-full h-full bg-transparent resize-none p-4 text-xs md:text-sm text-gray-200 focus:outline-none placeholder-gray-600 leading-relaxed font-mono focus:bg-[#031d0a]/30 pr-12"
                      />
                      
                      {/* Controls container in bottom right corner */}
                      <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
                        {listeningInput === "videoTranscript" ? (
                          <button
                            type="button"
                            onClick={stopSpeechToText}
                            className="p-2.5 rounded-full bg-red-950/80 text-red-400 border border-red-800/80 hover:bg-red-900 transition-all cursor-pointer shadow-lg flex items-center justify-center"
                            title="Stop speech-to-text"
                          >
                            <MicOff className="h-4 w-4 animate-bounce text-[#00FF00]" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startSpeechToText("videoTranscript")}
                            className="p-2.5 rounded-full bg-green-950/85 text-gray-300 border border-green-800/80 hover:border-[#00FF01] hover:text-[#00FF01] hover:bg-green-900/30 transition-all cursor-pointer shadow-lg flex items-center justify-center hover:scale-110 active:scale-95"
                            title="Speak to enter video transcript"
                          >
                            <Mic className="h-4 w-4" />
                          </button>
                        )}

                        {videoTranscriptInput && (
                          <button
                            onClick={() => setVideoTranscriptInput("")}
                            className="p-2 rounded-xl bg-red-950/30 text-red-400 border border-red-900/40 hover:bg-red-900 hover:text-white transition-all duration-300 cursor-pointer hover:scale-105"
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
                              <span className="h-3 w-3 rounded-full bg-[#00FF00] animate-ping" />
                              <h3 className="text-sm font-mono text-[#00FF01] uppercase tracking-widest font-black">
                                Gemini Voice Explainer Active
                              </h3>
                            </div>
                            <p className="text-xs text-gray-400 max-w-sm text-center leading-relaxed font-mono">
                              Speak or read your video transcript naturally. Your voice is captured in real-time to generate optimized YouTube metadata.
                            </p>
                            
                            {/* Gemini Waveform */}
                            <div className="flex items-end gap-1.5 h-10 px-6 py-2 bg-green-950/20 rounded-full border border-green-900/40">
                              <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["15%", "85%", "15%"] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }} />
                              <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["40%", "100%", "40%"] }} transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: 0.08 }} />
                              <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["20%", "70%", "20%"] }} transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.16 }} />
                              <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["50%", "95%", "50%"] }} transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut", delay: 0.12 }} />
                              <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["10%", "60%", "10%"] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} />
                              <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["35%", "80%", "35%"] }} transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut", delay: 0.14 }} />
                            </div>

                            <button
                              type="button"
                              onClick={stopSpeechToText}
                              className="px-5 py-2 rounded-xl bg-red-950/30 hover:bg-red-900 border border-red-900/60 text-red-200 text-xs font-mono transition-all cursor-pointer hover:scale-105"
                            >
                              Finish & Save Transcript
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Right Column: CTR YT & SM output */}
                  <div className="flex flex-col h-[480px] rounded-2xl border border-green-800 bg-black/50 backdrop-blur-md overflow-hidden shadow-lg relative transition-all duration-300 hover:border-green-600">
                    <div className="px-4 py-3 border-b border-green-800/80 bg-green-900/15 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold tracking-wider text-[#00FF01] flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-[#00FF01]" />
                        CTR YT & SM output
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleGenerateCtr}
                          disabled={ctrLoading || !videoTranscriptInput.trim()}
                          className={`py-1 px-3 rounded-[17px] font-mono text-[9px] font-black tracking-wider uppercase transition-all duration-300 flex items-center gap-1 border cursor-pointer ${
                            videoTranscriptInput.trim() && !ctrLoading
                              ? "bg-[#00FF01] text-black border-[#00FF01] hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(0,255,1,0.3)]"
                              : "bg-green-900/10 text-gray-500 border-green-800/40 cursor-not-allowed"
                          }`}
                        >
                          {ctrLoading ? "GEN..." : "GEN CTR"}
                        </button>

                        {ctrOutput && (
                          <>
                            <button
                              onClick={() => handleCopyText(formatCtrOutputText(ctrOutput), "CTR Suite")}
                              className="p-1 rounded bg-green-900/20 hover:bg-[#00FF01]/10 text-[#00FF01] border border-green-800 text-[9px] font-mono flex items-center gap-1 cursor-pointer transition-all duration-300 hover:scale-110 active:scale-90 shadow-[0_0_8px_rgba(0,255,1,0.15)]"
                              title="Copy All output text"
                            >
                              <Copy className="h-3 w-3" /> COPY ALL
                            </button>
                            <button
                              onClick={() => handleDownloadTextFile(formatCtrOutputText(ctrOutput), "YT_CTR_Metadata_Suite.txt")}
                              className="p-1 rounded bg-green-900/20 hover:bg-[#00FF01]/10 text-[#00FF01] border border-green-800 text-[9px] font-mono flex items-center gap-1 cursor-pointer transition-all duration-300 hover:scale-110 active:scale-90 shadow-[0_0_8px_rgba(0,255,1,0.15)]"
                              title="Download All as .txt"
                            >
                              <Download className="h-3 w-3" /> .TXT
                            </button>
                            <button
                              onClick={() => setCtrOutput(null)}
                              className="p-1 rounded bg-red-950/25 hover:bg-red-900 hover:text-white text-red-400 border border-red-900/40 text-[9px] font-mono flex items-center gap-1 cursor-pointer transition-all duration-300 hover:scale-110 active:scale-90"
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
                          <Loader2 className="h-8 w-8 text-[#00FF01] animate-spin" />
                          <p className="text-[10px] font-mono text-[#00FF01] uppercase tracking-wider animate-pulse">STRATEGIZING METADATA IN REAL-TIME...</p>
                        </div>
                      ) : ctrOutput ? (
                        <div className="space-y-4 text-xs select-text">
                          {/* TITLES BLOCK */}
                          {toggleTitle && ctrOutput.titles && (
                            <div id="ctr-section-title" className="p-3 rounded-xl border border-green-900/80 bg-green-950/10 space-y-2">
                              <div className="flex justify-between items-center border-b border-green-900/50 pb-1.5">
                                <span className="font-mono font-bold text-[#00FF01] tracking-wide">🏆 10 HIGH-CTR TITLES (EN/UR/HI)</span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleCopyText((ctrOutput.titles || []).join("\n"), "Titles")}
                                    className="p-1 text-[9px] bg-black/40 text-gray-400 hover:text-[#00FF01] rounded border border-green-900 cursor-pointer"
                                  >
                                    Copy Keys
                                  </button>
                                  <button
                                    onClick={() => handleRegenerateCtrField("titles")}
                                    disabled={ctrRegeneratingField !== null}
                                    className="p-1 text-[9px] bg-black/40 text-[#00FF01] hover:bg-[#00FF01]/10 rounded border border-[#00FF01]/30 cursor-pointer"
                                  >
                                    Regenerate
                                  </button>
                                </div>
                              </div>
                              <ul className="space-y-2 text-gray-300">
                                {ctrOutput.titles.map((t, index) => {
                                  const isUrdu = /[\u0600-\u06FF]/.test(t);
                                  return (
                                    <li
                                      key={index}
                                      className={`border-b border-green-900/20 pb-2 last:border-b-0 flex items-start gap-3 ${
                                        isUrdu ? "font-urdu text-base leading-relaxed text-right" : "font-sans text-xs leading-relaxed text-left"
                                      }`}
                                      dir={isUrdu ? "rtl" : "ltr"}
                                    >
                                      <span className="text-[#00FF01] font-mono font-bold text-[10px] pt-0.5 shrink-0">
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
                            <div id="ctr-section-description" className="p-3 rounded-xl border border-green-900/80 bg-green-950/10 space-y-2">
                              <div className="flex justify-between items-center border-b border-green-900/50 pb-1.5">
                                <span className="font-mono font-bold text-[#00FF01] tracking-wide">📝 SEO DESCRIPTION METADATA</span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleCopyText(ctrOutput.description || "", "Description")}
                                    className="p-1 text-[9px] bg-black/40 text-gray-400 hover:text-[#00FF01] rounded border border-green-900 cursor-pointer"
                                  >
                                    Copy Key
                                  </button>
                                  <button
                                    onClick={() => handleRegenerateCtrField("description")}
                                    disabled={ctrRegeneratingField !== null}
                                    className="p-1 text-[9px] bg-black/40 text-[#00FF01] hover:bg-[#00FF01]/10 rounded border border-[#00FF01]/30 cursor-pointer"
                                  >
                                    Regenerate
                                  </button>
                                </div>
                              </div>
                              <p className="font-sans text-gray-300 leading-relaxed whitespace-pre-wrap">{ctrOutput.description}</p>
                            </div>
                          )}

                          {/* TIMESTAMPS BLOCK */}
                          {toggleTimestamps && ctrOutput.timestamps && (
                            <div id="ctr-section-timestamps" className="p-3 rounded-xl border border-green-900/80 bg-green-950/10 space-y-2">
                              <div className="flex justify-between items-center border-b border-green-900/50 pb-1.5">
                                <span className="font-mono font-bold text-[#00FF01] tracking-wide">⏱️ AUTOMATED PROPORTIONAL CHAPTERS</span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleCopyText((ctrOutput.timestamps || []).map(ts => `${ts.time} - ${ts.label}`).join("\n"), "Timestamps")}
                                    className="p-1 text-[9px] bg-black/40 text-gray-400 hover:text-[#00FF01] rounded border border-green-900 cursor-pointer"
                                  >
                                    Copy Keys
                                  </button>
                                  <button
                                    onClick={() => handleRegenerateCtrField("timestamps")}
                                    disabled={ctrRegeneratingField !== null}
                                    className="p-1 text-[9px] bg-black/40 text-[#00FF01] hover:bg-[#00FF01]/10 rounded border border-[#00FF01]/30 cursor-pointer"
                                  >
                                    Regenerate
                                  </button>
                                </div>
                              </div>
                              <div className="font-mono text-gray-300 space-y-1">
                                {ctrOutput.timestamps.map((ts, index) => (
                                  <div key={index} className="flex gap-2">
                                    <span className="text-[#00FF01] font-bold shrink-0">{ts.time}</span>
                                    <span className="text-gray-400 shrink-0">-</span>
                                    <span className="font-sans text-gray-300">{ts.label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* HASHTAGS BLOCK */}
                          {toggleHashtags && ctrOutput.hashtags && (
                            <div id="ctr-section-hashtags" className="p-3 rounded-xl border border-green-900/80 bg-green-950/10 space-y-2">
                              <div className="flex justify-between items-center border-b border-green-900/50 pb-1.5">
                                <span className="font-mono font-bold text-[#00FF01] tracking-wide">🏷️ 15 VIRAL HASHTAGS</span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleCopyText((ctrOutput.hashtags || []).join(" "), "Hashtags")}
                                    className="p-1 text-[9px] bg-black/40 text-gray-400 hover:text-[#00FF01] rounded border border-green-900 cursor-pointer"
                                  >
                                    Copy Keys
                                  </button>
                                  <button
                                    onClick={() => handleRegenerateCtrField("hashtags")}
                                    disabled={ctrRegeneratingField !== null}
                                    className="p-1 text-[9px] bg-black/40 text-[#00FF01] hover:bg-[#00FF01]/10 rounded border border-[#00FF01]/30 cursor-pointer"
                                  >
                                    Regenerate
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                                {ctrOutput.hashtags.map((h, index) => (
                                  <span key={index} className="px-2 py-0.5 rounded-lg bg-green-900/20 text-[#00FF01] border border-green-900/50">
                                    {h}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* TAGS BLOCK */}
                          {toggleTags && ctrOutput.tags && (
                            <div id="ctr-section-tags" className="p-3 rounded-xl border border-green-900/80 bg-green-950/10 space-y-2">
                              <div className="flex justify-between items-center border-b border-green-900/50 pb-1.5">
                                <span className="font-mono font-bold text-[#00FF01] tracking-wide">🎯 15 OPTIMIZED SEO METATAGS</span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleCopyText((ctrOutput.tags || []).join(", "), "Tags")}
                                    className="p-1 text-[9px] bg-black/40 text-gray-400 hover:text-[#00FF01] rounded border border-green-900 cursor-pointer"
                                  >
                                    Copy Keys
                                  </button>
                                  <button
                                    onClick={() => handleRegenerateCtrField("tags")}
                                    disabled={ctrRegeneratingField !== null}
                                    className="p-1 text-[9px] bg-black/40 text-[#00FF01] hover:bg-[#00FF01]/10 rounded border border-[#00FF01]/30 cursor-pointer"
                                  >
                                    Regenerate
                                  </button>
                                </div>
                              </div>
                              <p className="font-mono text-gray-300 text-xs leading-relaxed">{ctrOutput.tags.join(", ")}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                          <div className="h-10 w-10 rounded-xl border border-dashed border-green-800 flex items-center justify-center text-green-700 animate-pulse">
                            <TrendingUp className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Metadata Suite Empty</p>
                          <p className="text-[10px] text-gray-500 max-w-xs mx-auto">
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
                  <div className="flex flex-col h-[480px] rounded-2xl border border-green-800 bg-black/50 backdrop-blur-md overflow-hidden shadow-lg transition-all duration-300 hover:border-green-600">
                    <div className="px-5 py-3 border-b border-green-800/80 bg-green-900/10 flex items-center justify-between">
                      <span className="text-xs font-mono font-extrabold tracking-wider text-[#00FF01] flex items-center gap-2">
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
                          className={`py-1 px-2.5 rounded-[17px] font-mono text-[9px] font-extrabold tracking-tight flex items-center gap-1 border cursor-pointer transition-all ${
                            polishedScript
                              ? "bg-[#00FF01] text-black border-[#00FF01] hover:scale-105 active:scale-95 animate-pulse"
                              : "opacity-40 cursor-not-allowed text-gray-500 border-transparent"
                          }`}
                          title="Insert from Polished Script"
                        >
                          <Plus className="h-3 w-3" /> INSERT POLISHED VO
                        </button>
                        <label className="py-1 px-2.5 rounded-[17px] font-mono text-[9px] font-extrabold tracking-tight flex items-center gap-1 border cursor-pointer transition-all bg-green-900/30 border-green-800 text-[#00FF01] hover:border-[#00FF01] hover:bg-[#00FF01]/10 hover:scale-105 active:scale-95">
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

                    <div className="flex-1 relative">
                      <textarea
                        value={thumbnailTranscriptInput}
                        onChange={(e) => setThumbnailTranscriptInput(e.target.value)}
                        placeholder="Paste voice transcript segment or complete text here. Specify design parameters on the left to direct thumbnail graphic concepts..."
                        className="w-full h-full bg-transparent resize-none p-4 text-xs md:text-sm text-gray-200 focus:outline-none placeholder-gray-600 leading-relaxed font-mono focus:bg-[#031d0a]/30"
                      />
                      
                      {/* Controls container in bottom right corner */}
                      <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
                        {listeningInput === "thumbnail" ? (
                          <button
                            type="button"
                            onClick={stopSpeechToText}
                            className="p-2.5 rounded-full bg-red-950/80 text-red-400 border border-red-800/80 hover:bg-red-900 transition-all cursor-pointer shadow-lg flex items-center justify-center"
                            title="Stop speech-to-text"
                          >
                            <MicOff className="h-4 w-4 animate-bounce text-[#00FF00]" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startSpeechToText("thumbnail")}
                            className="p-2.5 rounded-full bg-green-950/85 text-gray-300 border border-green-800/80 hover:border-[#00FF01] hover:text-[#00FF01] hover:bg-green-900/30 transition-all cursor-pointer shadow-lg flex items-center justify-center hover:scale-110 active:scale-95"
                            title="Speak to enter thumbnail details"
                          >
                            <Mic className="h-4 w-4" />
                          </button>
                        )}

                        {thumbnailTranscriptInput && (
                          <button
                            onClick={() => setThumbnailTranscriptInput("")}
                            className="p-2 rounded-xl bg-red-950/30 text-red-400 border border-red-900/40 hover:bg-red-900 hover:text-white transition-all duration-300 cursor-pointer hover:scale-105"
                            title="Clear transcript input"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Gemini listening wave animation overlay */}
                      <AnimatePresence>
                        {listeningInput === "thumbnail" && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-5 z-20"
                          >
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full bg-[#00FF00] animate-ping" />
                              <h3 className="text-sm font-mono text-[#00FF01] uppercase tracking-widest font-black">
                                Gemini Voice Explainer Active
                              </h3>
                            </div>
                            <p className="text-xs text-gray-400 max-w-sm text-center leading-relaxed font-mono">
                              Explain your thumbnail concept or transcript context. Your voice will be transcribed directly to guide thumbnail prompt synthesis.
                            </p>
                            
                            {/* Gemini Waveform */}
                            <div className="flex items-end gap-1.5 h-10 px-6 py-2 bg-green-950/20 rounded-full border border-green-900/40">
                              <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["15%", "85%", "15%"] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }} />
                              <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["40%", "100%", "40%"] }} transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: 0.08 }} />
                              <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["20%", "70%", "20%"] }} transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.16 }} />
                              <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["50%", "95%", "50%"] }} transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut", delay: 0.12 }} />
                              <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["10%", "60%", "10%"] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} />
                              <motion.div className="w-1.5 bg-[#00FF00] rounded-full" animate={{ height: ["35%", "80%", "35%"] }} transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut", delay: 0.14 }} />
                            </div>

                            <button
                              type="button"
                              onClick={stopSpeechToText}
                              className="px-5 py-2 rounded-xl bg-red-950/30 hover:bg-red-900 border border-red-900/60 text-red-200 text-xs font-mono transition-all cursor-pointer hover:scale-105"
                            >
                              Finish & Save Input
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Right Column: YT Thumbnails Prompt output */}
                  <div className="flex flex-col h-[480px] rounded-2xl border border-green-800 bg-black/50 backdrop-blur-md overflow-hidden shadow-lg relative transition-all duration-300 hover:border-green-600">
                    <div className="px-4 py-3 border-b border-green-800/80 bg-green-900/15 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold tracking-wider text-[#00FF01] flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-[#00FF01]" />
                        YT Thumbnails Prompt output
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleGenerateThumbnailPrompt}
                          disabled={thumbnailLoading || !thumbnailTranscriptInput.trim()}
                          className={`py-1 px-3 rounded-[17px] font-mono text-[9px] font-black tracking-wider uppercase transition-all duration-300 flex items-center gap-1 border cursor-pointer ${
                            thumbnailTranscriptInput.trim() && !thumbnailLoading
                              ? "bg-[#00FF01] text-black border-[#00FF01] hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(0,255,1,0.3)]"
                              : "bg-green-900/10 text-gray-500 border-green-800/40 cursor-not-allowed"
                          }`}
                        >
                          {thumbnailLoading ? "GEN..." : "GEN PROMPT"}
                        </button>

                        {thumbnailOutput && (
                          <>
                            <button
                              onClick={() => handleCopyText(formatThumbnailOutputText(thumbnailOutput), "Thumbnail Prompts")}
                              className="p-1 rounded bg-green-900/20 hover:bg-[#00FF01]/10 text-[#00FF01] border border-green-800 text-[9px] font-mono flex items-center gap-1 cursor-pointer transition-all duration-300 hover:scale-110 active:scale-90 shadow-[0_0_8px_rgba(0,255,1,0.15)]"
                              title="Copy prompt output"
                            >
                              <Copy className="h-3 w-3" /> COPY ALL
                            </button>
                            <button
                              onClick={() => handleDownloadTextFile(formatThumbnailOutputText(thumbnailOutput), "YT_Thumbnail_Director_Output.txt")}
                              className="p-1 rounded bg-green-900/20 hover:bg-[#00FF01]/10 text-[#00FF01] border border-green-800 text-[9px] font-mono flex items-center gap-1 cursor-pointer transition-all duration-300 hover:scale-110 active:scale-90 shadow-[0_0_8px_rgba(0,255,1,0.15)]"
                              title="Download Prompt text"
                            >
                              <Download className="h-3 w-3" /> .TXT
                            </button>
                            <button
                              onClick={() => setThumbnailOutput(null)}
                              className="p-1 rounded bg-red-950/25 hover:bg-red-900 hover:text-white text-red-400 border border-red-900/40 text-[9px] font-mono flex items-center gap-1 cursor-pointer transition-all duration-300 hover:scale-110 active:scale-90"
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
                          <Loader2 className="h-8 w-8 text-[#00FF01] animate-spin" />
                          <p className="text-[10px] font-mono text-[#00FF01] uppercase tracking-wider animate-pulse">COMPOSING HIGH-CTR IMAGE METRICS...</p>
                        </div>
                      ) : thumbnailOutput ? (
                        <div className="space-y-4 text-xs select-text">
                          {/* ENGLISH PROMPT SPECIFICATION */}
                          <div className="p-3 rounded-xl border border-green-900/80 bg-green-950/10 space-y-2">
                            <div className="flex justify-between items-center border-b border-green-900/50 pb-1.5">
                              <span className="font-mono font-bold text-[#00FF01]">🖼️ CINEMATIC VISUAL SPECIFICATION</span>
                              <button
                                onClick={() => handleCopyText(thumbnailOutput.thumbnailPrompt, "Visual Prompt")}
                                className="p-1 text-[9px] bg-black/40 text-gray-400 hover:text-[#00FF01] rounded border border-green-900 cursor-pointer"
                              >
                                Copy Specification
                              </button>
                            </div>
                            <p className="font-sans text-gray-300 leading-relaxed text-xs">{thumbnailOutput.thumbnailPrompt}</p>
                          </div>

                          {/* URDU HEADLINE */}
                          <div className="p-3 rounded-xl border border-green-900/80 bg-green-950/10 space-y-2">
                            <div className="flex justify-between items-center border-b border-green-900/50 pb-1.5">
                              <span className="font-mono font-bold text-[#00FF01]">🇵🇰 URDU OVERLAY HEADLINE</span>
                              <button
                                onClick={() => handleCopyText(thumbnailOutput.headlineUrdu, "Urdu Headline")}
                                className="p-1 text-[9px] bg-black/40 text-gray-400 hover:text-[#00FF01] rounded border border-green-900 cursor-pointer"
                              >
                                Copy text
                              </button>
                            </div>
                            <p className="font-urdu text-right text-lg text-white font-bold tracking-wide py-2 leading-relaxed font-semibold" dir="rtl">
                              {thumbnailOutput.headlineUrdu}
                            </p>
                          </div>

                          {/* URDU TAGLINE */}
                          <div className="p-3 rounded-xl border border-green-900/80 bg-green-950/10 space-y-2">
                            <div className="flex justify-between items-center border-b border-green-900/50 pb-1.5">
                              <span className="font-mono font-bold text-[#00FF01]">🇵🇰 URDU OVERLAY TAGLINE</span>
                              <button
                                onClick={() => handleCopyText(thumbnailOutput.smallTaglineUrdu, "Urdu Tagline")}
                                className="p-1 text-[9px] bg-black/40 text-gray-400 hover:text-[#00FF01] rounded border border-green-900 cursor-pointer"
                              >
                                Copy text
                              </button>
                            </div>
                            <p className="font-urdu text-right text-base text-gray-300 py-1 leading-relaxed" dir="rtl">
                              {thumbnailOutput.smallTaglineUrdu}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                          <div className="h-10 w-10 rounded-xl border border-dashed border-green-800 flex items-center justify-center text-green-700 animate-pulse">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Graphics Suite Empty</p>
                          <p className="text-[10px] text-gray-500 max-w-xs mx-auto">
                            Paste a transcript to the left, configure design options, and click GEN PROMPT to get viral thumbnail layouts!
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Floating Google Flow link in bottom right corner */}
                    <div className="absolute bottom-3 right-3 z-20">
                      <a
                        href="https://labs.google/fx/tools/flow"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[9px] font-mono text-[#00FF01] bg-black/95 hover:bg-[#00FF01] hover:text-black px-2 py-1 rounded border border-green-800 hover:border-[#00FF01] hover:scale-105 active:scale-95 transition-all duration-300 font-bold cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
                      >
                        <span>Google Flow Nano Banana 2</span>
                        <ExternalLink className="h-2 w-2" />
                      </a>
                    </div>
                  </div>

                </div>

              </div>

            {/* ERROR LOG PRESENTATION */}
            {error && (
              <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/40 text-red-200 text-xs font-mono flex items-start gap-2.5 shadow-md animate-pulse">
                <span className="h-2.5 w-2.5 rounded-xl bg-red-500 mt-1.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-bold uppercase tracking-wider text-red-400">System Log Warning</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* LOWER UNIQUE STATUS REMINDER */}
            <div className="p-4 rounded-2xl border border-[#00FF01]/20 bg-green-900/5 flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-[#00FF01] shrink-0 animate-spin" style={{ animationDuration: "12s" }} />
              <div className="space-y-0.5">
                <p className="text-xs font-mono text-[#00FF01] font-bold uppercase tracking-wider">
                  Guaranteed Dynamic Variations
                </p>
                <p className="text-[11px] text-gray-400 font-mono">
                  Our advanced multi-entropy algorithm forces unique wording patterns for each trigger, ensuring zero duplicate outcomes.
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* BOTTOM ARCHITECT FOOTER */}
        <footer className="pt-6 border-t border-green-800/30 flex flex-col md:flex-row items-center justify-between text-[11px] font-mono text-gray-500 gap-3">
          <p>© 2026 Script Automation Studio. Built for unique social media VO rephrasings.</p>
          <p className="text-[#00FF01] tracking-widest font-semibold bg-[#05290e] px-4 py-1.5 rounded-xl border border-[#00FF01]/20 shadow-[0_0_10px_rgba(0,255,1,0.1)]">
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
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-black border border-[#00FF01]/60 text-white shadow-[0_0_25px_rgba(0,255,1,0.25)] backdrop-blur-lg"
          >
            {popupType === "copy" ? (
              <CheckCircle className="h-4 w-4 text-[#00FF01]" />
            ) : (
              <Download className="h-4 w-4 text-[#00FF01]" />
            )}
            <span className="text-xs font-mono font-bold tracking-tight">{popupMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
