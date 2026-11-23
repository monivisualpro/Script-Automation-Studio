import React, { createContext, useContext, useEffect, useState } from "react";

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

export interface LocalProfileStub {
  userId: string;
  name: string;
  email: string;
  activeProvider?: "gemini" | "openai" | "claude" | "local";
  activeModel?: string;
  baseUrl?: string;
  hasApiKey?: boolean;
  apiKeyMasked?: string | null;
}

export const DEFAULT_PROVIDER_CONFIG: ActiveProviderConfig = {
  provider: "gemini",
  apiKey: "",
  model: "gemini-3.1-flash-lite",
  baseUrl: "http://127.0.0.1:1279/v1",
};

interface AuthContextType {
  user: null;
  profile: LocalProfileStub | null;
  loading: boolean;
  idToken: string | null;
  isStandalone: boolean;
  systemModeChecked: boolean;
  envKeyStatus: EnvKeyStatus | null;
  refreshSystemMode: () => Promise<void>;
  activeProviderConfig: ActiveProviderConfig;
  updateProviderConfig: (config: Partial<ActiveProviderConfig>) => void;
  refreshProfile: () => Promise<void>;
  removeApiKey: () => Promise<boolean>;
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
  loading: false,
  idToken: null,
  isStandalone: true,
  systemModeChecked: true,
  envKeyStatus: null,
  refreshSystemMode: async () => {},
  activeProviderConfig: DEFAULT_PROVIDER_CONFIG,
  updateProviderConfig: () => {},
  refreshProfile: async () => {},
  removeApiKey: async () => false,
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
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState<boolean>(false);
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
    setActiveProviderConfigState((prev) => {
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
      if (data?.envKeys) {
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
    } catch {
      // ignore transient startup errors
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
    try {
      const headers: Record<string, string> = {
        "x-provider-type": activeProviderConfig.provider,
      };
      if (activeProviderConfig.baseUrl) {
        headers["x-provider-baseurl"] = activeProviderConfig.baseUrl;
      }
      if (activeProviderConfig.model) {
        headers["x-provider-model"] = activeProviderConfig.model;
      }
      if (activeProviderConfig.apiKey?.trim()) {
        headers["x-provider-key"] = activeProviderConfig.apiKey.trim();
      }

      const res = await fetch("/api/user/available-models?includeLocal=true", { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.models && Array.isArray(data.models) && data.models.length > 0) {
          setAvailableModels(data.models);
        }
        if (Array.isArray(data.localModels)) {
          setAvailableLocalModels(data.localModels);
        }
      }
    } catch (e) {
      console.error("Error fetching available models:", e);
    }
  };

  // Re-fetch when the key changes too (debounced): otherwise entering a key after choosing a provider
  // leaves the model list stuck on the built-in defaults and the key is never validated against it.
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchAvailableModels();
    }, 400);
    return () => clearTimeout(timer);
  }, [systemModeChecked, activeProviderConfig.provider, activeProviderConfig.baseUrl, activeProviderConfig.apiKey]);

  const updateModelSettings = async (newSettings: Partial<FeatureModelConfig>) => {
    const merged = { ...modelSettings, ...newSettings };
    setModelSettings(merged);
    try {
      localStorage.setItem("script_automation_model_settings", JSON.stringify(merged));
    } catch (e) {
      console.error("Error saving model settings to localStorage:", e);
    }

    try {
      await fetch("/api/user/model-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelSettings: merged }),
      });
    } catch {
      // localStorage already updated
    }
  };

  const removeApiKey = async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/user/remove-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "all" }),
      });
      if (!res.ok) return false;
      updateProviderConfig({ apiKey: "" });
      await refreshSystemMode();
      return true;
    } catch (err) {
      console.error("Error removing API key:", err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: null,
        profile: null,
        loading: false,
        idToken: null,
        isStandalone: true,
        systemModeChecked,
        envKeyStatus,
        refreshSystemMode,
        activeProviderConfig,
        updateProviderConfig,
        refreshProfile: refreshSystemMode,
        removeApiKey,
        logout: async () => {},
        deleteAccount: async () => {},
        isAuthModalOpen: false,
        setIsAuthModalOpen: () => {},
        isApiKeyModalOpen,
        setIsApiKeyModalOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        isAdminModalOpen: false,
        setIsAdminModalOpen: () => {},
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
