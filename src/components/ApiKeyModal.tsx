import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Key, ExternalLink, ShieldCheck, AlertCircle, CheckCircle2, Lock, Eye, EyeOff, Sparkles, X } from "lucide-react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose?: () => void;
  canDismiss?: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, canDismiss = true }) => {
  const { idToken, refreshProfile, profile } = useAuth();
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

    if (!trimmed.startsWith("AIzaSy")) {
      setError("Invalid format. Google AI Studio API Keys typically start with 'AIzaSy'. Please check your key.");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#051408] border border-green-800 rounded-3xl shadow-[0_0_60px_rgba(0,255,1,0.2)] p-6 sm:p-8 relative my-auto">
        {/* Close / Cross (X) Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-green-950/60 transition-all cursor-pointer z-10"
            title="Cancel / Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FF01]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-green-950 border border-[#00FF01]/50 text-[#00FF01] shrink-0 shadow-[0_0_15px_rgba(0,255,1,0.2)]">
            <Key className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white font-sans tracking-tight">
              {profile?.hasApiKey ? "Update Personal Google AI API Key" : "Set Up Your Personal Google AI API Key"}
            </h3>
            <p className="text-xs text-gray-400 font-mono mt-1 leading-relaxed">
              Script Automation Studio operates strictly with your own personal Google AI Key. Your key is stored with AES-256 encryption and is never shared.
            </p>
          </div>
        </div>

        {/* Step-by-Step Box */}
        <div className="mb-6 p-4 rounded-2xl bg-black/60 border border-green-900/60 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-gray-300 font-semibold flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#00FF01] text-black font-bold flex items-center justify-center text-[10px]">1</span>
              Get your free API Key from Google AI Studio:
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00FF01] text-black font-bold text-xs hover:bg-white transition-all shadow-[0_0_10px_rgba(0,255,1,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>Get API Key</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="pt-2 border-t border-green-950 text-xs font-mono text-gray-400 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-green-900/80 text-[#00FF01] font-bold flex items-center justify-center text-[10px]">2</span>
            <span>Paste your key below to validate and activate your studio.</span>
          </div>
        </div>

        {/* Feedback messages */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-950/80 border border-red-800/80 text-red-200 text-xs font-mono flex items-start gap-2.5 animate-[fadeIn_0.2s_ease]">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <span className="flex-1 leading-snug">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 rounded-2xl bg-green-950/90 border border-[#00FF01] text-[#00FF01] text-xs font-mono flex items-center gap-2.5 animate-[fadeIn_0.2s_ease]">
            <CheckCircle2 className="h-4 w-4 text-[#00FF01] shrink-0" />
            <span className="font-bold">API Key validated and saved successfully!</span>
          </div>
        )}

        {/* Current Key Masked Display if existing */}
        {profile?.hasApiKey && profile.apiKeyMasked && (
          <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-green-950/30 border border-green-900/40 text-xs font-mono flex items-center justify-between">
            <span className="text-gray-400">Current Saved Key:</span>
            <span className="text-[#00FF01] font-bold">{profile.apiKeyMasked}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSaveKey} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-gray-300 mb-2 font-medium">
              Google AI Studio API Key (AIzaSy...)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
              <input
                type={showKey ? "text" : "password"}
                required
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setError(null);
                }}
                className="w-full bg-black/80 border border-green-900/80 rounded-2xl py-3 pl-10 pr-12 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-[#00FF01] focus:ring-1 focus:ring-[#00FF01] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3.5 top-3 text-gray-500 hover:text-gray-300 transition-colors p-1"
                title={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="py-3.5 px-4 rounded-2xl bg-black/60 border border-green-900/80 text-gray-300 font-mono font-bold text-xs hover:bg-green-950 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !apiKeyInput.trim()}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-[#00FF01] text-black font-extrabold text-sm hover:bg-white transition-all cursor-pointer shadow-[0_0_20px_rgba(0,255,1,0.3)] flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
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
        <div className="mt-6 pt-4 border-t border-green-950/80 text-[11px] font-mono text-gray-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />
          <span>Encrypted with AES-256. Strictly tied to user ID {profile?.userId.slice(0, 8)}...</span>
        </div>
      </div>
    </div>
  );
};
