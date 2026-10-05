import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { getDb, closeDb } from "../lib/db";
import {
  requests,
  customers,
  statusHistory,
  adminNotes,
  requirements,
  users,
} from "../lib/db/schema";
import { migrate } from "../scripts/migration-lib";
import { createRequest, mutateRequest } from "../lib/requests";
import { requestSchema } from "../lib/validation";
import { rateLimit, readJson, requireSameOrigin } from "../lib/security";
import { hashPassword, verifyPassword } from "../lib/password";
let folder: string, adminId: string, requestId: string;
const makeInput = () =>
  requestSchema.parse({
    submission_key: crypto.randomUUID(),
    details: {
      request_type: "NEED_BASED",
      original_message:
        "  Test only: keep original\ntext & <script> as text.  ",
      condition: "EITHER",
      city: "Lahore",
    },
    contact: {
      name: "Automated Test",
      whatsapp: "03001234567",
      email: "",
      preferred_contact_method: "WHATSAPP",
      consent_given: true,
    },
  });
beforeAll(async () => {
  folder = await mkdtemp(path.join(tmpdir(), "trustonics-test-"));
  process.env.LOCAL_DATABASE = "1";
  process.env.PGLITE_DIR = folder + "/pg";
  delete process.env.DATABASE_URL;
  process.env.APP_URL = "http://localhost:3000";
  await migrate();
  await migrate();
  const [admin] = await getDb()
    .insert(users)
    .values({
      email: "automated@test.invalid",
      name: "Test Admin",
      password_hash: await hashPassword("test-password-not-production"),
    })
    .returning();
  adminId = admin.id;
});
afterAll(async () => {
  await closeDb();
  await rm(folder, { recursive: true, force: true });
});
describe("transactional request lifecycle", () => {
  it("stores contact, immutable original, initial history and secure token atomically", async () => {
    const input = makeInput();
    const result = await createRequest(input);
    requestId = result.id;
    const [row] = await getDb()
      .select()
      .from(requests)
      .where(eq(requests.id, result.id));
    expect(row.original_message).toBe(input.details.original_message);
    expect(row.tracking_token).toHaveLength(43);
    expect(row.source).toBe("WEBSITE_FORM");
    expect(row.public_ref).toMatch(/^TR-\d{6}$/);
    expect(
      await getDb()
        .select()
        .from(statusHistory)
        .where(eq(statusHistory.request_id, result.id)),
    ).toHaveLength(1);
  });
  it("deduplicates retries without adding extra customers", async () => {
    const input = makeInput();
    const first = await createRequest(input);
    const countBefore = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(customers);
    const again = await createRequest(input);
    expect(again).toEqual(first);
    expect(
      await getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(customers),
    ).toEqual(countBefore);
  });
  it("rejects direct database edits of the original request", async () => {
    await expect(
      getDb()
        .update(requests)
        .set({ original_message: "Changed original text" })
        .where(eq(requests.id, requestId)),
    ).rejects.toThrow();
  });
  it("updates status/history together and rejects stale writes", async () => {
    await mutateRequest(
      requestId,
      { action: "status", status: "CONTACTED", version: 0 },
      adminId,
    );
    await expect(
      mutateRequest(
        requestId,
        { action: "status", status: "IN_PROGRESS", version: 0 },
        adminId,
      ),
    ).rejects.toThrow("another session");
    expect(
      await getDb()
        .select()
        .from(statusHistory)
        .where(eq(statusHistory.request_id, requestId)),
    ).toHaveLength(2);
  });
  it("enforces transitions server-side", async () => {
    await expect(
      mutateRequest(
        requestId,
        { action: "status", status: "CLOSED_WON", version: 1 },
        adminId,
      ),
    ).rejects.toThrow("not allowed");
  });
  it("assigns valid admins and keeps notes separate from requirements", async () => {
    await mutateRequest(
      requestId,
      { action: "assign", assigned_to: adminId, version: 1 },
      adminId,
    );
    await mutateRequest(
      requestId,
      { action: "requirements", requirements: { ram: "16GB" }, version: 2 },
      adminId,
    );
    await mutateRequest(
      requestId,
      { action: "note", note: "Private test note" },
      adminId,
    );
    const [row] = await getDb()
      .select()
      .from(requirements)
      .where(eq(requirements.request_id, requestId));
    expect(row.ram).toBe("16GB");
    expect(
      await getDb()
        .select()
        .from(adminNotes)
        .where(eq(adminNotes.request_id, requestId)),
    ).toHaveLength(1);
  });
  it("classifies manual and custom-build sources on server", async () => {
    const manual = await createRequest(makeInput(), {
      id: adminId,
      note: "Test only",
    });
    const input = makeInput();
    input.details.request_type = "CUSTOM_BUILD";
    const build = await createRequest(input);
    const [m] = await getDb()
      .select()
      .from(requests)
      .where(eq(requests.id, manual.id));
    const [b] = await getDb()
      .select()
      .from(requests)
      .where(eq(requests.id, build.id));
    expect(m.source).toBe("WHATSAPP_DIRECT");
    expect(b.source).toBe("WEBSITE_BUILDER");
  });
  it("persists across database restart", async () => {
    await closeDb();
    const [row] = await getDb()
      .select()
      .from(requests)
      .where(eq(requests.id, requestId));
    expect(row.status).toBe("CONTACTED");
    expect(row.version).toBe(3);
  });
});
describe("security boundaries", () => {
  it("uses shared rate limits and rejects excess attempts", async () => {
    await rateLimit("test", "identity", 2, 60);
    await rateLimit("test", "identity", 2, 60);
    await expect(rateLimit("test", "identity", 2, 60)).rejects.toThrow(
      "Too many",
    );
  });
  it("rejects foreign or missing origins", () => {
    expect(() =>
      requireSameOrigin(
        new Request("http://localhost:3000/api/requests", {
          headers: { origin: "https://evil.invalid" },
        }),
      ),
    ).toThrow();
    expect(() =>
      requireSameOrigin(new Request("http://localhost:3000/api/requests")),
    ).toThrow();
  });
  it("bounds streamed JSON even without content-length", async () => {
    const request = new Request("http://localhost:3000", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x: "a".repeat(40000) }),
    });
    await expect(readJson(request)).rejects.toThrow("too large");
  });
  it("hashes passwords with salts and rejects incorrect passwords", async () => {
    const hash = await hashPassword("something-long-enough");
    expect(await verifyPassword("something-long-enough", hash)).toBe(true);
    expect(await verifyPassword("incorrect", hash)).toBe(false);
    expect(hash).not.toContain("something-long-enough");
  });
});
