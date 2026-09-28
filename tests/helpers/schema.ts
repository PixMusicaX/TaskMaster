import { inject } from "vitest";
import { pg } from "./test-db";

let created = false;

// Tables are built from src/db/schema.ts (see tests/global-setup.ts) so tests always match the app
export async function createSchema() {
  if (created) return;
  for (const statement of inject("schemaSql")) {
    await pg.exec(statement);
  }
  created = true;
}

export async function resetDatabase() {
  const { rows } = await pg.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );
  if (rows.length === 0) return;
  await pg.exec(`TRUNCATE ${rows.map(r => `"${r.tablename}"`).join(", ")} CASCADE`);
}
