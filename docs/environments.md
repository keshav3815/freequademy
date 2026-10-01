# Environments

Freequademy uses one Supabase project per environment. Application code reads its
connection settings from environment variables only (`src/integrations/supabase/client.ts`).

```text
Local development ──► local Supabase (`supabase start`) or the STAGING project
Preview / staging  ──► STAGING Supabase project
Production         ──► PRODUCTION Supabase project
```

| Variable | Where it is set | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env.development.local` locally; Vercel env vars per environment | Public |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | same | Publishable/anon key. Public by design; access is governed by RLS |
| `VITE_SUPABASE_PROJECT_ID` | same | Informational |
| `LOVABLE_API_KEY` | Supabase Edge Function secrets (per project) | Never in the frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | Provided to Edge Functions by Supabase | Never in the frontend or in `.env*` files |

## Local setup

1. `cp .env.example .env.development.local` and fill in a **local or staging** project.
   `*.local` files are git-ignored and override `.env`.
2. `npm run dev`. The dev server logs a warning if it is pointed at the production project.

The committed `.env` currently still holds the production URL and publishable key. The
production build depends on it until the same variables are configured in the Vercel
project settings. After that, `.env` should be removed from git. That is a production
configuration change, so it was not made automatically.

## Database changes

- Write migrations in `supabase/migrations/` (`<timestamp>_<uuid>.sql`).
- Run `scripts/test-db.sh`. It applies every migration to a disposable local Postgres and
  runs the pgTAP suite in `supabase/tests/database/`.
- Apply migrations to **staging** first (`supabase link --project-ref <staging>` then
  `supabase db push`), verify, and only then promote to production.

## Using `supabase start` on this machine

Another local Supabase stack may already occupy the default ports (54321–54324). Either stop
it first or change the `[api]`, `[db]` and `[studio]` ports in a local copy of
`supabase/config.toml`.
