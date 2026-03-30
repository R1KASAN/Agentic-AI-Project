-- Phase A.3 proposal only.
-- Check in dev and staging first, always.
-- Do not run in production until preview queries and observability cases match the expected contract.

-- ============================================================
-- Proposal 1: check_frequency_limit()
-- Target semantics:
-- - count pending + approved recommendations
-- - exclude dismissed recommendations
-- - return explicit daily_count and weekly_count
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_frequency_limit(
  p_class_id UUID,
  p_max_daily INT DEFAULT 2,
  p_max_weekly INT DEFAULT 5
)
RETURNS TABLE (
  limit_exceeded BOOLEAN,
  reason TEXT,
  daily_count INT,
  weekly_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_count INT := 0;
  v_weekly_count INT := 0;
BEGIN
  SELECT COUNT(*)
  INTO v_daily_count
  FROM public.recommendations r
  WHERE r.class_id = p_class_id
    AND r.status IN ('pending', 'approved')
    AND r.created_at >= date_trunc('day', NOW())
    AND r.created_at < date_trunc('day', NOW()) + INTERVAL '1 day';

  SELECT COUNT(*)
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

COMMENT ON FUNCTION public.check_frequency_limit(UUID, INT, INT) IS
  'Phase A.3 proposal: count status in (pending, approved), exclude dismissed, and return explicit daily_count/weekly_count for class-scoped frequency guard.';

-- ============================================================
-- Proposal 2: get_teacher_metrics()
-- Target semantics:
-- - expose total_generated_recommendations
-- - expose total_decided_recommendations
-- - keep total_recommendations as decided count for backward compatibility
-- - dismissal_rate = dismissed / (approved + dismissed)
-- - pending does not affect dismissal_rate denominator
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_teacher_metrics(
  p_class_id UUID,
  p_lookback_days INT DEFAULT 30
)
RETURNS TABLE (
  teacher_id UUID,
  class_id UUID,
  total_generated_recommendations INT,
  total_decided_recommendations INT,
  total_recommendations INT,
  accepted_count INT,
  dismissed_count INT,
  dismissal_rate FLOAT8,
  teacher_flag_inquiry_mode BOOLEAN,
  dismissal_pattern_consecutive INT,
  inquiry_mode_triggered_at TIMESTAMPTZ,
  avg_mood_score FLOAT8,
  total_surveys INT,
  low_mood_count INT,
  high_mood_count INT,
  source TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id UUID;
BEGIN
  SELECT c.teacher_id
  INTO v_teacher_id
  FROM public.classes c
  WHERE c.id = p_class_id;

  RETURN QUERY
  WITH recs AS (
    SELECT *
    FROM public.recommendations r
    WHERE r.class_id = p_class_id
      AND r.created_at >= NOW() - make_interval(days => p_lookback_days)
  ),
  rec_counts AS (
    SELECT
      COUNT(*)::INT AS total_generated_recommendations,
      COUNT(*) FILTER (WHERE status IN ('approved', 'dismissed'))::INT AS total_decided_recommendations,
      COUNT(*) FILTER (WHERE status = 'approved')::INT AS accepted_count,
      COUNT(*) FILTER (WHERE status = 'dismissed')::INT AS dismissed_count
    FROM recs
  ),
  pulse_scores AS (
    SELECT
      CASE
        WHEN mood = 'happy' THEN 4
        WHEN mood = 'neutral' THEN 3
        WHEN mood = 'sad' THEN 2
        WHEN mood = 'very_sad' THEN 1
        ELSE NULL
      END AS mood_score
    FROM public.student_pulses sp
    WHERE sp.class_id = p_class_id
      AND sp.created_at >= NOW() - make_interval(days => p_lookback_days)
  ),
  pulse_stats AS (
    SELECT
      AVG(mood_score)::FLOAT8 AS avg_mood_score,
      COUNT(*)::INT AS total_surveys,
      COUNT(*) FILTER (WHERE mood_score <= 2)::INT AS low_mood_count,
      COUNT(*) FILTER (WHERE mood_score >= 4)::INT AS high_mood_count
    FROM pulse_scores
  ),
  teacher_state AS (
    SELECT
      tp.user_id AS teacher_id,
      COALESCE(tp.is_inquiry_mode, FALSE) AS teacher_flag_inquiry_mode,
      COALESCE(tp.dismissal_pattern_consecutive, 0) AS dismissal_pattern_consecutive,
      tp.inquiry_mode_triggered_at
    FROM public.teacher_profiles tp
    WHERE tp.user_id = v_teacher_id
  )
  SELECT
    v_teacher_id AS teacher_id,
    p_class_id AS class_id,
    rc.total_generated_recommendations,
    rc.total_decided_recommendations,
    rc.total_decided_recommendations AS total_recommendations,
    rc.accepted_count,
    rc.dismissed_count,
    CASE
      WHEN rc.total_decided_recommendations > 0
        THEN rc.dismissed_count::FLOAT8 / rc.total_decided_recommendations::FLOAT8
      ELSE 0::FLOAT8
    END AS dismissal_rate,
    COALESCE(ts.teacher_flag_inquiry_mode, FALSE) AS teacher_flag_inquiry_mode,
    COALESCE(ts.dismissal_pattern_consecutive, 0) AS dismissal_pattern_consecutive,
    ts.inquiry_mode_triggered_at AT TIME ZONE 'UTC' AS inquiry_mode_triggered_at,
    ps.avg_mood_score,
    COALESCE(ps.total_surveys, 0) AS total_surveys,
    COALESCE(ps.low_mood_count, 0) AS low_mood_count,
    COALESCE(ps.high_mood_count, 0) AS high_mood_count,
    'supabase_rpc'::TEXT AS source
  FROM rec_counts rc
  CROSS JOIN pulse_stats ps
  LEFT JOIN teacher_state ts ON TRUE;
END;
$$;

COMMENT ON FUNCTION public.get_teacher_metrics(UUID, INT) IS
  'Phase A.3 proposal: expose generated vs decided recommendation counts, use dismissal_rate = dismissed / (approved + dismissed), and keep total_recommendations as decided-count legacy alias.';

-- ============================================================
-- Proposal 3: Tool normalization update
-- The n8n tool can keep backward compatibility by reading:
-- - total_generated_recommendations
-- - total_decided_recommendations
-- - total_recommendations (legacy alias)
-- ============================================================
