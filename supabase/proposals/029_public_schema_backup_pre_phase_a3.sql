


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'Climate Agent: W06 Morning AI Briefing + Agentic Loop Infrastructure. Tables: recommendations (T005-T007), n8n_audit_log (T008-T010), school_days (T011), teacher_profiles (T012), student_pulses (T013, extended RLS), RPC: get_class_climate_summary (T014, k-anonymity enforced).';



CREATE TYPE "public"."notification_type" AS ENUM (
    'loop_closure',
    'reminder'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."recommendation_category" AS ENUM (
    'engagement',
    'wellbeing',
    'collaboration',
    'academic'
);


ALTER TYPE "public"."recommendation_category" OWNER TO "postgres";


CREATE TYPE "public"."recommendation_priority" AS ENUM (
    'high',
    'medium',
    'low'
);


ALTER TYPE "public"."recommendation_priority" OWNER TO "postgres";


CREATE TYPE "public"."recommendation_status" AS ENUM (
    'pending',
    'approved',
    'dismissed',
    'edited',
    'draft'
);


ALTER TYPE "public"."recommendation_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'student',
    'teacher'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_k_anonymity_status"("p_class_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_response_count INT;
BEGIN
    SELECT COUNT(*) INTO v_response_count
    FROM public.student_pulses
    WHERE class_id = p_class_id AND created_at >= now() - interval '1 week';
    
    RETURN v_response_count >= 3;
END;
$$;


ALTER FUNCTION "public"."calculate_k_anonymity_status"("p_class_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_frequency_limit"("p_class_id" "uuid", "p_max_daily" integer DEFAULT 2, "p_max_weekly" integer DEFAULT 5) RETURNS TABLE("limit_exceeded" boolean, "reason" "text", "daily_count" bigint, "weekly_count" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    (daily.cnt >= p_max_daily OR weekly.cnt >= p_max_weekly) AS limit_exceeded,
    CASE
      WHEN daily.cnt  >= p_max_daily  THEN 'Daily limit reached ('  || daily.cnt  || '/' || p_max_daily  || ')'
      WHEN weekly.cnt >= p_max_weekly THEN 'Weekly limit reached (' || weekly.cnt || '/' || p_max_weekly || ')'
      ELSE 'Within limits'
    END                                                       AS reason,
    daily.cnt                                                 AS daily_count,
    weekly.cnt                                                AS weekly_count
  FROM (
    SELECT COUNT(*) AS cnt
    FROM public.recommendations
    WHERE class_id   = p_class_id
      AND created_at >= CURRENT_DATE
      AND teacher_approval_status != 'dismissed'
  ) daily,
  (
    SELECT COUNT(*) AS cnt
    FROM public.recommendations
    WHERE class_id   = p_class_id
      AND created_at >= DATE_TRUNC('week', NOW())
      AND teacher_approval_status != 'dismissed'
  ) weekly;
$$;


ALTER FUNCTION "public"."check_frequency_limit"("p_class_id" "uuid", "p_max_daily" integer, "p_max_weekly" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_school_settings"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.school_notification_settings (school_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_school_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_adoption_metrics"() RETURNS TABLE("total_classes" bigint, "total_students" bigint, "total_checkins" bigint, "avg_checkin_rate" numeric, "total_recommendations" bigint, "approved_recommendations" bigint, "communicated_recommendations" bigint, "loop_closure_rate" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."get_adoption_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_aggregated_climate_data"("p_date" "date", "p_min_n" integer) RETURNS TABLE("class_id" "uuid", "avg_mood_score" numeric, "total_responses" integer, "sentiment_distribution" "jsonb", "raw_comments" "jsonb")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH mood_scores AS (
    SELECT 
      e.class_id,
      e.optional_text,
      e.mood,
      CASE e.mood
        WHEN 'great' THEN 5
        WHEN 'good' THEN 4
        WHEN 'okay' THEN 3
        WHEN 'low' THEN 2
        WHEN 'very_low' THEN 1
        ELSE 3
      END as numeric_score
    FROM student_pulses e
    WHERE e.created_at::date = p_date
      AND e.mood IS NOT NULL
  )
  SELECT
    m.class_id,
    ROUND(AVG(m.numeric_score), 2) as avg_mood_score,
    COUNT(*)::integer as total_responses,
    jsonb_build_object(
      'great', COUNT(*) FILTER (WHERE m.mood = 'great')::int,
      'good', COUNT(*) FILTER (WHERE m.mood = 'good')::int,
      'okay', COUNT(*) FILTER (WHERE m.mood = 'okay')::int,
      'low', COUNT(*) FILTER (WHERE m.mood = 'low')::int,
      'very_low', COUNT(*) FILTER (WHERE m.mood = 'very_low')::int
    ) as sentiment_distribution,
    COALESCE(
      jsonb_agg(m.optional_text) FILTER (WHERE m.optional_text IS NOT NULL AND TRIM(m.optional_text) <> ''),
      '[]'::jsonb
    ) as raw_comments
  FROM mood_scores m
  GROUP BY m.class_id
  HAVING COUNT(*) >= p_min_n;
$$;


ALTER FUNCTION "public"."get_aggregated_climate_data"("p_date" "date", "p_min_n" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_school_schedules"() RETURNS TABLE("school_id" "uuid", "school_name" character varying, "ai_run_enabled" boolean, "ai_run_day" character varying, "ai_run_time" time without time zone, "teacher_email_enabled" boolean, "teacher_email_day" character varying, "teacher_email_time" time without time zone, "reminder_enabled" boolean, "reminder_day" character varying, "reminder_time" time without time zone, "reminder_threshold" integer, "health_score_enabled" boolean, "health_score_day" character varying, "health_score_time" time without time zone, "health_score_alert_threshold" integer, "paused_until" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT 
    s.id, s.name,
    sns.ai_run_enabled, sns.ai_run_day, sns.ai_run_time,
    sns.teacher_email_enabled, sns.teacher_email_day, sns.teacher_email_time,
    sns.reminder_enabled, sns.reminder_day, sns.reminder_time, 
    sns.reminder_threshold,
    sns.health_score_enabled, sns.health_score_day, sns.health_score_time,
    sns.health_score_alert_threshold,
    sns.paused_until
  FROM public.schools s
  JOIN public.school_notification_settings sns ON sns.school_id = s.id;
$$;


ALTER FUNCTION "public"."get_all_school_schedules"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_class_climate_summary"("p_class_id" "uuid", "p_weeks" integer DEFAULT 4) RETURNS TABLE("class_id" "uuid", "week_start" "date", "check_in_count" integer, "avg_mood" double precision, "avg_pace" double precision, "avg_fairness" double precision)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    v.class_id,
    v.week_start,
    v.check_in_count,
    v.avg_mood::FLOAT8,
    v.avg_pace::FLOAT8,
    v.avg_fairness::FLOAT8
  FROM public.v_class_climate_summary v
  WHERE v.class_id = p_class_id
    AND v.week_start >= (CURRENT_DATE - (p_weeks * 7))
  ORDER BY v.week_start DESC;
$$;


ALTER FUNCTION "public"."get_class_climate_summary"("p_class_id" "uuid", "p_weeks" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_class_climate_summary"("p_class_id" "uuid", "p_weeks" integer) IS 'Canonical aggregate climate data endpoint. Reads from student_pulses via v_class_climate_summary. Enforces k-anonymity (returns NULLs when fewer than 3 distinct students in a week). SECURITY DEFINER: bypasses RLS to allow teachers to read aggregated data. No raw student rows are ever returned. Fixed in migration 027.';



CREATE OR REPLACE FUNCTION "public"."get_teacher_classes_summary"("p_teacher_id" "uuid") RETURNS TABLE("class_id" "uuid", "class_name" "text", "risk_level" "text", "pending_recommendations" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF auth.uid() != p_teacher_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY 
    SELECT 
        c.id, 
        c.name, 
        CASE 
            WHEN (SELECT COUNT(DISTINCT sp.student_id) 
                  FROM public.student_pulses sp 
                  WHERE sp.class_id = c.id AND DATE(sp.created_at) = CURRENT_DATE) < 3 
            THEN 'NO_DATA'
            ELSE c.risk_level
        END as risk_level,
        (SELECT COUNT(*) 
         FROM public.recommendations r 
         WHERE r.class_id = c.id AND (r.status = 'pending' OR r.status = 'draft')
        ) as pending_recommendations
    FROM public.classes c
    WHERE c.teacher_id = p_teacher_id
      AND (c.archived_at IS NULL OR c.archived_at IS NULL);
END;
$$;


ALTER FUNCTION "public"."get_teacher_classes_summary"("p_teacher_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_teacher_metrics"("p_class_id" "uuid", "p_lookback_days" integer DEFAULT 30) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'class_id', p_class_id,
    'lookback_days', p_lookback_days,
    'total_surveys', COUNT(*),
    'avg_mood_score', ROUND(AVG(mood_score)::NUMERIC, 2),
    'low_mood_count', COUNT(*) FILTER (WHERE mood_score <= 2),
    'high_mood_count', COUNT(*) FILTER (WHERE mood_score >= 4),
    'date_range_start', MIN(survey_date),
    'date_range_end', MAX(survey_date)
  )
  INTO v_result
  FROM climate_surveys
  WHERE class_id = p_class_id
    AND survey_date >= CURRENT_DATE - INTERVAL '1 day' * p_lookback_days;
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_teacher_metrics"("p_class_id" "uuid", "p_lookback_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_teacher_response_rate"("p_class_id" "uuid", "p_days" integer DEFAULT 30) RETURNS TABLE("class_id" "uuid", "dismissal_rate" numeric, "avg_response_time_hours" numeric, "last_action_date" timestamp with time zone, "total_recommendations" bigint, "total_approved" bigint, "total_dismissed" bigint, "inquiry_mode_recommended" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    r.class_id                                                            AS class_id,
    CASE
      WHEN COUNT(r.id) > 0
        THEN ROUND(
          COUNT(r.id) FILTER (
            WHERE r.teacher_approval_status = 'dismissed'
          )::NUMERIC / COUNT(r.id)::NUMERIC, 2
        )
      ELSE 0.00
    END                                                                   AS dismissal_rate,
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (
          COALESCE(r.teacher_acted_at, r.updated_at, r.created_at)
          - r.created_at
        )) / 3600.0
      )::NUMERIC, 1
    )                                                                     AS avg_response_time_hours,
    MAX(r.teacher_acted_at)
      FILTER (WHERE r.teacher_approval_status IN ('approved','dismissed'))
                                                                          AS last_action_date,
    COUNT(r.id)                                                           AS total_recommendations,
    COUNT(r.id) FILTER (
      WHERE r.teacher_approval_status = 'approved'
    )                                                                     AS total_approved,
    COUNT(r.id) FILTER (
      WHERE r.teacher_approval_status = 'dismissed'
    )                                                                     AS total_dismissed,
    -- Inquiry Mode flag: true if dismissal rate > 60%
    CASE
      WHEN COUNT(r.id) > 0
        THEN (
          COUNT(r.id) FILTER (
            WHERE r.teacher_approval_status = 'dismissed'
          )::NUMERIC / COUNT(r.id)::NUMERIC
        ) > 0.60
      ELSE FALSE
    END                                                                   AS inquiry_mode_recommended
  FROM public.recommendations r
  WHERE r.class_id   = p_class_id
    AND r.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY r.class_id;
$$;


ALTER FUNCTION "public"."get_teacher_response_rate"("p_class_id" "uuid", "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_trend_comparison"("p_class_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."get_trend_comparison"("p_class_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_trend_comparison"("p_class_id" "uuid") IS 'Agentic AI tool: compares climate metrics between current and previous week. Respects k-anonymity (n>=3) per period. Added in migration 013.';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (id, role, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'student'),
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_classes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.classes
  set updated_at = now()
  where id = NEW.class_id;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."set_classes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_archive_class"("class_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verify the user is the teacher of the class
  IF NOT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = class_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to archive this class';
  END IF;

  UPDATE public.classes
  SET archived_at = now()
  WHERE id = class_id AND teacher_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."soft_archive_class"("class_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_recommendation_safe"("p_class_id" "uuid", "p_content" "text", "p_category" "text" DEFAULT 'engagement'::"text", "p_priority" "text" DEFAULT 'medium'::"text") RETURNS TABLE("id" "uuid", "was_inserted" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."submit_recommendation_safe"("p_class_id" "uuid", "p_content" "text", "p_category" "text", "p_priority" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."submit_recommendation_safe"("p_class_id" "uuid", "p_content" "text", "p_category" "text", "p_priority" "text") IS 'Agentic AI tool: inserts a recommendation only if class has <3 pending. Returns (id, was_inserted). Added in migration 013.';



CREATE OR REPLACE FUNCTION "public"."update_class_risk_level"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Update the class's risk_level to match the latest recommendation's policy_level
    UPDATE public.classes
    SET risk_level = NEW.policy_level,
        risk_score = CASE
            WHEN NEW.policy_level = 'CRITICAL' THEN 80
            WHEN NEW.policy_level = 'WARNING' THEN 50
            ELSE 20
        END,
        updated_at = NOW()
    WHERE id = NEW.class_id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_class_risk_level"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."action_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "target_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."action_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."check_ins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "mood" smallint NOT NULL,
    "pace" smallint NOT NULL,
    "fairness" smallint NOT NULL,
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_ins_fairness_check" CHECK ((("fairness" >= 1) AND ("fairness" <= 5))),
    CONSTRAINT "check_ins_mood_check" CHECK ((("mood" >= 1) AND ("mood" <= 5))),
    CONSTRAINT "check_ins_pace_check" CHECK ((("pace" >= 1) AND ("pace" <= 5)))
);


ALTER TABLE "public"."check_ins" OWNER TO "postgres";


COMMENT ON TABLE "public"."check_ins" IS 'DEPRECATED as of 2026-02-21. Superseded by student_pulses (005 migration). Do not write new data here. All check-in writes now go through student_pulses via api/student/check-in/route.ts.';



CREATE TABLE IF NOT EXISTS "public"."class_enrollments" (
    "class_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."class_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "risk_score" integer DEFAULT 0 NOT NULL,
    "pilot_status" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "invite_code" character varying(8) DEFAULT "upper"("substring"("md5"(("random"())::"text"), 1, 8)),
    "school_id" "uuid",
    "checkin_rate_current_week" numeric(5,2) DEFAULT 0.0,
    "loop_closure_rate" numeric(5,2) DEFAULT 0.0,
    "archived_at" timestamp with time zone,
    "risk_level" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "classes_risk_level_check" CHECK (("risk_level" = ANY (ARRAY['ROUTINE'::"text", 'WARNING'::"text", 'CRITICAL'::"text"]))),
    CONSTRAINT "classes_risk_score_check" CHECK ((("risk_score" >= 0) AND ("risk_score" <= 100)))
);


ALTER TABLE "public"."classes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."classes"."risk_level" IS 'Latest recommendation policy_level. Updated via trigger when new recommendation inserted.';



CREATE TABLE IF NOT EXISTS "public"."climate_surveys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "mood_score" integer NOT NULL,
    "survey_date" "date" NOT NULL,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "climate_surveys_mood_score_check" CHECK ((("mood_score" >= 1) AND ("mood_score" <= 5)))
);


ALTER TABLE "public"."climate_surveys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."error_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_id" "text",
    "execution_id" "text",
    "error_node" "text",
    "error_message" "text",
    "error_stack" "text",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."error_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."n8n_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_id" "text",
    "execution_id" "text",
    "trigger_time" timestamp with time zone,
    "policy_selected" "text",
    "confidence_score" numeric,
    "actions_taken" "jsonb",
    "decision_path" "jsonb",
    "class_id" "text",
    "triggered_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "blocked_reason" "text",
    "decision_path_json" "jsonb",
    "error_message" "text",
    "inquiry_mode" boolean,
    "event_type" "text" DEFAULT 'teacher_approval'::"text" NOT NULL
);


ALTER TABLE "public"."n8n_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "message" "text" NOT NULL,
    "class_id" "uuid",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qr_checkins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "mood" smallint NOT NULL,
    "session_token" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "qr_checkins_mood_check" CHECK ((("mood" >= 1) AND ("mood" <= 5)))
);


ALTER TABLE "public"."qr_checkins" OWNER TO "postgres";


COMMENT ON TABLE "public"."qr_checkins" IS 'Anonymous QR code check-ins. NO student identity stored. Raw rows visible only to service_role (never to teachers/students via RLS). Aggregated data feeds into class climate metrics.';



CREATE TABLE IF NOT EXISTS "public"."recommendations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "status" "public"."recommendation_status" DEFAULT 'pending'::"public"."recommendation_status" NOT NULL,
    "dismissal_reason" "text",
    "action_taken_note" "text",
    "communicated_to_students" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "priority" "public"."recommendation_priority" DEFAULT 'medium'::"public"."recommendation_priority",
    "category" "public"."recommendation_category" DEFAULT 'engagement'::"public"."recommendation_category",
    "ai_generated" boolean DEFAULT true,
    "ai_model" character varying DEFAULT 'gemini-2.0-flash'::character varying,
    "raw_climate_snapshot" "jsonb",
    "teacher_id" "uuid",
    "teacher_approval_status" "text",
    "policy" "text",
    "confidence_score" numeric(3,2),
    "sent_via" "text",
    "action_source" "text",
    "teacher_acted_at" timestamp with time zone,
    "teacher_action_note" "text",
    "policy_level" "text" DEFAULT 'ROUTINE'::"text" NOT NULL,
    "ai_message_draft" "text",
    "actions_json" "jsonb",
    "reasoning" "text",
    "inquiry_mode" boolean DEFAULT false NOT NULL,
    "fallback_used" boolean DEFAULT false NOT NULL,
    "alert_sent_at" timestamp with time zone,
    CONSTRAINT "recommendations_policy_check" CHECK (("policy" = ANY (ARRAY['ROUTINE'::"text", 'WARNING'::"text", 'CRITICAL'::"text"]))),
    CONSTRAINT "recommendations_policy_level_check" CHECK (("policy_level" = ANY (ARRAY['ROUTINE'::"text", 'WARNING'::"text", 'CRITICAL'::"text"]))),
    CONSTRAINT "recommendations_teacher_approval_status_check" CHECK (("teacher_approval_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."recommendations" OWNER TO "postgres";


COMMENT ON TABLE "public"."recommendations" IS 'AI-generated recommendations from n8n workflow. Teachers must approve/dismiss. Fields policy_level, ai_message_draft, actions_json, confidence_score match n8n output.';



COMMENT ON COLUMN "public"."recommendations"."ai_model" IS 'LLM model used to generate this recommendation. Default: gemini-2.0-flash (Constitution v1.3.0 §V). Migrated from gpt-4o on 2026-02-21.';



COMMENT ON COLUMN "public"."recommendations"."policy_level" IS 'AI policy level: ROUTINE (mood >= 3.5), WARNING (2.5 <= mood < 3.5), CRITICAL (mood < 2.5)';



CREATE TABLE IF NOT EXISTS "public"."school_days" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "is_school_day" boolean DEFAULT true,
    "reason" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."school_days" OWNER TO "postgres";


COMMENT ON TABLE "public"."school_days" IS 'Calendar guard: marks holidays, breaks, weekends per school. Used by W06 to skip briefings on non-school days. One row per school per date.';



COMMENT ON COLUMN "public"."school_days"."school_id" IS 'Foreign key to schools table. Each school has its own calendar (different regions, holidays).';



COMMENT ON COLUMN "public"."school_days"."date" IS 'Calendar date (Y-M-D format). Unique per school.';



COMMENT ON COLUMN "public"."school_days"."is_school_day" IS 'TRUE = regular school day (send briefings) | FALSE = holiday/break/weekend (skip briefings).';



COMMENT ON COLUMN "public"."school_days"."reason" IS 'Holiday name, teacher professional day, weather closure, etc. for logging and debugging.';



COMMENT ON COLUMN "public"."school_days"."created_at" IS 'When calendar entry was created (admin adds holidays at start of school year).';



COMMENT ON COLUMN "public"."school_days"."updated_at" IS 'Last modification time.';



CREATE TABLE IF NOT EXISTS "public"."school_notification_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid",
    "ai_run_enabled" boolean DEFAULT true,
    "ai_run_day" character varying(10) DEFAULT 'monday'::character varying,
    "ai_run_time" time without time zone DEFAULT '06:00:00'::time without time zone,
    "teacher_email_enabled" boolean DEFAULT true,
    "teacher_email_day" character varying(10) DEFAULT 'monday'::character varying,
    "teacher_email_time" time without time zone DEFAULT '07:00:00'::time without time zone,
    "reminder_enabled" boolean DEFAULT true,
    "reminder_day" character varying(10) DEFAULT 'friday'::character varying,
    "reminder_time" time without time zone DEFAULT '15:00:00'::time without time zone,
    "reminder_threshold" integer DEFAULT 50,
    "health_score_enabled" boolean DEFAULT true,
    "health_score_day" character varying(10) DEFAULT 'sunday'::character varying,
    "health_score_time" time without time zone DEFAULT '09:00:00'::time without time zone,
    "health_score_alert_threshold" integer DEFAULT 40,
    "paused_until" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."school_notification_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "health_score" integer DEFAULT 100,
    "last_calculated" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "schools_health_score_check" CHECK ((("health_score" >= 0) AND ("health_score" <= 100)))
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_pulses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "mood" "text" NOT NULL,
    "pace" smallint NOT NULL,
    "fairness" smallint NOT NULL,
    "optional_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "student_id" "uuid",
    "week_start" "date" GENERATED ALWAYS AS (("date_trunc"('week'::"text", ("created_at" AT TIME ZONE 'UTC'::"text")))::"date") STORED,
    CONSTRAINT "mood_valid_enum" CHECK (("mood" = ANY (ARRAY['very_low'::"text", 'low'::"text", 'okay'::"text", 'good'::"text", 'great'::"text"]))),
    CONSTRAINT "student_pulses_fairness_check" CHECK ((("fairness" >= 1) AND ("fairness" <= 5))),
    CONSTRAINT "student_pulses_pace_check" CHECK ((("pace" >= 1) AND ("pace" <= 5)))
);


ALTER TABLE "public"."student_pulses" OWNER TO "postgres";


COMMENT ON TABLE "public"."student_pulses" IS 'Canonical student climate check-ins (mood/pace/fairness). RLS blocks ALL authenticated SELECT; teachers access data only via get_class_climate_summary() SECURITY DEFINER RPC. This replaces the deprecated check_ins table workflow as of migration 005.';



COMMENT ON COLUMN "public"."student_pulses"."mood" IS 'TEXT enum: very_low|low|okay|good|great. Maps from EmojiPickerToggle (1=very_low ... 5=great). SMALLINT mood field in check_ins table is deprecated.';



COMMENT ON COLUMN "public"."student_pulses"."optional_text" IS 'Free text feedback. Subject to 60-day retention policy.';



COMMENT ON COLUMN "public"."student_pulses"."week_start" IS 'Computed column: Monday of ISO week from created_at. Used for UNIQUE(student_id, class_id, week_start) to enforce one check-in per student per class per week. Added in M01 audit fix (2026-02-22).';



CREATE TABLE IF NOT EXISTS "public"."teacher_context" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid",
    "recommendation_id" "uuid",
    "context_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teacher_context" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teacher_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "notification_frequency_pref" "text" DEFAULT 'ROUTINE'::"text",
    "notification_channel_pref" "text" DEFAULT 'LINE'::"text",
    "last_briefing_sent_at" timestamp without time zone,
    "briefing_count_7d" integer DEFAULT 0,
    "briefing_approval_count_7d" integer DEFAULT 0,
    "approval_rate_historical" double precision,
    "implementation_rate_historical" double precision,
    "action_latency_avg_hours" double precision,
    "closure_rate_trend_7d" double precision,
    "is_inquiry_mode" boolean DEFAULT false,
    "inquiry_mode_triggered_at" timestamp without time zone,
    "dismissal_pattern_consecutive" integer DEFAULT 0,
    "dismissal_pattern_reason" "text",
    CONSTRAINT "teacher_profiles_action_latency_avg_hours_check" CHECK ((("action_latency_avg_hours" IS NULL) OR ("action_latency_avg_hours" >= (0)::double precision))),
    CONSTRAINT "teacher_profiles_approval_rate_historical_check" CHECK ((("approval_rate_historical" IS NULL) OR (("approval_rate_historical" >= (0)::double precision) AND ("approval_rate_historical" <= (1)::double precision)))),
    CONSTRAINT "teacher_profiles_closure_rate_trend_7d_check" CHECK ((("closure_rate_trend_7d" IS NULL) OR (("closure_rate_trend_7d" >= (0)::double precision) AND ("closure_rate_trend_7d" <= (1)::double precision)))),
    CONSTRAINT "teacher_profiles_dismissal_pattern_consecutive_check" CHECK (("dismissal_pattern_consecutive" >= 0)),
    CONSTRAINT "teacher_profiles_implementation_rate_historical_check" CHECK ((("implementation_rate_historical" IS NULL) OR (("implementation_rate_historical" >= (0)::double precision) AND ("implementation_rate_historical" <= (1)::double precision)))),
    CONSTRAINT "teacher_profiles_notification_channel_pref_check" CHECK (("notification_channel_pref" = ANY (ARRAY['LINE'::"text", 'EMAIL'::"text", 'DASHBOARD'::"text", 'SLACK'::"text"]))),
    CONSTRAINT "teacher_profiles_notification_frequency_pref_check" CHECK (("notification_frequency_pref" = ANY (ARRAY['ROUTINE'::"text", 'CRITICAL_ONLY'::"text", 'NONE'::"text"])))
);


ALTER TABLE "public"."teacher_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."teacher_profiles" IS 'W06 Morning Briefing preferences + response metrics. Enables personalized inquiry mode and Loop5 feedback adaptation. One row per teacher.';



COMMENT ON COLUMN "public"."teacher_profiles"."user_id" IS 'Foreign key to users table. One-to-one relationship with teacher account.';



COMMENT ON COLUMN "public"."teacher_profiles"."notification_frequency_pref" IS 'Teacher preference: ROUTINE = every briefing, CRITICAL_ONLY = warnings/critical alerts only, NONE = opt out.';



COMMENT ON COLUMN "public"."teacher_profiles"."notification_channel_pref" IS 'Preferred delivery channel: LINE (default), EMAIL, DASHBOARD widget, or SLACK integration.';



COMMENT ON COLUMN "public"."teacher_profiles"."last_briefing_sent_at" IS 'Timestamp of most recent briefing sent to this teacher. Used to enforce frequency limits.';



COMMENT ON COLUMN "public"."teacher_profiles"."briefing_count_7d" IS 'Rolling count: number of briefings sent in last 7 days. Updated by W06 workflow.';



COMMENT ON COLUMN "public"."teacher_profiles"."briefing_approval_count_7d" IS 'Count of briefings teacher approved (acknowledged + implemented feedback) in last 7 days.';



COMMENT ON COLUMN "public"."teacher_profiles"."approval_rate_historical" IS 'Average approval rate over history (0.0-1.0). Used by L3 to personalize tone/urgency.';



COMMENT ON COLUMN "public"."teacher_profiles"."implementation_rate_historical" IS 'Fraction of approved briefings teacher actually implemented in class. High rate = high confidence in recommendations.';



COMMENT ON COLUMN "public"."teacher_profiles"."action_latency_avg_hours" IS 'Average hours from notification sent to teacher approval. High latency = teacher slow to respond.';



COMMENT ON COLUMN "public"."teacher_profiles"."closure_rate_trend_7d" IS 'Recent trend (0.0-1.0): >0.6 = improving closure (teachers implementing more), <0.3 = declining. Used for frequency adjustment.';



COMMENT ON COLUMN "public"."teacher_profiles"."is_inquiry_mode" IS 'TRUE = W06 switches to asking "What format would help?" instead of recommendations. Triggered by dismissal pattern.';



COMMENT ON COLUMN "public"."teacher_profiles"."inquiry_mode_triggered_at" IS 'When inquiry mode was activated. Reset when teacher provides feedback.';



COMMENT ON COLUMN "public"."teacher_profiles"."dismissal_pattern_consecutive" IS 'Counter: incremented each time teacher dismisses. Resets when teacher implements. If >=3, triggers inquiry_mode.';



COMMENT ON COLUMN "public"."teacher_profiles"."dismissal_pattern_reason" IS 'Teacher notes on why dismissing (free text). Captured when teacher dismisses, used for L3 tuning.';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "role" "public"."user_role" DEFAULT 'student'::"public"."user_role" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_class_climate_summary" AS
 SELECT "class_id",
    ("date_trunc"('week'::"text", ("created_at" AT TIME ZONE 'UTC'::"text")))::"date" AS "week_start",
    ("count"(*))::integer AS "check_in_count",
        CASE
            WHEN ("count"(DISTINCT "student_id") >= 3) THEN "round"("avg"(
            CASE "mood"
                WHEN 'very_low'::"text" THEN 1
                WHEN 'low'::"text" THEN 2
                WHEN 'neutral'::"text" THEN 3
                WHEN 'good'::"text" THEN 4
                WHEN 'great'::"text" THEN 5
                ELSE 3
            END), 2)
            ELSE NULL::numeric
        END AS "avg_mood",
        CASE
            WHEN ("count"(DISTINCT "student_id") >= 3) THEN "round"("avg"("pace"), 2)
            ELSE NULL::numeric
        END AS "avg_pace",
        CASE
            WHEN ("count"(DISTINCT "student_id") >= 3) THEN "round"("avg"("fairness"), 2)
            ELSE NULL::numeric
        END AS "avg_fairness"
   FROM "public"."student_pulses" "sp"
  GROUP BY "class_id", ("date_trunc"('week'::"text", ("created_at" AT TIME ZONE 'UTC'::"text")));


ALTER VIEW "public"."v_class_climate_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_class_climate_summary" IS 'Aggregated weekly climate data per class from student_pulses. Returns NULL for metrics when fewer than 3 distinct students submitted in that week (k-anonymity). Updated in migration 027 to read from student_pulses instead of deprecated check_ins.';



CREATE OR REPLACE VIEW "public"."v_teacher_recommendation_stats" AS
 SELECT "class_id",
    "count"(*) AS "total_events",
    "count"(*) FILTER (WHERE (("decision_path_json" ->> 'event'::"text") = 'recommendation_approved'::"text")) AS "approved_count",
    "count"(*) FILTER (WHERE (("decision_path_json" ->> 'event'::"text") = 'recommendation_dismissed'::"text")) AS "dismissed_count"
   FROM "public"."n8n_audit_logs"
  GROUP BY "class_id";


ALTER VIEW "public"."v_teacher_recommendation_stats" OWNER TO "postgres";


ALTER TABLE ONLY "public"."action_logs"
    ADD CONSTRAINT "action_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_enrollments"
    ADD CONSTRAINT "class_enrollments_pkey" PRIMARY KEY ("class_id", "student_id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."climate_surveys"
    ADD CONSTRAINT "climate_surveys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n8n_audit_logs"
    ADD CONSTRAINT "n8n_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qr_checkins"
    ADD CONSTRAINT "qr_checkins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_days"
    ADD CONSTRAINT "school_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_days"
    ADD CONSTRAINT "school_days_school_id_date_key" UNIQUE ("school_id", "date");



ALTER TABLE ONLY "public"."school_notification_settings"
    ADD CONSTRAINT "school_notification_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_notification_settings"
    ADD CONSTRAINT "school_notification_settings_school_id_key" UNIQUE ("school_id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_pulses"
    ADD CONSTRAINT "student_pulses_one_per_week" UNIQUE ("student_id", "class_id", "week_start");



ALTER TABLE ONLY "public"."student_pulses"
    ADD CONSTRAINT "student_pulses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_context"
    ADD CONSTRAINT "teacher_context_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_profiles"
    ADD CONSTRAINT "teacher_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_profiles"
    ADD CONSTRAINT "teacher_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_action_logs_actor" ON "public"."action_logs" USING "btree" ("actor_id");



CREATE INDEX "idx_checkins_class" ON "public"."check_ins" USING "btree" ("class_id");



CREATE INDEX "idx_classes_teacher" ON "public"."classes" USING "btree" ("teacher_id");



CREATE INDEX "idx_climate_surveys_date_classroom" ON "public"."climate_surveys" USING "btree" ("survey_date", "class_id");



CREATE INDEX "idx_enrollments_class" ON "public"."class_enrollments" USING "btree" ("class_id");



CREATE INDEX "idx_enrollments_student" ON "public"."class_enrollments" USING "btree" ("student_id");



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("user_id") WHERE ("read" = false);



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_qr_checkins_class_time" ON "public"."qr_checkins" USING "btree" ("class_id", "created_at");



CREATE INDEX "idx_recommendations_class" ON "public"."recommendations" USING "btree" ("class_id");



CREATE INDEX "idx_recommendations_class_created" ON "public"."recommendations" USING "btree" ("class_id", "created_at" DESC);



CREATE INDEX "idx_recommendations_classroom" ON "public"."recommendations" USING "btree" ("class_id", "created_at");



CREATE INDEX "idx_recommendations_status_created" ON "public"."recommendations" USING "btree" ("status", "created_at");



CREATE INDEX "idx_recommendations_teacher_status" ON "public"."recommendations" USING "btree" ("teacher_id", "teacher_approval_status");



CREATE INDEX "idx_school_days_lookup" ON "public"."school_days" USING "btree" ("school_id", "date");



CREATE INDEX "idx_student_pulses_class" ON "public"."student_pulses" USING "btree" ("class_id");



CREATE INDEX "idx_student_pulses_class_created" ON "public"."student_pulses" USING "btree" ("class_id", "created_at" DESC);



CREATE INDEX "idx_student_pulses_created" ON "public"."student_pulses" USING "btree" ("created_at");



CREATE INDEX "idx_teacher_profiles_user" ON "public"."teacher_profiles" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "on_school_created" AFTER INSERT ON "public"."schools" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_school_settings"();



CREATE OR REPLACE TRIGGER "set_recommendations_updated_at" BEFORE UPDATE ON "public"."recommendations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "tr_recommendations_update_class" AFTER INSERT OR UPDATE ON "public"."recommendations" FOR EACH ROW EXECUTE FUNCTION "public"."set_classes_updated_at"();



CREATE OR REPLACE TRIGGER "trg_update_class_risk_level" AFTER INSERT ON "public"."recommendations" FOR EACH ROW EXECUTE FUNCTION "public"."update_class_risk_level"();



ALTER TABLE ONLY "public"."action_logs"
    ADD CONSTRAINT "action_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_enrollments"
    ADD CONSTRAINT "class_enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_enrollments"
    ADD CONSTRAINT "class_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."climate_surveys"
    ADD CONSTRAINT "climate_surveys_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qr_checkins"
    ADD CONSTRAINT "qr_checkins_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."school_days"
    ADD CONSTRAINT "school_days_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."school_notification_settings"
    ADD CONSTRAINT "school_notification_settings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_pulses"
    ADD CONSTRAINT "student_pulses_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_pulses"
    ADD CONSTRAINT "student_pulses_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_context"
    ADD CONSTRAINT "teacher_context_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_context"
    ADD CONSTRAINT "teacher_context_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teacher_profiles"
    ADD CONSTRAINT "teacher_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow climate agent insert" ON "public"."recommendations" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Allow insert for anon" ON "public"."n8n_audit_logs" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Allow select for anon" ON "public"."n8n_audit_logs" FOR SELECT TO "anon" USING (true);



ALTER TABLE "public"."action_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "action_logs_actor_select_own" ON "public"."action_logs" FOR SELECT USING (("actor_id" = "auth"."uid"()));



CREATE POLICY "action_logs_insert_own" ON "public"."action_logs" FOR INSERT WITH CHECK (("actor_id" = "auth"."uid"()));



ALTER TABLE "public"."check_ins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checkins_student_insert_own" ON "public"."check_ins" FOR INSERT WITH CHECK (("student_id" = "auth"."uid"()));



CREATE POLICY "checkins_student_select_own" ON "public"."check_ins" FOR SELECT USING (("student_id" = "auth"."uid"()));



ALTER TABLE "public"."class_enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."classes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "classes_teacher_insert_own" ON "public"."classes" FOR INSERT WITH CHECK (("teacher_id" = "auth"."uid"()));



CREATE POLICY "classes_teacher_select_own" ON "public"."classes" FOR SELECT USING (("teacher_id" = "auth"."uid"()));



CREATE POLICY "classes_teacher_update_own" ON "public"."classes" FOR UPDATE USING (("teacher_id" = "auth"."uid"())) WITH CHECK (("teacher_id" = "auth"."uid"()));



ALTER TABLE "public"."climate_surveys" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "enrollments_student_insert_own" ON "public"."class_enrollments" FOR INSERT WITH CHECK (("student_id" = "auth"."uid"()));



CREATE POLICY "enrollments_student_select_own" ON "public"."class_enrollments" FOR SELECT USING (("student_id" = "auth"."uid"()));



CREATE POLICY "enrollments_teacher_delete_class" ON "public"."class_enrollments" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "class_enrollments"."class_id") AND ("c"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "enrollments_teacher_select_class" ON "public"."class_enrollments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "class_enrollments"."class_id") AND ("c"."teacher_id" = "auth"."uid"())))));



ALTER TABLE "public"."error_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."n8n_audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qr_checkins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "qr_checkins_anon_insert" ON "public"."qr_checkins" FOR INSERT WITH CHECK (true);



CREATE POLICY "qr_checkins_no_select" ON "public"."qr_checkins" FOR SELECT USING (false);



ALTER TABLE "public"."recommendations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recommendations_student_select_communicated" ON "public"."recommendations" FOR SELECT USING ((("communicated_to_students" = true) AND ("status" = 'approved'::"public"."recommendation_status") AND (EXISTS ( SELECT 1
   FROM "public"."class_enrollments"
  WHERE (("class_enrollments"."class_id" = "recommendations"."class_id") AND ("class_enrollments"."student_id" = "auth"."uid"()))))));



CREATE POLICY "recommendations_teacher_approve" ON "public"."recommendations" FOR UPDATE USING ((("teacher_id" = "auth"."uid"()) AND (("teacher_approval_status" = 'pending'::"text") OR ("teacher_approval_status" IS NULL)))) WITH CHECK ((("teacher_id" = "auth"."uid"()) AND (("teacher_approval_status" = ANY (ARRAY['approved'::"text", 'dismissed'::"text"])) OR ("teacher_approval_status" IS NULL))));



CREATE POLICY "recommendations_teacher_select" ON "public"."recommendations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "recommendations"."class_id") AND ("classes"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "recommendations_teacher_update" ON "public"."recommendations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "recommendations"."class_id") AND ("classes"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "recommendations_teacher_view" ON "public"."recommendations" FOR SELECT USING (("teacher_id" = "auth"."uid"()));



ALTER TABLE "public"."school_days" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "school_days_school_view" ON "public"."school_days" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."school_id" = "school_days"."school_id") AND ("c"."teacher_id" = "auth"."uid"())))));



ALTER TABLE "public"."school_notification_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_full_access_climate_surveys" ON "public"."climate_surveys" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "service_role_full_access_error_logs" ON "public"."error_logs" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "service_role_full_access_recommendations" ON "public"."recommendations" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."student_pulses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "student_pulses_access_via_rpc" ON "public"."student_pulses" FOR SELECT USING (false);



COMMENT ON POLICY "student_pulses_access_via_rpc" ON "public"."student_pulses" IS 'Enforces k-anonymity: raw mood data never sent to clients. Only aggregates via get_class_climate_summary() RPC with k≥3 guard.';



CREATE POLICY "student_pulses_insert_anon" ON "public"."student_pulses" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "student_pulses_no_select_authenticated" ON "public"."student_pulses" FOR SELECT TO "authenticated" USING (false);



CREATE POLICY "student_pulses_select_service_only" ON "public"."student_pulses" FOR SELECT TO "service_role" USING (true);



ALTER TABLE "public"."teacher_context" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teacher_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teacher_profiles_self_update" ON "public"."teacher_profiles" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "teacher_profiles_self_view" ON "public"."teacher_profiles" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "teacher_reads_own_recommendations" ON "public"."recommendations" FOR SELECT USING (("class_id" IN ( SELECT "classes"."id"
   FROM "public"."classes"
  WHERE ("classes"."teacher_id" = "auth"."uid"()))));



CREATE POLICY "teacher_updates_own_recommendations" ON "public"."recommendations" FOR UPDATE USING (("class_id" IN ( SELECT "classes"."id"
   FROM "public"."classes"
  WHERE ("classes"."teacher_id" = "auth"."uid"()))));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_read_self" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "users_update_own" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_k_anonymity_status"("p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_k_anonymity_status"("p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_k_anonymity_status"("p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_frequency_limit"("p_class_id" "uuid", "p_max_daily" integer, "p_max_weekly" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_frequency_limit"("p_class_id" "uuid", "p_max_daily" integer, "p_max_weekly" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_frequency_limit"("p_class_id" "uuid", "p_max_daily" integer, "p_max_weekly" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_school_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_school_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_school_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_adoption_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_adoption_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_adoption_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_aggregated_climate_data"("p_date" "date", "p_min_n" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_aggregated_climate_data"("p_date" "date", "p_min_n" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_aggregated_climate_data"("p_date" "date", "p_min_n" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_school_schedules"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_school_schedules"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_school_schedules"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_class_climate_summary"("p_class_id" "uuid", "p_weeks" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_class_climate_summary"("p_class_id" "uuid", "p_weeks" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_class_climate_summary"("p_class_id" "uuid", "p_weeks" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teacher_classes_summary"("p_teacher_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_teacher_classes_summary"("p_teacher_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teacher_classes_summary"("p_teacher_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teacher_metrics"("p_class_id" "uuid", "p_lookback_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_teacher_metrics"("p_class_id" "uuid", "p_lookback_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teacher_metrics"("p_class_id" "uuid", "p_lookback_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_teacher_response_rate"("p_class_id" "uuid", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_teacher_response_rate"("p_class_id" "uuid", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_teacher_response_rate"("p_class_id" "uuid", "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_trend_comparison"("p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_trend_comparison"("p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_trend_comparison"("p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_classes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_classes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_classes_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_archive_class"("class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_archive_class"("class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_archive_class"("class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_recommendation_safe"("p_class_id" "uuid", "p_content" "text", "p_category" "text", "p_priority" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_recommendation_safe"("p_class_id" "uuid", "p_content" "text", "p_category" "text", "p_priority" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_recommendation_safe"("p_class_id" "uuid", "p_content" "text", "p_category" "text", "p_priority" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_class_risk_level"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_class_risk_level"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_class_risk_level"() TO "service_role";



GRANT ALL ON TABLE "public"."action_logs" TO "anon";
GRANT ALL ON TABLE "public"."action_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."action_logs" TO "service_role";



GRANT ALL ON TABLE "public"."check_ins" TO "anon";
GRANT ALL ON TABLE "public"."check_ins" TO "authenticated";
GRANT ALL ON TABLE "public"."check_ins" TO "service_role";



GRANT ALL ON TABLE "public"."class_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."class_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."class_enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."classes" TO "anon";
GRANT ALL ON TABLE "public"."classes" TO "authenticated";
GRANT ALL ON TABLE "public"."classes" TO "service_role";



GRANT ALL ON TABLE "public"."climate_surveys" TO "anon";
GRANT ALL ON TABLE "public"."climate_surveys" TO "authenticated";
GRANT ALL ON TABLE "public"."climate_surveys" TO "service_role";



GRANT ALL ON TABLE "public"."error_logs" TO "anon";
GRANT ALL ON TABLE "public"."error_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."error_logs" TO "service_role";



GRANT ALL ON TABLE "public"."n8n_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."n8n_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."n8n_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."qr_checkins" TO "anon";
GRANT ALL ON TABLE "public"."qr_checkins" TO "authenticated";
GRANT ALL ON TABLE "public"."qr_checkins" TO "service_role";



GRANT ALL ON TABLE "public"."recommendations" TO "anon";
GRANT ALL ON TABLE "public"."recommendations" TO "authenticated";
GRANT ALL ON TABLE "public"."recommendations" TO "service_role";



GRANT ALL ON TABLE "public"."school_days" TO "anon";
GRANT ALL ON TABLE "public"."school_days" TO "authenticated";
GRANT ALL ON TABLE "public"."school_days" TO "service_role";



GRANT ALL ON TABLE "public"."school_notification_settings" TO "anon";
GRANT ALL ON TABLE "public"."school_notification_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."school_notification_settings" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."student_pulses" TO "anon";
GRANT ALL ON TABLE "public"."student_pulses" TO "authenticated";
GRANT ALL ON TABLE "public"."student_pulses" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_context" TO "anon";
GRANT ALL ON TABLE "public"."teacher_context" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_context" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_profiles" TO "anon";
GRANT ALL ON TABLE "public"."teacher_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."v_class_climate_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_class_climate_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_class_climate_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_teacher_recommendation_stats" TO "anon";
GRANT ALL ON TABLE "public"."v_teacher_recommendation_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."v_teacher_recommendation_stats" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







