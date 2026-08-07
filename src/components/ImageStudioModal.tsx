import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getThemeConfig } from "../lib/themeConfig";
import {
  Sparkles,
  Wand2,
  Download,
  Trash2,
  Copy,
  Maximize2,
  X,
  Layers,
  Sliders,
  Check,
  RefreshCw,
  Image as ImageIcon,
  History,
  Info,
  ShieldCheck,
  Zap,
  Globe,
  SlidersHorizontal,
  Upload,
  ImagePlus,
  FileText,
} from "lucide-react";

interface GeneratedImageItem {
  id: string;
  url: string;
  mimeType: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  model: string;
  createdAt: string;
}

interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

const STYLE_PRESETS = [
  { id: "None", name: "Natural / Default" },
  { id: "Photorealistic", name: "📸 Photorealistic" },
  { id: "Cinematic", name: "🎬 Cinematic Lighting" },
  { id: "Anime", name: "🎌 Anime / Manga" },
  { id: "3D Render", name: "🧊 3D Render" },
  { id: "Cyberpunk", name: "🌆 Cyberpunk / Neon" },
  { id: "Concept Art", name: "🎨 Concept Art" },
  { id: "Minimalist", name: "✨ Minimalist" },
  { id: "Vector Art", name: "✏️ 2D Vector" },
  { id: "Macro Photography", name: "🔍 Macro Photo" },
];

const STUDIO_CATEGORIES = [
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

const ASPECT_RATIOS = [
  { id: "1:1", label: "1:1 Square", desc: "Instagram / Profile", icon: "⬛" },
  { id: "16:9", label: "16:9 Landscape", desc: "YouTube / Banner", icon: "🖼️" },
  { id: "9:16", label: "9:16 Vertical", desc: "Shorts / TikTok", icon: "📱" },
  { id: "4:3", label: "4:3 Classic", desc: "Standard Display", icon: "🖥️" },
  { id: "3:4", label: "3:4 Portrait", desc: "Poster / Mobile", icon: "📄" },
];

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({
  isOpen,
  onClose,
  initialPrompt = "",
}) => {
  const { idToken, profile, setIsApiKeyModalOpen, modelSettings, currentTheme, currentBrand } = useAuth();
  const theme = getThemeConfig(currentTheme, currentBrand);

  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate");
  const [prompt, setPrompt] = useState<string>(initialPrompt);
  const [negativePrompt, setNegativePrompt] = useState<string>("");
  const [selectedStyle, setSelectedStyle] = useState<string>("Photorealistic");
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [model, setModel] = useState<string>(modelSettings?.imageGeneration || "gemini-3.1-flash-image");
  const [numberOfImages, setNumberOfImages] = useState<number>(1);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const [domain, setDomain] = useState<string>(() => {
    try {
      return localStorage.getItem("script_automation_topic_niche") || "Medical & Health";
    } catch {
      return "Medical & Health";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("script_automation_topic_niche", domain);
    } catch {}
  }, [domain]);

  const handleImportPromptFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) setPrompt(text);
    };
    reader.readAsText(file);
  };

  const handleInsertPrompt = () => {
    try {
      const saved = localStorage.getItem("script_automation_last_thumbnail_prompt");
      if (saved) {
        setPrompt(saved);
      } else {
        alert("No generated YouTube thumbnail prompt found in memory. Generate one in Graphics Suite first.");
      }
    } catch {
      alert("Unable to insert prompt.");
    }
  };

  // Reference / Sample Image State
  const [referenceImage, setReferenceImage] = useState<{
    data: string;
    mimeType: string;
    name: string;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [enhancing, setEnhancing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [generatedImages, setGeneratedImages] = useState<GeneratedImageItem[]>([]);
  const [history, setHistory] = useState<GeneratedImageItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const [lightboxImage, setLightboxImage] = useState<GeneratedImageItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (modelSettings?.imageGeneration) {
      setModel(modelSettings.imageGeneration);
    }
  }, [modelSettings?.imageGeneration]);

  useEffect(() => {
    if (isOpen && idToken) {
      fetchHistory();
    }
  }, [isOpen, idToken]);

  const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError("Reference image size should be less than 8MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setReferenceImage({
        data: result,
        mimeType: file.type || "image/png",
        name: file.name,
      });
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const fetchHistory = async () => {
    if (!idToken) return;
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/image-studio/history", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (res.ok && data.history) {
        setHistory(data.history);
      }
    } catch (err) {
      console.warn("Failed to load history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim() || !idToken) return;
    setEnhancing(true);
    setError(null);
    try {
      const res = await fetch("/api/image-studio/enhance-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ prompt, stylePreset: selectedStyle }),
      });
      const data = await res.json();
      if (res.ok && data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
      } else {
        setError(data.error || "Failed to enhance prompt.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to contact prompt enhancement service.");
    } finally {
      setEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter an image prompt.");
      return;
    }
    if (!profile?.hasApiKey) {
      setError("Google AI API Key required. Please configure your API key.");
      setIsApiKeyModalOpen(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/image-studio/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          prompt,
          negativePrompt,
          model,
          aspectRatio,
          numberOfImages,
          stylePreset: selectedStyle,
          referenceImage: referenceImage
            ? {
                data: referenceImage.data,
                mimeType: referenceImage.mimeType,
              }
            : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "NO_API_KEY") {
          setIsApiKeyModalOpen(true);
        }
        throw new Error(data.error || "Failed to generate images.");
      }

      if (data.images && data.images.length > 0) {
        setGeneratedImages(data.images);
        fetchHistory(); // Refresh history
      } else {
        throw new Error("No image was returned from the generator.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during generation.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistoryItem = async (imageId: string) => {
    if (!idToken) return;
    try {
      const res = await fetch(`/api/image-studio/history/${imageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        setHistory((prev) => prev.filter((item) => item.id !== imageId));
        if (lightboxImage?.id === imageId) {
          setLightboxImage(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  };

  const handleDownload = (img: GeneratedImageItem) => {
    const link = document.createElement("a");
    link.href = img.url;
    const cleanPrompt = img.prompt.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "_");
    link.download = `flow_image_${cleanPrompt}_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyPrompt = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isLight = theme.isLight;
  const modalBg = isLight ? "#FFFFFF" : "#1A1A1A";
  const modalTextColor = isLight ? "#000000" : "#FFFFFF";

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto backdrop-blur-md ${isLight ? "bg-black/30" : "bg-black/85"}`}>
      <div 
        className={`w-full max-w-5xl rounded-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden relative my-auto border shadow-2xl transition-all duration-300 ${
          isLight ? "border-[#E5E5E5] bg-[#FFFFFF] text-[#000000]" : "border-[#2A2A2A] bg-[#1A1A1A] text-white"
        }`}
      >
        {/* Header */}
        <div className={`px-4 py-3 sm:px-6 sm:py-4 border-b flex flex-wrap items-center justify-between gap-3 select-none relative z-10 ${
          isLight ? "border-[#E5E5E5] bg-[#F7F7F7]" : "border-[#2A2A2A] bg-[#111111]"
        }`}>
          <div className="flex items-center gap-3">
            <div 
              className={`p-2.5 rounded-2xl border shadow-lg flex items-center justify-center shrink-0 ${
                isLight ? "border-[#E5E5E5] bg-[#FFFFFF]" : "border-[#2A2A2A] bg-[#111111]"
              }`}
              style={{ color: theme.accentColor }}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-2 ${isLight ? "text-[#000000]" : "text-white"}`}>
                  <span>Google Flow Image Studio</span>
                  <span 
                    className="text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-bold shadow-sm"
                    style={{ borderColor: `${theme.secondaryAccentColor}66`, backgroundColor: `${theme.secondaryAccentColor}1A`, color: theme.secondaryAccentColor }}
                  >
                    Imagen 3 Native
                  </span>
                </h2>
              </div>
              <p className={`text-xs font-mono mt-0.5 ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                Official Google AI Studio Imagen 3 Engine with AI Prompt Enhancement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Liquid Tab Switcher */}
            <div className={`flex p-1.5 rounded-full border ${isLight ? "border-[#E5E5E5] bg-[#FFFFFF]" : "border-[#2A2A2A] bg-[#111111]"}`}>
              <button
                type="button"
                onClick={() => setActiveTab("generate")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all duration-300 cursor-pointer font-bold ${
                  activeTab === "generate" 
                    ? "text-white shadow-md" 
                    : (isLight ? "text-[#444444] hover:text-[#000000]" : "text-[#BDBDBD] hover:text-white")
                }`}
                style={activeTab === "generate" ? { backgroundColor: theme.accentColor } : {}}
              >
                <Wand2 className="h-3.5 w-3.5" />
                <span>Studio</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all duration-300 cursor-pointer font-bold ${
                  activeTab === "history" 
                    ? "text-white shadow-md" 
                    : (isLight ? "text-[#444444] hover:text-[#000000]" : "text-[#BDBDBD] hover:text-white")
                }`}
                style={activeTab === "history" ? { backgroundColor: theme.accentColor } : {}}
              >
                <History className="h-3.5 w-3.5" />
                <span>Gallery ({history.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isLight ? "border-[#E5E5E5] bg-[#FFFFFF] text-[#000000]" : "border-[#2A2A2A] bg-[#111111] text-white"
              }`}
              title="Close Image Studio"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Notice Banner explaining Official Integration Architecture */}
        <div className={`border-b px-4 py-2 text-[11px] font-mono flex flex-wrap items-center justify-between gap-2 relative z-10 ${
          isLight ? "border-[#E5E5E5] bg-[#F0F0F0] text-[#444444]" : "border-[#2A2A2A] bg-[#000000] text-[#BDBDBD]"
        }`}>
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 shrink-0" style={{ color: theme.secondaryAccentColor }} />
            <span>
              <strong>Google Flow Sync Architecture:</strong> Runs directly via official Google AI Studio Imagen 3 API with full theme synchronization.
            </span>
          </div>
          <a
            href="https://ai.google.dev/docs"
            target="_blank"
            rel="noreferrer"
            className="hover:underline flex items-center gap-1 shrink-0 font-bold"
            style={{ color: theme.secondaryAccentColor }}
          >
            <span>Docs</span>
          </a>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {error && (
            <div 
              className="p-4 rounded-2xl border text-xs font-mono flex items-center justify-between gap-3"
              style={{ backgroundColor: `${theme.accentColor}1A`, borderColor: theme.accentColor, color: theme.accentColor }}
            >
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0" style={{ color: theme.accentColor }} />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} style={{ color: theme.accentColor }}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {activeTab === "generate" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Controls Column */}
              <div className="lg:col-span-6 space-y-5">
                {/* Domain / Niche Field */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold font-mono flex items-center justify-between ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                    <span className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" style={{ color: theme.secondaryAccentColor }} />
                      <span>Domain / Niche</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold" style={{ color: theme.secondaryAccentColor }}>Synced with Main Suite</span>
                  </label>
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-mono focus:outline-none transition-all cursor-pointer ${isLight ? "border-[#E5E5E5] bg-[#F5F5F5] text-[#000000]" : "border-[#2A2A2A] bg-[#111111] text-white"}`}
                  >
                    {STUDIO_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className={isLight ? "bg-[#FFFFFF] text-[#000000]" : "bg-[#111111] text-white"}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Prompt Input Box with Magic Enhancer */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className={`text-xs font-bold font-mono flex items-center gap-1.5 ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                      <Wand2 className="h-3.5 w-3.5" style={{ color: theme.accentColor }} />
                      <span>Image Prompt</span>
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className={`px-2.5 py-1 rounded-xl border transition-all cursor-pointer text-[11px] font-mono flex items-center gap-1 ${isLight ? "border-[#E5E5E5] bg-[#F5F5F5] text-[#444444] hover:text-[#000000]" : "border-[#2A2A2A] bg-[#111111] text-[#BDBDBD] hover:text-white"}`}>
                        <Upload className="h-3 w-3" style={{ color: theme.secondaryAccentColor }} />
                        <span>Import (.txt/.pdf)</span>
                        <input type="file" accept=".txt,.pdf" onChange={handleImportPromptFile} className="hidden" />
                      </label>
                      <button
                        type="button"
                        onClick={handleInsertPrompt}
                        className={`px-2.5 py-1 rounded-xl border transition-all cursor-pointer text-[11px] font-mono flex items-center gap-1 ${isLight ? "border-[#E5E5E5] bg-[#F5F5F5] text-[#444444] hover:text-[#000000]" : "border-[#2A2A2A] bg-[#111111] text-[#BDBDBD] hover:text-white"}`}
                        title="Insert prompt from generated YT Thumbnail generator"
                      >
                        <FileText className="h-3 w-3" style={{ color: theme.secondaryAccentColor }} />
                        <span>Insert</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleEnhancePrompt}
                        disabled={enhancing || !prompt.trim()}
                        className="px-2.5 py-1 rounded-xl border text-white transition-all cursor-pointer text-[11px] font-mono font-bold flex items-center gap-1.5 disabled:opacity-50"
                        style={{ backgroundColor: theme.secondaryAccentColor, borderColor: theme.secondaryAccentColor }}
                        title="AI Expand raw text into a detailed Google Flow prompt"
                      >
                        {enhancing ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            <span>Enhancing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3" />
                            <span>✨ AI Enhance</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your vision (e.g. A hyper-realistic YouTube thumbnail of a creator holding a cup of tea with glowing energy, cinematic studio lighting...)"
                    className={`w-full p-3.5 rounded-2xl border text-sm focus:outline-none transition-all resize-none font-sans ${isLight ? "border-[#E5E5E5] bg-[#F5F5F5] text-[#000000] placeholder:text-[#666666]" : "border-[#2A2A2A] bg-[#111111] text-white placeholder:text-gray-500"}`}
                  />
                </div>

                {/* Import Reference / Sample Image Box */}
                <div className="space-y-2">
                  <label className={`text-xs font-bold font-mono flex items-center justify-between ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                    <span className="flex items-center gap-1.5">
                      <ImagePlus className="h-3.5 w-3.5" style={{ color: theme.secondaryAccentColor }} />
                      <span>Import Reference / Sample Image</span>
                    </span>
                    <span className="text-[10px] opacity-70 font-normal">Optional Subject / Style Guide</span>
                  </label>

                  {referenceImage ? (
                    <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${isLight ? "border-[#E5E5E5] bg-[#F5F5F5]" : "border-[#2A2A2A] bg-[#111111]"}`}>
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img
                          src={referenceImage.data}
                          alt="Reference Sample"
                          className="w-12 h-12 object-cover rounded-xl border shrink-0"
                          style={{ borderColor: theme.secondaryAccentColor }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-bold truncate text-white">{referenceImage.name}</p>
                          <p className="text-[10px] font-mono font-bold" style={{ color: theme.secondaryAccentColor }}>
                            Reference Image Attached ✓
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReferenceImage(null)}
                        className="p-1.5 rounded-xl border transition-all cursor-pointer shrink-0"
                        style={{ backgroundColor: `${theme.accentColor}33`, color: theme.accentColor, borderColor: theme.accentColor }}
                        title="Remove reference image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className={`block p-3.5 rounded-2xl border border-dashed transition-all cursor-pointer text-center ${isLight ? "border-[#E5E5E5] bg-[#F5F5F5]" : "border-[#2A2A2A] bg-[#111111]"}`}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReferenceImageUpload}
                        className="hidden"
                      />
                      <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#BDBDBD]">
                        <Upload className="h-4 w-4" style={{ color: theme.secondaryAccentColor }} />
                        <span>Click to Upload Creator Photo, Style Sample, or Thumbnail Base</span>
                      </div>
                      <p className="text-[10px] text-[#BDBDBD] opacity-60 font-mono mt-1">
                        PNG, JPG, or WEBP up to 8MB. Gemini image models will match subject features & style.
                      </p>
                    </label>
                  )}
                </div>

                {/* Style Presets Dropdown */}
                <div className="space-y-2">
                  <label className={`text-xs font-bold font-mono flex items-center gap-1.5 ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                    <Layers className="h-3.5 w-3.5" style={{ color: theme.accentColor }} />
                    <span>Style Preset</span>
                  </label>
                  <select
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                    className={`w-full p-3 rounded-2xl border text-xs font-mono focus:outline-none transition-all cursor-pointer ${isLight ? "border-[#E5E5E5] bg-[#F5F5F5] text-[#000000]" : "border-[#2A2A2A] bg-[#111111] text-white"}`}
                  >
                    {STYLE_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id} className={isLight ? "bg-[#FFFFFF] text-[#000000]" : "bg-[#111111] text-white"}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Aspect Ratio Picker */}
                <div className="space-y-2">
                  <label className={`text-xs font-bold font-mono flex items-center gap-1.5 ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                    <Sliders className="h-3.5 w-3.5" style={{ color: theme.secondaryAccentColor }} />
                    <span>Aspect Ratio</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {ASPECT_RATIOS.map((ar) => (
                      <button
                        key={ar.id}
                        type="button"
                        onClick={() => setAspectRatio(ar.id)}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1 ${
                          aspectRatio === ar.id 
                            ? "text-white shadow-md" 
                            : (isLight ? "bg-[#F5F5F5] border-[#E5E5E5] text-[#444444]" : "bg-[#111111] border-[#2A2A2A] text-[#BDBDBD]")
                        }`}
                        style={
                          aspectRatio === ar.id
                            ? { backgroundColor: `${theme.secondaryAccentColor}33`, borderColor: theme.secondaryAccentColor }
                            : {}
                        }
                      >
                        <span className="text-base">{ar.icon}</span>
                        <span className="text-xs font-bold font-mono" style={{ color: aspectRatio === ar.id ? theme.secondaryAccentColor : "#FFFFFF" }}>{ar.id}</span>
                        <span className="text-[9px] opacity-70 truncate w-full">{ar.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model Selection */}
                <div className="space-y-2">
                  <label className={`text-xs font-bold font-mono flex items-center justify-between ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                    <span className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" style={{ color: theme.secondaryAccentColor }} />
                      <span>Google AI Image Model</span>
                    </span>
                    <span className="text-[10px] font-normal" style={{ color: theme.secondaryAccentColor }}>
                      Synced from Preferences
                    </span>
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className={`w-full p-3 rounded-2xl border text-xs font-mono focus:outline-none transition-all cursor-pointer ${isLight ? "border-[#E5E5E5] bg-[#F5F5F5] text-[#000000]" : "border-[#2A2A2A] bg-[#111111] text-white"}`}
                  >
                    <option value="gemini-3.1-flash-image" className={isLight ? "bg-[#FFFFFF] text-[#000000]" : "bg-[#111111] text-white"}>
                      Gemini 3.1 Flash Image (Balanced & High Quality)
                    </option>
                    <option value="gemini-3-pro-image" className={isLight ? "bg-[#FFFFFF] text-[#000000]" : "bg-[#111111] text-white"}>
                      Gemini 3 Pro Image (Maximum Detail & Realism)
                    </option>
                    <option value="gemini-3.1-flash-lite-image" className={isLight ? "bg-[#FFFFFF] text-[#000000]" : "bg-[#111111] text-white"}>
                      Gemini 3.1 Flash Lite Image (Ultra Speed)
                    </option>
                    <option value="imagen-3.0-generate-002" className={isLight ? "bg-[#FFFFFF] text-[#000000]" : "bg-[#111111] text-white"}>
                      Imagen 3 Studio (High-Res Photorealistic)
                    </option>
                    <option value="imagen-3.0-fast-generate-001" className={isLight ? "bg-[#FFFFFF] text-[#000000]" : "bg-[#111111] text-white"}>
                      Imagen 3 Fast (Rapid Generation)
                    </option>
                    <option value="nano-banana-2" className={isLight ? "bg-[#FFFFFF] text-[#000000]" : "bg-[#111111] text-white"}>
                      Nano banana 2 (High Fidelity & Speed)
                    </option>
                    <option value="nano-banana-pro" className={isLight ? "bg-[#FFFFFF] text-[#000000]" : "bg-[#111111] text-white"}>
                      Nano Banana Pro (Professional Creator Studio)
                    </option>
                  </select>
                </div>

                {/* Advanced Accordion Toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer hover:underline"
                    style={{ color: theme.secondaryAccentColor }}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>{showAdvanced ? "Hide Advanced Settings" : "Show Advanced Settings (Negative Prompt, Batch Size)"}</span>
                  </button>

                  {showAdvanced && (
                    <div className={`mt-3 p-4 rounded-2xl border space-y-4 ${isLight ? "border-[#E5E5E5] bg-[#F5F5F5]" : "border-[#2A2A2A] bg-[#111111]"}`}>
                      {/* Negative Prompt */}
                      <div>
                        <label className="text-[11px] font-mono block mb-1 text-[#BDBDBD]">
                          Negative Prompt (Items to exclude)
                        </label>
                        <input
                          type="text"
                          value={negativePrompt}
                          onChange={(e) => setNegativePrompt(e.target.value)}
                          placeholder="e.g. text, blur, low resolution, extra limbs, ugly"
                          className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none ${isLight ? "border-[#E5E5E5] bg-[#FFFFFF] text-[#000000]" : "border-[#2A2A2A] bg-[#000000] text-white"}`}
                        />
                      </div>

                      {/* Number of Samples */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1 text-[#BDBDBD]">
                          <span>Images to Generate:</span>
                          <span className="font-bold" style={{ color: theme.accentColor }}>{numberOfImages}</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={4}
                          value={numberOfImages}
                          onChange={(e) => setNumberOfImages(parseInt(e.target.value))}
                          className="w-full cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Generate Button */}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                  className="w-full py-3.5 px-6 rounded-2xl font-extrabold text-sm transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 border text-white disabled:opacity-50"
                  style={{ backgroundColor: theme.accentColor, borderColor: theme.accentColor }}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>Generating with Google Imagen 3...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      <span>Generate Images (Google Flow Engine)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right Output Gallery Stage Column */}
              <div className="lg:col-span-6 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={`text-xs font-bold font-mono flex items-center gap-1.5 ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                    <ImageIcon className="h-3.5 w-3.5" style={{ color: theme.accentColor }} />
                    <span>Generated Results</span>
                  </h3>
                  {generatedImages.length > 0 && (
                    <span className="text-[10px] font-mono text-[#BDBDBD]">
                      {generatedImages.length} image(s) generated
                    </span>
                  )}
                </div>

                {loading ? (
                  <div className={`flex-1 min-h-[280px] sm:min-h-[380px] rounded-2xl border flex flex-col items-center justify-center p-8 text-center space-y-4 ${isLight ? "border-[#E5E5E5] bg-[#F5F5F5]" : "border-[#2A2A2A] bg-[#111111]"}`}>
                    <div className="relative">
                      <div className="w-14 h-14 border-4 border-[#2A2A2A] rounded-full animate-spin" style={{ borderTopColor: theme.accentColor }} />
                      <Sparkles className="h-6 w-6 absolute inset-0 m-auto animate-pulse" style={{ color: theme.accentColor }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold font-mono text-white">Synthesizing Imagery</h4>
                      <p className="text-xs font-mono text-[#BDBDBD] mt-1">
                        Google Imagen 3 is rendering photorealistic details...
                      </p>
                    </div>
                  </div>
                ) : generatedImages.length === 0 ? (
                  <div className={`flex-1 min-h-[280px] sm:min-h-[380px] rounded-2xl border flex flex-col items-center justify-center p-8 text-center space-y-3 ${isLight ? "border-[#E5E5E5] bg-[#F5F5F5]" : "border-[#2A2A2A] bg-[#111111]"}`}>
                    <div className="p-4 rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A]" style={{ color: theme.accentColor }}>
                      <Wand2 className="h-8 w-8" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold font-mono text-white">No images generated yet</h4>
                      <p className="text-xs font-mono text-[#BDBDBD] mt-1 max-w-xs">
                        Enter your prompt or click "AI Enhance" to generate images using Google's Imagen 3 model.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {generatedImages.map((img) => (
                      <div
                        key={img.id}
                        className="group relative rounded-2xl border border-[#2A2A2A] bg-[#000000] overflow-hidden shadow-lg transition-all"
                      >
                        <img
                          src={img.url}
                          alt={img.prompt}
                          referrerPolicy="no-referrer"
                          className="w-full h-auto object-cover rounded-2xl cursor-pointer"
                          onClick={() => setLightboxImage(img)}
                        />

                        {/* Overlay Controls on Hover */}
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between backdrop-blur-xs">
                          <div className="flex items-center justify-between">
                            <span 
                              className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold text-white"
                              style={{ backgroundColor: theme.accentColor }}
                            >
                              {img.aspectRatio}
                            </span>
                            <button
                              type="button"
                              onClick={() => setLightboxImage(img)}
                              className="p-1.5 rounded-lg bg-black/60 text-white transition-colors cursor-pointer"
                              title="Fullscreen Preview"
                            >
                              <Maximize2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div>
                            <p className="text-[11px] text-gray-200 line-clamp-2 mb-2 font-mono">
                              "{img.prompt}"
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDownload(img)}
                                className="flex-1 py-1.5 px-2 rounded-xl font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer text-white"
                                style={{ backgroundColor: theme.accentColor }}
                              >
                                <Download className="h-3 w-3" />
                                <span>Download</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyPrompt(img.prompt, img.id)}
                                className="p-1.5 rounded-xl bg-black/60 text-gray-300 hover:text-white border border-[#2A2A2A] cursor-pointer"
                                title="Copy prompt"
                              >
                                {copiedId === img.id ? (
                                  <Check className="h-3.5 w-3.5" style={{ color: theme.secondaryAccentColor }} />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Gallery / History Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold font-mono flex items-center gap-2 text-white">
                  <History className="h-4 w-4" style={{ color: theme.accentColor }} />
                  <span>My Saved Generations ({history.length})</span>
                </h3>
                <button
                  onClick={fetchHistory}
                  disabled={loadingHistory}
                  className="text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer hover:underline"
                  style={{ color: theme.secondaryAccentColor }}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingHistory ? (
                <div className="py-12 text-center font-mono text-xs text-[#BDBDBD]">
                  Loading your cloud image history...
                </div>
              ) : history.length === 0 ? (
                <div className="py-16 text-center rounded-2xl border border-[#2A2A2A] bg-[#111111] p-8 space-y-2">
                  <p className="text-sm font-mono font-bold text-white">No saved generations found</p>
                  <p className="text-xs font-mono text-[#BDBDBD]">
                    Images you generate in the studio will automatically save here to your Google AI Studio account history.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {history.map((img) => (
                    <div
                      key={img.id}
                      className={`group relative rounded-2xl border overflow-hidden shadow-lg transition-all ${isLight ? "border-[#E5E5E5] bg-[#FFFFFF]" : "border-[#2A2A2A] bg-[#111111]"}`}
                    >
                      <img
                        src={img.url}
                        alt={img.prompt}
                        referrerPolicy="no-referrer"
                        className="w-full h-36 object-cover cursor-pointer"
                        onClick={() => setLightboxImage(img)}
                      />
                      <div className="p-2.5 bg-[#000000]">
                        <p className="text-[10px] font-mono truncate text-[#BDBDBD]" title={img.prompt}>
                          {img.prompt}
                        </p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#2A2A2A]">
                          <span className="text-[9px] font-mono text-[#BDBDBD]">{img.aspectRatio}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDownload(img)}
                              className="p-1 rounded transition-colors cursor-pointer"
                              style={{ backgroundColor: `${theme.secondaryAccentColor}33`, color: theme.secondaryAccentColor }}
                              title="Download"
                            >
                              <Download className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteHistoryItem(img.id)}
                              className="p-1 rounded transition-colors cursor-pointer"
                              style={{ backgroundColor: `${theme.accentColor}33`, color: theme.accentColor }}
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Fullscreen Viewer */}
      {lightboxImage && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className={`max-w-4xl w-full border rounded-2xl p-6 relative flex flex-col max-h-[90vh] space-y-4 shadow-2xl transition-all ${isLight ? "border-[#E5E5E5] bg-[#FFFFFF] text-[#000000]" : "border-[#2A2A2A] bg-[#1A1A1A] text-white"}`}>
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-[#BDBDBD] hover:text-white transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex-1 overflow-hidden flex items-center justify-center rounded-2xl p-2 bg-[#111111]">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.prompt}
                referrerPolicy="no-referrer"
                className="max-h-[60vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-mono p-3 rounded-xl border border-[#2A2A2A] bg-[#111111] text-[#BDBDBD]">
                "{lightboxImage.prompt}"
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-mono text-[#BDBDBD]">
                  Model: <span className="font-bold" style={{ color: theme.secondaryAccentColor }}>{lightboxImage.model}</span> | Aspect: {lightboxImage.aspectRatio}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setPrompt(lightboxImage.prompt);
                      setActiveTab("generate");
                      setLightboxImage(null);
                    }}
                    className="px-3 py-2 rounded-xl border border-[#2A2A2A] bg-[#111111] text-[#BDBDBD] hover:text-white text-xs font-mono transition-all cursor-pointer"
                  >
                    Use Prompt in Studio
                  </button>
                  <button
                    onClick={() => handleDownload(lightboxImage)}
                    className="px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer border text-white"
                    style={{ backgroundColor: theme.accentColor, borderColor: theme.accentColor }}
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Image</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
