-- Drop the existing SELECT policy that allows all mentors to view applications
DROP POLICY IF EXISTS "Users can view their applications" ON public.mentor_applications;

-- Create new policy: users can view their own applications OR admins can view all
CREATE POLICY "Users can view their own applications"
ON public.mentor_applications
FOR SELECT
USING (
  (user_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Also update the UPDATE policy to only allow admins (not all mentors)
DROP POLICY IF EXISTS "Admins can update applications" ON public.mentor_applications;

CREATE POLICY "Admins can update applications"
ON public.mentor_applications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));