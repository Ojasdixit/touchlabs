// config/ai.config.ts — ALL AI provider settings in ONE place
// Testing: Groq (free) + Hugging Face (free)
// Production: GPT-4o + ElevenLabs (paid)

const isProduction = process.env.NODE_ENV === 'production';

export const AI_CONFIG = {
    // LLM
    llm: {
        baseURL: isProduction
            ? 'https://api.openai.com/v1'
            : 'https://api.groq.com/openai/v1',
        apiKey: isProduction
            ? process.env.OPENAI_API_KEY
            : process.env.GROQ_API_KEY,
        model: isProduction
            ? 'gpt-4o'
            : 'llama-3.3-70b-versatile',
    },

    // STT — Speech to Text
    stt: {
        provider: isProduction ? 'openai-whisper' : 'groq-whisper',
        model: 'whisper-large-v3',
        apiKey: isProduction
            ? process.env.OPENAI_API_KEY
            : process.env.GROQ_API_KEY,
        baseURL: isProduction
            ? 'https://api.openai.com/v1'
            : 'https://api.groq.com/openai/v1',
    },

    // TTS — Text to Speech
    tts: {
        provider: isProduction ? 'elevenlabs' : 'huggingface',
        model: isProduction
            ? 'eleven_turbo_v2_5'
            : 'hexgrad/Kokoro-82M',
        apiKey: isProduction
            ? process.env.ELEVENLABS_API_KEY
            : process.env.HF_TOKEN,
        baseURL: isProduction
            ? 'https://api.elevenlabs.io/v1'
            : 'https://router.huggingface.co/hf-inference/models',
    },
};

export type AIProvider = 'groq' | 'openai';
export type TTSProvider = 'huggingface' | 'elevenlabs';
