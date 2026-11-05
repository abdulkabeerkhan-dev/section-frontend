ALTER TABLE public.activity_log
  ADD COLUMN thread_id uuid NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX idx_activity_log_thread ON public.activity_log (user_id, thread_id, created_at);