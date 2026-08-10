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
  Wand2,
  Sun,
  Moon,
  BookOpen,
  Download
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
    setIsTutorialModalOpen,
    currentTheme,
    setCurrentTheme,
    currentBrand,
    setCurrentBrand
  } = useAuth();

  const theme = getThemeConfig(currentTheme, currentBrand);

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
      className={`w-full border-b px-4 py-2.5 sm:px-6 sticky top-0 z-40 flex items-center justify-between gap-4 select-none transition-colors duration-200 ${
        theme.isLight 
          ? "bg-[#F7F7F7] border-[#E5E5E5] text-[#000000]" 
          : "bg-[#111111] border-[#2A2A2A] text-white"
      }`}
    >
      {/* Left Branding / Title */}
      <div className="flex items-center gap-3">
        <img
          src={theme.isLight ? "/LogoDay.svg" : "/LogoNight.svg"}
          alt="Script Automation Studio Logo"
          className="h-8 sm:h-9 w-auto object-contain cursor-pointer"
        />
        {profile && (profile.isAdmin || profile.role === "admin") && (
          <span 
            className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1 shadow-sm ${
              theme.isLight ? "bg-[#FFFFFF]" : "bg-[#111111]"
            }`}
            style={{ color: theme.secondaryAccentColor, borderColor: `${theme.secondaryAccentColor}80` }}
          >
            <Crown className="h-3 w-3" style={{ color: theme.secondaryAccentColor }} />
            Admin
          </span>
        )}
      </div>

      {/* Right User Navigation & Controls */}
      <div className="flex items-center gap-2 sm:gap-3 relative">
        {/* Brand Color Switcher (Orange / Blue) */}
        <div className={`flex items-center p-0.5 rounded-2xl border ${
          theme.isLight ? "bg-[#FFFFFF] border-[#E5E5E5]" : "bg-[#1A1A1A] border-[#2A2A2A]"
        }`}>
          <button
            type="button"
            onClick={() => setCurrentBrand("orange")}
            className={`px-2.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              currentBrand === "orange"
                ? "bg-[#FF3E00] text-white shadow-sm"
                : (theme.isLight ? "text-[#444444] hover:text-[#000000]" : "text-[#BDBDBD] hover:text-white")
            }`}
            title="Orange Brand (#FF3E00 Primary, #0B9EFE Secondary)"
          >
            <span>🟠</span>
            <span className="hidden md:inline">Orange</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentBrand("blue")}
            className={`px-2.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              currentBrand === "blue"
                ? "bg-[#0B9EFE] text-white shadow-sm"
                : (theme.isLight ? "text-[#444444] hover:text-[#000000]" : "text-[#BDBDBD] hover:text-white")
            }`}
            title="Blue Brand (#0B9EFE Primary, #FF3E00 Secondary)"
          >
            <span>🔵</span>
            <span className="hidden md:inline">Blue</span>
          </button>
        </div>

        {/* Day / Night Theme Toggle */}
        <button
          onClick={() => setCurrentTheme(theme.isLight ? "Night" : "Day")}
          className={`px-3 py-2 rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
            theme.isLight 
              ? "bg-[#FFFFFF] text-[#000000] border-[#E5E5E5]" 
              : "bg-[#1A1A1A] text-white border-[#2A2A2A]"
          }`}
          title={theme.isLight ? "Switch to Night Mode (🌙)" : "Switch to Day Mode (☀️)"}
        >
          {theme.isLight ? (
            <>
              <Sun className="h-4 w-4" style={{ color: theme.accentColor }} />
              <span className="text-xs font-mono font-bold hidden sm:inline text-[#000000]">Day ☀️</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4" style={{ color: theme.secondaryAccentColor }} />
              <span className="text-xs font-mono font-bold hidden sm:inline text-white">Night 🌙</span>
            </>
          )}
        </button>

        {/* Tutorials & Downloads Button */}
        <button
          onClick={() => setIsTutorialModalOpen(true)}
          className={`p-2 sm:px-3 py-2 rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
            theme.isLight 
              ? "bg-[#FFFFFF] text-[#000000] border-[#E5E5E5]" 
              : "bg-[#1A1A1A] text-white border-[#2A2A2A]"
          }`}
          title="Open Tutorials, Controls Dictionary & Downloadable Guides"
        >
          <BookOpen className="h-4 w-4" style={{ color: theme.accentColor }} />
          <span className="text-xs font-mono font-bold hidden sm:inline">Tutorials & Guides</span>
        </button>

        {/* Image Studio Modal Trigger Button */}
        <button
          onClick={() => setIsImageStudioOpen(true)}
          className="px-3.5 py-2 rounded-2xl text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-lg border"
          style={{ backgroundColor: theme.accentColor, borderColor: theme.accentColor }}
          title="Open Image Generation Studio"
        >
          <Wand2 className="h-4 w-4" />
          <span className="text-xs font-mono font-bold hidden sm:inline">Image Studio</span>
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className={`p-2 sm:px-3 py-2 rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 ${
            theme.isLight 
              ? "bg-[#FFFFFF] text-[#000000] border-[#E5E5E5]" 
              : "bg-[#1A1A1A] text-white border-[#2A2A2A]"
          }`}
          title="Open Settings & Model Configuration"
        >
          <Settings className="h-4 w-4" style={{ color: theme.secondaryAccentColor }} />
          <span className="text-xs font-mono hidden lg:inline">Settings</span>
        </button>

        {!profile ? (
          /* Unauthenticated state: Show prominent Login / Sign Up button */
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl font-extrabold text-xs transition-all shadow-xl cursor-pointer border text-white"
            style={{ backgroundColor: theme.accentColor, borderColor: theme.accentColor }}
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border transition-all cursor-pointer text-[11px] font-mono font-bold ${
                  theme.isLight ? "bg-[#FFFFFF]" : "bg-[#1A1A1A]"
                }`}
                style={{ color: theme.secondaryAccentColor, borderColor: `${theme.secondaryAccentColor}80` }}
                title="Open Admin Command Console"
              >
                <Crown className="h-3.5 w-3.5" style={{ color: theme.secondaryAccentColor }} />
                <span className="hidden md:inline">Admin</span>
              </button>
            )}

            {/* API Status Badge */}
            {profile.hasApiKey ? (
              <button
                onClick={() => setIsApiKeyModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border transition-all cursor-pointer text-[11px] font-mono ${
                  theme.isLight ? "bg-[#FFFFFF]" : "bg-[#1A1A1A]"
                }`}
                style={{ color: theme.secondaryAccentColor, borderColor: `${theme.secondaryAccentColor}99` }}
                title="Click to manage personal API key"
              >
                <CheckCircle2 className="h-3.5 w-3.5" style={{ color: theme.secondaryAccentColor }} />
                <span className="font-bold hidden md:inline">API Key Active</span>
                <span className={`text-[10px] ${theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                  ({profile.apiKeyMasked})
                </span>
              </button>
            ) : (
              <button
                onClick={() => setIsApiKeyModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl transition-all cursor-pointer text-[11px] font-mono font-bold border"
                style={{ backgroundColor: `${theme.accentColor}1A`, color: theme.accentColor, borderColor: theme.accentColor }}
                title="Set up your required Google AI API key"
              >
                <AlertTriangle className="h-3.5 w-3.5" style={{ color: theme.accentColor }} />
                <span>Setup API Key</span>
              </button>
            )}

            {/* User Profile Box & Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-2xl border transition-all cursor-pointer group ${
                  theme.isLight ? "bg-[#FFFFFF] border-[#E5E5E5]" : "bg-[#1A1A1A] border-[#2A2A2A]"
                }`}
              >
                <img
                  src={profile.profilePhoto}
                  alt={profile.name}
                  referrerPolicy="no-referrer"
                  className={`w-7 h-7 rounded-xl object-cover border ${
                    theme.isLight ? "border-[#E5E5E5]" : "border-[#2A2A2A]"
                  }`}
                />
                <div className="flex flex-col text-left hidden sm:flex leading-tight">
                  <span className={`text-xs font-bold truncate max-w-[110px] ${
                    theme.isLight ? "text-[#000000]" : "text-white"
                  }`}>
                    {profile.name}
                  </span>
                  <span className={`text-[9px] font-mono truncate max-w-[110px] ${
                    theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"
                  }`}>
                    {profile.email}
                  </span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} style={{ color: theme.secondaryAccentColor }} />
              </button>

              {/* Profile Dropdown Menu */}
              {isDropdownOpen && (
                <div
                  className={`absolute right-0 mt-3 w-60 rounded-2xl shadow-2xl py-2 z-50 font-mono text-xs border ${
                    theme.isLight 
                      ? "border-[#E5E5E5] bg-[#FFFFFF] text-[#000000]" 
                      : "border-[#2A2A2A] bg-[#1A1A1A] text-white"
                  }`}
                >
                  <div className={`px-4 py-2.5 border-b mb-1 ${
                    theme.isLight ? "border-[#E5E5E5]" : "border-[#2A2A2A]"
                  }`}>
                    <p className="font-bold truncate" style={{ color: theme.accentColor }}>{profile.name}</p>
                    <p className={`text-[10px] truncate ${
                      theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"
                    }`}>{profile.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsSettingsModalOpen(true);
                    }}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                      theme.isLight ? "text-[#000000]" : "text-white"
                    }`}
                  >
                    <UserIcon className="h-4 w-4" style={{ color: theme.secondaryAccentColor }} />
                    <span>My Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsApiKeyModalOpen(true);
                    }}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                      theme.isLight ? "text-[#000000]" : "text-white"
                    }`}
                  >
                    <Key className="h-4 w-4" style={{ color: theme.secondaryAccentColor }} />
                    <span>API Key Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsSettingsModalOpen(true);
                    }}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                      theme.isLight ? "text-[#000000]" : "text-white"
                    }`}
                  >
                    <Cpu className="h-4 w-4" style={{ color: theme.secondaryAccentColor }} />
                    <span>AI Model Preferences</span>
                  </button>

                  <div className={`my-1 border-t ${theme.isLight ? "border-[#E5E5E5]" : "border-[#2A2A2A]"}`} />

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      logout();
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2.5 transition-colors cursor-pointer"
                    style={{ color: theme.accentColor }}
                  >
                    <LogOut className="h-4 w-4" style={{ color: theme.accentColor }} />
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

