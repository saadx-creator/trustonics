import { auth } from "@/auth";
import { getDb } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import { PublicError } from "./security";
export async function getAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [admin] = await getDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      active: users.active,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  return admin?.active && admin.role === "ADMIN" ? admin : null;
}
export async function requireAdmin() {
  const user = await getAdmin();
  if (!user) throw new PublicError("Please sign in to continue.", 401);
  return user;
}
