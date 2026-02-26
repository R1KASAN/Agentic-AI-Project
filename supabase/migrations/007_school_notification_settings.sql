-- Migration: 007_school_notification_settings
-- Replaces fixed N8N schedules with per-school configurable settings

CREATE TABLE IF NOT EXISTS public.schools (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  health_score    INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
  last_calculated TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.school_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE UNIQUE,

  -- AI Recommendation Generator
  ai_run_enabled  BOOLEAN DEFAULT true,
  ai_run_day      VARCHAR(10) DEFAULT 'monday',
  ai_run_time     TIME DEFAULT '06:00',

  -- Teacher Email Summary
  teacher_email_enabled BOOLEAN DEFAULT true,
  teacher_email_day     VARCHAR(10) DEFAULT 'monday',
  teacher_email_time    TIME DEFAULT '07:00',

  -- Student Reminder
  reminder_enabled     BOOLEAN DEFAULT true,
  reminder_day         VARCHAR(10) DEFAULT 'friday',
  reminder_time        TIME DEFAULT '15:00',
  reminder_threshold   INT DEFAULT 50,

  -- Health Score Alert
  health_score_enabled         BOOLEAN DEFAULT true,
  health_score_day             VARCHAR(10) DEFAULT 'sunday',
  health_score_time            TIME DEFAULT '09:00',
  health_score_alert_threshold INT DEFAULT 40,

  -- System Pause (e.g. exam week)
  paused_until TIMESTAMPTZ DEFAULT NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: admin only
ALTER TABLE public.school_notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_settings" ON public.school_notification_settings;
CREATE POLICY "admin_manage_settings" 
  ON public.school_notification_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-insert default row when new school created
CREATE OR REPLACE FUNCTION public.create_default_school_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.school_notification_settings (school_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_school_created ON public.schools;
CREATE TRIGGER on_school_created
  AFTER INSERT ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_school_settings();


-- ============================================================
-- RPC: Get all schedules for N8N Poll Worker
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_all_school_schedules()
RETURNS TABLE (
  school_id UUID,
  school_name VARCHAR,
  ai_run_enabled BOOLEAN,
  ai_run_day VARCHAR,
  ai_run_time TIME,
  teacher_email_enabled BOOLEAN,
  teacher_email_day VARCHAR,
  teacher_email_time TIME,
  reminder_enabled BOOLEAN,
  reminder_day VARCHAR,
  reminder_time TIME,
  reminder_threshold INT,
  health_score_enabled BOOLEAN,
  health_score_day VARCHAR,
  health_score_time TIME,
  health_score_alert_threshold INT,
  paused_until TIMESTAMPTZ
) SECURITY DEFINER AS $$
  SELECT 
    s.id, s.name,
    sns.ai_run_enabled, sns.ai_run_day, sns.ai_run_time,
    sns.teacher_email_enabled, sns.teacher_email_day, sns.teacher_email_time,
    sns.reminder_enabled, sns.reminder_day, sns.reminder_time, 
    sns.reminder_threshold,
    sns.health_score_enabled, sns.health_score_day, sns.health_score_time,
    sns.health_score_alert_threshold,
    sns.paused_until
  FROM public.schools s
  JOIN public.school_notification_settings sns ON sns.school_id = s.id;
$$ LANGUAGE sql;
