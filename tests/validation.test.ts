import { describe, it, expect } from "vitest";
import {
  requestSchema,
  canTransition,
  contactSchema,
  mutationSchema,
  normalizePhone,
} from "../lib/validation";
import { businessWhatsApp, safeSummary } from "../lib/whatsapp";
const input = {
  submission_key: crypto.randomUUID(),
  details: {
    request_type: "NEED_BASED",
    original_message: "  Laptop for my university\nKeep this exactly.  ",
    condition: "EITHER",
    city: "Lahore",
  },
  contact: {
    name: "Test Customer",
    whatsapp: "03001234567",
    email: "",
    preferred_contact_method: "WHATSAPP",
    consent_given: true,
  },
};
describe("request contract", () => {
  it("preserves the original text verbatim and normalizes Pakistani phone", () => {
    const out = requestSchema.parse(input);
    expect(out.details.original_message).toBe(input.details.original_message);
    expect(out.contact.whatsapp).toBe("923001234567");
  });
  it("requires identified contact and explicit consent", () => {
    expect(requestSchema.safeParse({ ...input, contact: {} }).success).toBe(
      false,
    );
    expect(
      requestSchema.safeParse({
        ...input,
        contact: { ...input.contact, consent_given: false },
      }).success,
    ).toBe(false);
  });
  it("rejects invalid budgets, infinity, decimal currency and oversized messages", () => {
    for (const details of [
      { budget_min: 200, budget_max: 100 },
      { budget_min: -1 },
      { budget_max: Infinity },
      { budget_min: 1.5 },
      { original_message: "a".repeat(5001) },
    ])
      expect(
        requestSchema.safeParse({
          ...input,
          details: { ...input.details, ...details },
        }).success,
      ).toBe(false);
  });
  it("requires email for email preference", () => {
    expect(
      contactSchema.safeParse({
        ...input.contact,
        preferred_contact_method: "EMAIL",
      }).success,
    ).toBe(false);
  });
  it("rejects forged source, status, tracking token and extra fields", () => {
    for (const key of ["source", "status", "tracking_token"])
      expect(
        requestSchema.safeParse({ ...input, [key]: "injected" }).success,
      ).toBe(false);
  });
  it("allows no budget and no estimate", () => {
    expect(requestSchema.safeParse(input).success).toBe(true);
  });
  it("supports international numbers and rejects malformed Pakistan numbers", () => {
    expect(normalizePhone("+92 300 1234567")).toBe("923001234567");
    expect(
      requestSchema.safeParse({
        ...input,
        contact: { ...input.contact, whatsapp: "92300" },
      }).success,
    ).toBe(false);
  });
});
describe("status policy", () => {
  it("allows the intended workflow", () => {
    expect(canTransition("NEW", "CONTACTED")).toBe(true);
    expect(canTransition("CONTACTED", "IN_PROGRESS")).toBe(true);
    expect(canTransition("IN_PROGRESS", "QUOTED")).toBe(true);
    expect(canTransition("QUOTED", "CLOSED_WON")).toBe(true);
    expect(canTransition("QUOTED", "CLOSED_LOST")).toBe(true);
  });
  it("rejects skipped stages, backward moves and reopening terminal requests", () => {
    expect(canTransition("NEW", "CLOSED_WON")).toBe(false);
    expect(canTransition("CONTACTED", "NEW")).toBe(false);
    expect(canTransition("CLOSED_WON", "NEW")).toBe(false);
    expect(canTransition("CANCELLED", "NEW")).toBe(false);
  });
  it("requires concurrency version and bounded notes", () => {
    expect(
      mutationSchema.safeParse({ action: "status", status: "CONTACTED" })
        .success,
    ).toBe(false);
    expect(
      mutationSchema.safeParse({ action: "note", note: "  " }).success,
    ).toBe(false);
  });
});
describe("WhatsApp context", () => {
  it("hides missing/invalid business numbers", () => {
    expect(businessWhatsApp(undefined)).toBeNull();
    expect(businessWhatsApp("+92")).toBeNull();
  });
  it("encodes request and build summaries", () => {
    const url = businessWhatsApp("923001234567", {
      message: "ThinkPad & Dell?",
    });
    expect(new URL(url!).searchParams.get("text")).toContain(
      "ThinkPad & Dell?",
    );
    expect(
      new URL(
        businessWhatsApp("923001234567", {
          message: "16GB RAM / 512GB SSD",
          build: true,
        })!,
      ).searchParams.get("text"),
    ).toContain("I'd like this build");
  });
  it("omits common personal data and never accepts arbitrary ref/token strings", () => {
    expect(
      safeSummary("Laptop. Email me at test@example.com or +92 300 1234567"),
    ).not.toContain("test@example");
    expect(
      safeSummary("Laptop. Email me at test@example.com or +92 300 1234567"),
    ).not.toContain("1234567");
    expect(
      businessWhatsApp("923001234567", { ref: "secret-token" }),
    ).not.toContain("secret-token");
  });
});
