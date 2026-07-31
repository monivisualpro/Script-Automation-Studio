import { ImageProvider } from "./ImageProvider.js";
import { GoogleImagenProvider } from "./GoogleImagenProvider.js";
import { GoogleFlowProvider } from "./GoogleFlowProvider.js";

class ImageProviderRegistry {
  private providers: Map<string, ImageProvider> = new Map();
  private activeProviderId: string = "google-imagen-native";

  constructor() {
    const nativeProvider = new GoogleImagenProvider();
    const flowProvider = new GoogleFlowProvider();

    this.providers.set(nativeProvider.id, nativeProvider);
    this.providers.set(flowProvider.id, flowProvider);
  }

  getActiveProvider(): ImageProvider {
    return this.providers.get(this.activeProviderId) || this.providers.get("google-imagen-native")!;
  }

  getProvider(id: string): ImageProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): Array<{ id: string; name: string; description: string; isOfficialFlow: boolean }> {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      isOfficialFlow: p.isOfficialFlow,
    }));
  }

  setActiveProvider(id: string): boolean {
    if (this.providers.has(id)) {
      this.activeProviderId = id;
      return true;
    }
    return false;
  }
}

export const imageProviderRegistry = new ImageProviderRegistry();
export * from "./ImageProvider.js";
export * from "./GoogleImagenProvider.js";
export * from "./GoogleFlowProvider.js";
