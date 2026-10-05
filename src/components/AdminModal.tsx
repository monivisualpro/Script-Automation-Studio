import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getThemeConfig } from "../lib/themeConfig";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import firebaseConfig from "../../firebase-applet-config.json";
import { 
  ShieldCheck, 
  Crown, 
  Users, 
  Key, 
  X, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  AlertTriangle,
  Sparkles,
  Lock,
  Mail,
  Calendar,
  Database,
  UserPlus,
  Plus,
  Info,
  Check
} from "lucide-react";

interface AdminUser {
  userId: string;
  name: string;
  email: string;
  provider: string;
  role: "admin" | "user";
  isAdmin: boolean;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const { idToken, profile, currentTheme, currentBrand } = useAuth();
  const theme = getThemeConfig(currentTheme, currentBrand);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sync / Import Firebase Auth User State
  const [isSyncFormOpen, setIsSyncFormOpen] = useState<boolean>(false);
  const [newEmail, setNewEmail] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [newUid, setNewUid] = useState<string>("");
  const [newProvider, setNewProvider] = useState<string>("google.com");
  const [syncingUser, setSyncingUser] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!idToken) return;
    setLoading(true);
    setError(null);
    const userMap = new Map<string, AdminUser>();

    // 1. Direct Client-side Firestore SDK query (reads live Firestore database)
    try {
      const snap = await getDocs(collection(db, "users"));
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const uid = docSnap.id;
        const userEmail = (d.email || "").trim().toLowerCase();
        const isSoleAdmin = userEmail === "tahsinirshad7370@gmail.com";
        userMap.set(uid, {
          userId: uid,
          name: d.name || d.email?.split("@")[0] || "User",
          email: d.email || "No email",
          provider: d.provider || "password",
          role: isSoleAdmin ? "admin" : (d.role === "admin" ? "admin" : "user"),
          isAdmin: Boolean(isSoleAdmin || d.isAdmin),
          hasApiKey: Boolean(d.encryptedApiKey || d.apiKeyMasked),
          apiKeyMasked: d.apiKeyMasked || null,
          createdAt: d.createdAt || null,
          updatedAt: d.updatedAt || null,
        });
      });
    } catch (fsErr) {
      console.warn("Direct Firestore SDK list query notice:", fsErr);
    }

    // 2. Server-side Directory Registry & REST sync
    try {
      const res = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.users)) {
          data.users.forEach((u: AdminUser) => {
            if (u.userId) {
              const existing = userMap.get(u.userId);
              userMap.set(u.userId, {
                ...u,
                ...(existing || {}),
                hasApiKey: u.hasApiKey || existing?.hasApiKey || false,
                apiKeyMasked: u.apiKeyMasked || existing?.apiKeyMasked || null,
              });
            }
          });
        }
      } else if (userMap.size === 0) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load admin user directory.");
      }
    } catch (err: any) {
      console.error("Fetch Admin Users Error:", err);
      if (userMap.size === 0) {
        setError(err.message || "Failed to load users.");
      }
    } finally {
      const finalUsers = Array.from(userMap.values()).sort((a, b) => {
        if (a.isAdmin && !b.isAdmin) return -1;
        if (!a.isAdmin && b.isAdmin) return 1;
        return (b.updatedAt || "").localeCompare(a.updatedAt || "");
      });
      setUsers(finalUsers);
      setLoading(false);
    }
  };

  const handleSyncUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idToken || !newEmail.trim()) return;
    setSyncingUser(true);
    setSyncSuccess(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/sync-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          email: newEmail.trim(),
          name: newName.trim() || undefined,
          userId: newUid.trim() || undefined,
          provider: newProvider,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to sync user account.");
      }

      setSyncSuccess(`Account "${newEmail.trim()}" synced successfully to live directory!`);
      setNewEmail("");
      setNewName("");
      setNewUid("");
      setIsSyncFormOpen(false);
      await fetchUsers();
      setTimeout(() => setSyncSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to sync user account.");
    } finally {
      setSyncingUser(false);
    }
  };

  useEffect(() => {
    if (isOpen && idToken) {
      fetchUsers();
    }
  }, [isOpen, idToken]);

  if (!isOpen) return null;

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = users.length;
  const activeKeysCount = users.filter((u) => u.hasApiKey).length;

  const isLight = theme.isLight;

  const formatJoinedDate = (iso: string | null): string => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-2xl animate-[fadeIn_0.15s_ease-out] ${isLight ? "bg-black/30" : "bg-black/85"}`}>
      <div 
        className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden border shadow-2xl transition-all duration-300 ${
          isLight ? "border-[#E5E5E5] bg-[#FFFFFF] text-[#000000]" : "border-[#2A2A2A] bg-[#1A1A1A] text-white"
        }`}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between p-5 border-b relative z-10 ${
          isLight ? "border-[#E5E5E5] bg-[#F7F7F7]" : "border-[#2A2A2A] bg-[#111111]"
        }`}>
          <div className="flex items-center gap-3">
            <div 
              className={`p-3 rounded-2xl border shadow-lg flex items-center justify-center ${
                isLight ? "border-[#E5E5E5] bg-[#FFFFFF]" : "border-[#2A2A2A] bg-[#111111]"
              }`}
              style={{ color: theme.accentColor }}
            >
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-xl font-extrabold font-sans tracking-tight ${isLight ? "text-[#000000]" : "text-white"}`}>
                  Admin Command Console
                </h2>
                <span 
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 border"
                  style={{ borderColor: `${theme.secondaryAccentColor}66`, backgroundColor: `${theme.secondaryAccentColor}1A`, color: theme.secondaryAccentColor }}
                >
                  <ShieldCheck className="h-3 w-3" />
                  Read-Only Sole Owner Mode
                </span>
              </div>
              <p className={`text-xs font-mono mt-0.5 ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                Locked exclusively to <span className={`font-bold ${isLight ? "text-[#000000]" : "text-white"}`}>{profile?.email}</span> · Role delegation disabled for security
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              isLight ? "border-[#E5E5E5] bg-[#FFFFFF] text-[#000000]" : "border-[#2A2A2A] bg-[#111111] text-white"
            }`}
            title="Close admin console"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Admin Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-4 rounded-2xl border flex flex-col ${isLight ? "border-[#E5E5E5] bg-[#F7F7F7]" : "border-[#2A2A2A] bg-[#111111]"}`}>
              <div className={`flex items-center justify-between mb-1 ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                <span className="text-[11px] font-mono uppercase tracking-wider">Total Users</span>
                <Users className="h-4 w-4" style={{ color: theme.accentColor }} />
              </div>
              <span className={`text-2xl font-black font-mono tabular-nums ${isLight ? "text-[#000000]" : "text-white"}`}>{totalUsers}</span>
            </div>

            <div className={`p-4 rounded-2xl border flex flex-col ${isLight ? "border-[#E5E5E5] bg-[#F7F7F7]" : "border-[#2A2A2A] bg-[#111111]"}`}>
              <div className={`flex items-center justify-between mb-1 ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                <span className="text-[11px] font-mono uppercase tracking-wider">API Keys Set</span>
                <Key className="h-4 w-4" style={{ color: theme.secondaryAccentColor }} />
              </div>
              <span className="text-2xl font-black font-mono tabular-nums" style={{ color: theme.secondaryAccentColor }}>{activeKeysCount}</span>
            </div>

            <div className={`p-4 rounded-2xl border flex flex-col ${isLight ? "border-[#E5E5E5] bg-[#F7F7F7]" : "border-[#2A2A2A] bg-[#111111]"}`}>
              <div className={`flex items-center justify-between mb-1 ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                <span className="text-[11px] font-mono uppercase tracking-wider">Admin Lock</span>
                <Crown className="h-4 w-4" style={{ color: theme.accentColor }} />
              </div>
              <span className="text-xs font-bold font-mono mt-2" style={{ color: theme.accentColor }}>1 Owner (Locked)</span>
            </div>

            <div className={`p-4 rounded-2xl border flex flex-col ${isLight ? "border-[#E5E5E5] bg-[#F7F7F7]" : "border-[#2A2A2A] bg-[#111111]"}`}>
              <div className={`flex items-center justify-between mb-1 ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                <span className="text-[11px] font-mono uppercase tracking-wider">Key Security</span>
                <Lock className="h-4 w-4" style={{ color: theme.secondaryAccentColor }} />
              </div>
              <span className="text-xs font-bold font-mono mt-2" style={{ color: theme.secondaryAccentColor }}>AES-256 + Rate Limit</span>
            </div>
          </div>

          {/* Firestore Database & Project Reference Bar */}
          <div className={`p-3 px-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono ${
            isLight ? "border-[#E5E5E5] bg-[#F7F7F7]" : "border-[#2A2A2A] bg-[#111111]"
          }`}>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 shrink-0" style={{ color: theme.secondaryAccentColor }} />
              <div>
                <span className={`font-bold ${isLight ? "text-[#000000]" : "text-white"}`}>Firestore Database: </span>
                <span className="opacity-85 font-semibold">{firebaseConfig.firestoreDatabaseId || "(default)"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className={isLight ? "text-[#444444]" : "text-[#BDBDBD]"}>Project: <strong className={isLight ? "text-[#000000]" : "text-white"}>{firebaseConfig.projectId}</strong></span>
              <span className="opacity-40">·</span>
              <span className="flex items-center gap-1 text-emerald-500 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Sync Active
              </span>
            </div>
          </div>

          {/* Directory Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="relative w-full sm:w-80">
              <Search className={`absolute left-3.5 top-3 h-4 w-4 ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`} />
              <input
                type="text"
                placeholder="Search user by name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border rounded-2xl py-2 pl-10 pr-4 text-xs font-mono focus:outline-none ${
                  isLight ? "border-[#E5E5E5] bg-[#F7F7F7] text-[#000000]" : "border-[#2A2A2A] bg-[#111111] text-white"
                }`}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsSyncFormOpen(!isSyncFormOpen)}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-2xl border transition-all text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  isSyncFormOpen
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : (isLight ? "border-[#E5E5E5] bg-[#FFFFFF] text-[#000000] hover:bg-[#F7F7F7]" : "border-[#2A2A2A] bg-[#111111] text-white hover:bg-[#1A1A1A]")
                }`}
                title="Sync or link an account from Firebase Authentication"
              >
                <UserPlus className="h-3.5 w-3.5" style={{ color: theme.secondaryAccentColor }} />
                <span>{isSyncFormOpen ? "Close Sync" : "Sync Firebase User"}</span>
              </button>

              <button
                onClick={fetchUsers}
                disabled={loading}
                className="flex-1 sm:flex-none px-4 py-2 rounded-2xl border text-white transition-all text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: theme.accentColor, borderColor: theme.accentColor }}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh Directory</span>
              </button>
            </div>
          </div>

          {/* Sync Firebase Auth User Panel */}
          {isSyncFormOpen && (
            <form 
              onSubmit={handleSyncUser}
              className={`p-4 rounded-2xl border space-y-3 animate-[fadeIn_0.2s_ease-out] ${
                isLight ? "border-[#E5E5E5] bg-[#F7F7F7]" : "border-[#2A2A2A] bg-[#111111]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" style={{ color: theme.secondaryAccentColor }} />
                  <span className={`text-xs font-bold font-mono ${isLight ? "text-[#000000]" : "text-white"}`}>
                    Import / Link Account from Firebase Authentication
                  </span>
                </div>
                <span className={`text-[11px] font-mono ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                  Directly provisions Firestore profile
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className={`block text-[10px] font-mono uppercase tracking-wider mb-1 ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                    Email in Firebase Auth *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="creator@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className={`w-full border rounded-xl py-2 px-3 text-xs font-mono focus:outline-none ${
                      isLight ? "border-[#E5E5E5] bg-[#FFFFFF] text-[#000000]" : "border-[#2A2A2A] bg-[#1A1A1A] text-white"
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-[10px] font-mono uppercase tracking-wider mb-1 ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                    Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className={`w-full border rounded-xl py-2 px-3 text-xs font-mono focus:outline-none ${
                      isLight ? "border-[#E5E5E5] bg-[#FFFFFF] text-[#000000]" : "border-[#2A2A2A] bg-[#1A1A1A] text-white"
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-[10px] font-mono uppercase tracking-wider mb-1 ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                    Firebase UID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="User UID from Firebase Console"
                    value={newUid}
                    onChange={(e) => setNewUid(e.target.value)}
                    className={`w-full border rounded-xl py-2 px-3 text-xs font-mono focus:outline-none ${
                      isLight ? "border-[#E5E5E5] bg-[#FFFFFF] text-[#000000]" : "border-[#2A2A2A] bg-[#1A1A1A] text-white"
                    }`}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5 text-[11px] font-mono opacity-80">
                  <Info className="h-3.5 w-3.5 shrink-0" style={{ color: theme.secondaryAccentColor }} />
                  <span>Accounts in Firebase Console that haven't signed in yet can be linked here instantly.</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsSyncFormOpen(false)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-mono cursor-pointer ${
                      isLight ? "border-[#E5E5E5] text-[#444444]" : "border-[#2A2A2A] text-[#BDBDBD]"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={syncingUser || !newEmail.trim()}
                    className="px-4 py-1.5 rounded-xl border text-white font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: theme.secondaryAccentColor, borderColor: theme.secondaryAccentColor }}
                  >
                    {syncingUser ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    <span>Link & Sync User</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Sync Success Banner */}
          {syncSuccess && (
            <div 
              className="p-3 px-4 rounded-2xl border text-xs font-mono flex items-center gap-2 bg-emerald-500/10 border-emerald-500 text-emerald-400 animate-[fadeIn_0.2s_ease]"
            >
              <Check className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{syncSuccess}</span>
            </div>
          )}

          {/* Users Table */}
          {error && (
            <div 
              className="p-4 rounded-2xl border text-xs font-mono flex items-center gap-2"
              style={{ backgroundColor: `${theme.accentColor}1A`, borderColor: theme.accentColor, color: theme.accentColor }}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: theme.accentColor }} />
              <span>{error}</span>
            </div>
          )}

          <div className={`border rounded-2xl overflow-x-auto ${isLight ? "border-[#E5E5E5] bg-[#FFFFFF]" : "border-[#2A2A2A] bg-[#111111]"}`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-mono uppercase tracking-wider ${
                  isLight ? "border-[#E5E5E5] bg-[#F0F0F0] text-[#444444]" : "border-[#2A2A2A] bg-[#000000] text-[#BDBDBD]"
                }`}>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Auth Method</th>
                  <th className="py-3 px-4">API Key Status</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Registered</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs font-mono ${isLight ? "divide-[#E5E5E5]" : "divide-[#2A2A2A]"}`}>
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={`py-8 text-center ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" style={{ color: theme.secondaryAccentColor }} />
                        <span>Fetching user records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={`py-8 text-center ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                      No users found matching query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isPrimary = u.email.toLowerCase() === "tahsinirshad7370@gmail.com";
                    return (
                      <tr key={u.userId} className={`transition-colors ${isLight ? "hover:bg-[#F7F7F7]" : "hover:bg-[#1A1A1A]"}`}>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold ${
                                isLight ? "border-[#E5E5E5] bg-[#F7F7F7]" : "border-[#2A2A2A] bg-[#1A1A1A]"
                              }`}
                              style={{ color: theme.accentColor }}
                            >
                              {u.name.substring(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <div className={`font-bold flex items-center gap-1.5 ${isLight ? "text-[#000000]" : "text-white"}`}>
                                <span>{u.name}</span>
                                {isPrimary && (
                                  <span 
                                    className="px-1.5 py-0.2 rounded border text-[9px] font-extrabold"
                                    style={{ borderColor: theme.accentColor, backgroundColor: `${theme.accentColor}33`, color: theme.accentColor }}
                                  >
                                    Sole Owner
                                  </span>
                                )}
                              </div>
                              <div className={`text-[11px] ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-xl border text-[11px] capitalize inline-flex items-center gap-1 ${
                            isLight ? "border-[#E5E5E5] bg-[#F7F7F7] text-[#444444]" : "border-[#2A2A2A] bg-[#1A1A1A] text-[#BDBDBD]"
                          }`}>
                            <Mail className="h-3 w-3" style={{ color: theme.secondaryAccentColor }} />
                            <span>{u.provider}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {u.hasApiKey ? (
                            <span className="font-bold flex items-center gap-1" style={{ color: theme.secondaryAccentColor }}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Configured ({u.apiKeyMasked || "Active"})</span>
                            </span>
                          ) : (
                            <span className={`flex items-center gap-1 opacity-60 ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                              <X className="h-3.5 w-3.5" style={{ color: theme.accentColor }} />
                              <span>Not set</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {isPrimary ? (
                            <span 
                              className="px-2.5 py-1 rounded-xl border font-bold text-[10px] inline-flex items-center gap-1"
                              style={{ borderColor: theme.accentColor, backgroundColor: `${theme.accentColor}33`, color: theme.accentColor }}
                            >
                              <Crown className="h-3 w-3" />
                              <span>Admin</span>
                            </span>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-xl border text-[10px] ${
                              isLight ? "border-[#E5E5E5] text-[#444444]" : "border-[#2A2A2A] text-[#BDBDBD]"
                            }`}>
                              User
                            </span>
                          )}
                        </td>

                        <td className={`py-3.5 px-4 text-right tabular-nums ${isLight ? "text-[#444444]" : "text-[#BDBDBD]"}`}>
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 opacity-70" />
                            <span>{formatJoinedDate(u.createdAt)}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-between text-xs font-mono ${
          isLight ? "border-[#E5E5E5] bg-[#F7F7F7] text-[#444444]" : "border-[#2A2A2A] bg-[#111111] text-[#BDBDBD]"
        }`}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: theme.accentColor }} />
            <span>Zero-Trust Read-Only Directory · Owner-Only Writes Enforced</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-bold border text-white transition-all cursor-pointer"
            style={{ backgroundColor: theme.accentColor, borderColor: theme.accentColor }}
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
