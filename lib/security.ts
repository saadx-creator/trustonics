import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { rateLimits } from "./db/schema";
export class PublicError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function requireSameOrigin(request: Request) {
  const configured = process.env.APP_URL;
  if (!configured && process.env.NODE_ENV === "production")
    throw new PublicError("Service configuration is incomplete.", 503);
  const expected = new URL(configured || "http://localhost:3000").origin;
  if (request.headers.get("origin") !== expected)
    throw new PublicError(
      "Please submit this form from the Trustonics website.",
      403,
    );
}
export async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new PublicError("Please submit a valid form.", 415);
  if (Number(request.headers.get("content-length") || 0) > 32768)
    throw new PublicError("This request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new PublicError("Please submit a valid form.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 32768) {
      await reader.cancel();
      throw new PublicError("This request is too large.", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new PublicError("Please submit a valid form.");
  }
}
export function clientIp(request: Request) {
  return process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown"
    : process.env.TRUST_PROXY === "1"
      ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown"
      : "local-or-untrusted-proxy";
}
export async function rateLimit(
  namespace: string,
  identity: string,
  limit: number,
  seconds: number,
) {
  const key = createHash("sha256")
    .update(`${namespace}:${identity}`)
    .digest("hex");
  const now = new Date(),
    expires = new Date(now.getTime() + seconds * 1000);
  const [row] = await getDb()
    .insert(rateLimits)
    .values({ key, hits: 1, expires_at: expires })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        hits: sql`CASE WHEN ${rateLimits.expires_at} <= ${now} THEN 1 ELSE ${rateLimits.hits} + 1 END`,
        expires_at: sql`CASE WHEN ${rateLimits.expires_at} <= ${now} THEN ${expires} ELSE ${rateLimits.expires_at} END`,
      },
    })
    .returning();
  if (row.hits > limit)
    throw new PublicError("Too many attempts. Please try again later.", 429);
  // Bounded keys per IP/session; expired keys are cleaned without storing raw IP addresses.
  if (Math.random() < 0.02)
    await getDb().execute(
      sql`DELETE FROM rate_limits WHERE expires_at < now() - interval '1 day'`,
    );
}
export function signedSession(cookie: string | undefined) {
  const secret = process.env.AUTH_SECRET;
  if (!secret)
    throw new PublicError("Service configuration is incomplete.", 503);
  const sign = (id: string) =>
    createHmac("sha256", secret).update(id).digest("hex");
  if (cookie) {
    const [id, mac] = cookie.split(".");
    if (
      /^[a-f0-9]{32}$/.test(id || "") &&
      /^[a-f0-9]{64}$/.test(mac || "") &&
      timingSafeEqual(Buffer.from(mac), Buffer.from(sign(id)))
    )
      return { id, value: cookie };
  }
  const id = randomBytes(16).toString("hex");
  return { id, value: `${id}.${sign(id)}` };
}
export function errorResponse(error: unknown) {
  const status = error instanceof PublicError ? error.status : 503;
  // Never log payloads, contact details, database internals or credentials.
  if (!(error instanceof PublicError))
    {
      let cause: unknown = error;
      const codes: string[] = [];
      for (let i = 0; i < 4 && cause && typeof cause === "object"; i++) {
        const item = cause as { code?: unknown; cause?: unknown };
        if (typeof item.code === "string" && /^[A-Z0-9_]{2,60}$/.test(item.code)) codes.push(item.code);
        cause = item.cause;
      }
      console.error("Trustonics operation failed.", { codes });
    }
  return Response.json(
    {
      error:
        error instanceof PublicError
          ? error.message
          : "Something went wrong while submitting your request. Please try again.",
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
