# Gemini AI Chatbot

A professional, full-stack AI chatbot application integrating Google's Gemini 2.5 Flash API. Features streaming responses, conversation history, Markdown rendering, and a robust backend with error handling and retries.

## 🚀 Features

- **Real-time Streaming**: Token-by-token streaming responses using Server-Sent Events (SSE).
- **Multi-Model Support**: Switch between Gemini 2.5 Flash and Gemini 3.0 Flash Preview.
- **Response Styles**: customizable personas (Explain, Deterministic, Creative).
- **Robust Error Handling**: Auto-retries with exponential backoff for rate limits (429) and server overloads (503).
- **Conversation Memory**: Persists chat history across sessions using localStorage.
- **Markdown Support**: Renders code blocks, tables, and formatted text.
- **Production Logging**: Comprehensive logging with Winston (daily rotation, error separation).
- **Clean Architecture**: Separation of concerns with Service-Controller pattern.

## 🛠️ Tech Stack

- **Frontend**: Vanilla JS, HTML5, CSS3, Marked.js (Markdown), DOMPurify (Security)
- **Backend**: Node.js, Express.js
- **AI Integration**: Google GenAI Node.js SDK (`@google/genai`)
- **Logging**: Winston, Winston Daily Rotate File

## 📂 Project Structure

```
gemini-chatbot/
├── server/                  # Backend code
│   ├── config/              # Configuration constants
│   ├── services/            # Business logic (Gemini API, Retries)
│   ├── index.js             # Express app entry point
│   └── logger.js            # Logger configuration
├── public/                  # Frontend assets (Static)
│   ├── assets/              # JS and CSS
│   ├── index.html           # Main UI
│   └── logs.html            # Log viewer utility
├── logs/                    # Application logs (runtime)
├── .env                     # Environment variables
└── package.json
```

## ⚡ Getting Started

### Prerequisites

- Node.js (v18+)
- Google Gemini API Key

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

## 🛡️ Error Handling Strategy

- **Rate Limits (429)**: The server automatically pauses and retries based on the `retry-after` header or exponential backoff (up to 30s).
- **Timeouts**: Frontend requests timeout after 60s with a user-friendly message.
- **Network Issues**: Auto-detection of connection failures.

## 📝 License

ISC
