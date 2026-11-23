import express from "express";
import fs from "fs";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { maskApiKey } from "./server/encryption.js";
import { validateSafeExternalUrl } from "./server/urlValidator.js";
import {
  executeMultiProviderGeneration,
  executeMultiProviderChat,
  executeMultiProviderChatStream,
  ChatTurnMessage,
  AIProviderConfig,
  AIProviderType,
  formatProviderErrorMessage,
  sanitizeApiKey,
  createGeminiSdkClient,
  extractJsonObject,
} from "./server/multiProvider.js";
import {
  ensureLocalEngineDirs,
  getLocalEngineStatus,
  listDetectedModels,
  startLocalEngine,
  stopLocalEngine,
  startModelDownload,
  cancelModelDownload,
  setCustomModelsDirectory,
} from "./server/localEngine.js";
import {
  scanLinkedSkillFolders,
  addLinkedSkillFolder,
  removeLinkedSkillFolder,
} from "./server/localSkills.js";
import type { Server as HttpServer } from "http";
import { spawn } from "child_process";

dotenv.config();

// A stray rejection (e.g. an aborted provider stream or a dropped client socket) must not take the
// whole server down: in Electron the API runs in the main process, so exiting here closes the app.
process.on("uncaughtException", (err) => {
  logSafeError("UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (err) => {
  logSafeError("UNHANDLED REJECTION:", err);
});

const app = express();

// Security: never expose raw SDK/server errors to clients or logs.
// In particular, provider errors can sometimes contain request metadata.
function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown server error";
}

function logSafeError(context: string, error: unknown): void {
  console.error(context, safeErrorMessage(error));
}

app.disable("x-powered-by");

// Security Headers & Content-Security-Policy
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self' https://*.googleapis.com https://api.openai.com https://api.anthropic.com http://127.0.0.1:* http://localhost:*",
      "img-src 'self' data: blob: https://api.dicebear.com https://images.unsplash.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "media-src 'self' blob: data:",
      "frame-src 'self'",
      "frame-ancestors 'self' http://localhost:* http://127.0.0.1:* https://*.google.com https://*.googleusercontent.com"
    ].join("; ")
  );
  next();
});

const PORT = Number(process.env.PORT) || 3000;
const isElectron = Boolean(process.versions?.electron);
// The API has no login and can spend the user's API keys, so it only listens on this machine
// unless the operator explicitly opts in (HOST=0.0.0.0, e.g. inside Docker).
const HOST = isElectron ? "127.0.0.1" : (process.env.HOST || "").trim() || "127.0.0.1";
const IS_LOOPBACK_ONLY = HOST === "127.0.0.1" || HOST === "localhost" || HOST === "::1";
let httpServer: HttpServer | null = null;
let serverStartPromise: Promise<HttpServer> | null = null;

// Reject requests whose Host/Origin is not this machine (blocks DNS-rebinding and cross-site calls
// from web pages the user happens to have open while the app is running).
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
function hostnameOf(hostHeader: string): string {
  const h = hostHeader.trim().toLowerCase();
  if (h.startsWith("[")) return h.slice(0, h.indexOf("]") + 1);
  return h.split(":")[0];
}
app.use((req, res, next) => {
  if (!IS_LOOPBACK_ONLY) return next();
  const hostHeader = req.headers.host || "";
  if (!LOCAL_HOSTNAMES.has(hostnameOf(hostHeader))) {
    return res.status(403).json({ error: "Forbidden host." });
  }
  const origin = req.headers.origin;
  if (typeof origin === "string" && origin && origin !== "null") {
    try {
      if (!LOCAL_HOSTNAMES.has(hostnameOf(new URL(origin).host))) {
        return res.status(403).json({ error: "Forbidden origin." });
      }
    } catch {
      return res.status(403).json({ error: "Forbidden origin." });
    }
  }
  return next();
});

app.use(express.json({ limit: "50mb" }));

// Body-parser / JSON errors must reach the client as JSON, not as an HTML stack page
// (the UI calls response.json() and would otherwise show "Unexpected token <").
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!err) return next();
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "The request is too large (limit 50 MB). Try a smaller file or script." });
  }
  if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({ error: "Malformed JSON request body." });
  }
  return next(err);
});

// Local Desktop App — No artificial API throttling or usage limits
const apiRateLimiter: express.RequestHandler = (_req, _res, next) => next();
const writeRateLimiter: express.RequestHandler = (_req, _res, next) => next();
const aiBurstLimiter: express.RequestHandler = (_req, _res, next) => next();

// 100% Pure Cross-Platform Desktop Mode (Windows, Linux, macOS)
export const isStandaloneMode = true;

export function resolveRequestProviderConfig(req: express.Request, fallbackKey?: string): AIProviderConfig {
  const bodyConfig = req.body?.providerConfig;
  const headerProvider = (req.headers["x-provider-type"] as string || "").toLowerCase();
  const headerKey = sanitizeApiKey(req.headers["x-provider-key"] as string);
  const headerUrl = (req.headers["x-provider-baseurl"] as string || "").trim();
  const headerModel = (req.headers["x-provider-model"] as string || "").trim();
  const cleanFallback = sanitizeApiKey(fallbackKey);

  if (bodyConfig && typeof bodyConfig === "object" && bodyConfig.provider) {
    return {
      provider: bodyConfig.provider,
      apiKey: sanitizeApiKey(bodyConfig.apiKey) || cleanFallback || "",
      model: bodyConfig.model || "",
      baseUrl: bodyConfig.baseUrl || "",
      allowEnvFallback: true,
    };
  }

  if (headerProvider === "openai" || headerProvider === "claude" || headerProvider === "local" || headerProvider === "gemini") {
    return {
      provider: headerProvider,
      apiKey: headerKey || cleanFallback || "",
      model: headerModel || "",
      baseUrl: headerUrl || "",
      allowEnvFallback: true,
    };
  }

  const envProvider = (process.env.AI_PROVIDER || "").toLowerCase();
  if (envProvider === "openai" || envProvider === "claude" || envProvider === "local" || envProvider === "gemini") {
    return {
      provider: envProvider,
      apiKey: headerKey || cleanFallback || "",
      model: headerModel || "",
      baseUrl: headerUrl || "",
      allowEnvFallback: true,
    };
  }

  return {
    provider: "gemini",
    apiKey: cleanFallback || "",
    allowEnvFallback: true,
  };
}

function resolveNicheDirective(rawNiche?: string): {
  isAuto: boolean;
  label: string;
  promptText: string;
} {
  const clean = typeof rawNiche === "string" ? rawNiche.trim() : "";
  const lower = clean.toLowerCase();
  if (!clean || lower === "none" || lower.startsWith("none (auto")) {
    return {
      isAuto: true,
      label: "Auto-Detect by Topic",
      promptText:
        "Auto-detect directly from the user's topic or source script (adapt vocabulary, tone, domain context, and visual aesthetics automatically to match the core subject)",
    };
  }
  return {
    isAuto: false,
    label: clean.slice(0, 100),
    promptText: clean.slice(0, 100),
  };
}

// Interface for Authenticated Requests
interface AuthenticatedRequest extends express.Request {
  userAuth?: { uid: string; email?: string; name?: string; emailVerified?: boolean };
  userAiClient?: GoogleGenAI;
  userApiKey?: string;
  providerConfig?: AIProviderConfig;
}

// Helper to create a GoogleGenAI client supporting both standard API keys (AQ..., AIzaSy...) and OAuth access tokens (ya29...)
function createGoogleGenAIClient(apiKey: string): GoogleGenAI {
  const trimmed = apiKey.trim();
  // ya29. is Google OAuth2 access token
  if (trimmed.startsWith("ya29.")) {
    return new GoogleGenAI({
      apiKey: "",
      httpOptions: {
        headers: {
          "Authorization": `Bearer ${trimmed}`,
          "User-Agent": "script-automation-studio",
        },
      },
    });
  }
  // AQ... and AIzaSy... are Gemini API key formats
  return new GoogleGenAI({
    apiKey: trimmed,
    httpOptions: {
      headers: {
        "User-Agent": "script-automation-studio",
      },
    },
  });
}

// Local Desktop Request Provider & API Key Resolution Middleware
async function verifyUserAuth(req: AuthenticatedRequest, _res: express.Response, next: express.NextFunction) {
  req.userAuth = {
    uid: "desktop-local-creator",
    email: "local@desktop.workspace",
    name: "Desktop Creator",
    emailVerified: true,
  };
  const resolvedConfig = resolveRequestProviderConfig(req);
  const requestedProvider = resolvedConfig.provider;
  const envKeyForProvider =
    requestedProvider === "openai"
      ? sanitizeApiKey(process.env.OPENAI_API_KEY)
      : requestedProvider === "claude"
      ? sanitizeApiKey(process.env.ANTHROPIC_API_KEY)
      : requestedProvider === "local"
      ? sanitizeApiKey(process.env.LOCAL_LLM_API_KEY)
      : sanitizeApiKey(process.env.GEMINI_API_KEY);

  const headerKey = sanitizeApiKey((req.headers["x-provider-key"] as string) || (req.headers["x-api-key"] as string));
  const bodyKey = sanitizeApiKey(req.body?.providerConfig?.apiKey || req.body?.apiKey);
  const effectiveKey = headerKey || bodyKey || envKeyForProvider;

  const geminiKey =
    requestedProvider === "gemini"
      ? effectiveKey
      : sanitizeApiKey(process.env.GEMINI_API_KEY);

  req.userApiKey = effectiveKey;
  req.userAiClient = geminiKey ? createGoogleGenAIClient(geminiKey) : undefined;
  req.providerConfig = resolveRequestProviderConfig(req, effectiveKey);
  return next();
}

// Helper to format Gemini API errors into clean, human-friendly messages
function formatGeminiErrorMessage(err: any): string {
  if (!err) return "Unknown Gemini API error";
  const errStr = typeof err === "string" ? err : (err.message || JSON.stringify(err));
  
  if (errStr.includes("API_KEY_SERVICE_BLOCKED")) {
    return "API Key Restriction Blocked: Your API key is restricted in Google Cloud Console and does not allow the 'Generative Language API', or has HTTP-referrer/IP restrictions blocking server requests. Please generate a new Gemini API key or update your key's API restrictions in Google Cloud Console.";
  }
  
  if (errStr.includes("API keys are not supported by this API")) {
    return "API Key Configuration Error: The API key cannot access Generative Language API. Please ensure the Generative Language API is enabled in your Google Cloud project or configure a valid Gemini API key.";
  }
  
  if (errStr.includes("API_KEY_INVALID") || errStr.includes("API key not valid")) {
    return "Invalid API Key: The provided API key is invalid or has been revoked. Please check your Gemini API key in Settings.";
  }

  if (errStr.includes("RESOURCE_EXHAUSTED") || /\b429\b/.test(errStr)) {
    return "Rate Limit / Quota Exceeded (429): You have exceeded your Gemini API quota or rate limit. Please try again shortly or check your API quota.";
  }

  try {
    const jsonMatch = errStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error?.message) {
        if (parsed.error.details?.[0]?.reason === "API_KEY_SERVICE_BLOCKED") {
          return "API Key Restriction Blocked: Your Google API key is restricted and does not allow the Generative Language API. Please generate an unrestricted Gemini API key or allow Generative Language API in Google Cloud Console.";
        }
        return parsed.error.message;
      }
    }
  } catch (_e) {}

  return err.message || errStr;
}

// Wrapper to call Gemini API with automatic retry and exponential backoff using user's AI client
async function generateContentWithRetry(ai: GoogleGenAI, params: any, maxRetries = 3, delayMs = 1500) {
  let attempt = 0;
  let activeAi = ai;
  let triedVertexExpress = false;
  while (true) {
    try {
      return await activeAi.models.generateContent(params);
    } catch (error: any) {
      const errStr = String(error?.message || error);
      const rawKey = (activeAi as any)?.apiKey || "";
      if (
        !triedVertexExpress &&
        typeof rawKey === "string" &&
        rawKey.startsWith("AQ.") &&
        (errStr.includes("API_KEY_INVALID") ||
          errStr.includes("API key not valid") ||
          errStr.includes("API keys are not supported") ||
          errStr.includes("UNAUTHENTICATED") ||
          errStr.includes("PERMISSION_DENIED"))
      ) {
        triedVertexExpress = true;
        activeAi = createGeminiSdkClient(rawKey, true);
        continue;
      }

      attempt++;
      logSafeError(`Gemini API call failed (attempt ${attempt}/${maxRetries}):`, error);

      // Fail fast on fatal auth / permission / restriction errors
      if (
        errStr.includes("API_KEY_SERVICE_BLOCKED") ||
        errStr.includes("API_KEY_INVALID") ||
        errStr.includes("UNAUTHENTICATED") ||
        errStr.includes("PERMISSION_DENIED")
      ) {
        throw new Error(formatGeminiErrorMessage(error));
      }

      // Check if the error is due to model availability (e.g. model not found or unsupported)
      const errLower = errStr.toLowerCase();
      const isAvailabilityError = 
        errLower.includes("not found") || 
        errLower.includes("not_found") || 
        errLower.includes("not supported") || 
        errLower.includes("unsupported") || 
        errLower.includes("404") ||
        errLower.includes("invalid model") ||
        errLower.includes("model is deprecated");

      if (isAvailabilityError) {
        if (params.model === "gemini-3.1-flash-lite") {
          console.warn("Model gemini-3.1-flash-lite is not found/unsupported. Falling back to gemini-3.6-flash.");
          params.model = "gemini-3.6-flash";
        } else if (params.model === "gemini-3.6-flash") {
          console.warn("Model gemini-3.6-flash is not found/unsupported. Falling back to gemini-3.1-flash-lite.");
          params.model = "gemini-3.1-flash-lite";
        }
      }

      // Only transient failures are worth retrying. A 400 (bad request / blocked prompt) will fail
      // identically every time and just burns quota and makes the user wait.
      const isTransient =
        isAvailabilityError ||
        /\b(429|500|502|503|504)\b/.test(errStr) ||
        /RESOURCE_EXHAUSTED|UNAVAILABLE|DEADLINE_EXCEEDED|INTERNAL|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|fetch failed|socket hang up|overloaded/i.test(errStr);
      if (!isTransient || attempt >= maxRetries) {
        throw new Error(formatGeminiErrorMessage(error));
      }

      const backoff = delayMs * Math.pow(2.2, attempt - 1);
      console.log(`Transient Gemini API error detected. Retrying in ${Math.round(backoff)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
}

const ALLOWED_LOCAL_ENV_KEYS = new Set([
  "AI_PROVIDER",
  "GEMINI_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "LOCAL_LLM_URL",
  "LOCAL_LLM_MODEL",
]);

function upsertLocalEnvFile(updates: Record<string, string>): void {
  const envPath = path.resolve(process.cwd(), ".env");
  const eol = process.platform === "win32" ? "\r\n" : "\n";
  let lines: string[] = [];

  if (fs.existsSync(envPath)) {
    lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  } else {
    lines = ["PORT=3000"];
  }

  const sanitizedUpdates: Record<string, string> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (!ALLOWED_LOCAL_ENV_KEYS.has(k)) continue;
    const cleanVal = String(v ?? "").replace(/[\r\n]/g, "").trim();
    sanitizedUpdates[k] = cleanVal;
    if (cleanVal) {
      process.env[k] = cleanVal;
    } else {
      delete process.env[k];
    }
  }

  const remainingKeys = new Set(Object.keys(sanitizedUpdates));
  const nextLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) return line;
    const key = trimmed.slice(0, eqIdx).trim();
    if (remainingKeys.has(key)) {
      remainingKeys.delete(key);
      return `${key}=${sanitizedUpdates[key]}`;
    }
    return line;
  });

  for (const key of remainingKeys) {
    nextLines.push(`${key}=${sanitizedUpdates[key]}`);
  }

  fs.writeFileSync(envPath, nextLines.join(eol), { encoding: "utf8", mode: 0o600 });
}

function getStandaloneEnvKeySummary() {
  const gem = sanitizeApiKey(process.env.GEMINI_API_KEY);
  const oai = sanitizeApiKey(process.env.OPENAI_API_KEY);
  const cld = sanitizeApiKey(process.env.ANTHROPIC_API_KEY);
  const rawProv = (process.env.AI_PROVIDER || "").toLowerCase();
  const aiProvider =
    rawProv === "openai" || rawProv === "claude" || rawProv === "local" || rawProv === "gemini"
      ? rawProv
      : "gemini";
  return {
    aiProvider,
    gemini: { configured: Boolean(gem), masked: gem ? maskApiKey(gem) : null },
    openai: { configured: Boolean(oai), masked: oai ? maskApiKey(oai) : null },
    claude: { configured: Boolean(cld), masked: cld ? maskApiKey(cld) : null },
    local: {
      configured: true,
      url: process.env.LOCAL_LLM_URL || "http://127.0.0.1:1279/v1",
      model: process.env.LOCAL_LLM_MODEL || "default",
    },
  };
}

// Local Desktop Provider Key Management Endpoints
app.post("/api/user/save-key", writeRateLimiter, async (req, res) => {
  try {
    const { provider = "gemini", apiKey = "", baseUrl = "", model = "", saveToEnv = true } = req.body;
    const providerType = (provider || "gemini").toLowerCase() as AIProviderType;
    const trimmedKey = sanitizeApiKey(apiKey);
    const trimmedBaseUrl = (baseUrl || "").trim();
    const trimmedModel = (model || "").trim();

    if (providerType !== "local" && !trimmedKey) {
      return res.status(400).json({ error: `API Key is required for ${providerType.toUpperCase()}.` });
    }

    // Ping / Test connection with chosen provider
    try {
      const config: AIProviderConfig = {
        provider: providerType,
        apiKey: trimmedKey,
        baseUrl: trimmedBaseUrl,
        model: trimmedModel,
        allowEnvFallback: true,
      };
      await executeMultiProviderGeneration({
        prompt: "Respond with the word CONNECTED to verify connection.",
        model: trimmedModel,
        providerConfig: config,
        fallbackApiKey: trimmedKey,
      });
    } catch (testErr: any) {
      logSafeError(`Provider ${providerType} Validation Test Failed:`, testErr);
      return res.status(400).json({
        error: formatProviderErrorMessage(providerType, testErr),
      });
    }

    let savedToEnvFile = false;
    if (saveToEnv !== false) {
      const envUpdates: Record<string, string> = { AI_PROVIDER: providerType };
      if (providerType === "gemini" && trimmedKey) envUpdates.GEMINI_API_KEY = trimmedKey;
      if (providerType === "openai" && trimmedKey) envUpdates.OPENAI_API_KEY = trimmedKey;
      if (providerType === "claude" && trimmedKey) envUpdates.ANTHROPIC_API_KEY = trimmedKey;
      if (providerType === "local") {
        if (trimmedBaseUrl) envUpdates.LOCAL_LLM_URL = trimmedBaseUrl;
        if (trimmedModel) envUpdates.LOCAL_LLM_MODEL = trimmedModel;
      }
      upsertLocalEnvFile(envUpdates);
      savedToEnvFile = true;
    }

    return res.json({
      success: true,
      activeProvider: providerType,
      savedToEnvFile,
      apiKeyMasked: providerType === "local" ? `Local (${trimmedBaseUrl || "http://127.0.0.1:1279/v1"})` : maskApiKey(trimmedKey),
    });
  } catch (error: any) {
    logSafeError("Error saving API Key / Provider:", error);
    return res.status(500).json({ error: error?.message || "Failed to save API key / provider settings." });
  }
});

app.get("/api/user/profile-status", async (_req, res) => {
  return res.json({ standalone: true, desktopOnly: true, hasApiKey: true });
});

app.post("/api/user/remove-key", writeRateLimiter, async (req, res) => {
  try {
    const targetProvider = String(req.body?.provider || "all").toLowerCase();
    const envUpdates: Record<string, string> = {};
    if (targetProvider === "gemini" || targetProvider === "all") envUpdates.GEMINI_API_KEY = "";
    if (targetProvider === "openai" || targetProvider === "all") envUpdates.OPENAI_API_KEY = "";
    if (targetProvider === "claude" || targetProvider === "all") envUpdates.ANTHROPIC_API_KEY = "";
    upsertLocalEnvFile(envUpdates);
    return res.json({ success: true, clearedLocalEnv: true });
  } catch (error: any) {
    logSafeError("Error removing API Key:", error);
    return res.status(500).json({ error: "Failed to remove API key." });
  }
});

app.get("/api/system/mode", (_req, res) => {
  const providers: Array<{ id: string; name: string; defaultModel: string; defaultUrl?: string }> = [
    { id: "gemini", name: "Google Gemini", defaultModel: "gemini-3.1-flash-lite" },
    { id: "openai", name: "OpenAI", defaultModel: "gpt-4o-mini" },
    { id: "claude", name: "Anthropic Claude", defaultModel: "claude-3-7-sonnet-20250219" },
    {
      id: "local",
      name: "Local Engine (Built-In llama.cpp GPU/CPU / LM Studio / Ollama)",
      defaultModel: "default",
      defaultUrl: "http://127.0.0.1:1279/v1",
    },
  ];
  return res.json({
    standalone: true,
    desktopOnly: true,
    supportedProviders: providers,
    envKeys: getStandaloneEnvKeySummary(),
    appName: "Script Automation Studio",
    author: "Muhammad Tehseen Irshad",
    brand: "Moni Visual Pro"
  });
});

// ============================================================================
// Built-In Local LLM Engine Management (Windows / Linux / macOS)
// ============================================================================
app.get("/api/local-engine/status", (_req, res) => {
  ensureLocalEngineDirs();
  return res.json(getLocalEngineStatus());
});

app.post("/api/local-engine/start", writeRateLimiter, async (req, res) => {
  try {
    const { modelRelativePath, computeMode, gpuLayers, contextSize, threads, port, async: isAsync } = req.body || {};
    const status = await startLocalEngine({
      modelRelativePath,
      computeMode,
      gpuLayers,
      contextSize,
      threads,
      port,
      waitForHealthy: !isAsync,
    });
    return res.json({ success: true, status });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || "Failed to start built-in local engine.", status: getLocalEngineStatus() });
  }
});

app.post("/api/local-engine/stop", async (_req, res) => {
  await stopLocalEngine();
  return res.json({ success: true, status: getLocalEngineStatus() });
});

app.post("/api/local-engine/download-model", writeRateLimiter, async (req, res) => {
  try {
    const { url, fileName } = req.body || {};
    const download = await startModelDownload(url, fileName);
    return res.json({ success: true, download });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || "Failed to start model download." });
  }
});

app.post("/api/local-engine/cancel-download", (_req, res) => {
  cancelModelDownload();
  return res.json({ success: true, status: getLocalEngineStatus() });
});

app.post("/api/local-engine/models-dir", writeRateLimiter, (req, res) => {
  try {
    const { directoryPath } = req.body || {};
    const status = setCustomModelsDirectory(typeof directoryPath === "string" ? directoryPath : "");
    return res.json({ success: true, status });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || "Invalid models directory path.", status: getLocalEngineStatus() });
  }
});

// Local Linked Skills Folders (Claude, VS Code, Cursor, Bionic, Agents)
app.get("/api/local-skills", (_req, res) => {
  return res.json(scanLinkedSkillFolders());
});

app.post("/api/local-skills/link", writeRateLimiter, (req, res) => {
  try {
    const { directoryPath } = req.body || {};
    if (typeof directoryPath !== "string" || !directoryPath.trim()) {
      return res.status(400).json({ error: "Please provide a valid folder path." });
    }
    const result = addLinkedSkillFolder(directoryPath);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || "Could not link skills folder." });
  }
});

app.post("/api/local-skills/unlink", writeRateLimiter, (req, res) => {
  const { directoryPath } = req.body || {};
  const result = removeLinkedSkillFolder(typeof directoryPath === "string" ? directoryPath : "");
  return res.json({ success: true, ...result });
});

app.post("/api/local-skills/rescan", (_req, res) => {
  return res.json({ success: true, ...scanLinkedSkillFolders() });
});

app.post("/api/test-provider-connection", verifyUserAuth as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
  try {
    const config = req.providerConfig || resolveRequestProviderConfig(req, req.userApiKey);
    const testResult = await executeMultiProviderGeneration({
      prompt: "Respond with the single word 'CONNECTED' to verify our API integration connection.",
      model: config.model,
      userAiClient: req.userAiClient,
      providerConfig: config,
      fallbackApiKey: req.userApiKey,
    });
    return res.json({
      success: true,
      message: `Successfully connected to ${config.provider.toUpperCase()}!`,
      modelUsed: testResult.modelUsed,
      providerUsed: testResult.providerUsed,
      response: testResult.text.slice(0, 100),
    });
  } catch (error: any) {
    const provider = req.providerConfig?.provider || "gemini";
    return res.status(400).json({ error: formatProviderErrorMessage(provider, error) });
  }
});

app.get("/api/user/available-models", verifyUserAuth as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
  try {
    const provider = req.providerConfig?.provider || "gemini";
    const includeLocal = req.query.includeLocal !== "false" || provider === "local";

    const buildLocalModelsList = async () => {
      const seen = new Set<string>();
      const localList: Array<{ id: string; displayName: string; providerType: "local"; baseUrl?: string }> = [];
      const addUnique = (id: string, displayName: string, baseUrl?: string) => {
        const cleanId = (id || "").trim();
        if (!cleanId || seen.has(cleanId)) return;
        seen.add(cleanId);
        localList.push({ id: cleanId, displayName, providerType: "local", baseUrl });
      };

      const engineStatus = getLocalEngineStatus();
      const builtInUrl = engineStatus.activeBaseUrl || `http://127.0.0.1:${engineStatus.activePort || 1279}/v1`;

      if (engineStatus.processState === "running" && engineStatus.activeModel) {
        addUnique(
          engineStatus.activeModel,
          `Built-In Active: ${engineStatus.activeModel} (${engineStatus.computeMode.toUpperCase()})`,
          builtInUrl
        );
      }

      for (const m of listDetectedModels()) {
        addUnique(
          m.fileName,
          `Built-In Folder GGUF: ${m.fileName} (${m.sizeFormatted})`,
          builtInUrl
        );
      }

      // Probe configured local endpoint + standard LM Studio / Ollama / Built-In ports quickly
      const candidateUrls = Array.from(
        new Set(
          [
            req.providerConfig?.provider === "local" ? req.providerConfig.baseUrl : "",
            builtInUrl,
            process.env.LOCAL_LLM_URL || "",
            "http://127.0.0.1:1234/v1",
            "http://127.0.0.1:11434/v1",
          ]
            .map((u) => (u || "").trim().replace(/\/+$/, ""))
            .filter(Boolean)
        )
      );

      const probeResults = await Promise.allSettled(
        candidateUrls.map(async (baseUrl) => {
          const r = await fetch(`${baseUrl}/models`, {
            signal: AbortSignal.timeout(700),
          });
          if (!r.ok) return { baseUrl, ids: [] as string[] };
          const json: any = await r.json().catch(() => ({}));
          const rawList = Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json?.models)
            ? json.models
            : [];
          const ids: string[] = rawList
            .map((entry: any) => (typeof entry === "string" ? entry : entry?.id || entry?.name || ""))
            .filter(Boolean);
          return { baseUrl, ids };
        })
      );

      for (const outcome of probeResults) {
        if (outcome.status === "fulfilled") {
          const { baseUrl, ids } = outcome.value;
          const serverTag = baseUrl.includes(":11434")
            ? "Ollama Live"
            : baseUrl.includes(":1234")
            ? "LM Studio Live"
            : baseUrl === builtInUrl
            ? "Built-In Engine Live"
            : "Local Server Live";
          for (const id of ids) {
            addUnique(id, `${serverTag}: ${id}`, baseUrl);
          }
        }
      }

      addUnique("default", "Local Active Model (Auto-Detect Built-In / LM Studio / Ollama)", builtInUrl);
      return localList;
    };

    const getCloudModelsForProvider = async () => {
      if (provider === "openai") {
        return [
          { id: "gpt-4o-mini", displayName: "GPT-4o Mini (Fast & Cost Efficient)", providerType: "openai" as const },
          { id: "gpt-4o", displayName: "GPT-4o (High Intelligence)", providerType: "openai" as const },
          { id: "o3-mini", displayName: "o3-mini (Advanced Reasoning)", providerType: "openai" as const },
          { id: "gpt-4-turbo", displayName: "GPT-4 Turbo", providerType: "openai" as const },
        ];
      }

      if (provider === "claude") {
        return [
          { id: "claude-3-7-sonnet-20250219", displayName: "Claude 3.7 Sonnet (Hybrid Reasoning)", providerType: "claude" as const },
          { id: "claude-3-5-haiku-20241022", displayName: "Claude 3.5 Haiku (Lightning Fast)", providerType: "claude" as const },
          { id: "claude-3-5-sonnet-20241022", displayName: "Claude 3.5 Sonnet (Legacy)", providerType: "claude" as const },
        ];
      }

      const defaultModels = [
        { id: "gemini-3.1-flash-lite", displayName: "Gemini 3.1 Flash Lite (Recommended · Ultra Fast)", providerType: "gemini" as const },
        { id: "gemini-3.6-flash", displayName: "Gemini 3.6 Flash", providerType: "gemini" as const },
        { id: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash", providerType: "gemini" as const },
        { id: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro", providerType: "gemini" as const },
        { id: "gemini-2.5-flash-lite", displayName: "Gemini 2.5 Flash Lite", providerType: "gemini" as const },
      ];

      const geminiKey = req.userApiKey || "";
      if (req.userAiClient && provider === "gemini" && geminiKey && !geminiKey.startsWith("AQ.")) {
        try {
          const response = await Promise.race([
            req.userAiClient.models.list(),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
          ]);
          const dynamicList: Array<{ id: string; displayName: string; providerType: "gemini" }> = [];
          const pageModels = Array.isArray((response as any)?.page)
            ? (response as any).page
            : Array.isArray((response as any)?.models)
            ? (response as any).models
            : [];

          for (const m of pageModels) {
            if (m?.name && String(m.name).includes("gemini")) {
              const cleanId = String(m.name).replace(/^models\//, "");
              dynamicList.push({
                id: cleanId,
                displayName: m.displayName || cleanId,
                providerType: "gemini",
              });
            }
          }
          if (dynamicList.length > 0) {
            return dynamicList;
          }
        } catch {
          // Silently fall back to curated list when offline or key lacks list permissions
        }
      }

      return defaultModels;
    };

    const [localModels, cloudModels] = await Promise.all([
      includeLocal ? buildLocalModelsList() : Promise.resolve([]),
      getCloudModelsForProvider(),
    ]);

    if (provider === "local") {
      return res.json({
        models: [...localModels, ...(includeLocal ? cloudModels : [])],
        localModels,
        cloudModels,
      });
    }

    return res.json({
      models: includeLocal ? [...cloudModels, ...localModels] : cloudModels,
      localModels,
      cloudModels,
    });
  } catch (error: any) {
    logSafeError("Error in available-models:", error);
    return res.status(500).json({ error: "Failed to fetch available models." });
  }
});

const LOCAL_MODEL_SETTINGS_FILE = path.resolve(process.cwd(), ".studio-data", "model-settings.json");

app.post("/api/user/model-settings", writeRateLimiter, async (req, res) => {
  try {
    const { modelSettings } = req.body;
    if (!modelSettings || typeof modelSettings !== "object") {
      return res.status(400).json({ error: "Model settings required." });
    }
    const dir = path.dirname(LOCAL_MODEL_SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      LOCAL_MODEL_SETTINGS_FILE,
      JSON.stringify({ modelSettings, updatedAt: new Date().toISOString() }, null, 2),
      "utf8"
    );
    return res.json({ success: true });
  } catch (error: any) {
    logSafeError("Error saving model settings:", error);
    return res.status(500).json({ error: "Failed to save model settings." });
  }
});



// ============================================================================
// 8-Tier Demographic Target Audience Linguistic Directive Engine
// ============================================================================
function getTargetAudienceDirective(targetAudience?: string): { label: string; directive: string } {
  const key = (targetAudience || "all").toLowerCase();
  switch (key) {
    case "children":
    case "children_10":
      return {
        label: "Children / Kids (Up to 10 Years Old)",
        directive: `Target Audience: CHILDREN / KIDS UP TO 10 YEARS OLD.
   - Vocabulary & Wording: Use ultra-simple, joyful, wonder-filled, and easy-to-understand words suitable for young kids under 10. Avoid complex jargon; explain every concept through fun, magical, or everyday childhood comparisons (toys, animals, games, school, nature).
   - Rhythm & Delivery: Keep sentences short, bouncy, and enthusiastic. Address listeners warmly (e.g., "Pyare bacho", "Chote dosto", "Little explorers"). Ensure the tone is encouraging, safe, educational, and captivating from start to finish.`
      };
    case "teenagers_20":
      return {
        label: "Teenagers & Youth (Up to 20 Years Old)",
        directive: `Target Audience: TEENAGERS & YOUTH UP TO 20 YEARS OLD.
   - Vocabulary & Wording: Use energetic, fast-paced, curiosity-driven, and highly relatable contemporary phrasing that resonates with students, teens, and Gen-Z viewers up to age 20.
   - Rhythm & Delivery: Start with punchy hooks, eliminate slow or repetitive academic filler, use dynamic transitions, and connect examples to student life, gaming, technology, skills, self-discovery, and future ambition.`
      };
    case "young_30":
      return {
        label: "Young Adults (Up to 30 Years Old)",
        directive: `Target Audience: YOUNG ADULTS UP TO 30 YEARS OLD.
   - Vocabulary & Wording: Use sharp, modern, ambitious, and action-oriented language tailored for young adults in their 20s (up to 30 years old) building their careers, mindset, health, and lifestyle.
   - Rhythm & Delivery: Balance high-retention storytelling with practical, real-world takeaways, smart analytical insights, and motivating momentum.`
      };
    case "adults":
    case "adults_40":
      return {
        label: "Adults & Professionals (Up to 40 Years Old)",
        directive: `Target Audience: ADULTS & PROFESSIONALS UP TO 40 YEARS OLD.
   - Vocabulary & Wording: Use articulate, evidence-backed, analytical, and persuasive modern phrasing tailored for established adults up to 40 years old.
   - Rhythm & Delivery: Maintain high information density, logical cause-and-effect explanations, credible facts, and practical relevance to family, career, wellness, and smart decision-making.`
      };
    case "men_50":
      return {
        label: "Men & Mature Adults (Up to 50 Years Old)",
        directive: `Target Audience: MEN & MATURE ADULTS UP TO 50 YEARS OLD.
   - Vocabulary & Wording: Use seasoned, authoritative, pragmatic, and dignified language tailored for mature men and experienced listeners up to 50 years old.
   - Rhythm & Delivery: Focus on wisdom, long-term vitality, leadership, family responsibility, financial/health longevity, and direct, no-nonsense clarity with respectful address (e.g., "Mohtaram dosto", "Ahbab" in Urdu/Hindi; confident, poised prose in English).`
      };
    case "men_60":
      return {
        label: "Senior Men & Veterans (Up to 60 Years Old)",
        directive: `Target Audience: SENIOR MEN UP TO 60 YEARS OLD.
   - Vocabulary & Wording: Use composed, classic, deeply respectful, and refined vocabulary tailored for senior men up to 60 years old.
   - Rhythm & Delivery: Employ measured, thoughtful pacing and culturally respectful honorifics (e.g., in Urdu/Hindi use "Aap", "Janab", "Mohtaram", "Ahbab"; in English use dignified, courteous, and distinguished prose). Avoid rushed slang or overly casual tropes.`
      };
    case "seniors":
    case "old_80":
      return {
        label: "Old / Elders & Seniors (Up to 80 Years Old)",
        directive: `Target Audience: OLD / ELDERS & SENIORS UP TO 80 YEARS OLD.
   - Vocabulary & Wording: Use extremely respectful, warm, soothing, crystal-clear, and unhurried phrasing tailored for elders up to 80 years old.
   - Rhythm & Delivery: Always use the highest level of politeness and traditional honorifics (e.g., in Urdu/Hindi use "Buzurgo", "Mohtaram Buzurgo", "Aap", "Aadab", "Tashreef", "Shukriya"; in English use gracious, warm, comforting, and unhurried prose). Keep transitions gentle, reassuring, and easy to follow.`
      };
    case "all":
    default:
      return {
        label: "All Ages · Universal Audience (For Everyone)",
        directive: `Target Audience: ALL AGES / UNIVERSAL AUDIENCE (FOR EVERYONE).
   - Vocabulary & Wording: Use universally clear, inclusive, engaging, and balanced phrasing that appeals equally to youth, adults, families, and seniors watching together.
   - Rhythm & Delivery: Explain complex ideas simply without sounding childish, maintain warm and respectful family-friendly vocabulary across all languages, and keep the narrative engaging for every age group.`
      };
  }
}

const SCRIPT_LANGUAGE_MAP: { [key: string]: { name: string; script: string; isRTL: boolean } } = {
  "urdu-writing": { name: "Urdu (Nastaliq)", script: "Urdu Nastaliq script", isRTL: true },
  "urdu-roman": { name: "Urdu Roman", script: "Urdu written in Latin / Roman English alphabet (e.g. 'Aapki Sehat Ka Raaz')", isRTL: false },
  "english": { name: "English", script: "English Latin script", isRTL: false },
  "hindi": { name: "Hindi", script: "Hindi Devanagari script", isRTL: false },
  "spanish": { name: "Spanish", script: "Spanish script (Español)", isRTL: false },
  "french": { name: "French", script: "French script (Français)", isRTL: false },
  "german": { name: "German", script: "German script (Deutsch)", isRTL: false },
  "arabic": { name: "Arabic", script: "Arabic script (العربية)", isRTL: true },
  "bengali": { name: "Bengali", script: "Bengali script (বাংলা)", isRTL: false },
  "portuguese": { name: "Portuguese", script: "Portuguese script (Português)", isRTL: false },
  "russian": { name: "Russian", script: "Russian Cyrillic script (Русский)", isRTL: false },
  "japanese": { name: "Japanese", script: "Japanese script (日本語)", isRTL: false },
  "chinese-simplified": { name: "Chinese Simplified", script: "Simplified Chinese script (简体中文)", isRTL: false },
  "chinese-traditional": { name: "Chinese Traditional", script: "Traditional Chinese script (繁體中文)", isRTL: false },
  "indonesian": { name: "Indonesian", script: "Indonesian script (Bahasa Indonesia)", isRTL: false },
  "turkish": { name: "Turkish", script: "Turkish script (Türkçe)", isRTL: false },
  "italian": { name: "Italian", script: "Italian script (Italiano)", isRTL: false },
  "korean": { name: "Korean", script: "Korean Hangul script (한국어)", isRTL: false },
  "farsi": { name: "Persian / Farsi", script: "Persian / Farsi script (فارسی)", isRTL: true },
  "pashto": { name: "Pashto", script: "Pashto script (پښتو)", isRTL: true },
  "sindhi": { name: "Sindhi", script: "Sindhi script (سنڌي)", isRTL: true },
  "punjabi": { name: "Punjabi", script: "Punjabi script (ਪੰਜਾਬੀ / پنجابی)", isRTL: false },
  "vietnamese": { name: "Vietnamese", script: "Vietnamese script (Tiếng Việt)", isRTL: false },
  "thai": { name: "Thai", script: "Thai script (ไทย)", isRTL: false },
  "tagalog": { name: "Tagalog", script: "Tagalog / Filipino script", isRTL: false },
  "dutch": { name: "Dutch", script: "Dutch script (Nederlands)", isRTL: false },
  "polish": { name: "Polish", script: "Polish script (Polski)", isRTL: false },
  "swedish": { name: "Swedish", script: "Swedish script (Svenska)", isRTL: false },
  "norwegian": { name: "Norwegian", script: "Norwegian script (Norsk)", isRTL: false },
  "finnish": { name: "Finnish", script: "Finnish script (Suomi)", isRTL: false },
  "danish": { name: "Danish", script: "Danish script (Dansk)", isRTL: false },
  "greek": { name: "Greek", script: "Greek script (Ελληνικά)", isRTL: false },
  "hebrew": { name: "Hebrew", script: "Hebrew script (עברית)", isRTL: true },
  "tamil": { name: "Tamil", script: "Tamil script (தமிழ்)", isRTL: false },
  "telugu": { name: "Telugu", script: "Telugu script (తెలుగు)", isRTL: false },
  "marathi": { name: "Marathi", script: "Marathi script (मराठी)", isRTL: false },
  "gujarati": { name: "Gujarati", script: "Gujarati script (ગુજરાતી)", isRTL: false },
  "malayalam": { name: "Malayalam", script: "Malayalam script (മലയാളം)", isRTL: false },
  "kannada": { name: "Kannada", script: "Kannada script (ಕನ್ನಡ)", isRTL: false },
  "malay": { name: "Malay", script: "Malay script (Bahasa Melayu)", isRTL: false },
  "czech": { name: "Czech", script: "Czech script (Čeština)", isRTL: false },
  "romanian": { name: "Romanian", script: "Romanian script (Română)", isRTL: false },
  "hungarian": { name: "Hungarian", script: "Hungarian script (Magyar)", isRTL: false },
  "ukrainian": { name: "Ukrainian", script: "Ukrainian Cyrillic script (Українська)", isRTL: false },
  "afrikaans": { name: "Afrikaans", script: "Afrikaans script", isRTL: false },
  "swahili": { name: "Swahili", script: "Swahili script (Kiswahili)", isRTL: false }
};

function countScriptWords(text: string): number {
  if (!text || typeof text !== "string") return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Protected AI Script Generation API Routes
app.post("/api/generate", verifyUserAuth as express.RequestHandler, aiBurstLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      rawScript,
      transformation,
      language,
      voicePersona,
      topicNiche,
      targetAudience,
      wordCount,
      greetingsPrefix,
      includeHooksBodyConclusion,
      customHook,
      tutorialTone,
      fastLiteMode,
      selectedCountries,
    } = req.body;

    if (!rawScript || typeof rawScript !== "string" || rawScript.trim() === "") {
      return res.status(400).json({ error: "Source script is required." });
    }

    if (rawScript.length > 100000) {
      return res.status(400).json({ error: "Source script exceeds the maximum length limit of 100,000 characters." });
    }

    const ai = req.userAiClient;
    const modelToUse = req.body.model || "gemini-3.1-flash-lite";
    const providerConfig = req.providerConfig || resolveRequestProviderConfig(req, req.userApiKey);

    // Strictly enforce requested Script Length (especially short targets like 50 words)
    const rawWc = parseInt(String(wordCount ?? 300), 10);
    const targetWords = Number.isFinite(rawWc) && rawWc > 0
      ? Math.min(20000, Math.max(10, rawWc))
      : 300;
    const minWords = targetWords <= 80
      ? Math.max(8, targetWords - 5)
      : Math.max(15, Math.round(targetWords * 0.90));
    const maxWords = targetWords <= 80
      ? targetWords + 5
      : Math.round(targetWords * 1.10);
    const isMicroLength = targetWords <= 120;
    const isCompactLength = targetWords > 120 && targetWords <= 350;
    const useHooksBodyConclusion =
      includeHooksBodyConclusion !== false &&
      includeHooksBodyConclusion !== "false";

    // Generate ONLY the single language selected in Transformation Option
    const selectedTransformation =
      typeof transformation === "string" && transformation.trim()
        ? transformation.trim()
        : typeof language === "string" && language.trim()
        ? language.trim()
        : "urdu-roman";

    const selectedLangMeta = SCRIPT_LANGUAGE_MAP[selectedTransformation] || {
      name: selectedTransformation,
      script: `${selectedTransformation} script`,
      isRTL: false,
    };

    const generateForTransformation = async (transOpt: string) => {
      const isIslamic = (topicNiche && topicNiche.toLowerCase().includes("islamic")) || 
                        (tutorialTone && tutorialTone.toLowerCase().includes("islamic"));
      const islamicInstruction = isIslamic ? `
10. ISLAMIC CONTENT DIRECTION (CRITICAL):
    - Since the topic/category or tone is Islamic-related, integrate respectful Islamic terminologies, values, modest and humble wording, and phrases where appropriate (e.g., "Alhamdulillah", "InshaAllah", "MashaAllah", "SubhanAllah").
    - If referencing children, represent them as respectful, eager, and modest (e.g., studying Islamic values, wearing modest Islamic dress).
    - If referencing adults, represent them as respectful, modest, and knowledgeable (e.g., wearing traditional Islamic attire, seeking or teaching religious/historical knowledge).
` : "";

      const sectionStructureRule = !useHooksBodyConclusion
        ? `     HOOKS, BODY & CONCLUSION STRUCTURE IS DISABLED (OFF):
     - Do NOT divide the output into "Section 1...", "Hook", "Body", or "Conclusion" blocks or headings.
     - Do NOT add an opening hook line, intro setup, or closing conclusion/CTA.
     - Deliver clean, continuous voiceover body paragraphs directly explaining the core content from start to finish without asterisks (*), hash symbols (#), or brackets ().`
        : isMicroLength
        ? `     SHORT-SCRIPT HOOK, BODY & CONCLUSION ARC (TARGET = ${targetWords} WORDS TOTAL):
     - Follow a crisp 3-beat narrative flow INSIDE the strict ${targetWords}-word total: (1) concise opening Hook, (2) focused Core Body insight, and (3) brief Conclusion takeaway.
     - Keep prose seamless WITHOUT adding long "Section 1 – ..." header lines that consume your ${targetWords}-word budget. Do NOT use asterisks (*), hash symbols (#), or brackets ().`
        : isCompactLength
        ? `     Organize cleanly with explicit localized headings covering Hook, Body, and Conclusion (2–3 compact sections total) while keeping total words strictly within ${minWords}–${maxWords} words:
     • First section: Hook / Introduction
     • Middle section: Core Body
     • Final section: Conclusion
     Every section title must be plain text written ENTIRELY IN THE TARGET LANGUAGE (${transOpt}) without asterisks (*), hash symbols (#), brackets, or bullets.`
        : `     You MUST organize the script into distinct, well-structured Hook, Body, and Conclusion sections.
     EVERY section MUST start with a clean, plain text descriptive title written ENTIRELY IN THE TARGET LANGUAGE (${transOpt}).
     Both the section prefix ("Section N – " / "سیکشن N – " / "सेक्शन N – ") AND the descriptive topic title MUST MATCH the selected output language ("${transOpt}") in script, vocabulary, and phrasing.

     EXACT LANGUAGE-SPECIFIC EXAMPLES:
     • English ("english"):
       Section 1 – Hook
       Section 2 – Benefits of Water
       Section 3 – Importance of Hydration
       Section 4 – Common Mistakes
       Section 5 – Practical Tips
       Section 6 – Conclusion

     • Urdu Script ("urdu-writing"):
       سیکشن 1 – ہک / تعارف
       سیکشن 2 – پانی کے فوائد
       سیکشن 3 – جسم میں پانی کی اہمیت
       سیکشن 4 – عام غلطیاں
       سیکشن 5 – عملی مشورے
       سیکشن 6 – نتیجہ

     • Hindi Devanagari Script ("hindi"):
       सेक्शन 1 – हुक / परिचय
       सेक्शन 2 – पानी के फायदे
       सेक्शन 3 – शरीर में पानी का महत्व
       सेक्शन 4 – आम गलतियाँ
       सेक्शन 5 – उपयोगी सुझाव
       सेक्शन 6 – निष्कर्ष

     • Roman Urdu ("urdu-roman"):
       Section 1 – Hook / Ta'aruf
       Section 2 – Pani ke Fawaid
       Section 3 – Jism mein Pani ki Ahmiyat
       Section 4 – Aam Ghaltiyan
       Section 5 – Amali Mashwaray
       Section 6 – Natija

     • Other / Future Languages:
       Dynamically localize both the section prefix word (e.g., Section / سیکشن / सेक्शन / Sezione / Sección) and the descriptive topic title into natural, native-quality phrasing matching that language.

     MANDATORY LANGUAGE-AWARE HEADING RULES:
     a) Every section heading MUST match the selected output language ("${transOpt}"). Automatically generate and translate both the section prefix and topic title in native-quality phrasing appropriate for "${transOpt}".
     b) Hook / Introduction Heading: First section MUST open with the Hook (e.g. "Section 1 – Hook", "سیکشن 1 – ہک / تعارف", "सेक्शन 1 – हुक / परिचय", "Section 1 – Hook / Ta'aruf").
     c) Body Headings: Generate unique, contextually accurate section titles summarizing each main body segment in the target language.
     d) Conclusion Heading: Final section MUST clearly conclude the script (e.g. "Section X – Conclusion", "سیکشن X – نتیجہ", "सेक्शन X – निष्कर्ष", "Section X – Natija").
     e) STRICT FORMATTING CLEANLINESS: Do NOT use asterisks (*), hash symbols (#), markdown bold/italics, brackets (parentheses () or square brackets []), bullets, or any other formatting symbols in the section headings or text. Output ONLY clean, plain text headings on their own line, followed by the polished paragraph.`;

      const ctaRule = !useHooksBodyConclusion
        ? `   - Conclusion/CTA Disabled: Do NOT append a concluding summary or a like/subscribe call-to-action at the end.`
        : isMicroLength
        ? `   - Keep the conclusion crisp and optional CTA ultra-brief (max 3–5 words like "Subscribe for more!") ONLY if it fits INSIDE the strict ${targetWords}-word total limit. NEVER exceed ${maxWords} total words.`
        : `   - At the very end of the Conclusion/outro section (counted INSIDE your ${targetWords}-word budget), include the subscription call-to-action adapted to the selected language:
     * If the selected transformation option is "urdu-writing": "دوستو اگر ویڈیو پسند آئی ہو تو اسے لائک کریں اور ایسی مزید معلوماتی ویڈیوز کے لیے ہمارے چینل کو سبسکرائب ضرور کریں اور بیل آئیکن دبانا مت بھولیے گا۔"
     * If the selected transformation option is "hindi": "दोस्तों अगर वीडियो पसंद आई हो तो इसे लाइक करें और ऐसी मज़ीद मालूमती वीडियोज़ के लिए हमारे चैनल को सब्सक्राइब ज़रूर करें और बेल आइकन दबाना मत भूलिए गा।"
     * If the selected transformation option is "urdu-roman": "Dosto agar video pasand aayi ho to ise like karein aur aisi mazeed malumaati videos ke liye humare channel ko subscribe zaroor karein aur bell icon dabana mat bhooliyega."
     * If the selected transformation option is "english": "Friends, if you liked this video, please like it, and for more informative videos like this, be sure to subscribe to our channel and don't forget to press the bell icon."
     * For any other selected transformation option ("${transOpt}"): Translate and adapt that exact subscription call-to-action naturally into ${selectedLangMeta.name} (${selectedLangMeta.script}).`;

      const nicheDirective = resolveNicheDirective(topicNiche);
      const systemInstruction = `
You are an elite, professional Script Automation Engineer and Creative Rephraser.
Your goal is to completely transform the user's RAW input script into a pristine, high-engagement, 100% unique, plagiarism-free script for social media (YouTube, Facebook, etc.).

Strict rules for formatting and content:
1. Avoid plagiarism. Rephrase every single sentence using the best possible wording, vocabulary, and sentence structures. Never copy phrases verbatim from the raw input unless they are highly specific medical/scientific names that cannot be translated or rephrased.
2. Respect the VOICE PERSONA (Speaker) and GENDER persona:
   - Voice Persona: ${voicePersona.toUpperCase()}
   - If Female: Use female grammatical conjugations, vocabulary, and styling (e.g. in Hindi/Urdu, use feminine gender verbs/pronouns like "kartii hoon", "rahii hoon", "merii", "jaungii", "sikhayungii"; in English, use warm, welcoming, friendly, empathetic, and inclusive vocabulary).
   - If Male: Use male grammatical conjugations, vocabulary, and styling (e.g. in Hindi/Urdu, use masculine gender verbs/pronouns like "karta hoon", "raha hoon", "mera", "jaunga", "sikhayunga"; in English, use confident, authoritative, energetic, and direct vocabulary).
3. Apply the TRANSFORMATION option:
   - Option selected: "${transOpt}"
    - If "hindi": Translate/Rephrase entirely into Devanagari script (Hindi characters/writing). It MUST be written exactly in beautiful Hindi script (e.g. "अस्सलामु अलैकुम", "दोस्तों", "ज़िंदगी", "मुहब्बत", "ख़ुशामदीद", "शुक्रिया", "जनाब", "क्या आप जानते हैं", "आज हम बात करेंगे"). It is STRICTLY FORBIDDEN to use Roman Urdu or Latin letters for this option. The script must be in Devanagari characters but utilizing 100% beautiful spoken Urdu vocabulary, elegant Urdu sentence structures, and refined Urdu phonetic cadence. You MUST completely avoid pure, formal, or Sanskritized Hindi words (e.g., do NOT use 'नमस्ते', 'स्वागत', 'विषय', 'मित्र', 'सफलता', 'धन्यवाद', 'जीवन', 'ज्ञान', 'प्रयास', 'समय', 'महत्वपूर्ण', 'आवश्यकता', 'शिक्षक', 'कठिन', 'सरल', 'प्रश्न', 'उत्तर', 'विश्वास'). Instead, you MUST use their direct spoken Urdu equivalents written in Devanagari script: use 'अस्सलामु अलैकुम' instead of 'नमस्ते', 'ख़ुशामदीद' instead of 'स्वागत', 'दोस्तों'/'अज़ीज़ साथियों' instead of 'मित्रों', 'ज़िंदगी' instead of 'जीवन', 'इल्म'/'जानकारी' instead of 'ज्ञान', 'कोशिश' instead of 'प्रयास', 'वक़्त' instead of 'समय', 'ज़रूरी' instead of 'महत्वपूर्ण'/'आवश्यक', 'मुश्किल' instead of 'कठिन', 'आसान' instead of 'सरल', 'सवाल' instead of 'प्रश्न', 'जवाब' instead of 'उत्तर', 'यक़ीन' instead of 'विश्वास', 'कामयाबी' instead of 'सफलता', 'सफ़ر' instead of 'यात्रा', and 'शुक्रिया' instead of 'धन्यवाद'. The output must sound 100% like elegant spoken Urdu with a beautiful Urdu pronunciation, feelings, accent, and rhythm when read aloud, but written perfectly in Devanagari (Hindi) letters. Maintain highly natural video-script flow with warm, high-engagement phrasing.
   - If "urdu-roman": Translate/Rephrase entirely into Urdu written in Roman letters (e.g., "Assalamu Alaikum dosto, aaj hum baat karenge..."). Use conversational, native, and easy-to-read Roman Urdu wording.
   - If "english": Translate/Rephrase entirely into fluent, highly engaging English.
   - If "urdu-writing": Translate/Rephrase entirely into beautiful, professional Urdu script (Nastaliq/Arabic script, using proper Urdu characters) in the authentic Pakistani Urdu language. You must use rich, elegant Pakistani Urdu vocabulary and proper Urdu Nastaliq punctuation, phrasing, and sentence structures. It is strictly forbidden to use English or Hindi words where proper Urdu equivalents exist. The output script must flow beautifully and natively in proper Urdu.
   - If "${transOpt}" is any other language (${selectedLangMeta.name}): Translate/Rephrase 100% into fluent, native-quality ${selectedLangMeta.name} written strictly in ${selectedLangMeta.script}. Do NOT mix in other languages unless specific medical/scientific terms cannot be translated. Ensure natural spoken cadence and conversational flow for voiceover delivery in ${selectedLangMeta.name}.
4. Adapt perfectly to the TARGET AUDIENCE (CRITICAL — GENERATED TEXT MUST STRICTLY MATCH THIS DEMOGRAPHIC):
   - Selected Audience Tier: "${getTargetAudienceDirective(targetAudience).label}" (ID: "${targetAudience || "all"}")
   - ${getTargetAudienceDirective(targetAudience).directive}
5. Tone / Niche Theme:
   - Topic Niche: "${nicheDirective.promptText}"
   - Tutorial & Literature Tone: "${tutorialTone}"
   - Align the rhythm, vocabulary, and metaphors with this ${nicheDirective.isAuto ? "topic's natural domain" : "category"}.
6. EXACT TARGET WORD COUNT ENFORCEMENT (HARD LIMIT — CRITICAL):
   - Exact Target Word Count: ${targetWords} words (HARD ALLOWED RANGE: ${minWords} to ${maxWords} words TOTAL).
   - Every word in your entire response (greeting + hook + body + outro) counts toward this ${targetWords}-word total.
   - DO NOT EXCEED ${maxWords} WORDS and DO NOT FALL BELOW ${minWords} WORDS.
   - If the raw source script is longer than ${targetWords} words (for example, raw input is 200+ words and target is ${targetWords} words), you MUST aggressively distill and summarize ONLY the single core point into a crisp, complete ${targetWords}-word script.
   - If the raw source script is shorter than ${targetWords} words, expand thoughtfully just until you hit ~${targetWords} words and STOP.
7. Structure, Hooks, and Formatting:
   - Include Hooks, Body & Conclusion Toggle: ${useHooksBodyConclusion ? "ENABLED (MUST include Hook + Body + Conclusion)" : "DISABLED (Continuous direct body narration only — NO hook, NO section headings, NO conclusion)"}
   - Custom Hook requested: "${!useHooksBodyConclusion ? "Disabled (do NOT include a hook)" : isMicroLength ? (customHook ? `${customHook} (keep ultra-short to fit ${targetWords}-word total)` : "Auto compelling 1-line hook") : (customHook || "Auto compelling hook")}"
   - Greetings Prefix: "${greetingsPrefix || "None"}"
${sectionStructureRule}
   - Incorporate the greeting "${greetingsPrefix && greetingsPrefix !== "None" ? greetingsPrefix : ""}"${isMicroLength ? " (concisely if word budget allows)" : ""}${useHooksBodyConclusion ? " and opening hook naturally." : " (if selected), then move straight into the body content without a hook or conclusion."}
${ctaRule}

8. ABSOLUTE DIVERSITY REQUIREMENT:
   - Introduce a totally fresh, unique perspective, phrasing style, and layout for this script. Do not reuse similar phrasing patterns or sentence structures from previous generations. Every generation must be highly dynamic and unique.
   - Internal Entropy Seed: ${Math.random().toString(36).substring(2, 10)}

9. TARGET REGIONS / COUNTRIES COMPLIANCE:
   - Selected Target Regions/Countries: ${selectedCountries && selectedCountries.length > 0 ? selectedCountries.join(", ") : "Global audience"}
   - If specific countries or regions are selected, customize cultural references, local context, statistics, examples, and vocabulary for native populations of those regions (while strictly staying within the ${targetWords}-word total budget).

${islamicInstruction}

Ensure the output is strictly the polished script itself, completely ready to read or perform, containing zero meta-commentary, zero word-count notes, and zero "Sure, here is your script" preamble. Just output the final polished script.
`;

      const structureDirectivePrompt = useHooksBodyConclusion
        ? isMicroLength
          ? `STRUCTURE REQUIREMENT (ON): Open with a brief Hook${customHook ? ` ("${customHook}")` : ""}, deliver the core Body point, and end with a concise Conclusion — all strictly inside ${targetWords} words.`
          : `STRUCTURE REQUIREMENT (ON): Organize with explicit plain-text headings localized in ${selectedLangMeta.name} covering Section 1 (Hook), Body sections, and Final Section (Conclusion + CTA).`
        : `STRUCTURE REQUIREMENT (OFF): Write strictly as continuous direct body narration. Do NOT include any Hook, do NOT add "Section 1..." headings, and do NOT add any Conclusion or subscribe CTA.`;

      const prompt = `
Please rephrase and transform the following raw source script into EXACTLY ${targetWords} words (strict range: ${minWords}–${maxWords} words total).
${structureDirectivePrompt}

RAW SOURCE SCRIPT:
"""
${rawScript}
"""

Ensure the output is 100% plagiarism-free, customized for a ${voicePersona} speaker, written in the "${transOpt}" format, strictly tailored for the target audience "${getTargetAudienceDirective(targetAudience).label}", ${nicheDirective.isAuto ? "automatically aligned to the topic/subject of the source script" : `following the "${nicheDirective.label}" niche`} and "${tutorialTone}" tone, respects the structure mode above, and hits the exact word count target of ${targetWords} words (${minWords}–${maxWords} words).
`;

      const genResult = await executeMultiProviderGeneration({
        prompt,
        systemInstruction,
        model: modelToUse,
        temperature: 0.78,
        userAiClient: ai,
        providerConfig,
        fallbackApiKey: req.userApiKey,
      });

      let bestText = genResult.text.trim();
      let bestCount = countScriptWords(bestText);

      // Post-generation length verification & auto-correction pass (up to 2 passes for targets <= 2500 words)
      if (targetWords <= 2500 && bestText && (bestCount < minWords || bestCount > maxWords)) {
        for (let pass = 0; pass < 2; pass++) {
          if (bestCount >= minWords && bestCount <= maxWords) break;
          const isOver = bestCount > maxWords;
          const diff = Math.abs(bestCount - targetWords);
          const adjustPrompt = `
You are an exact text editor. The script draft below currently has ${bestCount} words, which is ${isOver ? `TOO LONG by ~${diff} words` : `TOO SHORT by ~${diff} words`}.

REQUIRED STRICT WORD COUNT: EXACTLY ${targetWords} words (MUST be strictly between ${minWords} and ${maxWords} words TOTAL).
LANGUAGE / SCRIPT: ${selectedLangMeta.name} (${selectedLangMeta.script}) — Option "${transOpt}".
VOICE PERSONA: ${voicePersona.toUpperCase()}.
${structureDirectivePrompt}

CURRENT DRAFT (${bestCount} words):
"""
${bestText}
"""

Rewrite the draft keeping the exact same language (${selectedLangMeta.name}), voice persona, structure mode, and core message, ${isOver ? "tightly trimming extra words/sentences" : "smoothly expanding with relevant detail"} until the FINAL output has ${targetWords} words (between ${minWords} and ${maxWords} words total).
CRITICAL: Do NOT include word counts, notes, asterisks (*), markdown, or explanations. Output ONLY the edited script text itself.
`;
          try {
            const adjusted = await executeMultiProviderGeneration({
              prompt: adjustPrompt,
              model: modelToUse,
              temperature: 0.4,
              userAiClient: ai,
              providerConfig,
              fallbackApiKey: req.userApiKey,
            });
            const candidate = adjusted.text.trim();
            if (candidate) {
              const candidateCount = countScriptWords(candidate);
              if (Math.abs(candidateCount - targetWords) < Math.abs(bestCount - targetWords)) {
                bestText = candidate;
                bestCount = candidateCount;
              }
            }
          } catch (adjErr) {
            logSafeError("Length adjustment pass warning:", adjErr);
            break;
          }
        }
      }

      return bestText;
    };

    // Execute only the single selected transformation to maximize speed and minimize token usage
    let generatedText = "";
    try {
      generatedText = await generateForTransformation(selectedTransformation);
    } catch (err: any) {
      logSafeError(`Error generating transformation "${selectedTransformation}":`, err);
      const provider = req.providerConfig?.provider || "gemini";
      return res.status(500).json({ error: `Error generating transform: ${formatProviderErrorMessage(provider, err)}` });
    }

    res.json({
      rawInput: rawScript,
      polishedScript: generatedText,
      polishedScripts: { [selectedTransformation]: generatedText },
      transformation: selectedTransformation,
      modelUsed: modelToUse,
      wordCountTarget: targetWords,
      wordCountActual: countScriptWords(generatedText),
    });
  } catch (error: any) {
    logSafeError("Error in /api/generate:", error);
    res.status(500).json({ error: "An unexpected error occurred during generation." });
  }
});

// Generate a script draft based on a Topic & Word Count limit
app.post("/api/generate-topic", verifyUserAuth as express.RequestHandler, aiBurstLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const { topic, wordCount, targetAudience, topicNiche, tutorialTone } = req.body;
    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required." });
    }
    if (topic.length > 1000) {
      return res.status(400).json({ error: "Topic exceeds the maximum limit of 1,000 characters." });
    }
    const rawWordCount = parseInt(wordCount, 10);
    const targetWords = isNaN(rawWordCount) ? 300 : Math.min(5000, Math.max(15, rawWordCount));
    const minWords = targetWords <= 80 ? Math.max(8, targetWords - 5) : Math.max(15, Math.round(targetWords * 0.90));
    const maxWords = targetWords <= 80 ? targetWords + 5 : Math.round(targetWords * 1.10);
    const audienceInfo = getTargetAudienceDirective(targetAudience);

    const ai = req.userAiClient;
    const modelToUse = req.body.model || "gemini-3.1-flash-lite";
    const providerConfig = req.providerConfig || resolveRequestProviderConfig(req, req.userApiKey);

    const topicNicheInfo = resolveNicheDirective(topicNiche);
    const result = await executeMultiProviderGeneration({
      prompt: `Generate a detailed, high-quality script on the topic: "${topic.slice(0, 1000)}".
STRICT WORD COUNT REQUIREMENT: Write EXACTLY ${targetWords} words (total output MUST be between ${minWords} and ${maxWords} words — do NOT exceed ${maxWords} words).
Target Niche/Domain: "${topicNicheInfo.promptText}"
Tone/Vibe: "${(tutorialTone || "Warm Friendly Conversational").slice(0, 100)}"
${audienceInfo.directive}
Adapt the vocabulary, sentence pacing, examples, and tone specifically for "${audienceInfo.label}". Write directly as clean raw content ready for voiceover and script transformation. Return ONLY the script text itself with no preamble or word count note.`,
      model: modelToUse,
      userAiClient: ai,
      providerConfig,
      fallbackApiKey: req.userApiKey,
    });

    let bestTopicText = result.text.trim();
    let bestTopicCount = countScriptWords(bestTopicText);
    if (targetWords <= 2500 && bestTopicText && (bestTopicCount < minWords || bestTopicCount > maxWords)) {
      try {
        const adjusted = await executeMultiProviderGeneration({
          prompt: `Edit the following script draft (currently ${bestTopicCount} words) so it has EXACTLY ${targetWords} words (strictly between ${minWords} and ${maxWords} words total). Keep the same topic and tone. Return ONLY the final script text.\n\n"""\n${bestTopicText}\n"""`,
          model: modelToUse,
          temperature: 0.4,
          userAiClient: ai,
          providerConfig,
          fallbackApiKey: req.userApiKey,
        });
        const candidate = adjusted.text.trim();
        if (candidate && Math.abs(countScriptWords(candidate) - targetWords) < Math.abs(bestTopicCount - targetWords)) {
          bestTopicText = candidate;
        }
      } catch (adjErr) {
        logSafeError("Topic word count adjustment warning:", adjErr);
      }
    }

    res.json({ rawScript: bestTopicText, modelUsed: result.modelUsed, providerUsed: result.providerUsed });
  } catch (error: any) {
    logSafeError("Error in /api/generate-topic:", error);
    const provider = req.providerConfig?.provider || "gemini";
    res.status(500).json({ error: formatProviderErrorMessage(provider, error) });
  }
});

// Extract clean word-by-word spoken transcript from Video URL via Gemini
app.post("/api/extract-transcript", verifyUserAuth as express.RequestHandler, aiBurstLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const { url, mode } = req.body;
    if (!url || typeof url !== "string" || !url.trim()) {
      return res.status(400).json({ error: "URL is required." });
    }

    // SSRF and DNS Rebinding Protection
    const urlValidation = await validateSafeExternalUrl(url);
    if (!urlValidation.valid) {
      return res.status(400).json({ error: urlValidation.error || "Invalid or restricted URL." });
    }
    const safeUrl = urlValidation.sanitizedUrl || url.trim();

    const providerConfig = req.providerConfig || resolveRequestProviderConfig(req, req.userApiKey);
    const modelToUse = req.body.model || "gemini-3.1-flash-lite";
    const ai = req.userAiClient;

    let prompt = "";
    if (mode === "gemini") {
      prompt = `You are an expert content creator, AI transcriber, and scriptwriter.
We have a social media video link: "${safeUrl}".
Based on the URL structure, keywords, handles, usernames, video ID, slug, and topic indicators found in this link, generate/reconstruct the complete, high-quality, word-for-word spoken transcript of this video.
Rules:
- Generate a highly realistic, full-length spoken transcript as if it were spoken word-for-word in the video.
- The tone should be engaging, polished, and match the target content category indicated by the URL.
- DO NOT include timestamps, speaker labels (e.g. "[Speaker 1]", "Joe:"), or video descriptions.
- DO NOT write any meta-introductions or commentary.
- Return ONLY the clean transcript text, starting directly with the spoken dialogue.`;
    } else {
      prompt = `You are an advanced video transcribing and content generation agent. Given this video/social media URL: "${safeUrl}", use your web browsing tool and url context tool to access the URL if possible and retrieve or reconstruct the complete, high-quality, word-for-word spoken transcript of the video.
If direct transcription is restricted, extract metadata from the page structure, usernames, handles, keywords, video ID, or slug keywords, and reconstruct an incredibly natural, high-quality, word-for-word spoken transcript of this video (such as an educational tutorial, medical advice, culinary vlog, or documentary).
Ensure the transcript has a native human conversational feel with clear hooks and transitions.
Return ONLY the clean, word-by-word spoken transcript text with NO speaker tags, timestamps, meta-introductions, descriptions, or surrounding commentary. Start directly with the spoken dialogue.`;
    }

    let transcript = "";
    if (providerConfig.provider === "gemini" && ai && mode !== "gemini") {
      try {
        console.log("Calling Antigravity Agent for transcript extraction of URL:", safeUrl);
        const interaction = await ai.interactions.create({
          agent: "antigravity-preview-05-2026",
          input: prompt,
          environment: "remote",
          tools: [
            { type: "google_search" },
            { type: "url_context" }
          ]
        }, { timeout: 300000 });
        transcript = (interaction.output_text || "").trim();
      } catch (apiError: any) {
        console.warn("Antigravity agent failed or not allowed, falling back to multi-provider generation:", apiError);
      }
    }

    if (!transcript) {
      const genResult = await executeMultiProviderGeneration({
        prompt,
        model: modelToUse,
        userAiClient: ai,
        providerConfig,
        fallbackApiKey: req.userApiKey,
      });
      transcript = genResult.text;
    }

    if (!transcript || transcript.length < 5) {
      return res.status(400).json({ error: "Unable to extract video transcript. Please check the URL or your active AI provider." });
    }

    // This endpoint never downloads captions or audio: the model only sees the URL text. What comes back
    // is an AI reconstruction, not the real spoken transcript, so tell the client to say so.
    res.json({
      transcript,
      reconstructed: true,
      notice:
        "AI-reconstructed from the link's wording (title/handle/slug), NOT the video's real captions. Paste the real transcript for faithful rewriting.",
    });
  } catch (error: any) {
    logSafeError("Error in /api/extract-transcript:", error);
    const provider = req.providerConfig?.provider || "gemini";
    res.status(400).json({ error: formatProviderErrorMessage(provider, error) });
  }
});

// Parse File (.txt or PDF) using configured AI provider (PDF vision requires Gemini)
app.post("/api/parse-file", verifyUserAuth as express.RequestHandler, aiBurstLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const { fileName, fileType, fileData } = req.body;
    if (!fileData || typeof fileData !== "string") {
      return res.status(400).json({ error: "File data is required." });
    }

    // Clean and sanitize file name (prevent path traversal or header injection)
    const sanitizedFileName = typeof fileName === "string" 
      ? path.basename(fileName).slice(0, 100) 
      : "document";

    // Clean base64 string
    const rawBase64 = fileData.includes(",") ? fileData.split(",")[1] : fileData;
    
    // Prevent oversized base64 payloads from memory-intensive processing (5MB limit)
    if (rawBase64.length > 7 * 1024 * 1024) {
      return res.status(400).json({ error: "File payload exceeds the 5MB size limit." });
    }

    const buffer = Buffer.from(rawBase64, "base64");
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "Decoded file exceeds the 5MB size limit." });
    }

    const providerConfig = req.providerConfig || resolveRequestProviderConfig(req, req.userApiKey);
    const modelToUse = req.body.model || "gemini-3.1-flash-lite";
    const isPdf = Boolean(fileType && fileType.includes("pdf")) || sanitizedFileName.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      const magic = buffer.subarray(0, 5).toString("ascii");
      if (!magic.startsWith("%PDF")) {
        return res.status(400).json({ error: "Invalid PDF format. File header does not match PDF specification (%PDF-)." });
      }

      const standaloneGeminiEnv = sanitizeApiKey(process.env.GEMINI_API_KEY);
      if (!req.userAiClient && !standaloneGeminiEnv) {
        return res.status(400).json({
          error: "PDF binary extraction requires a valid Google Gemini API key. For Local Engine / OpenAI / Claude, please upload a .txt file or paste the text directly.",
        });
      }

      const geminiConfig: AIProviderConfig = providerConfig.provider === "gemini"
        ? providerConfig
        : { provider: "gemini", apiKey: standaloneGeminiEnv, allowEnvFallback: true };

      const result = await executeMultiProviderGeneration({
        prompt: "Extract and return the full text content of this PDF file.",
        contentsParts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: buffer.toString("base64"),
            },
          },
          {
            text: "Extract and return the full text content of this PDF file. Do not summarize or rewrite, just return the complete readable text. If there is no text, describe the visual tables/data.",
          },
        ],
        model: modelToUse,
        userAiClient: req.userAiClient,
        providerConfig: geminiConfig,
        fallbackApiKey: req.userApiKey,
      });

      return res.json({ extractedText: result.text });
    } else {
      const sample = buffer.subarray(0, Math.min(buffer.length, 1024));
      let nullByteCount = 0;
      for (let i = 0; i < sample.length; i++) {
        if (sample[i] === 0) nullByteCount++;
      }
      if (nullByteCount > 2) {
        return res.status(400).json({ error: "Invalid text file format. Binary content detected." });
      }

      const plainText = buffer.toString("utf-8");
      const cappedText = plainText.slice(0, 100000);
      const result = await executeMultiProviderGeneration({
        prompt: `Extract and return the full text content of this document:\n\n${cappedText}`,
        model: modelToUse,
        userAiClient: req.userAiClient,
        providerConfig,
        fallbackApiKey: req.userApiKey,
      });

      return res.json({ extractedText: result.text });
    }
  } catch (error: any) {
    logSafeError("Error in /api/parse-file:", error);
    const provider = req.providerConfig?.provider || "gemini";
    res.status(500).json({ error: formatProviderErrorMessage(provider, error) });
  }
});

// Divide Transcript into scenes and generate Text-to-Video prompts for each
app.post("/api/generate-scenes", verifyUserAuth as express.RequestHandler, aiBurstLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const { transcript, numScenes, category, format, promptLineCount } = req.body;
    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return res.status(400).json({ error: "Transcript is required." });
    }
    if (transcript.length > 100000) {
      return res.status(400).json({ error: "Transcript exceeds the maximum length limit of 100,000 characters." });
    }
    const count = parseInt(numScenes) || 10;
    const catInfo = resolveNicheDirective(category);
    const cat = catInfo.promptText;
    const linesCount = Math.min(50, Math.max(3, parseInt(promptLineCount) || 15));

    const ai = req.userAiClient!;
    
    const formatInstruction = (format && format !== "none") ? `Ensure the scenes and video prompts are strictly designed and described for a ${format === "16:9" ? "Horizontal (16:9) widescreen landscape" : format === "9:16" ? "Vertical (9:16) portrait format (for Shorts/Reels/TikTok)" : "Square (1:1) format"} aspect ratio. Incorporate appropriate framing, blocking, camera movement guidelines, and vertical/horizontal composition descriptions that match this specific format (e.g., center framing and close-ups for 9:16, wide panoramic views and cinematic horizon lines for 16:9).` : "";

    const isIslamic = (cat && cat.toLowerCase().includes("islamic")) || 
                      (transcript && transcript.toLowerCase().includes("islamic"));
                      
    const islamicSceneInstruction = isIslamic ? `
   - Since the topic/category is Islamic-related, ensure that all visual scene prompts describe characters in proper traditional Islamic attire. 
   - For children characters, explicitly describe them as wearing modest Islamic dress (e.g., boys wearing clean traditional dress or prayer caps/kurta, girls wearing elegant headscarves/hijabs/modest clothing).
   - For adult characters, describe them wearing traditional Islamic religious attire (e.g., modest clothing, long elegant robes/abayas, hijabs/headscarves for women, clean traditional attire/kurtas and prayer caps or neat beards for men).
   - Visual descriptions should reflect a respectful, peaceful, and clean Islamic environment (e.g., beautiful Islamic architectures, mosques, clean peaceful homes, or serene natural backgrounds).
` : "";

    const prompt = `
You are an award-winning cinematic director and AI prompt engineer specializing in Text-to-Video models (Veo 3, Wan 2.2, Sora).
Your task is to:
1. Read the provided TRANSCRIPT below.
2. Divide it logically into exactly ${count} chronological scenes.
3. For each scene, write one highly cinematic, extremely detailed, and professional Text-to-Video generation prompt in English.
   CRITICAL PROMPT DEPTH & LINE COUNT REQUIREMENT:
   The user explicitly configured PROMPT LINES = ${linesCount}.
   Therefore, the "text" for EACH scene MUST consist of EXACTLY ${linesCount} distinct descriptive lines (separated by newline line breaks \\n).
   Each of the ${linesCount} lines must exhaustively detail a specific visual layer of the scene:
   - Line 1: Primary subject appearance, wardrobe, posture, and core physical action.
   - Line 2: Exact camera lens, focal length, angle, and framing (e.g. 35mm anamorphic close-up, Dutch angle, wide panoramic establishing view).
   - Line 3: Dynamic camera movement, velocity, and trajectory (e.g. slow steady push-in, low-angle tracking orbit, crane tilt down).
   - Line 4: Primary lighting setup (e.g. soft volumetric amber rim light, high-contrast chiaroscuro, natural golden hour backlight).
   - Line 5: Color grading, film stock saturation, and palette (e.g. rich cinematic teal & orange, muted Kodak 5219 tones).
   - Line 6: Atmospheric conditions, environmental haze, weather, and airborne particles (e.g. ambient dust motes, light mist, rain-slicked ground reflections).
   - Line 7: Character micro-expressions, eye reflections, subtle gestures, and emotional intensity.
   - Line 8: Foreground layering and occlusion elements (e.g. out-of-focus foliage, doorframe silhouette).
   - Line 9: Midground action and interaction with surrounding props or environment.
   - Line 10: Background architecture, horizon line, environmental scale, and secondary movement.
   - Line 11: Real-world surface textures (e.g. weathered concrete, condensation droplets, metallic brushed finish, rough fabric).
   - Line 12: Particle physics and movement (e.g. swirling fabric, rising steam, sparks, blowing hair in breeze).
   - Line 13: Depth of field and bokeh character (e.g. shallow f/1.8 bokeh, crystalline focus plane).
   - Line 14: Cinematic composition rules (e.g. rule of thirds, leading lines, golden ratio framing).
   - Line 15 (and additional lines up to ${linesCount}): Shutter angle, motion blur simulation, and photorealistic 8K render finish.

4. Each scene prompt must:
   - Be optimized for modern video generators like Veo 3 and Wan 2.2.
   - Be EXACTLY aligned with the category field: "${cat}". Do not deviate or add unrelated themes.
   - ${formatInstruction}
   - ${islamicSceneInstruction}
   - Ensure the visuals in each scene strictly match and visually represent the corresponding part of the transcript.
   - Maintain perfect character, environment, and visual consistency across all scenes.
   - Provide clean multi-line text separated by newlines (\\n) with exactly ${linesCount} lines of content. Do NOT include "Scene X:" label or "Line N:" numerical prefixes inside the "text" field itself.

TRANSCRIPT:
"""
${transcript}
"""

You MUST output exactly ${count} scenes. Return the output as a JSON object matching this schema:
{
  "scenes": [
    {
      "id": 1,
      "text": "Line 1 visual description...\\nLine 2 camera lens...\\n...\\nLine ${linesCount} finish..."
    }
  ]
}
`;

    const providerConfig = req.providerConfig || resolveRequestProviderConfig(req, req.userApiKey);
    const jsonSchema = {
      type: Type.OBJECT,
      properties: {
        scenes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              text: { type: Type.STRING }
            },
            required: ["id", "text"]
          }
        }
      },
      required: ["scenes"]
    };

    const genResult = await executeMultiProviderGeneration({
      prompt,
      responseMimeType: "application/json",
      jsonSchema,
      model: req.body.model || "gemini-3.1-flash-lite",
      userAiClient: ai,
      providerConfig,
      fallbackApiKey: req.userApiKey,
    });

    const parsedScenes = extractJsonObject(genResult.text);
    const data = Array.isArray(parsedScenes?.scenes) ? parsedScenes : { scenes: [] };

    res.json(data);
  } catch (error: any) {
    logSafeError("Error in /api/generate-scenes:", error);
    const provider = req.providerConfig?.provider || "gemini";
    res.status(500).json({ error: formatProviderErrorMessage(provider, error) });
  }
});

// Regenerate single scene prompt
app.post("/api/regenerate-scene", verifyUserAuth as express.RequestHandler, aiBurstLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const { transcript, sceneNumber, totalScenes, category, previousPrompt, format, promptLineCount } = req.body;
    if (transcript && typeof transcript === "string" && transcript.length > 100000) {
      return res.status(400).json({ error: "Transcript exceeds the maximum length limit of 100,000 characters." });
    }
    const ai = req.userAiClient!;
    const linesCount = Math.min(50, Math.max(3, parseInt(promptLineCount) || 15));

    const formatInstruction = (format && format !== "none") ? `Ensure this scene is strictly designed and described for a ${format === "16:9" ? "Horizontal (16:9) widescreen landscape" : format === "9:16" ? "Vertical (9:16) portrait format (for Shorts/Reels/TikTok)" : "Square (1:1) format"} aspect ratio.` : "";

    const isIslamic = (category && category.toLowerCase().includes("islamic")) || 
                      (transcript && transcript.toLowerCase().includes("islamic"));
                      
    const islamicSceneInstruction = isIslamic ? `
- Since the topic/category is Islamic-related, ensure that all visual scene prompts describe characters in proper traditional Islamic attire. 
- For children characters, explicitly describe them as wearing modest Islamic dress (e.g., boys wearing clean traditional dress or prayer caps/kurta, girls wearing elegant headscarves/hijabs/modest clothing).
- For adult characters, describe them wearing traditional Islamic religious attire (e.g., modest clothing, long elegant robes/abayas, hijabs/headscarves for women, clean traditional attire/kurtas and prayer caps or neat beards for men).
- Visual descriptions should reflect a respectful, peaceful, and clean Islamic environment (e.g., beautiful Islamic architectures, mosques, clean peaceful homes, or serene natural backgrounds).
` : "";

    const sceneNicheInfo = resolveNicheDirective(category);
    const prompt = `
You are an expert AI prompt engineer specializing in cinematic Text-to-Video models.
Regenerate Scene ${sceneNumber} out of ${totalScenes} for a storyboard with content category: "${sceneNicheInfo.promptText}".
${formatInstruction}
${islamicSceneInstruction}
Ensure this scene has smooth visual and narrative continuity with preceding and succeeding scenes based on the overall transcript.
Optimize it fully for Veo 3 and Wan 2.2 with detailed camera angles, lighting, actions, and consistent styling.

CRITICAL PROMPT DEPTH & LINE COUNT REQUIREMENT:
The user explicitly configured PROMPT LINES = ${linesCount}.
The regenerated prompt MUST consist of EXACTLY ${linesCount} distinct descriptive lines separated by newline breaks (\\n), exhaustively detailing every cinematic aspect (subject action, lens angle, camera trajectory, lighting setup, color palette, atmospheric particles, micro-gestures, textures, depth of field, and compositional rules).

Overall Transcript:
"""
${transcript}
"""

Previous scene prompt (for reference/improvement):
"${previousPrompt || ""}"

Please provide a fresh, significantly improved cinematic video generation prompt with exactly ${linesCount} lines separated by newlines (\\n).
Output ONLY the ${linesCount} lines of descriptive text itself with NO "Scene X:" label, NO "Line N:" prefixes, and NO introductory or concluding commentary. Just the direct prompt in English.
`;

    const providerConfig = req.providerConfig || resolveRequestProviderConfig(req, req.userApiKey);
    const genResult = await executeMultiProviderGeneration({
      prompt,
      model: req.body.model || "gemini-3.1-flash-lite",
      userAiClient: ai,
      providerConfig,
      fallbackApiKey: req.userApiKey,
    });

    res.json({ sceneText: genResult.text });
  } catch (error: any) {
    logSafeError("Error in /api/regenerate-scene:", error);
    const provider = req.providerConfig?.provider || "gemini";
    res.status(500).json({ error: formatProviderErrorMessage(provider, error) });
  }
});

// YouTube & Social Media Growth Strategist Metadata API
app.post("/api/generate-ctr", verifyUserAuth as express.RequestHandler, aiBurstLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      transcript,
      toggleTitle,
      toggleDescription,
      toggleTimestamps,
      toggleHashtags,
      toggleTags,
      videoDuration,
      targetAudience,
    } = req.body;

    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return res.status(400).json({ error: "Transcript is required." });
    }
    if (transcript.length > 100000) {
      return res.status(400).json({ error: "Transcript exceeds the maximum length limit of 100,000 characters." });
    }

    const ai = req.userAiClient!;
    const audienceInfo = getTargetAudienceDirective(targetAudience);
    
    // Construct dynamic prompt based on toggles
    const prompt = `
You are an elite YouTube & Social Media Growth Strategist and Metadata Optimization Expert.
Analyze the provided video transcript and generate optimized, high-performing metadata to achieve the maximum click-through-rate (CTR) and SEO.

TRANSCRIPT:
"""
${transcript}
"""

Video Duration: ${videoDuration || "10:00"}
Target Audience Demographic: ${audienceInfo.label} (${audienceInfo.directive})

Please generate only the requested metadata segments below (if set to true):
- Generate Title Options (titles): ${toggleTitle ? "YES" : "NO"}
- Generate SEO Description (description): ${toggleDescription ? "YES" : "NO"}
- Generate Timestamps (timestamps): ${toggleTimestamps ? "YES" : "NO"}
- Generate Hashtags (hashtags): ${toggleHashtags ? "YES" : "NO"}
- Generate SEO Tags (tags): ${toggleTags ? "YES" : "NO"}

Strict Requirements:
1. "titles": (If YES) Generate exactly 10 high-CTR title options.
   - Use power words: Secret, Exposed, Why, How, I Tried. Add [Brackets] if relevant.
   - Keep titles between 50-60 characters, utilizing curiosity gaps and putting high-value keywords first.
   - Provide titles categorized beautifully by language: English, Urdu, and Hindi. Separated clearly by language, NOT mixed.
2. "description": (If YES) SEO description of exactly 2 paragraphs.
   - First line must be a highly engaging hook.
   - Include high-traffic keywords and a clear Call-To-Action (CTA). No fluff.
   - POLICY AND MONETIZATION SAFETY COMPLIANCE (CRITICAL): Do NOT use sensitive, overly dramatic medical claims, pseudo-medical claims, or unverified scientific statements that violate monetization policies. Specifically:
     * NEVER claim quick cures or reverse-health milestones (e.g. do NOT use "in just three weeks", "rapidly reversing", "restoring crystal clear eyesight", "instant cure", "reverses diabetes").
     * NEVER claim direct biological cure/regulatory statements (e.g. do NOT write "works by regulating insulin resistance", "completely cures blood sugar spikes").
     * NEVER suggest bypassing standard healthcare or medications (e.g. do NOT write "without expensive medications", "avoid doctors", "alternatives to surgery").
     * Instead, frame all description insights safely and educationally, focusing on healthy habit discussions, scientific curiosity, educational exploration, and general lifestyle awareness. Use cautious, compliant, and supportive terminology.
3. "timestamps": (If YES) Chronological list of timestamps outlining the video progression.
   - Automatically detect topic shifts from the transcript.
   - Provide between 8 to 12 chronological chapters starting at "00:00".
   - Estimate the timestamp times proportionally based on the transcript's logical progression and total duration of "${videoDuration || "10:00"}".
   - Each timestamp must be an object with keys: "time" (e.g., "02:14") and "label" (e.g., "Topic Shift Label").
4. "hashtags": (If YES) Exactly 15 high-ranking YouTube hashtags, each starting with the '#' symbol.
5. "tags": (If YES) Exactly 15 highly-optimized SEO tags, returned as an array of comma-separated keyword strings.

All content must be 100% based on the transcript with NO hallucinations or outside filler.

Return your response as a valid JSON object matching this schema:
{
  "titles": ["Title 1", "Title 2", ...],
  "description": "SEO description...",
  "timestamps": [{"time": "00:00", "label": "Hook title"}, ...],
  "hashtags": ["#tag1", "#tag2", ...],
  "tags": ["tag1", "tag2", ...]
}
(If a segment was marked NO above, omit its key or return an empty array/empty string).
`;

    // Set up the schema parameters based on what's toggled
    const schemaProps: any = {};
    const schemaRequired: string[] = [];

    if (toggleTitle) {
      schemaProps.titles = {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      };
      schemaRequired.push("titles");
    }
    if (toggleDescription) {
      schemaProps.description = { type: Type.STRING };
      schemaRequired.push("description");
    }
    if (toggleTimestamps) {
      schemaProps.timestamps = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            time: { type: Type.STRING },
            label: { type: Type.STRING }
          },
          required: ["time", "label"]
        }
      };
      schemaRequired.push("timestamps");
    }
    if (toggleHashtags) {
      schemaProps.hashtags = {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      };
      schemaRequired.push("hashtags");
    }
    if (toggleTags) {
      schemaProps.tags = {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      };
      schemaRequired.push("tags");
    }

    const providerConfig = req.providerConfig || resolveRequestProviderConfig(req, req.userApiKey);
    const jsonSchema = {
      type: Type.OBJECT,
      properties: schemaProps,
      required: schemaRequired
    };

    const genResult = await executeMultiProviderGeneration({
      prompt,
      responseMimeType: "application/json",
      jsonSchema,
      model: req.body.model || "gemini-3.1-flash-lite",
      userAiClient: ai,
      providerConfig,
      fallbackApiKey: req.userApiKey,
    });

    const data = extractJsonObject(genResult.text);

    res.json(data);
  } catch (error: any) {
    logSafeError("Error in /api/generate-ctr:", error);
    const provider = req.providerConfig?.provider || "gemini";
    res.status(500).json({ error: formatProviderErrorMessage(provider, error) });
  }
});

// YouTube & Social Media Thumbnail Director API
app.post("/api/generate-thumbnail-prompt", verifyUserAuth as express.RequestHandler, aiBurstLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      transcript,
      language,
      transformation,
      bgColor,
      headline,
      smallTagline,
      textColor,
      niche,
      format,
      engine,
      characterImage,
      characterImageType,
    } = req.body;

    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return res.status(400).json({ error: "Transcript is required." });
    }
    if (transcript.length > 100000) {
      return res.status(400).json({ error: "Transcript exceeds the maximum length limit of 100,000 characters." });
    }
    if (headline && typeof headline === "string" && headline.length > 500) {
      return res.status(400).json({ error: "Headline exceeds the 500 character limit." });
    }
    if (smallTagline && typeof smallTagline === "string" && smallTagline.length > 500) {
      return res.status(400).json({ error: "Tagline exceeds the 500 character limit." });
    }
    if (characterImage && typeof characterImage === "string" && characterImage.length > 7 * 1024 * 1024) {
      return res.status(400).json({ error: "Character image exceeds the 5MB payload size limit." });
    }

    const ai = req.userAiClient!;

    const selectedTransformation = transformation || language || "urdu-writing";

    const targetLangMeta = SCRIPT_LANGUAGE_MAP[selectedTransformation] || {
      name: selectedTransformation,
      script: `${selectedTransformation} script`,
      isRTL: false
    };

    // Prepare multimodal inline data if character image is attached
    let inlineDataPart: any = null;
    if (characterImage && characterImage.trim()) {
      let base64Data = characterImage;
      let mimeType = characterImageType || "image/png";
      if (characterImage.startsWith("data:")) {
        const matches = characterImage.match(/^data:([^;]+);base64,(.*)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }
      inlineDataPart = {
        inlineData: {
          mimeType,
          data: base64Data
        }
      };
    }

    const selectedFormat = format || "none";
    let formatGuidelines = "";
    if (selectedFormat === "16:9") {
      formatGuidelines = `
- Detected Selected Thumbnail Format: 16:9 (YouTube Landscape).
- Create a cinematic YouTube thumbnail optimized for a 16:9 layout.
- Composition Guidelines:
  * Keep the main character on the left or right third.
  * Leave large clean negative space for bold headline text.
  * Position the main object (fruit, medicine, food, organ, etc.) opposite the character.
  * Everything should remain inside the safe area.
  * No important elements should touch the edges.
  * The composition must remain balanced and highly clickable.
`;
    } else if (selectedFormat === "9:16") {
      formatGuidelines = `
- Detected Selected Thumbnail Format: 9:16 (Vertical Shorts / TikTok / Instagram Reels).
- Create a vertical thumbnail optimized for YouTube Shorts, Instagram Reels, and TikTok.
- YOU MUST format the generated positive prompt strictly matching either of these two exact styles:
  * Style A (Structure-based with TOP/CENTER/SUBJECT/BACKGROUND/COLORS):
    "Create a highly engaging YouTube [Niche/Category] vertical 9:16 thumbnail. TOP: Large bold Urdu headline '[Urdu Headline Text]' in elegant, thick Nastaliq font. CENTER: A high-quality, close-up portrait of [the character from the reference image / attached creator photo] with a [highly expressive emotion, e.g. intense curiosity and positive discovery, eyes wide and a slight smile], wearing [adapt attire to match occupation/field, integrated with traditional Pakistani dress, e.g., a professional doctor's lab coat styled over an elegant traditional Pakistani Shalwar Kameez]. SUBJECT: Below the character, [the main object, e.g., in her hand she is holding a steaming cup of coffee with a single, clear, whole clove resting on top, glowing with a soft neon green energy]. BACKGROUND: [Describe premium gradient background, e.g., a premium vertical linear gradient from #01c101 at the top to #004701 at the bottom], blended with [subtle visual effects, e.g., abstract floating health-related digital graphics]. COLORS: Use [List colors, e.g., Neon Green (#00FF01) and White (#FFFFFF)] for text accents. BOTTOM: A smaller, high-contrast Urdu tagline '[Urdu Tagline Text]'. Typography must be mobile-readable, ultra-realistic, cinematic studio lighting, high contrast, sharp focus, viral YouTube style, professional [Niche Theme] design, maximum CTR optimization, clean bold composition with [the character from the reference image / attached creator photo] as the primary focal point."
  
  * Style B (Sectional layout with TOP SECTION / MIDDLE/BOTTOM SECTION / BACKGROUND / STYLE):
    "Create a highly engaging YouTube [Niche/Category] thumbnail in a 9:16 vertical aspect ratio. TOP SECTION: High-impact bold Urdu text overlays using [List colors, e.g. Neon Green (#00FF01)] for the main headline '[Urdu Headline Text]' and [List colors, e.g. White (#FFFFFF)] for the tagline '[Urdu Tagline Text]'. Typography must be ultra-readable and professional. MIDDLE/BOTTOM SECTION: A high-detail close-up of [the character from the reference image / attached creator photo], wearing [adapt attire to match occupation/field, e.g., clean white traditional Pakistani tunic/Shalwar Kameez or doctor's coat over traditional dress], looking at the camera with a [highly expressive emotion, e.g. shocked and cautionary] facial expression. [The character from the reference image / attached creator photo] is the primary focal point. Near or below them, [describe the items, fruits, medicines, or elements, e.g., a hyper-realistic cup of coffee with swirling steam transitions into glowing neon green medical symbols, such as a heartbeat pulse line]. BACKGROUND: [Describe premium gradient background, e.g., a premium linear gradient from #01c101 to #004701 with subtle abstract light leaks and high-tech health-inspired bokeh]. STYLE: Cinematic lighting, high contrast, sharp focus, viral YouTube Shorts thumbnail style, clean bold composition, maximum CTR optimization."

- Strict Composition Rules:
  * ALWAYS MENTION THE ATTACHED PHOTO / REFERENCE IMAGE: Always state that the generator must use the attached creator photo / reference image as the primary focal point (e.g., "portrait of the woman from the reference image" or "using the uploaded creator photo/reference image as the main subject").
  * TEXT ON TOP: The main Urdu text / headline overlays must be placed in the upper part of the thumbnail, strictly above the character (in the top 20–30% of the vertical layout).
  * CHARACTER IN CENTER: The human character (drawn from the reference image) must be in the middle / center of the vertical thumbnail layout.
  * CHARACTER DRESS / ATTIRE (CRITICAL):
    - Dynamically adapt the character's attire to match their field, occupation, or role in the script (for example, if the script/niche is about health/medical, they should wear a doctor's outfit like a white lab coat; if a mechanic, a mechanic's jumpsuit/outfit; if an organic farmer, suitable rustic clothes, etc.).
    - Crucially, the attire must be a traditional Pakistani dress (Shalwar Kameez) adapted or integrated beautifully to fit that professional field (e.g. traditional Pakistani Shalwar Kameez style doctor's white coat or elegant traditional Pakistani attire representing that occupation/domain). Shalwar Kameez is the primary standard choice.
  * ITEMS BELOW CHARACTER: Any items, products, or elements mentioned in the script (for example, fruits, cloves, medicines, organic herbs, supplements, tools, or relevant objects) must be positioned in the lower portion of the image, below the character's chest/hand area.
  * Ensure the character's face is never cropped and has a clear, powerful emotional expression.
  * Keep all critical elements inside the vertical safe area with zero empty side space.
  * Maintain a strong visual vertical hierarchy: Headline Text on top -> Character in middle/center -> Script Items below the character.
  * The thumbnail layout should fully utilize the vertical canvas and remain highly readable on mobile devices.
`;
    } else if (selectedFormat === "1:1") {
      formatGuidelines = `
- Detected Selected Thumbnail Format: 1:1 (Square - Facebook / Instagram Feed).
- Create a square thumbnail optimized for Facebook, Instagram Feed, and social media.
- Composition Rules:
  * Place the headline text across the upper portion.
  * Place the main object near the upper-middle.
  * Place the human character in the center or lower-middle.
  * If necessary, slightly overlap the object and character to create depth.
  * Keep all important elements away from the edges.
  * Ensure the layout feels balanced and centered.
  * The thumbnail should remain readable even at small sizes.
`;
    } else {
      formatGuidelines = `
- Detected Selected Thumbnail Format: Standard (No specific aspect ratio requested).
- Create a premium YouTube-quality thumbnail with balanced composition, readable overlays, and high CTR focus.
`;
    }

    const universalRules = `
Universal Rules (Apply to ALL Formats):
- Hyper-realistic.
- Premium YouTube-quality thumbnail.
- Ultra high detail.
- Strong emotional facial expression.
- Bright, vibrant colors.
- High contrast.
- Dramatic cinematic lighting.
- Sharp focus.
- Large readable headline.
- Clean composition.
- No clutter.
- No watermarks.
- No logos.
- No extra text beyond the intended headline.
- Design for maximum click-through rate (CTR).
- The generated prompt must automatically adapt the composition based on the selected thumbnail format while preserving the same subject, message, and emotional impact.
`;

    const isIslamic = (niche && niche.toLowerCase().includes("islamic")) ||
                      (transcript && transcript.toLowerCase().includes("islamic")) ||
                      (headline && headline.toLowerCase().includes("islamic"));
                      
    const islamicThumbnailInstruction = isIslamic ? `
ISLAMIC CHARACTERS & ATTIRE RULES (CRITICAL):
- Since the thumbnail is Islamic-related, any human characters depicted must wear proper traditional Islamic religious attire.
- If discussing children, they must be described in Islamic dress (e.g., a young boy with a prayer cap/kurta or a young girl with an elegant colorful hijab/modest dress).
- If discussing adults, they must be described in Islamic religious attire (e.g., adult men in traditional clean attire with a neat beard and optional prayer cap, and women in modest abaya/hijab/elegant traditional modest clothing).
- Ensure the prompt instructions incorporate these attire and character styling elements elegantly.
` : "";

    const imageInstruction = inlineDataPart ? `
CHARACTER IMAGE ATTACHED RULE (CRITICAL):
- An image of the character is attached. You must analyze this character in detail (gender, approximate age, hairstyle/color, facial structure, clothing style, general aesthetic) from the attached visual.
- Explicitly dictate that the image generator should use the exact appearance, style, and face of the attached character image. Describe their features meticulously in the positive scene prompt so the model can recreate their exact likeness as the main focal subject of the thumbnail.
- If the format is vertical or square, describe how this character is positioned in the center or lower-middle area according to the composition guidelines.
` : `
NO CHARACTER IMAGE ATTACHED:
- Since no character image is attached, you can add whatever character or subject you want, ideally customized to the script/transcript, niche theme/domain field, and format.
`;

    const formatLabel = selectedFormat === "16:9" ? "wide landscape format" : selectedFormat === "9:16" ? "vertical 9:16 format" : "square 1:1 format";
    const selectedEngine = engine || "nano_banana";

    if (selectedEngine === "flux1") {
      const prompt = `
You are an expert YouTube Thumbnail Director, Visual Designer, and CTR Optimization expert specializing in highly trained "FLUX 1" visual image generation prompts.
Create a highly engaging, viral YouTube thumbnail concept, positive prompt, negative prompt, and ${targetLangMeta.name} poster text overlay parameters based on the provided video transcript.

TRANSCRIPT:
"""
${transcript}
"""

Design parameters to integrate:
- Target Language for Headline & Tagline: ${targetLangMeta.name} (${targetLangMeta.script})
- Background Colors: ${bgColor || "Slate black, dark green gradient"}
- Thumbnail Text Headline (Reference/Guideline): ${headline || "None specified"}
- Small Tagline text: ${smallTagline || "None specified"}
- Text Color overlays: ${textColor || "Neon green (#00FF01) and white"}
- Niche Theme: ${resolveNicheDirective(niche).promptText}
- Selected Format: ${selectedFormat} (${formatLabel})

${formatGuidelines}
${universalRules}
${islamicThumbnailInstruction}
${imageInstruction}

Strict Rules for FLUX 1 Prompt Creation:
1. The "fluxScenePrompt" MUST be in English only, with NO letters/words/text written directly inside the generated scene image itself. It should describe the visual layout perfectly matching the selected format guidelines. It should be a single highly-detailed paragraph, fully descriptive, cinematic, and clear.
2. It must explicitly include empty spaces reserved for text overlays:
   - For landscape (16:9): "Empty clear space reserved on the right side (or left side) for bold headline text. No text, no letters, no watermark."
   - For vertical (9:16): "Empty clear space reserved at the very top and very bottom for title text. No text, no letters, no words."
   - For square (1:1): "Empty clear space across the upper portion for headline text. No text, no letters, no watermark."
3. The "fluxNegativePrompt" must be a robust set of negative terms to prevent text generation inside the FLUX 1 image:
   "low quality, blurry, bad anatomy, deformed hands, extra fingers, text, letters, words, watermark, gibberish script, distorted face, cartoon"
4. Create high-impact ${targetLangMeta.name} text overlays strictly in ${targetLangMeta.script}:
   - "headlineUrdu": A bold, high-click-through headline in ${targetLangMeta.name} (${targetLangMeta.script}) (3-5 words max, viral CTR hook). If user provided a specific Prompt text Headline, translate or adapt it faithfully into ${targetLangMeta.name} (${targetLangMeta.script}).
   - "smallTaglineUrdu": A matching small tagline in ${targetLangMeta.name} (${targetLangMeta.script}). If user provided a Prompt Small Tagline, adapt it into ${targetLangMeta.name} (${targetLangMeta.script}).
5. Determine the appropriate overlay node coordinate percentages, stroke styling, and hex color codes based on parameters:
   - For landscape: headingYPercent = 0.08, taglineYPercent = 0.22, strokeWidth = 5.
   - For vertical: headingYPercent = 0.10, taglineYPercent = 0.92 (or 0.20), strokeWidth = 6.
   - For square: headingYPercent = 0.10, taglineYPercent = 0.90 (or 0.25), strokeWidth = 4.
6. Return hex color codes (e.g. "#FFFFFF", "#00FF01", or "#000000") for "textColor" and "strokeColor" that best fit the design parameter overlays.
7. Define the exact dimensions for EmptyLatentImage:
   - For 16:9: width = 1820, height = 1024
   - For 9:16: width = 1024, height = 1820
   - For 1:1 or none: width = 1024, height = 1024

Return your response as a valid JSON object matching this schema:
{
  "fluxScenePrompt": "The detailed English positive scene prompt...",
  "fluxNegativePrompt": "The negative prompt terms...",
  "headlineUrdu": "High-impact headline in ${targetLangMeta.name} (${targetLangMeta.script})...",
  "smallTaglineUrdu": "Matching small tagline in ${targetLangMeta.name} (${targetLangMeta.script})...",
  "textColor": "#FFFFFF or similar hex color",
  "strokeColor": "#00FF01 or similar hex color",
  "strokeWidth": 6,
  "headingYPercent": 0.10,
  "taglineYPercent": 0.92,
  "emptyLatentImageWidth": 1024,
  "emptyLatentImageHeight": 1820
}
`;

      const providerConfig = req.providerConfig || resolveRequestProviderConfig(req, req.userApiKey);
      const fluxSchema = {
        type: Type.OBJECT,
        properties: {
          fluxScenePrompt: { type: Type.STRING },
          fluxNegativePrompt: { type: Type.STRING },
          headlineUrdu: { type: Type.STRING },
          smallTaglineUrdu: { type: Type.STRING },
          textColor: { type: Type.STRING },
          strokeColor: { type: Type.STRING },
          strokeWidth: { type: Type.NUMBER },
          headingYPercent: { type: Type.NUMBER },
          taglineYPercent: { type: Type.NUMBER },
          emptyLatentImageWidth: { type: Type.NUMBER },
          emptyLatentImageHeight: { type: Type.NUMBER }
        },
        required: [
          "fluxScenePrompt",
          "fluxNegativePrompt",
          "headlineUrdu",
          "smallTaglineUrdu",
          "textColor",
          "strokeColor",
          "strokeWidth",
          "headingYPercent",
          "taglineYPercent",
          "emptyLatentImageWidth",
          "emptyLatentImageHeight"
        ]
      };

      const genResult = await executeMultiProviderGeneration({
        prompt,
        responseMimeType: "application/json",
        jsonSchema: fluxSchema,
        contentsParts: providerConfig.provider === "gemini" && inlineDataPart ? [inlineDataPart, { text: prompt }] : undefined,
        model: req.body.model || "gemini-3.1-flash-lite",
        userAiClient: ai,
        providerConfig,
        fallbackApiKey: req.userApiKey,
      });

      const parsed = extractJsonObject(genResult.text);
      const data = {
        engine: "flux1",
        thumbnailPrompt: parsed.fluxScenePrompt || "",
        fluxScenePrompt: parsed.fluxScenePrompt || "",
        fluxNegativePrompt: parsed.fluxNegativePrompt || "low quality, blurry, bad anatomy, deformed, extra fingers, text, letters, words, watermark",
        headlineUrdu: parsed.headlineUrdu || "",
        smallTaglineUrdu: parsed.smallTaglineUrdu || "",
        overlayFields: {
          heading_text: parsed.headlineUrdu || "",
          tagline_text: parsed.smallTaglineUrdu || "",
          text_color: parsed.textColor || "#FFFFFF",
          stroke_color: parsed.strokeColor || "#00FF01",
          stroke_width: typeof parsed.strokeWidth === "number" ? parsed.strokeWidth : 6,
          heading_y_percent: typeof parsed.headingYPercent === "number" ? parsed.headingYPercent : 0.10,
          tagline_y_percent: typeof parsed.taglineYPercent === "number" ? parsed.taglineYPercent : 0.92
        },
        emptyLatentImage: {
          width: typeof parsed.emptyLatentImageWidth === "number" ? parsed.emptyLatentImageWidth : (selectedFormat === "16:9" ? 1820 : 1024),
          height: typeof parsed.emptyLatentImageHeight === "number" ? parsed.emptyLatentImageHeight : (selectedFormat === "9:16" ? 1820 : 1024)
        }
      };
      return res.json(data);

    } else {
      // Default: Nano Banana 2
      const prompt = `
You are an expert YouTube Thumbnail Director, Visual Designer, and CTR Optimization expert specializing in highly trained "Nano Banana 2" visual image generation prompts.
Create a highly engaging, viral YouTube thumbnail concept and ${targetLangMeta.name} text overlays based on the provided video transcript.

TRANSCRIPT:
"""
${transcript}
"""

Design parameters to integrate:
- Target Language for Headline & Tagline: ${targetLangMeta.name} (${targetLangMeta.script})
- Background Colors: ${bgColor || "Slate black, dark green gradient"}
- Thumbnail Text Headline (Reference/Guideline): ${headline || "None specified"}
- Small Tagline text: ${smallTagline || "None specified"}
- Text Color overlays: ${textColor || "Neon green (#00FF01) and white"}
- Niche Theme: ${resolveNicheDirective(niche).promptText}

${formatGuidelines}
${universalRules}
${islamicThumbnailInstruction}
${imageInstruction}

Strict Rules for Thumbnail Prompt Creation:
1. Describe EXACTLY 1 main subject with an extreme, highly expressive human emotion (surprise, shock, fear, concern, ultimate excitement) suitable for the niche and topic.
2. The returned "thumbnailPrompt" MUST be structured as an extremely detailed, highly trained "Nano Banana 2 Prompt for an image generation model" following this EXACT layout format:
   "Create a highly engaging YouTube [Niche Theme] thumbnail using the uploaded creator photo as the main subject (preserve facial identity exactly).
   LEFT SIDE: A large close-up of the creator [specify gender/clothing/appearance based on topic, ensuring Islamic dress if applicable], with a [specify expressive emotion, e.g. surprised and concerned] expression, pointing toward [specify high-impact visual object from transcript, e.g., fresh ginger root with glowing medical effects/device].
   RIGHT SIDE: [Describe realistic visual representations of the main topic, e.g., realistic kidney illustration glowing with healthy neon green energy, or high-tech gadget glowing, or food element], and other secondary high-impact elements like [describe 2-3 supporting objects/icons].
   BACKGROUND: [Describe a premium gradient blended with relevant graphics, e.g., a premium black and dark green gradient blended together with futuristic medical graphics, or cyber patterns, or organic textures] utilizing [Background Colors]. Use only [List specific color hexes/names from parameters, e.g. neon green (#00FF01), Black (#000000), White (#FFFFFF)].
   Large bold ${targetLangMeta.name} headline with merged [Text Color overlays] text: \"[Headline in ${targetLangMeta.name} ${targetLangMeta.script}]\"
   Small ${targetLangMeta.name} tagline underneath: \"[Tagline in ${targetLangMeta.name} ${targetLangMeta.script}]\".
   Typography should be mobile-readable, ultra-realistic, cinematic lighting, high contrast, sharp focus, viral YouTube thumbnail style, professional [Niche Theme] design, maximum CTR optimization, clean bold composition with the creator's face as the main focal point."

3. Keep the visual composition bold, simple, mobile-readable, and optimized for maximum YouTube CTR, strictly adjusting the composition according to the selected format guidelines.
4. Create a matching, extremely high-impact main headline strictly in ${targetLangMeta.name} (${targetLangMeta.script}) ("headlineUrdu") (max 3-5 words for high CTR impact). If the user provided a specific Prompt text Headline, translate or adapt it into ${targetLangMeta.name} (${targetLangMeta.script}).
5. Create a matching small tagline strictly in ${targetLangMeta.name} (${targetLangMeta.script}) ("smallTaglineUrdu"). If the user provided a Prompt Small Tagline, translate or adapt it into ${targetLangMeta.name} (${targetLangMeta.script}).

Return your response as a valid JSON object matching this schema:
{
  "thumbnailPrompt": "The detailed English Nano Banana 2 prompt following the precise layout above adapted to the selected format and featuring the ${targetLangMeta.name} headline & tagline...",
  "headlineUrdu": "Bold headline in ${targetLangMeta.name} (${targetLangMeta.script})...",
  "smallTaglineUrdu": "Small tagline in ${targetLangMeta.name} (${targetLangMeta.script})..."
}
`;

      const providerConfig = req.providerConfig || resolveRequestProviderConfig(req, req.userApiKey);
      const nanoSchema = {
        type: Type.OBJECT,
        properties: {
          thumbnailPrompt: { type: Type.STRING },
          headlineUrdu: { type: Type.STRING },
          smallTaglineUrdu: { type: Type.STRING }
        },
        required: ["thumbnailPrompt", "headlineUrdu", "smallTaglineUrdu"]
      };

      const genResult = await executeMultiProviderGeneration({
        prompt,
        responseMimeType: "application/json",
        jsonSchema: nanoSchema,
        contentsParts: providerConfig.provider === "gemini" && inlineDataPart ? [inlineDataPart, { text: prompt }] : undefined,
        model: req.body.model || "gemini-3.1-flash-lite",
        userAiClient: ai,
        providerConfig,
        fallbackApiKey: req.userApiKey,
      });

      const parsed = extractJsonObject(genResult.text);
      const data = {
        engine: "nano_banana",
        thumbnailPrompt: parsed.thumbnailPrompt || "",
        headlineUrdu: parsed.headlineUrdu || "",
        smallTaglineUrdu: parsed.smallTaglineUrdu || ""
      };

      res.json(data);
    }
  } catch (error: any) {
    logSafeError("Error in /api/generate-thumbnail-prompt:", error);
    const provider = req.providerConfig?.provider || "gemini";
    res.status(500).json({ error: formatProviderErrorMessage(provider, error) });
  }
});

// Granular segment/key level regeneration for CTR
app.post("/api/regenerate-ctr-field", verifyUserAuth as express.RequestHandler, aiBurstLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const { transcript, field, videoDuration } = req.body;
    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return res.status(400).json({ error: "Transcript is required." });
    }
    if (transcript.length > 100000) {
      return res.status(400).json({ error: "Transcript exceeds the maximum length limit of 100,000 characters." });
    }

    const ai = req.userAiClient!;
    let fieldPrompt = "";
    let responseSchema: any = {};

    if (field === "titles") {
      fieldPrompt = `Generate exactly 10 high-CTR title options based on this transcript:
"""
${transcript}
"""
- Use power words: Secret, Exposed, Why, How, I Tried. Add [Brackets] if relevant.
- Keep titles between 50-60 characters with curiosity gap + keywords first.
- Provide titles categorized beautifully by language: English, Urdu, and Hindi. Separated clearly by language, not mixed in a single title.
Return the output in the "titles" array.`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          titles: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["titles"]
      };
    } else if (field === "description") {
      fieldPrompt = `Generate an SEO description of exactly 2 paragraphs based on this transcript:
"""
${transcript}
"""
- First line must be an engaging hook.
- Include high-traffic keywords + clear Call-To-Action (CTA). No fluff.
- POLICY AND MONETIZATION SAFETY COMPLIANCE (CRITICAL): Do NOT use sensitive, overly dramatic medical claims, pseudo-medical claims, or unverified scientific statements that violate monetization policies. Specifically:
  * NEVER claim quick cures or reverse-health milestones (e.g. do NOT use "in just three weeks", "rapidly reversing", "restoring crystal clear eyesight", "instant cure", "reverses diabetes").
  * NEVER claim direct biological cure/regulatory statements (e.g. do NOT write "works by regulating insulin resistance", "completely cures blood sugar spikes").
  * NEVER suggest bypassing standard healthcare or medications (e.g. do NOT write "without expensive medications", "avoid doctors", "alternatives to surgery").
  * Instead, frame all description insights safely and educationally, focusing on healthy habit discussions, scientific curiosity, educational exploration, and general lifestyle awareness. Use cautious, compliant, and supportive terminology.
Return the output in the "description" key.`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING }
        },
        required: ["description"]
      };
    } else if (field === "timestamps") {
      fieldPrompt = `Generate video timestamps outlining the video progression based on the provided Video Duration of "${videoDuration || "10:00"}" and this transcript:
"""
${transcript}
"""
- Automatically detect topic shifts from the transcript.
- Provide between 8 to 12 chronological chapters starting at "00:00".
- Estimate the timestamp times proportionally based on the transcript's logical progression and total duration.
Return the output in the "timestamps" array.`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          timestamps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                label: { type: Type.STRING }
              },
              required: ["time", "label"]
            }
          }
        },
        required: ["timestamps"]
      };
    } else if (field === "hashtags") {
      fieldPrompt = `Generate exactly 15 high-ranking YouTube hashtags with the '#' symbol based on this transcript:
"""
${transcript}
"""
Return the output in the "hashtags" array.`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          hashtags: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["hashtags"]
      };
    } else if (field === "tags") {
      fieldPrompt = `Generate exactly 15 highly-optimized SEO tags as a list of keyword strings based on this transcript:
"""
${transcript}
"""
Return the output in the "tags" array.`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["tags"]
      };
    } else {
      return res.status(400).json({ error: "Invalid field requested." });
    }

    const providerConfig = req.providerConfig || resolveRequestProviderConfig(req, req.userApiKey);
    const genResult = await executeMultiProviderGeneration({
      prompt: fieldPrompt,
      responseMimeType: "application/json",
      jsonSchema: responseSchema,
      model: req.body.model || "gemini-3.1-flash-lite",
      userAiClient: ai,
      providerConfig,
      fallbackApiKey: req.userApiKey,
    });

    const data = extractJsonObject(genResult.text);

    res.json(data);
  } catch (error: any) {
    logSafeError("Error in /api/regenerate-ctr-field:", error);
    const provider = req.providerConfig?.provider || "gemini";
    res.status(500).json({ error: formatProviderErrorMessage(provider, error) });
  }
});

const DEFAULT_CHAT_WORKSPACE_INSTRUCTION = `You are an advanced, flagship AI assistant combining the thoroughness, structured clarity, and intelligence of ChatGPT, Claude, and Gemini.
- Deliver complete, substantive, well-organized answers — never artificially shorten, abbreviate, or withhold requested depth unless the user asks for a brief reply.
- Use clean Markdown formatting naturally: headings (# / ## / ###), structured Markdown tables (| Col | Col |), bullet/numbered lists, bold key terms, blockquotes, and complete copyable code blocks.`;

async function prepareChatWorkspacePayload(req: AuthenticatedRequest) {
  const providerConfig = req.providerConfig || resolveRequestProviderConfig(req, req.userApiKey);
  const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];

  const filteredRaw = rawMessages.filter(
    (m: any) =>
      m &&
      typeof m.content === "string" &&
      (m.content.trim() ||
        m.imageDataUrl ||
        (Array.isArray(m.imageDataUrls) && m.imageDataUrls.length > 0))
  );

  const messages: ChatTurnMessage[] = [];
  for (let i = 0; i < filteredRaw.length; i++) {
    const m = filteredRaw[i];
    const resolvedImages: string[] = [];

    if (Array.isArray(m.imageDataUrls)) {
      for (const img of m.imageDataUrls) {
        if (typeof img === "string" && img.startsWith("data:image/") && !resolvedImages.includes(img)) {
          resolvedImages.push(img);
        }
      }
    }
    if (typeof m.imageDataUrl === "string" && m.imageDataUrl.startsWith("data:image/") && !resolvedImages.includes(m.imageDataUrl)) {
      resolvedImages.push(m.imageDataUrl);
    }

    messages.push({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || (resolvedImages.length > 0 ? "Analyze the attached reference image(s)." : "")),
      ...(resolvedImages.length > 0 ? { imageDataUrl: resolvedImages[0], imageDataUrls: resolvedImages } : {}),
    });
  }

  if (messages.length === 0) {
    throw Object.assign(new Error("Please enter a message or prompt to send."), { statusCode: 400 });
  }

  const rawSystem =
    typeof req.body?.systemInstruction === "string" ? req.body.systemInstruction.trim() : "";
  const systemInstruction = rawSystem || DEFAULT_CHAT_WORKSPACE_INSTRUCTION;
  const model = typeof req.body?.model === "string" ? req.body.model.trim() : "";
  const temperature =
    typeof req.body?.temperature === "number" && Number.isFinite(req.body.temperature)
      ? Math.max(0, Math.min(1.5, req.body.temperature))
      : 0.7;

  return { providerConfig, messages, systemInstruction, model, temperature };
}

// Multi-turn AI Chat & Prompt Studio Endpoint (Supports Local GGUF, Gemini, OpenAI & Claude)
app.post("/api/chat", aiBurstLimiter, verifyUserAuth as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
  try {
    const { providerConfig, messages, systemInstruction, model, temperature } =
      await prepareChatWorkspacePayload(req);

    const result = await executeMultiProviderChat({
      messages,
      systemInstruction,
      model,
      temperature,
      userAiClient: req.userAiClient,
      providerConfig,
      fallbackApiKey: req.userApiKey,
    });

    return res.json({
      reply: result.text,
      providerUsed: result.providerUsed,
      modelUsed: result.modelUsed,
      finishReason: result.finishReason,
      truncated: Boolean(result.truncated),
    });
  } catch (error: any) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logSafeError("Error in /api/chat:", error);
    const provider = req.providerConfig?.provider || "gemini";
    return res.status(500).json({ error: formatProviderErrorMessage(provider, error) });
  }
});

// Streaming Multi-turn AI Chat Endpoint (SSE live token-by-token like ChatGPT / Claude / Gemini)
app.post("/api/chat/stream", aiBurstLimiter, verifyUserAuth as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
  const abortController = new AbortController();
  req.on("close", () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  try {
    const { providerConfig, messages, systemInstruction, model, temperature } =
      await prepareChatWorkspacePayload(req);

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    const sendEvent = (payload: Record<string, any>) => {
      if (res.writableEnded) return;
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    const result = await executeMultiProviderChatStream(
      {
        messages,
        systemInstruction,
        model,
        temperature,
        userAiClient: req.userAiClient,
        providerConfig,
        fallbackApiKey: req.userApiKey,
        signal: abortController.signal,
      },
      {
        onDelta: (deltaText) => {
          sendEvent({ type: "delta", text: deltaText });
        },
      }
    );

    sendEvent({
      type: "done",
      reply: result.text,
      providerUsed: result.providerUsed,
      modelUsed: result.modelUsed,
      finishReason: result.finishReason,
      truncated: Boolean(result.truncated),
    });
    res.end();
  } catch (error: any) {
    if (abortController.signal.aborted) {
      if (!res.writableEnded) res.end();
      return;
    }
    const provider = req.providerConfig?.provider || "gemini";
    const friendly = error?.statusCode
      ? error.message
      : formatProviderErrorMessage(provider, error);
    if (!res.headersSent) {
      return res.status(error?.statusCode || 500).json({ error: friendly });
    }
    logSafeError("Error in /api/chat/stream:", error);
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: "error", error: friendly })}\n\n`);
      res.end();
    }
  }
});

// Chat Workspace Persistent Storage (100% Local PC Disk: Windows / Linux / macOS)
const LOCAL_CHAT_WORKSPACE_FILE = path.resolve(process.cwd(), "local-engine", "chat-workspace.json");

app.get("/api/chat/storage", async (_req, res) => {
  try {
    let savedData: Record<string, any> = {};
    if (fs.existsSync(LOCAL_CHAT_WORKSPACE_FILE)) {
      try {
        savedData = JSON.parse(fs.readFileSync(LOCAL_CHAT_WORKSPACE_FILE, "utf-8"));
      } catch {
        savedData = {};
      }
    }
    return res.json({
      storageMode: "local-disk",
      storageLocation: "local-engine/chat-workspace.json",
      sessions: Array.isArray(savedData.sessions) ? savedData.sessions : [],
      projects: Array.isArray(savedData.projects) ? savedData.projects : [],
      skillsAndAgents: Array.isArray(savedData.skillsAndAgents) ? savedData.skillsAndAgents : null,
      activeAgentId: savedData.activeAgentId !== undefined ? savedData.activeAgentId : undefined,
    });
  } catch (error: any) {
    logSafeError("Error reading /api/chat/storage:", error);
    return res.status(500).json({ error: "Failed to load saved chat workspace." });
  }
});

app.post("/api/chat/storage", writeRateLimiter, async (req, res) => {
  try {
    const rawSessions = Array.isArray(req.body?.sessions) ? req.body.sessions : [];
    const rawProjects = Array.isArray(req.body?.projects) ? req.body.projects : [];
    const rawSkills = Array.isArray(req.body?.skillsAndAgents) ? req.body.skillsAndAgents : null;
    const activeAgentId =
      typeof req.body?.activeAgentId === "string" || req.body?.activeAgentId === null
        ? req.body.activeAgentId
        : null;

    const dir = path.dirname(LOCAL_CHAT_WORKSPACE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const payload = {
      sessions: rawSessions,
      projects: rawProjects,
      ...(rawSkills ? { skillsAndAgents: rawSkills } : {}),
      activeAgentId,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(LOCAL_CHAT_WORKSPACE_FILE, JSON.stringify(payload, null, 2), "utf8");
    return res.json({
      success: true,
      storageMode: "local-disk",
      storageLocation: "local-engine/chat-workspace.json",
    });
  } catch (error: any) {
    logSafeError("Error saving /api/chat/storage:", error);
    return res.status(500).json({ error: "Failed to save chat workspace to disk." });
  }
});

let hasAutoOpenedBrowser = false;

function autoOpenLocalBrowser(appUrl: string): void {
  if (hasAutoOpenedBrowser) return;
  if (isElectron || process.env.CI || process.env.K_SERVICE || process.env.CLOUD_RUN_JOB) return;

  const autoEnv = (process.env.AUTO_OPEN_BROWSER || "").trim().toLowerCase();
  if (autoEnv === "0" || autoEnv === "false") return;

  const hasDisplay =
    process.platform === "win32" ||
    process.platform === "darwin" ||
    Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);

  if (!hasDisplay) return;
  if (autoEnv === "") return; // Wait for explicit desktop launcher (run-app / AUTO_OPEN_BROWSER=1) if running via npm run dev

  hasAutoOpenedBrowser = true;
  try {
    let child;
    if (process.platform === "win32") {
      child = spawn("cmd", ["/c", "start", "", appUrl], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
    } else if (process.platform === "darwin") {
      child = spawn("open", [appUrl], { detached: true, stdio: "ignore" });
    } else {
      child = spawn("xdg-open", [appUrl], { detached: true, stdio: "ignore" });
    }
    child.on("error", () => {});
    child.unref();
  } catch {
    // Non-fatal if OS browser handler is unavailable
  }
}

// Serve static assets or mount Vite dev middleware
/**
 * Starts the local Express API used by both the web app and Electron.
 *
 * Electron loads the packaged server in-process, so this function is exported
 * and its promise is kept available for the Electron main process to await.
 * The normal `node dist/server.cjs` / Vite workflow still starts automatically.
 */
export async function setupServer(): Promise<HttpServer> {
  if (httpServer) return httpServer;
  if (serverStartPromise) return serverStartPromise;

  serverStartPromise = (async () => {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      // In Electron, __dirname points to the packaged server bundle directory.
      // This is intentionally NOT process.cwd(), because Electron's working
      // directory can be outside the application's resources directory.
      const distPath = __dirname;
      app.use(
        "/assets",
        express.static(path.join(distPath, "assets"), {
          maxAge: "365d",
          immutable: true,
        })
      );
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    httpServer = await new Promise<HttpServer>((resolve, reject) => {
      const server = app.listen(PORT, HOST);

      const onError = (err: Error) => {
        server.removeListener("listening", onListening);
        reject(err);
      };

      const onListening = () => {
        server.removeListener("error", onError);
        const displayHost = HOST === "0.0.0.0" ? "localhost" : HOST;
        const appUrl = `http://${displayHost}:${PORT}`;
        console.log(
          `Server running at ${appUrl} with environment ${process.env.NODE_ENV || "development"}${
            isElectron ? " (Electron)" : ""
          }`
        );
        autoOpenLocalBrowser(appUrl);
        resolve(server);
      };

      server.once("error", onError);
      server.once("listening", onListening);
    });

    return httpServer;
  })();

  try {
    return await serverStartPromise;
  } catch (error) {
    httpServer = null;
    serverStartPromise = null;
    throw error;
  }
}

/** Allows the Electron main process to shut down the local API cleanly. */
export async function stopServer(): Promise<void> {
  await stopLocalEngine().catch(() => {});
  const server = httpServer;
  httpServer = null;
  serverStartPromise = null;

  if (!server) return;

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}

process.on("SIGINT", () => {
  stopLocalEngine().finally(() => process.exit(0));
});
process.on("SIGTERM", () => {
  stopLocalEngine().finally(() => process.exit(0));
});

setupServer().catch((err) => {
  logSafeError("FAILED TO START SERVER:", err);
  // In Electron the main process awaits the same promise and shows an error dialog; exiting here
  // would close the app with no explanation.
  if (!isElectron) process.exit(1);
});