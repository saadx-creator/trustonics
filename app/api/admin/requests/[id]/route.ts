import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { mutationSchema } from "@/lib/validation";
import { mutateRequest } from "@/lib/requests";
import {
  errorResponse,
  PublicError,
  readJson,
  requireSameOrigin,
} from "@/lib/security";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const admin = await requireAdmin();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new PublicError("Request not found.", 404);
    const parsed = mutationSchema.safeParse(await readJson(request));
    if (!parsed.success)
      throw new PublicError(
        parsed.error.issues[0]?.message || "Please check your changes.",
      );
    await mutateRequest(id, parsed.data, admin.id);
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
