import fs from "fs";
import os from "os";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import { Readable } from "stream";
import { validateSafeExternalUrl } from "./urlValidator.js";

export const LOCAL_ENGINE_ROOT = path.resolve(process.cwd(), "local-engine");
export const LOCAL_ENGINE_BIN_DIR = path.resolve(LOCAL_ENGINE_ROOT, "bin");
export const LOCAL_ENGINE_MODELS_DIR = path.resolve(LOCAL_ENGINE_ROOT, "models");
export const LOCAL_ENGINE_CONFIG_PATH = path.resolve(LOCAL_ENGINE_ROOT, "config.json");

export type ComputeMode = "gpu" | "cpu";

export interface DetectedModelFile {
  fileName: string;
  relativePath: string;
  sizeBytes: number;
  sizeFormatted: string;
}

export interface EngineDownloadItem {
  id: string;
  label: string;
  description: string;
  url: string;
  recommendedFor: string;
}

export interface QwenModelCatalogItem {
  id: string;
  name: string;
  fileName: string;
  sizeLabel: string;
  ramRequirement: string;
  url: string;
  description: string;
}

export interface DownloadProgressState {
  active: boolean;
  fileName: string;
  downloadedBytes: number;
  totalBytes: number;
  percent: number;
  error: string | null;
  completedFile: string | null;
}

export type StartupPhase =
  | "idle"
  | "spawning"
  | "loading_model"
  | "creating_context"
  | "warming_up"
  | "ready"
  | "error";

export interface EngineStartupProgress {
  phase: StartupPhase;
  percent: number;
  stageLabel: string;
  latestLog: string | null;
}

export interface LocalEngineStatus {
  rootDir: string;
  binDir: string;
  modelsDir: string;
  defaultModelsDir: string;
  customModelsDir: string | null;
  binaryFound: boolean;
  binaryPath: string | null;
  binaryName: string | null;
  models: DetectedModelFile[];
  processState: "stopped" | "starting" | "running" | "error";
  activePort: number;
  activeBaseUrl: string;
  activeModel: string | null;
  activeModelRelativePath: string | null;
  computeMode: ComputeMode;
  gpuLayers: number;
  contextSize: number;
  lastError: string | null;
  startupProgress: EngineStartupProgress;
  logs: string[];
  download: DownloadProgressState;
  engineDownloads: EngineDownloadItem[];
  qwenCatalog: QwenModelCatalogItem[];
}

export const ENGINE_DOWNLOADS: EngineDownloadItem[] = [
  {
    id: "win-vulkan-b12202",
    label: "llama-b12202-bin-win-vulkan-x64.zip",
    description: "Windows 64-bit Vulkan Engine (works on NVIDIA, AMD & Intel GPUs + CPU fallback).",
    url: "https://github.com/ggml-org/llama.cpp/releases/download/b12202/llama-b12202-bin-win-vulkan-x64.zip",
    recommendedFor: "Windows GPU & CPU",
  },
  {
    id: "llama-cpp-all-releases",
    label: "All llama.cpp Releases (macOS / Linux / CPU AVX2)",
    description: "Choose Apple Silicon (arm64), Linux Ubuntu Vulkan/CPU, or Windows CPU-only ZIP/tarballs.",
    url: "https://github.com/ggml-org/llama.cpp/releases",
    recommendedFor: "macOS / Linux / Other",
  },
];

export const QWEN_MODEL_CATALOG: QwenModelCatalogItem[] = [
  {
    id: "qwen2.5-3b-q4km",
    name: "Qwen 2.5 3B Instruct (Q4_K_M)",
    fileName: "qwen2.5-3b-instruct-q4_k_m.gguf",
    sizeLabel: "~2.1 GB",
    ramRequirement: "4+ GB VRAM / RAM (Fastest CPU & Laptop GPU)",
    url: "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf",
    description: "Ultra-fast lightweight Qwen model for CPU or entry-level GPUs.",
  },
  {
    id: "qwen3-4b-q4km",
    name: "Qwen 3 4B (Q4_K_M)",
    fileName: "Qwen3-4B-Q4_K_M.gguf",
    sizeLabel: "~2.5 GB",
    ramRequirement: "4-6 GB VRAM / RAM",
    url: "https://huggingface.co/Qwen/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q4_K_M.gguf",
    description: "Modern Qwen 3 reasoning & scriptwriting quality in a compact footprint.",
  },
  {
    id: "qwen2.5-7b-q4km",
    name: "Qwen 2.5 7B Instruct (Q4_K_M)",
    fileName: "Qwen2.5-7B-Instruct-Q4_K_M.gguf",
    sizeLabel: "~4.7 GB",
    ramRequirement: "6-8 GB VRAM / 12+ GB RAM (Recommended)",
    url: "https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf",
    description: "Best balance of creativity, Urdu/English fluency, and JSON reliability.",
  },
  {
    id: "qwen3-8b-q4km",
    name: "Qwen 3 8B (Q4_K_M)",
    fileName: "Qwen3-8B-Q4_K_M.gguf",
    sizeLabel: "~5.0 GB",
    ramRequirement: "8+ GB VRAM / 16 GB RAM",
    url: "https://huggingface.co/Qwen/Qwen3-8B-GGUF/resolve/main/Qwen3-8B-Q4_K_M.gguf",
    description: "Flagship 8B Qwen 3 model for high-retention storytelling and SEO prompts.",
  },
];

let engineProcess: ChildProcess | null = null;
let processState: "stopped" | "starting" | "running" | "error" = "stopped";
let activePort = 1279;
let activeModel: string | null = null;
let activeModelRelativePath: string | null = null;
let activeComputeMode: ComputeMode = "gpu";
let activeGpuLayers = 99;
let activeContextSize = 8192;
let lastError: string | null = null;
let logBuffer: string[] = [];
let startupProgress: EngineStartupProgress = {
  phase: "idle",
  percent: 0,
  stageLabel: "Engine stopped",
  latestLog: null,
};

let activeDownloadAbort: AbortController | null = null;
let downloadState: DownloadProgressState = {
  active: false,
  fileName: "",
  downloadedBytes: 0,
  totalBytes: 0,
  percent: 0,
  error: null,
  completedFile: null,
};

function updateProgressAtLeast(phase: StartupPhase, minPercent: number, stageLabel: string): void {
  if (processState === "error" || processState === "stopped") return;
  startupProgress = {
    phase,
    percent: Math.max(startupProgress.percent, Math.min(99, minPercent)),
    stageLabel,
    latestLog: startupProgress.latestLog,
  };
}

function inspectLogForProgressAndErrors(cleaned: string): void {
  // Detect common llama-server runtime errors early for clear UI diagnostics
  if (/out of memory|failed to allocate|vk::OutOfDeviceMemory|CUDA error.*out of memory|not enough memory|unable to allocate buffer/i.test(cleaned)) {
    lastError =
      "Out of GPU VRAM or system RAM while loading the model. Switch to 'CPU Only (-ngl 0)', lower Context Size to 4096, or choose a smaller Q4_K_M model.";
  } else if (/invalid magic|failed to load model|unknown model architecture|gguf_init_from_file.*failed|not a valid gguf/i.test(cleaned)) {
    lastError =
      "Failed to parse GGUF model file (it may be incomplete, corrupted, or unsupported). Try re-downloading the .gguf file.";
  } else if (/address already in use|EADDRINUSE|bind.*failed|unable to bind/i.test(cleaned)) {
    lastError = `Port ${activePort} is already in use by another process. Close conflicting apps or stop the previous engine first.`;
  } else if (/cannot open shared object|error while loading shared libraries|0xc0000135|The code execution cannot proceed because/i.test(cleaned)) {
    lastError =
      "Missing runtime DLL/shared library alongside llama-server. Ensure ALL files from the llama.cpp release archive were extracted into local-engine/bin/.";
  } else if (/failed to initialize vulkan|vulkan.*error|no vulkan devices found/i.test(cleaned)) {
    lastError =
      "Vulkan GPU backend failed to initialize. Update GPU drivers or switch Compute Mode to 'CPU Only (-ngl 0)'.";
  } else if (/^error:\s+/i.test(cleaned) || /\[ERROR\]/i.test(cleaned)) {
    if (!lastError) {
      lastError = cleaned.replace(/^\[?error\]?:?\s*/i, "");
    }
  }

  if (processState !== "starting") return;

  // Parse llama-server startup stages
  const offloadMatch = cleaned.match(/offloaded\s+(\d+)\s*\/\s*(\d+)\s+layers/i);
  if (offloadMatch) {
    const done = Number(offloadMatch[1]);
    const total = Math.max(1, Number(offloadMatch[2]));
    const pct = 35 + Math.round((done / total) * 38);
    updateProgressAtLeast(
      "loading_model",
      pct,
      `Offloading model layers (${done}/${total})...`
    );
    return;
  }

  if (/ggml_vulkan|ggml_cuda|using .* backend|found \d+ (vulkan|cuda|metal) device/i.test(cleaned)) {
    updateProgressAtLeast("spawning", 22, "Initializing GPU / compute backend...");
  } else if (/llama_model_load|llm_load_print_meta|print_info:|general\.architecture/i.test(cleaned)) {
    updateProgressAtLeast("loading_model", 32, "Reading GGUF metadata & model architecture...");
  } else if (/load_tensors:|loading model tensors|model_load/i.test(cleaned)) {
    updateProgressAtLeast("loading_model", 45, "Loading model weights into memory...");
  } else if (/llama_context:|llama_kv_cache|creating n_seq_max|kv_self|graph_reserve/i.test(cleaned)) {
    updateProgressAtLeast(
      "creating_context",
      82,
      `Allocating KV cache & ${activeContextSize}-token context...`
    );
  } else if (/server is listening|HTTP server listening|all slots are idle/i.test(cleaned)) {
    updateProgressAtLeast("warming_up", 94, "Verifying local HTTP API endpoint...");
  }
}

function appendLog(line: string): void {
  const cleaned = line.replace(/\r/g, "").trim();
  if (!cleaned) return;

  // llama.cpp prints progress dots ("....") while streaming tensors
  if (/^\.+$/.test(cleaned)) {
    if (processState === "starting") {
      const nextPct = Math.min(76, Math.max(38, startupProgress.percent + 2));
      startupProgress = {
        phase: "loading_model",
        percent: nextPct,
        stageLabel: "Loading model weights into VRAM/RAM...",
        latestLog: startupProgress.latestLog || "Streaming GGUF tensors...",
      };
    }
    return;
  }

  startupProgress.latestLog = cleaned;
  inspectLogForProgressAndErrors(cleaned);

  logBuffer.push(cleaned);
  if (logBuffer.length > 80) {
    logBuffer = logBuffer.slice(-80);
  }
}

function ingestProcessChunk(chunk: Buffer): void {
  const text = chunk.toString("utf8");
  for (const line of text.split(/\r?\n/)) {
    appendLog(line);
  }
}

export function ensureLocalEngineDirs(): void {
  try {
    fs.mkdirSync(LOCAL_ENGINE_BIN_DIR, { recursive: true });
    fs.mkdirSync(LOCAL_ENGINE_MODELS_DIR, { recursive: true });
  } catch (err) {
    console.warn("Could not initialize local-engine directories:", err);
  }
}

interface LocalEngineDiskConfig {
  customModelsDir?: string | null;
}

function readLocalEngineConfig(): LocalEngineDiskConfig {
  try {
    if (!fs.existsSync(LOCAL_ENGINE_CONFIG_PATH)) return {};
    const parsed = JSON.parse(fs.readFileSync(LOCAL_ENGINE_CONFIG_PATH, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalEngineConfig(config: LocalEngineDiskConfig): void {
  ensureLocalEngineDirs();
  fs.writeFileSync(LOCAL_ENGINE_CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

function resolveUserDirectoryInput(rawDir: string): string {
  let cleaned = (rawDir || "").trim();
  // Strip accidental quotes copied via Windows "Copy as path"
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  if (!cleaned) return "";
  if (cleaned === "~") {
    return os.homedir();
  }
  if (cleaned.startsWith("~/") || cleaned.startsWith("~\\")) {
    return path.resolve(os.homedir(), cleaned.slice(2));
  }
  return path.resolve(cleaned);
}

function isPathInsideDir(childPath: string, parentDir: string): boolean {
  const rel = path.relative(parentDir, childPath);
  return Boolean(rel) && !rel.startsWith("..") && !path.isAbsolute(rel);
}

export function getCustomModelsDir(): string | null {
  const cfg = readLocalEngineConfig();
  const candidate = (cfg.customModelsDir || process.env.LOCAL_MODELS_DIR || "").trim();
  if (!candidate) return null;
  const resolved = resolveUserDirectoryInput(candidate);
  if (resolved && fs.existsSync(resolved)) {
    try {
      if (fs.statSync(resolved).isDirectory()) {
        return resolved;
      }
    } catch {
      return null;
    }
  }
  return null;
}

export function getActiveModelsDir(): string {
  return getCustomModelsDir() || LOCAL_ENGINE_MODELS_DIR;
}

export function setCustomModelsDirectory(rawDirPath: string): LocalEngineStatus {
  const trimmed = (rawDirPath || "").trim();
  if (!trimmed) {
    const cfg = readLocalEngineConfig();
    delete cfg.customModelsDir;
    writeLocalEngineConfig(cfg);
    return getLocalEngineStatus();
  }

  const resolved = resolveUserDirectoryInput(trimmed);
  if (!resolved || !fs.existsSync(resolved)) {
    throw new Error(`Folder does not exist: "${resolved || trimmed}". Please check the path and try again.`);
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(resolved);
  } catch (err: any) {
    throw new Error(`Unable to read folder "${resolved}": ${err?.message || "access denied"}`);
  }

  if (!stat.isDirectory()) {
    throw new Error(`"${resolved}" is a file, not a folder. Please paste the folder path containing your .gguf models.`);
  }

  const cfg = readLocalEngineConfig();
  cfg.customModelsDir = resolved;
  writeLocalEngineConfig(cfg);
  return getLocalEngineStatus();
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function findFilesRecursive(
  baseDir: string,
  predicate: (fileName: string, fullPath: string) => boolean,
  maxDepth = 3,
  currentDepth = 0
): string[] {
  if (!fs.existsSync(baseDir) || currentDepth > maxDepth) return [];
  const results: string[] = [];
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(baseDir, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entry of entries) {
    const fullPath = path.join(baseDir, entry.name);
    if (entry.isFile()) {
      if (predicate(entry.name, fullPath)) {
        results.push(fullPath);
      }
    } else if (entry.isDirectory() && !entry.name.startsWith(".")) {
      results.push(...findFilesRecursive(fullPath, predicate, maxDepth, currentDepth + 1));
    }
  }
  return results;
}

export function findEngineBinary(): string | null {
  ensureLocalEngineDirs();
  const targetNames =
    process.platform === "win32"
      ? ["llama-server.exe", "server.exe"]
      : ["llama-server", "llama-cli"];

  // Search bin/ first, then root local-engine/ (excluding models/)
  const binMatches = findFilesRecursive(
    LOCAL_ENGINE_BIN_DIR,
    (name) => targetNames.includes(name.toLowerCase()),
    3
  );

  if (binMatches.length > 0) {
    // Prefer llama-server binary specifically
    const preferred = binMatches.find((p) =>
      path.basename(p).toLowerCase().startsWith("llama-server")
    );
    return preferred || binMatches[0];
  }

  // Fallback check if user extracted directly inside local-engine/
  const rootEntries = fs.existsSync(LOCAL_ENGINE_ROOT)
    ? fs.readdirSync(LOCAL_ENGINE_ROOT, { withFileTypes: true })
    : [];
  for (const entry of rootEntries) {
    if (entry.name === "models" || entry.name === "bin") continue;
    const p = path.join(LOCAL_ENGINE_ROOT, entry.name);
    if (entry.isFile() && targetNames.includes(entry.name.toLowerCase())) {
      return p;
    }
    if (entry.isDirectory()) {
      const sub = findFilesRecursive(
        p,
        (name) => targetNames.includes(name.toLowerCase()),
        2
      );
      if (sub.length > 0) return sub[0];
    }
  }

  return null;
}

export function listDetectedModels(): DetectedModelFile[] {
  ensureLocalEngineDirs();
  const activeDir = getActiveModelsDir();
  const files = findFilesRecursive(
    activeDir,
    (name) =>
      name.toLowerCase().endsWith(".gguf") &&
      !name.toLowerCase().endsWith(".part") &&
      !name.toLowerCase().endsWith(".tmp"),
    4
  );

  return files
    .map((fullPath) => {
      const stat = fs.statSync(fullPath);
      return {
        fileName: path.basename(fullPath),
        relativePath: path.relative(activeDir, fullPath).replace(/\\/g, "/"),
        sizeBytes: stat.size,
        sizeFormatted: formatBytes(stat.size),
      };
    })
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
}

export function getLocalEngineStatus(): LocalEngineStatus {
  const binaryPath = findEngineBinary();
  const models = listDetectedModels();
  const customModelsDir = getCustomModelsDir();
  const activeModelsDir = customModelsDir || LOCAL_ENGINE_MODELS_DIR;

  return {
    rootDir: LOCAL_ENGINE_ROOT,
    binDir: LOCAL_ENGINE_BIN_DIR,
    modelsDir: activeModelsDir,
    defaultModelsDir: LOCAL_ENGINE_MODELS_DIR,
    customModelsDir,
    binaryFound: Boolean(binaryPath),
    binaryPath: binaryPath ? path.relative(LOCAL_ENGINE_ROOT, binaryPath).replace(/\\/g, "/") : null,
    binaryName: binaryPath ? path.basename(binaryPath) : null,
    models,
    processState,
    activePort,
    activeBaseUrl: `http://127.0.0.1:${activePort}/v1`,
    activeModel,
    activeModelRelativePath,
    computeMode: activeComputeMode,
    gpuLayers: activeGpuLayers,
    contextSize: activeContextSize,
    lastError,
    startupProgress: { ...startupProgress },
    logs: [...logBuffer],
    download: { ...downloadState },
    engineDownloads: ENGINE_DOWNLOADS,
    qwenCatalog: QWEN_MODEL_CATALOG,
  };
}

async function waitForServerHealthy(port: number, proc: ChildProcess, timeoutMs = 90000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (proc.exitCode !== null || processState === "stopped" || processState === "error" || engineProcess !== proc) {
      return false;
    }
    try {
      const res = await fetch(`http://127.0.0.1:${port}/v1/models`, {
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        return true;
      }
    } catch {
      // Server still loading model into VRAM/RAM
      if (processState === "starting") {
        const elapsed = Date.now() - start;
        if (elapsed > 2500 && startupProgress.percent < 28) {
          updateProgressAtLeast("loading_model", 28, "Loading GGUF model into memory...");
        } else if (startupProgress.percent >= 28 && startupProgress.percent < 90) {
          startupProgress.percent = Math.min(90, startupProgress.percent + 1);
        }
      }
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

export async function startLocalEngine(options: {
  modelRelativePath: string;
  computeMode?: ComputeMode;
  gpuLayers?: number;
  contextSize?: number;
  threads?: number;
  port?: number;
  waitForHealthy?: boolean;
}): Promise<LocalEngineStatus> {
  const binaryPath = findEngineBinary();
  if (!binaryPath) {
    throw new Error(
      "llama-server executable was not found. Please download llama-b12202-bin-win-vulkan-x64.zip (or OS equivalent) and extract it into the 'local-engine/bin' folder."
    );
  }

  // Ensure executable permission on Linux / macOS
  if (process.platform !== "win32") {
    try {
      fs.chmodSync(binaryPath, 0o755);
    } catch {
      // Ignore if already executable or read-only
    }
  }

  const activeModelsDir = getActiveModelsDir();
  const requestedRel = (options.modelRelativePath || "").trim();
  if (!requestedRel) {
    throw new Error(`Please select a .gguf model file from ${activeModelsDir}.`);
  }

  // Strictly prevent path traversal outside the active models directory
  const resolvedModelPath = path.resolve(activeModelsDir, requestedRel);
  if (
    !isPathInsideDir(resolvedModelPath, activeModelsDir) ||
    !resolvedModelPath.toLowerCase().endsWith(".gguf") ||
    !fs.existsSync(resolvedModelPath)
  ) {
    throw new Error(`Selected .gguf model file was not found inside ${activeModelsDir}.`);
  }

  const mode: ComputeMode = options.computeMode === "cpu" ? "cpu" : "gpu";
  const gpuLayers =
    mode === "cpu"
      ? 0
      : Math.max(0, Math.min(999, Number.isFinite(Number(options.gpuLayers)) ? Number(options.gpuLayers) : 99));
  const ctxSize = Math.max(1024, Math.min(65536, Number(options.contextSize) || 8192));
  const port = Math.max(1024, Math.min(65535, Number(options.port) || 1279));
  const threads = Number(options.threads);

  // Stop any previously running built-in engine first
  await stopLocalEngine();

  activePort = port;
  activeModel = path.basename(resolvedModelPath);
  activeModelRelativePath = requestedRel.replace(/\\/g, "/");
  activeComputeMode = mode;
  activeGpuLayers = gpuLayers;
  activeContextSize = ctxSize;
  lastError = null;
  logBuffer = [];
  processState = "starting";
  startupProgress = {
    phase: "spawning",
    percent: 10,
    stageLabel: `Launching ${path.basename(binaryPath)} (${mode.toUpperCase()} mode)...`,
    latestLog: null,
  };

  const args: string[] = [
    "-m",
    resolvedModelPath,
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "-ngl",
    String(gpuLayers),
    "-c",
    String(ctxSize),
    "--alias",
    path.basename(resolvedModelPath),
  ];

  if (Number.isFinite(threads) && threads >= 1 && threads <= 128) {
    args.push("-t", String(Math.floor(threads)));
  }

  appendLog(`[Launcher] Starting ${path.basename(binaryPath)} in ${mode.toUpperCase()} mode (-ngl ${gpuLayers}, ctx ${ctxSize}) on port ${port}...`);

  const child = spawn(binaryPath, args, {
    cwd: path.dirname(binaryPath),
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  engineProcess = child;

  child.stdout?.on("data", ingestProcessChunk);
  child.stderr?.on("data", ingestProcessChunk);

  child.on("error", (err) => {
    lastError = `Failed to launch engine binary: ${err.message}`;
    processState = "error";
    startupProgress = {
      phase: "error",
      percent: startupProgress.percent,
      stageLabel: "Failed to start llama-server executable",
      latestLog: lastError,
    };
    engineProcess = null;
    appendLog(`[ERROR] ${lastError}`);
  });

  child.on("exit", (code, signal) => {
    if (engineProcess === child) {
      engineProcess = null;
      if (processState !== "stopped") {
        if (code !== 0) {
          lastError =
            lastError ||
            `Engine exited unexpectedly (code ${code ?? signal}). Try switching to CPU Only (-ngl 0) if GPU VRAM/Vulkan drivers are incompatible.`;
          processState = "error";
          startupProgress = {
            phase: "error",
            percent: startupProgress.percent,
            stageLabel: `Engine exited with error (code ${code ?? signal})`,
            latestLog: lastError,
          };
        } else {
          processState = "stopped";
          startupProgress = {
            phase: "idle",
            percent: 0,
            stageLabel: "Engine stopped",
            latestLog: null,
          };
        }
      }
      appendLog(`[Launcher] Engine stopped (code=${code ?? "null"}, signal=${signal ?? "none"}).`);
    }
  });

  const monitorPromise = waitForServerHealthy(port, child, 90000).then((healthy) => {
    if (engineProcess !== child && !healthy) {
      return false;
    }
    if (healthy) {
      processState = "running";
      startupProgress = {
        phase: "ready",
        percent: 100,
        stageLabel: `Model loaded and listening on 127.0.0.1:${port}`,
        latestLog: `Ready: ${activeModel}`,
      };
      appendLog(`[Launcher] Model ready at http://127.0.0.1:${port}/v1`);
      return true;
    }

    if (processState === "starting") {
      lastError =
        lastError ||
        "Engine did not become healthy within 90s. Check engine logs below or try a smaller model / CPU Only mode.";
      processState = "error";
      startupProgress = {
        phase: "error",
        percent: startupProgress.percent,
        stageLabel: "Model loading timed out or failed",
        latestLog: lastError,
      };
      appendLog(`[ERROR] ${lastError}`);
    }
    return false;
  });

  if (options.waitForHealthy === false) {
    // Non-blocking start so the frontend can immediately poll live loading progress & logs
    void monitorPromise;
    return getLocalEngineStatus();
  }

  const healthy = await monitorPromise;
  if (healthy) {
    return getLocalEngineStatus();
  }

  if (lastError || child.exitCode !== null) {
    throw new Error(lastError || "Built-in engine exited during startup. Check logs or switch between GPU and CPU mode.");
  }

  return getLocalEngineStatus();
}

export async function stopLocalEngine(): Promise<void> {
  const proc = engineProcess;
  processState = "stopped";
  engineProcess = null;
  activeModel = null;
  activeModelRelativePath = null;
  startupProgress = {
    phase: "idle",
    percent: 0,
    stageLabel: "Engine stopped",
    latestLog: null,
  };

  if (!proc) return;

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {}
      resolve();
    }, 3000);

    proc.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });

    try {
      proc.kill("SIGTERM");
    } catch {
      clearTimeout(timer);
      resolve();
    }
  });
}

export async function startModelDownload(rawUrl: string, desiredFileName?: string): Promise<DownloadProgressState> {
  ensureLocalEngineDirs();
  if (downloadState.active) {
    throw new Error(`Another model download is already in progress (${downloadState.fileName}).`);
  }

  const urlCheck = await validateSafeExternalUrl(rawUrl);
  if (!urlCheck.valid || !urlCheck.sanitizedUrl) {
    throw new Error(urlCheck.error || "Invalid model download URL.");
  }

  const parsed = new URL(urlCheck.sanitizedUrl);
  if (parsed.protocol !== "https:") {
    throw new Error("Only secure HTTPS URLs are allowed for model downloads.");
  }

  const rawName = (desiredFileName || path.basename(parsed.pathname) || "model.gguf").split("?")[0];
  const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!safeName.toLowerCase().endsWith(".gguf")) {
    throw new Error("Model download URL must point to a .gguf model file.");
  }

  const activeModelsDir = getActiveModelsDir();
  const destPath = path.resolve(activeModelsDir, safeName);
  const partPath = `${destPath}.part`;
  if (!isPathInsideDir(destPath, activeModelsDir)) {
    throw new Error("Invalid model destination filename.");
  }

  const controller = new AbortController();
  activeDownloadAbort = controller;
  downloadState = {
    active: true,
    fileName: safeName,
    downloadedBytes: 0,
    totalBytes: 0,
    percent: 0,
    error: null,
    completedFile: null,
  };

  // Run streaming download asynchronously so UI can poll progress cleanly
  (async () => {
    try {
      const response = await fetch(urlCheck.sanitizedUrl!, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "script-automation-studio-local-engine" },
      });

      if (!response.ok || !response.body) {
        throw new Error(`Download failed with HTTP ${response.status} ${response.statusText}`);
      }

      const total = Number(response.headers.get("content-length") || "0");
      downloadState.totalBytes = Number.isFinite(total) ? total : 0;

      const fileStream = fs.createWriteStream(partPath);
      const bodyStream = Readable.fromWeb(response.body as any);

      await new Promise<void>((resolve, reject) => {
        bodyStream.on("data", (chunk: Buffer) => {
          downloadState.downloadedBytes += chunk.length;
          if (downloadState.totalBytes > 0) {
            downloadState.percent = Math.min(
              99,
              Math.round((downloadState.downloadedBytes / downloadState.totalBytes) * 100)
            );
          }
        });
        bodyStream.on("error", reject);
        fileStream.on("error", reject);
        fileStream.on("finish", resolve);
        bodyStream.pipe(fileStream);
      });

      fs.renameSync(partPath, destPath);
      downloadState = {
        active: false,
        fileName: safeName,
        downloadedBytes: downloadState.downloadedBytes,
        totalBytes: downloadState.downloadedBytes,
        percent: 100,
        error: null,
        completedFile: safeName,
      };
    } catch (err: any) {
      try {
        if (fs.existsSync(partPath)) fs.unlinkSync(partPath);
      } catch {}
      const aborted = err?.name === "AbortError";
      downloadState = {
        active: false,
        fileName: safeName,
        downloadedBytes: 0,
        totalBytes: 0,
        percent: 0,
        error: aborted ? "Download cancelled by user." : err?.message || "Model download failed.",
        completedFile: null,
      };
    } finally {
      activeDownloadAbort = null;
    }
  })();

  return { ...downloadState };
}

export function cancelModelDownload(): void {
  if (activeDownloadAbort) {
    activeDownloadAbort.abort();
    activeDownloadAbort = null;
  }
}
