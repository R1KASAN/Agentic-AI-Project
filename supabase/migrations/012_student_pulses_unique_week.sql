-- Migration 012: Prevent duplicate check-ins per student per class per week.
-- Rationale: Without this, a student can submit unlimited check-ins per week,
-- skewing all aggregate averages and breaking teacher dashboard trust.
--
-- Strategy:
--   1. Add a computed week_start column (Monday of ISO week) with DEFAULT.
--   2. Backfill existing rows.
--   3. Create UNIQUE constraint on (student_id, class_id, week_start).
--   4. API route will check before INSERT + handle UNIQUE violation as fallback.

-- Step 0: Add student_id column if it doesn't exist (required for M01 duplicate guard)
ALTER TABLE public.student_pulses
    ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Step 1: Add week_start column (date of the Monday of the ISO week)
ALTER TABLE public.student_pulses
    ADD COLUMN IF NOT EXISTS week_start DATE
    GENERATED ALWAYS AS (date_trunc('week', created_at AT TIME ZONE 'UTC')::date) STORED;

-- Step 2: Create unique constraint
-- Uses the stored generated column for reliable, indexable uniqueness.
-- ON CONFLICT DO NOTHING will silently reject duplicates at the DB level.
ALTER TABLE public.student_pulses
    ADD CONSTRAINT student_pulses_one_per_week
    UNIQUE (student_id, class_id, week_start);

-- Step 3: Add a comment for documentation
COMMENT ON COLUMN public.student_pulses.week_start IS
    'Computed column: Monday of ISO week from created_at. Used for UNIQUE(student_id, class_id, week_start) to enforce one check-in per student per class per week. Added in M01 audit fix (2026-02-22).';
