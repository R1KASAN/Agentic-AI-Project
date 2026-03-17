-- Migration: 018_fix_classes_rls_final
-- Fix: Eliminate ALL recursive subqueries in RLS policies for classes.
--
-- The issue was that policies like `classes_admin_select_all` from 003
-- or `teacher_view_enrollments` from 006 introduced `EXISTS (SELECT 1 FROM classes...)`
-- or `EXISTS (SELECT 1 FROM users...)` loops.
-- To fix this, we'll cleanly drop ALL classes-related policies and recreate them
-- using ONLY direct `auth.uid()` checks and JWT payload checks (`auth.jwt() ->> 'role'`).

-- ============================================================
-- 1. DROP ALL EXISTING POLICIES ON public.classes
-- ============================================================
DROP POLICY IF EXISTS "classes_teacher_select_own" ON public.classes;
DROP POLICY IF EXISTS "classes_teacher_insert_own" ON public.classes;
DROP POLICY IF EXISTS "classes_teacher_update_own" ON public.classes;
DROP POLICY IF EXISTS "classes_student_select_enrolled" ON public.classes;
DROP POLICY IF EXISTS "classes_admin_select_all" ON public.classes;
DROP POLICY IF EXISTS "classes_admin_all" ON public.classes;
DROP POLICY IF EXISTS "teacher_owns_class" ON public.classes;

-- ============================================================
-- 2. RECREATE CLEAN POLICIES ON public.classes
-- ============================================================

-- Teachers can select their own classes (no subqueries)
CREATE POLICY "classes_teacher_select_own"
  ON public.classes FOR SELECT
  USING (teacher_id = auth.uid());

-- Teachers can insert their own classes
CREATE POLICY "classes_teacher_insert_own"
  ON public.classes FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

-- Teachers can update their own classes
CREATE POLICY "classes_teacher_update_own"
  ON public.classes FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Admins get full access using JWT role check (no lookup in users table)
CREATE POLICY "classes_admin_all"
  ON public.classes FOR ALL
  USING (
    (auth.jwt() ->> 'role') = 'admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- ============================================================
-- 3. DROP AND RECREATE class_enrollments POLICIES
-- ============================================================
DROP POLICY IF EXISTS "enrollments_student_select_own" ON public.class_enrollments;
DROP POLICY IF EXISTS "enrollments_student_insert_own" ON public.class_enrollments;
DROP POLICY IF EXISTS "enrollments_teacher_select_class" ON public.class_enrollments;
DROP POLICY IF EXISTS "enrollments_teacher_delete_class" ON public.class_enrollments;
DROP POLICY IF EXISTS "enrollments_admin_select_all" ON public.class_enrollments;
DROP POLICY IF EXISTS "student_enrolled" ON public.class_enrollments;
DROP POLICY IF EXISTS "teacher_view_enrollments" ON public.class_enrollments;
DROP POLICY IF EXISTS "teacher_delete_enrollments" ON public.class_enrollments;
DROP POLICY IF EXISTS "student_insert_enrollment" ON public.class_enrollments;

-- Students: see only their own enrollments
CREATE POLICY "enrollments_student_select_own"
  ON public.class_enrollments FOR SELECT
  USING (student_id = auth.uid());

-- Students: insert their own enrollment
CREATE POLICY "enrollments_student_insert_own"
  ON public.class_enrollments FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Teachers: see enrollments for classes they own
-- THIS query against classes is safe because classes now ONLY uses teacher_id = auth.uid()
CREATE POLICY "enrollments_teacher_select_class"
  ON public.class_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_enrollments.class_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Teachers: delete enrollments from their classes
CREATE POLICY "enrollments_teacher_delete_class"
  ON public.class_enrollments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_enrollments.class_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Admins: see all enrollments
CREATE POLICY "enrollments_admin_select_all"
  ON public.class_enrollments FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- ============================================================
-- 4. FIX SELF-REFERENCING POLICY ON public.users
-- ============================================================
DROP POLICY IF EXISTS "users_admin_select_all" ON public.users;

CREATE POLICY "users_admin_select_all"
  ON public.users FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );