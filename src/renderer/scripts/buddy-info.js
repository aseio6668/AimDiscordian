const { ipcRenderer } = require('electron');

class BuddyInfoWindow {
    constructor() {
        this.buddyId = this.getBuddyIdFromArgs();
        this.buddy = null;
        
        this.initializeWindow();
        this.setupEventListeners();
    }

    getBuddyIdFromArgs() {
        const args = process.argv;
        const buddyIdArg = args.find(arg => arg.startsWith('--buddy-id='));
        return buddyIdArg ? buddyIdArg.split('=')[1] : null;
    }

    async initializeWindow() {
        if (!this.buddyId) {
            console.error('No buddy ID provided');
            this.showError('No buddy specified');
            return;
        }

        try {
            // Get buddy information
            this.buddy = await ipcRenderer.invoke('get-buddy', this.buddyId);
            if (!this.buddy) {
                console.error('Buddy not found');
                this.showError('Buddy not found');
                return;
            }

            // Update window with buddy info
            this.updateBuddyInfo();

        } catch (error) {
            console.error('Failed to initialize buddy info window:', error);
            this.showError('Failed to load buddy information');
        }
    }

    setupEventListeners() {
        // Close buttons
        document.getElementById('closeBtn').addEventListener('click', () => this.closeWindow());
        document.getElementById('closeWindowBtn').addEventListener('click', () => this.closeWindow());
        
        // Send message button
        document.getElementById('sendMessageBtn').addEventListener('click', () => this.openChatWindow());

        // Window controls
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeWindow();
            }
        });
    }

    updateBuddyInfo() {
        if (!this.buddy) return;

        // Window title
        document.getElementById('windowTitle').textContent = `${this.buddy.name} - Buddy Info`;
        document.title = `${this.buddy.name} - Buddy Info`;

        // Avatar
        document.getElementById('buddyAvatar').textContent = this.buddy.avatar || '👤';

        // Basic info
        document.getElementById('screenName').textContent = this.buddy.name;
        document.getElementById('buddyStatus').textContent = this.buddy.status === 'online' ? 'Online' : 'Offline';
        document.getElementById('personalityType').textContent = this.buddy.personalityType || 'Friendly';

        // AI Settings
        document.getElementById('chattiness').textContent = this.buddy.chattiness || 5;
        document.getElementById('intelligence').textContent = this.buddy.intelligence || 7;
        document.getElementById('empathy').textContent = this.buddy.empathy || 6;

        // Friendship level
        const friendshipLevel = this.getFriendshipLevel(this.buddy.friendshipScore || 0);
        document.getElementById('friendshipLevel').textContent = friendshipLevel;

        // Conversation count
        const messageCount = this.buddy.conversationHistory ? this.buddy.conversationHistory.length : 0;
        document.getElementById('conversationCount').textContent = `${messageCount} messages exchanged`;

        // Created date
        if (this.buddy.createdAt) {
            const date = new Date(this.buddy.createdAt);
            document.getElementById('createdDate').textContent = date.toLocaleDateString();
        }
    }

    getFriendshipLevel(score) {
        if (score >= 80) return 'Best Friends';
        if (score >= 60) return 'Close Friends';
        if (score >= 40) return 'Good Friends';
        if (score >= 20) return 'Friends';
        return 'Acquaintances';
    }

    async openChatWindow() {
        try {
            await ipcRenderer.invoke('open-chat-window', this.buddyId);
            // Optionally close this window after opening chat
            // this.closeWindow();
        } catch (error) {
            console.error('Failed to open chat window:', error);
            this.showError('Failed to open chat window');
        }
    }

    closeWindow() {
        try {
            ipcRenderer.send('close-buddy-info-window');
        } catch (error) {
            console.log('IPC not available, closing window directly');
            window.close();
        }
    }

    showError(message) {
        document.getElementById('screenName').textContent = 'Error';
        document.getElementById('buddyStatus').textContent = message;
        document.getElementById('sendMessageBtn').disabled = true;
    }
}

// Initialize the buddy info window when page loads
document.addEventListener('DOMContentLoaded', () => {
    new BuddyInfoWindow();
});