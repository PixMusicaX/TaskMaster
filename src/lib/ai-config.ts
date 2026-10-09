// Each player's AI provider and API keys (server only). Keys are encrypted before they reach the
// database and are only ever decrypted here, on the way to the provider.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userAiSettings } from "@/db/schema";
import { AI_PROVIDERS, isAiProvider, type AiProvider, type AiSettingsView } from "./ai-providers";

// Thrown when a player has not added a key for the provider they picked; callers fall back to
// their offline behaviour
export class AiNotConfiguredError extends Error {
  constructor() {
    super("No AI key set for this account");
    this.name = "AiNotConfiguredError";
  }
}

const KEY_COLUMN = { gemini: "geminiKey", claude: "claudeKey", groq: "groqKey" } as const;

function encryptionKey() {
  const secret = process.env.AI_KEY_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("AI_KEY_SECRET (or AUTH_SECRET) must be set to store API keys");
  return createHash("sha256").update(secret).digest();
}

// AES-256-GCM, stored as "v1.<iv>.<tag>.<ciphertext>"
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), body].map(p => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function decryptSecret(stored: string): string | null {
  try {
    const [version, iv, tag, body] = stored.split(".");
    if (version !== "v1" || !iv || !tag || !body) return null;
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    // Wrong secret or a damaged value: treat the key as missing
    return null;
  }
}

async function settingsRow(userId: string) {
  const [row] = await db.select().from(userAiSettings).where(eq(userAiSettings.userId, userId)).limit(1);
  return row ?? null;
}

// The provider, model and key to generate with for this player
export async function getAiConfig(userId: string): Promise<{ provider: AiProvider; model: string | null; apiKey: string }> {
  const row = await settingsRow(userId);
  const provider = row && isAiProvider(row.provider) ? row.provider : "gemini";
  const stored = row?.[KEY_COLUMN[provider]];
  const apiKey = stored ? decryptSecret(stored) : null;
  if (!apiKey) throw new AiNotConfiguredError();
  return { provider, model: row?.model?.trim() || null, apiKey };
}

export async function hasAiKey(userId: string): Promise<boolean> {
  try {
    await getAiConfig(userId);
    return true;
  } catch {
    return false;
  }
}

export async function getAiSettingsView(userId: string): Promise<AiSettingsView> {
  const row = await settingsRow(userId);
  const keys = Object.fromEntries(AI_PROVIDERS.map(p => {
    const stored = row?.[KEY_COLUMN[p]];
    const plain = stored ? decryptSecret(stored) : null;
    return [p, plain ? plain.slice(-4) : null];
  })) as AiSettingsView["keys"];
  return { provider: row && isAiProvider(row.provider) ? row.provider : "gemini", model: row?.model ?? null, keys };
}

// `apiKey`: a new key for `provider`, "" to remove the saved one, undefined to leave it alone
export async function saveAiSettings(userId: string, input: { provider: AiProvider; model?: string | null; apiKey?: string }) {
  const model = input.model?.trim().slice(0, 100) || null;
  const values: Partial<typeof userAiSettings.$inferInsert> = { provider: input.provider, model, updatedAt: new Date() };
  if (input.apiKey !== undefined) {
    const key = input.apiKey.trim();
    values[KEY_COLUMN[input.provider]] = key ? encryptSecret(key) : null;
  }
  await db.insert(userAiSettings).values({ userId, ...values })
    .onConflictDoUpdate({ target: [userAiSettings.userId], set: values });
}
