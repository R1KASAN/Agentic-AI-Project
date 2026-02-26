-- Migration: 010_retention_policy
-- T037: Implement 60-day data retention enforcement (speckit.analyze v2 — C4)
-- Constitution §I: Privacy-by-Design
-- optional_text must be nulled (not deleted) after 60 days.
-- Row preserved for aggregate analytics; text content is destroyed.

-- ============================================================
-- 1. Enable pg_cron extension
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================
-- 2. Schedule daily optional_text nullification at 02:00 UTC
-- ============================================================
SELECT cron.schedule(
  'purge-optional-text-60d',
  '0 2 * * *',
  $$
    UPDATE public.student_pulses
    SET optional_text = NULL
    WHERE optional_text IS NOT NULL
      AND created_at < now() - interval '60 days';
  $$
);

-- ============================================================
-- 3. One-time backfill: purge already-expired rows
-- ============================================================
UPDATE public.student_pulses
SET optional_text = NULL
WHERE optional_text IS NOT NULL
  AND created_at < now() - interval '60 days';

-- ============================================================
-- 4. Also purge legacy check_ins.content (deprecated table)
-- ============================================================
UPDATE public.check_ins
SET content = NULL
WHERE content IS NOT NULL
  AND created_at < now() - interval '60 days';

-- ============================================================
-- Verification:
-- SELECT job_name, schedule, active FROM cron.job
-- WHERE job_name = 'purge-optional-text-60d';
-- ============================================================
