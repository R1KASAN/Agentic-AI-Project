# Climate Agent Phase 2 — Technical Implementation Guide

**Date**: 2026-03-16  
**Version**: 1.0  
**Status**: Ready for Implementation  
**Target Timeline**: 5-6 weeks (Week 1-2 shared infrastructure, Week 2-5 feature development, Week 5-6 testing & hardening)

---

## Executive Overview

Phase 2 transforms Climate Agent from a reporting tool (Level 1) into an autonomous proactive agent (Level 2) with:
- **W06 Morning AI Briefing** — Daily 7:30 AM personalized climate briefing via LINE with teacher approval gate
- **W07 Mood Anomaly Alert** — Real-time (30min intervals) anomaly detection with immediate LINE notification & rapid interventions
- **Loop Closure UI** — Dashboard enhancement tracking "Mark as Done" workflow with feedback collection

All three features **close the agentic loop** (Sense → Reason → Act → Self-Evaluate → Learn) required by Constitution v2.0 and feed metrics back into continuous improvement.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Climate Agent Phase 2                          │
│                    (Autonomous Agentic System)                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ PERCEPTION LAYER (Sense)                                            │
├─────────────────────────────────────────────────────────────────────┤
│ • Student Check-ins (student_pulses table, real-time)              │
│ • Historical Baselines (3-week rolling avg, class-level aggregates) │
│ • Class Context (enrollment, teacher availability, school calendar) │
│ • Teacher Feedback (prior recommendations marked "done", feedback)  │
└─────────────────────────────────────────────────────────────────────┘
           ↓ RLS-guarded RPC calls (k-anonymity enforced)
┌─────────────────────────────────────────────────────────────────────┐
│ REASONING LAYER (Brain)                 n8n v2.8.3                 │
├─────────────────────────────────────────────────────────────────────┤
│ W01: Agentic AI Recommendation       [EXISTING]                     │
│   → Daily 06:00 trigger                                             │
│   → LangChain agent (langchain.agent node)                         │
│   → Tool-using pattern: invokes sub-tools via toolWorkflow nodes   │
│                                                                     │
│ W06: Morning AI Briefing              [NEW - Phase 2]              │
│   → Daily 07:30 trigger (after W01 completes)                     │
│   → Personalization: trend analysis + teacher action pattern       │
│   → Output: pending briefing → dashboard approval gate             │
│                                                                     │
│ W07: Mood Anomaly Alert               [NEW - Phase 2]              │
│   → Every 30 min trigger OR webhook on new check-in               │
│   → Rule-based detection (mood drop >30%) + LLM severity class    │
│   → Output: high/medium alert → LINE (gated by daily max)         │
│                                                                     │
│ Shared Tools:                                                       │
│   • tool-get-climate-summary (RPC call)                           │
│   • tool-anomaly-detection (rule-based + LLM)                     │
│   • tool-line-notify (LINE API abstraction)                       │
│   • tool-frequency-guard (daily notification guard)               │
└─────────────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────────────┐
│ ACTION LAYER (Act)                                                  │
├─────────────────────────────────────────────────────────────────────┤
│ W06: LINE message → Dashboard → Teacher approval gate              │
│      POST /api/briefings/approve → LINE send confirmation         │
│                                                                     │
│ W07: LINE message (immediate, guarded by frequency)               │
│      POST /api/alerts/:id/acknowledge (dashboard response)        │
│                                                                     │
│ Common: Webhook receiver (POST /api/n8n/webhook)                 │
│         → Cache revalidation (revalidatePath)                      │
│         → Status updates                                           │
└─────────────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────────────┐
│ SELF-EVALUATION LAYER (Learn)                                       │
├─────────────────────────────────────────────────────────────────────┤
│ Loop Closure UI:                                                    │
│   • Dashboard page: /teacher/class/[id]/actions                    │
│   • Teacher marks recommendation "Done" + captures action_type     │
│   • POST /api/recommendations/:id/close                           │
│   • Aggregates: closure_rate %, action_frequency, response_time   │
│                                                                     │
│ Audit Logging:                                                      │
│   • n8n_audit_log extended with decision_type, severity, feedback │
│   • Nightly summary aggregation                                    │
│   • Admin dashboard: closure metrics, teacher engagement trends    │
└─────────────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────────────┐
│ ADAPTATION LAYER (Adapt) — Phase 3                                  │
├─────────────────────────────────────────────────────────────────────┤
│ (Placeholder for Level 3 threshold tuning)                         │
│ • Per-teacher policy profiles (action patterns, response rates)    │
│ • Per-class norms (class size, cultural context sensitivity)      │
│ • Policy parameter adjustments (thresholds, frequencies)          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Integrated Loop

```
PHASE 2 AGENTIC LOOP (5-Step Closure)

1. SENSE (student check-in)
   ↓
   student_pulses table (new row)
   ↓ (k≥3 aggregation, RLS-guarded)
   ↓
2. REASON (n8n workflow)
   ├─ W06 @ 07:30: Aggregate mood, trend, generate briefing  
   ├─ W07 @ 30min: Detect anomalies, classify severity
   └─ Both: Invoke LLM for context/recommendations
   ↓
3. ACT (notification + approval)
   ├─ W06: Store briefing_queue "pending" → POST /api/n8n/webhook
   │   ├─ Dashboard shows: "Approve & Send" button
   │   └─ Teacher clicks → POST /api/briefings/approve
   │       → LINE send → briefing_queue.status = "sent"
   │
   ├─ W07: Immediately (within 2 min): LINE send (if guard ok)
   │   ├─ Alert stores in mood_alerts table
   │   └─ Dashboard shows: "Acknowledged" button & optional modal
   │       → Teacher clicks → POST /api/alerts/:id/acknowledge
   │
   └─ Both: audit log entry with decision + timestamp
   ↓
4. SELF-EVALUATE (feedback collection & metrics)
   ├─ Loop Closure UI:
   │   └─ Teacher marks recommendation "Done"
   │       → POST /api/recommendations/:id/close
   │       → Captures action_type + optional feedback
   │       → Aggregates closure_rate % for display
   │
   └─ Audit logs track:
       ├─ Teacher viewed/acknowledged (latency)
       ├─ Teacher implemented (closure)
       ├─ Intervention type (icebreaker, one-on-one, etc.)
       ├─ Student mood post-action (trend recovery)
       └─ Dismissed (with reason)
   ↓
5. LEARN (metrics → next briefing/alert)
   ├─ Weekly nightly aggregation:
   │   ├─ Closure rate % (display in next briefing)
   │   ├─ High-trust interventions (boost in recommendations)
   │   ├─ Overloaded teachers (reduce frequency)
   │   └─ False-positive alerts (adjust thresholds)
   │
   └─ Next briefing/alert incorporates:
       ├─ Teacher action patterns
       ├─ Tone match (if teacher dismisses detailed recs, reduce volume)
       ├─ Class-specific learning (which interventions worked)
       └─ Trust signal (high-trust actions flagged in next rec)
```

---

## Shared Infrastructure (Common to All Features)

### 1. LINE API Abstraction Layer

**File**: `src/lib/line-notify.ts`

```typescript
// Centralized LINE API client for n8n & dashboard
interface LineNotifyMessage {
  message: string;
  stickerPackageId?: number;
  stickerId?: number;
  imageUrl?: string;
  imageThumbnail?: string;
}

export async function sendLineNotify(
  userLineId: string,
  payload: LineNotifyMessage
): Promise<{ messageId: string; status: "success" | "error" }>;

// Usage in n8n: n8n-nodes-base.httpRequest → {baseUrl, endpoint, method, auth}
// n8n will use env vars: LINE_NOTIFY_TOKEN, LINE_CHANNEL_ACCESS_TOKEN
```

### 2. Notification Frequency Guard

**Table**: `notification_log`

```sql
CREATE TABLE notification_log (
  id BIGSERIAL PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  notification_type VARCHAR(50) NOT NULL, -- 'briefing', 'anomaly_alert'
  sent_date DATE NOT NULL,
  count INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(school_id, class_id, notification_type, sent_date)
);

-- Guard logic: before LINE send, check:
-- SELECT COUNT(*) FROM notification_log 
-- WHERE class_id = $1 AND sent_date = now()::date
-- IF count >= 2 THEN queue for next day OR skip
```

**N8N Node Pattern** (used in both W06 & W07):
```
Node: "Check Frequency Guard"
Type: n8n-nodes-base.postgres
Query: SELECT COUNT(*) as notification_count FROM notification_log WHERE ...
Output: {notification_count: 1}

Node: "IF Guard Passed"
Type: n8n-nodes-base.if
Condition: notification_count < 2
Branch 0 (true): proceed to LINE send
Branch 1 (false): queue for next day
```

### 3. Extended Audit Logging

**Table Extension**: `n8n_audit_log`

```sql
ALTER TABLE n8n_audit_log ADD COLUMN (
  workflow_id VARCHAR(255),
  workflow_name VARCHAR(255), -- 'W06_Briefing', 'W07_Anomaly', 'Loop_Closure'
  decision_type VARCHAR(50), -- 'briefing_generated', 'anomaly_detected', 'closure_recorded'
  severity VARCHAR(20), -- 'routine', 'warning', 'critical' (for W07)
  teacher_action_type VARCHAR(100), -- 'icebreaker', 'one-on-one', 'revisit-content', 'other'
  feedback_sentiment VARCHAR(20), -- 'positive', 'neutral', 'negative'
  response_latency_seconds INT, -- time from notification to first action
  closure_latency_hours INT, -- time from recommendation send to "marked done"
  created_at TIMESTAMP DEFAULT now(),
  INDEX idx_workflow_date (workflow_name, created_at)
);
```

**Audit Entry Pattern** (n8n):
```javascript
// Logged after every agent decision
{
  workflow_name: "W06_Briefing",
  decision_type: "briefing_generated",
  class_id: "...",
  teacher_id: "...",
  payload: { mood: 3.2, trend: "+0.3", num_students: 24 },
  action_taken: "briefing queued for approval",
  created_at: "2026-03-16T07:35:00Z"
}
```

---

## Database Migration Sequence

All migrations follow naming convention `0XX_*.sql` in `supabase/migrations/`.

### Phase 2 Migrations (in order):

1. **020_briefing_queue.sql** — W06 table creation
2. **021_mood_alerts_and_logs.sql** — W07 tables + frequency guard
3. **022_recommendation_enhancements.sql** — Loop Closure fields
4. **023_audit_log_extensions.sql** — Audit logging enhancements
5. **024_views_and_aggregates.sql** — Summary views for dashboards

See individual feature files for full SQL schema.

---

## N8N Workflow Orchestration

### Workflow Dependencies & Schedule

```
06:00 UTC — W01 Agentic AI Recommendation (EXISTING)
           ├─ Runs daily, independent trigger
           └─ Generates: recommendations table entries
                ↓
07:30 UTC — W06 Morning AI Briefing (NEW)
           ├─ Depends on: W01 completion (briefing sources from recommendations)
           ├─ Trigger: Daily schedule
           └─ Output: briefing_queue.status = "pending" → webhook to dashboard
                ↓
DASHBOARD → Teacher approval gate (human decision)
                ↓
WEBHOOK → N8N triggered on approval
           ├─ Update briefing_queue.status = "sent"
           ├─ LINE send via LINE API node
           └─ Audit log entry
                ↓
30-min repeating — W07 Mood Anomaly Alert (NEW)
           ├─ Trigger: Schedule every 30 min (or webhook on check-in)
           ├─ Check frequency guard: max 2 alerts/day per class
           ├─ If guard: proceed to anomaly detection
           └─ Output: mood_alerts table + LINE send (immediate, no approval gate)
                ↓
DASHBOARD → Teacher acknowledges alert
           └─ Captures interval action ("I'll try this"), response_latency
                ↓
4-Hour window → Teacher marks recommendation "Done" (Loop Closure)
           ├─ Trigger: Manual action via POST /api/recommendations/:id/close
           ├─ Capture: action_type, optional feedback
           └─ Output: recommendations.closure_status = "implemented"
                ↓
Nightly (01:00 UTC) — Aggregation Job (Phase 2 enhancement to existing summary)
           ├─ Calculate daily metrics: closure_rate %, action_types, response_times
           ├─ Feed into next briefing LLM prompt (for personalization)
           └─ Admin dashboard updates
```

---

## Implementation Timeline & Delivery

### Week 1-2: Shared Infrastructure
- [ ] Create `src/lib/line-notify.ts` (LINE API client)
- [ ] Migrations 020-024 (DB schema)
- [ ] Set up n8n environment variables (LINE_NOTIFY_TOKEN)
- [ ] Create shared tool sub-workflows:
  - [ ] `tool-get-climate-summary` (existing? verify)
  - [ ] `tool-anomaly-detection` (new rule engine)
  - [ ] `tool-frequency-guard` (n8n node pattern)

### Week 2-3: W07 Mood Anomaly Alert
- [ ] N8N workflow: W07 (schedule trigger, anomaly detection, LINE send)
- [ ] Backend: `POST /api/alerts/:id/acknowledge`
- [ ] Frontend: Alert banner + quick action modal
- [ ] Testing: Load test with synthetic mood drop scenarios

### Week 3-4: W06 Morning AI Briefing
- [ ] N8N workflow: W06 (schedule trigger, LLM personalization, briefing_queue)
- [ ] N8N webhook handler: approval gate → LINE send
- [ ] Backend: `POST /api/briefings/approve`, `GET /api/briefings`
- [ ] Frontend: Briefing dashboard + "Approve & Send" CTA
- [ ] Integration: W07 guard integration (max 2 notifications/day)

### Week 4-5: Loop Closure UI
- [ ] N8N workflow: approval webhook → update recommendations table
- [ ] Backend: `POST /api/recommendations/:id/close`, aggregation queries
- [ ] Frontend: `/teacher/class/[id]/actions` page + modal
- [ ] Metrics: closure_rate % display + action_type histogram

### Week 5-6: Testing & Hardening
- [ ] E2E tests: full teacher flow (W06 → approval → W07 alert → closure)
- [ ] Load testing: 1000+ concurrent teachers, 5-minute traffic spike
- [ ] Anomaly false-positive tuning (adjust thresholds based on pilot data)
- [ ] Pilot school: 10-15 classes, 1 week live monitoring

---

## Constitutional Alignment Gates

✅ **Principle I — Autonomous Agency**: Each feature documents agent vs. teacher decision points.  
✅ **Principle II — Privacy-by-Design**: All aggregates k≥3; no raw student names in notifications.  
✅ **Principle III — Loop Closure**: All three features close Loop4/Loop5 with measurable targets.  
✅ **Principle IV — Human-in-the-Loop**: W06 approval gate; W07 tracked; Loop UI is feedback.  
✅ **Principle V — Minimum Friction**: Briefing <30s to read; alert <10s to acknowledge.  
✅ **Principle VI — Teacher Partnership**: Advisor tone; closure metrics visible.  
✅ **Principle VII — Scalability**: Multi-tenant; per-school guard; fully audit-logged.  
✅ **Principle VIII — No Invasive Monitoring**: Max 2 notifications/day enforced; no gamification.

---

## Success Metrics & Rollout Criteria

### Phase 2 Go/No-Go Gates

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **W06 Teacher Approval Rate** | ≥70% of all sent briefings approved within 2h | Dashboard: briefing_queue.status transitions |
| **W06 Implementation Rate** | ≥50% of approved recommendations marked "done" within 4h | Dashboard: recommendations.closure_status = "implemented" |
| **W07 False-Positive Rate** | <20% dismissals due to "not relevant" feedback | Admin: mood_alerts.dismissed_reason analysis |
| **W07 Response Latency** | 50th percentile <10 min (time from alert to acknowledgment) | Audit log: response_latency_seconds aggregation |
| **Loop Closure Rate** | ≥60% of daily recommendations → marked done within 48h (Principle III) | Audit log: closure_latency_hours aggregation |
| **Availability** | >99.5% (W06 & W07 workflows, LINE delivery) | n8n monitoring, webhook retry logs |
| **Data Privacy** | 0 violations (no raw student names in notifications, k≥3 enforced) | Audit: random sampling of 100 messages sent |

### Rollout Strategy

1. **Week 5-6 Pilot**: 1 school, 10-15 classes (~200 students)
   - Metrics collected daily, decision point mid-week
   - If go/no-go gates pass: proceed to broader rollout
   - If <70% approval rate or >20% false positives: patch & re-pilot

2. **Week 7-8 Beta**: 3-5 schools, 50-100 classes (~2000 students)
   - Close monitoring of closure rates, anomaly threshold tuning
   - Teacher feedback interviews (weekly)
   - Iterate on message tone & recommendation quality

3. **Week 9+ General Availability**:
   - Roll out to all schools on demand
   - Enable self-service: schools can configure notification times, languages, escalation chains

---

## Next Steps

Proceed to feature-specific technical plans:
1. [W06 Morning AI Briefing Technical Plan](./003-morning-briefing/TECHNICAL_PLAN.md)
2. [W07 Mood Anomaly Alert Technical Plan](./004-anomaly-alert/TECHNICAL_PLAN.md)
3. [Loop Closure UI Technical Plan](./005-closure-tracking/TECHNICAL_PLAN.md)

---

**Document Status**: Draft  
**Last Updated**: 2026-03-16  
**Author**: Climate Agent Phase 2 Planning  
**Review**: Pending PM, Tech Lead, Security Review
