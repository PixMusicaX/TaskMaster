// In-memory stand-in for "@/db": a real Postgres (PGlite) with the app's schema,
// so server actions run their actual SQL without touching the real database.
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";

export const pg = new PGlite();
export const db = drizzle(pg, { schema });

type Queryable = Pick<PGlite, "query" | "exec"> | Transaction;

// Minimal shim of the postgres.js `client` API the app uses:
// tagged-template queries, `unsafe`, and `begin(mode, fn)` transactions.
function makeClient(conn: Queryable) {
  const tagged = async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.reduce((acc, s, i) => acc + `$${i}` + s);
    const res = await conn.query(text, values);
    return res.rows;
  };
  return Object.assign(tagged, {
    // Like postgres.js: `simple: false` uses the extended protocol (one statement only)
    unsafe: async (text: string, params: unknown[] = [], opts: { simple?: boolean } = {}) => {
      if (opts.simple === false || params.length > 0) return (await conn.query(text, params)).rows;
      const results = await conn.exec(text);
      return results[results.length - 1]?.rows ?? [];
    },
  });
}

export const client = Object.assign(makeClient(pg), {
  begin: async <T>(modeOrFn: string | ((tx: ReturnType<typeof makeClient>) => Promise<T>), maybeFn?: (tx: ReturnType<typeof makeClient>) => Promise<T>) => {
    const mode = typeof modeOrFn === "string" ? modeOrFn : "";
    const fn = typeof modeOrFn === "function" ? modeOrFn : maybeFn!;
    return pg.transaction(async (tx) => {
      if (/read only/i.test(mode)) await tx.exec("SET TRANSACTION READ ONLY");
      return fn(makeClient(tx));
    });
  },
});
