# Feature Specification: Sitemap & Navigation

**Feature Branch**: `1-sitemap-navigation`
**Created**: 2026-02-16
**Last Updated**: 2026-02-16 (Constitution v1.3.0 verified)
**Status**: Draft
**Input**: User description: "Sitemap & Navigation with Privacy-by-Design, Adoption focus, and Competitive Positioning"

## Scope & Positioning
**Product Focus**: This application is a **Classroom Climate System** (feeling safe, belonging, workload), NOT a general LMS or grading tool. It does NOT perform predictive analytics on individual student success or risk.
**Core Mechanism**: A **Daily/Weekly Anonymous Pulse** integrated into classroom routine.
**Key Differentiating Value**:
- **Privacy First**: No surveillance, no individual tracking.
- **Teacher Sanity**: Low workload (3-5 mins/week), optional actions.
- **Loop Closure**: Systematic validation of student voice.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Login & Role-Based Routing (Priority: P1)

As a user (any role), I want to log in through a single entry point and be automatically directed to my appropriate workspace so that I can access features relevant to my role without confusion or unauthorized access.

**Why this priority**: Foundation for all other access; critical for security.

**Independent Test**: Can be tested by creating users with different roles (Student, Teacher, Admin) in Supabase and verifying they land on the correct dashboard after login.

**Acceptance Scenarios**:

1. **Given** a guest user, **When** they visit `/`, **Then** they see the Login page.
2. **Given** a student user, **When** they log in, **Then** they are redirected to `/student/check-in`.
3. **Given** a teacher user, **When** they log in, **Then** they are redirected to `/teacher/dashboard`.
4. **Given** an admin user, **When** they log in, **Then** they are redirected to `/admin/audit`.
5. **Given** a logged-in student, **When** they attempt to access `/teacher/dashboard`, **Then** they are redirected to `/student/check-in` or see a 403 Forbidden page.

---

### User Story 2 - Student Daily Pulse (Priority: P1)

As a student, I want to quickly share my feelings about the class climate (in < 20 seconds) so that my voice is heard without disrupting my learning flow or risking my privacy.

**Why this priority**: The source of all data; must be low-friction to build habit.

**Independent Test**: Can be tested by simulating a student submitting a check-in.

**Acceptance Scenarios**:

1. **Given** a student, **When** they visit `/student`, **Then** they see the Check-in form designed for mobile.
2. **Given** the check-in form, **When** interacting, **Then** inputs include Mood (emoji), Pace (scale), Fairness (scale), and Optional Text.
3. **Given** the form, **When** submitting, **Then** the process takes < 20 seconds.
4. **Given** a student concerns about privacy, **When** viewing the form, **Then** an "Anonymity Guaranteed" toggle/badge is clearly visible.

---

### User Story 3 - Student Feedback Loop (Priority: P2)

As a student, I want to see aggregate class trends and teacher responses so that I know my feedback makes a difference.

**Why this priority**: Validates "Closing the Loop" principle; drives retention.

**Independent Test**: Can be tested by viewing feedback page with varying numbers of responses.

**Acceptance Scenarios**:

1. **Given** a class with < 3 responses, **When** a student views `/student/feedback`, **Then** they see a "Waiting for more data (Privacy Protected)" message.
2. **Given** a class with >= 3 responses, **When** a student views `/student/feedback`, **Then** they see aggregate charts.
3. **Given** a teacher has logged an action, **When** a student views the page, **Then** they see a "Recent Validated Action" note.

---

### User Story 4 - Teacher Sanity Dashboard (Priority: P1)

As a teacher, I want to see a weekly TL;DR of my class climate with manageable suggestions so that I can improve the environment without being overwhelmed.

**Why this priority**: Teacher adoption depends on low workload ("Teacher Sanity").

**Independent Test**: Can be tested by a teacher viewing populated class data.

**Acceptance Scenarios**:

1. **Given** a teacher, **When** they visit `/teacher`, **Then** they see a list of classes with separate Risk Indicators (Low/Med/High).
2. **Given** a specific class, **When** viewed, **Then** the dashboard shows a Summary, Key Issues, and max 1-3 Suggested Actions.
3. **Given** an AI draft message, **When** reviewed, **Then** the teacher can Edit, Approve, or Dismiss it (with reason).

---

### User Story 5 - Admin Oversight (Priority: P2)

As an admin, I want to track adoption and system usage so that I can support teachers and ensure the system is being used effectively (without spying on content).

**Why this priority**: Governance and adoption tracking.

**Independent Test**: Can be tested via admin dashboard.

**Acceptance Scenarios**:

1. **Given** an admin, **When** viewing `/admin/metrics`, **Then** they see Usage Rates (Check-in %, Dashboard Open %) and Loop Closure Rate.
2. **Given** an admin, **When** viewing `/admin/audit`, **Then** they see a log of actions but NO raw student text content.

## Requirements *(mandatory)*

### Functional Requirements

#### Global Routes
- **FR-001**: System MUST provide a public `/login` route handling Supabase Auth.
- **FR-002**: System MUST implement a `RequireAuth` guard that checks valid session.
- **FR-003**: System MUST implement a `RequireRole` guard that restricts access to `/student/*`, `/teacher/*`, `/admin/*`.

#### Student Routes (`/student`)
- **FR-004**: `/student` (or `/student/check-in`) MUST show the daily check-in form.
- **FR-005**: Check-in form MUST include: Mood, Pace, Fairness, Optional Text, Anonymous Toggle.
- **FR-006**: `/student/feedback` MUST show aggregate class data obeying k-anonymity (hide if n < 3).
- **FR-007**: `/student/feedback` MUST display "Action Taken" notes if teacher has closed a loop.
- **FR-008**: `/student/privacy` MUST display the Privacy Policy / PDPA notice.

#### Teacher Routes (`/teacher`)
- **FR-009**: `/teacher` MUST list assigned classes with Risk Level (Calculated from Hybrid Score).
- **FR-010**: `/teacher/class/[id]` MUST show the Weekly TL;DR Dashboard (Summary, Key Issues, 1-3 Actions).
- **FR-011**: Dashboard MUST explicitly state "AI Assistant Draft - Requires Approval".
- **FR-012**: `/teacher/actions` MUST list pending/past actions with ability to Approve/Edit/Dismiss.

#### Admin Routes (`/admin`)
- **FR-013**: `/admin/metrics` MUST show Adoption Metrics: Check-in %, Dashboard Open Rate, Loop Closure Rate.
- **FR-014**: `/admin/audit` MUST list sensitive actions (Approve/Dismiss) without revealing student raw text.

### Non-Functional Requirements (Constraints)
- **NFR-001 (Privacy)**: **NO Surveillance**. System MUST NOT use facial recognition, biometric sensors, or location tracking.
- **NFR-002 (Privacy)**: **k-anonymity**. All aggregate views must be suppressed if n < 3.
- **NFR-003 (Privacy)**: **Retention**. Raw text must be redacted/deleted after 60 days.
- **NFR-004 (Human-in-Loop)**: AI MUST NOT send messages automatically. All outgoing communication requires human approval.

### UX & Adoption Notes
- **Routine Integration**: Design the Student Check-in flow to be compatible with a "first 2 minutes of class" routine (fast, mobile-friendly).
- **Notification Discipline**: Only notify teachers for "High Risk" alerts or "Weekly Summaries". Do not spam for every single check-in.
- **Pilot Rollout**: System should support flagging classes as "Pilot" vs "Standard" to track early adopter success separately.

### Key Entities
- **User**: ID, Email, Role (student|teacher|admin).
- **Class**: ID, Name, TeacherID, PilotStatus.
- **CheckIn**: ID, StudentID (hashed), ClassID, Mood, Pace, Fairness, Content, Timestamp.
- **Recommendation**: ID, ClassID, GeneratedAction, Status (Pending/Approved/Dismissed), TeacherResponse.
- **ActionLog**: ID, ActorID, ActionType, Timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes
- **SC-001**: Login redirect latency is under 1 second for 95% of attempts.
- **SC-002**: Student check-in flow can be completed in < 20 seconds.
- **SC-003**: 100% of unauthorized access attempts to role-protected routes are blocked.
- **SC-004**: Privacy notice appears on Feedback page 100% of the time when n < 3 students.
- **SC-005**: Dashboard loads in < 2 seconds to support "3-minute sanity" goal.
