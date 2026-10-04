-- Phase 4: AI doubt history and mentor escalation.
BEGIN;
\ir ../helpers.psql
SELECT plan(17);

SELECT tests.create_user('student-a@test.local', '{"full_name":"Asha Verma"}') AS student_a \gset
SELECT tests.create_user('student-b@test.local') AS student_b \gset
SELECT tests.create_user('mentor@test.local') AS mentor \gset
SELECT tests.make_mentor(:'mentor');

\set d1 '00000000-0000-0000-0000-0000000aa001'

-- ---- student A logs and escalates -----------------------------------------
SELECT tests.authenticate_as(:'student_a');
SELECT lives_ok(format($$INSERT INTO public.doubts (id, user_id, question, subject, grade, ai_answer, model)
  VALUES (%L, %L, 'Why is the sky blue?', 'Physics', 10, 'Rayleigh scattering…', 'test-model')$$, :'d1', :'student_a'),
  'student logs their own doubt');
SELECT throws_ok(format($$INSERT INTO public.doubts (user_id, question) VALUES (%L, 'spoof')$$, :'student_b'),
  '42501', NULL, 'student cannot log a doubt for someone else');
SELECT throws_ok(format($$INSERT INTO public.doubts (user_id, question, status, mentor_answer) VALUES (%L, 'fake', 'mentor_answered', 'fake')$$, :'student_a'),
  '42501', NULL, 'student cannot insert a pre-answered doubt');
SELECT throws_ok(format($$UPDATE public.doubts SET status = 'escalated' WHERE id = %L$$, :'d1'),
  '42501', NULL, 'doubt state cannot be changed directly');
SELECT throws_ok(format($$SELECT public.answer_escalated_doubt(%L, 'self answer')$$, :'d1'),
  '42501', NULL, 'students cannot answer doubts');
SELECT throws_ok('SELECT * FROM public.get_escalated_doubts()', '42501', NULL, 'students cannot read the mentor queue');
SELECT lives_ok(format($$SELECT public.escalate_doubt(%L, 'I still do not get it')$$, :'d1'), 'student escalates their doubt');
SELECT throws_ok(format($$SELECT public.escalate_doubt(%L)$$, :'d1'), '22023', NULL, 'a doubt cannot be escalated twice');

-- ---- student B ------------------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'student_b');
SELECT is_empty(format('SELECT 1 FROM public.doubts WHERE id = %L', :'d1'), 'students cannot read other students'' doubts');
SELECT throws_ok(format($$SELECT public.escalate_doubt(%L)$$, :'d1'), '22023', NULL, 'students cannot escalate other students'' doubts');

-- ---- anon -----------------------------------------------------------------------
RESET ROLE;
SELECT tests.become_anon();
SELECT throws_ok(format($$SELECT public.escalate_doubt(%L)$$, :'d1'), '42501', NULL, 'anonymous callers are rejected');

-- ---- mentor ---------------------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'mentor');
SELECT results_eq('SELECT question, student_name FROM public.get_escalated_doubts()',
  $$VALUES ('Why is the sky blue?'::text, 'Asha'::text)$$, 'mentor queue shows the escalated doubt with a first name only');
SELECT lives_ok(format($$SELECT public.answer_escalated_doubt(%L, 'Think of the colours of sunlight…')$$, :'d1'),
  'mentor answers the doubt');
SELECT throws_ok(format($$SELECT public.answer_escalated_doubt(%L, 'again')$$, :'d1'), '22023', NULL,
  'an answered doubt leaves the queue');
SELECT is_empty('SELECT 1 FROM public.get_escalated_doubts()', 'queue is empty after answering');

-- ---- student A sees the answer -------------------------------------------------------
RESET ROLE;
SELECT tests.authenticate_as(:'student_a');
SELECT results_eq(format('SELECT status, mentor_answer FROM public.doubts WHERE id = %L', :'d1'),
  $$VALUES ('mentor_answered'::text, 'Think of the colours of sunlight…'::text)$$, 'student sees the mentor answer');

-- escalation limit
INSERT INTO public.doubts (user_id, question) SELECT :'student_a', 'q' || g FROM generate_series(1, 6) g;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.doubts WHERE question LIKE 'q%' ORDER BY question LIMIT 5 LOOP
    PERFORM public.escalate_doubt(r.id);
  END LOOP;
END $$;
SELECT throws_ok($$SELECT public.escalate_doubt((SELECT id FROM public.doubts WHERE question = 'q6'))$$,
  '22023', NULL, 'at most five open escalations per student');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
