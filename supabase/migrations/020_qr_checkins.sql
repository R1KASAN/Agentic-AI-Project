-- Migration: 020_qr_checkins
-- Creates: qr_checkins — anonymous QR code check-in submissions
-- Privacy: NO student_id stored. Anon INSERT allowed. No SELECT for any role (service_role only).
-- k-anonymity: Satisfies k>=3 at schema level — no student identity data stored.

-- ============================================================
-- 1. QR Check-Ins Table (Anonymous)
-- ============================================================
CREATE TABLE public.qr_checkins (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id       UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  mood           SMALLINT NOT NULL CHECK (mood BETWEEN 1 AND 5),
  session_token  TEXT,           -- Browser session ID for dedup (not a user ID)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.qr_checkins ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_qr_checkins_class_time ON public.qr_checkins(class_id, created_at);

COMMENT ON TABLE public.qr_checkins IS
  'Anonymous QR code check-ins. NO student identity stored. '
  'Raw rows visible only to service_role (never to teachers/students via RLS). '
  'Aggregated data feeds into class climate metrics.';

-- ============================================================
-- 2. RLS Policies
-- ============================================================

-- Allow anyone (anon + authenticated) to INSERT
-- This is the public QR landing page submission path.
CREATE POLICY "qr_checkins_anon_insert"
  ON public.qr_checkins FOR INSERT
  WITH CHECK (true);

-- BLOCK all SELECT for authenticated users (USING(false))
-- Teachers access aggregated data via SECURITY DEFINER RPC only.
CREATE POLICY "qr_checkins_no_select"
  ON public.qr_checkins FOR SELECT
  USING (false);
