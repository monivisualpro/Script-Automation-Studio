import crypto from "crypto";

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || "script-automation-studio-secret-key-2026-default";

// Derive 32-byte key from secret
const KEY = crypto.createHash("sha256").update(ENCRYPTION_SECRET).digest();
const ALGORITHM = "aes-256-cbc";

export function encryptApiKey(plainText: string): string {
  if (!plainText) return "";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decryptApiKey(cipherText: string): string {
  if (!cipherText || !cipherText.includes(":")) return "";
  const [ivHex, encryptedHex] = cipherText.split(":");
  if (!ivHex || !encryptedHex) return "";
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey) return "";
  const trimmed = apiKey.trim();
  if (trimmed.length <= 10) return "****";
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}
