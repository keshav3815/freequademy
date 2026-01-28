-- Fix 1: Add INSERT policy for user_reports so users can submit reports
CREATE POLICY "Users can submit reports"
ON public.user_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reported_by);

-- Fix 2: Drop overly permissive donation policies and create restrictive ones
-- Only service role (edge functions) should be able to insert/update donations

DROP POLICY IF EXISTS "System can insert donations" ON public.donations;
DROP POLICY IF EXISTS "System can update donations" ON public.donations;

-- No INSERT/UPDATE policies for regular users - only service role can write
-- Service role bypasses RLS, so no policies needed for edge function access
-- This effectively blocks all non-service-role writes