import { GoogleGenAI } from "@google/genai";
import { ImageProvider, ImageGenerationRequest, GeneratedImageItem, AvailableModel } from "./ImageProvider.js";

export class GoogleImagenProvider implements ImageProvider {
  id = "google-imagen-native";
  name = "Google Imagen 3 (Native Google AI API)";
  description = "Official Google AI Studio API for Imagen 3 high-fidelity image generation";
  isOfficialFlow = false;

  async getAvailableModels(): Promise<AvailableModel[]> {
    return [
      {
        id: "nano-banana-2",
        displayName: "Nano Banana 2 (Google Flow Engine)",
        description: "Google Flow's next-gen high speed prompt comprehension & image synthesis engine",
        provider: "Google Flow / Google AI",
        isSupported: true,
        recommendedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
      },
      {
        id: "nano-banana-pro",
        displayName: "Nano Banana Pro (Google Flow Ultra)",
        description: "Google Flow's highest resolution, maximum details & complex composition engine",
        provider: "Google Flow / Google AI",
        isSupported: true,
        recommendedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
      },
      {
        id: "imagen-3.0-generate-002",
        displayName: "Imagen 3 Studio (Photorealistic)",
        description: "Google's highest quality text-to-image model with rich lighting and photorealistic details",
        provider: "Google AI",
        isSupported: true,
        recommendedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
      },
      {
        id: "imagen-3.0-fast-generate-001",
        displayName: "Imagen 3 Fast (Lightning Speed)",
        description: "Optimized for sub-second generation and rapid creative iteration",
        provider: "Google AI",
        isSupported: true,
        recommendedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
      },
    ];
  }

  async generateImages(apiKey: string, req: ImageGenerationRequest): Promise<GeneratedImageItem[]> {
    const ai = new GoogleGenAI({ apiKey });
    let selectedModel = req.model || "nano-banana-2";
    
    // Map Nano Banana & Imagen models to standard Gemini image models
    let targetModel = "gemini-3.1-flash-image";
    if (selectedModel === "nano-banana-pro") {
      targetModel = "gemini-3-pro-image";
    } else if (selectedModel === "imagen-3.0-fast-generate-001") {
      targetModel = "gemini-3.1-flash-lite-image";
    }

    const aspectRatio = req.aspectRatio || "1:1";
    let finalPrompt = req.prompt.trim();

    if (req.stylePreset && req.stylePreset !== "None") {
      finalPrompt += `, ${req.stylePreset} style`;
    }

    if (req.negativePrompt && req.negativePrompt.trim()) {
      finalPrompt += `. Avoid: ${req.negativePrompt.trim()}`;
    }

    const parts: any[] = [];

    // Reference Image Attachment
    if (req.referenceImage && req.referenceImage.data) {
      const cleanBase64 = req.referenceImage.data.includes(",")
        ? req.referenceImage.data.split(",")[1]
        : req.referenceImage.data;

      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: req.referenceImage.mimeType || "image/png",
        },
      });
      parts.push({
        text: `Using this uploaded reference image as a base/subject guide, generate a new image matching this prompt: "${finalPrompt}". Retain the key features and style of the reference image.`,
      });
    } else {
      parts.push({ text: finalPrompt });
    }

    // List of models to attempt in sequence (Primary -> Fallbacks)
    const modelAttempts = [
      targetModel,
      "gemini-3.1-flash-image",
      "gemini-3.1-flash-lite-image",
    ];

    // Deduplicate while preserving order
    const uniqueModels = Array.from(new Set(modelAttempts));

    let lastError: any = null;

    for (const modelCandidate of uniqueModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelCandidate,
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any,
            },
          },
        });

        const images: GeneratedImageItem[] = [];
        const now = new Date().toISOString();

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const mime = part.inlineData.mimeType || "image/jpeg";
              images.push({
                id: `img_${Date.now()}_${images.length}`,
                url: `data:${mime};base64,${part.inlineData.data}`,
                mimeType: mime,
                prompt: req.prompt,
                negativePrompt: req.negativePrompt,
                aspectRatio: aspectRatio,
                model: selectedModel,
                createdAt: now,
              });
            }
          }
        }

        if (images.length > 0) {
          return images;
        }
      } catch (err: any) {
        console.warn(`Model ${modelCandidate} image generation failed:`, err?.message || err);
        lastError = err;
      }
    }

    // Secondary Fallback: Try generateImages API call if generateContent fails
    try {
      const fbResponse = await ai.models.generateImages({
        model: "imagen-3.0-fast-generate-001",
        prompt: finalPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: aspectRatio as any,
        },
      });

      if (fbResponse.generatedImages?.[0]?.image?.imageBytes) {
        return [
          {
            id: `img_${Date.now()}_0`,
            url: `data:image/jpeg;base64,${fbResponse.generatedImages[0].image.imageBytes}`,
            mimeType: "image/jpeg",
            prompt: req.prompt,
            negativePrompt: req.negativePrompt,
            aspectRatio: aspectRatio,
            model: selectedModel,
            createdAt: new Date().toISOString(),
          },
        ];
      }
    } catch (fbErr: any) {
      console.warn("generateImages fallback also failed:", fbErr?.message || fbErr);
    }

    throw new Error(
      lastError?.message ||
        "Image generation failed across available models. Please verify your Gemini API key or try again."
    );
  }
}
