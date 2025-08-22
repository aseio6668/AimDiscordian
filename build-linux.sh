#!/bin/bash

echo "==============================================="
echo "    Building AIM Discordian for Linux"
echo "==============================================="
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/ or use your package manager"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  CentOS/RHEL:   sudo yum install nodejs npm"
    echo "  Arch Linux:    sudo pacman -S nodejs npm"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not available"
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
echo "Building Linux AppImage..."
npm run build-linux
if [ $? -ne 0 ]; then
    echo "ERROR: Build failed"
    exit 1
fi

echo
echo "==============================================="
echo "     Build completed successfully!"
echo "==============================================="
echo
echo "The Linux AppImage can be found in the 'dist' folder:"
ls -la dist/*.AppImage 2>/dev/null || echo "  (No AppImage found - check dist/ folder)"
echo
echo "To run the AppImage:"
echo "  chmod +x dist/*.AppImage"
echo "  ./dist/*.AppImage"
echo
echo "You can now distribute this AppImage to Linux users."
echo