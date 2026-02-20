# Feature Specification: Climate Agent UI/UX Redesign & N8N Automation

**Feature Branch**: `002-ui-ux-redesign`  
**Created**: 2026-02-20
**Status**: Ready for Planning
**Input**: [Detailed Product Summary, Constraints, Goals, Flows, N8N Specs]

## Product Summary
Classroom Climate SaaS (EdTech). Primary loop: Anonymous weekly student check-in → AI draft recommendation → Teacher approval/action → Student sees impact.

## Hard Constraints
- No individual student data displayed (class-aggregate only).
- **k-anonymity**: charts hidden if responses < 3 ("Waiting for more data (Privacy Protected)").
- Teachers/Admins cannot see raw student text (only AI summaries).
- AI drafts require human approval (No auto-send).
- Raw text deleted after 60 days.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Student Habit Loop (Priority: P1)
Students need a frictionless, secure way to share feedback about the class climate so they feel heard without fear of retribution, and see the impact of their feedback.

**Why this priority**: High student response rates are required to generate meaningful insights.
**Independent Test**: Can be tested by simulating a post-class notification, completing the form in < 20s, and verifying the "Class Vibe" screen displays correctly.

**Acceptance Scenarios**:
1. **Given** a Friday afternoon, **When** a student receives a reminder and opens the link, **Then** they can complete the check-in (Mood, Pace, Fairness, Optional text) in under 20 seconds.
2. **Given** a student submits feedback, **When** they reach the success screen, **Then** they see the aggregate "Class Vibe" for the week (if n >= 3) and a statistic like "72% of the class feels the same about Pace".
3. **Given** a teacher acted on feedback last week, **When** a student visits `/student/feedback`, **Then** they see a "Loop Closure" update (e.g., "Quiz reduced due to feedback").

---

### User Story 2 - Teacher Action Loop (Priority: P1)
Teachers need a fast, low-cognitive-load way to understand class climate issues and take meaningful action without reading through raw surveys.

**Why this priority**: Teachers are the agents of change; if the dashboard is complex, they will churn.
**Independent Test**: Read the weekly summary, review an AI suggestion, and approve/dismiss it within 60 seconds.

**Acceptance Scenarios**:
1. **Given** a Monday morning, **When** a teacher logs in after receiving a summary email, **Then** they see their classes with clear risk badges (Low/Med/High).
2. **Given** a teacher opens a specific class view, **When** they review the Weekly TL;DR, **Then** they see key issues as tags and drafted AI suggested actions.
3. **Given** an AI suggestion, **When** a teacher clicks "Dismiss", **Then** they can easily provide an optional short reason without friction.

---

### User Story 3 - Admin Oversight Loop (Priority: P2)
School leaders need clear, aggregated evidence of system adoption and impact to justify the tool's ROI and provide support where needed.

**Why this priority**: Proves the value of the platform to buyers/stakeholders.
**Independent Test**: View the metrics dashboard to see check-in rates and loop closure rates across classes.

**Acceptance Scenarios**:
1. **Given** an admin views `/admin/metrics`, **When** they check the dashboard, **Then** they see the lowest and highest performing classes by adoption/loop closure.
2. **Given** a class has low engagement, **When** an admin reviews the audit log, **Then** they can see if the teacher has been approving actions, without seeing any student raw text.

### Edge Cases
- **n < 3 Responses**: System must strictly enforce privacy by showing a locked state instead of charts or vibes.
- **Unresponsive Teachers**: If a teacher ignores AI drafts, the system must trigger a low health score alert (Admin/Internal).
- **Teacher wants to edit AI draft**: The UI must support inline editing of the recommendation before approval.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a mobile-first student check-in form (`/student/check-in`) collecting Mood (emoji), Pace (slider), Fairness (slider), and text.
- **FR-002**: System MUST hide charts and specific statistics if a class has fewer than 3 responses in the current period, showing a privacy message instead.
- **FR-003**: System MUST NOT expose raw student text to teachers or admins; it MUST only be accessible to the AI generator and deleted after 60 days.
- **FR-004**: System MUST display a Teacher Dashboard (`/teacher`) listing all assigned classes with Risk Level badges, trend arrows, check-in counts, and pending action counts.
- **FR-005**: System MUST provide a Weekly TL;DR (`/teacher/class/[id]`) with a 2-3 sentence overview, key issue tags, and AI Suggested actions.
- **FR-006**: System MUST explicitly label AI suggestions as drafts and require explicit teacher Approval, Edit, or Dismissal.
- **FR-007**: System MUST display "Loop Closure" feedback to students on `/student/feedback` when a teacher approves and shares an action.
- **FR-008**: System MUST provide an Admin Metrics dashboard (`/admin/metrics`) showing adoption KPIs (check-in rate, loop closure rate) and an Audit Log (`/admin/audit`) of teacher actions.
- **FR-009**: System MUST support external workflows (N8N automation layer) via specific database schemas and trigger events for notifications, reporting, and alerts.

### Key Entities 

- **Student Pulse**: Contains categorical scores (mood, pace, fairness), optional text, timestamp, class ID. No individual user mapping.
- **Class Climate Summary**: Aggregated metrics per week/session, risk score, key issue tags.
- **AI Action Suggestion**: Recommendation linked to a class, containing status (pending, approved, dismissed, edited).
- **Engagement Metric / Audit Log**: Administrative record of check-in rates, loop closure rates, and system interactions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 80% of student check-in flows are completed in under 20 seconds.
- **SC-002**: 70% of students return to check in multiple times per week.
- **SC-003**: 95% of teachers spend less than 3 minutes reviewing a single class's Weekly TL;DR.
- **SC-004**: System achieves a 50% "loop closure" rate (teachers approving/modifying AI actions) across all active pilot classes.
- **SC-005**: System calculates and updates a Health Score consistently, successfully alerting admins if a school's score drops below 40.

---

## Detailed Feature Deliverables

### 1. Sitemap + Navigation Pattern
**Student**
- `/student/check-in`: Primary Action (Submit Pulse) | Empty/Loading (Skeleton form)
- `/student/feedback`: Primary Action (View Impact / Loop Closure) | Privacy State (Waiting for more data n<3)
- `/student/privacy`: Primary Action (Read Policy)

**Teacher**
- `/teacher` (Home): Primary Action (Select Class) | Empty State ("ยังไม่มีห้องเรียน — รอ Admin กำหนด")
- `/teacher/class/[id]`: Primary Action (Review Summary, Approve/Dismiss Actions) | Empty State ("ยังไม่มีข้อมูลสัปดาห์นี้")
- `/teacher/actions`: Primary Action (Manage all pending actions)

**Admin**
- `/admin/metrics`: Primary Action (View overall ROI/Health)
- `/admin/audit`: Primary Action (Review usage logs)

### 2. Screen UX Specs (Wireframe-level)

#### Student Screens
* `/student/check-in`: Mobile-first layout. Large emoji picker for Mood. Simple sliders for Pace/Fairness. Textbox at bottom. Persistent "Anonymity Guaranteed" badge. Post-submit transition to "Class Vibe Today" (if n>=3) and a dynamic social norm hook ("72% of the class agrees with you").
* `/student/feedback`: 4-week trend charts (Recharts) for Mood/Pace/Fairness. Prominent "Loop Closure" block showing recent teacher actions. Participation rate indicator.
* `/student/privacy`: Simple, human-readable FAQ style.

#### Teacher Screens
* `/teacher` (Home): Grid/List of Class Cards. Each card features a bold Risk badge, trend indicator, and quick metrics (Check-in rate, Loop closure rate).
* `/teacher/class/[id]`: 
  - Summary section: 2-3 sentence auto-generated text.
  - Key Issues section: Tag cloud or pill list of top issues.
  - AI Drafts: Distinctively styled cards explicitly marked "AI Draft". Action buttons: [Approve], [Edit], [Dismiss].
* `/teacher/actions`: Table/List view of all actions across classes. Quick inline approve/dismiss.

#### Admin Screens
* `/admin/metrics`: High-level KPIs in top cards. 8-week trend line chart. Table highlighting "Best Practice" classes vs. "At Risk" classes.
* `/admin/audit`: Data table showing timestamp, actor, action type, class. No raw student text.

### 3. Feature List (MVP vs Phase 2)

**MVP (Phase 1 — Pilot)**
- [Student] Mobile-first 20-second Check-in Flow.
- [Student] Post-submit "Class Vibe" snapshot (Immediate Reward).
- [Student] Participation rate display on feedback page (Social Norm).
- [Student] Loop Closure visibility (Recent teacher actions).
- [Teacher] Class List with Risk Level Badges.
- [Teacher] Weekly TL;DR Class View with AI Draft badges & Approve/Edit/Dismiss flow.
- [Admin] Basic Audit Log and Metrics table.

**Phase 2 (Post-Pilot)**
- [Student/Teacher] Class Streak counters (Loss aversion).
- [Teacher] Impact Timeline chart (showing actions mapped against subsequent mood trends).
- [Admin] Monthly Climate PDF report export.
- [Admin] "Best Practice Class" spotlight / Gamified school-wide leaderboards.

### 4. Component List (New / Needed)
*(To be detailed fully in the Implementation Plan, utilizing React/Next.js and shadcn/ui)*
- **Atoms/Molecules**: `RiskBadge`, `PrivacyLockOverlay`, `EmojiPickerToggle`, `AnonymityGuaranteeLabel`.
- **Organisms**: `StudentPulseForm`, `ClassVibeSnapshot`, `AIDraftActionCard`, `LoopClosureFeed`, `ClassClimateCard`.

### 5. Microcopy Guidelines
- **Privacy Enforcement**: "Waiting for more data (Privacy Protected)" or "เราไม่บันทึกชื่อ — ครูเห็นแค่ภาพรวมทั้งห้อง"
- **AI Transparency**: "AI Draft — Requires Your Approval" or "ร่างโดย AI — กรุณาตรวจสอบก่อนยืนยัน"
- **Gamification/Norming**: "72% ของห้องรู้สึกเหมือนคุณเรื่อง Pace" or "สัปดาห์นี้ 24/30 คนส่งแล้ว"
- **Action Dismissal**: "เหตุผลสั้นๆ (ถ้ามี)..."
