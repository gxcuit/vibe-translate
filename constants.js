// Vibe Translate - Shared Constants
// Single source of truth for default configuration

export const DEFAULTS = {
    SYSTEM_PROMPT: 'You are a professional translator. Translate the following text to Chinese accurately and naturally, preserving the original meaning and tone. Only return the translated text, without any additional explanation or formatting.',
    USER_MESSAGE: 'Translate: {{text}}\n\nContext:\nPrevious sentence: {{previousSentence}}\nNext sentence: {{nextSentence}}',
    PROVIDERS: {
        openai: {
            baseUrl: 'https://api.openai.com',
            model: 'gpt-4'
        },
        gemini: {
            baseUrl: 'https://generativelanguage.googleapis.com',
            model: 'gemini-2.0-flash'
        }
    }
};
