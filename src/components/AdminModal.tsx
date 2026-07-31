import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
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
  const { idToken, profile } = useAuth();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-[fadeIn_0.15s_ease-out]">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#020d05] border border-green-800/80 rounded-3xl shadow-[0_0_50px_rgba(0,255,1,0.2)] overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00FF01]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-green-900/80 bg-green-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#00FF01]/20 border border-[#00FF01] text-[#00FF01] shadow-[0_0_15px_rgba(0,255,1,0.3)]">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white font-sans tracking-tight">
                  Admin Command Console
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Primary Admin Active
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Full platform control for <span className="text-[#00FF01] font-bold">{profile?.email}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-black/40 border border-green-900/60 text-gray-400 hover:text-white hover:border-green-600 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Admin Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-green-950/30 border border-green-900/60 flex flex-col">
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span className="text-[11px] font-mono uppercase tracking-wider">Total Users</span>
                <Users className="h-4 w-4 text-[#00FF01]" />
              </div>
              <span className="text-2xl font-black text-white font-mono">{totalUsers}</span>
            </div>

            <div className="p-4 rounded-2xl bg-green-950/30 border border-green-900/60 flex flex-col">
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span className="text-[11px] font-mono uppercase tracking-wider">API Keys Set</span>
                <Key className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-2xl font-black text-emerald-400 font-mono">{activeKeysCount}</span>
            </div>

            <div className="p-4 rounded-2xl bg-green-950/30 border border-green-900/60 flex flex-col">
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span className="text-[11px] font-mono uppercase tracking-wider">Admins</span>
                <Crown className="h-4 w-4 text-amber-400" />
              </div>
              <span className="text-2xl font-black text-amber-300 font-mono">{adminsCount}</span>
            </div>

            <div className="p-4 rounded-2xl bg-green-950/30 border border-green-900/60 flex flex-col">
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span className="text-[11px] font-mono uppercase tracking-wider">Encryption</span>
                <Lock className="h-4 w-4 text-[#00FF01]" />
              </div>
              <span className="text-xs font-bold text-[#00FF01] font-mono mt-2">AES-256-GCM</span>
            </div>
          </div>

          {/* Directory Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search user by name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/60 border border-green-900/80 rounded-2xl py-2 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00FF01] font-mono"
              />
            </div>

            <button
              onClick={fetchUsers}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-green-950/80 border border-green-800 text-gray-200 hover:text-white hover:border-[#00FF01] transition-all text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#00FF01] ${loading ? "animate-spin" : ""}`} />
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

          <div className="border border-green-900/80 rounded-2xl overflow-x-auto bg-black/40">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-green-900/80 bg-green-950/50 text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Auth Method</th>
                  <th className="py-3 px-4">API Key Status</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-900/40 text-xs font-mono">
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 text-[#00FF01] animate-spin" />
                        <span>Fetching user records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No users found matching query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isPrimary = u.email.toLowerCase() === "tahsinirshad7370@gmail.com";
                    return (
                      <tr key={u.userId} className="hover:bg-green-950/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-green-950 border border-green-800 flex items-center justify-center font-bold text-[#00FF01]">
                              {u.name.substring(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isPrimary && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-extrabold border border-amber-500/40">
                                    Primary Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-400 text-[11px]">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-xl bg-black/60 border border-green-900/60 text-gray-300 text-[11px] capitalize inline-flex items-center gap-1">
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
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Configured ({u.apiKeyMasked || "Active"})</span>
                            </span>
                          ) : (
                            <span className="text-gray-500 flex items-center gap-1">
                              <X className="h-3.5 w-3.5 text-red-400" />
                              <span>Not set</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {u.isAdmin || u.role === "admin" ? (
                            <span className="px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-500/80 text-amber-300 font-bold text-[10px] inline-flex items-center gap-1">
                              <Crown className="h-3 w-3 text-amber-400" />
                              <span>Admin</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl bg-black/60 border border-green-900/60 text-gray-400 text-[10px]">
                              User
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isPrimary ? (
                            <span className="text-gray-600 text-[10px] italic">Owner</span>
                          ) : (
                            <button
                              onClick={() => handleToggleRole(u.userId, u.role)}
                              disabled={updatingUser === u.userId}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                                u.role === "admin"
                                  ? "bg-red-950/60 border border-red-800 text-red-300 hover:bg-red-900"
                                  : "bg-green-950/80 border border-[#00FF01]/60 text-[#00FF01] hover:bg-white hover:text-black"
                              }`}
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
        <div className="p-4 border-t border-green-900/80 bg-green-950/30 flex items-center justify-between text-xs font-mono text-gray-400">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#00FF01]" />
            <span>Script Automation Studio Admin System</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-green-900/50 hover:bg-green-800 text-white font-bold transition-all cursor-pointer"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
