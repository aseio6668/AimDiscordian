const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const AIMServer = require('./server/AIMServer');

class AIMDiscordian {
    constructor() {
        this.mainWindow = null;
        this.server = null;
        this.isQuitting = false;
        this.chatWindows = new Map(); // Track open chat windows
        this.pendingMessages = new Map(); // Messages for closed windows
        
        this.setupApp();
    }

    setupApp() {
        // Fix GPU issues on Windows
        app.commandLine.appendSwitch('disable-gpu-sandbox');
        app.commandLine.appendSwitch('disable-software-rasterizer');
        app.commandLine.appendSwitch('disable-gpu-process-crash-limit');
        
        app.whenReady().then(() => this.createWindow());
        
        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                this.shutdown();
            }
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });

        app.on('before-quit', () => {
            this.isQuitting = true;
        });

        this.setupIPC();
    }

    async createWindow() {
        await this.ensureDirectories();
        await this.startServer();

        this.mainWindow = new BrowserWindow({
            width: 320,
            height: 480,
            minWidth: 280,
            minHeight: 400,
            icon: path.join(__dirname, '../assets/icons/icon.png'),
            title: 'AIM Discordian',
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true,
                webSecurity: false,
                allowRunningInsecureContent: true
            },
            show: false,
            frame: true,
            resizable: true,
            backgroundColor: '#c0c0c0',
            titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
        });

        this.mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            
            if (process.env.NODE_ENV === 'development') {
                this.mainWindow.webContents.openDevTools();
            }
        });

        this.mainWindow.on('close', (event) => {
            if (!this.isQuitting && process.platform === 'darwin') {
                event.preventDefault();
                this.mainWindow.hide();
            }
        });

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        this.setupMenu();
    }

    setupMenu() {
        const template = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'Sign On',
                        accelerator: 'CmdOrCtrl+O',
                        click: () => this.signOn()
                    },
                    {
                        label: 'Sign Off',
                        accelerator: 'CmdOrCtrl+D',
                        click: () => this.signOff()
                    },
                    { type: 'separator' },
                    {
                        label: 'Add Buddy',
                        accelerator: 'CmdOrCtrl+B',
                        click: () => this.addBuddy()
                    },
                    { type: 'separator' },
                    {
                        label: 'Preferences',
                        accelerator: 'CmdOrCtrl+P',
                        click: () => this.openPreferences()
                    },
                    { type: 'separator' },
                    {
                        label: 'Exit',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => {
                            this.isQuitting = true;
                            app.quit();
                        }
                    }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' }
                ]
            },
            {
                label: 'People',
                submenu: [
                    {
                        label: 'View Buddy List',
                        accelerator: 'CmdOrCtrl+1',
                        click: () => this.showBuddyList()
                    },
                    {
                        label: 'Get Buddy Info',
                        accelerator: 'CmdOrCtrl+I',
                        click: () => this.getBuddyInfo()
                    }
                ]
            },
            {
                label: 'Help',
                submenu: [
                    {
                        label: 'About AIM Discordian',
                        click: () => this.showAbout()
                    },
                    {
                        label: 'Help Topics',
                        click: () => this.showHelp()
                    }
                ]
            }
        ];

        if (process.platform === 'darwin') {
            template.unshift({
                label: 'AIM Discordian',
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideothers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            });
        }

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    setupIPC() {
        ipcMain.handle('start-server', async () => {
            return await this.startServer();
        });

        ipcMain.handle('get-buddies', async () => {
            return this.server ? await this.server.getBuddies() : [];
        });

        ipcMain.handle('add-buddy', async (event, buddyData) => {
            return this.server ? await this.server.addBuddy(buddyData) : null;
        });

        ipcMain.handle('send-message', async (event, buddyId, message) => {
            return this.server ? await this.server.sendMessage(buddyId, message) : null;
        });

        ipcMain.handle('get-conversation', async (event, buddyId) => {
            return this.server ? await this.server.getConversation(buddyId) : [];
        });

        ipcMain.handle('open-chat-window', async (event, buddyId) => {
            return this.openChatWindow(buddyId);
        });

        ipcMain.handle('get-buddy', async (event, buddyId) => {
            return this.server ? await this.server.getBuddy(buddyId) : null;
        });

        ipcMain.handle('remove-buddy', async (event, buddyId) => {
            return this.server ? await this.server.removeBuddy(buddyId) : null;
        });

        ipcMain.on('show-buddy-info', (event, buddyId) => {
            this.openBuddyInfoWindow(buddyId);
        });

        ipcMain.on('close-buddy-info-window', (event) => {
            // Find and close the buddy info window
            const window = BrowserWindow.fromWebContents(event.sender);
            if (window) {
                window.close();
            }
        });

        ipcMain.on('minimize-window', () => {
            if (this.mainWindow) {
                this.mainWindow.minimize();
            }
        });

        ipcMain.on('close-window', () => {
            if (this.mainWindow) {
                this.mainWindow.close();
            }
        });

        ipcMain.on('open-preferences', () => {
            this.openPreferences();
        });

        // Handle incoming messages when chat windows are closed
        ipcMain.handle('handle-incoming-message', async (event, buddyId, message) => {
            return this.handleIncomingMessage(buddyId, message);
        });

        // Handle chat window closed
        ipcMain.on('chat-window-closed', (event, buddyId) => {
            this.chatWindows.delete(buddyId);
        });

        // Get pending messages
        ipcMain.handle('get-pending-messages', async (event, buddyId) => {
            return this.pendingMessages.get(buddyId) || [];
        });

        // Clear pending messages
        ipcMain.on('clear-pending-messages', (event, buddyId) => {
            this.pendingMessages.delete(buddyId);
        });

        // Get app path for sound files
        ipcMain.handle('get-app-path', () => {
            return app.getAppPath();
        });

        // Buddy settings handlers
        ipcMain.handle('get-buddy-settings', async (event, buddyId) => {
            if (this.server) {
                return await this.server.getBuddySettings(buddyId);
            }
            return null;
        });

        ipcMain.handle('update-buddy-settings', async (event, buddyId, settings) => {
            if (this.server) {
                return await this.server.updateBuddySettings(buddyId, settings);
            }
            return false;
        });

        ipcMain.handle('get-current-buddy-id', () => {
            // This will be set when opening buddy settings
            return this.currentBuddyId || null;
        });

        ipcMain.handle('open-buddy-settings', (event, buddyId) => {
            this.openBuddySettingsWindow(buddyId);
        });

        // Set global reference for free messaging
        global.mainApp = this;
    }

    async startServer() {
        if (!this.server) {
            this.server = new AIMServer();
            await this.server.initialize();
            console.log('🤖 AIM Discordian server started');
        }
        return true;
    }

    async ensureDirectories() {
        const dirs = [
            './data/buddies',
            './data/conversations',
            './data/profiles',
            './data/logs',
            './assets/sounds',
            './assets/icons'
        ];
        
        for (const dir of dirs) {
            await fs.ensureDir(dir);
        }
    }

    openChatWindow(buddyId) {
        // Check if window already exists
        if (this.chatWindows.has(buddyId)) {
            const existingWindow = this.chatWindows.get(buddyId);
            if (!existingWindow.isDestroyed()) {
                existingWindow.focus();
                return existingWindow.id;
            } else {
                this.chatWindows.delete(buddyId);
            }
        }

        const chatWindow = new BrowserWindow({
            width: 400,
            height: 300,
            minWidth: 300,
            minHeight: 200,
            parent: this.mainWindow,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                additionalArguments: [`--buddy-id=${buddyId}`]
            },
            title: 'Instant Message',
            backgroundColor: '#ffffff',
            show: false
        });

        // Track the window
        this.chatWindows.set(buddyId, chatWindow);

        // Handle window close
        chatWindow.on('closed', () => {
            this.chatWindows.delete(buddyId);
        });

        chatWindow.loadFile(path.join(__dirname, 'renderer/chat.html'));
        
        chatWindow.once('ready-to-show', () => {
            chatWindow.show();
        });

        return chatWindow.id;
    }

    handleIncomingMessage(buddyId, message) {
        const chatWindow = this.chatWindows.get(buddyId);
        
        if (chatWindow && !chatWindow.isDestroyed()) {
            // Window is open, send message directly
            chatWindow.webContents.send('incoming-message', message);
        } else {
            // Window is closed, store message and show notification
            if (!this.pendingMessages.has(buddyId)) {
                this.pendingMessages.set(buddyId, []);
            }
            this.pendingMessages.get(buddyId).push(message);
            
            // Show message notification window
            this.showMessageNotification(buddyId, message);
        }
        
        return true;
    }

    async showMessageNotification(buddyId, message) {
        const buddy = this.server ? await this.server.getBuddy(buddyId) : null;
        if (!buddy) return;

        const notificationWindow = new BrowserWindow({
            width: 320,
            height: 100,
            resizable: false,
            frame: false,
            alwaysOnTop: true,
            skipTaskbar: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            show: false,
            transparent: false,
            backgroundColor: '#ffffff'
        });

        // Position notification in bottom right corner (like classic AIM)
        const { screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        
        // Start position off-screen (below taskbar)
        const finalX = width - 330;
        const finalY = height - 110;
        const startY = height + 50; // Start below screen
        
        notificationWindow.setPosition(finalX, startY);

        const notificationHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
                    background: #ece9d8;
                    border: 2px outset #ece9d8;
                    font-size: 11px;
                    cursor: pointer;
                    overflow: hidden;
                }
                .title-bar {
                    background: linear-gradient(to bottom, #0a246a 0%, #a6caf0 3%, #0a246a 6%, #0a246a 94%, #a6caf0 97%, #0a246a 100%);
                    color: white;
                    padding: 2px 6px;
                    font-size: 11px;
                    font-weight: bold;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    height: 18px;
                }
                .close-btn {
                    background: #c0c0c0;
                    border: 1px outset #c0c0c0;
                    width: 16px;
                    height: 14px;
                    font-size: 8px;
                    text-align: center;
                    line-height: 12px;
                    cursor: pointer;
                    font-family: 'MS Sans Serif';
                }
                .close-btn:active {
                    border: 1px inset #c0c0c0;
                }
                .content {
                    padding: 8px;
                    background: #ece9d8;
                }
                .buddy-name {
                    font-weight: bold;
                    color: #000080;
                    margin-bottom: 2px;
                }
                .message-text {
                    color: #000000;
                    line-height: 1.2;
                    word-wrap: break-word;
                }
                .icon {
                    float: left;
                    width: 16px;
                    height: 16px;
                    margin-right: 6px;
                    margin-top: 1px;
                    background: #c0c0c0;
                    border: 1px inset #c0c0c0;
                }
            </style>
        </head>
        <body>
            <div class="title-bar">
                <span>Instant Message</span>
                <div class="close-btn" onclick="window.close()">×</div>
            </div>
            <div class="content">
                <div class="icon"></div>
                <div class="buddy-name">${buddy.name}</div>
                <div class="message-text">${message.content.substring(0, 80)}${message.content.length > 80 ? '...' : ''}</div>
            </div>
            <script>
                // Play message sound
                if (window.parent && window.parent.soundManager) {
                    window.parent.soundManager.play('message');
                }
                
                document.querySelector('.content').addEventListener('click', (e) => {
                    if (e.target.className !== 'close-btn') {
                        require('electron').ipcRenderer.invoke('open-chat-window', '${buddyId}').then(() => {
                            window.close();
                        });
                    }
                });
                
                // Classic AIM: Auto-close after 10 seconds
                setTimeout(() => {
                    window.close();
                }, 10000);
            </script>
        </body>
        </html>`;

        notificationWindow.loadURL('data:text/html,' + encodeURIComponent(notificationHtml));
        
        // Show notification with slide-up animation (like classic AIM)
        notificationWindow.show();
        
        // Animate sliding up from taskbar
        const slideUp = () => {
            const currentPos = notificationWindow.getPosition();
            if (currentPos[1] > finalY) {
                const newY = Math.max(finalY, currentPos[1] - 8);
                notificationWindow.setPosition(finalX, newY);
                setTimeout(slideUp, 16); // ~60fps
            }
        };
        
        slideUp();
        
        // Play message sound
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.executeJavaScript(`
                if (window.soundManager) {
                    window.soundManager.play('message');
                }
            `).catch(() => {}); // Ignore errors
        }
    }

    openBuddyInfoWindow(buddyId) {
        const infoWindow = new BrowserWindow({
            width: 320,
            height: 480,
            minWidth: 300,
            minHeight: 400,
            maxWidth: 400,
            maxHeight: 600,
            parent: this.mainWindow,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                additionalArguments: [`--buddy-id=${buddyId}`]
            },
            title: 'Buddy Info',
            backgroundColor: '#c0c0c0',
            show: false,
            resizable: false,
            minimizable: false,
            maximizable: false,
            autoHideMenuBar: true
        });

        infoWindow.loadFile(path.join(__dirname, 'renderer/buddy-info.html'));
        
        infoWindow.once('ready-to-show', () => {
            // Auto-fit window to content after loading
            const contents = infoWindow.webContents;
            contents.executeJavaScript(`
                document.body.scrollHeight + 40
            `).then(contentHeight => {
                const newHeight = Math.min(600, Math.max(400, contentHeight));
                infoWindow.setSize(320, newHeight);
                infoWindow.center();
                infoWindow.show();
            }).catch(() => {
                // Fallback if content measurement fails
                infoWindow.show();
            });
        });

        return infoWindow.id;
    }

    signOn() {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('sign-on');
        }
    }

    signOff() {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('sign-off');
        }
    }

    addBuddy() {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('add-buddy-dialog');
        }
    }

    openPreferences() {
        // Get screen dimensions
        const { screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
        
        // Calculate responsive window size (60% of screen, but with limits)
        const maxWidth = Math.min(800, Math.floor(screenWidth * 0.6));
        const maxHeight = Math.min(600, Math.floor(screenHeight * 0.7));
        const minWidth = 600;
        const minHeight = 500;
        
        const prefWindow = new BrowserWindow({
            width: maxWidth,
            height: maxHeight,
            minWidth: minWidth,
            minHeight: minHeight,
            maxWidth: Math.min(1000, screenWidth * 0.8),
            maxHeight: Math.min(800, screenHeight * 0.85),
            parent: this.mainWindow,
            modal: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            title: 'Preferences - AIM Discordian',
            resizable: true,
            center: true,
            backgroundColor: '#c0c0c0',
            show: false
        });

        prefWindow.loadFile(path.join(__dirname, 'renderer', 'preferences.html'));
        
        prefWindow.once('ready-to-show', () => {
            prefWindow.show();
        });
        
        // Handle window close via IPC
        prefWindow.webContents.once('did-finish-load', () => {
            prefWindow.webContents.on('ipc-message', (event, channel) => {
                if (channel === 'close-preferences') {
                    prefWindow.close();
                }
            });
        });
    }

    openBuddySettingsWindow(buddyId) {
        // Store current buddy ID for settings access
        this.currentBuddyId = buddyId;

        const { screen } = require('electron');
        const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
        
        const settingsWindow = new BrowserWindow({
            width: 450,
            height: 500,
            minWidth: 400,
            minHeight: 450,
            parent: this.mainWindow,
            modal: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            title: `Buddy Settings - Loading...`,
            resizable: true,
            center: true,
            backgroundColor: '#c0c0c0',
            show: false
        });

        settingsWindow.loadFile(path.join(__dirname, 'renderer', 'buddy-settings.html'), {
            query: { buddyId: buddyId }
        });
        
        settingsWindow.once('ready-to-show', () => {
            settingsWindow.show();
        });

        settingsWindow.on('closed', () => {
            this.currentBuddyId = null;
        });
    }

    showBuddyList() {
        if (this.mainWindow) {
            this.mainWindow.focus();
        }
    }

    getBuddyInfo() {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('get-buddy-info');
        }
    }

    showAbout() {
        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'About AIM Discordian',
            message: 'AIM Discordian',
            detail: 'Classic AOL Instant Messenger experience with AI Bot Friends\n\nVersion 1.0.0\n\nBringing back the nostalgia of AIM with modern AI technology.'
        });
    }

    showHelp() {
        const helpWindow = new BrowserWindow({
            width: 600,
            height: 500,
            parent: this.mainWindow,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            title: 'AIM Discordian Help'
        });

        helpWindow.loadFile(path.join(__dirname, 'renderer/help.html'));
    }

    async shutdown() {
        if (this.server) {
            await this.server.shutdown();
        }
        app.quit();
    }
}

// Initialize the application
const aimApp = new AIMDiscordian();

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});