# Phase 1 verification

Verified on 4 October 2026.

## Passed

- `npm run setup:local`: clean migration and randomly generated local admin credentials; no seeded business data.
- `npm run typecheck` and `npm run build`: successful TypeScript check and optimized Next.js production build.
- `npm test`: 31 tests pass across three suites.
  - 13 validation/status/WhatsApp context tests.
  - 12 database, immutability, lifecycle, rate-limit, password and persistence tests.
  - 6 API and real Auth.js session tests, including unauthenticated access rejection, authenticated admin mutation and deactivated-admin rejection.
- Playwright's real HTTP API test: anonymous admin mutation rejected (401), cross-origin submission rejected (403), public GET request collection rejected (405).
- Browser visual inspection: homepage and request page render with the intended typography, layout and branding. No business WhatsApp button is rendered without a configured number.
- Playwright test discovery: ten desktop/mobile cases are registered.

## Environment limitations — not claimed as passing

Full browser interaction and mobile UI testing could not be completed here. The supervised preview rendered pages but its restricted runtime caused Next development memory-stat errors and prevented reliable form hydration. The standalone Playwright runner started the app and passed its HTTP API test, but browser launch failed because the Chromium executable was unavailable. Installing the browser returned an invalid download archive.

Consequently, the browser-driven customer submission, admin UI edits, mobile touch layout, and configured WhatsApp button flows remain unverified. Their underlying route handlers, authentication and database operations pass the automated API/database tests. Run the included Playwright suite on a normal development machine before production launch.

## Deployment status

Source delivery only. No live Vercel deployment or external managed PostgreSQL instance was provisioned. External PostgreSQL behavior has not been tested against a hosted service; SQL migrations and application queries were verified on embedded PostgreSQL (PGlite). Production requires the environment and administrator setup documented in README.md.

AI estimates, priced builders, expert estimate overrides, tracking and notifications were intentionally excluded under the Phase 1 instruction and are not represented as completed.

## Production retry — 2026-10-05
Deployment 6ac3b8e4237ff55ae45c4189 published successfully. TypeScript validation passed. Public request form reaches review, but production submission still returns a generic error. Added sanitized database error-code logging and a 10-second database connection timeout. Database connectivity and admin workflow remain unverified; Netlify log access is blocked by a failed Google sign-in (502). Do not treat this deployment as ready for customer intake.
