import { logger } from "@/utils/logger";

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
export const GENERIC_GEMINI_ERROR_MESSAGE = "Désolé, je n'ai pas pu traiter votre demande.";
const MODEL_CANDIDATES = [
    "gemini-2.5-flash",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
] as const;

type GeminiErrorCode =
    | "missing_api_key"
    | "invalid_api_key"
    | "quota_exceeded"
    | "model_unavailable"
    | "empty_response"
    | "unknown";

type GeminiPart = {
    text?: string;
};

type GeminiCandidate = {
    content?: {
        parts?: GeminiPart[];
    };
};

type GeminiResponse = {
    candidates?: GeminiCandidate[];
    error?: {
        code?: number;
        message?: string;
        status?: string;
    };
};

export class GeminiServiceError extends Error {
    code: GeminiErrorCode;
    userMessage: string;

    constructor(code: GeminiErrorCode, message: string, userMessage: string) {
        super(message);
        this.name = "GeminiServiceError";
        this.code = code;
        this.userMessage = userMessage;
    }
}

if (!apiKey) {
    console.warn("EXPO_PUBLIC_GEMINI_API_KEY is not set. Gemini features will be disabled.");
}

const generationConfig = {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
};

const extractErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (typeof error === "object" && error !== null) {
        const maybeMessage = Reflect.get(error, "message");
        if (typeof maybeMessage === "string" && maybeMessage.trim()) {
            return maybeMessage;
        }
    }

    return String(error ?? "Unknown Gemini error");
};

const isModelUnavailableError = (message: string): boolean => {
    const normalized = message.toLowerCase();
    return (
        normalized.includes("404") ||
        normalized.includes("not found") ||
        normalized.includes("unsupported") ||
        normalized.includes("not supported")
    );
};

const shouldTryFallbackModel = (error: GeminiServiceError): boolean => {
    return (
        error.code === "quota_exceeded" ||
        error.code === "model_unavailable" ||
        error.code === "empty_response"
    );
};

const toGeminiServiceError = (error: unknown): GeminiServiceError => {
    if (error instanceof GeminiServiceError) {
        return error;
    }

    const message = extractErrorMessage(error);
    const normalized = message.toLowerCase();

    if (!apiKey) {
        return new GeminiServiceError(
            "missing_api_key",
            message,
            GENERIC_GEMINI_ERROR_MESSAGE
        );
    }

    if (
        normalized.includes("permission_denied") ||
        normalized.includes("api key") ||
        normalized.includes("reported as leaked") ||
        normalized.includes("invalid api key")
    ) {
        return new GeminiServiceError(
            "invalid_api_key",
            message,
            GENERIC_GEMINI_ERROR_MESSAGE
        );
    }

    if (
        normalized.includes("resource_exhausted") ||
        normalized.includes("quota") ||
        normalized.includes("429")
    ) {
        return new GeminiServiceError(
            "quota_exceeded",
            message,
            GENERIC_GEMINI_ERROR_MESSAGE
        );
    }

    if (isModelUnavailableError(message)) {
        return new GeminiServiceError(
            "model_unavailable",
            message,
            GENERIC_GEMINI_ERROR_MESSAGE
        );
    }

    return new GeminiServiceError(
        "unknown",
        message,
        GENERIC_GEMINI_ERROR_MESSAGE
    );
};

const extractTextFromResponse = (data: GeminiResponse): string => {
    const text = data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim();

    return text ?? "";
};

const requestModel = async (modelName: string, prompt: string): Promise<string> => {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: prompt }],
                    },
                ],
                generationConfig,
            }),
        }
    );

    const data = (await response.json().catch(() => ({}))) as GeminiResponse;

    if (!response.ok) {
        throw new Error(data.error?.message || `Gemini request failed with status ${response.status}`);
    }

    const text = extractTextFromResponse(data);
    if (!text) {
        throw new GeminiServiceError(
            "empty_response",
            `Gemini returned an empty response for model ${modelName}`,
            GENERIC_GEMINI_ERROR_MESSAGE
        );
    }

    return text;
};

async function run(prompt: string): Promise<string> {
    if (!apiKey) {
        throw toGeminiServiceError(new Error("Missing Gemini API key"));
    }

    let lastError: unknown = null;

    for (const modelName of MODEL_CANDIDATES) {
        try {
            return await requestModel(modelName, prompt);
        } catch (error) {
            lastError = error;

            const serviceError = toGeminiServiceError(error);
            if (shouldTryFallbackModel(serviceError)) {
                logger.warn(`Gemini model failed, trying fallback model: ${modelName}`, serviceError.code);
                continue;
            }

            logger.error("Error in Gemini API call:", serviceError.message);
            throw serviceError;
        }
    }

    const serviceError = toGeminiServiceError(lastError);
    logger.error("Error in Gemini API call:", serviceError.message);
    throw serviceError;
}

export default run;
