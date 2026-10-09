// One-time migration from the single-user database to accounts.
//
//   node --env-file=.env scripts/migrate-multi-user.mjs <owner-email> [--dry-run]
//
// It creates the sign-in tables, gives every planner table an owner column, hands every existing
// row to <owner-email> (the Google account that will sign in as you), makes the one-per-day rules
// per user, and sets up the read-only role the Taskmaster's questions run as.
//
// Everything happens in one transaction: a failure changes nothing, and --dry-run rolls back on
// purpose after printing what it would do. Safe to run again; finished steps are skipped.
import postgres from "postgres";
import { randomUUID } from "node:crypto";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const ownerEmail = args.find(a => !a.startsWith("--"))?.trim().toLowerCase();

if (!ownerEmail || !ownerEmail.includes("@")) {
  console.error("Usage: node --env-file=.env scripts/migrate-multi-user.mjs <owner-email> [--dry-run]");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (run with --env-file=.env).");
  process.exit(1);
}

// Planner tables that get an owner
const OWNED_TABLES = ["Habit", "HabitLog", "Note", "Event", "SmartMission", "ReliefRecommendation", "PreparationTip", "TaskmasterQueryCount", "SeasonSnapshot"];
// One row per day (or month) for everybody → one per user
const PER_USER_UNIQUE = [
  ["Note", "date"],
  ["SmartMission", "date"],
  ["ReliefRecommendation", "date"],
  ["PreparationTip", "date"],
  ["TaskmasterQueryCount", "date"],
  ["SeasonSnapshot", "period"],
];
const PLAIN_INDEXES = [
  ["Habit_userId_idx", `"Habit" ("userId")`],
  ["HabitLog_userId_date_idx", `"HabitLog" ("userId", "date")`],
  ["Event_userId_date_idx", `"Event" ("userId", "date")`],
];
const READER_ROLE = "taskmaster_reader";

class DryRun extends Error {}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });

try {
  await sql.begin(async (tx) => {
    // ---- Sign-in tables ----
    await tx.unsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" text PRIMARY KEY,
        "name" text,
        "email" text UNIQUE,
        "emailVerified" timestamp,
        "image" text,
        "createdAt" timestamp(3) DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS "Account" (
        "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "type" text NOT NULL,
        "provider" text NOT NULL,
        "providerAccountId" text NOT NULL,
        "refresh_token" text,
        "access_token" text,
        "expires_at" integer,
        "token_type" text,
        "scope" text,
        "id_token" text,
        "session_state" text,
        PRIMARY KEY ("provider", "providerAccountId")
      );
      CREATE TABLE IF NOT EXISTS "Session" (
        "sessionToken" text PRIMARY KEY,
        "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "expires" timestamp NOT NULL,
        "id" text NOT NULL UNIQUE,
        "userAgent" text,
        "createdAt" timestamp(3) DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS "UserAiSettings" (
        "userId" text PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
        "provider" text DEFAULT 'gemini' NOT NULL,
        "model" text,
        "geminiKey" text,
        "claudeKey" text,
        "groqKey" text,
        "updatedAt" timestamp(3) DEFAULT now() NOT NULL
      );
      -- These two used to be created on first use, so they may not exist yet
      CREATE TABLE IF NOT EXISTS "SeasonSnapshot" (
        "id" text PRIMARY KEY,
        "period" text NOT NULL,
        "monthName" text NOT NULL,
        "year" integer NOT NULL,
        "xp" integer DEFAULT 0 NOT NULL,
        "level" integer DEFAULT 1 NOT NULL,
        "title" text NOT NULL,
        "topStat" text NOT NULL,
        "weakStat" text NOT NULL,
        "strength" integer DEFAULT 0 NOT NULL,
        "intelligence" integer DEFAULT 0 NOT NULL,
        "wealth" integer DEFAULT 0 NOT NULL,
        "vitality" integer DEFAULT 0 NOT NULL,
        "charisma" integer DEFAULT 0 NOT NULL,
        "createdAt" timestamp(3) DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS "TaskmasterQueryCount" (
        "id" text PRIMARY KEY,
        "date" text NOT NULL,
        "count" integer DEFAULT 0 NOT NULL
      );
    `);
    console.log("Sign-in tables ready.");

    // ---- The owner of everything that already exists ----
    let [owner] = await tx`SELECT "id" FROM "User" WHERE lower("email") = ${ownerEmail}`;
    if (owner) {
      console.log(`Owner ${ownerEmail} already exists.`);
    } else {
      [owner] = await tx`INSERT INTO "User" ("id", "email") VALUES (${randomUUID()}, ${ownerEmail}) RETURNING "id"`;
      console.log(`Created owner ${ownerEmail}. Signing in with that Google account will pick this row up.`);
    }

    // ---- Owner column on every planner table ----
    for (const table of OWNED_TABLES) {
      await tx.unsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "userId" text`);
      const claimed = await tx.unsafe(`UPDATE "${table}" SET "userId" = $1 WHERE "userId" IS NULL`, [owner.id]);
      await tx.unsafe(`ALTER TABLE "${table}" ALTER COLUMN "userId" SET NOT NULL`);
      const fk = `${table}_userId_User_id_fk`;
      const [hasFk] = await tx`SELECT 1 FROM pg_constraint WHERE conname = ${fk}`;
      if (!hasFk) {
        await tx.unsafe(`ALTER TABLE "${table}" ADD CONSTRAINT "${fk}" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE`);
      }
      console.log(`${table}: ${claimed.count} existing row(s) assigned to ${ownerEmail}.`);
    }

    // ---- One-per-day becomes one-per-day per user ----
    for (const [table, column] of PER_USER_UNIQUE) {
      // The old rule's name depends on which tool created the table, so look it up
      const old = await tx`
        SELECT c.relname AS index_name, con.conname AS constraint_name
        FROM pg_index i
        JOIN pg_class c ON c.oid = i.indexrelid
        JOIN pg_class t ON t.oid = i.indrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        LEFT JOIN pg_constraint con ON con.conindid = i.indexrelid AND con.contype = 'u'
        WHERE n.nspname = 'public' AND t.relname = ${table}
          AND i.indisunique AND NOT i.indisprimary AND i.indnatts = 1
          AND (SELECT attname FROM pg_attribute WHERE attrelid = t.oid AND attnum = i.indkey[0]) = ${column}`;
      for (const row of old) {
        if (row.constraint_name) await tx.unsafe(`ALTER TABLE "${table}" DROP CONSTRAINT "${row.constraint_name}"`);
        else await tx.unsafe(`DROP INDEX "${row.index_name}"`);
      }
      await tx.unsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "${table}_userId_${column}_key" ON "${table}" ("userId", "${column}")`);
    }
    for (const [name, target] of PLAIN_INDEXES) {
      await tx.unsafe(`CREATE INDEX IF NOT EXISTS "${name}" ON ${target}`);
    }
    console.log("Per-user uniqueness rules and indexes ready.");

    // ---- The role the Taskmaster's generated queries run as: it can read nothing by itself ----
    try {
      await tx.savepoint(async (sp) => {
        const [role] = await sp`SELECT 1 FROM pg_roles WHERE rolname = ${READER_ROLE}`;
        if (!role) await sp.unsafe(`CREATE ROLE ${READER_ROLE} NOLOGIN`);
        await sp.unsafe(`GRANT ${READER_ROLE} TO CURRENT_USER`);
        for (const table of [...OWNED_TABLES, "User", "Account", "Session", "UserAiSettings", "DailyQuote"]) {
          await sp.unsafe(`REVOKE ALL ON "${table}" FROM ${READER_ROLE}`);
        }
      });
      console.log(`Role ${READER_ROLE} ready.`);
    } catch (roleError) {
      console.warn(`Could not set up the ${READER_ROLE} role (${roleError.message}).`);
      console.warn("Everything else is migrated, but \"Ask the Taskmaster\" will stay unavailable until that role exists.");
    }

    if (dryRun) throw new DryRun();
  });
  console.log("\nMigration complete.");
} catch (error) {
  if (error instanceof DryRun) {
    console.log("\nDry run: nothing was changed.");
  } else {
    console.error("\nMigration failed; nothing was changed.\n", error);
    process.exitCode = 1;
  }
} finally {
  await sql.end();
}
