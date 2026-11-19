import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { getThemeConfig } from "../lib/themeConfig";
import { RenderingProgressBar } from "./RenderingProgressBar";
import {
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
  FolderPlus,
  Folder,
  MessageSquare,
  Settings,
  Plus,
  Mic,
  MicOff,
  ArrowUp,
  ChevronDown,
  Copy,
  Check,
  Download,
  RefreshCw,
  Trash2,
  Search,
  Laptop,
  Cloud,
  Sparkles,
  FileText,
  Clapperboard,
  TrendingUp,
  Image as ImageIcon,
  PenLine,
  X,
  Key,
  SlidersHorizontal,
  ArrowRight,
  Monitor,
  Bot,
  Wand2,
  Loader2,
  HardDrive,
  Lock,
  Link2,
  AlertTriangle,
  LogOut,
  Languages,
  Volume2,
  VolumeX,
  Square,
  FastForward,
  Film,
  Code2,
  BookOpen,
} from "lucide-react";
import {
  AgentSkillItem,
  LinkedFolderInfo,
  DetectedFolderPreset,
  INITIAL_SKILLS_AND_AGENTS,
  DEFAULT_WORKSPACE_SYSTEM_INSTRUCTION,
  PROMPT_OPTIMIZER_SYSTEM_INSTRUCTION,
  mergeWithBuiltInSkills,
} from "../lib/agentSkills";
import { SkillsAgentsModal } from "./SkillsAgentsModal";
import {
  extractGoogleDriveFileId,
  getPublicDriveThumbnailUrl,
} from "../lib/googleDrive";

export type StudioTransferTarget = "script" | "scenes" | "ctr" | "thumbnail";

interface DesktopAIChatWorkspaceProps {
  onSendToStudio: (target: StudioTransferTarget, text: string) => void;
}

interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageDataUrl?: string;
  imageDataUrls?: string[];
  driveFileId?: string;
  driveFileIds?: string[];
  driveImageUrl?: string;
  driveImageUrls?: string[];
  driveSource?: "public-link";
  attachmentName?: string;
  modelUsed?: string;
  providerUsed?: string;
  truncated?: boolean;
  isStreaming?: boolean;
  createdAt: number;
}

interface ChatProject {
  id: string;
  name: string;
  systemInstruction: string;
  createdAt: number;
}

interface ChatSession {
  id: string;
  title: string;
  projectId: string | null;
  messages: ChatMessageItem[];
  updatedAt: number;
  storageType?: "spark" | "local-disk";
}

interface UnifiedModelChoice {
  key: string;
  provider: "local" | "gemini" | "openai" | "claude";
  modelId: string;
  label: string;
  category: "Local Device" | "Gemini Cloud" | "OpenAI Cloud" | "Claude Cloud";
  baseUrl?: string;
  ready: boolean;
}

const STORAGE_SESSIONS_KEY = "sas_desktop_chat_sessions_v1";
const STORAGE_PROJECTS_KEY = "sas_desktop_chat_projects_v1";
const STORAGE_SKILLS_AGENTS_KEY = "sas_skills_agents_v1";
const STORAGE_ACTIVE_AGENT_KEY = "sas_active_agent_id_v1";

function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

function formatRelativeDay(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const FormattedMessageBody: React.FC<{
  content: string;
  isLight: boolean;
  accentColor: string;
  secondaryColor: string;
  isStreaming?: boolean;
}> = ({ content, isLight, accentColor, secondaryColor, isStreaming }) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  const safeContent = typeof content === "string" ? content : String(content || "");
  const borderCol = isLight ? "#E2E2E6" : "#2F2F2F";
  const subtleBg = isLight ? "#F8F8FA" : "#161616";
  const mutedText = isLight ? "#52525B" : "#A1A1AA";

  const segments = useMemo(() => {
    const parts: Array<{ type: "text" | "code"; content: string; lang?: string; unclosed?: boolean }> = [];
    const regex = /```([a-zA-Z0-9_+#.-]*)\r?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(safeContent)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: safeContent.slice(lastIndex, match.index) });
      }
      parts.push({ type: "code", lang: match[1] || "text", content: match[2].trimEnd() });
      lastIndex = regex.lastIndex;
    }
    const tail = safeContent.slice(lastIndex);
    if (tail) {
      const openFenceMatch = tail.match(/^([\s\S]*?)```([a-zA-Z0-9_+#.-]*)\r?\n([\s\S]*)$/);
      if (openFenceMatch) {
        if (openFenceMatch[1]) {
          parts.push({ type: "text", content: openFenceMatch[1] });
        }
        parts.push({
          type: "code",
          lang: openFenceMatch[2] || "text",
          content: openFenceMatch[3],
          unclosed: true,
        });
      } else {
        parts.push({ type: "text", content: tail });
      }
    }
    return parts;
  }, [safeContent]);

  const renderInline = (line: string): React.ReactNode => {
    const tokens = line.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|~~[^~]+~~|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|\*[^*\s][^*]*\*)/g);
    return tokens.map((tok, i) => {
      if (!tok) return null;
      if (tok.startsWith("***") && tok.endsWith("***") && tok.length > 6) {
        return (
          <strong key={i} className="font-bold italic">
            {tok.slice(3, -3)}
          </strong>
        );
      }
      if (tok.startsWith("**") && tok.endsWith("**") && tok.length > 4) {
        return (
          <strong key={i} className="font-bold">
            {tok.slice(2, -2)}
          </strong>
        );
      }
      if (tok.startsWith("~~") && tok.endsWith("~~") && tok.length > 4) {
        return (
          <del key={i} className="opacity-70">
            {tok.slice(2, -2)}
          </del>
        );
      }
      if (tok.startsWith("`") && tok.endsWith("`") && tok.length > 2) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded font-mono text-[12px]"
            style={{
              backgroundColor: isLight ? "#EFEFEF" : "#2D2D2D",
              color: secondaryColor,
            }}
          >
            {tok.slice(1, -1)}
          </code>
        );
      }
      const linkMatch = tok.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={i}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium hover:opacity-80"
            style={{ color: secondaryColor }}
          >
            {linkMatch[1]}
          </a>
        );
      }
      if (tok.startsWith("*") && tok.endsWith("*") && tok.length > 2) {
        return (
          <em key={i} className="italic">
            {tok.slice(1, -1)}
          </em>
        );
      }
      return <React.Fragment key={i}>{tok}</React.Fragment>;
    });
  };

  const splitTableCells = (row: string): string[] => {
    const trimmed = row.trim().replace(/^\|/, "").replace(/\|$/, "");
    return trimmed.split("|").map((c) => c.trim());
  };

  const isTableSeparator = (row: string): boolean => {
    const trimmed = row.trim();
    return /^\|?(\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?$/.test(trimmed) || /^\|?\s*:?-{2,}:?\s*\|$/.test(trimmed);
  };

  const renderTextBlocks = (text: string, segIdx: number) => {
    const lines = text.split(/\r?\n/);
    const blocks: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        blocks.push(<div key={`sp-${segIdx}-${i}`} className="h-1" />);
        i++;
        continue;
      }

      // Markdown Table
      if (
        trimmed.includes("|") &&
        i + 1 < lines.length &&
        isTableSeparator(lines[i + 1])
      ) {
        const headers = splitTableCells(trimmed);
        i += 2;
        const rows: string[][] = [];
        while (i < lines.length && lines[i].trim().includes("|") && lines[i].trim() !== "") {
          rows.push(splitTableCells(lines[i]));
          i++;
        }
        blocks.push(
          <div
            key={`tbl-${segIdx}-${i}`}
            className="overflow-x-auto rounded-xl border my-2.5"
            style={{ borderColor: borderCol, backgroundColor: subtleBg }}
          >
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr
                  className="border-b"
                  style={{
                    borderColor: borderCol,
                    backgroundColor: isLight ? "#EFEFF3" : "#1E1E22",
                  }}
                >
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-3 py-2 font-bold whitespace-nowrap">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, rIdx) => (
                  <tr
                    key={rIdx}
                    className={rIdx < rows.length - 1 ? "border-b" : ""}
                    style={{ borderColor: borderCol }}
                  >
                    {headers.map((_, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 align-top">
                        {renderInline(r[cIdx] || "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      // Horizontal Rule
      if (/^([-*_]){3,}$/.test(trimmed)) {
        blocks.push(
          <hr
            key={`hr-${segIdx}-${i}`}
            className="my-3 border-0 border-t"
            style={{ borderColor: borderCol }}
          />
        );
        i++;
        continue;
      }

      // Blockquote (grouped cleanly without thick left accent bar)
      if (trimmed.startsWith(">")) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith(">")) {
          quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
          i++;
        }
        blocks.push(
          <blockquote
            key={`bq-${segIdx}-${i}`}
            className="rounded-xl border px-3.5 py-2.5 my-2 text-[14px] space-y-1"
            style={{
              borderColor: borderCol,
              backgroundColor: subtleBg,
              color: mutedText,
            }}
          >
            {quoteLines.map((ql, qIdx) => (
              <p key={qIdx}>{renderInline(ql)}</p>
            ))}
          </blockquote>
        );
        continue;
      }

      // Headings
      if (trimmed.startsWith("#### ")) {
        blocks.push(
          <h5 key={`h4-${segIdx}-${i}`} className="font-bold text-[14.5px] pt-1.5">
            {renderInline(trimmed.slice(5))}
          </h5>
        );
        i++;
        continue;
      }
      if (trimmed.startsWith("### ")) {
        blocks.push(
          <h4 key={`h3-${segIdx}-${i}`} className="font-bold text-[15.5px] pt-2">
            {renderInline(trimmed.slice(4))}
          </h4>
        );
        i++;
        continue;
      }
      if (trimmed.startsWith("## ")) {
        blocks.push(
          <h3 key={`h2-${segIdx}-${i}`} className="font-extrabold text-[17px] pt-2.5 pb-0.5">
            {renderInline(trimmed.slice(3))}
          </h3>
        );
        i++;
        continue;
      }
      if (trimmed.startsWith("# ")) {
        blocks.push(
          <h2 key={`h1-${segIdx}-${i}`} className="font-extrabold text-[19.5px] pt-3 pb-0.5">
            {renderInline(trimmed.slice(2))}
          </h2>
        );
        i++;
        continue;
      }

      // Bullet list item (with indentation awareness)
      const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
      if (bulletMatch) {
        const indentPx = Math.min(32, Math.floor((bulletMatch[1]?.length || 0) / 2) * 14);
        blocks.push(
          <div
            key={`ul-${segIdx}-${i}`}
            className="flex items-start gap-2"
            style={{ paddingLeft: `${4 + indentPx}px` }}
          >
            <span
              className="mt-2 h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: indentPx > 0 ? secondaryColor : accentColor }}
            />
            <span className="flex-1">{renderInline(bulletMatch[2])}</span>
          </div>
        );
        i++;
        continue;
      }

      // Numbered list item
      const numMatch = line.match(/^(\s*)(\d+\.)\s+(.*)$/);
      if (numMatch) {
        const indentPx = Math.min(32, Math.floor((numMatch[1]?.length || 0) / 2) * 14);
        blocks.push(
          <div
            key={`ol-${segIdx}-${i}`}
            className="flex items-start gap-2"
            style={{ paddingLeft: `${4 + indentPx}px` }}
          >
            <span
              className="font-mono font-bold text-xs mt-1 shrink-0 tabular-nums"
              style={{ color: secondaryColor }}
            >
              {numMatch[2]}
            </span>
            <span className="flex-1">{renderInline(numMatch[3])}</span>
          </div>
        );
        i++;
        continue;
      }

      blocks.push(<p key={`p-${segIdx}-${i}`}>{renderInline(line)}</p>);
      i++;
    }

    return blocks;
  };

  return (
    <div className="space-y-2 text-[15px] leading-[1.7] break-words">
      {segments.map((seg, idx) => {
        if (seg.type === "code") {
          return (
            <div
              key={idx}
              className="rounded-xl border overflow-hidden my-2.5"
              style={{
                backgroundColor: isLight ? "#F8F8F9" : "#0D0D0D",
                borderColor: borderCol,
              }}
            >
              <div
                className="flex items-center justify-between px-3 py-1.5 border-b text-[11px] font-mono"
                style={{
                  borderColor: borderCol,
                  color: isLight ? "#555555" : "#A1A1AA",
                }}
              >
                <span>{seg.lang || "code"}{seg.unclosed ? " · streaming..." : ""}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(seg.content);
                    setCopiedCodeIdx(idx);
                    setTimeout(() => setCopiedCodeIdx(null), 1500);
                  }}
                  className="inline-flex items-center gap-1 cursor-pointer hover:opacity-80 font-sans font-semibold"
                >
                  {copiedCodeIdx === idx ? (
                    <>
                      <Check className="h-3 w-3" style={{ color: secondaryColor }} />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 overflow-x-auto font-mono text-[12.5px] leading-relaxed">
                <code>{seg.content}</code>
              </pre>
            </div>
          );
        }

        return (
          <div key={idx} className="space-y-1.5">
            {renderTextBlocks(seg.content, idx)}
          </div>
        );
      })}
      {isStreaming && (
        <span
          className="inline-block w-2 h-4 align-middle ml-1 animate-pulse rounded-xs"
          style={{ backgroundColor: secondaryColor }}
        />
      )}
    </div>
  );
};

export const DesktopAIChatWorkspace: React.FC<DesktopAIChatWorkspaceProps> = ({
  onSendToStudio,
}) => {
  const {
    user,
    idToken,
    isStandalone,
    systemModeChecked,
    profile,
    envKeyStatus,
    activeProviderConfig,
    availableModels,
    availableLocalModels,
    fetchAvailableModels,
    setIsAuthModalOpen,
    setIsApiKeyModalOpen,
    setIsSettingsModalOpen,
    setActiveWorkspace,
    logout,
    removeApiKey,
    currentTheme,
    currentBrand,
  } = useAuth();

  const theme = getThemeConfig(currentTheme, currentBrand);
  const isLight = theme.isLight;

  // Persistent Sidebar State: Projects + Chat Sessions
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [projects, setProjects] = useState<ChatProject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (saved) {
        const parsed: ChatProject[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (p) => p.id !== "proj-scripts" && p.id !== "proj-prompts"
          );
        }
      }
    } catch {}
    return [];
  });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>("");
  const [newProjectPrompt, setNewProjectPrompt] = useState<string>("");

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSIONS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatSearch, setChatSearch] = useState<string>("");

  const [storageMode, setStorageMode] = useState<"local-disk" | "cloud-firestore" | "browser-local">(
    isStandalone ? "local-disk" : idToken ? "cloud-firestore" : "browser-local"
  );
  const [storageLocation, setStorageLocation] = useState<string>(
    isStandalone ? "local-engine/chat-workspace.json" : idToken ? "Firebase Cloud" : "Browser Storage"
  );
  const storageHydratedRef = useRef<boolean>(false);

  useEffect(() => {
    setStorageMode(
      isStandalone ? "local-disk" : idToken ? "cloud-firestore" : "browser-local"
    );
    setStorageLocation(
      isStandalone
        ? "local-engine/chat-workspace.json"
        : idToken
        ? "Firebase Spark (Text-Only Lightweight Sync)"
        : "Browser Storage"
    );
  }, [isStandalone, idToken]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    } catch {}
  }, [projects]);

  useEffect(() => {
    try {
      const sanitizedSessions = !isStandalone
        ? sessions.slice(0, 12).map((s) => ({
            ...s,
            messages: (s.messages || []).slice(-25).map(({ imageDataUrl: _omit, imageDataUrls: _omitArr, ...rest }) => rest),
          }))
        : sessions.slice(0, 40);
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sanitizedSessions));
    } catch {}
  }, [sessions, isStandalone]);

  // Composer & Generation State
  const [promptInput, setPromptInput] = useState<string>("");
  const [attachedImages, setAttachedImages] = useState<Array<{ dataUrl: string; name: string }>>([]);
  const [attachedDriveImages, setAttachedDriveImages] = useState<
    Array<{
      fileId: string;
      name: string;
      source: "public-link";
      previewUrl: string;
      driveUrl?: string;
    }>
  >([]);
  const [showDriveLinkInput, setShowDriveLinkInput] = useState<boolean>(false);
  const [driveLinkInput, setDriveLinkInput] = useState<string>("");
  const [limitModalOpen, setLimitModalOpen] = useState<boolean>(false);
  const [attachedFileText, setAttachedFileText] = useState<{ name: string; content: string } | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  // Chat Options Popover
  const [showPromptOptions, setShowPromptOptions] = useState<boolean>(false);
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>("");
  const [temperature, setTemperature] = useState<number>(0.7);
  const [outputFocus, setOutputFocus] = useState<
    "general" | "transcript" | "scene_prompts" | "thumbnail_ctr" | "rewrite"
  >("general");
  const [targetWordVolume, setTargetWordVolume] = useState<string>("auto");

  // Installed Agents & Skills State
  const [skillsAndAgents, setSkillsAndAgents] = useState<AgentSkillItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SKILLS_AGENTS_KEY);
      if (saved) {
        const parsed: AgentSkillItem[] = JSON.parse(saved);
        return mergeWithBuiltInSkills(parsed);
      }
    } catch {}
    return INITIAL_SKILLS_AND_AGENTS;
  });
  const [activeAgentId, setActiveAgentId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE_AGENT_KEY);
      if (saved !== null) return saved || null;
    } catch {}
    return "agent-flagship-assistant";
  });
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [linkedFolders, setLinkedFolders] = useState<LinkedFolderInfo[]>([]);
  const [detectedPresets, setDetectedPresets] = useState<DetectedFolderPreset[]>([]);
  const [isLinkingFolder, setIsLinkingFolder] = useState<boolean>(false);
  const [folderSyncError, setFolderSyncError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SKILLS_AGENTS_KEY, JSON.stringify(skillsAndAgents));
    } catch {}
  }, [skillsAndAgents]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACTIVE_AGENT_KEY, activeAgentId || "");
    } catch {}
  }, [activeAgentId]);

  // Hydrate persistent chats/projects from PC Disk (standalone) or Firebase Cloud (online signed-in)
  useEffect(() => {
    let cancelled = false;
    storageHydratedRef.current = false;

    const loadPersistentWorkspace = async () => {
      try {
        const headers: Record<string, string> = {};
        if (isStandalone) headers["x-standalone-mode"] = "true";
        else if (idToken) headers.Authorization = `Bearer ${idToken}`;

        const res = await fetch("/api/chat/storage", { headers });
        if (!res.ok || cancelled) {
          storageHydratedRef.current = true;
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        if (data.storageMode) setStorageMode(data.storageMode);
        if (data.storageLocation) setStorageLocation(data.storageLocation);

        if (data.storageMode === "local-disk" || data.storageMode === "cloud-firestore") {
          if (Array.isArray(data.projects) && data.projects.length > 0) {
            setProjects((prev) => {
              const map = new Map<string, ChatProject>();
              for (const p of [...data.projects, ...prev]) {
                if (p?.id && p.id !== "proj-scripts" && p.id !== "proj-prompts") {
                  map.set(p.id, p);
                }
              }
              return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
            });
          }
          if (Array.isArray(data.sessions) && data.sessions.length > 0) {
            setSessions((prev) => {
              const map = new Map<string, ChatSession>();
              for (const s of [...data.sessions, ...prev]) {
                if (s?.id) {
                  const existing = map.get(s.id);
                  if (!existing || (s.updatedAt || 0) > (existing.updatedAt || 0)) {
                    map.set(s.id, s);
                  }
                }
              }
              return Array.from(map.values())
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                .slice(0, 40);
            });
          }
          if (Array.isArray(data.skillsAndAgents) && data.skillsAndAgents.length > 0) {
            setSkillsAndAgents((prev) => {
              const map = new Map<string, AgentSkillItem>();
              for (const it of prev) if (it?.id) map.set(it.id, it);
              for (const it of data.skillsAndAgents) {
                if (!it?.id) continue;
                const existing = map.get(it.id);
                if (existing && (!it.instructions || !it.name)) {
                  map.set(it.id, {
                    ...existing,
                    installed: it.installed !== undefined ? Boolean(it.installed) : existing.installed,
                    enabled: it.enabled !== undefined ? Boolean(it.enabled) : existing.enabled,
                  });
                } else {
                  map.set(it.id, it);
                }
              }
              return mergeWithBuiltInSkills(Array.from(map.values()));
            });
          }
          if (data.activeAgentId !== undefined) {
            setActiveAgentId(data.activeAgentId || null);
          }
        }
      } catch {
        // Fallback smoothly to browser localStorage
      } finally {
        if (!cancelled) {
          storageHydratedRef.current = true;
        }
      }
    };

    void loadPersistentWorkspace();
    return () => {
      cancelled = true;
    };
  }, [isStandalone, idToken]);

  // Auto-sync workspace edits to PC Disk (standalone) or Firebase Cloud (online signed-in)
  useEffect(() => {
    if (!storageHydratedRef.current) return;
    if (!isStandalone && !idToken) return;

    const timer = setTimeout(async () => {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (isStandalone) headers["x-standalone-mode"] = "true";
        else if (idToken) headers.Authorization = `Bearer ${idToken}`;

        const syncSessions = !isStandalone
          ? sessions.slice(0, 10).map((s) => ({
              ...s,
              messages: (s.messages || []).slice(-20).map(({ imageDataUrl: _omit, ...rest }) => rest),
            }))
          : sessions.slice(0, 40);
        const syncProjects = !isStandalone ? projects.slice(0, 15) : projects.slice(0, 50);

        const res = await fetch("/api/chat/storage", {
          method: "POST",
          headers,
          body: JSON.stringify({
            sessions: syncSessions,
            projects: syncProjects,
            skillsAndAgents,
            activeAgentId,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.storageMode) setStorageMode(data.storageMode);
          if (data.storageLocation) setStorageLocation(data.storageLocation);
        }
      } catch {
        // Silently retain localStorage mirror
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [sessions, projects, skillsAndAgents, activeAgentId, isStandalone, idToken]);

  const applyLocalSkillsPayload = (data: {
    linkedFolders?: LinkedFolderInfo[];
    detectedPresets?: DetectedFolderPreset[];
    skills?: AgentSkillItem[];
  }) => {
    if (Array.isArray(data.linkedFolders)) setLinkedFolders(data.linkedFolders);
    if (Array.isArray(data.detectedPresets)) setDetectedPresets(data.detectedPresets);

    if (Array.isArray(data.skills)) {
      const diskSkills = data.skills;
      setSkillsAndAgents((prev) => {
        const prevMap = new Map<string, AgentSkillItem>();
        for (const item of prev) {
          prevMap.set(item.id, item);
        }
        const nonFolderItems = prev.filter((item) => item.sourceType !== "linked-folder");
        const mergedDiskItems = diskSkills.map((diskItem) => {
          const existing = prevMap.get(diskItem.id);
          return existing
            ? { ...diskItem, enabled: existing.enabled }
            : diskItem;
        });
        return [...nonFolderItems, ...mergedDiskItems];
      });
    }
  };

  const fetchLocalSkillsFromDisk = async () => {
    if (!isStandalone) return;
    try {
      const res = await fetch("/api/local-skills");
      if (!res.ok) return;
      const data = await res.json();
      applyLocalSkillsPayload(data);
    } catch {
      // Non-fatal if offline endpoints unavailable
    }
  };

  useEffect(() => {
    if (isStandalone) {
      void fetchLocalSkillsFromDisk();
    }
  }, [isStandalone, isSkillsModalOpen]);

  const handleLinkFolder = async (directoryPath: string): Promise<boolean> => {
    if (!isStandalone) return false;
    setIsLinkingFolder(true);
    setFolderSyncError(null);
    try {
      const res = await fetch("/api/local-skills/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directoryPath }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFolderSyncError(data.error || "Could not link folder.");
        return false;
      }
      applyLocalSkillsPayload(data);
      return true;
    } catch (err: any) {
      setFolderSyncError(err?.message || "Failed to link local skills folder.");
      return false;
    } finally {
      setIsLinkingFolder(false);
    }
  };

  const handleUnlinkFolder = async (directoryPath: string): Promise<void> => {
    if (!isStandalone) return;
    setIsLinkingFolder(true);
    setFolderSyncError(null);
    try {
      const res = await fetch("/api/local-skills/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directoryPath }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        applyLocalSkillsPayload(data);
      }
    } finally {
      setIsLinkingFolder(false);
    }
  };

  const handleRescanFolders = async (): Promise<void> => {
    if (!isStandalone) return;
    setIsLinkingFolder(true);
    setFolderSyncError(null);
    try {
      const res = await fetch("/api/local-skills/rescan", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        applyLocalSkillsPayload(data);
      }
    } finally {
      setIsLinkingFolder(false);
    }
  };

  // Unified Cloud + Local Model Selector State
  const [showModelDropdown, setShowModelDropdown] = useState<boolean>(false);
  const [selectedChoice, setSelectedChoice] = useState<{
    provider: "local" | "gemini" | "openai" | "claude";
    modelId: string;
    baseUrl?: string;
  }>(() => ({
    provider: !isStandalone && activeProviderConfig.provider === "local" ? "gemini" : activeProviderConfig.provider,
    modelId:
      activeProviderConfig.model ||
      (activeProviderConfig.provider === "local" ? "default" : "gemini-4-hydrogen"),
    baseUrl: activeProviderConfig.baseUrl || "http://127.0.0.1:1279/v1",
  }));

  useEffect(() => {
    void fetchAvailableModels();
  }, []);

  // Gemini Live Voice (gemini-3.5-transcribe-live & gemini-3.5-live-translate-preview)
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceConnecting, setVoiceConnecting] = useState<boolean>(false);
  const [voiceMode, setVoiceMode] = useState<"transcribe" | "translate">("transcribe");
  const [voiceTargetLang, setVoiceTargetLang] = useState<string>("en");
  const [voiceSpeakerEnabled, setVoiceSpeakerEnabled] = useState<boolean>(true);
  const [liveInterimText, setLiveInterimText] = useState<string>("");

  const isListeningRef = useRef<boolean>(false);
  const voiceModeRef = useRef<"transcribe" | "translate">("transcribe");
  const voiceSpeakerRef = useRef<boolean>(true);
  const voiceWsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  useEffect(() => {
    voiceSpeakerRef.current = voiceSpeakerEnabled;
  }, [voiceSpeakerEnabled]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const modelMenuRef = useRef<HTMLDivElement | null>(null);
  const optionsMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onOutsideClick = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
        setShowPromptOptions(false);
      }
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || null,
    [sessions, activeSessionId]
  );

  const activeProject = useMemo(
    () => projects.find((p) => p.id === (activeSession?.projectId ?? activeProjectId)) || null,
    [projects, activeSession, activeProjectId]
  );

  const installedAgents = useMemo(
    () => skillsAndAgents.filter((it) => it.kind === "agent" && it.installed),
    [skillsAndAgents]
  );

  const installedSkills = useMemo(
    () => skillsAndAgents.filter((it) => it.kind === "skill" && it.installed),
    [skillsAndAgents]
  );

  const enabledSkills = useMemo(
    () => installedSkills.filter((it) => it.enabled),
    [installedSkills]
  );

  const activeAgent = useMemo(
    () => installedAgents.find((it) => it.id === activeAgentId) || null,
    [installedAgents, activeAgentId]
  );

  const installedTotalCount = installedAgents.length + installedSkills.length;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages?.length, isSending]);

  const unifiedModels = useMemo<UnifiedModelChoice[]>(() => {
    const list: UnifiedModelChoice[] = [];

    if (isStandalone) {
      if (availableLocalModels.length > 0) {
        for (const lm of availableLocalModels) {
          list.push({
            key: `local:${lm.id}:${lm.baseUrl || ""}`,
            provider: "local",
            modelId: lm.id,
            label: lm.displayName
              .replace(/^Built-In Folder GGUF:\s*/i, "")
              .replace(/^Built-In Active:\s*/i, "Active · "),
            category: "Local Device",
            baseUrl: lm.baseUrl || activeProviderConfig.baseUrl || "http://127.0.0.1:1279/v1",
            ready: true,
          });
        }
      } else {
        list.push({
          key: "local:default",
          provider: "local",
          modelId: activeProviderConfig.model || "default",
          label: "Local GGUF (Built-In Engine / LM Studio / Ollama)",
          category: "Local Device",
          baseUrl: activeProviderConfig.baseUrl || "http://127.0.0.1:1279/v1",
          ready: true,
        });
      }
    }

    const gemConfigured = Boolean(
      envKeyStatus?.gemini?.configured ||
        (activeProviderConfig.provider === "gemini" && activeProviderConfig.apiKey) ||
        profile?.hasApiKey
    );
    const oaiConfigured = Boolean(
      envKeyStatus?.openai?.configured ||
        (activeProviderConfig.provider === "openai" && activeProviderConfig.apiKey)
    );
    const cldConfigured = Boolean(
      envKeyStatus?.claude?.configured ||
        (activeProviderConfig.provider === "claude" && activeProviderConfig.apiKey)
    );

    const gemModels = [
      { id: "gemini-4-hydrogen", label: "Gemini 4 Hydrogen (Fast & Smart)" },
      { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    ];
    for (const gm of gemModels) {
      list.push({
        key: `gemini:${gm.id}`,
        provider: "gemini",
        modelId: gm.id,
        label: gm.label,
        category: "Gemini Cloud",
        ready: gemConfigured,
      });
    }
    for (const am of availableModels) {
      if (am.providerType === "gemini" && !gemModels.some((g) => g.id === am.id)) {
        list.push({
          key: `gemini:${am.id}`,
          provider: "gemini",
          modelId: am.id,
          label: am.displayName || am.id,
          category: "Gemini Cloud",
          ready: gemConfigured,
        });
      }
    }

    const openaiModels = [
      { id: "gpt-4o-mini", label: "GPT-4o Mini" },
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "o3-mini", label: "o3-mini (Reasoning)" },
    ];
    for (const om of openaiModels) {
      list.push({
        key: `openai:${om.id}`,
        provider: "openai",
        modelId: om.id,
        label: om.label,
        category: "OpenAI Cloud",
        ready: oaiConfigured,
      });
    }

    const claudeModels = [
      { id: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet" },
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
    ];
    for (const cm of claudeModels) {
      list.push({
        key: `claude:${cm.id}`,
        provider: "claude",
        modelId: cm.id,
        label: cm.label,
        category: "Claude Cloud",
        ready: cldConfigured,
      });
    }

    return list;
  }, [isStandalone, availableLocalModels, availableModels, envKeyStatus, activeProviderConfig, profile]);

  const activeChoiceDisplay = useMemo(() => {
    const found = unifiedModels.find(
      (m) => m.provider === selectedChoice.provider && m.modelId === selectedChoice.modelId
    );
    if (found) return found;
    return {
      key: `${selectedChoice.provider}:${selectedChoice.modelId}`,
      provider: selectedChoice.provider,
      modelId: selectedChoice.modelId,
      label: selectedChoice.modelId || selectedChoice.provider.toUpperCase(),
      category:
        selectedChoice.provider === "local"
          ? "Local Device"
          : selectedChoice.provider === "openai"
          ? "OpenAI Cloud"
          : selectedChoice.provider === "claude"
          ? "Claude Cloud"
          : "Gemini Cloud",
      ready: true,
    } as UnifiedModelChoice;
  }, [unifiedModels, selectedChoice]);

  const handleNewChat = (projectId: string | null = activeProjectId) => {
    setActiveSessionId(null);
    setActiveProjectId(projectId);
    setChatError(null);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const created: ChatProject = {
      id: `proj-${Date.now()}`,
      name: newProjectName.trim(),
      systemInstruction: newProjectPrompt.trim(),
      createdAt: Date.now(),
    };
    setProjects((prev) => [created, ...prev]);
    setActiveProjectId(created.id);
    setActiveSessionId(null);
    setNewProjectName("");
    setNewProjectPrompt("");
    setIsCreatingProject(false);
  };

  const float32ToPcm16Base64 = (float32: Float32Array): string => {
    const pcm16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const clamped = Math.max(-1, Math.min(1, float32[i]));
      pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  const playPcm24kChunk = (base64Audio: string) => {
    try {
      if (!outputAudioCtxRef.current || outputAudioCtxRef.current.state === "closed") {
        outputAudioCtxRef.current = new AudioContext({ sampleRate: 24000 });
        nextStartTimeRef.current = 0;
      }
      const ctx = outputAudioCtxRef.current;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
      const binary = atob(base64Audio);
      const byteLen = binary.length;
      const bytes = new Uint8Array(byteLen);
      for (let i = 0; i < byteLen; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }
      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startAt = Math.max(now, nextStartTimeRef.current);
      source.start(startAt);
      nextStartTimeRef.current = startAt + buffer.duration;
    } catch {
      // Ignore malformed audio chunk
    }
  };

  const stopLiveVoice = () => {
    isListeningRef.current = false;
    setIsListening(false);
    setVoiceConnecting(false);
    setLiveInterimText("");

    try {
      processorRef.current?.disconnect();
    } catch {}
    processorRef.current = null;

    try {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    mediaStreamRef.current = null;

    try {
      if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== "closed") {
        void inputAudioCtxRef.current.close();
      }
    } catch {}
    inputAudioCtxRef.current = null;

    try {
      if (outputAudioCtxRef.current && outputAudioCtxRef.current.state !== "closed") {
        void outputAudioCtxRef.current.close();
      }
    } catch {}
    outputAudioCtxRef.current = null;
    nextStartTimeRef.current = 0;

    try {
      if (voiceWsRef.current) {
        if (voiceWsRef.current.readyState === WebSocket.OPEN) {
          voiceWsRef.current.send(JSON.stringify({ type: "stop" }));
        }
        voiceWsRef.current.close();
      }
    } catch {}
    voiceWsRef.current = null;
  };

  useEffect(() => {
    return () => {
      stopLiveVoice();
    };
  }, []);

  const handleToggleVoice = async () => {
    if (isListening || voiceConnecting) {
      stopLiveVoice();
      return;
    }

    setChatError(null);

    if (!isStandalone && !user) {
      setChatError("Please sign in and save your Gemini API key to use Gemini Live Voice.");
      setIsAuthModalOpen(true);
      return;
    }

    if (!isStandalone && !profile?.hasApiKey) {
      setChatError("Please save your Gemini API key first to use Gemini Live Voice.");
      setIsApiKeyModalOpen(true);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setChatError("Microphone access is not available in this browser context.");
      return;
    }

    setVoiceConnecting(true);
    setLiveInterimText("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const wsUrl = `${proto}://${window.location.host}/api/voice-live?mode=${voiceMode}&targetLang=${encodeURIComponent(
        voiceTargetLang
      )}`;
      const ws = new WebSocket(wsUrl);
      voiceWsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "auth",
            token: idToken || "",
            apiKey: activeProviderConfig.apiKey || "",
          })
        );
      };

      ws.onmessage = (event) => {
        let msg: any;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        if (msg.type === "ready") {
          setVoiceConnecting(false);
          setIsListening(true);
          isListeningRef.current = true;

          const inputCtx = new AudioContext({ sampleRate: 16000 });
          inputAudioCtxRef.current = inputCtx;
          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          source.connect(processor);
          processor.connect(inputCtx.destination);

          processor.onaudioprocess = (e) => {
            if (!isListeningRef.current || ws.readyState !== WebSocket.OPEN) return;
            const channel = e.inputBuffer.getChannelData(0);
            const base64 = float32ToPcm16Base64(channel);
            ws.send(JSON.stringify({ type: "audio", data: base64 }));
          };
          return;
        }

        if (msg.type === "interimTranscript" && msg.text) {
          setLiveInterimText(String(msg.text));
          return;
        }

        if (msg.type === "inputTranscript" && msg.text) {
          const clean = String(msg.text).trim();
          if (!clean) return;
          if (voiceModeRef.current === "transcribe") {
            setPromptInput((prev) => (prev ? `${prev.trimEnd()} ${clean}` : clean));
            setLiveInterimText("");
          } else {
            setLiveInterimText(`Heard: ${clean}`);
          }
          return;
        }

        if (msg.type === "outputTranscript" && msg.text) {
          const clean = String(msg.text).trim();
          if (!clean) return;
          setPromptInput((prev) => (prev ? `${prev.trimEnd()} ${clean}` : clean));
          setLiveInterimText("");
          return;
        }

        if (msg.type === "audio" && msg.data) {
          if (voiceModeRef.current === "translate" && voiceSpeakerRef.current) {
            playPcm24kChunk(String(msg.data));
          }
          return;
        }

        if (msg.type === "error") {
          setChatError(msg.error || "Gemini Live Voice encountered an error.");
          stopLiveVoice();
          return;
        }

        if (msg.type === "closed") {
          stopLiveVoice();
        }
      };

      ws.onerror = () => {
        setChatError("Could not connect to Gemini Live Voice stream.");
        stopLiveVoice();
      };

      ws.onclose = () => {
        if (isListeningRef.current) {
          stopLiveVoice();
        } else {
          setVoiceConnecting(false);
        }
      };
    } catch (err: any) {
      setChatError(err?.message || "Microphone permission denied or unavailable.");
      stopLiveVoice();
    }
  };

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setChatError(null);

    if (file.type.startsWith("image/")) {
      if (file.size > 5 * 1024 * 1024) {
        setChatError("Attached image must be under 5MB.");
        return;
      }

      if (!isStandalone) {
        setShowDriveLinkInput(true);
        setChatError(
          "Direct image uploads are disabled on the free Firebase Spark plan. Paste a public Google Drive image link ('Anyone with the link') instead."
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setAttachedImages((prev) => [...prev.slice(0, 5), { dataUrl: reader.result as string, name: file.name }]);
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    if (file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".md")) {
      const text = await file.text();
      setAttachedFileText({ name: file.name, content: text.slice(0, isStandalone ? 120000 : 80000) });
      return;
    }

    if (file.name.toLowerCase().endsWith(".pdf")) {
      if (!ensureChatAccess()) return;
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result !== "string") return;
        try {
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (isStandalone) headers["x-standalone-mode"] = "true";
          else if (idToken) headers.Authorization = `Bearer ${idToken}`;
          const res = await fetch("/api/parse-file", {
            method: "POST",
            headers,
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              fileData: reader.result,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Could not extract PDF text.");
          setAttachedFileText({ name: file.name, content: (data.rawScript || data.text || "").slice(0, 80000) });
        } catch (err: any) {
          setChatError(err.message || "Failed to read PDF attachment.");
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    setChatError("Supported attachments: .txt, .md, .pdf, or images (.png, .jpg, .webp).");
  };

  const handleToggleSkill = (id: string) => {
    setSkillsAndAgents((prev) =>
      prev.map((it) => (it.id === id ? { ...it, enabled: !it.enabled } : it))
    );
  };

  const handleInstallItem = (id: string) => {
    setSkillsAndAgents((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, installed: true, enabled: it.kind === "skill" ? true : it.enabled }
          : it
      )
    );
  };

  const handleUninstallItem = (id: string) => {
    if (activeAgentId === id) {
      setActiveAgentId(null);
    }
    const isCatalogPack = INITIAL_SKILLS_AND_AGENTS.some((item) => item.id === id);
    if (isCatalogPack) {
      setSkillsAndAgents((prev) =>
        prev.map((it) => (it.id === id ? { ...it, installed: false, enabled: false } : it))
      );
    } else {
      setSkillsAndAgents((prev) => prev.filter((it) => it.id !== id));
    }
  };

  const handleAddCustomItem = (item: AgentSkillItem) => {
    setSkillsAndAgents((prev) => [item, ...prev]);
  };

  const buildEffectiveSystemInstruction = (): string => {
    const parts: string[] = [];
    if (activeAgent?.instructions?.trim()) {
      parts.push(`[ACTIVE AGENT: ${activeAgent.name}]\n${activeAgent.instructions.trim()}`);
    } else {
      parts.push(DEFAULT_WORKSPACE_SYSTEM_INSTRUCTION);
    }
    for (const sk of enabledSkills) {
      if (sk.instructions.trim()) {
        parts.push(`[ACTIVE SKILL: ${sk.name}]\n${sk.instructions.trim()}`);
      }
    }
    if (activeProject?.systemInstruction?.trim()) {
      parts.push(activeProject.systemInstruction.trim());
    }
    if (customSystemPrompt.trim()) {
      parts.push(customSystemPrompt.trim());
    }
    if (outputFocus === "transcript") {
      parts.push(
        "Format your output as a complete, unabridged voiceover transcript with natural pacing, clear hooks, and zero meta-commentary unless requested."
      );
    } else if (outputFocus === "scene_prompts") {
      parts.push(
        "Output complete, numbered chronological visual scene prompts rich in camera angle, lighting, environment, continuity, and action details for AI image/video generators."
      );
    } else if (outputFocus === "thumbnail_ctr") {
      parts.push(
        "Provide high-CTR YouTube titles, SEO descriptions, chapters, tags, and visual thumbnail concepts."
      );
    } else if (outputFocus === "rewrite") {
      parts.push(
        "Rephrase with 100% fresh sentence structure while preserving facts, meaning, and spoken fluency."
      );
    }
    if (targetWordVolume !== "auto") {
      parts.push(`Target approximate output length: around ${targetWordVolume} words.`);
    }
    return parts.join("\n\n");
  };

  const ensureChatAccess = (): boolean => {
    if (isStandalone) return true;
    if (!user || !idToken) {
      setIsAuthModalOpen(true);
      setChatError(
        "Sign in required: Please sign in first, then paste and save your personal API key in the secure API Key Saver to generate."
      );
      return false;
    }
    if (!profile?.hasApiKey) {
      setIsApiKeyModalOpen(true);
      setChatError(
        "Personal API Key required: Please paste and save your API key in the secure API Key Saver first."
      );
      return false;
    }
    const savedProvider = profile?.activeProvider || "gemini";
    if (
      selectedChoice.provider !== savedProvider &&
      !(activeProviderConfig.provider === selectedChoice.provider && activeProviderConfig.apiKey?.trim())
    ) {
      setIsApiKeyModalOpen(true);
      setChatError(
        `Your saved key is for ${savedProvider.toUpperCase()}. Please paste and save your ${selectedChoice.provider.toUpperCase()} key in the secure API Key Saver first.`
      );
      return false;
    }
    return true;
  };

  const handleOptimizePrompt = async () => {
    if (isOptimizing || isSending) return;
    if (!ensureChatAccess()) return;
    const draft = promptInput.trim();
    if (!draft) {
      setChatError("Type a brief idea or prompt first, then click Optimize Prompt.");
      return;
    }

    setIsOptimizing(true);
    setChatError(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-provider-type": selectedChoice.provider,
        "x-provider-model": selectedChoice.modelId,
      };
      if (selectedChoice.baseUrl) {
        headers["x-provider-baseurl"] = selectedChoice.baseUrl;
      }
      if (
        activeProviderConfig.apiKey?.trim() &&
        activeProviderConfig.provider === selectedChoice.provider
      ) {
        headers["x-provider-key"] = activeProviderConfig.apiKey.trim();
      }
      if (isStandalone) {
        headers["x-standalone-mode"] = "true";
      } else if (idToken) {
        headers.Authorization = `Bearer ${idToken}`;
      }

      const optimizerContextParts = [PROMPT_OPTIMIZER_SYSTEM_INSTRUCTION];
      if (activeAgent) {
        optimizerContextParts.push(
          `Target Agent Specialization (${activeAgent.name}): ${activeAgent.summary}`
        );
      }
      if (enabledSkills.length > 0) {
        optimizerContextParts.push(
          `Active Modular Skills:\n${enabledSkills.map((s) => `- ${s.name}: ${s.summary}`).join("\n")}`
        );
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: selectedChoice.modelId,
          systemInstruction: optimizerContextParts.join("\n\n"),
          temperature: 0.7,
          providerConfig: {
            provider: selectedChoice.provider,
            model: selectedChoice.modelId,
            baseUrl: selectedChoice.baseUrl || activeProviderConfig.baseUrl,
            apiKey:
              activeProviderConfig.provider === selectedChoice.provider
                ? activeProviderConfig.apiKey
                : "",
          },
          messages: [
            {
              role: "user",
              content: `Expand and optimize this rough prompt into a deeply detailed, structured, production-ready prompt:\n\n${draft}`,
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to optimize prompt.");
      }

      if (data.reply?.trim()) {
        setPromptInput(data.reply.trim());
      }
    } catch (err: any) {
      setChatError(err?.message || "Could not optimize prompt.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleStopGenerating = () => {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }
  };

  const sendChatTurn = async (messagesForRequest: ChatMessageItem[], sessionIdToUpdate: string) => {
    setIsSending(true);
    setChatError(null);

    const abortController = new AbortController();
    streamAbortRef.current = abortController;

    const streamingMsgId = `msg-${Date.now()}-ai`;
    const initialAiMsg: ChatMessageItem = {
      id: streamingMsgId,
      role: "assistant",
      content: "",
      modelUsed: selectedChoice.modelId,
      providerUsed: selectedChoice.provider,
      isStreaming: true,
      createdAt: Date.now(),
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionIdToUpdate
          ? { ...s, messages: [...messagesForRequest, initialAiMsg], updatedAt: Date.now() }
          : s
      )
    );

    const updateStreamingMessage = (updater: (m: ChatMessageItem) => ChatMessageItem) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionIdToUpdate
            ? {
                ...s,
                messages: s.messages.map((m) => (m.id === streamingMsgId ? updater(m) : m)),
                updatedAt: Date.now(),
              }
            : s
        )
      );
    };

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-provider-type": selectedChoice.provider,
        "x-provider-model": selectedChoice.modelId,
      };
      if (selectedChoice.baseUrl) {
        headers["x-provider-baseurl"] = selectedChoice.baseUrl;
      }
      if (
        activeProviderConfig.apiKey?.trim() &&
        activeProviderConfig.provider === selectedChoice.provider
      ) {
        headers["x-provider-key"] = activeProviderConfig.apiKey.trim();
      }
      if (isStandalone) {
        headers["x-standalone-mode"] = "true";
      } else if (idToken) {
        headers.Authorization = `Bearer ${idToken}`;
      }

      const payloadBody = JSON.stringify({
        model: selectedChoice.modelId,
        systemInstruction: buildEffectiveSystemInstruction(),
        temperature,
        providerConfig: {
          provider: selectedChoice.provider,
          model: selectedChoice.modelId,
          baseUrl: selectedChoice.baseUrl || activeProviderConfig.baseUrl,
          apiKey:
            activeProviderConfig.provider === selectedChoice.provider
              ? activeProviderConfig.apiKey
              : "",
        },
        messages: messagesForRequest.map((m) => ({
          role: m.role,
          content: m.content,
          ...(isStandalone && m.imageDataUrl ? { imageDataUrl: m.imageDataUrl } : {}),
          ...(isStandalone && Array.isArray(m.imageDataUrls) && m.imageDataUrls.length > 0
            ? { imageDataUrls: m.imageDataUrls }
            : {}),
          ...(m.driveFileId ? { driveFileId: m.driveFileId } : {}),
          ...(Array.isArray(m.driveFileIds) && m.driveFileIds.length > 0
            ? { driveFileIds: m.driveFileIds }
            : {}),
          ...(m.driveImageUrl ? { driveImageUrl: m.driveImageUrl } : {}),
          ...(Array.isArray(m.driveImageUrls) && m.driveImageUrls.length > 0
            ? { driveImageUrls: m.driveImageUrls }
            : {}),
          ...(m.driveSource ? { driveSource: m.driveSource } : {}),
        })),
      });

      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers,
        body: payloadBody,
        signal: abortController.signal,
      });

      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate AI response.");
      }

      if (!contentType.includes("text/event-stream") || !res.body) {
        const data = await res.json();
        updateStreamingMessage((m) => ({
          ...m,
          content: data.reply || "",
          modelUsed: data.modelUsed || selectedChoice.modelId,
          providerUsed: data.providerUsed || selectedChoice.provider,
          truncated: Boolean(data.truncated),
          isStreaming: false,
        }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let finalMeta: { modelUsed?: string; providerUsed?: string; truncated?: boolean } = {};

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const ev of events) {
          const dataLines = ev
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.startsWith("data:"));
          for (const dl of dataLines) {
            const rawJson = dl.slice(5).trim();
            if (!rawJson) continue;
            let parsed: any;
            try {
              parsed = JSON.parse(rawJson);
            } catch {
              continue;
            }
            if (parsed.type === "delta" && typeof parsed.text === "string") {
              accumulated += parsed.text;
              const currentText = accumulated;
              updateStreamingMessage((m) => ({
                ...m,
                content: currentText,
              }));
            } else if (parsed.type === "done") {
              finalMeta = {
                modelUsed: parsed.modelUsed,
                providerUsed: parsed.providerUsed,
                truncated: Boolean(parsed.truncated),
              };
              if (typeof parsed.reply === "string" && parsed.reply.length > accumulated.length) {
                accumulated = parsed.reply;
              }
            } else if (parsed.type === "error") {
              throw new Error(parsed.error || "Streaming response interrupted.");
            }
          }
        }
      }

      updateStreamingMessage((m) => ({
        ...m,
        content: accumulated.trim(),
        modelUsed: finalMeta.modelUsed || m.modelUsed,
        providerUsed: finalMeta.providerUsed || m.providerUsed,
        truncated: Boolean(finalMeta.truncated),
        isStreaming: false,
      }));
    } catch (err: any) {
      if (err?.name === "AbortError") {
        updateStreamingMessage((m) => ({
          ...m,
          isStreaming: false,
          truncated: true,
        }));
      } else {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionIdToUpdate
              ? {
                  ...s,
                  messages: s.messages.filter((m) => !(m.id === streamingMsgId && !m.content.trim())).map((m) =>
                    m.id === streamingMsgId ? { ...m, isStreaming: false } : m
                  ),
                }
              : s
          )
        );
        setChatError(err.message || "Error generating AI response.");
      }
    } finally {
      if (streamAbortRef.current === abortController) {
        streamAbortRef.current = null;
      }
      setIsSending(false);
    }
  };

  const handleContinueGeneration = async () => {
    if (!activeSession || isSending) return;
    if (!ensureChatAccess()) return;
    if (!isStandalone && activeSession.messages.length >= 40) {
      setLimitModalOpen(true);
      return;
    }

    const continueMsg: ChatMessageItem = {
      id: `msg-${Date.now()}-cont`,
      role: "user",
      content:
        "Continue seamlessly from exactly where you left off without repeating any completed sections or scene numbers. If generating scenes or numbered batches, resume immediately with the exact next scene number and keep full detail.",
      createdAt: Date.now(),
    };
    const nextMessages = [...activeSession.messages, continueMsg];
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id ? { ...s, messages: nextMessages, updatedAt: Date.now() } : s
      )
    );
    await sendChatTurn(nextMessages, activeSession.id);
  };

  const handleAttachDriveLink = () => {
    const fileId = extractGoogleDriveFileId(driveLinkInput);
    if (!fileId) {
      setChatError("Please paste a valid Google Drive share link (e.g. https://drive.google.com/file/d/...).");
      return;
    }
    setAttachedDriveImages((prev) => {
      if (prev.some((p) => p.fileId === fileId)) return prev;
      return [
        ...prev.slice(0, 5),
        {
          fileId,
          name: `Drive Reference ${prev.length + 1}`,
          source: "public-link" as const,
          previewUrl: getPublicDriveThumbnailUrl(fileId),
          driveUrl: driveLinkInput.trim(),
        },
      ];
    });
    setDriveLinkInput("");
    setShowDriveLinkInput(false);
    setChatError(null);
  };

  const handlePastePrompt = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (isStandalone) return;
    const clipboard = e.clipboardData;
    if (!clipboard) return;

    const pastedFiles = Array.from(clipboard.files as FileList);
    const imageFile = pastedFiles.find((f: File) => f.type.startsWith("image/"));
    const hasImageItem =
      Boolean(imageFile) ||
      Array.from(clipboard.items as DataTransferItemList).some((item: DataTransferItem) =>
        item.type.startsWith("image/")
      );

    if (hasImageItem) {
      e.preventDefault();
      setAttachedImages([]);
      setShowDriveLinkInput(true);
      setChatError(
        "Direct image pasting is disabled on the free Firebase Spark plan. Paste public Google Drive image links ('Anyone with the link') instead."
      );
      return;
    }

    const pastedText = clipboard.getData("text/plain") || "";
    if (pastedText.length > 100000) {
      e.preventDefault();
      const allowed = pastedText.slice(0, 100000);
      setPromptInput((prev) => `${prev}${allowed}`.slice(0, 115000));
      setChatError(
        "Very large paste trimmed to 100,000 characters."
      );
    }
  };

  const handleSubmitPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSending) return;
    if (!ensureChatAccess()) return;
    const rawText = promptInput.trim();
    if (
      !rawText &&
      !(isStandalone && attachedImages.length > 0) &&
      attachedDriveImages.length === 0 &&
      !attachedFileText
    ) {
      return;
    }

    if (!isStandalone && attachedImages.length > 0) {
      setAttachedImages([]);
      setChatError("Direct image storage in Firebase is disabled. Paste public Google Drive image links instead.");
      return;
    }

    if (
      !isStandalone &&
      activeSession &&
      activeSession.messages.length >= 40
    ) {
      setLimitModalOpen(true);
      return;
    }

    const fullUserText = attachedFileText
      ? `${rawText ? rawText + "\n\n" : ""}--- Attached File: ${attachedFileText.name} ---\n${attachedFileText.content}`
      : rawText;

    if (!isStandalone && fullUserText.length > 120000) {
      setChatError(
        "Prompt exceeds 120,000 characters. Please split very large scripts into sections."
      );
      return;
    }

    // Auto-detect Google Drive image URLs pasted directly in text (supports multiple reference images)
    const finalDriveAttachments = [...attachedDriveImages];
    if (!isStandalone) {
      const urlMatches = rawText.match(/https?:\/\/(?:drive|docs)\.google\.com\/[^\s]+/gi) || [];
      for (const u of urlMatches) {
        const detectedId = extractGoogleDriveFileId(u);
        if (detectedId && !finalDriveAttachments.some((d) => d.fileId === detectedId) && finalDriveAttachments.length < 6) {
          finalDriveAttachments.push({
            fileId: detectedId,
            name: `Drive Reference ${finalDriveAttachments.length + 1}`,
            source: "public-link",
            previewUrl: getPublicDriveThumbnailUrl(detectedId),
            driveUrl: u,
          });
        }
      }
    }

    const userMsg: ChatMessageItem = {
      id: `msg-${Date.now()}-usr`,
      role: "user",
      content: fullUserText || (finalDriveAttachments.length > 0 ? "Analyze the attached Google Drive reference image(s)." : ""),
      ...(isStandalone && attachedImages.length > 0
        ? {
            imageDataUrl: attachedImages[0].dataUrl,
            imageDataUrls: attachedImages.map((img) => img.dataUrl),
          }
        : {}),
      ...(finalDriveAttachments.length > 0
        ? {
            driveFileId: finalDriveAttachments[0].fileId,
            driveFileIds: finalDriveAttachments.map((d) => d.fileId),
            driveSource: "public-link" as const,
            driveImageUrl: finalDriveAttachments[0].driveUrl,
            driveImageUrls: finalDriveAttachments.map((d) => d.driveUrl).filter(Boolean) as string[],
            attachmentName:
              finalDriveAttachments.length === 1
                ? finalDriveAttachments[0].name
                : `${finalDriveAttachments.length} Drive References`,
          }
        : {}),
      ...(attachedFileText
        ? { attachmentName: attachedFileText.name }
        : isStandalone && attachedImages.length > 0
        ? {
            attachmentName:
              attachedImages.length === 1
                ? attachedImages[0].name
                : `${attachedImages.length} Reference Images`,
          }
        : {}),
      createdAt: Date.now(),
    };

    let targetSessionId = activeSessionId;
    let nextMessages: ChatMessageItem[] = [];

    if (!targetSessionId || !activeSession) {
      const newId = `chat-${Date.now()}`;
      const cleanTitle = (
        rawText ||
        attachedFileText?.name ||
        finalDriveAttachments[0]?.name ||
        attachedImages[0]?.name ||
        "New Chat"
      )
        .replace(/\s+/g, " ")
        .slice(0, 48);
      nextMessages = [userMsg];
      const newSession: ChatSession = {
        id: newId,
        title: cleanTitle,
        projectId: activeProjectId,
        messages: nextMessages,
        updatedAt: Date.now(),
        storageType: isStandalone ? "local-disk" : "spark",
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newId);
      targetSessionId = newId;
    } else {
      nextMessages = [...activeSession.messages, userMsg];
      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetSessionId ? { ...s, messages: nextMessages, updatedAt: Date.now() } : s
        )
      );
    }

    setPromptInput("");
    setAttachedImages([]);
    setAttachedDriveImages([]);
    setAttachedFileText(null);
    await sendChatTurn(nextMessages, targetSessionId);
  };

  const handleRegenerateLast = async () => {
    if (!activeSession || isSending || activeSession.messages.length === 0) return;
    if (!ensureChatAccess()) return;
    let lastUserIdx = -1;
    for (let i = activeSession.messages.length - 1; i >= 0; i--) {
      if (activeSession.messages[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) return;
    const trimmedMessages = activeSession.messages.slice(0, lastUserIdx + 1);
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id ? { ...s, messages: trimmedMessages, updatedAt: Date.now() } : s
      )
    );
    await sendChatTurn(trimmedMessages, activeSession.id);
  };

  const handleExportSession = () => {
    if (!activeSession || activeSession.messages.length === 0) return;
    const md = activeSession.messages
      .map(
        (m) =>
          `## ${m.role === "user" ? "User" : `Assistant (${m.modelUsed || "AI"})`}\n\n${m.content}`
      )
      .join("\n\n---\n\n");
    const blob = new Blob([`# ${activeSession.title}\n\n${md}`], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeSession.title.replace(/[^a-z0-9_-]+/gi, "_") || "chat"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredSessions = useMemo(() => {
    const q = chatSearch.trim().toLowerCase();
    return sessions.filter((s) => {
      if (activeProjectId && s.projectId !== activeProjectId) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.messages.some((m) => m.content.toLowerCase().includes(q))
      );
    });
  }, [sessions, activeProjectId, chatSearch]);

  // Pure ChatGPT surface palette mapped cleanly to Day & Night themes
  const shellBg = isLight ? "#FFFFFF" : "#212121";
  const sidebarBg = isLight ? "#F9F9F9" : "#171717";
  const composerBg = isLight ? "#FFFFFF" : "#2F2F2F";
  const userBubbleBg = isLight ? "#F4F4F4" : "#2F2F2F";
  const borderCol = isLight ? "#E5E5E7" : "#303030";
  const mutedText = isLight ? "#52525B" : "#A1A1AA";
  const primaryText = isLight ? "#0D0D0D" : "#ECECEC";

  const hasMessages = Boolean(activeSession && activeSession.messages.length > 0);

  return (
    <section
      aria-label="Chat Workspace"
      className="w-full rounded-3xl border overflow-hidden flex transition-colors duration-200"
      style={{
        backgroundColor: shellBg,
        borderColor: borderCol,
        color: primaryText,
        height: "calc(100vh - 108px)",
        minHeight: "640px",
      }}
    >
      {/* Left ChatGPT Sidebar */}
      {sidebarOpen && (
        <aside
          className="w-[260px] shrink-0 border-r flex flex-col justify-between select-none"
          style={{ backgroundColor: sidebarBg, borderColor: borderCol }}
        >
          <div className="p-3 space-y-3 overflow-y-auto flex-1">
            {/* Sidebar Top Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                  title="Collapse sidebar"
                  style={{ color: mutedText }}
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
                <span className="font-sans font-bold text-sm truncate" style={{ color: primaryText }}>
                  Chat Workspace
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleNewChat(activeProjectId)}
                className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                title="New Chat"
                style={{ color: primaryText }}
              >
                <SquarePen className="h-4 w-4" />
              </button>
            </div>

            {/* Search Chats */}
            <div
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs"
              style={{
                backgroundColor: isLight ? "#FFFFFF" : "#212121",
                borderColor: borderCol,
              }}
            >
              <Search className="h-3.5 w-3.5 shrink-0" style={{ color: mutedText }} />
              <input
                type="text"
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                placeholder="Search chats..."
                className="w-full bg-transparent focus:outline-none text-xs"
                style={{ color: primaryText }}
              />
            </div>

            {/* Projects Section */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold" style={{ color: mutedText }}>
                  Projects
                </span>
                {activeProjectId && (
                  <button
                    type="button"
                    onClick={() => setActiveProjectId(null)}
                    className="text-[11px] underline cursor-pointer"
                    style={{ color: theme.secondaryAccentColor }}
                  >
                    Show All
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsCreatingProject((v) => !v)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                style={{ color: primaryText }}
              >
                <FolderPlus className="h-3.5 w-3.5" style={{ color: theme.secondaryAccentColor }} />
                <span>New Project</span>
              </button>

              {isCreatingProject && (
                <form
                  onSubmit={handleCreateProject}
                  className="p-2.5 rounded-xl border space-y-2"
                  style={{
                    backgroundColor: isLight ? "#FFFFFF" : "#212121",
                    borderColor: borderCol,
                  }}
                >
                  <input
                    type="text"
                    placeholder="Project name (e.g. Documentary)"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none"
                    style={{ borderColor: borderCol, color: primaryText, backgroundColor: "transparent" }}
                  />
                  <textarea
                    rows={2}
                    placeholder="Custom system instructions (optional)..."
                    value={newProjectPrompt}
                    onChange={(e) => setNewProjectPrompt(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border text-[11px] focus:outline-none resize-none"
                    style={{ borderColor: borderCol, color: primaryText, backgroundColor: "transparent" }}
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      type="submit"
                      className="flex-1 py-1 rounded-lg text-[11px] font-bold text-white cursor-pointer"
                      style={{ backgroundColor: theme.secondaryAccentColor }}
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingProject(false)}
                      className="px-2.5 py-1 rounded-lg text-[11px] border cursor-pointer"
                      style={{ borderColor: borderCol, color: mutedText }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {projects.length === 0 ? (
                <p className="px-2.5 py-1 text-xs" style={{ color: mutedText }}>
                  No projects yet
                </p>
              ) : (
                <div className="space-y-0.5">
                  {projects.map((proj) => {
                    const selected = activeProjectId === proj.id;
                    return (
                      <div
                        key={proj.id}
                        onClick={() => {
                          setActiveProjectId(selected ? null : proj.id);
                          setActiveSessionId(null);
                        }}
                        className="group w-full flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition-colors text-left"
                        style={{
                          backgroundColor: selected ? `${theme.secondaryAccentColor}20` : "transparent",
                          color: selected ? primaryText : mutedText,
                        }}
                      >
                        <span className="flex items-center gap-2 truncate min-w-0">
                          <Folder
                            className="h-3.5 w-3.5 shrink-0"
                            style={{ color: selected ? theme.secondaryAccentColor : mutedText }}
                          />
                          <span className="truncate font-medium">{proj.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjects((prev) => prev.filter((p) => p.id !== proj.id));
                            if (activeProjectId === proj.id) setActiveProjectId(null);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/15 cursor-pointer shrink-0"
                          title="Delete project"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Installed Skills & Agents Section */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold" style={{ color: mutedText }}>
                  Skills &amp; Agents
                </span>
                <span className="text-[10px] font-mono tabular-nums" style={{ color: mutedText }}>
                  {installedTotalCount} installed
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsSkillsModalOpen(true)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors hover:opacity-90"
                style={{
                  borderColor: borderCol,
                  backgroundColor: isLight ? "#FFFFFF" : "#212121",
                  color: primaryText,
                }}
              >
                <span className="flex items-center gap-2 truncate">
                  <Bot className="h-3.5 w-3.5 shrink-0" style={{ color: theme.secondaryAccentColor }} />
                  <span className="truncate">
                    {activeAgent ? activeAgent.name : "Install Skills & Agents"}
                  </span>
                </span>
                <span
                  className="text-[10px] font-bold shrink-0"
                  style={{ color: theme.accentColor }}
                >
                  Manage
                </span>
              </button>
            </div>

            {/* Chats History List */}
            <div className="space-y-1.5 pt-2">
              <span className="block px-1 text-[11px] font-semibold" style={{ color: mutedText }}>
                Chats
              </span>

              <button
                type="button"
                onClick={() => handleNewChat(activeProjectId)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border transition-colors"
                style={{
                  borderColor: !activeSessionId ? theme.accentColor : borderCol,
                  backgroundColor: !activeSessionId ? `${theme.accentColor}15` : "transparent",
                  color: primaryText,
                }}
              >
                <SquarePen className="h-3.5 w-3.5" style={{ color: theme.accentColor }} />
                <span>New Chat</span>
              </button>

              {filteredSessions.length === 0 ? (
                <p className="px-2.5 py-2 text-xs" style={{ color: mutedText }}>
                  No chats yet
                </p>
              ) : (
                <div className="space-y-0.5">
                  {filteredSessions.map((session) => {
                    const isCurrent = session.id === activeSessionId;
                    return (
                      <div
                        key={session.id}
                        className="group flex items-center justify-between gap-1 px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors"
                        style={{
                          backgroundColor: isCurrent
                            ? isLight
                              ? "#E4E4E7"
                              : "#2F2F2F"
                            : "transparent",
                          color: isCurrent ? primaryText : mutedText,
                        }}
                        onClick={() => {
                          setActiveSessionId(session.id);
                          setChatError(null);
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-75" />
                          <span className="truncate font-medium">{session.title}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSessions((prev) => prev.filter((x) => x.id !== session.id));
                            if (activeSessionId === session.id) setActiveSessionId(null);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/15 cursor-pointer"
                          title="Delete chat"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Bottom Settings, Account Gmail, Remove Key & Provider Trigger */}
          <div className="p-2.5 border-t space-y-1" style={{ borderColor: borderCol }}>
            {!isStandalone && (user || profile) && (
              <div
                className="px-2.5 py-2 rounded-xl border space-y-1.5 mb-1"
                style={{
                  borderColor: borderCol,
                  backgroundColor: isLight ? "#FFFFFF" : "#212121",
                }}
              >
                <div className="text-[10px] font-mono truncate" style={{ color: mutedText }} title={profile?.email || user?.email || ""}>
                  <span className="font-bold block truncate" style={{ color: primaryText }}>
                    {profile?.email || user?.email || "Signed In"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {profile?.hasApiKey && (
                    <button
                      type="button"
                      onClick={() => void removeApiKey()}
                      className="flex-1 px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer hover:bg-red-500/10"
                      style={{ borderColor: `${theme.accentColor}45`, color: theme.accentColor }}
                      title="Remove your saved API key"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Remove Key</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="flex-1 px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer hover:bg-red-500/10"
                    style={{ borderColor: `${theme.accentColor}45`, color: theme.accentColor }}
                    title="Log out of your account"
                  >
                    <LogOut className="h-3 w-3" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsApiKeyModalOpen(true)}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
              style={{ color: primaryText }}
            >
              <Key className="h-3.5 w-3.5" style={{ color: theme.secondaryAccentColor }} />
              <span>{isStandalone ? "Providers & Local Engine" : "Manage / Remove API Key"}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
              style={{ color: mutedText }}
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Settings</span>
            </button>

            <div
              className="px-2.5 py-1.5 flex items-center gap-2 text-[11px] truncate"
              style={{ color: mutedText }}
              title={`Chat history storage: ${storageLocation}`}
            >
              {storageMode === "local-disk" ? (
                <HardDrive className="h-3 w-3 shrink-0" style={{ color: theme.secondaryAccentColor }} />
              ) : storageMode === "cloud-firestore" ? (
                <Cloud className="h-3 w-3 shrink-0" style={{ color: theme.accentColor }} />
              ) : (
                <Monitor className="h-3 w-3 shrink-0" />
              )}
              <span className="truncate">
                {storageMode === "local-disk"
                  ? "Saved on PC Disk"
                  : storageMode === "cloud-firestore"
                  ? "Cloud Sync (Text Only · Spark)"
                  : "Saved in Browser"}
              </span>
            </div>
          </div>
        </aside>
      )}

      {/* Right Main ChatGPT Canvas */}
      <div className="flex-1 min-w-0 flex flex-col justify-between relative">
        {/* Top Minimal ChatGPT Header Bar */}
        <div
          className="h-12 px-4 border-b flex items-center justify-between gap-3 shrink-0"
          style={{ borderColor: borderCol }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer shrink-0"
                title="Expand sidebar"
                style={{ color: mutedText }}
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}
            <span className="text-sm font-semibold truncate" style={{ color: primaryText }}>
              {activeSession?.title || activeProject?.name || "New Chat"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px]"
              style={{
                borderColor: borderCol,
                backgroundColor: isLight ? "#F8FAFC" : "#1B1B1B",
                color: primaryText,
              }}
              title="Switch active specialized Agent or Skill profile"
            >
              <Bot className="h-3.5 w-3.5 shrink-0" style={{ color: theme.secondaryAccentColor }} />
              <select
                value={activeAgentId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__manage__") {
                    setIsSkillsModalOpen(true);
                    return;
                  }
                  setActiveAgentId(val || null);
                }}
                className="bg-transparent font-semibold focus:outline-none cursor-pointer max-w-[200px] truncate"
                style={{ colorScheme: isLight ? "light" : "dark", color: primaryText }}
              >
                <option value="" style={{ backgroundColor: composerBg, color: primaryText }}>
                  Default Chat (Flagship Depth)
                </option>
                {installedAgents.map((agent) => (
                  <option
                    key={agent.id}
                    value={agent.id}
                    style={{ backgroundColor: composerBg, color: primaryText }}
                  >
                    {agent.name}
                  </option>
                ))}
                <option value="__manage__" style={{ backgroundColor: composerBg, color: primaryText }}>
                  + Install / Manage Skills...
                </option>
              </select>
            </div>

            {hasMessages && (
              <button
                type="button"
                onClick={handleExportSession}
                className="px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                style={{ borderColor: borderCol, color: primaryText }}
                title="Download conversation as Markdown"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveWorkspace("studio")}
              className="px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              style={{ borderColor: borderCol, color: primaryText }}
            >
              <Clapperboard className="h-3.5 w-3.5" style={{ color: theme.accentColor }} />
              <span className="hidden sm:inline">Automation Studio</span>
            </button>
          </div>
        </div>

        {/* Scrollable Chat Messages Area OR Centered ChatGPT Empty State */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          {!hasMessages ? (
            <div className="h-full max-w-3xl mx-auto flex flex-col items-center justify-center gap-6">
              <div className="flex flex-col items-center text-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: primaryText }}>
                  What can I help with?
                </h2>
                {(activeAgent || enabledSkills.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setIsSkillsModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer hover:opacity-80"
                    style={{ color: mutedText }}
                  >
                    <Bot className="h-3.5 w-3.5" style={{ color: theme.secondaryAccentColor }} />
                    <span>
                      {activeAgent ? `Agent: ${activeAgent.name}` : "Default Chat"}
                      {enabledSkills.length > 0
                        ? ` · ${enabledSkills.length} ${enabledSkills.length === 1 ? "skill" : "skills"} active`
                        : ""}
                    </span>
                  </button>
                )}
              </div>

              <div className="w-full space-y-3">
                {renderComposerBox()}

                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2 text-xs" style={{ color: mutedText }}>
                    {selectedChoice.provider === "local" ? (
                      <Monitor className="h-3.5 w-3.5" />
                    ) : (
                      <Cloud className="h-3.5 w-3.5" />
                    )}
                    <span className="font-medium">
                      {selectedChoice.provider === "local"
                        ? "This device · Local GGUF"
                        : `${activeChoiceDisplay.category} · Cloud`}
                    </span>
                  </div>
                  {!isStandalone && systemModeChecked && !user ? (
                    <button
                      type="button"
                      onClick={() => setIsAuthModalOpen(true)}
                      className="text-[11px] font-bold underline cursor-pointer inline-flex items-center gap-1"
                      style={{ color: theme.accentColor }}
                    >
                      <Lock className="h-3 w-3" />
                      <span>Sign In &amp; Save API Key to Generate</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsApiKeyModalOpen(true)}
                      className="text-[11px] font-medium underline cursor-pointer"
                      style={{ color: !isStandalone && !profile?.hasApiKey ? theme.accentColor : mutedText }}
                    >
                      {!isStandalone && !profile?.hasApiKey
                        ? "Paste & Save Personal API Key to Generate"
                        : isStandalone
                        ? "Manage API Keys & Local Engine"
                        : "Manage Secure API Key"}
                    </button>
                  )}
                </div>

                {/* Flagship Workflow Starter Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {[
                    {
                      id: "vfx-scene",
                      title: "Universal Cinematic & VFX Scenes",
                      desc: "Continuity Bibles + SCENE 001..N prompts with camera, lens & VFX.",
                      icon: Film,
                      agentId: "agent-universal-cinematic-vfx",
                      focus: "scene_prompts" as const,
                      starter:
                        "Generate 15 ultra-detailed cinematic VFX scenes (with full Character, Location, Lighting & Color Continuity Bibles first).\nMode: Both Image & Video Prompts\nVisual Style: Photorealistic Hollywood Epic\nTopic / Script:\n",
                    },
                    {
                      id: "script-vo",
                      title: "Full Script & Voiceover Architect",
                      desc: "Unlimited long-form documentaries, stories & retention-paced VO.",
                      icon: BookOpen,
                      agentId: "agent-script-transcript",
                      focus: "transcript" as const,
                      starter:
                        "Write a complete, deeply researched, unabridged voiceover script with strong hook, chapter flow, and zero placeholders.\nTopic: ",
                    },
                    {
                      id: "flagship-research",
                      title: "Deep Research, Tables & Strategy",
                      desc: "ChatGPT, Claude & Gemini depth with structured Markdown tables.",
                      icon: Sparkles,
                      agentId: "agent-flagship-assistant",
                      focus: "general" as const,
                      starter:
                        "Give me a comprehensive, structured breakdown with comparison tables, step-by-step analysis, and actionable examples on:\n",
                    },
                    {
                      id: "code-arch",
                      title: "Full-Stack Code & Architecture",
                      desc: "Complete production-ready modules, APIs & TypeScript codebases.",
                      icon: Code2,
                      agentId: "agent-code-architect",
                      focus: "general" as const,
                      starter:
                        "Design and write complete, production-ready code (no stubs or ellipses) for:\n",
                    },
                  ].map((card) => {
                    const CardIcon = card.icon;
                    const isSelectedAgent = activeAgentId === card.agentId;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => {
                          setActiveAgentId(card.agentId);
                          setOutputFocus(card.focus);
                          setPromptInput(card.starter);
                        }}
                        className="p-3 rounded-2xl border text-left transition-colors hover:opacity-95 cursor-pointer flex items-start gap-2.5"
                        style={{
                          borderColor: isSelectedAgent ? theme.secondaryAccentColor : borderCol,
                          backgroundColor: isLight ? "#FAFAFB" : "#1B1B1B",
                        }}
                      >
                        <div
                          className="p-2 rounded-xl border shrink-0"
                          style={{
                            borderColor: borderCol,
                            backgroundColor: composerBg,
                          }}
                        >
                          <CardIcon
                            className="h-4 w-4"
                            style={{
                              color: isSelectedAgent
                                ? theme.secondaryAccentColor
                                : theme.accentColor,
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate" style={{ color: primaryText }}>
                            {card.title}
                          </div>
                          <div className="text-[11px] leading-snug mt-0.5 line-clamp-2" style={{ color: mutedText }}>
                            {card.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6 pb-4">
              {activeSession.messages.map((msg, msgIndex) => {
                const isUser = msg.role === "user";
                const isLatestAssistant =
                  !isUser && msgIndex === activeSession.messages.length - 1;
                const localImgs =
                  Array.isArray(msg.imageDataUrls) && msg.imageDataUrls.length > 0
                    ? msg.imageDataUrls
                    : msg.imageDataUrl
                    ? [msg.imageDataUrl]
                    : [];
                const driveIds =
                  Array.isArray(msg.driveFileIds) && msg.driveFileIds.length > 0
                    ? msg.driveFileIds
                    : msg.driveFileId
                    ? [msg.driveFileId]
                    : [];
                const needsContinueHighlight =
                  Boolean(msg.truncated) ||
                  /\b(batch|next scene|continue|scene\s+\d+|part\s+\d+)\b/i.test(msg.content);

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    {isUser ? (
                      <div
                        className="rounded-3xl px-4 py-3 text-[15px] leading-relaxed border max-w-[82%] whitespace-pre-wrap"
                        style={{
                          backgroundColor: userBubbleBg,
                          borderColor: borderCol,
                          color: primaryText,
                        }}
                      >
                        {localImgs.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {localImgs.map((src, idx) => (
                              <img
                                key={`${msg.id}-img-${idx}`}
                                src={src}
                                alt={`${msg.attachmentName || "Attached visual"} ${idx + 1}`}
                                className="max-h-52 rounded-xl object-contain border"
                                style={{ borderColor: borderCol }}
                              />
                            ))}
                          </div>
                        )}
                        {localImgs.length === 0 && driveIds.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {driveIds.map((fid, idx) => (
                              <img
                                key={`${msg.id}-drv-${fid}-${idx}`}
                                src={getPublicDriveThumbnailUrl(fid)}
                                alt={`Google Drive reference ${idx + 1}`}
                                className="max-h-52 rounded-xl object-contain border"
                                style={{ borderColor: borderCol }}
                              />
                            ))}
                          </div>
                        )}
                        {msg.attachmentName && localImgs.length === 0 && driveIds.length === 0 && (
                          <div
                            className="text-[11px] font-mono mb-1.5 flex items-center gap-1.5"
                            style={{ color: theme.secondaryAccentColor }}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>{msg.attachmentName}</span>
                          </div>
                        )}
                        <span>{msg.content}</span>
                      </div>
                    ) : (
                      <div className="w-full space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: mutedText }}>
                          <Sparkles
                            className="h-3.5 w-3.5"
                            style={{
                              color:
                                msg.providerUsed === "local"
                                  ? theme.secondaryAccentColor
                                  : theme.accentColor,
                            }}
                          />
                          <span>{msg.modelUsed || activeChoiceDisplay.label}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{countWords(msg.content)} words</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            {msg.isStreaming ? "Streaming live..." : formatRelativeDay(msg.createdAt)}
                          </span>
                        </div>

                        <div className="py-1" style={{ color: primaryText }}>
                          {msg.isStreaming && !msg.content.trim() ? (
                            <div className="text-xs font-mono opacity-75 flex items-center gap-2">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: theme.secondaryAccentColor }} />
                              <span>Connecting to {msg.modelUsed || activeChoiceDisplay.label}...</span>
                            </div>
                          ) : (
                            <FormattedMessageBody
                              content={msg.content}
                              isLight={isLight}
                              accentColor={theme.accentColor}
                              secondaryColor={theme.secondaryAccentColor}
                              isStreaming={msg.isStreaming}
                            />
                          )}
                        </div>

                        {/* Response Utilities + Continue + One-Click Transfer to Automation Studio */}
                        {!msg.isStreaming && msg.content.trim() && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(msg.content);
                                setCopiedMsgId(msg.id);
                                setTimeout(() => setCopiedMsgId(null), 1500);
                              }}
                              className="px-2.5 py-1 rounded-lg border flex items-center gap-1 cursor-pointer hover:opacity-85"
                              style={{ borderColor: borderCol, color: mutedText }}
                            >
                              {copiedMsgId === msg.id ? (
                                <Check className="h-3 w-3" style={{ color: theme.secondaryAccentColor }} />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              <span>{copiedMsgId === msg.id ? "Copied" : "Copy"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const blob = new Blob([msg.content], { type: "text/plain;charset=utf-8" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `AI_Output_${Date.now()}.txt`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className="px-2.5 py-1 rounded-lg border flex items-center gap-1 cursor-pointer hover:opacity-85"
                              style={{ borderColor: borderCol, color: mutedText }}
                            >
                              <Download className="h-3 w-3" />
                              <span>Save .txt</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const blob = new Blob([msg.content], { type: "text/markdown;charset=utf-8" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `AI_Output_${Date.now()}.md`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className="px-2.5 py-1 rounded-lg border flex items-center gap-1 cursor-pointer hover:opacity-85"
                              style={{ borderColor: borderCol, color: mutedText }}
                            >
                              <Download className="h-3 w-3" />
                              <span>Save .md</span>
                            </button>

                            <button
                              type="button"
                              disabled={isSending}
                              onClick={handleRegenerateLast}
                              className="px-2.5 py-1 rounded-lg border flex items-center gap-1 cursor-pointer hover:opacity-85 disabled:opacity-45"
                              style={{ borderColor: borderCol, color: mutedText }}
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>Regenerate</span>
                            </button>

                            {isLatestAssistant && (
                              <button
                                type="button"
                                disabled={isSending}
                                onClick={() => void handleContinueGeneration()}
                                className="px-2.5 py-1 rounded-lg border flex items-center gap-1 font-semibold cursor-pointer hover:opacity-90 disabled:opacity-45"
                                style={{
                                  borderColor: needsContinueHighlight ? theme.accentColor : borderCol,
                                  backgroundColor: needsContinueHighlight ? `${theme.accentColor}12` : "transparent",
                                  color: needsContinueHighlight ? theme.accentColor : primaryText,
                                }}
                                title="Continue seamlessly from where this response stopped (ideal for long scripts & 50+ scene batches)"
                              >
                                <FastForward className="h-3 w-3" />
                                <span>Continue</span>
                              </button>
                            )}

                            <span className="mx-1 opacity-40" style={{ color: mutedText }}>
                              |
                            </span>

                            <button
                              type="button"
                              onClick={() => onSendToStudio("script", msg.content)}
                              className="px-2.5 py-1 rounded-lg border flex items-center gap-1 font-semibold cursor-pointer"
                              style={{ borderColor: borderCol, color: primaryText }}
                              title="Load into Source Script Input & switch to Automation Studio"
                            >
                              <PenLine className="h-3 w-3" style={{ color: theme.accentColor }} />
                              <span>Use in Script</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onSendToStudio("scenes", msg.content)}
                              className="px-2.5 py-1 rounded-lg border flex items-center gap-1 font-semibold cursor-pointer"
                              style={{ borderColor: borderCol, color: primaryText }}
                              title="Load into Scene Script Input & switch to Automation Studio"
                            >
                              <Clapperboard className="h-3 w-3" style={{ color: theme.secondaryAccentColor }} />
                              <span>Use in Scenes</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onSendToStudio("ctr", msg.content)}
                              className="px-2.5 py-1 rounded-lg border flex items-center gap-1 font-semibold cursor-pointer"
                              style={{ borderColor: borderCol, color: primaryText }}
                              title="Load into Video Script Input for CTR & SEO metadata"
                            >
                              <TrendingUp className="h-3 w-3" style={{ color: theme.accentColor }} />
                              <span>Use in CTR</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onSendToStudio("thumbnail", msg.content)}
                              className="px-2.5 py-1 rounded-lg border flex items-center gap-1 font-semibold cursor-pointer"
                              style={{ borderColor: borderCol, color: primaryText }}
                              title="Load into Thumbnail Brief Input"
                            >
                              <ImageIcon className="h-3 w-3" style={{ color: theme.secondaryAccentColor }} />
                              <span>Thumbnail</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="pt-1">
                <RenderingProgressBar
                  active={
                    isSending &&
                    !activeSession.messages[activeSession.messages.length - 1]?.content?.trim()
                  }
                  title="CONNECTING"
                  accentColor={theme.accentColor}
                  secondaryAccentColor={theme.secondaryAccentColor}
                  textColor={primaryText}
                  isLight={isLight}
                  stages={[
                    `Connecting to ${activeChoiceDisplay.label}...`,
                    selectedChoice.provider === "local"
                      ? "Preparing local GGUF context..."
                      : "Opening real-time token stream...",
                    "Starting flagship response...",
                  ]}
                />
              </div>

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Sticky Bottom Composer when Chat Thread is Active */}
        {hasMessages && (
          <div className="px-4 sm:px-8 pb-4 pt-2 border-t" style={{ borderColor: borderCol }}>
            <div className="max-w-3xl mx-auto space-y-2">
              {chatError && (
                <div
                  className="px-3 py-2 rounded-xl border text-xs font-mono flex items-center justify-between gap-2"
                  style={{
                    borderColor: theme.accentColor,
                    backgroundColor: `${theme.accentColor}15`,
                    color: primaryText,
                  }}
                >
                  <span>{chatError}</span>
                  <button type="button" onClick={() => setChatError(null)} className="cursor-pointer">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {renderComposerBox()}
            </div>
          </div>
        )}
      </div>

      <SkillsAgentsModal
        isOpen={isSkillsModalOpen}
        onClose={() => setIsSkillsModalOpen(false)}
        items={skillsAndAgents}
        activeAgentId={activeAgentId}
        onSelectAgent={(id) => setActiveAgentId(id)}
        onToggleSkill={handleToggleSkill}
        onInstallItem={handleInstallItem}
        onUninstallItem={handleUninstallItem}
        onAddCustomItem={handleAddCustomItem}
        linkedFolders={linkedFolders}
        detectedPresets={detectedPresets}
        isLinkingFolder={isLinkingFolder}
        folderSyncError={folderSyncError}
        onLinkFolder={handleLinkFolder}
        onUnlinkFolder={handleUnlinkFolder}
        onRescanFolders={handleRescanFolders}
      />

      {/* Strict 40-Message Limit Modal (Delete Chat OR Export & Start New Chat) */}
      {limitModalOpen && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl"
            style={{ backgroundColor: sidebarBg, borderColor: borderCol, color: primaryText }}
          >
            <div className="flex items-start gap-3">
              <div
                className="p-2.5 rounded-2xl border shrink-0"
                style={{ borderColor: borderCol, backgroundColor: `${theme.accentColor}15` }}
              >
                <AlertTriangle className="h-5 w-5" style={{ color: theme.accentColor }} />
              </div>
              <div>
                <h3 className="text-base font-extrabold">40-Message Free Storage Limit</h3>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: mutedText }}>
                  This chat has reached 40 messages on free Firebase Spark storage. Please <strong>delete this chat</strong> or start a fresh chat to stay within free cloud limits.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSessions((prev) => prev.filter((x) => x.id !== activeSession.id));
                  setActiveSessionId(null);
                  setLimitModalOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete This Chat (Free Spark Plan)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleExportSession();
                  handleNewChat(activeProjectId);
                  setLimitModalOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                style={{ borderColor: borderCol, color: primaryText }}
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export .md &amp; Start New Chat</span>
              </button>

              <button
                type="button"
                onClick={() => setLimitModalOpen(false)}
                className="w-full py-2 rounded-xl border text-xs font-semibold cursor-pointer"
                style={{ borderColor: borderCol, color: mutedText }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );

  function renderComposerBox() {
    return (
      <form
        onSubmit={handleSubmitPrompt}
        className="w-full rounded-3xl border transition-all relative"
        style={{
          backgroundColor: composerBg,
          borderColor: borderCol,
          boxShadow: isLight
            ? "0 8px 24px -6px rgba(0,0,0,0.08)"
            : "0 12px 32px -8px rgba(0,0,0,0.45)",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.pdf,image/*"
          className="hidden"
          onChange={handleAttachFile}
        />

        {!hasMessages && chatError && (
          <div
            className="mx-3.5 mt-3 px-3 py-2 rounded-xl border text-xs font-mono flex items-center justify-between gap-2"
            style={{
              borderColor: theme.accentColor,
              backgroundColor: `${theme.accentColor}15`,
              color: primaryText,
            }}
          >
            <span>{chatError}</span>
            <button type="button" onClick={() => setChatError(null)} className="cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {showDriveLinkInput && (
          <div className="mx-3.5 mt-3 flex items-center gap-2">
            <input
              type="url"
              placeholder="Paste public Google Drive image link (https://drive.google.com/file/d/...)"
              value={driveLinkInput}
              onChange={(e) => setDriveLinkInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAttachDriveLink();
                }
              }}
              className="flex-1 rounded-xl border px-3 py-1.5 text-xs focus:outline-none"
              style={{ borderColor: borderCol, backgroundColor: sidebarBg, color: primaryText }}
            />
            <button
              type="button"
              onClick={handleAttachDriveLink}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white cursor-pointer"
              style={{ backgroundColor: theme.secondaryAccentColor }}
            >
              Attach Link
            </button>
            <button
              type="button"
              onClick={() => setShowDriveLinkInput(false)}
              className="p-1.5 rounded-lg cursor-pointer"
              style={{ color: mutedText }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {(attachedImages.length > 0 || attachedDriveImages.length > 0 || attachedFileText) && (
          <div className="px-4 pt-3 flex flex-wrap gap-2">
            {attachedImages.map((img, idx) => (
              <div
                key={`local-ref-${idx}-${img.name}`}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs"
                style={{ borderColor: borderCol, backgroundColor: sidebarBg }}
              >
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="h-5 w-5 rounded object-cover"
                />
                <span className="truncate max-w-[160px]">{img.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachedImages((prev) => prev.filter((_, i) => i !== idx))}
                  className="cursor-pointer opacity-75 hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {attachedDriveImages.map((drv, idx) => (
              <div
                key={`drv-ref-${drv.fileId}-${idx}`}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs"
                style={{ borderColor: borderCol, backgroundColor: sidebarBg }}
              >
                <img
                  src={drv.previewUrl}
                  alt={drv.name}
                  className="h-5 w-5 rounded object-cover"
                />
                <Link2 className="h-3 w-3 shrink-0" style={{ color: theme.secondaryAccentColor }} />
                <span className="truncate max-w-[160px]">{drv.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachedDriveImages((prev) => prev.filter((_, i) => i !== idx))}
                  className="cursor-pointer opacity-75 hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {attachedFileText && (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-mono"
                style={{ borderColor: borderCol, backgroundColor: sidebarBg }}
              >
                <FileText className="h-3.5 w-3.5" style={{ color: theme.secondaryAccentColor }} />
                <span className="truncate max-w-[180px]">{attachedFileText.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachedFileText(null)}
                  className="cursor-pointer opacity-75 hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {(isListening || voiceConnecting) && (
          <div
            className="mx-3.5 mt-3 px-3 py-2 rounded-xl border text-xs font-mono flex items-center justify-between gap-2"
            style={{
              borderColor: theme.secondaryAccentColor,
              backgroundColor: `${theme.secondaryAccentColor}15`,
              color: primaryText,
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2 w-2 rounded-full animate-pulse shrink-0"
                style={{ backgroundColor: voiceConnecting ? theme.accentColor : theme.secondaryAccentColor }}
              />
              <span className="font-bold shrink-0">
                {voiceConnecting
                  ? "Connecting Gemini Live..."
                  : voiceMode === "translate"
                  ? `Live Translate (${voiceTargetLang.toUpperCase()})`
                  : "Transcribe Live"}
              </span>
              {liveInterimText && (
                <span className="truncate opacity-85 italic">{liveInterimText}</span>
              )}
            </div>
            <button
              type="button"
              onClick={stopLiveVoice}
              className="px-2 py-0.5 rounded-lg bg-red-600 text-white text-[10px] font-bold cursor-pointer shrink-0"
            >
              Stop
            </button>
          </div>
        )}

        <textarea
          rows={hasMessages ? 2 : 3}
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          onPaste={handlePastePrompt}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSubmitPrompt();
            }
          }}
          placeholder="Message Chat Workspace (write any transcript, prompt, script, or chat...)"
          className="w-full bg-transparent px-4 pt-3.5 pb-2 text-[15px] focus:outline-none resize-none leading-relaxed"
          style={{ color: primaryText }}
        />

        <div className="px-3 pb-2.5 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 relative">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 w-8 rounded-full border flex items-center justify-center cursor-pointer transition-colors hover:opacity-90"
              style={{ borderColor: borderCol, color: primaryText }}
              title={
                isStandalone
                  ? "Attach .txt, .md, .pdf, or image"
                  : "Attach .txt, .md, or .pdf (use Drive Image button for public Google Drive image links)"
              }
            >
              <Plus className="h-4 w-4" />
            </button>

            {!isStandalone && (
              <button
                type="button"
                onClick={() => setShowDriveLinkInput((v) => !v)}
                className="h-8 px-2.5 rounded-full border flex items-center gap-1 text-xs cursor-pointer transition-colors hover:opacity-90"
                style={{
                  borderColor: showDriveLinkInput || attachedDriveImages.length > 0 ? theme.secondaryAccentColor : borderCol,
                  color: primaryText,
                }}
                title="Attach up to 6 public Google Drive reference image links (0 KB Firebase storage)"
              >
                <Link2 className="h-3.5 w-3.5" style={{ color: theme.secondaryAccentColor }} />
                <span className="hidden sm:inline font-medium">
                  {attachedDriveImages.length > 0
                    ? `Drive Ref (${attachedDriveImages.length}/6)`
                    : "Drive Ref"}
                </span>
              </button>
            )}

            <div className="relative" ref={optionsMenuRef}>
              <button
                type="button"
                onClick={() => setShowPromptOptions((v) => !v)}
                className="h-8 px-2.5 rounded-full border flex items-center gap-1.5 text-xs cursor-pointer transition-colors"
                style={{
                  borderColor:
                    outputFocus !== "general" ||
                    customSystemPrompt.trim() ||
                    targetWordVolume !== "auto" ||
                    activeAgent ||
                    enabledSkills.length > 0
                      ? theme.secondaryAccentColor
                      : borderCol,
                  color: primaryText,
                }}
                title="Agents, Skills, Optimize Prompt, output mode & system controls"
              >
                {isOptimizing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: theme.accentColor }} />
                ) : (
                  <SlidersHorizontal
                    className="h-3.5 w-3.5"
                    style={{ color: theme.secondaryAccentColor }}
                  />
                )}
                <span className="hidden sm:inline font-medium">
                  {isOptimizing
                    ? "Optimizing..."
                    : outputFocus === "general"
                    ? "Tools"
                    : outputFocus === "transcript"
                    ? "Transcript"
                    : outputFocus === "scene_prompts"
                    ? "Scene Prompts"
                    : outputFocus === "thumbnail_ctr"
                    ? "CTR & SEO"
                    : "Rewrite"}
                </span>
                {(activeAgent || enabledSkills.length > 0) && !isOptimizing && (
                  <span
                    className="text-[10px] font-bold tabular-nums"
                    style={{ color: theme.accentColor }}
                  >
                    {enabledSkills.length > 0 ? `+${enabledSkills.length}` : "•"}
                  </span>
                )}
              </button>

              {showPromptOptions && (
                <div
                  className="absolute bottom-10 left-0 w-[340px] max-h-[75vh] overflow-y-auto rounded-2xl border p-3.5 shadow-2xl z-40 space-y-3 text-xs"
                  style={{
                    backgroundColor: isLight ? "#FFFFFF" : "#1F1F1F",
                    borderColor: borderCol,
                    color: primaryText,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Tools &amp; Prompt Controls</span>
                    <button
                      type="button"
                      onClick={() => setShowPromptOptions(false)}
                      className="cursor-pointer"
                      style={{ color: mutedText }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* 1-Click Optimize Prompt Action inside Tools */}
                  <button
                    type="button"
                    disabled={isOptimizing || isSending}
                    onClick={() => {
                      setShowPromptOptions(false);
                      void handleOptimizePrompt();
                    }}
                    className="w-full px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-left cursor-pointer transition-colors hover:opacity-90 disabled:opacity-50"
                    style={{
                      backgroundColor: isLight ? "#F9FAFB" : "#141414",
                      borderColor: promptInput.trim() ? theme.accentColor : borderCol,
                      color: primaryText,
                    }}
                    title="Expand your draft into a deeply detailed ChatGPT, Claude & Gemini grade prompt"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isOptimizing ? (
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin shrink-0"
                          style={{ color: theme.accentColor }}
                        />
                      ) : (
                        <Wand2
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ color: theme.accentColor }}
                        />
                      )}
                      <div className="min-w-0">
                        <div className="font-bold truncate">
                          {isOptimizing ? "Optimizing Prompt..." : "Optimize Prompt"}
                        </div>
                        <div className="text-[10px] truncate" style={{ color: mutedText }}>
                          Expand draft into a detailed prompt
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: mutedText }} />
                  </button>

                  {/* Agents & Skills Controls inside Tools */}
                  <div
                    className="pt-2 border-t space-y-2"
                    style={{ borderColor: borderCol }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: mutedText }}>
                        <Bot className="h-3.5 w-3.5" style={{ color: theme.secondaryAccentColor }} />
                        <span>Agent &amp; Skills</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPromptOptions(false);
                          setIsSkillsModalOpen(true);
                        }}
                        className="text-[11px] font-bold underline cursor-pointer"
                        style={{ color: theme.secondaryAccentColor }}
                      >
                        Install / Manage
                      </button>
                    </div>

                    <select
                      value={activeAgentId || ""}
                      onChange={(e) => setActiveAgentId(e.target.value || null)}
                      className="w-full rounded-xl border px-2.5 py-1.5 text-xs focus:outline-none"
                      style={{
                        backgroundColor: isLight ? "#F9FAFB" : "#141414",
                        borderColor: borderCol,
                        color: primaryText,
                      }}
                    >
                      <option value="">Default Chat (General Assistant)</option>
                      {installedAgents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>

                    {installedSkills.length > 0 && (
                      <div className="space-y-1">
                        {installedSkills.map((sk) => (
                          <button
                            key={sk.id}
                            type="button"
                            onClick={() => handleToggleSkill(sk.id)}
                            className="w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 text-left cursor-pointer border"
                            style={{
                              backgroundColor: sk.enabled
                                ? `${theme.accentColor}15`
                                : isLight
                                ? "#F9FAFB"
                                : "#141414",
                              borderColor: sk.enabled ? theme.accentColor : borderCol,
                              color: primaryText,
                            }}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Sparkles
                                className="h-3 w-3 shrink-0"
                                style={{ color: sk.enabled ? theme.accentColor : mutedText }}
                              />
                              <span className="truncate font-medium">{sk.name}</span>
                            </div>
                            <span
                              className="text-[10px] font-bold shrink-0"
                              style={{ color: sk.enabled ? theme.accentColor : mutedText }}
                            >
                              {sk.enabled ? "ON" : "OFF"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t space-y-2.5" style={{ borderColor: borderCol }}>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold" style={{ color: mutedText }}>
                        Output Mode:
                      </label>
                      <select
                        value={outputFocus}
                        onChange={(e) => setOutputFocus(e.target.value as any)}
                        className="w-full rounded-xl border px-2.5 py-1.5 text-xs focus:outline-none"
                        style={{
                          backgroundColor: isLight ? "#F9FAFB" : "#141414",
                          borderColor: borderCol,
                          color: primaryText,
                        }}
                      >
                        <option value="general">General Chat</option>
                        <option value="transcript">Voiceover Script &amp; Transcript</option>
                        <option value="scene_prompts">Cinematic Image / Video Prompts</option>
                        <option value="thumbnail_ctr">YouTube CTR Titles, Tags &amp; Thumbnail</option>
                        <option value="rewrite">Anti-Plagiarism Rewrite &amp; Translate</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold" style={{ color: mutedText }}>
                          Target Words:
                        </label>
                        <select
                          value={targetWordVolume}
                          onChange={(e) => setTargetWordVolume(e.target.value)}
                          className="w-full rounded-xl border px-2 py-1.5 text-xs focus:outline-none"
                          style={{
                            backgroundColor: isLight ? "#F9FAFB" : "#141414",
                            borderColor: borderCol,
                            color: primaryText,
                          }}
                        >
                          <option value="auto">Auto (Full Depth)</option>
                          <option value="300">~300 words</option>
                          <option value="800">~800 words</option>
                          <option value="1500">~1500 words</option>
                          <option value="3000+">~3000+ words (Long-Form)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold tabular-nums" style={{ color: mutedText }}>
                          Creativity ({temperature.toFixed(1)}):
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={1.2}
                          step={0.1}
                          value={temperature}
                          onChange={(e) => setTemperature(Number(e.target.value))}
                          className="w-full mt-1.5 cursor-pointer"
                          style={{ accentColor: theme.secondaryAccentColor }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold" style={{ color: mutedText }}>
                        Custom System Instruction:
                      </label>
                      <textarea
                        rows={2}
                        value={customSystemPrompt}
                        onChange={(e) => setCustomSystemPrompt(e.target.value)}
                        placeholder="e.g. Respond in concise bullet points or Urdu Nastaliq script..."
                        className="w-full rounded-xl border px-2.5 py-1.5 text-[11px] focus:outline-none resize-none"
                        style={{
                          backgroundColor: isLight ? "#F9FAFB" : "#141414",
                          borderColor: borderCol,
                          color: primaryText,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 relative">
            <div className="relative" ref={modelMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setShowModelDropdown((v) => !v);
                  void fetchAvailableModels();
                }}
                className="h-8 px-3 rounded-full border flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors"
                style={{
                  borderColor: borderCol,
                  backgroundColor: isLight ? "#F8FAFC" : "#212121",
                  color: primaryText,
                }}
              >
                {selectedChoice.provider === "local" ? (
                  <Laptop className="h-3.5 w-3.5 shrink-0" style={{ color: theme.secondaryAccentColor }} />
                ) : (
                  <Cloud className="h-3.5 w-3.5 shrink-0" style={{ color: theme.accentColor }} />
                )}
                <span className="truncate max-w-[180px]">{activeChoiceDisplay.label}</span>
                <span
                  className="text-[10px] font-bold"
                  style={{
                    color:
                      selectedChoice.provider === "local"
                        ? theme.secondaryAccentColor
                        : theme.accentColor,
                  }}
                >
                  {selectedChoice.provider === "local" ? "Local" : "Cloud"}
                </span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>

              {showModelDropdown && (
                <div
                  className="absolute bottom-10 right-0 w-80 max-h-80 overflow-y-auto rounded-2xl border p-2 shadow-2xl z-40 space-y-2 text-xs"
                  style={{
                    backgroundColor: isLight ? "#FFFFFF" : "#1F1F1F",
                    borderColor: borderCol,
                    color: primaryText,
                  }}
                >
                  {(
                    ["Local Device", "Gemini Cloud", "OpenAI Cloud", "Claude Cloud"] as const
                  ).map((cat) => {
                    const group = unifiedModels.filter((m) => m.category === cat);
                    if (group.length === 0) return null;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="px-2 pt-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider" style={{ color: mutedText }}>
                          <span>{cat}</span>
                          {!group[0].ready && cat !== "Local Device" && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowModelDropdown(false);
                                setIsApiKeyModalOpen(true);
                              }}
                              className="underline cursor-pointer"
                              style={{ color: theme.accentColor }}
                            >
                              Setup Key
                            </button>
                          )}
                        </div>
                        {group.map((m) => {
                          const isSelected =
                            selectedChoice.provider === m.provider &&
                            selectedChoice.modelId === m.modelId;
                          return (
                            <button
                              key={m.key}
                              type="button"
                              onClick={() => {
                                setSelectedChoice({
                                  provider: m.provider,
                                  modelId: m.modelId,
                                  baseUrl: m.baseUrl,
                                });
                                setShowModelDropdown(false);
                              }}
                              className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 text-left cursor-pointer transition-colors"
                              style={{
                                backgroundColor: isSelected
                                  ? `${theme.secondaryAccentColor}20`
                                  : "transparent",
                                color: primaryText,
                              }}
                            >
                              <span className="truncate font-medium">{m.label}</span>
                              {isSelected && (
                                <Check
                                  className="h-3.5 w-3.5 shrink-0"
                                  style={{ color: theme.secondaryAccentColor }}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Gemini Live Voice Controls: Transcribe Live & Live Translate */}
            <div
              className="flex items-center gap-1 rounded-full border px-1.5 py-0.5"
              style={{
                borderColor: isListening ? theme.accentColor : borderCol,
                backgroundColor: isLight ? "#F8FAFC" : "#212121",
              }}
            >
              <select
                value={voiceMode}
                disabled={isListening || voiceConnecting}
                onChange={(e) => setVoiceMode(e.target.value as "transcribe" | "translate")}
                className="bg-transparent text-[11px] font-medium focus:outline-none cursor-pointer px-1 disabled:opacity-60"
                style={{
                  colorScheme: isLight ? "light" : "dark",
                  color: primaryText,
                }}
                title="Choose Gemini 3.5 Live Voice Model"
              >
                <option value="transcribe" style={{ backgroundColor: composerBg, color: primaryText }}>
                  Transcribe Live
                </option>
                <option value="translate" style={{ backgroundColor: composerBg, color: primaryText }}>
                  Live Translate
                </option>
              </select>

              {voiceMode === "translate" && (
                <>
                  <Languages className="h-3 w-3 shrink-0 opacity-75" style={{ color: theme.secondaryAccentColor }} />
                  <select
                    value={voiceTargetLang}
                    disabled={isListening || voiceConnecting}
                    onChange={(e) => setVoiceTargetLang(e.target.value)}
                    className="bg-transparent text-[11px] font-medium focus:outline-none cursor-pointer pr-1 disabled:opacity-60"
                    style={{
                      colorScheme: isLight ? "light" : "dark",
                      color: primaryText,
                    }}
                    title="Target Translation Language"
                  >
                    <option value="en" style={{ backgroundColor: composerBg, color: primaryText }}>EN</option>
                    <option value="ur" style={{ backgroundColor: composerBg, color: primaryText }}>UR</option>
                    <option value="hi" style={{ backgroundColor: composerBg, color: primaryText }}>HI</option>
                    <option value="ar" style={{ backgroundColor: composerBg, color: primaryText }}>AR</option>
                    <option value="es" style={{ backgroundColor: composerBg, color: primaryText }}>ES</option>
                    <option value="fr" style={{ backgroundColor: composerBg, color: primaryText }}>FR</option>
                    <option value="de" style={{ backgroundColor: composerBg, color: primaryText }}>DE</option>
                    <option value="tr" style={{ backgroundColor: composerBg, color: primaryText }}>TR</option>
                    <option value="pt" style={{ backgroundColor: composerBg, color: primaryText }}>PT</option>
                    <option value="zh" style={{ backgroundColor: composerBg, color: primaryText }}>ZH</option>
                    <option value="ja" style={{ backgroundColor: composerBg, color: primaryText }}>JA</option>
                    <option value="ko" style={{ backgroundColor: composerBg, color: primaryText }}>KO</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setVoiceSpeakerEnabled((v) => !v)}
                    className="p-1 rounded-full cursor-pointer opacity-80 hover:opacity-100"
                    style={{ color: voiceSpeakerEnabled ? theme.secondaryAccentColor : mutedText }}
                    title={voiceSpeakerEnabled ? "Translated audio playback ON" : "Translated audio playback muted (text only)"}
                  >
                    {voiceSpeakerEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => void handleToggleVoice()}
                className="h-7 w-7 rounded-full flex items-center justify-center cursor-pointer transition-colors"
                style={{
                  backgroundColor: isListening ? theme.accentColor : "transparent",
                  color: isListening ? "#FFFFFF" : voiceConnecting ? theme.accentColor : mutedText,
                }}
                title={
                  isListening
                    ? "Stop Gemini Live Voice"
                    : voiceMode === "translate"
                    ? "Start Gemini 3.5 Live Translate"
                    : "Start Gemini 3.5 Transcribe Live"
                }
              >
                {voiceConnecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isListening ? (
                  <MicOff className="h-3.5 w-3.5" />
                ) : (
                  <Mic className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {isSending ? (
              <button
                type="button"
                onClick={handleStopGenerating}
                className="h-8 w-8 rounded-full flex items-center justify-center text-white cursor-pointer transition-transform active:scale-95"
                style={{ backgroundColor: theme.accentColor }}
                title="Stop generating"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={
                  !promptInput.trim() &&
                  attachedImages.length === 0 &&
                  attachedDriveImages.length === 0 &&
                  !attachedFileText
                }
                className="h-8 w-8 rounded-full flex items-center justify-center text-white cursor-pointer disabled:opacity-40 transition-transform active:scale-95"
                style={{ backgroundColor: theme.secondaryAccentColor }}
                title="Send message"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </form>
    );
  }
};
