-- Migration: 020_w06_teacher_profiles
-- Purpose: Extend teacher_profiles table with W06 notification preferences + response metrics
-- Tables: teacher_profiles (extended, T012)
-- Maps to: Loop3 (Act - send notification), Loop4/Loop5 (Learn/Adapt - track metrics)
-- Date: 2026-03-16
-- Dependencies: Requires users table to exist

-- ============================================================
-- PART 1: TEACHER_PROFILES TABLE EXTENSION (T012)
-- Notification Preferences + W06 Response Metrics
-- Maps to: Loop3 (Act), Loop4 (Learn), Loop5 (Adapt)
-- ============================================================

-- Create table if it doesn't exist (base structure)
-- If table already exists, this will be skipped and we'll add columns below
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add notification preference columns
ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS notification_frequency_pref TEXT DEFAULT 'ROUTINE'
    CHECK (notification_frequency_pref IN ('ROUTINE', 'CRITICAL_ONLY', 'NONE'));

ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS notification_channel_pref TEXT DEFAULT 'LINE'
    CHECK (notification_channel_pref IN ('LINE', 'EMAIL', 'DASHBOARD', 'SLACK'));

-- Add W06 briefing tracking columns
ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS last_briefing_sent_at TIMESTAMP;

ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS briefing_count_7d INT DEFAULT 0;

ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS briefing_approval_count_7d INT DEFAULT 0;

-- Add historical metrics columns (used for Loop5 adaptation)
ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS approval_rate_historical FLOAT8
    CHECK (approval_rate_historical IS NULL OR (approval_rate_historical >= 0 AND approval_rate_historical <= 1));

ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS implementation_rate_historical FLOAT8
    CHECK (implementation_rate_historical IS NULL OR (implementation_rate_historical >= 0 AND implementation_rate_historical <= 1));

ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS action_latency_avg_hours FLOAT8
    CHECK (action_latency_avg_hours IS NULL OR action_latency_avg_hours >= 0);

ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS closure_rate_trend_7d FLOAT8
    CHECK (closure_rate_trend_7d IS NULL OR (closure_rate_trend_7d >= 0 AND closure_rate_trend_7d <= 1));

-- Add inquiry mode columns (triggered when dismissal pattern detected)
ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS is_inquiry_mode BOOLEAN DEFAULT FALSE;

ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS inquiry_mode_triggered_at TIMESTAMP;

ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS dismissal_pattern_consecutive INT DEFAULT 0
    CHECK (dismissal_pattern_consecutive >= 0);

ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS dismissal_pattern_reason TEXT;

-- Performance index on user_id for lookups
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user ON public.teacher_profiles(user_id);

-- Enable RLS on teacher_profiles if not already enabled
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers see only their own profile
DROP POLICY IF EXISTS teacher_profiles_self_view ON public.teacher_profiles;

CREATE POLICY teacher_profiles_self_view ON public.teacher_profiles
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- RLS Policy: Teachers can update only their own profile
DROP POLICY IF EXISTS teacher_profiles_self_update ON public.teacher_profiles;

CREATE POLICY teacher_profiles_self_update ON public.teacher_profiles
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- Comments for documentation
COMMENT ON TABLE public.teacher_profiles IS 'W06 Morning Briefing preferences + response metrics. Enables personalized inquiry mode and Loop5 feedback adaptation. One row per teacher.';
COMMENT ON COLUMN public.teacher_profiles.user_id IS 'Foreign key to users table. One-to-one relationship with teacher account.';
COMMENT ON COLUMN public.teacher_profiles.notification_frequency_pref IS 'Teacher preference: ROUTINE = every briefing, CRITICAL_ONLY = warnings/critical alerts only, NONE = opt out.';
COMMENT ON COLUMN public.teacher_profiles.notification_channel_pref IS 'Preferred delivery channel: LINE (default), EMAIL, DASHBOARD widget, or SLACK integration.';
COMMENT ON COLUMN public.teacher_profiles.last_briefing_sent_at IS 'Timestamp of most recent briefing sent to this teacher. Used to enforce frequency limits.';
COMMENT ON COLUMN public.teacher_profiles.briefing_count_7d IS 'Rolling count: number of briefings sent in last 7 days. Updated by W06 workflow.';
COMMENT ON COLUMN public.teacher_profiles.briefing_approval_count_7d IS 'Count of briefings teacher approved (acknowledged + implemented feedback) in last 7 days.';
COMMENT ON COLUMN public.teacher_profiles.approval_rate_historical IS 'Average approval rate over history (0.0-1.0). Used by L3 to personalize tone/urgency.';
COMMENT ON COLUMN public.teacher_profiles.implementation_rate_historical IS 'Fraction of approved briefings teacher actually implemented in class. High rate = high confidence in recommendations.';
COMMENT ON COLUMN public.teacher_profiles.action_latency_avg_hours IS 'Average hours from notification sent to teacher approval. High latency = teacher slow to respond.';
COMMENT ON COLUMN public.teacher_profiles.closure_rate_trend_7d IS 'Recent trend (0.0-1.0): >0.6 = improving closure (teachers implementing more), <0.3 = declining. Used for frequency adjustment.';
COMMENT ON COLUMN public.teacher_profiles.is_inquiry_mode IS 'TRUE = W06 switches to asking "What format would help?" instead of recommendations. Triggered by dismissal pattern.';
COMMENT ON COLUMN public.teacher_profiles.inquiry_mode_triggered_at IS 'When inquiry mode was activated. Reset when teacher provides feedback.';
COMMENT ON COLUMN public.teacher_profiles.dismissal_pattern_consecutive IS 'Counter: incremented each time teacher dismisses. Resets when teacher implements. If >=3, triggers inquiry_mode.';
COMMENT ON COLUMN public.teacher_profiles.dismissal_pattern_reason IS 'Teacher notes on why dismissing (free text). Captured when teacher dismisses, used for L3 tuning.';
