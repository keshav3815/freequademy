# Freequademy Architecture V1.0 — Audit, Gap Report and Master Plan

**Status:** AUDIT COMPLETE — awaiting approval before Phase 0 implementation.
**Date:** 2026-10-01 · **Source of truth:** "Freequademy Target Architecture" doc · **Prior work:** `docs/remediation/phase-0 … phase-10`.

Workflow: Audit → Gap Report → Master Plan → **Approval** → Phase 0 → Validation → Phase 1 → … → Final Architecture Audit.

## How this audit was done

| Evidence source | What was checked |
|---|---|
| Repository (working tree + `git` history) | Code, migrations, functions, CI, env files, committed vs uncommitted state |
| Local Supabase stack `freequademy-local-e2e` (127.0.0.1:55421/55422) | Catalog queries: RLS, policies, grants, functions, indexes, extensions |
| Test runs today | `typecheck`, `lint`, `vitest`, `vite build`, `scripts/test-db.sh` (pgTAP) |
| Production (`odawqbevdzpkwkxbggnf`) — **read-only, minimal** | Public health/latency timing, `OPTIONS` preflight on Edge Functions, zero-row `select` on 13 tables with the public anon key. No data read, nothing written. Further production probing was stopped by the permission system; everything else about production is marked **UNKNOWN — REQUIRES VERIFICATION**. |

E2E (Playwright) was **not** run in this audit (it seeds the local database); its last known state is 16 tests in 6 specs.

---

## 0. Critical findings — must be resolved before any architecture work

| ID | Finding | Evidence | Severity |
|---|---|---|---|
| **C1** | **Unauthenticated fake-payment endpoint is live on production.** `verify-payment` accepts any POST, skips signature verification (`const isValid = true`), and inserts a `status: 'successful'` donation with the **service-role key**. `create-razorpay-order` is also live. Both have `verify_jwt = false`. | `git show HEAD:supabase/functions/verify-payment/index.ts`; `git show HEAD:supabase/config.toml`; production `OPTIONS /functions/v1/verify-payment` → **200**, `/create-razorpay-order` → **200** (control: unknown function → 404). Deleted only in the uncommitted working tree. | **P0** |
| **C2** | **All remediation work exists only on this machine.** 194 uncommitted changes (87 untracked, 54 modified, 53 deleted): 9 newest migrations, pgTAP suite, E2E suite, CI workflow, teacher portal, docs. Last commit `b3c3df1`, 2026-01-28. `main` is level with `origin/main`. | `git status --short`; `git log -1` | **P0** (disk loss = all of it lost; nothing is reviewable or deployable) |
| **C3** | **Production schema state is unknown and drifted.** Production has `lessons`, `chapters`, `tests`, `test_attempts`, `doubts`, `ai_usage_daily`, `saved_items` (tables from the Sept 2026 migrations) and still has `donations`, but `study_notes` returns 404. The deployed frontend is from an unknown commit. | Zero-row reads with anon key (200 / 401 / 404) | **P0** — deploying anything without knowing this can break production |
| **C4** | **Backups, plan tier and region of production: unknown.** A 1-row query from Delhi took 400–700 ms, which points to a non-India region. | `curl` timing 2026-10-01 | P1 (UNKNOWN — REQUIRES VERIFICATION) |

---

## 1. Current architecture

```
Browser (React 18 SPA, Vite 5, served by Vercel)
   │  supabase-js 2.57, URL + anon key from VITE_* env
   ▼
https://odawqbevdzpkwkxbggnf.supabase.co   ← vendor domain, region UNKNOWN
   ├── /auth/v1       GoTrue — email + password only
   ├── /rest/v1       PostgREST — 165 .from() calls + 54 .rpc() calls from the browser
   ├── /storage/v1    teacher resources bucket (private, signed URLs)
   └── /functions/v1  doubt-solver (AI) · verify-payment + create-razorpay-order (LIVE, see C1)
          │
          ▼
       Postgres: 39 tables, 70 functions, RLS on every table
          └── AI: Lovable AI Gateway → google/gemini-2.5-flash
```

### Inventory (items 1–15 of the audit brief)

| # | Area | Current state | Evidence |
|---|---|---|---|
| 1 | Frontend | React 18.3, Vite 5.4, React Router 6.30, TanStack Query 5.83, Tailwind 3.4, shadcn/Radix. 4 portals: public, student (`/dashboard`), teacher (`/teacher/*`), admin (`/admin/*`). Plus an orphaned `/mentor-dashboard`. | `package.json`, `src/App.tsx` |
| 2 | Infrastructure | Vercel (static SPA + security headers/CSP), Supabase (single hosted project), GitHub. No Cloudflare, no own API domain. | `vercel.json`, `.env` |
| 3 | Database | 39 tables, 87 indexes, 70 functions (63 `SECURITY DEFINER`, all with pinned `search_path`), 3 views, 25 migrations (4,429 SQL lines). Extensions: `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `pg_net`, `supabase_vault`, `pg_graphql`. `pgmq` and `pg_cron` available, not enabled. | Local catalog queries |
| 4 | Authentication | Supabase Auth, email + password (`signInWithPassword`, `signUp`, `resetPasswordForEmail`, `updateUser`). No OAuth. Built-in mailer (no custom SMTP configured in repo). Auth settings on production: UNKNOWN. | `grep` in `src/` |
| 5 | Authorization / RLS | Two role systems: `profiles.role` enum `user_role` = student, mentor; `user_roles` table enum `app_role` = admin, moderator. Helpers `is_admin`, `is_moderator`, `is_mentor`, `has_role`, `private.require_teacher`, `is_my_student`. RLS enabled on 39/39 tables, 107 policies. No permissive `true` write policy. Signup can never self-grant a role (pgTAP `001`). Frontend guard `RequireAuth` is UX only. | `pg_policies`, `pg_class.relrowsecurity`, `src/components/auth/RequireAuth.tsx` |
| 6 | API / data access | No API layer of our own; browser calls PostgREST and RPCs directly. 29 page/component files call `supabase` directly; 24 files use React Query. No versioning, no request IDs, no standard error format. | `grep` counts |
| 7 | Service layer | One real function (`doubt-solver`): JWT checked manually (`getClaims`), RLS-scoped client (no service role), 30 s timeout, database quota (`consume_ai_quota`). CORS `*`. Two dangerous payment functions still deployed (C1). | `supabase/functions/` |
| 8 | Jobs / cron | **None.** No `pg_cron`, `pgmq` or scheduled functions. All work happens in the request path or in triggers. | `grep` in migrations, `pg_extension` |
| 9 | Frontend data fetching | Student dashboard = 8 RPCs + 6 table queries in `useStudentDashboard.ts`, plus 6 more calls from cards (`UpcomingSchedule` 2, `DoubtSolver` 2, `MentorshipAnalyticsCard` 1, `TeacherAnnouncementsCard` 1). Doubt stats use 4 separate count queries, one reading up to 500 rows. | `src/hooks/useStudentDashboard.ts` |
| 10 | Performance | Main JS chunk **418.9 kB (130.6 kB gzip)**, Supabase client chunk 123.9 kB, CSS 128 kB. Production per-call latency from Delhi 400–700 ms. 25 foreign-key columns have no supporting index (list in §2). | `vite build` today; `curl`; catalog query |
| 11 | Security risks | C1 (live fake-payment endpoint). Anon can execute 4 `SECURITY DEFINER` functions with no auth check: `get_user_counts` (platform user counts), `has_role`, `is_mentor` (role lookup by any user id), `session_participant_counts`. Views `public_profiles`, `mentors_public` run as owner (`security_invoker=off`, intended as safe projections — verify columns). `.env` with production URL + anon key is committed (anon key is public by design; the problem is production being baked into every build). No general rate limiting (AI quota only). | Catalog queries; `git ls-files .env` |
| 12 | Deployment pipeline | GitHub Actions CI: lint, typecheck, build, unit, pgTAP, E2E on local Supabase. **No deploy steps**: no migration deployment, no function deployment, no staging, no approval gate. Vercel deploy mechanism not in repo (UNKNOWN). | `.github/workflows/ci.yml` |
| 13 | Observability | `ErrorBoundary` + `monitoring.ts` (console only; `VITE_ERROR_REPORTING_URL` unset). No Sentry, no uptime checks, no RUM, no slow-query review, no AI spend view. | `src/lib/monitoring.ts`, `docs/observability.md` |
| 14 | Backup / recovery | Nothing in repo. Plan tier, backups, PITR, restore history: UNKNOWN. No runbook, RPO or RTO. | — |
| 15 | Audit logging | `user_activity_log` table exists (admin-read RLS) but has **no writer** (0 rows). | `docs/observability.md`; local count |

### Test baseline (run 2026-10-01)

| Suite | Result |
|---|---|
| Typecheck | Pass |
| Lint | Pass, 0 errors, 13 warnings |
| Unit (Vitest) | 70/70 in 12 files |
| Build | Pass |
| pgTAP | 331/332. **1 flaky test:** `012_analytics_dashboard` #25 compares an IST-bucketed day against UTC `current_date`; fails daily 18:30–24:00 UTC. Test bug, not product bug. |
| E2E (Playwright) | Not run in this audit |

---

## 2. Gap report — current vs target

Severity: P0 = stop-ship / active risk · P1 = required for V1.0 · P2 = required, can follow · P3 = when evidence demands.

| Area | Current | Target | Gap | Sev |
|---|---|---|---|---|
| Source control | 194 changes uncommitted | Everything in git, PR-reviewed | Commit + push on a branch | P0 |
| Payment functions | Fake-payment endpoint live | No payment code until a real, signed-webhook design exists | Delete deployed functions on production | P0 |
| Production state | Unknown schema/migration/deploy state | Known, recorded, reproducible | Read-only inventory of production | P0 |
| Environments | Local + production; `.env` bakes production in | Local → staging → production, isolated projects and secrets | Staging project, Vercel env per environment, remove `.env` from git | P1 |
| Backups | Unknown | Pro plan daily backups, tested restore, RPO/RTO documented | Verify plan, restore drill | P1 |
| Region | Likely outside India | ap-south-1 (Mumbai) | Project migration | P1 |
| API domain | `*.supabase.co` (blocked by Indian ISPs Feb–Mar 2026) | `api.freequademy.com` | Cloudflare Worker gateway + DNS; CSP `connect-src` update | P1 |
| Migrations | Manual; local history records 20 of 25 | CI-applied, history consistent in every environment | `supabase db push` in pipeline; repair history | P1 |
| Observability | Console only | Sentry (web + functions), request IDs, uptime, RUM, slow queries, queue depth | All of it | P1 |
| Anon-callable definer functions | 4 without auth check | Revoke `EXECUTE` from `anon` (and `PUBLIC`) where not needed | 1 migration + pgTAP | P1 |
| Screen read models | Dashboard ~20 calls | One bounded call per major screen/section | `get_student_dashboard()` etc. | P1 |
| Indexes | 25 FK columns unindexed | Indexes justified by measured queries | `EXPLAIN ANALYZE` on hot paths, then targeted indexes | P2 |
| Bundle | 418.9 kB main | < 200 kB first-screen JS | Route-level split of portals, lazy heavy libs | P2 |
| Service layer | 1 function, no router, no versioning | `api` Edge Function (Hono) under `/v1`, standard errors, request IDs | Build the gateway + `api` function | P2 |
| AI | Single provider, called in request path | `AIProvider` interface, timeout/retry/fallback, per-user quota (exists) | Refactor `doubt-solver` behind interface | P2 |
| Jobs | None | `pgmq` + `pg_cron` + worker function, retries, dead-letter, idempotency | Enable extensions, job tables, worker | P2 |
| Email | Built-in mailer (~2/hour limit) | Custom SMTP; app emails through queue | SMTP config; `email` job type | P1 (SMTP) / P2 (queue) |
| Audit logs | Table with no writer | `audit_logs` written by every sensitive RPC | Table + writer in definer RPCs | P2 |
| RBAC | Student, mentor (=teacher), moderator, admin; split across 2 tables | Same roles + super admin; one documented model; role changes audited | Add `super_admin`, `Users & Roles` admin RPCs, tests | P2 |
| Rate limits | AI quota only | Edge (IP) + per-user + per-action limits | Cloudflare rules + DB cooldowns for writes | P2 |
| Scale | — | Only on evidence | Nothing now | P3 |

**FK columns without an index (for Phase 2 analysis, not blind indexing):** announcements.session_id, announcements.subject_id, attempt_answers.question_id, club_members.user_id, club_posts.author_id, community_events.created_by, dashboard_content.author_id, doubts.mentor_id, event_registrations.user_id, forum_replies.author_id, forum_threads.author_id, mentor_applications.reviewed_by, mentor_applications.user_id, mentorship_feedback.student_id, mentorship_sessions.program_id, reply_votes.user_id, saved_items.lesson_id, saved_items.test_id, student_clubs.created_by, teacher_resources.subject_id, teacher_student_notes.student_id, tests.chapter_id, thread_votes.user_id, user_activity_log.user_id, user_reports.reported_by.

---

## 3. Target architecture

```
Clients (web PWA; Android later)
   ▼
api.freequademy.com — Cloudflare (DNS, TLS, WAF, rate limits)
   ▼
Cloudflare Worker "gateway"  (adds x-request-id, routes, caches public GETs only)
   ├── /auth/v1/*, /rest/v1/*, /storage/v1/*, /realtime/v1/*  → Supabase (pass-through, RLS applies)
   └── /v1/*                                                 → Edge Function "api" (Hono)
   ▼
Supabase project — ap-south-1 (Mumbai), Pro
   ├── Auth (custom SMTP)       ├── Storage (private buckets, signed URLs)
   ├── Postgres: tables + RLS + read-model RPCs + summary tables + audit_logs
   ├── pgmq queues + pg_cron ──► Edge Function "worker" ──► AI / email / reports
   └── Observability: Sentry (web, api, worker) · pg_stat_statements · queue metrics · RUM
```

**Why a Worker gateway instead of only the Supabase custom-domain add-on:** the add-on gives one owned hostname but cannot add request IDs, route `/v1/*`, rate-limit per route, or cache public reads. The Worker does all four and costs $5/month at most. Auth keeps working because supabase-js accepts any base URL. **Decision needed (D3).**

---

## 4. Security model

| Layer | Role | Rule |
|---|---|---|
| 1. Frontend (`RequireAuth`, portal routes) | UX only | Hides screens; never trusted |
| 2. Gateway | Abuse control | TLS, WAF, IP rate limits, request ID, no caching of any request carrying `Authorization` |
| 3. Service API (`api`, `worker`) | Authn + action checks | Verify JWT (`getClaims`); run DB calls with the caller's JWT; service role only in `worker` and named admin workflows |
| 4. Postgres RLS + definer RPCs | **Final boundary** | Every table RLS; every definer RPC checks `auth.uid()` and role; client-supplied `user_id`/`role`/`teacher_id` ignored in favour of `auth.uid()` |

Standing rules: RLS never disabled to make something work; service-role key never in browser, git or `VITE_*`; each fix ships with an ALLOWED and a DENIED pgTAP test (existing convention).

## 5. RBAC model

| Role (product) | Stored as | Today | Change |
|---|---|---|---|
| Student | `profiles.role = 'student'` (default) | Yes | None |
| Teacher | `profiles.role = 'mentor'` | Yes, granted only by `approve_mentor_application` | Keep the stored name (RLS policies and RPCs reference it); document "mentor = teacher" |
| Moderator | `user_roles.role = 'moderator'` | Yes | None |
| Admin | `user_roles.role = 'admin'` | Yes | None |
| Super admin | — | No | Add `super_admin` to `app_role`; only super admin can grant/revoke admin and moderator; every grant audited |

Authorization chain in the database: `auth.uid()` → role helper → ownership (`is_my_student`, `mentor_id = auth.uid()`, `author_id = auth.uid()`) → action RPC → RLS. There is **no organization/school tenant** today. Multi-school tenancy is **UNKNOWN — REQUIRES PRODUCT DECISION (D5)**; if yes, it is a new phase with its own migration.

## 6. API contract plan

Base: `https://api.freequademy.com`. Errors: `{"error":{"code","message","request_id"}}`, no stack traces. Every response carries `x-request-id`.

| Method · Path | Auth · Role | Purpose | DB | Cache | Rate limit |
|---|---|---|---|---|---|
| GET `/v1/student/dashboard` | JWT · any | Bounded dashboard payload | `get_student_dashboard()` | private, no-store | 60/min/user |
| GET `/v1/teacher/home` | JWT · mentor/admin | Teacher home payload | `get_teacher_overview()` + read model | private | 60/min/user |
| POST `/v1/ai/doubts` | JWT · any | AI doubt answer | `consume_ai_quota`, `doubts` insert | none | quota (existing) + 10/min/user |
| POST `/v1/files/sign` | JWT · owner | Signed upload/download URL | `teacher_resources` | none | 30/min/user |
| POST `/v1/admin/roles` | JWT · super_admin/admin | Grant/revoke role | role RPC + `audit_logs` | none | 20/min/user |
| GET `/v1/public/courses`, `/v1/public/subjects` | none | Public catalogue | RLS public read | public, 5 min edge | IP limit |
| POST `/v1/webhooks/{provider}` | signature | Future payments/email events | `*_events` (unique event id) | none | IP limit |

Simple owner-scoped CRUD keeps using `/rest/v1` through the gateway: no duplication of RLS in the API. Full per-endpoint contracts (request/response schemas, errors, side effects) are written as each endpoint is built, in `docs/architecture/api/`.

## 7. Database migration plan (to Mumbai)

Prerequisites, all **UNKNOWN — REQUIRES VERIFICATION** from the Supabase dashboard: current region, plan, database size, storage size, Auth user count, deployed functions and secrets, enabled extensions, cron jobs, Auth settings (email confirmation, password policy, redirect URLs), applied migration history.

Runbook: provision staging (Mumbai) → apply all 25 migrations from git → pgTAP + E2E against staging → `pg_dump` production (data only) → restore to staging → consistency checks (row counts, FK integrity, sample checksums) → Auth users move with the `auth` schema in the same dump → storage objects copied by script → secrets set → performance test from India → provision production (Mumbai) → final backup of old project → **announced maintenance window**: freeze writes, final dump/restore, switch gateway origin → monitor 72 h → old project kept read-only 30 days as rollback. Because clients call `api.freequademy.com`, the cutover is one gateway config change and rollback is the same change reversed. Users will have to sign in again (JWT secret changes) — **decision D4**.

## 8. Queue / worker design

`pgmq` queues per job type (`xp`, `summaries`, `notifications`, `ai_retry`, `email`, `reports`) + `private.jobs` table for status and history (`id, type, idempotency_key UNIQUE, status queued|running|succeeded|retrying|dead, attempt_count, scheduled_at, started_at, completed_at, last_error, request_id`). `pg_cron` runs pure-SQL jobs (XP/streak recompute, summaries) directly, and every minute calls the `worker` Edge Function via `pg_net` (shared secret) for jobs needing external calls. Retry: exponential backoff, max 5 attempts, then `dead` + moved to `*_dlq` + alert. Idempotency: `idempotency_key` unique per job; XP/payment/email writes guarded by unique constraints so a duplicate delivery is a no-op.

## 9. Observability plan

Sentry for web (errors + web-vitals RUM), `api` and `worker` (privacy review first: users are minors; scrub PII). `x-request-id` from gateway → function logs → `audit_logs`/`jobs` rows → Sentry tag. Weekly `pg_stat_statements` top-20 review. Queue depth + dead-letter count query, alert when DLQ > 0. AI latency/failures/daily tokens per user. Uptime checks on `/auth/v1/health`, login, dashboard. Alerts: error-rate spike, DLQ > 0, p95 API > 500 ms for 10 min, backup failure.

## 10. Backup and recovery plan

Targets (proposed, **decision D2**): RPO 24 h on Pro daily backups, tightened to minutes with PITR once real student data justifies $100/month; RTO 4 h. Quarterly restore drill of a production backup into staging, timed, with row-count checks. Runbooks in `docs/runbooks/`: database restore, domain/ISP block, AI provider outage, bad migration rollback. Incident owner: **UNKNOWN — name required**.

## 11. CI/CD plan

Keep today's jobs (lint, typecheck, build, unit, pgTAP, E2E). Add: fix flaky pgTAP #25 · secret scan (gitleaks) · `supabase db push --dry-run` against staging on PRs · on merge to `main`: apply migrations + deploy functions to **staging**, run smoke tests · production via GitHub Environment with **manual approval**, then migrations → functions → Vercel promote · Vercel env vars per environment, `.env` deleted from git.

## 12. Performance benchmark plan

Baseline before any Phase 2 change, repeated after each change, from an Indian vantage point (Delhi/Mumbai machine + throttled "Fast 4G" profile): time to useful dashboard content (P50/P75/P95/P99 over 30 runs), per-request split (DNS, TLS, edge, API, DB via `pg_stat_statements`), first-screen JS kB. Current baseline: 400–700 ms per call (3–4 samples, single location), ~20 calls on the student dashboard, 418.9 kB main JS. Targets: dashboard < 1 s to useful content on 4G, important RPC p95 < 50 ms in DB, first-screen JS < 200 kB.

## 13. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Fake donations written via live `verify-payment` | High (public, unauthenticated) | Data integrity, reputational | Phase 0 step 1: delete function |
| Local disk loss wipes uncommitted work | Medium | Loss of all remediation work since 2026-01-28 | Commit + push first |
| Deploying working-tree migrations onto drifted production breaks it | High if done blind | Outage | Inventory production first; staging rehearsal |
| Indian ISP blocks `*.supabase.co` again | Medium (happened Feb 2026) | Full outage for Jio/Airtel/ACT users | Own API domain (Phase 1) |
| Mumbai cutover loses data or sessions | Low with runbook | High | Write freeze, dump/restore rehearsal, 30-day rollback project |
| Sentry captures minors' PII | Medium | Legal/trust | PII scrubbing, privacy review before enabling |
| Scope creep into rewrite | Medium | Months lost | Gates; no work outside approved phase |

## 14. Rollback plan (per phase)

Phase 0: all changes additive or config; function deletion is reversible by redeploying from git history (not intended). Phase 1: gateway origin switch back to old project; old project kept 30 days. Phase 2: every read-model RPC ships alongside the old calls behind a flag; revert = flag off; indexes dropped `CONCURRENTLY`. Phase 3–4: new endpoints/jobs are additive; frontend flag falls back to direct calls. Phase 5: audit writers are append-only; RBAC change ships with a down-migration. Every migration file carries a matching rollback SQL in `supabase/rollbacks/`.

---

## 15. Master plan

Each phase: CURRENT → GAP → TARGET → IMPLEMENTATION → VALIDATION → GATE. No phase starts before the previous gate passes and you approve it.

### Phase 0 — Protect and establish ground truth
- **Current:** fake-payment endpoint live; work uncommitted; production state unknown; no staging, backups unknown, 4 anon-callable definer functions, flaky test.
- **Implementation:** (1) delete `verify-payment` and `create-razorpay-order` from production — *needs your approval + Supabase access*; (2) commit working tree on branch `architecture/v1-phase-0`, open PR; (3) read-only production inventory (region, plan, backups, migration history, functions, Auth settings, `phase0_mentor_review.sql`) — *you run it or grant access*; (4) create staging project in Mumbai; (5) migration: revoke anon `EXECUTE` on the 4 unguarded definer functions + pgTAP; (6) fix flaky pgTAP #25; (7) Sentry (web + functions) with PII scrubbing; (8) Vercel env per environment, remove `.env` from git; (9) custom SMTP; (10) Pro plan + first restore drill into staging.
- **Validation:** `OPTIONS` on both payment functions → 404; CI green including pgTAP 332/332; restore drill timed and row-counted; a test error appears in Sentry.
- **Gate:** no P0 open; production state documented; one successful restore.

### Phase 1 — Own API domain + Mumbai
- **Implementation:** Cloudflare DNS for `freequademy.com`; Worker gateway; supabase-js base URL → `https://api.freequademy.com`; CSP `connect-src` updated; staging on gateway; Mumbai production migration per §7; CI deploys migrations/functions with approval.
- **Validation:** full E2E + pgTAP against staging via gateway; login/dashboard/teacher/admin smoke on Jio + Airtel networks; per-call latency from India measured.
- **Gate:** all critical flows pass on staging through `api.freequademy.com`; production cutover completed with rollback window open.

### Phase 2 — Performance
- **Implementation:** baseline benchmark; `get_student_dashboard()` and teacher-home read models (bounded, selective fields); `doubt_stats` summary (trigger, strict consistency); `EXPLAIN ANALYZE` on top queries → justified indexes; RLS predicates use `(select auth.uid())`; portal bundle split; public GET caching at gateway; RUM.
- **Validation:** benchmark vs baseline; pgTAP for each new RPC (ALLOWED + DENIED); no regression in E2E.
- **Gate:** dashboard < 1 s to useful content on throttled 4G from India (P75).

### Phase 3 — Service layer
- **Implementation:** `api` Edge Function (Hono) under `/v1` with standard errors + request IDs; `AIProvider` interface (generate/classify; timeout, retry, fallback model, quota); doubt solver moved to `/v1/ai/doubts`; signed file URLs; admin bulk workflows. Payments only if D6 = yes, with signed webhooks + `payment_events` unique event id.
- **Validation:** API tests per endpoint; security tests from §26 of the brief.
- **Gate:** no secret-bearing workflow runs from the browser.

### Phase 4 — Jobs
- **Implementation:** enable `pgmq`, `pg_cron`; `private.jobs`; `worker` function; XP/streak, summaries, notifications, AI retry, email jobs; DLQ + alert.
- **Validation:** retry, DLQ and duplicate-delivery tests; load of 1,000 queued jobs drains cleanly.
- **Gate:** no critical async workflow depends on the browser.

### Phase 5 — Governance
- **Implementation:** `audit_logs` (actor, role, action, resource, before/after, request_id; admin-read, insert only via definer RPCs) wired into role changes, mentor approvals, moderation deletes, score/assessment edits, content publish/delete; `super_admin` + Users & Roles admin page; rate limits (gateway + DB cooldowns for forum/club/event/report inserts, login/reset via Auth settings + Cloudflare); operational dashboard.
- **Validation:** pgTAP: every sensitive RPC writes exactly one audit row; role escalation attempts denied.
- **Gate:** sensitive actions auditable; authorization test-covered.

### Phase 6 — Scale (evidence only)
Compute upgrades, read replicas, PITR, extra workers, Android on `/v1`. Triggered by metrics, not planned in advance.

---

## 16. Decisions and access needed from you

| ID | Decision / access | Needed for |
|---|---|---|
| D1 | Approve deleting `verify-payment` and `create-razorpay-order` from production, and provide Supabase dashboard/CLI access (or run the commands yourself) | Phase 0 step 1 |
| D2 | Approve Supabase Pro ($25/mo) and RPO 24 h / RTO 4 h targets | Phase 0 |
| D3 | Cloudflare Worker gateway (recommended) vs Supabase custom-domain add-on only; confirm you control `freequademy.com` DNS | Phase 1 |
| D4 | Accept one forced re-login for all users at Mumbai cutover | Phase 1 |
| D5 | Will schools/organizations become tenants? | RBAC scope |
| D6 | Are payments coming in the next 6 months? | Phase 3 scope |
| D7 | Sentry acceptable for a minors-focused platform after PII scrubbing? | Phase 0 |
| D8 | Incident owner name | Runbooks |
