export interface ReferenceImageInput {
  data: string; // base64
  mimeType: string;
  mode?: "reference" | "style_transfer" | "blend";
}

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  model?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  numberOfImages?: number;
  stylePreset?: string;
  seed?: number;
  referenceImage?: ReferenceImageInput;
}

export interface GeneratedImageItem {
  id: string;
  url: string; // base64 data URL
  mimeType: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  model: string;
  createdAt: string;
  width?: number;
  height?: number;
}

export interface AvailableModel {
  id: string;
  displayName: string;
  description: string;
  provider: string;
  isSupported: boolean;
  recommendedAspectRatios: string[];
}

export interface ImageProvider {
  id: string;
  name: string;
  description: string;
  isOfficialFlow: boolean;
  getAvailableModels(): Promise<AvailableModel[]>;
  generateImages(apiKey: string, req: ImageGenerationRequest): Promise<GeneratedImageItem[]>;
}
