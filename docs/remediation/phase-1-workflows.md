# Phase 1: Make the existing workflows work

Status: **complete locally**. Migration `20260929110000_3f1c9a52-….sql`. pgTAP: 154/154 (adds `009_phase1_workflows`, 30 assertions). Type-check and build are clean.

## Database

| Change | Finding |
|---|---|
| `public_profiles` view (id and full name only), readable by anon and authenticated users | BUG-011: every author showed as "Anonymous" |
| `mentors_public` rebuilt as an owner-rights view: verified mentors only, no email | DB-001: the mentor directory was always empty |
| `register_for_session` RPC: row lock, capacity check, no past or own sessions, idempotent. Direct INSERT/UPDATE on `session_participants` revoked | BUG-012 |
| `cancel_session_registration` and `set_participant_attendance` RPCs. Only the mentor or an admin can record attendance | BUG-012 (students self-marking `attended`) |
| `session_participant_counts` RPC for public seat counts | UI capacity display |
| Feedback INSERT policy: the student must be registered for, or have attended, a past session run by that mentor | SEC-009 |
| `mentors.rating` / `total_sessions` recomputed by triggers on feedback and session status | BUG-010, trust fields |
| Forum: column grants (authors edit only title, content and category); insert trigger zeroes counters; triggers maintain `reply_count`, `upvotes` and reply `upvotes` | SEC-010, BUG-010 |
| `set_thread_pinned` (moderators) and `mark_reply_solution` (thread author or moderator) RPCs; moderator DELETE policies on threads, replies and club posts | PROD-003 moderation |
| Clubs and events: counters maintained by triggers; event capacity enforced under a lock; club creator automatically becomes the `owner` member; event registrations are no longer publicly listable | BUG-010 |
| Reporters can read their own `user_reports` | Reporting UI |
| Length CHECKs (NOT VALID) on threads, replies, club posts and club names | Abuse bounds |
| One-time recompute of all derived counters | Correction of derived data |
| Indexes from audit §7.3; two redundant indexes dropped | PERF |

## Frontend

- **Mentorship page:**
  - Registers through the RPC and shows server error messages.
  - Shows "x / max registered" and a "Session full" state.
  - New **My Sessions** tab (`components/mentorship/MySessions.tsx`): *Join* (link fetched via `get_session_meeting_link`, opens 30 minutes before start), *Cancel*, and a *Rate session* dialog for past sessions.
  - Removed the dead "View Details" and "View Profile" buttons.
- **Mentor dashboard:**
  - Session form gains an https meeting link and validation.
  - A one-on-one session has capacity 1.
  - Attendance buttons (Present/Absent).
  - Real student count.
  - The feedback query no longer uses the unresolvable `profiles` embed (BUG-003); names come from `public_profiles`.
- **Teacher dashboard:**
  - Session types map to the real CHECK values (BUG-004).
  - Tabs are now Upcoming, Past and Cancelled, replacing the impossible "pending" status (BUG-005).
  - Participant counts replace the fake "Class 10".
  - *Join* opens the real link.
  - Realtime is filtered to `mentor_id=eq.<me>` (PERF-005).
  - A **Manage Sessions** link goes to the session-management page.
  - `SessionFilters` is reduced to the filters that can actually work.
- **Teacher stats and pending doubts:** head-only counts; removed two unfiltered realtime channels; names from `public_profiles`.
- **Community:**
  - New pages for new thread, thread detail (vote, reply, solution, pin, delete, report), create club, club detail (join/leave, member-only posts, delete, report), and create event (mentors and admins only).
  - All previously 404 links now resolve.
  - The forum N+1 is replaced by one batched name lookup (PERF-001).
  - Clubs no longer download every membership (PERF-004).
  - "Create Event" shows only for mentors and admins.
- **Reporting:** `ReportDialog` writes to `user_reports`, which feeds the existing admin Report Management page.
- **Admin:** new **Mentor Applications** page (approve/reject via RPC). An *Admin Panel* link appears in the navbar for admins and moderators.
- **Mentor application page:** shows "under review" for a pending application and "already a mentor" for mentors, and pre-fills name and email.
- **Blog:**
  - New slugs get a 6-character random suffix (BUG-007: duplicate titles).
  - Edits no longer regenerate the slug, so links stay stable.
- **Signup:** generic error message (SEC-013 enumeration); the student signup no longer sends `role`.
- **Quick access:** `/notes` goes to `/blog` ("Study Notes"); `/mock-tests` goes to `/tests`.

## Still open (later phases)

- Legal pages (privacy and terms), still linked from the old `Footer.tsx`, are Phase 7.
- Dashboard mocks, and the teacher upload and settings mocks, are Phase 3 and Phase 7.
- Event `meeting_link` remains public, because events are open webinars by design. Revisit if events become invite-only.
- `donations_public` is unchanged; there is no donation feature until real payments exist.
