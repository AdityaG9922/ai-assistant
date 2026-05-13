# ⚡ Syntax Surge — Private AI Assistant

A futuristic, cyberpunk-themed personal AI assistant for your desktop.
Inspired by Jarvis, Siri, and Gemini. **For personal use only.**

---

## ✨ Features

| Feature | Details |
|---|---|
| **AI Chat** | General knowledge, study help, code, medical info |
| **Multi-AI Mode** | Queries OpenAI + Claude + Gemini in parallel |
| **Voice Assistant** | Push-to-talk via Ctrl+F5, never always-listening |
| **Search Summarizer** | AI-powered search summarization |
| **Floating Overlay** | Global Ctrl+F5 shortcut, works from any app |
| **TTS** | Reads responses aloud |
| **Zero Cloud Storage** | No accounts, no tracking, no permanent memory |
| **API Key Security** | Keys stored locally, never in source code |

---

## 🛠 Installation

### Prerequisites

- **Node.js** v18+ — [nodejs.org](https://nodejs.org)
- **npm** v9+
- A modern OS: Windows 10/11, macOS 12+, or Ubuntu 20+

### Steps

```bash
# 1. Clone or copy the project folder
cd syntax-surge

# 2. Install all dependencies
npm install

# 3. Copy the environment template
cp .env.example .env

# 4. Run the app
npm start
```

---

## 🔑 Setting Up API Keys

You need **at least one** AI provider key.

### Option A: In-App Settings (Recommended)
1. Launch Syntax Surge
2. Click **Settings** (⚙ icon in sidebar)
3. Paste your API key(s)
4. Click **Save Settings**

Keys are saved to your OS user data folder — never in the source code.

### Option B: `.env` file
Edit the `.env` file you copied from `.env.example`:
```
OPENAI_API_KEY=sk-...
CLAUDE_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
```

### Getting API Keys
| Provider | URL |
|---|---|
| OpenAI | https://platform.openai.com/api-keys |
| Anthropic Claude | https://console.anthropic.com |
| Google Gemini | https://aistudio.google.com/apikey |

---

## 🎮 Usage

### Chat Interface
- Type in the input box, press **Enter** to send
- Use **Shift+Enter** for a newline
- Switch modes: General · Study · Code · Medical

### Voice Assistant
| Trigger | Action |
|---|---|
| `Ctrl+F5` | Open voice overlay from anywhere |
| Click orb or **Speak** | Start listening |
| `Enter` / **Send** | Send recognized text to AI |
| `Esc` | Close overlay |

### Multi-AI Mode
Toggle the **Multi-AI** switch in the chat toolbar to query all configured providers simultaneously. Responses are deduplicated and synthesized into one optimal answer.

### Search Mode
Click the **Search** button or press it in the toolbar to run an AI-powered knowledge search on your query.

---

## 📁 Project Structure

```
syntax-surge/
├── main.js                  # Electron main process
├── package.json
├── .env                     # Your API keys (not in git)
├── .env.example             # Template
├── frontend/
│   ├── index.html           # Main chat UI
│   ├── css/
│   │   ├── main.css         # Layout, glassmorphism, theme
│   │   ├── chat.css         # Messages, markdown
│   │   └── animations.css   # All keyframes
│   └── js/
│       ├── preload.js       # Secure IPC bridge
│       ├── api-client.js    # Calls local backend
│       ├── chat.js          # Chat engine
│       └── ui.js            # UI controller
├── backend/
│   └── server.js            # Express local server
├── ai-routing/
│   ├── router.js            # Multi-AI orchestration
│   ├── synthesizer.js       # Dedup + merge
│   └── adapters/
│       ├── openai.js        # OpenAI adapter
│       ├── claude.js        # Claude adapter
│       └── gemini.js        # Gemini adapter
├── overlay/
│   ├── overlay.html         # Voice popup window
│   ├── overlay.css          # Overlay styles
│   └── overlay.js           # Overlay logic
├── voice/
│   └── voice-processor.js  # STT + TTS (Web Speech API)
├── security/
│   └── sanitizer.js         # Input/output sanitization
└── settings/
    └── settings-manager.js  # Local settings storage
```

---

## 🔐 Security Design

- **No cloud database** — zero data leaves your machine except AI API calls
- **No user accounts** — no login, no profiles
- **No analytics** — zero telemetry
- **Session-only memory** — cleared when app closes
- **API keys secured** — stored in OS user data folder, hidden from frontend
- **Localhost-only backend** — Express server only accepts 127.0.0.1 connections
- **Electron security** — contextIsolation, no nodeIntegration in renderer, CSP headers
- **Input sanitization** — all user text sanitized before API calls

---

## 🖥 Performance Notes

- The app is designed to be lightweight for older laptops
- CSS animations use only `transform` and `opacity` (GPU-friendly, no layout reflow)
- `prefers-reduced-motion` is respected
- Multi-AI mode adds latency — use single mode for speed

---

## 🐛 Troubleshooting

**Voice not working:**
- Electron must have microphone permission (grant in OS security settings)
- Web Speech API requires internet for Google's speech service

**API calls failing:**
- Check your API keys in Settings
- Ensure you have API credits/quota on the provider

**App won't start:**
- Run `npm install` again
- Check Node.js version: `node --version` (need v18+)

**Overlay doesn't open:**
- Some apps capture Ctrl+F5 — try from desktop
- Check if another shortcut is conflicting in OS settings

---

## 📝 License

Private use only. Not for redistribution.
