const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

// Conversation history to maintain context
let conversationHistory = [];

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  // 1. Add user message to chat box
  appendMessage('user', userMessage);
  input.value = '';

  // Add user message to conversation history
  conversationHistory.push({ role: 'user', text: userMessage });

  // 2. Add temporary "Thinking..." message
  const thinkingMessage = appendMessage('bot', 'Thinking...');

  try {
    // 3. Send full conversation history to /api/chat
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation: conversationHistory
      })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();

    // 4. Update thinking message with bot response
    if (data && data.response) {
      updateMessage(thinkingMessage, data.response);
      // Add bot response to conversation history
      conversationHistory.push({ role: 'bot', text: data.response });
    } else {
      updateMessage(thinkingMessage, 'Sorry, no response received.');
    }
  } catch (error) {
    console.error('Error:', error);
    // 5. Update thinking message with error
    updateMessage(thinkingMessage, 'Failed to get response from server.');
  }
});

/**
 * Appends a message to the chat box
 * @param {string} sender - 'user' or 'bot'
 * @param {string} text - message content
 * @returns {HTMLElement} - the created message element
 */
function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

/**
 * Updates the text content of an existing message element
 * @param {HTMLElement} element - the element to update
 * @param {string} newText - the new text content
 */
function updateMessage(element, newText) {
  element.textContent = newText;
  chatBox.scrollTop = chatBox.scrollHeight;
}

