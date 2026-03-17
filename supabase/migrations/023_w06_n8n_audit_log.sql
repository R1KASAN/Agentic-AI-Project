-- Migration: 019_w06_n8n_audit_log
-- Purpose: Create n8n_audit_log table for agentic workflow decision audit trail
-- Tables: n8n_audit_log (T008, T009, T010)
-- Maps to: All Agentic Loops (sense → reason → plan → act → learn → adapt)
-- RLS: Teachers see only their own audit trail
-- Date: 2026-03-16
-- Dependencies: Requires users, classes, schools, recommendations tables

-- ============================================================
-- PART 1: N8N_AUDIT_LOG TABLE (T008, T009, T010)
-- Decision Path Audit for All Agentic Workflows
-- Maps to: All Loops (sense → reason → plan → act → learn → adapt)
-- Purpose: Deterministic reasoning trail for W06 + future workflows
-- ============================================================

CREATE TABLE IF NOT EXISTS public.n8n_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP DEFAULT NOW(),
  
  -- Workflow Context (Loop0: Sense input)
  workflow_id TEXT NOT NULL,
  workflow_name TEXT,
  execution_id TEXT,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Decision Path (Loop1-Loop2: Reason + Plan)
  decision_path_json JSONB NOT NULL,
  policy_applied TEXT,
  confidence_score FLOAT8 CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  gates_passed JSONB,
  
  -- Tool Invocations (Loop2: Plan execution)
  tools_invoked TEXT[],
  tool_outputs JSONB,
  
  -- Action & Outcome (Loop3: Act)
  action_taken TEXT NOT NULL,
  CHECK (action_taken IN ('SEND_LINE_NOTIFICATION', 'SEND_EMAIL', 'SKIP', 'RETRY')),
  action_skipped BOOLEAN DEFAULT FALSE,
  skip_reason TEXT,
  
  -- Teacher Response (Loop4-Loop5: Learn + Adapt)
  notification_sent_at TIMESTAMP,
  recommendation_id UUID REFERENCES public.recommendations(id) ON DELETE SET NULL,
  teacher_response_received_at TIMESTAMP,
  teacher_response_type TEXT,
  
  -- Error Tracking
  error_message TEXT,
  error_stack TEXT,
  n8n_log_url TEXT,
  
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_workflow ON public.n8n_audit_log(workflow_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_teacher ON public.n8n_audit_log(teacher_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_recommendation ON public.n8n_audit_log(recommendation_id);

-- Enable RLS for audit log
ALTER TABLE public.n8n_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers see only their own audit trail
DROP POLICY IF EXISTS audit_log_teacher_view ON public.n8n_audit_log;

CREATE POLICY audit_log_teacher_view ON public.n8n_audit_log
  FOR SELECT USING (
    teacher_id = auth.uid()
  );

-- Comments for documentation
COMMENT ON TABLE public.n8n_audit_log IS 'Immutable audit trail for all agentic decisions. Enables deterministic reasoning review + compliance. Links to recommendation responses via Loop4/Loop5.';
COMMENT ON COLUMN public.n8n_audit_log.workflow_id IS 'Workflow identifier: e.g., W06-briefing, W01-agentic-ai. Enables multi-workflow audit parsing.';
COMMENT ON COLUMN public.n8n_audit_log.decision_path_json IS 'Structured reasoning: {checks: [{name: k_anonymity, passed: t/f, data: {...}}, ...]}. Deterministic for same inputs.';
COMMENT ON COLUMN public.n8n_audit_log.gates_passed IS 'Summary of all safety gates: {k_anonymity: bool, school_day: bool, frequency: bool, teacher_available: bool}. Each gate must pass for action.';
COMMENT ON COLUMN public.n8n_audit_log.tools_invoked IS 'Array of tool names: [get_class_climate_summary, gemini_lm, line_notify, etc]. Enables tool usage analytics.';
COMMENT ON COLUMN public.n8n_audit_log.tool_outputs IS 'JSONB snapshot of all tool outputs. Frozen at decision time for historical analysis and reproducibility.';
COMMENT ON COLUMN public.n8n_audit_log.action_taken IS 'Final action: SEND_LINE_NOTIFICATION, SEND_EMAIL, SKIP, RETRY. Documents what action was executed.';
COMMENT ON COLUMN public.n8n_audit_log.recommendation_id IS 'Foreign key to created recommendation (if action_taken = SEND*). Enables loop closure tracking.';
COMMENT ON COLUMN public.n8n_audit_log.teacher_response_type IS 'How teacher responded: APPROVED, DISMISSED, IMPLEMENTED, NOT_ACTIONED. Enables Loop4/Loop5 metrics.';
