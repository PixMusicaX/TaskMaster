// Demo planners (server only): creating one with made-up data, telling one apart, and clearing
// them away. Everything a demo player does lands in the same tables as a real player's, under a
// temporary account, so every feature works; deleting that account takes all of it with it.
import { and, eq, like, lt, count } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/db";
import { event, habit, habitLog, note, preparationTip, reliefRecommendation, session, smartMission, user, userPreferences } from "@/db/schema";
import { DEMO_EMAIL_DOMAIN, DEMO_HOURS, DEMO_NAME, isDemoEmail } from "@/lib/demo";
import { OFFLINE_MISSIONS, OFFLINE_TAG } from "@/lib/offline-missions";

const DEMO_EMAILS = `demo+%@${DEMO_EMAIL_DOMAIN}`;
// A ceiling on demos alive at once, so the button can't be used to fill the database
const MAX_LIVE_DEMOS = 150;

export async function isDemoUser(userId: string): Promise<boolean> {
  const [row] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
  return isDemoEmail(row?.email);
}

// Deleting the account removes its habits, notes, events, sessions and the rest with it
export async function deleteDemoUser(userId: string) {
  await db.delete(user).where(and(eq(user.id, userId), like(user.email, DEMO_EMAILS)));
}

// Demos nobody came back to close
export async function purgeExpiredDemos(now = new Date()) {
  const cutoff = new Date(now.getTime() - DEMO_HOURS * 3_600_000);
  await db.delete(user).where(and(like(user.email, DEMO_EMAILS), lt(user.createdAt, cutoff)));
}

// A new demo account with a signed-in session, or null when too many are running
export async function createDemoSession(userAgent: string | null): Promise<{ userId: string; sessionToken: string; expires: Date } | null> {
  await purgeExpiredDemos();
  const [{ live }] = await db.select({ live: count() }).from(user).where(like(user.email, DEMO_EMAILS));
  if (live >= MAX_LIVE_DEMOS) return null;

  const userId = createId();
  await db.insert(user).values({ id: userId, name: DEMO_NAME, email: `demo+${userId}@${DEMO_EMAIL_DOMAIN}` });
  const sessionToken = `${createId()}${createId()}`;
  const expires = new Date(Date.now() + DEMO_HOURS * 3_600_000);
  await db.insert(session).values({ sessionToken, userId, expires, userAgent: userAgent?.slice(0, 300) ?? null });
  return { userId, sessionToken, expires };
}

// ─── The made-up planner ──────────────────────────────────────────────────────

type Rng = () => number;
const pick = <T,>(list: readonly T[], rng: Rng): T => list[Math.floor(rng() * list.length)];
const some = <T,>(list: readonly T[], n: number, rng: Rng): T[] => [...list].sort(() => rng() - 0.5).slice(0, n);
const chance = (p: number, rng: Rng) => rng() < p;

const HABITS = [
  { name: "Read 10 pages", icon: "Book", stat: "intelligence" },
  { name: "Morning walk", icon: "Dumbbell", stat: "vitality" },
  { name: "Guitar practice", icon: "Music", stat: "charisma" },
  { name: "Deep work block", icon: "Code", stat: "intelligence" },
  { name: "Meditate", icon: "Brain", stat: "vitality" },
  { name: "Drink 2L of water", icon: "HeartPulse", stat: "vitality" },
  { name: "Language lesson", icon: "GraduationCap", stat: "intelligence" },
  { name: "Call someone", icon: "Phone", stat: "charisma" },
];
const TASKS = [
  "Reply to the landlord", "Book dentist appointment", "Renew gym membership", "Clean the desk", "Back up the laptop",
  "Buy a birthday gift", "Fix the leaking tap", "Submit expense report", "Update the résumé", "Sort the bookshelf",
  "Pay the electricity bill", "Draft the project outline", "Water the plants", "Call the bank", "Order new headphones",
  "Review pull requests", "Plan next week's meals", "Return the library books", "Schedule the car service", "File the tax papers",
];
const EVENTS: { title: string; tier: "side" | "main" | "epic"; hour: number }[] = [
  { title: "Team standup", tier: "side", hour: 10 }, { title: "Dinner with friends", tier: "main", hour: 20 },
  { title: "Guitar class", tier: "main", hour: 18 }, { title: "Dentist", tier: "side", hour: 11 },
  { title: "Product demo", tier: "epic", hour: 15 }, { title: "Football with the lads", tier: "main", hour: 7 },
  { title: "Movie night", tier: "side", hour: 21 }, { title: "Weekend trek", tier: "epic", hour: 6 },
  { title: "Coffee with a mentor", tier: "main", hour: 16 }, { title: "Family video call", tier: "side", hour: 19 },
  { title: "Design review", tier: "main", hour: 14 }, { title: "Concert", tier: "epic", hour: 20 },
];
const NOTE_LINES: [string, string][] = [
  ["✅", "Shipped the release before lunch"], ["○", "Walked the long way home"], ["✨", "Called Ma. She sounded happy"],
  ["🔥", "Guitar: finally got that bridge"], ["○", "Slow start, long meetings"], ["💡", "Split the migration into two steps"],
  ["📍", "Found a new café near the station"], ["○", "Skipped the walk, felt it by evening"], ["✅", "Inbox down to zero"],
  ["○", "Rain all day. Stayed in and read"], ["💡", "Write the tests before the fix next time"], ["✨", "Cooked something new and it worked"],
  ["○", "Too much coffee, not enough water"], ["🔥", "Best run in weeks"], ["○", "Early night"],
  ["📍", "Booked tickets for the trek"], ["✅", "Finished the book"], ["○", "Hard conversation, glad it's done"],
];
const RELIEFS: { title: string; type: string; description: string }[] = [
  { title: "Put on a lo-fi stream", type: "song", description: "Easy background for unwinding after a full day." },
  { title: "Rewatch a comfort film", type: "movie", description: "Something you know by heart asks nothing of you." },
  { title: "Walk around the block", type: "activity", description: "Ten minutes of air and movement resets most moods." },
  { title: "Cook your go-to comfort dish", type: "food", description: "A familiar recipe is restful in its own way." },
  { title: "Read a chapter in bed", type: "book", description: "A few pages of fiction to let the day go." },
  { title: "Sit somewhere green", type: "place", description: "A park bench and no plan for twenty minutes." },
];
const PREP_TIPS: [string, string][] = [
  ["Scout the week ahead", "List what each of the next three days needs and do the quickest item now."],
  ["Lay out tomorrow", "Put everything tomorrow's first task needs within reach before bed."],
  ["Clear one blocker", "Send the one message that something else is waiting on."],
  ["Block the time", "Put a fixed half hour for the big thing on your calendar before the week fills up."],
  ["Halve the dull part", "Do the least interesting part of the preparation today, so the day itself is lighter."],
];

const iso = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

// Fills a new demo account with about ten weeks of a believable life, different every time:
// habits with patchy streaks, done and pending tasks, past and coming events, a journal, and
// the daily cards. `today` is the visitor's date (YYYY-MM-DD) and `tzOffsetMinutes` their
// clock's offset (as Date#getTimezoneOffset gives it), so "this evening" means their evening.
export async function seedDemoPlanner(userId: string, today: string, tzOffsetMinutes = 0, rng: Rng = Math.random) {
  const [y, m, d] = today.split("-").map(Number);
  // Days are counted on a UTC calendar here, purely as date arithmetic
  const day = (offset: number) => new Date(Date.UTC(y, m - 1, d + offset));
  const dateOf = (offset: number) => iso(day(offset));
  // A wall-clock time on one of those days, as the visitor's clock would read it
  const at = (offset: number, hour: number, minute = 0) => new Date(Date.UTC(y, m - 1, d + offset, hour, minute) + tzOffsetMinutes * 60_000);
  const nowHour = new Date(Date.now() - tzOffsetMinutes * 60_000).getUTCHours();
  const HISTORY_DAYS = 68;

  // Habits, each kept with its own reliability
  const habits = await db.insert(habit).values(
    some(HABITS, 4, rng).map((h, i) => ({
      userId, name: h.name, icon: h.icon, stat: h.stat,
      frequency: i === 3 ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6],
      createdAt: at(-HISTORY_DAYS - 2, 9),
    }))
  ).returning();
  const logs: (typeof habitLog.$inferInsert)[] = [];
  habits.forEach((h, i) => {
    const reliability = [0.9, 0.75, 0.6, 0.7][i] ?? 0.7;
    for (let offset = -HISTORY_DAYS; offset <= 0; offset++) {
      if (!(h.frequency ?? []).includes(day(offset).getUTCDay())) continue;
      // The last few days of the first habit are solid, so there is a streak to see; today is half done
      const done = offset === 0 ? i < 2 : (i === 0 && offset >= -9) || chance(reliability, rng);
      if (done) logs.push({ userId, habitId: h.id, habitName: h.name, habitIcon: h.icon, date: dateOf(offset), completed: true });
    }
  });

  const events: (typeof event.$inferInsert)[] = [];
  // Finished tasks, about one every other day
  for (let offset = -HISTORY_DAYS; offset < 0; offset++) {
    if (chance(0.5, rng)) events.push({ userId, title: pick(TASKS, rng), date: dateOf(offset), type: "task", tier: "side", completed: true });
  }
  // Tasks still open: a couple overdue, a few for today, some coming up
  const open = some(TASKS, 9, rng);
  [-3, -1].forEach((offset, i) => events.push({ userId, title: open[i], date: dateOf(offset), type: "task", tier: "side", completed: false }));
  [0, 0, 0].forEach((offset, i) => events.push({ userId, title: open[2 + i], date: dateOf(offset), type: "task", tier: i === 0 ? "main" : "side", completed: false }));
  [1, 2, 4, 7].forEach((offset, i) => events.push({ userId, title: open[5 + i], date: dateOf(offset), type: "task", tier: "side", completed: false }));
  // Events: two or three a week behind, one earlier today and one tonight, more in the fortnight ahead
  for (let offset = -HISTORY_DAYS; offset < 0; offset++) {
    if (!chance(0.33, rng)) continue;
    const e = pick(EVENTS, rng);
    events.push({ userId, title: e.title, date: dateOf(offset), type: "event", tier: e.tier, startTime: at(offset, e.hour), notification: false });
  }
  const [earlier, tonight] = some(EVENTS, 2, rng);
  events.push({ userId, title: earlier.title, date: dateOf(0), type: "event", tier: earlier.tier, startTime: at(0, Math.max(0, nowHour - 2)) });
  events.push({ userId, title: tonight.title, date: dateOf(0), type: "event", tier: tonight.tier, startTime: at(0, Math.min(23, nowHour + 3)), notification: true });
  some([1, 2, 3, 5, 6, 8, 10, 12, 13], 6, rng).forEach(offset => {
    const e = pick(EVENTS, rng);
    events.push({ userId, title: e.title, date: dateOf(offset), type: "event", tier: e.tier, startTime: at(offset, e.hour), notification: true });
  });
  // Special days, and one thing on this date in years past for the Chronicle
  events.push({ userId, title: "Riya's birthday", date: dateOf(4), type: "special_day", tier: "main", isApi: true });
  events.push({ userId, title: "Founders' Day", date: dateOf(-12), type: "special_day", tier: "main", isApi: true });
  events.push({ userId, title: "Moved into the new flat", date: `${y - 1}-${today.slice(5)}`, type: "event", tier: "epic", startTime: new Date(Date.UTC(y - 1, m - 1, d, 10) + tzOffsetMinutes * 60_000) });

  // A journal: most days, one to four lines and a mood (now and then none picked)
  const notes: (typeof note.$inferInsert)[] = [];
  const entry = (lines: [string, string][]) => JSON.stringify(lines.map(([bullet, text], i) => ({ id: `d${i}`, bullet, text })));
  for (let offset = -HISTORY_DAYS; offset < 0; offset++) {
    if (!chance(0.78, rng)) continue;
    const roll = rng();
    // Written that evening. The times are given outright: on a database that began life before
    // this schema, "updatedAt" has no default of its own to fall back on.
    const written = at(offset, 21);
    notes.push({
      userId, date: dateOf(offset), content: entry(some(NOTE_LINES, 1 + Math.floor(rng() * 4), rng)),
      mood: roll < 0.45 ? "good" : roll < 0.8 ? "neutral" : roll < 0.95 ? "bad" : "",
      createdAt: written, updatedAt: written,
    });
  }
  [
    { years: 1, mood: "good", line: ["✨", "First night in the new place. Boxes everywhere."] as [string, string] },
    { years: 2, mood: "neutral", line: ["○", "Started keeping a journal. Let's see if it sticks."] as [string, string] },
  ].forEach(({ years, mood, line }) => {
    const written = new Date(Date.UTC(y - years, m - 1, d, 21) + tzOffsetMinutes * 60_000);
    notes.push({ userId, date: `${y - years}-${today.slice(5)}`, content: entry([line]), mood, createdAt: written, updatedAt: written });
  });

  // The daily cards for the past weeks (today's are written when the home page opens)
  const missionPool = Object.values(OFFLINE_MISSIONS).flat();
  const missions: (typeof smartMission.$inferInsert)[] = [];
  const tips: (typeof preparationTip.$inferInsert)[] = [];
  const reliefs: (typeof reliefRecommendation.$inferInsert)[] = [];
  for (let offset = -HISTORY_DAYS; offset < 0; offset++) {
    const date = dateOf(offset);
    const mission = pick(missionPool, rng);
    missions.push({ userId, date, title: `${mission.title} ${OFFLINE_TAG}`, description: mission.description, completed: chance(0.6, rng), xpReward: 50, stat: "charisma" });
    const [tipTitle, tipText] = pick(PREP_TIPS, rng);
    tips.push({ userId, date, title: `${tipTitle} ${OFFLINE_TAG}`, description: tipText, completed: chance(0.5, rng), xpReward: 25, stat: "charisma" });
    const relief = pick(RELIEFS, rng);
    reliefs.push({
      userId, date, title: `${relief.title} ${OFFLINE_TAG}`, type: relief.type, description: relief.description,
      completed: chance(0.5, rng), alt1Completed: chance(0.25, rng), alt2Completed: chance(0.15, rng),
      location: "Demo City", weather: pick(["Clear", "Partly Cloudy", "Rainy"], rng), temp: String(18 + Math.floor(rng() * 12)),
      alternatives: [{ title: "Quick 5-min Stretch", type: "activity" }, { title: "Hot Herbal Tea", type: "food" }],
      xpReward: 10, stat: "charisma",
    });
  }

  if (logs.length) await db.insert(habitLog).values(logs);
  await db.insert(event).values(events);
  await db.insert(note).values(notes);
  await db.insert(smartMission).values(missions);
  await db.insert(preparationTip).values(tips);
  await db.insert(reliefRecommendation).values(reliefs);
  // A demo player isn't asked to personalise, and gets no holiday lookups
  await db.insert(userPreferences).values({ userId, holidayRegion: "", introSeen: true }).onConflictDoNothing().catch(() => {});

  return { habits: habits.length, logs: logs.length, events: events.length, notes: notes.length };
}
