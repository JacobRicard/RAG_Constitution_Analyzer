-- Fix: Require authentication for amendment submissions
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can submit amendments" ON public.amendments;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can submit amendments"
ON public.amendments
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);