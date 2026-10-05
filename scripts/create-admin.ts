import { config } from "dotenv";
import { z } from "zod";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
// Read JSON from stdin to avoid passwords in shell arguments or process listings.
let input = "";
for await (const chunk of process.stdin) {
  input += chunk;
  if (input.length > 4096) throw new Error("Input too large.");
}
const user = z
  .object({
    email: z.email().transform((v) => v.toLowerCase()),
    name: z.string().min(2).max(100),
    password: z.string().min(14).max(256),
  })
  .parse(JSON.parse(input));
const { getDb, closeDb } = await import("../lib/db");
const { users } = await import("../lib/db/schema");
const { hashPassword } = await import("../lib/password");
try {
  await getDb()
    .insert(users)
    .values({
      email: user.email,
      name: user.name,
      password_hash: await hashPassword(user.password),
    });
  console.log("Admin created.");
} finally {
  await closeDb();
}
