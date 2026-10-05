import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./db";
import {
  adminNotes,
  customers,
  requests,
  requirements,
  statusHistory,
  users,
} from "./db/schema";
import { canTransition, mutationSchema, type RequestInput } from "./validation";
import { PublicError } from "./security";
export async function createRequest(
  input: RequestInput,
  admin?: { id: string; note?: string },
) {
  const db = getDb();
  return db.transaction(async (tx) => {
    // Serialize identical submission keys across processes so retries cannot orphan customers.
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${input.submission_key}))`,
    );
    const [existing] = await tx
      .select({ ref: requests.public_ref, id: requests.id })
      .from(requests)
      .where(eq(requests.submission_key, input.submission_key))
      .limit(1);
    if (existing) return existing;
    const [customer] = await tx
      .insert(customers)
      .values({
        ...input.contact,
        email: input.contact.email || null,
        city: input.details.city,
      })
      .returning({ id: customers.id });
    const { city, ...details } = input.details;
    const [record] = await tx
      .insert(requests)
      .values({
        ...details,
        customer_id: customer.id,
        submission_key: input.submission_key,
        tracking_token: randomBytes(32).toString("base64url"),
        source: admin
          ? "WHATSAPP_DIRECT"
          : details.request_type === "CUSTOM_BUILD"
            ? "WEBSITE_BUILDER"
            : "WEBSITE_FORM",
      })
      .returning({ id: requests.id, ref: requests.public_ref });
    await tx.insert(requirements).values({ request_id: record.id });
    await tx
      .insert(statusHistory)
      .values({
        request_id: record.id,
        to_status: "NEW",
        changed_by: admin?.id || null,
      });
    if (admin?.note)
      await tx
        .insert(adminNotes)
        .values({ request_id: record.id, author: admin.id, note: admin.note });
    return record;
  });
}
export async function mutateRequest(
  id: string,
  input: z.infer<typeof mutationSchema>,
  actor: string,
) {
  await getDb().transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(requests)
      .where(eq(requests.id, id))
      .for("update");
    if (!record) throw new PublicError("Request not found.", 404);
    if (input.action !== "note" && input.version !== record.version)
      throw new PublicError(
        "This request changed in another session. Refresh and try again.",
        409,
      );
    const touch = { version: record.version + 1, updated_at: new Date() };
    if (input.action === "status") {
      if (!canTransition(record.status, input.status))
        throw new PublicError("This status change is not allowed.");
      await tx
        .update(requests)
        .set({ ...touch, status: input.status })
        .where(eq(requests.id, id));
      await tx
        .insert(statusHistory)
        .values({
          request_id: id,
          from_status: record.status,
          to_status: input.status,
          changed_by: actor,
          reason: input.reason || null,
        });
    } else if (input.action === "requirements") {
      await tx
        .update(requirements)
        .set(input.requirements)
        .where(eq(requirements.request_id, id));
      await tx.update(requests).set(touch).where(eq(requests.id, id));
    } else if (input.action === "assign") {
      if (input.assigned_to) {
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, input.assigned_to));
        if (!user?.active || user.role !== "ADMIN")
          throw new PublicError("Choose an active administrator.");
      }
      await tx
        .update(requests)
        .set({ ...touch, assigned_to: input.assigned_to })
        .where(eq(requests.id, id));
    } else {
      await tx
        .insert(adminNotes)
        .values({ request_id: id, author: actor, note: input.note });
      await tx
        .update(requests)
        .set({ updated_at: new Date() })
        .where(eq(requests.id, id));
    }
  });
}
