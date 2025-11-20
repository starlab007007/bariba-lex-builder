-- Add DELETE policy for admins on idiomatic_expressions table
CREATE POLICY "Admins peuvent supprimer des idiomes"
ON idiomatic_expressions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
  )
);