import React, { useState } from "react";
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-md bg-[#051408] border border-green-800/80 rounded-3xl shadow-[0_0_50px_rgba(0,255,1,0.15)] p-6 sm:p-8 relative overflow-hidden my-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-gray-400 hover:text-white hover:bg-green-900/40 transition-colors z-10 cursor-pointer"
          title="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#00FF01]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#00FF01]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Branding */}
        <div className="text-center mb-6 relative">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-green-950/80 border border-[#00FF01]/40 mb-3 shadow-[0_0_15px_rgba(0,255,1,0.2)]">
            <Sparkles className="h-7 w-7 text-[#00FF01]" />
          </div>
          <h2 className="text-2xl font-extrabold text-white font-sans tracking-tight">
            Script Automation Studio
          </h2>
          <p className="text-xs text-gray-400 mt-1 font-mono">
            {isSignUp ? "Create your account in seconds" : "Welcome back! Sign in to your account"}
          </p>
        </div>

        {/* Tab Switcher for Easy Toggle */}
        <div className="flex rounded-2xl bg-black/60 p-1 border border-green-900/60 mb-6">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError(null);
              setIsNotAllowedErr(false);
            }}
            className={`flex-1 py-2 text-xs font-mono font-bold rounded-xl transition-all ${
              !isSignUp
                ? "bg-[#00FF01] text-black shadow-[0_0_10px_rgba(0,255,1,0.2)]"
                : "text-gray-400 hover:text-white"
            }`}
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
            className={`flex-1 py-2 text-xs font-mono font-bold rounded-xl transition-all ${
              isSignUp
                ? "bg-[#00FF01] text-black shadow-[0_0_10px_rgba(0,255,1,0.2)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Firebase Console Guidance Box for auth/operation-not-allowed */}
        {isNotAllowedErr && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-950/90 border border-amber-500/80 text-amber-200 text-xs font-mono space-y-2.5 animate-[fadeIn_0.2s_ease]">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>How to solve `auth/operation-not-allowed`:</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              Firebase sign-in provider is disabled in your Firebase Console project. Enable it in 3 quick steps:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-100 pl-1">
              <li>Open <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-bold text-amber-300">Firebase Console</a></li>
              <li>Select your project &rarr; <b>Authentication</b> &rarr; <b>Sign-in method</b></li>
              <li>Click <b>Email/Password</b> (or Google / Anonymous) and set it to <b>Enable</b></li>
            </ol>
            <div className="pt-2 border-t border-amber-800/60 flex items-center justify-between text-[10px]">
              <span>Or click below to try quick guest mode:</span>
              <button
                type="button"
                onClick={handleAnonymousSignIn}
                className="px-2.5 py-1 rounded-lg bg-amber-400 text-black font-bold hover:bg-white transition-all cursor-pointer"
              >
                Quick Guest Mode
              </button>
            </div>
          </div>
        )}

        {/* Standard Error Alert */}
        {error && !isNotAllowedErr && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-950/80 border border-red-800/80 text-red-200 text-xs font-mono flex items-start gap-2.5 animate-[fadeIn_0.2s_ease]">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <span className="flex-1 leading-snug">{error}</span>
          </div>
        )}

        {/* Quick Social & Guest Login Options */}
        <div className="space-y-2.5 mb-5">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            type="button"
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-2xl bg-white text-gray-900 font-semibold text-sm hover:bg-gray-100 transition-all cursor-pointer shadow-md disabled:opacity-50 active:scale-[0.98]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-2xl bg-green-950/60 border border-green-800/80 text-gray-300 hover:text-white hover:bg-green-900/60 font-mono text-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Zap className="h-3.5 w-3.5 text-[#00FF01]" />
            <span>Instant One-Click Guest Mode</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-green-900/60" />
          <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">or with email</span>
          <div className="flex-1 h-px bg-green-900/60" />
        </div>

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3.5">
          {isSignUp && (
            <div>
              <label className="block text-xs font-mono text-gray-300 mb-1 font-medium">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/60 border border-green-900/80 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF01] focus:ring-1 focus:ring-[#00FF01] transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-gray-300 mb-1 font-medium">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
              <input
                type="email"
                required
                placeholder="creator@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/60 border border-green-900/80 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF01] focus:ring-1 focus:ring-[#00FF01] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-300 mb-1 font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/60 border border-green-900/80 rounded-xl py-2.5 pl-10 pr-11 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF01] focus:ring-1 focus:ring-[#00FF01] transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200 transition-colors p-1 cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-[#00FF01] text-black font-extrabold text-sm hover:bg-white transition-all cursor-pointer shadow-[0_0_20px_rgba(0,255,1,0.3)] flex items-center justify-center gap-2 mt-5 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isSignUp ? "Create Free Account" : "Log In to Studio"}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Sign Up / Login Footer */}
        <div className="mt-5 pt-3 border-t border-green-950/80 text-center">
          <p className="text-xs text-gray-400 font-mono">
            {isSignUp ? "Already have an account?" : "Don't have an account yet?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setIsNotAllowedErr(false);
              }}
              className="text-[#00FF01] hover:underline font-bold cursor-pointer ml-1"
            >
              {isSignUp ? "Log In here" : "Sign Up free"}
            </button>
          </p>
        </div>

        {/* Privacy Note */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-gray-500 font-mono">
          <Shield className="h-3 w-3 text-green-600" />
          <span>AES-256 Encrypted personal API key security</span>
        </div>
      </div>
    </div>
  );
};

