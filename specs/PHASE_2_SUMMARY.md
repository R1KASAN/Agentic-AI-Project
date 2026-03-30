# Climate Agent Phase 2 – Operational Agent: Feature Specification Summary

**Created**: 2026-03-16  
**Phase**: Phase 2 – Operational Agent  
**Status**: ✅ Ready for Planning & Engineering Handoff  
**Current Implementation Status**: W01✅, W02✅, W05✅ | W06🔄, W07🔄, UI🔄

---

## Overview: Phase 2 Deliverables (3 Features)

This document summarizes the three interdependent feature specifications that complete **Phase 2: Operational Agent**. Together, they implement a closed-loop agentic system where:

1. **W06 Morning Briefing** (Routine Policy R) — Daily proactive intelligence
2. **W07 Anomaly Alert** (Warning/Critical Policy W/C) — Real-time reactive response
3. **Loop Closure UI** (Self-Evaluation G) — Teacher feedback mechanism + agent learning

Each feature is grounded in **Agentic Loop Theory** (Sense → Reason → Plan → Act → Evaluate → Learn) and **Constitution v2.0** principles.

---

## Feature 1: W06 Morning AI Briefing ✅ Spec Ready

**Branch**: `003-morning-briefing` | **Spec**: [spec.md](specs/003-morning-briefing/spec.md) | **Checklist**: [CHECKLIST.md](specs/003-morning-briefing/CHECKLIST.md)

### Purpose
Deliver daily classroom climate intelligence to teachers before school starts, enabling proactive interventions.

### Agentic Loop Stages
- **Loop0**: Scheduled trigger (7:30 AM, school days)
- **Loop2**: Reason climate trends, select personalized recommendations via LLM
- **Loop3**: Deliver via LINE with approval gate
- **Loop4**: Teacher marks "Done" (optional feedback)
- **Loop5**: Agent learns: adjust LLM temperature, deprioritize low-engagement suggestions

### Key Requirements
- **Delivery**: Personalized briefing (Email-first / Notification) 7:30 AM on school days (M-F). (LINE Optional)
- **Content**: Mood aggregate (mean ± std), trend vs. baseline, 1–2 LLM suggestions, loop closure %, next check-in
- **Privacy**: k-anonymity enforced (k≥3); no raw student data
- **Approval Gate**: Teacher must approve before briefing leaves dashboard
- **Guard**: Max 2 notifications/day; skip if <3 students or teacher on leave
- **Learning**: Teacher response (Done/Dismissed/Feedback) feeds into next-cycle personalization

### Success Metrics
- **SC**: 95% delivery within 5 min; ≥90% approval rate; ≥60% closure in 48h
- **SCA**: Loop closure ≥60%, teacher approval ≥90%, zero policy violations, notification frequency 100% enforced

### N8N Workflow
- **Main**: `W06-agentic-ai-morning-briefing.json`
- **Sub-workflows**: tool-get-climate-summary, tool-check-teacher-availability, tool-check-notification-frequency, tool-get-past-recommendations

### Timeline
2–3 sprints (Spec → Build → Test → Beta → Rollout)

---

## Feature 2: W07 Mood Anomaly Alert ✅ Spec Ready

**Branch**: `004-anomaly-alert` | **Spec**: [spec.md](specs/004-anomaly-alert/spec.md) | **Checklist**: [CHECKLIST.md](specs/004-anomaly-alert/CHECKLIST.md)

### Purpose
Detect real-time classroom mood anomalies and trigger rapid intervention recommendations to prevent escalation.

### Agentic Loop Stages
- **Loop0**: Real-time monitoring (every 5 min OR event-driven on check-in insert)
- **Loop2**: Compute mood drop %, classify severity (rule-based), invoke LLM for interventions
- **Loop3**: Send alert (Email-first / Notification) immediately (no approval delay for critical alerts). (LINE Optional)
- **Loop4**: Teacher implements intervention; agent monitors 10-min window for mood recovery
- **Loop5**: Daily learning: tag high-trust/low-impact interventions based on success rate

### Key Requirements
- **Trigger**: Mood drop >30% vs. baseline OR engagement <2/5 for >50% of class (k≥3)
- **Severity**: Rule-based classification (Critical/Warning/Observation), no LLM for severity decision
- **Delivery**: Notification (Email/Other) within 2 min of detection; 2–3 rapid interventions (5–10 min actionable). (LINE Optional)
- **Privacy**: k-anonymity; no raw names/IDs; only aggregates + sentiment analysis
- **Guard**: Max 2 alerts/day; suppress after 3 PM; escalate to manager if unresponded 30 min
- **Learning**: Teacher marks "It helped" / "Didn't help" → tags interventions for personalization

### Success Metrics
- **SC**: 100% detection/delivery within 5 min; ≥85% approval; ≥70% mood recovery post-intervention
- **SCA**: Detection latency ≤2 min, 85%+ approval rate, 70%+ mood recovery correlation, <5% false positive rate

### N8N Workflow
- **Main**: `W07-agentic-ai-mood-anomaly.json`
- **Sub-workflows**: tool-get-mood-baseline, tool-check-teacher-availability, tool-get-high-trust-interventions

### Timeline
1–2 sprints (faster than W06; simpler decision tree, no approval gate delay)

---

## Feature 3: Loop Closure UI Enhancement ✅ Spec Ready

**Branch**: `005-closure-tracking` | **Spec**: [spec.md](specs/005-closure-tracking/spec.md) | **Checklist**: [CHECKLIST.md](specs/005-closure-tracking/CHECKLIST.md)

### Purpose
Capture teacher feedback on AI recommendations and enable agent learning through structured self-evaluation (Loop4/Loop5).

### Agentic Loop Stages
- **Loop4**: Dashboard widget — teacher marks "Done," provides optional feedback
- **Loop5**: Daily aggregation — sentiment analysis, success rate calc, high_trust tagging
- **Loop2** (next cycle): LLM prompt includes high_trust interventions, deprioritizes low-impact

### Key Requirements
- **Dashboard Widget**: "Recommendation History" (past 30 days) + "Closure Rate" badge
- **Interaction**: 1-click "Mark as Done" button; optional feedback field (300 chars max)
- **Status Fields**: Viewed / Acknowledged / Implemented / Dismissed + optional reason
- **Metrics**: Closure % = (count status IN [Viewed, Acknowledged, Implemented, Dismissed]) / (count all)
- **Tone Adaptation**: Positive (≥60%), balanced (30–60%), inquiry (<30%)
- **Feedback Analysis**: Keyword-based sentiment (positive/neutral/negative); no LLM fine-tuning without consent
- **Learning**: Weekly job tags interventions: high_trust if success_rate >70%, low_impact if <30%

### Success Metrics
- **SC**: 95%+ widget adoption; ≥60% closure rate; ≥50% feedback adoption
- **SCA**: Closure rate ≥60%, feedback adoption ≥50%, 70%+ high_trust recommendations used, personalization effectiveness improves week-over-week

### Components (Next.js/React)
- **RecommendationHistory**: RSC, queries past 30 days, filter/sort by status
- **ClosureMetricBadge**: Client component, tone-adaptive messaging
- **FeedbackTextarea**: Client form component, char counter, save via Server Action
- **BulkMarkDone Modal**: Checkbox selector, batch update button

### Timeline
1–2 sprints (primarily  UI; backend query optimization optional; daily aggregation job can be simple cron)

---

## Integrated Data Flow: Phase 2 Agentic Loop

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PHASE 2 INTEGRATED FLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

DAY BEGINS (6:30 AM)
│
├─→ [W06 Morning Briefing] (Loop0 → Loop2 → Loop3)
│   ├─ Fetch: class climate summary (k≥3 aggregates)
│   ├─ LLM: generate 2 suggestions (given past closure patterns from high_trust pool)
│   ├─ Format: Email-first briefing with approval gate
│   └─ Deliver: 7:30 AM (teacher approves before send via Email/Notification)
│
DURING SCHOOL DAY (Continuous Monitoring)
│
├─→ [W07 Anomaly Alert] (Loop0 → Loop2 → Loop3 → Loop4)
│   ├─ Monitor: mood check-ins every 5 min
│   ├─ Detect: mood drop >30% OR engagement critical
│   ├─ Severity: rule-based classification (no LLM guessing)
│   ├─ LLM: generate fast interventions (5–10 min actions)
│   ├─ Send: Alert immediately (no approval delay if Critical via Email/Notification)
│   ├─ Monitor: mood recovery check (wait 10 min, re-sample)
│   └─ Store: anomaly event + outcome in audit log
│
TEACHER INTERACTS (Throughout Day)
│
├─→ [Loop Closure UI] (Loop4 → Loop5)
│   ├─ Teacher dashboard: views "Recommendation History"
│   ├─ For each recommendation: [status, "✓ Mark Done" button, optional feedback]
│   ├─ Teacher clicks "Mark Done", optionally types feedback
│   ├─ Status updates: Viewed → Acknowledged → Implemented
│   └─ Feedback stored: sentiment will be analyzed nightly
│
END OF DAY (10 PM)
│
└─→ [Daily Aggregation Job] (Loop5)
    ├─ Query: all closures from past 24h
    ├─ Calculate: closure_rate, feedback_sentiment, success_rate per intervention
    ├─ Update: agent_learning_policies table
    │  ├─ high_trust interventions (success_rate >70%)
    │  └─ low_impact interventions (success_rate <30%)
    │
    └─ RESULT: Next briefing (tomorrow 7:30 AM) will be personalized
       ├─ High_trust interventions boosted in suggestion ranking
       └─ Low-impact interventions deprioritized

NEXT CYCLE (Week 2, Personalized)
│
└─→ [W06 with Learned Personalization]
    ├─ LLM prompt: "High-trust for this class: [list]"
    ├─ Boost: specific interventions teacher marked as "effective"
    └─ Result: 80%+ approval rate on suggestions (vs. 60% baseline)
```

---

## Agentic Principles: Constitution v2.0 Alignment

### Principle I: Agentic Transparency
- ✅ W06: Briefing shows past loop closure %
- ✅ W07: Alerts log anomaly detection logic (fully auditable)
- ✅ Loop UI: Dashboard shows closure rate, trending, agent learning progress

### Principle II: Privacy-by-Design
- ✅ W06: k-anonymity aggregates, no raw student names
- ✅ W07: k-anonymity on mood aggregates, sentiment analysis on feedback only
- ✅ Loop UI: Teacher owns feedback, can delete; no raw feedback for LLM training

### Principle III: Teacher Partnership
- ✅ W06: Partner language ("We noticed," "Let's try"), not audit tone
- ✅ W07: Urgent framing ("[⚠️ ALERT]") but supportive, not panic
- ✅ Loop UI: Positive tone ("Agency strong!"), reset framing (<30%), inquiry mode (<20%)

### Principle IV: Notification Sanity
- ✅ W06 + W07: Coordinated guard — max 2 notifications/day across both (Common across Email/LINE/Other)
- ✅ W07: Suppressed after 3 PM (except Critical)
- ✅ Escalation: Critical alerts unresponded >30 min escalate to manager

### Principle V: Deterministic Decision-Making
- ✅ W06: Decision path logged to audit (k-check → LLM invoke → delivery)
- ✅ W07: Severity classification is rule-based (no LLM guessing) + logged
- ✅ Loop UI: Sentiment analysis is transparent (keywords extracted, stored)

### Principle VI: Continuous Learning
- ✅ W06: High_trust pool grows from teacher feedback (Loop5)
- ✅ W07: Intervention tagging (high_trust/low_impact) informs next anomaly alert
- ✅ Loop UI: Closure rate trending shows partnership strength

---

## Engineering Handoff: Recommended Sequencing

### Sprint 1–2: W07 Anomaly Detection
**Why first?** Simpler decision logic (rule-based severity), no approval gate delay, fewer n8n dependencies.
- Build: Database trigger on student_pulses, mood baseline calculation, threshold logic
- Test: False positive rate <5%, detection latency <2 min
- Deploy: Pilot schools (5), monitor audit logs

### Sprint 2–3: W06 Morning Briefing
**Why second?** Depends on notification frequency guard (shared with W07), approval gate pattern, high_trust pool.
- Build: Scheduled trigger, LLM prompt with high_trust boost, approval gate dashboard UX
- Test: E2E with beta teachers, approval latency <5 sec
- Deploy: Staggered, monitor delivery success rate

### Sprint 3–4: Loop Closure UI
**Why third?** Depends on both W06 and W07 maturity (needs real feedback data flowing).
- Build: Dashboard components, daily aggregation job, sentiment analysis
- Test: Feedback adoption >50%, sentiment accuracy spot-check
- Deploy: Enable once W06+W07 have >1 week of live data

### Parallel: Shared Infrastructure
- Ensure `n8n_audit_log`, `mood_baselines`, `agent_learning_policies` tables exist
- Configure Email/Notification credentials, school calendar import (LINE Optional)
- Set up monitoring dashboards for detection latency, alert delivery, false positive rate

---

## Key Metrics & Monitoring (Phase 2)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Detection Latency** (W07) | ≤2 min | (detection_time - first_checkin_time) from audit |
| **Briefing Delivery** (W06) | 95% within 5 min | (actual_delivery - scheduled_time) |
| **Teacher Approval Rate** | ≥90% routine, ≥85% anomaly | (count approved) / (count sent) |
| **Loop Closure Rate** | ≥60% within 48h | (count status ≠ Pending) / (count all, excluding current <48h) |
| **Feedback Adoption** | ≥50% of Implemented | (count with feedback) / (count Implemented) |
| **Mood Recovery** (W07) | ≥70% of interventions | (count mood_increase >5% post-intervention) / (count implemented) |
| **False Positive Rate** (W07) | ≤5% | Manual review: anomalies that don't represent real climate issues |
| **Agent Learning Adoption** | ≥70% high_trust | (count recs from high_trust pool) / (count all recs) |
| **Policy Compliance** | 100% | (count violations in audit) = 0 (daily audit) |

---

## Risk Mitigation & Guardrails

| Risk | Mitigation |
|------|-----------|
| Alert fatigue (W07 too aggressive) | False positive target ≤5%, max 2 alerts/day, keyword monitoring, user feedback loop ([NEEDS CLARIFICATION during UAT]) |
| Low closure rate (teachers don't act) | Inquiry mode (<20% for 2 weeks), tone adjustment, optional format feedback modal |
| LLM suggestion quality varies | Fallback rule-based suggestions, high_trust tagging, teacher feedback signals |
| Privacy violations | K-anonymity enforcement, audit logging, soft-delete feedback preservation |
| Notification frequency creep | Shared guard across W06+W07, escalation to manager if bypass attempts detected |

---

## Dependencies & Prerequisites

### Must Exist Before Engineering Starts
- ✅ Supabase RLS policies for student_pulses, recommendations tables
- ✅ `n8n_audit_log` table (created in Phase 1)
- ✅ `mood_baselines` table (3-week rolling aggregates)
- ✅ `agent_learning_policies` table (high_trust tagging)
- ✅ `teacher_profiles.availability_status` column
- ✅ `school_calendar` table (holidays/breaks)
- [ ] Email/Notification credentials configured in n8n (LINE Optional)
- ✅ Web hooks configured for approval gate callback (W06)

### Nice-to-Have Optimizations
- Redis cache for mood_baselines (avoid recalc on every W07 trigger)
- Database index on (student_id, created_at) for fast check-in queries
- Message queue (e.g., Bull/Bee-Queue) for aggregation job reliability

---

## Success Definition: Phase 2 Complete ✅

**Phase 2 is considered successfully shipped when:**

1. ✅ W06 + W07 + Loop UI specifications are complete and validated
2. ✅ All three features are deployed to production and stable for ≥2 weeks
3. ✅ Loop closure rate ≥60% on both routine (W06) and anomaly (W07) alerts (Email/Notification)
4. ✅ Teacher approval rate ≥85% on anomaly alerts, ≥90% on routine briefings
5. ✅ Feedback adoption ≥50% on Loop Closure UI
6. ✅ False positive rate ≤5% on W07 (validated via user feedback)
7. ✅ Zero policy violations logged (100% compliance with Constitution v2.0)
8. ✅ Agent learning is active: ≥70% of recommendations use high_trust pool within 4 weeks

---

## Specification Document References

| Document | Branch | Status |
|----------|--------|--------|
| [W06 Morning Briefing Spec](specs/003-morning-briefing/spec.md) | `003-morning-briefing` | ✅ Ready |
| [W06 Quality Checklist](specs/003-morning-briefing/CHECKLIST.md) | `003-morning-briefing` | ✅ Approved |
| [W07 Anomaly Alert Spec](specs/004-anomaly-alert/spec.md) | `004-anomaly-alert` | ✅ Ready |
| [W07 Quality Checklist](specs/004-anomaly-alert/CHECKLIST.md) | `004-anomaly-alert` | ✅ Approved |
| [Loop Closure UI Spec](specs/005-closure-tracking/spec.md) | `005-closure-tracking` | ✅ Ready |
| [Loop Closure Quality Checklist](specs/005-closure-tracking/CHECKLIST.md) | `005-closure-tracking` | ✅ Approved |
| [Teacher Dashboard Redesign Spec](specs/007-teacher-dashboard-redesign/spec.md) | `007-teacher-dashboard-redesign` | ✅ Ready |

---

## Next Steps: Engineering Handoff

1. **Share specs** with backend (n8n specialist), frontend (React specialist), and database architect
2. **Conduct kick-off** to review agentic loop alignment and Constitution principles
3. **Create implementation tasks** in Linear/Jira, linked to spec requirements
4. **Set up monitoring dashboard** to track Phase 2 KPIs (detection latency, approval rate, closure rate, false positives)
5. **Plan UAT** with 5 pilot schools, 2–3 week duration per feature

---

**Prepared by**: GitHub Copilot (Agentic System Design)  
**Date**: 2026-03-16  
**Foundation**: Constitution v2.0, PRD v3.1, Agentic Loop Theory
