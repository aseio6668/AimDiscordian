class PreferencesManager {
    constructor() {
        this.settings = {};
        this.loadSettings();
        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Range sliders with value display
        this.setupRangeSliders();

        // Sound test buttons
        document.querySelectorAll('.test-sound').forEach(btn => {
            btn.addEventListener('click', (e) => this.testSound(e.target.dataset.sound));
        });

        // Action buttons
        document.getElementById('closeBtn').addEventListener('click', () => this.close());
        document.getElementById('cancelBtn').addEventListener('click', () => this.close());
        document.getElementById('applyBtn').addEventListener('click', () => this.applySettings());
        document.getElementById('okBtn').addEventListener('click', () => this.okAndClose());

        // Danger zone
        document.getElementById('clearAllData').addEventListener('click', () => this.clearAllData());

        // Real-time setting updates
        this.setupSettingListeners();
    }

    setupRangeSliders() {
        // Transparency slider
        const transparencySlider = document.getElementById('transparency');
        const transparencyValue = document.getElementById('transparencyValue');
        transparencySlider.addEventListener('input', (e) => {
            transparencyValue.textContent = e.target.value + '%';
        });

        // Volume slider
        const volumeSlider = document.getElementById('masterVolume');
        const volumeValue = document.getElementById('volumeValue');
        volumeSlider.addEventListener('input', (e) => {
            volumeValue.textContent = e.target.value + '%';
        });

        // AI delay sliders
        const minDelaySlider = document.getElementById('minDelay');
        const minDelayValue = document.getElementById('minDelayValue');
        minDelaySlider.addEventListener('input', (e) => {
            minDelayValue.textContent = e.target.value + 's';
            // Ensure max is always greater than min
            const maxSlider = document.getElementById('maxDelay');
            if (parseInt(e.target.value) >= parseInt(maxSlider.value)) {
                maxSlider.value = parseInt(e.target.value) + 1;
                document.getElementById('maxDelayValue').textContent = maxSlider.value + 's';
            }
        });

        const maxDelaySlider = document.getElementById('maxDelay');
        const maxDelayValue = document.getElementById('maxDelayValue');
        maxDelaySlider.addEventListener('input', (e) => {
            maxDelayValue.textContent = e.target.value + 's';
            // Ensure min is always less than max
            const minSlider = document.getElementById('minDelay');
            if (parseInt(e.target.value) <= parseInt(minSlider.value)) {
                minSlider.value = parseInt(e.target.value) - 1;
                document.getElementById('minDelayValue').textContent = minSlider.value + 's';
            }
        });
    }

    setupSettingListeners() {
        // Auto-save settings when changed
        const settingInputs = document.querySelectorAll('input, select');
        settingInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.gatherSettings();
            });
        });
    }

    switchTab(tabName) {
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');
    }

    testSound(soundName) {
        // Map AIM sound names to our sound manager names
        const soundMap = {
            'signon': 'buddy_in',
            'signoff': 'buddy_out', 
            'buddyon': 'buddy_in',
            'buddyoff': 'buddy_out',
            'receive': 'message',
            'send': 'send'
        };
        
        const mappedSound = soundMap[soundName] || soundName;
        
        if (window.soundManager) {
            // Set volume from slider
            const volume = document.getElementById('masterVolume').value / 100;
            window.soundManager.setVolume(volume);
            window.soundManager.play(mappedSound);
        } else {
            console.warn('Sound manager not available');
        }
    }

    loadSettings() {
        // Load settings from localStorage or use defaults
        const defaultSettings = {
            // General
            autoLogin: true,
            savePassword: true,
            startMinimized: false,
            showOfflineBuddies: true,
            backupFrequency: 'weekly',
            maxBuddies: 50,
            autoPopupMessages: true,

            // Appearance
            windowTheme: 'classic',
            fontSize: 'medium',
            showTimestamps: true,
            showTyping: true,
            transparency: 100,
            alwaysOnTop: false,

            // AI Settings
            aiProvider: 'auto',
            ollamaUrl: 'http://localhost:11434',
            openaiKey: '',
            anthropicKey: '',
            minDelay: 2,
            maxDelay: 8,
            enableLearning: true,
            memoryThreshold: 500,

            // Sounds
            enableSounds: true,
            masterVolume: 50,
            signonSound: true,
            signoffSound: true,
            receiveSound: true,
            sendSound: false,
            buddyonSound: true,
            buddyoffSound: false,

            // Privacy
            encryptHistory: true,
            autoDelete: 'never',
            logInteractions: false,
            shareStats: false
        };

        const savedSettings = localStorage.getItem('aim_preferences');
        this.settings = savedSettings ? 
            { ...defaultSettings, ...JSON.parse(savedSettings) } : 
            defaultSettings;
    }

    updateUI() {
        // Update all form elements with saved settings
        Object.entries(this.settings).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else if (element.type === 'range') {
                    element.value = value;
                    // Update associated value displays
                    const valueDisplay = document.getElementById(key + 'Value');
                    if (valueDisplay) {
                        let displayValue = value;
                        if (key === 'transparency' || key === 'masterVolume') {
                            displayValue += '%';
                        } else if (key === 'minDelay' || key === 'maxDelay') {
                            displayValue += 's';
                        }
                        valueDisplay.textContent = displayValue;
                    }
                } else {
                    element.value = value;
                }
            }
        });
    }

    gatherSettings() {
        // Collect all current form values
        const formData = new FormData();
        const inputs = document.querySelectorAll('input, select');
        
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                this.settings[input.id] = input.checked;
            } else if (input.type === 'range' || input.type === 'number') {
                this.settings[input.id] = parseInt(input.value);
            } else {
                this.settings[input.id] = input.value;
            }
        });
    }

    applySettings() {
        this.gatherSettings();
        this.saveSettings();
        this.showMessage('Settings applied successfully!', 'success');
        
        // Update sound manager with new settings
        if (window.soundManager) {
            window.soundManager.setEnabled(this.settings.enableSounds);
            window.soundManager.setVolume(this.settings.masterVolume / 100);
        }
        
        // Send settings to main process
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('update-preferences', this.settings);
        }
    }

    okAndClose() {
        this.applySettings();
        setTimeout(() => this.close(), 500);
    }

    saveSettings() {
        localStorage.setItem('aim_preferences', JSON.stringify(this.settings));
    }

    close() {
        try {
            if (typeof require !== 'undefined') {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('close-preferences');
            }
        } catch (error) {
            console.log('IPC not available, closing window directly');
        }
        
        // Fallback to direct window close
        try {
            window.close();
        } catch (error) {
            // If all else fails, try to hide the window
            document.body.style.display = 'none';
        }
    }

    clearAllData() {
        const confirmed = confirm(
            'Are you ABSOLUTELY SURE you want to delete ALL data?\n\n' +
            'This will permanently remove:\n' +
            '• All AI buddies and their personalities\n' +
            '• All conversation histories\n' +
            '• All settings and preferences\n' +
            '• All saved memories and relationships\n\n' +
            'This action CANNOT be undone!'
        );

        if (confirmed) {
            const doubleConfirm = confirm('Last chance! This will delete EVERYTHING. Are you sure?');
            
            if (doubleConfirm) {
                try {
                    // Clear localStorage
                    localStorage.clear();
                    
                    // Send message to main process to clear files
                    if (typeof require !== 'undefined') {
                        const { ipcRenderer } = require('electron');
                        ipcRenderer.send('clear-all-data');
                    }
                    
                    this.showMessage('All data has been cleared. Please restart the application.', 'warning');
                    
                    setTimeout(() => {
                        this.close();
                    }, 2000);
                    
                } catch (error) {
                    console.error('Error clearing data:', error);
                    this.showMessage('Error clearing data. Please try again.', 'error');
                }
            }
        }
    }

    showMessage(message, type = 'info') {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            z-index: 9999;
            font-size: 10px;
            max-width: 300px;
        `;

        if (type === 'success') {
            notification.style.background = '#28a745';
        } else if (type === 'error') {
            notification.style.background = '#dc3545';
        } else if (type === 'warning') {
            notification.style.background = '#ffc107';
            notification.style.color = '#212529';
        } else {
            notification.style.background = '#17a2b8';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Export settings for backup
    exportSettings() {
        const dataStr = JSON.stringify(this.settings, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'aim_discordian_settings.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    // Import settings from backup
    importSettings(fileContent) {
        try {
            const importedSettings = JSON.parse(fileContent);
            this.settings = { ...this.settings, ...importedSettings };
            this.updateUI();
            this.saveSettings();
            this.showMessage('Settings imported successfully!', 'success');
        } catch (error) {
            this.showMessage('Invalid settings file format.', 'error');
        }
    }
}

// Initialize preferences manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.preferencesManager = new PreferencesManager();
});