-- Migration: 037_n8n_legacy_rpc_compat
-- Purpose: Restore legacy RPC contracts still referenced by live n8n workflows
-- Scope: additive compatibility wrappers only
-- Date: 2026-04-03

-- ============================================================
-- PART 1: Legacy frequency guard RPC
-- Keeps climate-agent-main-v2 compatible with the older REST RPC call shape.
-- ============================================================

DROP FUNCTION IF EXISTS public.check_frequency_limit(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.check_frequency_limit(
  p_class_id UUID,
  p_max_daily INTEGER DEFAULT 2,
  p_max_weekly INTEGER DEFAULT 5
)
RETURNS TABLE (
  limit_exceeded BOOLEAN,
  reason TEXT,
  daily_count INTEGER,
  weekly_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_count INTEGER := 0;
  v_weekly_count INTEGER := 0;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_daily_count
  FROM public.recommendations r
  WHERE r.class_id = p_class_id
    AND r.status IN ('pending', 'approved')
    AND r.created_at >= date_trunc('day', NOW())
    AND r.created_at < date_trunc('day', NOW()) + INTERVAL '1 day';

  SELECT COUNT(*)::INTEGER
  INTO v_weekly_count
  FROM public.recommendations r
  WHERE r.class_id = p_class_id
    AND r.status IN ('pending', 'approved')
    AND r.created_at >= NOW() - INTERVAL '7 days';

  RETURN QUERY
  SELECT
    (v_daily_count >= p_max_daily OR v_weekly_count >= p_max_weekly) AS limit_exceeded,
    CASE
      WHEN v_daily_count >= p_max_daily THEN 'Daily limit reached'
      WHEN v_weekly_count >= p_max_weekly THEN 'Weekly limit reached'
      ELSE 'Within limits'
    END AS reason,
    v_daily_count,
    v_weekly_count;
END;
$$;

COMMENT ON FUNCTION public.check_frequency_limit(UUID, INTEGER, INTEGER) IS
  'Compatibility RPC for legacy n8n frequency guard calls. Counts pending/approved recommendations over daily and rolling 7-day windows.';

GRANT EXECUTE ON FUNCTION public.check_frequency_limit(UUID, INTEGER, INTEGER)
  TO anon, authenticated, service_role;

-- ============================================================
-- PART 2: Legacy single-class teacher metrics RPC
-- Wraps the batched teacher dashboard RPC so older tool workflows keep working.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_teacher_metrics(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.get_teacher_metrics(
  p_class_id UUID,
  p_lookback_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  teacher_id UUID,
  class_id UUID,
  total_generated_recommendations INTEGER,
  total_decided_recommendations INTEGER,
  total_recommendations INTEGER,
  accepted_count INTEGER,
  dismissed_count INTEGER,
  dismissal_rate DOUBLE PRECISION,
  teacher_flag_inquiry_mode BOOLEAN,
  dismissal_pattern_consecutive INTEGER,
  inquiry_mode_triggered_at TIMESTAMPTZ,
  avg_mood_score DOUBLE PRECISION,
  total_surveys INTEGER,
  low_mood_count INTEGER,
  high_mood_count INTEGER,
  source TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    metrics.teacher_id,
    metrics.class_id,
    metrics.total_generated_recommendations,
    metrics.total_decided_recommendations,
    metrics.total_recommendations,
    metrics.accepted_count,
    metrics.dismissed_count,
    metrics.dismissal_rate,
    metrics.teacher_flag_inquiry_mode,
    metrics.dismissal_pattern_consecutive,
    metrics.inquiry_mode_triggered_at,
    metrics.avg_mood_score,
    metrics.total_surveys,
    metrics.low_mood_count,
    metrics.high_mood_count,
    metrics.source
  FROM public.get_teacher_metrics_batch(
    ARRAY[p_class_id]::UUID[],
    p_lookback_days
  ) AS metrics;
$$;

COMMENT ON FUNCTION public.get_teacher_metrics(UUID, INTEGER) IS
  'Compatibility wrapper around get_teacher_metrics_batch(UUID[], INT) for legacy n8n sub-workflows that still request single-class metrics.';

GRANT EXECUTE ON FUNCTION public.get_teacher_metrics(UUID, INTEGER)
  TO anon, authenticated, service_role;
