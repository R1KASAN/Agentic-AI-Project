-- Migration: 017_fix_classes_rls_v3
-- Fix: Complete elimination of all recursive policy chains on public.classes.
--
-- ANALYSIS:
--   The recursion chain is:
--     Teacher SELECTs classes
--       → Postgres evaluates ALL SELECT policies, including "classes_student_select_enrolled"
--       → That policy hits class_enrollments
--       → class_enrollments "enrollments_teacher_select_class" hits classes  ← LOOP
--
--   Migrations 015 and 016 confirmed that:
--   (a) policy order does not short-circuit Postgres query planning
--   (b) auth.jwt() gating is evaluated at the wrong phase for breaking the loop
--
-- FINAL SOLUTION: Nuclear removal of the cross-table chain.
--
--   Students do NOT directly query the classes table in this app.
--   They access class data exclusively via SECURITY DEFINER RPCs (get_class_climate_summary).
--   So "classes_student_select_enrolled" can be removed with zero functional impact.
--
--   Additionally, class_enrollments policies that reference classes are safe because
--   they are uni-directional: class_enrollments → classes (with teacher_id = auth.uid() only).
--   The cycle was ONLY caused by classes → class_enrollments → classes.
-- ============================================================

-- Drop all policies we're replacing
DROP POLICY IF EXISTS "classes_teacher_select_own"          ON public.classes;
DROP POLICY IF EXISTS "classes_teacher_insert_own"          ON public.classes;
DROP POLICY IF EXISTS "classes_teacher_update_own"          ON public.classes;
DROP POLICY IF EXISTS "classes_student_select_enrolled"     ON public.classes;
DROP POLICY IF EXISTS "classes_admin_select_all"            ON public.classes;
DROP POLICY IF EXISTS "classes_admin_all"                   ON public.classes;

-- ============================================================
-- Minimal, non-recursive policies for public.classes
-- NO policy on classes ever touches class_enrollments.
-- ============================================================

-- Teachers read their own classes (archived or not — filter in query)
CREATE POLICY "classes_teacher_select_own"
  ON public.classes FOR SELECT
  USING (teacher_id = auth.uid());

-- Teachers insert new classes
CREATE POLICY "classes_teacher_insert_own"
  ON public.classes FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

-- Teachers update their own classes
CREATE POLICY "classes_teacher_update_own"
  ON public.classes FOR UPDATE
  USING  (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Admins full access — role check from JWT only, no table queries
CREATE POLICY "classes_admin_all"
  ON public.classes FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- NOTE: No student SELECT policy on classes.
-- Students access class data via get_class_climate_summary() SECURITY DEFINER RPC.
-- Direct SELECT by students is not needed and was the root of the recursion.

-- ============================================================
-- Also ensure class_enrollments policies are safe
-- (uni-directional: class_enrollments → classes is OK;
--  classes → class_enrollments is NOT OK — and now removed above)
-- ============================================================

-- Re-verify enrollments policies are in place (from 015, but re-apply for safety)
DROP POLICY IF EXISTS "enrollments_student_select_own"   ON public.class_enrollments;
DROP POLICY IF EXISTS "enrollments_student_insert_own"   ON public.class_enrollments;
DROP POLICY IF EXISTS "enrollments_teacher_select_class" ON public.class_enrollments;
DROP POLICY IF EXISTS "enrollments_teacher_delete_class" ON public.class_enrollments;
DROP POLICY IF EXISTS "enrollments_admin_select_all"     ON public.class_enrollments;

CREATE POLICY "enrollments_student_select_own"
  ON public.class_enrollments FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "enrollments_student_insert_own"
  ON public.class_enrollments FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- This goes class_enrollments → classes (one direction only, safe)
CREATE POLICY "enrollments_teacher_select_class"
  ON public.class_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_enrollments.class_id
        AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "enrollments_teacher_delete_class"
  ON public.class_enrollments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_enrollments.class_id
        AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "enrollments_admin_select_all"
  ON public.class_enrollments FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
