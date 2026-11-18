@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ==============================================================================
REM Script Automation Studio — Secure Production Build Script (Windows)
REM Usage:
REM   build.bat              Build frontend + backend bundle into .\dist
REM   build.bat --reinstall  Clean install dependencies before building
REM ==============================================================================

pushd "%~dp0" >nul || (
  echo [ERROR] Failed to switch to script directory.
  exit /b 1
)

set "REINSTALL=0"
for %%A in (%*) do (
  if /I "%%~A"=="--reinstall" set "REINSTALL=1"
  if /I "%%~A"=="-h" goto :usage
  if /I "%%~A"=="--help" goto :usage
)

echo ============================================================
echo   Script Automation Studio - Local Build (Windows)
echo ============================================================

if not exist "package.json" (
  echo [ERROR] package.json not found in %CD%.
  goto :fail
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo         Download Node.js 20 LTS from https://nodejs.org/
  goto :fail
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm is not installed or not in PATH.
  goto :fail
)

node "scripts\launcher-helper.cjs" check-node
if errorlevel 1 (
  echo [ERROR] Node.js v18 or higher is required. Please upgrade to Node.js 20 LTS.
  goto :fail
)

for /f "delims=" %%V in ('node -v') do set "NODE_VER=%%V"
for /f "delims=" %%V in ('npm -v') do set "NPM_VER=%%V"
echo [1/4] Node.js %NODE_VER% and npm %NPM_VER% verified.

if "%REINSTALL%"=="1" (
  echo [2/4] Reinstalling dependencies...
  if exist "package-lock.json" (
    call npm ci --no-audit --no-fund || goto :fail
  ) else (
    call npm install --no-audit --no-fund || goto :fail
  )
) else if not exist "node_modules" (
  echo [2/4] Installing dependencies...
  if exist "package-lock.json" (
    call npm ci --no-audit --no-fund || goto :fail
  ) else (
    call npm install --no-audit --no-fund || goto :fail
  )
) else (
  echo [2/4] Dependencies present ^(pass --reinstall to refresh^).
)

echo [3/4] Running TypeScript verification ^(npm run lint^)...
call npm run lint || goto :fail

echo [4/4] Building production bundle ^(Vite client + dist\server.cjs^)...
call npm run build || goto :fail

if not exist "dist\server.cjs" (
  echo [ERROR] Expected build output dist\server.cjs was not generated.
  goto :fail
)
if not exist "dist\index.html" (
  echo [ERROR] Expected build output dist\index.html was not generated.
  goto :fail
)

echo ============================================================
echo   Build succeeded!
echo   Run production server with: run-app.bat --prod
echo ============================================================
popd >nul
exit /b 0

:usage
echo Usage: build.bat [--reinstall]
popd >nul
exit /b 0

:fail
echo.
echo [BUILD FAILED] Resolve the error above and try again.
popd >nul
if "%CI%"=="" pause
exit /b 1
