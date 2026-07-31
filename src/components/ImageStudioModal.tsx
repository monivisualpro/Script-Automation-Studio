import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
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
  const { idToken, profile, setIsApiKeyModalOpen, modelSettings } = useAuth();

  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate");
  const [prompt, setPrompt] = useState<string>(initialPrompt);
  const [negativePrompt, setNegativePrompt] = useState<string>("");
  const [selectedStyle, setSelectedStyle] = useState<string>("Photorealistic");
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [model, setModel] = useState<string>(modelSettings?.imageGeneration || "gemini-3.1-flash-image");
  const [numberOfImages, setNumberOfImages] = useState<number>(1);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-5xl bg-[#041207] border border-green-800/80 rounded-3xl shadow-[0_0_80px_rgba(0,255,1,0.15)] flex flex-col max-h-[92vh] overflow-hidden relative">
        {/* Header */}
        <div className="px-5 py-4 bg-[#020b04] border-b border-green-900/60 flex items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-950 border border-[#00FF01]/60 text-[#00FF01] shadow-[0_0_15px_rgba(0,255,1,0.2)]">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>Google Flow Image Studio</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00FF01]/10 text-[#00FF01] border border-[#00FF01]/40 font-bold">
                    Imagen 3 Native
                  </span>
                </h2>
              </div>
              <p className="text-xs text-gray-400 font-mono">
                Official Google AI Studio Imagen 3 Engine with AI Prompt Enhancement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Tab Switcher */}
            <div className="flex bg-black/60 p-1 rounded-xl border border-green-900/60">
              <button
                onClick={() => setActiveTab("generate")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  activeTab === "generate"
                    ? "bg-[#00FF01] text-black font-bold shadow-[0_0_10px_rgba(0,255,1,0.3)]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Wand2 className="h-3.5 w-3.5" />
                <span>Studio</span>
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  activeTab === "history"
                    ? "bg-[#00FF01] text-black font-bold shadow-[0_0_10px_rgba(0,255,1,0.3)]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <History className="h-3.5 w-3.5" />
                <span>Gallery ({history.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-green-950/80 transition-all cursor-pointer"
              title="Close Image Studio"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Notice Banner explaining Official Integration Architecture */}
        <div className="bg-green-950/40 border-b border-green-900/40 px-5 py-2 text-[11px] text-gray-300 font-mono flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-[#00FF01] shrink-0" />
            <span>
              <strong>Google Flow Sync Architecture:</strong> Runs directly via official Google AI Studio Imagen 3 API. Designed with a modular provider abstraction for instant auto-switch when official Google Flow account sync SDKs are released.
            </span>
          </div>
          <a
            href="https://ai.google.dev/docs"
            target="_blank"
            rel="noreferrer"
            className="text-[#00FF01] hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Docs</span>
          </a>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-red-950/80 border border-red-800/80 text-red-200 text-xs font-mono flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {activeTab === "generate" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Controls Column */}
              <div className="lg:col-span-6 space-y-5">
                {/* Prompt Input Box with Magic Enhancer */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold font-mono text-gray-300 flex items-center gap-1.5">
                      <Wand2 className="h-3.5 w-3.5 text-[#00FF01]" />
                      <span>Image Prompt</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleEnhancePrompt}
                      disabled={enhancing || !prompt.trim()}
                      className="px-2.5 py-1 rounded-xl bg-green-950 border border-[#00FF01]/60 text-[#00FF01] hover:bg-[#00FF01] hover:text-black transition-all cursor-pointer text-[11px] font-mono font-bold flex items-center gap-1.5 disabled:opacity-50"
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
                          <span>✨ AI Enhance Prompt</span>
                        </>
                      )}
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your vision (e.g. A hyper-realistic YouTube thumbnail of a doctor holding a cup of organic herbal tea with glowing green neon energy, cinematic studio lighting...)"
                    className="w-full p-3.5 rounded-2xl bg-black/60 border border-green-900/80 text-white text-sm focus:border-[#00FF01] focus:outline-none transition-all resize-none font-sans"
                  />
                </div>

                {/* Import Reference / Sample Image Box */}
                <div className="space-y-2">
                  <label className="text-xs font-bold font-mono text-gray-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImagePlus className="h-3.5 w-3.5 text-[#00FF01]" />
                      <span>Import Reference / Sample Image</span>
                    </span>
                    <span className="text-[10px] text-gray-400 font-normal">Optional Subject / Style Guide</span>
                  </label>

                  {referenceImage ? (
                    <div className="p-3 rounded-2xl bg-green-950/60 border border-[#00FF01]/60 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img
                          src={referenceImage.data}
                          alt="Reference Sample"
                          className="w-12 h-12 object-cover rounded-xl border border-[#00FF01]/40 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-bold text-white truncate">{referenceImage.name}</p>
                          <p className="text-[10px] font-mono text-[#00FF01]">
                            Reference Image Attached ✓
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReferenceImage(null)}
                        className="p-1.5 rounded-xl bg-red-950/80 text-red-300 border border-red-800 hover:bg-red-900 hover:text-white transition-all cursor-pointer shrink-0"
                        title="Remove reference image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="block p-3.5 rounded-2xl bg-black/50 border border-dashed border-green-900/80 hover:border-[#00FF01] transition-all cursor-pointer text-center group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReferenceImageUpload}
                        className="hidden"
                      />
                      <div className="flex items-center justify-center gap-2 text-xs font-mono text-gray-300 group-hover:text-[#00FF01]">
                        <Upload className="h-4 w-4 text-[#00FF01]" />
                        <span>Click to Upload Creator Photo, Style Sample, or Thumbnail Base</span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono mt-1">
                        PNG, JPG, or WEBP up to 8MB. Gemini image models will match subject features & style.
                      </p>
                    </label>
                  )}
                </div>

                {/* Style Presets Chips */}
                <div className="space-y-2">
                  <label className="text-xs font-bold font-mono text-gray-300 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-[#00FF01]" />
                    <span>Style Preset</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {STYLE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedStyle(preset.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                          selectedStyle === preset.id
                            ? "bg-[#00FF01] text-black font-bold shadow-[0_0_10px_rgba(0,255,1,0.25)]"
                            : "bg-black/50 text-gray-300 border border-green-900/50 hover:border-green-700"
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-bold font-mono text-gray-300 flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-[#00FF01]" />
                    <span>Aspect Ratio</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {ASPECT_RATIOS.map((ar) => (
                      <button
                        key={ar.id}
                        type="button"
                        onClick={() => setAspectRatio(ar.id)}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1 ${
                          aspectRatio === ar.id
                            ? "bg-green-950 border-[#00FF01] text-white shadow-[0_0_12px_rgba(0,255,1,0.2)]"
                            : "bg-black/40 border-green-900/60 text-gray-400 hover:border-green-700 hover:text-white"
                        }`}
                      >
                        <span className="text-base">{ar.icon}</span>
                        <span className="text-xs font-bold font-mono">{ar.id}</span>
                        <span className="text-[9px] text-gray-400 truncate w-full">{ar.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold font-mono text-gray-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-[#00FF01]" />
                      <span>Google AI Image Model</span>
                    </span>
                    <span className="text-[10px] text-[#00FF01] font-normal">
                      Synced from Settings & AI Preferences
                    </span>
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-black/60 border border-green-900/80 text-white text-xs font-mono focus:border-[#00FF01] focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="gemini-3.1-flash-image">
                      Gemini 3.1 Flash Image (Balanced & High Quality)
                    </option>
                    <option value="gemini-3-pro-image">
                      Gemini 3 Pro Image (Maximum Detail & Realism)
                    </option>
                    <option value="gemini-3.1-flash-lite-image">
                      Gemini 3.1 Flash Lite Image (Ultra Speed)
                    </option>
                    <option value="imagen-3.0-generate-002">
                      Imagen 3 Studio (High-Res Photorealistic)
                    </option>
                    <option value="imagen-3.0-fast-generate-001">
                      Imagen 3 Fast (Rapid Generation)
                    </option>
                  </select>
                </div>

                {/* Advanced Accordion Toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs font-mono text-gray-400 hover:text-[#00FF01] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>{showAdvanced ? "Hide Advanced Settings" : "Show Advanced Settings (Negative Prompt, Batch Size)"}</span>
                  </button>

                  {showAdvanced && (
                    <div className="mt-3 p-4 rounded-2xl bg-black/40 border border-green-900/60 space-y-4">
                      {/* Negative Prompt */}
                      <div>
                        <label className="text-[11px] font-mono text-gray-300 block mb-1">
                          Negative Prompt (Items to exclude)
                        </label>
                        <input
                          type="text"
                          value={negativePrompt}
                          onChange={(e) => setNegativePrompt(e.target.value)}
                          placeholder="e.g. text, blur, low resolution, extra limbs, ugly"
                          className="w-full p-2.5 rounded-xl bg-black/60 border border-green-900/80 text-xs text-white focus:border-[#00FF01] focus:outline-none"
                        />
                      </div>

                      {/* Number of Samples */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-gray-300 mb-1">
                          <span>Images to Generate:</span>
                          <span className="text-[#00FF01] font-bold">{numberOfImages}</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={4}
                          value={numberOfImages}
                          onChange={(e) => setNumberOfImages(parseInt(e.target.value))}
                          className="w-full accent-[#00FF01] cursor-pointer"
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
                  className="w-full py-4 px-6 rounded-2xl bg-[#00FF01] text-black font-extrabold text-sm hover:bg-white transition-all cursor-pointer shadow-[0_0_25px_rgba(0,255,1,0.35)] flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
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
                  <h3 className="text-xs font-bold font-mono text-gray-300 flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-[#00FF01]" />
                    <span>Generated Results</span>
                  </h3>
                  {generatedImages.length > 0 && (
                    <span className="text-[10px] font-mono text-gray-400">
                      {generatedImages.length} image(s) generated
                    </span>
                  )}
                </div>

                {loading ? (
                  <div className="flex-1 min-h-[300px] sm:min-h-[400px] rounded-3xl bg-black/50 border border-green-900/60 flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-green-900 border-t-[#00FF01] rounded-full animate-spin" />
                      <Sparkles className="h-6 w-6 text-[#00FF01] absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-mono">Synthesizing Imagery</h4>
                      <p className="text-xs text-gray-400 font-mono mt-1">
                        Google Imagen 3 is rendering photorealistic details...
                      </p>
                    </div>
                  </div>
                ) : generatedImages.length === 0 ? (
                  <div className="flex-1 min-h-[300px] sm:min-h-[400px] rounded-3xl bg-black/40 border border-green-900/60 flex flex-col items-center justify-center p-8 text-center space-y-3">
                    <div className="p-4 rounded-2xl bg-green-950/60 border border-green-800 text-green-400">
                      <Wand2 className="h-8 w-8" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-300 font-mono">No images generated yet</h4>
                      <p className="text-xs text-gray-500 font-mono mt-1 max-w-xs">
                        Enter your prompt or click "AI Enhance Prompt" to generate images using Google's Imagen 3 model.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {generatedImages.map((img) => (
                      <div
                        key={img.id}
                        className="group relative rounded-2xl bg-black border border-green-900/80 overflow-hidden shadow-lg hover:border-[#00FF01] transition-all"
                      >
                        <img
                          src={img.url}
                          alt={img.prompt}
                          referrerPolicy="no-referrer"
                          className="w-full h-auto object-cover rounded-2xl cursor-pointer"
                          onClick={() => setLightboxImage(img)}
                        />

                        {/* Overlay Controls on Hover */}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between backdrop-blur-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#00FF01] text-black font-bold">
                              {img.aspectRatio}
                            </span>
                            <button
                              type="button"
                              onClick={() => setLightboxImage(img)}
                              className="p-1.5 rounded-lg bg-black/60 text-white hover:text-[#00FF01] transition-colors cursor-pointer"
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
                                className="flex-1 py-1.5 px-2 rounded-xl bg-[#00FF01] text-black font-extrabold text-[11px] hover:bg-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Download className="h-3 w-3" />
                                <span>Download</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyPrompt(img.prompt, img.id)}
                                className="p-1.5 rounded-xl bg-black/60 text-gray-300 hover:text-white border border-green-900 cursor-pointer"
                                title="Copy prompt"
                              >
                                {copiedId === img.id ? (
                                  <Check className="h-3.5 w-3.5 text-[#00FF01]" />
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
                <h3 className="text-sm font-bold font-mono text-gray-300 flex items-center gap-2">
                  <History className="h-4 w-4 text-[#00FF01]" />
                  <span>My Saved Generations ({history.length})</span>
                </h3>
                <button
                  onClick={fetchHistory}
                  disabled={loadingHistory}
                  className="text-xs font-mono text-gray-400 hover:text-[#00FF01] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingHistory ? (
                <div className="py-12 text-center font-mono text-xs text-gray-400">
                  Loading your cloud image history...
                </div>
              ) : history.length === 0 ? (
                <div className="py-16 text-center rounded-3xl bg-black/40 border border-green-900/60 p-8 space-y-2">
                  <p className="text-sm font-mono text-gray-300 font-bold">No saved generations found</p>
                  <p className="text-xs font-mono text-gray-500">
                    Images you generate in the studio will automatically save here to your Google AI Studio account history.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {history.map((img) => (
                    <div
                      key={img.id}
                      className="group relative rounded-2xl bg-black border border-green-900/80 overflow-hidden shadow-lg hover:border-[#00FF01] transition-all"
                    >
                      <img
                        src={img.url}
                        alt={img.prompt}
                        referrerPolicy="no-referrer"
                        className="w-full h-36 object-cover cursor-pointer"
                        onClick={() => setLightboxImage(img)}
                      />
                      <div className="p-2.5 bg-black/90">
                        <p className="text-[10px] text-gray-300 font-mono truncate" title={img.prompt}>
                          {img.prompt}
                        </p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-green-950">
                          <span className="text-[9px] font-mono text-gray-500">{img.aspectRatio}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDownload(img)}
                              className="p-1 rounded bg-green-950 text-[#00FF01] hover:bg-[#00FF01] hover:text-black transition-colors"
                              title="Download"
                            >
                              <Download className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteHistoryItem(img.id)}
                              className="p-1 rounded bg-red-950/60 text-red-400 hover:bg-red-900 transition-colors"
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
        <div className="fixed inset-0 z-60 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-[#030e05] border border-green-800 rounded-3xl p-6 relative flex flex-col max-h-[90vh] space-y-4">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-black/60 text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex-1 overflow-hidden flex items-center justify-center bg-black/60 rounded-2xl p-2">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.prompt}
                referrerPolicy="no-referrer"
                className="max-h-[60vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-mono text-gray-300 bg-black/60 p-3 rounded-xl border border-green-900/60">
                "{lightboxImage.prompt}"
              </p>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-mono text-gray-400">
                  Model: <span className="text-[#00FF01]">{lightboxImage.model}</span> | Aspect: {lightboxImage.aspectRatio}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setPrompt(lightboxImage.prompt);
                      setActiveTab("generate");
                      setLightboxImage(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-black/60 border border-green-900 text-gray-300 hover:text-white text-xs font-mono"
                  >
                    Use Prompt in Studio
                  </button>
                  <button
                    onClick={() => handleDownload(lightboxImage)}
                    className="px-4 py-2 rounded-xl bg-[#00FF01] text-black font-extrabold text-xs flex items-center gap-1.5"
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
