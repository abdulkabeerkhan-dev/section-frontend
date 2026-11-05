-- Lock down the SECURITY DEFINER helper
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- activity_log: owner-scoped access only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
REVOKE ALL ON public.activity_log FROM anon;

DROP POLICY IF EXISTS "Users can view their own activity" ON public.activity_log;
CREATE POLICY "Users can view their own activity"
ON public.activity_log FOR SELECT TO authenticated
USING (user_id = coalesce(auth.jwt() ->> 'sub', ''));

DROP POLICY IF EXISTS "Users can insert their own activity" ON public.activity_log;
CREATE POLICY "Users can insert their own activity"
ON public.activity_log FOR INSERT TO authenticated
WITH CHECK (user_id = coalesce(auth.jwt() ->> 'sub', ''));

DROP POLICY IF EXISTS "Users can update their own activity" ON public.activity_log;
CREATE POLICY "Users can update their own activity"
ON public.activity_log FOR UPDATE TO authenticated
USING (user_id = coalesce(auth.jwt() ->> 'sub', ''))
WITH CHECK (user_id = coalesce(auth.jwt() ->> 'sub', ''));

DROP POLICY IF EXISTS "Users can delete their own activity" ON public.activity_log;
CREATE POLICY "Users can delete their own activity"
ON public.activity_log FOR DELETE TO authenticated
USING (user_id = coalesce(auth.jwt() ->> 'sub', ''));

-- user_memory: owner-scoped access only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_memory TO authenticated;
GRANT ALL ON public.user_memory TO service_role;
REVOKE ALL ON public.user_memory FROM anon;

DROP POLICY IF EXISTS "Users can view their own memory" ON public.user_memory;
CREATE POLICY "Users can view their own memory"
ON public.user_memory FOR SELECT TO authenticated
USING (user_id = coalesce(auth.jwt() ->> 'sub', ''));

DROP POLICY IF EXISTS "Users can insert their own memory" ON public.user_memory;
CREATE POLICY "Users can insert their own memory"
ON public.user_memory FOR INSERT TO authenticated
WITH CHECK (user_id = coalesce(auth.jwt() ->> 'sub', ''));

DROP POLICY IF EXISTS "Users can update their own memory" ON public.user_memory;
CREATE POLICY "Users can update their own memory"
ON public.user_memory FOR UPDATE TO authenticated
USING (user_id = coalesce(auth.jwt() ->> 'sub', ''))
WITH CHECK (user_id = coalesce(auth.jwt() ->> 'sub', ''));

DROP POLICY IF EXISTS "Users can delete their own memory" ON public.user_memory;
CREATE POLICY "Users can delete their own memory"
ON public.user_memory FOR DELETE TO authenticated
USING (user_id = coalesce(auth.jwt() ->> 'sub', ''));