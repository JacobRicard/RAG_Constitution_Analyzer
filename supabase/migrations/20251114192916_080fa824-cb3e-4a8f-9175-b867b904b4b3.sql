-- Add RLS policy for admins to view all amendments
CREATE POLICY "Admins can view all amendments"
ON amendments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));