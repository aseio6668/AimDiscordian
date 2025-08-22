@echo off
echo ===============================================
echo    Building AIM Discordian for Windows
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
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo ===============================================
echo     Build completed successfully!
echo ===============================================
echo.
echo The Windows installer can be found in the 'dist' folder:
for %%i in (dist\*.exe) do (
    echo   - %%i
)
echo.
echo You can now distribute this installer to Windows users.
echo.
pause