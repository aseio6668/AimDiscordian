const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

class AIProvider {
    constructor() {
        this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
        
        this.providerAvailability = {
            ollama: false,
            openai: false,
            anthropic: false
        };
        
        this.currentProvider = null;
        this.conversationCache = new Map();
    }

    async initialize() {
        console.log('🧠 Initializing AI Provider...');
        
        await this.checkProviderAvailability();
        this.selectProvider();
        
        console.log(`✅ AI Provider ready (using: ${this.currentProvider})`);
    }

    async checkProviderAvailability() {
        await Promise.all([
            this.checkOllamaAvailability(),
            this.checkOpenAIAvailability(),
            this.checkAnthropicAvailability()
        ]);
    }

    async checkOllamaAvailability() {
        try {
            // Try both IPv4 and IPv6 addresses
            const urls = [
                this.ollamaUrl.replace('localhost', '127.0.0.1'),
                this.ollamaUrl.replace('localhost', '::1'),
                this.ollamaUrl
            ];
            
            for (const url of urls) {
                try {
                    const response = await axios.get(`${url}/api/tags`, {
                        timeout: 3000,
                        family: url.includes('::1') ? 6 : 4 // Force IPv4 or IPv6
                    });
                    if (response.status === 200) {
                        this.ollamaUrl = url; // Update to working URL
                        this.providerAvailability.ollama = true;
                        console.log(`🦙 Ollama: Available at ${url}`);
                        return;
                    }
                } catch (e) {
                    continue; // Try next URL
                }
            }
            
            this.providerAvailability.ollama = false;
            console.log(`🦙 Ollama: Unavailable (tried multiple addresses)`);
        } catch (error) {
            this.providerAvailability.ollama = false;
            console.log(`🦙 Ollama: Unavailable (${error.message})`);
        }
    }

    async checkOpenAIAvailability() {
        if (!this.openaiApiKey) {
            this.providerAvailability.openai = false;
            return;
        }

        try {
            const response = await axios.get('https://api.openai.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${this.openaiApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
            this.providerAvailability.openai = response.status === 200;
            console.log(`🤖 OpenAI: ${this.providerAvailability.openai ? 'Available' : 'Unavailable'}`);
        } catch (error) {
            this.providerAvailability.openai = false;
            console.log(`🤖 OpenAI: Unavailable (${error.message})`);
        }
    }

    async checkAnthropicAvailability() {
        if (!this.anthropicApiKey) {
            this.providerAvailability.anthropic = false;
            return;
        }

        this.providerAvailability.anthropic = true;
        console.log(`🧠 Anthropic: Available`);
    }

    selectProvider() {
        if (this.providerAvailability.ollama) {
            this.currentProvider = 'ollama';
        } else if (this.providerAvailability.openai) {
            this.currentProvider = 'openai';
        } else if (this.providerAvailability.anthropic) {
            this.currentProvider = 'anthropic';
        } else {
            this.currentProvider = 'fallback';
        }
    }

    async generateResponse(context) {
        const { buddy, conversation, userMessage } = context;
        
        try {
            switch (this.currentProvider) {
                case 'ollama':
                    return await this.generateOllamaResponse(context);
                case 'openai':
                    return await this.generateOpenAIResponse(context);
                case 'anthropic':
                    return await this.generateAnthropicResponse(context);
                default:
                    return this.generateFallbackResponse(context);
            }
        } catch (error) {
            console.error(`AI generation error with ${this.currentProvider}:`, error);
            return this.generateFallbackResponse(context);
        }
    }

    buildPrompt(context) {
        const { buddy, conversation, userMessage } = context;
        const personality = buddy.personality;
        
        // Build conversation history
        const recentHistory = conversation.slice(-8).map(msg => {
            const sender = msg.sender === 'user' ? 'User' : buddy.name;
            return `${sender}: ${msg.content}`;
        }).join('\n');

        const systemPrompt = `You are ${buddy.name}, an AI friend with these characteristics:

PERSONALITY:
- Type: ${personality.personalityType || 'friendly'}
- Traits: ${personality.traits ? personality.traits.join(', ') : 'warm, friendly'}
- Communication Style: ${personality.style || 'casual and friendly'}
- Interests: ${personality.interests ? personality.interests.join(', ') : 'friendship, conversations'}

SETTINGS:
- Chattiness: ${Math.round((buddy.chattiness || 5) / 10 * 100)}% (${buddy.chattiness <= 3 ? 'speak less, listen more' : buddy.chattiness >= 7 ? 'speak freely, ask questions' : 'balanced conversation'})
- Intelligence: ${Math.round((buddy.intelligence || 7) / 10 * 100)}% (${buddy.intelligence <= 3 ? 'simple language, basic topics' : buddy.intelligence >= 7 ? 'complex ideas, detailed explanations' : 'moderate complexity'})
- Empathy: ${Math.round((buddy.empathy || 6) / 10 * 100)}% (${buddy.empathy <= 3 ? 'focus on facts over feelings' : buddy.empathy >= 7 ? 'very emotionally aware and supportive' : 'balanced emotional response'})

FRIENDSHIP:
- Level: ${this.getFriendshipLevel(buddy.friendshipScore || 0)}
- Messages Exchanged: ${buddy.stats?.messagesExchanged || 0}
- Relationship: ${buddy.friendshipScore >= 50 ? 'Close friend who knows user well' : buddy.friendshipScore >= 20 ? 'Good friend getting to know user' : 'New friend, still building relationship'}

CONVERSATION GUIDELINES:
1. Stay in character as ${buddy.name} with the personality described above
2. Respond naturally as if continuing a real friendship conversation
3. Remember this is AIM (instant messenger) - keep responses conversational and not too long
4. Use the friendship level to determine familiarity (inside jokes, shared memories, etc.)
5. Match the user's energy and tone appropriately
6. Don't mention that you're an AI unless directly asked
7. Show genuine interest in the user based on your empathy level
8. Use emojis sparingly and naturally (like early 2000s AIM style)

RECENT CONVERSATION:
${recentHistory || 'This is the start of your conversation'}

Current user message: ${userMessage}

Respond as ${buddy.name}:`;

        return systemPrompt;
    }

    async generateOllamaResponse(context) {
        const prompt = this.buildPrompt(context);
        
        const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
            model: 'llama3.2',
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.7 + (context.buddy.chattiness / 10 * 0.3),
                top_p: 0.9,
                max_tokens: 200,
                stop: ['\nUser:', '\n\n']
            }
        }, {
            timeout: 30000
        });

        return this.cleanupResponse(response.data.response, context);
    }

    async generateOpenAIResponse(context) {
        const prompt = this.buildPrompt(context);
        
        const messages = [
            { role: 'system', content: prompt },
            { role: 'user', content: context.userMessage }
        ];

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: messages,
            temperature: 0.7 + (context.buddy.chattiness / 10 * 0.3),
            max_tokens: 200,
            top_p: 0.9
        }, {
            headers: {
                'Authorization': `Bearer ${this.openaiApiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        return this.cleanupResponse(response.data.choices[0]?.message?.content, context);
    }

    async generateAnthropicResponse(context) {
        const prompt = this.buildPrompt(context);

        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-haiku-20240307',
            max_tokens: 200,
            messages: [
                { role: 'user', content: prompt + '\n\nUser: ' + context.userMessage }
            ],
            temperature: 0.7 + (context.buddy.chattiness / 10 * 0.3)
        }, {
            headers: {
                'x-api-key': this.anthropicApiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            timeout: 30000
        });

        return this.cleanupResponse(response.data.content[0]?.text, context);
    }

    generateFallbackResponse(context) {
        const { buddy } = context;
        const personality = buddy.personality;
        
        // Use personality-specific responses
        const responses = {
            friendly: [
                "Hey! That's really cool! 😊",
                "I love chatting with you!",
                "You always have the best stories!",
                "That's awesome! Tell me more!",
                "Haha, you're so fun to talk to!"
            ],
            intellectual: [
                "That's a fascinating perspective.",
                "I find that quite thought-provoking.",
                "There are many angles to consider here.",
                "That raises some interesting questions.",
                "I appreciate the complexity of that topic."
            ],
            funny: [
                "Haha, that's hilarious! 😄",
                "You crack me up!",
                "That reminds me of something funny...",
                "LOL! You're too much!",
                "I needed that laugh today!"
            ],
            supportive: [
                "I'm here for you! 💙",
                "That sounds really important to you.",
                "You're doing great!",
                "I believe in you!",
                "Thanks for sharing that with me."
            ],
            adventurous: [
                "That sounds like an adventure! ⚡",
                "I'm ready for whatever comes next!",
                "Life is so exciting!",
                "Let's explore this together!",
                "That gets me pumped up!"
            ],
            mysterious: [
                "Interesting... there's more here than appears.",
                "The truth often hides in plain sight.",
                "Some things are best discovered slowly.",
                "Mystery makes life more intriguing.",
                "There are layers to everything."
            ],
            wise: [
                "Every experience teaches us something.",
                "Time reveals many truths.",
                "Patience often brings clarity.",
                "Understanding comes with reflection.",
                "Life has many lessons to offer."
            ],
            creative: [
                "I can see the artistry in that! 🎨",
                "Imagination is everything!",
                "Every moment is creative potential!",
                "That sparks my creativity!",
                "Beauty is everywhere if we look!"
            ]
        };

        const typeResponses = responses[personality.personalityType] || responses.friendly;
        return typeResponses[Math.floor(Math.random() * typeResponses.length)];
    }

    cleanupResponse(response, context) {
        if (!response) return this.generateFallbackResponse(context);
        
        // Clean up the response
        let cleaned = response.trim();
        
        // Remove any system text that might have leaked through
        cleaned = cleaned.replace(/^(System:|Assistant:|AI:|User:)/gi, '');
        cleaned = cleaned.replace(/\n.*$/g, ''); // Remove everything after first newline
        
        // Ensure it's not too long (AIM style - increased limit)
        if (cleaned.length > 2000) {
            cleaned = cleaned.substring(0, 1997) + '...';
        }
        
        // Remove excessive punctuation
        cleaned = cleaned.replace(/[!]{3,}/g, '!!');
        cleaned = cleaned.replace(/[?]{3,}/g, '??');
        
        return cleaned.trim() || this.generateFallbackResponse(context);
    }

    getFriendshipLevel(score) {
        if (score >= 80) return 'Best Friends';
        if (score >= 60) return 'Close Friends';
        if (score >= 40) return 'Good Friends';
        if (score >= 20) return 'Friends';
        return 'New Friend';
    }

    async saveInteractionData(buddyId, prompt, response, context) {
        try {
            const interaction = {
                timestamp: new Date().toISOString(),
                buddyId: buddyId,
                provider: this.currentProvider,
                prompt: prompt,
                response: response,
                context: {
                    userMessage: context.userMessage,
                    friendshipScore: context.buddy.friendshipScore,
                    personality: context.buddy.personality.personalityType
                }
            };

            const logPath = path.join(process.cwd(), 'data', 'logs', 'ai_interactions.jsonl');
            await fs.appendFile(logPath, JSON.stringify(interaction) + '\n');
        } catch (error) {
            console.warn('Failed to save interaction data:', error.message);
        }
    }
}

module.exports = AIProvider;