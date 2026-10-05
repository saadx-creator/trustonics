# Vercel deployment

Project: trustonics. Connected production branch: main.

Configure DATABASE_URL and AUTH_SECRET as sensitive environment variables. APP_URL and AUTH_URL must match the production site origin. LOCAL_DATABASE must be 0. Never commit credentials.

The Supabase Phase 1 migration is already applied. Do not recreate the database or administrator during deployments.

Production request submission and admin access must be verified before customer launch. Phase 2–4 features remain deferred.
