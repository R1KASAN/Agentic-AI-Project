-- Migration: 032_teacher_dashboard_batching
-- Purpose: Add batched dashboard RPCs and audit lookup indexes for teacher overview pages
-- Scope: additive only; existing single-class RPCs remain unchanged
-- Date: 2026-03-29

-- ============================================================
-- PART 1: Batch teacher metrics RPC
-- Mirrors get_teacher_metrics() semantics but accepts multiple class ids.
-- Returns one row per requested class_id, including zero-state classes.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_teacher_metrics_batch(UUID[], INT);

CREATE OR REPLACE FUNCTION public.get_teacher_metrics_batch(
  p_class_ids UUID[],
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
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH input_classes AS (
    SELECT DISTINCT unnest(COALESCE(p_class_ids, ARRAY[]::UUID[])) AS class_id
  ),
  class_context AS (
    SELECT
      ic.class_id,
      c.teacher_id
    FROM input_classes ic
    LEFT JOIN public.classes c
      ON c.id = ic.class_id
  ),
  recommendation_stats AS (
    SELECT
      r.class_id,
      COUNT(*)::INT AS total_generated_recommendations,
      COUNT(*) FILTER (WHERE r.status IN ('approved', 'dismissed'))::INT AS total_decided_recommendations,
      COUNT(*) FILTER (WHERE r.status = 'approved')::INT AS accepted_count,
      COUNT(*) FILTER (WHERE r.status = 'dismissed')::INT AS dismissed_count
    FROM public.recommendations r
    INNER JOIN input_classes ic
      ON ic.class_id = r.class_id
    WHERE r.created_at >= NOW() - make_interval(days => p_lookback_days)
    GROUP BY r.class_id
  ),
  pulse_scores AS (
    SELECT
      sp.class_id,
      CASE
        WHEN sp.mood = 'happy' THEN 4
        WHEN sp.mood = 'neutral' THEN 3
        WHEN sp.mood = 'sad' THEN 2
        WHEN sp.mood = 'very_sad' THEN 1
        ELSE NULL
      END AS mood_score
    FROM public.student_pulses sp
    INNER JOIN input_classes ic
      ON ic.class_id = sp.class_id
    WHERE sp.created_at >= NOW() - make_interval(days => p_lookback_days)
  ),
  pulse_stats AS (
    SELECT
      ps.class_id,
      AVG(ps.mood_score)::FLOAT8 AS avg_mood_score,
      COUNT(*)::INT AS total_surveys,
      COUNT(*) FILTER (WHERE ps.mood_score <= 2)::INT AS low_mood_count,
      COUNT(*) FILTER (WHERE ps.mood_score >= 4)::INT AS high_mood_count
    FROM pulse_scores ps
    GROUP BY ps.class_id
  ),
  teacher_state AS (
    SELECT
      cc.class_id,
      cc.teacher_id,
      COALESCE(tp.is_inquiry_mode, FALSE) AS teacher_flag_inquiry_mode,
      COALESCE(tp.dismissal_pattern_consecutive, 0) AS dismissal_pattern_consecutive,
      tp.inquiry_mode_triggered_at
    FROM class_context cc
    LEFT JOIN public.teacher_profiles tp
      ON tp.user_id = cc.teacher_id
  )
  SELECT
    cc.teacher_id,
    cc.class_id,
    COALESCE(rs.total_generated_recommendations, 0) AS total_generated_recommendations,
    COALESCE(rs.total_decided_recommendations, 0) AS total_decided_recommendations,
    COALESCE(rs.total_decided_recommendations, 0) AS total_recommendations,
    COALESCE(rs.accepted_count, 0) AS accepted_count,
    COALESCE(rs.dismissed_count, 0) AS dismissed_count,
    CASE
      WHEN COALESCE(rs.total_decided_recommendations, 0) > 0
        THEN COALESCE(rs.dismissed_count, 0)::FLOAT8
          / COALESCE(rs.total_decided_recommendations, 0)::FLOAT8
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
  FROM class_context cc
  LEFT JOIN recommendation_stats rs
    ON rs.class_id = cc.class_id
  LEFT JOIN pulse_stats ps
    ON ps.class_id = cc.class_id
  LEFT JOIN teacher_state ts
    ON ts.class_id = cc.class_id
  ORDER BY cc.class_id;
$$;

COMMENT ON FUNCTION public.get_teacher_metrics_batch(UUID[], INT) IS
  'Batch variant of get_teacher_metrics(). Accepts multiple class ids, returns one row per requested class, preserves dismissal_rate semantics and keeps total_recommendations as the decided-count legacy alias. SECURITY DEFINER bypasses RLS only for already-aggregated teacher dashboard metrics.';

GRANT EXECUTE ON FUNCTION public.get_teacher_metrics_batch(UUID[], INT)
  TO authenticated;

-- ============================================================
-- PART 2: Batch climate summary RPC
-- Mirrors get_class_climate_summary() semantics for multiple class ids.
-- Returns only existing aggregate rows; callers map missing classes to [].
-- ============================================================

DROP FUNCTION IF EXISTS public.get_class_climate_summary_batch(UUID[], INT);

CREATE OR REPLACE FUNCTION public.get_class_climate_summary_batch(
  p_class_ids UUID[],
  p_weeks INT DEFAULT 4
)
RETURNS TABLE (
  class_id UUID,
  week_start DATE,
  check_in_count INT,
  avg_mood FLOAT8,
  avg_pace FLOAT8,
  avg_fairness FLOAT8
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH input_classes AS (
    SELECT DISTINCT unnest(COALESCE(p_class_ids, ARRAY[]::UUID[])) AS class_id
  )
  SELECT
    v.class_id,
    v.week_start,
    v.check_in_count,
    v.avg_mood::FLOAT8,
    v.avg_pace::FLOAT8,
    v.avg_fairness::FLOAT8
  FROM public.v_class_climate_summary v
  INNER JOIN input_classes ic
    ON ic.class_id = v.class_id
  WHERE v.week_start >= (CURRENT_DATE - (p_weeks * 7))
  ORDER BY v.class_id, v.week_start DESC;
$$;

COMMENT ON FUNCTION public.get_class_climate_summary_batch(UUID[], INT) IS
  'Batch variant of get_class_climate_summary(). Reads from v_class_climate_summary, preserves k-anonymity semantics from the underlying view, and returns only aggregate rows for the requested classes and lookback window.';

GRANT EXECUTE ON FUNCTION public.get_class_climate_summary_batch(UUID[], INT)
  TO authenticated;

-- ============================================================
-- PART 3: Audit lookup indexes
-- Keep compatibility with both canonical and legacy audit table names.
-- The current teacher dashboard query shape uses the legacy plural table.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'n8n_audit_log'
      AND c.relkind = 'r'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_log_class_timestamp ON public.n8n_audit_log(class_id, "timestamp" DESC)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'n8n_audit_logs'
      AND c.relkind = 'r'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_class_created_at ON public.n8n_audit_logs(class_id, created_at DESC)';
  END IF;
END;
$$;
