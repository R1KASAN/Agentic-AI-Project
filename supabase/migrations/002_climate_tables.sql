-- Migration: 002_climate_tables
-- Creates: check_ins, recommendations, action_logs
-- Privacy: RLS enabled. check_ins is the most sensitive table.

-- ============================================================
-- 1. Check-Ins (Student Climate Data - SENSITIVE)
-- ============================================================
CREATE TABLE public.check_ins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mood        SMALLINT NOT NULL CHECK (mood BETWEEN 1 AND 5),
  pace        SMALLINT NOT NULL CHECK (pace BETWEEN 1 AND 5),
  fairness    SMALLINT NOT NULL CHECK (fairness BETWEEN 1 AND 5),
  content     TEXT,  -- Optional free text. Subject to 60-day retention policy.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_checkins_class ON public.check_ins(class_id);
CREATE INDEX idx_checkins_created ON public.check_ins(created_at);

COMMENT ON TABLE public.check_ins IS 'Student climate check-ins. Raw rows are NEVER exposed to teachers/admins. Only aggregated via secure views.';
COMMENT ON COLUMN public.check_ins.content IS 'Free text feedback. Must be redacted/deleted after 60 days per retention policy.';

-- ============================================================
-- 2. Recommendations (AI-Generated, Teacher-Approved)
-- ============================================================
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
CREATE INDEX idx_recommendations_status ON public.recommendations(status);

COMMENT ON TABLE public.recommendations IS 'AI-drafted suggestions. Teachers must approve/dismiss. communicated_to_students tracks loop closure.';

-- ============================================================
-- 3. Action Logs (Audit Trail)
-- ============================================================
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
CREATE INDEX idx_action_logs_type ON public.action_logs(action_type);
CREATE INDEX idx_action_logs_created ON public.action_logs(created_at);

COMMENT ON TABLE public.action_logs IS 'Audit trail of all significant actions. No raw student text is stored here.';
COMMENT ON COLUMN public.action_logs.action_type IS 'Values: LOGIN, LOGOUT, APPROVE_RECOMMENDATION, DISMISS_RECOMMENDATION, UPDATE_CLASS_SETTINGS';

-- ============================================================
-- 4. Auto-update updated_at trigger for recommendations
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_recommendations_updated_at
  BEFORE UPDATE ON public.recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
