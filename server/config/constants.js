export const CONFIG = {
    MODELS: {
        DEFAULT: "gemini-2.5-flash",
        FLASH: "gemini-2.5-flash",
        FLASH_PREVIEW: "gemini-3-flash-preview"
    },
    RESPONSE_STYLES: {
        explain: "Provide clear, step-by-step explanations with examples. Break down complex topics into digestible parts. Use analogies when helpful.",
        deterministic: "Give concise, direct, and consistent answers. Be precise and to the point. Avoid unnecessary elaboration.",
        creative: "Be imaginative and flexible. Use creative language and explore multiple perspectives. Feel free to use metaphors and storytelling."
    },
    RETRY: {
        MAX_RETRIES: 3,
        BASE_DELAY_MS: 2000,
        MAX_DELAY_MS: 30000
    }
};
