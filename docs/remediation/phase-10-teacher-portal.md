# Phase 10: Teacher Portal

Status: **complete locally**. Migration `20260930130000_c3e91f5a-….sql`. pgTAP:
`015_teacher_portal.test.sql`, 49 assertions (314 total). Unit: `src/lib/teacher/teacher.test.ts`
(12). E2E: `e2e/teacher-portal.spec.ts` (2 tests) plus 3 existing specs updated for the new
routes; full suite 20/20. The migration has been applied only to local databases, not to staging or production.

## 1. What changed for users

- Teachers (the `mentor` role; admins too) get a dedicated workspace at **`/teacher`**,
  with its own sidebar, header, search (Ctrl K or /), quick create menu and notifications.
- `/teacher-dashboard` redirects to `/teacher`. The old `/teach/lessons/*` and
  `/teach/tests/*` editor URLs redirect to `/teacher/lessons/*` and `/teacher/assignments/*`.
- Students see **announcements** addressed to them on `/dashboard`, and **teacher feedback**
  on the attempt review page (`/tests/:testId/attempts/:attemptId`).

## 2. Domain mapping (no parallel content model)

The portal uses the existing curriculum instead of adding a second content model:

| Portal concept | Backed by |
|---|---|
| Course | A `subjects` row where the teacher authored ≥1 lesson or test. Chapters remain admin-managed |
| Lesson / video | `lessons` (author-owned), reordered via `reorder_teacher_lessons()` |
| Assignment / quiz | `tests` + `test_questions` (auto-graded MCQ, unchanged) |
| Submission | `test_attempts` + new `attempt_reviews` (feedback, "reviewed" state; score stays auto-graded) |
| Class | `mentorship_sessions`; attendance via existing `set_participant_attendance()` |
| Student ("my students") | Anyone with progress on my lessons, an attempt on my tests, or a live registration for my classes |
| Message | Doubts escalated to a teacher (`get_escalated_doubts` / `answer_escalated_doubt`) |
| Announcement | New `announcements` table; students read via `get_my_announcements()` |
| Resource | New `teacher_resources` table + private `teacher-resources` storage bucket |
| Private note | New `teacher_student_notes` table |

## 3. Authorization

- Every read of student data goes through a `SECURITY DEFINER` function that calls
  `private.require_teacher()` and filters to the **caller's own** lessons, tests and sessions.
  Exposes student `full_name` and `grade` only, never email.
- Cross-teacher access is denied (pgTAP: T1 cannot read T2's submissions, answers, students,
  notes or resources, and cannot reorder T2's lessons).
- Notes and announcement audiences are checked by RLS (`is_my_student`, `are_my_students`).
  A teacher cannot write a note about, or announce to, a student who isn't theirs.
- Storage: teachers read/write only `teacher-resources/<their uid>/…`. The bucket block is
  skipped on databases without Supabase Storage (e.g. the pgTAP container).
- `RequireAuth allow={["mentor","admin"]}` on `/teacher/*` is UX only; the database is the boundary.

## 4. Frontend architecture

```
src/lib/teacher/api.ts        the only module that talks to Supabase for the portal
src/lib/teacher/types.ts      RPC row types with correct nullability
src/lib/teacher/signals.ts    "needs attention" rules (pure, unit-tested)
src/hooks/useTeacher.ts       React Query hooks; keys under ["teacher", uid, …]
src/components/teacher/portal design system (ui.tsx, charts.tsx, portal.css) + shell
src/pages/teacher/*           one page per route
```

Design tokens live in `portal.css` under `html.teacher-portal`. The layout toggles that class
while mounted, so the neutral surfaces, 10px radius and Plus Jakarta Sans reach Radix portals
without changing the rest of the app.

## 5. "Needs attention" rules (`ATTENTION_THRESHOLDS`)

A student is flagged only on measured data from the teacher's own content:
attendance < 75% over ≥2 marked classes; last-30-day average ≥15 points below the previous 30
days; average < 50% over ≥2 assignments; or no activity for ≥14 days. The UI says
"Needs attention", never labels a student.

## 6. Known limits / follow-ups

- **Deploy:** apply the migration to staging, then production (`supabase db push`). Until then
  the portal's new RPCs return errors, and each section shows its error state with Retry.
- Chapters can't be created by teachers (admin curriculum). The course builder says so.
- The lesson renderer supports headings, lists, quotes, code, bold, italic and links. It has no
  images or equations; attach those via the Resource Library.
- Assignments have no due dates or late policies, and there is no manual per-question mark
  override. Grading is automatic; teachers add feedback.
- Messages are single-turn replies to escalated doubts. The data model has no free-form chat,
  class threads or attachments.
- Resources are private to the teacher. "Linked course" organises them; students don't see them.
- Notification read state is per device (localStorage). There is no notifications table.
