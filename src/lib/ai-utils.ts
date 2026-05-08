import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.gemini_key;

const MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-flash-latest"
];

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function safeGenerateContent(prompt: string, options: { 
  systemInstruction?: string,
  responseMimeType?: string,
  model?: string 
} = {}) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing");

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  
  // Try the provided model first, then fall back to our list
  const modelsToTry = options.model ? [options.model, ...MODELS] : MODELS;
  
  let lastError = null;

  for (const modelName of modelsToTry) {
    let retries = 3;
    let waitTime = 1000;

    while (retries > 0) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: options.responseMimeType ? { responseMimeType: options.responseMimeType } : undefined,
          systemInstruction: options.systemInstruction
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text) return text;
        
        throw new Error("Empty response from AI");
      } catch (error: any) {
        lastError = error;
        
        // Check for 503 (Service Unavailable) or 429 (Rate Limit)
        const isTransient = error.status === 503 || error.status === 429 || error.message?.includes("503") || error.message?.includes("high demand");
        
        if (isTransient && retries > 1) {
          console.log(`AI Model ${modelName} busy/limited. Retrying in ${waitTime}ms... (${retries-1} left)`);
          await delay(waitTime);
          waitTime *= 2;
          retries--;
          continue;
        }
        
        // If not transient or no retries left, move to next model
        console.warn(`AI Model ${modelName} failed. Trying next model...`, error.message);
        break; 
      }
    }
  }

  throw lastError || new Error("All AI models failed");
}
