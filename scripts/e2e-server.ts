import { mkdtemp, rm } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { mkdir } from "node:fs/promises";
// Disposable test-only database. This never connects to the production DATABASE_URL.
if (process.env.VERCEL)
  throw new Error("Do not run browser tests in production.");
await mkdir(".data", { recursive: true });
const folder = await mkdtemp(path.resolve(".data/e2e-"));
Object.assign(process.env, {
  DATABASE_URL: "",
  LOCAL_DATABASE: "1",
  PGLITE_DIR: folder + "/pg",
  AUTH_SECRET: randomBytes(48).toString("base64url"),
  AUTH_URL: "http://127.0.0.1:3100",
  APP_URL: "http://127.0.0.1:3100",
  NEXT_PUBLIC_TRUSTONICS_WHATSAPP:
    process.env.E2E_WHATSAPP === "1" ? "923001234567" : "",
  TRUST_PROXY: "0",
});
const { migrate } = await import("./migration-lib");
const { getDb, closeDb } = await import("../lib/db");
const { users } = await import("../lib/db/schema");
const { hashPassword } = await import("../lib/password");
await migrate();
await getDb()
  .insert(users)
  .values({
    email: "e2e-admin@example.invalid",
    name: "E2E Test Admin",
    password_hash: await hashPassword("e2e-only-disposable-password-42"),
  });
await closeDb();
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--webpack",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  { env: process.env, stdio: "inherit" },
);
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, () => child.kill(signal));
child.on("exit", async (code) => {
  await rm(folder, { recursive: true, force: true });
  process.exit(code || 0);
});
