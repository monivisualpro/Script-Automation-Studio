import { ImageProvider, ImageGenerationRequest, GeneratedImageItem, AvailableModel } from "./ImageProvider.js";

/**
 * GoogleFlowProvider
 *
 * Designed for future compatibility if Google releases an official Google Flow SDK / OAuth API.
 * Currently, Google Flow / ImageFX does NOT provide an official public OAuth or REST API for third-party websites.
 * When official Flow APIs are published by Google, this class can be updated with the official OAuth tokens & endpoints
 * without modifying any front-end or application logic.
 */
export class GoogleFlowProvider implements ImageProvider {
  id = "google-flow-cloud";
  name = "Google Flow (Cloud Account Sync)";
  description = "Connects directly to user's Google Flow / ImageFX account quota and history (Awaiting Official Google Flow API)";
  isOfficialFlow = true;

  async getAvailableModels(): Promise<AvailableModel[]> {
    return [
      {
        id: "flow-nano-banana-2",
        displayName: "Nano Banana 2 (Flow Studio)",
        description: "Google Flow's next-gen image generation engine",
        provider: "Google Flow",
        isSupported: false,
        recommendedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
      },
      {
        id: "flow-nano-banana-pro",
        displayName: "Nano Banana Pro (Flow Studio)",
        description: "Ultra high resolution and prompt comprehension engine",
        provider: "Google Flow",
        isSupported: false,
        recommendedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
      },
    ];
  }

  async generateImages(_apiKey: string, _req: ImageGenerationRequest): Promise<GeneratedImageItem[]> {
    throw new Error(
      "Official Google Flow Cloud Sync API is not yet publicly exposed by Google. Using native Google AI Studio Imagen 3 API instead."
    );
  }
}
