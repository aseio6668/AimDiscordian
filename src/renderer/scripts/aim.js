const { ipcRenderer } = require('electron');

class AIMClient {
    constructor() {
        this.isSignedOn = false;
        this.currentUser = null;
        this.buddies = [];
        this.chatWindows = new Map();
        
        this.initializeEventListeners();
        this.loadSavedCredentials();
    }

    initializeEventListeners() {
        // Sign-in functionality
        document.getElementById('signinBtn').addEventListener('click', () => this.signOn());
        document.getElementById('screenname').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.signOn();
        });
        document.getElementById('password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.signOn();
        });

        // Toolbar buttons
        document.getElementById('addBtn').addEventListener('click', () => this.showAddBuddyDialog());
        document.getElementById('imBtn').addEventListener('click', () => this.sendInstantMessage());
        document.getElementById('infoBtn').addEventListener('click', () => this.getBuddyInfo());
        document.getElementById('setupBtn').addEventListener('click', () => this.openSetup());

        // Status dropdown
        document.getElementById('statusDropdown').addEventListener('change', (e) => {
            this.changeStatus(e.target.value);
        });

        // User avatar click
        document.getElementById('userAvatar').addEventListener('click', () => {
            this.showUserAvatarDialog();
        });

        // Window controls
        document.getElementById('minimize').addEventListener('click', () => {
            ipcRenderer.send('minimize-window');
        });
        document.getElementById('close').addEventListener('click', () => {
            ipcRenderer.send('close-window');
        });

        // IPC listeners
        ipcRenderer.on('sign-on', () => this.signOn());
        ipcRenderer.on('sign-off', () => this.signOff());
        ipcRenderer.on('add-buddy-dialog', () => this.showAddBuddyDialog());
        ipcRenderer.on('get-buddy-info', () => this.getBuddyInfo());

        // Auto-login check
        if (document.getElementById('autoLogin').checked) {
            setTimeout(() => this.signOn(), 1000);
        }
    }

    loadSavedCredentials() {
        const savedUsername = localStorage.getItem('aim_username');
        const savedPassword = localStorage.getItem('aim_password');
        const autoLogin = localStorage.getItem('aim_auto_login') === 'true';
        const savePassword = localStorage.getItem('aim_save_password') === 'true';
        const savedAvatar = localStorage.getItem('user_avatar') || '👤';

        if (savedUsername) {
            document.getElementById('screenname').value = savedUsername;
        }
        if (savedPassword && savePassword) {
            document.getElementById('password').value = savedPassword;
        }
        document.getElementById('autoLogin').checked = autoLogin;
        document.getElementById('savePassword').checked = savePassword;
        
        // Load saved avatar
        document.getElementById('userAvatar').textContent = savedAvatar;
    }

    async signOn() {
        const screenname = document.getElementById('screenname').value.trim();
        const password = document.getElementById('password').value;
        const autoLogin = document.getElementById('autoLogin').checked;
        const savePassword = document.getElementById('savePassword').checked;

        if (!screenname) {
            this.showError('Please enter a screen name.');
            return;
        }

        this.updateStatus('Signing on...');

        try {
            // Save credentials if requested
            localStorage.setItem('aim_username', screenname);
            localStorage.setItem('aim_auto_login', autoLogin);
            localStorage.setItem('aim_save_password', savePassword);
            
            if (savePassword) {
                localStorage.setItem('aim_password', password);
            } else {
                localStorage.removeItem('aim_password');
            }

            // Start the server
            await ipcRenderer.invoke('start-server');

            // Set current user
            this.currentUser = {
                screenname: screenname,
                status: 'online'
            };

            // Update UI
            document.getElementById('username').textContent = screenname;
            document.getElementById('signinPanel').style.display = 'none';
            document.getElementById('buddyList').style.display = 'flex';
            
            this.isSignedOn = true;
            this.updateStatus('Online');

            // Load buddies
            await this.loadBuddies();

            // Play sign-on sound
            this.playSound('signon');

        } catch (error) {
            console.error('Sign-on failed:', error);
            this.showError('Sign-on failed. Please try again.');
            this.updateStatus('Sign-on failed');
        }
    }

    signOff() {
        this.isSignedOn = false;
        this.currentUser = null;
        
        // Close all chat windows
        this.chatWindows.forEach(window => window.close());
        this.chatWindows.clear();

        // Update UI
        document.getElementById('buddyList').style.display = 'none';
        document.getElementById('signinPanel').style.display = 'flex';
        
        this.updateStatus('Signed off');
        this.playSound('signoff');
    }

    async loadBuddies() {
        try {
            this.buddies = await ipcRenderer.invoke('get-buddies');
            this.renderBuddyList();
        } catch (error) {
            console.error('Failed to load buddies:', error);
        }
    }

    renderBuddyList() {
        const onlineContainer = document.getElementById('online-buddies');
        const offlineContainer = document.getElementById('offline-buddies');
        
        onlineContainer.innerHTML = '';
        offlineContainer.innerHTML = '';

        let onlineCount = 0;
        let offlineCount = 0;

        this.buddies.forEach(buddy => {
            const buddyElement = this.createBuddyElement(buddy);
            
            if (buddy.status === 'online') {
                onlineContainer.appendChild(buddyElement);
                onlineCount++;
            } else {
                offlineContainer.appendChild(buddyElement);
                offlineCount++;
            }
        });

        document.getElementById('onlineCount').textContent = onlineCount;
        document.getElementById('offlineCount').textContent = offlineCount;
    }

    createBuddyElement(buddy) {
        const div = document.createElement('div');
        div.className = `buddy-item ${buddy.status === 'offline' ? 'offline' : ''}`;
        div.dataset.buddyId = buddy.id;

        const avatarEmojis = {
            'friendly_face': '😊', 'cool_guy': '😎', 'smart_girl': '🤓', 'artist': '🎨',
            'scientist': '🔬', 'musician': '🎵', 'gamer': '🎮', 'chef': '👨‍🍳',
            'adventurer': '🏔️', 'bookworm': '📚', 'tech_guru': '💻', 'nature_lover': '🌲',
            'space_fan': '🚀', 'cat_person': '🐱', 'dog_person': '🐕', 'mystic': '🔮',
            'philosopher': '🤔', 'comedian': '😂', 'helper': '🤗', 'robot': '🤖'
        };

        const avatarDisplay = avatarEmojis[buddy.avatar] ? 
            `<span class="buddy-avatar-emoji">${avatarEmojis[buddy.avatar]}</span>` :
            `<img src="../assets/avatars/${buddy.avatar || 'default.png'}" alt="Avatar" class="buddy-avatar">`;

        div.innerHTML = `
            ${avatarDisplay}
            <span class="buddy-status-dot ${buddy.status}"></span>
            <span class="buddy-name">${buddy.name}</span>
            ${buddy.statusMessage ? `<span class="buddy-status-text">${buddy.statusMessage}</span>` : ''}
        `;

        // Double-click to start chat
        div.addEventListener('dblclick', () => {
            this.openChatWindow(buddy.id);
        });

        // Right-click context menu
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showBuddyContextMenu(buddy, e.clientX, e.clientY);
        });

        // Single click to select
        div.addEventListener('click', () => {
            document.querySelectorAll('.buddy-item').forEach(item => {
                item.classList.remove('selected');
            });
            div.classList.add('selected');
        });

        return div;
    }

    async openChatWindow(buddyId) {
        if (this.chatWindows.has(buddyId)) {
            // Focus existing window
            this.chatWindows.get(buddyId).focus();
            return;
        }

        try {
            const windowId = await ipcRenderer.invoke('open-chat-window', buddyId);
            this.chatWindows.set(buddyId, { id: windowId });
            this.playSound('receive');
        } catch (error) {
            console.error('Failed to open chat window:', error);
        }
    }

    showAddBuddyDialog() {
        document.getElementById('addBuddyDialog').style.display = 'flex';
        document.getElementById('buddyName').focus();
    }

    sendInstantMessage() {
        const selectedBuddy = document.querySelector('.buddy-item.selected');
        if (!selectedBuddy) {
            this.showError('Please select a buddy first.');
            return;
        }

        const buddyId = selectedBuddy.dataset.buddyId;
        this.openChatWindow(buddyId);
    }

    getBuddyInfo() {
        const selectedBuddy = document.querySelector('.buddy-item.selected');
        if (!selectedBuddy) {
            this.showError('Please select a buddy first.');
            return;
        }

        const buddyId = selectedBuddy.dataset.buddyId;
        const buddy = this.buddies.find(b => b.id === buddyId);
        
        if (buddy) {
            this.showBuddyInfoDialog(buddy);
        }
    }

    showBuddyInfoDialog(buddy) {
        // Create buddy info dialog
        const dialog = document.createElement('div');
        dialog.className = 'dialog-overlay';
        dialog.innerHTML = `
            <div class="dialog-box">
                <div class="dialog-title">
                    <span>${buddy.name} - Buddy Info</span>
                    <button class="dialog-close">×</button>
                </div>
                <div class="dialog-content">
                    <div style="text-align: center; margin-bottom: 12px;">
                        <img src="../assets/avatars/${buddy.avatar || 'default.png'}" alt="Avatar" style="width: 48px; height: 48px; border: 2px inset #c0c0c0;">
                    </div>
                    <div class="form-group">
                        <label>Screen Name:</label>
                        <div style="font-weight: bold; color: #000080;">${buddy.name}</div>
                    </div>
                    <div class="form-group">
                        <label>Status:</label>
                        <div>${buddy.status === 'online' ? 'Online' : 'Offline'}</div>
                    </div>
                    <div class="form-group">
                        <label>Personality:</label>
                        <div>${buddy.personalityType || 'Friendly'}</div>
                    </div>
                    <div class="form-group">
                        <label>AI Settings:</label>
                        <div style="font-size: 9px; color: #666;">
                            Chattiness: ${buddy.chattiness || 5}/10<br>
                            Intelligence: ${buddy.intelligence || 7}/10<br>
                            Empathy: ${buddy.empathy || 6}/10
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Friendship Level:</label>
                        <div>${this.getFriendshipLevel(buddy.friendshipScore || 0)}</div>
                    </div>
                </div>
                <div class="dialog-buttons">
                    <button class="dialog-btn">Send Message</button>
                    <button class="dialog-btn">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Event listeners
        dialog.querySelector('.dialog-close').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });

        dialog.querySelector('.dialog-buttons .dialog-btn:last-child').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });

        dialog.querySelector('.dialog-buttons .dialog-btn:first-child').addEventListener('click', () => {
            document.body.removeChild(dialog);
            this.openChatWindow(buddy.id);
        });

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
            }
        });
    }

    getFriendshipLevel(score) {
        if (score >= 80) return 'Best Friends';
        if (score >= 60) return 'Close Friends';
        if (score >= 40) return 'Good Friends';
        if (score >= 20) return 'Friends';
        return 'New Friend';
    }

    openSetup() {
        // Open preferences window
        ipcRenderer.send('open-preferences');
    }

    changeStatus(newStatus) {
        if (!this.isSignedOn) return;

        this.currentUser.status = newStatus;
        
        const statusIcon = document.getElementById('statusIcon');
        statusIcon.src = `../assets/icons/${newStatus}.gif`;

        this.updateStatus(`Status changed to ${newStatus}`);
    }

    showBuddyContextMenu(buddy, x, y) {
        // Create context menu
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: white;
            border: 1px solid #808080;
            box-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            z-index: 2000;
            font-size: 10px;
            min-width: 120px;
        `;

        menu.innerHTML = `
            <div class="menu-item" data-action="sendMessage">Send Message</div>
            <div class="menu-item" data-action="getInfo">Get Info</div>
            <div class="menu-separator"></div>
            <div class="menu-item" data-action="removeBuddy">Remove Buddy</div>
        `;

        // Add menu styles
        const style = document.createElement('style');
        style.textContent = `
            .menu-item {
                padding: 4px 12px;
                cursor: pointer;
                background: white;
            }
            .menu-item:hover {
                background: #316ac5;
                color: white;
            }
            .menu-separator {
                height: 1px;
                background: #c0c0c0;
                margin: 2px 0;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(menu);

        // Handle menu clicks
        menu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.handleBuddyAction(buddy, action);
            }
            document.body.removeChild(menu);
            document.head.removeChild(style);
        });

        // Close menu on outside click
        setTimeout(() => {
            document.addEventListener('click', function closeMenu() {
                if (document.body.contains(menu)) {
                    document.body.removeChild(menu);
                    document.head.removeChild(style);
                }
                document.removeEventListener('click', closeMenu);
            });
        }, 10);
    }

    handleBuddyAction(buddy, action) {
        switch (action) {
            case 'sendMessage':
                this.openChatWindow(buddy.id);
                break;
            case 'getInfo':
                this.showBuddyInfoDialog(buddy);
                break;
            case 'removeBuddy':
                this.removeBuddy(buddy);
                break;
        }
    }

    async removeBuddy(buddy) {
        const confirmed = confirm(`Are you sure you want to remove ${buddy.name} from your buddy list?`);
        if (confirmed) {
            try {
                await ipcRenderer.invoke('remove-buddy', buddy.id);
                await this.loadBuddies();
                this.updateStatus(`${buddy.name} removed from buddy list`);
            } catch (error) {
                console.error('Failed to remove buddy:', error);
                this.showError('Failed to remove buddy.');
            }
        }
    }

    playSound(soundName) {
        // Map AIM sound names to our sound manager names
        const soundMap = {
            'signon': 'buddy_in',
            'signoff': 'buddy_out', 
            'buddyon': 'buddy_in',
            'receive': 'message',
            'send': 'send'
        };
        
        const mappedSound = soundMap[soundName] || soundName;
        if (window.soundManager) {
            window.soundManager.play(mappedSound);
        }
    }

    updateStatus(message) {
        document.getElementById('statusText').textContent = message;
        setTimeout(() => {
            if (this.isSignedOn) {
                document.getElementById('statusText').textContent = 'Online';
            } else {
                document.getElementById('statusText').textContent = 'Ready';
            }
        }, 3000);
    }

    showError(message) {
        alert(message); // TODO: Replace with custom dialog
    }

    showUserAvatarDialog() {
        document.getElementById('userAvatarDialog').style.display = 'flex';
        
        // Load current avatar
        const currentAvatar = localStorage.getItem('user_avatar') || '👤';
        document.querySelectorAll('#userAvatarSelection .avatar-option').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.avatar === currentAvatar) {
                option.classList.add('selected');
            }
        });

        // Setup avatar selection
        document.querySelectorAll('#userAvatarSelection .avatar-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectUserAvatar(e.currentTarget));
        });

        // Setup select button
        document.getElementById('selectUserAvatarBtn').onclick = () => {
            const selectedOption = document.querySelector('#userAvatarSelection .avatar-option.selected');
            if (selectedOption) {
                const newAvatar = selectedOption.dataset.avatar;
                this.updateUserAvatar(newAvatar);
                this.closeUserAvatarDialog();
            }
        };
    }

    selectUserAvatar(element) {
        document.querySelectorAll('#userAvatarSelection .avatar-option').forEach(option => {
            option.classList.remove('selected');
        });
        element.classList.add('selected');
    }

    updateUserAvatar(avatar) {
        document.getElementById('userAvatar').textContent = avatar;
        localStorage.setItem('user_avatar', avatar);
        this.updateStatus(`Avatar changed to ${avatar}`);
    }

    closeUserAvatarDialog() {
        document.getElementById('userAvatarDialog').style.display = 'none';
    }
}

// Helper functions for buddy list
function toggleGroup(groupId) {
    const group = document.getElementById(groupId);
    const header = group.parentNode.querySelector('.group-header .group-expand');
    
    if (group.classList.contains('collapsed')) {
        group.classList.remove('collapsed');
        header.textContent = '▼';
    } else {
        group.classList.add('collapsed');
        header.textContent = '▶';
    }
}

// Initialize AIM client when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.aimClient = new AIMClient();
});