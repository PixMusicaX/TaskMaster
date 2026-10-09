import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { safeGenerateContent } from "@/lib/ai-utils";
import { getProfile, getSeasonTimeline } from "@/app/actions/gamification";
import { addEvent, deleteEvent, getAllEvents, getDashboardTasks, getEventsByDateRange, toggleEventCompletion, updateEvent } from "@/app/actions/events";
import { addHabit, archiveHabit, deleteHabitPermanently, getHabits, getHabitLogs, toggleHabitLog, updateHabit } from "@/app/actions/habits";
import { getNoteByDate, getRecentNotes, saveNote } from "@/app/actions/notes";
import { getHistory, getOnThisDay } from "@/app/actions/history";
import { getSeasonRecap } from "@/app/actions/recap";
import { getSmartMission, getSmartMissionHistory, toggleSmartMission } from "@/app/actions/smart-missions";
import { getPreparationTipHistory, togglePreparationTip } from "@/app/actions/preparation";
import { getReliefHistory, toggleReliefRecommendation } from "@/app/actions/relief";
import { deletePrunedData, generatePruneArchive } from "@/app/actions/prune";
import { askTaskmaster, getTaskmasterRemainingQueries } from "@/app/actions/taskmaster";
import { AiNotConfiguredError, decryptSecret, encryptSecret, getAiConfig, getAiSettingsView, saveAiSettings } from "@/lib/ai-config";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { account, event, habit, habitLog, note, preparationTip, reliefRecommendation, session, smartMission, user, userAiSettings } from "@/db/schema";
import { db } from "./helpers/test-db";
import { insertEvent, insertHabit, insertHabitLog, insertMission, insertNote, insertPrepTip, insertRelief, noteLines, setToday } from "./helpers/fixtures";
import { actAs, OTHER_USER_ID, TEST_USER_ID } from "./helpers/user";

const ai = vi.mocked(safeGenerateContent);

// Everything below is seeded as the first user, then looked at as the second
beforeEach(() => setToday("2026-09-28"));

describe("one account never sees another's planner", () => {
  it("keeps notes, events, habits and AI cards apart", async () => {
    await insertNote("2026-09-27", noteLines("mine"));
    await insertEvent({ title: "My task", date: "2026-09-28" });
    const h = await insertHabit({ name: "My habit" });
    await insertHabitLog(h.id, "2026-09-27", "My habit");
    await insertMission({ date: "2026-09-27", completed: true });
    await insertPrepTip({ date: "2026-09-27" });
    await insertRelief({ date: "2026-09-27" });

    expect((await getProfile("2026-09-28")).xp).toBeGreaterThan(0);

    actAs(OTHER_USER_ID);
    expect(await getNoteByDate("2026-09-27")).toBeUndefined();
    expect(await getRecentNotes()).toEqual([]);
    expect(await getAllEvents()).toEqual([]);
    expect(await getDashboardTasks("2026-09-28")).toEqual([]);
    expect(await getEventsByDateRange(new Date("2026-09-01"), new Date("2026-09-30"))).toEqual([]);
    expect(await getHabits()).toEqual([]);
    expect(await getHabitLogs()).toEqual([]);
    expect(await getSmartMissionHistory("2026-09-01")).toEqual([]);
    expect(await getPreparationTipHistory("2026-09-01")).toEqual([]);
    expect(await getReliefHistory("2026-09-01")).toEqual([]);
    expect(await getHistory("2026-09-28")).toEqual([]);
    expect(await getHistory("2026-09-28", 28, "mine")).toEqual([]);
    expect(await getOnThisDay("2027-09-27")).toEqual([]);
    expect((await getProfile("2026-09-28")).xp).toBe(0);
    expect((await getSeasonTimeline("2026-10-05")).seasons.every(s => s.xp === 0)).toBe(true);
    expect((await getSeasonRecap("2026-10-05")).xp).toBe(0);
  });

  it("lets two accounts keep a note, a quest and a question count on the same day", async () => {
    await saveNote("2026-09-28", noteLines("first"));
    const mineMission = await getSmartMission("2026-09-28");

    actAs(OTHER_USER_ID);
    await saveNote("2026-09-28", noteLines("second"));
    const theirMission = await getSmartMission("2026-09-28");

    expect(theirMission?.id).not.toBe(mineMission?.id);
    expect((await getNoteByDate("2026-09-28"))?.content).toContain("second");
    actAs(TEST_USER_ID);
    expect((await getNoteByDate("2026-09-28"))?.content).toContain("first");
    expect(await db.select().from(note)).toHaveLength(2);
    expect(await db.select().from(smartMission)).toHaveLength(2);
  });

  it("refuses to change another account's rows, even with their ids", async () => {
    const task = await insertEvent({ title: "My task", date: "2026-09-20" });
    const h = await insertHabit({ name: "My habit" });
    const mission = await insertMission({ date: "2026-09-27" });
    const tip = await insertPrepTip({ date: "2026-09-27" });
    const relief = await insertRelief({ date: "2026-09-27" });

    actAs(OTHER_USER_ID);
    expect(await toggleEventCompletion(task.id, true)).toBeNull();
    expect(await updateEvent(task.id, { title: "Hijacked" })).toBeUndefined();
    await deleteEvent(task.id);
    expect(await updateHabit(h.id, { name: "Hijacked" })).toBeUndefined();
    await archiveHabit(h.id);
    await deleteHabitPermanently(h.id);
    expect(await toggleHabitLog(h.id, "2026-09-28", true)).toBeNull();
    await toggleSmartMission(mission.id, true);
    await togglePreparationTip(tip.id, true);
    await toggleReliefRecommendation(relief.id, true);

    expect(await db.select().from(event).where(eq(event.id, task.id))).toMatchObject([{ title: "My task", completed: false }]);
    expect(await db.select().from(habit).where(eq(habit.id, h.id))).toMatchObject([{ name: "My habit", archived: false }]);
    expect(await db.select().from(habitLog)).toEqual([]);
    expect(await db.select().from(smartMission)).toMatchObject([{ completed: false }]);
    expect(await db.select().from(preparationTip)).toMatchObject([{ completed: false }]);
    expect(await db.select().from(reliefRecommendation)).toMatchObject([{ completed: false }]);
  });

  it("ignores an owner or system flag smuggled into an event", async () => {
    const smuggled = { title: "Mine", date: "2026-09-28", type: "task", userId: OTHER_USER_ID, isApi: true };
    const created = await addEvent(smuggled);
    expect(created).toMatchObject({ userId: TEST_USER_ID, isApi: false });

    await updateEvent(created.id, { title: "Still mine", userId: OTHER_USER_ID } as Parameters<typeof updateEvent>[1]);
    expect(await db.select().from(event)).toMatchObject([{ title: "Still mine", userId: TEST_USER_ID }]);
  });

  it("new habits and their logs belong to whoever made them", async () => {
    const mine = await addHabit("Read");
    await toggleHabitLog(mine.id, "2026-09-28", true);
    actAs(OTHER_USER_ID);
    const theirs = await addHabit("Run");
    await toggleHabitLog(theirs.id, "2026-09-28", true);

    expect((await getHabits()).map(h => h.name)).toEqual(["Run"]);
    expect(await getHabitLogs()).toMatchObject([{ habitId: theirs.id, userId: OTHER_USER_ID }]);
  });

  it("prunes only the signed-in account's old records", async () => {
    await insertNote("2019-01-01", "old, mine");
    actAs(OTHER_USER_ID);
    await insertNote("2019-01-02", "old, theirs");

    expect(await generatePruneArchive()).toContain("old  theirs");
    expect(await generatePruneArchive()).not.toContain("mine");
    await deletePrunedData();
    expect(await db.select().from(note)).toMatchObject([{ content: "old, mine", userId: TEST_USER_ID }]);
  });
});

describe("the Taskmaster's queries are fenced in", () => {
  // Everything the AI was ever shown during the question
  const everythingSeen = () => ai.mock.calls.map(call => String(call[0])).join("\n");
  const dataSeen = () => String(ai.mock.calls[1]?.[0] ?? "");
  const ask = async (sql: string) => {
    ai.mockResolvedValueOnce(sql).mockResolvedValueOnce("Answer.");
    return askTaskmaster("Q", "2026-09-28");
  };
  // A query the database refuses is retried once; here the retry tries the same thing
  const askTwice = async (sql: string) => {
    ai.mockResolvedValueOnce(sql).mockResolvedValueOnce(sql);
    return askTaskmaster("Q", "2026-09-28");
  };

  beforeEach(async () => {
    await insertNote("2026-09-01", "first user's secret");
    actAs(OTHER_USER_ID);
    await insertNote("2026-09-02", "second user's note");
  });

  it("sees only the asker's rows", async () => {
    await ask('SELECT content FROM "Note"');
    expect(dataSeen()).toContain("second user's note");
    expect(dataSeen()).not.toContain("secret");
  });

  it.each([
    ['SELECT content FROM public."Note"'],
    ['SELECT content FROM "public"."Note"'],
    ['SELECT * FROM "User"'],
    ['SELECT * FROM "Session"'],
    ['SELECT * FROM "Account"'],
    ['SELECT * FROM "UserAiSettings"'],
    [`SELECT query_to_xml('select content from public."Note"', true, false, '')`],
  ])("cannot reach the real tables with %s", async (sql) => {
    expect((await askTwice(sql)).success).toBe(false);
    expect(everythingSeen()).not.toContain("secret");
    expect(everythingSeen()).not.toContain("second user's note");
  });

  it("cannot change its copies, or anything else", async () => {
    expect((await askTwice('WITH d AS (DELETE FROM "Note" RETURNING *) SELECT count(*)::int FROM d')).success).toBe(false);
    expect(await db.select().from(note)).toHaveLength(2);
  });

  it("counts questions per account", async () => {
    for (let i = 0; i < 3; i++) await ask("SELECT 1 AS one");
    expect(await getTaskmasterRemainingQueries("2026-09-28")).toEqual({ remaining: 0 });
    actAs(TEST_USER_ID);
    expect(await getTaskmasterRemainingQueries("2026-09-28")).toEqual({ remaining: 3 });
  });
});

describe("sign-in tables", () => {
  it("work with the Auth.js adapter, including claiming a pre-made account by email", async () => {
    const adapter = DrizzleAdapter(db, { usersTable: user, accountsTable: account, sessionsTable: session } as never);

    // The migration creates the owner's row before they have ever signed in
    const owner = await adapter.getUserByEmail!("test@example.com");
    expect(owner?.id).toBe(TEST_USER_ID);
    await adapter.linkAccount!({ userId: TEST_USER_ID, type: "oidc", provider: "google", providerAccountId: "g-1" });
    expect((await adapter.getUserByAccount!({ provider: "google", providerAccountId: "g-1" }))?.id).toBe(TEST_USER_ID);

    const created = await adapter.createUser!({ id: "ignored", email: "new@example.com", emailVerified: null, name: "New" });
    expect(created.id).toBeTruthy();

    const expires = new Date(Date.now() + 86_400_000);
    await adapter.createSession!({ sessionToken: "tok-1", userId: TEST_USER_ID, expires });
    const found = await adapter.getSessionAndUser!("tok-1");
    expect(found?.user.id).toBe(TEST_USER_ID);
    // Each session gets its own public id for the account page
    expect((await db.select().from(session))[0].id).toBeTruthy();

    await adapter.deleteSession!("tok-1");
    expect(await adapter.getSessionAndUser!("tok-1")).toBeNull();
  });
});

describe("AI keys", () => {
  beforeEach(() => vi.stubEnv("AUTH_SECRET", "test-secret"));

  it("round-trips through encryption and fails closed on a wrong secret", () => {
    const stored = encryptSecret("sk-live-1234");
    expect(stored).not.toContain("sk-live-1234");
    expect(decryptSecret(stored)).toBe("sk-live-1234");
    vi.stubEnv("AUTH_SECRET", "another-secret");
    expect(decryptSecret(stored)).toBeNull();
    expect(decryptSecret("garbage")).toBeNull();
  });

  it("are stored encrypted, per account and per provider", async () => {
    await expect(getAiConfig(TEST_USER_ID)).rejects.toBeInstanceOf(AiNotConfiguredError);

    await saveAiSettings(TEST_USER_ID, { provider: "gemini", apiKey: "AIza-my-gemini-key" });
    await saveAiSettings(TEST_USER_ID, { provider: "claude", model: " claude-haiku-5-5 ", apiKey: "sk-ant-my-claude-key" });

    const [row] = await db.select().from(userAiSettings);
    expect(JSON.stringify(row)).not.toContain("my-gemini-key");
    expect(JSON.stringify(row)).not.toContain("my-claude-key");

    expect(await getAiConfig(TEST_USER_ID)).toEqual({ provider: "claude", model: "claude-haiku-5-5", apiKey: "sk-ant-my-claude-key" });
    expect(await getAiSettingsView(TEST_USER_ID)).toEqual({
      provider: "claude", model: "claude-haiku-5-5", keys: { gemini: "-key", claude: "-key", groq: null },
    });
    await expect(getAiConfig(OTHER_USER_ID)).rejects.toBeInstanceOf(AiNotConfiguredError);
  });

  it("keeps a key when only the provider changes, and removes it on request", async () => {
    await saveAiSettings(TEST_USER_ID, { provider: "groq", apiKey: "gsk_abcd" });
    await saveAiSettings(TEST_USER_ID, { provider: "gemini" });
    await expect(getAiConfig(TEST_USER_ID)).rejects.toBeInstanceOf(AiNotConfiguredError);

    await saveAiSettings(TEST_USER_ID, { provider: "groq" });
    expect((await getAiConfig(TEST_USER_ID)).apiKey).toBe("gsk_abcd");

    await saveAiSettings(TEST_USER_ID, { provider: "groq", apiKey: "" });
    await expect(getAiConfig(TEST_USER_ID)).rejects.toBeInstanceOf(AiNotConfiguredError);
  });
});
