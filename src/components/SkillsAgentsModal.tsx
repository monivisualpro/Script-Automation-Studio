import React, { useState, useRef } from "react";
import { AgentSkillItem } from "../lib/agentSkills";
import { getThemeConfig } from "../lib/themeConfig";
import { useAuth } from "../context/AuthContext";
import {
  X,
  Bot,
  Sparkles,
  Plus,
  Download,
  Check,
  Trash2,
  Upload,
  Power,
} from "lucide-react";

interface SkillsAgentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: AgentSkillItem[];
  activeAgentId: string | null;
  onSelectAgent: (agentId: string | null) => void;
  onToggleSkill: (id: string) => void;
  onInstallItem: (id: string) => void;
  onUninstallItem: (id: string) => void;
  onAddCustomItem: (item: AgentSkillItem) => void;
}

export const SkillsAgentsModal: React.FC<SkillsAgentsModalProps> = ({
  isOpen,
  onClose,
  items,
  activeAgentId,
  onSelectAgent,
  onToggleSkill,
  onInstallItem,
  onUninstallItem,
  onAddCustomItem,
}) => {
  const { currentTheme, currentBrand } = useAuth();
  const theme = getThemeConfig(currentTheme, currentBrand);
  const isLight = theme.isLight;

  const [tab, setTab] = useState<"installed" | "catalog" | "custom">("installed");
  const [customName, setCustomName] = useState("");
  const [customKind, setCustomKind] = useState<"agent" | "skill">("agent");
  const [customSummary, setCustomSummary] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const bgSurface = isLight ? "#FFFFFF" : "#1F1F1F";
  const subtleSurface = isLight ? "#F7F7F8" : "#171717";
  const borderCol = isLight ? "#E5E5E7" : "#303030";
  const primaryText = isLight ? "#0D0D0D" : "#ECECEC";
  const mutedText = isLight ? "#52525B" : "#A1A1AA";

  const installedItems = items.filter((it) => it.installed);
  const catalogItems = items.filter((it) => !it.installed);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError(null);
    try {
      const raw = await file.text();
      if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(raw);
        if (!parsed?.name || !parsed?.instructions) {
          throw new Error("JSON skill file must contain 'name' and 'instructions' fields.");
        }
        setCustomName(String(parsed.name).slice(0, 80));
        setCustomKind(parsed.kind === "skill" ? "skill" : "agent");
        setCustomSummary(String(parsed.summary || "Custom imported instruction pack").slice(0, 160));
        setCustomInstructions(String(parsed.instructions));
      } else {
        // Parse markdown SKILL.md / .txt cleanly (extract YAML frontmatter if present)
        let title = file.name.replace(/\.(md|txt)$/i, "").replace(/[-_]+/g, " ");
        let desc = "Imported skill instructions";
        let body = raw.trim();

        const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
        if (fmMatch) {
          const fm = fmMatch[1];
          body = fmMatch[2].trim();
          const nameLine = fm.match(/^name:\s*["']?(.+?)["']?$/m);
          const descLine = fm.match(/^description:\s*["']?(.+?)["']?$/m);
          if (nameLine?.[1]) title = nameLine[1].trim();
          if (descLine?.[1]) desc = descLine[1].trim();
        }
        setCustomName(title.slice(0, 80));
        setCustomSummary(desc.slice(0, 160));
        setCustomInstructions(body);
      }
    } catch (err: any) {
      setImportError(err?.message || "Could not read skill file.");
    }
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customInstructions.trim()) {
      setImportError("Please provide both a Name and Instructions.");
      return;
    }
    const created: AgentSkillItem = {
      id: `custom-${customKind}-${Date.now()}`,
      name: customName.trim(),
      kind: customKind,
      summary: customSummary.trim() || `Custom ${customKind} for detailed generation`,
      instructions: customInstructions.trim(),
      builtIn: false,
      installed: true,
      enabled: true,
    };
    onAddCustomItem(created);
    if (created.kind === "agent") {
      onSelectAgent(created.id);
    }
    setCustomName("");
    setCustomSummary("");
    setCustomInstructions("");
    setImportError(null);
    setTab("installed");
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm ${
        isLight ? "bg-black/35" : "bg-black/75"
      }`}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        style={{ backgroundColor: bgSurface, borderColor: borderCol, color: primaryText }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between gap-3"
          style={{ borderColor: borderCol }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-2xl border"
              style={{ backgroundColor: subtleSurface, borderColor: borderCol }}
            >
              <Bot className="h-5 w-5" style={{ color: theme.secondaryAccentColor }} />
            </div>
            <div>
              <h3 className="text-base font-extrabold">Skills &amp; Agents</h3>
              <p className="text-xs" style={{ color: mutedText }}>
                Install specialized agents and prompt skills for detailed ChatGPT, Claude &amp; Gemini grade prompts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border cursor-pointer"
            style={{ backgroundColor: subtleSurface, borderColor: borderCol, color: primaryText }}
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className="px-6 py-2.5 border-b flex items-center gap-2"
          style={{ backgroundColor: subtleSurface, borderColor: borderCol }}
        >
          <button
            type="button"
            onClick={() => setTab("installed")}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            style={{
              backgroundColor: tab === "installed" ? theme.secondaryAccentColor : "transparent",
              color: tab === "installed" ? "#FFFFFF" : mutedText,
            }}
          >
            Installed ({installedItems.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("catalog")}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            style={{
              backgroundColor: tab === "catalog" ? theme.secondaryAccentColor : "transparent",
              color: tab === "catalog" ? "#FFFFFF" : mutedText,
            }}
          >
            Install Skills Catalog ({catalogItems.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("custom")}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            style={{
              backgroundColor: tab === "custom" ? theme.accentColor : "transparent",
              color: tab === "custom" ? "#FFFFFF" : mutedText,
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Install Custom Skill / Agent</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {tab === "installed" && (
            <div className="space-y-3">
              {installedItems.map((item) => {
                const isActiveAgent = item.kind === "agent" && activeAgentId === item.id;
                const isActiveSkill = item.kind === "skill" && item.enabled;
                const highlighted = isActiveAgent || isActiveSkill;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    style={{
                      backgroundColor: subtleSurface,
                      borderColor: highlighted ? theme.secondaryAccentColor : borderCol,
                    }}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        {item.kind === "agent" ? (
                          <Bot className="h-3.5 w-3.5 shrink-0" style={{ color: theme.accentColor }} />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: theme.secondaryAccentColor }} />
                        )}
                        <span className="font-bold text-sm truncate">{item.name}</span>
                        <span className="text-[11px] font-mono" style={{ color: mutedText }}>
                          · {item.kind === "agent" ? "Agent" : "Modular Skill"}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: mutedText }}>
                        {item.summary}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.kind === "agent" ? (
                        <button
                          type="button"
                          onClick={() => onSelectAgent(isActiveAgent ? null : item.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border flex items-center gap-1.5"
                          style={{
                            backgroundColor: isActiveAgent ? theme.secondaryAccentColor : "transparent",
                            borderColor: isActiveAgent ? theme.secondaryAccentColor : borderCol,
                            color: isActiveAgent ? "#FFFFFF" : primaryText,
                          }}
                        >
                          {isActiveAgent ? <Check className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                          <span>{isActiveAgent ? "Active Agent" : "Use Agent"}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onToggleSkill(item.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border flex items-center gap-1.5"
                          style={{
                            backgroundColor: isActiveSkill ? theme.secondaryAccentColor : "transparent",
                            borderColor: isActiveSkill ? theme.secondaryAccentColor : borderCol,
                            color: isActiveSkill ? "#FFFFFF" : primaryText,
                          }}
                        >
                          {isActiveSkill ? <Check className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                          <span>{isActiveSkill ? "Skill Enabled" : "Enable Skill"}</span>
                        </button>
                      )}

                      {!item.builtIn && (
                        <button
                          type="button"
                          onClick={() => onUninstallItem(item.id)}
                          className="p-1.5 rounded-xl border cursor-pointer hover:opacity-80"
                          style={{ borderColor: borderCol, color: mutedText }}
                          title="Uninstall"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "catalog" && (
            <div className="space-y-3">
              {catalogItems.length === 0 ? (
                <div
                  className="p-6 rounded-2xl border border-dashed text-center text-xs"
                  style={{ borderColor: borderCol, color: mutedText }}
                >
                  All catalog Skills &amp; Agents are installed! Use <strong>Install Custom Skill / Agent</strong> to add or import your own.
                </div>
              ) : (
                catalogItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    style={{ backgroundColor: subtleSurface, borderColor: borderCol }}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        {item.kind === "agent" ? (
                          <Bot className="h-3.5 w-3.5 shrink-0" style={{ color: theme.accentColor }} />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: theme.secondaryAccentColor }} />
                        )}
                        <span className="font-bold text-sm truncate">{item.name}</span>
                        <span className="text-[11px] font-mono" style={{ color: mutedText }}>
                          · {item.kind === "agent" ? "Agent" : "Modular Skill"}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: mutedText }}>
                        {item.summary}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onInstallItem(item.id);
                        if (item.kind === "agent") onSelectAgent(item.id);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shrink-0"
                      style={{ backgroundColor: theme.secondaryAccentColor }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Install</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "custom" && (
            <form onSubmit={handleCreateCustom} className="space-y-3.5 text-xs">
              <input
                ref={fileRef}
                type="file"
                accept=".md,.txt,.json"
                className="hidden"
                onChange={handleImportFile}
              />

              <div
                className="p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-2"
                style={{ backgroundColor: subtleSurface, borderColor: borderCol }}
              >
                <div>
                  <div className="font-bold">Import SKILL.md, .txt, or .json Skill Pack</div>
                  <div className="text-[11px]" style={{ color: mutedText }}>
                    Auto-fills name, description, and instructions from your local skill file.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 cursor-pointer"
                  style={{ borderColor: borderCol, color: primaryText }}
                >
                  <Upload className="h-3.5 w-3.5" style={{ color: theme.secondaryAccentColor }} />
                  <span>Import File</span>
                </button>
              </div>

              {importError && (
                <div
                  className="p-2.5 rounded-xl border text-xs font-mono"
                  style={{
                    borderColor: theme.accentColor,
                    backgroundColor: `${theme.accentColor}15`,
                  }}
                >
                  {importError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold block" style={{ color: mutedText }}>
                    Name:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cinematic Documentary Director"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-xs focus:outline-none"
                    style={{
                      backgroundColor: subtleSurface,
                      borderColor: borderCol,
                      color: primaryText,
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold block" style={{ color: mutedText }}>
                    Type:
                  </label>
                  <select
                    value={customKind}
                    onChange={(e) => setCustomKind(e.target.value as "agent" | "skill")}
                    className="w-full rounded-xl border px-3 py-2 text-xs focus:outline-none"
                    style={{
                      backgroundColor: subtleSurface,
                      borderColor: borderCol,
                      color: primaryText,
                    }}
                  >
                    <option value="agent">Agent (Primary Persona)</option>
                    <option value="skill">Skill (Stackable Rule)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block" style={{ color: mutedText }}>
                  Short Description:
                </label>
                <input
                  type="text"
                  placeholder="What does this agent or skill specialize in?"
                  value={customSummary}
                  onChange={(e) => setCustomSummary(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-xs focus:outline-none"
                  style={{
                    backgroundColor: subtleSurface,
                    borderColor: borderCol,
                    color: primaryText,
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold block" style={{ color: mutedText }}>
                  Agent / Skill Instructions:
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Write detailed role, rules, prompt formatting, tone, and constraints..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-xs font-mono focus:outline-none resize-y"
                  style={{
                    backgroundColor: subtleSurface,
                    borderColor: borderCol,
                    color: primaryText,
                  }}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-bold text-white cursor-pointer"
                style={{ backgroundColor: theme.accentColor }}
              >
                Install &amp; Activate
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
