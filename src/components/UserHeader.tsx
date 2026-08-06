import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getThemeConfig } from "../lib/themeConfig";
import { 
  LogOut, 
  Settings, 
  Key, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Crown, 
  User as UserIcon, 
  ChevronDown, 
  Cpu, 
  LogIn,
  Wand2
} from "lucide-react";

export const UserHeader: React.FC = () => {
  const { 
    profile, 
    logout, 
    setIsAuthModalOpen, 
    setIsApiKeyModalOpen, 
    setIsSettingsModalOpen, 
    setIsAdminModalOpen,
    setIsImageStudioOpen,
    currentTheme,
    setCurrentTheme
  } = useAuth();

  const theme = getThemeConfig(currentTheme);

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className="w-full glass-panel border-b px-4 py-2.5 sm:px-6 sticky top-0 z-40 flex items-center justify-between gap-4 select-none"
      style={{
        borderBottomColor: theme.accentColor,
        boxShadow: theme.cardBg.includes("bg-white")
          ? "0 8px 24px -4px rgba(0, 0, 0, 0.06), 0 4px 8px -3px rgba(0, 0, 0, 0.02)"
          : "0 12px 28px -4px rgba(0, 0, 0, 0.55), 0 4px 10px -4px rgba(0, 0, 0, 0.35)"
      }}
    >
      {/* Left Branding / Title */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl glass-card border flex items-center justify-center shadow-lg transition-transform duration-150 hover:scale-102" style={{ borderColor: `${theme.accentColor}50`, color: theme.accentColor }}>
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-sm font-extrabold tracking-tight font-sans flex items-center gap-1.5" style={{ color: theme.accentColor }}>
            <span>Script Automation Studio</span>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-bold glass-card" style={{ borderColor: `${theme.accentColor}60`, color: theme.accentColor }}>
              v2.5
            </span>
            {profile && (profile.isAdmin || profile.role === "admin") && (
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold flex items-center gap-1 shadow-sm">
                <Crown className="h-3 w-3" />
                Admin
              </span>
            )}
          </h1>
          <p className="text-[10px] opacity-70 font-mono hidden sm:block" style={{ color: theme.textColor }}>
            AI-Powered Scripting & Personal Key Automation
          </p>
        </div>
      </div>

      {/* Right User Navigation & Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3 relative">
        {/* Image Studio Modal Trigger Button */}
        <button
          onClick={() => setIsImageStudioOpen(true)}
          className="p-2 sm:px-3.5 py-2 rounded-2xl glass-button transition-all cursor-pointer flex items-center gap-1.5 shadow-lg border hover:scale-102 active:scale-95"
          style={{
            backgroundColor: `${theme.accentColor}20`,
            color: theme.accentColor,
            borderColor: `${theme.accentColor}60`,
          }}
          title="Open Image Generation Studio"
        >
          <Wand2 className="h-4 w-4" style={{ color: theme.accentColor }} />
          <span className="text-xs font-mono font-bold hidden sm:inline">Image Studio</span>
        </button>

        {/* Theme Switcher Dropdown */}
        <div className="relative">
          <select
            value={currentTheme}
            onChange={(e) => setCurrentTheme(e.target.value)}
            className="px-3 py-2 rounded-2xl glass-input text-xs font-mono focus:outline-none cursor-pointer transition-all shadow-md font-bold"
            style={{
              borderColor: `${theme.accentColor}50`,
              color: theme.accentColor,
            }}
            title="Switch App Theme"
          >
            <option value="Neon Cyan" style={{ backgroundColor: "#0b131b", color: "#00E5FF" }}>Neon Cyan</option>
            <option value="Light Neon Orange" style={{ backgroundColor: "#1e130c", color: "#FFA726" }}>Light Neon Orange</option>
            <option value="Classic Orange" style={{ backgroundColor: "#1c120a", color: "#FF6F00" }}>Classic Orange</option>
            <option value="Neon Green" style={{ backgroundColor: "#0b180d", color: "#39FF14" }}>Neon Green</option>
            <option value="Dark Professional" style={{ backgroundColor: "#11161d", color: "#4D8DFF" }}>Dark Professional</option>
            <option value="Slate Grey" style={{ backgroundColor: "#191c21", color: "#90A4AE" }}>Slate Grey</option>
            <option value="Pure Light" style={{ backgroundColor: "#f8fafc", color: "#1976D2" }}>Pure Light</option>
            <option value="Neon Red" style={{ backgroundColor: "#1c0b0e", color: "#FF1744" }}>Neon Red</option>
            <option value="Royal Purple" style={{ backgroundColor: "#150d24", color: "#8E44FF" }}>Royal Purple</option>
            <option value="Electric Blue" style={{ backgroundColor: "#0c1523", color: "#2979FF" }}>Electric Blue</option>
          </select>
        </div>

        {/* Gear Icon (Settings & Model Config) */}
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="p-2 sm:px-3 py-2 rounded-2xl glass-button transition-all cursor-pointer flex items-center gap-1.5 border hover:scale-105 active:scale-95"
          style={{
            backgroundColor: "rgba(255,255,255,0.08)",
            color: theme.textColor,
            borderColor: `${theme.accentColor}30`,
          }}
          title="Open Settings & Model Configuration"
        >
          <Settings className="h-4 w-4" style={{ color: theme.accentColor }} />
          <span className="text-xs font-mono hidden lg:inline">Settings</span>
        </button>

        {!profile ? (
          /* Unauthenticated state: Show prominent Login / Sign Up button */
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl font-extrabold text-xs transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer border"
            style={{
              backgroundColor: theme.accentColor,
              color: currentTheme === "Pure Light" || theme.accentColor === "#FF1744" || theme.accentColor === "#8E44FF" ? "#ffffff" : "#000000",
              borderColor: `${theme.accentColor}80`
            }}
          >
            <LogIn className="h-4 w-4" />
            <span>Login / Sign Up</span>
          </button>
        ) : (
          /* Authenticated state: Show Admin, API Status & User Profile Dropdown */
          <>
            {/* Admin Dashboard Trigger */}
            {(profile.isAdmin || profile.role === "admin") && (
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl glass-button transition-all cursor-pointer shadow-md text-[11px] font-mono font-bold border"
                style={{
                  backgroundColor: "rgba(245,158,11,0.15)",
                  color: "#f59e0b",
                  borderColor: "rgba(245,158,11,0.5)"
                }}
                title="Open Admin Command Console"
              >
                <Crown className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden md:inline">Admin</span>
              </button>
            )}

            {/* API Status Badge */}
            {profile.hasApiKey ? (
              <button
                onClick={() => setIsApiKeyModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl glass-card hover:opacity-90 transition-all cursor-pointer shadow-sm text-[11px] font-mono border"
                style={{
                  backgroundColor: `${theme.accentColor}20`,
                  borderColor: theme.accentColor,
                  color: theme.accentColor
                }}
                title="Click to manage personal API key"
              >
                <CheckCircle2 className="h-3.5 w-3.5" style={{ color: theme.accentColor }} />
                <span className="font-bold hidden md:inline">API Key Active</span>
                <span className="text-[10px] opacity-80">({profile.apiKeyMasked})</span>
              </button>
            ) : (
              <button
                onClick={() => setIsApiKeyModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl glass-button transition-all cursor-pointer shadow-md animate-pulse text-[11px] font-mono font-bold border"
                style={{
                  backgroundColor: "rgba(239,68,68,0.15)",
                  color: "#ef4444",
                  borderColor: "rgba(239,68,68,0.5)"
                }}
                title="Set up your required Google AI API key"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                <span>Setup API Key</span>
              </button>
            )}

            {/* User Profile Box & Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-2xl glass-card transition-all cursor-pointer group border"
                style={{
                  borderColor: `${theme.accentColor}30`
                }}
              >
                <img
                  src={profile.profilePhoto}
                  alt={profile.name}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-xl object-cover border transition-transform group-hover:scale-105"
                  style={{ borderColor: theme.accentColor }}
                />
                <div className="flex flex-col text-left hidden sm:flex leading-tight">
                  <span className="text-xs font-bold transition-colors truncate max-w-[110px]" style={{ color: currentTheme === "Pure Light" ? "#0f172a" : "#f8fafc" }}>
                    {profile.name}
                  </span>
                  <span className="text-[9px] font-mono truncate max-w-[110px] opacity-70" style={{ color: currentTheme === "Pure Light" ? "#475569" : "#cbd5e1" }}>
                    {profile.email}
                  </span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} style={{ color: theme.accentColor }} />
              </button>

              {/* Profile Dropdown Menu */}
              {isDropdownOpen && (
                <div
                  className="absolute right-0 mt-3 w-60 rounded-3xl shadow-2xl py-2 z-50 font-mono text-xs border backdrop-blur-xl"
                  style={{
                    backgroundColor: currentTheme === "Pure Light" ? "#ffffff" : "#0d111a",
                    borderColor: currentTheme === "Pure Light" ? "#e2e8f0" : `${theme.accentColor}40`,
                    color: currentTheme === "Pure Light" ? "#0f172a" : "#f8fafc",
                    boxShadow: currentTheme === "Pure Light"
                      ? "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)"
                      : `0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 20px ${theme.accentColor}20`
                  }}
                >
                  <div className="px-4 py-2.5 border-b mb-1" style={{ borderColor: currentTheme === "Pure Light" ? "#f1f5f9" : "rgba(255,255,255,0.1)" }}>
                    <p className="font-bold truncate" style={{ color: theme.accentColor }}>{profile.name}</p>
                    <p className="text-[10px] opacity-70 truncate" style={{ color: currentTheme === "Pure Light" ? "#475569" : "#cbd5e1" }}>{profile.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsSettingsModalOpen(true);
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2.5 transition-colors cursor-pointer hover:opacity-80"
                    style={{ color: currentTheme === "Pure Light" ? "#0f172a" : "#f8fafc" }}
                  >
                    <UserIcon className="h-4 w-4" style={{ color: theme.accentColor }} />
                    <span>My Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsApiKeyModalOpen(true);
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2.5 transition-colors cursor-pointer hover:opacity-80"
                    style={{ color: currentTheme === "Pure Light" ? "#0f172a" : "#f8fafc" }}
                  >
                    <Key className="h-4 w-4" style={{ color: theme.accentColor }} />
                    <span>API Key Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsSettingsModalOpen(true);
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2.5 transition-colors cursor-pointer hover:opacity-80"
                    style={{ color: currentTheme === "Pure Light" ? "#0f172a" : "#f8fafc" }}
                  >
                    <Cpu className="h-4 w-4" style={{ color: theme.accentColor }} />
                    <span>AI Model Preferences</span>
                  </button>

                  <div className="my-1 border-t" style={{ borderColor: currentTheme === "Pure Light" ? "#f1f5f9" : "rgba(255,255,255,0.1)" }} />

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      logout();
                    }}
                    className="w-full px-4 py-2.5 text-left text-red-500 hover:text-red-600 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 text-red-500" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
};

