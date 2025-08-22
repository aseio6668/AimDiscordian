const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ConversationManager {
    constructor() {
        this.conversations = new Map();
        this.dataDir = path.join(process.cwd(), 'data', 'conversations');
        this.maxHistoryLength = 1000; // Maximum messages to keep in memory
        this.compactThreshold = 500; // When to start compacting
    }

    async initialize(database) {
        this.database = database;
        await fs.ensureDir(this.dataDir);
        console.log('💬 Conversation Manager initialized');
    }

    async initializeBuddyConversation(buddyId) {
        const conversationPath = path.join(this.dataDir, `${buddyId}.json`);
        
        if (!await fs.pathExists(conversationPath)) {
            const conversation = {
                buddyId: buddyId,
                messages: [],
                created: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                messageCount: 0,
                compactedSummary: null
            };
            
            await fs.writeJson(conversationPath, conversation, { spaces: 2 });
        }
        
        // Load into memory
        await this.loadConversation(buddyId);
    }

    async loadConversation(buddyId) {
        try {
            const conversationPath = path.join(this.dataDir, `${buddyId}.json`);
            if (await fs.pathExists(conversationPath)) {
                const conversation = await fs.readJson(conversationPath);
                this.conversations.set(buddyId, conversation);
                return conversation;
            }
        } catch (error) {
            console.warn(`Failed to load conversation for buddy ${buddyId}:`, error.message);
        }
        
        // Create new conversation if not found
        return await this.initializeBuddyConversation(buddyId);
    }

    async addMessage(buddyId, message) {
        let conversation = this.conversations.get(buddyId);
        if (!conversation) {
            conversation = await this.loadConversation(buddyId);
        }

        // Add message to conversation
        conversation.messages.push(message);
        conversation.messageCount++;
        conversation.lastUpdated = new Date().toISOString();

        // Check if we need to compact the conversation
        if (conversation.messages.length > this.compactThreshold) {
            await this.compactConversation(buddyId);
        }

        // Save to file
        await this.saveConversation(buddyId);

        return message;
    }

    async getConversationHistory(buddyId, limit = 50) {
        let conversation = this.conversations.get(buddyId);
        if (!conversation) {
            conversation = await this.loadConversation(buddyId);
        }

        const messages = conversation.messages || [];
        
        // Return the most recent messages
        if (limit && messages.length > limit) {
            return messages.slice(-limit);
        }
        
        return messages;
    }

    async compactConversation(buddyId) {
        console.log(`🗜️ Compacting conversation for buddy ${buddyId}`);
        
        const conversation = this.conversations.get(buddyId);
        if (!conversation || conversation.messages.length < this.compactThreshold) {
            return;
        }

        try {
            // Keep the most recent messages
            const recentMessages = conversation.messages.slice(-200);
            const messagesToCompress = conversation.messages.slice(0, -200);

            // Create a summary of the compressed messages
            const summary = await this.createConversationSummary(messagesToCompress, buddyId);
            
            // Update conversation
            conversation.messages = recentMessages;
            conversation.compactedSummary = {
                summary: summary,
                originalMessageCount: messagesToCompress.length,
                compactedAt: new Date().toISOString()
            };

            // Save the compacted conversation
            await this.saveConversation(buddyId);
            
            console.log(`✅ Compacted ${messagesToCompress.length} messages for buddy ${buddyId}`);
            
        } catch (error) {
            console.error(`Failed to compact conversation for buddy ${buddyId}:`, error);
        }
    }

    async createConversationSummary(messages, buddyId) {
        // Create a summary of key conversation points
        const summary = {
            totalMessages: messages.length,
            timeSpan: {
                start: messages[0]?.timestamp,
                end: messages[messages.length - 1]?.timestamp
            },
            keyTopics: this.extractKeyTopics(messages),
            importantMoments: this.findImportantMoments(messages),
            userPreferences: this.extractUserPreferences(messages),
            emotionalTone: this.analyzeEmotionalTone(messages),
            relationshipMilestones: this.findRelationshipMilestones(messages)
        };

        return summary;
    }

    extractKeyTopics(messages) {
        const topicCounts = {};
        const keywords = {
            'work': ['job', 'work', 'office', 'boss', 'meeting', 'project'],
            'family': ['family', 'mom', 'dad', 'sister', 'brother', 'parent'],
            'hobbies': ['hobby', 'game', 'sport', 'music', 'art', 'read'],
            'food': ['eat', 'food', 'cook', 'restaurant', 'meal', 'hungry'],
            'technology': ['computer', 'phone', 'app', 'internet', 'software'],
            'travel': ['travel', 'trip', 'vacation', 'visit', 'journey'],
            'health': ['health', 'exercise', 'doctor', 'sick', 'medicine'],
            'entertainment': ['movie', 'show', 'book', 'video', 'watch']
        };

        messages.forEach(msg => {
            if (msg.sender === 'user') {
                const content = msg.content.toLowerCase();
                Object.entries(keywords).forEach(([topic, words]) => {
                    if (words.some(word => content.includes(word))) {
                        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
                    }
                });
            }
        });

        // Return top 5 topics
        return Object.entries(topicCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([topic, count]) => ({ topic, mentions: count }));
    }

    findImportantMoments(messages) {
        const moments = [];
        
        messages.forEach((msg, index) => {
            if (msg.sender === 'user') {
                const content = msg.content.toLowerCase();
                
                // Look for emotional moments
                if (content.includes('excited') || content.includes('amazing') || content.includes('wonderful')) {
                    moments.push({
                        type: 'positive_emotion',
                        timestamp: msg.timestamp,
                        content: msg.content.substring(0, 100)
                    });
                }
                
                if (content.includes('sad') || content.includes('upset') || content.includes('worried')) {
                    moments.push({
                        type: 'negative_emotion',
                        timestamp: msg.timestamp,
                        content: msg.content.substring(0, 100)
                    });
                }
                
                // Look for achievements or milestones
                if (content.includes('got') && (content.includes('job') || content.includes('promotion'))) {
                    moments.push({
                        type: 'achievement',
                        timestamp: msg.timestamp,
                        content: msg.content.substring(0, 100)
                    });
                }
                
                // Look for relationship moments
                if (content.includes('friend') || content.includes('relationship') || content.includes('dating')) {
                    moments.push({
                        type: 'relationship',
                        timestamp: msg.timestamp,
                        content: msg.content.substring(0, 100)
                    });
                }
            }
        });

        return moments.slice(0, 10); // Keep top 10 moments
    }

    extractUserPreferences(messages) {
        const preferences = {
            favoriteThings: [],
            dislikes: [],
            interests: []
        };

        messages.forEach(msg => {
            if (msg.sender === 'user') {
                const content = msg.content.toLowerCase();
                
                // Extract likes
                if (content.includes('love') || content.includes('like') || content.includes('enjoy')) {
                    const words = content.split(' ');
                    const loveIndex = words.findIndex(w => ['love', 'like', 'enjoy'].includes(w));
                    if (loveIndex < words.length - 1) {
                        preferences.favoriteThings.push(words.slice(loveIndex + 1, loveIndex + 3).join(' '));
                    }
                }
                
                // Extract dislikes
                if (content.includes('hate') || content.includes('dislike') || content.includes("don't like")) {
                    const words = content.split(' ');
                    const hateIndex = words.findIndex(w => ['hate', 'dislike'].includes(w));
                    if (hateIndex < words.length - 1) {
                        preferences.dislikes.push(words.slice(hateIndex + 1, hateIndex + 3).join(' '));
                    }
                }
            }
        });

        return preferences;
    }

    analyzeEmotionalTone(messages) {
        let positiveCount = 0;
        let negativeCount = 0;
        let neutralCount = 0;

        const positiveWords = ['happy', 'great', 'awesome', 'love', 'excited', 'amazing', 'wonderful', 'fantastic'];
        const negativeWords = ['sad', 'bad', 'terrible', 'hate', 'angry', 'frustrated', 'awful', 'horrible'];

        messages.forEach(msg => {
            if (msg.sender === 'user') {
                const content = msg.content.toLowerCase();
                const hasPositive = positiveWords.some(word => content.includes(word));
                const hasNegative = negativeWords.some(word => content.includes(word));
                
                if (hasPositive && !hasNegative) positiveCount++;
                else if (hasNegative && !hasPositive) negativeCount++;
                else neutralCount++;
            }
        });

        const total = positiveCount + negativeCount + neutralCount;
        return {
            positive: total > 0 ? Math.round((positiveCount / total) * 100) : 0,
            negative: total > 0 ? Math.round((negativeCount / total) * 100) : 0,
            neutral: total > 0 ? Math.round((neutralCount / total) * 100) : 0
        };
    }

    findRelationshipMilestones(messages) {
        const milestones = [];
        
        // First conversation
        if (messages.length > 0) {
            milestones.push({
                type: 'first_conversation',
                timestamp: messages[0].timestamp,
                description: 'First time we chatted'
            });
        }

        // Look for friendship progression
        let friendshipMentions = 0;
        messages.forEach(msg => {
            if (msg.sender === 'user' && msg.content.toLowerCase().includes('friend')) {
                friendshipMentions++;
                if (friendshipMentions === 1) {
                    milestones.push({
                        type: 'friendship_mentioned',
                        timestamp: msg.timestamp,
                        description: 'First time friendship was mentioned'
                    });
                }
            }
        });

        return milestones;
    }

    async saveConversation(buddyId) {
        const conversation = this.conversations.get(buddyId);
        if (!conversation) return;

        const conversationPath = path.join(this.dataDir, `${buddyId}.json`);
        await fs.writeJson(conversationPath, conversation, { spaces: 2 });
    }

    async deleteBuddyConversation(buddyId) {
        // Remove from memory
        this.conversations.delete(buddyId);
        
        // Remove file
        const conversationPath = path.join(this.dataDir, `${buddyId}.json`);
        if (await fs.pathExists(conversationPath)) {
            await fs.remove(conversationPath);
        }
    }

    async getConversationStats(buddyId) {
        const conversation = this.conversations.get(buddyId) || await this.loadConversation(buddyId);
        
        const userMessages = conversation.messages.filter(msg => msg.sender === 'user').length;
        const buddyMessages = conversation.messages.filter(msg => msg.sender === 'buddy').length;
        
        return {
            totalMessages: conversation.messageCount || conversation.messages.length,
            userMessages: userMessages,
            buddyMessages: buddyMessages,
            lastMessage: conversation.messages[conversation.messages.length - 1],
            created: conversation.created,
            lastUpdated: conversation.lastUpdated,
            hasCompactedData: !!conversation.compactedSummary
        };
    }

    async exportConversation(buddyId, format = 'json') {
        const conversation = this.conversations.get(buddyId) || await this.loadConversation(buddyId);
        
        if (format === 'txt') {
            let text = `Conversation with Buddy ${buddyId}\n`;
            text += `Created: ${conversation.created}\n`;
            text += `Last Updated: ${conversation.lastUpdated}\n\n`;
            
            conversation.messages.forEach(msg => {
                const sender = msg.sender === 'user' ? 'You' : 'Buddy';
                const timestamp = new Date(msg.timestamp).toLocaleString();
                text += `[${timestamp}] ${sender}: ${msg.content}\n`;
            });
            
            return text;
        }
        
        return conversation;
    }
}

module.exports = ConversationManager;