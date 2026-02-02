import { GoogleGenAI } from '@google/genai';
import logger from '../logger.js';
import { CONFIG } from '../config/constants.js';

export class GeminiService {
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error('Gemini API key is required');
        }
        this.ai = new GoogleGenAI({ apiKey });
    }

    /**
     * Generate content (non-streaming)
     */
    async generateContent(model, conversation, style) {
        const contents = this._formatConversation(conversation);
        const systemInstruction = this._getSystemInstruction(style);

        const response = await this._executeWithRetry(async () => {
            return await this.ai.models.generateContent({
                model: model,
                contents,
                configs: {
                    temperature: 0.7,
                    systemInstruction: systemInstruction,
                }
            });
        });

        return response.text;
    }

    /**
     * Generate content stream
     */
    async generateContentStream(model, conversation, style) {
        const contents = this._formatConversation(conversation);
        const systemInstruction = this._getSystemInstruction(style);

        logger.debug(`Starting stream for model: ${model}`);

        return await this._executeWithRetry(async () => {
            return await this.ai.models.generateContentStream({
                model: model,
                contents,
                configs: {
                    temperature: 0.7,
                    systemInstruction: systemInstruction,
                }
            });
        });
    }

    /**
     * Execute function with exponential backoff retry logic
     */
    async _executeWithRetry(fn) {
        let attempt = 0;
        const maxRetries = CONFIG.RETRY.MAX_RETRIES;

        while (attempt < maxRetries) {
            try {
                return await fn();
            } catch (error) {
                attempt++;

                // Log failure
                logger.error(`Attempt ${attempt} failed`, {
                    message: error.message,
                    status: error.status
                });

                // Check if retryable
                const isOverloaded = error.message && (
                    error.message.includes("overloaded") ||
                    error.message.includes("503") ||
                    error.message.includes("UNAVAILABLE")
                );

                const isRateLimited = error.status === 429 ||
                    (error.message && error.message.includes("429"));

                if ((isOverloaded || isRateLimited) && attempt < maxRetries) {
                    let delay = attempt * CONFIG.RETRY.BASE_DELAY_MS;

                    // Extract delay from error message if available
                    if (isRateLimited && error.message) {
                        const retryMatch = error.message.match(/retry in (\d+\.?\d*)/i);
                        if (retryMatch) {
                            delay = Math.min(Math.ceil(parseFloat(retryMatch[1]) * 1000), CONFIG.RETRY.MAX_DELAY_MS);
                        }
                    }

                    const errorType = isRateLimited ? 'Rate limited' : 'Model overloaded';
                    logger.warn(`${errorType}. Retrying in ${delay}ms...`);

                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                // If not retryable or max retries reached, throw error
                throw error;
            }
        }
    }

    /**
     * Format conversation for Gemini API
     */
    _formatConversation(conversation) {
        return conversation.map(({ role, text }) => ({
            role: role === 'bot' ? 'model' : role,
            parts: [{ text }]
        }));
    }

    /**
     * Get system instruction based on style
     */
    _getSystemInstruction(style) {
        const styleInstruction = CONFIG.RESPONSE_STYLES[style] || CONFIG.RESPONSE_STYLES.explain;
        return `You are a helpful assistant. ${styleInstruction}`;
    }
}



// Export singleton instance (lazy loading recommended in index.js instead)
// But for compatibility with existing code that imports it, we can keep it if we ensure index.js loads env first.
// The issue is hosting.
// Let's remove the auto-instantiation here and do it in index.js
export default GeminiService;
