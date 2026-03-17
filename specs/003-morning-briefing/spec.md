# Feature Specification: W06 Morning AI Briefing

**Feature Branch**: `003-morning-briefing`  
**Created**: 2026-03-16  
**Status**: Draft  
**Phase**: Phase 2 - Operational Agent (v2.0.0)  
**Agentic Loop Alignment**: Loop0 (Sense/Trigger) → Loop2 (Reason/Plan) → Loop3 (Act/Notify)  
**Autonomy Level**: L2 (Decision & Action) — Agent decides WHAT to brief and WHEN; teacher decides WHETHER to implement

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Teacher Receives Daily Classroom Climate Briefing (Priority: P1)

**Actor**: Climate Agent (autonomous daily trigger)  
**Context**: Every school day at 7:30 AM, before first period  
**Goal**: Deliver actionable climate intelligence to teacher, priming them for the day ahead  

**Why this priority**: Daily intelligence is foundational to the agentic loop. Teachers must receive consistent, timely context before the school day begins to inform proactive interventions and recognize patterns. This is the primary channel for agent-to-teacher communication in Phase 2.

**Independent Test**: Can be fully tested by: (1) Scheduling workflow trigger at a test time (e.g., 8 AM), (2) Verifying LINE message delivery with exact content format, (3) Checking dashboard logs for workflow execution. Delivers value: Climate context prevents reactive-only decision-making.

**Acceptance Scenarios**:

1. **Given** a class has ≥3 students with mood check-ins in past 24h,  
   **When** 7:30 AM trigger fires on a school day (M-F),  
   **Then** teacher receives LINE briefing with (a) aggregate mood summary [mean, std dev], (b) trend vs. last week [↑↓→], (c) 1-2 LLM-specific recommendations, (d) loop closure % from prior day, (e) next check-in time.

2. **Given** classroom mood dropped >15% vs. baseline (3-week rolling average),  
   **When** briefing is generated,  
   **Then** briefing explicitly calls out the trend as "Key Trend" and suggests observation focus areas.

3. **Given** <3 students in class OR no mood check-ins in past 24h,  
   **When** 7:30 AM trigger fires,  
   **Then** briefing is NOT sent (no aggregate without k≥3); instead, agent logs "insufficient data" and skips day.

4. **Given** teacher has already dismissed >60% of prior week's recommendations,  
   **When** briefing is generated,  
   **Then** briefing starts with "We noticed you've deprioritized recent suggestions. Let's focus on [1 high-confidence rec] instead" (tone: partner, not audit).

---

### User Story 2 — Teacher Approves & Implements Briefing Recommendation (Priority: P1)

**Actor**: Teacher (human decision gate)  
**Context**: After reading LINE briefing, teacher sees 1-2 teaching suggestions  
**Goal**: Rapidly approve and implement climate-driven intervention  

**Why this priority**: Loop closure (sense→act→learn) depends entirely on teacher response. Without implementation feedback, the agentic loop cannot adapt. This is the critical feedback node for Loop4 (Self-Evaluation).

**Independent Test**: Can be tested by: (1) Clicking "Approve & Try Now" CTA in dashboard within 2 hours of briefing, (2) Marking action as "Done" post-implementation, (3) Providing optional feedback. Delivers value: Agent learns which recommendations stick.

**Acceptance Scenarios**:

1. **Given** teacher has received briefing with ≥1 recommendation,  
   **When** teacher clicks "Approve & Try Now" button,  
   **Then** recommendation status changes from "Pending" → "Acknowledged" and timestamp is logged for latency metrics.

2. **Given** teacher has implemented recommendation in class,  
   **When** teacher clicks "✓ Done" in dashboard within 4 hours,  
   **Then** (a) status becomes "Implemented", (b) optional feedback box appears ("What did you try? How'd it go?"), (c) agent is notified for Loop5 (learning).

3. **Given** teacher does not click any action within 48 hours,  
   **When** subsequent briefing is sent,  
   **Then** prior recommendation is marked "Not Actioned" (neutral, not penalty-framed).

---

### User Story 3 — Loop Closure Tracking Appears in Briefing (Priority: P2)

**Actor**: Agent + Teacher (agentic self-evaluation visibility)  
**Context**: Briefing includes a "Last Week's Actions" section showing prior recommendations and teacher responses  
**Goal**: Transparency: teacher sees what the agent has learned about their responsiveness; agent demonstrates accountability

**Why this priority**: Agentic transparency (Constitution Principle I) requires teachers to see the loop working. Without visibility, agent autonomy feels opaque. P2 because it's a "nice-to-have" enhancement vs. core intelligence delivery (P1).

**Independent Test**: Can be tested by: (1) Verifying dashboard shows "Recommendation History" widget, (2) Cross-checking % closure rate math, (3) Observing tone of summary. Delivers value: Builds trust in agent autonomy.

**Acceptance Scenarios**:

1. **Given** teacher has received ≥3 recommendations in past 7 days,  
   **When** briefing is generated,  
   **Then** briefing includes summary: "Last week: 3 suggestions → 2 Viewed → 1 Implemented. Great partnership! 📊"

2. **Given** teacher closure rate is ≥60%,  
   **When** briefing is generated,  
   **Then** summary uses positive framing: "You're implementing 60%+ of climate insights. Partnership is strong."

3. **Given** teacher closure rate is <30%,  
   **When** briefing is generated,  
   **Then** summary uses reset framing: "Let's focus on 1 suggestion this week instead. Depth over volume."

---

### Edge Cases

- **No mood check-ins submitted**: Agent skips briefing (k-anonymity constraint). Logs "insufficient data" to audit trail.
- **School holiday / break day**: Briefing trigger is disabled (must check school calendar in DB).
- **Teacher on leave**: Briefing is suppressed if teacher's `availability_status = 'on_leave'` in `teacher_profiles` table.
- **Mood anomaly detected overnight**: Agent prioritizes by severity—if mood dropped >30%, briefing leads with "Alert:" prefix. If <15% variance, briefing is routine.
- **LLM fails to generate recommendations**: Fallback suggestions are rule-based (e.g., "Consider a 5-min mood check," "Try a collaborative problem-solving activity"). Agent logs LLM failure to audit.
- **Teacher dismisses all recommendations 3x in a row**: Agent sends meta-briefing: "I notice suggestions aren't resonating. Let's co-design what would be helpful. Reply with ideas?" (reframing as agent listening, not giving up).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Briefing MUST be delivered via LINE at 7:30 AM on all school days (M-F), respecting school calendar (holidays/breaks suppressed).
- **FR-002**: Briefing content MUST include (in order): (a) Aggregate mood summary [mean ± std dev for past 24h], (b) Trend indicator (vs. prior week), (c) 1–2 LLM-generated teaching suggestions (max 150 chars each), (d) Loop closure % from past 7 days, (e) Next check-in time.
- **FR-003**: Briefing MUST NOT include raw student names, IDs, or individual mood data. Only k-anonymity aggregates (k≥3).
- **FR-004**: LLM-generated recommendations MUST be deterministically logged: (tool invocations, confidence score, tokens used, latency).
- **FR-005**: Briefing MUST trigger only if ≥3 students in class have submitted mood check-ins in past 24h.
- **FR-006**: If mood trend is >15% drop vs. baseline, briefing MUST explicitly highlight as "Key Trend" and suggest observation focus areas.
- **FR-007**: Teacher MUST able to approve briefing recommendations via dashboard "Approve & Try Now" CTA within briefing message or dashboard widget.
- **FR-008**: Briefing message MUST include timestamp of last update and "Refresh" option (manual re-trigger for real-time data).
- **FR-009**: All briefing delivery attempts (success/failure) MUST be logged to `n8n_audit_log` table with (timestamp, teacher_id, content_hash, delivery_status).

### Agentic Requirements

- **AGR-001**: Agent decision path MUST be deterministic and logged: (1) k-anonymity check [≥3 students?], (2) Calendar check [school day?], (3) LLM invocation [which model? confidence?], (4) Notification frequency guard [≤2/day?]. All steps stored in `n8n_audit_log` with policy_applied, confidence_score, tool_invocations.

- **AGR-002**: Tool isolation MUST be enforced: LLM calls `get_class_climate_summary` RPC (returns k-anonymity safe aggregates) and `get_past_recommendations` RPC (teacher response history). No direct LLM access to individual student records.

- **AGR-003**: Notification frequency MUST respect teacher sanity: Briefing + any other notifications (anomaly alerts, end-of-week summary) MUST total ≤2/day, ≤5/week. Anomaly alerts pre-empt routine briefing if severity is CRITICAL.

- **AGR-004**: Loop closure signal MUST feed back into agent memory: (a) Teacher "Acknowledge" action increments approval counter. (b) Teacher "Implement + Feedback" action triggers Loop5 (learning): recommendation is tagged "high_trust" for future similar contexts. (c) Dismissal patterns logged for agent to adjust tone/frequency.

- **AGR-005**: Briefing framing MUST be "Partner Advisor" voice, never "System Alert": Use "We noticed," "Together we can," "Let's try" language. Avoid audit tone ("You didn't implement 40%").

- **AGR-006**: LLM temperature & beam search parameters MUST favor diverse, contextually-rich suggestions (temperature=0.8, top_k=3 beam), not repetitive. Agent MUST NOT over-focus on same recommendation type.

- **AGR-007**: Self-evaluation dashboard (visible to teachers) MUST display: (a) Notifications sent this week [count, type distribution], (b) Approval rate [%], (c) Implementation rate [%], (d) Average latency [hours from notification to action], (e) Mood trend post-action [showing correlation]. Refreshes daily.

- **AGR-008**: Guardrail: If teacher closure rate drops below 20% for 2 consecutive weeks, agent MUST switch to "Inquiry Mode": next briefing asks "What format would be more helpful? [feedback modal]" instead of sending routine rec. Prevents agent from becoming background noise.

### Key Entities

- **Class Climate Aggregate**: Derived from `student_pulses` table, aggregated by class, k-anonymity enforced (k≥3). Attributes: [mean_mood, std_dev, mood_trend_24h, mood_baseline_3week].
- **Recommendation**: Generated by LLM in W01, stored in `recommendations` table. Attributes: [id, agent_id, class_id, policy, confidence, content, created_at, teacher_approval_status, teacher_feedback, loop_closure_timestamp].
- **Agentic Audit Log**: `n8n_audit_log` table. Attributes: [timestamp, agent_id, workflow_id, policy_applied, decision_path_json, confidence_score, tools_invoked, action_taken, approved_by_teacher_at].
- **Teacher Profile**: `teacher_profiles` table. Attributes: [id, availability_status, notification_frequency_pref, closure_rate_historical, last_briefing_sent_at, action_latency_avg].

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of briefings are delivered within 5 minutes of 7:30 AM trigger on school days.
- **SC-002**: Teachers approve ≥90% of routine briefing notifications (indicating high trust in climate intelligence).
- **SC-003**: Zero instances of raw student data (names, IDs) appear in any briefing message delivered to teachers.
- **SC-004**: Average teacher latency from briefing notification to action is ≤4 hours (measured from timestamp in message to "Approve & Try" click).
- **SC-005**: Dashboard shows ≥60% loop closure rate on briefing recommendations within 48 hours of delivery (teacher marks "Done" or dismisses with reason).
- **SC-006**: LLM recommendation quality (measured via teacher feedback on 1-5 scale) averages ≥3.5/5 after first month.

### Agentic Success Criteria

- **SCA-001**: Loop closure rate ≥60% within 48h of briefing dispatch. Tracked via `recommendations` table: [created_at, first_teacher_action_at, action_type]. Formula: (count where action_type IN ['Acknowledged', 'Implemented']) / (count where created_at in past 48h) ≥ 0.60.

- **SCA-002**: Teacher approval rate on routine notifications ≥90% (indicating agent autonomy is trusted and aligned with teacher pedagogy). Measured: (count approved recommendations) / (count sent recommendations).

- **SCA-003**: Zero policy violations in audit logs: no notifications sent without teacher approval gate, no raw student data exposure, no >2 notifications/day delivered. Weekly compliance audit.

- **SCA-004**: Agent policy adherence ≥99%: workflows execute expected decision paths (sense → climate check → LLM invocation with guardrails → audit log → approvalgate → delivery). Measured: (count audit logs with complete decision path) / (count total workflow executions).

- **SCA-005**: Average recommendation-to-implementation time ≤4 hours on high-priority alerts (mood >15% drop). Measured: (avg timestamp of teacher "Implement" click) - (timestamp of briefing sent).

- **SCA-006**: Notification frequency guard enforced 100%: max 2 notifications/day across all workflows (morning briefing + anomaly alerts). Measured: (count days where notifications_delivered > 2) = 0.

---

## Architecture

### Data Flow

```
Agentic Loop Stage: Loop0 → Sense
├─ Trigger: Cron Job at 7:30 AM school days (W06 main workflow schedules)

Agentic Loop Stage: Loop2 → Reason / Plan
├─ Step 1: Check k-anonymity [call `get_class_climate_summary()` RPC]
│  └─ Returns: {total_students, mood_mean, mood_std, mood_baseline, trend_pct_change}
│  └─ Guard: if total_students < 3, abort briefing (log to audit)
│
├─ Step 2: Check teacher availability [query `teacher_profiles` for availability_status]
│  └─ Guard: if status = 'on_leave' or 'unavailable', abort
│
├─ Step 3: Check notification frequency [query `n8n_audit_log` for past 24h deliveries]
│  └─ Guard: if count > 1, check severity. If routine, defer to next slot. If critical, pre-empt.
│
├─ Step 4: Invoke LLM (Gemini) with tool workflow isolation
│  └─ Prompt: "Class mood is {mean}. Trend is {trend}. Baseline is {baseline}. Suggest 2 quick teaching moves."
│  └─ Tool invocation logged: (timestamp, model, tokens, latency, confidence_score)
│
└─ Step 5: Get teacher's prior action rate [call `get_past_recommendations()` RPC]
   └─ Returns: {recommendations_sent_7d, approved_count, implemented_count, dismissed_count}
   └─ Used to customize briefing tone (step 4)

Agentic Loop Stage: Loop3 → Act / Notify
├─ Step 6: Format briefing message
│  ├─ Header: "Morning Briefing – {class_name} | {date}"
│  ├─ Body: 
│  │  ├─ "Mood pulse: {mean}/5 (±{std})" + trend arrow
│  │  ├─ "Key Trend: [if >15% drop] Mood dropped {pct}%. Watch for [observation focus]."
│  │  ├─ "Let's try: 1) {rec_1} [LLM-generated] [Approve & Try button]"
│  │  ├─ "Let's try: 2) {rec_2} [LLM-generated] [Approve & Try button]"
│  │  ├─ "Last week: {X} suggestions → {Y} Implemented (loop closure %)"
│  │  └─ "Next check-in: [time]"
│  │
│  └─ Privacy check: Scrub any [STUDENT_NAME] or [ID] (should be none if k-anon passed)
│
├─ Step 7: Approval gate [NOT TRIGGERED BY DEFAULT]
│  └─ Briefing is staged in dashboard review queue (not sent immediately)
│  └─ Teacher clicks "Send Now" or "Schedule for later" CTA
│  └─ Until teacher approves: status = "Pending Approval" in `recommendations` table
│
└─ Step 8: Deliver via LINE API
   └─ Success log: {timestamp, teacher_id, message_hash, status='delivered'}
   └─ Failure log: {timestamp, teacher_id, error, retry_count, status='failed'}
   └─ Audit entry: log full decision path for traceability

Agentic Loop Stage: Loop4 → Self-Evaluation (feedback collection)
└─ Teacher clicks "Approve & Try Now" → status = "Acknowledged"
└─ Teacher clicks "✓ Done" → status = "Implemented" + optional feedback text
└─ Feedback stored in `recommendations.teacher_feedback` for Loop5 analysis

Agentic Loop Stage: Loop5 → Learn (long-term adaptation)
└─ Weekly aggregation job: Analyze {approved_count, implemented_count, feedback_sentiment}
└─ If implemented_count / approved_count > 0.7: Agent increases confidence for similar recs
└─ If feedback contains "too generic" patterns: Agent adjusts LLM temperature & prompt
└─ Closure rate < 20% for 2 weeks: Trigger "Inquiry Mode" (ask teacher for format feedback)
```

### N8N Workflow Dependencies

- **W06 (Main)**: `agentic-ai-morning-briefing.json`
  - Trigger: Schedule (Mon-Fri 7:30 AM, respecting school calendar)
  - Nodes:
    1. **Schedule Trigger** → (7:30 AM school days)
    2. **Check School Calendar** → (tool-get-school-calendar sub-workflow)
    3. **Get Climate Summary** → (tool-get-climate-summary, RPC call)
    4. **K-Anonymity Guard** → (IF branch: students ≥ 3?)
    5. **Check Teacher Availability** → (tool-check-teacher-availability)
    6. **Check Notification Frequency** → (tool-check-notification-frequency)
    7. **Invoke LLM (Gemini Agent)** → (toolWorkflow node calling Gemini)
    8. **Get Past Recommendations** → (tool-get-past-recommendations, RPC call)
    9. **Format Briefing Message** → (template node)
    10. **Approval Gate (Dashboard Review)** → (webhook, waits for teacher approval CTA)
    11. **Send via LINE API** → (n8n-nodes-base.httpRequest to LINE)
    12. **Log Audit Entry** → (PostgreSQL node to `n8n_audit_log`)

- **Sub-Workflows (Tool Isolation)**:
  - `tool-get-school-calendar` → Returns list of school days, holidays
  - `tool-get-climate-summary` → RPC: `get_class_climate_summary()` (k-anonymity safe)
  - `tool-check-teacher-availability` → Query `teacher_profiles` table
  - `tool-check-notification-frequency` → Query `n8n_audit_log` for past 24h count
  - `tool-get-past-recommendations` → RPC: `get_past_recommendations()` (closure stats)

### Privacy & Key Safeguards

| Safeguard | Implementation |
|-----------|----------------|
| **K-Anonymity (k≥3)** | `get_class_climate_summary()` RPC enforces: returns NULL if class has <3 students. Briefing aborts if any aggregate is NULL. |
| **No Raw Student Data** | All data passed to LLM is aggregated: mean, std dev, trend %. Zero student names/IDs in prompts or messages. |
| **Audit Trail** | Every briefing attempt logged to `n8n_audit_log`: decision path JSON, confidence, tools invoked, teacher approval timestamp. |
| **Approval Gate** | Briefing staged in dashboard queue; LINE send only after teacher clicks "Send Now" CTA. Ensures human-in-loop. |
| **Notification Guard** | Workflow checks past 24h audit log; if count ≥ 2, defers routine briefing or escalates to manager if critical. |
| **Tone Guardrails** | LLM prompt explicitly instructs partner-advisor voice. Template sanitizes output for audit-speak. |

---

## Loop Closure Integration

### How Teacher Response Feeds Back into Agent Memory

1. **Immediate Feedback (Loop4: Self-Evaluation)**
   - Teacher clicks "Approve & Try Now" → `recommendations.status = 'Acknowledged'`, timestamp logged
   - Teacher clicks "✓ Done" → `recommendations.status = 'Implemented'`, optional feedback captured in `recommendations.teacher_feedback`
   - Teacher dismisses → `recommendations.status = 'Dismissed'`, optional reason captured

2. **Weekly Aggregation (Loop5: Learning)**
   - Scheduled job runs Sundays at 10 PM: Aggregates all recommendations from past week
   - Computes: (implemented_count / sent_count) = closure rate
   - Computes: (avg latency in hours) = responsiveness metric
   - Analyzes feedback text: sentiment score, common keywords (e.g., "too generic," "great timing," "already tried")
   - Updates `agent_learning_policies` table:
     ```sql
     {
       policy_id: "routine-briefing",
       closure_rate: 0.72,
       avg_latency_hours: 2.1,
       feedback_sentiment: [positive: 0.6, neutral: 0.3, negative: 0.1],
       adjustment_flag: "increase_confidence" | "decrease_frequency" | "shift_tone",
       adapted_at: timestamp
     }
     ```

3. **Agent Adaptation (Loop2: Next Cycle)**
   - When next briefing is generated, LLM prompt includes:
     - Recent closure rate: "Your recommendations have a 72% success rate. Let's build on that."
     - Tone adjustment: If feedback is positive → increase LLM temperature (more creative). If negative → decrease (more conservative).
     - Frequency guard: If closure < 20% → next briefing asks "What format would help?" instead of pushing recs.
     - Priority boost: If specific recommendation categories (e.g., "icebreakers") get >80% feedback "great," prioritize that category next cycle.

4. **Teacher Observability**
   - Dashboard widget: "Recommendation History" shows all briefings from past 30 days with status & feedback
   - Self-evaluation panel: "Agent is learning from your responses. 72% of recent suggestions led to action. Keep it up!"
   - Trend visualization: Chart of closure % and mood trend post-action (showing correlation)

---

## Phase 2 Implementation Notes

### Timeline & Dependencies

- **Dependency Chain**:
  1. ✅ W01 (Agentic Recommendation) must be live (existing)
  2. ✅ W02 (Loop Closure Notification) must be live for callback pattern (existing)
  3. ✅ `n8n_audit_log` table must exist (added in Phase 1)
  4. ✅ LINE API credentials must be configured in n8n secrets
  5. 🔄 **W06 development**: 2-3 sprints (workflow build → test → deploy)

- **Scope Boundaries**:
  - Phase 2 includes: Morning briefing (W06) + routine recommendations only
  - Phase 3 scope: Advanced personalization (per-student learning style adaptation, peer comparison)

- **Testing Strategy**:
  - Unit test: Each sub-workflow (tool-get-climate-summary, tool-check-notification-frequency) tested in isolation
  - Integration test: W06 end-to-end with mock school calendar, mock teacher profiles
  - E2E test: Live LINE delivery to staging teacher account, verify approval gate flow
  - UAT: 5 beta teachers for 2 weeks, gather feedback on briefing usefulness and tone

- **Rollout Plan**:
  - Week 1: Deploy to 5 pilot schools (one per timezone), monitor audit logs
  - Week 2: Expand to 20 pilot schools, gather feedback
  - Week 3: Full rollout to all schools on Phase 2 contract

---

## Appendix: Agentic Framing Checklist

- ✅ **Loop Stage Mapping**: Loop0 (trigger) → Loop2 (reason/plan) → Loop3 (act) → Loop4 (self-eval) → Loop5 (learn)
- ✅ **Agent Goal**: Deliver climate intelligence daily; teacher decides on implementation
- ✅ **Tool Isolation**: All data access via RPC calls and sub-workflows, not direct LLM DB access
- ✅ **Privacy-by-Design**: K-anonymity enforced, no raw student names/IDs in any message
- ✅ **Loop Closure**: Teacher feedback captured, aggregated weekly, feeds into agent learning
- ✅ **Teacher Partnership**: Voice is "partner advisor," not "system alert"; max 2 notifications/day
- ✅ **Guardrails**: Notification frequency guard, approval gate, closure rate monitor
- ✅ **Success Metrics**: Loop closure ≥60%, approval rate ≥90%, zero policy violations, SCA-001 to SCA-006
