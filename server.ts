import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };
import { encryptApiKey, decryptApiKey, maskApiKey } from "./server/encryption.js";
import {
  getFirestoreDoc,
  updateFirestoreDoc,
  deleteFirestoreDoc,
  listFirestoreCollection,
} from "./server/firestoreRest.js";
import { imageProviderRegistry } from "./server/imageProviders/index.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Helper to verify Firebase Auth ID token via Google Identity Toolkit API
async function verifyAuthToken(idToken: string): Promise<{ uid: string; email?: string; name?: string }> {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || "Invalid or expired authentication token.");
  }

  const data = await response.json();
  if (!data.users || data.users.length === 0) {
    throw new Error("User associated with token not found.");
  }

  const user = data.users[0];
  return {
    uid: user.localId,
    email: user.email,
    name: user.displayName,
  };
}

// Interface for Authenticated Requests
interface AuthenticatedRequest extends express.Request {
  userAuth?: { uid: string; email?: string };
  userAiClient?: GoogleGenAI;
  userApiKey?: string;
}

// Helper to create a GoogleGenAI client supporting both standard API keys (AIzaSy...) and OAuth access tokens (AQ..., ya29...)
function createGoogleGenAIClient(apiKey: string): GoogleGenAI {
  const trimmed = apiKey.trim();
  if (trimmed.startsWith("AQ.") || trimmed.startsWith("ya29.")) {
    return new GoogleGenAI({
      apiKey: trimmed,
      httpOptions: {
        headers: {
          "Authorization": `Bearer ${trimmed}`,
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

// Authentication Middleware - Enforces user login and personal API key configuration
async function verifyUserAuth(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required. Please log in to access AI features." });
    }

    const token = authHeader.substring(7);
    const userInfo = await verifyAuthToken(token);
    req.userAuth = userInfo;

    // Retrieve user document from Firestore to get encrypted API key
    const userDocSnap = await getFirestoreDoc("users", userInfo.uid, token);

    if (!userDocSnap.exists || !userDocSnap.data) {
      return res.status(403).json({ error: "User account profile not found. Please log in again." });
    }

    const userData = userDocSnap.data;
    const encryptedKey = userData.encryptedApiKey;

    if (!encryptedKey) {
      return res.status(403).json({
        error: "NO_API_KEY",
        message: "No personal Google AI API Key set up for this account. Please add your API Key in Settings.",
      });
    }

    const plainKey = decryptApiKey(encryptedKey);
    if (!plainKey || !plainKey.trim()) {
      return res.status(403).json({
        error: "NO_API_KEY",
        message: "Invalid or corrupted API Key. Please re-enter your API key in Settings.",
      });
    }

    // Create a new GoogleGenAI client exclusively using the logged-in user's API key
    req.userApiKey = plainKey;
    req.userAiClient = createGoogleGenAIClient(plainKey);

    next();
  } catch (error: any) {
    console.error("Auth Verification Error:", error.message || error);
    return res.status(401).json({ error: "Authentication failed. Please sign in again." });
  }
}

// Wrapper to call Gemini API with automatic retry and exponential backoff using user's AI client
async function generateContentWithRetry(ai: GoogleGenAI, params: any, maxRetries = 3, delayMs = 1500) {
  let attempt = 0;
  while (true) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      attempt++;
      console.error(`Gemini API call failed (attempt ${attempt}/${maxRetries}):`, error);

      // Check if the error is due to model availability (e.g. model not found or unsupported)
      const errStr = String(error).toLowerCase();
      const isAvailabilityError = 
        errStr.includes("not found") || 
        errStr.includes("not_found") || 
        errStr.includes("not supported") || 
        errStr.includes("unsupported") || 
        errStr.includes("404") ||
        errStr.includes("invalid model") ||
        errStr.includes("model is deprecated");

      if (isAvailabilityError) {
        if (params.model === "gemini-3.1-flash-lite") {
          console.warn("Model gemini-3.1-flash-lite is not found/unsupported. Falling back to gemini-3.6-flash.");
          params.model = "gemini-3.6-flash";
        } else if (params.model === "gemini-3.6-flash") {
          console.warn("Model gemini-3.6-flash is not found/unsupported. Falling back to gemini-3.1-flash-lite.");
          params.model = "gemini-3.1-flash-lite";
        }
      }

      if (attempt >= maxRetries) {
        throw error;
      }

      const backoff = delayMs * Math.pow(2.2, attempt - 1);
      console.log(`Transient Gemini API error detected. Retrying in ${Math.round(backoff)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
}

// User Management Endpoints
app.post("/api/user/save-key", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required." });
    }
    const token = authHeader.substring(7);
    const userInfo = await verifyAuthToken(token);

    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      return res.status(400).json({ error: "API Key is required." });
    }

    const trimmedKey = apiKey.trim();

    // Validate the key against Gemini API with test pings supporting AIza and AQ tokens
    let pingSuccess = false;
    let lastError: any = null;
    const testModels = ["gemini-3.6-flash", "gemini-3.1-flash-lite"];

    // Try primary auto-configured client first
    const testAi = createGoogleGenAIClient(trimmedKey);
    for (const modelName of testModels) {
      try {
        await testAi.models.generateContent({
          model: modelName,
          contents: "API Key Ping Test",
        });
        pingSuccess = true;
        break;
      } catch (err) {
        lastError = err;
      }
    }

    // Fallback 1: Bearer token mode if initial ping failed
    if (!pingSuccess) {
      try {
        const bearerAi = new GoogleGenAI({
          apiKey: "",
          httpOptions: {
            headers: {
              "Authorization": `Bearer ${trimmedKey}`,
              "User-Agent": "script-automation-studio",
            },
          },
        });
        for (const modelName of testModels) {
          try {
            await bearerAi.models.generateContent({
              model: modelName,
              contents: "API Key Ping Test",
            });
            pingSuccess = true;
            break;
          } catch (err) {
            lastError = err;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // Fallback 2: Standard API key mode
    if (!pingSuccess) {
      try {
        const standardAi = new GoogleGenAI({
          apiKey: trimmedKey,
          httpOptions: {
            headers: {
              "User-Agent": "script-automation-studio",
            },
          },
        });
        for (const modelName of testModels) {
          try {
            await standardAi.models.generateContent({
              model: modelName,
              contents: "API Key Ping Test",
            });
            pingSuccess = true;
            break;
          } catch (err) {
            lastError = err;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    if (!pingSuccess) {
      console.error("API Key Validation Ping Failed:", lastError);
      const detailedMsg = lastError?.message || (typeof lastError === "object" ? JSON.stringify(lastError) : String(lastError));
      return res.status(400).json({
        error: `API Key validation failed: ${detailedMsg}. Please check that your key is valid, has correct permissions, and is active in Google AI Studio.`,
      });
    }

    // Encrypt key and derive mask
    const encrypted = encryptApiKey(trimmedKey);
    const masked = maskApiKey(trimmedKey);

    await updateFirestoreDoc("users", userInfo.uid, {
      encryptedApiKey: encrypted,
      apiKeyMasked: masked,
      updatedAt: new Date().toISOString(),
    }, token);

    return res.json({ success: true, apiKeyMasked: masked });
  } catch (error: any) {
    console.error("Error saving API Key:", error);
    return res.status(500).json({ error: error.message || "Failed to save API Key." });
  }
});

app.post("/api/user/remove-key", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required." });
    }
    const token = authHeader.substring(7);
    const userInfo = await verifyAuthToken(token);

    await updateFirestoreDoc("users", userInfo.uid, {
      encryptedApiKey: null,
      apiKeyMasked: null,
      updatedAt: new Date().toISOString(),
    }, token);

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error removing API Key:", error);
    return res.status(500).json({ error: error.message || "Failed to remove API Key." });
  }
});

app.get("/api/user/available-models", verifyUserAuth as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
  try {
    const ai = req.userAiClient!;
    const defaultModels = [
      { id: "gemini-3.6-flash", displayName: "Gemini 3.6 Flash (Fast & Capable)" },
      { id: "gemini-3.1-pro-preview", displayName: "Gemini 3.1 Pro (Reasoning & Quality)" },
      { id: "gemini-3.1-flash-lite", displayName: "Gemini 3.1 Flash Lite (Ultra Fast)" },
      { id: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash-lite", displayName: "Gemini 2.5 Flash Lite" },
    ];

    try {
      const response = await ai.models.list();
      const dynamicList: any[] = [];
      if (response && Array.isArray((response as any).models)) {
        for (const m of (response as any).models) {
          if (m.name && m.name.includes("gemini")) {
            const cleanId = m.name.replace(/^models\//, "");
            dynamicList.push({
              id: cleanId,
              displayName: m.displayName || cleanId,
            });
          }
        }
      }
      if (dynamicList.length > 0) {
        return res.json({ models: dynamicList });
      }
    } catch (e) {
      console.warn("Dynamic model fetching failed, using fallback list:", e);
    }

    return res.json({ models: defaultModels });
  } catch (error: any) {
    console.error("Error in available-models:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch available models." });
  }
});

app.post("/api/user/model-settings", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required." });
    }
    const token = authHeader.substring(7);
    const userInfo = await verifyAuthToken(token);

    const { modelSettings } = req.body;
    if (!modelSettings) {
      return res.status(400).json({ error: "Model settings required." });
    }

    await updateFirestoreDoc("users", userInfo.uid, {
      modelSettings,
      updatedAt: new Date().toISOString(),
    }, token);

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error saving model settings:", error);
    return res.status(500).json({ error: error.message || "Failed to save model settings." });
  }
});

app.post("/api/user/delete-account", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required." });
    }
    const token = authHeader.substring(7);
    const userInfo = await verifyAuthToken(token);

    await deleteFirestoreDoc("users", userInfo.uid, token);

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting user account:", error);
    return res.status(500).json({ error: error.message || "Failed to delete account." });
  }
});

// Admin Endpoints
const ADMIN_PRIMARY_EMAIL = "tahsinirshad7370@gmail.com";

app.get("/api/admin/users", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required." });
    }
    const token = authHeader.substring(7);
    const userInfo = await verifyAuthToken(token);

    const callerEmail = (userInfo.email || "").toLowerCase();
    const callerSnap = await getFirestoreDoc("users", userInfo.uid, token);
    const isCallerAdmin = callerEmail === ADMIN_PRIMARY_EMAIL || (callerSnap.exists && callerSnap.data?.role === "admin");

    if (!isCallerAdmin) {
      return res.status(403).json({ error: "Access denied. Admin privileges required." });
    }

    const docsList = await listFirestoreCollection("users", token);
    const usersList: any[] = [];

    docsList.forEach(({ id, data }) => {
      const userEmail = (data.email || "").toLowerCase();
      const isAdmin = userEmail === ADMIN_PRIMARY_EMAIL || data.role === "admin";

      usersList.push({
        userId: id,
        name: data.name || "User",
        email: data.email || "No email",
        provider: data.provider || "password",
        role: isAdmin ? "admin" : (data.role || "user"),
        isAdmin,
        hasApiKey: Boolean(data.encryptedApiKey || data.apiKeyMasked),
        apiKeyMasked: data.apiKeyMasked || null,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      });
    });

    return res.json({ users: usersList });
  } catch (error: any) {
    console.error("Admin list users error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch user list." });
  }
});

app.post("/api/admin/toggle-role", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required." });
    }
    const token = authHeader.substring(7);
    const userInfo = await verifyAuthToken(token);

    const callerEmail = (userInfo.email || "").toLowerCase();
    const callerSnap = await getFirestoreDoc("users", userInfo.uid, token);
    const isCallerAdmin = callerEmail === ADMIN_PRIMARY_EMAIL || (callerSnap.exists && callerSnap.data?.role === "admin");

    if (!isCallerAdmin) {
      return res.status(403).json({ error: "Access denied. Admin privileges required." });
    }

    const { targetUserId, newRole } = req.body;
    if (!targetUserId || !["admin", "user"].includes(newRole)) {
      return res.status(400).json({ error: "Target userId and valid role ('admin' | 'user') required." });
    }

    const targetSnap = await getFirestoreDoc("users", targetUserId, token);
    const targetEmail = targetSnap.exists ? targetSnap.data?.email || "" : "";

    await updateFirestoreDoc("users", targetUserId, {
      role: newRole,
      updatedAt: new Date().toISOString(),
    }, token);

    if (newRole === "admin") {
      await updateFirestoreDoc("admins", targetUserId, {
        userId: targetUserId,
        email: targetEmail,
        role: "admin",
        updatedAt: new Date().toISOString(),
      }, token);
    } else {
      await deleteFirestoreDoc("admins", targetUserId, token).catch(() => {});
    }

    return res.json({ success: true, targetUserId, newRole });
  } catch (error: any) {
    console.error("Admin toggle role error:", error);
    return res.status(500).json({ error: error.message || "Failed to update user role." });
  }
});

// ============================================================================
// Google Flow Image Studio API Routes
// ============================================================================

// GET Available Models & Provider Config
app.get("/api/image-studio/models", async (req, res) => {
  try {
    const activeProvider = imageProviderRegistry.getActiveProvider();
    const allProviders = imageProviderRegistry.getAllProviders();
    const models = await activeProvider.getAvailableModels();

    return res.json({
      activeProvider: {
        id: activeProvider.id,
        name: activeProvider.name,
        description: activeProvider.description,
        isOfficialFlow: activeProvider.isOfficialFlow,
      },
      allProviders,
      models,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to load image models." });
  }
});

// POST Generate Images
app.post("/api/image-studio/generate", verifyUserAuth as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
  try {
    const { prompt, negativePrompt, model, aspectRatio, numberOfImages, stylePreset, seed, referenceImage } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Image generation prompt is required." });
    }

    const apiKey = req.userApiKey;
    if (!apiKey) {
      return res.status(403).json({
        error: "NO_API_KEY",
        message: "No personal Google AI API Key set up for this account. Please add your API Key in Settings.",
      });
    }

    const activeProvider = imageProviderRegistry.getActiveProvider();
    const images = await activeProvider.generateImages(apiKey, {
      prompt,
      negativePrompt,
      model,
      aspectRatio,
      numberOfImages: numberOfImages || 1,
      stylePreset,
      seed,
      referenceImage,
    });

    // Save generated images to user Firestore history if authenticated
    if (req.userAuth?.uid && req.headers.authorization) {
      const token = req.headers.authorization.substring(7);
      try {
        const userDoc = await getFirestoreDoc("users", req.userAuth.uid, token);
        const existingHistory = userDoc.data?.imageHistory || [];
        const updatedHistory = [...images, ...existingHistory].slice(0, 50); // Keep last 50
        await updateFirestoreDoc("users", req.userAuth.uid, {
          imageHistory: updatedHistory,
          updatedAt: new Date().toISOString(),
        }, token);
      } catch (histErr) {
        console.warn("Failed to save image history to Firestore:", histErr);
      }
    }

    return res.json({ success: true, images });
  } catch (error: any) {
    console.error("Image generation error:", error);
    return res.status(500).json({ error: error.message || "Image generation failed." });
  }
});

// POST AI Prompt Enhancer (Google Flow Style "Enhance / Expand Prompt")
app.post("/api/image-studio/enhance-prompt", verifyUserAuth as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
  try {
    const { prompt, stylePreset } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt text is required." });
    }

    const ai = req.userAiClient!;
    const enhancementPrompt = `
You are an expert AI Image Generation Prompt Engineer specializing in Google Flow Studio and Imagen 3 prompts.
Transform the following raw user prompt into a rich, highly detailed, photorealistic visual prompt suitable for Google Flow / Imagen 3.
Incorporate lighting, camera angle, atmospheric details, artistic composition, texture, color grading, and focal clarity.
If a style preset is specified (${stylePreset || "None"}), seamlessly integrate that style.

User Raw Prompt: "${prompt}"

Return ONLY the enhanced prompt string. Do not include markdown headers, quotes, or conversational preamble.
`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: enhancementPrompt,
    });

    const enhancedText = response.text ? response.text.trim() : prompt;
    return res.json({ success: true, enhancedPrompt: enhancedText });
  } catch (error: any) {
    console.error("Enhance prompt error:", error);
    return res.status(500).json({ error: error.message || "Failed to enhance prompt." });
  }
});

// GET Image History
app.get("/api/image-studio/history", verifyUserAuth as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
  try {
    const token = req.headers.authorization!.substring(7);
    const userDoc = await getFirestoreDoc("users", req.userAuth!.uid, token);
    const history = userDoc.data?.imageHistory || [];
    return res.json({ success: true, history });
  } catch (error: any) {
    console.error("Get image history error:", error);
    return res.status(500).json({ error: error.message || "Failed to retrieve image history." });
  }
});

// DELETE Image from History
app.delete("/api/image-studio/history/:imageId", verifyUserAuth as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
  try {
    const { imageId } = req.params;
    const token = req.headers.authorization!.substring(7);
    const userDoc = await getFirestoreDoc("users", req.userAuth!.uid, token);
    const existingHistory: any[] = userDoc.data?.imageHistory || [];
    const updatedHistory = existingHistory.filter((img: any) => img.id !== imageId);

    await updateFirestoreDoc("users", req.userAuth!.uid, {
      imageHistory: updatedHistory,
      updatedAt: new Date().toISOString(),
    }, token);

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Delete image history error:", error);
    return res.status(500).json({ error: error.message || "Failed to delete image." });
  }
});

// Protected AI Script Generation API Routes
app.post("/api/generate", verifyUserAuth as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      rawScript,
      transformation,
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

    if (!rawScript || rawScript.trim() === "") {
      return res.status(400).json({ error: "Source script is required." });
    }

    const ai = req.userAiClient!;
    
    const modelToUse = req.body.model || "gemini-3.1-flash-lite";

    // Build unique list of transformations ensuring user selected language is always included
    const primaryTransform = transformation || "urdu-roman";
    const defaultTransformations = ["hindi", "urdu-roman", "urdu-writing", "english"];
    const transformations = Array.from(new Set([primaryTransform, ...defaultTransformations]));

    const generateForTransformation = async (transOpt: string) => {
      const langInfo = resolveTargetLanguage(transOpt);
      const isIslamic = (topicNiche && topicNiche.toLowerCase().includes("islamic")) || 
                        (tutorialTone && tutorialTone.toLowerCase().includes("islamic"));
      const islamicInstruction = isIslamic ? `
10. ISLAMIC CONTENT DIRECTION (CRITICAL):
    - Since the topic/category or tone is Islamic-related, integrate respectful Islamic terminologies, values, modest and humble wording, and phrases where appropriate (e.g., "Alhamdulillah", "InshaAllah", "MashaAllah", "SubhanAllah").
    - If referencing children, represent them as respectful, eager, and modest (e.g., studying Islamic values, wearing modest Islamic dress).
    - If referencing adults, represent them as respectful, modest, and knowledgeable (e.g., wearing traditional Islamic attire, seeking or teaching religious/historical knowledge).
` : "";

      // System Instructions to guide the voice persona, plagiarism-free requirement, language, structure, etc.
      const systemInstruction = `
You are an elite, professional Script Automation Engineer and Creative Rephraser.
Your goal is to completely transform the user's RAW input script into a pristine, high-engagement, 100% unique, plagiarism-free script for social media (YouTube, Facebook, etc.).

Strict rules for formatting and content:
1. Avoid plagiarism. Rephrase every single sentence using the best possible wording, vocabulary, and sentence structures. Never copy phrases verbatim from the raw input unless they are highly specific medical/scientific names that cannot be translated or rephrased.
2. Respect the VOICE PERSONA (Speaker) and GENDER persona:
   - Voice Persona: ${voicePersona ? voicePersona.toUpperCase() : "MALE"}
   - If Female: Use female grammatical conjugations, vocabulary, and styling (e.g. in Hindi/Urdu, use feminine gender verbs/pronouns like "kartii hoon", "rahii hoon", "merii", "jaungii", "sikhayungii"; in English, use warm, welcoming, friendly, empathetic, and inclusive vocabulary).
   - If Male: Use male grammatical conjugations, vocabulary, and styling (e.g. in Hindi/Urdu, use masculine gender verbs/pronouns like "karta hoon", "raha hoon", "mera", "jaunga", "sikhayunga"; in English, use confident, authoritative, energetic, and direct vocabulary).
3. Apply the TRANSFORMATION option:
   - Option selected: "${transOpt}" (${langInfo.name}, ${langInfo.scriptHint})
   - If "hindi": Translate/Rephrase entirely into Devanagari script (Hindi characters/writing). It MUST be written exactly in beautiful Hindi script (e.g. "अस्सलामु अलैकुम", "दोस्तों", "ज़िंदगी", "मुहब्बत", "ख़ुशामदीद", "शुक्रिया", "जनाब", "क्या आप जानते हैं", "आज हम बात करेंगे"). It is STRICTLY FORBIDDEN to use Roman Urdu or Latin letters for this option. The script must be in Devanagari characters but utilizing 100% beautiful spoken Urdu vocabulary, elegant Urdu sentence structures, and refined Urdu phonetic cadence. You MUST completely avoid pure, formal, or Sanskritized Hindi words.
   - If "urdu-roman": Translate/Rephrase entirely into Urdu written in Roman letters (e.g., "Assalamu Alaikum dosto, aaj hum baat karenge..."). Use conversational, native, and easy-to-read Roman Urdu wording.
   - If "english": Translate/Rephrase entirely into fluent, highly engaging English.
   - If "urdu-writing": Translate/Rephrase entirely into beautiful, professional Urdu script (Nastaliq/Arabic script, using proper Urdu characters) in the authentic Pakistani Urdu language. You must use rich, elegant Pakistani Urdu vocabulary and proper Urdu Nastaliq punctuation, phrasing, and sentence structures.
   - For all other target options (${langInfo.name}): Translate/Rephrase entirely into native, fluent, highly engaging ${langInfo.name} (${langInfo.scriptHint}).
4. Adapt perfectly to the TARGET AUDIENCE:
   - Option selected: "${targetAudience || "adults"}"
   - If "children": Target audience is Children up to 10 years old. Use very simple, exciting, energetic vocabulary. Include playful expressions and sound cue descriptors in square brackets (e.g. "[Gasp!]", "[Excited sound effect]", "[Cheerful laughter]") to guide the voice-over artist. Ensure the tone is friendly and highly educational yet fun.
   - If "adults": Target audience is Adults up to 40 years old. Use engaging, professional, analytical, and highly persuasive modern phrasing. Bring out interesting facts and maintain high narrative density.
   - If "seniors": Target audience is Men over 60 years old. Wording must be extremely respectful, polite, and paced. Use formal honorifics and mature vocabulary (e.g. in Hindi/Urdu, use "Aap", "Aadab", "Tashreef", "Shukriya", "Buzurgo"; in English, use clear, elegant, and classy prose with balanced, respectful phrasing).
5. Tone / Niche Theme:
   - Topic Niche: "${topicNiche || "General"}"
   - Tutorial & Literature Tone: "${tutorialTone || "Informative"}"
   - Align the rhythm, vocabulary, and metaphors with this category.
6. Target Word Volume Expansion / Condensation Directive:
   - The target word volume has been specified as: ${wordCount || 300} words.
   - You MUST ensure the final output script MEETS or EXCEEDS this target.
   - If the raw input is brief but the requested word count is high, expand creatively and thoroughly. If long, condense effectively while preserving high value.
7. Structure, Hooks, and Dynamic Language-Aware Section Headings (CRITICAL):
   - Custom Hook requested: "${customHook || "None"}"
   - Greetings Prefix: "${greetingsPrefix || "None"}"
   - SECTION STRUCTURE & LANGUAGE-AWARE TITLE FORMAT DIRECTIVE:
${includeHooksBodyConclusion ? `     You MUST organize the script into distinct, well-structured sections written ENTIRELY IN THE TARGET LANGUAGE (${langInfo.name}).
     EVERY section MUST start with a clean, plain text descriptive title written ENTIRELY IN THE TARGET LANGUAGE (${langInfo.name}, ${langInfo.scriptHint}).
     Both the section prefix AND the descriptive topic title MUST MATCH the selected output language ("${langInfo.name}") in script, vocabulary, and phrasing.
     Do NOT use asterisks (*), hash symbols (#), markdown bold/italics, or brackets []. Output ONLY clean, plain text headings on their own line, followed by the polished paragraph.` : `     Structure naturally into clean paragraphs written in ${langInfo.name}. If section headings are included, ensure they are written entirely in ${langInfo.name} (${langInfo.scriptHint}) in clean plain text format without asterisks (*), brackets (), or markdown symbols (#).`}
   - Incorporate the custom hook "${customHook || ""}" and greeting "${greetingsPrefix && greetingsPrefix !== "None" ? greetingsPrefix : ""}" beautifully at the very beginning to hook the listener instantly.
   - At the very end of the Conclusion/outro section, you MUST always include a call-to-action subscription message encouraging viewers to like the video and subscribe to the channel, written natively in ${langInfo.name} (${langInfo.scriptHint}).

8. ABSOLUTE DIVERSITY REQUIREMENT:
   - Introduce a totally fresh, unique perspective, phrasing style, and layout for this script.
   - Internal Entropy Seed: ${Math.random().toString(36).substring(2, 10)}

9. TARGET REGIONS / COUNTRIES COMPLIANCE:
   - Selected Target Regions/Countries: ${selectedCountries && selectedCountries.length > 0 ? selectedCountries.join(", ") : "Global audience"}

${islamicInstruction}

Ensure the output is strictly the polished script itself, completely ready to read or perform, containing zero meta-commentary, zero filler explanations. Just output the final polished script in ${langInfo.name}.
`;

      const prompt = `
Please rephrase and transform the following raw source script into ${langInfo.name} (${langInfo.scriptHint}).

RAW SOURCE SCRIPT:
"""
${rawScript}
"""

Ensure the output is 100% plagiarism-free, customized for a ${voicePersona || "MALE"} speaker, written natively in ${langInfo.name} (${langInfo.scriptHint}), targeted at ${targetAudience || "adults"}, following the "${topicNiche || "General"}" niche and "${tutorialTone || "Informative"}" tone.
`;

      const response = await generateContentWithRetry(ai, {
        model: modelToUse,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.82,
        },
      });

      return (response.text || "").trim();
    };

    // Execute generations in parallel
    const results = await Promise.all(
      transformations.map(async (opt) => {
        try {
          const text = await generateForTransformation(opt);
          return { key: opt, text };
        } catch (err: any) {
          console.error(`Error generating transformation "${opt}":`, err);
          return { key: opt, text: `Error generating transform: ${err.message || err}` };
        }
      })
    );

    const polishedScripts: Record<string, string> = {};
    results.forEach((res) => {
      polishedScripts[res.key] = res.text;
    });

    res.json({
      rawInput: rawScript,
      polishedScripts,
      polishedScript: polishedScripts[primaryTransform] || Object.values(polishedScripts)[0] || "",
      modelUsed: modelToUse,
    });
  } catch (error: any) {
    console.error("Error in /api/generate:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred during generation." });
  }
});

// Generate a script draft based on a Topic & Word Count limit
app.post("/api/generate-topic", verifyUserAuth as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
  try {
    const { topic, wordCount } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required." });
    }
    const targetWords = parseInt(wordCount) || 300;

    const ai = req.userAiClient!;
    const modelToUse = req.body.model || "gemini-3.1-flash-lite";
    const response = await generateContentWithRetry(ai, {
      model: modelToUse,
      contents: `Generate a detailed, high-quality script on the topic: "${topic}". The script should be approximately ${targetWords} words. It should be highly engaging, educational, and structured, written directly as clean raw content ready for voiceover and script transformation. Return ONLY the script text itself.`,
    });

    res.json({ rawScript: (response.text || "").trim(), modelUsed: modelToUse });
  } catch (error: any) {
    console.error("Error in /api/generate-topic:", error);
    res.status(500).json({ error: error.message || "An error occurred generating from topic." });
  }
});

// Extract clean word-by-word spoken transcript from Video URL via Gemini
app.post("/api/extract-transcript", verifyUserAuth as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
  try {
    const { url, mode } = req.body;
    if (!url || !url.trim()) {
      return res.status(400).json({ error: "URL is required." });
    }

    const ai = req.userAiClient!;
    
    let prompt = "";
    if (mode === "gemini") {
      prompt = `You are an expert content creator, AI transcriber, and scriptwriter.
We have a social media video link: "${url}".
Based on the URL structure, keywords, handles, usernames, video ID, slug, and topic indicators found in this link, generate/reconstruct the complete, high-quality, word-for-word spoken transcript of this video.
Rules:
- Generate a highly realistic, full-length spoken transcript as if it were spoken word-for-word in the video.
- The tone should be engaging, polished, and match the target content category indicated by the URL.
- DO NOT include timestamps, speaker labels (e.g. "[Speaker 1]", "Joe:"), or video descriptions.
- DO NOT write any meta-introductions or commentary.
- Return ONLY the clean transcript text, starting directly with the spoken dialogue.`;
    } else {
      prompt = `You are an advanced video transcribing and content generation agent. Given this video/social media URL: "${url}", use your web browsing tool and url context tool to access the URL if possible and retrieve or reconstruct the complete, high-quality, word-for-word spoken transcript of the video.
If direct transcription is restricted, extract metadata from the page structure, usernames, handles, keywords, video ID, or slug keywords, and reconstruct an incredibly natural, high-quality, word-for-word spoken transcript of this video (such as an educational tutorial, medical advice, culinary vlog, or documentary).
Ensure the transcript has a native human conversational feel with clear hooks and transitions.
Return ONLY the clean, word-by-word spoken transcript text with NO speaker tags, timestamps, meta-introductions, descriptions, or surrounding commentary. Start directly with the spoken dialogue.`;
    }

    let transcript = "";
    try {
      console.log("Calling Antigravity Agent for transcript extraction of URL:", url);
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
      console.warn("Antigravity agent failed or not allowed, falling back to gemini-3.1-flash-lite:", apiError);
      try {
        const response = await generateContentWithRetry(ai, {
          model: "gemini-3.1-flash-lite",
          contents: prompt
        });
        transcript = (response.text || "").trim();
      } catch (fallbackErr) {
        console.error("Transcript fallback failed:", fallbackErr);
      }
    }

    if (!transcript || transcript.length < 5) {
      return res.status(400).json({ error: "Out of credits or unable to extract YouTube transcript. Please check your URL or API credits." });
    }

    res.json({ transcript });
  } catch (error: any) {
    console.error("Error in /api/extract-transcript:", error);
    res.status(400).json({ error: "Out of credits or unable to extract YouTube transcript. Please check your URL or API credits." });
  }
});

// Parse File (.txt or PDF) using Gemini for direct text extraction
app.post("/api/parse-file", verifyUserAuth as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
  try {
    const { fileName, fileType, fileData } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: "File data is required." });
    }

    const ai = req.userAiClient!;
    let contents: any[] = [];
    
    if (fileType && fileType.includes("pdf")) {
      contents = [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: fileData, // assumes fileData is base64 string
          }
        },
        {
          text: "Extract and return the full text content of this PDF file. Do not summarize or rewrite, just return the complete readable text. If there is no text, describe the visual tables/data."
        }
      ];
    } else {
      let plainText = fileData;
      if (fileData.startsWith("data:") || (fileType && (fileType.includes("text") || fileType.includes("plain")))) {
        try {
          const buffer = Buffer.from(fileData, "base64");
          plainText = buffer.toString("utf-8");
        } catch {
          plainText = fileData;
        }
      }
      contents = [`Extract and return the full text content of this document:\n\n${plainText}`];
    }

    const response = await generateContentWithRetry(ai, {

      model: "gemini-3.1-flash-lite",
      
      contents,
    });

    res.json({ extractedText: (response.text || "").trim() });
  } catch (error: any) {
    console.error("Error in /api/parse-file:", error);
    res.status(500).json({ error: error.message || "An error occurred parsing the file." });
  }
});

// Divide Transcript into scenes and generate Text-to-Video prompts for each
app.post("/api/generate-scenes", verifyUserAuth as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
  try {
    const { transcript, numScenes, category, format } = req.body;
    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: "Transcript is required." });
    }
    const count = parseInt(numScenes) || 10;
    const cat = category || "General";

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
3. For each scene, write one highly cinematic, extremely detailed, and professional Text-to-Video generation prompt in English. Each prompt MUST be very thorough and rich (nearly 10 to 15 sentences long, exhaustively detailing every visual aspect of the scene including precise subject action, exquisite camera work, dramatic lighting, atmospheric haze/effects, textures, color grading, and environmental depth).
4. Each prompt must:
   - Be optimized for modern video generators like Veo 3 and Wan 2.2.
   - Be EXACTLY aligned with the category field: "${cat}". Do not deviate or add unrelated themes.
   - ${formatInstruction}
   - ${islamicSceneInstruction}
   - For example:
     * If the category is "Health and medical", describe ONLY clinical, medical, healthcare settings, doctors, anatomical details, surgical tools, or health visuals.
     * If the category is "Industrial technology", describe ONLY industrial scenes, heavy machinery, automated assembly lines, robotic arms, factories, or mechanical components.
     * If there are cinematic shots requested, specify high-end cinematic visuals, precise camera movements, cinematic lighting, and director composition.
   - Ensure the visuals in each scene strictly match and visually represent the corresponding part of the transcript. Do not add anything extra from your own initiative that doesn't belong to the field.
   - Specify precise camera angles (e.g., extreme close-up, wide tracking shot), lighting (e.g., medical white fluorescent, warm industrial low-key amber glow), subject action, and cinematic realism.
   - Maintain perfect character, environment, and visual consistency across all scenes.
   - FORMATTING CONSTRAINT: The "text" of each scene MUST be a single line of text containing only the cinematic video prompt itself. It MUST NOT contain any newline characters, and it MUST NOT start with "Scene X" or any custom header. The client will combine the scene number and text on a single line (e.g. "Scene X: {text}") for correct VEO3 parsing.

TRANSCRIPT:
"""
${transcript}
"""

You MUST output exactly ${count} scenes. Return the output as a JSON object matching this schema:
{
  "scenes": [
    {
      "id": 1,
      "text": "Detailed scene prompt..."
    },
    ...
  ]
}
`;

    const response = await generateContentWithRetry(ai, {


      model: "gemini-3.1-flash-lite",



      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
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
        }
      }
    });

    let data;
    try {
      data = JSON.parse(response.text || "{}");
    } catch {
      data = { scenes: [] };
    }

    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/generate-scenes:", error);
    res.status(500).json({ error: error.message || "An error occurred generating scenes." });
  }
});

// Regenerate single scene prompt
app.post("/api/regenerate-scene", verifyUserAuth as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
  try {
    const { transcript, sceneNumber, totalScenes, category, previousPrompt, format } = req.body;
    const ai = req.userAiClient!;

    const formatInstruction = (format && format !== "none") ? `Ensure this scene is strictly designed and described for a ${format === "16:9" ? "Horizontal (16:9) widescreen landscape" : format === "9:16" ? "Vertical (9:16) portrait format (for Shorts/Reels/TikTok)" : "Square (1:1) format"} aspect ratio.` : "";

    const isIslamic = (category && category.toLowerCase().includes("islamic")) || 
                      (transcript && transcript.toLowerCase().includes("islamic"));
                      
    const islamicSceneInstruction = isIslamic ? `
- Since the topic/category is Islamic-related, ensure that all visual scene prompts describe characters in proper traditional Islamic attire. 
- For children characters, explicitly describe them as wearing modest Islamic dress (e.g., boys wearing clean traditional dress or prayer caps/kurta, girls wearing elegant headscarves/hijabs/modest clothing).
- For adult characters, describe them wearing traditional Islamic religious attire (e.g., modest clothing, long elegant robes/abayas, hijabs/headscarves for women, clean traditional attire/kurtas and prayer caps or neat beards for men).
- Visual descriptions should reflect a respectful, peaceful, and clean Islamic environment (e.g., beautiful Islamic architectures, mosques, clean peaceful homes, or serene natural backgrounds).
` : "";

    const prompt = `
You are an expert AI prompt engineer specializing in cinematic Text-to-Video models.
Regenerate Scene ${sceneNumber} out of ${totalScenes} for a storyboard with content category "${category}".
${formatInstruction}
${islamicSceneInstruction}
Ensure this scene has smooth visual and narrative continuity with preceding and succeeding scenes based on the overall transcript.
Optimize it fully for Veo 3 and Wan 2.2 with detailed camera angles, lighting, actions, and consistent styling.

Overall Transcript:
"""
${transcript}
"""

Previous scene prompt (for reference/improvement):
"${previousPrompt || ""}"

Please provide a fresh, significantly improved, highly detailed cinematic video generation prompt for this scene.
The prompt MUST be on a single contiguous line of text, containing ONLY the prompt description itself (no prepended "Scene X:" label or headers), with absolutely no commentary, introduction, or JSON. Just the direct prompt itself in English.
`;

    const response = await generateContentWithRetry(ai, {


      model: "gemini-3.1-flash-lite",


      contents: prompt,
    });

    res.json({ sceneText: (response.text || "").trim() });
  } catch (error: any) {
    console.error("Error in /api/regenerate-scene:", error);
    res.status(500).json({ error: error.message || "An error occurred regenerating the scene." });
  }
});

function resolveTargetLanguage(langInput: string): { name: string; scriptHint: string; isRtl: boolean } {
  if (!langInput || !langInput.trim()) return { name: "English", scriptHint: "English language", isRtl: false };
  const key = langInput.toLowerCase().trim();
  if (key === "urdu-writing") return { name: "Urdu", scriptHint: "written in elegant Urdu Nastaliq script", isRtl: true };
  if (key === "urdu-roman") return { name: "Urdu Roman", scriptHint: "written in Roman Urdu (Latin alphabet)", isRtl: false };
  if (key === "hindi") return { name: "Hindi", scriptHint: "written in Devanagari script", isRtl: false };
  if (key === "english") return { name: "English", scriptHint: "written in English", isRtl: false };
  if (key === "spanish") return { name: "Spanish", scriptHint: "written in Spanish", isRtl: false };
  if (key === "french") return { name: "French", scriptHint: "written in French", isRtl: false };
  if (key === "german") return { name: "German", scriptHint: "written in German", isRtl: false };
  if (key === "arabic") return { name: "Arabic", scriptHint: "written in Arabic script", isRtl: true };
  if (key === "bengali") return { name: "Bengali", scriptHint: "written in Bengali script", isRtl: false };
  if (key === "portuguese") return { name: "Portuguese", scriptHint: "written in Portuguese", isRtl: false };
  if (key === "russian") return { name: "Russian", scriptHint: "written in Cyrillic Russian script", isRtl: false };
  if (key === "japanese") return { name: "Japanese", scriptHint: "written in Japanese", isRtl: false };
  if (key === "chinese-simplified") return { name: "Chinese (Simplified)", scriptHint: "written in Simplified Chinese", isRtl: false };
  if (key === "chinese-traditional") return { name: "Chinese (Traditional)", scriptHint: "written in Traditional Chinese", isRtl: false };
  if (key === "indonesian") return { name: "Indonesian", scriptHint: "written in Indonesian", isRtl: false };
  if (key === "turkish") return { name: "Turkish", scriptHint: "written in Turkish", isRtl: false };
  if (key === "italian") return { name: "Italian", scriptHint: "written in Italian", isRtl: false };
  if (key === "korean") return { name: "Korean", scriptHint: "written in Hangul Korean", isRtl: false };
  if (key === "farsi") return { name: "Persian / Farsi", scriptHint: "written in Persian script", isRtl: true };
  if (key === "pashto") return { name: "Pashto", scriptHint: "written in Pashto script", isRtl: true };
  if (key === "sindhi") return { name: "Sindhi", scriptHint: "written in Sindhi script", isRtl: true };
  if (key === "punjabi") return { name: "Punjabi", scriptHint: "written in Punjabi script", isRtl: false };

  const cap = langInput.charAt(0).toUpperCase() + langInput.slice(1);
  return { name: cap, scriptHint: `written in ${cap}`, isRtl: false };
}

// YouTube & Social Media Growth Strategist Metadata API
app.post("/api/generate-ctr", verifyUserAuth as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      transcript,
      language,
      transformation,
      toggleTitle,
      toggleDescription,
      toggleTimestamps,
      toggleHashtags,
      toggleTags,
      videoDuration,
    } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: "Transcript is required." });
    }

    const ai = req.userAiClient!;
    const langInfo = resolveTargetLanguage(language || transformation);
    
    // Construct dynamic prompt based on toggles
    const prompt = `
You are an elite YouTube & Social Media Growth Strategist and Metadata Optimization Expert.
Analyze the provided video transcript and generate optimized, high-performing metadata to achieve the maximum click-through-rate (CTR) and SEO.

TRANSCRIPT:
"""
${transcript}
"""

Video Duration: ${videoDuration || "10:00"}
TARGET OUTPUT LANGUAGE: ${langInfo.name} (${langInfo.scriptHint}).

Please generate only the requested metadata segments below (if set to true):
- Generate Title Options (titles): ${toggleTitle ? "YES" : "NO"}
- Generate SEO Description (description): ${toggleDescription ? "YES" : "NO"}
- Generate Timestamps (timestamps): ${toggleTimestamps ? "YES" : "NO"}
- Generate Hashtags (hashtags): ${toggleHashtags ? "YES" : "NO"}
- Generate SEO Tags (tags): ${toggleTags ? "YES" : "NO"}

Strict Requirements:
1. "titles": (If YES) Generate exactly 10 high-CTR title options ENTIRELY IN THE TARGET LANGUAGE (${langInfo.name}).
   - Use power words: Secret, Exposed, Why, How, I Tried. Add [Brackets] if relevant.
   - Keep titles between 50-60 characters, utilizing curiosity gaps and putting high-value keywords first.
   - All titles MUST be written natively in ${langInfo.name} (${langInfo.scriptHint}) to match the target transcript language.
2. "description": (If YES) SEO description of exactly 2 paragraphs written in ${langInfo.name}.
   - First line must be a highly engaging hook.
   - Include high-traffic keywords and a clear Call-To-Action (CTA). No fluff.
   - POLICY AND MONETIZATION SAFETY COMPLIANCE (CRITICAL): Do NOT use sensitive, overly dramatic medical claims, pseudo-medical claims, or unverified scientific statements that violate monetization policies. Specifically:
     * NEVER claim quick cures or reverse-health milestones (e.g. do NOT use "in just three weeks", "rapidly reversing", "restoring crystal clear eyesight", "instant cure", "reverses diabetes").
     * NEVER claim direct biological cure/regulatory statements (e.g. do NOT write "works by regulating insulin resistance", "completely cures blood sugar spikes").
     * NEVER suggest bypassing standard healthcare or medications (e.g. do NOT write "without expensive medications", "avoid doctors", "alternatives to surgery").
     * Instead, frame all description insights safely and educationally, focusing on healthy habit discussions, scientific curiosity, educational exploration, and general lifestyle awareness. Use cautious, compliant, and supportive terminology.
3. "timestamps": (If YES) Chronological list of timestamps outlining the video progression with labels in ${langInfo.name}.
   - Automatically detect topic shifts from the transcript.
   - Provide between 8 to 12 chronological chapters starting at "00:00".
   - Estimate the timestamp times proportionally based on the transcript's logical progression and total duration of "${videoDuration || "10:00"}".
   - Each timestamp must be an object with keys: "time" (e.g., "02:14") and "label" (e.g., "Topic Shift Label in ${langInfo.name}").
4. "hashtags": (If YES) Exactly 15 high-ranking YouTube hashtags, each starting with the '#' symbol.
5. "tags": (If YES) Exactly 15 highly-optimized SEO tags, returned as an array of keyword strings relevant to ${langInfo.name}.

All content must be 100% based on the transcript with NO hallucinations or outside filler.

Return your response as a valid JSON object matching this schema:
{
  "titles": ["Title 1", "Title 2", ...],
  "description": "SEO description in ${langInfo.name}...",
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

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: schemaProps,
          required: schemaRequired
        }
      }
    });

    let data;
    try {
      data = JSON.parse(response.text || "{}");
    } catch {
      data = {};
    }

    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/generate-ctr:", error);
    res.status(500).json({ error: error.message || "An error occurred generating CTR growth assets." });
  }
});

// YouTube & Social Media Thumbnail Director API
app.post("/api/generate-thumbnail-prompt", verifyUserAuth as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
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

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: "Transcript is required." });
    }

    const ai = req.userAiClient!;
    const langInfo = resolveTargetLanguage(language || transformation);

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
  * Leave large clean negative space for bold headline text in ${langInfo.name}.
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
    "Create a highly engaging YouTube [Niche/Category] vertical 9:16 thumbnail. TOP: Large bold headline '[Headline Text in ${langInfo.name}]' in elegant, high-impact font (${langInfo.scriptHint}). CENTER: A high-quality, close-up portrait of [the character from the reference image / attached creator photo] with a [highly expressive emotion, e.g. intense curiosity and positive discovery, eyes wide and a slight smile], wearing [adapt attire to match occupation/field]. SUBJECT: Below the character, [the main object, e.g., in her hand she is holding a steaming cup of coffee with a single, clear, whole clove resting on top, glowing with a soft neon green energy]. BACKGROUND: [Describe premium gradient background, e.g., a premium vertical linear gradient from #01c101 at the top to #004701 at the bottom], blended with [subtle visual effects, e.g., abstract floating health-related digital graphics]. COLORS: Use [List colors, e.g., Neon Green (#00FF01) and White (#FFFFFF)] for text accents. BOTTOM: A smaller, high-contrast tagline '[Tagline Text in ${langInfo.name}]'. Typography must be mobile-readable, ultra-realistic, cinematic studio lighting, high contrast, sharp focus, viral YouTube style, professional [Niche Theme] design, maximum CTR optimization, clean bold composition with [the character from the reference image / attached creator photo] as the primary focal point."
  
  * Style B (Sectional layout with TOP SECTION / MIDDLE/BOTTOM SECTION / BACKGROUND / STYLE):
    "Create a highly engaging YouTube [Niche/Category] thumbnail in a 9:16 vertical aspect ratio. TOP SECTION: High-impact bold text overlays in ${langInfo.name} (${langInfo.scriptHint}) using [List colors, e.g. Neon Green (#00FF01)] for the main headline '[Headline Text in ${langInfo.name}]' and [List colors, e.g. White (#FFFFFF)] for the tagline '[Tagline Text in ${langInfo.name}]'. Typography must be ultra-readable and professional. MIDDLE/BOTTOM SECTION: A high-detail close-up of [the character from the reference image / attached creator photo], wearing [adapt attire to match occupation/field], looking at the camera with a [highly expressive emotion, e.g. shocked and cautionary] facial expression. [The character from the reference image / attached creator photo] is the primary focal point. Near or below them, [describe the items, fruits, medicines, or elements]. BACKGROUND: [Describe premium gradient background, e.g., a premium linear gradient from #01c101 to #004701 with subtle abstract light leaks and high-tech health-inspired bokeh]. STYLE: Cinematic lighting, high contrast, sharp focus, viral YouTube Shorts thumbnail style, clean bold composition, maximum CTR optimization."

- Strict Composition Rules:
  * ALWAYS MENTION THE ATTACHED PHOTO / REFERENCE IMAGE: Always state that the generator must use the attached creator photo / reference image as the primary focal point (e.g., "portrait of the person from the reference image" or "using the uploaded creator photo/reference image as the main subject").
  * TEXT ON TOP: The main text / headline overlays MUST be written ENTIRELY IN THE TARGET LANGUAGE (${langInfo.name}), placed in the upper part of the thumbnail, strictly above the character.
  * CHARACTER IN CENTER: The human character (drawn from the reference image) must be in the middle / center of the vertical thumbnail layout.
  * CHARACTER DRESS / ATTIRE (CRITICAL):
    - Dynamically adapt the character's attire to match their field, occupation, or role in the script (for example, if the script/niche is about health/medical, they should wear a doctor's outfit like a white lab coat; if a mechanic, a mechanic's jumpsuit/outfit; if an organic farmer, suitable rustic clothes, etc.).
  * ITEMS BELOW CHARACTER: Any items, products, or elements mentioned in the script must be positioned in the lower portion of the image, below the character's chest/hand area.
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
  * Place the headline text in ${langInfo.name} across the upper portion.
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
- Create a premium YouTube-quality thumbnail with balanced composition, readable overlays in ${langInfo.name}, and high CTR focus.
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
- Large readable headline in ${langInfo.name}.
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
Create a highly engaging, viral YouTube thumbnail concept, positive prompt, negative prompt, and poster text overlay parameters based on the provided video transcript.

TRANSCRIPT:
"""
${transcript}
"""

TARGET OUTPUT LANGUAGE: ${langInfo.name} (${langInfo.scriptHint}).
IMPORTANT RULE FOR TEXT OVERLAYS:
All text overlays, headlines, taglines, and poster text parameters MUST be written ENTIRELY IN THE TARGET LANGUAGE (${langInfo.name}). Do NOT output in Urdu if the target language is ${langInfo.name}.

Design parameters to integrate:
- Background Colors: ${bgColor || "Slate black, dark green gradient"}
- Thumbnail Text Headline (Reference/Guideline): ${headline || "None specified"}
- Small Tagline text: ${smallTagline || "None specified"}
- Text Color overlays: ${textColor || "Neon green (#00FF01) and white"}
- Niche Theme: ${niche || "General"}
- Selected Format: ${selectedFormat} (${formatLabel})

${formatGuidelines}
${universalRules}
${islamicThumbnailInstruction}
${imageInstruction}

Strict Rules for FLUX 1 Prompt Creation:
1. The "fluxScenePrompt" MUST be in English only (describing visual components), with NO embedded text/letters/words written in the image itself. It should describe the visual layout perfectly matching the selected format guidelines. It should be a single highly-detailed paragraph, fully descriptive, cinematic, and clear.
2. It must explicitly include empty spaces reserved for text overlays:
   - For landscape (16:9): "Empty clear space reserved on the right side (or left side) for bold headline text. No text, no letters, no watermark."
   - For vertical (9:16): "Empty clear space reserved at the very top and very bottom for title text. No text, no letters, no words."
   - For square (1:1): "Empty clear space across the upper portion for headline text. No text, no letters, no watermark."
3. The "fluxNegativePrompt" must be a robust set of negative terms to prevent text generation inside the FLUX 1 image:
   "low quality, blurry, bad anatomy, deformed hands, extra fingers, text, letters, words, watermark, gibberish script, distorted face, cartoon"
4. Create high-impact text overlays in ${langInfo.name}:
   - "headlineUrdu" / "headlineText": A bold, high-click-through headline written ENTIRELY in ${langInfo.name} (${langInfo.scriptHint}, 3-4 words max).
   - "smallTaglineUrdu" / "smallTaglineText": A matching small tagline written ENTIRELY in ${langInfo.name} (${langInfo.scriptHint}).
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
  "headlineUrdu": "High-impact headline in ${langInfo.name}...",
  "smallTaglineUrdu": "Matching small tagline in ${langInfo.name}...",
  "textColor": "#FFFFFF or similar hex color",
  "strokeColor": "#00FF01 or similar hex color",
  "strokeWidth": 6,
  "headingYPercent": 0.10,
  "taglineYPercent": 0.92,
  "emptyLatentImageWidth": 1024,
  "emptyLatentImageHeight": 1820
}
`;

      const contentsArray: any[] = [];
      if (inlineDataPart) {
        contentsArray.push(inlineDataPart);
      }
      contentsArray.push({ text: prompt });

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.1-flash-lite",
        contents: contentsArray,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
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
          }
        }
      });

      let data;
      try {
        const parsed = JSON.parse(response.text || "{}");
        data = {
          engine: "flux1",
          fluxScenePrompt: parsed.fluxScenePrompt,
          fluxNegativePrompt: parsed.fluxNegativePrompt,
          headlineUrdu: parsed.headlineUrdu,
          smallTaglineUrdu: parsed.smallTaglineUrdu,
          textColor: parsed.textColor,
          strokeColor: parsed.strokeColor,
          strokeWidth: parsed.strokeWidth,
          headingYPercent: parsed.headingYPercent,
          taglineYPercent: parsed.taglineYPercent,
          emptyLatentImage: {
            width: parsed.emptyLatentImageWidth,
            height: parsed.emptyLatentImageHeight
          }
        };
      } catch {
        data = {
          engine: "flux1",
          fluxScenePrompt: "",
          fluxNegativePrompt: "",
          headlineUrdu: "",
          smallTaglineUrdu: "",
          textColor: "#FFFFFF",
          strokeColor: "#00FF01",
          strokeWidth: 6,
          headingYPercent: 0.10,
          taglineYPercent: 0.92,
          emptyLatentImage: {
            width: 1024,
            height: 1820
          }
        };
      }
      return res.json(data);

    } else {
      // Default: Nano Banana 2
      const prompt = `
You are an expert YouTube Thumbnail Director, Visual Designer, and CTR Optimization expert specializing in highly trained "Nano Banana 2" visual image generation prompts.
Create a highly engaging, viral YouTube thumbnail concept and text overlays based on the provided video transcript.

TRANSCRIPT:
"""
${transcript}
"""

TARGET OUTPUT LANGUAGE: ${langInfo.name} (${langInfo.scriptHint}).
IMPORTANT RULE FOR OVERLAY HEADLINES AND TAGLINES:
All text overlays, headlines, and taglines MUST be written ENTIRELY IN THE TARGET LANGUAGE (${langInfo.name}). Do NOT output in Urdu if the selected target language is ${langInfo.name}.

Design parameters to integrate:
- Background Colors: ${bgColor || "Slate black, dark green gradient"}
- Thumbnail Text Headline (Reference/Guideline): ${headline || "None specified"}
- Small Tagline text: ${smallTagline || "None specified"}
- Text Color overlays: ${textColor || "Neon green (#00FF01) and white"}
- Niche Theme: ${niche || "General"}

${formatGuidelines}
${universalRules}
${islamicThumbnailInstruction}
${imageInstruction}

Strict Rules for Thumbnail Prompt Creation:
1. Describe EXACTLY 1 main subject with an extreme, highly expressive human emotion (surprise, shock, fear, concern, ultimate excitement) suitable for the niche and topic.
2. The returned "thumbnailPrompt" MUST be structured as an extremely detailed, highly trained "Nano Banana 2 Prompt for an image generation model" following this EXACT layout format:
   "Create a highly engaging YouTube [Niche Theme] thumbnail using the uploaded creator photo as the main subject (preserve facial identity exactly).
   LEFT SIDE: A large close-up of the creator [specify gender/clothing/appearance based on topic], with a [specify expressive emotion, e.g. surprised and concerned] expression, pointing toward [specify high-impact visual object from transcript].
   RIGHT SIDE: [Describe realistic visual representations of the main topic], and other secondary high-impact elements like [describe 2-3 supporting objects/icons].
   BACKGROUND: [Describe a premium gradient blended with relevant graphics] utilizing [Background Colors]. Use only [List specific color hexes/names from parameters].
   Large bold ${langInfo.name} headline with merged [Text Color overlays] text: \"[Headline in ${langInfo.name}]\"
   Small ${langInfo.name} tagline underneath: \"[Tagline in ${langInfo.name}]\".
   Typography should be mobile-readable, ultra-realistic, cinematic lighting, high contrast, sharp focus, viral YouTube thumbnail style, professional [Niche Theme] design, maximum CTR optimization, clean bold composition with the creator's face as the main focal point."

3. Keep the visual composition bold, simple, mobile-readable, and optimized for maximum YouTube CTR, strictly adjusting the composition according to the selected format guidelines.
4. Create a matching, extremely high-impact main headline in ${langInfo.name} ("headlineUrdu") (max 3-4 words for high readability).
5. Create a matching small tagline in ${langInfo.name} ("smallTaglineUrdu").

Return your response as a valid JSON object matching this schema:
{
  "thumbnailPrompt": "The detailed English Nano Banana 2 prompt following the precise layout above adapted to the selected format...",
  "headlineUrdu": "Bold headline in ${langInfo.name}...",
  "smallTaglineUrdu": "Small tagline in ${langInfo.name}..."
}
`;

      const contentsArray: any[] = [];
      if (inlineDataPart) {
        contentsArray.push(inlineDataPart);
      }
      contentsArray.push({ text: prompt });

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.1-flash-lite",
        contents: contentsArray,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              thumbnailPrompt: { type: Type.STRING },
              headlineUrdu: { type: Type.STRING },
              smallTaglineUrdu: { type: Type.STRING }
            },
            required: ["thumbnailPrompt", "headlineUrdu", "smallTaglineUrdu"]
          }
        }
      });

      let data;
      try {
        const parsed = JSON.parse(response.text || "{}");
        data = {
          engine: "nano_banana",
          thumbnailPrompt: parsed.thumbnailPrompt,
          headlineUrdu: parsed.headlineUrdu,
          smallTaglineUrdu: parsed.smallTaglineUrdu
        };
      } catch {
        data = {
          engine: "nano_banana",
          thumbnailPrompt: "",
          headlineUrdu: "",
          smallTaglineUrdu: ""
        };
      }

      res.json(data);
    }
  } catch (error: any) {
    console.error("Error in /api/generate-thumbnail-prompt:", error);
    res.status(500).json({ error: error.message || "An error occurred generating thumbnail prompt." });
  }
});

// Granular segment/key level regeneration for CTR
app.post("/api/regenerate-ctr-field", verifyUserAuth as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
  try {
    const { transcript, field, videoDuration, language, transformation } = req.body;
    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: "Transcript is required." });
    }

    const ai = req.userAiClient!;
    const langInfo = resolveTargetLanguage(language || transformation);
    let fieldPrompt = "";
    let responseSchema: any = {};

    if (field === "titles") {
      fieldPrompt = `Generate exactly 10 high-CTR title options ENTIRELY IN THE TARGET LANGUAGE (${langInfo.name}, ${langInfo.scriptHint}) based on this transcript:
"""
${transcript}
"""
- Use power words: Secret, Exposed, Why, How, I Tried. Add [Brackets] if relevant.
- Keep titles between 50-60 characters with curiosity gap + keywords first.
- ALL titles MUST be written natively in ${langInfo.name} (${langInfo.scriptHint}).
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
      fieldPrompt = `Generate an SEO description of exactly 2 paragraphs ENTIRELY IN THE TARGET LANGUAGE (${langInfo.name}, ${langInfo.scriptHint}) based on this transcript:
"""
${transcript}
"""
- First line must be an engaging hook.
- Include high-traffic keywords + clear Call-To-Action (CTA). No fluff.
- POLICY AND MONETIZATION SAFETY COMPLIANCE (CRITICAL): Do NOT use sensitive, overly dramatic medical claims, pseudo-medical claims, or unverified scientific statements that violate monetization policies.
Return the output in the "description" key.`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING }
        },
        required: ["description"]
      };
    } else if (field === "timestamps") {
      fieldPrompt = `Generate video timestamps outlining the video progression with labels in ${langInfo.name} (${langInfo.scriptHint}) based on the provided Video Duration of "${videoDuration || "10:00"}" and this transcript:
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
      fieldPrompt = `Generate exactly 15 high-ranking YouTube hashtags in or relevant to ${langInfo.name} with the '#' symbol based on this transcript:
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
      fieldPrompt = `Generate exactly 15 highly-optimized SEO tags in or relevant to ${langInfo.name} as a list of keyword strings based on this transcript:
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

    const response = await generateContentWithRetry(ai, {


      model: "gemini-3.1-flash-lite",


      contents: fieldPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema
      }
    });

    let data;
    try {
      data = JSON.parse(response.text || "{}");
    } catch {
      data = {};
    }

    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/regenerate-ctr-field:", error);
    res.status(500).json({ error: error.message || "An error occurred regenerating the field." });
  }
});

// Serve static assets or mount Vite dev middleware
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} with environment ${process.env.NODE_ENV || "development"}`);
  });
}

setupServer();
