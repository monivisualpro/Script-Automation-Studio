"use strict";

const fs = require("fs");
const crypto = require("crypto");
const net = require("net");
const path = require("path");

const cmd = process.argv[2];

switch (cmd) {
  case "check-node": {
    const major = parseInt((process.versions.node || "0").split(".")[0], 10);
    process.exit(major >= 18 ? 0 : 1);
    break;
  }

  case "setup-env": {
    const envPath = path.resolve(process.cwd(), ".env");
    const eol = process.platform === "win32" ? "\r\n" : "\n";

    if (!fs.existsSync(envPath)) {
      const fallback = [
        "PORT=3000",
        "AI_PROVIDER=gemini",
        "",
      ].join(eol);
      fs.writeFileSync(envPath, fallback, { mode: 0o600 });
    }

    const raw = fs.readFileSync(envPath, "utf8");
    const lines = raw.split(/\r?\n/);
    let hasSecret = false;
    let secretUpdated = false;
    let port = "3000";

    const out = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("PORT=") && !trimmed.startsWith("#")) {
        const val = trimmed.slice(5).trim();
        if (/^\d+$/.test(val)) {
          port = val;
        }
      }
      if (trimmed.startsWith("ENCRYPTION_SECRET=") && !trimmed.startsWith("#")) {
        hasSecret = true;
        const val = trimmed.slice("ENCRYPTION_SECRET=".length).trim();
        if (!val || val === "your_secret_here") {
          secretUpdated = true;
          return "ENCRYPTION_SECRET=" + crypto.randomBytes(32).toString("hex");
        }
      }
      return line;
    });

    if (!hasSecret) {
      out.push("ENCRYPTION_SECRET=" + crypto.randomBytes(32).toString("hex"));
      secretUpdated = true;
    }

    if (secretUpdated) {
      fs.writeFileSync(envPath, out.join(eol), { mode: 0o600 });
      console.error("[INFO] Generated secure random ENCRYPTION_SECRET in .env.");
    }

    const hasRealKey = lines.some((l) => {
      const t = l.trim();
      if (!t || t.startsWith("#")) return false;
      if (t.startsWith("GEMINI_API_KEY=")) return !t.endsWith("your_gemini_api_key_here") && t.length > 16;
      if (t.startsWith("OPENAI_API_KEY=")) return !t.endsWith("your_openai_api_key_here") && t.length > 16;
      if (t.startsWith("ANTHROPIC_API_KEY=")) return !t.endsWith("your_anthropic_api_key_here") && t.length > 19;
      if (t.startsWith("AI_PROVIDER=local")) return true;
      return false;
    });

    if (!hasRealKey) {
      console.error("[NOTE] No AI key detected in .env yet. Add one in .env or inside Settings -> API Key.");
    }

    process.stdout.write(port);
    break;
  }

  case "check-port": {
    const port = Number(process.argv[3] || "3000");
    if (!Number.isFinite(port) || port <= 0 || port > 65535) {
      process.exit(1);
    }
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(500);
    socket.on("connect", () => {
      socket.destroy();
      process.exit(0); // Port is in use
    });
    socket.on("error", () => {
      process.exit(1); // Port is free
    });
    socket.on("timeout", () => {
      socket.destroy();
      process.exit(1); // Port is free
    });
    break;
  }

  default: {
    console.error("Unknown launcher-helper command:", cmd || "(none)");
    process.exit(2);
  }
}
