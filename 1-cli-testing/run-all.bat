@echo off
setlocal enabledelayedexpansion

set "ROOT_DIR=%~dp0"

echo ================================================================
echo  Launching dev servers in separate terminals...
echo ================================================================
echo.

:: 1. npm
set "NPM_TARGET="
if exist "%ROOT_DIR%npm\app\package.json" (
    set "NPM_TARGET=%ROOT_DIR%npm\app"
) else if exist "%ROOT_DIR%npm\package.json" (
    set "NPM_TARGET=%ROOT_DIR%npm"
)

if defined NPM_TARGET (
    echo [npm]  Opening terminal for: npm run dev
    echo        Target: !NPM_TARGET!
    start "npm dev" cmd /k "cd /d "!NPM_TARGET!" && echo ================================================================ && echo  Location: !NPM_TARGET! && echo  Running:  npm run dev (UI :3021, Python Agent :8021) && echo ================================================================ && echo. && set PORT=3021&& set AGENT_PORT=8021&& set AGENT_URL=http://localhost:8021&& npm run dev"
) else (
    echo [npm]  No project found in npm\app or npm. Skipping.
)

:: 2. pnpm
set "PNPM_TARGET="
if exist "%ROOT_DIR%pnpm\app\package.json" (
    set "PNPM_TARGET=%ROOT_DIR%pnpm\app"
) else if exist "%ROOT_DIR%pnpm\package.json" (
    set "PNPM_TARGET=%ROOT_DIR%pnpm"
)

if defined PNPM_TARGET (
    echo [pnpm] Opening terminal for: pnpm run dev
    echo        Target: !PNPM_TARGET!
    start "pnpm dev" cmd /k "cd /d "!PNPM_TARGET!" && echo ================================================================ && echo  Location: !PNPM_TARGET! && echo  Running:  pnpm run dev (UI :3022, Python Agent :8022) && echo ================================================================ && echo. && set PORT=3022&& set AGENT_PORT=8022&& set AGENT_URL=http://localhost:8022&& pnpm run dev"
) else (
    echo [pnpm] No project found in pnpm\app or pnpm. Skipping.
)

:: 3. bun
set "BUN_TARGET="
if exist "%ROOT_DIR%bun\app\package.json" (
    set "BUN_TARGET=%ROOT_DIR%bun\app"
) else if exist "%ROOT_DIR%bun\package.json" (
    set "BUN_TARGET=%ROOT_DIR%bun"
)

if defined BUN_TARGET (
    echo [bun]  Opening terminal for: bun run dev
    echo        Target: !BUN_TARGET!
    start "bun dev" cmd /k "cd /d "!BUN_TARGET!" && echo ================================================================ && echo  Location: !BUN_TARGET! && echo  Running:  bun run dev (UI :3024, Python Agent :8024) && echo ================================================================ && echo. && set PORT=3024&& set AGENT_PORT=8024&& set AGENT_URL=http://localhost:8024&& bun run dev"
) else (
    echo [bun]  No project found in bun\app or bun. Skipping.
)

:: 4. yarn
set "YARN_TARGET="
if exist "%ROOT_DIR%yarn\app\package.json" (
    set "YARN_TARGET=%ROOT_DIR%yarn\app"
) else if exist "%ROOT_DIR%yarn\package.json" (
    set "YARN_TARGET=%ROOT_DIR%yarn"
)

if defined YARN_TARGET (
    echo [yarn] Opening terminal for: yarn run dev
    echo        Target: !YARN_TARGET!
    start "yarn dev" cmd /k "cd /d "!YARN_TARGET!" && echo ================================================================ && echo  Location: !YARN_TARGET! && echo  Running:  yarn run dev (UI :3023, Python Agent :8023) && echo ================================================================ && echo. && set PORT=3023&& set AGENT_PORT=8023&& set AGENT_URL=http://localhost:8023&& yarn run dev"
) else (
    echo [yarn] No project found in yarn\app or yarn. Skipping.
)

echo.
echo ================================================================
echo  All dev server terminals have been opened!
echo ================================================================
pause

