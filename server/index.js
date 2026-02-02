import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import logger from './logger.js';
// Config must be loaded after dotenv
import { CONFIG } from './config/constants.js';

// Initialize paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root directory (up one level from server/)
dotenv.config({ path: path.join(__dirname, '../.env') });

import { GeminiService } from './services/gemini.service.js';

const app = express();
const port = process.env.PORT || 3000;

// Initialize Service
const geminiService = new GeminiService(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Log all incoming requests
app.use((req, res, next) => {
    logger.http(`${req.method} ${req.path}`);
    next();
});

// Root endpoint serves index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Chat endpoint (non-streaming)
app.post('/api/chat', async (req, res) => {
    try {
        const { conversation, model, responseStyle } = req.body;
        const selectedModel = model || CONFIG.MODELS.DEFAULT;

        if (!Array.isArray(conversation)) {
            return res.status(400).json({ error: "Bad Request", message: "Conversation must be an array" });
        }

        const text = await geminiService.generateContent(selectedModel, conversation, responseStyle);

        return res.status(200).json({ response: text });
    } catch (error) {
        logger.error('Chat API Error', { message: error.message });

        let statusCode = 500;
        let message = 'Internal Server Error';

        if (error.message.includes('429')) {
            statusCode = 429;
            message = 'Rate limit exceeded';
        }

        return res.status(statusCode).json({ error: message, details: error.message });
    }
});

// Streaming chat endpoint
app.post('/api/chat/stream', async (req, res) => {
    try {
        const { conversation, model, responseStyle } = req.body;
        const selectedModel = model || CONFIG.MODELS.DEFAULT;

        if (!Array.isArray(conversation)) {
            return res.status(400).json({ error: "Bad Request", message: "Conversation must be an array" });
        }

        logger.info(`Streaming request: ${conversation.length} messages, model: ${selectedModel}`);

        // Set headers for Server-Sent Events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const stream = await geminiService.generateContentStream(selectedModel, conversation, responseStyle);

        let fullText = '';
        for await (const chunk of stream) {
            const chunkText = chunk.text;
            fullText += chunkText;
            res.write(`data: ${JSON.stringify({ token: chunkText })}\n\n`);
        }

        logger.info(`Stream completed (${fullText.length} chars)`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();

    } catch (error) {
        logger.error('Streaming API Error', { message: error.message });

        let userMessage = 'An error occurred';
        if (error.message.includes('429')) {
            userMessage = 'API rate limit reached. Please wait a moment and try again.';
        } else if (error.message.includes('timeout')) {
            userMessage = 'Request timed out. Please try again.';
        }

        res.write(`data: ${JSON.stringify({ error: userMessage })}\n\n`);
        res.end();
    }
});

app.listen(port, () => {
    const startupMsg = `Server running on http://localhost:${port}`;
    logger.info(startupMsg);
    logger.info(`Log level: ${process.env.LOG_LEVEL || 'info'}`);
    logger.info(`Logs directory: ./logs`);

    console.log(`\n🚀 ${startupMsg}`);
    console.log(`✨ Press Ctrl+C to stop.\n`);
});