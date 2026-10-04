# Phase 7: Performance, Accessibility, SEO, Scalability

Status: **complete locally**. Migration `20260929140000_2e8f6a13-….sql` applied and
verified idempotent (twice, on a fresh database) and against the local E2E stack.
pgTAP: 207/207. Playwright E2E: 9/9 (rerun after every change in this phase, not just
at the end). Lint: 0 errors. Typecheck (`strict: true`): 0 errors.

## A. Executive summary

Most of the hot-path performance findings from the original audit (§13, PERF-001
through PERF-011) were already closed incidentally in Phases 1 and 5 while fixing the
underlying feature (batched author lookups instead of N+1, `head: true` counts,
filtered realtime instead of unfiltered, route-level `lazy()` from an earlier
session's work). What Phase 7 adds:

- **Bundle size**: main entry chunk is 398.94 kB (125.39 kB gzip) as of this build vs.
  839.97 kB (233.48 kB gzip) in a single bundle at the original audit — both numbers
  from real `vite build` output, not a runtime benchmark. The reduction is mostly
  route-level code-splitting (already in place) plus the 24 unused shadcn primitives
  and 8 orphaned components deleted in Phase 5.
- **Unbounded admin queries**: `ContentManagement`, `ReportManagement`, `Blog`,
  `Mentorship` (programs and mentors lists) had no `.limit()` — capped at 200/50/60
  rows respectively (proportionate, not full cursor pagination — see "Deferred"
  below for why).
- **Unused realtime replication removed**: `profiles` and `forum_threads` were on
  `REPLICA IDENTITY FULL` and in the `supabase_realtime` publication with **zero**
  frontend subscribers (confirmed by `grep -rln "postgres_changes\|\.channel(" src`
  — only `TeacherDashboard.tsx` uses realtime, and only for `mentorship_sessions`,
  filtered to `mentor_id=eq.<uid>` since Phase 1). `FULL` makes Postgres log the
  entire old row on every `UPDATE` for a subscriber that never existed; removed for
  both tables. `mentorship_sessions` keeps `FULL` + publication membership — it has
  a real, filtered subscriber.
- **Accessibility**: every icon-only button/link without an accessible name found by
  re-auditing the current codebase (not the original audit's file list, which had
  drifted) now has `aria-label`; three "clickable `Card` + `onClick`" patterns with no
  keyboard support were converted to real `<Link>`s (also fixes SEO — these are now
  crawlable links, not just visually clickable); one card (game difficulty picker)
  kept its `onClick` but gained `role="button" tabIndex={0}` + Enter/Space handling;
  fake/placeholder contact info (a sequential-digits phone number, a "123, Education
  Hub" address) was removed rather than kept looking real — a wrong phone number is
  actively worse than none.
- **SEO**: `useDocumentMeta` hook sets a real per-route `<title>`, meta description,
  `og:title`/`og:description`/`og:url`, and — importantly — **fixes a real bug**: the
  static `<link rel="canonical" href=".../">` in `index.html` was being served
  unchanged for every route, which tells search engines every page on the site is a
  duplicate of the homepage. Applied to 13 pages (blog post/index, subject/lesson
  detail, courses, tests, mentorship, community, thread/club detail, about/help/
  pricing/privacy/terms). `sitemap.xml` (static routes only — see the file's own
  comment for why dynamic content isn't enumerated) + `robots.txt` updated to
  reference it and to `Disallow` account-only pages that have no SEO value.
- **Broken/missing footer links closed**: `/about`, `/help`, `/pricing`, `/privacy`,
  `/terms` all 404'd before this phase (flagged as PROD-004 in the original audit —
  no privacy policy or terms for a platform serving minors). Real pages now exist;
  Privacy and Terms are explicitly marked as drafts pending legal review, not
  presented as finished legal documents.
- **Scalability**: no architecture change (a monolith-over-Supabase remains
  appropriate per the original audit's own reasoning, which this phase doesn't
  revisit) — see section D below for what's now provably race-safe vs. still
  deferred.

## B. Files changed

| Path | Change | Reason |
|---|---|---|
| `supabase/migrations/20260929140000_2e8f6a13-….sql` | new | Drop `profiles`/`forum_threads` from realtime publication, revert to `REPLICA IDENTITY DEFAULT` |
| `src/hooks/useDocumentMeta.ts` (+ `.test.tsx`) | new | Per-route title/description/canonical/OG, with restore-on-unmount |
| `src/pages/{Blog,Courses,MockTests,Mentorship,Community}.tsx`, `src/pages/BlogPost.tsx`, `src/pages/learn/{SubjectDetail,LessonView}.tsx`, `src/pages/community/{ThreadDetail,ClubDetail}.tsx` | edited | Call `useDocumentMeta` with real per-page titles/descriptions |
| `src/pages/legal/PrivacyPolicy.tsx`, `src/pages/legal/TermsOfService.tsx` | new | Real pages, explicitly marked draft-pending-legal-review |
| `src/pages/About.tsx`, `src/pages/Help.tsx`, `src/pages/Pricing.tsx` | new | Close remaining footer 404s |
| `src/App.tsx` | edited | Routes for the 5 new static pages |
| `tailwind.config.ts` | edited | Register `@tailwindcss/typography` (already a dependency, unused — needed by the new `prose`-class legal pages, and by the pre-existing `BlogPost.tsx`, which was silently getting no typographic styling either) |
| `public/sitemap.xml` | new | Static routes; documents why dynamic content isn't included |
| `public/robots.txt` | edited | References the sitemap; `Disallow`s account-only routes |
| `src/components/Footer.tsx` | edited | Removed 4 dead `href="#"` social icons and 2 fabricated contact details (phone, address); real Instagram link gets an `aria-label`; email is now a real `mailto:` link |
| `src/components/teacher/MyBlogPosts.tsx`, `src/pages/BlogAdmin.tsx`, `src/pages/BlogEdit.tsx`, `src/components/dashboard/DashboardLayout.tsx`, `src/components/teacher/NotificationBell.tsx` | edited | `aria-label` on icon-only buttons that had none |
| `src/components/community/ForumSection.tsx`, `src/components/community/ClubsSection.tsx` | edited | Clickable `Card+onClick` → real `<Link>` (keyboard access + crawlability); `ClubsSection` also restructured so the nested "Join" button is no longer inside an interactive wrapper (invalid/inaccessible HTML) |
| `src/pages/GuessNumberGame.tsx` | edited | Difficulty-picker cards gain `role="button" tabIndex={0}` + keyboard activation |
| `src/pages/admin/AdminDashboard.tsx` | edited | "Quick Actions" cards had `cursor-pointer` styling and **no `onClick` at all** — wired to the real `/admin/content`, `/admin/reports`, `/admin/activity` routes as `<Link>`s |
| `src/pages/admin/ContentManagement.tsx`, `src/pages/admin/ReportManagement.tsx` | edited | Added `.limit(200)` (were unbounded) |
| `src/pages/Blog.tsx` | edited | Added `.limit(60)`; also migrated its manual `profiles.role` fetch to the shared `useAuth()` context (Phase 5 pattern this file had missed) |
| `src/pages/Mentorship.tsx` | edited | Added `.limit(50)` to the programs and mentors queries |

## C. Validation results

| Check | Result |
|---|---|
| `npm run lint` | 0 errors, 13 warnings (unchanged — pre-existing `exhaustive-deps` on intentional mount-only effects) |
| `npm run typecheck` (`strict: true`) | 0 errors |
| `npm run build` | Clean; 398.94 kB main chunk (125.39 kB gzip) |
| `npm test` (Vitest) | 35/35 (adds 4 tests for `useDocumentMeta`) |
| `npm run test:db` (pgTAP) | 207/207, migration applied twice (idempotency) |
| `npm run test:e2e` (Playwright, local stack) | 9/9, rerun after every change in this phase |

## D. Scalability — what's provably safe now, what's still deferred

The original audit's target architecture (Supabase monolith, no premature
microservices) isn't revisited here — nothing since has changed that judgment. What
changed is which specific race conditions are now closed by a database-level lock or
guard, provable from the SQL itself rather than claimed from a benchmark:

| Concern | Mechanism | Where |
|---|---|---|
| Two students racing for the last seat in a session | `SELECT ... FOR UPDATE` on the session row before counting registrations | `register_for_session` (Phase 1) |
| A student submitting the same test twice, or after the timer | Row lock + `status = 'in_progress'` guard; re-submission returns the stored result instead of rescoring | `submit_test_attempt` (Phase 2) |
| Two requests racing past the daily AI quota | Atomic `INSERT ... ON CONFLICT DO UPDATE ... WHERE request_count < limit` | `consume_ai_quota` (Phase 0) |
| Event RSVP racing past `max_attendees` | Row lock on the event before counting registrations | `enforce_event_capacity` trigger (Phase 1) |
| Two admins approving the same application | Row lock + `status = 'pending'` guard | `approve_mentor_application` (Phase 0) |

Deferred, and why (none of these are silently dropped — they're genuinely
product-shaped or infra-shaped decisions, not safety gaps):

- **Full cursor-based pagination** on admin lists (content/reports) — a `.limit(200)`
  cap was added instead of building "load more"/keyset pagination UI, since the
  latter is a UI feature decision (page size, sort stability under concurrent
  writes) better made alongside the admin-tooling work than bolted on here.
- **Background jobs** (session reminders, digest emails) — no job runner exists yet;
  Supabase's `pg_cron` + an Edge Function is the natural fit when this is built.
- **Full-text search** for the forum/blog — Postgres FTS (`tsvector`/`GIN`) would be
  proportionate per the original audit; not implemented, no search UI exists to need
  it yet.
- **Dynamic sitemap generation** — needs a live database to enumerate published
  content; documented in `public/sitemap.xml` itself.
- **Connection pooling** — hosted Supabase provides this (Supavisor/pgbouncer) by
  default; nothing in this codebase needs to configure it, so there's nothing to fix
  here, only to be aware of once real traffic exists.

## E. Production verification required

Same category as every other phase — nothing here was run against anything but a
local database and a local Playwright browser:

| Item | Verified locally? | Action |
|---|---|---|
| Realtime publication change | ✅ against local + local E2E stack | Apply via `supabase db push` to staging, confirm the teacher dashboard's live session updates still work (they should — `mentorship_sessions` membership is untouched) |
| Sitemap/robots.txt | ❌ can't verify crawler behavior locally | After deploy, submit `sitemap.xml` in Google Search Console; spot-check a shared blog-post link's preview in WhatsApp/Slack (expected: still shows the homepage's OG image today — see the "still open" note in `docs/remediation/phase-1-workflows.md` and the comment in `useDocumentMeta.ts` for why, and what closing that gap would require) |
| Privacy Policy / Terms of Service | ❌ explicitly not legal advice | Route to actual legal review before this is relied on for DPDP Act 2023 / minors-data compliance — this phase closes the "page doesn't exist" gap, not the "content is legally sufficient" gap |

## F. Next phase

Phase 8: final production-readiness audit — re-run the original 40-section audit
methodology against the post-remediation codebase and produce a scorecard showing
what moved, what didn't, and what's left for a team picking this up after Phase 7.
