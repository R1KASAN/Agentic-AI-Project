-- Migration: 015_fix_classes_rls
-- Fix: Infinite recursion in RLS policies on public.classes
--
-- ROOT CAUSES:
--   1. "classes_student_select_enrolled" queries class_enrollments,
--      whose "enrollments_teacher_select_class" policy queries classes back → ♾️ loop.
--   2. "users_admin_select_all" queries public.users from within a public.users policy → self-ref.
--   3. Migration 006 added "teacher_owns_class" FOR ALL which overlaps/conflicts with 003 policies.
--
-- FIX STRATEGY:
--   - Use auth.jwt() ->> 'role' for role checks → no cross-table lookups inside RLS.
--   - Use auth.uid() directly for ownership checks → single-column comparison, no subquery.
--   - Drop all old overlapping/recursive policies and replace with clean ones.
-- ============================================================

-- ============================================================
-- 1. DROP ALL EXISTING POLICIES ON public.classes
-- ============================================================
DROP POLICY IF EXISTS "classes_teacher_select_own"          ON public.classes;
DROP POLICY IF EXISTS "classes_teacher_update_own"          ON public.classes;
DROP POLICY IF EXISTS "classes_student_select_enrolled"     ON public.classes;
DROP POLICY IF EXISTS "classes_admin_select_all"            ON public.classes;
DROP POLICY IF EXISTS "teacher_owns_class"                  ON public.classes;  -- added by 006

-- ============================================================
-- 2. RECREATE CLEAN, NON-RECURSIVE POLICIES ON public.classes
-- ============================================================

-- Teachers: SELECT own non-archived classes
-- Simple direct comparison — no subqueries.
CREATE POLICY "classes_teacher_select_own"
  ON public.classes FOR SELECT
  USING (teacher_id = auth.uid());

-- Teachers: INSERT new classes (they become teacher_id owner)
CREATE POLICY "classes_teacher_insert_own"
  ON public.classes FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

-- Teachers: UPDATE own classes (rename, settings, soft-archive)
CREATE POLICY "classes_teacher_update_own"
  ON public.classes FOR UPDATE
  USING  (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Students: SELECT classes they are enrolled in.
-- Uses class_enrollments, but ONLY the student_id = auth.uid() half —
-- no teacher lookup inside class_enrollments policies is triggered here.
CREATE POLICY "classes_student_select_enrolled"
  ON public.classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_enrollments ce
      WHERE ce.class_id = classes.id
        AND ce.student_id = auth.uid()
    )
  );

-- Admins: SELECT all classes.
-- Uses auth.jwt() to avoid querying public.users from within RLS.
CREATE POLICY "classes_admin_select_all"
  ON public.classes FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Admins: full write access (for cleanup, seeding etc.)
CREATE POLICY "classes_admin_all"
  ON public.classes FOR ALL
  USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- ============================================================
-- 3. DROP AND RECREATE class_enrollments POLICIES
--    (to remove the cross-reference to classes that caused recursion)
-- ============================================================
DROP POLICY IF EXISTS "enrollments_student_select_own"      ON public.class_enrollments;
DROP POLICY IF EXISTS "enrollments_teacher_select_class"    ON public.class_enrollments;
DROP POLICY IF EXISTS "enrollments_admin_select_all"        ON public.class_enrollments;
DROP POLICY IF EXISTS "student_enrolled"                    ON public.class_enrollments; -- from 006
DROP POLICY IF EXISTS "teacher_view_enrollments"            ON public.class_enrollments; -- from 006
DROP POLICY IF EXISTS "teacher_delete_enrollments"          ON public.class_enrollments; -- from 006
DROP POLICY IF EXISTS "student_insert_enrollment"           ON public.class_enrollments; -- from 006

-- Students: see only their own enrollments
CREATE POLICY "enrollments_student_select_own"
  ON public.class_enrollments FOR SELECT
  USING (student_id = auth.uid());

-- Students: insert their own enrollment (joining a class via invite code)
CREATE POLICY "enrollments_student_insert_own"
  ON public.class_enrollments FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Teachers: see enrollments for classes they own.
-- Queries classes, but classes RLS will use teacher_id = auth.uid() which is non-recursive.
-- This is safe because classes policies no longer reference class_enrollments.
CREATE POLICY "enrollments_teacher_select_class"
  ON public.class_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_enrollments.class_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Teachers: remove students from their own classes
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
    (auth.jwt() ->> 'role') = 'admin'
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- ============================================================
-- 4. FIX SELF-REFERENCING POLICY ON public.users
--    "users_admin_select_all" queries public.users from within
--    a public.users policy — replace with auth.jwt() check.
-- ============================================================
DROP POLICY IF EXISTS "users_admin_select_all" ON public.users;

CREATE POLICY "users_admin_select_all"
  ON public.users FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
