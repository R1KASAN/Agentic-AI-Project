# Implementation Tasks: Sitemap & Navigation

**Feature**: `1-sitemap-navigation`
**Source Specification**: `specs/1-sitemap-navigation/spec.md`
**Implementation Plan**: `specs/1-sitemap-navigation/plan.md`

## Phase 1: Setup
**Goal**: Initialize the Next.js project and configure base dependencies.

- [x] T001 Initialize Next.js project (App Router, TypeScript, Tailwind) in `src/` <!-- type: setup -->
- [x] T002 Install dependencies (`@supabase/supabase-js`, `@supabase/auth-helpers-nextjs`, `lucide-react`, `recharts`, `clsx`, `tailwind-merge`) <!-- type: setup -->
- [x] T003 Configure Environment Variables (`.env.local`) with Supabase keys <!-- type: setup -->
- [x] T004 Setup Supabase Client utilities in `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts` <!-- type: setup -->
- [x] T005 Setup Shadcn UI or basic Tailwind components in `src/components/ui/` <!-- type: setup -->

## Phase 2: Foundation (Database & Auth)
**Goal**: Establish the database schema, RLS policies, and core routing security.

- [x] T006 Create SQL migration for `users`, `classes`, `class_enrollments` tables in `supabase/migrations/` <!-- type: backend -->
- [x] T007 Create SQL migration for `check_ins`, `recommendations`, `action_logs` tables in `supabase/migrations/` <!-- type: backend -->
- [x] T008 Implement RLS policies for all tables (Strict Privacy enforcement) in `supabase/migrations/` <!-- type: backend -->
- [x] T009 Create `v_class_climate_summary` Secure View for aggregation in `supabase/migrations/` <!-- type: backend -->
- [x] T010 Seed database with test users (Student/Teacher/Admin) and classes <!-- type: backend -->
- [x] T011 Implement `middleware.ts` for Role-Based Routing (Auth + Role guard, redirect to `/login` or role home) <!-- type: backend -->

## Phase 2.5: Security & Privacy Checks
**Goal**: Ensure no raw sensitive data leaks to unauthorized roles.

- [x] T0A1 [SEC] Verify no API route returns raw `check_ins` rows to Teacher/Admin (only aggregated data via `v_class_climate_summary`) <!-- type: backend -->
- [x] T0A2 [SEC] Manual Test: Teacher/Admin cannot access `/student/*` routes or student-only APIs (receive redirect or 403) <!-- type: test -->

## Phase 3: User Story 1 (Unified Login & Routing)
**Goal**: Users can log in and are routed to their role-specific dashboard.

- [x] T012 [US1] Create Login Page with Supabase Auth UI in `src/app/(auth)/login/page.tsx` <!-- type: frontend -->
- [x] T013 [US1] Create Root Layout with Auth Provider in `src/app/layout.tsx` <!-- type: frontend -->
- [x] T014 [US1] Create Role Layout Skeleton for Student in `src/app/(dashboard)/student/layout.tsx` <!-- type: frontend -->
- [x] T015 [US1] Create Role Layout Skeleton for Teacher in `src/app/(dashboard)/teacher/layout.tsx` <!-- type: frontend -->
- [x] T016 [US1] Create Role Layout Skeleton for Admin in `src/app/(dashboard)/admin/layout.tsx` <!-- type: frontend -->
- [x] T017 [US1] Manual Test: Verify Login redirects to correct path based on role <!-- type: test -->

## Phase 4: User Story 2 (Student Daily Pulse)
**Goal**: Students can submit anonymous daily check-ins quickly (< 20s).

- [x] T018 [US2] Create Check-in Form Component with React Hook Form in `src/components/domain/student/CheckInForm.tsx` <!-- type: frontend -->
- [x] T019 [US2] Implement "Anonymity Guaranteed" Toggle and UI Badge in `src/components/domain/student/CheckInForm.tsx` <!-- type: frontend -->
- [x] T020 [US2] Implement Form Submission Logic (Insert to `check_ins`) in `src/app/(dashboard)/student/check-in/page.tsx` <!-- type: frontend -->
- [x] T021 [US2] Create Success/Thank You State after submission in `src/components/domain/student/CheckInSuccess.tsx` <!-- type: frontend -->
- [x] T022 [US2] Manual Test: Verify check-in submission persists in DB <!-- type: test -->

## Phase 5: User Story 3 (Student Feedback Loop)
**Goal**: Students see aggregate class trends and teacher actions.

- [x] T023 [US3] Create Backend API/RPC to fetch aggregate data (checking n >= 3) in `src/app/api/student/feedback/route.ts` <!-- type: backend --> (must use DB View/RPC enforcing k-anonymity, never return raw `check_ins`)
- [x] T024 [US3] Create Feedback Page UI with "Not Enough Data" state in `src/app/(dashboard)/student/feedback/page.tsx` <!-- type: frontend -->
- [x] T025 [US3] Implement Recharts visualization for Mood/Pace/Fairness in `src/components/domain/student/ClimateCharts.tsx` <!-- type: frontend -->
- [x] T026 [US3] Display "Recent Actions" list from Teacher in `src/components/domain/student/ActionList.tsx` <!-- type: frontend --> (can be stubbed initially, then wired to `recommendations`/`action_logs` after US4 is implemented)
- [x] T0B1 [PRIVACY] Manual Test: `/student/feedback` hides aggregate charts and shows "Not Enough Data" state when class responses < 3 <!-- type: test -->

## Phase 6: User Story 4 (Teacher Sanity Dashboard)
**Goal**: Teachers see a weekly TL;DR and can approve/dismiss actions.

- [x] T027 [US4] Create Teacher Dashboard (Class List) in `src/app/(dashboard)/teacher/page.tsx` <!-- type: frontend -->
- [x] T028 [US4] Create Class Detail View (Weekly Summary) in `src/app/(dashboard)/teacher/class/[id]/page.tsx` <!-- type: frontend -->
- [x] T029 [US4] Implement "Risk Indicator" Component in `src/components/domain/teacher/RiskIndicator.tsx` <!-- type: frontend -->
- [x] T030 [US4] Create Recommendation List Component with Approve/Dismiss buttons in `src/components/domain/teacher/RecommendationList.tsx` <!-- type: frontend -->
- [x] T031 [US4] Implement Action Approval Logic (Update `recommendations` + Insert `action_logs`) in `src/lib/actions/teacher.ts` <!-- type: backend -->

## Phase 7: User Story 5 (Admin Oversight)
**Goal**: Admin can track adoption metrics.

- [x] T032 [US5] Create Admin Metrics Dashboard in `src/app/(dashboard)/admin/metrics/page.tsx` <!-- type: frontend -->
- [x] T033 [US5] Implement Usage Stats Components (Check-in Rate, Loop Closure Rate based on `check_ins`, `recommendations`, and `action_logs`) in `src/components/domain/admin/UsageStats.tsx` <!-- type: frontend -->
- [x] T034 [US5] Create Audit Log View in `src/app/(dashboard)/admin/audit/page.tsx` <!-- type: frontend -->

## Phase 8: Polish & Cross-Cutting
**Goal**: Finalize UX and ensure robust error handling.

- [x] T035 Create 403 Forbidden and 404 Not Found Pages in `src/app/not-found.tsx` and `src/app/forbidden.tsx` <!-- type: polish -->
- [x] T036 Verify Mobile Responsiveness for Student Check-in flow <!-- type: polish -->
- [x] T037 Verify "Teacher Sanity" Dashboard loads < 2s with mock data <!-- type: polish -->
- [x] T038 Final Code Review against Constitution (Privacy Check) <!-- type: audit -->

## Dependencies
- **Phase 1 & 2** are blocking for all User Stories.
- **US1** is blocking for US2, US3, US4, US5.
- **US2** (Data Ingestion) is blocking for US3 (Data Visualization) and US4 (Dashboard).
- **US4** (Teacher Actions) is blocking for US3 ("Action Taken" display) loop closure.

## Implementation Strategy
Start with **Phase 1 & 2** to get the skeleton running. Then implement **US1** to get users logging in. Prioritize **US2** (Student Check-in) as it's the data source. **US4** (Teacher) is next priority for "Closing the Loop".
