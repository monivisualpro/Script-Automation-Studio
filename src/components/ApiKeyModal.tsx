import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { getThemeConfig } from "../lib/themeConfig";
import {
  Key,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  X,
  Cpu,
  Server,
  Sparkles,
  Terminal,
  Copy,
  Check,
  Download,
  RefreshCw,
  Play,
  Square,
  FolderOpen,
  Zap,
  Loader2,
  Trash2,
} from "lucide-react";
import { useEscapeToClose } from "../lib/a11y";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose?: () => void;
  canDismiss?: boolean;
}

interface DetectedModelFile {
  fileName: string;
  relativePath: string;
  sizeBytes: number;
  sizeFormatted: string;
}

interface QwenCatalogItem {
  id: string;
  name: string;
  fileName: string;
  sizeLabel: string;
  ramRequirement: string;
  url: string;
  description: string;
}

interface EngineDownloadItem {
  id: string;
  label: string;
  description: string;
  url: string;
  recommendedFor: string;
}

interface EngineStartupProgress {
  phase: "idle" | "spawning" | "loading_model" | "creating_context" | "warming_up" | "ready" | "error";
  percent: number;
  stageLabel: string;
  latestLog: string | null;
}

interface LocalEngineStatus {
  rootDir: string;
  binDir: string;
  modelsDir: string;
  defaultModelsDir: string;
  customModelsDir: string | null;
  binaryFound: boolean;
  binaryPath: string | null;
  binaryName: string | null;
  models: DetectedModelFile[];
  processState: "stopped" | "starting" | "running" | "error";
  activePort: number;
  activeBaseUrl: string;
  activeModel: string | null;
  activeModelRelativePath?: string | null;
  computeMode: "gpu" | "cpu";
  gpuLayers: number;
  contextSize: number;
  lastError: string | null;
  startupProgress?: EngineStartupProgress;
  logs: string[];
  download: {
    active: boolean;
    fileName: string;
    downloadedBytes: number;
    totalBytes: number;
    percent: number;
    error: string | null;
    completedFile: string | null;
  };
  engineDownloads: EngineDownloadItem[];
  qwenCatalog: QwenCatalogItem[];
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const {
    currentTheme,
    currentBrand,
    envKeyStatus,
    refreshSystemMode,
    activeProviderConfig,
    updateProviderConfig,
    removeApiKey,
  } = useAuth();

  const theme = getThemeConfig(currentTheme, currentBrand);

  const [selectedProvider, setSelectedProvider] = useState<"gemini" | "openai" | "claude" | "local">(
    activeProviderConfig.provider || "gemini"
  );
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [saveToEnvFile, setSaveToEnvFile] = useState<boolean>(true);
  const [baseUrlInput, setBaseUrlInput] = useState<string>(
    activeProviderConfig.baseUrl || "http://127.0.0.1:1279/v1"
  );
  const [modelInput, setModelInput] = useState<string>(activeProviderConfig.model || "");
  const [showKey, setShowKey] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [copiedEnv, setCopiedEnv] = useState<boolean>(false);
  const [confirmRemoveKey, setConfirmRemoveKey] = useState<boolean>(false);
  const [removingKey, setRemovingKey] = useState<boolean>(false);
  const [removedMessage, setRemovedMessage] = useState<string | null>(null);

  // Built-in local engine state
  const [localSubMode, setLocalSubMode] = useState<"builtin" | "external">("builtin");
  const [engineStatus, setEngineStatus] = useState<LocalEngineStatus | null>(null);
  const [scanningEngine, setScanningEngine] = useState<boolean>(false);
  const [selectedGguf, setSelectedGguf] = useState<string>("");
  const [computeMode, setComputeMode] = useState<"gpu" | "cpu">("gpu");
  const [contextSize, setContextSize] = useState<number>(8192);
  const [enginePort, setEnginePort] = useState<number>(1279);
  const [customGgufUrl, setCustomGgufUrl] = useState<string>("");
  const [customModelsDirInput, setCustomModelsDirInput] = useState<string>("");
  const [savingModelsDir, setSavingModelsDir] = useState<boolean>(false);
  const [engineBusy, setEngineBusy] = useState<boolean>(false);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [activationStepLabel, setActivationStepLabel] = useState<string>("Testing & Activating...");
  const logsContainerRef = useRef<HTMLPreElement | null>(null);
  const isOpenRef = useRef<boolean>(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const fetchEngineStatus = useCallback(async (quiet = false): Promise<LocalEngineStatus | null> => {
    if (!quiet) setScanningEngine(true);
    try {
      const res = await fetch("/api/local-engine/status");
      if (res.ok) {
        const data: LocalEngineStatus = await res.json();
        setEngineStatus(data);
        if (!quiet) {
          setCustomModelsDirInput(data.customModelsDir || "");
        }
        if (data.models.length > 0) {
          setSelectedGguf((prev) =>
            prev && data.models.some((m) => m.relativePath === prev)
              ? prev
              : data.models[0].relativePath
          );
        } else {
          setSelectedGguf("");
        }
        if (data.processState === "running") {
          setEnginePort(data.activePort);
          setComputeMode(data.computeMode);
          setContextSize(data.contextSize);
        }
        if (data.processState === "error" && data.lastError) {
          setShowLogs(true);
        }
        return data;
      }
    } catch {
      // Ignore transient poll errors
    } finally {
      if (!quiet) setScanningEngine(false);
    }
    return null;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const safeProvider = activeProviderConfig.provider || "gemini";
    setSelectedProvider(safeProvider);
    setError(null);
    setSuccess(false);
    setConfirmRemoveKey(false);
    setRemovedMessage(null);

    if (safeProvider === "local") {
      const existingUrl = activeProviderConfig.baseUrl || "http://127.0.0.1:1279/v1";
      setBaseUrlInput(existingUrl);
      setModelInput(activeProviderConfig.model || "default");
      if (existingUrl.includes(":1234") || existingUrl.includes(":11434")) {
        setLocalSubMode("external");
      } else {
        setLocalSubMode("builtin");
      }
      void fetchEngineStatus();
    }
  }, [isOpen, activeProviderConfig, fetchEngineStatus]);

  useEffect(() => {
    if (isOpen && selectedProvider === "local" && !engineStatus) {
      void fetchEngineStatus();
    }
  }, [isOpen, selectedProvider, engineStatus, fetchEngineStatus]);

  // Poll engine status automatically while a model download or engine startup is active
  useEffect(() => {
    if (!isOpen || selectedProvider !== "local") return;
    const isStarting = engineStatus?.processState === "starting";
    const isDownloading = Boolean(engineStatus?.download?.active);
    if (!isStarting && !isDownloading) return;

    const timer = setInterval(() => {
      void fetchEngineStatus(true);
    }, isStarting ? 500 : 1000);
    return () => clearInterval(timer);
  }, [
    isOpen,
    selectedProvider,
    engineStatus?.download?.active,
    engineStatus?.processState,
    fetchEngineStatus,
  ]);

  // Keep latest llama-server log line visible while logs panel is open
  useEffect(() => {
    if (showLogs && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [showLogs, engineStatus?.logs]);

  useEscapeToClose(isOpen, onClose);

  if (!isOpen) return null;

  const handleStartBuiltInEngine = async (): Promise<LocalEngineStatus | null> => {
    if (!selectedGguf) {
      setError("Please select or download a Qwen .gguf model first.");
      return null;
    }
    setEngineBusy(true);
    setError(null);
    setShowLogs(true);
    setActivationStepLabel("Loading GGUF Model...");

    // Show immediate optimistic starting telemetry before first status poll
    setEngineStatus((prev) =>
      prev
        ? {
            ...prev,
            processState: "starting",
            activeModel: selectedGguf,
            lastError: null,
            startupProgress: {
              phase: "spawning",
              percent: 8,
              stageLabel: "Starting llama-server process...",
              latestLog: null,
            },
          }
        : prev
    );

    try {
      const res = await fetch("/api/local-engine/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelRelativePath: selectedGguf,
          computeMode,
          gpuLayers: computeMode === "gpu" ? 99 : 0,
          contextSize,
          port: enginePort,
          async: true,
        }),
      });
      const data = await res.json();
      if (data.status) setEngineStatus(data.status);
      if (!res.ok) {
        throw new Error(data.error || "Failed to start built-in llama-server engine.");
      }

      let latestStatus: LocalEngineStatus = data.status;
      const pollDeadline = Date.now() + 120000;

      while (latestStatus.processState === "starting" && Date.now() < pollDeadline) {
        if (!isOpenRef.current) {
          return null;
        }
        await new Promise((r) => setTimeout(r, 450));
        const polled = await fetchEngineStatus(true);
        if (polled) {
          latestStatus = polled;
        }
      }

      if (latestStatus.processState === "running") {
        setBaseUrlInput(latestStatus.activeBaseUrl);
        setModelInput(latestStatus.activeModel || selectedGguf);
        return latestStatus;
      }

      if (latestStatus.processState === "error" || latestStatus.processState === "stopped") {
        throw new Error(
          latestStatus.lastError ||
            "Built-in engine stopped during model loading. Inspect the Engine Logs below for details."
        );
      }

      throw new Error(
        "Model is taking longer than expected to load. Inspect the Engine Logs below or switch to a smaller model / CPU mode."
      );
    } catch (err: any) {
      setError(err.message || "Failed to start built-in local engine.");
      setShowLogs(true);
      return null;
    } finally {
      setEngineBusy(false);
    }
  };

  const handleStopBuiltInEngine = async () => {
    setEngineBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/local-engine/stop", { method: "POST" });
      const data = await res.json();
      if (data.status) setEngineStatus(data.status);
    } catch (err: any) {
      setError(err.message || "Failed to stop local engine.");
    } finally {
      setEngineBusy(false);
    }
  };

  const handleDownloadModel = async (url: string, fileName?: string) => {
    if (!url.trim()) {
      setError("Please paste a valid HTTPS .gguf download URL.");
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/local-engine/download-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), fileName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not start model download.");
      }
      await fetchEngineStatus();
    } catch (err: any) {
      setError(err.message || "Failed to start download.");
    }
  };

  const handleCancelDownload = async () => {
    try {
      const res = await fetch("/api/local-engine/cancel-download", { method: "POST" });
      const data = await res.json();
      if (data.status) setEngineStatus(data.status);
    } catch {}
  };

  const handleApplyModelsDir = async (directoryPath: string) => {
    setSavingModelsDir(true);
    setError(null);
    try {
      const res = await fetch("/api/local-engine/models-dir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directoryPath }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not set custom models folder.");
      }
      const nextStatus: LocalEngineStatus = data.status;
      setEngineStatus(nextStatus);
      setCustomModelsDirInput(nextStatus.customModelsDir || "");
      if (nextStatus.models.length > 0) {
        setSelectedGguf(nextStatus.models[0].relativePath);
      } else {
        setSelectedGguf("");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update models folder.");
    } finally {
      setSavingModelsDir(false);
    }
  };

  const handleSaveProviderConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    let trimmedKey = apiKeyInput.trim();
    if (
      (trimmedKey.startsWith('"') && trimmedKey.endsWith('"')) ||
      (trimmedKey.startsWith("'") && trimmedKey.endsWith("'"))
    ) {
      trimmedKey = trimmedKey.slice(1, -1).trim();
    }
    let effectiveBaseUrl = baseUrlInput.trim();
    let effectiveModel = modelInput.trim();

    if (selectedProvider !== "local" && !trimmedKey) {
      setError(`Please paste a valid ${selectedProvider.toUpperCase()} API Key.`);
      return;
    }

    setLoading(true);
    setActivationStepLabel("Testing & Activating...");
    try {
      if (selectedProvider === "local" && localSubMode === "builtin") {
        // Start built-in llama-server automatically if not already running with selected model
        let statusToUse = engineStatus;
        const modelMatches =
          statusToUse?.activeModelRelativePath === selectedGguf ||
          statusToUse?.activeModel === selectedGguf;
        if (!statusToUse || statusToUse.processState !== "running" || !modelMatches) {
          setActivationStepLabel("Loading GGUF Model...");
          statusToUse = await handleStartBuiltInEngine();
          if (!statusToUse || statusToUse.processState !== "running") {
            setLoading(false);
            return;
          }
        }
        setActivationStepLabel("Verifying Model Response...");
        effectiveBaseUrl = statusToUse.activeBaseUrl;
        effectiveModel = statusToUse.activeModel || selectedGguf || "default";
      } else if (selectedProvider === "local" && !effectiveBaseUrl) {
        setError("Please provide a valid Local Server URL (e.g. http://127.0.0.1:1234/v1).");
        setLoading(false);
        return;
      }

      const payload = {
        provider: selectedProvider,
        apiKey: trimmedKey,
        baseUrl: effectiveBaseUrl,
        model: effectiveModel,
        saveToEnv: saveToEnvFile,
      };

      const response = await fetch("/api/user/save-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to validate and save provider configuration.");
      }

      updateProviderConfig({
        provider: selectedProvider,
        apiKey: data.savedToEnvFile ? "" : trimmedKey,
        baseUrl: effectiveBaseUrl,
        model: effectiveModel,
      });

      setSuccess(true);
      await refreshSystemMode();
      setTimeout(() => {
        setApiKeyInput("");
        if (onClose) onClose();
      }, 1200);
    } catch (err: any) {
      console.error("Save Provider Config Error:", err);
      setError(err.message || "An error occurred while testing and saving your provider configuration.");
    } finally {
      setLoading(false);
    }
  };

  const copyEnvSnippet = () => {
    let envContent = `AI_PROVIDER=${selectedProvider}\n`;
    if (selectedProvider === "gemini") {
      envContent += `GEMINI_API_KEY=${apiKeyInput || "your_gemini_key_here"}\n`;
    } else if (selectedProvider === "openai") {
      envContent += `OPENAI_API_KEY=${apiKeyInput || "your_openai_key_here"}\n`;
    } else if (selectedProvider === "claude") {
      envContent += `ANTHROPIC_API_KEY=${apiKeyInput || "your_claude_key_here"}\n`;
    } else if (selectedProvider === "local") {
      const urlToCopy =
        localSubMode === "builtin"
          ? `http://127.0.0.1:${enginePort}/v1`
          : baseUrlInput || "http://127.0.0.1:1234/v1";
      const modelToCopy =
        localSubMode === "builtin" ? selectedGguf || "Qwen2.5-7B-Instruct-Q4_K_M.gguf" : modelInput || "default";
      envContent += `LOCAL_LLM_URL=${urlToCopy}\nLOCAL_LLM_MODEL=${modelToCopy}\n`;
    }

    navigator.clipboard.writeText(envContent);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const isLight = theme.isLight;
  const subtleBg = isLight ? "#F7F7F7" : "#111111";
  const borderCol = isLight ? "#E5E5E5" : "#2A2A2A";
  const mutedText = isLight ? "#333333" : "#CCCCCC";

  return (
    <div role="dialog" aria-modal="true" aria-label="Configure AI provider"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto backdrop-blur-md ${
        isLight ? "bg-black/30" : "bg-black/85"
      }`}
    >
      <div
        className={`w-full ${
          selectedProvider === "local" ? "max-w-2xl" : "max-w-xl"
        } rounded-3xl p-6 sm:p-8 relative my-auto border transition-all duration-300 ${
          isLight ? "border-[#E5E5E5] bg-[#FFFFFF] text-[#000000]" : "border-[#2A2A2A] bg-[#1A1A1A] text-white"
        }`}
      >
        {/* Close / Cross (X) Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`absolute top-5 right-5 p-2.5 rounded-xl border transition-all cursor-pointer z-10 ${
              isLight
                ? "bg-[#F7F7F7] border-[#E5E5E5] text-[#000000]"
                : "bg-[#111111] border-[#2A2A2A] text-white"
            }`}
            title="Cancel / Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Modal Header */}
        <div className="flex items-start gap-4 mb-6 relative z-10 pr-10">
          <div
            className={`p-3.5 rounded-2xl border shrink-0 flex items-center justify-center ${
              isLight ? "border-[#E5E5E5] bg-[#F7F7F7]" : "border-[#2A2A2A] bg-[#111111]"
            }`}
            style={{ color: theme.accentColor }}
          >
            <Key className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={`text-xl font-extrabold font-display tracking-tight ${
                  isLight ? "text-[#000000]" : "text-white"
                }`}
              >
                Configure AI Provider & Keys
              </h3>
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border"
                style={{
                  backgroundColor: `${theme.accentColor}15`,
                  borderColor: `${theme.accentColor}40`,
                  color: theme.textColorCode,
                }}
              >
                Desktop App (Win · Linux · macOS)
              </span>
            </div>
            <p className="text-xs font-sans mt-1 leading-relaxed" style={{ color: mutedText }}>
              Running 100% locally on your computer. Use personal cloud API keys stored in your local .env or run Qwen &amp; GGUF models completely offline with the Built-In Engine.
            </p>
          </div>
        </div>

        {/* Provider Tabs */}
        <div className="mb-5 relative z-10">
          <label className="block text-xs font-mono mb-2 font-bold" style={{ color: mutedText }}>
            SELECT ACTIVE AI ENGINE:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
            {/* 1. Gemini */}
            <button
              type="button"
              onClick={() => {
                setSelectedProvider("gemini");
                setError(null);
              }}
              className="p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all"
              style={{
                backgroundColor: selectedProvider === "gemini" ? `${theme.accentColor}20` : subtleBg,
                borderColor: selectedProvider === "gemini" ? theme.accentColor : borderCol,
                color: selectedProvider === "gemini" ? theme.textColorCode : mutedText,
              }}
            >
              <Sparkles
                className="h-4 w-4"
                style={selectedProvider === "gemini" ? { color: theme.accentColor } : undefined}
              />
              <span className="font-extrabold text-[11px]">Gemini</span>
            </button>

            {/* 2. OpenAI */}
            <button
              type="button"
              onClick={() => {
                setSelectedProvider("openai");
                setError(null);
              }}
              className="p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all"
              style={{
                backgroundColor: selectedProvider === "openai" ? `${theme.accentColor}20` : subtleBg,
                borderColor: selectedProvider === "openai" ? theme.accentColor : borderCol,
                color: selectedProvider === "openai" ? theme.textColorCode : mutedText,
              }}
            >
              <Cpu
                className="h-4 w-4"
                style={selectedProvider === "openai" ? { color: theme.accentColor } : undefined}
              />
              <span className="font-extrabold text-[11px]">OpenAI</span>
            </button>

            {/* 3. Claude */}
            <button
              type="button"
              onClick={() => {
                setSelectedProvider("claude");
                setError(null);
              }}
              className="p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all"
              style={{
                backgroundColor: selectedProvider === "claude" ? `${theme.accentColor}20` : subtleBg,
                borderColor: selectedProvider === "claude" ? theme.accentColor : borderCol,
                color: selectedProvider === "claude" ? theme.textColorCode : mutedText,
              }}
            >
              <ShieldCheck
                className="h-4 w-4"
                style={selectedProvider === "claude" ? { color: theme.accentColor } : undefined}
              />
              <span className="font-extrabold text-[11px]">Claude</span>
            </button>

            {/* 4. Local Built-In Engine */}
            <button
              type="button"
              onClick={() => {
                setSelectedProvider("local");
                setError(null);
              }}
              className="p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all"
              style={{
                backgroundColor: selectedProvider === "local" ? `${theme.accentColor}20` : subtleBg,
                borderColor: selectedProvider === "local" ? theme.accentColor : borderCol,
                color: selectedProvider === "local" ? theme.textColorCode : mutedText,
              }}
            >
              <Server
                className="h-4 w-4"
                style={selectedProvider === "local" ? { color: theme.accentColor } : undefined}
              />
              <span className="font-extrabold text-[11px]">Local Engine</span>
            </button>
          </div>
        </div>

        {/* Provider Guide Banner (only for cloud keys; Local Engine has dedicated setup panel below) */}
        {selectedProvider !== "local" && (
          <div
            className="mb-5 p-4 rounded-2xl border space-y-3 relative z-10"
            style={{ backgroundColor: subtleBg, borderColor: borderCol }}
          >
            {selectedProvider === "gemini" && (
              <div className="flex items-center justify-between gap-2 text-xs font-mono">
                <span className="font-semibold" style={{ color: theme.textColorCode }}>
                  Get an optional Gemini API Key (Google AI):
                </span>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border text-white shrink-0"
                  style={{
                    backgroundColor: theme.secondaryAccentColor,
                    borderColor: theme.secondaryAccentColor,
                  }}
                >
                  <span>Google Cloud Keys</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {selectedProvider === "openai" && (
              <div className="flex items-center justify-between gap-2 text-xs font-mono">
                <span className="font-semibold" style={{ color: theme.textColorCode }}>
                  Get your OpenAI API Key:
                </span>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border text-white shrink-0"
                  style={{
                    backgroundColor: theme.secondaryAccentColor,
                    borderColor: theme.secondaryAccentColor,
                  }}
                >
                  <span>OpenAI Keys</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {selectedProvider === "claude" && (
              <div className="flex items-center justify-between gap-2 text-xs font-mono">
                <span className="font-semibold" style={{ color: theme.textColorCode }}>
                  Get your Anthropic Claude API Key:
                </span>
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border text-white shrink-0"
                  style={{
                    backgroundColor: theme.secondaryAccentColor,
                    borderColor: theme.secondaryAccentColor,
                  }}
                >
                  <span>Claude Keys</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Feedback messages */}
        {error && (
          <div
            className="mb-4 p-3.5 rounded-2xl border text-xs font-mono flex items-start gap-2.5 animate-[fadeIn_0.2s_ease]"
            style={{
              borderColor: theme.accentColor,
              backgroundColor: `${theme.accentColor}1A`,
              color: theme.textColorCode,
            }}
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: theme.accentColor }} />
            <span className="flex-1 leading-snug">{error}</span>
          </div>
        )}

        {success && (
          <div
            className="mb-4 p-3.5 rounded-2xl border text-xs font-mono flex items-center gap-2.5 animate-[fadeIn_0.2s_ease]"
            style={{
              borderColor: theme.secondaryAccentColor,
              backgroundColor: `${theme.secondaryAccentColor}1A`,
              color: theme.textColorCode,
            }}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: theme.secondaryAccentColor }} />
            <span className="font-bold">Provider configuration tested and activated successfully!</span>
          </div>
        )}

        {removedMessage && (
          <div
            className="mb-4 p-3.5 rounded-2xl border text-xs font-mono flex items-center gap-2.5 animate-[fadeIn_0.2s_ease]"
            style={{
              borderColor: theme.secondaryAccentColor,
              backgroundColor: `${theme.secondaryAccentColor}1A`,
              color: theme.textColorCode,
            }}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: theme.secondaryAccentColor }} />
            <span className="font-bold">{removedMessage}</span>
          </div>
        )}

        {/* Saved Local Key Status */}
        {selectedProvider !== "local" && (() => {
          const envEntry =
            selectedProvider === "gemini"
              ? envKeyStatus?.gemini
              : selectedProvider === "openai"
              ? envKeyStatus?.openai
              : envKeyStatus?.claude;
          if (!envEntry?.configured && !activeProviderConfig.apiKey) return null;
          return (
            <div
              className="mb-4 px-4 py-3 rounded-2xl border text-xs font-mono space-y-2"
              style={{ backgroundColor: subtleBg, borderColor: `${theme.secondaryAccentColor}60` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span style={{ color: mutedText }}>Saved Local Key: </span>
                  <span className="font-bold" style={{ color: theme.textColorCode }}>
                    {envEntry?.masked || "Browser Key"}
                  </span>
                </div>
                {!confirmRemoveKey && (
                  <button
                    type="button"
                    onClick={() => setConfirmRemoveKey(true)}
                    className="px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:bg-red-500/15"
                    style={{ borderColor: `${theme.accentColor}65`, color: theme.accentColor }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Keys</span>
                  </button>
                )}
              </div>
              {confirmRemoveKey && (
                <div className="p-2.5 rounded-xl border bg-red-950/80 border-red-700 text-white space-y-2">
                  <p className="text-[11px]">Clear saved keys from local .env and browser storage?</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={removingKey}
                      onClick={async () => {
                        setRemovingKey(true);
                        const ok = await removeApiKey();
                        setRemovingKey(false);
                        setConfirmRemoveKey(false);
                        if (ok) {
                          setRemovedMessage("Local API keys cleared.");
                        } else {
                          setError("Failed to clear local API keys.");
                        }
                      }}
                      className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold text-[11px] cursor-pointer disabled:opacity-50"
                    >
                      {removingKey ? "Clearing..." : "Yes, Clear Keys"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveKey(false)}
                      className="px-3 py-1 rounded-lg bg-gray-800 text-gray-200 text-[11px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Form */}
        <form onSubmit={handleSaveProviderConfig} className="space-y-4 relative z-10">
          {selectedProvider !== "local" ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono mb-2 font-medium" style={{ color: mutedText }}>
                  {selectedProvider.toUpperCase()} API Key:
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4" style={{ color: mutedText }} />
                  <input
                    type={showKey ? "text" : "password"}
                    required
                    placeholder={
                      selectedProvider === "gemini"
                        ? "Paste AIzaSy... or AQ... key"
                        : selectedProvider === "openai"
                        ? "Paste sk-... key"
                        : "Paste sk-ant-... key"
                    }
                    value={apiKeyInput}
                    onChange={(e) => {
                      setApiKeyInput(e.target.value);
                      setError(null);
                    }}
                    className="w-full border rounded-2xl py-3 pl-10 pr-12 text-sm font-mono focus:outline-none transition-all"
                    style={{
                      backgroundColor: subtleBg,
                      borderColor: borderCol,
                      color: theme.textColorCode,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3.5 top-3 transition-colors p-1 cursor-pointer"
                    style={{ color: mutedText }}
                    title={showKey ? "Hide key" : "Show key"}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label
                className="flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer text-[11px] font-mono leading-relaxed"
                style={{ backgroundColor: subtleBg, borderColor: borderCol, color: theme.textColorCode }}
              >
                <input
                  type="checkbox"
                  checked={saveToEnvFile}
                  onChange={(e) => setSaveToEnvFile(e.target.checked)}
                  className="mt-0.5 cursor-pointer accent-current"
                  style={{ accentColor: theme.accentColor }}
                />
                <span>
                  Save directly to your local <code className="font-bold">.env</code> file (gitignored, stays private on this PC and keeps raw keys out of browser storage).
                </span>
              </label>
            </div>
          ) : (
            <div className="space-y-4 font-sans text-xs">
                {/* Local Engine Mode Switch: Built-In llama.cpp vs External Server */}
                <div
                  className="grid grid-cols-2 gap-2 p-1 rounded-2xl border"
                  style={{ backgroundColor: subtleBg, borderColor: borderCol }}
                >
                  <button
                    type="button"
                    onClick={() => setLocalSubMode("builtin")}
                    className="py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    style={{
                      backgroundColor: localSubMode === "builtin" ? theme.accentColor : "transparent",
                      color: localSubMode === "builtin" ? "#FFFFFF" : theme.textColorCode,
                    }}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span>Built-In Engine (llama.cpp + Qwen)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocalSubMode("external")}
                    className="py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    style={{
                      backgroundColor: localSubMode === "external" ? theme.accentColor : "transparent",
                      color: localSubMode === "external" ? "#FFFFFF" : theme.textColorCode,
                    }}
                  >
                    <Server className="h-3.5 w-3.5" />
                    <span>External (LM Studio / Ollama)</span>
                  </button>
                </div>

                {localSubMode === "builtin" ? (
                  <div className="space-y-3.5">
                    {/* Step 1: Engine Binary (local-engine/bin) */}
                    <div
                      className="p-3.5 rounded-2xl border space-y-2.5"
                      style={{ backgroundColor: subtleBg, borderColor: borderCol }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold" style={{ color: theme.textColorCode }}>
                          <FolderOpen className="h-4 w-4" style={{ color: theme.accentColor }} />
                          <span>1. Engine Binary (local-engine/bin)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-lg font-mono text-[11px] font-bold border ${
                              engineStatus?.binaryFound
                                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-500"
                                : "bg-amber-500/15 border-amber-500/40 text-amber-500"
                            }`}
                          >
                            {engineStatus?.binaryFound
                              ? `Found: ${engineStatus.binaryName}`
                              : "Binary Not Found"}
                          </span>
                          <button
                            type="button"
                            onClick={() => fetchEngineStatus()}
                            disabled={scanningEngine}
                            className="px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            style={{ borderColor: borderCol, color: theme.textColorCode }}
                            title="Rescan local-engine folders"
                          >
                            <RefreshCw className={`h-3 w-3 ${scanningEngine ? "animate-spin" : ""}`} />
                            <span>Scan</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] leading-relaxed" style={{ color: mutedText }}>
                        Download <strong>llama-b12202-bin-win-vulkan-x64.zip</strong> (for Windows GPU &amp; CPU) or your OS release from GitHub, extract all files inside the project folder{" "}
                        <code className="font-mono font-bold px-1 py-0.5 rounded bg-black/15">
                          local-engine/bin/
                        </code>
                        , then click <strong>Scan</strong>.
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {(engineStatus?.engineDownloads || [
                          {
                            id: "win-vulkan-b12202",
                            label: "Download llama-b12202-bin-win-vulkan-x64.zip",
                            url: "https://github.com/ggml-org/llama.cpp/releases/download/b12202/llama-b12202-bin-win-vulkan-x64.zip",
                            recommendedFor: "Windows Vulkan GPU+CPU",
                            description: "",
                          },
                          {
                            id: "all",
                            label: "All OS Releases (macOS / Linux / CPU)",
                            url: "https://github.com/ggml-org/llama.cpp/releases",
                            recommendedFor: "macOS / Linux",
                            description: "",
                          },
                        ]).map((item, idx) => (
                          <a
                            key={item.id}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[11px] border cursor-pointer"
                            style={{
                              backgroundColor: idx === 0 ? theme.secondaryAccentColor : "transparent",
                              borderColor: idx === 0 ? theme.secondaryAccentColor : borderCol,
                              color: idx === 0 ? "#FFFFFF" : theme.textColorCode,
                            }}
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>{item.label}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Step 2: Qwen / GGUF Model Selector + Direct Downloader */}
                    <div
                      className="p-3.5 rounded-2xl border space-y-3"
                      style={{ backgroundColor: subtleBg, borderColor: borderCol }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold" style={{ color: theme.textColorCode }}>
                          <Cpu className="h-4 w-4" style={{ color: theme.accentColor }} />
                          <span>2. Qwen / GGUF Model Folder</span>
                        </div>
                        <a
                          href="https://huggingface.co/models?search=Qwen+GGUF"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold underline"
                          style={{ color: theme.textColorCode }}
                        >
                          <span>Browse All Qwen GGUF</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      {/* Custom External Models Folder Path */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <label className="text-[11px] font-mono font-bold" style={{ color: mutedText }}>
                            Models Folder Directory (Default or External Drive Path):
                          </label>
                          {engineStatus?.customModelsDir && (
                            <span
                              className="text-[10px] font-mono px-2 py-0.5 rounded-lg border font-bold"
                              style={{ borderColor: theme.accentColor, color: theme.textColorCode }}
                            >
                              Custom Folder Active
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <input
                            type="text"
                            placeholder="Paste any folder path (e.g. D:\AI\Models or C:\Users\Name\.lmstudio\models)"
                            value={customModelsDirInput}
                            onChange={(e) => setCustomModelsDirInput(e.target.value)}
                            className="flex-1 min-w-[200px] border rounded-xl py-1.5 px-3 font-mono text-[11px] focus:outline-none"
                            style={{
                              backgroundColor: isLight ? "#FFFFFF" : "#181818",
                              borderColor: borderCol,
                              color: theme.textColorCode,
                            }}
                          />
                          <button
                            type="button"
                            disabled={savingModelsDir}
                            onClick={() => handleApplyModelsDir(customModelsDirInput)}
                            className="px-3 py-1.5 rounded-xl font-bold text-[11px] text-white cursor-pointer disabled:opacity-45 shrink-0"
                            style={{ backgroundColor: theme.secondaryAccentColor }}
                          >
                            {savingModelsDir ? "Scanning..." : "Use Folder"}
                          </button>
                          {engineStatus?.customModelsDir && (
                            <button
                              type="button"
                              disabled={savingModelsDir}
                              onClick={() => handleApplyModelsDir("")}
                              className="px-2.5 py-1.5 rounded-xl font-bold text-[11px] border cursor-pointer disabled:opacity-45 shrink-0"
                              style={{ borderColor: borderCol, color: theme.textColorCode }}
                              title="Switch back to project local-engine/models folder"
                            >
                              Reset Default
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] font-mono truncate" style={{ color: mutedText }} title={engineStatus?.modelsDir || "local-engine/models"}>
                          Active Folder: {engineStatus?.modelsDir || "local-engine/models"}
                        </p>
                      </div>

                      {engineStatus && engineStatus.models.length > 0 ? (
                        <div>
                          <label className="block text-[11px] font-mono mb-1" style={{ color: mutedText }}>
                            Detected .gguf Models ({engineStatus.models.length}):
                          </label>
                          <select
                            value={selectedGguf}
                            onChange={(e) => setSelectedGguf(e.target.value)}
                            className="w-full border rounded-xl py-2 px-3 text-xs font-mono font-bold focus:outline-none"
                            style={{
                              backgroundColor: isLight ? "#FFFFFF" : "#1A1A1A",
                              borderColor: borderCol,
                              color: theme.textColorCode,
                            }}
                          >
                            {engineStatus.models.map((m) => (
                              <option key={m.relativePath} value={m.relativePath}>
                                {m.relativePath} ({m.sizeFormatted})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="text-[11px] p-2.5 rounded-xl border border-dashed" style={{ borderColor: borderCol, color: mutedText }}>
                          No <code>.gguf</code> models found inside <code>{engineStatus?.customModelsDir || "local-engine/models/"}</code> yet. Paste your existing models folder above, click a 1-click Qwen download below, or copy any <code>.gguf</code> file into that folder.
                        </div>
                      )}

                      {/* Active Download Progress Bar */}
                      {engineStatus?.download?.active && (
                        <div className="p-2.5 rounded-xl border space-y-1.5" style={{ borderColor: theme.secondaryAccentColor }}>
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-bold truncate" style={{ color: theme.textColorCode }}>
                              Downloading {engineStatus.download.fileName}... ({engineStatus.download.percent}%)
                            </span>
                            <button
                              type="button"
                              onClick={handleCancelDownload}
                              className="px-2 py-0.5 rounded-lg border text-[10px] font-bold cursor-pointer"
                              style={{ borderColor: borderCol, color: theme.textColorCode }}
                            >
                              Cancel
                            </button>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden bg-black/20">
                            <div
                              className="h-full transition-all duration-300"
                              style={{
                                width: `${Math.max(4, engineStatus.download.percent)}%`,
                                backgroundColor: theme.secondaryAccentColor,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {engineStatus?.download?.error && (
                        <div className="text-[11px] font-mono" style={{ color: theme.accentColor }}>
                          Download status: {engineStatus.download.error}
                        </div>
                      )}

                      {/* Curated Qwen Quick-Download Grid */}
                      <div className="space-y-1.5">
                        <span className="block text-[11px] font-mono font-bold" style={{ color: mutedText }}>
                          1-Click Official Qwen GGUF Downloads:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(engineStatus?.qwenCatalog || []).map((qwen) => {
                            const installed = engineStatus?.models.some(
                              (m) => m.fileName.toLowerCase() === qwen.fileName.toLowerCase()
                            );
                            return (
                              <div
                                key={qwen.id}
                                className="p-2.5 rounded-xl border flex flex-col justify-between gap-2"
                                style={{
                                  backgroundColor: isLight ? "#FFFFFF" : "#181818",
                                  borderColor: borderCol,
                                }}
                              >
                                <div>
                                  <div className="font-bold text-[11px]" style={{ color: theme.textColorCode }}>
                                    {qwen.name}
                                  </div>
                                  <div className="text-[10px] font-mono" style={{ color: mutedText }}>
                                    {qwen.sizeLabel} · {qwen.ramRequirement}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={installed || engineStatus?.download?.active}
                                    onClick={() => handleDownloadModel(qwen.url, qwen.fileName)}
                                    className="flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 text-white"
                                    style={{
                                      backgroundColor: installed ? "#10b981" : theme.secondaryAccentColor,
                                    }}
                                  >
                                    <Download className="h-3 w-3" />
                                    <span>{installed ? "Downloaded" : "Download to Folder"}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom GGUF URL Downloader */}
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="Or paste any Hugging Face .gguf direct link (https://huggingface.co/.../model.gguf)"
                          value={customGgufUrl}
                          onChange={(e) => setCustomGgufUrl(e.target.value)}
                          className="flex-1 border rounded-xl py-2 px-3 font-mono text-[11px] focus:outline-none"
                          style={{
                            backgroundColor: isLight ? "#FFFFFF" : "#181818",
                            borderColor: borderCol,
                            color: theme.textColorCode,
                          }}
                        />
                        <button
                          type="button"
                          disabled={!customGgufUrl.trim() || engineStatus?.download?.active}
                          onClick={() => handleDownloadModel(customGgufUrl)}
                          className="px-3 py-2 rounded-xl font-bold text-[11px] text-white cursor-pointer disabled:opacity-45 shrink-0"
                          style={{ backgroundColor: theme.secondaryAccentColor }}
                        >
                          Download
                        </button>
                      </div>
                    </div>

                    {/* Step 3: GPU / CPU Settings & Engine Runner */}
                    <div
                      className="p-3.5 rounded-2xl border space-y-3"
                      style={{ backgroundColor: subtleBg, borderColor: borderCol }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-xs" style={{ color: theme.textColorCode }}>
                          3. Compute Mode (GPU / CPU) &amp; Engine Control
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                            engineStatus?.processState === "running"
                              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-500"
                              : engineStatus?.processState === "starting"
                              ? "bg-amber-500/15 border-amber-500/40 text-amber-500"
                              : engineStatus?.processState === "error"
                              ? "bg-red-500/15 border-red-500/40 text-red-500"
                              : "bg-zinc-500/15 border-zinc-500/30"
                          }`}
                          style={
                            engineStatus?.processState !== "running" &&
                            engineStatus?.processState !== "starting" &&
                            engineStatus?.processState !== "error"
                              ? { color: mutedText }
                              : undefined
                          }
                        >
                          {engineStatus?.processState === "running"
                            ? `Running on 127.0.0.1:${engineStatus.activePort}`
                            : engineStatus?.processState === "starting"
                            ? `Loading (${engineStatus.startupProgress?.percent ?? 10}%)...`
                            : engineStatus?.processState === "error"
                            ? "Startup Error"
                            : "Engine Stopped"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* GPU vs CPU Mode */}
                        <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setComputeMode("gpu")}
                            className="py-2 px-3 rounded-xl border text-[11px] font-bold cursor-pointer"
                            style={{
                              backgroundColor: computeMode === "gpu" ? `${theme.accentColor}20` : "transparent",
                              borderColor: computeMode === "gpu" ? theme.accentColor : borderCol,
                              color: theme.textColorCode,
                            }}
                          >
                            GPU + CPU (Vulkan)
                          </button>
                          <button
                            type="button"
                            onClick={() => setComputeMode("cpu")}
                            className="py-2 px-3 rounded-xl border text-[11px] font-bold cursor-pointer"
                            style={{
                              backgroundColor: computeMode === "cpu" ? `${theme.accentColor}20` : "transparent",
                              borderColor: computeMode === "cpu" ? theme.accentColor : borderCol,
                              color: theme.textColorCode,
                            }}
                          >
                            CPU Only (-ngl 0)
                          </button>
                        </div>

                        {/* Context Size */}
                        <select
                          value={contextSize}
                          onChange={(e) => setContextSize(Number(e.target.value))}
                          className="border rounded-xl py-2 px-2.5 font-mono text-[11px] font-bold"
                          style={{
                            backgroundColor: isLight ? "#FFFFFF" : "#181818",
                            borderColor: borderCol,
                            color: theme.textColorCode,
                          }}
                          title="Context window size"
                        >
                          <option value={4096}>Context: 4096</option>
                          <option value={8192}>Context: 8192</option>
                          <option value={16384}>Context: 16384</option>
                        </select>
                      </div>

                      {/* Real-time Model Loading Progress & Diagnostics */}
                      {(engineBusy ||
                        engineStatus?.processState === "starting" ||
                        engineStatus?.processState === "error" ||
                        (engineStatus?.processState === "running" && engineStatus?.startupProgress)) && (
                        <div
                          className="p-3 rounded-xl border space-y-2"
                          style={{
                            backgroundColor: isLight ? "#FFFFFF" : "#141414",
                            borderColor:
                              engineStatus?.processState === "error"
                                ? theme.accentColor
                                : engineStatus?.processState === "running"
                                ? "#10b98160"
                                : theme.secondaryAccentColor,
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                            <div className="flex items-center gap-2 min-w-0">
                              {engineStatus?.processState === "running" ? (
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                              ) : engineStatus?.processState === "error" ? (
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" style={{ color: theme.accentColor }} />
                              ) : (
                                <Loader2
                                  className="h-3.5 w-3.5 shrink-0 animate-spin"
                                  style={{ color: theme.secondaryAccentColor }}
                                />
                              )}
                              <span className="font-bold truncate" style={{ color: theme.textColorCode }}>
                                {engineStatus?.startupProgress?.stageLabel ||
                                  (engineStatus?.processState === "running"
                                    ? `Model loaded and ready (${engineStatus.activeModel})`
                                    : "Loading model weights...")}
                              </span>
                            </div>
                            <span className="font-bold shrink-0" style={{ color: theme.textColorCode }}>
                              {engineStatus?.processState === "running"
                                ? "100%"
                                : `${engineStatus?.startupProgress?.percent ?? 8}%`}
                            </span>
                          </div>

                          <div
                            className="w-full h-2 rounded-full overflow-hidden"
                            style={{ backgroundColor: isLight ? "#EAEAEA" : "#262626" }}
                          >
                            <div
                              className="h-full transition-all duration-300 rounded-full"
                              style={{
                                width: `${
                                  engineStatus?.processState === "running"
                                    ? 100
                                    : Math.max(6, engineStatus?.startupProgress?.percent ?? 8)
                                }%`,
                                backgroundColor:
                                  engineStatus?.processState === "error"
                                    ? theme.accentColor
                                    : engineStatus?.processState === "running"
                                    ? "#10b981"
                                    : theme.secondaryAccentColor,
                              }}
                            />
                          </div>

                          {engineStatus?.startupProgress?.latestLog && engineStatus.processState !== "error" && (
                            <p
                              className="text-[10px] font-mono truncate"
                              style={{ color: mutedText }}
                              title={engineStatus.startupProgress.latestLog}
                            >
                              {engineStatus.startupProgress.latestLog}
                            </p>
                          )}

                          {engineStatus?.processState === "error" && engineStatus.lastError && (
                            <div
                              className="p-2 rounded-lg border text-[11px] font-mono leading-snug flex items-start gap-2"
                              style={{
                                borderColor: theme.accentColor,
                                backgroundColor: `${theme.accentColor}15`,
                                color: theme.textColorCode,
                              }}
                            >
                              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: theme.accentColor }} />
                              <span>{engineStatus.lastError}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        {engineStatus?.processState === "running" ? (
                          <button
                            type="button"
                            onClick={handleStopBuiltInEngine}
                            disabled={engineBusy}
                            className="px-3.5 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                            style={{ borderColor: theme.accentColor, color: theme.textColorCode }}
                          >
                            <Square className="h-3.5 w-3.5" style={{ color: theme.accentColor }} />
                            <span>Stop Engine</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleStartBuiltInEngine}
                            disabled={engineBusy || !engineStatus?.binaryFound || !selectedGguf}
                            className="px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer text-white disabled:opacity-45"
                            style={{ backgroundColor: theme.secondaryAccentColor }}
                          >
                            {engineBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                            <span>
                              {engineBusy
                                ? `Loading Model (${engineStatus?.startupProgress?.percent ?? 8}%)...`
                                : "Start Engine"}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setShowLogs((v) => !v)}
                          className="px-3 py-2 rounded-xl border text-[11px] font-mono cursor-pointer"
                          style={{ borderColor: borderCol, color: mutedText }}
                        >
                          {showLogs ? "Hide Logs" : "Show Engine Logs"}
                        </button>
                      </div>

                      {showLogs && engineStatus && (
                        <pre
                          ref={logsContainerRef}
                          className="p-2.5 rounded-xl border font-mono text-[10px] max-h-36 overflow-y-auto whitespace-pre-wrap"
                          style={{
                            backgroundColor: isLight ? "#FFFFFF" : "#0B0B0B",
                            borderColor: borderCol,
                            color: mutedText,
                          }}
                        >
                          {engineStatus.logs.length > 0
                            ? engineStatus.logs.join("\n")
                            : "Waiting for llama-server startup output..."}
                        </pre>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 font-mono text-xs">
                    <p className="text-[11px] font-sans leading-relaxed" style={{ color: mutedText }}>
                      Connect to an already-running local OpenAI-compatible server such as <strong>LM Studio</strong> (<code>http://127.0.0.1:1234/v1</code>) or <strong>Ollama</strong> (<code>http://127.0.0.1:11434/v1</code>).
                    </p>
                    <div>
                      <label className="block mb-1 font-medium" style={{ color: mutedText }}>
                        Local Base Server URL:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="http://127.0.0.1:1234/v1"
                        value={baseUrlInput}
                        onChange={(e) => setBaseUrlInput(e.target.value)}
                        className="w-full border rounded-2xl py-2.5 px-3.5 font-mono text-xs focus:outline-none"
                        style={{
                          backgroundColor: subtleBg,
                          borderColor: borderCol,
                          color: theme.textColorCode,
                        }}
                      />
                    </div>

                    <div>
                      <label className="block mb-1 font-medium" style={{ color: mutedText }}>
                        Model Name (LM Studio / Ollama model tag):
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. qwen2.5:7b, llama-3.3, deepseek-r1, default"
                        value={modelInput}
                        onChange={(e) => setModelInput(e.target.value)}
                        className="w-full border rounded-2xl py-2.5 px-3.5 font-mono text-xs focus:outline-none"
                        style={{
                          backgroundColor: subtleBg,
                          borderColor: borderCol,
                          color: theme.textColorCode,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
          )}

          {selectedProvider === "local" && error && (
            <div
              className="p-3 rounded-2xl border text-xs font-mono flex items-start gap-2.5 animate-[fadeIn_0.2s_ease]"
              style={{
                borderColor: theme.accentColor,
                backgroundColor: `${theme.accentColor}1A`,
                color: theme.textColorCode,
              }}
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: theme.accentColor }} />
              <span className="flex-1 leading-snug">{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="py-3.5 px-5 rounded-2xl border font-mono font-bold text-xs transition-all cursor-pointer"
                style={{ backgroundColor: subtleBg, borderColor: borderCol, color: mutedText }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={
                loading ||
                engineBusy ||
                (selectedProvider !== "local" && !apiKeyInput.trim()) ||
                (selectedProvider === "local" &&
                  localSubMode === "builtin" &&
                  (!engineStatus?.binaryFound || !selectedGguf))
              }
              className="flex-1 py-3.5 px-4 rounded-2xl font-extrabold text-sm transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2 text-white border disabled:opacity-50"
              style={{ backgroundColor: theme.accentColor, borderColor: theme.accentColor }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{activationStepLabel}</span>
                </div>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {selectedProvider === "local" && localSubMode === "builtin"
                      ? "Start & Activate Built-In Engine"
                      : "Activate & Save Provider"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Copy local .env snippet */}
        <div
          className="mt-6 pt-4 border-t font-mono text-xs flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10"
          style={{ borderColor: borderCol, color: mutedText }}
        >
          <div className="flex items-center gap-1.5 text-[11px]">
            <Terminal className="h-3.5 w-3.5 shrink-0" style={{ color: theme.secondaryAccentColor }} />
            <span>Local .env Config Snippet:</span>
          </div>
          <button
            type="button"
            onClick={copyEnvSnippet}
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              copiedEnv ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/40" : ""
            }`}
            style={!copiedEnv ? { backgroundColor: subtleBg, borderColor: borderCol, color: theme.textColorCode } : undefined}
          >
            {copiedEnv ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedEnv ? "Copied .env Snippet!" : "Copy .env File Config"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
