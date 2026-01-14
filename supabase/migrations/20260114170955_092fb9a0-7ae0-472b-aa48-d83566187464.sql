-- Create a public view for mentors that excludes sensitive email column
CREATE VIEW public.mentors_public
WITH (security_invoker = on) AS
SELECT 
  id,
  full_name,
  bio,
  expertise,
  qualification,
  rating,
  total_sessions,
  is_verified,
  is_volunteer,
  experience_years,
  availability_hours,
  created_at,
  updated_at
FROM public.mentors;

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Anyone can view verified mentors" ON public.mentors;

-- Create restrictive policy - only mentors can view their own full record
CREATE POLICY "Mentors can view their own profile"
ON public.mentors
FOR SELECT
USING (id = auth.uid());

-- Grant access to the view for anonymous and authenticated users
GRANT SELECT ON public.mentors_public TO anon, authenticated;