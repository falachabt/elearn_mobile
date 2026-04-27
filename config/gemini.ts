import { logger } from "@/utils/logger";

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const qwenApiKey = process.env.EXPO_PUBLIC_QWEN_API_KEY;

export const GENERIC_GEMINI_ERROR_MESSAGE = "Désolé, je n'ai pas pu traiter votre demande.";

// Gemini models: verified via API 2026-04-27
// 200-capable first (free tier works), then 429-only (work on paid keys)
const GEMINI_MODEL_CANDIDATES = [
    "gemini-2.5-flash",           // 200 ✓
    "gemini-2.5-flash-lite",      // 200 ✓
    "gemini-3.1-flash-lite-preview", // 200 ✓
    "gemini-3-flash-preview",     // 200 ✓
    "gemini-flash-latest",        // 200 ✓
    "gemini-2.5-pro",             // 429 on free / works on paid
    "gemini-3.1-pro-preview",     // 429 on free / works on paid
    "gemini-3-pro-preview",       // 429 on free / works on paid
    "gemini-2.0-flash",           // 429 on free / works on paid
    "gemini-2.0-flash-lite",      // 429 on free / works on paid
] as const;

// Qwen text models: fast → capable → heavyweight
const QWEN_TEXT_MODELS = [
    "qwen3.6-plus",
    "qwen3.5-plus",
    "qwen-plus",
    "qwen-max",
    "qwen3.6-flash",
    "qwen3.5-flash",
    "qwen-flash",
    "qwen-turbo",
] as const;

// Qwen vision models: best quality → speed tradeoff
const QWEN_VISION_MODELS = [
    "qwen-vl-max-latest",
    "qwen3-vl-plus",
    "qwen-vl-plus-latest",
    "qwen3-vl-flash",
    "qwen3.5-omni-plus",
    "qwen3.5-omni-flash",
    "qwen2.5-vl-72b-instruct",
    "qwen2.5-vl-32b-instruct",
] as const;

const QWEN_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

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

export type GeminiRequestPart =
    | { text: string }
    | { inlineData: { mimeType: string; data: string } };

type GeminiRequestContent = {
    parts: GeminiRequestPart[];
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
    console.warn("EXPO_PUBLIC_GEMINI_API_KEY not set. Falling back to Qwen.");
}
if (!qwenApiKey) {
    console.warn("EXPO_PUBLIC_QWEN_API_KEY not set. Qwen fallback disabled.");
}

const generationConfig = {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
};

const extractErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === "object" && error !== null) {
        const msg = Reflect.get(error, "message");
        if (typeof msg === "string" && msg.trim()) return msg;
    }
    return String(error ?? "Unknown error");
};

const isModelUnavailableError = (message: string): boolean => {
    const n = message.toLowerCase();
    return n.includes("404") || n.includes("not found") || n.includes("unsupported") || n.includes("not supported");
};

const shouldTryFallbackModel = (error: GeminiServiceError): boolean =>
    error.code === "quota_exceeded" || error.code === "model_unavailable" || error.code === "empty_response";

const shouldTryQwenFallback = (error: GeminiServiceError): boolean =>
    error.code === "quota_exceeded" || error.code === "invalid_api_key" || error.code === "missing_api_key";

const toGeminiServiceError = (error: unknown): GeminiServiceError => {
    if (error instanceof GeminiServiceError) return error;

    const message = extractErrorMessage(error);
    const n = message.toLowerCase();

    if (!apiKey) {
        return new GeminiServiceError("missing_api_key", message, GENERIC_GEMINI_ERROR_MESSAGE);
    }
    if (n.includes("permission_denied") || n.includes("api key") || n.includes("reported as leaked") || n.includes("invalid api key")) {
        return new GeminiServiceError("invalid_api_key", message, GENERIC_GEMINI_ERROR_MESSAGE);
    }
    if (n.includes("resource_exhausted") || n.includes("quota") || n.includes("429")) {
        return new GeminiServiceError("quota_exceeded", message, GENERIC_GEMINI_ERROR_MESSAGE);
    }
    if (isModelUnavailableError(message)) {
        return new GeminiServiceError("model_unavailable", message, GENERIC_GEMINI_ERROR_MESSAGE);
    }
    return new GeminiServiceError("unknown", message, GENERIC_GEMINI_ERROR_MESSAGE);
};

const extractGeminiText = (data: GeminiResponse): string =>
    data.candidates?.[0]?.content?.parts?.map(p => p.text ?? "").join("").trim() ?? "";

// ── Gemini ──────────────────────────────────────────────────────────────────

const requestGeminiModel = async (modelName: string, contents: GeminiRequestContent[]): Promise<string> => {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents, generationConfig }),
        }
    );

    const data = (await response.json().catch(() => ({}))) as GeminiResponse;

    if (!response.ok) {
        throw new Error(data.error?.message || `Gemini HTTP ${response.status}`);
    }

    const text = extractGeminiText(data);
    if (!text) {
        throw new GeminiServiceError("empty_response", `Empty response from ${modelName}`, GENERIC_GEMINI_ERROR_MESSAGE);
    }
    return text;
};

// ── Qwen ─────────────────────────────────────────────────────────────────────

type OpenAIContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };

const convertPartsToOpenAI = (parts: GeminiRequestPart[]): OpenAIContentPart[] => {
    const result: OpenAIContentPart[] = [];
    for (const part of parts) {
        if ("text" in part) {
            result.push({ type: "text", text: part.text });
        } else if ("inlineData" in part && part.inlineData.mimeType.startsWith("image/")) {
            result.push({
                type: "image_url",
                image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` },
            });
        }
        // PDFs: not supported inline by Qwen — text context in prompt handles it
    }
    return result;
};

const hasImageContent = (contents: GeminiRequestContent[]): boolean =>
    contents.some(c => c.parts.some(p => "inlineData" in p && p.inlineData.mimeType.startsWith("image/")));

const isVisionModel = (modelName: string): boolean =>
    modelName.includes("-vl-") || modelName.includes("-vl-") || modelName.includes("omni") || modelName.includes("qvq");

const requestQwenModel = async (modelName: string, contents: GeminiRequestContent[]): Promise<string> => {
    const useArrayContent = isVisionModel(modelName) || hasImageContent(contents);

    const messages = contents.map(content => {
        if (useArrayContent) {
            return { role: "user" as const, content: convertPartsToOpenAI(content.parts) };
        }
        // Text-only models require plain string content
        const text = content.parts
            .filter((p): p is { text: string } => "text" in p)
            .map(p => p.text)
            .join("\n");
        return { role: "user" as const, content: text };
    });

    const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${qwenApiKey}`,
        },
        body: JSON.stringify({
            model: modelName,
            messages,
            temperature: generationConfig.temperature,
            top_p: generationConfig.topP,
            max_tokens: generationConfig.maxOutputTokens,
        }),
    });

    const data = await response.json().catch(() => ({})) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
    };

    if (!response.ok) {
        throw new Error(data.error?.message || `Qwen HTTP ${response.status}`);
    }

    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
        throw new GeminiServiceError("empty_response", `Empty response from Qwen ${modelName}`, GENERIC_GEMINI_ERROR_MESSAGE);
    }
    return text;
};

const runQwenFallback = async (contents: GeminiRequestContent[]): Promise<string> => {
    if (!qwenApiKey) {
        throw new GeminiServiceError("missing_api_key", "Qwen API key not configured", GENERIC_GEMINI_ERROR_MESSAGE);
    }

    const candidates = hasImageContent(contents) ? QWEN_VISION_MODELS : QWEN_TEXT_MODELS;
    let lastError: unknown = null;

    for (const modelName of candidates) {
        try {
            logger.warn(`[Qwen] trying model: ${modelName}`);
            return await requestQwenModel(modelName, contents);
        } catch (error) {
            lastError = error;
            logger.warn(`[Qwen] ${modelName} failed`, extractErrorMessage(error));
        }
    }

    throw toGeminiServiceError(lastError);
};

// ── Main entry point ──────────────────────────────────────────────────────────

async function run(promptOrParts: string | GeminiRequestPart[]): Promise<string> {
    const contents: GeminiRequestContent[] = [{
        parts: typeof promptOrParts === "string" ? [{ text: promptOrParts }] : promptOrParts,
    }];

    if (apiKey) {
        let lastGeminiError: GeminiServiceError | null = null;

        for (const modelName of GEMINI_MODEL_CANDIDATES) {
            try {
                return await requestGeminiModel(modelName, contents);
            } catch (error) {
                const serviceError = toGeminiServiceError(error);
                lastGeminiError = serviceError;

                if (shouldTryFallbackModel(serviceError)) {
                    logger.warn(`[Gemini] ${modelName} failed (${serviceError.code}), trying next`);
                    continue;
                }

                if (shouldTryQwenFallback(serviceError)) {
                    logger.warn(`[Gemini] ${serviceError.code} — switching to Qwen`);
                    break;
                }

                throw serviceError;
            }
        }

        if (lastGeminiError && shouldTryQwenFallback(lastGeminiError)) {
            logger.warn("[Gemini] all models exhausted, falling back to Qwen");
            return await runQwenFallback(contents);
        }

        if (lastGeminiError) throw lastGeminiError;
    }

    // No Gemini key — use Qwen directly
    logger.warn("[AI] No Gemini key, using Qwen");
    return await runQwenFallback(contents);
}

export default run;
