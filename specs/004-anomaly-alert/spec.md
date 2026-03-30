# Feature Specification: W07 Mood Anomaly Alert

**Feature Branch**: `004-anomaly-alert`  
**Created**: 2026-03-16  
**Status**: Draft  
**Phase**: Phase 2 - Operational Agent (v2.0.0)  
**Agentic Loop Alignment**: Loop0 (Sense/Trigger) → Loop2 (Reason/Severity) → Loop3 (Act/Notify)  
**Autonomy Level**: L2 (Decision & Action) — Agent autonomously detects anomaly and decides urgency; teacher decides WHETHER to implement rapid intervention

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Agent Detects Mood Anomaly & Sends Warning Alert (Priority: P1)

**Actor**: Climate Agent (real-time monitoring daemon)  
**Context**: Classroom mood drops significantly vs. baseline, or engagement is critically low  
**Goal**: Alert teacher to potential classroom climate crisis before it escalates, with specific rapid interventions

**Why this priority**: Real-time anomaly detection is the agent's rapid response mechanism. Classroom mood drops can signal disengagement, conflict, or crisis. Early intervention (within 30–60 minutes) can prevent the day from derailing. This is the agent's triage function—separating signal from noise.

**Independent Test**: Can be fully tested by: (1) Simulating a mood drop by creating student check-ins with low mood scores, (2) Verifying alert is triggered within 2 minutes of threshold breach, (3) Checking email is delivered within 5 minutes with 2-3 rapid intervention suggestions, (4) Confirming audit log documents the anomaly and decision. Delivers value: Prevents classroom escalation via early detection.

**Acceptance Scenarios**:

1. **Given** class baseline mood (3-week rolling average) is 3.5/5,  
   **When** ≥50% of students in class (k≥3) submit check-ins with mood <2/5 within 15 minutes,  
   **Then** agent immediately (within 2 min) computes mood drop % and triggers warning alert if drop >30%.

2. **Given** mood drop >30% vs. baseline is detected,  
   **When** anomaly is confirmed (k≥3 students, data freshness <15 min),  
   **Then** teacher receives email alert with subject "🚨 [Climate Agent] ⚠️ ห้องเรียนมีสัญญาณเตือน" and body containing: (a) Severity label [⚠️ Warning / 🚨 Critical], (b) Mood drop observation, (c) 2-3 rapid interventions, (d) CTA link to dashboard.

3. **Given** mood drop is 15–30% vs. baseline,  
   **When** anomaly is detected,  
   **Then** alert uses lighter framing in email: subject "📌 [Climate Agent] สังเกตการณ์ห้องเรียน" with body: "Mood is trending down slightly. Worth checking in with students?"

4. **Given** mood anomaly alert has been sent in past 2 hours,  
   **When** another anomaly is detected,  
   **Then** agent skips duplicate alert (guard: max 2 notifications/day). Logs "alert deferred due to frequency guard" to audit.

---

### User Story 2 — Teacher Approves & Implements Rapid Intervention (Priority: P1)

**Actor**: Teacher (human decision gate)  
**Context**: After reading anomaly alert, teacher has 2-3 quick intervention suggestions (5–10 minutes each)  
**Goal**: Rapidly approve and deploy classroom intervention to restore climate

**Why this priority**: Loop closure for anomaly alerts is even more critical than routine briefings—teacher action directly impacts class climate in real time. Without quick feedback, agent cannot learn which interventions are effective in crisis vs. routine contexts.

**Independent Test**: Can be tested by: (1) Teacher clicking "Acknowledge" in dashboard after receiving email alert, (2) Teacher marking intervention as "Done" <10 mins later with optional feedback, (3) Verifying mood score increases in subsequent check-ins. Delivers value: Agent learns which interventions stop escalation.

**Acceptance Scenarios**:

1. **Given** teacher has received anomaly alert email with 2-3 rapid intervention suggestions,  
   **When** teacher clicks "Acknowledge" button in dashboard,  
   **Then** status changes to "Acknowledged" and dashboard notification displays: "Great. We'll check mood in 5 min to see if it helped."

2. **Given** teacher has implemented intervention and students have submitted new check-ins,  
   **When** teacher clicks "✓ Done" with optional feedback,  
   **Then** (a) agent immediately tags intervention as "high_trust" or "low_impact" for future, (b) mood trend is displayed (e.g., "Mood recovered to 3.2/5 ✓").

---

### User Story 3 — Agent Learns from Intervention Feedback & Adapts (Priority: P2)

**Actor**: Agent (self-evaluation and policy refinement)  
**Context**: Over time, agent observes patterns in which interventions work  
**Goal**: Continuously refine suggestions based on classroom-specific effectiveness

**Why this priority**: Long-term learning is P2—critical for avoiding alert fatigue but lower priority than real-time response.

**Acceptance Scenarios**:

1. **Given** agent has collected ≥5 successful feedback for "5-minute mood check" in Class X,  
   **When** new anomaly is detected in Class X,  
   **Then** "5-minute mood check" is boosted to position 1 (vs. generic suggestions).

---

### Edge Cases

- **Simultaneous mood drop & high engagement**: Classified as "low urgency" if engagement high
- **Sensor noise / outlier check-ins**: Anomaly rejected if only 1 student anomalous; requires k≥3 with majority
- **Teacher absent when alert fires**: Alert suppressed, escalated to manager
- **School day end (after 3 PM)**: Alerts suppressed unless SEVERITY_CRITICAL
- **LLM fails to generate interventions**: Fall back to rule-based suggestions
- **Teacher rejects 3x in a row**: System escalates to manager

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Anomaly detection MUST run in real-time: query `student_pulses` table every 5 minutes for new check-ins
- **FR-002**: Threshold trigger: mood drop >30% vs. 3-week baseline OR engagement <2/5 for >50% of class (k≥3)
- **FR-003**: Anomaly alert MUST be delivered via Resend Email within 5 minutes of detection
- **FR-004**: Alert content MUST include: (a) Severity label [Warning / Critical], (b) Observation, (c) 2-3 rapid interventions
- **FR-005**: Alert MUST NOT include raw student names, IDs, or individual mood data
- **FR-006**: Intervention suggestions MUST be actionable within 5–10 minutes
- **FR-007**: Teacher MUST be able to acknowledge suggestions via dashboard button within 2 minutes of receiving alert email
- **FR-008**: Mood recovery MUST be monitored post-intervention (30-min window)
- **FR-009**: All anomaly events MUST be logged to `n8n_audit_log`
- **FR-010**: Max 2 notifications/day guard enforced (briefing + anomaly alerts combined)

### Agentic Requirements

- **AGR-001**: Anomaly detection algorithm MUST be deterministic and fully auditable: baseline calc → threshold comparison → severity classification
- **AGR-002**: Severity classification MUST follow rule-based logic (no LLM guessing)
- **AGR-003**: Tool isolation: Detection uses only RPCs; LLM invokes only for suggestion generation via `toolWorkflow` node
- **AGR-004**: Intervention suggestion generation MUST use LLM with explicit constraints: 5–10 min actions, classroom-appropriate, no individual student names
- **AGR-005**: Loop closure: "Acknowledge" + success feedback tags intervention as high_trust; negative feedback tags as low_impact
- **AGR-006**: Alert framing MUST be urgent but partner-voice: no panic language; email subject line uses emoji (⚠️ / 🚨) for visual priority
- **AGR-007**: Escalation logic: If teacher does NOT acknowledge Critical alert within 30 min AND is online, escalate to manager
- **AGR-008**: Guardrails: (a) Max 2 alerts/day, (b) Suppress after 3 PM, (c) Suppress on school holidays, (d) If teacher dismisses 3x, pause 48h

### Key Entities

- **Mood Baseline (3-week rolling)**: [class_id, mean_mood_3week, std_dev_3week]
- **Anomaly Event**: [id, class_id, detected_at, mood_drop_pct, severity, alert_status, implementation_feedback]
- **Intervention Suggestion**: [id, anomaly_event_id, suggestion_text, confidence, is_high_trust]
- **Agentic Audit Log**: [timestamp, anomaly_detected_at, severity, mood_drop_pct, teacher_id, delivery_status]

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of detected mood anomalies (drop >30%) trigger email alert delivery within 5 minutes (via Resend, with retry on transient failures)
- **SC-002**: Teachers approve ≥85% of anomaly alerts
- **SC-003**: Teachers implement ≥60% of approved anomaly interventions within 10 minutes
- **SC-004**: Mood recovery detected (mood increases >5%) within 15 minutes on ≥70% of implementation cases
- **SC-005**: Zero raw student data in alerts
- **SC-006**: Alert false positive rate ≤5%

### Agentic Success Criteria

- **SCA-001**: Anomaly detection latency ≤2 minutes from data ingestion to alert generation
- **SCA-002**: Loop closure rate ≥60% within 30 minutes (teacher marks "I'll try" / "Done" / "Not needed")
- **SCA-003**: Teacher approval rate ≥85%
- **SCA-004**: Zero policy violations (no >2 alerts/day, no after-hours, no raw data exposure)
- **SCA-005**: Mood recovery correlation ≥0.65 post-intervention
- **SCA-006**: Intervention effectiveness improves: % "It helped" increases from 40% (week 1) to ≥65% (week 4)

---

## Architecture

### Data Flow

```
Agentic Loop Stage: Loop0 → Sense (Real-Time Monitoring)
├─ Trigger: Cron every 5 min OR event-driven on `student_pulses` insert
├─ Fetch past 15 min of new check-ins
├─ K-anonymity validation (count ≥ 3 + data freshness <15 min)

Agentic Loop Stage: Loop2 → Reason / Severity Assessment  
├─ Calculate baseline [query `mood_baselines`, 3-week rolling mean]
├─ Compute aggregates: mood_mean, engagement_ratio
├─ Threshold comparison (rule-based, no LLM):
│  ├─ IF mood_drop >30% AND engagement <2: CRITICAL
│  ├─ ELSE IF mood_drop >15%: WARNING
│  └─ ELSE: OBSERVATION (no alert)
├─ Teacher availability & frequency check

Agentic Loop Stage: Loop2 → Plan
├─ Invoke LLM for 2–3 intervention suggestions (5–10 min actionable items)
├─ Look up high-trust interventions from agent_learning_policies (boost these)
├─ Results: 2-3 suggestions <100 chars each

Agentic Loop Stage: Loop3 → Act / Notify
├─ Format alert message (severity-based framing, Thai subject/body)
├─ Create notification_job entry for email delivery (Resend API)
├─ Send email via notification dispatcher (rate-limited, async)
├─ Log anomaly event to audit log

Agentic Loop Stage: Loop4 → Self-Evaluation  
├─ Teacher clicks "I'll try this now" → status = Acknowledged
├─ Agent waits 10 min, queries for new check-ins
├─ If mood increases >5%: Recovery detected, status = Success ✓
├─ Teacher provides feedback: "It helped" / "Didn't help" → tagged

Agentic Loop Stage: Loop5 → Learn
├─ Daily job: analyze anomaly alerts from past 24h
├─ For each intervention: track success_count, failure_count, sentiment
├─ Update agent_learning_policies (tag high_trust / low_impact)
```

### N8N Workflow Dependencies

- **W07 (Main)**: `agentic-ai-mood-anomaly.json`
  - Trigger: Event-driven (new student_pulses) OR Schedule every 5 min
  - Nodes: Get check-ins → K-anon guard → Get baseline → Compute anomaly → Severity classifier → LLM suggestions → Format alert → Create notification_job → Log audit → Recovery monitor

- **Sub-Workflows**:
  - `tool-get-mood-baseline` → RPC: `get_mood_baseline_rolling(class_id, days=21)`
  - `tool-check-teacher-availability` → Query `teacher_profiles`
  - `tool-get-high-trust-interventions` → Query `agent_learning_policies`

### Privacy & Safeguards

| Safeguard | Implementation |
|-----------|----------------|
| **K-Anonymity** | Reject if <3 students OR data >15 min old |
| **No Raw Student Data** | Alerts use only aggregates (drop_pct, engagement_ratio) |
| **Audit Trail** | All events logged: detection, severity, LLM invocation, teacher response |
| **Frequency Guard** | Max 2 alerts/day; suppressed after 3 PM; escalated if unresponded 30 min |
| **False Positive Check** | Require k≥3 with majority (target ≤5% false positive rate) |

---

## Loop Closure Integration

1. **Immediate Signal (Loop4)**: Teacher "I'll try" → Acknowledged. Wait 10 min for mood recovery check.
2. **Feedback (Loop4)**: Optional teacher feedback ("It helped" / "Didn't help") stored
3. **Daily Aggregation (Loop5)**: Analyze effectiveness; update high_trust tags
4. **Next Cycle (Loop2)**: LLM prompt includes priority list of high-trust interventions
5. **Observability**: Dashboard shows "Anomaly History" (past 7 days) + self-evaluation summary

---

## Phase 2 Implementation

- **Dependencies**: Database triggers in n8n, `mood_baselines` table, `agent_learning_policies` table
- **Scope**: Real-time detection + rapid interventions (Phase 3: predictive anomalies)
- **Testing**: Unit (baseline calc, severity logic), Integration (end-to-end), E2E (live LINE), UAT (5 schools, 2+ weeks)
- **Rollout**: Week 1 (5 pilot schools), Week 2 (20 schools), Week 3+ (full rollout if false positive rate <5%)

---

## Appendix: Agentic Framing Checklist

- ✅ Loop Stage Mapping: Loop0 → Loop2 → Loop3 → Loop4 → Loop5
- ✅ Agent Goal: Detect anomaly autonomously, suggest interventions; teacher decides on action
- ✅ Tool Isolation: Detection via RPCs; LLM only for suggestions
- ✅ Privacy: K-anonymity enforced, no raw student data
- ✅ Loop Closure: Teacher feedback captured, aggregated daily, adapted next cycle
- ✅ Teacher Partnership: Urgent but partner-voice; max 2 alerts/day
- ✅ Guardrails: Frequency guard, after-hours suppression, escalation logic
- ✅ Success Metrics: Detection ≤2 min, 85%+ approval, 70%+ mood recovery, SCA-001 to SCA-006
