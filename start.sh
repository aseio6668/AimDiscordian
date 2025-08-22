#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "===================================="
echo "=        AIM DISCORDIAN           ="
echo "=   Classic AOL IM with AI Bots   ="
echo "===================================="
echo -e "${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR] npm is not installed${NC}"
    echo "Please install npm (usually comes with Node.js)"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[INFO] Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR] Failed to install dependencies${NC}"
        exit 1
    fi
fi

# Create necessary directories
mkdir -p data/{buddies,conversations,profiles,logs}
mkdir -p assets/{icons,avatars,sounds}

# Start the Electron app
echo -e "${GREEN}[INFO] Starting AIM Discordian...${NC}"
echo -e "${GREEN}[INFO] Classic AOL Instant Messenger with AI Bot Friends${NC}"
echo ""

npm start

# If we get here, the app has stopped
echo ""
echo -e "${YELLOW}[INFO] AIM Discordian has stopped.${NC}"