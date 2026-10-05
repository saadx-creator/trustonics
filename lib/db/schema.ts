import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
export const statusEnum = pgEnum("request_status", [
  "NEW",
  "CONTACTED",
  "IN_PROGRESS",
  "QUOTED",
  "CLOSED_WON",
  "CLOSED_LOST",
  "CANCELLED",
]);
export const typeEnum = pgEnum("request_type", [
  "NEED_BASED",
  "EXACT_MODEL",
  "CUSTOM_BUILD",
]);
export const sourceEnum = pgEnum("request_source", [
  "WEBSITE_FORM",
  "WEBSITE_BUILDER",
  "WHATSAPP_DIRECT",
]);
const created = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  name: text().notNull(),
  password_hash: text().notNull(),
  role: text().notNull().default("ADMIN"),
  active: boolean().notNull().default(true),
  created_at: created(),
});
export const customers = pgTable("customers", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  whatsapp: text().notNull(),
  email: text(),
  city: text().notNull(),
  preferred_contact_method: text().notNull(),
  consent_given: boolean().notNull(),
  created_at: created(),
});
export const requests = pgTable(
  "requests",
  {
    id: uuid().primaryKey().defaultRandom(),
    public_ref: text()
      .notNull()
      .unique()
      .default(sql`'TR-' || lpad(nextval('request_ref_seq')::text, 6, '0')`),
    tracking_token: text().notNull().unique(),
    submission_key: uuid().notNull().unique(),
    source: sourceEnum().notNull(),
    customer_id: uuid()
      .notNull()
      .references(() => customers.id),
    request_type: typeEnum().notNull(),
    original_message: text().notNull(),
    budget_min: integer(),
    budget_max: integer(),
    condition: text().notNull(),
    status: statusEnum().notNull().default("NEW"),
    assigned_to: uuid().references(() => users.id),
    version: integer().notNull().default(0),
    created_at: created(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("requests_status_idx").on(t.status),
    index("requests_source_idx").on(t.source),
    index("requests_created_idx").on(t.created_at),
  ],
);
export const requirements = pgTable("request_requirements", {
  request_id: uuid()
    .primaryKey()
    .references(() => requests.id),
  cpu: text(),
  gpu: text(),
  ram: text(),
  ram_type: text(),
  storage: text(),
  display: text(),
  screen_size: text(),
  resolution: text(),
  portability: text(),
  gaming: text(),
  other: text(),
});
export const statusHistory = pgTable("status_history", {
  id: uuid().primaryKey().defaultRandom(),
  request_id: uuid()
    .notNull()
    .references(() => requests.id),
  from_status: statusEnum(),
  to_status: statusEnum().notNull(),
  changed_by: uuid().references(() => users.id),
  reason: text(),
  created_at: created(),
});
export const adminNotes = pgTable("admin_notes", {
  id: uuid().primaryKey().defaultRandom(),
  request_id: uuid()
    .notNull()
    .references(() => requests.id),
  author: uuid()
    .notNull()
    .references(() => users.id),
  note: text().notNull(),
  created_at: created(),
});
export const rateLimits = pgTable("rate_limits", {
  key: text().primaryKey(),
  hits: integer().notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
});
