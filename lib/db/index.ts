import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleLocal } from "drizzle-orm/pglite";
import { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";
import path from "node:path";
import { mkdirSync } from "node:fs";
type Database = ReturnType<typeof drizzleLocal<typeof schema>>;
const shared = globalThis as unknown as {
  trustonicsDb?: Database;
  trustonicsClient?: Pool | PGlite;
};
export function getDb(): Database {
  if (shared.trustonicsDb) return shared.trustonicsDb;
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 10000,
    });
    shared.trustonicsClient = pool;
    shared.trustonicsDb = drizzlePg(pool, { schema }) as unknown as Database;
  } else {
    if (process.env.LOCAL_DATABASE !== "1" || process.env.VERCEL || process.env.NETLIFY)
      throw new Error("Database is not configured.");
    const directory = path.resolve(process.env.PGLITE_DIR || ".data/postgres");
    mkdirSync(path.dirname(directory), { recursive: true });
    const local = new PGlite(directory);
    shared.trustonicsClient = local;
    shared.trustonicsDb = drizzleLocal(local, { schema });
  }
  return shared.trustonicsDb;
}
export async function closeDb() {
  const client = shared.trustonicsClient;
  if (client instanceof Pool) await client.end();
  else if (client) await client.close();
  shared.trustonicsDb = undefined;
  shared.trustonicsClient = undefined;
}
