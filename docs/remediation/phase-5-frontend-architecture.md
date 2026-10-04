# Phase 5: Centralize frontend architecture, TypeScript, dead code

Status: **complete locally**. No new migration. Implemented right after Phase 1,
**before** Phases 2–4 — deliberately: those phases' pages (mentor applications
review, lesson/test editors and viewers, the doubt-escalation queue) all needed a
real auth foundation and route guards to be built against, rather than being
written first against the old scattered `getUser()` pattern and then migrated
later. Every `useAuth()` call in Phases 2–4's code, and every `<RequireAuth>` route
in `App.tsx`, depends on what this phase built.

## A. Objective

ARCH-001 in the original audit: no route guards, no central auth state — every page
independently called `supabase.auth.getUser()`/`getSession()`, independently
queried `profiles.role`, and `Login.tsx` had both an `onAuthStateChange` listener
**and** a `getSession()` promise both calling `navigate()`, racing each other. Also
BUG-006 (`useUserRole` errored, not just returned null, for a user holding both
`admin` and `moderator`, silently locking them out of `/admin`), and the broader
code-quality findings: `strict: false` TypeScript letting real bugs through
(BUG-003/004/005 in the original audit were partly a consequence of this), 8
components with zero importers, 24 unused shadcn UI primitives.

## B. What was built

- **`src/contexts/AuthContext.tsx`** — the one place `user`, `session`, `profile`
  and roles are fetched. Lazy-loads the Supabase client itself (`import()`, not a
  static import) so the public landing page's bundle doesn't pay for it. Computes
  a single effective `role` (`admin` > `moderator` > `mentor` > `student`) from
  both `profiles.role` and `user_roles` — this is what fixes BUG-006: a dual-role
  user gets `admin` (the highest), not an error.
- **`src/components/auth/RequireAuth.tsx`** — a route guard with an optional
  `allow` role list; used on every protected route in `App.tsx`
  (`/dashboard`, `/teacher-dashboard`, `/mentor-dashboard`, `/mentor-application`,
  `/admin/*`, `/blog/create`, `/blog/edit/:id`, and every Phase 2–4 route added
  after this). Covered by 6 Vitest unit tests (Phase 6:
  `src/components/auth/RequireAuth.test.tsx`) with `useAuth` mocked — loading
  state, anonymous redirect, any-signed-in-user pass-through, and the role-matrix
  denial/allow cases.
- **`src/lib/auth.ts`** — `homePathForRole` (where to send a user after login,
  by role) and `safeRedirectPath` (rejects `//host`, backslash tricks, and
  non-string redirect targets — an open-redirect guard for the post-login bounce;
  covered by its own Vitest suite, Phase 6). `Login.tsx` was rewritten to a single
  effect driven by `AuthContext`, removing the double-`navigate()` race.
- **`src/hooks/useUserRole.tsx`** — rewritten as a thin wrapper over
  `AuthContext`, fixing BUG-006 directly.
- **`src/integrations/supabase/client.ts`** — this is also where Phase 0's
  environment-variable-driven client change lives; grouped here in this document
  only because it's the same "frontend foundation" surface, not because it's new
  work.
- **`SignupMentor.tsx`** rewritten so mentor signup creates a student account plus
  a pending application (the frontend half of Phase 0's DB-level fix — the trigger
  already forced `role = 'student'`; this made the UI honest about it instead of
  still calling itself "Sign up as Mentor").
- **`strict: true`** enabled in `tsconfig.app.json` (was `strict: false`,
  `noImplicitAny: false`) across the whole `src/` tree. Getting there required
  fixing 12 real strict-mode errors, mostly hand-written page-local interfaces
  (`Category`, `Thread`, `Event`, `Report`, `ActivityLog`, `ContentItem`) that had
  drifted from the actual (nullable) database column types — replaced with
  `Tables<"...">` from the generated Supabase types, which is what should have
  been used from the start and is what prevents this exact class of drift going
  forward.
- **Dead code removed**: 8 components with zero importers
  (`AnalyticsWidget`, `CommunityWidget`, `DailyChallenge`, `Leaderboard`,
  `MentorWidget`, `SmartTests`, `MentorShowcase`, `Testimonials`) and 24 unused
  shadcn UI primitives (accordion, alert, aspect-ratio, avatar, breadcrumb,
  carousel, chart, collapsible, command, context-menu, drawer, form, hover-card,
  input-otp, menubar, navigation-menu, pagination, popover, radio-group,
  resizable, sidebar, slider, toggle-group) — each verified zero-importer by grep
  immediately before deletion, re-verified after the landing-page redesign
  (a separate, concurrent piece of work in this repo) to make sure nothing had
  started using them since.
- **12 redundant `supabase.auth.getUser()` calls** (a network round trip) replaced
  with `supabase.auth.getSession()` (local, no network call) across every file that
  had the pattern — this is PERF-007 from the original audit.

## C. Validation

Full aggregate validation (lint/typecheck/build/unit/pgTAP/E2E) is in
`phase-8-final-audit.md` §4. `strict: true` has held at 0 errors through every
subsequent phase's changes, including the large Phase 2–4 additions. `RequireAuth`'s
own behavior is unit-tested (Phase 6); it's also exercised end-to-end by every E2E
test that touches a protected route (all three spec files).

## D. What's still open

ARCH-003 in the original audit (React Query barely used) was **not** fully
addressed here — `Blog`/`BlogPost` are the only pages using it; every other page
kept its manual `useEffect`+`useState` fetching unless it was being rewritten for a
different reason anyway. Named explicitly, with reasoning, in
`phase-8-final-audit.md` §2/§5 rather than silently left.
