import { z } from "zod";
export const requestTypes = [
  "NEED_BASED",
  "EXACT_MODEL",
  "CUSTOM_BUILD",
] as const;
export const sources = [
  "WEBSITE_FORM",
  "WEBSITE_BUILDER",
  "WHATSAPP_DIRECT",
] as const;
export const statuses = [
  "NEW",
  "CONTACTED",
  "IN_PROGRESS",
  "QUOTED",
  "CLOSED_WON",
  "CLOSED_LOST",
  "CANCELLED",
] as const;
export type Status = (typeof statuses)[number];
export const statusLabels: Record<Status, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  IN_PROGRESS: "In progress",
  QUOTED: "Quoted",
  CLOSED_WON: "Closed · won",
  CLOSED_LOST: "Closed · lost",
  CANCELLED: "Cancelled",
};
export const typeLabels = {
  NEED_BASED: "Need-based",
  EXACT_MODEL: "Exact model",
  CUSTOM_BUILD: "Custom build",
};
export const sourceLabels = {
  WEBSITE_FORM: "Website form",
  WEBSITE_BUILDER: "Build request",
  WHATSAPP_DIRECT: "WhatsApp direct",
};
const transitions: Record<Status, readonly Status[]> = {
  NEW: ["CONTACTED", "CANCELLED"],
  CONTACTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["QUOTED", "CANCELLED"],
  QUOTED: ["CLOSED_WON", "CLOSED_LOST", "CANCELLED"],
  CLOSED_WON: ["CANCELLED"],
  CLOSED_LOST: ["CANCELLED"],
  CANCELLED: [],
};
export function nextStatuses(status: Status) {
  return transitions[status];
}
export function canTransition(from: Status, to: Status) {
  return transitions[from].includes(to);
}
export function normalizePhone(value: string) {
  let digits = value.replace(/[\s()+.-]/g, "");
  if (digits.startsWith("0092")) digits = digits.slice(2);
  if (/^03\d{9}$/.test(digits)) digits = "92" + digits.slice(1);
  return digits;
}
export const phoneSchema = z
  .string()
  .max(32)
  .transform(normalizePhone)
  .refine(
    (v) =>
      /^[1-9]\d{7,14}$/.test(v) &&
      (!v.startsWith("92") || /^923\d{9}$/.test(v)),
    "Enter a valid WhatsApp number, such as 0300 1234567.",
  );
const money = z.number().int().min(0).max(100_000_000).optional();
export const detailsSchema = z
  .object({
    request_type: z.enum(requestTypes),
    original_message: z
      .string()
      .min(10, "Please describe your request in at least 10 characters.")
      .max(5000)
      .refine((v) => v.trim().length >= 10, "Please add a little more detail."),
    budget_min: money,
    budget_max: money,
    condition: z.enum(["NEW", "USED", "EITHER"]),
    city: z.string().trim().min(2, "Enter your city.").max(100),
  })
  .strict()
  .refine(
    (v) =>
      v.budget_min === undefined ||
      v.budget_max === undefined ||
      v.budget_min <= v.budget_max,
    {
      message: "Maximum budget must be at least the minimum budget.",
      path: ["budget_max"],
    },
  );
export const contactSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name.").max(100),
    whatsapp: phoneSchema,
    email: z.union([z.literal(""), z.email()]).optional(),
    preferred_contact_method: z.enum(["WHATSAPP", "EMAIL", "PHONE"]),
    consent_given: z.literal(true, {
      error: "Please agree to be contacted about this request.",
    }),
  })
  .strict()
  .refine((v) => v.preferred_contact_method !== "EMAIL" || !!v.email, {
    message: "Add an email address or choose another contact method.",
    path: ["email"],
  });
export const requestSchema = z
  .object({
    details: detailsSchema,
    contact: contactSchema,
    submission_key: z.uuid(),
  })
  .strict();
export type RequestInput = z.infer<typeof requestSchema>;
export const requirementKeys = [
  "cpu",
  "gpu",
  "ram",
  "ram_type",
  "storage",
  "display",
  "screen_size",
  "resolution",
  "portability",
  "gaming",
  "other",
] as const;
export const requirementsSchema = z
  .object(
    Object.fromEntries(
      requirementKeys.map((key) => [
        key,
        z
          .string()
          .trim()
          .max(key === "other" ? 2000 : 200)
          .optional(),
      ]),
    ) as Record<(typeof requirementKeys)[number], z.ZodOptional<z.ZodString>>,
  )
  .strict();
export const mutationSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("status"),
      status: z.enum(statuses),
      reason: z.string().trim().max(1000).optional(),
      version: z.number().int().min(0),
    })
    .strict(),
  z
    .object({
      action: z.literal("requirements"),
      requirements: requirementsSchema,
      version: z.number().int().min(0),
    })
    .strict(),
  z
    .object({
      action: z.literal("assign"),
      assigned_to: z.uuid().nullable(),
      version: z.number().int().min(0),
    })
    .strict(),
  z
    .object({
      action: z.literal("note"),
      note: z.string().trim().min(1).max(5000),
    })
    .strict(),
]);
export const manualSchema = z
  .object({
    request: requestSchema,
    note: z.string().trim().max(5000).optional(),
  })
  .strict();
export const loginSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(256),
});
