@echo off
title AIM Discordian - Starting...
color 0A

echo.
echo     ====================================
echo     =        AIM DISCORDIAN           =
echo     =   Classic AOL IM with AI Bots   =
echo     ====================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

:: Create necessary directories
if not exist "data" mkdir data
if not exist "data\buddies" mkdir data\buddies
if not exist "data\conversations" mkdir data\conversations
if not exist "data\profiles" mkdir data\profiles
if not exist "data\logs" mkdir data\logs
if not exist "assets\icons" mkdir assets\icons
if not exist "assets\avatars" mkdir assets\avatars
if not exist "assets\sounds" mkdir assets\sounds

:: Start the Electron app
echo [INFO] Starting AIM Discordian...
echo [INFO] Classic AOL Instant Messenger with AI Bot Friends
echo.
npm start

:: If we get here, the app has stopped
echo.
echo [INFO] AIM Discordian has stopped.
pause