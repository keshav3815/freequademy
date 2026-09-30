# Phase 6: Testing, CI/CD, staging boundary, observability

Status: **complete locally**. Nothing pushed, no GitHub Actions run has executed yet
(that only happens once this lands on GitHub) — the workflow was validated by running
every one of its steps locally with the same commands/images it uses.

## A. Executive summary

Before this phase: zero tests, zero CI, one Supabase project used for local dev,
staging and (implicitly) production, and a render error anywhere in the app blanked
the whole page with nothing recorded. After:

- **207 pgTAP assertions** across 11 files — the authorization regression suite for
  every RLS policy and RPC from Phases 0–4.
- **31 Vitest unit tests** for the highest-risk pure logic (Markdown XSS-safety,
  redirect-target validation, AI input validation, the route guard's role matrix).
- **9 Playwright end-to-end tests** across 3 files, run against a real local Supabase
  stack (`supabase start`) with real HTTP requests, real RLS, real PostgREST — not
  mocked. Covers the flows Phases 0–4 fixed: signup→dashboard, mentor application→
  admin approval→teacher dashboard access, lesson→test→server-scored result→dashboard
  progress, forum thread→reply→vote→solution, mentor session with a private link→
  student registers→link revealed only to that student. A forged role-escalation
  request replayed with a real student's JWT is rejected over real HTTP (401/403),
  which is the strongest evidence available short of a production penetration test
  that the Phase 0 fix holds outside the SQL test harness too.
- **CI workflow** (`.github/workflows/ci.yml`): lint, typecheck, unit tests (with
  coverage), pgTAP, and the full Playwright suite against an ephemeral `supabase
  start` stack — all on every PR and on push to `main`.
- **Dependabot** for npm and GitHub Actions, grouped to avoid PR spam.
- **Environment separation**: `src/integrations/supabase/client.ts` reads
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` from the environment (done in
  Phase 0) with `.env.example` as the template; `docs/environments.md` documents the
  local→staging→production flow so Phase 2+ schema work never lands directly on
  production.
- **Error boundary + global error handlers** so a render exception shows a recovery
  screen instead of a blank app, with an opt-in reporting hook (`VITE_ERROR_REPORTING_URL`)
  that's inert by default.
- **README rewritten** from a 6-line stub to actual setup/scripts/docs pointers.

**What remains** (documented, not silently dropped): no writer yet for
`user_activity_log` (admin audit trail table exists, stays empty — see
`docs/observability.md` for exactly which RPCs should write to it and why that's
product-shaped work left for later); no uptime/synthetic monitoring; no query-level
perf dashboard beyond Supabase's built-in `pg_stat_statements`.

## B. Files changed

| Path | Change | Reason |
|---|---|---|
| `.github/workflows/ci.yml` | new | Lint/typecheck/build, unit tests, pgTAP, E2E — every PR |
| `.github/dependabot.yml` | new | Weekly npm + Actions updates, grouped |
| `vitest.config.ts` | new | jsdom environment, path alias, coverage config |
| `src/test/setup.ts` | new | `@testing-library/jest-dom` matchers, cleanup |
| `src/lib/auth.test.ts` | new | `safeRedirectPath`/`homePathForRole` unit tests |
| `src/lib/markdown.test.tsx` | new | Markdown renderer: no raw HTML, https-only links |
| `src/lib/video.test.ts` | new | YouTube embed URL allow-list |
| `src/components/auth/RequireAuth.test.tsx` | new | Route guard loading/redirect/role matrix |
| `supabase/functions/doubt-solver/validation.test.ts` | new | AI input validation as pure logic |
| `playwright.config.ts` | new | Refuses to run against a non-local Supabase URL |
| `e2e/fixtures.ts`, `e2e/global-setup.ts` | new | Local-stack helpers + idempotent seed (admin, mentor, one lesson+test) |
| `e2e/security.spec.ts` | new | Auth redirects, mentor-signup-is-student-only, forged-role-PATCH-rejected, post-login redirect |
| `e2e/learning.spec.ts` | new | Lesson→test→dashboard progress; admin mentor approval; mentor dashboard content |
| `e2e/community-mentorship.spec.ts` | new | Thread/reply/vote/solution; session registration + private meeting link |
| `src/components/ErrorBoundary.tsx` | new | App-level render-error recovery screen |
| `src/lib/monitoring.ts` | new | `reportError`, `installGlobalErrorHandlers`; inert without `VITE_ERROR_REPORTING_URL` |
| `src/main.tsx` | edited | Wrap `<App/>` in `ErrorBoundary`; install global handlers |
| `src/vite-env.d.ts` | edited | `VITE_ERROR_REPORTING_URL`, `VITE_APP_RELEASE` types |
| `README.md` | rewritten | Setup, scripts, doc pointers (was a 6-line stub) |
| `docs/testing.md` | new | What each test layer covers, the local-image supautils crash workaround, how to run E2E locally |
| `docs/observability.md` | new | Error reporting, audit-trail gap, perf-dashboard gap |
| `package.json` | edited | `typecheck`, `test`, `test:watch`, `test:db`, `test:e2e` scripts; test devDependencies |

## C. Validation results

| Check | Result |
|---|---|
| `npm run lint` | 0 errors, 13 warnings (all `react-hooks/exhaustive-deps` on intentional mount-only effects, pre-existing pattern) |
| `npm run typecheck` (`strict: true`) | 0 errors |
| `npm run build` | Clean; route-level `lazy()` splitting already in place from earlier work (Dashboard/AdminPanel/TeacherDashboard/Footer each their own chunk; main entry chunk 400.94 kB vs. the 839.97 kB single-bundle baseline recorded in the original audit — a build-size fact, not a runtime benchmark) |
| `npm test` (Vitest) | 31/31 passed |
| `npm run test:db` (pgTAP) | 207/207 passed, run twice (idempotency check on all migrations) |
| `npm run test:e2e` (Playwright, local `supabase start`) | 9/9 passed |

## D. Production verification required

| Item | Verified locally? | Action |
|---|---|---|
| CI workflow actually runs on GitHub | ❌ not yet pushed | Push and confirm the Actions run succeeds; the `supabase/setup-cli` and `docker` (built into `ubuntu-latest`) dependencies are standard, no exotic setup |
| Dependabot PRs | ❌ | Will start appearing weekly once merged to the default branch |
| Error-reporting endpoint | ❌ not configured | Decide between a Supabase-Edge-Function sink or a third-party tracker (see `docs/observability.md`), set `VITE_ERROR_REPORTING_URL` in the hosting provider's env vars — **do this only for staging/production, never point it at a client-writable table without RLS** |
| Staging Supabase project | ❌ still doesn't exist (Phase 0 note) | Required before any of these migrations touch anything but local/CI |

## E. Next phase

Phase 7: performance, SEO, accessibility, scalability — see
`docs/remediation/phase-7-performance-a11y-seo.md`.
