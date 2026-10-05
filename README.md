# TRUSTONICS — Phase 1

**JUST TELL US. WE'LL HANDLE THE REST.**

A request-based laptop and PC service for Pakistan, implemented from specification v1.3. This delivery deliberately stops at Phase 1.

## Included

- Responsive homepage and three intake paths: need-based, exact model and written custom-build request.
- Progressive requirements → contact/consent → review → confirmation flow.
- Required identity, WhatsApp and city; optional budgets/email; no anonymous submissions.
- Verbatim original request storage with database-level immutability.
- PostgreSQL transactions, secure random reserved tracking tokens, sequential public references and retry deduplication.
- Auth.js administrator login with salted scrypt passwords and active-role checks on every protected operation.
- Dashboard with status/source filters, counts, pagination, recent activity and empty states.
- Request detail, editable requirements, assignment, private notes and complete status history.
- Manual WhatsApp lead entry with server-controlled `WHATSAPP_DIRECT` source.
- Configurable `wa.me` links. All business chat buttons disappear when no number is configured. No messages are sent automatically.
- Shared database-backed submission/login throttles, strict Zod input validation, origin checks and bounded JSON bodies.
- Drizzle as the only ORM. Production PostgreSQL and credential-free local embedded PostgreSQL use the same migration.

## Intentionally deferred

Phase 2: Gemini, AI estimates, expert-confirmed ranges and estimate overrides.

Phase 3: interactive desktop/laptop builders, deterministic pricing, price data CRUD and compatibility checks.

Phase 4: token-based tracking pages and notification providers/logs.

The build request route currently accepts a written specification. The homepage does not promise instant estimates while they are unavailable. Confirmation shows a request reference, not a nonfunctional tracking link. No fabricated products, market prices, stock, suppliers or business leads are included.

## Local setup

Node.js 22.13+ or 24 and npm are recommended. No external database, AI, email or WhatsApp credentials are needed.

```bash
npm ci
npm run setup:local
npm run dev
```

Visit `http://localhost:3000` and `/admin` for the team workspace.

`setup:local` creates:

- `.env.local` with a random Auth.js secret and local-only configuration.
- `.data/postgres`, the embedded PostgreSQL database.
- `.local-admin.txt`, a generated administrator login with a random password.

Read `.local-admin.txt` locally to sign in. Both credential files are ignored by Git and excluded from this source package. Do not publish them. Running setup again does not reset existing data or credentials. Stop the development server before running migration or admin CLI commands against the local database; PGlite is single-process storage.

The setup creates no demonstration requests or prices.

### Optional direct WhatsApp chat

Set the actual business number in `.env.local`:

```dotenv
NEXT_PUBLIC_TRUSTONICS_WHATSAPP=YOUR_INTERNATIONAL_DIGITS_ONLY_NUMBER
```

Use digits only, without `+`, spaces or punctuation. Restart development after changing it; rebuild in production. Until a valid number is supplied, the buttons remain hidden. Links include a short requirements summary or public request reference, never a tracking token. Common email/phone patterns in free text are redacted. Customer contact fields are never appended to business chat links. The floating button is on the homepage only; form pages use an inline link so submission cannot be obstructed.

## Production deployment (Vercel-compatible; not deployed)

1. Provision managed PostgreSQL and obtain its TLS connection string.
2. Set `DATABASE_URL`, a unique random `AUTH_SECRET`, `APP_URL=https://your-domain`, and `AUTH_URL=https://your-domain`.
3. Remove `LOCAL_DATABASE` and `PGLITE_DIR` in production. Vercel explicitly refuses embedded local storage.
4. Optionally configure the real business WhatsApp number before building.
5. Apply `npm run db:migrate` against the production database from a trusted environment.
6. Create an admin with `npm run admin:create`, supplying JSON on stdin with `email`, `name`, and a unique password of at least 14 characters. Do not put passwords in shell arguments or source control. Finish stdin with EOF.
7. Run `npm run build` and deploy as a standard Next.js project. Vercel detects the framework. There is no dependency on Sites hosting.

Configure `APP_URL` to match the exact site origin visitors use. Requests from other origins fail closed. Preview domains need their own matching environment configuration. Behind Vercel, the platform's forwarded IP is used for throttling; on another host, enable `TRUST_PROXY=1` only when the proxy overwrites forwarded headers. Otherwise one conservative shared IP bucket is used.

Use a connection pool appropriate to the chosen Postgres provider. The application caps each process at five PostgreSQL connections. Database migrations are explicit, versioned and transactional. No migration is run automatically during a serverless request.

`robots` metadata currently prevents indexing during Phase 1 review. Change it deliberately before a public launch. Auth.js v5 beta is pinned to `5.0.0-beta.32`; review stability and dependency updates before launch. The CSP permits inline Next.js bootstrap scripts; a nonce-based CSP can be added during launch hardening.

## Commands

```bash
npm run typecheck
npm test
npm run build
npx playwright install chromium --only-shell
npm run test:e2e
# POSIX shell: verify configured business WhatsApp links with test-only number
E2E_WHATSAPP=1 npm run test:e2e
```

Vitest covers validation, immutable text, idempotency, transaction/status behavior, persistence, authorization, real Auth.js credential sessions and API responses. Playwright defines desktop and Pixel 7 customer/admin workflows, manual entry, WhatsApp conditional rendering and API security checks.

Playwright starts a disposable database and test-only administrator automatically, binds to loopback port 3100, sends no real notifications and removes its test database on shutdown. It never connects to `DATABASE_URL`. Stop other Next development servers for this checkout before running it, because Next uses a checkout-level development lock. Test credentials exist only for the disposable test environment.

See [docs/VERIFICATION.md](docs/VERIFICATION.md) for what ran successfully and which checks were blocked in this execution environment.

## Project guide

- `docs/ARCHITECTURE.md` — architecture, normalized schema, routes/components, workflows, validation and implementation sequence.
- `lib/db/schema.ts`, `migrations/0001_phase1.sql` — Drizzle schema and PostgreSQL migration.
- `lib/requests.ts` — transactional creation and admin mutations.
- `lib/validation.ts`, `lib/security.ts` — input contracts, transition policy and security controls.
- `auth.ts`, `lib/admin.ts` — authentication and authorization.
- `components/request-form.tsx` — progressive customer/manual intake.
- `app/admin/(protected)` — authenticated workspace.
- `tests` — unit, database, API and browser test suites.

No customer accounts, payments, orders, inventory, suppliers, device verification, scraping, sourcing automation or delivery tracking are implemented.
