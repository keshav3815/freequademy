-- Create a function to get user counts by role (no PII exposed, just counts)
CREATE OR REPLACE FUNCTION public.get_user_counts()
RETURNS TABLE (
  total_users bigint,
  student_count bigint,
  mentor_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*)::bigint as total_users,
    COUNT(*) FILTER (WHERE role = 'student')::bigint as student_count,
    COUNT(*) FILTER (WHERE role = 'mentor')::bigint as mentor_count
  FROM public.profiles;
$$;