import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
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
    setIsImageStudioOpen
  } = useAuth();

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
    <header className="w-full bg-[#031106]/90 border-b border-green-900/60 px-4 py-2.5 sm:px-6 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between gap-4 select-none">
      {/* Left Branding / Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-green-950/90 border border-[#00FF01]/60 text-[#00FF01] shadow-[0_0_12px_rgba(0,255,1,0.25)] flex items-center justify-center">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>
        <div>
          <h1 className="text-sm font-extrabold text-white tracking-tight font-sans flex items-center gap-1.5">
            <span>Script Automation Studio</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-green-950 text-[#00FF01] border border-green-800 font-bold">
              v2.5
            </span>
            {profile && (profile.isAdmin || profile.role === "admin") && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold flex items-center gap-1">
                <Crown className="h-3 w-3" />
                Admin
              </span>
            )}
          </h1>
          <p className="text-[10px] text-gray-400 font-mono hidden sm:block">
            AI-Powered Scripting & Personal Key Automation
          </p>
        </div>
      </div>

      {/* Right User Navigation & Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3 relative">
        {/* Image Studio Modal Trigger Button */}
        <button
          onClick={() => setIsImageStudioOpen(true)}
          className="p-2 sm:px-3 rounded-xl bg-gradient-to-r from-green-950 to-emerald-950 text-[#00FF01] border border-[#00FF01]/60 hover:bg-green-900/80 hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,255,1,0.2)]"
          title="Open Image Generation Studio"
        >
          <Wand2 className="h-4 w-4 text-[#00FF01] animate-pulse" />
          <span className="text-xs font-mono font-bold hidden sm:inline">Image Studio</span>
        </button>

        {/* Gear Icon (Settings & Model Config) */}
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="p-2 rounded-xl bg-green-950/60 text-gray-300 border border-green-900/60 hover:text-[#00FF01] hover:border-[#00FF01] hover:bg-green-900/50 transition-all cursor-pointer flex items-center gap-1.5"
          title="Open Settings & Model Configuration"
        >
          <Settings className="h-4 w-4" />
          <span className="text-xs font-mono hidden lg:inline">Settings</span>
        </button>

        {!profile ? (
          /* Unauthenticated state: Show prominent Login / Sign Up button */
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00FF01] text-black font-extrabold text-xs hover:bg-white transition-all shadow-[0_0_15px_rgba(0,255,1,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/80 text-amber-300 hover:bg-amber-900 transition-all cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.25)] text-[11px] font-mono font-bold"
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
                className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-green-950/80 border border-[#00FF01]/60 text-[#00FF01] hover:bg-green-900/60 transition-all cursor-pointer shadow-[0_0_8px_rgba(0,255,1,0.15)] text-[11px] font-mono"
                title="Click to manage personal API key"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-[#00FF01]" />
                <span className="font-bold hidden md:inline">API Key Active</span>
                <span className="text-[10px] opacity-80">({profile.apiKeyMasked})</span>
              </button>
            ) : (
              <button
                onClick={() => setIsApiKeyModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/90 border border-amber-500/80 text-amber-300 hover:bg-amber-900 transition-all cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse text-[11px] font-mono font-bold"
                title="Set up your required Google AI API key"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span>Setup API Key</span>
              </button>
            )}

            {/* User Profile Box & Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-2xl bg-black/60 border border-green-900/60 hover:border-[#00FF01] transition-all cursor-pointer group"
              >
                <img
                  src={profile.profilePhoto}
                  alt={profile.name}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-xl object-cover border border-[#00FF01]/60 group-hover:scale-105 transition-transform"
                />
                <div className="flex flex-col text-left hidden sm:flex leading-tight">
                  <span className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors truncate max-w-[110px]">
                    {profile.name}
                  </span>
                  <span className="text-[9px] font-mono text-gray-500 truncate max-w-[110px]">
                    {profile.email}
                  </span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 group-hover:text-white transition-transform duration-200 ${isDropdownOpen ? "rotate-180 text-[#00FF01]" : ""}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#051408] border border-green-800 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] py-2 z-50 animate-[fadeIn_0.15s_ease] font-mono text-xs">
                  <div className="px-3.5 py-2 border-b border-green-900/60 mb-1">
                    <p className="text-white font-bold truncate">{profile.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{profile.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsSettingsModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-gray-300 hover:text-white hover:bg-green-950/80 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <UserIcon className="h-4 w-4 text-[#00FF01]" />
                    <span>My Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsApiKeyModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-gray-300 hover:text-white hover:bg-green-950/80 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Key className="h-4 w-4 text-[#00FF01]" />
                    <span>API Key Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsSettingsModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-gray-300 hover:text-white hover:bg-green-950/80 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Cpu className="h-4 w-4 text-[#00FF01]" />
                    <span>AI Model Preferences</span>
                  </button>

                  <div className="my-1 border-t border-green-900/60" />

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      logout();
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-red-400 hover:text-red-200 hover:bg-red-950/50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 text-red-400" />
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

