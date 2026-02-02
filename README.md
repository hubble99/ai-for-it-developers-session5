# Gemini AI Chatbot

A professional, full-stack AI chatbot application with a premium SaaS-quality UI, integrating Google's Gemini 2.5 Flash API. Features streaming responses, conversation history, Markdown rendering, and a robust backend with error handling and retries.

## ✨ UI Features

- **Premium Design**: Elegant light and dark themes with refined color palettes
- **Collapsible Sidebar**: Clean, text-only sidebar with smooth animations
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
- **Micro-Interactions**: Subtle hover effects and smooth transitions throughout
- **Modern Typography**: Inter font with clear visual hierarchy
- **Persistent Preferences**: Theme and settings saved across sessions

## 🚀 Core Features

- **Real-time Streaming**: Token-by-token streaming responses using Server-Sent Events (SSE)
- **Multi-Model Support**: Switch between Gemini 2.5 Flash and Gemini 3.0 Flash Preview
- **Response Styles**: Customizable personas (Explain, Deterministic, Creative)
- **Robust Error Handling**: Auto-retries with exponential backoff for rate limits (429) and server overloads (503)
- **Conversation Memory**: Persists chat history across sessions using localStorage (last 20 messages sent to API)
- **Markdown Support**: Renders code blocks, tables, lists, and formatted text
- **Production Logging**: Comprehensive logging with Winston (daily rotation, error separation)
- **Clean Architecture**: Separation of concerns with Service-Controller pattern

## 🛠️ Tech Stack

- **Frontend**: Vanilla JS, HTML5, CSS3, Marked.js (Markdown), DOMPurify (Security)
- **Backend**: Node.js, Express.js
- **AI Integration**: Google GenAI Node.js SDK (`@google/genai`)
- **Logging**: Winston, Winston Daily Rotate File
- **Fonts**: Inter (Google Fonts)
- **Icons**: Font Awesome 6

## 📂 Project Structure

```
gemini-chatbot/
├── server/                  # Backend code
│   ├── config/              # Configuration constants
│   ├── services/            # Business logic (Gemini API, Retries)
│   ├── index.js             # Express app entry point
│   └── logger.js            # Logger configuration
├── public/                  # Frontend assets (Static)
│   ├── index.html           # Main UI with sidebar layout
│   ├── style.css            # Premium theme system
│   ├── script.js            # Frontend logic and API integration
│   └── logs.html            # Log viewer utility
├── logs/                    # Application logs (runtime)
├── .env                     # Environment variables
└── package.json
```

## ⚡ Getting Started

### Prerequisites

- Node.js (v18+)
- Google Gemini API Key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd gemini-chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   GEMINI_API_KEY=your_api_key_here
   LOG_LEVEL=info
   ```

4. **Start the Server**
   ```bash
   npm start
   ```

5. **Access the App**
   Open http://localhost:3000 in your browser.

## 🎨 UI Design

### Light Theme
- Soft off-white backgrounds (#f5f6f8, #fafbfc)
- Subtle gray borders (#e8eaed)
- Refined indigo accent (#5046e5)
- Comfortable spacing and shadows

### Dark Theme
- Dark charcoal backgrounds (#0f1117, #1a1d26)
- Comfortable contrast for low eye strain
- Muted violet accent (#7c7cf9)
- Professional appearance

### Layout
- **Sidebar** (280px expanded, 68px collapsed)
  - AI model selection
  - Response style selection
  - View logs link
  - Smooth collapse animation
  
- **Main Content**
  - Header with theme toggle and clear chat
  - Chat area with message history
  - Premium input area with character counter

## 🛡️ Error Handling Strategy

- **Rate Limits (429)**: The server automatically pauses and retries based on the `retry-after` header or exponential backoff (up to 30s)
- **Timeouts**: Frontend requests timeout after 60s with a user-friendly message
- **Network Issues**: Auto-detection of connection failures with clear error messages
- **User-Friendly Messages**: All errors are translated to readable messages (no raw stack traces)

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `GEMINI_API_KEY` | Your Google Gemini API key | Required |
| `LOG_LEVEL` | Logging level (error, warn, info, debug) | `info` |

### Frontend Configuration

Edit `script.js` to customize:
- `MAX_HISTORY_MESSAGES`: Number of messages sent to API (default: 20)
- API timeout duration (default: 60 seconds)

## 📊 Logging

Logs are stored in the `logs/` directory:
- `combined-YYYY-MM-DD.log`: All logs
- `error-YYYY-MM-DD.log`: Error logs only
- Automatic daily rotation
- View logs at http://localhost:3000/logs.html

## 🚀 Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name gemini-chatbot
   ```
3. Configure reverse proxy (nginx/Apache) for HTTPS
4. Set appropriate `LOG_LEVEL` (warn or error)

## 📝 License

ISC

## 🙏 Acknowledgments

- Google Gemini API for AI capabilities
- Marked.js for Markdown rendering
- DOMPurify for XSS protection
- Winston for production-grade logging
- Font Awesome for icons
- Inter font by Rasmus Andersson
