import { beforeAll, afterAll, it, expect, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDb, closeDb } from "../lib/db";
import { users, requests } from "../lib/db/schema";
import { hashPassword } from "../lib/password";
import { migrate } from "../scripts/migration-lib";
const state = vi.hoisted(() => ({ cookie: "" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: state.cookie }),
  cookies: async () => ({
    get: (name: string) => {
      const item = state.cookie
        .split("; ")
        .find((s) => s.startsWith(name + "="));
      return item ? { value: item.slice(name.length + 1) } : undefined;
    },
  }),
}));
let folder: string,
  publicPost: typeof import("../app/api/requests/route").POST,
  adminPost: typeof import("../app/api/admin/requests/route").POST,
  adminPatch: typeof import("../app/api/admin/requests/[id]/route").PATCH,
  handlers: typeof import("../auth").handlers,
  ref: string,
  id: string;
const input = () => ({
  submission_key: crypto.randomUUID(),
  details: {
    request_type: "NEED_BASED",
    original_message: "API TEST ONLY: Laptop for software development.",
    condition: "EITHER",
    city: "Lahore",
  },
  contact: {
    name: "API Test Customer",
    whatsapp: "03001234567",
    email: "",
    preferred_contact_method: "WHATSAPP",
    consent_given: true,
  },
});
function jsonRequest(
  url: string,
  data: unknown,
  method = "POST",
  origin = "http://localhost:3000",
) {
  return new Request("http://localhost:3000" + url, {
    method,
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(data),
  });
}
beforeAll(async () => {
  folder = await mkdtemp(path.join(tmpdir(), "trustonics-api-"));
  Object.assign(process.env, {
    LOCAL_DATABASE: "1",
    PGLITE_DIR: folder + "/pg",
    DATABASE_URL: "",
    AUTH_SECRET: "automated-test-secret-at-least-32-characters",
    AUTH_URL: "http://localhost:3000",
    APP_URL: "http://localhost:3000",
  });
  await migrate();
  await getDb()
    .insert(users)
    .values({
      name: "API Test Admin",
      email: "api-admin@example.invalid",
      password_hash: await hashPassword("api-test-only-password"),
    });
  ({ POST: publicPost } = await import("../app/api/requests/route"));
  ({ POST: adminPost } = await import("../app/api/admin/requests/route"));
  ({ PATCH: adminPatch } = await import(
    "../app/api/admin/requests/[id]/route"
  ));
  ({ handlers } = await import("../auth"));
});
afterAll(async () => {
  await closeDb();
  await rm(folder, { recursive: true, force: true });
});
it("public endpoint saves requests without leaking private identifiers or contact data", async () => {
  const res = await publicPost(jsonRequest("/api/requests", input()));
  expect(res.status).toBe(201);
  const data = await res.json();
  expect(Object.keys(data)).toEqual(["ref"]);
  ref = data.ref;
  const [row] = await getDb()
    .select()
    .from(requests)
    .where(eq(requests.public_ref, ref));
  id = row.id;
  expect(row.status).toBe("NEW");
});
it("public endpoint rejects anonymous input, forged source, and foreign origin", async () => {
  expect((await publicPost(jsonRequest("/api/requests", {}))).status).toBe(400);
  expect(
    (
      await publicPost(
        jsonRequest("/api/requests", { ...input(), source: "WHATSAPP_DIRECT" }),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await publicPost(
        jsonRequest("/api/requests", input(), "POST", "https://evil.invalid"),
      )
    ).status,
  ).toBe(403);
});
it("admin creation and updates require authentication", async () => {
  expect((await adminPost(jsonRequest("/api/admin/requests", {}))).status).toBe(
    401,
  );
  expect(
    (
      await adminPatch(jsonRequest("/api/admin/requests/" + id, {}, "PATCH"), {
        params: Promise.resolve({ id }),
      })
    ).status,
  ).toBe(401);
});
it("Auth.js performs a real credentials login and returns a usable session", async () => {
  const csrfResponse = await handlers.GET(
    new NextRequest("http://localhost:3000/api/auth/csrf"),
  );
  const csrf = await csrfResponse.json();
  const cookies = csrfResponse.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const response = await handlers.POST(
    new NextRequest("http://localhost:3000/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: cookies,
        "x-auth-return-redirect": "1",
      },
      body: new URLSearchParams({
        email: "api-admin@example.invalid",
        password: "api-test-only-password",
        csrfToken: csrf.csrfToken,
        callbackUrl: "http://localhost:3000/admin",
      }),
    }),
  );
  expect(response.status).toBeLessThan(400);
  state.cookie = response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  expect(state.cookie.includes("authjs.session-token=")).toBe(true);
  const session = await handlers.GET(
    new NextRequest("http://localhost:3000/api/auth/session", {
      headers: { cookie: state.cookie },
    }),
  );
  const data = await session.json();
  expect(data.user.email).toBe("api-admin@example.invalid");
});
it("authenticated admin endpoint updates status and creates a manual lead", async () => {
  const response = await adminPatch(
    jsonRequest(
      "/api/admin/requests/" + id,
      { action: "status", status: "CONTACTED", version: 0 },
      "PATCH",
    ),
    { params: Promise.resolve({ id }) },
  );
  expect(response.status).toBe(200);
  const manual = await adminPost(
    jsonRequest("/api/admin/requests", {
      request: input(),
      note: "Test-only private note",
    }),
  );
  expect(manual.status).toBe(201);
  const data = await manual.json();
  const [row] = await getDb()
    .select()
    .from(requests)
    .where(eq(requests.id, data.id));
  expect(row.source).toBe("WHATSAPP_DIRECT");
});
it("deactivating an admin invalidates authorization even with an existing session", async () => {
  await getDb()
    .update(users)
    .set({ active: false })
    .where(eq(users.email, "api-admin@example.invalid"));
  expect(
    (await adminPost(jsonRequest("/api/admin/requests", { request: input() })))
      .status,
  ).toBe(401);
});
