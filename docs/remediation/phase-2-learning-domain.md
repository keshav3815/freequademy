# Phase 2: The real Freequademy learning database

Status: **complete locally**. Migration `20260929120000_6a2d4c1e-….sql`. pgTAP:
`010_learning.test.sql`, 35 assertions (part of the 207-assertion total — see
`phase-8-final-audit.md` §4 for the aggregate run).

## A. Objective

PROD-001 in the original audit: the product's stated purpose — courses, lessons,
tests, progress — had **no database schema at all**. `Courses.tsx` rendered a
hard-coded subject list; `MockTests.tsx` had two sample questions in a JS array;
there was no way to complete a lesson, take a real test, or see real progress. This
phase builds that schema, before Phase 3 rebuilds the frontend to use it.

## B. Schema

```
subjects ──< chapters ──< lessons ──< lesson_progress (per student)
                       └─< tests ──< test_questions
                                └─< test_attempts ──< attempt_answers
xp_events (idempotent awards, source of truth for gamification)
```

Design decisions, and why:

- **Curriculum (`subjects`, `chapters`) is admin-managed**; **lessons and tests are
  authored by approved mentors** (own rows) **or admins**. Published (`status =
  'published'`) rows are public; drafts are visible only to their author and admins
  — the same ownership pattern Phase 0 established for `blog_posts` (BUG-008),
  applied consistently here from the start rather than retrofitted.
- **Correct answers are never sent to the browser before submission.** `test_questions`
  has column-level `REVOKE`/`GRANT` so API roles can read `prompt`/`options`/`marks`
  but not `correct_option`/`explanation` — the same column-grant technique Phase 0
  used for `mentorship_sessions.meeting_link`. Authors read answers through
  `get_test_questions_for_author()`; students read them only through
  `get_attempt_review()`, which checks the attempt is the caller's own and already
  submitted.
- **Scoring happens in the database, never in the browser.** `submit_test_attempt()`
  takes a row lock on the attempt, computes correctness by joining
  `attempt_answers` to `test_questions`, is idempotent (a second call returns the
  stored result instead of rescoring), and awards XP exactly once. This closes the
  same class of problem as a client-side-computed score would have reopened.
- **`xp_events` is the single source of truth for gamification**, with a
  `UNIQUE (user_id, source_type, source_id)` constraint so completing the same
  lesson twice, or resubmitting a test, never double-awards — verified by pgTAP
  (`completing a lesson awards XP exactly once`).
- **`get_learning_summary()`** computes level/XP/streak/lessons-completed/
  tests-submitted/average-score **live from `xp_events`, `lesson_progress` and
  `test_attempts`** — this is what replaces the Phase 3 dashboard's hard-coded
  `useState(2850)` XP and `useState(7)` streak.

## C. RPCs added

`record_lesson_progress`, `start_test_attempt` (resumes an open attempt instead of
duplicating), `save_test_answer` (rejects answers after the deadline + a 1-minute
grace period, rejects out-of-range options), `submit_test_attempt`,
`get_attempt_review`, `get_test_questions_for_author`, `get_learning_summary`,
`get_subject_progress`.

## D. Reference data

Seeded `subjects` rows only (class 6–10: Mathematics/Science/English/Social
Science/Hindi; class 11–12: science + commerce streams) — mirrors what the old
hard-coded `Courses.tsx` offered, so Phase 3's rebuild had real subject IDs to query
against. **Chapters, lessons and tests are not seeded** — that's real content,
authored through the app (Phase 3's editor UI), not fabricated here.

## E. Validation

pgTAP `010_learning.test.sql` (35 assertions) covers, with both positive and
negative cases: curriculum RLS (anon reads, only admins write structure), lesson
authorship and draft privacy, progress can only be written through the RPC (not
direct `INSERT`), a full test-taking cycle (start → resume-is-idempotent → save
answers → reject out-of-range option → submit → server score is correct including
an unanswered question counted wrong → answers immutable after submission → review
shows correct answers/explanations only after submission → another student can't
review someone else's attempt), and the summary/progress RPCs compute the right
numbers from real activity.

Full aggregate validation (lint/typecheck/build/unit/pgTAP/E2E) is in
`phase-8-final-audit.md` §4 — this schema is exercised end-to-end by
`e2e/learning.spec.ts` (lesson → test → dashboard).

## F. Next phase

Phase 3 rebuilds `Dashboard.tsx`, `Courses.tsx`, `MockTests.tsx` and the mentor
content editors to use this schema instead of hard-coded data.
