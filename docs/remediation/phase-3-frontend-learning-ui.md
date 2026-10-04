# Phase 3: Courses → lessons → tests → results → progress (frontend)

Status: **complete locally**. No new migration (builds on Phase 2's schema). E2E:
`e2e/learning.spec.ts` exercises this phase's entire user-facing surface — signup →
browse courses → open a lesson → mark complete → take a test → see a server-scored
result with explanations → dashboard reflects real progress — against a real local
Supabase stack, not mocks.

## A. Objective

PROD-002 in the original audit: "mocks indistinguishable from real features" — the
student dashboard's XP/level/streak were `useState` constants, `ContinueLearningWidget`/
`SubjectProgress`/`RevisionPlanner`/`UpcomingSchedule` all showed the same
hard-coded per-grade data to every student, `Courses.tsx` had no real content behind
its cards, and `MockTests.tsx` had two sample questions. This phase replaces every
one of those with the Phase 2 schema.

## B. What was rebuilt

- **`Dashboard.tsx`** — level/XP/streak/lessons-completed/tests-submitted/average-score
  now come from `get_learning_summary()`. A student with no activity yet sees real
  zeros, not a fake "Level 12, 2850 XP, 7-day streak" (this is exactly what
  `e2e/learning.spec.ts` asserts for a fresh signup: `"0 lessons completed"` is
  visible before any lesson is opened).
- **`ContinueLearningWidget`, `SubjectProgress`, `RevisionPlanner`, `UpcomingSchedule`**
  — each rewritten to query the student's own `lesson_progress`/`test_attempts`/
  `session_participants`/`event_registrations` instead of a per-grade hard-coded
  object. A student with no history sees an honest empty state with a call to
  action, not someone else's fake activity.
- **`Courses.tsx`** — lists real `subjects` for the student's class via
  `get_subject_progress()`, showing real chapter/lesson/test counts and real
  completion percentage; subjects with no content yet say so ("Content coming
  soon") instead of pretending to have chapters.
- **`src/pages/learn/SubjectDetail.tsx`** (new) — a subject's chapters, lessons and
  tests, with per-lesson completion state and per-test best score for a signed-in
  student.
- **`src/pages/learn/LessonView.tsx`** (new) — renders lesson content through
  `src/lib/markdown.tsx` (a hand-rolled renderer that never uses
  `dangerouslySetInnerHTML` — see Phase 7's markdown unit tests for why that
  matters given lesson content and AI answers are both untrusted-ish text),
  optionally embeds a YouTube video via `src/lib/video.ts` (https/YouTube-only
  allow-list, privacy-enhanced `youtube-nocookie.com` domain), and calls
  `record_lesson_progress` on view and on "Mark as complete".
- **`src/pages/learn/TakeTest.tsx`** (new) — the full test-taking flow: start/resume
  → answer (saved server-side per-question as you go, so a lost connection doesn't
  lose progress) → live countdown with auto-submit at the deadline → submit → a
  review screen showing correct answers and explanations only after submission.
  Never trusts a client-computed score — `submit_test_attempt` (Phase 2) is the only
  source of the result shown.
- **`MockTests.tsx`** — replaced entirely: a real catalogue of published tests for
  the student's class, with a "My results" tab showing real past attempts.
- **Mentor-side authoring** (`src/pages/teach/LessonEditor.tsx`,
  `src/pages/teach/TestEditor.tsx`, new) — mentors write lessons (Markdown, with a
  live preview using the same renderer students see) and tests (question builder
  with per-question correct-answer selection and explanations), publish/unpublish,
  from their own dashboard's rewritten `MyContent` panel (previously
  `mockContent`, a hard-coded array of 4 fake items).
- **`src/pages/admin/Curriculum.tsx`** (new) — admin management of chapters per
  class/subject (the one part of the curriculum mentors can't author, by the Phase
  2 RLS design).

## C. Validation

Full aggregate validation is in `phase-8-final-audit.md` §4. Specific to this
phase: `e2e/learning.spec.ts`'s first test is the complete PROD-001/PROD-002 closure
proof — real signup, real lesson content (seeded by `e2e/global-setup.ts`, not
fabricated in the test itself), real completion, real test-taking, real
server-computed 100% score with the actual seeded explanation text asserted in the
review screen, and the dashboard afterward showing `"1 lessons completed"` /
`"1 tests taken"` — numbers that only exist if every layer between the click and the
database actually worked.

## D. Next phase

Phase 4 connects the AI doubt solver to this same "real persistence, not
`useState`" pattern, and adds mentor escalation.
