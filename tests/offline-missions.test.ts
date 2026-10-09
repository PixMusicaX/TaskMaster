import { describe, it, expect, vi } from "vitest";
import { OFFLINE_MISSIONS, OFFLINE_TAG, pickOfflineMission, pickOfflinePrepTip, pickOfflineRelief } from "@/lib/offline-missions";
import { MISSION_DIFFICULTIES, rollMissionBrief } from "@/lib/mission-dice";
import { getPreparationTipPrompt, getSmartMissionPrompt } from "@/lib/prompts";
import { getPreparationTip } from "@/app/actions/preparation";
import { getSmartMission, regenerateSmartMission } from "@/app/actions/smart-missions";
import { getReliefRecommendation } from "@/app/actions/relief";
import { safeGenerateContent } from "@/lib/ai-utils";
import { AiNotConfiguredError } from "@/lib/ai-config";
import { insertEvent, insertMission, jsonResponse, setToday } from "./helpers/fixtures";

// A fixed sequence instead of Math.random
const rngFrom = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};
const allMissions = Object.values(OFFLINE_MISSIONS).flat();

describe("offline missions", () => {
  it("offers a wide pool with no duplicate titles", () => {
    expect(allMissions.length).toBeGreaterThanOrEqual(48);
    expect(new Set(allMissions.map(m => m.title)).size).toBe(allMissions.length);
  });

  it("never repeats a recent mission and changes area from the last one", () => {
    const last = OFFLINE_MISSIONS.body[0];
    const recent = [`${last.title} ${OFFLINE_TAG}`, ...OFFLINE_MISSIONS.people.map(m => m.title)];
    for (let i = 0; i < 200; i++) {
      const picked = pickOfflineMission(recent, rngFrom(i / 200));
      expect(picked.title.endsWith(OFFLINE_TAG)).toBe(true);
      const bare = picked.title.replace(` ${OFFLINE_TAG}`, "");
      expect(recent.map(r => r.replace(` ${OFFLINE_TAG}`, ""))).not.toContain(bare);
      expect(OFFLINE_MISSIONS.body.map(m => m.title)).not.toContain(bare);
    }
  });

  it("still returns something once every mission has been used", () => {
    expect(pickOfflineMission(allMissions.map(m => m.title)).title).toContain(OFFLINE_TAG);
  });

  it("a month of offline missions has no repeats", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([{ q: "Q", a: "A" }])));
    const titles: string[] = [];
    for (let day = 1; day <= 30; day++) {
      const date = `2026-09-${String(day).padStart(2, "0")}`;
      setToday(date);
      titles.push((await getSmartMission(date))!.title);
    }
    expect(new Set(titles).size).toBe(30);
  });

  it("regenerating gives a different offline mission", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([{ q: "Q", a: "A" }])));
    setToday("2026-09-28");
    await insertMission({ date: "2026-09-27", title: `Ten-Minute Walk ${OFFLINE_TAG}` });
    const first = await getSmartMission("2026-09-28");
    expect(first?.title).not.toContain("Ten-Minute Walk");
    expect((await regenerateSmartMission("2026-09-28"))?.title).toContain(OFFLINE_TAG);
  });
});

describe("offline preparation tips", () => {
  const today = "2026-09-28"; // a Monday

  it("names the nearest plan and says when it is", () => {
    const tip = pickOfflinePrepTip([
      { title: "Diwali", type: "special_day", date: "2026-09-29" },
      { title: "Dentist", type: "event", date: "2026-10-01" },
      { title: "Tax filing", type: "task", date: "2026-10-20" },
    ], today, []);
    expect(tip.title).toContain("Dentist");
    expect(tip.title).toContain(OFFLINE_TAG);
    expect(tip.description).toContain("this Thursday");
  });

  it("moves to the next plan once every angle on the first has been used", () => {
    const upcoming = [
      { title: "Dentist", type: "event", date: "2026-09-29" },
      { title: "Trip to Goa", type: "event", date: "2026-10-12" },
    ];
    const used: string[] = [];
    for (let i = 0; i < 3; i++) used.push(pickOfflinePrepTip(upcoming, today, used).title);
    expect(used.every(t => t.includes("Dentist"))).toBe(true);
    expect(new Set(used).size).toBe(3);
    const next = pickOfflinePrepTip(upcoming, today, used);
    expect(next.title).toContain("Trip to Goa");
    expect(next.description).toContain("in 14 days, on Oct 12");
  });

  it("falls back to holidays, then to quiet-calendar advice", () => {
    expect(pickOfflinePrepTip([{ title: "Diwali", type: "special_day", date: "2026-09-29" }], today, []).description).toContain("Diwali is tomorrow");
    const quiet = pickOfflinePrepTip([], today, []);
    expect(quiet.title).toContain(OFFLINE_TAG);
    expect(quiet.description.length).toBeGreaterThan(20);
  });

  it("is what an account with no AI key gets, while a failing provider still gets nothing", async () => {
    setToday(today);
    await insertEvent({ title: "Dentist", type: "event", date: "2026-10-01" });

    // The default mock fails like a provider that is down
    expect(await getPreparationTip(today)).toBeFalsy();

    vi.mocked(safeGenerateContent).mockRejectedValueOnce(new AiNotConfiguredError());
    const tip = await getPreparationTip(today);
    expect(tip?.title).toContain("Dentist");
    expect(tip?.title).toContain(OFFLINE_TAG);
  });
});

describe("offline Tavern picks", () => {
  it("stay indoors in bad weather and give two alternatives of other types", () => {
    for (let i = 0; i < 100; i++) {
      const rec = pickOfflineRelief("Stormy", [], rngFrom(i / 100, (i * 7 % 100) / 100, (i * 13 % 100) / 100));
      expect(rec.type).not.toBe("place");
      expect(rec.title).not.toContain("Walk");
      expect(rec.alternatives).toHaveLength(2);
      expect(new Set([rec.type, ...rec.alternatives.map(a => a.type)]).size).toBe(3);
    }
  });

  it("avoid the recent picks", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const titles: string[] = [];
    for (let day = 1; day <= 10; day++) {
      const date = `2026-09-${String(day).padStart(2, "0")}`;
      setToday(date);
      titles.push((await getReliefRecommendation(undefined, undefined, date))!.title);
    }
    expect(new Set(titles).size).toBe(10);
  });
});

describe("the mission dice", () => {
  it("roll a size and a shape, and ease off after two unfinished missions", () => {
    const rolled = rollMissionBrief([{ completed: true }, { completed: false }], rngFrom(0.99, 0));
    expect(rolled).toMatchObject({ difficulty: MISSION_DIFFICULTIES[2], easedOff: false });
    expect(rolled.shape).toBeTruthy();

    const eased = rollMissionBrief([{ completed: false }, { completed: false }], rngFrom(0.99));
    expect(eased).toMatchObject({ difficulty: MISSION_DIFFICULTIES[0], easedOff: true });
  });
});

describe("the prompts", () => {
  const base = { level: 5, xp: 400, stats: { strength: 10 }, title: "Squire", habits: ["Guitar"], today: "2026-09-28" };

  it("give the mission writer readable notes, dated activity and today's roll", () => {
    const prompt = getSmartMissionPrompt({
      ...base,
      recentTasks: [
        { title: "Ship release", type: "task", date: "2026-09-26", startTime: null, completed: true },
        { title: "Call bank", type: "task", date: "2026-09-27", startTime: null, completed: false },
      ],
      recentNotes: ["2026-09-27 (mood: bad): exhausted after the release"],
      missionHistory: [{ title: "Old Quest", completed: false }],
      brief: { difficulty: MISSION_DIFFICULTIES[1], shape: "move the body", easedOff: true },
    });
    expect(prompt).toContain("2026-09-28 (Monday)");
    expect(prompt).toContain("- 2026-09-27 [TASK] Call bank [NOT DONE]");
    expect(prompt.indexOf("Call bank")).toBeLessThan(prompt.indexOf("Ship release"));
    expect(prompt).toContain("- 2026-09-27 (mood: bad): exhausted after the release");
    expect(prompt).toContain("- Old Quest (NOT COMPLETED)");
    expect(prompt).toContain("Size : Medium");
    expect(prompt).toContain("Shape: move the body");
    expect(prompt).toContain("deliberately light");
    expect(prompt).not.toContain("undefined");
    expect(prompt).not.toContain("${");
  });

  it("give the strategist distances, weekdays and plain item types", () => {
    const prompt = getPreparationTipPrompt({
      today: "2026-09-28",
      futureTasks: [
        { title: "Standup", type: "event", date: "2026-09-28" },
        { title: "Dentist", type: "event", date: "2026-09-29" },
        { title: "Diwali", type: "special_day", date: "2026-10-08" },
      ],
      history: [{ title: "Pack early", completed: false }],
    });
    expect(prompt).toContain("- TODAY, Monday 2026-09-28: [EVENT] Standup");
    expect(prompt).toContain("- TOMORROW, Tuesday 2026-09-29: [EVENT] Dentist");
    expect(prompt).toContain("- in 10 days, Thursday 2026-10-08: [OCCASION] Diwali");
    expect(prompt).toContain("- Pack early (IGNORED)");
    expect(prompt).not.toContain("undefined");
    expect(prompt).not.toContain("${");
    expect(getPreparationTipPrompt({ today: "2026-09-28", futureTasks: [], history: [] })).toContain("Nothing is scheduled.");
  });
});
