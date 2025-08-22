# Building AIM Discordian

This document explains how to build AIM Discordian into standalone executables for different platforms.

## Prerequisites

- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)
- At least 2GB free disk space for dependencies and build artifacts

## Quick Start

### Windows
Run the build script for Windows:
```batch
build-windows.bat
```

### Linux
Run the build script for Linux:
```bash
chmod +x build-linux.sh
./build-linux.sh
```

### All Platforms
To build for all supported platforms:
```batch
# Windows
build-all.bat

# Linux/macOS
chmod +x build-all.sh
./build-all.sh
```

## Manual Build Process

If you prefer to build manually:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build for specific platform:**
   ```bash
   # Windows installer (.exe)
   npm run build-win
   
   # Linux AppImage
   npm run build-linux
   
   # macOS app (.dmg) - macOS only
   npm run build-mac
   
   # All platforms
   npm run build
   ```

3. **Package without installer (portable):**
   ```bash
   npm run pack
   ```

## Output Files

After building, you'll find the distribution files in the `dist/` folder:

- **Windows:** `AIM Discordian Setup.exe` (NSIS installer)
- **Linux:** `AIM Discordian-*.AppImage` (AppImage executable)
- **macOS:** `AIM Discordian-*.dmg` (Disk image)

## Build Configuration

The build is configured in `package.json` under the `build` section:

- **App ID:** `com.discordian.aim`
- **Product Name:** AIM Discordian
- **Icons:** Located in `assets/icons/`
- **Target Formats:**
  - Windows: NSIS installer
  - Linux: AppImage
  - macOS: DMG

## Platform-Specific Notes

### Windows
- Builds a Windows installer (.exe) using NSIS
- Requires Windows or cross-compilation support
- Icon format: ICO

### Linux
- Builds an AppImage (self-contained executable)
- Works on most Linux distributions
- Icon format: PNG
- Make the AppImage executable: `chmod +x *.AppImage`

### macOS
- Builds a DMG disk image
- Requires macOS for proper code signing
- Icon format: ICNS
- Note: Cross-compilation from other platforms may have limitations

## Troubleshooting

### Common Issues

1. **"electron-builder not found"**
   - Run `npm install` first
   - Make sure you're in the project directory

2. **"Node.js not found"**
   - Install Node.js from https://nodejs.org/
   - Restart your terminal/command prompt

3. **Build fails with native dependencies**
   - This usually happens with sqlite3
   - Try: `npm rebuild` or `npm install --build-from-source`

4. **Large file sizes**
   - The built apps include the full Electron runtime (~150MB)
   - This is normal for Electron applications

### Cross-Platform Building

- **From Windows:** Can build Windows reliably, Linux has limitations
- **From Linux:** Can build Linux and Windows (with wine)
- **From macOS:** Can build all platforms

**Note:** For best results, build on the target platform or use CI/CD services.

## Distribution

The built executables are completely standalone and can be distributed without requiring users to install Node.js or any other dependencies.

### Installation Instructions for Users

**Windows:**
1. Download the `.exe` installer
2. Run the installer
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

**Linux:**
1. Download the `.AppImage` file
2. Make it executable: `chmod +x AIM-Discordian-*.AppImage`
3. Run: `./AIM-Discordian-*.AppImage`

**macOS:**
1. Download the `.dmg` file
2. Open the DMG
3. Drag the app to Applications folder
4. Launch from Applications

## Development vs Production

- **Development:** Use `npm start` to run from source
- **Production:** Use the built executables for distribution

The built versions include optimizations and are packaged for end users who don't need the development environment.