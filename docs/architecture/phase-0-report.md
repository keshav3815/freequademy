# Architecture V1 — Phase 0 report

**Updated:** 2026-10-01 · **Branch:** `architecture/v1-phase-0` · **Draft PR:** [#1](https://github.com/keshav3815/freequademy/pull/1) (DO NOT MERGE)
**Phase 0 status: IN PROGRESS — gate NOT met.** 10 of 22 gate items pass; the rest are blocked on the Pro upgrade, your inventory/Auth input, or Lovable (§4).

> **pgTAP baseline:** the 16 test files plan exactly **321** assertions (314 pre-existing + 7 added in Phase 0). The authoritative target is **321/321**.

## 1. Evidence log

| Step | Result | Evidence |
|---|---|---|
| PROTECT | `verify-payment`, `create-razorpay-order` deleted from production (D1) | CLI `functions delete` ✓; `OPTIONS` and `POST` → **404** both; `functions list` → only `doubt-solver` v9 |
| COMMIT | All work committed and pushed | Commits `8d33db6` … on `origin/architecture/v1-phase-0`; pre-commit scan of 263 files clean |
| DRAFT PR | Opened, marked DO NOT MERGE | [#1](https://github.com/keshav3815/freequademy/pull/1) |
| CI | **All green** on run [36786267634](https://github.com/keshav3815/freequademy/actions/runs/36786267634) | lint 0 errors / 10 warnings · typecheck ✓ · build ✓ · unit **75/75** (13 files) · pgTAP **321/321** (16 files, migrations applied from scratch on Postgres 17.4.1.075) · E2E **20/20** · gitleaks full history (72 commits) **no leaks** |
| Secret scan | Added to CI | Only historical findings are two **anon** keys (decoded `role: anon`, public by design) and the jwt.io example token in a test fixture — each ignored by exact fingerprint in `.gitleaksignore`. No service-role key has ever been committed. |
| Security hardening | `get_user_counts()` revoked from `PUBLIC`/`anon`/`authenticated` | Migration `20261001100000_…`, rollback in `supabase/rollbacks/`, pgTAP `016` (7 assertions). `has_role`, `is_mentor`, `session_participant_counts` intentionally kept (public RLS + `/mentorship` depend on them). **Not deployed to production.** |
| Test parity | Test DB pinned to production's Postgres `17.4.1.075` | 17.6.1.106 segfaults on "permission denied for function" (reproduced). Image pull now retries and falls back to Docker Hub (ECR rate-limited CI once). |
| Flaky test | Fixed | `012` #25 uses the IST date like the function it tests |
| D7 Sentry | Implemented, **not sending** | `src/lib/sentry.ts` allow-list sanitizer; SDK loads only when `VITE_SENTRY_DSN` is set (main bundle unchanged at 418.9 kB). Deliberate dirty-event test `src/lib/sentry.test.ts` asserts 19 forbidden values never survive (JWT, UUIDs, emails, phone numbers incl. spaced form, IP, password, answers, doubt text, cookies, Referer, query tokens); it caught and fixed a spaced-phone leak. CSP allows `*.ingest.de.sentry.io` (EU). |
| Staging | **Refused by Supabase** | `projects create freequademy-staging --region ap-south-1` → "keshav3815 (2 project limit)" for free projects. Nothing was created. DB password pre-generated at `~/.config/freequademy/staging.env` (mode 600, outside repo). |
| Lovable | **STOPPED — connected history, capable of redeploying** | §3 |

## 2. Production state

| Item | Value | Status |
|---|---|---|
| Region | ap-south-1 (Mumbai) | VERIFIED (`projects list`) |
| Postgres | 17.4.1.075 | VERIFIED |
| Plan | Free (inferred: 2-project free limit enforced on this account; no backups) | **UNKNOWN — REQUIRES VERIFICATION** after upgrade |
| Backups / PITR | none / off (WAL-G on, earliest = latest = 0) | VERIFIED ABSENT (`backups list`) |
| Edge Functions | `doubt-solver` only | VERIFIED |
| Secrets (names) | `LOVABLE_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | VERIFIED |
| Frontend | Vercel project `edu-spark-game`, production = `main` @ `b3c3df1` | VERIFIED (GitHub deployments) |
| DB size, storage, Auth users, extensions, migration history, row counts, donations written by the fake endpoint | — | **UNKNOWN — REQUIRES VERIFICATION** (your inventory JSON) |
| Auth settings | — | **UNKNOWN — REQUIRES VERIFICATION** (your dashboard values) |

## 3. Lovable — deployment relationship (STOP item)

| Evidence | Finding |
|---|---|
| Commit authors | 107 of 114 commits are `gpt-engineer-app[bot]` (Lovable's GitHub App), including `main`'s head `b3c3df1` (2026-01-28 21:50 UTC) |
| Function deploy times | `verify-payment` v10, `create-razorpay-order` v9 and `doubt-solver` v9 were all redeployed **2026-01-28 21:16 UTC**, minutes before Lovable's commits at 21:18–21:50 — although the payment functions' code had not changed since 2025-10-09 |
| Mechanism (inferred from the evidence above) | Lovable holds (1) a GitHub App installation with write access that two-way syncs `main`, and (2) a Supabase connection that deploys **every** Edge Function in its copy of the code during an editing session, changed or not |
| Current state | **UNKNOWN — cannot be verified from this machine** (listing GitHub App installations needs a GitHub-App user token; Lovable and Supabase OAuth-app settings are dashboard-only) |
| Risk | Opening the Lovable project and making any edit would very likely redeploy `verify-payment` (still present in `main` and in Lovable's copy) |

**What you need to do** (only you have access): (1) Lovable → project → Settings → GitHub: disconnect; (2) Lovable → Supabase integration: disconnect; (3) GitHub → Settings → Applications → Installed GitHub Apps → Lovable: uninstall or remove this repo; (4) Supabase → Organization → OAuth Apps / Integrations: revoke Lovable. Until then, **do not open the project in Lovable.** I will re-verify `functions list` afterwards.

## 4. Phase 0 gate

| # | Gate item | Status | Evidence / blocker |
|---|---|---|---|
| 1 | Fake-payment functions remain deleted | **PASS** | 404 on OPTIONS/POST; `functions list` |
| 2 | No code/config can redeploy them accidentally | **FAIL** | Branch clean, but `main` still has the source and Lovable can redeploy (§3) |
| 3 | Working tree committed and pushed | **PASS** | `origin/architecture/v1-phase-0` |
| 4 | Draft PR created | **PASS** | #1 |
| 5 | CI green | **PASS** | run 36786267634, 6/6 jobs |
| 6 | pgTAP passing (321/321) | **PASS** | CI + local |
| 7 | Production inventory complete | **BLOCKED** | Your inventory JSON |
| 8 | Auth settings documented | **BLOCKED** | Your dashboard values |
| 9 | Supabase Pro verified | **BLOCKED** | Upgrade is dashboard-only (no billing in CLI/API); I verify via `backups list` + project creation afterwards |
| 10 | Mumbai production region verified | **PASS** | ap-south-1 |
| 11 | Staging project exists | **BLOCKED** | Refused at Free limit; needs #9 |
| 12 | Preview uses staging | **BLOCKED** | Needs #11 |
| 13 | Production uses production | **PASS (current)** | Production deploy of `b3c3df1` uses production; re-verify after Vercel env change |
| 14 | `.env` removed safely | **BLOCKED** | Needs #11–12 first (by your rule) |
| 15 | Lovable relationship verified | **FAIL / STOP** | §3 |
| 16 | Sentry approved and scrubbing verified | **PARTIAL** | Approved; scrubbing verified by test. Live test error needs a Sentry project (EU, IP storage off) and DSN — you create it or give access |
| 17 | Backup exists | **BLOCKED** | Needs #9, then ~24 h |
| 18 | Restore drill completed | **BLOCKED** | Needs #11 + #17 |
| 19 | RTO ≤ 4 h demonstrated | **BLOCKED** | Needs #18 |
| 20 | Production migration history reconciled | **BLOCKED** | Needs #7 |
| 21 | No unresolved P0 | **FAIL** | #2 / #15 (redeploy path) and C3 drift remain |
| 22 | No blind production migration performed | **PASS** | No migration applied to production; the only production change was the approved D1 deletion |

## 5. Next steps (in order, after your actions)

1. You: upgrade the org to Pro; tell me when done.
2. You: resolve Lovable (§3).
3. You: send the inventory JSON + Auth settings.
4. You: create a Sentry project (EU region, "Prevent storing IP addresses" on) and send the DSN, or grant access.
5. Me: create staging (Mumbai), apply all 26 migrations, run pgTAP + E2E against it, compare with production's migration history, configure Vercel Preview → staging and Production → production (Vercel CLI credentials exist on this machine; will verify access), remove `.env`, verify bundles, run the restore drill once the first backup exists, send a deliberate Sentry test error from staging, then re-run this gate.

D8 (incident owner): UNKNOWN — REQUIRES YOUR DECISION. D3–D6: not started.
