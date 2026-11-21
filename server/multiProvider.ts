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
  finishReason?: string;
  truncated?: boolean;
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
  let trimmed = raw.trim();
  // Strip accidental surrounding quotes when copied from terminals or JSON
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (PLACEHOLDER_API_KEYS.has(lower) || lower.startsWith("your_")) {
    return "";
  }
  return trimmed;
}

export function createGeminiSdkClient(apiKey: string, vertexExpress = false): GoogleGenAI {
  const trimmed = sanitizeApiKey(apiKey);
  if (trimmed.startsWith("ya29.")) {
    return new GoogleGenAI({
      apiKey: "",
      httpOptions: {
        headers: {
          Authorization: `Bearer ${trimmed}`,
          "User-Agent": "script-automation-studio",
        },
      },
    });
  }
  if (vertexExpress) {
    return new GoogleGenAI({
      vertexai: true,
      apiKey: trimmed,
      httpOptions: {
        headers: {
          "User-Agent": "script-automation-studio",
        },
      },
    });
  }
  return new GoogleGenAI({
    apiKey: trimmed,
    httpOptions: {
      headers: {
        "User-Agent": "script-automation-studio",
      },
    },
  });
}

function shouldRetryAqWithVertexExpress(apiKey: string, err: any): boolean {
  if (!apiKey || !apiKey.startsWith("AQ.")) return false;
  const msg = String(err?.message || err || "").toUpperCase();
  return (
    msg.includes("API_KEY_INVALID") ||
    msg.includes("API KEY NOT VALID") ||
    msg.includes("API KEYS ARE NOT SUPPORTED") ||
    msg.includes("INVALID_ARGUMENT") ||
    msg.includes("UNAUTHENTICATED") ||
    msg.includes("PERMISSION_DENIED") ||
    msg.includes("NOT_FOUND") ||
    msg.includes("400") ||
    msg.includes("401") ||
    msg.includes("403")
  );
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
      return "Google Gemini API Key (AIzaSy... or AQ...) was rejected or lacks Generative Language / Vertex Express API permission. Verify the key in Google AI Studio or switch to OpenAI / Claude.";
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
  let ai = explicitKey ? createGeminiSdkClient(explicitKey, false) : options.userAiClient;

  if (!ai) {
    throw new Error("No Google Gemini API Key configured. Please add a valid Gemini key (AIzaSy... or AQ...) in Configure AI Provider or switch to OpenAI / Claude.");
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
  if (options.temperature !== undefined && !modelToUse.toLowerCase().startsWith("gemini-4")) {
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

  let response: any;
  try {
    response = await ai.models.generateContent({
      model: modelToUse,
      contents,
      config: geminiConfig,
    });
  } catch (err: any) {
    if (explicitKey && shouldRetryAqWithVertexExpress(explicitKey, err)) {
      const vertexAi = createGeminiSdkClient(explicitKey, true);
      response = await vertexAi.models.generateContent({
        model: modelToUse,
        contents,
        config: geminiConfig,
      });
    } else {
      throw err;
    }
  }

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

  const isHaiku = modelToUse.toLowerCase().includes("haiku");
  const payload: any = {
    model: modelToUse,
    max_tokens: isHaiku ? 8192 : 16384,
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
  imageDataUrls?: string[];
}

export interface ChatRequestOptions {
  messages: ChatTurnMessage[];
  systemInstruction?: string;
  model?: string;
  temperature?: number;
  userAiClient?: GoogleGenAI;
  providerConfig?: AIProviderConfig;
  fallbackApiKey?: string;
  signal?: AbortSignal;
}

export interface ChatStreamCallbacks {
  onDelta: (deltaText: string) => void;
}

function parseDataUrlImage(dataUrl?: string): { mimeType: string; data: string } | null {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function getAllMessageImages(m: ChatTurnMessage): string[] {
  const list: string[] = [];
  if (Array.isArray(m.imageDataUrls)) {
    for (const u of m.imageDataUrls) {
      if (typeof u === "string" && u.startsWith("data:image/") && !list.includes(u)) {
        list.push(u);
      }
    }
  }
  if (m.imageDataUrl && m.imageDataUrl.startsWith("data:image/") && !list.includes(m.imageDataUrl)) {
    list.push(m.imageDataUrl);
  }
  return list;
}

function isGemini4Model(modelId: string): boolean {
  return /^gemini-4-/i.test(modelId.trim());
}

function isOpenAIReasoningModel(modelId: string): boolean {
  return /^(o1|o3|o4)(-|$)/i.test(modelId.trim());
}

function buildGeminiChatConfig(options: ChatRequestOptions, modelToUse: string, omitMaxOutputTokens = false): any {
  const geminiConfig: any = {};
  if (options.systemInstruction?.trim()) {
    geminiConfig.systemInstruction = options.systemInstruction.trim();
  }
  if (!isGemini4Model(modelToUse) && options.temperature !== undefined) {
    geminiConfig.temperature = options.temperature;
  }
  if (!omitMaxOutputTokens) {
    // Allow full long-form output (100+ scenes, complete scripts, deep reasoning) without premature cutoff
    geminiConfig.maxOutputTokens = 65536;
  }
  return geminiConfig;
}

function buildGeminiContents(messages: ChatTurnMessage[]) {
  return messages
    .filter((m) => m.role !== "system" && (m.content.trim() || getAllMessageImages(m).length > 0))
    .map((m) => {
      const parts: any[] = [];
      for (const imgUrl of getAllMessageImages(m)) {
        const img = parseDataUrlImage(imgUrl);
        if (img) {
          parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
        }
      }
      if (m.content.trim()) {
        parts.push({ text: m.content });
      }
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts,
      };
    });
}

function resolveGeminiClientAndModel(options: ChatRequestOptions, config: AIProviderConfig) {
  const envFallback = config.allowEnvFallback ? sanitizeApiKey(process.env.GEMINI_API_KEY) : "";
  const explicitKey =
    sanitizeApiKey(config.apiKey) ||
    sanitizeApiKey(options.fallbackApiKey) ||
    envFallback;
  const ai = explicitKey
    ? createGeminiSdkClient(explicitKey, false)
    : options.userAiClient;

  if (!ai) {
    throw new Error(
      "No Google Gemini API Key configured. Add a Gemini key (AIzaSy... or AQ...) in Configure AI Provider or switch to Local Engine / OpenAI / Claude."
    );
  }

  const modelToUse = isGeminiModelId(options.model)
    ? options.model!.trim()
    : isGeminiModelId(config.model)
    ? config.model!.trim()
    : "gemini-3.1-flash-lite";

  return { ai, modelToUse, explicitKey };
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

/**
 * Execute streaming multi-turn conversational chat across Gemini, OpenAI, Claude, or Local Engines.
 */
export async function executeMultiProviderChatStream(
  options: ChatRequestOptions,
  callbacks: ChatStreamCallbacks
): Promise<GenerationResult> {
  const providerConfig = options.providerConfig || { provider: "gemini" };
  const provider = providerConfig.provider || "gemini";

  switch (provider) {
    case "openai":
      return await executeOpenAIChatStream(options, providerConfig, callbacks);
    case "claude":
      return await executeClaudeChatStream(options, providerConfig, callbacks);
    case "local":
      return await executeLocalLLMChatStream(options, providerConfig, callbacks);
    case "gemini":
    default:
      return await executeGeminiChatStream(options, providerConfig, callbacks);
  }
}

async function executeGeminiChat(
  options: ChatRequestOptions,
  config: AIProviderConfig
): Promise<GenerationResult> {
  const { ai, modelToUse, explicitKey } = resolveGeminiClientAndModel(options, config);
  const contents = buildGeminiContents(options.messages);

  let response: any;
  try {
    response = await ai.models.generateContent({
      model: modelToUse,
      contents,
      config: buildGeminiChatConfig(options, modelToUse, false),
    });
  } catch (err: any) {
    if (explicitKey && shouldRetryAqWithVertexExpress(explicitKey, err)) {
      const vertexAi = createGeminiSdkClient(explicitKey, true);
      try {
        response = await vertexAi.models.generateContent({
          model: modelToUse,
          contents,
          config: buildGeminiChatConfig(options, modelToUse, false),
        });
      } catch (vErr: any) {
        const vMsg = String(vErr?.message || "");
        if (vMsg.includes("maxOutputTokens") || vMsg.includes("400") || vMsg.includes("INVALID_ARGUMENT")) {
          response = await vertexAi.models.generateContent({
            model: modelToUse,
            contents,
            config: buildGeminiChatConfig(options, modelToUse, true),
          });
        } else {
          throw vErr;
        }
      }
    } else {
      const msg = String(err?.message || "");
      if (msg.includes("maxOutputTokens") || msg.includes("400") || msg.includes("INVALID_ARGUMENT")) {
        response = await ai.models.generateContent({
          model: modelToUse,
          contents,
          config: buildGeminiChatConfig(options, modelToUse, true),
        });
      } else {
        throw err;
      }
    }
  }

  const finishReason = response?.candidates?.[0]?.finishReason;
  return {
    text: (response.text || "").trim(),
    providerUsed: "gemini",
    modelUsed: modelToUse,
    finishReason,
    truncated: finishReason === "MAX_TOKENS",
  };
}

async function executeGeminiChatStream(
  options: ChatRequestOptions,
  config: AIProviderConfig,
  callbacks: ChatStreamCallbacks
): Promise<GenerationResult> {
  const { ai, modelToUse, explicitKey } = resolveGeminiClientAndModel(options, config);
  const contents = buildGeminiContents(options.messages);

  let stream: any;
  try {
    stream = await ai.models.generateContentStream({
      model: modelToUse,
      contents,
      config: buildGeminiChatConfig(options, modelToUse, false),
    });
  } catch (err: any) {
    if (explicitKey && shouldRetryAqWithVertexExpress(explicitKey, err)) {
      const vertexAi = createGeminiSdkClient(explicitKey, true);
      try {
        stream = await vertexAi.models.generateContentStream({
          model: modelToUse,
          contents,
          config: buildGeminiChatConfig(options, modelToUse, false),
        });
      } catch (vErr: any) {
        const vMsg = String(vErr?.message || "");
        if (vMsg.includes("maxOutputTokens") || vMsg.includes("400") || vMsg.includes("INVALID_ARGUMENT")) {
          stream = await vertexAi.models.generateContentStream({
            model: modelToUse,
            contents,
            config: buildGeminiChatConfig(options, modelToUse, true),
          });
        } else {
          throw vErr;
        }
      }
    } else {
      const msg = String(err?.message || "");
      if (msg.includes("maxOutputTokens") || msg.includes("400") || msg.includes("INVALID_ARGUMENT")) {
        stream = await ai.models.generateContentStream({
          model: modelToUse,
          contents,
          config: buildGeminiChatConfig(options, modelToUse, true),
        });
      } else {
        throw err;
      }
    }
  }

  let fullText = "";
  let finishReason: string | undefined;
  for await (const chunk of stream) {
    if (options.signal?.aborted) break;
    const delta = chunk?.text || "";
    if (delta) {
      fullText += delta;
      callbacks.onDelta(delta);
    }
    const fr = chunk?.candidates?.[0]?.finishReason;
    if (fr) finishReason = fr;
  }

  return {
    text: fullText.trim(),
    providerUsed: "gemini",
    modelUsed: modelToUse,
    finishReason,
    truncated: finishReason === "MAX_TOKENS",
  };
}

function buildOpenAIChatRequest(options: ChatRequestOptions, config: AIProviderConfig) {
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
    const imgs = m.role === "user" ? getAllMessageImages(m) : [];
    if (imgs.length > 0) {
      const contentParts: any[] = imgs.map((url) => ({
        type: "image_url",
        image_url: { url },
      }));
      if (m.content.trim()) {
        contentParts.push({ type: "text", text: m.content });
      }
      messages.push({ role: "user", content: contentParts });
    } else if (m.content.trim()) {
      messages.push({ role: m.role, content: m.content });
    }
  }

  const bodyPayload: any = {
    model: modelToUse,
    messages,
  };
  if (!isOpenAIReasoningModel(modelToUse)) {
    bodyPayload.temperature = options.temperature !== undefined ? options.temperature : 0.7;
    bodyPayload.max_tokens = 16384;
  } else {
    bodyPayload.max_completion_tokens = 32768;
  }

  return { apiKey, baseUrl, modelToUse, bodyPayload };
}

async function executeOpenAIChat(
  options: ChatRequestOptions,
  config: AIProviderConfig
): Promise<GenerationResult> {
  const { apiKey, baseUrl, modelToUse, bodyPayload } = buildOpenAIChatRequest(options, config);

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(bodyPayload),
    signal: options.signal,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `OpenAI API returned status ${res.status}`);
  }

  const data: any = await res.json();
  const finishReason = data?.choices?.[0]?.finish_reason;
  return {
    text: (data?.choices?.[0]?.message?.content || "").trim(),
    providerUsed: "openai",
    modelUsed: modelToUse,
    finishReason,
    truncated: finishReason === "length",
  };
}

async function executeOpenAIChatStream(
  options: ChatRequestOptions,
  config: AIProviderConfig,
  callbacks: ChatStreamCallbacks
): Promise<GenerationResult> {
  const { apiKey, baseUrl, modelToUse, bodyPayload } = buildOpenAIChatRequest(options, config);

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...bodyPayload, stream: true }),
    signal: options.signal,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `OpenAI API returned status ${res.status}`);
  }

  if (!res.body) {
    return await executeOpenAIChat(options, config);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let finishReason: string | undefined;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) {
          fullText += delta;
          callbacks.onDelta(delta);
        }
        const fr = parsed?.choices?.[0]?.finish_reason;
        if (fr) finishReason = fr;
      } catch {
        // Ignore partial JSON lines
      }
    }
  }

  return {
    text: fullText.trim(),
    providerUsed: "openai",
    modelUsed: modelToUse,
    finishReason,
    truncated: finishReason === "length",
  };
}

function buildClaudeChatRequest(options: ChatRequestOptions, config: AIProviderConfig) {
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
    const imgs = role === "user" ? getAllMessageImages(m) : [];
    const blockList: any[] = [];
    for (const imgUrl of imgs) {
      const img = parseDataUrlImage(imgUrl);
      if (img) {
        blockList.push({
          type: "image",
          source: { type: "base64", media_type: img.mimeType, data: img.data },
        });
      }
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

  const isHaiku = modelToUse.toLowerCase().includes("haiku");
  const payload: any = {
    model: modelToUse,
    max_tokens: isHaiku ? 8192 : 16384,
    messages: claudeMessages,
  };
  if (options.systemInstruction?.trim()) {
    payload.system = options.systemInstruction.trim();
  }
  if (options.temperature !== undefined) {
    payload.temperature = options.temperature;
  }

  return { apiKey, modelToUse, payload };
}

async function executeClaudeChat(
  options: ChatRequestOptions,
  config: AIProviderConfig
): Promise<GenerationResult> {
  const { apiKey, modelToUse, payload } = buildClaudeChatRequest(options, config);

  let res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  if (!res.ok && payload.max_tokens > 8192) {
    const errClone = await res.json().catch(() => ({}));
    if (String(errClone?.error?.message || "").toLowerCase().includes("max_tokens")) {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ ...payload, max_tokens: 8192 }),
        signal: options.signal,
      });
    } else {
      throw new Error(errClone?.error?.message || `Anthropic Claude API returned status ${res.status}`);
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Anthropic Claude API returned status ${res.status}`);
  }

  const data: any = await res.json();
  const stopReason = data?.stop_reason;
  return {
    text: (data?.content?.[0]?.text || "").trim(),
    providerUsed: "claude",
    modelUsed: modelToUse,
    finishReason: stopReason,
    truncated: stopReason === "max_tokens",
  };
}

async function executeClaudeChatStream(
  options: ChatRequestOptions,
  config: AIProviderConfig,
  callbacks: ChatStreamCallbacks
): Promise<GenerationResult> {
  const { apiKey, modelToUse, payload } = buildClaudeChatRequest(options, config);

  let res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ ...payload, stream: true }),
    signal: options.signal,
  });

  if (!res.ok && payload.max_tokens > 8192) {
    const errClone = await res.json().catch(() => ({}));
    if (String(errClone?.error?.message || "").toLowerCase().includes("max_tokens")) {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ ...payload, max_tokens: 8192, stream: true }),
        signal: options.signal,
      });
    } else {
      throw new Error(errClone?.error?.message || `Anthropic Claude API returned status ${res.status}`);
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Anthropic Claude API returned status ${res.status}`);
  }

  if (!res.body) {
    return await executeClaudeChat(options, config);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let stopReason: string | undefined;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr || jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.type === "content_block_delta" && typeof parsed?.delta?.text === "string") {
          fullText += parsed.delta.text;
          callbacks.onDelta(parsed.delta.text);
        } else if (parsed.type === "message_delta" && parsed?.delta?.stop_reason) {
          stopReason = parsed.delta.stop_reason;
        }
      } catch {
        // Ignore partial chunk
      }
    }
  }

  return {
    text: fullText.trim(),
    providerUsed: "claude",
    modelUsed: modelToUse,
    finishReason: stopReason,
    truncated: stopReason === "max_tokens",
  };
}

function buildLocalChatRequest(options: ChatRequestOptions, config: AIProviderConfig) {
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
    const hasImgs = getAllMessageImages(m).length > 0;
    if (!text && !hasImgs) continue;
    messages.push({
      role: m.role,
      content: text || "[Image attached — local text model processed text context]",
    });
  }

  const bodyPayload = {
    model: modelToUse,
    messages,
    max_tokens: 16384,
    temperature: options.temperature !== undefined ? options.temperature : 0.7,
  };

  return { baseUrl, modelToUse, apiKey, bodyPayload };
}

async function executeLocalLLMChat(
  options: ChatRequestOptions,
  config: AIProviderConfig
): Promise<GenerationResult> {
  const { baseUrl, modelToUse, apiKey, bodyPayload } = buildLocalChatRequest(options, config);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(bodyPayload),
      signal: options.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Local LLM server returned error ${res.status}: ${errText.slice(0, 220)}`);
    }

    const data: any = await res.json();
    const finishReason = data?.choices?.[0]?.finish_reason;
    return {
      text: (data?.choices?.[0]?.message?.content || "").trim(),
      providerUsed: "local",
      modelUsed: modelToUse,
      finishReason,
      truncated: finishReason === "length",
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

async function executeLocalLLMChatStream(
  options: ChatRequestOptions,
  config: AIProviderConfig,
  callbacks: ChatStreamCallbacks
): Promise<GenerationResult> {
  const { baseUrl, modelToUse, apiKey, bodyPayload } = buildLocalChatRequest(options, config);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ ...bodyPayload, stream: true }),
      signal: options.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Local LLM server returned error ${res.status}: ${errText.slice(0, 220)}`);
    }

    if (!res.body) {
      return await executeLocalLLMChat(options, config);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";
    let finishReason: string | undefined;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            fullText += delta;
            callbacks.onDelta(delta);
          }
          const fr = parsed?.choices?.[0]?.finish_reason;
          if (fr) finishReason = fr;
        } catch {
          // Ignore partial SSE chunk
        }
      }
    }

    return {
      text: fullText.trim(),
      providerUsed: "local",
      modelUsed: modelToUse,
      finishReason,
      truncated: finishReason === "length",
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
