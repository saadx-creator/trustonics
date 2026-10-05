import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { getDb } from "../lib/db";
export async function migrate() {
  const db = getDb();
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
  );
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7914101)`);
    const result = await tx.execute(
      sql`SELECT name FROM _migrations WHERE name='0001_phase1'`,
    );
    if (result.rows.length) return;
    const statements = (await readFile("migrations/0001_phase1.sql", "utf8"))
      .split("--> statement-breakpoint")
      .filter((s) => s.trim());
    for (const statement of statements) await tx.execute(sql.raw(statement));
    await tx.execute(sql`INSERT INTO _migrations(name) VALUES ('0001_phase1')`);
  });
}
