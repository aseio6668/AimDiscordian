// AIM Discordian Sound Manager
class SoundManager {
    constructor() {
        this.sounds = {};
        this.enabled = localStorage.getItem('sounds_enabled') !== 'false';
        this.volume = parseFloat(localStorage.getItem('sound_volume') || '0.5');
        this.loadSounds();
    }

    loadSounds() {
        const soundFiles = {
            'buddy_in': '../assets/sounds/buddy_in.wav',
            'buddy_out': '../assets/sounds/buddy_out.wav', 
            'message': '../assets/sounds/message.wav',
            'send': '../assets/sounds/send.wav'
        };

        for (const [name, path] of Object.entries(soundFiles)) {
            this.sounds[name] = new Audio(path);
            this.sounds[name].volume = this.volume;
            this.sounds[name].preload = 'auto';
        }
    }

    play(soundName) {
        if (!this.enabled || !this.sounds[soundName]) {
            return;
        }

        try {
            // Reset to beginning if already playing
            this.sounds[soundName].currentTime = 0;
            this.sounds[soundName].play().catch(e => {
                console.log('Sound play failed:', e);
            });
        } catch (error) {
            console.log('Sound error:', error);
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