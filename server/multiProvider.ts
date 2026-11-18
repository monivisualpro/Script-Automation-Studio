import { GoogleGenAI } from "@google/genai";

export type AIProviderType = "gemini" | "openai" | "claude" | "local";

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey?: string;
  model?: string;
  baseUrl?: string; // For local/OpenAI-compatible models (e.g. http://localhost:1234/v1 or http://localhost:11434/v1)
  allowEnvFallback?: boolean;
}

export interface GenerationRequestOptions {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  temperature?: number;
  responseMimeType?: string;
  jsonSchema?: any;
  contentsParts?: any[];
  userAiClient?: GoogleGenAI;
  providerConfig?: AIProviderConfig;
  fallbackApiKey?: string;
}

export interface GenerationResult {
  text: string;
  providerUsed: AIProviderType;
  modelUsed: string;
}

const PLACEHOLDER_API_KEYS = new Set([
  "your_gemini_api_key_here",
  "your_openai_api_key_here",
  "your_anthropic_api_key_here",
  "your_api_key_here",
  "your_gemini_key_here",
  "your_openai_key_here",
  "your_claude_key_here",
  "standalone-local-key",
  "local-key",
  "not-needed",
  "none",
  "null",
  "undefined",
]);

/**
 * Strip whitespace and return empty string for known placeholder/sentinel keys
 */
export function sanitizeApiKey(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (PLACEHOLDER_API_KEYS.has(lower) || lower.startsWith("your_")) {
    return "";
  }
  return trimmed;
}

/**
 * Check if a model ID belongs to a specific cloud family so mismatched UI defaults
 * (e.g. gemini-3.1-flash-lite) are never sent blindly to Local LLM / OpenAI / Claude.
 */
export function isGeminiModelId(modelId?: string): boolean {
  if (!modelId) return false;
  const m = modelId.trim().toLowerCase();
  return m.startsWith("gemini-") || m.startsWith("imagen-");
}

export function isOpenAIModelId(modelId?: string): boolean {
  if (!modelId) return false;
  const m = modelId.trim().toLowerCase();
  return m.startsWith("gpt-") || m.startsWith("o1-") || m.startsWith("o3-") || m.startsWith("o4-") || m.startsWith("chatgpt-");
}

export function isClaudeModelId(modelId?: string): boolean {
  if (!modelId) return false;
  const m = modelId.trim().toLowerCase();
  return m.startsWith("claude-");
}

export function isLocalModelId(modelId?: string): boolean {
  if (!modelId || !modelId.trim()) return false;
  return !isGeminiModelId(modelId) && !isOpenAIModelId(modelId) && !isClaudeModelId(modelId);
}

/**
 * Extract first valid JSON object from LLM text (handles markdown code fences cleanly)
 */
export function extractJsonObject(raw?: string | null): any {
  if (!raw || typeof raw !== "string") return {};
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const startIdx = cleaned.indexOf("{");
    const endIdx = cleaned.lastIndexOf("}");
    if (startIdx !== -1 && endIdx > startIdx) {
      try {
        return JSON.parse(cleaned.slice(startIdx, endIdx + 1));
      } catch {
        return {};
      }
    }
    return {};
  }
}

/**
 * Format errors across different providers into clean user-friendly messages
 */
export function formatProviderErrorMessage(provider: AIProviderType, err: any): string {
  if (!err) return "Unknown AI generation error";
  const errStr = typeof err === "string" ? err : err.message || JSON.stringify(err);

  if (provider === "gemini") {
    if (errStr.includes("API_KEY_SERVICE_BLOCKED") || errStr.includes("API_KEY_INVALID") || errStr.includes("API key not valid")) {
      return "Google Gemini API Key is invalid or not configured. Please enter a valid Gemini API key or switch to Local Engine / OpenAI / Claude in Configure AI Key.";
    }
    if (errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("429")) {
      return "Gemini rate limit exceeded. Please wait a moment or switch models.";
    }
  } else if (provider === "openai") {
    if (errStr.includes("incorrect API key") || errStr.includes("invalid_api_key")) {
      return "Invalid OpenAI API Key. Please verify your OpenAI key in Settings.";
    }
    if (errStr.includes("insufficient_quota")) {
      return "OpenAI quota exceeded. Please check your OpenAI account billing balance.";
    }
  } else if (provider === "claude") {
    if (errStr.includes("authentication_error") || errStr.includes("invalid x-api-key")) {
      return "Invalid Anthropic Claude API Key. Please check your Claude key in Settings.";
    }
  } else if (provider === "local") {
    if (errStr.includes("ECONNREFUSED") || errStr.includes("Failed to fetch") || errStr.includes("fetch failed") || errStr.includes("connect")) {
      return "Unable to connect to Local LLM. Please start the Built-In Engine (llama-server in local-engine/bin) or open LM Studio / Ollama on your PC.";
    }
  }

  return err.message || errStr;
}

/**
 * Executes an AI generation request using the configured provider
 */
export async function executeMultiProviderGeneration(
  options: GenerationRequestOptions
): Promise<GenerationResult> {
  const providerConfig = options.providerConfig || { provider: "gemini" };
  const provider = providerConfig.provider || "gemini";

  switch (provider) {
    case "openai":
      return await executeOpenAI(options, providerConfig);
    case "claude":
      return await executeClaude(options, providerConfig);
    case "local":
      return await executeLocalLLM(options, providerConfig);
    case "gemini":
    default:
      return await executeGemini(options, providerConfig);
  }
}

/**
 * Execute request using Google Gemini
 */
async function executeGemini(
  options: GenerationRequestOptions,
  config: AIProviderConfig
): Promise<GenerationResult> {
  const envFallback = config.allowEnvFallback ? sanitizeApiKey(process.env.GEMINI_API_KEY) : "";
  const explicitKey = sanitizeApiKey(config.apiKey) || sanitizeApiKey(options.fallbackApiKey) || envFallback;
  let ai = explicitKey ? new GoogleGenAI({
    apiKey: explicitKey,
    httpOptions: { headers: { "User-Agent": "script-automation-studio" } },
  }) : options.userAiClient;

  if (!ai) {
    throw new Error("No Google Gemini API Key configured. Please add a valid Gemini key in Configure AI Provider or switch to your Local Engine / OpenAI / Claude provider.");
  }

  const modelToUse = isGeminiModelId(options.model)
    ? options.model!.trim()
    : isGeminiModelId(config.model)
    ? config.model!.trim()
    : "gemini-3.1-flash-lite";

  const geminiConfig: any = {};

  if (options.systemInstruction) {
    geminiConfig.systemInstruction = options.systemInstruction;
  }
  if (options.temperature !== undefined) {
    geminiConfig.temperature = options.temperature;
  }
  if (options.responseMimeType === "application/json") {
    geminiConfig.responseMimeType = "application/json";
    if (options.jsonSchema) {
      geminiConfig.responseSchema = options.jsonSchema;
    }
  }

  const contents = options.contentsParts && options.contentsParts.length > 0
    ? options.contentsParts
    : options.prompt;

  const response = await ai.models.generateContent({
    model: modelToUse,
    contents,
    config: geminiConfig,
  });

  return {
    text: (response.text || "").trim(),
    providerUsed: "gemini",
    modelUsed: modelToUse,
  };
}

/**
 * Execute request using OpenAI (GPT-4o, GPT-4o-mini, o3-mini)
 */
async function executeOpenAI(
  options: GenerationRequestOptions,
  config: AIProviderConfig
): Promise<GenerationResult> {
  const envFallback = config.allowEnvFallback ? sanitizeApiKey(process.env.OPENAI_API_KEY) : "";
  const apiKey = sanitizeApiKey(config.apiKey) || sanitizeApiKey(options.fallbackApiKey) || envFallback;
  if (!apiKey) {
    throw new Error("No OpenAI API Key configured. Please add your OpenAI key in Settings or .env.");
  }

  const baseUrl = (config.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const modelToUse = isOpenAIModelId(options.model)
    ? options.model!.trim()
    : isOpenAIModelId(config.model)
    ? config.model!.trim()
    : (process.env.OPENAI_MODEL || "").trim() || "gpt-4o-mini";

  const messages: Array<{ role: string; content: string }> = [];
  if (options.systemInstruction) {
    messages.push({ role: "system", content: options.systemInstruction });
  }
  messages.push({ role: "user", content: options.prompt });

  const payload: any = {
    model: modelToUse,
    messages,
    temperature: options.temperature !== undefined ? options.temperature : 0.7,
  };

  if (options.responseMimeType === "application/json") {
    payload.response_format = { type: "json_object" };
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `OpenAI API returned status ${res.status}`);
  }

  const data: any = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";

  return {
    text: text.trim(),
    providerUsed: "openai",
    modelUsed: modelToUse,
  };
}

/**
 * Execute request using Anthropic Claude (Claude 3.7 Sonnet, Claude 3.5 Haiku)
 */
async function executeClaude(
  options: GenerationRequestOptions,
  config: AIProviderConfig
): Promise<GenerationResult> {
  const envFallback = config.allowEnvFallback ? sanitizeApiKey(process.env.ANTHROPIC_API_KEY) : "";
  const apiKey = sanitizeApiKey(config.apiKey) || sanitizeApiKey(options.fallbackApiKey) || envFallback;
  if (!apiKey) {
    throw new Error("No Anthropic Claude API Key configured. Please add your Claude key in Settings or .env.");
  }

  const modelToUse = isClaudeModelId(options.model)
    ? options.model!.trim()
    : isClaudeModelId(config.model)
    ? config.model!.trim()
    : process.env.ANTHROPIC_MODEL || "claude-3-7-sonnet-20250219";

  let finalPrompt = options.prompt;
  if (options.responseMimeType === "application/json") {
    finalPrompt += "\n\nCRITICAL: Respond ONLY with a valid JSON object matching the requested schema. No markdown backticks, no preamble.";
  }

  const payload: any = {
    model: modelToUse,
    max_tokens: 4096,
    messages: [{ role: "user", content: finalPrompt }],
  };

  if (options.systemInstruction) {
    payload.system = options.systemInstruction;
  }
  if (options.temperature !== undefined) {
    payload.temperature = options.temperature;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Anthropic Claude API returned status ${res.status}`);
  }

  const data: any = await res.json();
  const text = data?.content?.[0]?.text || "";

  return {
    text: text.trim(),
    providerUsed: "claude",
    modelUsed: modelToUse,
  };
}

/**
 * Execute request using Local LLMs (Built-In llama.cpp Engine, LM Studio, Ollama, Bionic LLM Studio)
 * Connects to standard local OpenAI-compatible endpoint (e.g. http://127.0.0.1:1279/v1 or http://127.0.0.1:1234/v1)
 */
async function executeLocalLLM(
  options: GenerationRequestOptions,
  config: AIProviderConfig
): Promise<GenerationResult> {
  const rawBaseUrl = config.baseUrl || process.env.LOCAL_LLM_URL || "http://127.0.0.1:1234/v1";
  const baseUrl = rawBaseUrl.replace(/\/+$/, "");
  const modelToUse = isLocalModelId(options.model)
    ? options.model!.trim()
    : isLocalModelId(config.model)
    ? config.model!.trim()
    : process.env.LOCAL_LLM_MODEL || "default";
  const apiKey = sanitizeApiKey(config.apiKey) || sanitizeApiKey(process.env.LOCAL_LLM_API_KEY) || "not-needed";

  const messages: Array<{ role: string; content: string }> = [];
  if (options.systemInstruction) {
    messages.push({ role: "system", content: options.systemInstruction });
  }
  let userContent = options.prompt;
  if (options.responseMimeType === "application/json") {
    userContent += "\n\nCRITICAL: Return ONLY a valid JSON object. Do not include markdown codeblocks or conversational filler.";
  }
  messages.push({ role: "user", content: userContent });

  const payload: any = {
    model: modelToUse,
    messages,
    temperature: options.temperature !== undefined ? options.temperature : 0.7,
  };

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Local LLM server returned error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data: any = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";

    return {
      text: text.trim(),
      providerUsed: "local",
      modelUsed: modelToUse,
    };
  } catch (err: any) {
    if (err.message && (err.message.includes("fetch failed") || err.message.includes("ECONNREFUSED"))) {
      throw new Error(
        `Could not connect to Local LLM at "${baseUrl}". Please start the Built-In Engine or open LM Studio / Ollama.`
      );
    }
    throw err;
  }
}

export interface ChatTurnMessage {
  role: "user" | "assistant" | "system";
  content: string;
  imageDataUrl?: string;
}

export interface ChatRequestOptions {
  messages: ChatTurnMessage[];
  systemInstruction?: string;
  model?: string;
  temperature?: number;
  userAiClient?: GoogleGenAI;
  providerConfig?: AIProviderConfig;
  fallbackApiKey?: string;
}

function parseDataUrlImage(dataUrl?: string): { mimeType: string; data: string } | null {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

/**
 * Execute multi-turn conversational chat across Gemini, OpenAI, Claude, or Local Engines.
 */
export async function executeMultiProviderChat(
  options: ChatRequestOptions
): Promise<GenerationResult> {
  const providerConfig = options.providerConfig || { provider: "gemini" };
  const provider = providerConfig.provider || "gemini";

  switch (provider) {
    case "openai":
      return await executeOpenAIChat(options, providerConfig);
    case "claude":
      return await executeClaudeChat(options, providerConfig);
    case "local":
      return await executeLocalLLMChat(options, providerConfig);
    case "gemini":
    default:
      return await executeGeminiChat(options, providerConfig);
  }
}

async function executeGeminiChat(
  options: ChatRequestOptions,
  config: AIProviderConfig
): Promise<GenerationResult> {
  const envFallback = config.allowEnvFallback ? sanitizeApiKey(process.env.GEMINI_API_KEY) : "";
  const explicitKey =
    sanitizeApiKey(config.apiKey) ||
    sanitizeApiKey(options.fallbackApiKey) ||
    envFallback;
  const ai = explicitKey
    ? new GoogleGenAI({
        apiKey: explicitKey,
        httpOptions: { headers: { "User-Agent": "script-automation-studio" } },
      })
    : options.userAiClient;

  if (!ai) {
    throw new Error(
      "No Google Gemini API Key configured. Add a Gemini key in Configure AI Provider or switch to Local Engine / OpenAI / Claude."
    );
  }

  const modelToUse = isGeminiModelId(options.model)
    ? options.model!.trim()
    : isGeminiModelId(config.model)
    ? config.model!.trim()
    : "gemini-4-hydrogen";

  const contents = options.messages
    .filter((m) => m.role !== "system" && (m.content.trim() || m.imageDataUrl))
    .map((m) => {
      const parts: any[] = [];
      const img = parseDataUrlImage(m.imageDataUrl);
      if (img) {
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
      }
      if (m.content.trim()) {
        parts.push({ text: m.content });
      }
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts,
      };
    });

  const geminiConfig: any = {};
  if (options.systemInstruction?.trim()) {
    geminiConfig.systemInstruction = options.systemInstruction.trim();
  }

  const response = await ai.models.generateContent({
    model: modelToUse,
    contents,
    config: geminiConfig,
  });

  return {
    text: (response.text || "").trim(),
    providerUsed: "gemini",
    modelUsed: modelToUse,
  };
}

async function executeOpenAIChat(
  options: ChatRequestOptions,
  config: AIProviderConfig
): Promise<GenerationResult> {
  const envFallback = config.allowEnvFallback ? sanitizeApiKey(process.env.OPENAI_API_KEY) : "";
  const apiKey =
    sanitizeApiKey(config.apiKey) ||
    sanitizeApiKey(options.fallbackApiKey) ||
    envFallback;
  if (!apiKey) {
    throw new Error("No OpenAI API Key configured. Please add your OpenAI key in Settings or .env.");
  }

  const baseUrl = (config.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/+$/,
    ""
  );
  const modelToUse = isOpenAIModelId(options.model)
    ? options.model!.trim()
    : isOpenAIModelId(config.model)
    ? config.model!.trim()
    : (process.env.OPENAI_MODEL || "").trim() || "gpt-4o-mini";

  const messages: any[] = [];
  if (options.systemInstruction?.trim()) {
    messages.push({ role: "system", content: options.systemInstruction.trim() });
  }

  for (const m of options.messages) {
    if (m.role === "system") continue;
    if (m.imageDataUrl && m.role === "user") {
      const contentParts: any[] = [{ type: "image_url", image_url: { url: m.imageDataUrl } }];
      if (m.content.trim()) {
        contentParts.push({ type: "text", text: m.content });
      }
      messages.push({ role: "user", content: contentParts });
    } else if (m.content.trim()) {
      messages.push({ role: m.role, content: m.content });
    }
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelToUse,
      messages,
      temperature: options.temperature !== undefined ? options.temperature : 0.7,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `OpenAI API returned status ${res.status}`);
  }

  const data: any = await res.json();
  return {
    text: (data?.choices?.[0]?.message?.content || "").trim(),
    providerUsed: "openai",
    modelUsed: modelToUse,
  };
}

async function executeClaudeChat(
  options: ChatRequestOptions,
  config: AIProviderConfig
): Promise<GenerationResult> {
  const envFallback = config.allowEnvFallback ? sanitizeApiKey(process.env.ANTHROPIC_API_KEY) : "";
  const apiKey =
    sanitizeApiKey(config.apiKey) ||
    sanitizeApiKey(options.fallbackApiKey) ||
    envFallback;
  if (!apiKey) {
    throw new Error("No Anthropic Claude API Key configured. Please add your Claude key in Settings or .env.");
  }

  const modelToUse = isClaudeModelId(options.model)
    ? options.model!.trim()
    : isClaudeModelId(config.model)
    ? config.model!.trim()
    : process.env.ANTHROPIC_MODEL || "claude-3-7-sonnet-20250219";

  const claudeMessages: Array<{ role: "user" | "assistant"; content: any }> = [];
  for (const m of options.messages) {
    if (m.role === "system") continue;
    const role: "user" | "assistant" = m.role === "assistant" ? "assistant" : "user";
    const img = role === "user" ? parseDataUrlImage(m.imageDataUrl) : null;
    const blockList: any[] = [];
    if (img) {
      blockList.push({
        type: "image",
        source: { type: "base64", media_type: img.mimeType, data: img.data },
      });
    }
    if (m.content.trim()) {
      blockList.push({ type: "text", text: m.content });
    }
    if (blockList.length === 0) continue;

    const last = claudeMessages[claudeMessages.length - 1];
    if (last && last.role === role) {
      const prevBlocks = Array.isArray(last.content)
        ? last.content
        : [{ type: "text", text: String(last.content) }];
      last.content = [...prevBlocks, ...blockList];
    } else {
      claudeMessages.push({
        role,
        content: blockList.length === 1 && blockList[0].type === "text" ? blockList[0].text : blockList,
      });
    }
  }

  const payload: any = {
    model: modelToUse,
    max_tokens: 4096,
    messages: claudeMessages,
  };
  if (options.systemInstruction?.trim()) {
    payload.system = options.systemInstruction.trim();
  }
  if (options.temperature !== undefined) {
    payload.temperature = options.temperature;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Anthropic Claude API returned status ${res.status}`);
  }

  const data: any = await res.json();
  return {
    text: (data?.content?.[0]?.text || "").trim(),
    providerUsed: "claude",
    modelUsed: modelToUse,
  };
}

async function executeLocalLLMChat(
  options: ChatRequestOptions,
  config: AIProviderConfig
): Promise<GenerationResult> {
  const rawBaseUrl = config.baseUrl || process.env.LOCAL_LLM_URL || "http://127.0.0.1:1279/v1";
  const baseUrl = rawBaseUrl.replace(/\/+$/, "");
  const modelToUse = isLocalModelId(options.model)
    ? options.model!.trim()
    : isLocalModelId(config.model)
    ? config.model!.trim()
    : process.env.LOCAL_LLM_MODEL || "default";
  const apiKey =
    sanitizeApiKey(config.apiKey) || sanitizeApiKey(process.env.LOCAL_LLM_API_KEY) || "not-needed";

  const messages: Array<{ role: string; content: string }> = [];
  if (options.systemInstruction?.trim()) {
    messages.push({ role: "system", content: options.systemInstruction.trim() });
  }
  for (const m of options.messages) {
    if (m.role === "system") continue;
    const text = m.content.trim();
    if (!text && !m.imageDataUrl) continue;
    messages.push({
      role: m.role,
      content: text || "[Image attached — local text model processed text context]",
    });
  }

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelToUse,
        messages,
        temperature: options.temperature !== undefined ? options.temperature : 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Local LLM server returned error ${res.status}: ${errText.slice(0, 220)}`);
    }

    const data: any = await res.json();
    return {
      text: (data?.choices?.[0]?.message?.content || "").trim(),
      providerUsed: "local",
      modelUsed: modelToUse,
    };
  } catch (err: any) {
    if (err.message && (err.message.includes("fetch failed") || err.message.includes("ECONNREFUSED"))) {
      throw new Error(
        `Could not connect to Local LLM at "${baseUrl}". Start your Built-In Engine or open LM Studio / Ollama.`
      );
    }
    throw err;
  }
}
