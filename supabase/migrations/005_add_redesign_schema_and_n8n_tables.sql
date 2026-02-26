-- Migration: 005_add_redesign_schema_and_n8n_tables
-- Adds new tables for Student Pulses, Notifications, Schools
-- Extends Classes and Recommendations tables
-- Adds RPC functions for k-anonymity compliance

-- ============================================================
-- 1. Custom Types
-- ============================================================
DO $$ BEGIN
    CREATE TYPE public.recommendation_priority AS ENUM ('high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.recommendation_category AS ENUM ('engagement', 'wellbeing', 'collaboration', 'academic');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.notification_type AS ENUM ('loop_closure', 'reminder');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add new status to the existing recommendation_status type (if it wasn't there)
ALTER TYPE public.recommendation_status ADD VALUE IF NOT EXISTS 'edited';

-- ============================================================
-- 2. Schools Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.schools (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  health_score    INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
  last_calculated TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Modify Classes Table
-- ============================================================
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_risk_score_check;
ALTER TABLE public.classes ALTER COLUMN risk_score SET DEFAULT 0;
ALTER TABLE public.classes ALTER COLUMN risk_score TYPE INTEGER USING (risk_score * 100)::INTEGER;
ALTER TABLE public.classes ADD CONSTRAINT classes_risk_score_check CHECK (risk_score >= 0 AND risk_score <= 100);

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS checkin_rate_current_week DECIMAL(5,2) DEFAULT 0.0;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS loop_closure_rate DECIMAL(5,2) DEFAULT 0.0;

-- ============================================================
-- 4. Student Pulses Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_pulses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  mood          TEXT NOT NULL,
  pace          SMALLINT NOT NULL CHECK (pace BETWEEN 1 AND 5),
  fairness      SMALLINT NOT NULL CHECK (fairness BETWEEN 1 AND 5),
  optional_text TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_pulses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_student_pulses_class ON public.student_pulses(class_id);
CREATE INDEX IF NOT EXISTS idx_student_pulses_created ON public.student_pulses(created_at);

COMMENT ON TABLE public.student_pulses IS 'Student climate check-ins. Replaces older check_ins table logic.';
COMMENT ON COLUMN public.student_pulses.optional_text IS 'Free text feedback. Subject to 60-day retention policy.';

-- ============================================================
-- 5. Extend Recommendations Table
-- ============================================================
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS priority public.recommendation_priority DEFAULT 'medium';
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS category public.recommendation_category DEFAULT 'engagement';
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT true;
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS ai_model VARCHAR DEFAULT 'gpt-4o';
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS raw_climate_snapshot JSONB;

-- ============================================================
-- 6. Notifications Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type          public.notification_type NOT NULL,
  message       TEXT NOT NULL,
  class_id      UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  read          BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE read = false;

-- ============================================================
-- 7. Database Functions (RPCs)
-- ============================================================

-- Function to get class summary, strictly enforcing k-anonymity (n>=3)
DROP FUNCTION IF EXISTS public.get_class_climate_summary(UUID, INT);
CREATE OR REPLACE FUNCTION public.get_class_climate_summary(p_class_id UUID, p_weeks INT DEFAULT 4)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_response_count INT;
    v_avg_pace NUMERIC;
    v_avg_fairness NUMERIC;
    v_main_mood TEXT;
BEGIN
    SELECT COUNT(*) INTO v_response_count
    FROM public.student_pulses
    WHERE class_id = p_class_id AND created_at >= now() - (p_weeks || ' weeks')::interval;

    IF v_response_count < 3 THEN
        RETURN jsonb_build_object('privacy_locked', true, 'response_count', v_response_count);
    END IF;

    SELECT ROUND(AVG(pace), 2), ROUND(AVG(fairness), 2)
    INTO v_avg_pace, v_avg_fairness
    FROM public.student_pulses
    WHERE class_id = p_class_id AND created_at >= now() - (p_weeks || ' weeks')::interval;

    -- Get the most frequent mood
    SELECT mood INTO v_main_mood
    FROM public.student_pulses
    WHERE class_id = p_class_id AND created_at >= now() - (p_weeks || ' weeks')::interval
    GROUP BY mood
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    RETURN jsonb_build_object(
      'privacy_locked', false,
      'response_count', v_response_count,
      'avg_pace', v_avg_pace,
      'avg_fairness', v_avg_fairness,
      'main_mood', v_main_mood
    );
END;
$$;

-- Function to simply check k-anonymity status
DROP FUNCTION IF EXISTS public.calculate_k_anonymity_status(UUID);
CREATE OR REPLACE FUNCTION public.calculate_k_anonymity_status(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_response_count INT;
BEGIN
    SELECT COUNT(*) INTO v_response_count
    FROM public.student_pulses
    WHERE class_id = p_class_id AND created_at >= now() - interval '1 week';
    
    RETURN v_response_count >= 3;
END;
$$;

