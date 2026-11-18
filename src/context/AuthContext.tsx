import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import { auth, db, syncUserProfile, UserProfile } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export interface FeatureModelConfig {
  youtubeTranscript: string;
  transcriptCleaning: string;
  scriptGeneration: string;
  promptGeneration: string;
  bulkPromptGeneration: string;
  rewriteExpand: string;
  imageGeneration: string;
}

export const DEFAULT_FEATURE_MODELS: FeatureModelConfig = {
  youtubeTranscript: "gemini-2.5-flash",
  transcriptCleaning: "gemini-3.1-flash-lite",
  scriptGeneration: "gemini-2.5-pro",
  promptGeneration: "gemini-2.5-flash",
  bulkPromptGeneration: "gemini-2.5-flash",
  rewriteExpand: "gemini-2.5-pro",
  imageGeneration: "gemini-3.1-flash-image",
};

export interface ActiveProviderConfig {
  provider: "gemini" | "openai" | "claude" | "local";
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface AvailableModelOption {
  id: string;
  displayName: string;
  providerType?: "gemini" | "openai" | "claude" | "local";
  baseUrl?: string;
}

export interface EnvKeyStatus {
  aiProvider: "gemini" | "openai" | "claude" | "local";
  gemini: { configured: boolean; masked: string | null };
  openai: { configured: boolean; masked: string | null };
  claude: { configured: boolean; masked: string | null };
  local: { configured: boolean; url: string; model: string };
}

export const DEFAULT_PROVIDER_CONFIG: ActiveProviderConfig = {
  provider: "gemini",
  apiKey: "",
  model: "gemini-3.1-flash-lite",
  baseUrl: "http://127.0.0.1:1279/v1",
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  idToken: string | null;
  isStandalone: boolean;
  systemModeChecked: boolean;
  envKeyStatus: EnvKeyStatus | null;
  refreshSystemMode: () => Promise<void>;
  activeProviderConfig: ActiveProviderConfig;
  updateProviderConfig: (config: Partial<ActiveProviderConfig>) => void;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isApiKeyModalOpen: boolean;
  setIsApiKeyModalOpen: (open: boolean) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  isAdminModalOpen: boolean;
  setIsAdminModalOpen: (open: boolean) => void;
  isImageStudioOpen: boolean;
  setIsImageStudioOpen: (open: boolean) => void;
  isTutorialModalOpen: boolean;
  setIsTutorialModalOpen: (open: boolean) => void;
  initialImagePrompt: string;
  openImageStudioWithPrompt: (prompt?: string) => void;
  modelSettings: FeatureModelConfig;
  updateModelSettings: (newSettings: Partial<FeatureModelConfig>) => Promise<void>;
  availableModels: AvailableModelOption[];
  availableLocalModels: AvailableModelOption[];
  fetchAvailableModels: () => Promise<void>;
  currentTheme: string;
  setCurrentTheme: (theme: string) => void;
  currentBrand: string;
  setCurrentBrand: (brand: string) => void;
  activeWorkspace: "studio" | "chat";
  setActiveWorkspace: (workspace: "studio" | "chat") => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  idToken: null,
  isStandalone: false,
  systemModeChecked: false,
  envKeyStatus: null,
  refreshSystemMode: async () => {},
  activeProviderConfig: DEFAULT_PROVIDER_CONFIG,
  updateProviderConfig: () => {},
  refreshProfile: async () => {},
  logout: async () => {},
  deleteAccount: async () => {},
  isAuthModalOpen: false,
  setIsAuthModalOpen: () => {},
  isApiKeyModalOpen: false,
  setIsApiKeyModalOpen: () => {},
  isSettingsModalOpen: false,
  setIsSettingsModalOpen: () => {},
  isAdminModalOpen: false,
  setIsAdminModalOpen: () => {},
  isImageStudioOpen: false,
  setIsImageStudioOpen: () => {},
  isTutorialModalOpen: false,
  setIsTutorialModalOpen: () => {},
  initialImagePrompt: "",
  openImageStudioWithPrompt: () => {},
  modelSettings: DEFAULT_FEATURE_MODELS,
  updateModelSettings: async () => {},
  availableModels: [],
  availableLocalModels: [],
  fetchAvailableModels: async () => {},
  currentTheme: "Night",
  setCurrentTheme: () => {},
  currentBrand: "orange",
  setCurrentBrand: () => {},
  activeWorkspace: "studio",
  setActiveWorkspace: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [systemModeChecked, setSystemModeChecked] = useState<boolean>(false);
  const [envKeyStatus, setEnvKeyStatus] = useState<EnvKeyStatus | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<"studio" | "chat">("studio");
  const [activeProviderConfig, setActiveProviderConfigState] = useState<ActiveProviderConfig>(() => {
    try {
      const saved = localStorage.getItem("script_automation_active_provider_config");
      if (saved) {
        return { ...DEFAULT_PROVIDER_CONFIG, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_PROVIDER_CONFIG;
  });

  const updateProviderConfig = (newConfig: Partial<ActiveProviderConfig>) => {
    setActiveProviderConfigState(prev => {
      const merged = { ...prev, ...newConfig };
      try {
        localStorage.setItem("script_automation_active_provider_config", JSON.stringify(merged));
      } catch {}
      return merged;
    });
  };

  const refreshSystemMode = async () => {
    try {
      const res = await fetch("/api/system/mode");
      const data = await res.json();
      if (data && data.standalone) {
        setIsStandalone(true);
        setLoading(false);
        if (data.envKeys) {
          setEnvKeyStatus(data.envKeys);
          try {
            const hasSavedConfig = Boolean(localStorage.getItem("script_automation_active_provider_config"));
            if (!hasSavedConfig && data.envKeys.aiProvider) {
              setActiveProviderConfigState((prev) => ({
                ...prev,
                provider: data.envKeys.aiProvider,
                baseUrl: data.envKeys.local?.url || prev.baseUrl,
                model:
                  data.envKeys.aiProvider === "local"
                    ? data.envKeys.local?.model || prev.model
                    : prev.model,
              }));
            }
          } catch {}
        }
      } else {
        setIsStandalone(false);
        setEnvKeyStatus(null);
        setActiveProviderConfigState(prev => {
          if (prev.provider === "local") {
            const reset = { ...prev, provider: "gemini" as const, model: "gemini-3.1-flash-lite" };
            try {
              localStorage.setItem("script_automation_active_provider_config", JSON.stringify(reset));
            } catch {}
            return reset;
          }
          return prev;
        });
      }
    } catch {
      // ignore transient errors
    } finally {
      setSystemModeChecked(true);
    }
  };

  useEffect(() => {
    void refreshSystemMode();
  }, []);
  const [currentTheme, setCurrentThemeState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("script_automation_app_theme");
      if (saved) return saved;
    } catch {}
    return "Night";
  });
  const [currentBrand, setCurrentBrandState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("script_automation_app_brand");
      if (saved) return saved;
    } catch {}
    return "orange";
  });

  useEffect(() => {
    let faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (!faviconLink) {
      faviconLink = document.createElement("link");
      faviconLink.rel = "icon";
      faviconLink.type = "image/svg+xml";
      document.head.appendChild(faviconLink);
    }
    if (currentTheme === "Day" || currentTheme === "Day Mode") {
      document.body.classList.add("day-theme");
      document.body.classList.remove("night-theme");
      faviconLink.href = "/favicon.svg";
    } else {
      document.body.classList.add("night-theme");
      document.body.classList.remove("day-theme");
      faviconLink.href = "/favicon-night.svg";
    }
  }, [currentTheme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-brand", currentBrand);
    if (currentBrand === "blue") {
      document.documentElement.style.setProperty("--color-primary", "#2774FC");
      document.documentElement.style.setProperty("--color-secondary", "#FF073A");
    } else {
      document.documentElement.style.setProperty("--color-primary", "#FF073A");
      document.documentElement.style.setProperty("--color-secondary", "#2774FC");
    }
  }, [currentBrand]);

  const setCurrentTheme = (theme: string) => {
    setCurrentThemeState(theme);
    try {
      localStorage.setItem("script_automation_app_theme", theme);
    } catch {}
  };

  const setCurrentBrand = (brand: string) => {
    setCurrentBrandState(brand);
    try {
      localStorage.setItem("script_automation_app_brand", brand);
    } catch {}
  };


  const [modelSettings, setModelSettings] = useState<FeatureModelConfig>(() => {
    try {
      const saved = localStorage.getItem("script_automation_model_settings");
      if (saved) {
        return { ...DEFAULT_FEATURE_MODELS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error("Error reading model settings from localStorage:", e);
    }
    return DEFAULT_FEATURE_MODELS;
  });
  const [availableModels, setAvailableModels] = useState<AvailableModelOption[]>([
    { id: "gemini-3.6-flash", displayName: "Gemini 3.6 Flash (Fast & Capable)", providerType: "gemini" },
    { id: "gemini-3.1-pro-preview", displayName: "Gemini 3.1 Pro (Reasoning & Quality)", providerType: "gemini" },
    { id: "gemini-3.1-flash-lite", displayName: "Gemini 3.1 Flash Lite (Ultra Fast)", providerType: "gemini" },
    { id: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash", providerType: "gemini" },
    { id: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro", providerType: "gemini" },
    { id: "gemini-2.5-flash-lite", displayName: "Gemini 2.5 Flash Lite", providerType: "gemini" },
  ]);
  const [availableLocalModels, setAvailableLocalModels] = useState<AvailableModelOption[]>([]);

  const fetchAvailableModels = async () => {
    if (!systemModeChecked) return;
    if (!isStandalone && !idToken) return;
    try {
      const headers: Record<string, string> = {
        "x-standalone-mode": isStandalone ? "true" : "false",
        "x-provider-type": !isStandalone && activeProviderConfig.provider === "local"
          ? "gemini"
          : activeProviderConfig.provider,
      };
      if (!isStandalone && idToken) {
        headers.Authorization = `Bearer ${idToken}`;
      }
      if (activeProviderConfig.baseUrl) {
        headers["x-provider-baseurl"] = activeProviderConfig.baseUrl;
      }
      if (activeProviderConfig.model) {
        headers["x-provider-model"] = activeProviderConfig.model;
      }
      if (activeProviderConfig.apiKey?.trim()) {
        headers["x-provider-key"] = activeProviderConfig.apiKey.trim();
      }

      const url = `/api/user/available-models${isStandalone ? "?includeLocal=true" : ""}`;
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.models && Array.isArray(data.models) && data.models.length > 0) {
          setAvailableModels(data.models);
        }
        if (isStandalone && Array.isArray(data.localModels)) {
          setAvailableLocalModels(data.localModels);
        } else if (!isStandalone) {
          setAvailableLocalModels([]);
        }
      }
    } catch (e) {
      console.error("Error fetching available models:", e);
    }
  };

  useEffect(() => {
    void fetchAvailableModels();
  }, [systemModeChecked, isStandalone, idToken, activeProviderConfig.provider, activeProviderConfig.baseUrl]);

  const updateModelSettings = async (newSettings: Partial<FeatureModelConfig>) => {
    const merged = { ...modelSettings, ...newSettings };
    setModelSettings(merged);
    try {
      localStorage.setItem("script_automation_model_settings", JSON.stringify(merged));
    } catch (e) {
      console.error("Error saving model settings to localStorage:", e);
    }

    if (idToken) {
      try {
        await fetch("/api/user/model-settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ modelSettings: merged }),
        });
      } catch (e) {
        console.error("Error saving model settings to server:", e);
      }
    }
  };

  const syncDirectoryWithServer = async (token: string, resolvedProfile: UserProfile) => {
    try {
      await fetch("/api/user/sync-directory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: resolvedProfile.name,
          provider: resolvedProfile.provider,
          hasApiKey: resolvedProfile.hasApiKey,
          apiKeyMasked: resolvedProfile.apiKeyMasked,
          createdAt: resolvedProfile.createdAt,
          updatedAt: resolvedProfile.updatedAt,
        }),
      });
    } catch {
      // non-blocking directory sync
    }
  };

  const fetchProfile = async (currentUser: User, token?: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      let resolved: UserProfile;
      if (userDoc.exists()) {
        const data = userDoc.data();
        const userEmail = (currentUser.email || data.email || "").toLowerCase();
        const isSoleAdmin = userEmail === "tahsinirshad7370@gmail.com";

        if (data.modelSettings) {
          setModelSettings(prev => ({ ...prev, ...data.modelSettings }));
        }

        const effectiveProvider = !isStandalone && data.activeProvider === "local"
          ? "gemini"
          : (data.activeProvider || "gemini");

        if (data.activeProvider) {
          setActiveProviderConfigState(prev => ({
            ...prev,
            provider: effectiveProvider,
            model: data.activeModel || prev.model,
            baseUrl: data.baseUrl || prev.baseUrl,
          }));
        }

        resolved = {
          userId: currentUser.uid,
          name: data.name || currentUser.displayName || currentUser.email?.split("@")[0] || "User",
          email: data.email || currentUser.email || "",
          profilePhoto: data.profilePhoto || currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`,
          provider: data.provider || "password",
          role: isSoleAdmin ? "admin" : "user",
          isAdmin: isSoleAdmin,
          apiKeyMasked: data.apiKeyMasked || null,
          hasApiKey: Boolean(data.encryptedApiKey || data.apiKeyMasked),
          activeProvider: effectiveProvider,
          activeModel: data.activeModel || "gemini-3.1-flash-lite",
          baseUrl: data.baseUrl || "http://127.0.0.1:1279/v1",
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
        setProfile(resolved);
      } else {
        resolved = await syncUserProfile(currentUser);
        setProfile(resolved);
      }
      if (token) {
        void syncDirectoryWithServer(token, resolved);
      }
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      const synced = await syncUserProfile(currentUser);
      setProfile(synced);
      if (token) {
        void syncDirectoryWithServer(token, synced);
      }
    }
  };

  useEffect(() => {
    if (!systemModeChecked) return;
    if (isStandalone) {
      setUser(null);
      setProfile(null);
      setIdToken(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken(true);
          setIdToken(token);
          await fetchProfile(currentUser, token);
        } catch (e) {
          console.error("Error getting ID token:", e);
        }
      } else {
        setProfile(null);
        setIdToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [systemModeChecked, isStandalone]);

  const handleSetIsAuthModalOpen = (open: boolean) => {
    if (isStandalone && open) return;
    setIsAuthModalOpen(open);
  };

  const refreshProfile = async () => {
    if (isStandalone) {
      await refreshSystemMode();
      return;
    }
    if (user) {
      try {
        const token = await user.getIdToken(true);
        setIdToken(token);
        await fetchProfile(user, token);
      } catch (e) {
        console.error("Error refreshing profile:", e);
      }
    }
  };

  const logout = async () => {
    if (isStandalone) return;
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setIdToken(null);
  };

  const deleteAccount = async () => {
    if (isStandalone) return;
    if (user && idToken) {
      try {
        await fetch("/api/user/delete-account", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
        });
      } catch (err) {
        console.error("Failed to delete account on backend:", err);
      }
      await deleteUser(user);
      setUser(null);
      setProfile(null);
      setIdToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        idToken,
        isStandalone,
        systemModeChecked,
        envKeyStatus,
        refreshSystemMode,
        activeProviderConfig,
        updateProviderConfig,
        refreshProfile,
        logout,
        deleteAccount,
        isAuthModalOpen: isStandalone ? false : isAuthModalOpen,
        setIsAuthModalOpen: handleSetIsAuthModalOpen,
        isApiKeyModalOpen,
        setIsApiKeyModalOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        isAdminModalOpen: isStandalone ? false : isAdminModalOpen,
        setIsAdminModalOpen,
        isImageStudioOpen: false,
        setIsImageStudioOpen: () => {},
        isTutorialModalOpen,
        setIsTutorialModalOpen,
        initialImagePrompt: "",
        openImageStudioWithPrompt: () => {},
        modelSettings,
        updateModelSettings,
        availableModels,
        availableLocalModels,
        fetchAvailableModels,
        currentTheme,
        setCurrentTheme,
        currentBrand,
        setCurrentBrand,
        activeWorkspace,
        setActiveWorkspace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
