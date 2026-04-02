-- Seed: Test data for development
-- Creates 1 teacher, 3 students, 1 class, and enough enrollment data for k-anonymity.
-- NOTE: Provision demo auth accounts through `npm run demo:provision-auth`
-- before loading this file.

DO $$
DECLARE
  missing_users integer;
BEGIN
  SELECT COUNT(*)
  INTO missing_users
  FROM (
    SELECT id
    FROM (
      VALUES
        ('00000000-0000-0000-0000-000000000001'::uuid),
        ('00000000-0000-0000-0000-000000000002'::uuid),
        ('00000000-0000-0000-0000-000000000003'::uuid),
        ('00000000-0000-0000-0000-000000000004'::uuid)
    ) AS required_users(id)
    WHERE NOT EXISTS (
      SELECT 1
      FROM auth.users
      WHERE auth.users.id = required_users.id
    )
  ) AS missing;

  IF missing_users > 0 THEN
    RAISE EXCEPTION
      'Demo auth users are missing. Run "npm run demo:provision-auth" before loading supabase/seed.sql';
  END IF;
END $$;

-- ============================================================
-- 1. Public Users
-- ============================================================

-- These UUIDs are deterministic for testing convenience
INSERT INTO public.users (id, role, full_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'teacher',  'Teacher Demo'),
  ('00000000-0000-0000-0000-000000000002', 'student',  'Student One'),
  ('00000000-0000-0000-0000-000000000003', 'student',  'Student Two'),
  ('00000000-0000-0000-0000-000000000004', 'student',  'Student Three')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Test Class
-- ============================================================
INSERT INTO public.classes (id, teacher_id, name, description, pilot_status) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'CS101 Introduction to Computing', 'A pilot class for testing the climate system.', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Enrollments (3 students for k-anonymity threshold)
-- ============================================================
INSERT INTO public.class_enrollments (class_id, student_id) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Sample Check-ins (3 students = meets k-anonymity threshold)
-- ============================================================
INSERT INTO public.check_ins (class_id, student_id, mood, pace, fairness, content) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 4, 3, 5, 'Class is going well.'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 3, 2, 4, NULL),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 5, 4, 3, 'Pace is a bit fast.');

-- ============================================================
-- Sample Recommendation
-- ============================================================
INSERT INTO public.recommendations (class_id, content, status, action_taken_note, communicated_to_students) VALUES
  ('10000000-0000-0000-0000-000000000001',
   'Consider slowing down the pace for the next two weeks based on student feedback.',
   'approved',
   'Will review the material schedule.',
   true);
