# Phase 9: Student 360° Analytics Dashboard

Status: **complete locally**. Migration `20260930100000_7f2a4c81-….sql`. pgTAP:
`012_analytics_dashboard.test.sql`, 37 assertions (244 total across the suite). E2E:
2 new spec files/tests plus 3 existing specs updated for the new UI (11/11 passing).
Nothing was committed, pushed, or run against anything but a local database and a
local Playwright browser.

## 1. Dashboard architecture

```
Dashboard.tsx (orchestration only — no fetching of its own)
       ↓
useStudentDashboard(classLevel)   ← the one data-fetching entry point
       ↓  (React Query, one query key per section, all fired in parallel;
       ↓   each section's loading/error/data state is independent)
supabase.rpc(...) / supabase.from(...).select(...)
       ↓
Postgres: SECURITY DEFINER functions, every one scoped to auth.uid() internally
       ↓
RLS on the underlying tables (defense in depth — even if a function's own
auth.uid() scoping were ever removed by mistake, RLS still blocks cross-user reads)
```

Every card is a **presentational** component: it receives already-fetched data as
props and renders loading/error/empty/data itself has no `useEffect`/`supabase`
call of its own except for two narrow, deliberate exceptions —
`MentorshipAnalyticsCard`'s "Join" button (fetches the meeting link on click, not
in bulk, per the Phase 0 authorization rule) and `AttemptReview.tsx` (a standalone
page navigated to independently, not a dashboard section). `DashboardSection.tsx`
wraps each React Query result so a fetch failure renders a **Retry** button, never
silently falls through to a fabricated `0`.

## 2. Metric mapping

| Dashboard metric | Source | Calculation | RLS / auth |
|---|---|---|---|
| Class, subjects | `profiles.grade`, `subjects` | Direct read; no student-level "stream" field exists, so none is shown | `profiles`: own row. `subjects`: public read |
| Academic Year | Computed (`src/lib/academicYear.ts`) | April–March Indian school year from the current date — a calendar fact, not stored data | — |
| Level / XP / XP to next | `get_learning_summary()` | `level = xp/250 + 1`; documented, deterministic formula (unchanged from Phase 2) | `SECURITY DEFINER`, `auth.uid()`-scoped |
| XP this week | `get_learning_summary().xp_this_week` (new) | `SUM(points)` from `xp_events` where the event's IST date ≥ this ISO week's Monday | same |
| Course Progress % | Client-side average of `get_subject_progress()` rows' `lessons_completed/lesson_count` | `Math.round(mean(completion_pct))` across all of the student's class's subjects | same |
| Courses completed/in-progress/not-started | `get_subject_progress().status` (new column) | `not_started` (0 published lessons or 0 completed) / `completed` (completed ≥ published) / `in_progress` (otherwise) | same |
| Lessons completed/remaining | `get_subject_progress()` | `SUM(lessons_completed)` / `SUM(lesson_count) − completed` | same |
| Tests attempted | `get_learning_summary().tests_submitted` | `COUNT(test_attempts WHERE status='submitted')` | same |
| Test average/highest/lowest/pass rate | `get_recent_test_results()` (client-aggregated over ≤10 rows) | `avg`/`max`/`min`/`% ≥ 50` of `percentage` | `SECURITY DEFINER`, own attempts only |
| Score trend | `get_recent_test_results()` | Same 10 rows, oldest→newest | same |
| Recent results + status badge | `get_recent_test_results()` + `src/lib/testGrading.ts` | Status is `scoreStatus(percentage)` — documented thresholds (≥75 Excellent, 50–74 Good, <50 Needs Revision), never an arbitrary per-row label | same |
| Subject performance (completion vs. test avg) | `get_subject_progress()` | Same rows as Course Progress, rendered as a 2-series bar per subject | same |
| Needs Attention | `get_weak_areas()` (new) | Lowest-average subject/chapter with ≥1 real attempt, **filtered client-side to < 60%** (`WEAK_AREA_THRESHOLD`) so a strong score is never mislabelled | same |
| Learning Activity (heatmap) | `get_activity_days()` (new) | Per-day union of real `lesson_progress.completed_at`, `test_attempts.submitted_at`, `doubts.created_at`, attended `session_participants` — never a page visit | same |
| This Week | `get_weekly_summary()` (new) | Real counts for the current and previous ISO week (Asia/Kolkata); a zero-attempt week's average is `NULL`, never a fabricated `0%` | same |
| XP Breakdown | `get_xp_breakdown()` (new) | `SUM(points) GROUP BY source_type` — only `lesson_completed`/`test_submitted`/`doubt_asked`, the three real categories | same |
| Streak (current/best/this week) | `get_learning_summary()` (extended) | Current: consecutive active days ending today/yesterday. Best: longest run ever, scanning distinct active dates once. Both verified by pgTAP with a real gap and a real 2-day run, not just the happy path | same |
| AI Doubts stats | Direct `count`/`select` queries on `doubts` (own rows, RLS-scoped) | `total`/`resolved (status≠escalated)`/`unresolved (escalated)`/`mentor-answered`, top subjects by count | RLS: own rows only |
| Mentorship stats | `get_mentorship_summary()` (new) | Upcoming/completed counts and attendance % from `session_participants`/`mentorship_sessions`, **excluding** the meeting link | same. Meeting link: `get_session_meeting_link()` (Phase 0), fetched only on "Join" click |
| Upcoming Schedule | Existing `UpcomingSchedule.tsx` (Phase 3), unchanged | Registered sessions + registered events, future-dated | RLS: own registrations |
| Continue Learning | Client query on `lesson_progress` + `lessons`/`chapters`/`subjects` join | Most recent unfinished lesson; "Lesson N of M" from the lesson's `sort_order` and its chapter's published-lesson count | RLS: own progress rows |
| Recommendations | `src/lib/recommendations.ts` (pure function, unit-tested) | Deterministic, from data already fetched above: weakest area below threshold → untested subject with published tests → unresolved doubts. No LLM call | — |

## 3. Database changes

One migration, `supabase/migrations/20260930100000_7f2a4c81-5e9d-4b36-a1c7-8d3f6e0b9a52.sql`:

- **`private.award_doubt_xp()` trigger on `doubts`** — closes the one already-anticipated-but-unused XP category (`doubt_asked` was a valid `xp_events.source_type` since Phase 2's `CHECK` constraint, never awarded). +3 XP per doubt, idempotent via the existing `UNIQUE (user_id, source_type, source_id)` constraint.
- **`get_learning_summary()`** — dropped and recreated (return shape changed) with `best_streak_days`, `active_days_this_week`, `active_days_last_30`, `xp_this_week`.
- **`get_subject_progress()`** — dropped and recreated with `status` (completion classification) and `last_activity_at`.
- **New functions**: `get_xp_breakdown()`, `get_weak_areas(_limit)`, `get_recent_test_results(_limit)`, `get_weekly_summary()`, `get_mentorship_summary()`, `get_activity_days(_from, _to)`.
- **No new tables.** Every metric is built from tables Phases 2–4 already created (`lesson_progress`, `test_attempts`, `xp_events`, `doubts`, `session_participants`, `mentorship_sessions`) — matching the brief's explicit instruction not to invent schema that isn't needed.
- **No new indexes** were needed: every new query either aggregates a table already indexed for its access pattern (e.g. `idx_doubts_user_created`, the `test_attempts` primary/foreign keys) or scans a bounded row count (a student's own attempts/doubts, realistically dozens, not millions).
- **RLS**: nothing changed at the table level. Every new function is `SECURITY DEFINER` with its own `auth.uid()` scoping (or, for `get_subject_progress`/`get_activity_days`, degrades safely to real zeros for `auth.uid() IS NULL` rather than erroring — proven in pgTAP, not assumed). Grants follow the established Phase 0 pattern: `GRANT ... TO authenticated` without a `REVOKE ... FROM anon`, because revoking crashes the local test Postgres image (documented in `docs/testing.md`); the function body is the actual authorization boundary, verified by 8 explicit anonymous-rejection and 6 explicit cross-student-isolation assertions in the pgTAP file.
- **One real bug found and fixed before merge**: `get_mentorship_summary()`'s first draft returned **zero rows** (not one row of real zeros) for a student with no sessions, because it was built on a plain `FROM (subquery LIMIT 1) n` — when the subquery matches nothing, the whole `FROM` produces nothing. Fixed with `FROM (VALUES (true)) x LEFT JOIN LATERAL (...) n ON true`, which guarantees exactly one output row regardless. Caught by manual RPC smoke-testing before pgTAP was even written, and pgTAP now asserts the one-row-of-zeros behavior explicitly (`mentorship summary returns one real row of zeros for a student with no sessions`).
- **Type-generation caveat, documented and worked around** (`src/hooks/dashboardTypes.ts`): `supabase gen types typescript` does not carry per-column nullability for `RETURNS TABLE` functions the way it does for real table columns — every generated RPC return column comes out non-null regardless of what the SQL can actually return. Rather than let the frontend silently trust an inaccurate type (`average_score: number` when the real column is `number | null`), corrected local types were written by hand against the actual SQL, and every consuming component/hook uses those instead of the generated `Database["public"]["Functions"][...]` types for the affected RPCs.

## 4. UI changes

**New app-shell pages/components:**
`src/hooks/useStudentDashboard.ts`, `src/hooks/dashboardTypes.ts`, `src/lib/testGrading.ts`, `src/lib/academicYear.ts`, `src/lib/recommendations.ts`, `src/components/dashboard/DashboardSection.tsx`, `AcademicProfileCard.tsx`, `OverallProgressCard.tsx`, `MyLearningSection.tsx`, `WeakAreasCard.tsx`, `TestAnalyticsSection.tsx`, `LearningActivityHeatmap.tsx`, `WeeklySummaryCard.tsx`, `XpStreakCard.tsx`, `DoubtAnalyticsCard.tsx`, `MentorshipAnalyticsCard.tsx`, `RecommendationsCard.tsx`, `charts/SubjectPerformanceChart.tsx`, `charts/ScoreTrendChart.tsx`, `src/components/learn/TestReviewList.tsx` (extracted, shared by `TakeTest.tsx` and the new `AttemptReview.tsx`), `src/pages/learn/AttemptReview.tsx` (new route `/tests/:testId/attempts/:attemptId`).

**Rewritten:** `src/pages/Dashboard.tsx` (orchestration, see §1), `ContinueLearningWidget.tsx` (now shows real "Lesson N of M" position and real last-opened time).

**Deleted (superseded, zero remaining importers verified before deletion):** `RevisionPlanner.tsx`, `SubjectProgress.tsx`.

**Charts**: two hand-built accessible SVG components (not a charting library — see the "Recharts" note below), following the dataviz skill's procedure: the subject-performance bar chart uses exactly 2 categorical colors (Completion / Test average — validated with `node scripts/validate_palette.js "#2a78d6,#eb6834" --mode light` and `--mode dark`, worst adjacent CVD ΔE 24.7/26.8, normal-vision ΔE 33.6/31.8, both clear the ≥8/≥15 targets by a wide margin), so subject count (6–9 per class) never forces more hues. The score-trend line is a single series (the app's own `--primary` token). Both ship a **table-view toggle** as the accessible alternative, native `<title>` tooltips on every mark, and light/dark values as CSS custom properties scoped per component. The activity heatmap uses one sequential hue (blue, light→dark) per the "magnitude, not category" rule.

**Accessibility, beyond the charts**: KPI tiles are `role="group"` with a single descriptive `aria-label` (e.g. "Test average: 74%, 12 tests taken") instead of three disconnected text fragments a screen reader would read separately; "Needs Attention" and "AI Doubts" are `role="region"` landmarks. These were added specifically because writing the E2E tests exposed that the KPI row had no reliable accessible name at all — the fix serves both.

## 5. Mock data removed

Every hardcoded/mocked value the original audit and the brief called out on this
page is gone. Ordered by section:

| Location | What was mocked | Now |
|---|---|---|
| `Dashboard.tsx` header | `useState(12)` level, `useState(2850)` XP, `useState(7)` streak (from before Phase 3) | `get_learning_summary()` |
| "Today's Learning Progress" card | Hardcoded `65%`, "3 lessons & 2 quizzes completed" | Removed; replaced by the real Overall Learning Progress card |
| `ContinueLearningWidget` | Per-grade hardcoded `{lastVideo: {...}}` object, identical for every student in a grade | The student's own `lesson_progress`, with real position-in-chapter |
| `SubjectProgress` (old) | Per-grade hardcoded subject list with fabricated `progress`/`weakTopics`/`strongTopics` | `MyLearningSection` + `SubjectPerformanceChart`, both from `get_subject_progress()` |
| `RevisionPlanner` (old) | Static schedule object, same for every student | Replaced by `WeakAreasCard` (real `get_weak_areas()`) and `TestAnalyticsSection`'s recent-results table |
| `UpcomingSchedule` | (Already fixed in an earlier phase — confirmed still real, unchanged here) | — |
| Test performance | Did not exist as a section | `get_recent_test_results()` — real attempted/average/highest/lowest/pass-rate |
| XP breakdown | Did not exist | `get_xp_breakdown()` — and this phase is what made `doubt_asked` XP real in the first place |
| Streak best/weekly | Did not exist (only "current streak") | `get_learning_summary()` extension, pgTAP-proven against a real gap and a real consecutive run |
| Learning activity heatmap | Did not exist | `get_activity_days()` |
| Weekly summary | Did not exist | `get_weekly_summary()`, with **"study time" deliberately omitted** (see §6) |
| Doubt analytics | Did not exist as a stats section (only the ask-a-doubt widget) | Real counts/top-subjects from the `doubts` table |
| Mentorship analytics | Did not exist as a stats section | `get_mentorship_summary()` |
| Recommendations | Did not exist | `src/lib/recommendations.ts`, deterministic, unit-tested |
| "Needs Attention" mislabeling a strong score | Would have shown a subject's only test (e.g. 100%) as needing attention, since `get_weak_areas()` returns the *lowest* scores regardless of how high they are | Fixed with a client-side `< WEAK_AREA_THRESHOLD` filter before rendering — caught while writing the E2E test, not assumed correct |

## 6. What was deliberately left out, and why (not silently dropped)

- **"Study time" per the brief's example (`8h 42m`)** — this schema has no
  per-lesson duration tracking (`lesson_progress` has `last_viewed_at`/
  `completed_at`, not elapsed time). `test_attempts` does have `started_at`/
  `submitted_at`, so a *test*-only time figure could be computed, but a combined
  "study time" figure would silently blend a real number with a fabricated one for
  lessons. Left out of `WeeklySummaryCard` entirely rather than guessed.
- **Course "enrollment"** — this product has no enrollment step: every student in
  a class has all of that class's subjects (the same model `Courses.tsx` and
  `SubjectDetail.tsx` already used since Phase 3). "Courses" in the brief maps
  onto "subjects" here; no parallel `courses`/`enrollments` schema was created,
  per the brief's own instruction to fit the existing product architecture rather
  than build every table in its illustrative list.
- **Student "stream" (Science/Commerce)** — `subjects.stream` exists (Phase 2), but
  there is no student-level stream field, and nothing restricts a class 11–12
  student to one stream's subjects. `AcademicProfileCard` shows real subjects and
  omits a stream label rather than inventing one.
- **"Mentor Requests" as a distinct mentorship metric** — the brief's example
  listed this alongside Upcoming/Completed/Attendance, but there's no schema
  concept of a student "requesting" a mentor (mentor *applications* are a
  mentor-becoming-a-mentor concept, unrelated). Omitted rather than mapped to the
  wrong thing.
- **Full cursor-based pagination on "My Learning"** — a class has at most 9
  subjects, so client-side filtering (All/In Progress/Completed/Not Started) over
  a single `get_subject_progress()` call is the proportionate choice; a paginated
  API for single-digit row counts would be complexity with no benefit.
- **Recharts** — reinstalling it was considered (the original audit flagged it as
  an unused dependency and it was removed in Phase 8), but the dataviz skill's
  exact mark specs (4px rounded bar ends, 2px gaps, hairline gridlines, a
  table-view fallback, native tooltips) are more directly and predictably achieved
  with two small hand-built SVG components than by configuring around a charting
  library's own defaults for two chart types. `package.json` remains unchanged.

## 7. Validation results

| Check | Result |
|---|---|
| `npm run lint` | 0 errors, 13 warnings (unchanged — pre-existing `exhaustive-deps`) |
| `npx tsc --noEmit` (`strict: true`) | 0 errors |
| `npm run build` | Clean. `Dashboard` chunk grew from 21.91 kB → 57.56 kB (lazy-loaded, doesn't affect the initial bundle, which is unchanged at ~399 kB) |
| `npm test` (Vitest) | 42/42 — adds `testGrading.test.ts`, `academicYear.test.ts`, `recommendations.test.ts` (6 cases covering the priority order and the empty-signal case) |
| `npm run test:db` (pgTAP) | 244/244 (37 new), migration verified idempotent (applied twice to a fresh database) |
| `npm run test:e2e` (Playwright, local stack) | 11/11 — 2 new tests (a real low score surfacing correctly through Needs Attention/Recommendations/the review page; cross-student isolation at the UI level) plus 3 pre-existing specs updated for the new KPI markup |

**Authorization, specifically** (§31 of the brief): proven at three independent
layers, not asserted once — (1) pgTAP: every new RPC has an anonymous-rejection
test and a cross-student (Bob-cannot-see-Alice) test; (2) `e2e/security.spec.ts`
(pre-existing, unaffected): a forged `PATCH profiles {role:mentor}` replayed with a
real JWT is rejected over real HTTP; (3) `e2e/dashboard-analytics.spec.ts` (new): a
second real student's dashboard, driven through the actual browser, shows real
independent zeros — never the first student's 100%.

## 8. Definition-of-done checklist (from the brief)

- [x] Student's class is real (`profiles.grade`, empty state if unset)
- [x] Subjects are real (`subjects` table, per class)
- [x] "Courses" (subjects) enrolled/completed/in-progress/not-started are real
- [x] Course/lesson progress is real (`lesson_progress`)
- [x] Tests attempted, scores, subject performance, recent results are real
- [x] Learning activity (heatmap) is real, from defined real signals only
- [x] XP and its breakdown are real (and now genuinely complete — doubt XP closed)
- [x] Streak (current + best + this week) is real, pgTAP-proven on real gaps
- [x] AI doubt statistics are real (persisted `doubts` table)
- [x] Mentorship statistics are real
- [x] Upcoming schedule is real (unchanged from Phase 3, confirmed still correct)
- [x] Recommendations are deterministic and data-driven, not an LLM call
- [x] New-student empty states exist everywhere (verified by the "second student"
      E2E test, not just by inspection)
- [x] Loading/error states exist for every section (`DashboardSection.tsx`,
      per-query, with Retry — an error never becomes a misleading `0`)
- [x] RLS protects every metric (§7, three-layer proof)
- [x] No dashboard metric is hardcoded
- [x] No fake analytics are displayed (the "Needs Attention" mislabeling bug was
      caught and fixed specifically because of this requirement)
- [x] Desktop polish; responsive grid collapse (2-col → 1-col patterns reused from
      the existing design system, sidebar already collapses per the earlier
      session's `StudentSidebar`)
- [x] Accessibility considered: `role="group"`/`role="region"` landmarks, chart
      table-view fallbacks, native tooltips, no color-only encoding
- [x] Performance: one coordinated hook, parallel React Query fetches, no 20-card
      waterfall; no new unfiltered realtime subscriptions
- [x] Tests pass (lint/types/build/unit/pgTAP/E2E, all reported above)
- [x] Production database was not touched — every number above is from a local
      disposable Postgres container or the local `supabase start` E2E stack
