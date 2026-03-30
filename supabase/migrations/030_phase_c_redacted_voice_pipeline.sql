-- Migration: 030_phase_c_redacted_voice_pipeline
-- Purpose:
--   1. Store privacy-safe redacted student voice snippets
--   2. Expose teacher-safe RPC for approved redacted snippets
--   3. Expose internal-only RPCs for n8n raw fetch + redacted write

BEGIN;

CREATE TABLE IF NOT EXISTS public.redacted_student_snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  tone text NULL CHECK (tone IN ('low', 'mixed', 'positive')),
  text_redacted text NOT NULL CHECK (char_length(trim(text_redacted)) > 0),
  approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  contributing_students_count integer NOT NULL DEFAULT 0
    CHECK (contributing_students_count >= 0),
  source_window jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision_path_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_workflow text NULL,
  created_by_execution text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_redacted_student_snippets_class_created
  ON public.redacted_student_snippets(class_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_redacted_student_snippets_class_week
  ON public.redacted_student_snippets(class_id, week_start DESC);

CREATE INDEX IF NOT EXISTS idx_redacted_student_snippets_approval
  ON public.redacted_student_snippets(approval_status, class_id, week_start DESC);

COMMENT ON TABLE public.redacted_student_snippets IS
  'Privacy-safe redacted student voice snippets. Contains only already-redacted text approved for teacher-facing UI. No student identifiers or raw optional_text stored here.';

COMMENT ON COLUMN public.redacted_student_snippets.contributing_students_count IS
  'Internal k-anonymity safeguard. Teacher UI must never render this count directly.';

ALTER TABLE public.redacted_student_snippets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS redacted_student_snippets_authenticated_select_blocked
  ON public.redacted_student_snippets;
CREATE POLICY redacted_student_snippets_authenticated_select_blocked
  ON public.redacted_student_snippets
  FOR SELECT
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS redacted_student_snippets_anon_select_blocked
  ON public.redacted_student_snippets;
CREATE POLICY redacted_student_snippets_anon_select_blocked
  ON public.redacted_student_snippets
  FOR SELECT
  TO anon
  USING (false);

DROP POLICY IF EXISTS redacted_student_snippets_service_role_all
  ON public.redacted_student_snippets;
CREATE POLICY redacted_student_snippets_service_role_all
  ON public.redacted_student_snippets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP FUNCTION IF EXISTS public.get_raw_redaction_comment_batch(uuid, integer, integer);
CREATE FUNCTION public.get_raw_redaction_comment_batch(
  p_class_id uuid,
  p_weeks integer DEFAULT 2,
  p_limit integer DEFAULT 12
)
RETURNS TABLE (
  week_start date,
  created_at timestamptz,
  comment_text text,
  avg_mood numeric,
  avg_pace numeric,
  avg_fairness numeric,
  contributing_students_count integer,
  source_window jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_distinct_students integer;
BEGIN
  SELECT COUNT(DISTINCT sp.student_id)
  INTO v_distinct_students
  FROM public.student_pulses sp
  WHERE sp.class_id = p_class_id
    AND sp.created_at >= date_trunc('week', now()) - ((GREATEST(p_weeks, 1) - 1) * interval '1 week')
    AND sp.optional_text IS NOT NULL
    AND trim(sp.optional_text) <> '';

  IF v_distinct_students < 3 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH scoped_comments AS (
    SELECT
      sp.week_start,
      sp.created_at,
      sp.optional_text,
      vcs.avg_mood,
      vcs.avg_pace,
      vcs.avg_fairness
    FROM public.student_pulses sp
    LEFT JOIN public.v_class_climate_summary vcs
      ON vcs.class_id = sp.class_id
     AND vcs.week_start = sp.week_start
    WHERE sp.class_id = p_class_id
      AND sp.created_at >= date_trunc('week', now()) - ((GREATEST(p_weeks, 1) - 1) * interval '1 week')
      AND sp.optional_text IS NOT NULL
      AND trim(sp.optional_text) <> ''
    ORDER BY sp.created_at DESC
    LIMIT GREATEST(p_limit, 1)
  )
  SELECT
    sc.week_start,
    sc.created_at,
    sc.optional_text AS comment_text,
    sc.avg_mood,
    sc.avg_pace,
    sc.avg_fairness,
    v_distinct_students AS contributing_students_count,
    jsonb_build_object(
      'weeks', GREATEST(p_weeks, 1),
      'n', v_distinct_students,
      'class_id', p_class_id
    ) AS source_window
  FROM scoped_comments sc;
END;
$$;

COMMENT ON FUNCTION public.get_raw_redaction_comment_batch(uuid, integer, integer) IS
  'Internal-only helper for redaction pipeline. Returns raw optional_text without student identifiers and only when distinct contributing students >= 3.';

REVOKE ALL ON FUNCTION public.get_raw_redaction_comment_batch(uuid, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_raw_redaction_comment_batch(uuid, integer, integer)
  TO service_role;

DROP FUNCTION IF EXISTS public.write_redacted_student_snippets(uuid, date, jsonb, jsonb, text, text, text);
CREATE FUNCTION public.write_redacted_student_snippets(
  p_class_id uuid,
  p_week_start date,
  p_snippets jsonb,
  p_source_window jsonb DEFAULT '{}'::jsonb,
  p_approval_status text DEFAULT 'pending',
  p_created_by_workflow text DEFAULT NULL,
  p_created_by_execution text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  v_item jsonb;
  v_text_redacted text;
  v_tone text;
  v_contributing_students_count integer;
BEGIN
  IF jsonb_typeof(p_snippets) <> 'array' THEN
    RAISE EXCEPTION 'p_snippets must be a JSON array';
  END IF;

  v_contributing_students_count := COALESCE((p_source_window ->> 'n')::integer, 0);

  FOR v_item IN
    SELECT value FROM jsonb_array_elements(p_snippets)
  LOOP
    v_text_redacted := trim(COALESCE(v_item ->> 'text_redacted', ''));
    v_tone := NULLIF(trim(COALESCE(v_item ->> 'tone', '')), '');

    IF v_text_redacted = '' THEN
      CONTINUE;
    END IF;

    INSERT INTO public.redacted_student_snippets (
      class_id,
      week_start,
      tone,
      text_redacted,
      approval_status,
      contributing_students_count,
      source_window,
      decision_path_json,
      created_by_workflow,
      created_by_execution,
      approved_at
    )
    VALUES (
      p_class_id,
      p_week_start,
      CASE WHEN v_tone IN ('low', 'mixed', 'positive') THEN v_tone ELSE NULL END,
      v_text_redacted,
      CASE
        WHEN p_approval_status IN ('pending', 'approved', 'rejected') THEN p_approval_status
        ELSE 'pending'
      END,
      v_contributing_students_count,
      COALESCE(p_source_window, '{}'::jsonb),
      jsonb_build_object(
        'pipeline', 'phase_c_redacted_voice',
        'write_mode', 'tool_workflow'
      ),
      p_created_by_workflow,
      p_created_by_execution,
      CASE WHEN p_approval_status = 'approved' THEN now() ELSE NULL END
    );

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;

COMMENT ON FUNCTION public.write_redacted_student_snippets(uuid, date, jsonb, jsonb, text, text, text) IS
  'Internal-only write helper for already-redacted teacher-safe snippets. Intended for n8n toolWorkflow use only.';

REVOKE ALL ON FUNCTION public.write_redacted_student_snippets(uuid, date, jsonb, jsonb, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.write_redacted_student_snippets(uuid, date, jsonb, jsonb, text, text, text)
  TO service_role;

DROP FUNCTION IF EXISTS public.get_class_redacted_voice(uuid, integer);
CREATE FUNCTION public.get_class_redacted_voice(
  p_class_id uuid,
  p_weeks integer DEFAULT 4
)
RETURNS TABLE (
  id uuid,
  class_id uuid,
  week_start date,
  tone text,
  text_redacted text,
  source_window jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = p_class_id
      AND c.teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized for class %', p_class_id;
  END IF;

  RETURN QUERY
  SELECT
    rss.id,
    rss.class_id,
    rss.week_start,
    rss.tone,
    rss.text_redacted,
    rss.source_window,
    rss.created_at
  FROM public.redacted_student_snippets rss
  WHERE rss.class_id = p_class_id
    AND rss.week_start >= (date_trunc('week', now())::date - ((GREATEST(p_weeks, 1) - 1) * 7))
    AND rss.approval_status = 'approved'
    AND rss.contributing_students_count >= 3
  ORDER BY rss.week_start DESC, rss.created_at DESC
  LIMIT 3;
END;
$$;

COMMENT ON FUNCTION public.get_class_redacted_voice(uuid, integer) IS
  'Teacher-facing safe RPC for redacted student voice. Returns only approved, redacted snippets with k-anonymity >= 3 and only for classes owned by auth.uid().';

REVOKE ALL ON FUNCTION public.get_class_redacted_voice(uuid, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_class_redacted_voice(uuid, integer)
  TO authenticated, service_role;

COMMIT;
