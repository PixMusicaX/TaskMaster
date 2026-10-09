// The AI services a player can plug their own key into (safe to import from the client)
export const AI_PROVIDERS = ["gemini", "claude", "groq"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const AI_PROVIDER_INFO: Record<AiProvider, { name: string; defaultModel: string; keyHint: string; keysUrl: string }> = {
  gemini: { name: "Google Gemini", defaultModel: "gemini-flash-latest", keyHint: "AIza…", keysUrl: "https://aistudio.google.com/apikey" },
  claude: { name: "Anthropic Claude", defaultModel: "claude-opus-5-5", keyHint: "sk-ant-…", keysUrl: "https://console.anthropic.com/settings/keys" },
  groq: { name: "Groq", defaultModel: "llama-3.3-70b-versatile", keyHint: "gsk_…", keysUrl: "https://console.groq.com/keys" },
};

export function isAiProvider(value: unknown): value is AiProvider {
  return typeof value === "string" && (AI_PROVIDERS as readonly string[]).includes(value);
}

// What the account page shows: never the keys themselves, only their last four characters
export type AiSettingsView = {
  provider: AiProvider;
  model: string | null;
  keys: Record<AiProvider, string | null>;
};
