# Architecture V1 — Phase 0 completion report

**Date:** 2026-10-01 · **Branch:** `architecture/v1-phase-0` · **Gate status: NOT MET — 6 items blocked on actions only you can take (§3).**

## 1. Phase status

**Completed (with evidence)**

| Step | What was done | Evidence |
|---|---|---|
| PROTECT | Deleted production Edge Functions `verify-payment` and `create-razorpay-order` (D1) | CLI: `Deleted Function verify-payment` / `create-razorpay-order`. After: `OPTIONS` and `POST` → **404** for both; `functions list` shows only `doubt-solver` (v9, ACTIVE). No references in `src/`, `supabase/`, `.github/`, `vercel.json`; `config.toml` has no entries for them. |
| COMMIT | Working tree committed and pushed | Commit `8d33db6` on `architecture/v1-phase-0`, 316 files, pushed to `origin`. Pre-commit scan of 263 changed files: no JWTs, service keys, Razorpay/Stripe/AWS/Google keys, private keys or credentialed DB URLs; no file > 300 kB; `dist/`, `coverage/`, `test-results/`, `*.local` confirmed git-ignored. `e2e/fixtures.ts` contains passwords for local-only seeded test accounts (seeding refuses non-localhost) — accepted. |
| INVENTORY (partial) | Management-API facts gathered read-only | See §2 |
| SECURITY HARDENING | Anon-callable `SECURITY DEFINER` review; one function locked down | Migration `20261001100000_…` revokes `get_user_counts()` from `PUBLIC`, `anon`, `authenticated` (no caller in app, no dependants). Rollback: `supabase/rollbacks/20261001100000_revoke_get_user_counts.sql`. pgTAP `016_phase0_hardening` (7 assertions). |
| Dependency analysis — kept on purpose | `has_role`, `is_mentor` stay anon-callable: RLS policies on anon-readable `lessons`, `tests`, `test_questions` evaluate them, so revoking breaks public course browsing. `session_participant_counts` is used by the public `/mentorship` page. Residual risk: anyone holding a user UUID can learn whether it is a mentor/admin. Accepted as low. | `pg_policies` query; `src/pages/Mentorship.tsx:109`; pgTAP `016` asserts anon browsing still works |
| Flaky test fixed | `012` #25 compared an IST-bucketed day with UTC `current_date` | Now uses `(now() AT TIME ZONE 'Asia/Kolkata')::date` |
| Test environment parity | `scripts/test-db.sh` pinned to **production's Postgres image `17.4.1.075`** (was `17.6.1.106`) | 17.6.1.106 **segfaults (signal 11) on any "permission denied for function"** — reproduced with a trivial function; 17.4.1.075 returns a normal `42501`. |
| Migration guard fix | `20260930130000_…` storage block now also requires `storage.buckets.public` and `storage.foldername()` | The 17.4 image ships a stub storage schema; old guard tried to insert and failed. No effect on real Supabase projects. |
| VALIDATION | Full pgTAP suite on production's Postgres version | **339/339 passing, 16 files** (the 332 existing + 7 new). `typecheck`, `lint` (0 errors), `vitest` 70/70, `vite build` passed earlier today on the same code; CI will re-run on push. |
| D7 preparation | Sentry proposal with exact collected-data table and scrubbing config | `docs/architecture/sentry-d7-proposal.md` — **not installed, not enabled** |
| Inventory script | Read-only SQL for the database-level inventory | `supabase/sql/reports/production_inventory.sql` — `BEGIN TRANSACTION READ ONLY … ROLLBACK`, returns one JSON row, no personal data; validated on the local stack |

**Blocked** — see §3. **Not started (by instruction):** Phase 1+, D3–D6, D8.

## 2. Production state (read-only inventory)

| Item | Value | Source |
|---|---|---|
| Project | `freequademy` (`odawqbevdzpkwkxbggnf`), status ACTIVE_HEALTHY, created 2025-09-07 | `supabase projects list` |
| Region | **ap-south-1 (Mumbai)** — the plan's assumption of a non-India region was wrong | same |
| Postgres | 17.4.1.075 (engine 17, GA channel) | same |
| Plan | **UNKNOWN — REQUIRES VERIFICATION.** Strong indication of **Free**: no backups exist, and the org already holds 2 projects (`freequademy`, `APC`), the Free-plan maximum | `backups list`, `projects list` |
| Backups | **None.** WAL-G enabled, PITR **false**, earliest/latest backup timestamp **0** | `supabase backups list` |
| PITR | Not available / off | same |
| Edge Functions | `doubt-solver` only (v9, deployed 2026-01-28) | `functions list` |
| Secrets (names only) | `LOVABLE_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `secrets list` |
| Production frontend | Vercel, auto-deployed from `main` @ `b3c3df1` (2026-01-28) | GitHub deployments API |
| Tables present (sampled) | `profiles`, `user_roles`, `donations`, `mentors`, `lessons`, `chapters`, `tests`, `test_attempts`, `doubts`, `ai_usage_daily`, `saved_items` exist; `study_notes` absent | zero-row anon reads |
| Database size, storage size, Auth users, extensions, migration history, table/row counts, donations written by the fake endpoint | **UNKNOWN — REQUIRES VERIFICATION** (run the inventory script) | — |
| Auth settings (email confirmation, password policy, redirect URLs, rate limits, SMTP) | **UNKNOWN — REQUIRES VERIFICATION** (dashboard → Authentication) | — |
| API latency | 400–700 ms for a 1-row query from Delhi despite Mumbai region; cause **UNKNOWN** (candidates: Free-tier compute, cold PostgREST, connection setup) — Phase 2 benchmark | `curl` timing |

**Schema drift (C3):** production has tables from the Sept 2026 migrations but not all of them, and its migration history is unknown. The 26 repo migrations **must not** be pushed to production until the inventory's `migration_history` is compared against `supabase/migrations/` and the gap is rehearsed on staging.

## 3. Gate checklist

| Gate item | Status | Evidence / what unblocks it |
|---|---|---|
| No P0 issue open | **PARTIAL** | C1 closed (404s). C2 closed (pushed). C3 open until inventory runs. **New:** `main` still contains the payment function source; if the Lovable ↔ GitHub sync (Vercel project is named `edu-spark-game`) is still connected, a Lovable edit could redeploy them — UNKNOWN; check Lovable project settings and disconnect if unused. |
| Current production state documented | **PARTIAL** | §2. You run `production_inventory.sql` in the SQL Editor and paste the JSON; add Auth settings from the dashboard. |
| Working tree committed and pushed | **PASS** | `8d33db6` + this Phase 0 commit on `origin/architecture/v1-phase-0` |
| Staging environment established | **BLOCKED** | Org is at the 2-project Free limit. Needs: Pro upgrade (D2, approved — billing is dashboard-only), plus your approval of the extra compute for a second project (Pro includes $10/month compute credit ≈ one Micro project; a staging project adds ≈ $10/month). |
| Backup capability verified | **VERIFIED ABSENT** | `backups list` shows none. Upgrading to Pro starts daily backups; first one appears within ~24 h. |
| One successful restore drill | **BLOCKED** | Needs a backup (above) and a restore target (staging). Drill plan: restore latest production backup to staging, compare row counts per table, time it against RTO 4 h. |
| RLS/security regression tests passing | **PASS** | pgTAP 339/339 on production's Postgres version |
| 332/332 pgTAP passing | **PASS** | 339/339 (superset) |
| Monitoring verified | **BLOCKED on D7** | Proposal ready; needs your decision |
| Environment separation verified | **FAIL** | Vercel builds every branch with the committed `.env` → **Preview deployments use the production database** (the push of this branch created one; it is behind Vercel SSO, HTTP 302 — not public). Fix: set `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` per Vercel environment (Production → prod, Preview → staging), then delete `.env` from git. Needs Vercel dashboard access and staging to exist. |

## 4. Changes in this phase

- **Files:** `supabase/migrations/20261001100000_5d7e1b3a-…sql` (new), `supabase/rollbacks/20261001100000_revoke_get_user_counts.sql` (new), `supabase/tests/database/016_phase0_hardening.test.sql` (new), `supabase/tests/database/012_analytics_dashboard.test.sql`, `supabase/migrations/20260930130000_c3e91f5a-…sql` (guard only), `scripts/test-db.sh`, `supabase/sql/reports/production_inventory.sql` (new), `docs/architecture/*.md`.
- **Database changes:** local/test only. Production: none (only the two function deletions).
- **API changes:** none. **Security changes:** fake-payment endpoints removed; `get_user_counts` locked (repo only, not deployed).
- **Risks:** merging this branch to `main` today would auto-deploy a frontend that needs tables production may not have. **Do not merge until schema drift is resolved on staging.**
- **Rollback:** function deletion — redeploy from `b3c3df1` (not intended); migration — rollback file above; test/script changes — `git revert`.

## 5. What I need from you to close Phase 0

1. **Upgrade the Supabase org to Pro** (dashboard → Organization → Billing). Approved as D2; only you can do billing.
2. **Run `supabase/sql/reports/production_inventory.sql`** in the SQL Editor and paste the JSON back; also send the Authentication settings (email confirmation on/off, minimum password length, Site URL + redirect URLs, SMTP configured or not).
3. **Approve a staging project** (≈ $10/month extra compute). I can then create it in Mumbai with the CLI and apply all migrations.
4. **Vercel:** add per-environment variables (or give me Vercel CLI access), so `.env` can be removed from git.
5. **Lovable:** confirm whether the project is still connected to this GitHub repo.
6. **D7:** approve, change or reject `docs/architecture/sentry-d7-proposal.md`.
7. **D8:** incident owner — UNKNOWN — REQUIRES YOUR DECISION.

After 1–4, I will: create staging, apply migrations there, compare against production's migration history, take a logical backup, run and time the restore drill, and re-run the gate.
