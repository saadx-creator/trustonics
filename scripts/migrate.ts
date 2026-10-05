import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
const { migrate } = await import("./migration-lib");
const { closeDb } = await import("../lib/db");
try {
  await migrate();
  console.log("Phase 1 migration applied.");
} finally {
  await closeDb();
}
