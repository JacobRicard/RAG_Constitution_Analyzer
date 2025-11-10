-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;

-- Recreate it using the has_role security definer function to avoid recursion
CREATE POLICY "Admins can view all roles"
ON user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));