-- ====================================================================
-- Migration 019: Remove Admin Role
-- ====================================================================
-- Drops all admin-specific RLS policies and removes 'admin' from
-- the user_role enum. Only 'student' and 'teacher' roles remain.
--
-- Fix: Column has DEFAULT 'student' which must be dropped before the
-- column type can be changed. Default is restored after enum swap.
-- ====================================================================

BEGIN;

-- ── 1. Migrate any existing admin users to teacher ───────────────
UPDATE public.users SET role = 'teacher' WHERE role = 'admin';

-- ── 2. Drop admin-specific RLS policies ──────────────────────────

DROP POLICY IF EXISTS "users_admin_select_all"            ON public.users;
DROP POLICY IF EXISTS "classes_admin_select_all"          ON public.classes;
DROP POLICY IF EXISTS "classes_admin_all"                 ON public.classes;
DROP POLICY IF EXISTS "enrollments_admin_select_all"      ON public.class_enrollments;
DROP POLICY IF EXISTS "recommendations_admin_select_all"  ON public.recommendations;
DROP POLICY IF EXISTS "action_logs_admin_select_all"      ON public.action_logs;
DROP POLICY IF EXISTS "admin_manage_settings"             ON public.school_notification_settings;

-- ── 3. Recreate user_role enum without 'admin' ──────────────────
-- Postgres does not support ALTER TYPE ... DROP VALUE.
-- We rename the old enum, create a new one, migrate the column,
-- restore the default, then drop the old type.

-- Step 3a: Drop the column default (REQUIRED before type change)
ALTER TABLE public.users
  ALTER COLUMN role DROP DEFAULT;

-- Step 3b: Rename the old enum out of the way
ALTER TYPE public.user_role RENAME TO user_role_old;

-- Step 3c: Create the new restricted enum
CREATE TYPE public.user_role AS ENUM ('student', 'teacher');

-- Step 3d: Migrate the column to the new enum type
ALTER TABLE public.users
  ALTER COLUMN role TYPE public.user_role
  USING role::text::public.user_role;

-- Step 3e: Restore the column default using the new type
ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT 'student'::public.user_role;

-- Step 3f: Drop the now-unused old enum
DROP TYPE public.user_role_old;

COMMIT;
