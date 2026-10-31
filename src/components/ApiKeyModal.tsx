import React, { useState, useEffect } from "react";
import { useAuth, ActiveProviderConfig } from "../context/AuthContext";
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
  Check
} from "lucide-react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose?: () => void;
  canDismiss?: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, canDismiss = true }) => {
  const { 
    idToken, 
    refreshProfile, 
    profile, 
    currentTheme, 
    currentBrand, 
    isStandalone,
    activeProviderConfig,
    updateProviderConfig 
  } = useAuth();
  
  const theme = getThemeConfig(currentTheme, currentBrand);

  const [selectedProvider, setSelectedProvider] = useState<"gemini" | "openai" | "claude" | "local">(
    (profile?.activeProvider as any) || activeProviderConfig.provider || "gemini"
  );
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [baseUrlInput, setBaseUrlInput] = useState<string>(activeProviderConfig.baseUrl || "http://localhost:1234/v1");
  const [modelInput, setModelInput] = useState<string>(activeProviderConfig.model || "");
  const [showKey, setShowKey] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [copiedEnv, setCopiedEnv] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const currentProvider = (profile?.activeProvider as any) || activeProviderConfig.provider || "gemini";
      setSelectedProvider(currentProvider);
      if (currentProvider === "local") {
        setBaseUrlInput(profile?.baseUrl || activeProviderConfig.baseUrl || "http://localhost:1234/v1");
        setModelInput(profile?.activeModel || activeProviderConfig.model || "default");
      }
    }
  }, [isOpen, profile, activeProviderConfig]);

  if (!isOpen) return null;

  const handleSaveProviderConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmedKey = apiKeyInput.trim();
    const trimmedBaseUrl = baseUrlInput.trim();
    const trimmedModel = modelInput.trim();

    if (selectedProvider !== "local" && !trimmedKey) {
      setError(`Please paste a valid ${selectedProvider.toUpperCase()} API Key.`);
      return;
    }

    if (selectedProvider === "local" && !trimmedBaseUrl) {
      setError("Please provide a valid Local Server URL (e.g. http://localhost:1234/v1).");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        provider: selectedProvider,
        apiKey: trimmedKey,
        baseUrl: trimmedBaseUrl,
        model: trimmedModel,
      };

      const response = await fetch("/api/user/save-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: idToken ? `Bearer ${idToken}` : "Bearer standalone_local",
          "x-standalone-mode": isStandalone ? "true" : "false",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to validate and save provider configuration.");
      }

      // Update local provider context state
      updateProviderConfig({
        provider: selectedProvider,
        apiKey: trimmedKey,
        baseUrl: trimmedBaseUrl,
        model: trimmedModel,
      });

      setSuccess(true);
      await refreshProfile();
      setTimeout(() => {
        setApiKeyInput("");
        if (onClose) onClose();
      }, 1300);
    } catch (err: any) {
      console.error("Save Provider Config Error:", err);
      setError(err.message || "An error occurred while testing and saving your provider configuration.");
    } finally {
      setLoading(false);
    }
  };

  const copyEnvSnippet = () => {
    let envContent = `STANDALONE_MODE=true\nAI_PROVIDER=${selectedProvider}\n`;
    if (selectedProvider === "gemini") {
      envContent += `GEMINI_API_KEY=${apiKeyInput || "your_gemini_key_here"}\n`;
    } else if (selectedProvider === "openai") {
      envContent += `OPENAI_API_KEY=${apiKeyInput || "your_openai_key_here"}\n`;
    } else if (selectedProvider === "claude") {
      envContent += `ANTHROPIC_API_KEY=${apiKeyInput || "your_claude_key_here"}\n`;
    } else if (selectedProvider === "local") {
      envContent += `LOCAL_LLM_URL=${baseUrlInput || "http://localhost:1234/v1"}\nLOCAL_LLM_MODEL=${modelInput || "default"}\n`;
    }

    navigator.clipboard.writeText(envContent);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const isLight = theme.isLight;
  const modalBg = isLight ? "#FFFFFF" : "#1A1A1A";
  const modalTextColor = isLight ? "#000000" : "#FFFFFF";

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto backdrop-blur-md ${isLight ? "bg-black/30" : "bg-black/85"}`}>
      <div 
        className={`w-full max-w-xl rounded-3xl p-6 sm:p-8 relative my-auto border transition-all duration-300 ${
          isLight ? "border-[#E5E5E5] bg-[#FFFFFF] text-[#000000]" : "border-[#2A2A2A] bg-[#1A1A1A] text-white"
        }`}
      >
        {/* Close / Cross (X) Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={`absolute top-5 right-5 p-2.5 rounded-xl border transition-all cursor-pointer z-10 ${
              theme.isLight 
                ? "bg-[#F7F7F7] border-[#E5E5E5] text-[#000000]" 
                : "bg-[#111111] border-[#2A2A2A] text-white"
            }`}
            title="Cancel / Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Modal Header */}
        <div className="flex items-start gap-4 mb-6 relative z-10">
          <div 
            className={`p-3.5 rounded-2xl border shrink-0 flex items-center justify-center ${
              theme.isLight ? "border-[#E5E5E5] bg-[#F7F7F7]" : "border-[#2A2A2A] bg-[#111111]"
            }`}
            style={{ color: theme.accentColor }}
          >
            <Key className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-xl font-extrabold font-sans tracking-tight ${
                theme.isLight ? "text-[#000000]" : "text-white"
              }`}>
                Configure AI Provider & Keys
              </h3>
              {isStandalone && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Desktop PC / Local Mode
                </span>
              )}
            </div>
            <p className={`text-xs font-mono mt-1 leading-relaxed ${
              theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"
            }`}>
              {isStandalone
                ? "Running locally on your desktop. Your provider keys are stored in browser localStorage or your .env file."
                : "Online Cloud Web App. Your keys are encrypted with AES-256 and saved directly to your personal user account in Firestore."}
            </p>
          </div>
        </div>

        {/* Provider Tabs */}
        <div className="mb-6 relative z-10">
          <label className={`block text-xs font-mono mb-2 font-bold ${
            theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"
          }`}>
            SELECT ACTIVE AI ENGINE:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
            {/* 1. Gemini */}
            <button
              type="button"
              onClick={() => { setSelectedProvider("gemini"); setError(null); }}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                selectedProvider === "gemini"
                  ? "border hover:scale-102 shadow-lg"
                  : isLight ? "bg-[#F7F7F7] border-[#E5E5E5] text-[#444444]" : "bg-[#111111] border-[#2A2A2A] text-[#BDBDBD]"
              }`}
              style={{
                backgroundColor: selectedProvider === "gemini" ? `${theme.accentColor}20` : undefined,
                borderColor: selectedProvider === "gemini" ? theme.accentColor : undefined,
                color: selectedProvider === "gemini" ? theme.accentColor : undefined,
              }}
            >
              <Sparkles className="h-4 w-4" />
              <span className="font-extrabold text-[11px]">Gemini</span>
            </button>

            {/* 2. OpenAI */}
            <button
              type="button"
              onClick={() => { setSelectedProvider("openai"); setError(null); }}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                selectedProvider === "openai"
                  ? "border hover:scale-102 shadow-lg"
                  : isLight ? "bg-[#F7F7F7] border-[#E5E5E5] text-[#444444]" : "bg-[#111111] border-[#2A2A2A] text-[#BDBDBD]"
              }`}
              style={{
                backgroundColor: selectedProvider === "openai" ? `${theme.accentColor}20` : undefined,
                borderColor: selectedProvider === "openai" ? theme.accentColor : undefined,
                color: selectedProvider === "openai" ? theme.accentColor : undefined,
              }}
            >
              <Cpu className="h-4 w-4" />
              <span className="font-extrabold text-[11px]">OpenAI</span>
            </button>

            {/* 3. Claude */}
            <button
              type="button"
              onClick={() => { setSelectedProvider("claude"); setError(null); }}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                selectedProvider === "claude"
                  ? "border hover:scale-102 shadow-lg"
                  : isLight ? "bg-[#F7F7F7] border-[#E5E5E5] text-[#444444]" : "bg-[#111111] border-[#2A2A2A] text-[#BDBDBD]"
              }`}
              style={{
                backgroundColor: selectedProvider === "claude" ? `${theme.accentColor}20` : undefined,
                borderColor: selectedProvider === "claude" ? theme.accentColor : undefined,
                color: selectedProvider === "claude" ? theme.accentColor : undefined,
              }}
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="font-extrabold text-[11px]">Claude</span>
            </button>

            {/* 4. Local Models */}
            <button
              type="button"
              onClick={() => { setSelectedProvider("local"); setError(null); }}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                selectedProvider === "local"
                  ? "border hover:scale-102 shadow-lg"
                  : isLight ? "bg-[#F7F7F7] border-[#E5E5E5] text-[#444444]" : "bg-[#111111] border-[#2A2A2A] text-[#BDBDBD]"
              }`}
              style={{
                backgroundColor: selectedProvider === "local" ? `${theme.accentColor}20` : undefined,
                borderColor: selectedProvider === "local" ? theme.accentColor : undefined,
                color: selectedProvider === "local" ? theme.accentColor : undefined,
              }}
            >
              <Server className="h-4 w-4" />
              <span className="font-extrabold text-[11px]">Local LLM</span>
            </button>
          </div>
        </div>

        {/* Step-by-Step Box / External Link */}
        <div 
          className={`mb-6 p-4 rounded-2xl border space-y-3 relative z-10 ${
            theme.isLight ? "border-[#E5E5E5] bg-[#F7F7F7]" : "border-[#2A2A2A] bg-[#111111]"
          }`}
        >
          {selectedProvider === "gemini" && (
            <div className="flex items-center justify-between text-xs font-mono">
              <span className={`font-semibold flex items-center gap-1.5 ${
                theme.isLight ? "text-[#000000]" : "text-white"
              }`}>
                <span>Get your free Gemini Key from Google AI Studio:</span>
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border text-white shrink-0"
                style={{ backgroundColor: theme.secondaryAccentColor, borderColor: theme.secondaryAccentColor }}
              >
                <span>Google AI Keys</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {selectedProvider === "openai" && (
            <div className="flex items-center justify-between text-xs font-mono">
              <span className={`font-semibold flex items-center gap-1.5 ${
                theme.isLight ? "text-[#000000]" : "text-white"
              }`}>
                <span>Get your OpenAI API Key:</span>
              </span>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border text-white shrink-0"
                style={{ backgroundColor: theme.secondaryAccentColor, borderColor: theme.secondaryAccentColor }}
              >
                <span>OpenAI Keys</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {selectedProvider === "claude" && (
            <div className="flex items-center justify-between text-xs font-mono">
              <span className={`font-semibold flex items-center gap-1.5 ${
                theme.isLight ? "text-[#000000]" : "text-white"
              }`}>
                <span>Get your Anthropic Claude API Key:</span>
              </span>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border text-white shrink-0"
                style={{ backgroundColor: theme.secondaryAccentColor, borderColor: theme.secondaryAccentColor }}
              >
                <span>Claude Keys</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {selectedProvider === "local" && (
            <div className="text-xs font-mono space-y-1">
              <div className="font-bold flex items-center gap-1.5" style={{ color: theme.accentColor }}>
                <Server className="h-4 w-4" />
                <span>Local Offline LLM Setup (LM Studio / Ollama / Bionic)</span>
              </div>
              <p className={`text-[11px] leading-relaxed ${
                theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"
              }`}>
                Runs 100% offline on your own GPU at $0 cost. Make sure your local server is running (LM Studio: http://localhost:1234/v1, Ollama: http://localhost:11434/v1).
              </p>
            </div>
          )}
        </div>

        {/* Feedback messages */}
        {error && (
          <div 
            className="mb-5 p-3.5 rounded-2xl border text-xs font-mono flex items-start gap-2.5 animate-[fadeIn_0.2s_ease]"
            style={{ borderColor: theme.accentColor, backgroundColor: `${theme.accentColor}1A`, color: theme.accentColor }}
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: theme.accentColor }} />
            <span className="flex-1 leading-snug">{error}</span>
          </div>
        )}

        {success && (
          <div 
            className="mb-5 p-3.5 rounded-2xl border text-xs font-mono flex items-center gap-2.5 animate-[fadeIn_0.2s_ease]"
            style={{ borderColor: theme.secondaryAccentColor, backgroundColor: `${theme.secondaryAccentColor}1A`, color: theme.secondaryAccentColor }}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: theme.secondaryAccentColor }} />
            <span className="font-bold">Provider configuration tested and activated successfully!</span>
          </div>
        )}

        {/* Current Key Masked Display if existing */}
        {profile?.hasApiKey && profile.apiKeyMasked && (
          <div className={`mb-4 px-4 py-2.5 rounded-2xl border text-xs font-mono flex items-center justify-between ${
            theme.isLight ? "border-[#E5E5E5] bg-[#F7F7F7]" : "border-[#2A2A2A] bg-[#111111]"
          }`}>
            <span className={theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"}>Current Active Key/Endpoint:</span>
            <span className="font-bold" style={{ color: theme.secondaryAccentColor }}>{profile.apiKeyMasked}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSaveProviderConfig} className="space-y-4 relative z-10">
          {selectedProvider !== "local" ? (
            <div>
              <label className={`block text-xs font-mono mb-2 font-medium ${
                theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"
              }`}>
                {selectedProvider.toUpperCase()} API Key:
              </label>
              <div className="relative">
                <Lock className={`absolute left-3.5 top-3.5 h-4 w-4 ${
                  theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"
                }`} />
                <input
                  type={showKey ? "text" : "password"}
                  required
                  placeholder={
                    selectedProvider === "gemini" ? "Paste AIzaSy... or AQ... key" :
                    selectedProvider === "openai" ? "Paste sk-... key" : "Paste sk-ant-... key"
                  }
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    setError(null);
                  }}
                  className={`w-full border rounded-2xl py-3 pl-10 pr-12 text-sm font-mono focus:outline-none transition-all ${
                    theme.isLight 
                      ? "border-[#E5E5E5] bg-[#F7F7F7] text-[#000000]" 
                      : "border-[#2A2A2A] bg-[#111111] text-white"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className={`absolute right-3.5 top-3 transition-colors p-1 cursor-pointer ${
                    theme.isLight ? "text-[#444444] hover:text-[#000000]" : "text-[#BDBDBD] hover:text-white"
                  }`}
                  title={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className={`block mb-1 font-medium ${theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                  Local Base Server URL:
                </label>
                <input
                  type="text"
                  required
                  placeholder="http://localhost:1234/v1"
                  value={baseUrlInput}
                  onChange={(e) => setBaseUrlInput(e.target.value)}
                  className={`w-full border rounded-2xl py-2.5 px-3.5 font-mono text-xs focus:outline-none ${
                    theme.isLight ? "border-[#E5E5E5] bg-[#F7F7F7] text-[#000000]" : "border-[#2A2A2A] bg-[#111111] text-white"
                  }`}
                />
              </div>

              <div>
                <label className={`block mb-1 font-medium ${theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                  Model Name (LM Studio / Ollama model tag):
                </label>
                <input
                  type="text"
                  placeholder="e.g. llama-3.3-70b, deepseek-r1, qwen-2.5, default"
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  className={`w-full border rounded-2xl py-2.5 px-3.5 font-mono text-xs focus:outline-none ${
                    theme.isLight ? "border-[#E5E5E5] bg-[#F7F7F7] text-[#000000]" : "border-[#2A2A2A] bg-[#111111] text-white"
                  }`}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={`py-3.5 px-5 rounded-2xl border font-mono font-bold text-xs transition-all cursor-pointer ${
                  theme.isLight 
                    ? "border-[#E5E5E5] bg-[#F7F7F7] text-[#444444] hover:text-[#000000]" 
                    : "border-[#2A2A2A] bg-[#111111] text-[#BDBDBD] hover:text-white"
                }`}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || (selectedProvider !== "local" && !apiKeyInput.trim())}
              className="flex-1 py-3.5 px-4 rounded-2xl font-extrabold text-sm transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2 text-white border disabled:opacity-50"
              style={{ backgroundColor: theme.accentColor, borderColor: theme.accentColor }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Testing Connection...</span>
                </div>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Activate & Save Provider</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Copy .env tool for desktop repo clone */}
        <div className={`mt-6 pt-4 border-t font-mono text-xs flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10 ${
          theme.isLight ? "border-[#E5E5E5] text-[#444444]" : "border-[#2A2A2A] text-[#BDBDBD]"
        }`}>
          <div className="flex items-center gap-1.5 text-[11px]">
            <Terminal className="h-3.5 w-3.5 shrink-0" style={{ color: theme.secondaryAccentColor }} />
            <span>GitHub Desktop Repo Snippet:</span>
          </div>
          <button
            type="button"
            onClick={copyEnvSnippet}
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              copiedEnv 
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" 
                : theme.isLight ? "bg-[#F7F7F7] border-[#E5E5E5] text-[#000000]" : "bg-[#111111] border-[#2A2A2A] text-white"
            }`}
          >
            {copiedEnv ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedEnv ? "Copied .env Snippet!" : "Copy .env File Config"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
