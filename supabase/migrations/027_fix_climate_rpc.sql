-- Migration: 027_fix_climate_rpc
-- Purpose: Fix get_class_climate_summary() — resolves 5 stacked bugs
--
-- Bug 1: Parameter mismatch — migration 026 changed signature to (UUID, VARCHAR)
--         but page.tsx calls with p_weeks: INT → wrong overload selected
-- Bug 2: Return column mismatch — migration 026 returns mean_mood/std_dev
--         but ClassDetailClient expects avg_mood/avg_pace/avg_fairness
-- Bug 3: Time window too short — migration 026 default was 24 hours
-- Bug 4: Two conflicting Postgres overloads (INT→JSONB from 005, VARCHAR→TABLE from 026)
-- Bug 5: Data table mismatch — student check-in API writes to student_pulses
--         but original RPC (004) read from check_ins — so RPC returned empty
--
-- Fix: Drop ALL old overloads. Create one canonical RPC reading from
--      student_pulses (the table students actually write to), with correct
--      return columns, 4-week default window, and k-anonymity (k≥3 distinct students).
-- Date: 2026-03-20

-- ============================================================
-- STEP 1: Drop ALL existing overloads (idempotent)
-- ============================================================

-- Original from migration 004 (SQL function, (UUID,INT)→TABLE with NUMERIC cols)
DROP FUNCTION IF EXISTS public.get_class_climate_summary(UUID, INT);

-- Migration 005 version overloaded it as (UUID,INT)→JSONB
-- (same signature, was replaced by CREATE OR REPLACE, so same DROP covers it)

-- Migration 026 version with wrong VARCHAR signature
DROP FUNCTION IF EXISTS public.get_class_climate_summary(UUID, VARCHAR);

-- Extra safety: drop any TEXT variant
DROP FUNCTION IF EXISTS public.get_class_climate_summary(UUID, TEXT);

-- ============================================================
-- STEP 2: Also rebuild the underlying view to read from student_pulses
-- (The original view v_class_climate_summary read from check_ins,
--  but student check-ins are now stored in student_pulses)
-- ============================================================

CREATE OR REPLACE VIEW public.v_class_climate_summary AS
SELECT
  sp.class_id,
  date_trunc('week', sp.created_at AT TIME ZONE 'UTC')::DATE AS week_start,
  COUNT(*)::INT AS check_in_count,
  -- k-anonymity: return averages ONLY when 3+ distinct students submitted
  CASE WHEN COUNT(DISTINCT sp.student_id) >= 3
    THEN ROUND(AVG(
      CASE sp.mood
        WHEN 'very_low'  THEN 1
        WHEN 'low'       THEN 2
        WHEN 'neutral'   THEN 3
        WHEN 'good'      THEN 4
        WHEN 'great'     THEN 5
        ELSE 3  -- fallback to neutral for unknown values
      END
    )::NUMERIC, 2)
    ELSE NULL
  END AS avg_mood,
  CASE WHEN COUNT(DISTINCT sp.student_id) >= 3
    THEN ROUND(AVG(sp.pace)::NUMERIC, 2)
    ELSE NULL
  END AS avg_pace,
  CASE WHEN COUNT(DISTINCT sp.student_id) >= 3
    THEN ROUND(AVG(sp.fairness)::NUMERIC, 2)
    ELSE NULL
  END AS avg_fairness
FROM public.student_pulses sp
GROUP BY sp.class_id, date_trunc('week', sp.created_at AT TIME ZONE 'UTC');

COMMENT ON VIEW public.v_class_climate_summary IS
  'Aggregated weekly climate data per class from student_pulses. '
  'Returns NULL for metrics when fewer than 3 distinct students submitted in that week (k-anonymity). '
  'Updated in migration 027 to read from student_pulses instead of deprecated check_ins.';

-- ============================================================
-- STEP 3: Create the single canonical RPC
-- Signature matches page.tsx call: (p_class_id UUID, p_weeks INT DEFAULT 4)
-- Return columns match ClimateSummary interface in ClassDetailClient.tsx
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_class_climate_summary(
  p_class_id UUID,
  p_weeks    INT DEFAULT 4
)
RETURNS TABLE (
  class_id       UUID,
  week_start     DATE,
  check_in_count INT,
  avg_mood       FLOAT8,
  avg_pace       FLOAT8,
  avg_fairness   FLOAT8
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.class_id,
    v.week_start,
    v.check_in_count,
    v.avg_mood::FLOAT8,
    v.avg_pace::FLOAT8,
    v.avg_fairness::FLOAT8
  FROM public.v_class_climate_summary v
  WHERE v.class_id = p_class_id
    AND v.week_start >= (CURRENT_DATE - (p_weeks * 7))
  ORDER BY v.week_start DESC;
$$;

COMMENT ON FUNCTION public.get_class_climate_summary(UUID, INT) IS
  'Canonical aggregate climate data endpoint. Reads from student_pulses via v_class_climate_summary. '
  'Enforces k-anonymity (returns NULLs when fewer than 3 distinct students in a week). '
  'SECURITY DEFINER: bypasses RLS to allow teachers to read aggregated data. '
  'No raw student rows are ever returned. Fixed in migration 027.';

-- ============================================================
-- STEP 4: Grant execute to authenticated role
-- ============================================================

GRANT EXECUTE ON FUNCTION public.get_class_climate_summary(UUID, INT)
  TO authenticated;

-- ============================================================
-- STEP 5: Update view comment on student_pulses to reflect
--         that it is now the canonical check-in store
-- ============================================================

COMMENT ON TABLE public.student_pulses IS
  'Canonical student climate check-ins (mood/pace/fairness). '
  'RLS blocks ALL authenticated SELECT; teachers access data only via '
  'get_class_climate_summary() SECURITY DEFINER RPC. '
  'This replaces the deprecated check_ins table workflow as of migration 005.';
