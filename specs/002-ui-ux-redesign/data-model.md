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
- `mood` (varchar/enum, constraint: emoji or category)
- `pace` (integer, e.g., 1-5 scale)
- `fairness` (integer, e.g., 1-5 scale)
- `optional_text` (text, nullable)
- `created_at` (timestamp)
**Security Note**: RLS policy MUST block SELECT access to `optional_text` for roles `authenticated` (Teachers/Admins). Only `service_role` (N8N) can read this column.

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
- `ai_model` (varchar, default 'gpt-4o')
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
