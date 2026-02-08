# Vibe Translate

A Chrome extension for context-aware translation powered by GenAI (OpenAI & Gemini).

## Features

- **🤖 Multi-Provider Support**: Choose between OpenAI and Gemini APIs
- **📝 Context-Aware Translation**: Captures surrounding sentences for accurate translation
- **⚙️ Customizable Prompts**: Configure system prompt and user message template
- **🎨 Modern UI**: Dark theme popup with gradient accents and animations
- **📋 Copy to Clipboard**: One-click copy of translation results
- **🔒 Secure Storage**: API keys stored locally in Chrome storage

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the extension folder
5. Click the extension icon in the toolbar to configure settings

## Configuration

| Setting | Description |
|---------|-------------|
| **Provider** | Select OpenAI or Gemini (auto-fills default URL) |
| **Base URL** | API endpoint (customizable for proxies) |
| **Model** | Model name (e.g., `gpt-4`, `gemini-2.0-flash`) |
| **API Token** | Your API key |
| **System Prompt** | Instructions for the AI translator |
| **User Message** | Template with placeholders for context |

### Message Placeholders

| Placeholder | Description |
|-------------|-------------|
| `{{text}}` | The selected text to translate |
| `{{previousSentence}}` | The sentence before the selection |
| `{{nextSentence}}` | The sentence after the selection |

## Usage

1. Select text on any webpage
2. Right-click → **Vibe Translate > Translate**
3. View the translation in the floating popup
4. Click **Copy Translation** to copy to clipboard

## Files

```
vibe-translate/
├── manifest.json       # Extension manifest (V3)
├── background.js       # Service worker (context menu, API calls)
├── content.js          # Content script (text extraction, popup UI)
├── popup/
│   ├── popup.html      # Settings popup
│   ├── popup.css       # Popup styles
│   └── popup.js        # Settings logic
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## API Support

### OpenAI
- Endpoint: `/v1/chat/completions`
- Uses `system` and `user` message roles

### Gemini
- Endpoint: `/v1beta/models/{model}:generateContent`
- Uses `systemInstruction` for system prompt

## License

MIT
