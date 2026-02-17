# คำสั่งสำหรับ Comet (Seed Data Prompt)

Copy ข้อความด้านล่างนี้ไปให้ Comet เพื่อสร้าง User ทดสอบและข้อมูลตัวอย่าง (จะได้ Login ได้ทันที)

---

**PROMPT START**

Please run the following SQL script to populate the database with Test Data.
This script performs 2 main tasks:
1. Creates authenticated users in `auth.users` (so they can log in).
2. Creates related data in business tables (`classes`, `enrollments`, `check_ins`).

**Note**: All users will have the password: `password123`

```sql
-- 1. Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create Auth Users (trigger will auto-create public.users profiles)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES
-- Teacher (ID: ...001)
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher@demo.com', crypt('password123', gen_salt('bf')), now(), '{"full_name":"Teacher Demo", "role":"teacher"}', now(), now()),

-- 3 Students (ID: ...002, ...003, ...004) - Enough for k-anonymity
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student1@demo.com', crypt('password123', gen_salt('bf')), now(), '{"full_name":"Student One", "role":"student"}', now(), now()),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student2@demo.com', crypt('password123', gen_salt('bf')), now(), '{"full_name":"Student Two", "role":"student"}', now(), now()),
('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student3@demo.com', crypt('password123', gen_salt('bf')), now(), '{"full_name":"Student Three", "role":"student"}', now(), now()),

-- Admin (ID: ...005)
('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@demo.com', crypt('password123', gen_salt('bf')), now(), '{"full_name":"Admin Demo", "role":"admin"}', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3. Create Class (CS101)
INSERT INTO public.classes (id, teacher_id, name, description, pilot_status) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'CS101 Introduction to Computing', 'A pilot class for testing the climate system.', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Enroll Students
INSERT INTO public.class_enrollments (class_id, student_id) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

-- 5. Add Check-ins (Simulate feedback)
INSERT INTO public.check_ins (class_id, student_id, mood, pace, fairness, content) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 4, 3, 5, 'Class is going well.'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 3, 2, 4, NULL),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 5, 4, 3, 'Pace is a bit fast.');

-- 6. Add Recommendation (Simulate AI output)
INSERT INTO public.recommendations (class_id, content, status, action_taken_note, communicated_to_students) VALUES
  ('10000000-0000-0000-0000-000000000001',
   'Consider slowing down the pace for the next two weeks based on student feedback.',
   'approved',
   'Will review the material schedule.',
   true);
```

**PROMPT END**
