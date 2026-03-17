-- Migration: 016_fix_classes_rls_v2
-- Fix: Remaining infinite recursion after 015.
--
-- ROOT CAUSE (REMAINING):
--   Postgres evaluates ALL matching SELECT policies for a given table access,
--   regardless of which policy "wins". For a teacher querying `classes`:
--
--     1. "classes_teacher_select_own"        → teacher_id = auth.uid()          ✅ safe
--     2. "classes_admin_select_all"           → auth.jwt() check                 ✅ safe
--     3. "classes_student_select_enrolled"    → EXISTS (SELECT 1 FROM class_enrollments ce ...)
--        └→ "enrollments_teacher_select_class" fires on class_enrollments
--           └→ EXISTS (SELECT 1 FROM classes c WHERE c.teacher_id = auth.uid())
--              └→ back to classes, which triggers ALL policies again → ♾️ LOOP
--
-- FIX:
--   Gate "classes_student_select_enrolled" with a JWT role check so it only
--   evaluates when the caller is actually a student. For teachers/admins the
--   USING clause short-circuits to false immediately — no subquery is executed.
-- ============================================================

-- Drop the problematic policy placed by 003 and kept by 015
DROP POLICY IF EXISTS "classes_student_select_enrolled" ON public.classes;

-- Recreate with an explicit student-only guard.
-- For non-students the JWT check is false → the EXISTS subquery never runs.
CREATE POLICY "classes_student_select_enrolled"
  ON public.classes FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'student'
    AND EXISTS (
      SELECT 1 FROM public.class_enrollments ce
      WHERE ce.class_id = classes.id
        AND ce.student_id = auth.uid()
    )
  );
