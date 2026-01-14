-- Create a public view for donations that excludes sensitive payment data
CREATE VIEW public.donations_public
WITH (security_invoker = on) AS
SELECT 
  id,
  donor_name,
  amount,
  status,
  created_at
FROM public.donations
WHERE status = 'successful';

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Anyone can view successful donations" ON public.donations;

-- Create restrictive policy - no direct public access to base table
CREATE POLICY "No direct public access to donations"
ON public.donations
FOR SELECT
USING (false);

-- Grant access to the view for anonymous and authenticated users
GRANT SELECT ON public.donations_public TO anon, authenticated;