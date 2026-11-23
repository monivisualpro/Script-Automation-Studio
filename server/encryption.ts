import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const LOCAL_DATA_DIR = path.resolve(process.cwd(), ".studio-data");
const LOCAL_SECRET_FILE = path.join(LOCAL_DATA_DIR, "local.secret");

function resolveLocalDesktopSecret(): Buffer {
  const envSecret = process.env.ENCRYPTION_SECRET?.trim();
  if (envSecret) {
    return crypto.createHash("sha256").update(envSecret).digest();
  }

  try {
    if (fs.existsSync(LOCAL_SECRET_FILE)) {
      const existingHex = fs.readFileSync(LOCAL_SECRET_FILE, "utf8").trim();
      if (/^[0-9a-f]{64}$/i.test(existingHex)) {
        return Buffer.from(existingHex, "hex");
      }
    }
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    const generated = crypto.randomBytes(32);
    fs.writeFileSync(LOCAL_SECRET_FILE, generated.toString("hex"), { mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(32);
  }
}

const LEGACY_SECRET = process.env.LEGACY_ENCRYPTION_SECRET?.trim();

const PRIMARY_KEY = resolveLocalDesktopSecret();
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

  // 1. Try primary decryption with PRIMARY_KEY
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
