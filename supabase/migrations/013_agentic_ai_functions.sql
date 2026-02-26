-- Migration 013: Add support functions for Agentic AI Recommendation workflow.
--
-- A01: get_trend_comparison() — week-over-week climate comparison
-- A03: submit_recommendation_safe() — guard against >3 pending per class

-- ============================================================
-- A01: Trend Comparison Function
-- Used by Agent Tool "get_trend_comparison" to detect week-over-week changes.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_trend_comparison(p_class_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_this_week JSONB;
    v_last_week JSONB;
    v_this_count INT;
    v_last_count INT;
BEGIN
    -- This week (Monday onwards)
    SELECT COUNT(*) INTO v_this_count
    FROM public.student_pulses
    WHERE class_id = p_class_id
      AND created_at >= date_trunc('week', now());

    IF v_this_count < 3 THEN
        v_this_week := jsonb_build_object('privacy_locked', true, 'count', v_this_count);
    ELSE
        SELECT jsonb_build_object(
            'privacy_locked', false,
            'avg_pace', ROUND(AVG(pace), 2),
            'avg_fairness', ROUND(AVG(fairness), 2),
            'main_mood', (SELECT mood FROM public.student_pulses
                          WHERE class_id = p_class_id
                            AND created_at >= date_trunc('week', now())
                          GROUP BY mood ORDER BY COUNT(*) DESC LIMIT 1),
            'count', COUNT(*)
        ) INTO v_this_week
        FROM public.student_pulses
        WHERE class_id = p_class_id
          AND created_at >= date_trunc('week', now());
    END IF;

    -- Last week
    SELECT COUNT(*) INTO v_last_count
    FROM public.student_pulses
    WHERE class_id = p_class_id
      AND created_at >= date_trunc('week', now() - interval '1 week')
      AND created_at < date_trunc('week', now());

    IF v_last_count < 3 THEN
        v_last_week := jsonb_build_object('privacy_locked', true, 'count', v_last_count);
    ELSE
        SELECT jsonb_build_object(
            'privacy_locked', false,
            'avg_pace', ROUND(AVG(pace), 2),
            'avg_fairness', ROUND(AVG(fairness), 2),
            'main_mood', (SELECT mood FROM public.student_pulses
                          WHERE class_id = p_class_id
                            AND created_at >= date_trunc('week', now() - interval '1 week')
                            AND created_at < date_trunc('week', now())
                          GROUP BY mood ORDER BY COUNT(*) DESC LIMIT 1),
            'count', COUNT(*)
        ) INTO v_last_week
        FROM public.student_pulses
        WHERE class_id = p_class_id
          AND created_at >= date_trunc('week', now() - interval '1 week')
          AND created_at < date_trunc('week', now());
    END IF;

    RETURN jsonb_build_object(
        'class_id', p_class_id,
        'this_week', v_this_week,
        'last_week', v_last_week
    );
END;
$$;

COMMENT ON FUNCTION public.get_trend_comparison IS
    'Agentic AI tool: compares climate metrics between current and previous week. Respects k-anonymity (n>=3) per period. Added in migration 013.';

-- ============================================================
-- A03: Safe Recommendation Submission
-- Server-side guard: rejects INSERT if class already has >=3 pending recs.
-- Returns the new row if successful, empty set if blocked.
-- ============================================================

CREATE OR REPLACE FUNCTION public.submit_recommendation_safe(
    p_class_id UUID,
    p_content TEXT,
    p_category TEXT DEFAULT 'engagement',
    p_priority TEXT DEFAULT 'medium'
)
RETURNS TABLE(id UUID, was_inserted BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pending_count INT;
    v_new_id UUID;
BEGIN
    -- Count existing pending recommendations for this class
    SELECT COUNT(*) INTO v_pending_count
    FROM public.recommendations
    WHERE class_id = p_class_id AND status = 'pending';

    -- Guard: max 3 pending per class
    IF v_pending_count >= 3 THEN
        RETURN QUERY SELECT NULL::UUID, false;
        RETURN;
    END IF;

    -- Insert the recommendation
    INSERT INTO public.recommendations
        (class_id, content, category, priority, status, ai_generated, ai_model)
    VALUES
        (p_class_id, p_content, p_category, p_priority, 'pending', true, 'gemini-2.0-flash')
    RETURNING recommendations.id INTO v_new_id;

    RETURN QUERY SELECT v_new_id, true;
END;
$$;

COMMENT ON FUNCTION public.submit_recommendation_safe IS
    'Agentic AI tool: inserts a recommendation only if class has <3 pending. Returns (id, was_inserted). Added in migration 013.';
