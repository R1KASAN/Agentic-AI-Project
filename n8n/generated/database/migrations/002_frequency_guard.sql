-- ============================================================================
-- FILE 5: Frequency Guard RPC
-- Prevents notification spam: max 2/day, max 5/week per classroom.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_frequency_limit(
  p_class_id UUID,
  p_max_daily INT DEFAULT 2,
  p_max_weekly INT DEFAULT 5
)
RETURNS TABLE (
  limit_exceeded BOOLEAN,
  reason TEXT,
  daily_count BIGINT,
  weekly_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_count BIGINT;
  v_weekly_count BIGINT;
  v_limit_exceeded BOOLEAN := FALSE;
  v_reason TEXT := 'OK';
BEGIN
  -- Count recommendations sent today (excluding DISMISSED)
  SELECT COUNT(*)
  INTO v_daily_count
  FROM public.recommendations r
  WHERE r.class_id = p_class_id
    AND r.status != 'DISMISSED'
    AND r.created_at::DATE = CURRENT_DATE;

  -- Count recommendations sent this ISO week (excluding DISMISSED)
  SELECT COUNT(*)
  INTO v_weekly_count
  FROM public.recommendations r
  WHERE r.class_id = p_class_id
    AND r.status != 'DISMISSED'
    AND r.created_at >= date_trunc('week', CURRENT_DATE)
    AND r.created_at < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days';

  -- Check limits
  IF v_daily_count >= p_max_daily THEN
    v_limit_exceeded := TRUE;
    v_reason := 'Daily limit exceeded (' || v_daily_count || '/' || p_max_daily || ')';
  ELSIF v_weekly_count >= p_max_weekly THEN
    v_limit_exceeded := TRUE;
    v_reason := 'Weekly limit exceeded (' || v_weekly_count || '/' || p_max_weekly || ')';
  END IF;

  RETURN QUERY SELECT v_limit_exceeded, v_reason, v_daily_count, v_weekly_count;
END;
$$;
