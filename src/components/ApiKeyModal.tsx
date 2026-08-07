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
  const { idToken, refreshProfile, profile, currentTheme, currentBrand } = useAuth();
  const theme = getThemeConfig(currentTheme, currentBrand);
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

    if (trimmed.length < 10) {
      setError("Invalid format. Please paste a valid key or token from Google AI Studio.");
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

  const isLight = theme.isLight;
  const modalBg = isLight ? "#FFFFFF" : "#1A1A1A";
  const modalTextColor = isLight ? "#000000" : "#FFFFFF";

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto backdrop-blur-md ${isLight ? "bg-black/30" : "bg-black/85"}`}>
      <div 
        className={`w-full max-w-lg rounded-2xl p-6 sm:p-8 relative my-auto border transition-all duration-300 ${
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
            <h3 className={`text-xl font-extrabold font-sans tracking-tight ${
              theme.isLight ? "text-[#000000]" : "text-white"
            }`}>
              {profile?.hasApiKey ? "Update Personal Google AI API Key" : "Set Up Your Personal Google AI API Key"}
            </h3>
            <p className={`text-xs font-mono mt-1 leading-relaxed ${
              theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"
            }`}>
              Script Automation Studio operates strictly with your own personal Google AI Key. Your key is stored with AES-256 encryption and is never shared.
            </p>
          </div>
        </div>

        {/* Step-by-Step Box */}
        <div 
          className={`mb-6 p-4 rounded-2xl border space-y-3 relative z-10 ${
            theme.isLight ? "border-[#E5E5E5] bg-[#F7F7F7]" : "border-[#2A2A2A] bg-[#111111]"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono">
            <span className={`font-semibold flex items-center gap-1.5 ${
              theme.isLight ? "text-[#000000]" : "text-white"
            }`}>
              <span className="w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] text-white" style={{ backgroundColor: theme.accentColor }}>1</span>
              Get your free API Key from Google AI Studio:
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border text-white"
              style={{ backgroundColor: theme.secondaryAccentColor, borderColor: theme.secondaryAccentColor }}
            >
              <span>Get API Key</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className={`pt-2 border-t text-xs font-mono flex items-center gap-1.5 ${
            theme.isLight ? "border-[#E5E5E5] text-[#444444]" : "border-[#2A2A2A] text-[#BDBDBD]"
          }`}>
            <span 
              className={`w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] border ${
                theme.isLight ? "bg-[#FFFFFF] border-[#E5E5E5]" : "bg-[#1A1A1A] border-[#2A2A2A]"
              }`}
              style={{ color: theme.secondaryAccentColor }}
            >
              2
            </span>
            <span>Paste your key below to validate and activate your studio.</span>
          </div>
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
            <span className="font-bold">API Key validated and saved successfully!</span>
          </div>
        )}

        {/* Current Key Masked Display if existing */}
        {profile?.hasApiKey && profile.apiKeyMasked && (
          <div className={`mb-4 px-4 py-3 rounded-2xl border text-xs font-mono flex items-center justify-between ${
            theme.isLight ? "border-[#E5E5E5] bg-[#F7F7F7]" : "border-[#2A2A2A] bg-[#111111]"
          }`}>
            <span className={theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"}>Current Saved Key:</span>
            <span className="font-bold" style={{ color: theme.secondaryAccentColor }}>{profile.apiKeyMasked}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSaveKey} className="space-y-4 relative z-10">
          <div>
            <label className={`block text-xs font-mono mb-2 font-medium ${
              theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"
            }`}>
              Google AI Studio API Key or Token (AIzaSy..., AQ..., or ya29...)
            </label>
            <div className="relative">
              <Lock className={`absolute left-3.5 top-3.5 h-4 w-4 ${
                theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"
              }`} />
              <input
                type={showKey ? "text" : "password"}
                required
                placeholder="Paste AIzaSy... or AQ... key"
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
              disabled={loading || !apiKeyInput.trim()}
              className="flex-1 py-3.5 px-4 rounded-2xl font-extrabold text-sm transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2 text-white border disabled:opacity-50"
              style={{ backgroundColor: theme.accentColor, borderColor: theme.accentColor }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
        <div className={`mt-6 pt-4 border-t text-[11px] font-mono flex items-center justify-center gap-1.5 relative z-10 ${
          theme.isLight ? "border-[#E5E5E5] text-[#444444]" : "border-[#2A2A2A] text-[#BDBDBD]"
        }`}>
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: theme.secondaryAccentColor }} />
          <span>Encrypted with AES-256. Strictly tied to user ID {profile?.userId.slice(0, 8)}...</span>
        </div>
      </div>
    </div>
  );
};
