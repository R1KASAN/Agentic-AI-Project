-- Migration 033: Make student check-ins unique per student per class per UTC day.
-- Rationale: students should be able to check in once per day per class while
-- retaining weekly aggregates and feedback views that still depend on week_start.
--
-- Scope:
--   1. Add a generated checkin_date column (UTC calendar day from created_at).
--   2. Deterministically dedupe any same-day legacy rows, keeping the earliest row.
--   3. Replace the weekly unique constraint with a daily unique constraint.
--   4. Refresh comments so the schema docs match the new behavior.

-- Step 1: Add a generated UTC calendar-day column.
ALTER TABLE public.student_pulses
    ADD COLUMN IF NOT EXISTS checkin_date DATE
    GENERATED ALWAYS AS (date_trunc('day', created_at AT TIME ZONE 'UTC')::date) STORED;

-- Step 2: Deduplicate any same-day legacy rows before the new unique constraint lands.
-- Keep the earliest row for each student/class/day combination to minimize impact.
WITH ranked_checkins AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY student_id, class_id, checkin_date
            ORDER BY created_at ASC, id ASC
        ) AS rn
    FROM public.student_pulses
    WHERE student_id IS NOT NULL
)
DELETE FROM public.student_pulses sp
USING ranked_checkins rc
WHERE sp.id = rc.id
  AND rc.rn > 1;

-- Step 3: Swap the weekly uniqueness guard for a daily one.
ALTER TABLE public.student_pulses
    DROP CONSTRAINT IF EXISTS student_pulses_one_per_week;

ALTER TABLE public.student_pulses
    DROP CONSTRAINT IF EXISTS student_pulses_one_per_day;

ALTER TABLE public.student_pulses
    ADD CONSTRAINT student_pulses_one_per_day
    UNIQUE (student_id, class_id, checkin_date);

-- Step 4: Keep the legacy week_start column, but clarify its role.
COMMENT ON COLUMN public.student_pulses.checkin_date IS
    'Computed UTC calendar day from created_at. Used for UNIQUE(student_id, class_id, checkin_date) to enforce one check-in per student per class per day.';

COMMENT ON COLUMN public.student_pulses.week_start IS
    'Computed column: Monday of ISO week from created_at. Retained for weekly aggregate and feedback queries.';
