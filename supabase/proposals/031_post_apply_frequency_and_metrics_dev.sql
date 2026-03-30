CREATE OR REPLACE FUNCTION public.check_frequency_limit(p_class_id uuid, p_max_daily integer DEFAULT 2, p_max_weekly integer DEFAULT 5)
 RETURNS TABLE(limit_exceeded boolean, reason text, daily_count integer, weekly_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$


CREATE OR REPLACE FUNCTION public.get_teacher_metrics(p_class_id uuid, p_lookback_days integer DEFAULT 30)
 RETURNS TABLE(teacher_id uuid, class_id uuid, total_generated_recommendations integer, total_decided_recommendations integer, total_recommendations integer, accepted_count integer, dismissed_count integer, dismissal_rate double precision, teacher_flag_inquiry_mode boolean, dismissal_pattern_consecutive integer, inquiry_mode_triggered_at timestamp with time zone, avg_mood_score double precision, total_surveys integer, low_mood_count integer, high_mood_count integer, source text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$


