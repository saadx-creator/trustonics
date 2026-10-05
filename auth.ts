import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { loginSchema } from "@/lib/validation";
import { verifyPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/security";
export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  trustHost: !!process.env.AUTH_URL,
  providers: [
    Credentials({
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials, request) {
        const result = loginSchema.safeParse(credentials);
        if (!result.success) return null;
        try {
          await rateLimit("login-ip", clientIp(request), 10, 15 * 60);
          const [user] = await getDb()
            .select()
            .from(users)
            .where(eq(users.email, result.data.email))
            .limit(1);
          // Run scrypt even for an unknown user to reduce account-enumeration timing differences.
          const valid = await verifyPassword(
            result.data.password,
            user?.password_hash ||
              "scrypt:00000000000000000000000000000000:" + "00".repeat(64),
          );
          if (!user?.active || user.role !== "ADMIN" || !valid) return null;
          return { id: user.id, name: user.name, email: user.email };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.adminId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = String(token.adminId || "");
      return session;
    },
  },
  logger: {
    error() {
      console.error("Administrator authentication failed.");
    },
  },
});
