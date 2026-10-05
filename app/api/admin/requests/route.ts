import { requireAdmin } from "@/lib/admin";
import { manualSchema } from "@/lib/validation";
import { createRequest } from "@/lib/requests";
import {
  errorResponse,
  PublicError,
  readJson,
  requireSameOrigin,
} from "@/lib/security";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const admin = await requireAdmin();
    const parsed = manualSchema.safeParse(await readJson(request));
    if (!parsed.success)
      throw new PublicError(
        parsed.error.issues[0]?.message || "Please check the details.",
      );
    const record = await createRequest(parsed.data.request, {
      id: admin.id,
      note: parsed.data.note,
    });
    return Response.json(record, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
