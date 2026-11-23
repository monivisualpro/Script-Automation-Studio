import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { LOCAL_ENGINE_CONFIG_PATH, LOCAL_ENGINE_ROOT, ensureLocalEngineDirs } from "./localEngine.js";

export interface LinkedSkillItem {
  id: string;
  name: string;
  kind: "agent" | "skill";
  summary: string;
  instructions: string;
  builtIn: false;
  installed: true;
  enabled: boolean;
  sourceType: "linked-folder";
  sourceFolder: string;
  sourceFilePath: string;
  fileName: string;
}

export interface DetectedFolderPreset {
  id: string;
  label: string;
  toolName: string;
  path: string;
  linked: boolean;
}

export interface LinkedFolderInfo {
  path: string;
  exists: boolean;
  skillCount: number;
}

export interface LocalSkillsStatusResponse {
  linkedFolders: LinkedFolderInfo[];
  detectedPresets: DetectedFolderPreset[];
  skills: LinkedSkillItem[];
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  ".cache",
  "__pycache__",
  ".venv",
  "venv",
]);

const SKIP_FILENAMES = new Set([
  "readme.md",
  "changelog.md",
  "license.md",
  "contributing.md",
  "code_of_conduct.md",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
]);

const MAX_SKILL_FILE_BYTES = 80 * 1024;
const MAX_TOTAL_LINKED_SKILLS = 120;

interface LocalEngineDiskConfig {
  customModelsDir?: string | null;
  linkedSkillFolders?: string[];
  [key: string]: any;
}

function readDiskConfig(): LocalEngineDiskConfig {
  try {
    if (!fs.existsSync(LOCAL_ENGINE_CONFIG_PATH)) return {};
    const parsed = JSON.parse(fs.readFileSync(LOCAL_ENGINE_CONFIG_PATH, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeDiskConfig(config: LocalEngineDiskConfig): void {
  ensureLocalEngineDirs();
  fs.writeFileSync(LOCAL_ENGINE_CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

export function resolveLocalSkillDirectoryInput(rawDir: string): string {
  let cleaned = (rawDir || "").trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  if (!cleaned) return "";

  // Support Windows %VAR% expansion when users paste Windows paths like %USERPROFILE%\.claude\skills
  cleaned = cleaned.replace(/%([^%]+)%/g, (full, varName) => process.env[varName] || full);

  if (cleaned === "~") {
    return os.homedir();
  }
  if (cleaned.startsWith("~/") || cleaned.startsWith("~\\")) {
    return path.resolve(os.homedir(), cleaned.slice(2));
  }
  return path.resolve(cleaned);
}

export function getLinkedSkillFolders(): string[] {
  const cfg = readDiskConfig();
  const raw = Array.isArray(cfg.linkedSkillFolders) ? cfg.linkedSkillFolders : [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !item.trim()) continue;
    const resolved = resolveLocalSkillDirectoryInput(item);
    const key = process.platform === "win32" ? resolved.toLowerCase() : resolved;
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(resolved);
    }
  }
  return normalized;
}

export function getSuggestedSkillFolders(): DetectedFolderPreset[] {
  const home = os.homedir();
  const cwd = process.cwd();
  const linkedSet = new Set(
    getLinkedSkillFolders().map((p) => (process.platform === "win32" ? p.toLowerCase() : p))
  );

  const candidates: Array<{ id: string; label: string; toolName: string; dir: string }> = [
    { id: "claude-skills", label: "Claude Skills (~/.claude/skills)", toolName: "Claude", dir: path.join(home, ".claude", "skills") },
    { id: "claude-commands", label: "Claude Commands (~/.claude/commands)", toolName: "Claude", dir: path.join(home, ".claude", "commands") },
    { id: "agents-skills", label: "Agent Skills (~/.agents/skills)", toolName: "Agents", dir: path.join(home, ".agents", "skills") },
    { id: "codex-skills", label: "Codex Skills (~/.codex/skills)", toolName: "Codex", dir: path.join(home, ".codex", "skills") },
    { id: "vscode-skills", label: "VS Code Skills (~/.vscode/skills)", toolName: "VS Code", dir: path.join(home, ".vscode", "skills") },
    { id: "vscode-prompts", label: "VS Code Copilot Prompts (~/.vscode/prompts)", toolName: "VS Code", dir: path.join(home, ".vscode", "prompts") },
    { id: "cursor-rules", label: "Cursor Rules (~/.cursor/rules)", toolName: "Cursor", dir: path.join(home, ".cursor", "rules") },
    { id: "cursor-skills", label: "Cursor Skills (~/.cursor/skills)", toolName: "Cursor", dir: path.join(home, ".cursor", "skills") },
    { id: "windsurf-memories", label: "Windsurf Memories (~/.codeium/windsurf/memories)", toolName: "Windsurf", dir: path.join(home, ".codeium", "windsurf", "memories") },
    { id: "bionic-docs", label: "Bionic Skills (Documents/Bionic/skills)", toolName: "Bionic", dir: path.join(home, "Documents", "Bionic", "skills") },
    { id: "bionic-home", label: "Bionic Skills (~/.bionic/skills)", toolName: "Bionic", dir: path.join(home, ".bionic", "skills") },
    { id: "bionic-alt", label: "Bionic Skills (~/bionic/skills)", toolName: "Bionic", dir: path.join(home, "bionic", "skills") },
    { id: "local-engine-skills", label: "App Local Skills (local-engine/skills)", toolName: "Local", dir: path.join(LOCAL_ENGINE_ROOT, "skills") },
    { id: "project-claude-skills", label: "Workspace Claude Skills (.claude/skills)", toolName: "Workspace", dir: path.join(cwd, ".claude", "skills") },
    { id: "project-github-instructions", label: "VS Code Instructions (.github/instructions)", toolName: "VS Code", dir: path.join(cwd, ".github", "instructions") },
  ];

  const seenPaths = new Set<string>();
  const detected: DetectedFolderPreset[] = [];

  for (const cand of candidates) {
    const resolved = path.resolve(cand.dir);
    const key = process.platform === "win32" ? resolved.toLowerCase() : resolved;
    if (seenPaths.has(key)) continue;
    try {
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        seenPaths.add(key);
        detected.push({
          id: cand.id,
          label: cand.label,
          toolName: cand.toolName,
          path: resolved,
          linked: linkedSet.has(key),
        });
      }
    } catch {
      // Ignore unreadable system dirs
    }
  }

  return detected;
}

function isSupportedSkillFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  if (SKIP_FILENAMES.has(lower)) return false;
  return (
    lower.endsWith(".md") ||
    lower.endsWith(".mdc") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".json")
  );
}

function collectSkillFiles(baseDir: string, depth = 0, maxDepth = 4): string[] {
  if (depth > maxDepth || !fs.existsSync(baseDir)) return [];
  const results: string[] = [];
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(baseDir, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name.toLowerCase())) continue;
    const fullPath = path.join(baseDir, entry.name);
    if (entry.isFile()) {
      if (isSupportedSkillFile(entry.name)) {
        results.push(fullPath);
      }
    } else if (entry.isDirectory()) {
      results.push(...collectSkillFiles(fullPath, depth + 1, maxDepth));
    }
  }
  return results;
}

function formatReadableName(rawName: string): string {
  return rawName
    .replace(/\.(skill|agent|instructions)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function parseSkillFile(filePath: string, rootFolder: string): LinkedSkillItem | null {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size === 0) return null;

    let raw = fs.readFileSync(filePath, "utf8");
    if (raw.length > MAX_SKILL_FILE_BYTES) {
      raw = raw.slice(0, MAX_SKILL_FILE_BYTES);
    }
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const ext = path.extname(filePath).toLowerCase();
    const baseName = path.basename(filePath, ext);
    const parentDirName = path.basename(path.dirname(filePath));
    const isStandardSkillMd = /^skill$/i.test(baseName);

    let name = isStandardSkillMd && parentDirName
      ? formatReadableName(parentDirName)
      : formatReadableName(baseName);
    let kind: "agent" | "skill" =
      /agent/i.test(baseName) || /agents?/i.test(path.basename(rootFolder)) ? "agent" : "skill";
    let summary = `Synced from ${path.basename(rootFolder)}`;
    let instructions = trimmed;

    if (ext === ".json") {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object") {
          const instr = parsed.instructions || parsed.systemPrompt || parsed.prompt || parsed.content;
          if (typeof instr !== "string" || !instr.trim()) return null;
          if (typeof parsed.name === "string" && parsed.name.trim()) {
            name = parsed.name.trim().slice(0, 80);
          }
          if (parsed.kind === "agent" || parsed.type === "agent") {
            kind = "agent";
          } else if (parsed.kind === "skill" || parsed.type === "skill") {
            kind = "skill";
          }
          if (typeof (parsed.summary || parsed.description) === "string") {
            summary = String(parsed.summary || parsed.description).trim().slice(0, 180);
          }
          instructions = instr.trim();
        }
      } catch {
        return null;
      }
    } else {
      // Parse YAML frontmatter if present (Claude SKILL.md, Cursor .mdc, VS Code .instructions.md)
      const fmMatch = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
      if (fmMatch) {
        const fm = fmMatch[1];
        const body = fmMatch[2].trim();
        if (body) instructions = body;

        const nameLine = fm.match(/^name:\s*["']?(.+?)["']?\s*$/m);
        const titleLine = fm.match(/^title:\s*["']?(.+?)["']?\s*$/m);
        const descLine = fm.match(/^(?:description|summary):\s*["']?(.+?)["']?\s*$/m);
        const kindLine = fm.match(/^(?:kind|type|role):\s*["']?(.+?)["']?\s*$/m);

        if (nameLine?.[1]) name = nameLine[1].trim().slice(0, 80);
        else if (titleLine?.[1]) name = titleLine[1].trim().slice(0, 80);

        if (descLine?.[1]) summary = descLine[1].trim().slice(0, 180);

        if (kindLine?.[1]) {
          if (/agent|persona|assistant/i.test(kindLine[1])) kind = "agent";
          else if (/skill|rule|instruction|command/i.test(kindLine[1])) kind = "skill";
        }
      } else {
        // Check first markdown heading for cleaner title/summary
        const h1Match = trimmed.match(/^#\s+(.+)$/m);
        if (h1Match?.[1] && !isStandardSkillMd) {
          name = h1Match[1].trim().slice(0, 80);
        }
        const firstLine = trimmed
          .split(/\r?\n/)
          .map((l) => l.replace(/^#+\s*/, "").trim())
          .find((l) => l.length > 10);
        if (firstLine) {
          summary = firstLine.slice(0, 160);
        }
      }
    }

    const hash = crypto
      .createHash("sha1")
      .update(process.platform === "win32" ? filePath.toLowerCase() : filePath)
      .digest("hex")
      .slice(0, 12);

    return {
      id: `linked-${kind}-${hash}`,
      name: name || "Local Skill",
      kind,
      summary,
      instructions: instructions.slice(0, 24000),
      builtIn: false,
      installed: true,
      enabled: false,
      sourceType: "linked-folder",
      sourceFolder: rootFolder,
      sourceFilePath: filePath,
      fileName: path.relative(rootFolder, filePath) || path.basename(filePath),
    };
  } catch {
    return null;
  }
}

export function scanLinkedSkillFolders(): LocalSkillsStatusResponse {
  const folders = getLinkedSkillFolders();
  const linkedFolders: LinkedFolderInfo[] = [];
  const skills: LinkedSkillItem[] = [];
  const seenSkillIds = new Set<string>();

  for (const folder of folders) {
    let exists = false;
    try {
      exists = fs.existsSync(folder) && fs.statSync(folder).isDirectory();
    } catch {
      exists = false;
    }

    if (!exists) {
      linkedFolders.push({ path: folder, exists: false, skillCount: 0 });
      continue;
    }

    const files = collectSkillFiles(folder);
    let folderCount = 0;

    for (const filePath of files) {
      if (skills.length >= MAX_TOTAL_LINKED_SKILLS) break;
      const parsed = parseSkillFile(filePath, folder);
      if (!parsed || seenSkillIds.has(parsed.id)) continue;
      seenSkillIds.add(parsed.id);
      skills.push(parsed);
      folderCount++;
    }

    linkedFolders.push({ path: folder, exists: true, skillCount: folderCount });
  }

  return {
    linkedFolders,
    detectedPresets: getSuggestedSkillFolders(),
    skills,
  };
}

export function addLinkedSkillFolder(rawDirPath: string): LocalSkillsStatusResponse {
  const resolved = resolveLocalSkillDirectoryInput(rawDirPath);
  if (!resolved || !fs.existsSync(resolved)) {
    throw new Error(`Folder does not exist: "${resolved || rawDirPath}". Please check the path and try again.`);
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(resolved);
  } catch (err: any) {
    throw new Error(`Unable to read folder "${resolved}": ${err?.message || "access denied"}`);
  }

  if (!stat.isDirectory()) {
    throw new Error(`"${resolved}" is a file, not a folder. Please paste the skills folder path.`);
  }

  const existing = getLinkedSkillFolders();
  const targetKey = process.platform === "win32" ? resolved.toLowerCase() : resolved;
  const alreadyLinked = existing.some(
    (p) => (process.platform === "win32" ? p.toLowerCase() : p) === targetKey
  );

  if (!alreadyLinked) {
    const cfg = readDiskConfig();
    cfg.linkedSkillFolders = [...existing, resolved];
    writeDiskConfig(cfg);
  }

  return scanLinkedSkillFolders();
}

export function removeLinkedSkillFolder(rawDirPath: string): LocalSkillsStatusResponse {
  const resolved = resolveLocalSkillDirectoryInput(rawDirPath);
  const targetKey = process.platform === "win32" ? resolved.toLowerCase() : resolved;
  const existing = getLinkedSkillFolders();
  const next = existing.filter(
    (p) => (process.platform === "win32" ? p.toLowerCase() : p) !== targetKey
  );

  const cfg = readDiskConfig();
  cfg.linkedSkillFolders = next;
  writeDiskConfig(cfg);

  return scanLinkedSkillFolders();
}
