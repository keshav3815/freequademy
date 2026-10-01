# Runbook — api.freequademy.com gateway (Cloudflare Worker, free plan)

Code: `gateway/` (tests: `gateway/src/gateway.test.ts`). Free plan limit: 100,000 requests/day; beyond that requests fail until the next day, so watch the Workers dashboard as usage grows.

## First deployment (owner actions, all free)

1. Cloudflare account (free). Add the `freequademy.com` zone and switch the domain's nameservers to Cloudflare at the registrar. **UNKNOWN — REQUIRES VERIFICATION:** who controls the domain registrar today.
2. `cd gateway && npx wrangler login`.
3. Staging: edit `SUPABASE_ORIGIN` under `[env.staging.vars]` to the staging project URL, then
   `npx wrangler secret put SUPABASE_ANON_KEY --env staging` and `npx wrangler deploy --env staging`.
   `custom_domain = true` creates the DNS record and TLS certificate for `api-staging.freequademy.com`.
4. Smoke test: `curl -i https://api-staging.freequademy.com/v1/health` → 200 with `x-request-id`.
5. Point Vercel **Preview** `VITE_SUPABASE_URL` at `https://api-staging.freequademy.com`; run E2E against a preview.
6. Production: `npx wrangler secret put SUPABASE_ANON_KEY --env production`, `npx wrangler deploy --env production`, then switch Vercel **Production** `VITE_SUPABASE_URL` to `https://api.freequademy.com` and redeploy.
7. Supabase Auth → URL configuration: nothing changes (Site URL and redirects point at the web app, not the API).

## Rate limiting (free)

Cloudflare free plans include one WAF rate-limiting rule: Security → WAF → Rate limiting rules → `URI Path starts with /auth/v1/` — 30 requests / 10 s per IP → Block 60 s. Per-user limits live in the database (`private.enforce_rate_limit`, AI quota).

## Rollback

Switch Vercel `VITE_SUPABASE_URL` back to `https://<ref>.supabase.co` and redeploy. The gateway holds no state.

## If *.supabase.co is blocked again

Nothing to do for clients already on `api.freequademy.com`: the Worker reaches Supabase from Cloudflare's network, not from the user's ISP.
