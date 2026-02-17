-- Seed: Test data for development
-- Creates 1 Student, 1 Teacher, 1 Admin, 1 Class, 1 Enrollment
-- NOTE: These IDs are for LOCAL DEVELOPMENT ONLY.
-- In production, users are created via Supabase Auth signup.

-- ============================================================
-- 0. Auth Users (Create in auth.users first to satisfy FK)
-- ============================================================
-- Passwords are 'password123'
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'teacher@school.edu', crypt('password123', gen_salt('bf')), current_timestamp, current_timestamp, current_timestamp, '{"provider":"email","providers":["email"]}', '{}', current_timestamp, current_timestamp),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'student@school.edu', crypt('password123', gen_salt('bf')), current_timestamp, current_timestamp, current_timestamp, '{"provider":"email","providers":["email"]}', '{}', current_timestamp, current_timestamp),
  ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'student2@school.edu', crypt('password123', gen_salt('bf')), current_timestamp, current_timestamp, current_timestamp, '{"provider":"email","providers":["email"]}', '{}', current_timestamp, current_timestamp),
  ('00000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'student3@school.edu', crypt('password123', gen_salt('bf')), current_timestamp, current_timestamp, current_timestamp, '{"provider":"email","providers":["email"]}', '{}', current_timestamp, current_timestamp),
  ('00000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'admin@school.edu', crypt('password123', gen_salt('bf')), current_timestamp, current_timestamp, current_timestamp, '{"provider":"email","providers":["email"]}', '{}', current_timestamp, current_timestamp)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '{"sub":"00000000-0000-0000-0000-000000000001","email":"teacher@school.edu"}', 'email', 'teacher@school.edu', current_timestamp, current_timestamp, current_timestamp),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', '{"sub":"00000000-0000-0000-0000-000000000002","email":"student@school.edu"}', 'email', 'student@school.edu', current_timestamp, current_timestamp, current_timestamp),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', '{"sub":"00000000-0000-0000-0000-000000000003","email":"student2@school.edu"}', 'email', 'student2@school.edu', current_timestamp, current_timestamp, current_timestamp),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000004', '{"sub":"00000000-0000-0000-0000-000000000004","email":"student3@school.edu"}', 'email', 'student3@school.edu', current_timestamp, current_timestamp, current_timestamp),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000005', '{"sub":"00000000-0000-0000-0000-000000000005","email":"admin@school.edu"}', 'email', 'admin@school.edu', current_timestamp, current_timestamp, current_timestamp)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 1. Public Users
-- ============================================================

-- These UUIDs are deterministic for testing convenience
INSERT INTO public.users (id, role, full_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'teacher',  'Teacher Demo'),
  ('00000000-0000-0000-0000-000000000002', 'student',  'Student Demo'),
  ('00000000-0000-0000-0000-000000000003', 'student',  'Student Two'),
  ('00000000-0000-0000-0000-000000000004', 'student',  'Student Three'),
  ('00000000-0000-0000-0000-000000000005', 'admin',    'Admin Demo')
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
