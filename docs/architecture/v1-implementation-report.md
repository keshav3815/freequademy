# Freequademy Architecture V1.0 — implementation report and final audit

**Date:** 2026-10-01 · **Branch:** `architecture/v1-phase-0` · **Draft PR:** #1 (DO NOT MERGE) · **Constraint:** zero cost — free and open-source only (owner decision 2026-10-01).

**Bottom line:** all six phases are **built and tested on the branch**; **none of it is live in production yet**. Production go-live is gated on four owner actions (Lovable revocation, production inventory, a free staging slot, `SUPABASE_DB_URL` secret) and on reconciling production's migration history. Nothing below is marked PASS without a test or a run behind it.

## What changed because of the zero-cost rule

| Original plan (paid) | Built instead (free) |
|---|---|
| Supabase Pro backups + PITR | Nightly encrypted logical backups in GitHub Actions + weekly automated restore drill (`backup.yml`, `restore-drill.yml`) |
| Sentry SaaS | Own `client_errors` / `client_vitals` tables + scrubbing RPCs + admin System health page |
| Extra paid staging project | No hosted staging (free plan holds 2 projects; owner keeps `APC`). Staging = local Docker stack + CI throwaway stacks; Vercel Preview builds refuse to connect to production (`src/lib/environment.ts`) |
| Supabase custom-domain add-on | Cloudflare Worker gateway on the free plan |
| Lovable AI Gateway (paid credits) | Provider-agnostic `AIProvider` (any OpenAI-compatible endpoint, e.g. a free tier); Lovable key kept only as last-resort fallback |
| Paid uptime/alerting | Scheduled GitHub Action; a failed run emails the owner |

## Phase status

### Phase 0 — protect · PARTIAL
- **Completed:** fake-payment functions deleted from production (404 verified); all work committed and pushed; CI with secret scanning; `get_user_counts` locked; flaky test fixed; test DB pinned to production's Postgres; free backup + restore drill built and **drill passed on local data** (61 tables, 1,368 rows, 0 mismatches, 61 FKs with 0 orphans, 6 s); free monitoring replacing Sentry; uptime workflow; deploy workflow with approval gate.
- **Blocked:** Lovable revocation evidence; production inventory + Auth settings; staging (free slot); production backup (needs `SUPABASE_DB_URL` secret); production migration history reconciliation.

### Phase 1 — API domain · PARTIAL
- **Completed:** Cloudflare Worker gateway (`gateway/`): routes `/v1/*` to the `api` function and `/auth|rest|storage|functions|realtime/v1/*` to Supabase; request IDs; anonymous-only public caching; CORS allow-list with Vercel-preview wildcard; 16 tests; tsc clean. CSP allows the API domains. Production is already in Mumbai (verified), so no region migration is needed.
- **Blocked:** Cloudflare account + `freequademy.com` DNS (owner); deploy per `runbooks/gateway.md`.

### Phase 2 — performance · PARTIAL
- **Completed:** `get_student_dashboard()` read model replaces ~14 browser round trips with 1 bounded call, per-section error isolation, SECURITY INVOKER (RLS still applies); 14 pgTAP assertions incl. parity with the replaced RPCs and cross-user isolation. 25 foreign-key indexes. Main JS bundle 418.9 kB → 348.9 kB (gzip 130.6 → 108.4 kB) by loading sonner/tooltips only where used. Real-user Web Vitals (sampled 10%). k6 load test: 36,902 calls, 0 failures, p95 163.5 ms at 50 users (local).
- **Not done:** the gate "dashboard < 1 s on 4G in India" needs production RUM data, which needs deployment. RLS `(select auth.uid())` rewrite of 107 policies deliberately not done without query evidence.

### Phase 3 — service layer · PARTIAL
- **Completed:** `api` Edge Function (Hono) with `/v1/health`, `/v1/public/subjects`, `/v1/student/dashboard`, `/v1/ai/doubts`; one error format; request IDs; `AIProvider` with timeout, retry, fallback; doubt workflow shared by `api` and legacy `doubt-solver`; 48 function tests; `deno check` clean for all functions; contract in `api/v1.md`.
- **Blocked:** deployment; choosing a free AI provider (decision D9 below). Payments: out of scope (D6).

### Phase 4 — jobs · PARTIAL
- **Completed:** Postgres job queue with idempotency keys, exponential backoff, dead letter, SQL maintenance jobs, pg_cron schedules (verified registered), service-role-only RPCs for the `worker` function with an SSRF-safe webhook handler; 15 pgTAP + 9 unit tests.
- **Blocked:** deployment; no external job type is used yet (worker scheduling documented in `runbooks/jobs.md`).

### Phase 5 — governance · PARTIAL
- **Completed:** `audit_logs` (append-only, admin-read, redacted before/after, changed fields, request ID) on role changes, mentor reviews, publish/delete of lessons/tests/blogs, question edits, post-submission score changes, reviews, report reviews and moderator deletes; RBAC `super_admin ⊃ admin ⊃ moderator` (admins can no longer create admins; last super_admin protected); write throttling on 9 user-content tables (HTTP 429); System health admin page; 21 pgTAP assertions.
- **Blocked:** deployment; first super_admin must be created by the owner with SQL after deploy.

### Phase 6 — scale · PASS (by design: evidence-only)
- **Completed:** k6 load-test script + local baseline; documented triggers with free-tier-first actions (`runbooks/scale.md`). Nothing scaled, as required.

## Test results (local, 2026-10-01)

| Suite | Result |
|---|---|
| Typecheck (app) / tsc (gateway) / `deno check` (3 functions) | pass / pass / pass |
| Lint | 0 errors, 10 pre-existing warnings |
| Unit (Vitest) | **124/124** in 18 files |
| pgTAP (31 migrations applied from scratch on Postgres 17.4.1.075) | **387/387** in 20 files |
| Build | pass |
| Restore drill (local data) | passed |
| k6 (local) | 0 failures / 36,902 |
| E2E (Playwright) | **20/20** in CI run 36828529854 (commit 4841e38); all 7 CI jobs green |

## Final audit

| Area | Status | Evidence | Remaining gap | Next action |
|---|---|---|---|---|
| Architecture | PARTIAL | All target components exist in repo with tests | Not deployed | Owner actions below, then Deploy workflow |
| Security | PARTIAL | Payment functions 404 in prod; gitleaks clean; 387 pgTAP incl. denial tests | Lovable may still redeploy; prod schema unknown | Send Lovable evidence; run inventory |
| Auth | PARTIAL | Signup role tests (`001`), unchanged Auth | Prod Auth settings UNKNOWN; built-in mailer ~2 emails/h | Send settings; pick free SMTP (D10) |
| RLS | PASS (repo) | RLS on all tables incl. 3 new; `016`–`020` | Prod drift | Reconcile |
| RBAC | PASS (repo) | `020_governance` 21 assertions | No super_admin yet | Owner bootstrap SQL after deploy |
| Database | PARTIAL | 31 migrations apply from scratch; rollbacks for each V1 migration | Prod history unreconciled | Inventory → reconciliation plan |
| API | PASS (repo) | 9 route tests, deno check, contract doc | Not deployed | Deploy |
| Performance | PARTIAL | 1-call dashboard, −17% bundle, k6 baseline | No India RUM yet | Deploy with `VITE_APP_ENV` |
| Frontend | PASS | Build, 124 unit tests, CI E2E | — | — |
| Service layer | PASS (repo) | `api`, shared doubt workflow tests | Not deployed | Deploy |
| Queues | PASS (repo) | `019_jobs`, worker tests, cron registered in test DB | Not deployed | Deploy |
| AI | PARTIAL | Provider abstraction + fallback tests | Only paid Lovable key configured | D9 |
| Payments | N/A | Removed; deploy workflow refuses to ship them | — | D6 when needed |
| Email | BLOCKED | — | No free SMTP chosen | D10 |
| Storage | PARTIAL | Bucket + policies in migration; restore drill migrates storage schema | Not exercised locally (no storage service) | Test on staging |
| Observability | PASS (repo) | Scrubbing tests (client + DB), System health page, uptime workflow | Not enabled in prod | Set `VITE_APP_ENV`, `UPTIME_*` |
| Backups | PARTIAL | Encrypted backup pipeline; drill passed locally | No production backup yet | Add `SUPABASE_DB_URL` secret, `BACKUP_ENABLED=true` |
| Recovery | PARTIAL | Drill 6 s locally; runbook | No production RTO evidence | Run drill on first prod backup |
| CI/CD | PARTIAL | CI: lint, types, unit, pgTAP, E2E, gitleaks, deno, gateway; Deploy workflow with approval | No staging to deploy to | Staging slot |
| Migrations | PARTIAL | From-scratch validation in CI; dry-run before push | Prod history unknown | Reconcile; never `db push` to prod before that |
| Tests | PASS | Numbers above; CI run 36828529854 green (pgTAP 387/387, Vitest 124/124, E2E 20/20, gitleaks clean, deno + gateway checks) | — | — |
| Mobile / API readiness | PARTIAL | Versioned `/v1` with contract | Not deployed | Deploy |

## Owner actions that unblock everything (all free)

1. **Lovable:** revoke the four connections; send the evidence (screenshots).
2. **Inventory:** run `supabase/sql/reports/production_inventory.sql` in the SQL editor; send the JSON and Auth settings.
3. **Staging:** decided 2026-10-04 — `APC` stays; staging is local + CI. No action needed.
4. **Backups:** add `SUPABASE_DB_URL` secret and `BACKUP_ENABLED=true`; store `~/.config/freequademy/backup-key.pem` in your password manager.
5. **Cloudflare:** free account + move `freequademy.com` DNS (gateway runbook).

## Decisions still open

| ID | Decision |
|---|---|
| D5 | Multi-school tenancy (not built) |
| D6 | Payments (not built; removed) |
| D8 | Incident owner — UNKNOWN — REQUIRES OWNER DECISION |
| D9 | Free AI provider for doubts. Note: some free tiers (e.g. Google Gemini API free tier) may use prompts to improve their products — a concern for minors' questions; check each provider's terms before choosing |
| D10 | Free email for Auth (e.g. Gmail SMTP with an app password, ~500/day; or a free transactional tier) |
