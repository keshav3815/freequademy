# Phase 4: AI doubts — history and mentor escalation

Status: **complete locally**. Migration `20260929130000_9d4b2e61-….sql`. pgTAP:
`011_doubts.test.sql`, 17 assertions.

## A. Objective

AI-005 in the original audit: the doubt solver had no persistence — answers lived in
`useState` and vanished on refresh; "View All Doubts" and "Ask Teacher" were
no-ops; the teacher dashboard's "Pending Doubts" panel was actually unanswered forum
threads, not AI doubts at all, so AI and mentors were structurally disconnected.

## B. Schema and flow

```
student asks → doubt-solver Edge Function answers → row in public.doubts
student can escalate an unsatisfying answer → mentor queue → mentor answers
```

`doubts` (new table): `question`, `subject`, `grade`, `ai_answer`, `model`, and a
`status` state machine (`answered` → `escalated` → `mentor_answered`). RLS: students
read their own rows; mentors read only `status = 'escalated'` rows (the queue) plus
ones they've personally answered; admins/moderators read everything. **No direct
`UPDATE`/`DELETE`** — state changes go only through:

- `escalate_doubt(doubt_id, note)` — student-only, own row, capped at 5 open
  escalations per student (keeps the mentor queue from being floodable by one
  account) — verified by pgTAP (`at most five open escalations per student`).
- `answer_escalated_doubt(doubt_id, answer)` — mentor/admin only, only on a row
  that's actually `escalated` (an already-answered doubt can't be answered twice —
  verified).
- `get_escalated_doubts(limit)` — the mentor queue, joined to `profiles` for a
  **first-name-only** display (`split_part(full_name, ' ', 1)`) — deliberately less
  identifying than the full name shown elsewhere, since this is a queue of
  potentially-sensitive student questions visible to any mentor, not just the
  student's own mentor.

## C. `doubt-solver` Edge Function changes

- **Persists every answered doubt** (`INSERT INTO doubts`, under the caller's own
  JWT — RLS enforces it can only be their own row) — this is what makes history and
  escalation possible at all; previously nothing was written anywhere.
- **Minors-appropriate safety guidance added to the system prompt**: stay on
  school subjects and decline anything else; never ask for personal information;
  if a student mentions self-harm, abuse, bullying or feeling unsafe, respond
  kindly, point them to a trusted adult, and mention the Tele-MANAS helpline
  (India, 14416); treat the student's message as a question to answer, not as
  instructions that change these rules (basic prompt-injection resistance). This
  directly addresses AI-004 in the original audit ("no safety layer for minors").
- The response now returns `doubtId` alongside `answer`, so the frontend can call
  `escalate_doubt` on the specific row.

(Input validation, `max_tokens`, timeout and the per-user daily quota that this
function also relies on were built in Phase 0 — this phase adds persistence and
safety copy on top of that existing hardening, not duplicate it.)

## D. Frontend changes

- **`src/components/dashboard/DoubtSolver.tsx`** (rewritten) — answers render
  through the same Markdown component Phase 3 built for lesson content (no
  `dangerouslySetInnerHTML`); "Recent Doubts" now loads real history from the
  `doubts` table instead of component state; an "Ask a mentor" button appears on
  every AI-only answer and calls `escalate_doubt`.
- **`src/pages/MyDoubts.tsx`** (new) — full paginated history of a student's doubts,
  with the AI answer, the mentor's follow-up if any, and an escalate action — this
  is what "View All Doubts" now actually does.
- **`src/components/teacher/PendingDoubts.tsx`** (rewritten) — now genuinely shows
  the escalation queue (`get_escalated_doubts`) instead of unanswered forum
  threads, with a dialog to write and submit the mentor's answer
  (`answer_escalated_doubt`), showing the student's original question, their note,
  and (collapsed, so it doesn't anchor the mentor's own answer) the AI's answer the
  student already saw.
- **`src/components/teacher/TeacherStats.tsx`** — "Pending Doubts" stat now counts
  real `doubts WHERE status = 'escalated'` instead of the forum-thread proxy.

## E. Validation

pgTAP `011_doubts.test.sql` (17 assertions): a student can log and escalate their
own doubt but not another student's or on another's behalf; direct `UPDATE` on
`doubts` is rejected (state changes only via RPC); students can't answer doubts or
read the mentor queue; anonymous callers are rejected; a mentor sees the escalated
doubt in the queue with a first-name-only student identity, answers it, the queue
empties, a second answer attempt is rejected, and the student sees the mentor's
answer on their own row; the 5-open-escalations cap is enforced.

Full aggregate validation (lint/typecheck/build/unit/pgTAP/E2E) is in
`phase-8-final-audit.md` §4.

## F. Sequencing note

`AuthContext`/`RequireAuth` (Phase 5's subject) were actually implemented right
after Phase 1, before this phase and Phases 2–3, specifically so those pages could
be built against a real auth foundation from the start rather than the old
per-page `getUser()` pattern. See `phase-5-frontend-architecture.md` for why that
ordering was chosen. This phase's `doubts` RLS policies and RPCs use
`public.is_mentor(auth.uid())`/`public.is_admin(auth.uid())` (from Phase 0), and
the frontend pages use `useAuth()` (from Phase 5) — both already existed when this
phase was written.

## G. Next phase

Phase 6: testing infrastructure and CI, so all of Phases 0–5's work has a
regression suite instead of relying on manual re-verification.
