import { describe, it, expect, vi, beforeEach } from "vitest";
import { getHomeNudges, updatePersonalization, dismissPersonalizationIntro, getAccount } from "@/app/actions/account";
import { changeHolidayRegion, syncMonthlyHolidays } from "@/app/actions/events";
import { getSmartMission } from "@/app/actions/smart-missions";
import { safeGenerateContent } from "@/lib/ai-utils";
import { personalDirective, getSmartMissionPrompt, getPreparationTipPrompt } from "@/lib/prompts";
import { EMPTY_PERSONALIZATION } from "@/lib/personalization";
import { event } from "@/db/schema";
import { db } from "./helpers/test-db";
import { insertEvent, jsonResponse, setToday } from "./helpers/fixtures";
import { actAs, OTHER_USER_ID } from "./helpers/user";

// The session cookie and sign-out come from Auth.js, which tests don't run
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/auth", () => ({ signOut: vi.fn() }));

const ai = vi.mocked(safeGenerateContent);

// Calendarific, as far as these tests need it: a different holiday list per country
const HOLIDAYS: Record<string, { name: string; md: string }[]> = {
  IN: [{ name: "Diwali", md: "11-08" }, { name: "Republic Day", md: "01-26" }],
  JP: [{ name: "Golden Week", md: "05-03" }],
};
function mockCalendarific() {
  const requested: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const { hostname, searchParams } = new URL(url);
    if (hostname !== "calendarific.com") throw new Error(`Unexpected fetch: ${url}`);
    const country = searchParams.get("country")!;
    const year = searchParams.get("year")!;
    requested.push(country);
    return jsonResponse({
      meta: { code: 200 },
      response: { holidays: (HOLIDAYS[country] ?? []).map(h => ({ name: h.name, description: "", date: { iso: `${year}-${h.md}` } })) },
    });
  }));
  return requested;
}
const specialDays = async () => (await db.select().from(event)).filter(e => e.type === "special_day").map(e => e.title);

beforeEach(() => setToday("2026-09-28"));

describe("personal details for the AI", () => {
  it("invites a new player once, and stops when they answer either way", async () => {
    expect((await getHomeNudges()).personalize).toBe(true);
    await dismissPersonalizationIntro();
    expect((await getHomeNudges()).personalize).toBe(false);

    // Another player still gets their own invitation, and saving the form answers it too
    actAs(OTHER_USER_ID);
    expect((await getHomeNudges()).personalize).toBe(true);
    await updatePersonalization({ interests: "Guitar" });
    expect((await getHomeNudges()).personalize).toBe(false);
  });

  it("saves trimmed, length-capped text per account", async () => {
    const result = await updatePersonalization({ about: "  Backend developer  ", interests: "x".repeat(900), goals: "", avoid: "No gym" });
    expect(result).toMatchObject({ success: true, personal: { about: "Backend developer", goals: "", avoid: "No gym" } });
    expect(result.success && result.personal.interests).toHaveLength(400);

    expect((await getAccount()).personal.about).toBe("Backend developer");
    actAs(OTHER_USER_ID);
    expect((await getAccount()).personal).toEqual(EMPTY_PERSONALIZATION);
  });

  it("adds nothing to a prompt until something is filled in", () => {
    expect(personalDirective(null)).toBe("");
    expect(personalDirective(EMPTY_PERSONALIZATION)).toBe("");
    const base = { level: 1, xp: 0, stats: {}, title: "Novice", habits: [], recentTasks: [], recentNotes: [], missionHistory: [], today: "2026-09-28" };
    expect(getSmartMissionPrompt(base)).not.toContain("WHAT THE USER TOLD US");

    const personal = { ...EMPTY_PERSONALIZATION, interests: "Guitar,\n trekking", avoid: "No gym" };
    const prompt = getSmartMissionPrompt({ ...base, personal });
    expect(prompt).toContain("Interests: Guitar, trekking");
    expect(prompt).toContain("Steer clear of: No gym");
    expect(prompt).not.toContain("About them:");
    expect(getPreparationTipPrompt({ futureTasks: [], history: [], today: "2026-09-28", personal })).toContain("Steer clear of: No gym");
  });

  it("reaches the AI when a quest is written", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([{ q: "Q", a: "A" }])));
    await updatePersonalization({ goals: "Run a 10k by March" });
    ai.mockResolvedValueOnce(JSON.stringify({ title: "Lace Up", description: "Run" }));

    await getSmartMission("2026-09-28");
    expect(String(ai.mock.calls[0][0])).toContain("Working toward: Run a 10k by March");
  });
});

describe("holiday region", () => {
  it("defaults to India, as before", async () => {
    const requested = mockCalendarific();
    await syncMonthlyHolidays("2026-09-01");
    expect(new Set(requested)).toEqual(new Set(["IN"]));
    expect((await getAccount()).holidayRegion).toBe("IN");
    expect(new Set(await specialDays())).toEqual(new Set(["Diwali", "Republic Day"]));
  });

  it("swaps one country's holidays for another's, leaving the player's own special days", async () => {
    mockCalendarific();
    await syncMonthlyHolidays("2026-09-01");
    await insertEvent({ title: "Mum's birthday", date: "2026-11-08", type: "special_day", isApi: true });

    const result = await changeHolidayRegion("JP", "2026-09-28");
    expect(result).toMatchObject({ success: true, region: "JP", removed: 8, added: 4 });
    expect(new Set(await specialDays())).toEqual(new Set(["Golden Week", "Mum's birthday"]));
    expect((await getAccount()).holidayRegion).toBe("JP");

    // The monthly sync now follows the new country
    const requested = mockCalendarific();
    await syncMonthlyHolidays("2026-10-01");
    expect(new Set(requested)).toEqual(new Set(["JP"]));
  });

  it("can be switched off, and refuses a country it doesn't know", async () => {
    const requested = mockCalendarific();
    await syncMonthlyHolidays("2026-09-01");

    expect(await changeHolidayRegion("ZZ", "2026-09-28")).toMatchObject({ success: false });
    expect(await changeHolidayRegion("", "2026-09-28")).toMatchObject({ success: true, region: "", added: 0 });
    expect(await specialDays()).toEqual([]);

    requested.length = 0;
    await syncMonthlyHolidays("2026-10-01");
    expect(requested).toEqual([]);
  });

  it("is each account's own choice", async () => {
    mockCalendarific();
    await changeHolidayRegion("JP", "2026-09-28");
    actAs(OTHER_USER_ID);
    expect((await getAccount()).holidayRegion).toBe("IN");
  });
});
