CREATE TABLE public.saved_precedents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  card_key text NOT NULL,
  citation text NOT NULL DEFAULT '',
  case_title text NOT NULL DEFAULT '',
  card jsonb NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  matter text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_precedents TO authenticated;
GRANT ALL ON public.saved_precedents TO service_role;
ALTER TABLE public.saved_precedents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own saved precedents" ON public.saved_precedents FOR ALL TO authenticated
  USING (user_id = COALESCE((auth.jwt() ->> 'sub'), ''))
  WITH CHECK (user_id = COALESCE((auth.jwt() ->> 'sub'), ''));
CREATE TRIGGER update_saved_precedents_updated_at BEFORE UPDATE ON public.saved_precedents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;
GRANT ALL ON public.saved_searches TO service_role;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own saved searches" ON public.saved_searches FOR ALL TO authenticated
  USING (user_id = COALESCE((auth.jwt() ->> 'sub'), ''))
  WITH CHECK (user_id = COALESCE((auth.jwt() ->> 'sub'), ''));