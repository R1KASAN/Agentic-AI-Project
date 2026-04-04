-- Migration: 036_n8n_climate_snapshot_batch
-- Purpose: Restore a server-safe daily climate snapshot contract for n8n workflows
-- Scope: additive only; keeps student-facing daily/weekly RPCs unchanged
-- Date: 2026-04-03

DROP FUNCTION IF EXISTS public.get_class_climate_snapshot_batch(UUID[], DATE, INT);

CREATE OR REPLACE FUNCTION public.get_class_climate_snapshot_batch(
  p_class_ids UUID[],
  p_date DATE,
  p_min_n INT DEFAULT 3
)
RETURNS TABLE (
  class_id UUID,
  snapshot_date DATE,
  total_responses INT,
  avg_mood_score FLOAT8,
  avg_pace_score FLOAT8,
  avg_fairness_score FLOAT8,
  k_anonymity_safe BOOLEAN,
  blocked_reason TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH input_classes AS (
    SELECT DISTINCT unnest(COALESCE(p_class_ids, ARRAY[]::UUID[])) AS class_id
  ),
  daily_rollup AS (
    SELECT
      sp.class_id,
      COUNT(*)::INT AS total_responses,
      COUNT(DISTINCT sp.student_id)::INT AS distinct_students,
      ROUND(AVG(
        CASE sp.mood
          WHEN 'very_low' THEN 1
          WHEN 'low' THEN 2
          WHEN 'neutral' THEN 3
          WHEN 'good' THEN 4
          WHEN 'great' THEN 5
          ELSE 3
        END
      )::NUMERIC, 2)::FLOAT8 AS raw_avg_mood,
      ROUND(AVG(sp.pace)::NUMERIC, 2)::FLOAT8 AS raw_avg_pace,
      ROUND(AVG(sp.fairness)::NUMERIC, 2)::FLOAT8 AS raw_avg_fairness
    FROM public.student_pulses sp
    INNER JOIN input_classes ic
      ON ic.class_id = sp.class_id
    WHERE date_trunc('day', sp.created_at AT TIME ZONE 'UTC')::DATE = p_date
    GROUP BY sp.class_id
  )
  SELECT
    ic.class_id,
    p_date AS snapshot_date,
    COALESCE(dr.total_responses, 0) AS total_responses,
    CASE
      WHEN COALESCE(dr.distinct_students, 0) >= GREATEST(COALESCE(p_min_n, 3), 1)
        THEN dr.raw_avg_mood
      ELSE NULL
    END AS avg_mood_score,
    CASE
      WHEN COALESCE(dr.distinct_students, 0) >= GREATEST(COALESCE(p_min_n, 3), 1)
        THEN dr.raw_avg_pace
      ELSE NULL
    END AS avg_pace_score,
    CASE
      WHEN COALESCE(dr.distinct_students, 0) >= GREATEST(COALESCE(p_min_n, 3), 1)
        THEN dr.raw_avg_fairness
      ELSE NULL
    END AS avg_fairness_score,
    COALESCE(dr.distinct_students, 0) >= GREATEST(COALESCE(p_min_n, 3), 1) AS k_anonymity_safe,
    CASE
      WHEN dr.class_id IS NULL THEN 'no_responses'
      WHEN COALESCE(dr.distinct_students, 0) < GREATEST(COALESCE(p_min_n, 3), 1) THEN 'k_anonymity'
      ELSE NULL
    END AS blocked_reason
  FROM input_classes ic
  LEFT JOIN daily_rollup dr
    ON dr.class_id = ic.class_id
  ORDER BY ic.class_id;
$$;

COMMENT ON FUNCTION public.get_class_climate_snapshot_batch(UUID[], DATE, INT) IS
  'Server-safe daily climate snapshot RPC for n8n workflows. Returns one row per requested class for the given UTC date, keeps class rows even when blocked, and enforces k-anonymity by returning NULL metrics when fewer than p_min_n distinct students submitted.';

GRANT EXECUTE ON FUNCTION public.get_class_climate_snapshot_batch(UUID[], DATE, INT)
  TO authenticated;
