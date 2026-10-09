// Habit queries shared between actions, for one user (server only)
import { db } from "@/db";
import { habit, habitLog } from "@/db/schema";
import { eq, and, asc, gte } from "drizzle-orm";

// Pass `logsSince` (YYYY-MM-DD) to load only recent logs instead of each habit's full history
export async function habitsFor(userId: string, logsSince?: string) {
  return await db.query.habit.findMany({
    where: and(eq(habit.userId, userId), eq(habit.archived, false)),
    with: {
      logs: logsSince ? { where: gte(habitLog.date, logsSince) } : true,
    },
    orderBy: [asc(habit.createdAt)],
  });
}
