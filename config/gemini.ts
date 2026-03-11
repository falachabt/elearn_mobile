import {
    GoogleGenerativeAI,
    GenerativeModel,
    ChatSession,
    GenerationConfig,
} from "@google/generative-ai";

import { logger } from '@/utils/logger';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
    throw new Error("EXPO_PUBLIC_GEMINI_API_KEY environment variable is not set. Please set it before using the Gemini client.");
}
const genAI: GoogleGenerativeAI = new GoogleGenerativeAI(apiKey);

const model: GenerativeModel = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
});

const generationConfig: GenerationConfig = {
    temperature: 0.7, // Réduit pour plus de cohérence dans les évaluations
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
};

async function run(prompt: string): Promise<string> {
    try {
        const chatSession: ChatSession = model.startChat({
            generationConfig,
            history: [],
        });

        const result = await chatSession.sendMessage(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        logger.error("Error in Gemini API call:", error);
        throw error;
    }
}

export default run;
