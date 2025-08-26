const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const AIProvider = require('./AIProvider');
const ConversationManager = require('./ConversationManager');
const AIMDatabase = require('./Database');

class AIMServer {
    constructor() {
        this.buddies = new Map();
        this.conversations = new Map();
        this.aiProvider = new AIProvider();
        this.conversationManager = new ConversationManager();
        this.database = null;
        this.isRunning = false;
        
        this.dataDir = path.join(process.cwd(), 'data');
        this.buddiesDir = path.join(this.dataDir, 'buddies');
        this.conversationsDir = path.join(this.dataDir, 'conversations');
    }

    async initialize() {
        console.log('🚀 Initializing AIM Discordian Server...');
        
        try {
            await this.ensureDirectories();
            
            // Initialize database
            this.database = new AIMDatabase();
            await this.database.initialize();
            
            // Initialize AI provider
            await this.aiProvider.initialize();
            
            // Initialize conversation manager
            await this.conversationManager.initialize(this.database);
            
            // Load existing buddies
            await this.loadBuddies();
            
            this.isRunning = true;
            console.log('✅ AIM Discordian Server initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize AIM Server:', error);
            throw error;
        }
    }

    async ensureDirectories() {
        const dirs = [
            this.dataDir,
            this.buddiesDir,
            this.conversationsDir,
            path.join(this.dataDir, 'logs'),
            path.join(this.dataDir, 'profiles'),
            path.join(this.dataDir, 'memories')
        ];
        
        for (const dir of dirs) {
            await fs.ensureDir(dir);
        }
    }

    async loadBuddies() {
        try {
            const buddyFiles = await fs.readdir(this.buddiesDir);
            
            for (const file of buddyFiles) {
                if (file.endsWith('.json')) {
                    const buddyPath = path.join(this.buddiesDir, file);
                    const buddyData = await fs.readJson(buddyPath);
                    
                    // Set buddy as online (simulated)
                    buddyData.status = 'online';
                    buddyData.lastSeen = new Date().toISOString();
                    
                    this.buddies.set(buddyData.id, buddyData);
                }
            }
            
            console.log(`📋 Loaded ${this.buddies.size} buddies`);
            
        } catch (error) {
            console.warn('⚠️  No existing buddies found or error loading:', error.message);
        }
    }

    async addBuddy(buddyData) {
        const buddy = {
            id: uuidv4(),
            name: buddyData.name,
            personalityType: buddyData.personalityType,
            avatar: buddyData.avatar || 'default',
            chattiness: buddyData.chattiness || 5,
            intelligence: buddyData.intelligence || 7,
            empathy: buddyData.empathy || 6,
            personality: buddyData.personality,
            status: 'online',
            friendshipScore: 0,
            conversationHistory: [],
            memories: [],
            lastInteraction: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            stats: {
                messagesExchanged: 0,
                conversationsStarted: 0,
                totalTimeSpent: 0,
                favoriteTopics: [],
                mood: 'neutral'
            }
        };

        // Save to file
        await this.saveBuddy(buddy);
        
        // Add to memory
        this.buddies.set(buddy.id, buddy);
        
        // Initialize conversation history
        await this.conversationManager.initializeBuddyConversation(buddy.id);
        
        console.log(`✅ Created new buddy: ${buddy.name} (${buddy.id})`);
        return buddy;
    }

    async saveBuddy(buddy) {
        const buddyPath = path.join(this.buddiesDir, `${buddy.id}.json`);
        await fs.writeJson(buddyPath, buddy, { spaces: 2 });
    }

    async getBuddies() {
        return Array.from(this.buddies.values());
    }

    async getBuddy(buddyId) {
        return this.buddies.get(buddyId);
    }

    async removeBuddy(buddyId) {
        const buddy = this.buddies.get(buddyId);
        if (!buddy) {
            throw new Error(`Buddy ${buddyId} not found`);
        }

        // Remove from memory
        this.buddies.delete(buddyId);
        
        // Remove files
        const buddyPath = path.join(this.buddiesDir, `${buddyId}.json`);
        await fs.remove(buddyPath);
        
        // Remove conversation history
        await this.conversationManager.deleteBuddyConversation(buddyId);
        
        console.log(`🗑️ Removed buddy: ${buddy.name} (${buddyId})`);
    }

    async sendMessage(buddyId, message, fromUser = true) {
        const buddy = this.buddies.get(buddyId);
        if (!buddy) {
            throw new Error(`Buddy ${buddyId} not found`);
        }

        try {
            // Add user message to conversation
            if (fromUser) {
                await this.conversationManager.addMessage(buddyId, {
                    id: uuidv4(),
                    content: message,
                    sender: 'user',
                    timestamp: new Date().toISOString(),
                    type: 'text'
                });

                // Update buddy stats
                buddy.stats.messagesExchanged++;
                buddy.lastInteraction = new Date().toISOString();
                await this.saveBuddy(buddy);
            }

            // Generate AI response
            const response = await this.generateBuddyResponse(buddy, message);
            
            if (response) {
                // Add AI response to conversation
                const responseMessage = {
                    id: uuidv4(),
                    content: response,
                    sender: 'buddy',
                    timestamp: new Date().toISOString(),
                    type: 'text'
                };

                await this.conversationManager.addMessage(buddyId, responseMessage);
                
                // Update buddy stats
                buddy.stats.messagesExchanged++;
                buddy.lastInteraction = new Date().toISOString();
                await this.saveBuddy(buddy);

                return responseMessage;
            }
            
        } catch (error) {
            console.error(`Error processing message for buddy ${buddy.name}:`, error);
            throw error;
        }
    }

    async generateBuddyResponse(buddy, userMessage) {
        try {
            // Get conversation history for context
            const history = await this.conversationManager.getConversationHistory(buddy.id, 10);
            
            // Build context for AI
            const context = {
                buddy: {
                    name: buddy.name,
                    personality: buddy.personality,
                    stats: buddy.stats,
                    friendshipScore: buddy.friendshipScore
                },
                conversation: history,
                userMessage: userMessage,
                timestamp: new Date().toISOString()
            };

            // Generate response using AI provider
            const response = await this.aiProvider.generateResponse(context);
            
            // Update friendship score based on interaction
            await this.updateFriendshipScore(buddy, userMessage, response);
            
            // Store memory/learning data
            await this.storeInteractionMemory(buddy, userMessage, response);
            
            return response;
            
        } catch (error) {
            console.error(`Failed to generate response for ${buddy.name}:`, error);
            
            // Fallback responses based on personality
            return this.getFallbackResponse(buddy);
        }
    }

    getFallbackResponse(buddy) {
        const fallbackResponses = {
            friendly: [
                "That's really interesting! Tell me more! 😊",
                "I love talking with you!",
                "You always have such great things to say!",
                "Aww, you're the best! 💙"
            ],
            intellectual: [
                "That raises some fascinating questions.",
                "I find your perspective quite thought-provoking.",
                "There are multiple dimensions to consider here.",
                "That's a complex topic worth exploring further."
            ],
            funny: [
                "Haha, you crack me up! 😄",
                "That reminds me of a joke... but I forgot it! 😅",
                "You know what they say... actually, what DO they say? 🤔",
                "Life's too short to be serious all the time!"
            ],
            supportive: [
                "I'm here for you! 💙",
                "You're doing great, keep it up!",
                "I believe in you!",
                "Thanks for sharing that with me."
            ],
            adventurous: [
                "That sounds like an adventure! ⚡",
                "I'm ready for whatever comes next!",
                "Life is full of exciting possibilities!",
                "Let's explore this together!"
            ],
            mysterious: [
                "Interesting... there's more here than meets the eye.",
                "The deeper we go, the more questions arise.",
                "Some things are better left to the imagination.",
                "Truth often hides in plain sight."
            ],
            wise: [
                "Every experience teaches us something valuable.",
                "Patience often reveals what haste conceals.",
                "True understanding comes with time.",
                "In every ending, there is a new beginning."
            ],
            creative: [
                "I can see the beauty in that! 🎨",
                "Imagination is the key to everything!",
                "Let's paint this conversation with colors!",
                "Every moment is a chance to create something new!"
            ]
        };

        const responses = fallbackResponses[buddy.personalityType] || fallbackResponses.friendly;
        return responses[Math.floor(Math.random() * responses.length)];
    }

    async updateFriendshipScore(buddy, userMessage, response) {
        // Simple friendship scoring algorithm
        let scoreChange = 1; // Base interaction point
        
        // Bonus for longer conversations
        if (userMessage.length > 50) scoreChange += 1;
        
        // Bonus for emotional content
        const emotionalWords = ['love', 'happy', 'sad', 'excited', 'worried', 'grateful', 'angry'];
        if (emotionalWords.some(word => userMessage.toLowerCase().includes(word))) {
            scoreChange += 2;
        }
        
        // Bonus for questions (showing interest)
        if (userMessage.includes('?')) scoreChange += 1;
        
        buddy.friendshipScore = Math.min(100, (buddy.friendshipScore || 0) + scoreChange);
        await this.saveBuddy(buddy);
    }

    async storeInteractionMemory(buddy, userMessage, response) {
        try {
            const memory = {
                id: uuidv4(),
                timestamp: new Date().toISOString(),
                userMessage: userMessage,
                buddyResponse: response,
                mood: this.detectMood(userMessage),
                topics: this.extractTopics(userMessage),
                friendshipScore: buddy.friendshipScore
            };

            const memoryPath = path.join(this.dataDir, 'memories', `${buddy.id}.jsonl`);
            await fs.appendFile(memoryPath, JSON.stringify(memory) + '\n');
            
        } catch (error) {
            console.warn('Failed to store interaction memory:', error.message);
        }
    }

    detectMood(message) {
        const positiveWords = ['happy', 'great', 'awesome', 'love', 'excited', 'amazing', 'wonderful'];
        const negativeWords = ['sad', 'bad', 'terrible', 'hate', 'angry', 'frustrated', 'awful'];
        
        const lowerMessage = message.toLowerCase();
        
        const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
        const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
        
        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }

    extractTopics(message) {
        const topicKeywords = {
            'technology': ['computer', 'phone', 'internet', 'app', 'software', 'ai', 'robot'],
            'entertainment': ['movie', 'music', 'game', 'show', 'book', 'video'],
            'food': ['eat', 'food', 'restaurant', 'cook', 'meal', 'hungry'],
            'work': ['job', 'work', 'boss', 'meeting', 'project', 'office'],
            'relationships': ['friend', 'family', 'love', 'relationship', 'together'],
            'hobbies': ['hobby', 'sport', 'exercise', 'art', 'music', 'read']
        };
        
        const topics = [];
        const lowerMessage = message.toLowerCase();
        
        for (const [topic, keywords] of Object.entries(topicKeywords)) {
            if (keywords.some(keyword => lowerMessage.includes(keyword))) {
                topics.push(topic);
            }
        }
        
        return topics;
    }

    async getConversation(buddyId) {
        return await this.conversationManager.getConversationHistory(buddyId);
    }

    async getBuddySettings(buddyId) {
        const buddy = this.buddies.get(buddyId);
        if (!buddy) {
            throw new Error('Buddy not found');
        }
        return buddy;
    }

    async updateBuddySettings(buddyId, settings) {
        const buddy = this.buddies.get(buddyId);
        if (!buddy) {
            throw new Error('Buddy not found');
        }

        // Update buddy with new settings
        Object.assign(buddy, settings);
        this.buddies.set(buddyId, buddy);

        // Save to file
        const buddyFile = path.join(this.buddiesDir, `${buddyId}.json`);
        await fs.writeJson(buddyFile, buddy, { spaces: 2 });

        console.log(`Updated settings for buddy: ${buddy.name}`);
        return true;
    }

    async shutdown() {
        console.log('🔄 Shutting down AIM Server...');
        
        if (this.database) {
            await this.database.close();
        }
        
        this.isRunning = false;
        console.log('✅ AIM Server shutdown complete');
    }
}

module.exports = AIMServer;