-- Migration: 006_class_management
-- Adds invite_code to classes
-- Creates class_enrollments table
-- Adds related RLS policies

-- ============================================================
-- 1. Modify Classes Table
-- ============================================================
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS invite_code VARCHAR(8) UNIQUE 
DEFAULT upper(substring(md5(random()::text), 1, 8));

-- ============================================================
-- 2. Class Enrollments Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.class_enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_id, student_id)
);

ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_enrollments_class ON public.class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.class_enrollments(student_id);

-- ============================================================
-- 3. Row Level Security Policies
-- ============================================================

-- Teacher owns class (already might be covered by 003_rls_policies, but let's ensure it's here per user instructions)
-- Note: User asked to create policy "teacher_owns_class" on classes
DROP POLICY IF EXISTS "teacher_owns_class" ON public.classes;
CREATE POLICY "teacher_owns_class" ON public.classes
  FOR ALL USING (teacher_id = auth.uid());

-- Student can see their own enrollments
DROP POLICY IF EXISTS "student_enrolled" ON public.class_enrollments;
CREATE POLICY "student_enrolled" ON public.class_enrollments
  FOR SELECT USING (student_id = auth.uid());

-- Teacher can see enrollments for their classes
DROP POLICY IF EXISTS "teacher_view_enrollments" ON public.class_enrollments;
CREATE POLICY "teacher_view_enrollments" ON public.class_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_enrollments.class_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Teacher can delete enrollments from their classes (remove student)
DROP POLICY IF EXISTS "teacher_delete_enrollments" ON public.class_enrollments;
CREATE POLICY "teacher_delete_enrollments" ON public.class_enrollments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_enrollments.class_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Student can insert their own enrollment (join class)
DROP POLICY IF EXISTS "student_insert_enrollment" ON public.class_enrollments;
CREATE POLICY "student_insert_enrollment" ON public.class_enrollments
  FOR INSERT WITH CHECK (student_id = auth.uid());

