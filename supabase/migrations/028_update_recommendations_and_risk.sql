-- Migration: 028_update_recommendations_and_risk
-- Purpose: Update recommendations table schema for n8n AI output + add risk_level to classes

-- ============================================================================
-- 1. Add new columns to recommendations table (if not exist)
-- ============================================================================
DO $$
BEGIN
    -- Add policy_level column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'recommendations' AND column_name = 'policy_level') THEN
        ALTER TABLE public.recommendations
        ADD COLUMN policy_level TEXT NOT NULL DEFAULT 'ROUTINE'
        CHECK (policy_level IN ('ROUTINE', 'WARNING', 'CRITICAL'));
    END IF;

    -- Add ai_message_draft column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'recommendations' AND column_name = 'ai_message_draft') THEN
        ALTER TABLE public.recommendations ADD COLUMN ai_message_draft TEXT;
    END IF;

    -- Add actions_json column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'recommendations' AND column_name = 'actions_json') THEN
        ALTER TABLE public.recommendations ADD COLUMN actions_json JSONB;
    END IF;

    -- Add confidence_score column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'recommendations' AND column_name = 'confidence_score') THEN
        ALTER TABLE public.recommendations ADD COLUMN confidence_score FLOAT8;
    END IF;

    -- Add reasoning column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'recommendations' AND column_name = 'reasoning') THEN
        ALTER TABLE public.recommendations ADD COLUMN reasoning TEXT;
    END IF;

    -- Add inquiry_mode column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'recommendations' AND column_name = 'inquiry_mode') THEN
        ALTER TABLE public.recommendations ADD COLUMN inquiry_mode BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    -- Add fallback_used column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'recommendations' AND column_name = 'fallback_used') THEN
        ALTER TABLE public.recommendations ADD COLUMN fallback_used BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    -- Add priority column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'recommendations' AND column_name = 'priority') THEN
        ALTER TABLE public.recommendations
        ADD COLUMN priority TEXT NOT NULL DEFAULT 'NORMAL'
        CHECK (priority IN ('NORMAL', 'HIGH', 'URGENT'));
    END IF;

    -- Add alert_sent_at column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'recommendations' AND column_name = 'alert_sent_at') THEN
        ALTER TABLE public.recommendations ADD COLUMN alert_sent_at TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================================================
-- 2. Add risk_level column to classes table
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'classes' AND column_name = 'risk_level') THEN
        ALTER TABLE public.classes ADD COLUMN risk_level TEXT
        CHECK (risk_level IN ('ROUTINE', 'WARNING', 'CRITICAL'));
    END IF;
END $$;

-- ============================================================================
-- 3. Add RLS policies for teacher access to recommendations
-- ============================================================================

-- Enable RLS on recommendations (if not already enabled)
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- Drop existing teacher policy if exists
DROP POLICY IF EXISTS "teacher_reads_own_recommendations" ON public.recommendations;

-- Create policy for teachers to read recommendations for their classes
CREATE POLICY "teacher_reads_own_recommendations" ON public.recommendations
FOR SELECT
USING (
    class_id IN (
        SELECT id FROM public.classes WHERE teacher_id = auth.uid()
    )
);

-- Drop existing update policy if exists
DROP POLICY IF EXISTS "teacher_updates_own_recommendations" ON public.recommendations;

-- Create policy for teachers to update (approve/dismiss) recommendations for their classes
CREATE POLICY "teacher_updates_own_recommendations" ON public.recommendations
FOR UPDATE
USING (
    class_id IN (
        SELECT id FROM public.classes WHERE teacher_id = auth.uid()
    )
);

-- ============================================================================
-- 4. Create function to update class risk_level from latest recommendation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_class_risk_level()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update class risk_level when recommendation is inserted
DROP TRIGGER IF EXISTS trg_update_class_risk_level ON public.recommendations;
CREATE TRIGGER trg_update_class_risk_level
    AFTER INSERT ON public.recommendations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_class_risk_level();

-- ============================================================================
-- 5. Migration comments
-- ============================================================================
COMMENT ON TABLE public.recommendations IS 'AI-generated recommendations from n8n workflow. Teachers must approve/dismiss. Fields policy_level, ai_message_draft, actions_json, confidence_score match n8n output.';
COMMENT ON COLUMN public.recommendations.policy_level IS 'AI policy level: ROUTINE (mood >= 3.5), WARNING (2.5 <= mood < 3.5), CRITICAL (mood < 2.5)';
COMMENT ON COLUMN public.classes.risk_level IS 'Latest recommendation policy_level. Updated via trigger when new recommendation inserted.';
