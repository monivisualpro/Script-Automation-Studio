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

    // We will generate the following transformations in parallel:
    const transformations = ["hindi", "urdu-roman", "urdu-writing", "english"];

    const generateForTransformation = async (transOpt: string) => {
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
   - Voice Persona: ${voicePersona.toUpperCase()}
   - If Female: Use female grammatical conjugations, vocabulary, and styling (e.g. in Hindi/Urdu, use feminine gender verbs/pronouns like "kartii hoon", "rahii hoon", "merii", "jaungii", "sikhayungii"; in English, use warm, welcoming, friendly, empathetic, and inclusive vocabulary).
   - If Male: Use male grammatical conjugations, vocabulary, and styling (e.g. in Hindi/Urdu, use masculine gender verbs/pronouns like "karta hoon", "raha hoon", "mera", "jaunga", "sikhayunga"; in English, use confident, authoritative, energetic, and direct vocabulary).
3. Apply the TRANSFORMATION option:
   - Option selected: "${transOpt}"
    - If "hindi": Translate/Rephrase entirely into Devanagari script (Hindi characters/writing). It MUST be written exactly in beautiful Hindi script (e.g. "अस्सलामु अलैकुम", "दोस्तों", "ज़िंदगी", "मुहब्बत", "ख़ुशामदीद", "शुक्रिया", "जनाब", "क्या आप जानते हैं", "आज हम बात करेंगे"). It is STRICTLY FORBIDDEN to use Roman Urdu or Latin letters for this option. The script must be in Devanagari characters but utilizing 100% beautiful spoken Urdu vocabulary, elegant Urdu sentence structures, and refined Urdu phonetic cadence. You MUST completely avoid pure, formal, or Sanskritized Hindi words (e.g., do NOT use 'नमस्ते', 'स्वागत', 'विषय', 'मित्र', 'सफलता', 'धन्यवाद', 'जीवन', 'ज्ञान', 'प्रयास', 'समय', 'महत्वपूर्ण', 'आवश्यकता', 'शिक्षक', 'कठिन', 'सरल', 'प्रश्न', 'उत्तर', 'विश्वास'). Instead, you MUST use their direct spoken Urdu equivalents written in Devanagari script: use 'अस्सलामु अलैकुम' instead of 'नमस्ते', 'ख़ुशामदीद' instead of 'स्वागत', 'दोस्तों'/'अज़ीज़ साथियों' instead of 'मित्रों', 'ज़िंदगी' instead of 'जीवन', 'इल्म'/'जानकारी' instead of 'ज्ञान', 'कोशिश' instead of 'प्रयास', 'वक़्त' instead of 'समय', 'ज़रूरी' instead of 'महत्वपूर्ण'/'आवश्यक', 'मुश्किल' instead of 'कठिन', 'आसान' instead of 'सरल', 'सवाल' instead of 'प्रश्न', 'जवाब' instead of 'उत्तर', 'यक़ीन' instead of 'विश्वास', 'कामयाबी' instead of 'सफलता', 'सफ़ر' instead of 'यात्रा', and 'शुक्रिया' instead of 'धन्यवाद'. The output must sound 100% like elegant spoken Urdu with a beautiful Urdu pronunciation, feelings, accent, and rhythm when read aloud, but written perfectly in Devanagari (Hindi) letters. Maintain highly natural video-script flow with warm, high-engagement phrasing.
   - If "urdu-roman": Translate/Rephrase entirely into Urdu written in Roman letters (e.g., "Assalamu Alaikum dosto, aaj hum baat karenge..."). Use conversational, native, and easy-to-read Roman Urdu wording.
   - If "english": Translate/Rephrase entirely into fluent, highly engaging English.
   - If "urdu-writing": Translate/Rephrase entirely into beautiful, professional Urdu script (Nastaliq/Arabic script, using proper Urdu characters) in the authentic Pakistani Urdu language. You must use rich, elegant Pakistani Urdu vocabulary and proper Urdu Nastaliq punctuation, phrasing, and sentence structures. It is strictly forbidden to use English or Hindi words where proper Urdu equivalents exist. The output script must flow beautifully and natively in proper Urdu.
4. Adapt perfectly to the TARGET AUDIENCE:
   - Option selected: "${targetAudience}"
   - If "children": Target audience is Children up to 10 years old. Use very simple, exciting, energetic vocabulary. Include playful expressions and sound cue descriptors in square brackets (e.g. "[Gasp!]", "[Excited sound effect]", "[Cheerful laughter]") to guide the voice-over artist. Ensure the tone is friendly and highly educational yet fun.
   - If "adults": Target audience is Adults up to 40 years old. Use engaging, professional, analytical, and highly persuasive modern phrasing. Bring out interesting facts and maintain high narrative density.
   - If "seniors": Target audience is Men over 60 years old. Wording must be extremely respectful, polite, and paced. Use formal honorifics and mature vocabulary (e.g. in Hindi/Urdu, use "Aap", "Aadab", "Tashreef", "Shukriya", "Buzurgo"; in English, use clear, elegant, and classy prose with balanced, respectful phrasing).
5. Tone / Niche Theme:
   - Topic Niche: "${topicNiche}"
   - Tutorial & Literature Tone: "${tutorialTone}"
   - Align the rhythm, vocabulary, and metaphors with this category.
6. Target Word Volume Expansion / Condensation Directive:
   - The target word volume has been specified as: ${wordCount} words.
   - You MUST ensure the final output script MEETS or EXCEEDS this target.
   - If the raw input is brief (e.g., a one-minute draft or 100 words) but the requested word count is high (e.g., 1,500, 10,000, or 20,000 words), you MUST creatively, eloquently, and dramatically expand the content. Elaborate heavily on every key point, introduce comprehensive scientific or historical background, share descriptive real-world anecdotes, list interesting subtopics, supply detailed step-by-step explanations, provide relevant analogies, and craft engaging narrative details. Keep generating content until you meet or exceed the ${wordCount} word limit.
   - If the raw input is extremely long (e.g., a one-hour script or 15,000 words) but the target word count is smaller (e.g., 300 words, 1,500 words), you must selectively extract, condense, and synthesize the most captivating highlights into a tight, high-density format matching the ${wordCount} word target.
   - Do not truncate abruptly; maintain a highly professional, well-rounded beginning, body, and conclusion that fits the specified target gracefully.
7. Structure, Hooks, and Dynamic Language-Aware Section Headings (CRITICAL):
   - Custom Hook requested: "${customHook || "None"}"
   - Greetings Prefix: "${greetingsPrefix || "None"}"
   - SECTION STRUCTURE & LANGUAGE-AWARE TITLE FORMAT DIRECTIVE:
${includeHooksBodyConclusion ? `     You MUST organize the script into distinct, well-structured sections.
     EVERY section MUST start with a clean, plain text descriptive title written ENTIRELY IN THE TARGET LANGUAGE (${transOpt}).
     Both the section prefix ("Section N – " / "سیکشن N – " / "सेक्शन N – ") AND the descriptive topic title MUST MATCH the selected output language ("${transOpt}") in script, vocabulary, and phrasing.

     EXACT LANGUAGE-SPECIFIC EXAMPLES:
     • English ("english"):
       Section 1 – Hook
       Section 1 – Introduction
       Section 2 – Benefits of Water
       Section 3 – Importance of Hydration
       Section 4 – Common Mistakes
       Section 5 – Practical Tips
       Section 6 – Conclusion

     • Urdu Script ("urdu-writing"):
       سیکشن 1 – تعارف / ہک
       سیکشن 2 – پانی کے فوائد
       سیکشن 3 – جسم میں پانی کی اہمیت
       سیکشن 4 – عام غلطیاں
       سیکشن 5 – عملی مشورے
       سیکشن 6 – نتیجہ

     • Hindi Devanagari Script ("hindi"):
       सेक्शन 1 – परिचय / हुक
       सेक्शन 2 – पानी के फायदे
       सेक्शन 3 – शरीर में पानी का महत्व
       सेक्शन 4 – आम गलतियाँ
       सेक्शन 5 – उपयोगी सुझाव
       सेक्शन 6 – निष्कर्ष

     • Roman Urdu ("urdu-roman"):
       Section 1 – Ta'aruf / Hook
       Section 2 – Pani ke Fawaid
       Section 3 – Jism mein Pani ki Ahmiyat
       Section 4 – Aam Ghaltiyan
       Section 5 – Amali Mashwaray
       Section 6 – Natija

     • Other / Future Languages:
       Dynamically localize both the section prefix word (e.g., Section / سیکشن / सेक्शन / Sezione / Sección) and the descriptive topic title into natural, native-quality phrasing matching that language.

     MANDATORY LANGUAGE-AWARE HEADING RULES:
     a) Every section heading MUST match the selected output language ("${transOpt}"). Automatically generate and translate both the section prefix and topic title in native-quality phrasing appropriate for "${transOpt}".
     b) Introduction Heading: For the first section, use a localized descriptive title such as "Section 1 – Hook" / "Section 1 – Introduction" in English, "سیکشن 1 – تعارف" or "سیکشن 1 – ہک" in Urdu, "सेक्शन 1 – परिचय" or "सेक्शन 1 – हुक" in Hindi, "Section 1 – Ta'aruf" in Roman Urdu.
     c) Body Headings: Generate unique, contextually accurate section titles summarizing the specific topic/theme of that paragraph dynamically localized in the target language (e.g. "سیکشن 2 – پانی کے فوائد", "सेक्शन 2 – पानी के फायदे", "Section 2 – Pani ke Fawaid").
     d) Final Heading: For the final section, use a localized conclusion title such as "Section X – Conclusion" in English, "سیکشن X – نتیجہ" in Urdu, "सेक्शन X – निष्कर्ष" in Hindi, "Section X – Natija" in Roman Urdu (where X is the final section number).
     e) STRICT FORMATTING CLEANLINESS: Do NOT use asterisks (*), hash symbols (#), markdown bold/italics, brackets (parentheses () or square brackets []), bullets, or any other formatting symbols in the section headings or text. Output ONLY clean, plain text headings on their own line, followed by the polished paragraph.` : `     Structure naturally into clean paragraphs. If section headings are included, ensure they are written entirely in the selected target language ("${transOpt}") in clean plain text format without asterisks (*), brackets (), or markdown symbols (#).`}
   - Incorporate the custom hook "${customHook || ""}" and greeting "${greetingsPrefix && greetingsPrefix !== "None" ? greetingsPrefix : ""}" beautifully at the very beginning of Section 1 to hook the listener instantly.
   - At the very end of the Conclusion/outro section (or as the final block of the script output), you MUST always include the following call-to-action subscription text adapted to the selected language:
     * If the selected transformation option is "urdu-writing": "دوستو اگر ویڈیو پسند آئی ہو تو اسے لائک کریں اور ایسی مزید معلوماتی ویڈیوز کے لیے ہمارے چینل کو سبسکرائب ضرور کریں اور بیل آئیکن دبانا مت بھولیے گا۔"
     * If the selected transformation option is "hindi": "दोस्तों अगर वीडियो पसंद आई हो तो इसे लाइक करें और ऐसी मज़ीद मालूमती वीडियोज़ के लिए हमारे चैनल को सब्सक्राइब ज़रूर करें और बेल आइकन दबाना मत भूलिए गा।"
     * If the selected transformation option is "urdu-roman": "Dosto agar video pasand aayi ho to ise like karein aur aisi mazeed malumaati videos ke liye humare channel ko subscribe zaroor karein aur bell icon dabana mat bhooliyega."
     * If the selected transformation option is "english": "Friends, if you liked this video, please like it, and for more informative videos like this, be sure to subscribe to our channel and don't forget to press the bell icon."

8. ABSOLUTE DIVERSITY REQUIREMENT:
   - Introduce a totally fresh, unique perspective, phrasing style, and layout for this script. Do not reuse similar phrasing patterns or sentence structures from previous generations. Every generation must be highly dynamic and unique.
   - Internal Entropy Seed: ${Math.random().toString(36).substring(2, 10)}

9. TARGET REGIONS / COUNTRIES COMPLIANCE:
   - Selected Target Regions/Countries: ${selectedCountries && selectedCountries.length > 0 ? selectedCountries.join(", ") : "Global audience"}
   - If specific countries or regions are selected, you MUST deeply customize the script's cultural references, local context, statistics, examples, dialects/idiomatic preferences, and vocabulary specifically to match and appeal to the native population of those regions. Incorporate region-specific nuances or locally relatable anecdotes of the selected countries to make the content highly localized and high-converting.

${islamicInstruction}

Ensure the output is strictly the polished script itself, completely ready to read or perform, containing zero meta-commentary, zero "Sure, here is your script" or filler explanations. Just output the final polished script.
`;

      const prompt = `
Please rephrase and transform the following raw source script.

RAW SOURCE SCRIPT:
"""
${rawScript}
"""

Ensure the output is 100% plagiarism-free, customized for a ${voicePersona} speaker, written in the "${transOpt}" format, targeted at ${targetAudience}, following the "${topicNiche}" niche and "${tutorialTone}" tone, and starting with greeting "${greetingsPrefix || ""}" and hook "${customHook || ""}".
`;

      const response = await generateContentWithRetry(ai, {
        model: modelToUse,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.82, // High temperature to force creative variations
        },
      });

      return (response.text || "").trim();
    };

    // Execute all 4 generations in parallel to minimize response time
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

// YouTube & Social Media Growth Strategist Metadata API
app.post("/api/generate-ctr", verifyUserAuth as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      transcript,
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
    
    // Construct dynamic prompt based on toggles
    const prompt = `
You are an elite YouTube & Social Media Growth Strategist and Metadata Optimization Expert.
Analyze the provided video transcript and generate optimized, high-performing metadata to achieve the maximum click-through-rate (CTR) and SEO.

TRANSCRIPT:
"""
${transcript}
"""

Video Duration: ${videoDuration || "10:00"}

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
Create a highly engaging, viral YouTube thumbnail concept, positive prompt, negative prompt, and Urdu poster text overlay parameters based on the provided video transcript.

TRANSCRIPT:
"""
${transcript}
"""

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
1. The "fluxScenePrompt" MUST be in English only, with NO Urdu/Arabic/Latin text/letters/words written in the image itself. It should describe the visual layout perfectly matching the selected format guidelines. It should be a single highly-detailed paragraphs, fully descriptive, cinematic, and clear.
2. It must explicitly include empty spaces reserved for text overlays:
   - For landscape (16:9): "Empty clear space reserved on the right side (or left side) for bold headline text. No text, no letters, no watermark."
   - For vertical (9:16): "Empty clear space reserved at the very top and very bottom for title text. No text, no letters, no words."
   - For square (1:1): "Empty clear space across the upper portion for headline text. No text, no letters, no watermark."
3. The "fluxNegativePrompt" must be a robust set of negative terms to prevent text generation inside the FLUX 1 image:
   "low quality, blurry, bad anatomy, deformed hands, extra fingers, text, letters, words, watermark, gibberish script, distorted face, cartoon"
4. Create high-impact Urdu translations for the overlay:
   - "headlineUrdu": A bold, high-click-through Urdu headline in Nastaliq script (3-4 words max).
   - "smallTaglineUrdu": A matching small Urdu tagline in Nastaliq script.
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
  "headlineUrdu": "High-impact Urdu headline...",
  "smallTaglineUrdu": "Matching small Urdu tagline...",
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
          thumbnailPrompt: parsed.fluxScenePrompt, // Fallback combined string
          fluxScenePrompt: parsed.fluxScenePrompt,
          fluxNegativePrompt: parsed.fluxNegativePrompt,
          headlineUrdu: parsed.headlineUrdu,
          smallTaglineUrdu: parsed.smallTaglineUrdu,
          overlayFields: {
            heading_text: parsed.headlineUrdu,
            tagline_text: parsed.smallTaglineUrdu,
            text_color: parsed.textColor,
            stroke_color: parsed.strokeColor,
            stroke_width: parsed.strokeWidth,
            heading_y_percent: parsed.headingYPercent,
            tagline_y_percent: parsed.taglineYPercent
          },
          emptyLatentImage: {
            width: parsed.emptyLatentImageWidth,
            height: parsed.emptyLatentImageHeight
          }
        };
      } catch {
        data = {
          engine: "flux1",
          thumbnailPrompt: "",
          fluxScenePrompt: "",
          fluxNegativePrompt: "",
          headlineUrdu: "",
          smallTaglineUrdu: "",
          overlayFields: {
            heading_text: "",
            tagline_text: "",
            text_color: "#FFFFFF",
            stroke_color: "#00FF01",
            stroke_width: 6,
            heading_y_percent: 0.10,
            tagline_y_percent: 0.92
          },
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
Create a highly engaging, viral YouTube thumbnail concept and Urdu text overlays based on the provided video transcript.

TRANSCRIPT:
"""
${transcript}
"""

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
   LEFT SIDE: A large close-up of the creator [specify gender/clothing/appearance based on topic, ensuring Islamic dress if applicable], with a [specify expressive emotion, e.g. surprised and concerned] expression, pointing toward [specify high-impact visual object from transcript, e.g., fresh ginger root with glowing medical effects/device].
   RIGHT SIDE: [Describe realistic visual representations of the main topic, e.g., realistic kidney illustration glowing with healthy neon green energy, or high-tech gadget glowing, or food element], and other secondary high-impact elements like [describe 2-3 supporting objects/icons].
   BACKGROUND: [Describe a premium gradient blended with relevant graphics, e.g., a premium black and dark green gradient blended together with futuristic medical graphics, or cyber patterns, or organic textures] utilizing [Background Colors]. Use only [List specific color hexes/names from parameters, e.g. neon green (#00FF01), Black (#000000), White (#FFFFFF)].
   Large bold Urdu headline with merged [Text Color overlays] text: \"[Headline in Urdu Nastaliq]\"
   Small Urdu tagline underneath: \"[Tagline in Urdu Nastaliq]\".
   Typography should be mobile-readable, ultra-realistic, cinematic lighting, high contrast, sharp focus, viral YouTube thumbnail style, professional [Niche Theme] design, maximum CTR optimization, clean bold composition with the creator's face as the main focal point."

3. Keep the visual composition bold, simple, mobile-readable, and optimized for maximum YouTube CTR, strictly adjusting the composition according to the selected format guidelines.
4. Create a matching, extremely high-impact main headline in Urdu script ("headlineUrdu") (max 3-4 words for high readability).
5. Create a matching small tagline in Urdu script ("smallTaglineUrdu").

Return your response as a valid JSON object matching this schema:
{
  "thumbnailPrompt": "The detailed English Nano Banana 2 prompt following the precise layout above adapted to the selected format...",
  "headlineUrdu": "Bold Urdu Headline...",
  "smallTaglineUrdu": "Small Urdu Tagline..."
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
    const { transcript, field, videoDuration } = req.body;
    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: "Transcript is required." });
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
