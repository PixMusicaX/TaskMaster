import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { getAiConfig } from "./ai-config";
import { AI_PROVIDER_INFO, type AiProvider } from "./ai-providers";
import { aiRequestKey, guardAiRequest } from "./ai-guard";

// The one way the app talks to an AI: whichever provider the player picked, behind the same call,
// through lib/ai-guard.ts (shared in-flight requests, optional caching, a daily budget and a
// deadline). Every failure that means "no AI right now" is an AiUnavailableError (lib/ai-errors.ts).

// Tried in turn after the player's own model (or the caller's suggestion). Google's "-latest"
// aliases follow each new flash release, so they don't go dead the way pinned versions do: the
// 1.5 and 2.0 models that used to lead this list now answer 404, and burnt the time limit before
// a working model was reached.
const GEMINI_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"];

// Models Google has said it doesn't have (404), skipped from then on in this server process
const missingModels = new Set<string>();

// Claude models that accept the server-side refusal fallback
const CLAUDE_FALLBACK_MODELS = ["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1"];

type GenerateOptions = {
  // Whose provider and key to use; throws AiNotConfiguredError when they have none
  userId: string,
  systemInstruction?: string,
  responseMimeType?: string,
  // A Gemini model to try first (ignored by the other providers)
  model?: string,
  // Higher values make the picks less predictable (the Tavern uses this for variety)
  temperature?: number,
  // Give up (AiTimeoutError) after this long, retries included; see AI_DEFAULT_DEADLINE_MS
  deadlineMs?: number,
  // Hand the same answer to the same request for this long (see lib/ai-guard.ts)
  cacheMs?: number,
};

type ProviderOptions = Omit<GenerateOptions, "userId" | "deadlineMs" | "cacheMs">;
type Config = { provider: AiProvider; model: string | null; apiKey: string };

async function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  });
}

// Models asked for JSON still wrap it in a code fence now and then
function stripFence(text: string) {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

const JSON_ONLY = "Respond with a single JSON object only: no prose, no markdown code fences.";

export async function safeGenerateContent(prompt: string, options: GenerateOptions) {
  const { userId, deadlineMs, cacheMs, ...rest } = options;
  // A player with no key never reaches the budget
  const config = await getAiConfig(userId);
  const key = aiRequestKey(userId, config.provider, config.model, prompt, rest);
  return guardAiRequest({ userId, key, deadlineMs, cacheMs }, signal => generate(config, prompt, rest, signal));
}

function generate(config: Config, prompt: string, options: ProviderOptions, signal: AbortSignal) {
  if (config.provider === "claude") return generateWithClaude(prompt, options, config.apiKey, config.model, signal);
  if (config.provider === "groq") return generateWithGroq(prompt, options, config.apiKey, config.model, signal);
  return generateWithGemini(prompt, options, config.apiKey, config.model, signal);
}

async function generateWithGemini(prompt: string, options: ProviderOptions, apiKey: string, chosenModel: string | null, signal: AbortSignal) {
  const genAI = new GoogleGenerativeAI(apiKey);

  // Try the player's model (or the caller's suggestion) first, then fall back to our list
  const first = chosenModel || options.model;
  const modelsToTry = [...new Set(first ? [first, ...GEMINI_MODELS] : GEMINI_MODELS)].filter(m => !missingModels.has(m));

  let lastError = null;

  for (const modelName of modelsToTry) {
    let retries = 3;
    let waitTime = 1000;

    while (retries > 0) {
      if (signal.aborted) throw signal.reason;
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: options.responseMimeType || options.temperature !== undefined
            ? { responseMimeType: options.responseMimeType, temperature: options.temperature }
            : undefined,
          systemInstruction: options.systemInstruction
        });

        const result = await model.generateContent(prompt, { signal });
        const text = result.response.text();
        if (text) return text;

        throw new Error("Empty response from AI");
      } catch (error: unknown) {
        if (signal.aborted) throw signal.reason;
        lastError = error;

        // Check for 503 (Service Unavailable) or 429 (Rate Limit)
        const err = error as { status?: number; message?: string };
        if (err.status === 404 || err.message?.includes("[404")) missingModels.add(modelName);
        const isTransient = err.status === 503 || err.status === 429 || err.message?.includes("503") || err.message?.includes("high demand");

        if (isTransient && retries > 1) {
          console.log(`AI Model ${modelName} busy/limited. Retrying in ${waitTime}ms... (${retries-1} left)`);
          await delay(waitTime, signal);
          waitTime *= 2;
          retries--;
          continue;
        }

        // If not transient or no retries left, move to next model
        console.warn(`AI Model ${modelName} failed. Trying next model...`, err.message);
        break;
      }
    }
  }

  throw lastError || new Error("All AI models failed");
}

async function generateWithClaude(prompt: string, options: ProviderOptions, apiKey: string, chosenModel: string | null, signal: AbortSignal) {
  // The SDK retries rate limits and server errors itself
  const client = new Anthropic({ apiKey });
  const model = chosenModel || AI_PROVIDER_INFO.claude.defaultModel;
  const wantsJson = options.responseMimeType === "application/json";
  const system = [options.systemInstruction, wantsJson ? JSON_ONLY : null].filter(Boolean).join("\n\n");
  const withFallback = CLAUDE_FALLBACK_MODELS.includes(model);

  try {
    // Sampling parameters are fixed on current Claude models, so `temperature` is not sent
    const response = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      ...(system ? { system } : {}),
      output_config: { effort: "low" },
      messages: [{ role: "user", content: prompt }],
      // If the model declines, the API re-runs the request on its default fallback model
      ...(withFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    }, { signal });

    if (response.stop_reason === "refusal") throw new Error("Claude declined this request");
    const text = response.content.flatMap(block => (block.type === "text" ? [block.text] : [])).join("").trim();
    if (!text) throw new Error("Empty response from AI");
    return wantsJson ? stripFence(text) : text;
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    if (error instanceof Anthropic.AuthenticationError) throw new Error("Claude rejected the API key");
    if (error instanceof Anthropic.NotFoundError) throw new Error(`Claude model "${model}" was not found`);
    if (error instanceof Anthropic.RateLimitError) throw new Error("Claude rate limit reached");
    if (error instanceof Anthropic.APIError) throw new Error(`Claude API error ${error.status}: ${error.message}`);
    throw error;
  }
}

// Groq speaks the OpenAI chat-completions format
async function generateWithGroq(prompt: string, options: ProviderOptions, apiKey: string, chosenModel: string | null, signal: AbortSignal) {
  const model = chosenModel || AI_PROVIDER_INFO.groq.defaultModel;
  const wantsJson = options.responseMimeType === "application/json";
  const system = [options.systemInstruction, wantsJson ? JSON_ONLY : null].filter(Boolean).join("\n\n");

  let lastError: unknown = null;
  for (let attempt = 0, waitTime = 1000; attempt < 3; attempt++, waitTime *= 2) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: prompt }],
        ...(options.temperature !== undefined ? { temperature: Math.min(options.temperature, 2) } : {}),
        ...(wantsJson ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (response.ok) {
      const data = await response.json() as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("Empty response from AI");
      return wantsJson ? stripFence(text) : text;
    }

    lastError = new Error(`Groq API error ${response.status}: ${(await response.text()).slice(0, 200)}`);
    if (response.status !== 429 && response.status < 500) break;
    await delay(waitTime, signal);
  }

  throw lastError || new Error("Groq request failed");
}
