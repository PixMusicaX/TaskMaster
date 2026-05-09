import { pgTable, text, integer, boolean, timestamp, jsonb, uniqueIndex, primaryKey, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const userProfile = pgTable("UserProfile", {
  id: text("id").primaryKey().$defaultFn(() => "me"),
  xp: integer("xp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  strength: integer("strength").default(0).notNull(),
  intelligence: integer("intelligence").default(0).notNull(),
  wealth: integer("wealth").default(0).notNull(),
  vitality: integer("vitality").default(0).notNull(),
  charisma: integer("charisma").default(0).notNull(),
});

export const seasonSnapshot = pgTable("SeasonSnapshot", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  period: text("period").notNull(),
  monthName: text("monthName").notNull(),
  year: integer("year").notNull(),
  xp: integer("xp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  title: text("title").notNull(),
  topStat: text("topStat").notNull(),
  weakStat: text("weakStat").notNull(),
  strength: integer("strength").default(0).notNull(),
  intelligence: integer("intelligence").default(0).notNull(),
  wealth: integer("wealth").default(0).notNull(),
  vitality: integer("vitality").default(0).notNull(),
  charisma: integer("charisma").default(0).notNull(),
  createdAt: timestamp("createdAt", { precision: 3, mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("SeasonSnapshot_period_key").on(t.period)
]);

export const habit = pgTable("Habit", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  icon: text("icon"),
  color: text("color"),
  frequency: integer("frequency").array().default([0, 1, 2, 3, 4, 5, 6]),
  archived: boolean("archived").default(false).notNull(),
  stat: text("stat"), // strength, intelligence, wealth, vitality, charisma
  streak: integer("streak").default(0).notNull(),
  createdAt: timestamp("createdAt", { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const habitLog = pgTable("HabitLog", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  habitId: text("habitId").references(() => habit.id, { onDelete: 'set null' }),
  habitName: text("habitName"), // Preserved name
  habitIcon: text("habitIcon"), // Preserved icon
  date: text("date").notNull(), // Format: YYYY-MM-DD
  completed: boolean("completed").default(false).notNull(),
}, (t) => [
  uniqueIndex("HabitLog_habitId_date_key").on(t.habitId, t.date)
]);

export const note = pgTable("Note", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  content: text("content").notNull(),
  date: text("date").unique().notNull(), // Format: YYYY-MM-DD
  mood: text("mood").default("neutral").notNull(),
  createdAt: timestamp("createdAt", { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const event = pgTable("Event", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("startTime", { precision: 3, mode: 'date' }),
  endTime: timestamp("endTime", { precision: 3, mode: 'date' }),
  date: text("date").notNull(), // Format: YYYY-MM-DD
  type: text("type").notNull(), // "task" or "event"
  tier: text("tier").default("side").notNull(), // side, main, epic
  stat: text("stat"), // strength, intelligence, wealth, vitality, charisma
  completed: boolean("completed").default(false).notNull(),
  notification: boolean("notification").default(false).notNull(),
  createdAt: timestamp("createdAt", { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const smartMission = pgTable("SmartMission", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").unique().notNull(), // Format: YYYY-MM-DD
  completed: boolean("completed").default(false).notNull(),
  xpReward: integer("xpReward").default(50).notNull(),
  stat: text("stat").default("charisma").notNull(),
  quote: text("quote"),
  createdAt: timestamp("createdAt", { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const reliefRecommendation = pgTable("ReliefRecommendation", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type"), // movie, song, activity, food
  date: text("date").unique().notNull(), // Format: YYYY-MM-DD
  completed: boolean("completed").default(false).notNull(),
  alt1Completed: boolean("alt1Completed").default(false).notNull(),
  alt2Completed: boolean("alt2Completed").default(false).notNull(),
  xpReward: integer("xpReward").default(10).notNull(),
  stat: text("stat").default("charisma").notNull(),
  location: text("location"),
  weather: text("weather"),
  temp: text("temp"),
  alternatives: jsonb("alternatives"), // Store alternative suggestions
  createdAt: timestamp("createdAt", { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const preparationTip = pgTable("PreparationTip", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").unique().notNull(), // Format: YYYY-MM-DD
  completed: boolean("completed").default(false).notNull(),
  xpReward: integer("xpReward").default(25).notNull(),
  stat: text("stat").default("charisma").notNull(),
  createdAt: timestamp("createdAt", { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

// Relations
export const habitRelations = relations(habit, ({ many }) => ({
  logs: many(habitLog),
}));

export const habitLogRelations = relations(habitLog, ({ one }) => ({
  habit: one(habit, {
    fields: [habitLog.habitId],
    references: [habit.id],
  }),
}));
