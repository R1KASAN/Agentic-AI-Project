-- Migration: 004_aggregation_views
-- Creates secure views that enforce k-anonymity (n >= 3).
-- Teachers/Admins access climate data ONLY through these views.

-- ============================================================
-- 1. Weekly Climate Summary (k-anonymity enforced)
-- ============================================================
CREATE OR REPLACE VIEW public.v_class_climate_summary AS
SELECT
  ci.class_id,
  date_trunc('week', ci.created_at)::DATE AS week_start,
  COUNT(*)::INT AS check_in_count,
  -- k-anonymity: Return averages ONLY if count >= 3
  CASE WHEN COUNT(*) >= 3 THEN ROUND(AVG(ci.mood)::NUMERIC, 2) ELSE NULL END AS avg_mood,
  CASE WHEN COUNT(*) >= 3 THEN ROUND(AVG(ci.pace)::NUMERIC, 2) ELSE NULL END AS avg_pace,
  CASE WHEN COUNT(*) >= 3 THEN ROUND(AVG(ci.fairness)::NUMERIC, 2) ELSE NULL END AS avg_fairness
FROM public.check_ins ci
GROUP BY ci.class_id, date_trunc('week', ci.created_at);

COMMENT ON VIEW public.v_class_climate_summary IS
  'Aggregated weekly climate data per class. Returns NULL for metrics when check_in_count < 3 (k-anonymity).';

-- ============================================================
-- 2. Secure RPC function for fetching climate summary
-- SECURITY DEFINER: runs with the function owner's privileges,
-- bypassing RLS on check_ins. This is the ONLY way teachers
-- can access aggregated check-in data.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_class_climate_summary(
  p_class_id UUID,
  p_weeks INT DEFAULT 4
)
RETURNS TABLE (
  class_id UUID,
  week_start DATE,
  check_in_count INT,
  avg_mood NUMERIC,
  avg_pace NUMERIC,
  avg_fairness NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.class_id,
    v.week_start,
    v.check_in_count,
    v.avg_mood,
    v.avg_pace,
    v.avg_fairness
  FROM public.v_class_climate_summary v
  WHERE v.class_id = p_class_id
    AND v.week_start >= (CURRENT_DATE - (p_weeks * 7))
  ORDER BY v.week_start DESC;
$$;

COMMENT ON FUNCTION public.get_class_climate_summary IS
  'Secure function to retrieve aggregated climate data. Enforces k-anonymity via the view. Teachers call this, never raw check_ins.';

-- ============================================================
-- 3. Adoption metrics function (for Admin dashboard)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_adoption_metrics()
RETURNS TABLE (
  total_classes BIGINT,
  total_students BIGINT,
  total_checkins BIGINT,
  avg_checkin_rate NUMERIC,
  total_recommendations BIGINT,
  approved_recommendations BIGINT,
  communicated_recommendations BIGINT,
  loop_closure_rate NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.classes),
    (SELECT COUNT(DISTINCT student_id) FROM public.class_enrollments),
    (SELECT COUNT(*) FROM public.check_ins),
    -- Check-in rate: total check-ins / total enrolled students (rough metric)
    CASE
      WHEN (SELECT COUNT(DISTINCT student_id) FROM public.class_enrollments) > 0
      THEN ROUND(
        (SELECT COUNT(*)::NUMERIC FROM public.check_ins) /
        (SELECT COUNT(DISTINCT student_id)::NUMERIC FROM public.class_enrollments),
        2
      )
      ELSE 0
    END,
    (SELECT COUNT(*) FROM public.recommendations),
    (SELECT COUNT(*) FROM public.recommendations WHERE status = 'approved'),
    (SELECT COUNT(*) FROM public.recommendations WHERE communicated_to_students = true),
    -- Loop closure rate: communicated / total approved
    CASE
      WHEN (SELECT COUNT(*) FROM public.recommendations WHERE status = 'approved') > 0
      THEN ROUND(
        (SELECT COUNT(*)::NUMERIC FROM public.recommendations WHERE communicated_to_students = true) /
        (SELECT COUNT(*)::NUMERIC FROM public.recommendations WHERE status = 'approved'),
        2
      )
      ELSE 0
    END;
$$;

COMMENT ON FUNCTION public.get_adoption_metrics IS
  'Admin-only function for adoption dashboard. Returns aggregate metrics, never individual data.';
