-- Migration: 029_allow_teachers_to_read_students_in_owned_classes
-- Purpose:
--   Allow teachers to read student user rows only when the student is enrolled
--   in a class owned by that teacher. This supports teacher roster pages such as
--   /teacher/class/[id]/members without bypassing RLS.
--
-- Notes:
--   - This is row-level access only. Field minimization must still happen in the
--     application queries by selecting only the columns needed.
--   - The policy path is users -> class_enrollments -> classes, which avoids
--     self-recursion on public.users.

DROP POLICY IF EXISTS "teachers_can_see_student_names_for_their_classes" ON public.users;

CREATE POLICY "teachers_can_see_student_names_for_their_classes"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.class_enrollments ce
      JOIN public.classes c ON c.id = ce.class_id
      WHERE ce.student_id = public.users.id
        AND c.teacher_id = auth.uid()
    )
  );
