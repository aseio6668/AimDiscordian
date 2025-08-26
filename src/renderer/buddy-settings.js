const { ipcRenderer } = require('electron');

class BuddySettingsManager {
    constructor() {
        this.buddyId = null;
        this.originalSettings = null;
        this.initializeEventListeners();
        this.loadBuddySettings();
    }

    initializeEventListeners() {
        // Tab switching
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('onclick').match(/showTab\('(.+)'\)/)?.[1];
                if (tabName) {
                    this.showTab(tabName);
                }
            });
        });

        // Slider value updates
        const sliders = document.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                this.updateSliderValue(e.target);
            });
        });

        // Free messaging toggle
        const freeMessagingToggle = document.getElementById('freeMessagingEnabled');
        if (freeMessagingToggle) {
            freeMessagingToggle.addEventListener('change', (e) => {
                this.toggleFreeMessagingSettings(e.target.checked);
            });
        }

        // Button handlers
        document.querySelector('[onclick="resetToDefaults()"]').addEventListener('click', (e) => {
            e.preventDefault();
            this.resetToDefaults();
        });

        document.querySelector('[onclick="saveSettings()"]').addEventListener('click', (e) => {
            e.preventDefault();
            this.saveSettings();
        });

        // Window close handler
        document.querySelector('[onclick="window.close()"]').addEventListener('click', (e) => {
            e.preventDefault();
            window.close();
        });
    }

    async loadBuddySettings() {
        try {
            // Get buddy ID from URL parameters or IPC
            const urlParams = new URLSearchParams(window.location.search);
            this.buddyId = urlParams.get('buddyId');
            
            if (!this.buddyId) {
                this.buddyId = await ipcRenderer.invoke('get-current-buddy-id');
            }

            if (!this.buddyId) {
                throw new Error('No buddy ID provided');
            }

            // Load buddy settings from main process
            this.originalSettings = await ipcRenderer.invoke('get-buddy-settings', this.buddyId);
            
            // Update window title
            document.getElementById('windowTitle').textContent = 
                `Buddy Settings - ${this.originalSettings.name || 'Unknown Buddy'}`;
            
            this.populateSettings(this.originalSettings);
            
        } catch (error) {
            console.error('Failed to load buddy settings:', error);
            document.getElementById('windowTitle').textContent = 'Buddy Settings - Error Loading';
        }
    }

    populateSettings(settings) {
        // Personality settings
        if (settings.personality) {
            this.setSliderValue('warmth', (settings.personality.warmth || 0.8) * 100);
            this.setSliderValue('friendliness', (settings.personality.friendliness || 0.9) * 100);
            this.setSliderValue('chattiness', (settings.personality.chattiness || 0.4) * 100);
            this.setSliderValue('helpfulness', (settings.personality.helpfulness || 0.9) * 100);
        }

        // Conversation style
        if (settings.conversationStyle) {
            const responseLength = document.getElementById('responseLength');
            if (responseLength && settings.conversationStyle.responseLength) {
                responseLength.value = settings.conversationStyle.responseLength;
            }

            if (settings.conversationStyle.emojiUsage !== undefined) {
                this.setSliderValue('emojiUsage', settings.conversationStyle.emojiUsage * 100);
            }
        }

        // Free messaging settings
        if (settings.settings?.freeMessaging) {
            const freeMessaging = settings.settings.freeMessaging;
            
            const enabledCheckbox = document.getElementById('freeMessagingEnabled');
            if (enabledCheckbox) {
                enabledCheckbox.checked = freeMessaging.enabled || false;
                this.toggleFreeMessagingSettings(enabledCheckbox.checked);
            }

            const frequencySelect = document.getElementById('messageFrequency');
            if (frequencySelect && freeMessaging.frequency) {
                frequencySelect.value = freeMessaging.frequency;
            }

            // Topic checkboxes
            if (freeMessaging.topics && Array.isArray(freeMessaging.topics)) {
                freeMessaging.topics.forEach(topic => {
                    const checkbox = document.getElementById(`topic${topic.charAt(0).toUpperCase() + topic.slice(1)}`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });
            }
        }

        // Advanced settings
        const aiProviderSelect = document.getElementById('aiProvider');
        if (aiProviderSelect && settings.aiProvider) {
            aiProviderSelect.value = settings.aiProvider;
        }

        const learningEnabled = document.getElementById('learningEnabled');
        if (learningEnabled) {
            learningEnabled.checked = settings.learningEnabled !== false;
        }

        const privateMessagesOnly = document.getElementById('privateMessagesOnly');
        if (privateMessagesOnly) {
            privateMessagesOnly.checked = settings.privateMessagesOnly !== false;
        }
    }

    setSliderValue(sliderId, value) {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(sliderId + 'Value');
        
        if (slider) {
            slider.value = Math.round(value);
            if (valueDisplay) {
                valueDisplay.textContent = Math.round(value) + '%';
            }
        }
    }

    updateSliderValue(slider) {
        const valueDisplay = document.getElementById(slider.id + 'Value');
        if (valueDisplay) {
            valueDisplay.textContent = slider.value + '%';
        }
    }

    showTab(tabName) {
        // Hide all tab contents
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => content.classList.remove('active'));

        // Remove active class from all tabs
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => tab.classList.remove('active'));

        // Show selected tab content
        const selectedContent = document.getElementById(tabName + 'Tab');
        if (selectedContent) {
            selectedContent.classList.add('active');
        }

        // Mark selected tab as active
        const selectedTab = document.querySelector(`[onclick="showTab('${tabName}')"]`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
    }

    toggleFreeMessagingSettings(enabled) {
        const settingsDiv = document.getElementById('freeMessagingSettings');
        if (settingsDiv) {
            settingsDiv.style.display = enabled ? 'block' : 'none';
        }
    }

    resetToDefaults() {
        if (!confirm('Reset all settings to defaults? This will lose any customizations.')) {
            return;
        }

        // Reset personality sliders to defaults
        this.setSliderValue('warmth', 80);
        this.setSliderValue('friendliness', 90);
        this.setSliderValue('chattiness', 40);
        this.setSliderValue('helpfulness', 90);
        this.setSliderValue('emojiUsage', 50);

        // Reset conversation style
        const responseLength = document.getElementById('responseLength');
        if (responseLength) {
            responseLength.value = 'medium';
        }

        // Reset free messaging
        const freeMessagingEnabled = document.getElementById('freeMessagingEnabled');
        if (freeMessagingEnabled) {
            freeMessagingEnabled.checked = false;
            this.toggleFreeMessagingSettings(false);
        }

        const messageFrequency = document.getElementById('messageFrequency');
        if (messageFrequency) {
            messageFrequency.value = 'low';
        }

        // Reset topic checkboxes
        const topicCheckboxes = document.querySelectorAll('#freeMessagingSettings input[type="checkbox"]');
        topicCheckboxes.forEach(checkbox => {
            checkbox.checked = checkbox.id === 'topicCasual'; // Only casual enabled by default
        });

        // Reset advanced settings
        const aiProvider = document.getElementById('aiProvider');
        if (aiProvider) {
            aiProvider.value = 'auto';
        }

        const learningEnabled = document.getElementById('learningEnabled');
        if (learningEnabled) {
            learningEnabled.checked = true;
        }

        const privateMessagesOnly = document.getElementById('privateMessagesOnly');
        if (privateMessagesOnly) {
            privateMessagesOnly.checked = true;
        }
    }

    async saveSettings() {
        try {
            // Collect all settings
            const updatedSettings = {
                personality: {
                    warmth: parseInt(document.getElementById('warmth').value) / 100,
                    friendliness: parseInt(document.getElementById('friendliness').value) / 100,
                    chattiness: parseInt(document.getElementById('chattiness').value) / 100,
                    helpfulness: parseInt(document.getElementById('helpfulness').value) / 100
                },
                conversationStyle: {
                    responseLength: document.getElementById('responseLength').value,
                    emojiUsage: parseInt(document.getElementById('emojiUsage').value) / 100
                },
                aiProvider: document.getElementById('aiProvider').value,
                learningEnabled: document.getElementById('learningEnabled').checked,
                privateMessagesOnly: document.getElementById('privateMessagesOnly').checked,
                settings: {
                    freeMessaging: {
                        enabled: document.getElementById('freeMessagingEnabled').checked,
                        frequency: document.getElementById('messageFrequency').value,
                        topics: this.getSelectedTopics()
                    }
                }
            };

            // Send to main process
            await ipcRenderer.invoke('update-buddy-settings', this.buddyId, updatedSettings);
            
            // Show success and close
            this.showMessage('Settings saved successfully!');
            setTimeout(() => window.close(), 1000);
            
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showMessage('Failed to save settings: ' + error.message);
        }
    }

    getSelectedTopics() {
        const topics = [];
        const topicCheckboxes = document.querySelectorAll('#freeMessagingSettings input[type="checkbox"]:checked');
        
        topicCheckboxes.forEach(checkbox => {
            const topicValue = checkbox.value || checkbox.id.replace('topic', '').toLowerCase();
            topics.push(topicValue);
        });

        return topics.length > 0 ? topics : ['casual'];
    }

    showMessage(text) {
        // Create temporary message display
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #0a246a;
            color: white;
            padding: 10px 15px;
            border: 2px outset #c0c0c0;
            font-size: 11px;
            z-index: 1000;
        `;
        messageDiv.textContent = text;
        document.body.appendChild(messageDiv);

        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.buddySettingsManager = new BuddySettingsManager();
});

// Legacy function support for onclick attributes
function showTab(tabName) {
    if (window.buddySettingsManager) {
        window.buddySettingsManager.showTab(tabName);
    }
}

function resetToDefaults() {
    if (window.buddySettingsManager) {
        window.buddySettingsManager.resetToDefaults();
    }
}

function saveSettings() {
    if (window.buddySettingsManager) {
        window.buddySettingsManager.saveSettings();
    }
}