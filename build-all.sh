#!/bin/bash

echo "==============================================="
echo "    Building AIM Discordian for All Platforms"
echo "==============================================="
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo

echo "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

echo
echo "Building for Windows..."
npm run build-win
if [ $? -ne 0 ]; then
    echo "WARNING: Windows build failed"
else
    echo "Windows build completed successfully!"
fi

echo
echo "Building for Linux..."
npm run build-linux
if [ $? -ne 0 ]; then
    echo "WARNING: Linux build failed"
else
    echo "Linux build completed successfully!"
fi

echo
echo "Building for macOS..."
npm run build-mac 2>/dev/null
if [ $? -ne 0 ]; then
    echo "NOTE: macOS build skipped (not on Mac or missing tools)"
else
    echo "macOS build completed successfully!"
fi

echo
echo "==============================================="
echo "     Build Process Complete!"
echo "==============================================="
echo
echo "Check the 'dist' folder for built applications:"
ls -la dist/ 2>/dev/null || echo "  (dist folder not found or empty)"
echo
echo "Distribution files ready for deployment!"
echo