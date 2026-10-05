# Trustonics v1.3 — Phase 1 implementation plan

## Boundary

Only Phase 1 is implemented. This is a request intake service. No inventory, suppliers, products, orders, payments or financial tracking. AI estimates, price CRUD, interactive priced builders, tracking and notifications belong to later phases. All three entry paths work; the custom-build path collects a written specification until Phase 3. No fictitious prices or seeded business records.

## Architecture

Next.js App Router + React + TypeScript, Tailwind and locally composed shadcn-style Radix primitives. Route handlers validate with Zod; server components read authorized data. Drizzle is the only ORM. Production uses PostgreSQL through pg; credential-free local development uses PGlite (embedded PostgreSQL), the same SQL migration and Drizzle schema. PGlite is disabled on Vercel and without an explicit local flag. No browser storage for customer records.

Auth.js credentials sessions authenticate database-backed ADMIN users with scrypt password hashes. JWTs expire in eight hours; each protected request rechecks the active ADMIN database record. No anonymous admin mode, default password or production bootstrap endpoint.

## Phase 1 schema

- users: UUID, unique email, name, password_hash, role ADMIN, active, created_at.
- customers: UUID, name, whatsapp (normalized international digits), optional email, city, preferred_contact_method, consent_given, created_at.
- requests: UUID, unique sequential public_ref, secure random tracking_token (reserved for Phase 4), unique submission_key, source, customer_id FK, request_type, immutable original_message, optional budget_min/max, condition, status, optional assigned_to FK, version, created_at/updated_at.
- request_requirements: one-to-one request FK, optional CPU/GPU/RAM/RAM type/storage/display/size/resolution/portability/gaming/other.
- status_history: UUID, request FK, from/to status, nullable changed_by (system creation), optional reason, created_at.
- admin_notes: UUID, request FK, author FK, note, created_at.
- rate_limits: opaque hashed key, hits, expires_at. Shared, atomic PostgreSQL throttles, no raw IP storage.

Database constraints and an update trigger protect original_message. Request, customer, requirements and initial history are inserted in one transaction. Status updates use optimistic version checks and row locks, writing history atomically. Assignment targets must be active admins. Public responses contain only a reference; neither customer data nor internal fields are publicly readable.

## Future schema (design only, no premature tables)

Phase 2 adds ai_estimates (provider, model_version, parsed/suggestions JSON, confidence, source, status/error) and expert_estimates (confirmed range/note/author). Preserve the original customer-visible AI snapshot; store admin corrections separately. Phase 3 adds components, laptop_price_bands, laptop_price_adjustments, builder_options and configuration snapshots/items. Phase 4 adds notifications and public token-based projections. Tracking never selects internal notes, contact fields or auth data.

## Routes

- / — brand, three entry cards, how it works, why Trustonics, builder teaser, final CTA.
- /request/need, /request/model — short progressive forms.
- /builder — honest Phase 1 custom-build intake, no invented pricing or nonfunctional selects.
- /confirmation/[ref] — generic acknowledgement, no public customer lookup.
- /admin/login — Auth.js credential login.
- /admin — status/source filters, counts, recent activity, empty state.
- /admin/requests/new — authenticated manual WhatsApp lead entry.
- /admin/requests/[id] — original text, contacts, requirements, notes, assignment and status history.
- POST /api/requests — validated/rate-limited/idempotent public creation.
- POST /api/admin/requests — authorized manual creation.
- PATCH /api/admin/requests/[id] — authorized status/requirements/assignment/note mutations.
- /api/auth/[...nextauth] — Auth.js.

## Components

SiteHeader/SiteFooter, Brand, WhatsAppLink, RequestForm (requirements/contact/review), FormField, SelectField, Checkbox, Button, Confirmation, AdminNavigation, RequestTable, StatusBadge, AdminRequestEditor, LoginForm. Shared validation and status definitions have no server imports. Database, authentication and mutation services stay server-side.

## Workflows

Customer: choose path → original message and optional budget/condition + city → estimate unavailable notice → required contact and consent → review → transaction → reference. Failures keep form values and permit retry. A stable idempotency key avoids duplicate requests during retries. No AI network dependency.
Admin: sign in → filter by status/source → select request → read immutable text → edit parsed requirements/assign → contact through wa.me → advance status/add reason → append private notes. Manual entry uses WHATSAPP_DIRECT server-side. The admin records customer consent rather than silently inventing it.

## Validation and security

Original message 10–5000 chars (preserved verbatim); trimmed name 2–100, city 2–100; Pakistan 03xx/+92/0092 normalized, international E.164 digits accepted; optional valid email required for email preference; budgets optional nonnegative whole PKR, max 100M, min ≤ max; explicit consent required. Zod strict objects, bounded notes/requirements, UUID foreign keys. Only valid forward statuses or cancellation; closed outcomes may be cancelled but cannot reopen. Optional close reason.
All writes require trusted same-origin browser requests; production requires APP_URL. JSON bodies bounded to 32KiB even if Content-Length is omitted. Rate limiting occurs before expensive processing: submission IP + signed session cookie, login IP. Referrer policy prevents URL leakage. Auth pages and admin reads are dynamic/no-store. Public confirmation contains no PII. All user content rendered as text.

## Implementation sequence and verification

1. Scaffold, migration, validation, repository; test validation/status guards.
2. Customer wizard and idempotent transactional submission; browser-test exact text/contact/review/confirmation and submission without estimates.
3. Auth and admin dashboard/manual entry/detail; browser-test unauthorized access, updates/history/notes/assignment and source filters.
4. Mobile viewport, business WhatsApp config on/off/context encoding, no overlay obstruction, PostgreSQL migration/restart persistence, typecheck and production build.

## Operational notes

Local setup generates a private admin password and Auth.js secret; neither is distributed. Production requires DATABASE_URL, AUTH_SECRET, APP_URL, AUTH_URL and an admin created by the CLI. Apply migrations before serving. No live deployment is implied by a successful local build. PGlite is single-process development storage, not a serverless production database. Auth.js v5 beta is pinned; review release stability before launch. No messages are sent in Phase 1.
