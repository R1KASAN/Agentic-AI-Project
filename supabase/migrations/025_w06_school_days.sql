-- Migration: 021_w06_school_days
-- Purpose: Create school_days table for calendar management (holidays, breaks, weekends)
-- Tables: school_days (T011)
-- Maps to: Loop0 (Sense - is this a school day?)
-- RLS: Teachers see only their school calendar
-- Date: 2026-03-16
-- Dependencies: Requires schools table to exist

-- ============================================================
-- PART 1: SCHOOL_DAYS TABLE (T011)
-- Calendar Management for Briefing Scheduling
-- Maps to: Loop0 (Sense - is this a school day?)
-- Purpose: Guard W06 to skip briefings on non-school days (holidays, weekends, breaks)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.school_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  is_school_day BOOLEAN DEFAULT TRUE,
  reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one entry per school per date
  UNIQUE(school_id, date)
);

-- Performance index for quick calendar lookups
CREATE INDEX IF NOT EXISTS idx_school_days_lookup ON public.school_days(school_id, date);

-- Enable RLS on school_days
ALTER TABLE public.school_days ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers see only their school calendar
DROP POLICY IF EXISTS school_days_school_view ON public.school_days;

CREATE POLICY school_days_school_view ON public.school_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.school_id = school_days.school_id AND c.teacher_id = auth.uid()
    )
  );

-- Comments for documentation
COMMENT ON TABLE public.school_days IS 'Calendar guard: marks holidays, breaks, weekends per school. Used by W06 to skip briefings on non-school days. One row per school per date.';
COMMENT ON COLUMN public.school_days.school_id IS 'Foreign key to schools table. Each school has its own calendar (different regions, holidays).';
COMMENT ON COLUMN public.school_days.date IS 'Calendar date (Y-M-D format). Unique per school.';
COMMENT ON COLUMN public.school_days.is_school_day IS 'TRUE = regular school day (send briefings) | FALSE = holiday/break/weekend (skip briefings).';
COMMENT ON COLUMN public.school_days.reason IS 'Holiday name, teacher professional day, weather closure, etc. for logging and debugging.';
COMMENT ON COLUMN public.school_days.created_at IS 'When calendar entry was created (admin adds holidays at start of school year).';
COMMENT ON COLUMN public.school_days.updated_at IS 'Last modification time.';

-- Seed data example (commented out - add via separate seed script)
-- INSERT INTO school_days (school_id, date, is_school_day, reason) VALUES
--   ('school-uuid-1', '2026-03-21', FALSE, 'Songkran Festival'),
--   ('school-uuid-1', '2026-03-22', FALSE, 'Songkran Festival'),
--   ('school-uuid-1', '2026-03-23', FALSE, 'Songkran Festival'),
--   ('school-uuid-1', '2026-04-13', FALSE, 'Summer Break Begins');
