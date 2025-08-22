const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(process.cwd(), 'data', 'aim_discordian.db');
    }

    async initialize() {
        console.log('🗄️ Initializing Database...');
        
        try {
            // Ensure data directory exists
            await fs.ensureDir(path.dirname(this.dbPath));
            
            // Open/create database
            this.db = new sqlite3.Database(this.dbPath);
            
            // Create tables
            await this.createTables();
            
            console.log('✅ Database initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize database:', error);
            throw error;
        }
    }

    async createTables() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Buddies table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS buddies (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        personality_type TEXT,
                        avatar TEXT,
                        chattiness INTEGER,
                        intelligence INTEGER,
                        empathy INTEGER,
                        status TEXT DEFAULT 'online',
                        friendship_score INTEGER DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        personality_data TEXT,
                        stats_data TEXT
                    )
                `);

                // Messages table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS messages (
                        id TEXT PRIMARY KEY,
                        buddy_id TEXT,
                        content TEXT,
                        sender TEXT,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        message_type TEXT DEFAULT 'text',
                        FOREIGN KEY (buddy_id) REFERENCES buddies (id)
                    )
                `);

                // Memories table (for AI learning)
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS memories (
                        id TEXT PRIMARY KEY,
                        buddy_id TEXT,
                        memory_type TEXT,
                        content TEXT,
                        importance INTEGER DEFAULT 1,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        tags TEXT,
                        FOREIGN KEY (buddy_id) REFERENCES buddies (id)
                    )
                `);

                // User preferences table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS user_preferences (
                        key TEXT PRIMARY KEY,
                        value TEXT,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // Conversation summaries table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS conversation_summaries (
                        id TEXT PRIMARY KEY,
                        buddy_id TEXT,
                        summary_data TEXT,
                        message_count INTEGER,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (buddy_id) REFERENCES buddies (id)
                    )
                `, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    }

    // Buddy operations
    async saveBuddy(buddy) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO buddies 
                (id, name, personality_type, avatar, chattiness, intelligence, empathy, 
                 status, friendship_score, updated_at, personality_data, stats_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([
                buddy.id,
                buddy.name,
                buddy.personalityType,
                buddy.avatar,
                buddy.chattiness,
                buddy.intelligence,
                buddy.empathy,
                buddy.status,
                buddy.friendshipScore,
                new Date().toISOString(),
                JSON.stringify(buddy.personality),
                JSON.stringify(buddy.stats)
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
            
            stmt.finalize();
        });
    }

    async getBuddy(buddyId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM buddies WHERE id = ?',
                [buddyId],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else if (row) {
                        // Reconstruct buddy object
                        const buddy = {
                            id: row.id,
                            name: row.name,
                            personalityType: row.personality_type,
                            avatar: row.avatar,
                            chattiness: row.chattiness,
                            intelligence: row.intelligence,
                            empathy: row.empathy,
                            status: row.status,
                            friendshipScore: row.friendship_score,
                            createdAt: row.created_at,
                            updatedAt: row.updated_at,
                            personality: row.personality_data ? JSON.parse(row.personality_data) : {},
                            stats: row.stats_data ? JSON.parse(row.stats_data) : {}
                        };
                        resolve(buddy);
                    } else {
                        resolve(null);
                    }
                }
            );
        });
    }

    async getAllBuddies() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM buddies ORDER BY updated_at DESC', (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const buddies = rows.map(row => ({
                        id: row.id,
                        name: row.name,
                        personalityType: row.personality_type,
                        avatar: row.avatar,
                        chattiness: row.chattiness,
                        intelligence: row.intelligence,
                        empathy: row.empathy,
                        status: row.status,
                        friendshipScore: row.friendship_score,
                        createdAt: row.created_at,
                        updatedAt: row.updated_at,
                        personality: row.personality_data ? JSON.parse(row.personality_data) : {},
                        stats: row.stats_data ? JSON.parse(row.stats_data) : {}
                    }));
                    resolve(buddies);
                }
            });
        });
    }

    async deleteBuddy(buddyId) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Delete related data first
                this.db.run('DELETE FROM messages WHERE buddy_id = ?', [buddyId]);
                this.db.run('DELETE FROM memories WHERE buddy_id = ?', [buddyId]);
                this.db.run('DELETE FROM conversation_summaries WHERE buddy_id = ?', [buddyId]);
                
                // Delete buddy
                this.db.run('DELETE FROM buddies WHERE id = ?', [buddyId], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.changes);
                    }
                });
            });
        });
    }

    // Message operations
    async saveMessage(message) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO messages (id, buddy_id, content, sender, timestamp, message_type)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([
                message.id,
                message.buddy_id,
                message.content,
                message.sender,
                message.timestamp,
                message.type || 'text'
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
            
            stmt.finalize();
        });
    }

    async getMessages(buddyId, limit = 50) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM messages 
                WHERE buddy_id = ? 
                ORDER BY timestamp DESC 
                LIMIT ?
            `, [buddyId, limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const messages = rows.reverse().map(row => ({
                        id: row.id,
                        content: row.content,
                        sender: row.sender,
                        timestamp: row.timestamp,
                        type: row.message_type
                    }));
                    resolve(messages);
                }
            });
        });
    }

    // Memory operations
    async saveMemory(memory) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO memories (id, buddy_id, memory_type, content, importance, tags)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([
                memory.id,
                memory.buddy_id,
                memory.type,
                JSON.stringify(memory.content),
                memory.importance || 1,
                memory.tags ? memory.tags.join(',') : ''
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
            
            stmt.finalize();
        });
    }

    async getMemories(buddyId, type = null) {
        return new Promise((resolve, reject) => {
            let query = 'SELECT * FROM memories WHERE buddy_id = ?';
            let params = [buddyId];
            
            if (type) {
                query += ' AND memory_type = ?';
                params.push(type);
            }
            
            query += ' ORDER BY importance DESC, created_at DESC';
            
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const memories = rows.map(row => ({
                        id: row.id,
                        type: row.memory_type,
                        content: JSON.parse(row.content),
                        importance: row.importance,
                        createdAt: row.created_at,
                        tags: row.tags ? row.tags.split(',') : []
                    }));
                    resolve(memories);
                }
            });
        });
    }

    // User preferences
    async setPreference(key, value) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO user_preferences (key, value, updated_at)
                VALUES (?, ?, ?)
            `);
            
            stmt.run([key, JSON.stringify(value), new Date().toISOString()], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
            
            stmt.finalize();
        });
    }

    async getPreference(key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT value FROM user_preferences WHERE key = ?', [key], (err, row) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    try {
                        resolve(JSON.parse(row.value));
                    } catch (e) {
                        resolve(row.value);
                    }
                } else {
                    resolve(defaultValue);
                }
            });
        });
    }

    // Database maintenance
    async vacuum() {
        return new Promise((resolve, reject) => {
            this.db.run('VACUUM', (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async getStats() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                const stats = {};
                
                this.db.get('SELECT COUNT(*) as count FROM buddies', (err, row) => {
                    if (!err) stats.totalBuddies = row.count;
                });
                
                this.db.get('SELECT COUNT(*) as count FROM messages', (err, row) => {
                    if (!err) stats.totalMessages = row.count;
                });
                
                this.db.get('SELECT COUNT(*) as count FROM memories', (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        stats.totalMemories = row.count;
                        resolve(stats);
                    }
                });
            });
        });
    }

    async close() {
        if (this.db) {
            return new Promise((resolve) => {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                    } else {
                        console.log('🗄️ Database connection closed');
                    }
                    resolve();
                });
            });
        }
    }
}

module.exports = Database;