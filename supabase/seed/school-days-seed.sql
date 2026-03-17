-- Seed: school_days
-- Purpose: Populate calendar for test school with holidays/breaks
-- This supports W06 Morning AI Briefing scheduling guard
-- Populates: April 2026 (test period) + March 2026 holidays

-- NOTE: Run this AFTER 018_w06_morning_briefing_schema.sql migration

-- ============================================================
-- PART 1: Get or create test school
-- ============================================================

-- Assuming schools table exists and has at least one test school
-- If not, insert a test school
INSERT INTO public.schools (id, name, health_score, last_calculated)
SELECT 
  'd3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID,
  'Test School (Songkran)',
  100,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.schools 
  WHERE id = 'd3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID
);

-- ============================================================
-- PART 2: Seed school_days for March-May 2026
-- Includes Songkran holiday (Mar 21-23), weekends, sample breaks
-- ============================================================

-- Helper: Delete existing entries for test school (if re-running)
DELETE FROM public.school_days 
WHERE school_id = 'd3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID 
  AND date >= '2026-03-01' AND date <= '2026-05-31';

-- Populate March 2026 (20 days: 9 weekdays + 11 weekend/holiday)
INSERT INTO public.school_days (school_id, date, is_school_day, reason) VALUES
-- March 2026
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-01', true, 'Regular Sunday (exception - makeup)'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-02', true, 'Monday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-03', true, 'Tuesday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-04', true, 'Wednesday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-05', true, 'Thursday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-06', true, 'Friday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-07', false, 'Weekend Saturday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-08', false, 'Weekend Sunday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-09', true, 'Monday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-10', true, 'Tuesday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-11', true, 'Wednesday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-12', true, 'Thursday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-13', true, 'Friday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-14', false, 'Weekend Saturday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-15', false, 'Weekend Sunday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-16', true, 'Monday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-17', true, 'Tuesday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-18', true, 'Wednesday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-19', true, 'Thursday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-20', true, 'Friday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-21', false, 'Songkran Holiday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-22', false, 'Songkran Holiday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-23', false, 'Songkran Holiday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-24', false, 'Weekend Tuesday (Songkran catchup)'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-25', false, 'Weekend Wednesday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-26', true, 'Thursday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-27', true, 'Friday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-28', false, 'Weekend Saturday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-29', false, 'Weekend Sunday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-30', true, 'Monday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-03-31', true, 'Tuesday'),

-- April 2026 (30 days: 22 weekdays + 8 weekend)
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-01', true, 'Wednesday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-02', true, 'Thursday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-03', true, 'Friday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-04', false, 'Weekend Saturday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-05', false, 'Weekend Sunday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-06', true, 'Monday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-07', true, 'Tuesday - Chakri Memorial Day (observed)'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-08', true, 'Wednesday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-09', true, 'Thursday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-10', true, 'Friday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-11', false, 'Weekend Saturday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-12', false, 'Weekend Sunday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-13', true, 'Monday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-14', true, 'Tuesday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-15', true, 'Wednesday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-16', true, 'Thursday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-17', true, 'Friday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-18', false, 'Weekend Saturday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-19', false, 'Weekend Sunday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-20', true, 'Monday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-21', true, 'Tuesday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-22', true, 'Wednesday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-23', true, 'Thursday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-24', true, 'Friday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-25', false, 'Weekend Saturday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-26', false, 'Weekend Sunday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-27', true, 'Monday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-28', true, 'Tuesday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-29', true, 'Wednesday'),
('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID, '2026-04-30', true, 'Thursday');

-- ============================================================
-- PART 3: Verify seed data
-- ============================================================

SELECT 
  COUNT(*) as total_days,
  SUM(CASE WHEN is_school_day THEN 1 ELSE 0 END) as school_days,
  SUM(CASE WHEN NOT is_school_day THEN 1 ELSE 0 END) as non_school_days
FROM public.school_days
WHERE school_id = 'd3b07384-d9a1-4e64-84ea-2b3812f521d0'::UUID;

-- ============================================================
-- END SEED
-- ============================================================
