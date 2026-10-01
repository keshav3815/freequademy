# Runbook — scale on evidence (Phase 6)

Nothing is scaled in advance. Each trigger below is read from data the system already collects (Admin → System health, Supabase usage page, Cloudflare Workers dashboard, `load/k6-dashboard.js` against staging).

| Signal | Threshold | Free-tier action first | Only then (costs money — needs owner approval) |
|---|---|---|---|
| Database size (Supabase Free cap 500 MB) | > 400 MB | Purge old telemetry/jobs sooner; archive old `xp_events`/`ai_usage_daily` | Supabase Pro |
| Monthly active users (Free cap 50,000) | > 40,000 | — | Supabase Pro |
| Dashboard LCP p75 on 4G (RUM) | > 2,500 ms for 7 days | Profile with `pg_stat_statements`; add indexes; precompute summaries via jobs | Larger compute |
| Read-model p95 in k6 at 50 users (staging) | > 500 ms | Same as above | Read replicas (paid plans only) |
| Gateway requests | > 80,000/day (free cap 100,000) | Raise public cache TTL; serve static content from Vercel CDN | Workers Paid |
| Dead-lettered jobs | any, repeatedly | Fix handler; lower batch size | More workers |
| Edge Function invocations | > 400,000/month (free 500,000) | Move hot paths to PostgREST + read models | Supabase Pro |
| Android app | approved project | Consume `/v1` as-is | — |

## Baseline (2026-10-01, local laptop, not India network)

k6, 50 virtual users for 80 s against `get_student_dashboard()` on the local stack: **36,902 calls, 0 failures, median 38.7 ms, p95 163.5 ms, ~461 calls/s**. Repeat on staging from an Indian location before any scaling decision.
