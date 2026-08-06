import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getThemeConfig } from "../lib/themeConfig";
import { Key, ExternalLink, ShieldCheck, AlertCircle, CheckCircle2, Lock, Eye, EyeOff, Sparkles, X } from "lucide-react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose?: () => void;
  canDismiss?: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, canDismiss = true }) => {
  const { idToken, refreshProfile, profile, currentTheme } = useAuth();
  const theme = getThemeConfig(currentTheme);
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [showKey, setShowKey] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setError("Please paste a valid Google AI API Key.");
      return;
    }

    if (!trimmed.startsWith("AIzaSy") && !trimmed.startsWith("AQ.")) {
      setError("Invalid format. Google AI Studio API Keys typically start with 'AIzaSy' or 'AQ.'. Please check your key.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/user/save-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ apiKey: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to validate and save API key.");
      }

      setSuccess(true);
      await refreshProfile();
      setTimeout(() => {
        setApiKeyInput("");
        if (onClose) onClose();
      }, 1200);
    } catch (err: any) {
      console.error("Save API Key Error:", err);
      setError(err.message || "An error occurred while testing and saving your API key.");
    } finally {
      setLoading(false);
    }
  };

  const isLight = currentTheme === "Pure Light";
  const modalBg = isLight ? "#ffffff" : "#0d111a";
  const modalTextColor = isLight ? "#0f172a" : "#f8fafc";

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto backdrop-blur-md ${isLight ? "bg-slate-200/80" : "bg-black/85"}`}>

      <div 
        className="w-full max-w-lg rounded-3xl p-6 sm:p-8 relative my-auto border transition-all duration-300" 
        style={{ 
          color: modalTextColor,
          backgroundColor: modalBg,
          borderColor: theme.accentColor,
          boxShadow: isLight
            ? "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            : `0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px ${theme.accentColor}40, 0 0 20px ${theme.accentColor}15`
        }}
      >
        {/* Close / Cross (X) Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2.5 rounded-2xl transition-transform duration-150 hover:scale-105 active:scale-90 z-10 cursor-pointer border"
            style={{ color: modalTextColor, backgroundColor: isLight ? "#f1f5f9" : "#1e293b", borderColor: isLight ? "#cbd5e1" : "rgba(255,255,255,0.2)" }}
            title="Cancel / Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Modal Header */}
        <div className="flex items-start gap-4 mb-6 relative z-10">
          <div className="p-3.5 rounded-2xl border shrink-0 shadow-lg flex items-center justify-center" style={{ backgroundColor: isLight ? "#ffffff" : "#1e293b", borderColor: `${theme.accentColor}60`, color: theme.accentColor }}>
            <Key className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold font-sans tracking-tight" style={{ color: theme.accentColor }}>
              {profile?.hasApiKey ? "Update Personal Google AI API Key" : "Set Up Your Personal Google AI API Key"}
            </h3>
            <p className="text-xs font-mono mt-1 leading-relaxed opacity-80" style={{ color: modalTextColor }}>
              Script Automation Studio operates strictly with your own personal Google AI Key. Your key is stored with AES-256 encryption and is never shared.
            </p>
          </div>
        </div>

        {/* Step-by-Step Box */}
        <div 
          className="mb-6 p-4 rounded-2xl border space-y-3 relative z-10" 
          style={{ 
            backgroundColor: isLight ? "#f8fafc" : "rgba(255,255,255,0.02)",
            borderColor: isLight ? "rgba(0,0,0,0.1)" : `${theme.accentColor}40` 
          }}
        >
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-semibold flex items-center gap-1.5" style={{ color: modalTextColor }}>
              <span className="w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] shadow-sm" style={{ backgroundColor: theme.accentColor, color: isLight ? "#ffffff" : "#000000" }}>1</span>
              Get your free API Key from Google AI Studio:
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all shadow-md cursor-pointer border hover:scale-105 active:scale-95"
              style={{
                backgroundColor: theme.accentColor,
                color: isLight ? "#ffffff" : "#000000",
                borderColor: `${theme.accentColor}80`
              }}
            >
              <span>Get API Key</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="pt-2 border-t text-xs font-mono opacity-80 flex items-center gap-1.5" style={{ borderColor: isLight ? "rgba(0,0,0,0.1)" : `${theme.accentColor}25`, color: modalTextColor }}>
            <span className="w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px]" style={{ backgroundColor: `${theme.accentColor}30`, color: theme.accentColor }}>2</span>
            <span>Paste your key below to validate and activate your studio.</span>
          </div>
        </div>

        {/* Feedback messages */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl border border-red-500/80 text-red-200 text-xs font-mono flex items-start gap-2.5 animate-[fadeIn_0.2s_ease]" style={{ backgroundColor: isLight ? "rgba(239,68,68,0.1)" : "rgba(127,29,29,0.4)", color: isLight ? "#b91c1c" : "#fca5a5", borderColor: "#ef4444" }}>
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <span className="flex-1 leading-snug">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 rounded-2xl border text-xs font-mono flex items-center gap-2.5 animate-[fadeIn_0.2s_ease]" style={{ backgroundColor: isLight ? "rgba(16,185,129,0.1)" : `${theme.accentColor}25`, borderColor: theme.accentColor, color: isLight ? "#059669" : modalTextColor }}>
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: theme.accentColor }} />
            <span className="font-bold">API Key validated and saved successfully!</span>
          </div>
        )}

        {/* Current Key Masked Display if existing */}
        {profile?.hasApiKey && profile.apiKeyMasked && (
          <div className="mb-4 px-4 py-3 rounded-2xl border text-xs font-mono flex items-center justify-between" style={{ borderColor: isLight ? "rgba(0,0,0,0.1)" : `${theme.accentColor}40`, backgroundColor: isLight ? "#f8fafc" : "rgba(0,0,0,0.2)" }}>
            <span className="opacity-80" style={{ color: modalTextColor }}>Current Saved Key:</span>
            <span className="font-bold" style={{ color: theme.accentColor }}>{profile.apiKeyMasked}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSaveKey} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-mono mb-2 font-medium opacity-80" style={{ color: modalTextColor }}>
              Google AI Studio API Key (AIzaSy... or AQ...)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 opacity-50" style={{ color: modalTextColor }} />
              <input
                type={showKey ? "text" : "password"}
                required
                placeholder="AIzaSy... or AQ..."
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setError(null);
                }}
                className={`w-full border rounded-2xl py-3 pl-10 pr-12 text-sm font-mono focus:outline-none transition-all ${isLight ? "bg-slate-50 text-black border-slate-200" : "bg-black/40 text-white border-white/10"}`}
                style={{
                  borderColor: isLight ? "rgba(0,0,0,0.15)" : `${theme.accentColor}40`,
                  color: modalTextColor
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3.5 top-3 opacity-60 hover:opacity-100 transition-colors p-1 cursor-pointer"
                style={{ color: modalTextColor }}
                title={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={`py-3.5 px-5 rounded-2xl border font-mono font-bold text-xs transition-all cursor-pointer ${isLight ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-black" : "bg-white/5 border-white/10 text-white hover:bg-white/10"}`}
                style={{
                  borderColor: isLight ? "rgba(0,0,0,0.1)" : `${theme.accentColor}40`,
                  color: modalTextColor
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !apiKeyInput.trim()}
              className="flex-1 py-3.5 px-4 rounded-2xl font-extrabold text-sm transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 border"
              style={{
                backgroundColor: theme.accentColor,
                color: isLight ? "#ffffff" : "#000000",
                borderColor: `${theme.accentColor}90`,
                boxShadow: `0 8px 30px ${theme.accentColor}40`
              }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Testing Key with Gemini API...</span>
                </div>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Validate & Save API Key</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security Assurance */}
        <div className="mt-6 pt-4 border-t text-[11px] font-mono opacity-60 flex items-center justify-center gap-1.5 relative z-10" style={{ borderColor: isLight ? "rgba(0,0,0,0.1)" : `${theme.accentColor}25`, color: modalTextColor }}>
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: theme.accentColor }} />
          <span>Encrypted with AES-256. Strictly tied to user ID {profile?.userId.slice(0, 8)}...</span>
        </div>
      </div>
    </div>
  );
};
