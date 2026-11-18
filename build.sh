#!/usr/bin/env bash
# ==============================================================================
# Script Automation Studio — Secure Production Build Script (Linux & macOS)
# Usage:
#   ./build.sh              Build frontend + backend bundle into ./dist
#   ./build.sh --reinstall  Clean install dependencies before building
# ==============================================================================
set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

REINSTALL=false
for arg in "$@"; do
  case "$arg" in
    --reinstall) REINSTALL=true ;;
    -h|--help)
      echo "Usage: ./build.sh [--reinstall]"
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown argument: $arg" >&2
      echo "Usage: ./build.sh [--reinstall]" >&2
      exit 1
      ;;
  esac
done

echo "============================================================"
echo "  Script Automation Studio — Local Build (Linux / macOS)"
echo "============================================================"

# Avoid creating root-owned files in node_modules / dist
if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
  echo "[WARN] Running as root/sudo is not recommended for Node builds." >&2
  echo "       Prefer running as your normal user account." >&2
fi

if [[ ! -f "package.json" ]]; then
  echo "[ERROR] package.json not found in $SCRIPT_DIR" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js is not installed or not in PATH." >&2
  echo "  • macOS:  brew install node" >&2
  echo "  • Linux:  Install Node.js 20 LTS via nvm or your package manager." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] npm is not installed or not in PATH." >&2
  exit 1
fi

NODE_MAJOR="$(node -p "parseInt(process.versions.node.split('.')[0], 10)")"
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  echo "[ERROR] Node.js v18+ is required (found v$(node -v)). Please upgrade to Node.js 20 LTS." >&2
  exit 1
fi

echo "[1/4] Node.js $(node -v) & npm $(npm -v) verified."

if [[ "$REINSTALL" == true || ! -d "node_modules" ]]; then
  echo "[2/4] Installing dependencies..."
  if [[ -f "package-lock.json" ]]; then
    npm ci --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
else
  echo "[2/4] Dependencies present (skipping install; pass --reinstall to refresh)."
fi

echo "[3/4] Running TypeScript verification (npm run lint)..."
npm run lint

echo "[4/4] Building production bundle (Vite client + dist/server.cjs)..."
npm run build

if [[ ! -f "dist/server.cjs" || ! -f "dist/index.html" ]]; then
  echo "[ERROR] Build finished without expected dist/server.cjs or dist/index.html artifacts." >&2
  exit 1
fi

echo "============================================================"
echo "  Build succeeded!"
echo "  Run production server with: ./run-app.sh --prod"
echo "============================================================"
