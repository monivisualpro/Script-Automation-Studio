#!/usr/bin/env bash
# ==============================================================================
# Script Automation Studio — Secure Local Launcher (Linux & macOS)
# Usage:
#   ./run-app.sh           Start local dev server & open browser when ready
#   ./run-app.sh --prod    Build if needed & run optimized production server
#   ./run-app.sh --no-open Do not automatically open the browser
# ==============================================================================
set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PROD_MODE=false
REBUILD=false
OPEN_BROWSER=true

for arg in "$@"; do
  case "$arg" in
    --prod) PROD_MODE=true ;;
    --rebuild) REBUILD=true ;;
    --open) OPEN_BROWSER=true ;;
    --no-open) OPEN_BROWSER=false ;;
    -h|--help)
      echo "Usage: ./run-app.sh [--prod] [--rebuild] [--no-open]"
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown argument: $arg" >&2
      echo "Usage: ./run-app.sh [--prod] [--rebuild] [--no-open]" >&2
      exit 1
      ;;
  esac
done

echo "============================================================"
echo "  Script Automation Studio — Local Launcher (Linux / macOS)"
echo "============================================================"

if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
  echo "[WARN] Avoid running this app with sudo/root privileges." >&2
fi

if [[ ! -f "package.json" ]]; then
  echo "[ERROR] package.json not found in $SCRIPT_DIR" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] Node.js 18+ and npm are required." >&2
  echo "  • macOS:  brew install node" >&2
  echo "  • Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs" >&2
  exit 1
fi

NODE_MAJOR="$(node -p "parseInt(process.versions.node.split('.')[0], 10)")"
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  echo "[ERROR] Node.js v18+ required (found v$(node -v))." >&2
  exit 1
fi

# 1. Securely bootstrap .env without overwriting existing user config
if [[ ! -f ".env" ]]; then
  echo "[INFO] Creating .env for local standalone mode..."
  if [[ -f ".env.example" ]]; then
    cp ".env.example" ".env"
  else
    printf "STANDALONE_MODE=true\nPORT=3000\nAI_PROVIDER=gemini\n" > ".env"
  fi
  chmod 600 ".env" || true
else
  # Enforce owner-only file permissions on .env containing local API keys
  chmod 600 ".env" 2>/dev/null || true
fi

# 2. Ensure cryptographically random ENCRYPTION_SECRET exists inside .env (never echoed)
#    and read configured PORT safely
PORT_VALUE="$(node scripts/launcher-helper.cjs setup-env)"
PORT_VALUE="${PORT_VALUE:-3000}"

# 3. Install dependencies if missing
if [[ ! -d "node_modules" ]]; then
  echo "[INFO] Installing npm dependencies (first run)..."
  if [[ -f "package-lock.json" ]]; then
    npm ci --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
fi

# 4. Verify port is available before launching
if node scripts/launcher-helper.cjs check-port "$PORT_VALUE"; then
  echo "[ERROR] Port $PORT_VALUE is already in use by another process." >&2
  echo "        Stop the other process or change PORT=3001 inside .env." >&2
  exit 1
fi

APP_URL="http://localhost:${PORT_VALUE}"
export AUTO_OPEN_BROWSER="$OPEN_BROWSER"

if [[ "$PROD_MODE" == true ]]; then
  if [[ "$REBUILD" == true || ! -f "dist/server.cjs" || ! -f "dist/index.html" ]]; then
    echo "[INFO] Building production bundle..."
    ./build.sh
  fi
  echo "[START] Launching production server at $APP_URL (Press Ctrl+C to stop)"
  NODE_ENV=production exec npm start
else
  echo "[START] Launching local dev server at $APP_URL (Press Ctrl+C to stop)"
  exec npm run dev
fi
