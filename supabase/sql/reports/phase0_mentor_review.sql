-- READ-ONLY REVIEW QUERY — Phase 0 (SEC-001)
--
-- Before Phase 0, anyone could become a mentor by choosing "Sign up as Mentor"
-- (signup metadata) or by updating profiles.role themselves. The Phase 0
-- migration stops new escalations but deliberately does NOT revoke existing
-- mentor roles. An administrator should run this against STAGING first and
-- then production (via the SQL editor, as a read-only review) and decide, per
-- account, whether to keep the role or call public.revoke_mentor_role(id).
--
-- This file is not a migration and is never applied automatically.

SELECT
  p.id,
  p.email,
  p.full_name,
  p.created_at                                   AS account_created_at,
  u.raw_user_meta_data->>'role'                  AS role_claimed_at_signup,
  (m.id IS NOT NULL)                             AS has_mentor_profile,
  m.is_verified                                  AS mentor_profile_verified,
  app.status                                     AS latest_application_status,
  app.reviewed_at                                AS latest_application_reviewed_at,
  (SELECT count(*) FROM public.mentorship_sessions s WHERE s.mentor_id = p.id) AS sessions_created,
  (SELECT count(*) FROM public.blog_posts b WHERE b.author_id = p.id)          AS blog_posts_authored,
  CASE
    WHEN app.status = 'approved' THEN 'approved via application'
    WHEN u.raw_user_meta_data->>'role' = 'mentor' THEN 'self-selected at signup — review'
    ELSE 'role changed outside signup — review with priority'
  END                                            AS review_note
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN public.mentors m ON m.id = p.id
LEFT JOIN LATERAL (
  SELECT a.status, a.reviewed_at
  FROM public.mentor_applications a
  WHERE a.user_id = p.id
  ORDER BY a.created_at DESC
  LIMIT 1
) app ON true
WHERE p.role = 'mentor'
ORDER BY review_note, p.created_at;
