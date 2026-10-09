// A player's personal details for the AI and their holiday region (server only)
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import {
  DEFAULT_HOLIDAY_REGION, EMPTY_PERSONALIZATION, PERSONAL_FIELDS, PERSONAL_MAX_LENGTH, hasPersonalization,
  type Personalization,
} from "@/lib/personalization";

export type Preferences = {
  personal: Personalization;
  holidayRegion: string;
  // Whether to invite the player to personalise: not answered yet, and nothing filled in
  invite: boolean;
};

const DEFAULTS: Preferences = { personal: EMPTY_PERSONALIZATION, holidayRegion: DEFAULT_HOLIDAY_REGION, invite: false };

export async function preferencesFor(userId: string): Promise<Preferences> {
  try {
    const [row] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
    if (!row) return { ...DEFAULTS, invite: true };
    const personal = Object.fromEntries(PERSONAL_FIELDS.map(field => [field.key, row[field.key] ?? ""])) as Personalization;
    return { personal, holidayRegion: row.holidayRegion, invite: !row.introSeen && !hasPersonalization(personal) };
  } catch (e) {
    // The table arrives with a database update; until it has run, everyone gets the defaults
    console.error("Preferences unavailable:", e);
    return DEFAULTS;
  }
}

// Just the personal details, for the prompts (null when the player has given none)
export async function personalizationFor(userId: string): Promise<Personalization | null> {
  const { personal } = await preferencesFor(userId);
  return hasPersonalization(personal) ? personal : null;
}

async function upsert(userId: string, values: Partial<typeof userPreferences.$inferInsert>) {
  const row = { ...values, updatedAt: new Date() };
  await db.insert(userPreferences).values({ userId, ...row })
    .onConflictDoUpdate({ target: [userPreferences.userId], set: row });
}

export async function savePersonalization(userId: string, input: Partial<Personalization>) {
  const clean = Object.fromEntries(PERSONAL_FIELDS.map(field => {
    const text = String(input[field.key] ?? "").trim().slice(0, PERSONAL_MAX_LENGTH);
    return [field.key, text || null];
  }));
  // Saving the form (even empty) answers the invitation
  await upsert(userId, { ...clean, introSeen: true });
}

export async function dismissIntro(userId: string) {
  await upsert(userId, { introSeen: true });
}

export async function saveHolidayRegion(userId: string, region: string) {
  await upsert(userId, { holidayRegion: region });
}
