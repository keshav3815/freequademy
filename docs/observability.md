# Observability (Architecture V1, zero-cost)

Everything below runs inside the existing Supabase project and GitHub — no paid or third-party monitoring service. Monitoring data about students stays in the Mumbai region.

| Signal | Collected by | Stored in | Viewed in |
|---|---|---|---|
| Frontend exceptions (render, uncaught, unhandled rejections) | `src/lib/monitoring.ts` → `report_client_error` RPC | `public.client_errors` (30-day retention) | Admin → System health |
| Real-user performance (LCP, INP, CLS, TTFB, FCP; 10% of page loads) | `src/lib/telemetry/vitals.ts` (`web-vitals`) → `report_web_vital` | `public.client_vitals` (30 days) | System health (p50/p75/p95 per route) |
| Background jobs (queue depth, retries, dead letters) | `private.jobs` | — | System health / `get_job_health()` |
| Sensitive actions | triggers → `public.audit_logs` | — | System health (latest 50) |
| Edge Function events | structured JSON `console.log` with `request_id` | Supabase function logs | Supabase dashboard |
| Slow queries | `pg_stat_statements` (enabled) | Postgres | Supabase dashboard → Query performance |
| Request tracing | `x-request-id` from gateway → Edge Functions → `audit_logs.request_id`, `jobs.request_id`, `client_errors.request_id` | — | search by id |

## Privacy rules (students are mostly minors — D7)

Reports are an allow-list: error type, scrubbed message (≤ 300 chars), scrubbed stack (≤ 4,000), route **pattern** (`/tests/:id`, no query string or hash), release, environment, coarse browser and OS names. Never: user id, name, email, phone, IP, cookies, tokens, request bodies, answers, doubt text, full user-agent. Scrubbing happens twice: `src/lib/telemetry/sanitize.ts` (tested with a deliberately dirty error in `sanitize.test.ts`) and `private.scrub_text()` in the database (tested in `018_observability_rate_limits.test.sql`). Reporting is rate-limited per user and globally, and is off unless `VITE_APP_ENV` is set.

## Gaps

- No push alerting: someone has to look at System health. Free option when needed: a scheduled GitHub Action that queries `get_job_health()` / error counts with a service key and opens an issue on threshold breach.
- Uptime: `.github/workflows/uptime.yml` checks the URLs in repository variable `UPTIME_TARGETS` every 15 minutes (enable with `UPTIME_ENABLED=true`); a failed run emails the owner.
