-- ─── Fix: amendments table RLS ───────────────────────────────────────────────
-- "Anyone can submit amendments" allowed unauthenticated inserts.
-- Replace with auth-required policy.
DROP POLICY IF EXISTS "Anyone can submit amendments" ON public.amendments;

CREATE POLICY "Authenticated users can submit amendments"
ON public.amendments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- "Anyone can view all amendments" exposed pending/rejected records to the public.
-- Drop it — the "approved only" policy below is sufficient for public reads.
DROP POLICY IF EXISTS "Anyone can view all amendments" ON public.amendments;

-- Admins can update amendments (approve, reject, edit)
CREATE POLICY "Admins can update amendments"
ON public.amendments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins can delete amendments
CREATE POLICY "Admins can delete amendments"
ON public.amendments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ─── Fix: committee_password table ───────────────────────────────────────────
-- The public SELECT policy exposed the password hash to any caller.
-- This table is a legacy artifact from the old shared-password system.
-- Revoke all public access; only the service role (used in edge functions) can read it.
DROP POLICY IF EXISTS "Allow reading password hash for validation" ON public.committee_password;
