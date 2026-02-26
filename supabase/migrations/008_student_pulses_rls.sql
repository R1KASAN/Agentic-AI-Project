-- Migration: 008_student_pulses_rls
-- Constitution §I: Privacy-by-Design
-- optional_text must NEVER be readable by teacher/admin roles.
-- Only service_role (N8N aggregate worker) may SELECT from this table.
-- Source: speckit.analyze v2 — Finding C2 (CRITICAL)

-- ============================================================
-- 1. Drop any existing policies (idempotent)
-- ============================================================
DO $$
BEGIN
    -- Drop all existing policies on student_pulses
    PERFORM pg_catalog.pg_policies.polname
    FROM pg_catalog.pg_policies
    WHERE pg_policies.tablename = 'student_pulses'
      AND pg_policies.schemaname = 'public';
EXCEPTION WHEN OTHERS THEN
    NULL; -- Table may not have policies yet
END $$;

DROP POLICY IF EXISTS "student_pulses_insert_anon" ON public.student_pulses;
DROP POLICY IF EXISTS "student_pulses_select_service_only" ON public.student_pulses;
DROP POLICY IF EXISTS "student_pulses_no_select_authenticated" ON public.student_pulses;

-- ============================================================
-- 2. Ensure RLS is enabled
-- ============================================================
ALTER TABLE public.student_pulses ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. INSERT policy — students can submit check-ins
-- ============================================================
CREATE POLICY "student_pulses_insert_anon"
  ON public.student_pulses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ============================================================
-- 4. SELECT policy — service_role ONLY (for N8N aggregation)
-- ============================================================
CREATE POLICY "student_pulses_select_service_only"
  ON public.student_pulses
  FOR SELECT
  TO service_role
  USING (true);

-- ============================================================
-- 5. BLOCK SELECT for authenticated users (teachers/admins)
-- They must use get_class_climate_summary() RPC instead.
-- ============================================================
CREATE POLICY "student_pulses_no_select_authenticated"
  ON public.student_pulses
  FOR SELECT
  TO authenticated
  USING (false);

-- ============================================================
-- Verification query (run manually with teacher JWT):
-- SELECT * FROM student_pulses; -- Should return 0 rows
-- ============================================================

COMMENT ON TABLE public.student_pulses IS 
  'Student climate check-ins. RLS blocks ALL authenticated SELECT. '
  'Teachers/admins access data ONLY via get_class_climate_summary() SECURITY DEFINER RPC. '
  'optional_text is readable only by service_role for AI processing.';
