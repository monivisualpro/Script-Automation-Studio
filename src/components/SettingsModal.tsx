import React, { useState, useEffect } from "react";
import { useAuth, FeatureModelConfig } from "../context/AuthContext";
import { getThemeConfig } from "../lib/themeConfig";
import { 
  User, 
  Mail, 
  Key, 
  ShieldCheck, 
  LogOut, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Sparkles,
  Lock,
  Cpu,
  Sliders
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { 
    profile, 
    idToken, 
    refreshProfile, 
    logout, 
    deleteAccount, 
    setIsApiKeyModalOpen,
    modelSettings,
    updateModelSettings,
    availableModels,
    fetchAvailableModels,
    currentTheme
  } = useAuth();
  const theme = getThemeConfig(currentTheme);

  const [activeTab, setActiveTab] = useState<"models" | "api" | "account">("models");
  const [localModels, setLocalModels] = useState<FeatureModelConfig>(modelSettings);
  const [savingModels, setSavingModels] = useState<boolean>(false);
  const [removingKey, setRemovingKey] = useState<boolean>(false);
  const [deletingAcc, setDeletingAcc] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalModels(modelSettings);
      fetchAvailableModels();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveModels = async () => {
    setSavingModels(true);
    setMessage(null);
    try {
      await updateModelSettings(localModels);
      setMessage({ type: "success", text: "AI Model preferences updated successfully!" });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Failed to update model settings." });
    } finally {
      setSavingModels(false);
    }
  };

  const handleRemoveApiKey = async () => {
    if (!window.confirm("Are you sure you want to remove your stored personal API key? You will not be able to generate scripts until a new key is added.")) {
      return;
    }
    setRemovingKey(true);
    setMessage(null);
    try {
      const response = await fetch("/api/user/remove-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to remove API key.");
      }

      setMessage({ type: "success", text: "API Key removed successfully." });
      await refreshProfile();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to remove key." });
    } finally {
      setRemovingKey(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAcc(true);
    try {
      await deleteAccount();
      onClose();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to delete account." });
      setDeletingAcc(false);
    }
  };

  const isLight = currentTheme === "Pure Light";
  const modalBg = isLight ? "#ffffff" : "#0d111a";
  const modalTextColor = isLight ? "#0f172a" : "#f8fafc";

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto backdrop-blur-md ${isLight ? "bg-slate-200/80" : "bg-black/75"}`}>

      <div 
        className="w-full max-w-2xl rounded-3xl p-6 sm:p-8 relative my-auto border transition-all duration-300" 
        style={{ 
          color: modalTextColor,
          backgroundColor: modalBg,
          borderColor: theme.accentColor,
          boxShadow: isLight
            ? "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            : `0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px ${theme.accentColor}40, 0 0 20px ${theme.accentColor}15`
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2.5 rounded-2xl transition-transform duration-150 hover:scale-105 active:scale-90 z-10 cursor-pointer border"
          style={{ 
            color: modalTextColor,
            backgroundColor: isLight ? "#f1f5f9" : "#1e293b",
            borderColor: isLight ? "#e2e8f0" : "rgba(255, 255, 255, 0.1)"
          }}
          title="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="p-3 rounded-2xl border shadow-lg flex items-center justify-center" style={{ backgroundColor: isLight ? "#f8fafc" : "#1e293b", borderColor: `${theme.accentColor}60`, color: theme.accentColor }}>
            <Sliders className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold font-sans tracking-tight" style={{ color: theme.accentColor }}>
              Settings & AI Preferences
            </h3>
            <p className="text-xs font-mono opacity-80 mt-0.5" style={{ color: modalTextColor }}>
              Configure per-feature AI models, API keys, and account details
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-full p-1.5 border mb-6 font-mono text-xs relative z-10" style={{ backgroundColor: isLight ? "#f1f5f9" : "rgba(0,0,0,0.3)", borderColor: isLight ? "#e2e8f0" : `${theme.accentColor}40` }}>
          <button
            onClick={() => { setActiveTab("models"); setMessage(null); }}
            className="flex-1 py-2.5 rounded-full font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            style={{
              backgroundColor: activeTab === "models" ? theme.accentColor : "transparent",
              color: activeTab === "models" ? (isLight ? "#ffffff" : "#000000") : modalTextColor,
              boxShadow: activeTab === "models" ? `0 4px 15px ${theme.accentColor}50` : "none"
            }}
          >
            <Cpu className="h-4 w-4" />
            <span>AI Models</span>
          </button>
          <button
            onClick={() => { setActiveTab("api"); setMessage(null); }}
            className="flex-1 py-2.5 rounded-full font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            style={{
              backgroundColor: activeTab === "api" ? theme.accentColor : "transparent",
              color: activeTab === "api" ? (isLight ? "#ffffff" : "#000000") : modalTextColor,
              boxShadow: activeTab === "api" ? `0 4px 15px ${theme.accentColor}50` : "none"
            }}
          >
            <Key className="h-4 w-4" />
            <span>API Settings</span>
          </button>
          <button
            onClick={() => { setActiveTab("account"); setMessage(null); }}
            className="flex-1 py-2.5 rounded-full font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            style={{
              backgroundColor: activeTab === "account" ? theme.accentColor : "transparent",
              color: activeTab === "account" ? (isLight ? "#ffffff" : "#000000") : modalTextColor,
              boxShadow: activeTab === "account" ? `0 4px 15px ${theme.accentColor}50` : "none"
            }}
          >
            <User className="h-4 w-4" />
            <span>Account</span>
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className="mb-5 p-3 rounded-2xl text-xs font-mono flex items-center gap-2 border"
            style={{
              backgroundColor: message.type === "success" ? `${theme.accentColor}15` : "rgba(153, 27, 27, 0.4)",
              borderColor: message.type === "success" ? theme.accentColor : "#b91c1c",
              color: message.type === "success" ? modalTextColor : "#fca5a5"
            }}
          >
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: theme.accentColor }} /> : <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* TAB 1: AI MODEL CONFIGURATION PER FEATURE */}
        {activeTab === "models" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl border text-xs font-mono leading-relaxed opacity-90" style={{ backgroundColor: `${theme.accentColor}12`, borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)", color: modalTextColor }}>
              Customize which Gemini model powers each feature of the studio. High-speed Flash models are recommended for transcripts, while Pro models deliver maximum creativity for script generation.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 font-mono text-xs">
              {/* 1. YouTube Transcript */}
              <div 
                className="p-3.5 rounded-2xl border space-y-2" 
                style={{ 
                  backgroundColor: isLight ? "#f8fafc" : "rgba(0,0,0,0.45)", 
                  borderColor: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)" 
                }}
              >
                <label className="block font-bold flex items-center justify-between" style={{ color: modalTextColor }}>
                  <span>1. YouTube Transcript</span>
                  <span className="text-[10px] opacity-60 font-normal">Extracting / Reconstructing</span>
                </label>
                <select
                  value={localModels.youtubeTranscript}
                  onChange={(e) => setLocalModels({ ...localModels, youtubeTranscript: e.target.value })}
                  className="w-full border rounded-xl py-2 px-3 text-xs font-bold focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: isLight ? "#ffffff" : "#131b2e",
                    borderColor: isLight ? "rgba(0,0,0,0.15)" : `${theme.accentColor}50`,
                    color: isLight ? "#000000" : "#ffffff"
                  }}
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id} style={{ backgroundColor: isLight ? "#ffffff" : "#1e293b", color: isLight ? "#000000" : "#ffffff" }}>{m.displayName}</option>
                  ))}
                </select>
              </div>

              {/* 2. Transcript Cleaning */}
              <div 
                className="p-3.5 rounded-2xl border space-y-2" 
                style={{ 
                  backgroundColor: isLight ? "#f8fafc" : "rgba(0,0,0,0.45)", 
                  borderColor: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)" 
                }}
              >
                <label className="block font-bold flex items-center justify-between" style={{ color: modalTextColor }}>
                  <span>2. Transcript Cleaning</span>
                  <span className="text-[10px] opacity-60 font-normal">Formatting & Punctuation</span>
                </label>
                <select
                  value={localModels.transcriptCleaning}
                  onChange={(e) => setLocalModels({ ...localModels, transcriptCleaning: e.target.value })}
                  className="w-full border rounded-xl py-2 px-3 text-xs font-bold focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: isLight ? "#ffffff" : "#131b2e",
                    borderColor: isLight ? "rgba(0,0,0,0.15)" : `${theme.accentColor}50`,
                    color: isLight ? "#000000" : "#ffffff"
                  }}
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id} style={{ backgroundColor: isLight ? "#ffffff" : "#1e293b", color: isLight ? "#000000" : "#ffffff" }}>{m.displayName}</option>
                  ))}
                </select>
              </div>

              {/* 3. Script Generation */}
              <div 
                className="p-3.5 rounded-2xl border space-y-2" 
                style={{ 
                  backgroundColor: isLight ? "#f8fafc" : "rgba(0,0,0,0.45)", 
                  borderColor: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)" 
                }}
              >
                <label className="block font-bold flex items-center justify-between" style={{ color: modalTextColor }}>
                  <span>3. Script Generation</span>
                  <span className="text-[10px] opacity-60 font-normal">Main Transformation</span>
                </label>
                <select
                  value={localModels.scriptGeneration}
                  onChange={(e) => setLocalModels({ ...localModels, scriptGeneration: e.target.value })}
                  className="w-full border rounded-xl py-2 px-3 text-xs font-bold focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: isLight ? "#ffffff" : "#131b2e",
                    borderColor: isLight ? "rgba(0,0,0,0.15)" : `${theme.accentColor}50`,
                    color: isLight ? "#000000" : "#ffffff"
                  }}
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id} style={{ backgroundColor: isLight ? "#ffffff" : "#1e293b", color: isLight ? "#000000" : "#ffffff" }}>{m.displayName}</option>
                  ))}
                </select>
              </div>

              {/* 4. Prompt Generation */}
              <div 
                className="p-3.5 rounded-2xl border space-y-2" 
                style={{ 
                  backgroundColor: isLight ? "#f8fafc" : "rgba(0,0,0,0.45)", 
                  borderColor: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)" 
                }}
              >
                <label className="block font-bold flex items-center justify-between" style={{ color: modalTextColor }}>
                  <span>4. Scene Prompt Generation</span>
                  <span className="text-[10px] opacity-60 font-normal">Veo 3 / Wan 2.2 Scene Prompts</span>
                </label>
                <select
                  value={localModels.promptGeneration}
                  onChange={(e) => setLocalModels({ ...localModels, promptGeneration: e.target.value })}
                  className="w-full border rounded-xl py-2 px-3 text-xs font-bold focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: isLight ? "#ffffff" : "#131b2e",
                    borderColor: isLight ? "rgba(0,0,0,0.15)" : `${theme.accentColor}50`,
                    color: isLight ? "#000000" : "#ffffff"
                  }}
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id} style={{ backgroundColor: isLight ? "#ffffff" : "#1e293b", color: isLight ? "#000000" : "#ffffff" }}>{m.displayName}</option>
                  ))}
                </select>
              </div>

              {/* 5. Bulk Prompt Generation */}
              <div 
                className="p-3.5 rounded-2xl border space-y-2" 
                style={{ 
                  backgroundColor: isLight ? "#f8fafc" : "rgba(0,0,0,0.45)", 
                  borderColor: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)" 
                }}
              >
                <label className="block font-bold flex items-center justify-between" style={{ color: modalTextColor }}>
                  <span>5. Bulk Prompt Generation</span>
                  <span className="text-[10px] opacity-60 font-normal">Multi-scene storyboard batches</span>
                </label>
                <select
                  value={localModels.bulkPromptGeneration}
                  onChange={(e) => setLocalModels({ ...localModels, bulkPromptGeneration: e.target.value })}
                  className="w-full border rounded-xl py-2 px-3 text-xs font-bold focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: isLight ? "#ffffff" : "#131b2e",
                    borderColor: isLight ? "rgba(0,0,0,0.15)" : `${theme.accentColor}50`,
                    color: isLight ? "#000000" : "#ffffff"
                  }}
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id} style={{ backgroundColor: isLight ? "#ffffff" : "#1e293b", color: isLight ? "#000000" : "#ffffff" }}>{m.displayName}</option>
                  ))}
                </select>
              </div>

              {/* 6. Rewrite / Expand / Rephrase */}
              <div 
                className="p-3.5 rounded-2xl border space-y-2" 
                style={{ 
                  backgroundColor: isLight ? "#f8fafc" : "rgba(0,0,0,0.45)", 
                  borderColor: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)" 
                }}
              >
                <label className="block font-bold flex items-center justify-between" style={{ color: modalTextColor }}>
                  <span>6. Topic Script & Rephrase</span>
                  <span className="text-[10px] opacity-60 font-normal">Word Count Expansion</span>
                </label>
                <select
                  value={localModels.rewriteExpand}
                  onChange={(e) => setLocalModels({ ...localModels, rewriteExpand: e.target.value })}
                  className="w-full border rounded-xl py-2 px-3 text-xs font-bold focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: isLight ? "#ffffff" : "#131b2e",
                    borderColor: isLight ? "rgba(0,0,0,0.15)" : `${theme.accentColor}50`,
                    color: isLight ? "#000000" : "#ffffff"
                  }}
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id} style={{ backgroundColor: isLight ? "#ffffff" : "#1e293b", color: isLight ? "#000000" : "#ffffff" }}>{m.displayName}</option>
                  ))}
                </select>
              </div>

              {/* 7. Image Generation (Image Studio) */}
              <div 
                className="p-3.5 rounded-2xl border space-y-2 sm:col-span-2" 
                style={{ 
                  backgroundColor: isLight ? "#f8fafc" : "rgba(0,0,0,0.45)", 
                  borderColor: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)" 
                }}
              >
                <label className="block font-bold flex items-center justify-between" style={{ color: modalTextColor }}>
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" style={{ color: theme.accentColor }} />
                    <span>7. Image Generation Studio Engine</span>
                  </span>
                  <span className="text-[10px] opacity-60 font-normal">Native AI Image Synthesis</span>
                </label>
                <select
                  value={localModels.imageGeneration || "gemini-3.1-flash-image"}
                  onChange={(e) => setLocalModels({ ...localModels, imageGeneration: e.target.value })}
                  className="w-full border rounded-xl py-2 px-3 text-xs font-bold focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: isLight ? "#ffffff" : "#131b2e",
                    borderColor: isLight ? "rgba(0,0,0,0.15)" : `${theme.accentColor}50`,
                    color: isLight ? "#000000" : "#ffffff"
                  }}
                >
                  <option value="gemini-3.1-flash-image" style={{ backgroundColor: isLight ? "#ffffff" : "#1e293b", color: isLight ? "#000000" : "#ffffff" }}>Gemini 3.1 Flash Image (Balanced & High Quality)</option>
                  <option value="gemini-3-pro-image" style={{ backgroundColor: isLight ? "#ffffff" : "#1e293b", color: isLight ? "#000000" : "#ffffff" }}>Gemini 3 Pro Image (Maximum Detail & Realism)</option>
                  <option value="gemini-3.1-flash-lite-image" style={{ backgroundColor: isLight ? "#ffffff" : "#1e293b", color: isLight ? "#000000" : "#ffffff" }}>Gemini 3.1 Flash Lite Image (Ultra Speed)</option>
                  <option value="imagen-3.0-generate-002" style={{ backgroundColor: isLight ? "#ffffff" : "#1e293b", color: isLight ? "#000000" : "#ffffff" }}>Imagen 3 Studio (High-Res Photorealistic)</option>
                  <option value="imagen-3.0-fast-generate-001" style={{ backgroundColor: isLight ? "#ffffff" : "#1e293b", color: isLight ? "#000000" : "#ffffff" }}>Imagen 3 Fast (Rapid Generation)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSaveModels}
              disabled={savingModels}
              className="w-full py-3 px-4 rounded-2xl font-extrabold text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              style={{
                backgroundColor: theme.accentColor,
                color: currentTheme === "Pure Light" ? "#ffffff" : "#000000"
              }}
            >
              {savingModels ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>Save AI Model Preferences</span>
            </button>
          </div>
        )}

        {/* TAB 2: API SETTINGS */}
        {activeTab === "api" && (
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border space-y-3 ${isLight ? "border-slate-200" : "border-white/10"}`} style={{ backgroundColor: isLight ? "#f8fafc" : "rgba(0,0,0,0.3)" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold flex items-center gap-2" style={{ color: modalTextColor }}>
                  <Key className="h-4 w-4" style={{ color: theme.accentColor }} />
                  <span>Personal Google AI API Key Status</span>
                </span>
                {profile?.hasApiKey ? (
                  <span className="px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold flex items-center gap-1" style={{ backgroundColor: `${theme.accentColor}20`, borderColor: theme.accentColor, color: theme.accentColor }}>
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Active & Validated</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Not Configured</span>
                  </span>
                )}
              </div>

              <div className="text-xs font-mono opacity-80" style={{ color: modalTextColor }}>
                {profile?.hasApiKey ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border mt-1" style={{ backgroundColor: `${theme.accentColor}10`, borderColor: `${theme.accentColor}30` }}>
                    <span>Masked Key:</span>
                    <span className="font-bold font-mono" style={{ color: theme.accentColor }}>{profile.apiKeyMasked}</span>
                  </div>
                ) : (
                  <p className="text-amber-200/90 leading-relaxed pt-1">
                    Script Automation Studio operates with user-isolated personal keys. You must provide a valid Google AI Studio key to perform AI script generations.
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    onClose();
                    setIsApiKeyModalOpen(true);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{
                    backgroundColor: theme.accentColor,
                    color: isLight ? "#ffffff" : "#000000"
                  }}
                >
                  <Key className="h-3.5 w-3.5" />
                  <span>{profile?.hasApiKey ? "Change / Re-test API Key" : "Add Personal API Key"}</span>
                </button>

                {profile?.hasApiKey && (
                  <button
                    onClick={handleRemoveApiKey}
                    disabled={removingKey}
                    className="py-2.5 px-3 rounded-xl bg-red-950/60 text-red-400 border border-red-900/60 hover:bg-red-900 hover:text-white transition-all text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {removingKey ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    <span>Remove Key</span>
                  </button>
                )}
              </div>
            </div>

            <div className={`p-4 rounded-2xl border text-xs font-mono opacity-80 space-y-2 ${isLight ? "border-slate-200" : "border-white/10"}`} style={{ backgroundColor: isLight ? "#f8fafc" : "rgba(0,0,0,0.2)", color: modalTextColor }}>
              <div className="font-bold flex items-center gap-2" style={{ color: modalTextColor }}>
                <ShieldCheck className="h-4 w-4" style={{ color: theme.accentColor }} />
                <span>Security & Encryption Protocol</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Your key is stored in Firestore encrypted with AES-256. It is never logged or exposed to other users. The server decrypts it temporarily strictly during your own generation requests.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: ACCOUNT & USER PROFILE */}
        {activeTab === "account" && (
          <div className="space-y-4">
            <div className={`flex items-center gap-3 p-4 rounded-2xl border ${isLight ? "border-slate-200" : "border-white/10"}`} style={{ backgroundColor: isLight ? "#f8fafc" : "rgba(0,0,0,0.3)" }}>
              <img
                src={profile?.profilePhoto}
                alt={profile?.name}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-cover border-2 shadow-md"
                style={{ borderColor: theme.accentColor }}
              />
              <div>
                <h4 className="text-base font-extrabold font-sans" style={{ color: modalTextColor }}>
                  {profile?.name}
                </h4>
                <p className="text-xs font-mono opacity-80 mt-0.5" style={{ color: modalTextColor }}>
                  {profile?.email}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold" style={{ backgroundColor: `${theme.accentColor}20`, borderColor: `${theme.accentColor}50`, color: theme.accentColor }}>
                  {profile?.provider === "google.com" ? "Google Authentication" : profile?.provider === "anonymous" ? "Guest Creator" : "Email & Password"}
                </span>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2.5 text-xs font-mono ${isLight ? "border-slate-200" : "border-white/10"}`} style={{ backgroundColor: isLight ? "#f8fafc" : "rgba(0,0,0,0.2)" }}>
              <div className="flex items-center justify-between opacity-80" style={{ color: modalTextColor }}>
                <span>User ID:</span>
                <span className="font-mono text-[10px] font-bold" style={{ color: modalTextColor }}>{profile?.userId}</span>
              </div>
              <div className="flex items-center justify-between opacity-80" style={{ color: modalTextColor }}>
                <span>Role:</span>
                <span className="font-bold uppercase" style={{ color: theme.accentColor }}>{profile?.role}</span>
              </div>
              <div className="flex items-center justify-between opacity-80" style={{ color: modalTextColor }}>
                <span>Member Since:</span>
                <span style={{ color: modalTextColor }}>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl border transition-all font-mono font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: `${theme.accentColor}15`,
                  borderColor: `${theme.accentColor}40`,
                  color: modalTextColor
                }}
              >
                <LogOut className="h-4 w-4" style={{ color: theme.accentColor }} />
                <span>Log Out of Studio</span>
              </button>

              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-950/30 text-red-400 border border-red-950 hover:bg-red-950 hover:border-red-800 transition-all font-mono text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Account & Erase Personal Data</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-red-950/90 border border-red-800 space-y-2 animate-[fadeIn_0.2s_ease]">
                  <p className="text-xs text-red-200 font-mono text-center font-bold">
                    Are you absolutely sure? This will delete your profile and encrypted key permanently.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deletingAcc}
                      className="flex-1 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-500 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {deletingAcc ? "Deleting..." : "Yes, Permanently Delete"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 font-bold text-xs hover:bg-gray-700 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

