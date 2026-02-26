# Tasks: Climate Agent UI/UX Redesign & N8N Automation

**Input**: Design documents from `/specs/002-ui-ux-redesign/`
**Prerequisites**: plan.md (required), spec.md, research.md, data-model.md, contracts/

---

## 🚨 Phase 0: Critical Remediation (BLOCKING DEPLOYMENT)

**Source**: `/speckit.analyze` v2 report (2026-02-21) — 5 CRITICAL findings
**Purpose**: Fix privacy leaks, schema conflicts, and constitutional violations before any further deployment.

- [x] T034 [CRITICAL] Write Supabase migration `008_student_pulses_rls.sql` in `supabase/migrations/`
  - Add INSERT-only policy for anonymous check-in submission
  - Add `USING(false)` SELECT block for teacher/admin/authenticated roles on `optional_text`
  - Add `service_role`-only bypass for N8N aggregate reads
  - **Acceptance**: Verify via Supabase client with teacher JWT → `SELECT * FROM student_pulses` returns 0 rows
  - **Effort**: 1h

- [x] T035 [CRITICAL] Consolidate dual check-in write paths | Depends on: T036
  - Delete `src/app/(student)/check-in/actions.ts` (unauthenticated path)
  - Ensure ALL check-in writes route through `src/app/api/student/check-in/route.ts`
  - Decide canonical table: `student_pulses` (with mood as TEXT enum)
  - Update form submission in `src/app/(dashboard)/student/check-in/page.tsx` to call `/api/student/check-in`
  - **Acceptance**: Single INSERT path, `student_id` always present, auth always verified
  - **Effort**: 2h

- [x] T036 [CRITICAL] Resolve mood schema type conflict
  - Canonicalize: `mood = TEXT` enum (`'great'`,`'okay'`,`'stressed'`,`'bored'`) in `student_pulses`
  - Write migration to drop `check_ins.mood` SMALLINT column OR migrate data
  - Update `src/app/api/student/check-in/route.ts` validator to accept TEXT enum
  - Update `specs/002-ui-ux-redesign/data-model.md` to specify TEXT with enum values
  - **Acceptance**: No SMALLINT mood field remains; all inserts use TEXT enum
  - **Effort**: 1h

- [x] T037 [CRITICAL] Implement 60-day data retention enforcement
  - Create Supabase `pg_cron` job: `DELETE FROM student_pulses WHERE optional_text IS NOT NULL AND created_at < now() - interval '60 days'`
  - Schedule: daily at 02:00 UTC
  - OR create N8N `weekly-data-purge.json` workflow
  - Add verification: log deletion count, alert if job fails
  - **Acceptance**: `pg_cron` entry exists in DB; test with backdated row confirms deletion
  - **Effort**: 2h

- [x] T038 [CRITICAL/DECISION] Constitutional Amendment — LLM Model (Option B applied: Gemini 2.0 Flash)
  - ⚠️ **Requires STAKEHOLDER DECISION before implementation**
  - **Option A**: File Constitutional Amendment PR updating `constitution.md` §V to authorize GPT-4o as approved LLM
  - **Option B**: Migrate all 5 N8N workflows from `@n8n/n8n-nodes-langchain.openAi` to Gemini nodes + update DB schema `ai_model DEFAULT 'gemini-pro'`
  - **Acceptance**: Zero conflict between `constitution.md` and actual tech stack
  - **Effort**: 4h (either option)

---

## Phase 0.5: Audit Remediation — HIGH Findings (speckit.analyze v2)

- [x] G1 [HIGH] Test infrastructure bootstrapped — 8 tests: RLS, k-anonymity, E2E
- [x] G2/T011 [HIGH] Recharts TrendChart in /student/feedback — 3 lines (mood/pace/fairness), 4-week window, k-anon null gaps
- [x] I1 [HIGH] plan.md route structure synced to actual `(dashboard)/` layout. Old `(student)/`, `(teacher)/` references removed.
- [x] I2 [HIGH] Bilingual microcopy — `src/lib/microcopy.tsx` (MICROCOPY constants + BiText component). Applied to teacher dashboard + student check-in. No i18n library for pilot.
- [x] I3 [HIGH] N8N Friday trigger verified — `friday-student-reminder.json`: weekday=5, hour=15. Master poller uses DB-driven `shouldRun()`. No drift found.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema expansion and foundational UI components needed across multiple views.

- [X] T001 [P] Create and run migration `add_redesign_schema_and_n8n_tables` based on `data-model.md`
- [X] T002 [P] Implement Supabase RPC `get_class_climate_summary(class_id, weeks)` with strict k-anonymity (n>=3) enforcement
- [X] T003 [P] Implement Supabase RPC `calculate_k_anonymity_status(class_id)`
- [X] T004 Setup `N8N_WEBHOOK_SECRET` environment variables in local `.env` and Next.js config
- [X] T005 Create generic N8N webhook receiver endpoint `src/app/api/n8n/webhook/route.ts`


---

## Phase 2: User Story 1 - Student Anonymous Pulse & Gamified Check-in (P1 - MVP)

**Goal**: Frictionless <20s student check-in with immediate variable reward.

### Implementation
- [X] T006 [P] [US1] Create atomic `EmojiPickerToggle` and `RiskBadge` components in `src/components/ui/`
- [X] T007 [US1] Create `StudentPulseForm` organism component (Mood, Pace, Fairness, Optional text)
- [X] T008 [US1] Implement server action `submitPulse(data)` in `src/app/(student)/check-in/actions.ts`
- [X] T009 [US1] Build `/student/check-in/page.tsx` integrating the form and "Anonymity Guaranteed" badge
- [X] T010 [US1] Create `ClassVibeSnapshot` component to display aggregate data for the post-submit reward (conditionally rendered on n>=3)
- [X] T011 [US1] Build `/student/feedback/page.tsx` showing 4-week trend charts (Recharts) and Participation rate
- [X] T012 [US1] Build `/student/privacy/page.tsx` static FAQ page

---

## Phase 3: User Story 2 - Teacher Weekly TL;DR & Action Loop (P1 - MVP)

**Goal**: Fast, low-cognitive-load class climate insights and AI draft action approvals.

### Implementation
- [X] T013 [P] [US2] Create teacher atoms/molecules (`ClassClimateCard`, `AIDraftActionCard`) in `src/components/teacher/`
- [X] T014 [US2] Build `/teacher/page.tsx` Home Dashboard rendering Class Cards with Risk Badges
- [X] T015 [US2] Implement server action `updateRecommendationStatus` in `src/app/(teacher)/class/[id]/actions.ts`
- [X] T016 [US2] Build `/teacher/class/[id]/page.tsx` displaying Weekly TL;DR Summary and Key Issues tags
- [X] T017 [US2] Integrate `AIDraftActionCard` into the class page with Approve/Edit/Dismiss flow
- [X] T018 [US2] Build `/teacher/actions/page.tsx` Inbox view for quick inline approval of pending actions
- [X] T019 [US2] Add "Loop Closure" feed to `/student/feedback/page.tsx` triggered by Teacher approvals

---

## Phase 4: User Story 3 - Admin Metrics & Governance (P2 - Post-Pilot)

**Goal**: Verify system adoption and ROI without accessing raw student data.

### Implementation
- [X] T020 [P] [US3] Create metric cards and trend charts in `src/components/admin/`
- [X] T021 [US3] Build `/admin/metrics/page.tsx` dashboard showing check-in rates and loop closure rates
- [X] T022 [US3] Build `/admin/audit/page.tsx` showing a data table of teacher system usage without raw student text
- [ ] T023 [US3] Implement export to PDF/CSV utility for the admin dashboard

---

## Phase 5: N8N Workflow Automation Integration

**Purpose**: Hooking up the backend automations defined in the contracts.

- [X] T024 Trigger 1: Set up N8N Weekly AI Recommendation Generator cron job calling Supabase and writing back AI Drafts
- [X] T025 Trigger 2: Configure N8N Weekly Teacher Email Summary using SendGrid
- [X] T026 Trigger 3: Apply Supabase Webhook to push `loop_closure` notifications to N8N when status = 'approved'
- [X] T027 Trigger 4: Configure N8N Friday 15:00 Student Reminder logic for classes < 50%
- [X] T028 Trigger 5: Set up N8N Sunday Health Score computation and Slack alert logic

---

## Phase 6: Class Management (Missing MVP Feature)

**Purpose**: Allow teachers to create classes and students to join via invite code.

- [X] T029 DB: Migration for `class_enrollments` and `invite_code` + `supabase db push`
- [X] T030 Actions: Implement `createClass` and `enrollStudent` + `joinClass` server actions
- [X] T031 UI/Teacher: Build `/teacher/class/new`
- [X] T032 UI/Teacher: Build `/teacher/class/[id]/settings` and add CTA to `/teacher`
- [X] T033 UI/Student: Build `/student/join`

