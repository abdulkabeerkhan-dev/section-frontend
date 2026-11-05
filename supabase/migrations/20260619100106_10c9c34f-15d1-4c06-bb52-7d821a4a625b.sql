-- Migrate user_memory off Supabase Auth onto Clerk identity (text user ids)
ALTER TABLE public.user_memory DROP CONSTRAINT IF EXISTS user_memory_user_id_fkey;

DROP POLICY IF EXISTS "Users can delete their own memory" ON public.user_memory;
DROP POLICY IF EXISTS "Users can insert their own memory" ON public.user_memory;
DROP POLICY IF EXISTS "Users can update their own memory" ON public.user_memory;
DROP POLICY IF EXISTS "Users can view their own memory" ON public.user_memory;

ALTER TABLE public.user_memory ALTER COLUMN user_id TYPE text USING user_id::text;

-- Access is only ever through server functions using the service role key,
-- which bypasses RLS. Keep RLS enabled with no anon/authenticated policies
-- so the table is not reachable directly via the Data API.
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_memory FROM anon, authenticated;
GRANT ALL ON public.user_memory TO service_role;