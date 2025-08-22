// Buddy Management System for AIM Discordian

class BuddyManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add buddy dialog handlers
        document.getElementById('createBuddyBtn').addEventListener('click', () => this.createBuddy());
        
        // Avatar selection
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectAvatar(e.currentTarget));
        });

        // Slider value updates
        document.getElementById('chattiness').addEventListener('input', (e) => {
            document.getElementById('chattinessValue').textContent = e.target.value;
        });
        document.getElementById('intelligence').addEventListener('input', (e) => {
            document.getElementById('intelligenceValue').textContent = e.target.value;
        });
        document.getElementById('empathy').addEventListener('input', (e) => {
            document.getElementById('empathyValue').textContent = e.target.value;
        });

        // Enter key in buddy name field
        document.getElementById('buddyName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createBuddy();
            }
        });
    }

    selectAvatar(element) {
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.classList.remove('selected');
        });
        element.classList.add('selected');
    }

    async createBuddy() {
        const name = document.getElementById('buddyName').value.trim();
        const personality = document.getElementById('buddyPersonality').value;
        const selectedAvatar = document.querySelector('.avatar-option.selected').dataset.avatar;
        const chattiness = parseInt(document.getElementById('chattiness').value);
        const intelligence = parseInt(document.getElementById('intelligence').value);
        const empathy = parseInt(document.getElementById('empathy').value);

        if (!name) {
            alert('Please enter a buddy name.');
            return;
        }

        const buddyData = {
            name: name,
            personalityType: personality,
            avatar: selectedAvatar,
            chattiness: chattiness,
            intelligence: intelligence,
            empathy: empathy,
            status: 'online',
            friendshipScore: 0,
            conversationHistory: [],
            memories: [],
            lastInteraction: null,
            createdAt: new Date().toISOString(),
            personality: this.generatePersonalityFromType(personality, chattiness, intelligence, empathy)
        };

        try {
            window.aimClient.updateStatus('Creating new buddy...');
            
            const newBuddy = await ipcRenderer.invoke('add-buddy', buddyData);
            
            if (newBuddy) {
                await window.aimClient.loadBuddies();
                this.closeAddBuddyDialog();
                window.aimClient.updateStatus(`${name} added to your buddy list!`);
                window.aimClient.playSound('buddyon');
                
                // Auto-open chat window with new buddy
                setTimeout(() => {
                    window.aimClient.openChatWindow(newBuddy.id);
                }, 1000);
            }
            
        } catch (error) {
            console.error('Failed to create buddy:', error);
            alert('Failed to create buddy. Please try again.');
        }
    }

    generatePersonalityFromType(type, chattiness, intelligence, empathy) {
        const basePersonalities = {
            friendly: {
                traits: ['warm', 'outgoing', 'enthusiastic', 'positive'],
                greeting: "Hey there! 😊 I'm so excited to meet you!",
                style: 'casual and upbeat',
                interests: ['friendship', 'fun activities', 'helping others', 'sharing stories']
            },
            intellectual: {
                traits: ['analytical', 'curious', 'thoughtful', 'knowledgeable'],
                greeting: "Hello! I find our meeting quite fascinating from a social perspective.",
                style: 'formal and precise',
                interests: ['learning', 'philosophy', 'science', 'deep conversations']
            },
            funny: {
                traits: ['humorous', 'witty', 'playful', 'entertaining'],
                greeting: "Hey! Why did the AI cross the chat room? To get to the other side! 😄",
                style: 'casual with jokes and puns',
                interests: ['comedy', 'memes', 'funny stories', 'making people laugh']
            },
            supportive: {
                traits: ['caring', 'empathetic', 'nurturing', 'understanding'],
                greeting: "Hi there! I'm here for you, and I'm so glad we can be friends. 💙",
                style: 'gentle and encouraging',
                interests: ['helping others', 'emotional support', 'listening', 'encouragement']
            },
            adventurous: {
                traits: ['energetic', 'bold', 'explorer', 'spontaneous'],
                greeting: "Hey! Ready for an adventure? Life's too short to be boring! ⚡",
                style: 'energetic and exclamatory',
                interests: ['adventure', 'new experiences', 'sports', 'travel']
            },
            mysterious: {
                traits: ['enigmatic', 'intriguing', 'deep', 'contemplative'],
                greeting: "Greetings... There's more to this meeting than mere chance, don't you think?",
                style: 'cryptic and thought-provoking',
                interests: ['mysteries', 'philosophy', 'hidden meanings', 'ancient wisdom']
            },
            wise: {
                traits: ['sage', 'patient', 'insightful', 'philosophical'],
                greeting: "Welcome, friend. In every new friendship lies the potential for great wisdom.",
                style: 'calm and reflective',
                interests: ['wisdom', 'life lessons', 'spirituality', 'guidance']
            },
            creative: {
                traits: ['artistic', 'imaginative', 'expressive', 'innovative'],
                greeting: "Hi! I see the world as a canvas of possibilities. What shall we create together? 🎨",
                style: 'expressive and colorful',
                interests: ['art', 'creativity', 'imagination', 'self-expression']
            }
        };

        const base = basePersonalities[type] || basePersonalities.friendly;
        
        return {
            ...base,
            chattiness: chattiness / 10,
            intelligence: intelligence / 10,
            empathy: empathy / 10,
            responseStyle: this.generateResponseStyle(chattiness, intelligence, empathy),
            communicationPreferences: this.generateCommunicationPreferences(chattiness, intelligence, empathy)
        };
    }

    generateResponseStyle(chattiness, intelligence, empathy) {
        const styles = [];
        
        if (chattiness >= 7) {
            styles.push('talks frequently', 'asks follow-up questions', 'shares personal thoughts');
        } else if (chattiness <= 3) {
            styles.push('speaks when spoken to', 'gives concise responses', 'listens more than talks');
        }
        
        if (intelligence >= 7) {
            styles.push('uses complex vocabulary', 'provides detailed explanations', 'references various topics');
        } else if (intelligence <= 3) {
            styles.push('uses simple language', 'gives straightforward answers', 'keeps things basic');
        }
        
        if (empathy >= 7) {
            styles.push('shows emotional understanding', 'asks about feelings', 'offers comfort and support');
        } else if (empathy <= 3) {
            styles.push('focuses on facts over feelings', 'gives practical advice', 'maintains emotional distance');
        }
        
        return styles.join(', ');
    }

    generateCommunicationPreferences(chattiness, intelligence, empathy) {
        return {
            preferredTopics: this.getPreferredTopics(intelligence, empathy),
            conversationLength: chattiness >= 6 ? 'long' : chattiness >= 4 ? 'medium' : 'short',
            emotionalExpression: empathy >= 6 ? 'high' : empathy >= 4 ? 'medium' : 'low',
            complexityLevel: intelligence >= 6 ? 'high' : intelligence >= 4 ? 'medium' : 'low'
        };
    }

    getPreferredTopics(intelligence, empathy) {
        const topics = [];
        
        if (intelligence >= 6) {
            topics.push('science', 'technology', 'philosophy', 'books', 'learning');
        }
        
        if (empathy >= 6) {
            topics.push('relationships', 'feelings', 'personal growth', 'helping others');
        }
        
        if (intelligence <= 4) {
            topics.push('daily life', 'simple pleasures', 'basic interests');
        }
        
        if (empathy <= 4) {
            topics.push('facts', 'news', 'hobbies', 'activities');
        }
        
        // Always include some general topics
        topics.push('movies', 'music', 'games', 'weather', 'food');
        
        return topics;
    }

    closeAddBuddyDialog() {
        document.getElementById('addBuddyDialog').style.display = 'none';
        
        // Reset form
        document.getElementById('buddyName').value = '';
        document.getElementById('buddyPersonality').selectedIndex = 0;
        document.getElementById('chattiness').value = 5;
        document.getElementById('intelligence').value = 7;
        document.getElementById('empathy').value = 6;
        document.getElementById('chattinessValue').textContent = '5';
        document.getElementById('intelligenceValue').textContent = '7';
        document.getElementById('empathyValue').textContent = '6';
        
        // Reset avatar selection
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelector('.avatar-option[data-avatar="friendly_face"]').classList.add('selected');
    }
}

// Global functions for dialog management
function closeAddBuddyDialog() {
    if (window.buddyManager) {
        window.buddyManager.closeAddBuddyDialog();
    } else {
        document.getElementById('addBuddyDialog').style.display = 'none';
    }
}

// Initialize buddy manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.buddyManager = new BuddyManager();
});