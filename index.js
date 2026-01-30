import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
const port = process.env.PORT || 3000;
const ai = new GoogleGenAI({});

const GEMINI_MODEL = "gemini-3-flash-preview";

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.post('/api/chat', async (req, res) => {
    const conversation = req.body.conversation;

    if (Array.isArray(conversation) == false) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Conversation must be an array of messages",
        });
    }

    const contents = conversation.map(({ role, text }) => ({
        role: role === 'bot' ? 'model' : role,
        parts: [{ text }]
    }));

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const response = await ai.models.generateContent({
                model: GEMINI_MODEL,
                contents,
                configs: {
                    temperature: 0.7,
                    systemInstruction: "You are a helpful assistant.",
                }
            });

            return res.status(200).json({
                response: response.text
            });
        } catch (error) {
            attempt++;
            console.error(`Attempt ${attempt} failed:`, error.message);

            const isOverloaded = error.message && (
                error.message.includes("overloaded") ||
                error.message.includes("503") ||
                error.message.includes("UNAVAILABLE")
            );

            if (isOverloaded && attempt < maxRetries) {
                const delay = attempt * 1000; // Exponential backoff: 1s, 2s
                console.log(`Model overloaded. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // If not an overload error, or max retries reached
            console.error('Final Internal Server Error', error);
            return res.status(500).json({
                error: 'Failed to generate text',
                message: error.message
            });
        }
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});