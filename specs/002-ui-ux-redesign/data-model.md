# Data Model: Climate Agent UI/UX Redesign

This document outlines the specific additions and modifications to the Supabase Postgres schema required for the redesign and N8N integrations.

## Entity: `classes` (Modifications)
Adds tracking fields for N8N health score computations and dynamic risk levels.
- `risk_score` (integer, 0-100)
- `checkin_rate_current_week` (decimal, percentage calculated by cron)
- `loop_closure_rate` (decimal, percentage calculated by cron)

## Entity: `schools` (Modifications)
Adds tracking for business churn prevention.
- `health_score` (integer, 0-100)
- `last_calculated` (timestamp)

## Entity: `student_pulses` (New or Modified)
Captures the <20s student check-in.
- `id` (uuid, primary key)
- `class_id` (uuid, foreign key to classes)
- `mood` (TEXT, NOT NULL) — Enum: `'very_low'`,`'low'`,`'okay'`,`'good'`,`'great'`. Maps from EmojiPickerToggle (1-5 scale). CHECK constraint enforced at DB level (`009_canonicalize_mood.sql`).
- `pace` (integer, 1-5 scale)
- `fairness` (integer, 1-5 scale)
- `optional_text` (text, nullable) — Raw student comment text. **AUTO-NULLED after 60 days** via `pg_cron` job (`010_retention_policy.sql`). Never returned to teacher/admin role (RLS `008_student_pulses_rls.sql`).
- `created_at` (timestamp)

**Security Note**: RLS policy (`008_student_pulses_rls.sql`) blocks ALL `SELECT` for `authenticated` role. Only `service_role` (N8N) can read. Teachers/admins access data ONLY via `get_class_climate_summary()` SECURITY DEFINER RPC.

**Retention Policy**: `optional_text` is automatically set to `NULL` by daily `pg_cron` job (`purge-optional-text-60d`) at 02:00 UTC for rows older than 60 days. Row is preserved for aggregate analytics.

> **Note**: The legacy `check_ins` table (002 migration) is DEPRECATED as of 2026-02-21. All new writes go to `student_pulses`.

## Entity: `recommendations` (Teacher Actions Inbox)
Stores the generated AI drafts and teacher decisions.
- `id` (uuid, primary key)
- `class_id` (uuid, foreign key to classes)
- `content` (text)
- `priority` (enum: 'high', 'medium', 'low')
- `category` (enum: 'engagement', 'wellbeing', 'collaboration', 'academic')
- `status` (enum: 'pending', 'approved', 'dismissed', 'edited')
- `dismissal_reason` (text, nullable)
- `ai_generated` (boolean, default true)
- `ai_model` (varchar, default 'gemini-2.0-flash') — LLM model used. See migration 011. Constitution v1.3.0 §V.
- `raw_climate_snapshot` (jsonb, for auditability of what data generated this draft)
- `communicated_to_students` (boolean, default false)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Entity: `notifications` (Loop Closure / Nudges)
Stores internal notifications primarily useful for triggering loop closure badges.
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to users/students)
- `type` (enum: 'loop_closure', 'reminder')
- `message` (text)
- `class_id` (uuid, foreign key to classes, nullable)
- `read` (boolean, default false)
- `created_at` (timestamp)

## Required Database Functions (RPCs)
- `get_class_climate_summary(class_id, weeks)`: Returns an aggregated dataset (averages) hiding exact counts if `n < 3`.
- `calculate_k_anonymity_status(class_id)`: Returns boolean indicating whether charts can be shown to the frontend.
