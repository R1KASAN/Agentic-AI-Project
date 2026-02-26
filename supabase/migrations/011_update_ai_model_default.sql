-- Migration: 011_update_ai_model_default
-- T038: Constitutional Amendment — LLM Model Migration (Option B)
-- Constitution v1.3.0 §V: Gemini API mandated for all AI reasoning
-- Migrated from GPT-4o to Gemini 2.0 Flash

-- ============================================================
-- 1. Update default AI model on recommendations table
-- ============================================================
ALTER TABLE public.recommendations
  ALTER COLUMN ai_model SET DEFAULT 'gemini-2.0-flash';

-- ============================================================
-- 2. Update existing rows that still reference gpt-4o
-- ============================================================
UPDATE public.recommendations
SET ai_model = 'gemini-2.0-flash'
WHERE ai_model = 'gpt-4o';

-- ============================================================
-- 3. Document the column
-- ============================================================
COMMENT ON COLUMN public.recommendations.ai_model IS
  'LLM model used to generate this recommendation. Default: gemini-2.0-flash (Constitution v1.3.0 §V). Migrated from gpt-4o on 2026-02-21.';
