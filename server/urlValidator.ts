import dns from "dns";
import { URL } from "url";

/**
 * Validates whether an IP address belongs to a private, loopback, carrier-grade NAT,
 * link-local, or cloud metadata network range.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  // IPv4 checks
  if (ip.includes(".")) {
    const parts = ip.split(".").map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true; // invalid IP structure, reject
    }
    const [a, b] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
    // 10.0.0.0/8 (Private)
    if (a === 10) return true;
    // 100.64.0.0/10 (Shared Address Space / CGNAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (Link Local / Cloud Metadata 169.254.169.254)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (a === 192 && b === 0 && parts[2] === 0) return true;
    // 192.0.2.0/24 (TEST-NET-1)
    if (a === 192 && b === 0 && parts[2] === 2) return true;
    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;
    // 198.18.0.0/15 (Network benchmark tests)
    if (a === 198 && (b === 18 || b === 19)) return true;
    // 198.51.100.0/24 (TEST-NET-2)
    if (a === 198 && b === 51 && parts[2] === 100) return true;
    // 203.0.113.0/24 (TEST-NET-3)
    if (a === 203 && b === 0 && parts[2] === 113) return true;
    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;
    // 240.0.0.0/4 (Reserved / Future Use)
    if (a >= 240) return true;

    return false;
  }

  // IPv6 checks
  const lower = ip.toLowerCase();
  // Loopback ::1 or unspecified ::
  if (lower === "::1" || lower === "::") return true;
  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  if (lower.startsWith("::ffff:")) {
    const ipv4Part = lower.replace("::ffff:", "");
    if (ipv4Part.includes(".")) {
      return isPrivateOrReservedIp(ipv4Part);
    }
    return true;
  }
  // Unique Local Address fc00::/7 (fc00:: - fdff::)
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  // Link-Local fe80::/10 (fe80:: - febf::)
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) {
    return true;
  }

  return false;
}

export interface UrlValidationResult {
  valid: boolean;
  sanitizedUrl?: string;
  error?: string;
}

/**
 * Validates external URLs for SSRF safety with DNS resolution and rebinding mitigations.
 * Strictly allows http: and https: protocols.
 */
export async function validateSafeExternalUrl(rawUrl: string): Promise<UrlValidationResult> {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, error: "URL is empty or invalid." };
  }

  const trimmed = rawUrl.trim();
  if (trimmed.length > 2048) {
    return { valid: false, error: "URL exceeds maximum allowed length of 2048 characters." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "Malformed URL syntax." };
  }

  // Strictly permit only HTTP and HTTPS protocols
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, error: "Invalid protocol. Only http: and https: URLs are permitted." };
  }

  // Reject embedded credentials in URL (e.g. https://user:pass@evil.com)
  if (parsed.username || parsed.password) {
    return { valid: false, error: "URLs containing user credentials are not allowed." };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) {
    return { valid: false, error: "URL hostname is missing." };
  }

  // Deny explicit localhost or cloud metadata hostnames directly
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "metadata.google.internal"
  ) {
    return { valid: false, error: "Access to private or local hostnames is prohibited." };
  }

  // If hostname is directly an IP address, check against reserved ranges
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(":")) {
    if (isPrivateOrReservedIp(hostname)) {
      return { valid: false, error: "Access to private or loopback IP addresses is prohibited." };
    }
  }

  // DNS resolution check: resolve all addresses to prevent DNS rebinding attacks
  try {
    const lookupResults = await dns.promises.lookup(hostname, { all: true });
    if (!lookupResults || lookupResults.length === 0) {
      return { valid: false, error: "Host could not be resolved by DNS." };
    }

    for (const entry of lookupResults) {
      if (isPrivateOrReservedIp(entry.address)) {
        return {
          valid: false,
          error: "Resolved address is inside a restricted private or reserved network range."
        };
      }
    }
  } catch (err: any) {
    return {
      valid: false,
      error: `DNS lookup failed for hostname '${hostname}': ${err.code || "Resolution error"}`
    };
  }

  return {
    valid: true,
    sanitizedUrl: parsed.toString()
  };
}
