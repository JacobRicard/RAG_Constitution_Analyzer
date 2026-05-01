-- 1. Replace the policy so it blocks INSERT too (WITH CHECK covers new rows)
DROP POLICY IF EXISTS "service role only" ON public.ai_usage;
CREATE POLICY "no public access" ON public.ai_usage
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- 2. Revoke RPC execute from all non-service roles
REVOKE EXECUTE ON FUNCTION public.increment_ai_tokens(INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_ai_tokens(INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_ai_tokens(INT) FROM authenticated;

-- 3. Re-create function with input validation so negative values can't drain the counter
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
  -- Reject zero or negative values
  IF tokens_used <= 0 THEN
    RETURN FALSE;
  END IF;

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
