import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../logger.js';
import { CONFIG } from '../config/constants.js';

export class GeminiService {
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error('Gemini API key is required');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    /**
     * Generate content stream
     */
    async generateContentStream(modelName, conversation, style) {
        const systemInstruction = this._getSystemInstruction(style);

        logger.debug(`Starting stream for model: ${modelName} with style: ${style}`);

        // Get model with system instruction
        const model = this.genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemInstruction
        });

        // Format history (all but the last message)
        const history = this._formatHistory(conversation.slice(0, -1));
        const lastMessage = conversation[conversation.length - 1].text;

        const chat = model.startChat({
            history: history,
            generationConfig: {
                temperature: 0.7,
            },
        });

        return await this._executeWithRetry(async () => {
            const result = await chat.sendMessageStream(lastMessage);
            return result.stream;
        });
    }

    /**
     * Generate content (non-streaming)
     */
    async generateContent(modelName, conversation, style) {
        const systemInstruction = this._getSystemInstruction(style);

        const model = this.genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemInstruction
        });

        const history = this._formatHistory(conversation.slice(0, -1));
        const lastMessage = conversation[conversation.length - 1].text;

        const chat = model.startChat({
            history: history,
            generationConfig: {
                temperature: 0.7,
            },
        });

        const result = await this._executeWithRetry(async () => {
            return await chat.sendMessage(lastMessage);
        });

        return result.response.text();
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

                // Check if retryable (429 or 503/UNAVAILABLE)
                const isOverloaded = error.message && (
                    error.message.includes("overloaded") ||
                    error.message.includes("503") ||
                    error.message.includes("UNAVAILABLE")
                );

                const isRateLimited = error.status === 429 ||
                    (error.message && (error.message.includes("429") || error.message.includes("quota")));

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

                throw error;
            }
        }
    }

    /**
     * Format conversation into history format for startChat
     */
    _formatHistory(history) {
        return history.map(({ role, text }) => ({
            role: role === 'bot' ? 'model' : 'user',
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

export default GeminiService;
