/**
 * Client-side URL syntax and protocol validator.
 * Validates URLs before submission to prevent invalid or dangerous schemes (javascript:, data:, file:)
 */
export function isValidExternalHttpUrl(rawUrl: string): { valid: boolean; error?: string } {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, error: "Please enter a valid URL." };
  }

  const trimmed = rawUrl.trim();
  if (trimmed.length > 2048) {
    return { valid: false, error: "URL is too long (maximum 2048 characters)." };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, error: "Only http:// and https:// URLs are supported." };
    }
    if (!parsed.hostname || parsed.hostname.length < 3) {
      return { valid: false, error: "Please enter a complete URL including a valid domain name." };
    }
    if (parsed.username || parsed.password) {
      return { valid: false, error: "URLs with user authentication credentials are not allowed." };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Malformed URL. Ensure it starts with https:// or http://" };
  }
}
