CREATE TABLE public.citation_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  case_id text,
  citation text,
  court text,
  case_title text,
  query_text text,
  issue_type text NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.citation_feedback TO authenticated;
GRANT ALL ON public.citation_feedback TO service_role;

ALTER TABLE public.citation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own citation feedback"
ON public.citation_feedback FOR INSERT TO authenticated
WITH CHECK (user_id = COALESCE((auth.jwt() ->> 'sub'::text), ''::text));

CREATE POLICY "Users can view their own citation feedback"
ON public.citation_feedback FOR SELECT TO authenticated
USING (user_id = COALESCE((auth.jwt() ->> 'sub'::text), ''::text));

CREATE INDEX idx_citation_feedback_created_at ON public.citation_feedback (created_at DESC);