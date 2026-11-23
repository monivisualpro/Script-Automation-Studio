import React from "react";
import { useAuth } from "../context/AuthContext";
import { getThemeConfig } from "../lib/themeConfig";
import {
  Settings,
  Key,
  CheckCircle2,
  Sun,
  Moon,
  BookOpen,
  Clapperboard,
  MessageSquare,
} from "lucide-react";

export const UserHeader: React.FC = () => {
  const {
    setIsApiKeyModalOpen,
    setIsSettingsModalOpen,
    setIsTutorialModalOpen,
    envKeyStatus,
    activeProviderConfig,
    currentTheme,
    setCurrentTheme,
    currentBrand,
    setCurrentBrand,
    activeWorkspace,
    setActiveWorkspace,
  } = useAuth();

  const theme = getThemeConfig(currentTheme, currentBrand);

  const activeProv = activeProviderConfig.provider || "gemini";
  const envEntry =
    activeProv === "gemini"
      ? envKeyStatus?.gemini
      : activeProv === "openai"
      ? envKeyStatus?.openai
      : activeProv === "claude"
      ? envKeyStatus?.claude
      : null;
  const hasBrowserKey = Boolean(activeProviderConfig.apiKey?.trim());
  const isLocalReady = activeProv === "local";
  const isConfigured = isLocalReady || hasBrowserKey || Boolean(envEntry?.configured);
  const detailLabel = isLocalReady
    ? "Local Engine"
    : hasBrowserKey
    ? "Local Key"
    : envEntry?.masked
    ? `.env: ${envEntry.masked}`
    : "Setup Key / .env";

  return (
    <header
      className={`w-full border-b px-4 py-2.5 sm:px-6 sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 sm:gap-4 select-none transition-colors duration-200 ${
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
      </div>

      {/* Center Workspace Mode Tabs */}
      <nav
        aria-label="Primary Workspace Switcher"
        className={`flex items-center p-1 rounded-2xl border shrink-0 ${
          theme.isLight ? "bg-[#FFFFFF] border-[#E5E5E5]" : "bg-[#1A1A1A] border-[#2A2A2A]"
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveWorkspace("studio")}
          className={`px-3 py-1.5 rounded-xl font-sans text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeWorkspace === "studio"
              ? "text-white shadow-sm"
              : theme.isLight
              ? "text-[#444444] hover:text-[#000000]"
              : "text-[#BDBDBD] hover:text-white"
          }`}
          style={activeWorkspace === "studio" ? { backgroundColor: theme.accentColor } : undefined}
        >
          <Clapperboard className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Automation Studio</span>
          <span className="sm:hidden">Studio</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveWorkspace("chat")}
          className={`px-3 py-1.5 rounded-xl font-sans text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeWorkspace === "chat"
              ? "text-white shadow-sm"
              : theme.isLight
              ? "text-[#444444] hover:text-[#000000]"
              : "text-[#BDBDBD] hover:text-white"
          }`}
          style={activeWorkspace === "chat" ? { backgroundColor: theme.secondaryAccentColor } : undefined}
        >
          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Chat Workspace</span>
          <span className="sm:hidden">Chat</span>
        </button>
      </nav>

      {/* Right Desktop Controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 relative">
        {/* Brand Color Switcher (Red / Blue) */}
        <div
          className={`flex items-center p-0.5 rounded-2xl border ${
            theme.isLight ? "bg-[#FFFFFF] border-[#E5E5E5]" : "bg-[#1A1A1A] border-[#2A2A2A]"
          }`}
        >
          <button
            type="button"
            onClick={() => setCurrentBrand("orange")}
            className={`px-2.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              currentBrand === "orange" || currentBrand === "red"
                ? "bg-[#FF073A] text-white shadow-sm"
                : theme.isLight
                ? "text-[#444444] hover:text-[#000000]"
                : "text-[#BDBDBD] hover:text-white"
            }`}
            title="Red Brand (#FF073A Primary, #2774FC Secondary)"
          >
            <span>🔴</span>
            <span className="hidden md:inline">Red</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentBrand("blue")}
            className={`px-2.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              currentBrand === "blue"
                ? "bg-[#2774FC] text-white shadow-sm"
                : theme.isLight
                ? "text-[#444444] hover:text-[#000000]"
                : "text-[#BDBDBD] hover:text-white"
            }`}
            title="Blue Brand (#2774FC Primary, #FF073A Secondary)"
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

        {/* Desktop AI Provider / Local Engine Button */}
        <button
          onClick={() => setIsApiKeyModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border transition-all cursor-pointer text-[11px] font-mono ${
            theme.isLight ? "bg-[#FFFFFF]" : "bg-[#1A1A1A]"
          } ${!isConfigured ? "font-bold" : ""}`}
          style={{
            backgroundColor: !isConfigured ? `${theme.accentColor}1A` : undefined,
            color: theme.textColorCode,
            borderColor: isConfigured ? `${theme.secondaryAccentColor}99` : theme.accentColor,
          }}
          title="Configure AI Provider, Local .env Key, or Built-In Local Engine"
        >
          {isConfigured ? (
            <CheckCircle2 className="h-3.5 w-3.5" style={{ color: theme.secondaryAccentColor }} />
          ) : (
            <Key className="h-3.5 w-3.5" style={{ color: theme.accentColor }} />
          )}
          <span className="font-bold hidden md:inline">{activeProv.toUpperCase()}</span>
          <span className={`text-[10px] ${theme.isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
            ({detailLabel})
          </span>
        </button>
      </div>
    </header>
  );
};
