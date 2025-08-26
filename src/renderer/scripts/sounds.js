// AIM Discordian Sound Manager
class SoundManager {
    constructor() {
        this.sounds = {};
        this.enabled = localStorage.getItem('sounds_enabled') !== 'false';
        this.volume = parseFloat(localStorage.getItem('sound_volume') || '0.5');
        this.loadSounds();
    }

    loadSounds() {
        // Use proper paths for Electron
        const isElectron = typeof require !== 'undefined';
        let soundFiles;

        if (isElectron) {
            const { ipcRenderer } = require('electron');
            const path = require('path');
            
            // Get app path from main process
            ipcRenderer.invoke('get-app-path').then(appPath => {
                soundFiles = {
                    'buddy_in': path.join(appPath, 'assets', 'sounds', 'buddy_in.wav'),
                    'buddy_out': path.join(appPath, 'assets', 'sounds', 'buddy_out.wav'),
                    'message': path.join(appPath, 'assets', 'sounds', 'message.wav'),
                    'send': path.join(appPath, 'assets', 'sounds', 'send.wav')
                };
                this.initializeSounds(soundFiles, true);
            }).catch(() => {
                // Fallback to relative paths
                soundFiles = {
                    'buddy_in': '../assets/sounds/buddy_in.wav',
                    'buddy_out': '../assets/sounds/buddy_out.wav',
                    'message': '../assets/sounds/message.wav',
                    'send': '../assets/sounds/send.wav'
                };
                this.initializeSounds(soundFiles, false);
            });
        } else {
            soundFiles = {
                'buddy_in': '../assets/sounds/buddy_in.wav',
                'buddy_out': '../assets/sounds/buddy_out.wav',
                'message': '../assets/sounds/message.wav',
                'send': '../assets/sounds/send.wav'
            };
            this.initializeSounds(soundFiles, false);
        }
    }

    initializeSounds(soundFiles, isElectron) {
        for (const [name, soundPath] of Object.entries(soundFiles)) {
            this.sounds[name] = new Audio();
            this.sounds[name].volume = this.volume;
            this.sounds[name].preload = 'auto';
            
            // Set proper src
            if (isElectron) {
                this.sounds[name].src = 'file:///' + soundPath.replace(/\\/g, '/');
            } else {
                this.sounds[name].src = soundPath;
            }
            
            // Add event listeners
            this.sounds[name].addEventListener('error', (e) => {
                console.error(`Failed to load sound ${name} from ${soundPath}:`, e);
                console.log(`Attempted path: ${this.sounds[name].src}`);
            });
            
            this.sounds[name].addEventListener('canplaythrough', () => {
                console.log(`Sound ${name} loaded and ready to play`);
            });
            
            this.sounds[name].addEventListener('loadstart', () => {
                console.log(`Started loading sound ${name}`);
            });
        }
    }

    play(soundName) {
        if (!this.enabled || !this.sounds[soundName]) {
            console.log(`Sound not available: ${soundName}, enabled: ${this.enabled}`);
            return;
        }

        try {
            const audio = this.sounds[soundName];
            
            // Reset to beginning if already playing
            audio.currentTime = 0;
            
            // Force volume setting for Electron compatibility
            audio.volume = this.volume;
            
            // Create a promise-based play with better error handling
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log(`Successfully played sound: ${soundName}`);
                }).catch(error => {
                    console.error(`Sound play failed for ${soundName}:`, error);
                    
                    // Try alternative approach for Electron
                    if (typeof require !== 'undefined') {
                        try {
                            const { shell } = require('electron');
                            // As a last resort, could implement native audio playback
                            console.log('Attempting alternative audio playback method...');
                        } catch (e) {
                            console.error('Alternative audio method failed:', e);
                        }
                    }
                });
            }
        } catch (error) {
            console.error(`Critical sound error for ${soundName}:`, error);
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        localStorage.setItem('sounds_enabled', enabled);
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('sound_volume', this.volume);
        
        for (const sound of Object.values(this.sounds)) {
            sound.volume = this.volume;
        }
    }

    isEnabled() {
        return this.enabled;
    }

    getVolume() {
        return this.volume;
    }
}

// Global sound manager instance
window.soundManager = new SoundManager();

// Sound effect functions for easy access
function playBuddyOnlineSound() {
    soundManager.play('buddy_in');
}

function playBuddyOfflineSound() {
    soundManager.play('buddy_out');
}

function playMessageSound() {
    soundManager.play('message');
}

function playSendSound() {
    soundManager.play('send');
}