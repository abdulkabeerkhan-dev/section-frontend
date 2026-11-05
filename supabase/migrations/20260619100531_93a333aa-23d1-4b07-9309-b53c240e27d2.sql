ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_user_id_fkey;

DROP POLICY IF EXISTS "Users can insert their own activity" ON public.activity_log;
DROP POLICY IF EXISTS "Users can view their own activity" ON public.activity_log;

ALTER TABLE public.activity_log ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.activity_log FROM anon, authenticated;
GRANT ALL ON public.activity_log TO service_role;