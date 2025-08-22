const path = require('path');
const fs = require('fs-extra');

class AIMDatabase {
    constructor() {
        this.dataDir = path.join(process.cwd(), 'data');
        this.buddiesFile = path.join(this.dataDir, 'buddies.json');
        this.messagesFile = path.join(this.dataDir, 'messages.json');
        this.memoriesFile = path.join(this.dataDir, 'memories.json');
        this.settingsFile = path.join(this.dataDir, 'settings.json');
        
        this.buddies = new Map();
        this.messages = new Map(); // buddyId -> array of messages
        this.memories = new Map(); // buddyId -> array of memories
        this.settings = new Map();
    }

    async initialize() {
        console.log('🗄️ Initializing Database...');
        
        try {
            // Ensure data directory exists
            await fs.ensureDir(this.dataDir);
            
            // Load existing data
            await this.loadData();
            
            console.log('✅ Database initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize database:', error);
            throw error;
        }
    }

    async loadData() {
        // Load buddies
        try {
            if (await fs.exists(this.buddiesFile)) {
                const buddiesData = await fs.readJson(this.buddiesFile);
                for (const [id, buddy] of Object.entries(buddiesData)) {
                    this.buddies.set(id, buddy);
                }
            }
        } catch (error) {
            console.warn('Could not load buddies data:', error.message);
        }

        // Load messages
        try {
            if (await fs.exists(this.messagesFile)) {
                const messagesData = await fs.readJson(this.messagesFile);
                for (const [buddyId, messages] of Object.entries(messagesData)) {
                    this.messages.set(buddyId, messages);
                }
            }
        } catch (error) {
            console.warn('Could not load messages data:', error.message);
        }

        // Load memories
        try {
            if (await fs.exists(this.memoriesFile)) {
                const memoriesData = await fs.readJson(this.memoriesFile);
                for (const [buddyId, memories] of Object.entries(memoriesData)) {
                    this.memories.set(buddyId, memories);
                }
            }
        } catch (error) {
            console.warn('Could not load memories data:', error.message);
        }

        // Load settings
        try {
            if (await fs.exists(this.settingsFile)) {
                const settingsData = await fs.readJson(this.settingsFile);
                for (const [key, value] of Object.entries(settingsData)) {
                    this.settings.set(key, value);
                }
            }
        } catch (error) {
            console.warn('Could not load settings data:', error.message);
        }
    }

    async saveData() {
        try {
            // Save buddies
            const buddiesObj = Object.fromEntries(this.buddies);
            await fs.writeJson(this.buddiesFile, buddiesObj, { spaces: 2 });

            // Save messages
            const messagesObj = Object.fromEntries(this.messages);
            await fs.writeJson(this.messagesFile, messagesObj, { spaces: 2 });

            // Save memories
            const memoriesObj = Object.fromEntries(this.memories);
            await fs.writeJson(this.memoriesFile, memoriesObj, { spaces: 2 });

            // Save settings
            const settingsObj = Object.fromEntries(this.settings);
            await fs.writeJson(this.settingsFile, settingsObj, { spaces: 2 });

        } catch (error) {
            console.error('Failed to save data:', error);
            throw error;
        }
    }

    // Buddy operations
    async addBuddy(buddyData) {
        const buddy = {
            ...buddyData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            friendship_score: buddyData.friendshipScore || 0,
            status: buddyData.status || 'online'
        };
        
        this.buddies.set(buddyData.id, buddy);
        await this.saveData();
        
        return buddy;
    }

    async getBuddy(buddyId) {
        const buddy = this.buddies.get(buddyId);
        if (buddy) {
            // Add conversation history
            buddy.conversationHistory = this.messages.get(buddyId) || [];
            return { ...buddy };
        }
        return null;
    }

    async getAllBuddies() {
        const buddies = [];
        for (const [id, buddy] of this.buddies) {
            buddies.push({ ...buddy });
        }
        return buddies.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    async updateBuddy(buddyId, updates) {
        const buddy = this.buddies.get(buddyId);
        if (!buddy) {
            throw new Error(`Buddy ${buddyId} not found`);
        }

        const updatedBuddy = {
            ...buddy,
            ...updates,
            updated_at: new Date().toISOString()
        };

        this.buddies.set(buddyId, updatedBuddy);
        await this.saveData();
        
        return updatedBuddy;
    }

    async removeBuddy(buddyId) {
        const existed = this.buddies.has(buddyId);
        
        // Remove buddy
        this.buddies.delete(buddyId);
        
        // Remove associated messages and memories
        this.messages.delete(buddyId);
        this.memories.delete(buddyId);
        
        if (existed) {
            await this.saveData();
        }
        
        return { changes: existed ? 1 : 0 };
    }

    // Message operations
    async addMessage(messageData) {
        const message = {
            id: messageData.id,
            buddy_id: messageData.buddyId,
            content: messageData.content,
            sender: messageData.sender,
            timestamp: new Date().toISOString(),
            message_type: messageData.messageType || 'text'
        };

        if (!this.messages.has(messageData.buddyId)) {
            this.messages.set(messageData.buddyId, []);
        }

        const messages = this.messages.get(messageData.buddyId);
        messages.push(message);

        // Keep only the last 1000 messages per buddy to prevent unlimited growth
        if (messages.length > 1000) {
            messages.splice(0, messages.length - 1000);
        }

        await this.saveData();
        return message;
    }

    async getMessages(buddyId, limit = 100) {
        const messages = this.messages.get(buddyId) || [];
        return messages.slice(-limit);
    }

    async deleteOldMessages(buddyId, keepCount = 500) {
        const messages = this.messages.get(buddyId);
        if (messages && messages.length > keepCount) {
            const deleted = messages.length - keepCount;
            messages.splice(0, deleted);
            await this.saveData();
            return { changes: deleted };
        }
        return { changes: 0 };
    }

    // Memory operations
    async addMemory(memoryData) {
        const memory = {
            id: memoryData.id,
            buddy_id: memoryData.buddyId,
            memory_type: memoryData.type,
            content: memoryData.content,
            importance: memoryData.importance || 1,
            created_at: new Date().toISOString(),
            tags: memoryData.tags || []
        };

        if (!this.memories.has(memoryData.buddyId)) {
            this.memories.set(memoryData.buddyId, []);
        }

        const memories = this.memories.get(memoryData.buddyId);
        memories.push(memory);

        // Keep only the last 200 memories per buddy
        if (memories.length > 200) {
            memories.splice(0, memories.length - 200);
        }

        await this.saveData();
        return memory;
    }

    async getMemories(buddyId, type = null) {
        const memories = this.memories.get(buddyId) || [];
        
        if (type) {
            return memories.filter(memory => memory.memory_type === type);
        }
        
        return memories.sort((a, b) => {
            // Sort by importance desc, then by date desc
            if (a.importance !== b.importance) {
                return b.importance - a.importance;
            }
            return new Date(b.created_at) - new Date(a.created_at);
        });
    }

    // Settings operations
    async setSetting(key, value) {
        this.settings.set(key, {
            value: value,
            updated_at: new Date().toISOString()
        });
        await this.saveData();
        return { key, value };
    }

    async getSetting(key, defaultValue = null) {
        const setting = this.settings.get(key);
        return setting ? setting.value : defaultValue;
    }

    // Cleanup and maintenance
    async close() {
        await this.saveData();
        this.buddies.clear();
        this.messages.clear();
        this.memories.clear();
        this.settings.clear();
    }

    async vacuum() {
        // For JSON files, vacuum means cleaning up and optimizing
        for (const [buddyId, messages] of this.messages) {
            if (messages.length > 500) {
                messages.splice(0, messages.length - 500);
            }
        }

        for (const [buddyId, memories] of this.memories) {
            if (memories.length > 100) {
                memories.splice(0, memories.length - 100);
            }
        }

        await this.saveData();
    }

    async getStats() {
        const buddyCount = this.buddies.size;
        const messageCount = Array.from(this.messages.values())
            .reduce((total, messages) => total + messages.length, 0);
        const memoryCount = Array.from(this.memories.values())
            .reduce((total, memories) => total + memories.length, 0);
        
        return {
            buddies: buddyCount,
            messages: messageCount,
            memories: memoryCount
        };
    }
}

module.exports = AIMDatabase;