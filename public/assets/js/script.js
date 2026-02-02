const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-chat');
const charCounter = document.getElementById('char-counter');
const themeToggle = document.getElementById('theme-toggle');
const modelSelect = document.getElementById('model-select');
const styleSelect = document.getElementById('style-select');



// API URL from environment or default to localhost
const API_URL = 'http://localhost:3000';

// Conversation history limits
const MAX_HISTORY_MESSAGES = 20; // Keep last 20 messages for API context

// User preferences
let selectedModel = 'gemini-2.5-flash';
let selectedStyle = 'explain';

// Conversation history to maintain context
let conversationHistory = [];

// Configure marked for better code rendering
if (typeof marked !== 'undefined') {
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
  });
}

// ===== FRONTEND LOGGING SYSTEM =====
const Logger = {
  levels: {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
  },

  maxLogs: 1000, // Maximum number of logs to keep

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      url: window.location.href
    };

    // Console output with colors
    const colors = {
      ERROR: 'color: #ef4444; font-weight: bold',
      WARN: 'color: #f59e0b; font-weight: bold',
      INFO: 'color: #10b981',
      DEBUG: 'color: #6b7280'
    };

    console.log(
      `%c[${level}] ${timestamp}`,
      colors[level],
      message,
      data || ''
    );

    // Save to localStorage
    this.saveLog(logEntry);
  },

  error(message, data) {
    this.log(this.levels.ERROR, message, data);
  },

  warn(message, data) {
    this.log(this.levels.WARN, message, data);
  },

  info(message, data) {
    this.log(this.levels.INFO, message, data);
  },

  debug(message, data) {
    this.log(this.levels.DEBUG, message, data);
  },

  saveLog(logEntry) {
    try {
      let logs = JSON.parse(localStorage.getItem('appLogs') || '[]');
      logs.push(logEntry);

      // Keep only last N logs
      if (logs.length > this.maxLogs) {
        logs = logs.slice(-this.maxLogs);
      }

      localStorage.setItem('appLogs', JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save log:', e);
    }
  },

  getLogs(level = null, limit = 100) {
    try {
      const logs = JSON.parse(localStorage.getItem('appLogs') || '[]');

      if (level) {
        return logs.filter(log => log.level === level).slice(-limit);
      }

      return logs.slice(-limit);
    } catch (e) {
      console.error('Failed to get logs:', e);
      return [];
    }
  },

  clearLogs() {
    localStorage.removeItem('appLogs');
    this.info('Logs cleared');
  },

  exportLogs() {
    const logs = this.getLogs(null, this.maxLogs);
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatbot-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.info('Logs exported');
  }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  Logger.info('Application initialized');

  loadTheme();
  loadPreferences();
  loadConversation();

  if (conversationHistory.length === 0) {
    showWelcomeMessage();
    Logger.info('Welcome message displayed');
  } else {
    // Update visual indicators for excluded messages
    updateMemoryIndicators();
  }
});

// Theme toggle
themeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  Logger.info(`Theme changed to ${newTheme}`);
});

function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

// Load user preferences
function loadPreferences() {
  const savedModel = localStorage.getItem('selectedModel');
  const savedStyle = localStorage.getItem('selectedStyle');

  if (savedModel) {
    selectedModel = savedModel;
    modelSelect.value = savedModel;
  }

  if (savedStyle) {
    selectedStyle = savedStyle;
    styleSelect.value = savedStyle;
  }

  Logger.info(`Preferences loaded - Model: ${selectedModel}, Style: ${selectedStyle}`);
}

// Save user preferences
function savePreferences() {
  localStorage.setItem('selectedModel', selectedModel);
  localStorage.setItem('selectedStyle', selectedStyle);
}

// Model selection change
modelSelect.addEventListener('change', () => {
  selectedModel = modelSelect.value;
  savePreferences();
  Logger.info(`Model changed to: ${selectedModel}`);
});

// Style selection change
styleSelect.addEventListener('change', () => {
  selectedStyle = styleSelect.value;
  savePreferences();
  Logger.info(`Response style changed to: ${selectedStyle}`);
});

// Character counter
input.addEventListener('input', () => {
  const length = input.value.length;
  charCounter.textContent = `${length}/2000`;

  if (length > 1800) {
    charCounter.style.color = '#ef4444';
  } else {
    charCounter.style.color = 'var(--text-secondary)';
  }
});

// Clear chat functionality
clearBtn.addEventListener('click', () => {
  if (conversationHistory.length === 0) return;

  if (confirm('Are you sure you want to clear the conversation?')) {
    const messageCount = conversationHistory.length;
    conversationHistory = [];
    chatBox.innerHTML = '';
    localStorage.removeItem('conversationHistory');
    showWelcomeMessage();
    Logger.info(`Cleared ${messageCount} messages from conversation`);
  }
});

// Form submission
form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  // Remove welcome message if present
  const welcomeMsg = chatBox.querySelector('.welcome-message');
  if (welcomeMsg) {
    welcomeMsg.remove();
  }

  // 1. Add user message to chat box
  Logger.info(`User sent message: "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}"`);
  appendMessage('user', userMessage);
  input.value = '';
  charCounter.textContent = '0/2000';

  // Add user message to conversation history
  conversationHistory.push({ role: 'user', text: userMessage });
  saveConversation();

  // 2. Disable input and button
  setLoadingState(true);

  // 3. Add streaming bot message
  const botMessage = appendMessage('bot', '', conversationHistory.length);
  botMessage.classList.add('streaming');

  let fullResponse = '';



  try {
    // 4. Trim conversation history for API (keep last N messages)
    const trimmedHistory = trimConversationHistory(conversationHistory);
    const trimmedCount = conversationHistory.length - trimmedHistory.length;

    if (trimmedCount > 0) {
      Logger.info(`Trimmed ${trimmedCount} old messages from API request`);
    }

    // Update visual indicators
    updateMemoryIndicators();

    // 5. Stream response from API with 60-second timeout
    Logger.debug(`Streaming ${trimmedHistory.length} messages to API (${selectedModel}, ${selectedStyle})`);


    const response = await fetchWithTimeout(`${API_URL}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation: trimmedHistory,
        model: selectedModel,
        responseStyle: selectedStyle
      })
    }, 60000); // 60 second timeout



    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          if (data.error) {
            throw new Error(data.error);
          }

          if (data.done) {
            Logger.info(`Stream completed (${fullResponse.length} chars)`);
            break;
          }

          if (data.token) {
            fullResponse += data.token;

            // Update message with markdown rendering
            botMessage.innerHTML = renderMarkdown(fullResponse);
            scrollToBottom();
          }
        }
      }
    }

    // Remove streaming class and finalize
    botMessage.classList.remove('streaming');

    // Add to conversation history
    conversationHistory.push({ role: 'bot', text: fullResponse });
    saveConversation();

  } catch (error) {
    console.error('❌ STREAMING ERROR:', error);
    Logger.error('Streaming failed', { message: error.message, name: error.name });

    botMessage.classList.remove('streaming');

    // Parse error message to provide user-friendly feedback
    let errorMessage = 'Failed to get response.';

    try {
      // Check if it's a rate limit error (429)
      if (error.message.includes('"code": 429') || error.message.includes('quota')) {
        errorMessage = '⏳ API rate limit reached. Please wait a moment and try again.';
      } else if (error.message.includes('timeout') || error.name === 'AbortError') {
        errorMessage = '⏱️ Request timed out. The server took too long to respond. Please try again.';
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = '🔌 Cannot connect to server. Please check your connection and try again.';
      } else if (error.message.includes('404')) {
        errorMessage = '❌ Service not found. Please contact support.';
      } else if (error.message.includes('500') || error.message.includes('503')) {
        errorMessage = '⚠️ Server error. Please try again in a few moments.';
      } else {
        // Generic error
        errorMessage = '❌ Something went wrong. Please try again.';
      }
    } catch (parseError) {
      // If parsing fails, use generic message
      errorMessage = '❌ An unexpected error occurred. Please try again.';
    }

    botMessage.innerHTML = renderMarkdown(errorMessage);

  } finally {
    // Always re-enable input, whether success or error
    setLoadingState(false);
  }
});

// Helper function to add timeout to fetch requests
async function fetchWithTimeout(url, options, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout after 60 seconds');
    }
    throw error;
  }
}

/**
 * Show welcome message with suggested prompts
 */
function showWelcomeMessage() {
  const welcomeDiv = document.createElement('div');
  welcomeDiv.className = 'welcome-message';
  welcomeDiv.innerHTML = `
    <h2>👋 Welcome to Gemini AI Chatbot!</h2>
    <p>I'm here to help you with questions, ideas, and conversations. Try one of these prompts to get started:</p>
    <div class="suggested-prompts">
      <button class="prompt-btn" data-prompt="Explain quantum computing in simple terms">💡 Explain quantum computing in simple terms</button>
      <button class="prompt-btn" data-prompt="Write a creative short story about a time traveler">✍️ Write a creative short story about a time traveler</button>
      <button class="prompt-btn" data-prompt="Help me debug a JavaScript async/await issue">🐛 Help me debug a JavaScript async/await issue</button>
      <button class="prompt-btn" data-prompt="What are the best practices for API design?">🚀 What are the best practices for API design?</button>
    </div>
  `;

  chatBox.appendChild(welcomeDiv);

  // Add click handlers to prompt buttons
  welcomeDiv.querySelectorAll('.prompt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.prompt;
      input.focus();
      form.dispatchEvent(new Event('submit'));
    });
  });
}

/**
 * Appends a message to the chat box
 * @param {string} sender - 'user' or 'bot'
 * @param {string} text - message content
 * @param {number} index - optional index in conversation history
 * @returns {HTMLElement} - the created message element
 */
function appendMessage(sender, text, index = null) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);

  // Store index for memory indicator updates
  if (index !== null) {
    msg.dataset.messageIndex = index;
  }

  // Render markdown for bot messages, plain text for user messages
  if (sender === 'bot') {
    msg.innerHTML = renderMarkdown(text);
  } else {
    msg.textContent = text;
  }
  chatBox.appendChild(msg);
  scrollToBottom();
  return msg;
}

/**
 * Appends an animated thinking message
 * @returns {HTMLElement} - the created message element
 */
function appendThinkingMessage() {
  const msg = document.createElement('div');
  msg.classList.add('message', 'bot', 'thinking');
  msg.innerHTML = `
    <span>Thinking</span>
    <div class="typing-indicator">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
  chatBox.appendChild(msg);
  scrollToBottom();
  return msg;
}

/**
 * Replaces a message element with new content
 * @param {HTMLElement} element - the element to replace
 * @param {string} sender - 'user' or 'bot'
 * @param {string} newText - the new text content
 */
function replaceMessage(element, sender, newText) {
  element.className = `message ${sender}`;

  // Render markdown for bot messages, plain text for user messages
  if (sender === 'bot') {
    element.innerHTML = renderMarkdown(newText);
  } else {
    element.textContent = newText;
  }
  scrollToBottom();
}

/**
 * Scroll chat box to bottom
 */
function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

/**
 * Set loading state for input and button
 * @param {boolean} isLoading - whether app is in loading state
 */
function setLoadingState(isLoading) {
  sendBtn.disabled = isLoading;
  input.disabled = isLoading;

  if (isLoading) {
    sendBtn.querySelector('.btn-text').textContent = 'Sending...';
  } else {
    sendBtn.querySelector('.btn-text').textContent = 'Send';
    input.focus();
  }
}

/**
 * Save conversation to localStorage
 */
function saveConversation() {
  try {
    localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
  } catch (e) {
    console.error('❌ Failed to save conversation:', e);
  }
}

/**
 * Load conversation from localStorage
 */
function loadConversation() {
  try {
    const saved = localStorage.getItem('conversationHistory');


    if (saved) {
      conversationHistory = JSON.parse(saved);


      if (conversationHistory.length > 0) {


        // Restore messages to chat box
        conversationHistory.forEach(({ role, text }, index) => {
          appendMessage(role, text);
        });

        Logger.info(`Loaded ${conversationHistory.length} messages from history`);
      }
    }
  } catch (e) {
    console.error('❌ Failed to load conversation:', e);
    conversationHistory = [];
  }
}

/**
 * Render markdown text to safe HTML
 * @param {string} text - markdown text
 * @returns {string} - sanitized HTML
 */
function renderMarkdown(text) {
  if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
    return text; // Fallback to plain text if libraries not loaded
  }

  try {
    const rawHtml = marked.parse(text);
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'del', 'span'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
    });
  } catch (e) {
    console.error('Markdown rendering error:', e);
    return text;
  }
}

/**
 * Trim conversation history to last N messages
 * @param {Array} history - full conversation history
 * @returns {Array} - trimmed history
 */
function trimConversationHistory(history) {
  if (history.length <= MAX_HISTORY_MESSAGES) {
    return history;
  }

  // Keep only the last MAX_HISTORY_MESSAGES
  return history.slice(-MAX_HISTORY_MESSAGES);
}

/**
 * Update visual indicators for messages excluded from AI memory
 */
function updateMemoryIndicators() {
  const allMessages = chatBox.querySelectorAll('.message');
  const totalMessages = conversationHistory.length;
  const excludedCount = Math.max(0, totalMessages - MAX_HISTORY_MESSAGES);

  allMessages.forEach((msgElement, index) => {
    const messageIndex = parseInt(msgElement.dataset.messageIndex);

    // Remove existing indicator
    const existingIndicator = msgElement.querySelector('.memory-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Add indicator if message is excluded from AI memory
    if (!isNaN(messageIndex) && messageIndex < excludedCount) {
      const indicator = document.createElement('div');
      indicator.className = 'memory-indicator';
      indicator.innerHTML = '🕐 Not in AI memory';
      indicator.title = `This message is not sent to the AI. Only the last ${MAX_HISTORY_MESSAGES} messages are included.`;
      msgElement.appendChild(indicator);
      msgElement.classList.add('excluded-from-memory');
    } else {
      msgElement.classList.remove('excluded-from-memory');
    }
  });
}

