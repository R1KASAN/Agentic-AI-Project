-- Migration: 003_rls_policies
-- Implements Row Level Security for all tables.
-- CRITICAL: check_ins raw rows are NEVER accessible to teachers/admins.

-- ============================================================
-- 1. Users policies
-- ============================================================
-- Users can read their own profile
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Admins can read all user profiles
CREATE POLICY "users_admin_select_all"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-create user profile on signup (via trigger, not RLS insert policy)
-- This is handled by a trigger below.

-- ============================================================
-- 2. Classes policies
-- ============================================================
-- Teachers can read their own classes
CREATE POLICY "classes_teacher_select_own"
  ON public.classes FOR SELECT
  USING (teacher_id = auth.uid());

-- Teachers can update their own classes
CREATE POLICY "classes_teacher_update_own"
  ON public.classes FOR UPDATE
  USING (teacher_id = auth.uid());

-- Students can read classes they are enrolled in
CREATE POLICY "classes_student_select_enrolled"
  ON public.classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_enrollments
      WHERE class_id = id AND student_id = auth.uid()
    )
  );

-- Admins can read all classes
CREATE POLICY "classes_admin_select_all"
  ON public.classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- 3. Class Enrollments policies
-- ============================================================
-- Students can read their own enrollments
CREATE POLICY "enrollments_student_select_own"
  ON public.class_enrollments FOR SELECT
  USING (student_id = auth.uid());

-- Teachers can read enrollments for their classes
CREATE POLICY "enrollments_teacher_select_class"
  ON public.class_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE id = class_id AND teacher_id = auth.uid()
    )
  );

-- Admins can read all enrollments
CREATE POLICY "enrollments_admin_select_all"
  ON public.class_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- 4. Check-Ins policies (MOST SENSITIVE)
-- Students can INSERT their own check-ins
-- Students can SELECT their own check-ins (Option A: "My History")
-- Teachers and Admins CANNOT SELECT raw rows AT ALL.
-- ============================================================
CREATE POLICY "checkins_student_insert_own"
  ON public.check_ins FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Option A: Students can view their own check-in history
CREATE POLICY "checkins_student_select_own"
  ON public.check_ins FOR SELECT
  USING (student_id = auth.uid());

-- NO select policy for teachers or admins on check_ins.
-- They access data ONLY via v_class_climate_summary (SECURITY DEFINER).

-- ============================================================
-- 5. Recommendations policies
-- ============================================================
-- Teachers can read recommendations for their classes
CREATE POLICY "recommendations_teacher_select"
  ON public.recommendations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE id = class_id AND teacher_id = auth.uid()
    )
  );

-- Teachers can update recommendations for their classes
CREATE POLICY "recommendations_teacher_update"
  ON public.recommendations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE id = class_id AND teacher_id = auth.uid()
    )
  );

-- Students can read approved/communicated recommendations for their enrolled classes
CREATE POLICY "recommendations_student_select_communicated"
  ON public.recommendations FOR SELECT
  USING (
    communicated_to_students = true
    AND status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.class_enrollments
      WHERE class_id = recommendations.class_id AND student_id = auth.uid()
    )
  );

-- Admins can read all recommendations (for metrics, no raw student text here)
CREATE POLICY "recommendations_admin_select_all"
  ON public.recommendations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- 6. Action Logs policies
-- ============================================================
-- Actors can read their own logs
CREATE POLICY "action_logs_actor_select_own"
  ON public.action_logs FOR SELECT
  USING (actor_id = auth.uid());

-- Admins can read all action logs
CREATE POLICY "action_logs_admin_select_all"
  ON public.action_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Authenticated users can insert their own action logs
CREATE POLICY "action_logs_insert_own"
  ON public.action_logs FOR INSERT
  WITH CHECK (actor_id = auth.uid());

-- ============================================================
-- 7. Auto-create user profile on auth signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, role, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::public.user_role,
      'student'
    ),
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
