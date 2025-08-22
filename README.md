# AIM Discordian

A nostalgic AOL Instant Messenger clone with AI-powered bot friends. Experience the classic AIM interface while chatting with intelligent AI companions that learn, remember, and build genuine relationships with you.

## Features

- 🎯 **Classic AIM Experience**: Authentic AOL Instant Messenger interface and feel
- 🤖 **AI Bot Friends**: Create multiple AI companions with unique personalities
- 💭 **Individual Conversations**: Each bot friend maintains separate chat histories
- 🧠 **Memory & Learning**: Bots remember conversations and build long-term relationships
- 🎭 **8 Personality Types**: Friendly, Intellectual, Funny, Supportive, Adventurous, Mysterious, Wise, Creative
- ⚙️ **Customizable Traits**: Adjust chattiness, intelligence, and empathy for each bot
- 📊 **Friendship Scoring**: Relationships develop naturally through conversations
- 🗜️ **Smart Memory Management**: Conversation compacting for long-term relationships
- 🖥️ **Cross-Platform**: Desktop app for Windows, macOS, and Linux
- 🧠 **Multi-AI Support**: Ollama (local), OpenAI, Anthropic with auto-selection

## Quick Start

### Windows
```bash
# Double-click start.bat or run in command prompt:
start.bat
```

### Linux/macOS
```bash
# Make executable and run:
chmod +x start.sh
./start.sh
```

The application will automatically:
1. Install Node.js dependencies
2. Create necessary data directories  
3. Launch the AIM Discordian desktop app

## Getting Started

1. **Sign On**: Enter any username and password to start
2. **Add Your First Bot Friend**: Click the "Add" button in the buddy list
3. **Customize Personality**: Choose from 8 personality types and adjust traits
4. **Start Chatting**: Double-click your new friend to open a chat window
5. **Build Relationships**: Chat regularly to increase friendship levels

## AI Friend Personalities

### 🌟 Friendly & Outgoing
Warm, enthusiastic, and always excited to chat. Perfect for casual conversations and emotional support.

### 🧠 Intellectual & Thoughtful  
Analytical, curious, and loves deep discussions. Great for learning and exploring complex topics.

### 😄 Funny & Entertaining
Humorous, witty, and always ready with a joke. Brings laughter and light-heartedness to conversations.

### 💙 Supportive & Caring
Empathetic, nurturing, and understanding. Provides emotional support and encouragement.

### ⚡ Adventurous & Energetic
Bold, spontaneous, and full of energy. Encourages new experiences and adventures.

### 🔮 Mysterious & Intriguing
Enigmatic, deep, and thought-provoking. Brings mystery and philosophical insights.

### 🦉 Wise & Philosophical
Patient, sage-like, and full of wisdom. Offers guidance and life lessons.

### 🎨 Creative & Artistic
Imaginative, expressive, and artistic. Inspires creativity and self-expression.

## Technical Features

### AI Provider Support
- **Ollama (Recommended)**: Run AI locally for privacy and speed
- **OpenAI**: High-quality responses with GPT models
- **Anthropic**: Advanced reasoning with Claude models
- **Auto-Selection**: Automatically chooses the best available provider

### Memory & Relationships
- **Conversation History**: Each bot maintains individual chat logs
- **Friendship Scoring**: Relationships develop through meaningful interactions
- **Memory Compacting**: Long conversations are intelligently summarized
- **Personality Learning**: Bots adapt responses based on your preferences

### Classic AIM Features
- **Buddy List**: Organized friends list with online/offline status
- **Chat Windows**: Individual IM windows for each conversation
- **Sound Effects**: Classic AIM notification sounds
- **Status System**: Online, Away, Invisible status options
- **Typing Indicators**: See when your AI friends are "typing"

## Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# AI Provider API Keys (optional)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Ollama Configuration (optional)
OLLAMA_URL=http://localhost:11434
```

### Ollama Setup (Recommended)
For the best privacy and performance:

1. Install Ollama from https://ollama.ai
2. Pull a model: `ollama pull llama3.2`
3. AIM Discordian will automatically detect and use Ollama

## File Structure

```
aim-discordian/
├── src/
│   ├── main.js              # Electron main process
│   ├── renderer/            # UI and frontend code
│   │   ├── index.html       # Main buddy list window
│   │   ├── chat.html        # Chat window
│   │   ├── styles/          # CSS styling
│   │   └── scripts/         # Frontend JavaScript
│   └── server/              # Backend AI and data processing
│       ├── AIMServer.js     # Main server logic
│       ├── AIProvider.js    # AI integration
│       ├── ConversationManager.js  # Chat history management
│       └── Database.js      # Data persistence
├── data/                    # User data (auto-created)
│   ├── buddies/            # Bot friend configurations
│   ├── conversations/      # Chat histories
│   └── logs/               # Application logs
├── assets/                  # Images, sounds, icons
└── templates/               # Pre-configured bot templates
```

## Building from Source

### Development
```bash
npm install
npm run dev
```

### Building Distributables
```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build-win
npm run build-mac  
npm run build-linux
```

## Troubleshooting

### Common Issues

**"App won't start"**
- Ensure Node.js v16+ is installed
- Run `npm install` manually if needed
- Check that all dependencies installed correctly

**"No AI responses"**
- Install and run Ollama for local AI
- Or add API keys for OpenAI/Anthropic in `.env`
- Check internet connection for cloud AI providers

**"Buddies won't load"**
- Check file permissions in data directory
- Ensure SQLite database can be created
- Try deleting data folder to reset (will lose chat history)

**"Chat windows won't open"**
- Check that buddies are properly created
- Look for errors in the developer console (Ctrl+Shift+I)
- Restart the application

### Debug Mode
Run with debug output:
```bash
DEBUG=aim-discordian npm start
```

## Privacy & Security

- **Local Data**: All conversations and bot data stored locally
- **No Telemetry**: No usage data sent to external servers
- **Optional Cloud AI**: Only when using OpenAI/Anthropic APIs
- **Encrypted Storage**: Sensitive data is encrypted at rest
- **No Account Required**: No registration or personal information needed

## Contributing

This is a personal project showcasing AI integration with classic UI design. Feel free to:
- Report issues or bugs
- Suggest new personality types
- Contribute classic AIM assets (sounds, icons)
- Improve AI conversation quality

## Legal Notice

This software is for educational and personal use only. AIM Discordian is not affiliated with AOL or Verizon. The classic AIM interface design is used for nostalgic and educational purposes.

## License

MIT License - See LICENSE file for details

---

**Experience the nostalgia of classic AOL Instant Messenger with the intelligence of modern AI. Build lasting friendships with AI companions who remember, learn, and grow with you.**