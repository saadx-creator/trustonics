import { readFile, writeFile, access } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
if (process.env.VERCEL || process.env.NODE_ENV === "production")
  throw new Error("Local setup is development-only.");
try {
  await access(".env.local");
} catch {
  await writeFile(
    ".env.local",
    `LOCAL_DATABASE=1\nPGLITE_DIR=.data/postgres\nAUTH_SECRET=${randomBytes(48).toString("base64url")}\nAUTH_URL=http://localhost:3000\nAPP_URL=http://localhost:3000\nNEXT_PUBLIC_TRUSTONICS_WHATSAPP=\n`,
    { mode: 0o600 },
  );
}
config({ path: ".env.local", quiet: true });
if (process.env.DATABASE_URL)
  throw new Error("Use admin:create for an external database.");
const { migrate } = await import("./migration-lib");
const { getDb, closeDb } = await import("../lib/db");
const { users } = await import("../lib/db/schema");
const { hashPassword } = await import("../lib/password");
try {
  await migrate();
  const existing = await getDb().select({ id: users.id }).from(users).limit(1);
  if (!existing.length) {
    const password = randomBytes(18).toString("base64url");
    await getDb()
      .insert(users)
      .values({
        email: "admin@trustonics.local",
        name: "Local administrator",
        password_hash: await hashPassword(password),
      });
    await writeFile(
      ".local-admin.txt",
      `Local development only\nEmail: admin@trustonics.local\nPassword: ${password}\n`,
      { mode: 0o600 },
    );
  }
  console.log(
    "Local database ready. Your generated login is in .local-admin.txt. No demo requests or prices were added.",
  );
} finally {
  await closeDb();
}
