import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getThemeConfig } from "../lib/themeConfig";
import { 
  ShieldCheck, 
  Crown, 
  Users, 
  Key, 
  X, 
  RefreshCw, 
  Search, 
  UserCheck, 
  UserX, 
  CheckCircle2, 
  AlertTriangle,
  Sparkles,
  Server,
  Lock,
  Mail,
  Zap
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
  const { idToken, profile, currentTheme } = useAuth();
  const theme = getThemeConfig(currentTheme);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!idToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load admin user directory.");
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      console.error("Fetch Admin Users Error:", err);
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && idToken) {
      fetchUsers();
    }
  }, [isOpen, idToken]);

  const handleToggleRole = async (targetUserId: string, currentRole: string) => {
    if (!idToken) return;
    const newRole = currentRole === "admin" ? "user" : "admin";
    setUpdatingUser(targetUserId);
    try {
      const res = await fetch("/api/admin/toggle-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ targetUserId, newRole }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update role.");
      }
      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.userId === targetUserId
            ? { ...u, role: newRole as "admin" | "user", isAdmin: newRole === "admin" }
            : u
        )
      );
    } catch (err: any) {
      alert(`Error updating user role: ${err.message}`);
    } finally {
      setUpdatingUser(null);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = users.length;
  const activeKeysCount = users.filter((u) => u.hasApiKey).length;
  const adminsCount = users.filter((u) => u.isAdmin || u.role === "admin").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-2xl animate-[fadeIn_0.15s_ease-out]">
      {/* Floating Liquid Background Blob behind Admin Modal */}
      <div 
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] rounded-full blur-[140px] pointer-events-none opacity-25 animate-liquid-blob-1"
        style={{ backgroundColor: theme.accentColor }} 
      />

      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col glass-panel rounded-3xl shadow-2xl overflow-hidden border border-white/20 backdrop-blur-2xl" style={{ color: theme.textColor }}>
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 animate-pulse" style={{ backgroundColor: theme.accentColor }} />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 glass-card relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl glass-card border shadow-lg flex items-center justify-center" style={{ borderColor: `${theme.accentColor}60`, color: theme.accentColor }}>
              <Crown className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold font-sans tracking-tight" style={{ color: theme.textColor }}>
                  Admin Command Console
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 border shadow-sm" style={{ backgroundColor: `${theme.accentColor}25`, borderColor: `${theme.accentColor}60`, color: theme.accentColor }}>
                  <ShieldCheck className="h-3 w-3" />
                  Primary Admin Active
                </span>
              </div>
              <p className="text-xs font-mono mt-0.5 opacity-80" style={{ color: theme.textColor }}>
                Full platform control for <span className="font-bold" style={{ color: theme.accentColor }}>{profile?.email}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl glass-button border transition-transform duration-200 hover:scale-110 active:scale-90 cursor-pointer"
            style={{ backgroundColor: `${theme.accentColor}15`, borderColor: `${theme.accentColor}40`, color: theme.textColor }}
            title="Close admin console"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Admin Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl border flex flex-col" style={{ backgroundColor: theme.cardBg.includes("bg-white") ? "#f1f5f9" : "rgba(0,0,0,0.4)", borderColor: `${theme.accentColor}30` }}>
              <div className="flex items-center justify-between mb-1 opacity-70" style={{ color: theme.textColor }}>
                <span className="text-[11px] font-mono uppercase tracking-wider">Total Users</span>
                <Users className="h-4 w-4" style={{ color: theme.accentColor }} />
              </div>
              <span className="text-2xl font-black font-mono" style={{ color: theme.textColor }}>{totalUsers}</span>
            </div>

            <div className="p-4 rounded-2xl border flex flex-col" style={{ backgroundColor: theme.cardBg.includes("bg-white") ? "#f1f5f9" : "rgba(0,0,0,0.4)", borderColor: `${theme.accentColor}30` }}>
              <div className="flex items-center justify-between mb-1 opacity-70" style={{ color: theme.textColor }}>
                <span className="text-[11px] font-mono uppercase tracking-wider">API Keys Set</span>
                <Key className="h-4 w-4" style={{ color: theme.accentColor }} />
              </div>
              <span className="text-2xl font-black font-mono" style={{ color: theme.accentColor }}>{activeKeysCount}</span>
            </div>

            <div className="p-4 rounded-2xl border flex flex-col" style={{ backgroundColor: theme.cardBg.includes("bg-white") ? "#f1f5f9" : "rgba(0,0,0,0.4)", borderColor: `${theme.accentColor}30` }}>
              <div className="flex items-center justify-between mb-1 opacity-70" style={{ color: theme.textColor }}>
                <span className="text-[11px] font-mono uppercase tracking-wider">Admins</span>
                <Crown className="h-4 w-4" style={{ color: theme.accentColor }} />
              </div>
              <span className="text-2xl font-black font-mono" style={{ color: theme.accentColor }}>{adminsCount}</span>
            </div>

            <div className="p-4 rounded-2xl border flex flex-col" style={{ backgroundColor: theme.cardBg.includes("bg-white") ? "#f1f5f9" : "rgba(0,0,0,0.4)", borderColor: `${theme.accentColor}30` }}>
              <div className="flex items-center justify-between mb-1 opacity-70" style={{ color: theme.textColor }}>
                <span className="text-[11px] font-mono uppercase tracking-wider">Encryption</span>
                <Lock className="h-4 w-4" style={{ color: theme.accentColor }} />
              </div>
              <span className="text-xs font-bold font-mono mt-2" style={{ color: theme.accentColor }}>AES-256-GCM</span>
            </div>
          </div>

          {/* Directory Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-3 h-4 w-4 opacity-50" style={{ color: theme.textColor }} />
              <input
                type="text"
                placeholder="Search user by name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border rounded-2xl py-2 pl-10 pr-4 text-xs font-mono focus:outline-none"
                style={{
                  backgroundColor: theme.cardBg.includes("bg-white") ? "#ffffff" : "rgba(0,0,0,0.6)",
                  borderColor: `${theme.accentColor}40`,
                  color: theme.textColor
                }}
              />
            </div>

            <button
              onClick={fetchUsers}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 rounded-2xl border transition-all text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: theme.accentColor,
                borderColor: theme.accentColor,
                color: theme.cardBg.includes("bg-white") ? "#ffffff" : "#000000"
              }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Directory</span>
            </button>
          </div>

          {/* Users Table */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="border rounded-2xl overflow-x-auto" style={{ borderColor: `${theme.accentColor}30`, backgroundColor: theme.cardBg.includes("bg-white") ? "#ffffff" : "rgba(0,0,0,0.4)" }}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-[11px] font-mono uppercase tracking-wider" style={{ borderColor: `${theme.accentColor}30`, backgroundColor: `${theme.accentColor}10`, color: theme.textColor }}>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Auth Method</th>
                  <th className="py-3 px-4">API Key Status</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs font-mono" style={{ borderColor: `${theme.accentColor}20` }}>
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center opacity-60" style={{ color: theme.textColor }}>
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" style={{ color: theme.accentColor }} />
                        <span>Fetching user records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center opacity-60" style={{ color: theme.textColor }}>
                      No users found matching query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isPrimary = u.email.toLowerCase() === "tahsinirshad7370@gmail.com";
                    return (
                      <tr key={u.userId} className="transition-colors hover:opacity-90">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold" style={{ backgroundColor: `${theme.accentColor}20`, borderColor: `${theme.accentColor}40`, color: theme.accentColor }}>
                              {u.name.substring(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold flex items-center gap-1.5" style={{ color: theme.textColor }}>
                                <span>{u.name}</span>
                                {isPrimary && (
                                  <span className="px-1.5 py-0.2 rounded border text-[9px] font-extrabold" style={{ backgroundColor: `${theme.accentColor}30`, borderColor: theme.accentColor, color: theme.accentColor }}>
                                    Primary Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] opacity-70" style={{ color: theme.textColor }}>{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-xl border text-[11px] capitalize inline-flex items-center gap-1" style={{ backgroundColor: `${theme.accentColor}10`, borderColor: `${theme.accentColor}30`, color: theme.textColor }}>
                            {u.provider === "google.com" ? (
                              <Mail className="h-3 w-3 text-blue-400" />
                            ) : u.provider === "anonymous" ? (
                              <Zap className="h-3 w-3 text-amber-400" />
                            ) : (
                              <Mail className="h-3 w-3 text-green-400" />
                            )}
                            <span>{u.provider}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {u.hasApiKey ? (
                            <span className="font-bold flex items-center gap-1" style={{ color: theme.accentColor }}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Configured ({u.apiKeyMasked || "Active"})</span>
                            </span>
                          ) : (
                            <span className="opacity-50 flex items-center gap-1" style={{ color: theme.textColor }}>
                              <X className="h-3.5 w-3.5 text-red-400" />
                              <span>Not set</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {u.isAdmin || u.role === "admin" ? (
                            <span className="px-2.5 py-1 rounded-xl border font-bold text-[10px] inline-flex items-center gap-1" style={{ backgroundColor: `${theme.accentColor}20`, borderColor: theme.accentColor, color: theme.accentColor }}>
                              <Crown className="h-3 w-3" />
                              <span>Admin</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl border text-[10px] opacity-70" style={{ borderColor: `${theme.accentColor}20`, color: theme.textColor }}>
                              User
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isPrimary ? (
                            <span className="text-[10px] italic opacity-60" style={{ color: theme.textColor }}>Owner</span>
                          ) : (
                            <button
                              onClick={() => handleToggleRole(u.userId, u.role)}
                              disabled={updatingUser === u.userId}
                              className="px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 border"
                              style={{
                                backgroundColor: u.role === "admin" ? "rgba(153,27,27,0.3)" : theme.accentColor,
                                borderColor: u.role === "admin" ? "#b91c1c" : theme.accentColor,
                                color: u.role === "admin" ? "#fca5a5" : (theme.cardBg.includes("bg-white") ? "#ffffff" : "#000000")
                              }}
                            >
                              {u.role === "admin" ? (
                                <>
                                  <UserX className="h-3 w-3" />
                                  <span>Revoke Admin</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3 w-3" />
                                  <span>Make Admin</span>
                                </>
                              )}
                            </button>
                          )}
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
        <div className="p-4 border-t flex items-center justify-between text-xs font-mono" style={{ borderColor: `${theme.accentColor}30`, backgroundColor: `${theme.accentColor}08`, color: theme.textColor }}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: theme.accentColor }} />
            <span>Script Automation Studio Admin System</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: theme.accentColor,
              color: theme.cardBg.includes("bg-white") ? "#ffffff" : "#000000"
            }}
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
