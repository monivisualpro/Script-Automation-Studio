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
}

export const DEFAULT_FEATURE_MODELS: FeatureModelConfig = {
  youtubeTranscript: "gemini-2.5-flash",
  transcriptCleaning: "gemini-3.1-flash-lite",
  scriptGeneration: "gemini-2.5-pro",
  promptGeneration: "gemini-2.5-flash",
  bulkPromptGeneration: "gemini-2.5-flash",
  rewriteExpand: "gemini-2.5-pro",
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  idToken: string | null;
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
  modelSettings: FeatureModelConfig;
  updateModelSettings: (newSettings: Partial<FeatureModelConfig>) => Promise<void>;
  availableModels: Array<{ id: string; displayName: string }>;
  fetchAvailableModels: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  idToken: null,
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
  modelSettings: DEFAULT_FEATURE_MODELS,
  updateModelSettings: async () => {},
  availableModels: [],
  fetchAvailableModels: async () => {},
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
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; displayName: string }>>([
    { id: "gemini-3.6-flash", displayName: "Gemini 3.6 Flash (Fast & Capable)" },
    { id: "gemini-3.1-pro-preview", displayName: "Gemini 3.1 Pro (Reasoning & Quality)" },
    { id: "gemini-3.1-flash-lite", displayName: "Gemini 3.1 Flash Lite (Ultra Fast)" },
    { id: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro" },
    { id: "gemini-2.5-flash-lite", displayName: "Gemini 2.5 Flash Lite" },
  ]);

  const fetchAvailableModels = async () => {
    if (!idToken) return;
    try {
      const res = await fetch("/api/user/available-models", {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.models && Array.isArray(data.models) && data.models.length > 0) {
          setAvailableModels(data.models);
        }
      }
    } catch (e) {
      console.error("Error fetching available models:", e);
    }
  };

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

  const fetchProfile = async (currentUser: User) => {
    try {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const userEmail = (currentUser.email || data.email || "").toLowerCase();
        const isAdmin = userEmail === "tahsinirshad7370@gmail.com" || data.role === "admin";

        if (data.modelSettings) {
          setModelSettings(prev => ({ ...prev, ...data.modelSettings }));
        }

        setProfile({
          userId: currentUser.uid,
          name: data.name || currentUser.displayName || currentUser.email?.split("@")[0] || "User",
          email: data.email || currentUser.email || "",
          profilePhoto: data.profilePhoto || currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`,
          provider: data.provider || "password",
          role: isAdmin ? "admin" : "user",
          isAdmin,
          apiKeyMasked: data.apiKeyMasked || null,
          hasApiKey: Boolean(data.encryptedApiKey || data.apiKeyMasked),
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      } else {
        const synced = await syncUserProfile(currentUser);
        setProfile(synced);
      }
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      const synced = await syncUserProfile(currentUser);
      setProfile(synced);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken(true);
          setIdToken(token);
          await fetchProfile(currentUser);
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
  }, []);

  const refreshProfile = async () => {
    if (user) {
      try {
        const token = await user.getIdToken(true);
        setIdToken(token);
        await fetchProfile(user);
      } catch (e) {
        console.error("Error refreshing profile:", e);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setIdToken(null);
  };

  const deleteAccount = async () => {
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
        refreshProfile,
        logout,
        deleteAccount,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isApiKeyModalOpen,
        setIsApiKeyModalOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        isAdminModalOpen,
        setIsAdminModalOpen,
        modelSettings,
        updateModelSettings,
        availableModels,
        fetchAvailableModels,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
