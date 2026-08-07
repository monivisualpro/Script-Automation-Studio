import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getThemeConfig } from "../lib/themeConfig";
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  updateProfile 
} from "firebase/auth";
import { auth, googleProvider, syncUserProfile } from "../lib/firebase";
import { 
  Sparkles, 
  Shield, 
  Lock, 
  Mail, 
  User, 
  AlertCircle, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ExternalLink,
  Zap,
  HelpCircle,
  X
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { currentTheme, currentBrand } = useAuth();
  const theme = getThemeConfig(currentTheme, currentBrand);
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isNotAllowedErr, setIsNotAllowedErr] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsNotAllowedErr(false);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncUserProfile(result.user, "google.com");
        onClose();
      }
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      if (err.code === "auth/operation-not-allowed") {
        setIsNotAllowedErr(true);
        setError("Google Sign-In is disabled in your Firebase project. Please enable Google provider in Firebase Console.");
      } else if (err.code === "auth/popup-closed-by-user") {
        setError("Sign-in popup was closed before completing.");
      } else if (err.code === "auth/popup-blocked") {
        setError("Sign-in popup was blocked by browser. Please allow popups or use Email & Password.");
      } else {
        setError(err.message || "Failed to sign in with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setError(null);
    setIsNotAllowedErr(false);
    setLoading(true);
    try {
      const result = await signInAnonymously(auth);
      if (result.user) {
        await syncUserProfile(result.user, "anonymous", "Guest Creator");
        onClose();
      }
    } catch (err: any) {
      console.error("Anonymous Auth Error:", err);
      if (err.code === "auth/operation-not-allowed") {
        setIsNotAllowedErr(true);
        setError("Anonymous Sign-In is not enabled in Firebase Console. Please enable Anonymous auth or Email/Password in Firebase Console.");
      } else {
        setError(err.message || "Failed to start quick demo session.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsNotAllowedErr(false);

    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        if (!name.trim()) {
          setError("Please enter your name.");
          setLoading(false);
          return;
        }
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: name });
        await syncUserProfile(userCred.user, "password", name);
        onClose();
      } else {
        try {
          const userCred = await signInWithEmailAndPassword(auth, email, password);
          await syncUserProfile(userCred.user, "password");
          onClose();
        } catch (signInErr: any) {
          // If login failed because account doesn't exist yet, try creating it directly for seamless user onboarding
          if (signInErr.code === "auth/user-not-found" || signInErr.code === "auth/invalid-credential") {
            try {
              const defaultName = email.split("@")[0] || "User";
              const newUserCred = await createUserWithEmailAndPassword(auth, email, password);
              await updateProfile(newUserCred.user, { displayName: defaultName });
              await syncUserProfile(newUserCred.user, "password", defaultName);
              onClose();
              setLoading(false);
              return;
            } catch (signUpErr: any) {
              if (signUpErr.code === "auth/email-already-in-use" || signUpErr.code === "auth/wrong-password") {
                setError("Incorrect password for this email. Please check your password and try again.");
              } else if (signUpErr.code === "auth/operation-not-allowed") {
                setIsNotAllowedErr(true);
                setError("Email/Password Authentication is not enabled in Firebase Console.");
              } else {
                setError(signUpErr.message || "Failed to sign in. Please verify your email and password.");
              }
              setLoading(false);
              return;
            }
          } else {
            throw signInErr;
          }
        }
      }
    } catch (err: any) {
      console.error("Email Auth Error:", err);
      let msg = err.message || "Authentication failed.";
      
      if (err.code === "auth/operation-not-allowed") {
        setIsNotAllowedErr(true);
        msg = "Email/Password Authentication is not enabled in your Firebase Console. Please enable it in Firebase Console > Authentication > Sign-in method.";
      } else if (err.message && err.message.includes("identitytoolkit.googleapis.com")) {
        setIsNotAllowedErr(true);
        msg = "The Identity Toolkit API is disabled for the custom API key. The app configuration has been restored to the project default key.";
      } else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        msg = "Invalid email or password. Please check your credentials or click Sign Up to register.";
      } else if (err.code === "auth/email-already-in-use") {
        msg = "This email is already registered. Please click 'Log In' below instead.";
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isLight = theme.isLight;
  const modalBg = isLight ? "#FFFFFF" : "#1A1A1A";
  const modalTextColor = isLight ? "#000000" : "#FFFFFF";
  const btnTextColor = "#FFFFFF";

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto backdrop-blur-md ${theme.isLight ? "bg-black/30" : "bg-black/85"}`}>
      <div 
        className={`w-full max-w-md rounded-2xl p-6 sm:p-8 relative overflow-hidden my-auto border transition-all duration-300 ${
          theme.isLight 
            ? "border-[#E5E5E5] bg-[#FFFFFF] text-[#000000]" 
            : "border-[#2A2A2A] bg-[#1A1A1A] text-white"
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full border transition-all cursor-pointer z-10 ${
            theme.isLight 
              ? "bg-[#F7F7F7] border-[#E5E5E5] text-[#000000]" 
              : "bg-[#111111] border-[#2A2A2A] text-white"
          }`}
          title="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Branding */}
        <div className="text-center mb-6 relative z-10">
          <div 
            className={`inline-flex items-center justify-center p-3.5 rounded-2xl border mb-3 shadow-lg ${
              theme.isLight ? "border-[#E5E5E5] bg-[#F7F7F7]" : "border-[#2A2A2A] bg-[#111111]"
            }`}
            style={{ color: theme.accentColor }}
          >
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className={`text-2xl font-extrabold font-sans tracking-tight ${
            theme.isLight ? "text-[#000000]" : "text-white"
          }`}>
            Script Automation Studio
          </h2>
          <p className={`text-xs mt-1.5 font-mono font-medium ${
            theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"
          }`}>
            {isSignUp ? "Create your account in seconds" : "Welcome back! Sign in to your account"}
          </p>
        </div>

        {/* Liquid Tab Switcher for Easy Toggle */}
        <div className={`flex rounded-full p-1.5 border mb-6 relative z-10 ${
          theme.isLight ? "border-[#E5E5E5] bg-[#F7F7F7]" : "border-[#2A2A2A] bg-[#111111]"
        }`}>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError(null);
              setIsNotAllowedErr(false);
            }}
            className={`flex-1 py-2.5 text-xs font-mono font-bold rounded-full transition-all duration-300 cursor-pointer ${
              !isSignUp 
                ? "text-white shadow-md" 
                : (theme.isLight ? "text-[#444444] hover:text-[#000000]" : "text-[#BDBDBD] hover:text-white")
            }`}
            style={!isSignUp ? { backgroundColor: theme.accentColor } : {}}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError(null);
              setIsNotAllowedErr(false);
            }}
            className={`flex-1 py-2.5 text-xs font-mono font-bold rounded-full transition-all duration-300 cursor-pointer ${
              isSignUp 
                ? "text-white shadow-md" 
                : (theme.isLight ? "text-[#444444] hover:text-[#000000]" : "text-[#BDBDBD] hover:text-white")
            }`}
            style={isSignUp ? { backgroundColor: theme.accentColor } : {}}
          >
            Sign Up
          </button>
        </div>

        {/* Firebase Console Guidance Box for auth/operation-not-allowed */}
        {isNotAllowedErr && (
          <div
            className="mb-6 p-4 rounded-2xl border text-xs font-mono space-y-2.5 animate-[fadeIn_0.2s_ease]"
            style={{ borderColor: theme.accentColor, backgroundColor: `${theme.accentColor}1A` }}
          >
            <div className="flex items-center gap-2 font-bold" style={{ color: theme.accentColor }}>
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>How to solve `auth/operation-not-allowed`:</span>
            </div>
            <p className={`text-[11px] leading-relaxed ${theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
              Firebase sign-in provider is disabled in your Firebase Console project. Enable it in 3 quick steps:
            </p>
            <ol className={`list-decimal list-inside space-y-1 text-[11px] pl-1 font-semibold ${
              theme.isLight ? "text-[#000000]" : "text-white"
            }`}>
              <li>Open <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-bold" style={{ color: theme.secondaryAccentColor }}>Firebase Console</a></li>
              <li>Select your project &rarr; <b>Authentication</b> &rarr; <b>Sign-in method</b></li>
              <li>Click <b>Email/Password</b> (or Google / Anonymous) and set it to <b>Enable</b></li>
            </ol>
            <div className={`pt-2 border-t flex items-center justify-between text-[10px] ${
              theme.isLight ? "border-[#E5E5E5]" : "border-[#2A2A2A]"
            }`}>
              <span className={theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"}>Or click below to try quick guest mode:</span>
              <button
                type="button"
                onClick={handleAnonymousSignIn}
                className="px-3 py-1 rounded-xl text-white font-extrabold transition-all cursor-pointer shadow-md"
                style={{ backgroundColor: theme.secondaryAccentColor }}
              >
                Quick Guest Mode
              </button>
            </div>
          </div>
        )}

        {/* Standard Error Alert */}
        {error && !isNotAllowedErr && (
          <div
            className="mb-5 p-3.5 rounded-2xl border text-xs font-mono flex items-start gap-2.5 animate-[fadeIn_0.2s_ease]"
            style={{ borderColor: theme.accentColor, backgroundColor: `${theme.accentColor}1A`, color: theme.accentColor }}
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: theme.accentColor }} />
            <span className="flex-1 leading-snug font-medium">{error}</span>
          </div>
        )}

        {/* Quick Social & Guest Login Options */}
        <div className="space-y-3 mb-5 relative z-10">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            type="button"
            className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl font-extrabold text-sm transition-all cursor-pointer shadow-lg disabled:opacity-50 border ${
              theme.isLight 
                ? "bg-[#F7F7F7] border-[#E5E5E5] text-[#000000]" 
                : "bg-[#111111] border-[#2A2A2A] text-white"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            onClick={handleAnonymousSignIn}
            disabled={loading}
            type="button"
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-mono text-xs font-extrabold transition-all cursor-pointer disabled:opacity-50 border shadow-sm ${
              theme.isLight ? "bg-[#F7F7F7]" : "bg-[#111111]"
            }`}
            style={{ color: theme.secondaryAccentColor, borderColor: `${theme.secondaryAccentColor}66` }}
          >
            <Zap className="h-4 w-4 shrink-0" style={{ color: theme.secondaryAccentColor }} />
            <span>Instant One-Click Guest Mode</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5 relative z-10">
          <div className={`flex-1 h-px ${theme.isLight ? "bg-[#E5E5E5]" : "bg-[#2A2A2A]"}`} />
          <span className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${
            theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"
          }`}>or with email</span>
          <div className={`flex-1 h-px ${theme.isLight ? "bg-[#E5E5E5]" : "bg-[#2A2A2A]"}`} />
        </div>

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4 relative z-10">
          {isSignUp && (
            <div>
              <label className={`block text-xs font-mono mb-1 font-semibold ${
                theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"
              }`}>Full Name</label>
              <div className="relative">
                <User className={`absolute left-3.5 top-3.5 h-4 w-4 shrink-0 ${
                  theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"
                }`} />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-all border ${
                    theme.isLight ? "border-[#E5E5E5] bg-[#F7F7F7] text-[#000000]" : "border-[#2A2A2A] bg-[#111111] text-white"
                  }`}
                />
              </div>
            </div>
          )}

          <div>
            <label className={`block text-xs font-mono mb-1 font-semibold ${
              theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"
            }`}>Email Address</label>
            <div className="relative">
              <Mail className={`absolute left-3.5 top-3.5 h-4 w-4 shrink-0 ${
                theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"
              }`} />
              <input
                type="email"
                required
                placeholder="creator@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-all border ${
                  theme.isLight ? "border-[#E5E5E5] bg-[#F7F7F7] text-[#000000]" : "border-[#2A2A2A] bg-[#111111] text-white"
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-mono mb-1 font-semibold ${
              theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"
            }`}>Password</label>
            <div className="relative">
              <Lock className={`absolute left-3.5 top-3.5 h-4 w-4 shrink-0 ${
                theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"
              }`} />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-2xl py-3 pl-10 pr-11 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-all font-mono border ${
                  theme.isLight ? "border-[#E5E5E5] bg-[#F7F7F7] text-[#000000]" : "border-[#2A2A2A] bg-[#111111] text-white"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3.5 top-3 transition-colors p-1 cursor-pointer ${
                  theme.isLight ? "text-[#444444] hover:text-[#000000]" : "text-[#BDBDBD] hover:text-white"
                }`}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl font-extrabold text-sm transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2 mt-6 active:scale-[0.98] disabled:opacity-50 border text-white"
            style={{ backgroundColor: theme.accentColor, borderColor: theme.accentColor }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isSignUp ? "Create Free Account" : "Log In to Studio"}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Sign Up / Login Footer */}
        <div className={`mt-6 pt-4 border-t text-center relative z-10 ${
          theme.isLight ? "border-[#E5E5E5]" : "border-[#2A2A2A]"
        }`}>
          <p className={`text-xs font-mono ${theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
            {isSignUp ? "Already have an account?" : "Don't have an account yet?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setIsNotAllowedErr(false);
              }}
              className="hover:underline font-extrabold cursor-pointer ml-1"
              style={{ color: theme.secondaryAccentColor }}
            >
              {isSignUp ? "Log In here" : "Sign Up free"}
            </button>
          </p>
        </div>

        {/* Privacy Note */}
        <div className={`mt-4 flex items-center justify-center gap-1.5 text-[10px] font-mono relative z-10 ${
          theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"
        }`}>
          <Shield className="h-3 w-3 shrink-0" style={{ color: theme.secondaryAccentColor }} />
          <span>AES-256 Encrypted personal API key security</span>
        </div>
      </div>
    </div>
  );
};

