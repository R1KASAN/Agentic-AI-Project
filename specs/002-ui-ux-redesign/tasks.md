# Tasks: Climate Agent UI/UX Redesign & N8N Automation

**Input**: Design documents from `/specs/002-ui-ux-redesign/`
**Prerequisites**: plan.md (required), spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema expansion and foundational UI components needed across multiple views.

- [ ] T001 [P] Create and run migration `add_redesign_schema_and_n8n_tables` based on `data-model.md`
- [ ] T002 [P] Implement Supabase RPC `get_class_climate_summary(class_id, weeks)` with strict k-anonymity (n>=3) enforcement
- [ ] T003 [P] Implement Supabase RPC `calculate_k_anonymity_status(class_id)`
- [ ] T004 Setup `N8N_WEBHOOK_SECRET` environment variables in local `.env` and Next.js config
- [ ] T005 Create generic N8N webhook receiver endpoint `src/app/api/n8n/webhook/route.ts`

---

## Phase 2: User Story 1 - Student Anonymous Pulse & Gamified Check-in (P1 - MVP)

**Goal**: Frictionless <20s student check-in with immediate variable reward.

### Implementation
- [ ] T006 [P] [US1] Create atomic `EmojiPickerToggle` and `RiskBadge` components in `src/components/ui/`
- [ ] T007 [US1] Create `StudentPulseForm` organism component (Mood, Pace, Fairness, Optional text)
- [ ] T008 [US1] Implement server action `submitPulse(data)` in `src/app/(student)/check-in/actions.ts`
- [ ] T009 [US1] Build `/student/check-in/page.tsx` integrating the form and "Anonymity Guaranteed" badge
- [ ] T010 [US1] Create `ClassVibeSnapshot` component to display aggregate data for the post-submit reward (conditionally rendered on n>=3)
- [ ] T011 [US1] Build `/student/feedback/page.tsx` showing 4-week trend charts (Recharts) and Participation rate
- [ ] T012 [US1] Build `/student/privacy/page.tsx` static FAQ page

---

## Phase 3: User Story 2 - Teacher Weekly TL;DR & Action Loop (P1 - MVP)

**Goal**: Fast, low-cognitive-load class climate insights and AI draft action approvals.

### Implementation
- [ ] T013 [P] [US2] Create teacher atoms/molecules (`ClassClimateCard`, `AIDraftActionCard`) in `src/components/teacher/`
- [ ] T014 [US2] Build `/teacher/page.tsx` Home Dashboard rendering Class Cards with Risk Badges
- [ ] T015 [US2] Implement server action `updateRecommendationStatus` in `src/app/(teacher)/class/[id]/actions.ts`
- [ ] T016 [US2] Build `/teacher/class/[id]/page.tsx` displaying Weekly TL;DR Summary and Key Issues tags
- [ ] T017 [US2] Integrate `AIDraftActionCard` into the class page with Approve/Edit/Dismiss flow
- [ ] T018 [US2] Build `/teacher/actions/page.tsx` Inbox view for quick inline approval of pending actions
- [ ] T019 [US2] Add "Loop Closure" feed to `/student/feedback/page.tsx` triggered by Teacher approvals

---

## Phase 4: User Story 3 - Admin Metrics & Governance (P2 - Post-Pilot)

**Goal**: Verify system adoption and ROI without accessing raw student data.

### Implementation
- [ ] T020 [P] [US3] Create metric cards and trend charts in `src/components/admin/`
- [ ] T021 [US3] Build `/admin/metrics/page.tsx` dashboard showing check-in rates and loop closure rates
- [ ] T022 [US3] Build `/admin/audit/page.tsx` showing a data table of teacher system usage without raw student text
- [ ] T023 [US3] Implement export to PDF/CSV utility for the admin dashboard

---

## Phase 5: N8N Workflow Automation Integration

**Purpose**: Hooking up the backend automations defined in the contracts.

- [ ] T024 Trigger 1: Set up N8N Weekly AI Recommendation Generator cron job calling Supabase and writing back AI Drafts
- [ ] T025 Trigger 2: Configure N8N Weekly Teacher Email Summary using SendGrid
- [ ] T026 Trigger 3: Apply Supabase Webhook to push `loop_closure` notifications to N8N when status = 'approved'
- [ ] T027 Trigger 4: Configure N8N Friday 15:00 Student Reminder logic for classes < 50%
- [ ] T028 Trigger 5: Set up N8N Sunday Health Score computation and Slack alert logic
