import { inject } from "vitest";
import { pg } from "./test-db";
import { OTHER_USER_ID, TEST_USER_ID } from "./user";

let created = false;

// Tables are built from src/db/schema.ts (see tests/global-setup.ts) so tests always match the app
export async function createSchema() {
  if (created) return;
  for (const statement of inject("schemaSql")) {
    await pg.exec(statement);
  }
  // The role the Taskmaster's queries run as (scripts/migrate-multi-user.mjs creates it for real)
  await pg.exec(`CREATE ROLE taskmaster_reader NOLOGIN`);
  created = true;
}

export async function resetDatabase() {
  const { rows } = await pg.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );
  if (rows.length === 0) return;
  await pg.exec(`TRUNCATE ${rows.map(r => `"${r.tablename}"`).join(", ")} CASCADE`);
  // Every test starts with the same two accounts and no planner data
  await pg.query(`INSERT INTO "User" ("id", "email") VALUES ($1, $2), ($3, $4)`,
    [TEST_USER_ID, "test@example.com", OTHER_USER_ID, "other@example.com"]);
}
