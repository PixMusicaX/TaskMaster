import { pgTable, text, integer, boolean, timestamp, jsonb, uniqueIndex, index, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// ---- Accounts (Auth.js, Google sign-in). Every planner table below belongs to one user. ----

export const user = pgTable("User", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: 'date' }),
  image: text("image"),
  createdAt: timestamp("createdAt", { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const account = pgTable("Account", {
  userId: text("userId").notNull().references(() => user.id, { onDelete: 'cascade' }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (t) => [
  primaryKey({ columns: [t.provider, t.providerAccountId] })
]);

// One row per signed-in device. `id` is what the account page shows and revokes by, so the
// token itself never leaves the server.
export const session = pgTable("Session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: 'cascade' }),
  expires: timestamp("expires", { mode: 'date' }).notNull(),
  id: text("id").notNull().unique().$defaultFn(() => createId()),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt", { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

// Which AI writes this user's quests, and their own API keys (encrypted, see lib/ai-config.ts)
export const userAiSettings = pgTable("UserAiSettings", {
  userId: text("userId").primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  provider: text("provider").default("gemini").notNull(), // gemini, claude, groq
  model: text("model"), // null = the provider's default
  geminiKey: text("geminiKey"),
  claudeKey: text("claudeKey"),
  groqKey: text("groqKey"),
  updatedAt: timestamp("updatedAt", { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

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
  userId: text("userId").notNull().references(() => user.id, { onDelete: 'cascade' }),
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
  uniqueIndex("SeasonSnapshot_userId_period_key").on(t.userId, t.period)
]);

export const habit = pgTable("Habit", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("userId").notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  icon: text("icon"),
  color: text("color"),
  frequency: integer("frequency").array().default([0, 1, 2, 3, 4, 5, 6]),
  archived: boolean("archived").default(false).notNull(),
  stat: text("stat"), // strength, intelligence, wealth, vitality, charisma
  streak: integer("streak").default(0).notNull(),
  createdAt: timestamp("createdAt", { precision: 3, mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  index("Habit_userId_idx").on(t.userId)
]);

export const habitLog = pgTable("HabitLog", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("userId").notNull().references(() => user.id, { onDelete: 'cascade' }),
  habitId: text("habitId").references(() => habit.id, { onDelete: 'set null' }),
  habitName: text("habitName"), // Preserved name
  habitIcon: text("habitIcon"), // Preserved icon
  date: text("date").notNull(), // Format: YYYY-MM-DD
  completed: boolean("completed").default(false).notNull(),
}, (t) => [
  uniqueIndex("HabitLog_habitId_date_key").on(t.habitId, t.date),
  index("HabitLog_userId_date_idx").on(t.userId, t.date)
]);

export const note = pgTable("Note", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("userId").notNull().references(() => user.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  date: text("date").notNull(), // Format: YYYY-MM-DD
  mood: text("mood").default("neutral").notNull(),
  createdAt: timestamp("createdAt", { precision: 3, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { precision: 3, mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("Note_userId_date_key").on(t.userId, t.date)
]);

export const event = pgTable("Event", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("userId").notNull().references(() => user.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("startTime", { precision: 3, mode: 'date' }),
  endTime: timestamp("endTime", { precision: 3, mode: 'date' }),
  date: text("date").notNull(), // Format: YYYY-MM-DD
  type: text("type").notNull(), // "task" or "event"
  tier: text("tier").default("side").notNull(), // side, main, epic
  stat: text("stat"), // strength, intelligence, wealth, vitality, charisma
  completed: boolean("completed").default(false).notNull(),
  repeatsYearly: boolean("repeatsYearly").default(false).notNull(),
  notification: boolean("notification").default(false).notNull(),
  isApi: boolean("isApi").default(false).notNull(),
  createdAt: timestamp("createdAt", { precision: 3, mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  index("Event_userId_date_idx").on(t.userId, t.date)
]);

export const smartMission = pgTable("SmartMission", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("userId").notNull().references(() => user.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(), // Format: YYYY-MM-DD
  completed: boolean("completed").default(false).notNull(),
  xpReward: integer("xpReward").default(50).notNull(),
  stat: text("stat").default("charisma").notNull(),
  quote: text("quote"),
  createdAt: timestamp("createdAt", { precision: 3, mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("SmartMission_userId_date_key").on(t.userId, t.date)
]);

export const dailyQuote = pgTable("DailyQuote", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  date: text("date").unique().notNull(), // Format: YYYY-MM-DD
  quote: text("quote").notNull(),
  createdAt: timestamp("createdAt", { precision: 3, mode: 'date' }).defaultNow().notNull(),
});

export const reliefRecommendation = pgTable("ReliefRecommendation", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("userId").notNull().references(() => user.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type"), // movie, song, activity, food
  date: text("date").notNull(), // Format: YYYY-MM-DD
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
}, (t) => [
  uniqueIndex("ReliefRecommendation_userId_date_key").on(t.userId, t.date)
]);

export const preparationTip = pgTable("PreparationTip", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("userId").notNull().references(() => user.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(), // Format: YYYY-MM-DD
  completed: boolean("completed").default(false).notNull(),
  xpReward: integer("xpReward").default(25).notNull(),
  stat: text("stat").default("charisma").notNull(),
  createdAt: timestamp("createdAt", { precision: 3, mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("PreparationTip_userId_date_key").on(t.userId, t.date)
]);

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

export const taskmasterQueryCount = pgTable("TaskmasterQueryCount", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("userId").notNull().references(() => user.id, { onDelete: 'cascade' }),
  date: text("date").notNull(), // Format: YYYY-MM-DD
  count: integer("count").default(0).notNull(),
}, (t) => [
  uniqueIndex("TaskmasterQueryCount_userId_date_key").on(t.userId, t.date)
]);
