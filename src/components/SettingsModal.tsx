import React, { useState, useEffect } from "react";
import { useAuth, FeatureModelConfig } from "../context/AuthContext";
import { getThemeConfig } from "../lib/themeConfig";
import { 
  User, 
  Key, 
  ShieldCheck, 
  LogOut, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Sparkles,
  Cpu,
  Sliders,
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { 
    profile, 
    idToken, 
    isStandalone,
    envKeyStatus,
    refreshSystemMode,
    activeProviderConfig,
    updateProviderConfig,
    refreshProfile, 
    logout, 
    deleteAccount, 
    setIsApiKeyModalOpen,
    modelSettings,
    updateModelSettings,
    availableModels,
    availableLocalModels,
    fetchAvailableModels,
    currentTheme,
    currentBrand,
  } = useAuth();
  const theme = getThemeConfig(currentTheme, currentBrand);

  const [activeTab, setActiveTab] = useState<"models" | "api" | "account">("models");
  const [localModels, setLocalModels] = useState<FeatureModelConfig>(modelSettings);
  const [savingModels, setSavingModels] = useState<boolean>(false);
  const [refreshingModels, setRefreshingModels] = useState<boolean>(false);
  const [quickLocalModel, setQuickLocalModel] = useState<string>("");
  const [removingKey, setRemovingKey] = useState<boolean>(false);
  const [confirmRemoveKey, setConfirmRemoveKey] = useState<boolean>(false);
  const [confirmClearChats, setConfirmClearChats] = useState<boolean>(false);
  const [clearingChats, setClearingChats] = useState<boolean>(false);
  const [deletingAcc, setDeletingAcc] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalModels(modelSettings);
      fetchAvailableModels();
      if (isStandalone) {
        void refreshSystemMode();
        if (activeTab === "account") {
          setActiveTab("models");
        }
      }
    }
  }, [isOpen, isStandalone]);

  useEffect(() => {
    if (availableLocalModels.length > 0 && !quickLocalModel) {
      setQuickLocalModel(availableLocalModels[0].id);
    }
  }, [availableLocalModels]);

  if (!isOpen) return null;

  const cloudModels = availableModels.filter((m) => m.providerType !== "local");

  const isLocalModelChoice = (modelId?: string) => {
    if (!modelId) return false;
    if (availableLocalModels.some((m) => m.id === modelId)) return true;
    const lower = modelId.toLowerCase();
    return !lower.startsWith("gemini-") && !lower.startsWith("gpt-") && !lower.startsWith("o1-") && !lower.startsWith("o3-") && !lower.startsWith("o4-") && !lower.startsWith("claude-") && !lower.startsWith("imagen-");
  };

  const handleRefreshAvailableModels = async () => {
    setRefreshingModels(true);
    try {
      await fetchAvailableModels();
    } finally {
      setRefreshingModels(false);
    }
  };

  const handleApplyLocalModelToAll = (modelId: string) => {
    if (!modelId) return;
    setLocalModels((prev) => ({
      ...prev,
      youtubeTranscript: modelId,
      transcriptCleaning: modelId,
      scriptGeneration: modelId,
      promptGeneration: modelId,
      bulkPromptGeneration: modelId,
      rewriteExpand: modelId,
    }));
    setMessage({ type: "success", text: `Selected "${modelId}" for all 6 AI text & prompt features. Click Save AI Model Preferences to apply.` });
  };

  const renderModelOptions = (currentValue: string) => {
    const knownIds = new Set([
      ...availableLocalModels.map((m) => m.id),
      ...cloudModels.map((m) => m.id),
    ]);
    const optStyle = { backgroundColor: isLight ? "#ffffff" : "#1e293b", color: isLight ? "#000000" : "#ffffff" };

    return (
      <>
        {!knownIds.has(currentValue) && currentValue && (
          <option value={currentValue} style={optStyle}>
            {currentValue} (Saved)
          </option>
        )}
        {isStandalone && availableLocalModels.length > 0 && (
          <optgroup label="Local Models (Built-In GGUF / LM Studio / Ollama)" style={optStyle}>
            {availableLocalModels.map((m) => (
              <option key={`local-${m.id}`} value={m.id} style={optStyle}>
                {m.displayName}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label={`Cloud Models (${activeProviderConfig.provider === "openai" ? "OpenAI" : activeProviderConfig.provider === "claude" ? "Claude" : "Gemini"})`} style={optStyle}>
          {cloudModels.map((m) => (
            <option key={`cloud-${m.id}`} value={m.id} style={optStyle}>
              {m.displayName}
            </option>
          ))}
        </optgroup>
      </>
    );
  };

  const handleSaveModels = async () => {
    setSavingModels(true);
    setMessage(null);
    try {
      await updateModelSettings(localModels);

      const selectedTextModels = [
        localModels.scriptGeneration,
        localModels.promptGeneration,
        localModels.transcriptCleaning,
        localModels.youtubeTranscript,
        localModels.bulkPromptGeneration,
        localModels.rewriteExpand,
      ];
      const matchedLocalId = selectedTextModels.find((id) => isLocalModelChoice(id));

      if (isStandalone && matchedLocalId) {
        const localMeta = availableLocalModels.find((m) => m.id === matchedLocalId);
        updateProviderConfig({
          provider: "local",
          model: matchedLocalId,
          ...(localMeta?.baseUrl ? { baseUrl: localMeta.baseUrl } : {}),
        });
        setMessage({
          type: "success",
          text: `AI Model preferences saved! Active provider synced to Local Model (${matchedLocalId}).`,
        });
      } else {
        if (isStandalone && activeProviderConfig.provider === "local") {
          const primaryLower = (localModels.scriptGeneration || "").toLowerCase();
          const targetCloudProvider: "gemini" | "openai" | "claude" =
            primaryLower.startsWith("gpt-") || primaryLower.startsWith("o1-") || primaryLower.startsWith("o3-") || primaryLower.startsWith("o4-")
              ? "openai"
              : primaryLower.startsWith("claude-")
              ? "claude"
              : "gemini";
          updateProviderConfig({
            provider: targetCloudProvider,
            model: localModels.scriptGeneration,
          });
        }
        setMessage({ type: "success", text: "AI Model preferences updated successfully!" });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Failed to update model settings." });
    } finally {
      setSavingModels(false);
    }
  };

  const handleRemoveApiKey = async () => {
    setRemovingKey(true);
    setMessage(null);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (!isStandalone && idToken) {
        headers.Authorization = `Bearer ${idToken}`;
      }
      const response = await fetch("/api/user/remove-key", {
        method: "POST",
        headers,
        body: isStandalone ? JSON.stringify({ provider: "all" }) : undefined,
      });

      if (!response.ok) {
        throw new Error("Failed to remove API key.");
      }

      setConfirmRemoveKey(false);
      if (isStandalone) {
        updateProviderConfig({ apiKey: "" });
        await refreshSystemMode();
        setMessage({ type: "success", text: "Local .env and browser API keys cleared." });
      } else {
        setMessage({ type: "success", text: "API Key removed successfully." });
        await refreshProfile();
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to remove key." });
    } finally {
      setRemovingKey(false);
    }
  };

  const handleClearSyncedChats = async () => {
    setClearingChats(true);
    setMessage(null);
    try {
      if (!isStandalone && idToken) {
        await fetch("/api/chat/storage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ sessions: [], projects: [] }),
        });
      }
      try {
        localStorage.removeItem("sas_chat_sessions_v1");
        localStorage.removeItem("sas_chat_projects_v1");
        localStorage.removeItem("sas_desktop_chat_sessions_v1");
        localStorage.removeItem("sas_desktop_chat_projects_v1");
      } catch {}
      setConfirmClearChats(false);
      setMessage({ type: "success", text: "Cloud & browser chat history cleared." });
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Failed to clear chat history." });
    } finally {
      setClearingChats(false);
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

  const isLight = theme.isLight;
  const modalBg = isLight ? "#FFFFFF" : "#111111";
  const modalTextColor = isLight ? "#000000" : "#FFFFFF";

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto backdrop-blur-md ${isLight ? "bg-black/30" : "bg-black/75"}`}>

      <div 
        className="w-full max-w-2xl rounded-3xl p-6 sm:p-8 relative my-auto border transition-all duration-300" 
        style={{ 
          color: modalTextColor,
          backgroundColor: modalBg,
          borderColor: isLight ? "#E5E5E5" : "#2A2A2A",
          boxShadow: isLight
            ? "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.03)"
            : `0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px ${theme.accentColor}40, 0 0 20px ${theme.accentColor}15`
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2.5 rounded-2xl transition-transform duration-150 hover:scale-105 active:scale-90 z-10 cursor-pointer border"
          style={{ 
            color: modalTextColor,
            backgroundColor: isLight ? "#F7F7F7" : "#1A1A1A",
            borderColor: isLight ? "#E5E5E5" : "#2A2A2A"
          }}
          title="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="p-3 rounded-2xl border shadow-lg flex items-center justify-center" style={{ backgroundColor: isLight ? "#F7F7F7" : "#1A1A1A", borderColor: isLight ? "#E5E5E5" : "#2A2A2A", color: theme.accentColor }}>
            <Sliders className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold font-sans tracking-tight" style={{ color: modalTextColor }}>
              Settings & AI Preferences
            </h3>
            <p className="text-xs font-mono opacity-80 mt-0.5" style={{ color: isLight ? "#444444" : "#BDBDBD" }}>
              Configure per-feature AI models, API keys, and account details
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-full p-1.5 border mb-6 font-mono text-xs relative z-10" style={{ backgroundColor: isLight ? "#F7F7F7" : "#1A1A1A", borderColor: isLight ? "#E5E5E5" : "#2A2A2A" }}>
          <button
            onClick={() => { setActiveTab("models"); setMessage(null); }}
            className="flex-1 py-2.5 rounded-full font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            style={{
              backgroundColor: activeTab === "models" ? theme.accentColor : "transparent",
              color: activeTab === "models" ? "#FFFFFF" : modalTextColor,
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
              color: activeTab === "api" ? "#FFFFFF" : modalTextColor,
              boxShadow: activeTab === "api" ? `0 4px 15px ${theme.accentColor}50` : "none"
            }}
          >
            <Key className="h-4 w-4" />
            <span>API Settings</span>
          </button>
          {!isStandalone && (
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
          )}
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className="mb-5 p-3 rounded-2xl text-xs font-mono flex items-center gap-2 border"
            style={{
              backgroundColor: message.type === "success" ? `${theme.accentColor}15` : "rgba(153, 27, 27, 0.4)",
              borderColor: message.type === "success" ? theme.accentColor : "#b91c1c",
              color: message.type === "success" ? modalTextColor : "#ffffff"
            }}
          >
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: theme.accentColor }} /> : <AlertTriangle className="h-4 w-4 shrink-0 text-white" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* TAB 1: AI MODEL CONFIGURATION PER FEATURE */}
        {activeTab === "models" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl border text-xs font-mono leading-relaxed space-y-2.5" style={{ backgroundColor: `${theme.accentColor}12`, borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.12)", color: modalTextColor }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Active Provider:{" "}
                  <strong style={{ color: theme.accentColor }}>
                    {activeProviderConfig.provider === "local"
                      ? `Local LLM (${activeProviderConfig.baseUrl || "http://127.0.0.1:1279/v1"})`
                      : activeProviderConfig.provider.toUpperCase()}
                  </strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRefreshAvailableModels}
                    disabled={refreshingModels}
                    className="px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all hover:opacity-85 disabled:opacity-50"
                    style={{
                      backgroundColor: isLight ? "#ffffff" : "#1A1A1A",
                      borderColor: isLight ? "rgba(0,0,0,0.18)" : `${theme.accentColor}60`,
                      color: modalTextColor,
                    }}
                  >
                    <RefreshCw className={`h-3 w-3 ${refreshingModels ? "animate-spin" : ""}`} />
                    <span>Refresh Models</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setIsApiKeyModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:opacity-90"
                    style={{
                      backgroundColor: theme.accentColor,
                      color: "#FFFFFF",
                    }}
                  >
                    Configure AI Provider
                  </button>
                </div>
              </div>
              <p className="opacity-90">
                {isStandalone
                  ? "Customize which Cloud or Local model (.gguf Built-In Engine, LM Studio, or Ollama) powers each studio tool. Selecting a local model automatically routes requests to your local server when saved."
                  : "Customize which AI model powers each feature of the studio. Fast models are recommended for transcripts, while Pro/Sonnet models deliver maximum creativity for script generation."}
              </p>
              {isStandalone && availableLocalModels.length > 0 && (
                <div className="pt-2 border-t flex flex-col sm:flex-row sm:items-center gap-2" style={{ borderColor: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)" }}>
                  <span className="text-[11px] font-bold shrink-0">Quick Apply Local Model:</span>
                  <div className="flex items-center gap-2 flex-1">
                    <select
                      value={quickLocalModel}
                      onChange={(e) => setQuickLocalModel(e.target.value)}
                      className="flex-1 border rounded-lg py-1.5 px-2.5 text-[11px] font-bold focus:outline-none cursor-pointer"
                      style={{
                        backgroundColor: isLight ? "#ffffff" : "#131b2e",
                        borderColor: isLight ? "rgba(0,0,0,0.18)" : `${theme.accentColor}60`,
                        color: isLight ? "#000000" : "#ffffff",
                      }}
                    >
                      {availableLocalModels.map((m) => (
                        <option key={`quick-${m.id}`} value={m.id} style={{ backgroundColor: isLight ? "#ffffff" : "#1e293b", color: isLight ? "#000000" : "#ffffff" }}>
                          {m.displayName}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleApplyLocalModelToAll(quickLocalModel)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer transition-all hover:opacity-90"
                      style={{
                        backgroundColor: theme.accentColor,
                        color: "#FFFFFF",
                      }}
                    >
                      Apply to All 6
                    </button>
                  </div>
                </div>
              )}
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
                  {renderModelOptions(localModels.youtubeTranscript)}
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
                  {renderModelOptions(localModels.transcriptCleaning)}
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
                  {renderModelOptions(localModels.scriptGeneration)}
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
                  <span>4. Scene & Thumbnail Prompts</span>
                  <span className="text-[10px] opacity-60 font-normal">Veo 3 / Wan 2.2 / FLUX / NB2</span>
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
                  {renderModelOptions(localModels.promptGeneration)}
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
                  {renderModelOptions(localModels.bulkPromptGeneration)}
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
                  {renderModelOptions(localModels.rewriteExpand)}
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
                color: "#ffffff"
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
            {isStandalone ? (
              <>
                <div className={`p-4 rounded-2xl border space-y-3 ${isLight ? "border-slate-200" : "border-white/10"}`} style={{ backgroundColor: isLight ? "#f8fafc" : "rgba(0,0,0,0.3)" }}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-mono font-bold flex items-center gap-2" style={{ color: modalTextColor }}>
                      <Key className="h-4 w-4" style={{ color: theme.accentColor }} />
                      <span>Local .env File &amp; Provider Keys</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold" style={{ backgroundColor: `${theme.accentColor}15`, borderColor: theme.accentColor, color: modalTextColor }}>
                      Active: {activeProviderConfig.provider.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    {[
                      { label: "GEMINI_API_KEY (.env)", status: envKeyStatus?.gemini },
                      { label: "OPENAI_API_KEY (.env)", status: envKeyStatus?.openai },
                      { label: "ANTHROPIC_API_KEY (.env)", status: envKeyStatus?.claude },
                    ].map((row) => (
                      <div key={row.label} className="p-2.5 rounded-xl border flex items-center justify-between gap-2" style={{ borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)" }}>
                        <span className="truncate opacity-80">{row.label}</span>
                        <span className="font-bold shrink-0" style={{ color: row.status?.configured ? theme.secondaryAccentColor : modalTextColor }}>
                          {row.status?.configured ? row.status.masked : "Empty"}
                        </span>
                      </div>
                    ))}
                    <div className="p-2.5 rounded-xl border flex items-center justify-between gap-2" style={{ borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)" }}>
                      <span className="truncate opacity-80">Local Engine URL</span>
                      <span className="font-bold truncate max-w-[140px]" title={envKeyStatus?.local?.url || activeProviderConfig.baseUrl}>
                        {activeProviderConfig.baseUrl || envKeyStatus?.local?.url || "127.0.0.1:1279"}
                      </span>
                    </div>
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
                        color: "#ffffff"
                      }}
                    >
                      <Key className="h-3.5 w-3.5" />
                      <span>Edit Keys / Local Engine</span>
                    </button>

                    {(envKeyStatus?.gemini?.configured || envKeyStatus?.openai?.configured || envKeyStatus?.claude?.configured || activeProviderConfig.apiKey) && !confirmRemoveKey && (
                      <button
                        onClick={() => setConfirmRemoveKey(true)}
                        className="py-2.5 px-3 rounded-xl bg-red-950/60 text-white border border-red-900/60 hover:bg-red-900 hover:text-white transition-all text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Clear Local Keys</span>
                      </button>
                    )}
                  </div>
                  {confirmRemoveKey && (
                    <div className="p-3 rounded-xl bg-red-950/90 border border-red-800 space-y-2 text-xs font-mono text-white">
                      <p>Clear saved API keys from your local .env file and browser storage?</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleRemoveApiKey}
                          disabled={removingKey}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold cursor-pointer disabled:opacity-50"
                        >
                          {removingKey ? "Clearing..." : "Yes, Clear Keys"}
                        </button>
                        <button
                          onClick={() => setConfirmRemoveKey(false)}
                          className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`p-4 rounded-2xl border text-xs font-mono opacity-85 space-y-2 ${isLight ? "border-slate-200" : "border-white/10"}`} style={{ backgroundColor: isLight ? "#f8fafc" : "rgba(0,0,0,0.2)", color: modalTextColor }}>
                  <div className="font-bold flex items-center gap-2" style={{ color: modalTextColor }}>
                    <ShieldCheck className="h-4 w-4" style={{ color: theme.accentColor }} />
                    <span>Local File Security &amp; GitHub Safety</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    No login or authorization is used in Local Standalone Mode. API keys saved to your local <code className="font-bold">.env</code> file remain private on your machine (gitignored by <code className="font-bold">.gitignore</code>) and are never compiled into frontend bundles. Never commit <code className="font-bold">.env</code> to GitHub or expose port 3000 on a public network without auth.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className={`p-4 rounded-2xl border space-y-3 ${isLight ? "border-slate-200" : "border-white/10"}`} style={{ backgroundColor: isLight ? "#f8fafc" : "rgba(0,0,0,0.3)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold flex items-center gap-2" style={{ color: modalTextColor }}>
                      <Key className="h-4 w-4" style={{ color: theme.accentColor }} />
                      <span>Personal Google AI API Key Status</span>
                    </span>
                    {profile?.hasApiKey ? (
                      <span className="px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold flex items-center gap-1" style={{ backgroundColor: `${theme.accentColor}20`, borderColor: theme.accentColor, color: modalTextColor }}>
                        <CheckCircle2 className="h-3 w-3" style={{ color: theme.accentColor }} />
                        <span>Active &amp; Validated</span>
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
                        <span className="font-bold font-mono" style={{ color: modalTextColor }}>{profile.apiKeyMasked}</span>
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
                        color: "#ffffff"
                      }}
                    >
                      <Key className="h-3.5 w-3.5" />
                      <span>{profile?.hasApiKey ? "Change / Re-test API Key" : "Add Personal API Key"}</span>
                    </button>

                    {profile?.hasApiKey && !confirmRemoveKey && (
                      <button
                        onClick={() => setConfirmRemoveKey(true)}
                        className="py-2.5 px-3 rounded-xl bg-red-950/60 text-white border border-red-900/60 hover:bg-red-900 hover:text-white transition-all text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove Key</span>
                      </button>
                    )}
                  </div>
                  {confirmRemoveKey && (
                    <div className="p-3 rounded-xl bg-red-950/90 border border-red-800 space-y-2 text-xs font-mono text-white">
                      <p>Remove your stored API key from Firestore? You won't be able to generate until you add a new key.</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleRemoveApiKey}
                          disabled={removingKey}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold cursor-pointer disabled:opacity-50"
                        >
                          {removingKey ? "Removing..." : "Yes, Remove Key"}
                        </button>
                        <button
                          onClick={() => setConfirmRemoveKey(false)}
                          className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`p-4 rounded-2xl border text-xs font-mono opacity-80 space-y-2 ${isLight ? "border-slate-200" : "border-white/10"}`} style={{ backgroundColor: isLight ? "#f8fafc" : "rgba(0,0,0,0.2)", color: modalTextColor }}>
                  <div className="font-bold flex items-center gap-2" style={{ color: modalTextColor }}>
                    <ShieldCheck className="h-4 w-4" style={{ color: theme.accentColor }} />
                    <span>Security &amp; Encryption Protocol</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Your key is stored in Firestore encrypted with AES-256. It is never logged or exposed to other users. The server decrypts it temporarily strictly during your own generation requests.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: ACCOUNT & USER PROFILE */}
        {!isStandalone && activeTab === "account" && (
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
                <span className="inline-block mt-1 px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold" style={{ backgroundColor: `${theme.accentColor}20`, borderColor: `${theme.accentColor}50`, color: modalTextColor }}>
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
                <span className="font-bold uppercase" style={{ color: modalTextColor }}>{profile?.role}</span>
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

              {!confirmClearChats ? (
                <button
                  type="button"
                  onClick={() => setConfirmClearChats(true)}
                  className="w-full py-2.5 px-4 rounded-xl border transition-all font-mono text-xs flex items-center justify-center gap-2 cursor-pointer"
                  style={{
                    borderColor: isLight ? "#E5E5E5" : "#333333",
                    color: modalTextColor,
                  }}
                >
                  <Trash2 className="h-4 w-4 opacity-75" />
                  <span>Clear Cloud &amp; Browser Chat History</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-red-950/90 border border-red-800 space-y-2 text-white font-mono text-xs">
                  <p className="text-center font-bold">
                    Clear all synced Chat Workspace sessions from Firebase &amp; this browser?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearSyncedChats}
                      disabled={clearingChats}
                      className="flex-1 py-2 rounded-xl bg-red-600 text-white font-bold cursor-pointer disabled:opacity-50"
                    >
                      {clearingChats ? "Clearing..." : "Yes, Clear Chats"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearChats(false)}
                      className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className={`w-full py-2.5 px-4 rounded-xl bg-red-950/30 border border-red-950 hover:bg-red-950 hover:text-white hover:border-red-800 transition-all font-mono text-xs flex items-center justify-center gap-2 cursor-pointer ${isLight ? "text-[#000000]" : "text-white"}`}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Account & Erase Personal Data</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-red-950/90 border border-red-800 space-y-2 animate-[fadeIn_0.2s_ease]">
                  <p className="text-xs text-white font-mono text-center font-bold">
                    Are you absolutely sure? This will delete your profile, synced chats, and encrypted API key permanently.
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

