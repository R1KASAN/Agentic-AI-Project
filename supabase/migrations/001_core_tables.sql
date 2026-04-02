-- Migration: 001_core_tables
-- Creates: users, classes, class_enrollments
-- Privacy: RLS enabled on all tables

-- ============================================================
-- 1. Custom Types
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TYPE public.user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE public.recommendation_status AS ENUM ('pending', 'approved', 'dismissed');

-- ============================================================
-- 2. Users (extends auth.users)
-- ============================================================
CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.user_role NOT NULL DEFAULT 'student',
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.users IS 'Public user profile extending Supabase Auth. Role determines dashboard access.';

-- ============================================================
-- 3. Classes
-- ============================================================
CREATE TABLE public.classes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  risk_score    REAL NOT NULL DEFAULT 0.0 CHECK (risk_score >= 0.0 AND risk_score <= 1.0),
  pilot_status  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_classes_teacher ON public.classes(teacher_id);

COMMENT ON TABLE public.classes IS 'A class/section managed by a teacher. risk_score is a cached hybrid score (0-1).';

-- ============================================================
-- 4. Class Enrollments (junction)
-- ============================================================
CREATE TABLE public.class_enrollments (
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, student_id)
);

ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_enrollments_student ON public.class_enrollments(student_id);

COMMENT ON TABLE public.class_enrollments IS 'Maps students to classes for access control.';
