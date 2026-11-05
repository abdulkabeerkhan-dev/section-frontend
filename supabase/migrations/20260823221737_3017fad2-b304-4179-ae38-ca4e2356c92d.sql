DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

CREATE POLICY "Admins can create profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));