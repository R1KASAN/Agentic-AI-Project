-- ============================================================================
-- FILE 4: Climate Agent — Tables, Indexes, RPCs, and RLS
-- Run this FIRST before any other migration.
-- ============================================================================

-- =========================
-- TABLE: classes
-- =========================
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  teacher_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- TABLE: climate_surveys
-- =========================
CREATE TABLE IF NOT EXISTS public.climate_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  mood_score INT NOT NULL CHECK (mood_score >= 1 AND mood_score <= 5),
  survey_date DATE NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_climate_surveys_date_classroom
  ON public.climate_surveys(survey_date, class_id);

-- =========================
-- TABLE: recommendations
-- =========================
CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  policy_level TEXT NOT NULL CHECK (policy_level IN ('ROUTINE', 'WARNING', 'CRITICAL')),
  ai_message_draft TEXT,
  actions_json JSONB,
  confidence_score NUMERIC(3,2),
  reasoning TEXT,
  inquiry_mode BOOLEAN NOT NULL DEFAULT FALSE,
  fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL'
    CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'DISMISSED', 'SENT')),
  priority TEXT NOT NULL DEFAULT 'NORMAL'
    CHECK (priority IN ('NORMAL', 'HIGH', 'URGENT')),
  alert_sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_status_created
  ON public.recommendations(status, created_at);

CREATE INDEX IF NOT EXISTS idx_recommendations_classroom
  ON public.recommendations(class_id, created_at);

-- =========================
-- TABLE: n8n_audit_log
-- Already created in migration 023_w06_n8n_audit_log.sql
-- Column reference: uses 'timestamp' (NOT 'trigger_time')
-- =========================
-- Adding only the performance index using the correct column 'timestamp'
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp
  ON public.n8n_audit_log(timestamp DESC);

-- =========================
-- TABLE: error_logs
-- =========================
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT,
  execution_id TEXT,
  error_node TEXT,
  error_message TEXT,
  error_stack TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- RPC: get_aggregated_climate_data
-- K-ANONYMITY ENFORCED: HAVING COUNT(cs.id) >= p_min_n
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_aggregated_climate_data(
  p_date DATE,
  p_min_n INT DEFAULT 3
)
RETURNS TABLE (
  class_id UUID,
  class_name TEXT,
  avg_mood_score NUMERIC,
  total_responses BIGINT,
  sentiment_distribution JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS class_id,
    c.name AS class_name,
    ROUND(AVG(cs.mood_score)::NUMERIC, 2) AS avg_mood_score,
    COUNT(cs.id) AS total_responses,
    jsonb_build_object(
      'positive', COUNT(cs.id) FILTER (WHERE cs.mood_score >= 4),
      'neutral',  COUNT(cs.id) FILTER (WHERE cs.mood_score = 3),
      'negative', COUNT(cs.id) FILTER (WHERE cs.mood_score <= 2)
    ) AS sentiment_distribution
  FROM public.climate_surveys cs
  JOIN public.classes c ON c.id = cs.class_id
  WHERE cs.survey_date = p_date
    AND cs.deleted_at IS NULL
  GROUP BY c.id, c.name
  HAVING COUNT(cs.id) >= p_min_n
  ORDER BY avg_mood_score ASC;
END;
$$;

-- ============================================================================
-- RPC: get_teacher_response_rate
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_teacher_response_rate(
  p_class_id UUID,
  p_days INT DEFAULT 30
)
RETURNS TABLE (
  class_id UUID,
  dismissal_rate NUMERIC,
  avg_response_time_hours NUMERIC,
  last_action_date TIMESTAMPTZ,
  total_recommendations BIGINT,
  total_approved BIGINT,
  total_dismissed BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.class_id,
    CASE
      WHEN COUNT(r.id) > 0
      THEN ROUND(
        (COUNT(r.id) FILTER (WHERE r.status = 'DISMISSED'))::NUMERIC / COUNT(r.id)::NUMERIC,
        2
      )
      ELSE 0.0
    END AS dismissal_rate,
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (COALESCE(r.updated_at, r.created_at) - r.created_at)) / 3600.0
      )::NUMERIC,
      1
    ) AS avg_response_time_hours,
    MAX(r.updated_at) FILTER (WHERE r.status IN ('APPROVED', 'DISMISSED', 'SENT')) AS last_action_date,
    COUNT(r.id) AS total_recommendations,
    COUNT(r.id) FILTER (WHERE r.status IN ('APPROVED', 'SENT')) AS total_approved,
    COUNT(r.id) FILTER (WHERE r.status = 'DISMISSED') AS total_dismissed
  FROM public.recommendations r
  WHERE r.class_id = p_class_id
    AND r.created_at >= (NOW() - (p_days || ' days')::INTERVAL)
  GROUP BY r.class_id;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- climate_surveys
ALTER TABLE public.climate_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_climate_surveys" ON public.climate_surveys
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- recommendations
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_recommendations" ON public.recommendations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- n8n_audit_log
ALTER TABLE public.n8n_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_audit_log" ON public.n8n_audit_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- error_logs
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_error_logs" ON public.error_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
