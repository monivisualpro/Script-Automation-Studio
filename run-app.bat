@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ==============================================================================
REM Script Automation Studio — Secure Local Launcher (Windows)
REM Usage:
REM   run-app.bat            Start local dev server & open browser when ready
REM   run-app.bat --prod     Build if needed & run production server
REM   run-app.bat --no-open  Do not automatically open the browser
REM ==============================================================================

pushd "%~dp0" >nul || (
  echo [ERROR] Failed to switch to script directory.
  exit /b 1
)

set "PROD_MODE=0"
set "REBUILD=0"
set "OPEN_BROWSER=1"

for %%A in (%*) do (
  if /I "%%~A"=="--prod" set "PROD_MODE=1"
  if /I "%%~A"=="--rebuild" set "REBUILD=1"
  if /I "%%~A"=="--open" set "OPEN_BROWSER=1"
  if /I "%%~A"=="--no-open" set "OPEN_BROWSER=0"
  if /I "%%~A"=="-h" goto :usage
  if /I "%%~A"=="--help" goto :usage
)

echo ============================================================
echo   Script Automation Studio - Local Launcher (Windows)
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
  echo [ERROR] Node.js v18+ is required. Please upgrade to Node.js 20 LTS.
  goto :fail
)

REM 1. Bootstrap .env safely without overwriting existing config
if not exist ".env" (
  echo [INFO] Creating .env for local desktop app...
  if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
  ) else (
    > ".env" (
      echo PORT=3000
      echo AI_PROVIDER=gemini
    )
  )
)

REM 2. Generate CSPRNG ENCRYPTION_SECRET in .env if missing and read PORT
for /f "delims=" %%P in ('node "scripts\launcher-helper.cjs" setup-env') do set "PORT_VALUE=%%P"

if "%PORT_VALUE%"=="" set "PORT_VALUE=3000"

REM 3. Install dependencies on first launch
if not exist "node_modules" (
  echo [INFO] Installing npm dependencies ^(first run^)...
  if exist "package-lock.json" (
    call npm ci --no-audit --no-fund || goto :fail
  ) else (
    call npm install --no-audit --no-fund || goto :fail
  )
)

REM 4. Verify port availability
node "scripts\launcher-helper.cjs" check-port "%PORT_VALUE%"
if %errorlevel%==0 (
  echo [ERROR] Port %PORT_VALUE% is already in use by another process.
  echo         Close the existing server or change PORT=3001 inside .env.
  goto :fail
)

set "APP_URL=http://localhost:%PORT_VALUE%"
set "AUTO_OPEN_BROWSER=%OPEN_BROWSER%"

if "%PROD_MODE%"=="1" (
  if "%REBUILD%"=="1" (
    call "%~dp0build.bat" || goto :fail
  ) else if not exist "dist\server.cjs" (
    call "%~dp0build.bat" || goto :fail
  ) else if not exist "dist\index.html" (
    call "%~dp0build.bat" || goto :fail
  )
  echo [START] Launching production server at %APP_URL% ^(Press Ctrl+C to stop^)
  set "NODE_ENV=production"
  call npm start || goto :fail
) else (
  echo [START] Launching local dev server at %APP_URL% ^(Press Ctrl+C to stop^)
  call npm run dev || goto :fail
)

popd >nul
exit /b 0

:usage
echo Usage: run-app.bat [--prod] [--rebuild] [--no-open]
popd >nul
exit /b 0

:fail
echo.
echo [LAUNCH FAILED] Resolve the error above and try again.
popd >nul
if "%CI%"=="" pause
exit /b 1
