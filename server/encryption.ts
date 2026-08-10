import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const PRIMARY_SECRET = process.env.ENCRYPTION_SECRET?.trim();
const LEGACY_SECRET = process.env.LEGACY_ENCRYPTION_SECRET?.trim();

if (!PRIMARY_SECRET) {
  throw new Error(
    "ENCRYPTION_SECRET environment variable is missing. Server cannot start securely without ENCRYPTION_SECRET configured."
  );
}

// Derive 32-byte key from secrets
const PRIMARY_KEY = crypto.createHash("sha256").update(PRIMARY_SECRET).digest();
const LEGACY_KEY = LEGACY_SECRET
  ? crypto.createHash("sha256").update(LEGACY_SECRET).digest()
  : null;

const ALGORITHM = "aes-256-cbc";

export function encryptApiKey(plainText: string): string {
  if (!plainText) return "";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, PRIMARY_KEY, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export interface DecryptionResult {
  plainText: string;
  isLegacy: boolean;
}

export function decryptApiKey(cipherText: string): DecryptionResult {
  if (!cipherText || !cipherText.includes(":")) {
    return { plainText: "", isLegacy: false };
  }
  const [ivHex, encryptedHex] = cipherText.split(":");
  if (!ivHex || !encryptedHex) {
    return { plainText: "", isLegacy: false };
  }

  // 1. Try primary decryption with ENCRYPTION_SECRET
  try {
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, PRIMARY_KEY, iv);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    if (decrypted && decrypted.trim()) {
      return { plainText: decrypted, isLegacy: false };
    }
  } catch (_err) {
    // Primary decryption failed; proceed to check legacy key if available
  }

  // 2. Try legacy decryption with LEGACY_ENCRYPTION_SECRET if provided
  if (LEGACY_KEY) {
    try {
      const iv = Buffer.from(ivHex, "hex");
      const decipher = crypto.createDecipheriv(ALGORITHM, LEGACY_KEY, iv);
      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");
      if (decrypted && decrypted.trim()) {
        return { plainText: decrypted, isLegacy: true };
      }
    } catch (_err) {
      // Legacy decryption also failed
    }
  }

  return { plainText: "", isLegacy: false };
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey) return "";
  const trimmed = apiKey.trim();
  if (trimmed.length <= 10) return "****";
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

