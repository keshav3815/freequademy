# Phase 0 — Security, Authorization & Production Safety

**Status: complete locally. Nothing has been applied to staging or production.**
Baseline: `FREEQUADEMY_AUDIT.md` (2026-09-29). Nothing was committed, pushed or deployed.

## A. Executive summary

**Fixed, enforced in the database and covered by pgTAP:**

- Signup can never grant mentor, admin or moderator.
- `profiles.role` and `profiles.email` cannot be changed by clients.
- Mentor trust fields (`is_verified`, `rating`, `total_sessions`) cannot be self-modified.
- Mentor rows exist only through admin approval.
- Mentorship programs are admin-managed.
- Blog posts can only be created as yourself, `author_name` cannot be spoofed, and authors can read their own drafts.
- Meeting links are readable only by the session's mentor, its registered students and admins.
- Forum categories are admin-only. Events are limited to mentors and admins, with https links. Clubs can only be created as yourself. Club membership is always the plain `member` role.
- The AI doubt solver has server-side input validation, `max_tokens`, a timeout, and a 30-requests-per-day quota per user.

**Removed:** the fake `create-razorpay-order` and `verify-payment` functions and their config entries.

**Foundation added:**
- Environment-driven Supabase client and `.env.example`.
- `AuthProvider` with route guards.
- A disposable-database pgTAP runner (`scripts/test-db.sh`).

**What remains** is listed in sections F and G. The most important items need someone with production access:
- apply the migration (staging first);
- delete the two payment functions from the hosted project;
- review existing mentor accounts;
- move `.env` into Vercel environment variables.

## B. Files changed

| Path | Change | Reason |
|---|---|---|
| `supabase/migrations/20260929100000_8bbe4e2f-….sql` | new | All Phase 0 database changes (section C) |
| `supabase/tests/helpers.psql` | new | Persona helpers (anon/authenticated, JWT claims) |
| `supabase/tests/database/001–008_*.test.sql` | new | 122 pgTAP assertions |
| `scripts/test-db.sh` | new | Disposable Postgres, applies all migrations, runs pgTAP. Never contacts hosted Supabase. |
| `supabase/functions/create-razorpay-order/` | deleted | Mock order IDs, unauthenticated, no callers |
| `supabase/functions/verify-payment/` | deleted | `isValid = true` plus service-role insert (SEC-002) |
| `supabase/config.toml` | edited | Removed payment function entries |
| `supabase/functions/doubt-solver/index.ts` | rewritten | Validation, quota RPC, `max_tokens: 1024`, 30 s timeout, generic errors, `Deno.serve` |
| `supabase/functions/doubt-solver/validation.ts` | new | Pure, unit-testable request validation |
| `supabase/sql/reports/phase0_mentor_review.sql` | new | Read-only query for reviewing existing mentor roles (not run) |
| `src/integrations/supabase/client.ts` | edited | Reads `VITE_SUPABASE_*`; warns if dev points at production |
| `src/integrations/supabase/types.ts` | regenerated (local DB) | New table and RPC types; additions only, no other drift |
| `src/vite-env.d.ts` | edited | Typed env vars |
| `.env.example` | new | Placeholders only |
| `.gitignore` | edited | `supabase/.temp`, `supabase/.branches` |
| `docs/environments.md` | new | Local → staging → production workflow |
| `src/contexts/AuthContext.tsx` | new | One source of truth for user, session, profile, roles, role flags. Lazy-loads the Supabase client so the landing bundle stays small. |
| `src/components/auth/RequireAuth.tsx` | new | Route guard with an optional `allow` list of roles |
| `src/lib/auth.ts` | new | `homePathForRole`, `safeRedirectPath` (blocks `//evil` redirects) |
| `src/App.tsx` | edited | `AuthProvider`; guards on `/dashboard`, `/teacher-dashboard`, `/mentor-dashboard`, `/mentor-application`, `/admin/*`, `/blog/create`, `/blog/edit/:id` |
| `src/hooks/useUserRole.tsx` | rewritten | Delegates to the context. Fixes BUG-006 (users with two roles were locked out). |
| `src/components/Navbar.tsx` | edited | Uses the context instead of its own listeners and profile query |
| `src/pages/Login.tsx` | edited | A single context-driven redirect (removes the double-navigate race). Removed the non-functional "Remember me". |
| `src/pages/SignupMentor.tsx` | edited | Creates a student account plus a pending application; never sends a role |
| `src/pages/Mentorship.tsx`, `MentorDashboard.tsx`, `components/teacher/TeacherStats.tsx` | edited | Explicit session column lists, required once `meeting_link` is column-protected |
| `src/components/dashboard/DoubtSolver.tsx` | edited | Shows server error messages (e.g. quota), `maxLength` 2000, sends only a valid grade |

Other uncommitted changes in the working tree came from a separate session and were left untouched: the landing-page redesign (`src/components/landing/*`, `Index.tsx`, `index.html`, favicons, `tailwind.config.ts`, `index.css`, `Footer.tsx`, the lazy routes in `App.tsx`).

## C. Database changes

Everything is in `20260929100000_8bbe4e2f-6a97-4cab-9de9-be5b25350075.sql`. It is idempotent (it was applied twice locally without error) and changes no data.

| Object | Change | Rationale |
|---|---|---|
| `handle_new_user()` | Role is always `student`; grade restricted to 6–12; name capped at 120 characters | SEC-001 |
| `sync_profile_email()` + trigger on `auth.users` | Keeps `profiles.email` in sync with the verified auth email | SEC-004 |
| `profiles` | Dropped the INSERT policy. UPDATE now has `WITH CHECK`. Column grants allow only `full_name` and `grade`. Guard trigger rejects changes to `role`, `email`, `id` and `created_at` from API roles. | SEC-001/004 |
| `mentors` | Dropped the self-INSERT policy. Column grants cover profile fields only. Guard trigger protects trust fields. UPDATE now has `WITH CHECK`. | SEC-007 |
| `mentor_applications` | INSERT is forced to `pending` with no reviewer, and only one pending application per user. Admin UPDATE now has `WITH CHECK`. `experience_years` CHECK added (NOT VALID). | Application flow |
| `approve_/reject_mentor_application`, `revoke_mentor_role` | New admin-checked SECURITY DEFINER RPCs; no EXECUTE for anon | The only way to grant or revoke mentor |
| `mentorship_programs` | INSERT, UPDATE and DELETE are admin-only | SEC-006 (no owner column exists, so programs are platform catalogue) |
| `blog_posts` | INSERT requires `author_id = auth.uid()` and the mentor role. UPDATE has `WITH CHECK`. Authors can SELECT their own posts. A trigger derives `author_name`. | SEC-008, BUG-008 |
| `mentorship_sessions` | Column-level SELECT without `meeting_link`. INSERT requires a current mentor. UPDATE has `WITH CHECK`. An https-only CHECK (NOT VALID) on `meeting_link`. | SEC-005 |
| `get_session_meeting_link()` | New RPC: returns the link to the mentor, admins, and registered or attended participants | SEC-005 |
| `forum_categories` | INSERT and UPDATE are admin-only | SEC-011 |
| `community_events` | INSERT only by mentors and admins, as themselves. https CHECK (NOT VALID). UPDATE has `WITH CHECK`. | SEC-005b |
| `student_clubs` | Creation stays open to students (the product is student-led clubs), but only as themselves. UPDATE has `WITH CHECK`. | Intentional boundary |
| `club_members` | Joining forces `role = 'member'` | SEC-012 |
| `ai_usage_daily` (new) | Primary key `(user_id, usage_date)`. RLS lets users read their own rows; clients cannot write. | AI-001 |
| `consume_ai_quota()` | Atomic upsert, limit of 30 per day (IST day boundary), limit fixed server-side | AI-001 |
| `is_admin`, `is_mentor`, `is_api_client` | Policy helper functions | — |

## D. RLS test matrix

Result of `scripts/test-db.sh`: **8 files, 122 assertions, all passing.**

As a negative control, the same suite was run with the Phase 0 migration removed. **Every file fails.**

| Area | Anonymous | Student | Mentor | Admin | Cross-user | Result |
|---|---|---|---|---|---|---|
| Signup roles | — | role metadata mentor/admin/moderator/junk → student | — | — | — | 10/10 ✅ |
| Profiles | — | display fields allowed; role, email and insert denied | cannot change others' role | email change via auth sync | A cannot read or update B | 13/13 ✅ |
| Mentor applications and roles | cannot execute approve | cannot self-create a mentor row, grant admin, pre-approve, apply for others, apply twice, or self-approve | cannot approve or grant roles; cannot read others' applications; trust fields denied; bio allowed | approve, double-approve rejected, revoke | mentor cannot edit another mentor | 26/26 ✅ |
| Programs | create/update denied; can list | create/update/delete denied | create/update/delete denied | create/update/delete allowed | — | 11/11 ✅ |
| Blog | drafts hidden; published visible; create denied | create denied | own create allowed; impersonation denied; name derived; own draft visible; transfer denied | reads drafts | author B cannot read, edit or delete A's post | 15/15 ✅ |
| Sessions and meeting links | details listable; `meeting_link` and `select *` denied; no EXECUTE on RPC | unrelated: denied; registered: link; cancelled: no link; cannot create sessions | own session: link; https enforced; revoked mentor cannot create | link | mentor B: no link, cannot create for A, cannot edit A's session, cannot see A's participants; students cannot see each other's registrations | 20/20 ✅ |
| Community | categories, events and clubs denied | categories and events denied; own club allowed; club as other denied; elevated club role denied | categories denied; own event allowed; http rejected; event as other denied | categories and events allowed | cannot edit another student's club | 17/17 ✅ |
| AI quota | no EXECUTE | 30 allowed, 31st refused; cannot reset, delete or insert usage | — | — | cannot read another user's usage; quota is per user | 10/10 ✅ |
| Payments | The two functions were removed from `supabase/functions` and `config.toml`; a repo-wide grep finds no remaining references. This is a file-system fact, not a pgTAP test. | | | | | ✅ (local) |

**Local image caveat:** in the standalone `supabase/postgres:17.6.1.106` container, calling a function *without* EXECUTE privilege crashes the backend with SIGSEGV. This is reproducible with any function, including one-line SQL functions, so it is not caused by this schema. Those three anon cases therefore assert `has_function_privilege('anon', …) = false` instead of calling the function. Hosted Supabase returns `42501` for such calls.

## E. Validation results

| Check | Result |
|---|---|
| pgTAP (`scripts/test-db.sh`) | ✅ 122/122. Negative control fails in all 8 files. |
| TypeScript (`tsc -p tsconfig.app.json --noEmit`) | ✅ 0 errors |
| Build (`vite build`, output to scratchpad) | ✅ Supabase client stays a separate lazy chunk |
| Lint (`eslint .`) | ⚠️ 13 errors, 14 warnings (was 15 errors). All remaining errors predate Phase 0 (`any`, `require` in `tailwind.config.ts`, etc.) and are scheduled for Phase 5. |
| Migration idempotency | ✅ applied twice |
| Other tests | None exist yet (Phase 6) |

## F. Security findings remaining (Phase 1+)

- **Session participants:** a student can set their own status to `attended`, or move their registration to another session. There is no capacity check (BUG-012). Phase 1 will add a `register_for_session` RPC.
- **Mentorship feedback:** can be submitted without having attended the session (SEC-009).
- **Forum:** authors can edit `upvotes`, `reply_count`, `is_pinned` and `is_solution` (SEC-010). Counters are never maintained (BUG-010).
- **Public views:** `mentors_public` and `donations_public` return nothing to other users (DB-001).
- **Rate limiting:** only the AI function is limited. There is no generic insert throttling or signup CAPTCHA (SEC-015).
- **Other:** no security headers (SEC-016); signup error messages allow account enumeration (SEC-013).
- **Realtime:** whether `postgres_changes` strips columns the subscriber cannot SELECT (`meeting_link`) is `BLOCKED — needs verification on staging`. The dashboards currently subscribe to `mentorship_sessions`.

## G. Production verification required

| Item | Verified locally? | Action |
|---|---|---|
| Phase 0 migration | ✅ on a fresh local database | Apply to **staging**, run the suite (`supabase test db`), then production |
| Production schema drift vs migrations | ❌ unknown | `supabase db diff` against staging and production before applying |
| Deployed `verify-payment` / `create-razorpay-order` | ❌ unknown | `supabase functions delete verify-payment` and `supabase functions delete create-razorpay-order` on each project. Deleting files does not undeploy them. |
| Updated `doubt-solver` | ❌ not deployed | Deploy to staging and test the quota and validation errors |
| Existing mentor accounts | ❌ unknown | Run `supabase/sql/reports/phase0_mentor_review.sql` (read-only) and decide per account |
| `donations` rows written by the fake endpoint | ❌ unknown | Review; they are untrustworthy by construction |
| Supabase Auth settings (email confirmation, password policy, redirect allow-list, CAPTCHA) | ❌ | Check in the dashboard |
| Vercel env vars (`VITE_SUPABASE_*` per environment) | ❌ | Configure, then remove `.env` from git |
| Staging Supabase project | ❌ does not exist yet | Create it and put its keys in `.env.development.local` |

## H. Next phase

Phase 1 starts with:
- mentor approval admin UI (on the new RPCs);
- the `public_profiles` view and a fixed `mentors_public` (DB-001);
- repairs to the mentorship flow (register RPC with capacity, meeting-link button, session type and status mapping);
- forum counters and moderation;
- community sub-routes;
- blog slug fixes.
