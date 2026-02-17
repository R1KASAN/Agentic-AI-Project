# คำสั่งสำหรับ Comet (Supabase Setup Prompt)

Copy ข้อความด้านล่างนี้ไปให้ Comet (หรือ AI Assistant ของคุณ) เพื่อทำการสร้าง Database และตั้งค่าต่างๆ ให้ครบถ้วน

---

**PROMPT START**

Please act as a Senior Database Engineer. I need you to set up a Supabase PostgreSQL database for the "Classroom Climate" project. 

This project requires strict privacy controls using Row Level Security (RLS) and specific data aggregation views to ensure student anonymity (k-anonymity).

Below are the 4 SQL scripts that MUST be executed in order. Please execute them one by one or combine them into a single transaction if possible.

## 1. Core Tables (`users`, `classes`, `enrollments`)

```sql
-- Creates: users, classes, class_enrollments
CREATE TYPE public.user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE public.recommendation_status AS ENUM ('pending', 'approved', 'dismissed');

CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.user_role NOT NULL DEFAULT 'student',
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.classes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  risk_score    REAL NOT NULL DEFAULT 0.0 CHECK (risk_score >= 0.0 AND risk_score <= 1.0),
  pilot_status  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_classes_teacher ON public.classes(teacher_id);

CREATE TABLE public.class_enrollments (
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, student_id)
);
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_enrollments_student ON public.class_enrollments(student_id);
```

## 2. Climate Tables (`check_ins`, `recommendations`, `action_logs`)

```sql
CREATE TABLE public.check_ins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mood        SMALLINT NOT NULL CHECK (mood BETWEEN 1 AND 5),
  pace        SMALLINT NOT NULL CHECK (pace BETWEEN 1 AND 5),
  fairness    SMALLINT NOT NULL CHECK (fairness BETWEEN 1 AND 5),
  content     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_checkins_class ON public.check_ins(class_id);

CREATE TABLE public.recommendations (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id                  UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  content                   TEXT NOT NULL,
  status                    public.recommendation_status NOT NULL DEFAULT 'pending',
  dismissal_reason          TEXT,
  action_taken_note         TEXT,
  communicated_to_students  BOOLEAN NOT NULL DEFAULT false,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_recommendations_class ON public.recommendations(class_id);

CREATE TABLE public.action_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_id   UUID,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_action_logs_actor ON public.action_logs(actor_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_recommendations_updated_at
  BEFORE UPDATE ON public.recommendations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

## 3. RLS Policies (Privacy Rules)

```sql
-- Users
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_admin_select_all" ON public.users FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Classes
CREATE POLICY "classes_teacher_select_own" ON public.classes FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "classes_teacher_update_own" ON public.classes FOR UPDATE USING (teacher_id = auth.uid());
CREATE POLICY "classes_student_select_enrolled" ON public.classes FOR SELECT USING (EXISTS (SELECT 1 FROM public.class_enrollments WHERE class_id = id AND student_id = auth.uid()));
CREATE POLICY "classes_admin_select_all" ON public.classes FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Enrichments
CREATE POLICY "enrollments_student_select_own" ON public.class_enrollments FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "enrollments_teacher_select_class" ON public.class_enrollments FOR SELECT USING (EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid()));
CREATE POLICY "enrollments_admin_select_all" ON public.class_enrollments FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Check-ins (SENSITIVE)
CREATE POLICY "checkins_student_insert_own" ON public.check_ins FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "checkins_student_select_own" ON public.check_ins FOR SELECT USING (student_id = auth.uid());
-- NOTE: No select policy for teacher/admin to access raw rows.

-- Recommendations
CREATE POLICY "recommendations_teacher_select" ON public.recommendations FOR SELECT USING (EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid()));
CREATE POLICY "recommendations_teacher_update" ON public.recommendations FOR UPDATE USING (EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid()));
CREATE POLICY "recommendations_student_select_communicated" ON public.recommendations FOR SELECT USING (communicated_to_students = true AND status = 'approved' AND EXISTS (SELECT 1 FROM public.class_enrollments WHERE class_id = recommendations.class_id AND student_id = auth.uid()));
CREATE POLICY "recommendations_admin_select_all" ON public.recommendations FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Action Logs
CREATE POLICY "action_logs_actor_select_own" ON public.action_logs FOR SELECT USING (actor_id = auth.uid());
CREATE POLICY "action_logs_admin_select_all" ON public.action_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "action_logs_insert_own" ON public.action_logs FOR INSERT WITH CHECK (actor_id = auth.uid());

-- Auto User Profile Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, role, full_name, avatar_url)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'student'), NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 4. Aggregation Views & RPCs (k-anonymity)

```sql
-- Secure View
CREATE OR REPLACE VIEW public.v_class_climate_summary AS
SELECT
  ci.class_id,
  date_trunc('week', ci.created_at)::DATE AS week_start,
  COUNT(*)::INT AS check_in_count,
  CASE WHEN COUNT(*) >= 3 THEN ROUND(AVG(ci.mood)::NUMERIC, 2) ELSE NULL END AS avg_mood,
  CASE WHEN COUNT(*) >= 3 THEN ROUND(AVG(ci.pace)::NUMERIC, 2) ELSE NULL END AS avg_pace,
  CASE WHEN COUNT(*) >= 3 THEN ROUND(AVG(ci.fairness)::NUMERIC, 2) ELSE NULL END AS avg_fairness
FROM public.check_ins ci
GROUP BY ci.class_id, date_trunc('week', ci.created_at);

-- Secure RPC for Teachers
CREATE OR REPLACE FUNCTION public.get_class_climate_summary(p_class_id UUID, p_weeks INT DEFAULT 4)
RETURNS TABLE (class_id UUID, week_start DATE, check_in_count INT, avg_mood NUMERIC, avg_pace NUMERIC, avg_fairness NUMERIC)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT v.class_id, v.week_start, v.check_in_count, v.avg_mood, v.avg_pace, v.avg_fairness
  FROM public.v_class_climate_summary v
  WHERE v.class_id = p_class_id AND v.week_start >= (CURRENT_DATE - (p_weeks * 7))
  ORDER BY v.week_start DESC;
$$;

-- Secure RPC for Admin Metrics
CREATE OR REPLACE FUNCTION public.get_adoption_metrics()
RETURNS TABLE (total_classes BIGINT, total_students BIGINT, total_checkins BIGINT, avg_checkin_rate NUMERIC, total_recommendations BIGINT, approved_recommendations BIGINT, communicated_recommendations BIGINT, loop_closure_rate NUMERIC)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT COUNT(*) FROM public.classes),
    (SELECT COUNT(DISTINCT student_id) FROM public.class_enrollments),
    (SELECT COUNT(*) FROM public.check_ins),
    CASE WHEN (SELECT COUNT(DISTINCT student_id) FROM public.class_enrollments) > 0 THEN ROUND((SELECT COUNT(*)::NUMERIC FROM public.check_ins) / (SELECT COUNT(DISTINCT student_id)::NUMERIC FROM public.class_enrollments), 2) ELSE 0 END,
    (SELECT COUNT(*) FROM public.recommendations),
    (SELECT COUNT(*) FROM public.recommendations WHERE status = 'approved'),
    (SELECT COUNT(*) FROM public.recommendations WHERE communicated_to_students = true),
    CASE WHEN (SELECT COUNT(*) FROM public.recommendations WHERE status = 'approved') > 0 THEN ROUND((SELECT COUNT(*)::NUMERIC FROM public.recommendations WHERE communicated_to_students = true) / (SELECT COUNT(*)::NUMERIC FROM public.recommendations WHERE status = 'approved'), 2) ELSE 0 END;
$$;
```

**PROMPT END**
