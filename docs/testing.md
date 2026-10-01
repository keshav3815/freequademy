# Testing

Four layers, each with a distinct job. All four run in CI (`.github/workflows/ci.yml`)
on every PR; none of them touch a hosted Supabase project.

## 1. Database tests (pgTAP) — `npm run test:db`

`supabase/tests/database/*.test.sql`, run by `scripts/test-db.sh` against a disposable
local Postgres container (the same image Supabase uses, so `auth.users`, RLS roles
and extensions match production). The script:

1. starts a throwaway container,
2. applies every migration in `supabase/migrations/` in order, in one transaction each
   (the same way `supabase db push` applies them),
3. runs every `*.test.sql` file, each in its own transaction that rolls back at the
   end, so tests never leak state into each other,
4. tears the container down.

This is the primary regression suite for authorization: every RLS policy, column
grant and SECURITY DEFINER function added in Phases 0–4 has both an ALLOWED and a
DENIED test, exercised as anonymous, student, mentor, admin, and — where ownership
matters — as two different students or two different mentors. `supabase/tests/helpers.psql`
provides `tests.create_user`, `tests.make_mentor`, `tests.make_admin`,
`tests.authenticate_as` and `tests.become_anon` to switch persona mid-transaction.

Add a new test file as `supabase/tests/database/0NN_topic.test.sql`; it's picked up
automatically.

**Known local-only quirk:** the standalone `supabase/postgres` Docker image (not
`supabase start`) segfaults if a Postgres role with no `EXECUTE` privilege calls a
function at all — even a trivial one. It's a bug in that image's `supautils`
extension, not in this schema (confirmed by bisecting `shared_preload_libraries` /
`session_preload_libraries`; see git history on the Phase 0 migration). The fix
applied here: RPCs that must be unreachable by anonymous or unauthenticated callers
live in a `private` schema with `REVOKE ALL ON SCHEMA private FROM PUBLIC` — PostgREST
never exposes non-`public` schemas, so they're unreachable through the API regardless,
and the tests call them as normal authenticated/anonymous roles without tripping the
crash. Every RPC meant to be called from the client keeps its own internal
`auth.uid()` / `has_role()` check as the real authorization boundary (defense in
depth), verified over real HTTP against `supabase start` — see the note below.

## 2. Unit tests (Vitest) — `npm test`

`src/**/*.test.{ts,tsx}` and `supabase/functions/**/*.test.ts`, jsdom environment.
Covers pure logic that's easy to get subtly wrong and expensive to catch via E2E:

- `src/lib/markdown.test.tsx` — the hand-rolled Markdown renderer never emits raw
  HTML from user/AI content (XSS-adjacent), only allows `https(s)` links.
- `src/lib/video.test.ts` — YouTube URL → privacy-enhanced embed, rejecting non-YouTube
  hosts and non-`https` URLs (used for lesson videos).
- `src/lib/auth.test.ts` — `safeRedirectPath` rejects `//host`, backslash and
  non-string redirect targets (open-redirect guard for the post-login bounce).
- `supabase/functions/doubt-solver/validation.test.ts` — the AI function's input
  validation (question length, grade/subject allow-lists, image type/size) as a pure
  function, independent of Deno.
- `src/components/auth/RequireAuth.test.tsx` — the route guard's loading/redirect/
  role-matrix behavior, with `useAuth` mocked.

Run with coverage: `npx vitest run --coverage` (HTML report in `coverage/`).

## 3. End-to-end tests (Playwright) — `npm run test:e2e`

`e2e/*.spec.ts`, against a **local** `supabase start` stack only — `playwright.config.ts`
throws if `E2E_SUPABASE_URL` isn't `127.0.0.1`/`localhost`. `e2e/global-setup.ts` seeds
an admin, an approved mentor, and one published lesson + test, using the stack's
service-role key (local-only; never a production key).

```bash
supabase start
supabase status -o json | jq -r '"E2E_SUPABASE_URL=" + .API_URL, "E2E_SUPABASE_PUBLISHABLE_KEY=" + .ANON_KEY, "E2E_SUPABASE_SECRET_KEY=" + .SERVICE_ROLE_KEY' > .env.e2e.local
set -a; source .env.e2e.local; set +a
npm run test:e2e
```

Locally, `E2E_BROWSER_CHANNEL=chrome` reuses an installed Google Chrome instead of
downloading Playwright's own Chromium build. CI installs Chromium directly
(`npx playwright install --with-deps chromium`) so it doesn't depend on that.

Covers the flows that only make sense end-to-end, through the real UI, the real
Postgres RLS policies and the real HTTP API — i.e. exactly the surface a browser
exploit or a broken policy would hit:

- `security.spec.ts` — anonymous redirect-to-login on every protected route; mentor
  signup grants **student** only, never mentor, until an admin approves; a forged
  `PATCH /rest/v1/profiles {role: mentor}` replayed with the student's own JWT is
  rejected by PostgREST (401/403), proving the RLS fix holds over real HTTP, not just
  inside a SQL transaction; post-login redirect returns to the originally requested page.
- `learning.spec.ts` — full student journey (lesson → mark complete → test → server-
  scored result → dashboard reflects real XP/streak, not the old hard-coded numbers);
  full admin mentor-approval journey (apply → `Access denied` on `/teacher-dashboard`
  → admin approves → access granted); mentor dashboard shows real seeded content.
- `community-mentorship.spec.ts` — new thread → reply from a second student (author
  name resolved via `public_profiles`, not "Anonymous") → upvote → mark solution;
  mentor creates a session with a private meeting link → student registers → the link
  is only revealed to the registered student, via `get_session_meeting_link()`.

## 4. Lint & types — `npm run lint`, `npm run typecheck`

`strict: true` (see `tsconfig.app.json`) across the whole `src/` tree since Phase 5.
ESLint has zero errors as of Phase 5 (12 unused shadcn primitives and 8 orphaned
components were deleted rather than left to bit-rot; see `git log` for that commit).

## What's deliberately not covered yet

- Load/perf testing (Phase 7 discusses the reasoning, no numbers are fabricated here).
- Visual regression.
- The two Edge Functions that only proxy Razorpay were deleted in Phase 0 (unused,
  insecure) rather than tested — see `docs/remediation/phase-0-security.md`.
