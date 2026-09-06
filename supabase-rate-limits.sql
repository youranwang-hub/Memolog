-- Run once in Supabase SQL Editor to enable shared limits across Vercel instances.
CREATE TABLE IF NOT EXISTS public.ai_request_limits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('extract', 'generate')),
  request_count integer NOT NULL,
  reset_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, action)
);
ALTER TABLE public.ai_request_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS ai_request_limits_reset_idx ON public.ai_request_limits(reset_at);
CREATE OR REPLACE FUNCTION public.consume_ai_quota(p_action text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_count integer;
BEGIN
  IF v_user IS NULL OR p_action NOT IN ('extract', 'generate') THEN RETURN false; END IF;
  DELETE FROM public.ai_request_limits WHERE reset_at < v_now - interval '1 hour';
  INSERT INTO public.ai_request_limits AS limits (user_id, action, request_count, reset_at)
  VALUES (v_user, p_action, 1, v_now + interval '1 minute')
  ON CONFLICT (user_id, action) DO UPDATE SET
    request_count = CASE WHEN limits.reset_at <= v_now THEN 1 ELSE limits.request_count + 1 END,
    reset_at = CASE WHEN limits.reset_at <= v_now THEN v_now + interval '1 minute' ELSE limits.reset_at END
  WHERE limits.reset_at <= v_now OR limits.request_count < 20
  RETURNING request_count INTO v_count;
  RETURN v_count IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_ai_quota(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(text) TO authenticated;
