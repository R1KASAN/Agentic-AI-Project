CREATE OR REPLACE FUNCTION public.check_frequency_limit(p_class_id uuid, p_max_daily integer DEFAULT 2, p_max_weekly integer DEFAULT 5)
 RETURNS TABLE(limit_exceeded boolean, reason text, daily_count bigint, weekly_count bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    (daily.cnt >= p_max_daily OR weekly.cnt >= p_max_weekly) AS limit_exceeded,
    CASE
      WHEN daily.cnt  >= p_max_daily  THEN 'Daily limit reached ('  || daily.cnt  || '/' || p_max_daily  || ')'
      WHEN weekly.cnt >= p_max_weekly THEN 'Weekly limit reached (' || weekly.cnt || '/' || p_max_weekly || ')'
      ELSE 'Within limits'
    END                                                       AS reason,
    daily.cnt                                                 AS daily_count,
    weekly.cnt                                                AS weekly_count
  FROM (
    SELECT COUNT(*) AS cnt
    FROM public.recommendations
    WHERE class_id   = p_class_id
      AND created_at >= CURRENT_DATE
      AND teacher_approval_status != 'dismissed'
  ) daily,
  (
    SELECT COUNT(*) AS cnt
    FROM public.recommendations
    WHERE class_id   = p_class_id
      AND created_at >= DATE_TRUNC('week', NOW())
      AND teacher_approval_status != 'dismissed'
  ) weekly;
$function$


CREATE OR REPLACE FUNCTION public.get_teacher_metrics(p_class_id uuid, p_lookback_days integer DEFAULT 30)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'class_id', p_class_id,
    'lookback_days', p_lookback_days,
    'total_surveys', COUNT(*),
    'avg_mood_score', ROUND(AVG(mood_score)::NUMERIC, 2),
    'low_mood_count', COUNT(*) FILTER (WHERE mood_score <= 2),
    'high_mood_count', COUNT(*) FILTER (WHERE mood_score >= 4),
    'date_range_start', MIN(survey_date),
    'date_range_end', MAX(survey_date)
  )
  INTO v_result
  FROM climate_surveys
  WHERE class_id = p_class_id
    AND survey_date >= CURRENT_DATE - INTERVAL '1 day' * p_lookback_days;
  
  RETURN v_result;
END;
$function$


