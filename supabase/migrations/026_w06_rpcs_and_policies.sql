-- Migration: 022_w06_rpcs_and_policies
-- Purpose: Create RPC functions for safe aggregate data + additional RLS policies
-- Functions: get_class_climate_summary() with k-anonymity enforcement
-- Tables enhanced: student_pulses RLS, recommendations policies
-- Maps to: Loop0 (Sense - aggregate input data)
-- Security Model: SECURITY DEFINER with k-anonymity enforcement
-- Date: 2026-03-16
-- Dependencies: Requires student_pulses, classes, recommendations tables

-- ============================================================
-- PART 1: VERIFY STUDENT_PULSES RLS (T013)
-- Protect raw mood data from direct access (k-anonymity enforcement)
-- ============================================================

-- Ensure student_pulses has RLS enabled
ALTER TABLE public.student_pulses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Block direct SELECT access - must use RPC for k-anonymity enforcement
-- This ensures raw mood data is never sent to client; only aggregates via safe RPC
DROP POLICY IF EXISTS student_pulses_access_via_rpc ON public.student_pulses;

CREATE POLICY student_pulses_access_via_rpc ON public.student_pulses
  FOR SELECT USING (FALSE);  -- Block ALL direct access, must use RPC

COMMENT ON POLICY student_pulses_access_via_rpc ON public.student_pulses IS 
  'Enforces k-anonymity: raw mood data never sent to clients. Only aggregates via get_class_climate_summary() RPC with k≥3 guard.';

-- ============================================================
-- PART 2: RPC - get_class_climate_summary() (T014)
-- Safe Aggregate Data Endpoint with K-Anonymity Enforcement
-- Maps to: Loop0 (Sense - aggregate input data)
-- Security: SECURITY DEFINER (runs as postgres), results filtered by RLS
-- K-Anonymity: Returns NULLs if fewer than 3 students in period
-- ============================================================

DROP FUNCTION IF EXISTS public.get_class_climate_summary(UUID, VARCHAR);
CREATE FUNCTION public.get_class_climate_summary(
  p_class_id UUID,
  p_period VARCHAR DEFAULT '24 hours'
)
RETURNS TABLE (
  mean_mood FLOAT8,
  std_dev FLOAT8,
  n_students INT,
  mood_trend TEXT,
  baseline FLOAT8,
  k_anonymity_safe BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mood_count INT;
  v_mean FLOAT8;
  v_stddev FLOAT8;
  v_baseline FLOAT8;
  v_trend TEXT;
  v_time_interval INTERVAL;
BEGIN
  -- Parse time period into interval
  v_time_interval := CASE p_period
    WHEN '24 hours' THEN INTERVAL '24 hours'
    WHEN '1 week' THEN INTERVAL '1 week'
    WHEN '7 days' THEN INTERVAL '7 days'
    ELSE INTERVAL '24 hours'
  END;

  -- Count distinct students who submitted mood in period
  SELECT COUNT(DISTINCT student_id)
  INTO v_mood_count
  FROM public.student_pulses
  WHERE class_id = p_class_id
    AND created_at > NOW() - v_time_interval;

  -- K-ANONYMITY ENFORCEMENT: k ≥ 3
  -- If fewer than 3 students, return all NULLs with k_anonymity_safe=FALSE
  -- This prevents disclosure of individual mood data
  IF v_mood_count < 3 THEN
    RETURN QUERY SELECT
      NULL::FLOAT8,          -- mean_mood
      NULL::FLOAT8,          -- std_dev
      v_mood_count,          -- n_students (return actual count for debugging)
      NULL::TEXT,            -- mood_trend
      NULL::FLOAT8,          -- baseline
      FALSE;                 -- k_anonymity_safe = FALSE
    RETURN;
  END IF;

  -- Extract numeric mood values and calculate statistics
  -- Note: mood column is TEXT ('happy', 'neutral', 'sad', etc.)
  -- Numeric mapping: happy=4, neutral=3, sad=2, very_sad=1
  WITH mood_scores AS (
    SELECT CASE mood
      WHEN 'happy' THEN 4
      WHEN 'neutral' THEN 3
      WHEN 'sad' THEN 2
      WHEN 'very_sad' THEN 1
      ELSE 3  -- default to neutral for unknowns
    END AS score
    FROM public.student_pulses
    WHERE class_id = p_class_id
      AND created_at > NOW() - v_time_interval
  )
  SELECT
    AVG(score)::FLOAT8,
    STDDEV(score)::FLOAT8,
    3.0::FLOAT8  -- baseline (neutral mood level for comparison)
  INTO v_mean, v_stddev, v_baseline
  FROM mood_scores;

  -- Determine trend vs. baseline (simple heuristic)
  -- TODO: Compare with teacher_profiles.closure_rate_trend_7d for adaptive thresholds
  v_trend := CASE
    WHEN v_mean >= 3.5 THEN '↑ improving'
    WHEN v_mean <= 2.5 THEN '↓ declining'
    ELSE '→ stable'
  END;

  -- Return aggregates with k_anonymity_safe=TRUE (all >= 3 students)
  RETURN QUERY SELECT
    v_mean,
    v_stddev,
    v_mood_count,
    v_trend,
    v_baseline,
    TRUE::BOOLEAN;  -- k_anonymity_safe = TRUE
END;
$$;

COMMENT ON FUNCTION public.get_class_climate_summary(UUID, VARCHAR) IS 
  'Safe aggregate mood data endpoint. Enforces k≥3 (returns NULLs if below threshold). SECURITY DEFINER: runs as postgres role with access to raw student_pulses. No direct student data returned - only aggregates.';

-- ============================================================
-- PART 3: VERIFY RECOMMENDATIONS RLS (T005)
-- Teacher can see + manage only their own recommendations
-- ============================================================

-- Ensure recommendations table has RLS enabled
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers see only their own class recommendations
DROP POLICY IF EXISTS recommendations_teacher_view ON public.recommendations;

CREATE POLICY recommendations_teacher_view ON public.recommendations
  FOR SELECT USING (
    teacher_id = auth.uid()
  );

-- RLS Policy: Teachers can update their own pending recommendations only
DROP POLICY IF EXISTS recommendations_teacher_approve ON public.recommendations;

CREATE POLICY recommendations_teacher_approve ON public.recommendations
  FOR UPDATE USING (
    teacher_id = auth.uid() AND
    (teacher_approval_status = 'pending' OR teacher_approval_status IS NULL)
  ) WITH CHECK (
    teacher_id = auth.uid() AND
    (teacher_approval_status IN ('approved', 'dismissed') OR teacher_approval_status IS NULL)
  );

COMMENT ON TABLE public.recommendations IS 
  'W06 Morning Briefing recommendations + teacher response tracking. Tracks LLM output + teacher approval/implementation for Loop4/Loop5 closure. One row per recommendation sent.';

-- ============================================================
-- PART 4: PERFORMANCE INDEXES (Composite queries)
-- ============================================================

-- Index for dashboard: briefing summary by class
CREATE INDEX IF NOT EXISTS idx_recommendations_class_created ON public.recommendations(class_id, created_at DESC);

-- Index for student mood queries: improve RPC performance
CREATE INDEX IF NOT EXISTS idx_student_pulses_class_created ON public.student_pulses(class_id, created_at DESC);

-- ============================================================
-- PART 5: SCHEMA COMMENT
-- ============================================================

COMMENT ON SCHEMA public IS 'Climate Agent: W06 Morning AI Briefing + Agentic Loop Infrastructure. Tables: recommendations (T005-T007), n8n_audit_log (T008-T010), school_days (T011), teacher_profiles (T012), student_pulses (T013, extended RLS), RPC: get_class_climate_summary (T014, k-anonymity enforced).';
