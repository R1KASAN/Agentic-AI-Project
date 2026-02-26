-- Migration: 009_canonicalize_mood
-- T036: Resolve mood schema type conflict (speckit.analyze v2 — C5)
-- Canonical values: very_low | low | okay | good | great
-- Maps from CheckInForm EmojiPickerToggle (1-5 scale) via API route

-- ============================================================
-- 1. Add CHECK constraint on student_pulses.mood
-- ============================================================
ALTER TABLE public.student_pulses
  ADD CONSTRAINT mood_valid_enum CHECK (
    mood IN ('very_low', 'low', 'okay', 'good', 'great')
  );

-- ============================================================
-- 2. Document the mood column
-- ============================================================
COMMENT ON COLUMN public.student_pulses.mood IS
  'TEXT enum: very_low|low|okay|good|great. Maps from EmojiPickerToggle (1=very_low ... 5=great). SMALLINT mood field in check_ins table is deprecated.';

-- ============================================================
-- 3. Deprecate check_ins table (DO NOT DROP — data audit pending)
-- ============================================================
COMMENT ON TABLE public.check_ins IS
  'DEPRECATED as of 2026-02-21. Superseded by student_pulses (005 migration). Do not write new data here. All check-in writes now go through student_pulses via api/student/check-in/route.ts.';

-- ============================================================
-- Verification:
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid = 'public.student_pulses'::regclass AND contype = 'c';
-- ============================================================
