import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requestSchema } from "@/lib/validation";
import { createRequest } from "@/lib/requests";
import {
  clientIp,
  errorResponse,
  PublicError,
  rateLimit,
  readJson,
  requireSameOrigin,
  signedSession,
} from "@/lib/security";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await rateLimit("submit-ip", clientIp(request), 30, 3600);
    const session = signedSession((await cookies()).get("tr-session")?.value);
    await rateLimit("submit-session", session.id, 8, 3600);
    const parsed = requestSchema.safeParse(await readJson(request));
    if (!parsed.success)
      throw new PublicError(
        parsed.error.issues[0]?.message || "Please check your details.",
      );
    const record = await createRequest(parsed.data);
    const response = NextResponse.json(
      { ref: record.ref },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set("tr-session", session.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
