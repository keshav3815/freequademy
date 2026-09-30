# Observability

What existed before Phase 6: `console.*` calls only, no error boundary (one render
exception blanked the entire app), no audit trail for admin/moderator actions, and no
way to answer "what failed, for which user, how often". This is what changed and what
is still missing.

## Frontend errors

- `src/components/ErrorBoundary.tsx` wraps the whole app (`src/main.tsx`). A render
  error now shows a recovery screen ("Reload" / "Go home") instead of a blank page.
- `src/lib/monitoring.ts` — `installGlobalErrorHandlers()` (called once in `main.tsx`)
  catches uncaught exceptions and unhandled promise rejections; `reportError()` is
  also called from the boundary's `componentDidCatch`.
- Without `VITE_ERROR_REPORTING_URL` set, `reportError` only `console.error`s — safe
  default for local dev, no external calls.
- To wire up a real tracker: set `VITE_ERROR_REPORTING_URL` to an endpoint that
  accepts a JSON POST (message, stack, path, release, userAgent). Two low-effort
  options, in order of preference:
  1. **Supabase Edge Function** that inserts into a new `client_errors` table
     (service-role write, admin-only read) — keeps everything in the existing
     Supabase project, no new vendor.
  2. **Sentry** (or similar) — richer grouping/alerting, but a new dependency and a
     third-party data destination (review what it captures against the platform's
     minors-focused privacy posture before adopting).
  Rate-limited client-side to 20 reports per page session so a render-loop bug can't
  hammer the endpoint. `path` deliberately excludes the query string (may contain
  tokens); `stack` is capped at 4000 characters.

## Database audit trail

`user_activity_log` (existing table, RLS: admin-read-only) had no writer before this
phase — the admin "User Activity" page always showed zero rows. Phase 1–4 migrations
did not add a writer either; that's still open. **Recommended next step, not yet
done:** a trigger-based writer on the security-sensitive mutations that actually
matter for an audit trail — `approve_mentor_application`, `reject_mentor_application`,
`revoke_mentor_role`, `set_thread_pinned`, moderator deletes on `forum_threads`/
`forum_replies`/`club_posts`, and `answer_escalated_doubt`. Each of those is already a
SECURITY DEFINER RPC (Phases 0–4), so adding `INSERT INTO user_activity_log` at the
end of each function is a small, contained change — deliberately left for whoever
picks up Phase 7+ moderation tooling, since it's product-shaped work (what should the
log show an admin?) rather than a pure safety fix.

## Database query performance

Not configured yet. Supabase's own dashboard exposes `pg_stat_statements` (already in
`shared_preload_libraries` per the local image) for slow-query inspection — that's the
fastest path, no new tooling. `docs/remediation/phase-7-performance.md` covers what
was fixed vs. deferred at the query level.

## What's still a blind spot

- No structured logging in the `doubt-solver` Edge Function beyond `console.log`/
  `console.error` (Supabase captures these in the function logs dashboard, but
  they're not queryable/alertable).
- No uptime/synthetic monitoring.
- No cost/usage dashboard for the AI Gateway beyond the per-user daily quota
  (`ai_usage_daily`) enforced in Phase 0 — that bounds the damage but doesn't surface
  spend trends.
