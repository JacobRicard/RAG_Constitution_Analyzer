-- Global AI token usage tracker — single-row table, enforced at the edge function level.
-- 500,000 token limit ≈ $5 even at GPT-4o pricing ($10/1M output tokens).

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id         INT          PRIMARY KEY DEFAULT 1,
  total_tokens BIGINT     NOT NULL DEFAULT 0,
  token_limit  BIGINT     NOT NULL DEFAULT 500000,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Ensure exactly one row exists
INSERT INTO public.ai_usage (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Only service role can touch this table
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON public.ai_usage USING (false);

-- Atomically increment token usage. Returns FALSE if adding tokens_used would exceed the limit.
CREATE OR REPLACE FUNCTION public.increment_ai_tokens(tokens_used INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total BIGINT;
  v_limit BIGINT;
BEGIN
  SELECT total_tokens, token_limit
    INTO v_total, v_limit
    FROM public.ai_usage
   WHERE id = 1
     FOR UPDATE;

  IF v_total + tokens_used > v_limit THEN
    RETURN FALSE;
  END IF;

  UPDATE public.ai_usage
     SET total_tokens = total_tokens + tokens_used
   WHERE id = 1;

  RETURN TRUE;
END;
$$;
