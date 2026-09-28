import { describe, it, expect } from "vitest";
import {
  addHabit, getHabits, getArchivedHabits, archiveHabit, restoreHabit,
  deleteHabitPermanently, toggleHabitLog, getHabitLogs, updateHabit,
} from "@/app/actions/habits";
import { insertHabitLog } from "./helpers/fixtures";

describe("habits", () => {
  it("adds, updates, archives and restores habits", async () => {
    const h = await addHabit("Meditate", "brain", "green", [1, 3, 5], "vitality");
    expect(h).toMatchObject({ name: "Meditate", frequency: [1, 3, 5], archived: false });

    await updateHabit(h.id, { name: "Meditate 10m" });
    expect((await getHabits())[0].name).toBe("Meditate 10m");

    await archiveHabit(h.id);
    expect(await getHabits()).toHaveLength(0);
    expect((await getArchivedHabits()).map(x => x.id)).toEqual([h.id]);

    await restoreHabit(h.id);
    expect((await getHabits()).map(x => x.id)).toEqual([h.id]);
  });

  it("only loads logs on or after logsSince when given", async () => {
    const h = await addHabit("Read");
    await insertHabitLog(h.id, "2026-09-01");
    await insertHabitLog(h.id, "2026-09-20");
    await insertHabitLog(h.id, "2026-09-27");

    expect((await getHabits())[0].logs).toHaveLength(3);
    const recent = (await getHabits("2026-09-20"))[0].logs.map(l => l.date).sort();
    expect(recent).toEqual(["2026-09-20", "2026-09-27"]);
  });
});

describe("toggleHabitLog", () => {
  it("logs a completion with the habit's name and icon, without duplicates", async () => {
    const h = await addHabit("Gym", "dumbbell");
    await toggleHabitLog(h.id, "2026-09-10", true);
    await toggleHabitLog(h.id, "2026-09-10", true);

    const logs = await getHabitLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ habitId: h.id, habitName: "Gym", habitIcon: "dumbbell", date: "2026-09-10", completed: true });
  });

  it("removes the log when unchecked", async () => {
    const h = await addHabit("Gym");
    await toggleHabitLog(h.id, "2026-09-10", true);
    const result = await toggleHabitLog(h.id, "2026-09-10", false);
    expect(result).toBeNull();
    expect(await getHabitLogs()).toHaveLength(0);
  });

  it("keeps history (with the preserved name) after a habit is deleted", async () => {
    const h = await addHabit("Old habit");
    await toggleHabitLog(h.id, "2026-09-10", true);
    await deleteHabitPermanently(h.id);

    const logs = await getHabitLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ habitId: null, habitName: "Old habit" });
  });
});
