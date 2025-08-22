@echo off
echo ===============================================
echo    Building AIM Discordian for All Platforms
echo ===============================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Building for Windows...
call npm run build-win
if errorlevel 1 (
    echo WARNING: Windows build failed
) else (
    echo Windows build completed successfully!
)

echo.
echo Building for Linux...
echo NOTE: Cross-platform Linux builds from Windows have limitations
call npm run build-linux
if errorlevel 1 (
    echo NOTE: Linux build failed (use Linux or WSL for best results)
) else (
    echo Linux build completed successfully!
)

echo.
echo Building for macOS (if on Mac)...
call npm run build-mac 2>nul
if errorlevel 1 (
    echo NOTE: macOS build skipped (not on Mac or missing tools)
) else (
    echo macOS build completed successfully!
)

echo.
echo ===============================================
echo     Build Process Complete!
echo ===============================================
echo.
echo Check the 'dist' folder for built applications:
dir dist /b 2>nul
echo.
echo Distribution files ready for deployment!
echo.
pause