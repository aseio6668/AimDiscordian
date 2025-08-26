const { ipcRenderer } = require('electron');

class ChatWindow {
    constructor() {
        this.buddyId = this.getBuddyIdFromArgs();
        this.buddy = null;
        this.conversation = [];
        this.isTyping = false;
        this.messageCount = 0;
        
        this.initializeChat();
        this.setupEventListeners();
    }

    getBuddyIdFromArgs() {
        const args = process.argv;
        const buddyIdArg = args.find(arg => arg.startsWith('--buddy-id='));
        return buddyIdArg ? buddyIdArg.split('=')[1] : null;
    }

    async initializeChat() {
        if (!this.buddyId) {
            console.error('No buddy ID provided');
            return;
        }

        try {
            // Get buddy information
            this.buddy = await ipcRenderer.invoke('get-buddy', this.buddyId);
            if (!this.buddy) {
                console.error('Buddy not found');
                return;
            }

            // Update UI with buddy info
            this.updateBuddyInfo();

            // Load conversation history
            await this.loadConversationHistory();

            // Show welcome message
            this.showWelcomeMessage();

            // Focus message input
            document.getElementById('messageInput').focus();

        } catch (error) {
            console.error('Failed to initialize chat:', error);
        }
    }

    updateBuddyInfo() {
        document.getElementById('buddyName').textContent = this.buddy.name;
        document.getElementById('buddyNameTyping').textContent = this.buddy.name;
        document.getElementById('buddyStatus').textContent = this.buddy.status === 'online' ? 'Online' : 'Offline';
        
        // Handle emoji avatars
        const avatarEmojis = {
            'friendly_face': '😊', 'cool_guy': '😎', 'smart_girl': '🤓', 'artist': '🎨',
            'scientist': '🔬', 'musician': '🎵', 'gamer': '🎮', 'chef': '👨‍🍳',
            'adventurer': '🏔️', 'bookworm': '📚', 'tech_guru': '💻', 'nature_lover': '🌲',
            'space_fan': '🚀', 'cat_person': '🐱', 'dog_person': '🐕', 'mystic': '🔮',
            'philosopher': '🤔', 'comedian': '😂', 'helper': '🤗', 'robot': '🤖'
        };

        const avatar = document.getElementById('chatAvatar');
        if (avatarEmojis[this.buddy.avatar]) {
            avatar.style.display = 'none';
            const emojiAvatar = document.createElement('span');
            emojiAvatar.className = 'chat-avatar-emoji';
            emojiAvatar.textContent = avatarEmojis[this.buddy.avatar];
            emojiAvatar.style.cssText = 'font-size: 24px; line-height: 1; margin-right: 8px;';
            avatar.parentNode.insertBefore(emojiAvatar, avatar);
        } else {
            avatar.src = `../assets/avatars/${this.buddy.avatar || 'default.png'}`;
        }
        
        // Update window title
        document.title = `Instant Message - ${this.buddy.name}`;
    }

    async loadConversationHistory() {
        try {
            this.conversation = await ipcRenderer.invoke('get-conversation', this.buddyId);
            this.renderConversation();
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    }

    renderConversation() {
        const messagesContainer = document.getElementById('chatMessages');
        
        // Clear existing messages (except system messages)
        const systemMessages = messagesContainer.querySelectorAll('.system-message');
        messagesContainer.innerHTML = '';
        systemMessages.forEach(msg => messagesContainer.appendChild(msg));

        // Add conversation messages
        this.conversation.forEach(message => {
            this.addMessageToUI(message, false);
        });

        // Scroll to bottom
        this.scrollToBottom();
    }

    showWelcomeMessage() {
        const welcomeMsg = document.getElementById('welcomeMessage');
        if (this.conversation.length === 0) {
            welcomeMsg.textContent = `You are now chatting with ${this.buddy.name}`;
        } else {
            welcomeMsg.textContent = `Continuing conversation with ${this.buddy.name}`;
        }
    }

    setupEventListeners() {
        // Message input
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const charCount = document.getElementById('charCount');

        messageInput.addEventListener('input', (e) => {
            const length = e.target.value.length;
            charCount.textContent = `${length}/1000`;
            
            if (length > 900) {
                charCount.className = 'char-count error';
            } else if (length > 800) {
                charCount.className = 'char-count warning';
            } else {
                charCount.className = 'char-count';
            }

            sendBtn.disabled = length === 0 || length > 1000;
        });

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        sendBtn.addEventListener('click', () => this.sendMessage());

        // Formatting buttons
        document.getElementById('boldBtn').addEventListener('click', () => this.formatText('bold'));
        document.getElementById('italicBtn').addEventListener('click', () => this.formatText('italic'));
        document.getElementById('underlineBtn').addEventListener('click', () => this.formatText('underline'));
        document.getElementById('emojiBtn').addEventListener('click', () => this.toggleEmojiPicker());

        // Emoji picker
        document.querySelectorAll('.emoji-item').forEach(emoji => {
            emoji.addEventListener('click', (e) => this.insertEmoji(e.target.textContent));
        });

        // Info button
        document.getElementById('infoBtn').addEventListener('click', () => this.showBuddyInfo());

        // Context menu for messages
        document.getElementById('chatMessages').addEventListener('contextmenu', (e) => {
            if (e.target.closest('.message-content')) {
                e.preventDefault();
                this.showContextMenu(e, e.target.closest('.message'));
            }
        });

        // Click outside to close menus
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.emoji-picker')) {
                document.getElementById('emojiPicker').style.display = 'none';
            }
            if (!e.target.closest('.context-menu')) {
                document.getElementById('contextMenu').style.display = 'none';
            }
        });

        // Window focus/blur for notification sounds
        window.addEventListener('focus', () => {
            this.windowFocused = true;
        });

        window.addEventListener('blur', () => {
            this.windowFocused = false;
        });
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();

        if (!content) return;

        // Create user message
        const userMessage = {
            id: this.generateId(),
            content: content,
            sender: 'user',
            timestamp: new Date().toISOString(),
            type: 'text'
        };

        // Add to UI immediately
        this.addMessageToUI(userMessage);
        
        // Play send sound
        this.playSound('send');
        
        messageInput.value = '';
        document.getElementById('charCount').textContent = '0/1000';
        document.getElementById('sendBtn').disabled = true;

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Send to server and get response
            const response = await ipcRenderer.invoke('send-message', this.buddyId, content);
            
            if (response) {
                // Hide typing indicator
                this.hideTypingIndicator();
                
                // Add buddy response to UI
                setTimeout(() => {
                    this.addMessageToUI(response);
                    this.playSound('receive');
                }, 1000 + Math.random() * 2000); // Simulate thinking time
            }

        } catch (error) {
            console.error('Failed to send message:', error);
            this.hideTypingIndicator();
            this.showError('Failed to send message. Please try again.');
        }

        // Focus back to input
        messageInput.focus();
    }

    addMessageToUI(message, animate = true) {
        const messagesContainer = document.getElementById('chatMessages');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender}`;
        if (animate) messageDiv.style.animation = 'slideIn 0.3s ease-out';

        const timestamp = new Date(message.timestamp);
        const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${message.sender === 'user' ? 'You' : this.buddy.name}</span>
                <span class="message-time">${timeStr}</span>
            </div>
            <div class="message-content">${this.formatMessageContent(message.content)}</div>
        `;

        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();

        // Add to conversation array
        this.conversation.push(message);
        this.messageCount++;
    }

    formatMessageContent(content) {
        // Basic text formatting
        let formatted = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
            .replace(/__(.*?)__/g, '<u>$1</u>')               // Underline
            .replace(/https?:\/\/[^\s]+/g, '<a href="$&" target="_blank">$&</a>'); // Links

        return formatted;
    }

    showTypingIndicator() {
        this.isTyping = true;
        document.getElementById('typingIndicator').style.display = 'flex';
    }

    hideTypingIndicator() {
        this.isTyping = false;
        document.getElementById('typingIndicator').style.display = 'none';
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    formatText(type) {
        const messageInput = document.getElementById('messageInput');
        const start = messageInput.selectionStart;
        const end = messageInput.selectionEnd;
        const selectedText = messageInput.value.substring(start, end);

        if (selectedText) {
            let formattedText;
            switch (type) {
                case 'bold':
                    formattedText = `**${selectedText}**`;
                    break;
                case 'italic':
                    formattedText = `*${selectedText}*`;
                    break;
                case 'underline':
                    formattedText = `__${selectedText}__`;
                    break;
                default:
                    return;
            }

            messageInput.value = messageInput.value.substring(0, start) + formattedText + messageInput.value.substring(end);
            messageInput.focus();
            messageInput.setSelectionRange(start + formattedText.length, start + formattedText.length);
        }
    }

    toggleEmojiPicker() {
        const picker = document.getElementById('emojiPicker');
        picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
    }

    insertEmoji(emoji) {
        const messageInput = document.getElementById('messageInput');
        const cursorPos = messageInput.selectionStart;
        const textBefore = messageInput.value.substring(0, cursorPos);
        const textAfter = messageInput.value.substring(cursorPos);
        
        messageInput.value = textBefore + emoji + textAfter;
        messageInput.focus();
        messageInput.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
        
        // Trigger input event to update character count
        messageInput.dispatchEvent(new Event('input'));
        
        // Hide emoji picker
        document.getElementById('emojiPicker').style.display = 'none';
    }

    showBuddyInfo() {
        // Use IPC to open buddy info in separate window
        ipcRenderer.send('show-buddy-info', this.buddyId);
        return;

        // Old modal dialog code (kept as fallback):
        if (!this.buddy) {
            console.warn('No buddy data available for info dialog');
            return;
        }
        
        // Create buddy info dialog
        const dialog = document.createElement('div');
        dialog.className = 'dialog-overlay';
        dialog.innerHTML = `
            <div class="dialog-box" style="width: 300px;">
                <div class="dialog-title">
                    <span>${this.buddy.name} - Buddy Info</span>
                    <button class="dialog-close">×</button>
                </div>
                <div class="dialog-content">
                    <div style="text-align: center; margin-bottom: 12px;">
                        <div style="font-size: 48px; line-height: 1; border: 2px inset #c0c0c0; width: 52px; height: 52px; display: inline-flex; align-items: center; justify-content: center; background: #f0f0f0; margin: 0 auto;">${this.buddy.avatar || '👤'}</div>
                    </div>
                    <div class="form-group">
                        <label>Screen Name:</label>
                        <div style="font-weight: bold; color: #000080;">${this.buddy.name}</div>
                    </div>
                    <div class="form-group">
                        <label>Status:</label>
                        <div>${this.buddy.status === 'online' ? 'Online' : 'Offline'}</div>
                    </div>
                    <div class="form-group">
                        <label>Personality:</label>
                        <div>${this.buddy.personalityType || 'Friendly'}</div>
                    </div>
                    <div class="form-group">
                        <label>AI Settings:</label>
                        <div style="font-size: 11px; color: #666;">
                            Chattiness: ${this.buddy.chattiness || 5}/10<br>
                            Intelligence: ${this.buddy.intelligence || 7}/10<br>
                            Empathy: ${this.buddy.empathy || 6}/10
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Friendship Level:</label>
                        <div>${this.getFriendshipLevel(this.buddy.friendshipScore || 0)}</div>
                    </div>
                </div>
                <div class="dialog-buttons">
                    <button class="dialog-btn">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Event listeners
        dialog.querySelector('.dialog-close').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });

        dialog.querySelector('.dialog-btn').addEventListener('click', () => {
            document.body.removeChild(dialog);
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
        return 'Acquaintances';
    }

    showContextMenu(event, messageElement) {
        const menu = document.getElementById('contextMenu');
        menu.style.display = 'block';
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';

        // Handle menu actions
        menu.onclick = (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.handleContextAction(action, messageElement);
                menu.style.display = 'none';
            }
        };
    }

    handleContextAction(action, messageElement) {
        const messageContent = messageElement.querySelector('.message-content').textContent;
        
        switch (action) {
            case 'copy':
                navigator.clipboard.writeText(messageContent);
                break;
            case 'quote':
                const messageInput = document.getElementById('messageInput');
                messageInput.value = `"${messageContent}" `;
                messageInput.focus();
                break;
            case 'save':
                // TODO: Implement save message functionality
                break;
        }
    }

    playSound(soundName) {
        // Map AIM sound names to our sound manager names
        const soundMap = {
            'receive': 'message',
            'send': 'send'
        };
        
        const mappedSound = soundMap[soundName] || soundName;
        if (window.soundManager) {
            window.soundManager.play(mappedSound);
        }
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper dialog
        console.error(message);
        
        // Add system message to chat
        const messagesContainer = document.getElementById('chatMessages');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'system-message';
        errorDiv.style.color = '#ff0000';
        errorDiv.textContent = `Error: ${message}`;
        messagesContainer.appendChild(errorDiv);
        this.scrollToBottom();
    }

    generateId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Cleanup when window closes
    beforeUnload() {
        // Save any unsent message as draft
        const messageInput = document.getElementById('messageInput');
        if (messageInput.value.trim()) {
            localStorage.setItem(`draft_${this.buddyId}`, messageInput.value);
        }
    }
}

// Initialize chat when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatWindow = new ChatWindow();
    
    // Handle window close
    window.addEventListener('beforeunload', () => {
        if (window.chatWindow) {
            window.chatWindow.beforeUnload();
        }
    });
});