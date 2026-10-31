import { GoogleGenAI } from "@google/genai";

export type AIProviderType = "gemini" | "openai" | "claude" | "local";

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey?: string;
  model?: string;
  baseUrl?: string; // For local/OpenAI-compatible models (e.g. http://localhost:1234/v1 or http://localhost:11434/v1)
}

export interface GenerationRequestOptions {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  temperature?: number;
  responseMimeType?: string;
  jsonSchema?: any;
  userAiClient?: GoogleGenAI;
  providerConfig?: AIProviderConfig;
  fallbackApiKey?: string;
}

export interface GenerationResult {
  text: string;
  providerUsed: AIProviderType;
  modelUsed: string;
}

/**
 * Format errors across different providers into clean user-friendly messages
 */
export function formatProviderErrorMessage(provider: AIProviderType, err: any): string {
  if (!err) return "Unknown AI generation error";
  const errStr = typeof err === "string" ? err : err.message || JSON.stringify(err);

  if (provider === "gemini") {
    if (errStr.includes("API_KEY_SERVICE_BLOCKED") || errStr.includes("API_KEY_INVALID")) {
      return "Google Gemini API Key is invalid or restricted. Please check your key in Google AI Studio.";
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
    if (errStr.includes("ECONNREFUSED") || errStr.includes("Failed to fetch") || errStr.includes("connect")) {
      return "Unable to connect to Local LLM (LM Studio / Ollama / Bionic). Please ensure your local model server is running and the port is correct (e.g. http://localhost:1234/v1).";
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
  const apiKey = config.apiKey || options.fallbackApiKey || process.env.GEMINI_API_KEY || "";
  let ai = options.userAiClient;

  if (!ai && apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: { headers: { "User-Agent": "script-automation-studio" } },
    });
  }

  if (!ai) {
    throw new Error("No Google Gemini API Key configured. Please add your key in Settings or .env.");
  }

  const modelToUse = options.model || config.model || "gemini-3.1-flash-lite";
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

  const response = await ai.models.generateContent({
    model: modelToUse,
    contents: options.prompt,
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
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    throw new Error("No OpenAI API Key configured. Please add your OpenAI key in Settings or .env.");
  }

  const baseUrl = (config.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const modelToUse = options.model || config.model || process.env.OPENAI_MODEL || "gpt-4o-mini";

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
      Authorization: `Bearer ${apiKey.trim()}`,
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
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || "";
  if (!apiKey) {
    throw new Error("No Anthropic Claude API Key configured. Please add your Claude key in Settings or .env.");
  }

  const modelToUse = options.model || config.model || process.env.ANTHROPIC_MODEL || "claude-3-7-sonnet-20250219";

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
      "x-api-key": apiKey.trim(),
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
 * Execute request using Local LLMs (LM Studio, Ollama, Bionic LLM Studio, LocalAI, vLLM)
 * Connects to standard local OpenAI-compatible endpoint (e.g. http://localhost:1234/v1)
 */
async function executeLocalLLM(
  options: GenerationRequestOptions,
  config: AIProviderConfig
): Promise<GenerationResult> {
  const rawBaseUrl = config.baseUrl || process.env.LOCAL_LLM_URL || "http://localhost:1234/v1";
  const baseUrl = rawBaseUrl.replace(/\/+$/, "");
  const modelToUse = options.model || config.model || process.env.LOCAL_LLM_MODEL || "default-model";
  const apiKey = config.apiKey || process.env.LOCAL_LLM_API_KEY || "not-needed";

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
        `Could not connect to Local LLM at "${baseUrl}". Please make sure LM Studio, Ollama, or Bionic LLM server is started.`
      );
    }
    throw err;
  }
}
