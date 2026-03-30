-- Migration: 031_add_daily_climate_rpc
-- Purpose: Add student-safe daily aggregate climate RPC for Student Feedback UI.
-- Scope: NEW daily aggregate path only. Does not modify existing weekly RPCs.
-- Date: 2026-03-26

DROP FUNCTION IF EXISTS public.get_class_climate_daily(UUID, INT);

CREATE OR REPLACE FUNCTION public.get_class_climate_daily(
  p_class_id UUID,
  p_days     INT DEFAULT 14
)
RETURNS TABLE (
  class_id        UUID,
  check_in_date   DATE,
  total_responses INT,
  avg_mood        FLOAT8,
  avg_pace        FLOAT8,
  avg_fairness    FLOAT8
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH authorized_class AS (
    SELECT EXISTS (
      SELECT 1
      FROM public.class_enrollments ce
      WHERE ce.class_id = p_class_id
        AND ce.student_id = auth.uid()
    ) AS allowed
  ),
  daily_rollup AS (
    SELECT
      sp.class_id,
      date_trunc('day', sp.created_at AT TIME ZONE 'UTC')::DATE AS check_in_date,
      COUNT(*)::INT AS total_responses,
      COUNT(DISTINCT sp.student_id)::INT AS distinct_students,
      ROUND(AVG(
        CASE sp.mood
          WHEN 'very_low' THEN 1
          WHEN 'low' THEN 2
          WHEN 'okay' THEN 3
          WHEN 'good' THEN 4
          WHEN 'great' THEN 5
          ELSE 3
        END
      )::NUMERIC, 2)::FLOAT8 AS raw_avg_mood,
      ROUND(AVG(sp.pace)::NUMERIC, 2)::FLOAT8 AS raw_avg_pace,
      ROUND(AVG(sp.fairness)::NUMERIC, 2)::FLOAT8 AS raw_avg_fairness
    FROM public.student_pulses sp
    WHERE sp.class_id = p_class_id
      AND date_trunc('day', sp.created_at AT TIME ZONE 'UTC')::DATE
        >= (CURRENT_DATE - (GREATEST(p_days, 1) - 1))
    GROUP BY sp.class_id, date_trunc('day', sp.created_at AT TIME ZONE 'UTC')::DATE
  )
  SELECT
    d.class_id,
    d.check_in_date,
    d.total_responses,
    CASE WHEN d.distinct_students >= 3 THEN d.raw_avg_mood ELSE NULL END AS avg_mood,
    CASE WHEN d.distinct_students >= 3 THEN d.raw_avg_pace ELSE NULL END AS avg_pace,
    CASE WHEN d.distinct_students >= 3 THEN d.raw_avg_fairness ELSE NULL END AS avg_fairness
  FROM daily_rollup d
  CROSS JOIN authorized_class ac
  WHERE ac.allowed
  ORDER BY d.check_in_date ASC;
$$;

COMMENT ON FUNCTION public.get_class_climate_daily(UUID, INT) IS
  'Daily aggregate climate endpoint for student feedback. Returns only per-day averages and response counts for the requested class, scoped to the authenticated enrolled student. Enforces k-anonymity by returning NULL averages when fewer than 3 distinct students submitted on a day.';

GRANT EXECUTE ON FUNCTION public.get_class_climate_daily(UUID, INT)
  TO authenticated;
