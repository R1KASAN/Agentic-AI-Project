# Climate Agent Phase 2 — Complete Technical Implementation Package

**Date**: 2026-03-16  
**Status**: ✅ Complete & Ready for Development  
**Total Documentation**: 4 master documents + 3 feature-specific plans + architectural diagrams

---

## 📦 What's Included

### Core Technical Infrastructure Document
- **File**: `/specs/PHASE_2_TECHNICAL_IMPLEMENTATION.md`
- **Purpose**: Unified architecture overview, shared infrastructure patterns, timeline, and constitutional alignment
- **Contents**:
  - System architecture (5-layer model: Perception → Reasoning → Action → Self-Evaluation → Adaptation)
  - Shared infrastructure (LINE API, frequency guard, audit logging)
  - Database migration sequence
  - N8N workflow orchestration & dependencies
  - Constitutional alignment gates ✅
  - Implementation timeline (5-6 weeks)
  - Go/no-go success metrics

### Feature-Specific Technical Plans

#### 1. W06 Morning AI Briefing (3-4 weeks)
- **File**: `/specs/003-morning-briefing/TECHNICAL_PLAN.md`
- **Scope**: Daily 7:30 AM personalized climate briefing via LINE with teacher approval gate
- **Key Deliverables**:
  - Database schema: `briefing_queue` table (status lifecycle: pending → approved → sent)
  - N8N workflow (11 nodes): Schedule → RPC aggregation → LLM personalization → store → webhook → approve → LINE send
  - Frontend: `/teacher/briefings` page + BriefingCard component with approval UI
  - API endpoints: `POST /api/briefings/approve`, `POST /api/briefings/dismiss`, `GET /api/briefings`
  - Validation rules: k-anonymity (k≥3), LLM confidence threshold (≥0.6), tone guard (no alert words)
  - Testing: Unit tests (validation), E2E (approval flow), Load tests (100 classes, <5min execution)
  - Success metrics: ≥70% teacher approval rate, ≥50% implemented within 4h, <5% false rejects

#### 2. W07 Mood Anomaly Alert (3-4 weeks)
- **File**: `/specs/004-anomaly-alert/TECHNICAL_PLAN.md`
- **Scope**: Real-time (30-min intervals) anomaly detection with immediate LINE alert, no approval gate (urgent)
- **Key Deliverables**:
  - Database schema: `mood_alerts` table, `hourly_mood_aggregate` view, `mood_baselines` table
  - N8N workflow (19 nodes): Schedule/webhook → climate aggregation → rule-based detection (3 rules) → LLM severity classification → frequency guard → LINE send
  - Detection rules: 
    - Rule 1: ≥30% mood drop → HIGH severity
    - Rule 2: 15-30% drop + low engagement → MEDIUM
    - Rule 3: 15-30% drop → MEDIUM
  - Frontend: LiveAlertBanner component with quick intervention buttons + acknowledgment modal
  - API endpoints: `GET /api/alerts/active`, `POST /api/alerts/:id/acknowledge`, `POST /api/alerts/:id/action`
  - Rapid interventions: 2-3 LLM-generated 5-10 minute suggestions (icebreaker, check-in, etc.)
  - Testing: Anomaly detection logic tests, E2E alert generation, Load tests (50 concurrent anomalies)
  - Success metrics: <2 min latency, <20% false-positive rate, >70% acknowledgment rate, >40% implementation rate

#### 3. Loop Closure UI (2-3 weeks)
- **File**: `/specs/005-closure-tracking/TECHNICAL_PLAN.md`
- **Scope**: Dashboard enhancement for "Mark as Done" workflow with feedback collection
- **Key Deliverables**:
  - Database schema extensions: `recommendations` table (add closure_status, action_type, feedback fields), `teacher_engagement_stats` (nightly aggregation)
  - Dashboard page `/teacher/class/[id]/actions`: Recommendation history table with modal for closure capture
  - ClosureModal component: Action type dropdown (icebreaker, one-on-one, revisit, adjusted-pacing, other) + optional feedback text
  - API endpoints: `GET /api/recommendations/history`, `POST /api/recommendations/:id/close`, `GET /api/recommendations/closure-stats`
  - Nightly aggregation (N8N): Calculate closure_rate %, action_type histogram, avg response latency
  - Frontend metrics card: Display closure rate %, most-used action type, avg time to implement
  - Testing: Unit tests (closure calculation), E2E (mark done flow), Aggregation tests
  - Success metrics: ≥60% teacher adoption, ≥60% closure rate within 48h, >70% provide feedback, 2-4h avg latency

---

## 🗺️ Shared Infrastructure

All three features depend on and reuse:

| Component | File Location | Purpose |
|-----------|---------------|---------|
| **LINE Notify Client** | `src/lib/line-notify.ts` | Centralized LINE API integration (reused by W06 & W07) |
| **Frequency Guard** | `notification_log` table + n8n node pattern | Max 2 notifications/day per class (prevents spam) |
| **Audit Logging** | Extended `n8n_audit_log` table | Decision traceability: workflow_name, severity, decision_type, response_latency, teacher_action_type |
| **RPC Aggregation** | `get_class_climate_summary()`, `get_trend_comparison()` | K-anonymity enforced data access pattern |
| **Webhook Receiver** | `POST /api/n8n/webhook` (Next.js) | n8n → Dashboard triggers (revalidatePath, cache refresh) |

### Database Migrations (Sequence)

All new migrations follow `0XX_*.sql` pattern:

```
020_briefing_queue.sql              (W06: briefing_queue table + RLS)
021_mood_alerts_and_logs.sql        (W07: mood_alerts, hourly_mood_aggregate, notification_log)
022_recommendation_enhancements.sql  (Loop UI: alter recommendations with closure fields)
023_audit_log_extensions.sql        (All: extend n8n_audit_log with Phase 2 fields)
024_views_and_aggregates.sql        (All: summary views for dashboards)
```

---

## 📊 N8N Workflow Map (Phase 2)

```
EXISTING (Live)
06:00 UTC ─→ W01 Agentic AI Recommendation [Daily] [Independent trigger]
             Outputs: recommendations table entries

PHASE 2 (New)
07:30 UTC ─→ W06 Morning AI Briefing [Daily] [Depends on W01]
             Trigger: Schedule 07:30
             Output: briefing_queue (status='pending')
             ↓ [Awaits teacher approval]
             Webhook ─→ N8N approval handler
             Output: LINE send + briefing_queue.status='sent'

30 min  ──→ W07 Mood Anomaly Alert [Recurring] [Independent trigger]
             Trigger: Schedule every 30 min OR webhook on check-in
             Output: mood_alerts + LINE send (immediate, no approval)

01:00 UTC ─→ Nightly Aggregation [Daily] [Independent trigger]
             Output: teacher_engagement_stats table (for dashboard queries)

Loop4 Interaction (Real-time)
             POST /api/recommendations/:id/close
             ↓ (webhook → n8n optional async enhancer)
             Updates: recommendations.closure_status, teacher_action_type, feedback
             Feeds into: Next briefing LLM context (personalization)
```

---

## 🎯 Constitutional Alignment Verification

All Phase 2 features satisfy the 8 core principles of Constitution v2.0:

| Principle | W06 Briefing | W07 Anomaly | Loop UI | Evidence |
|-----------|-------------|-----------|---------|----------|
| **I. Autonomous Agency** | ✅ Agent decides briefing content; teacher approves send | ✅ Agent decides anomaly detection; teacher decides action | ✅ Teacher decides action type; agent aggregates learnings | Decision logs in n8n_audit_log; approval gate in UI |
| **II. Privacy-by-Design** | ✅ K≥3 aggregation; no raw names in LINE | ✅ K≥3 in hourly aggregate; no student IDs in alert | ✅ No student data exposed; only teacher metrics | RLS policies enforced; k-anonymity checks in RPCs |
| **III. Loop Closure** | ✅ Tracks teacher approval + implementation latency | ✅ Tracks response latency + intervention effectiveness | ✅ Core feature: closure_rate %, action types, latency | Loop4 closure metrics in recommendations & audit logs |
| **IV. Human-in-the-Loop** | ✅ Teacher approval gate before LINE send | ✅ No approval gate (urgent) but logged for awareness | ✅ Teacher chooses action type + provides feedback | API gates validate teacher ownership; modals require interaction |
| **V. Minimum Friction** | ✅ Briefing <280 chars (LINE limit); "Approve" = 1 click | ✅ Alert summary <100 words; "Acknowledged" = 1 tap | ✅ Modal opens inline; 3 inputs only (action, feedback, submit) | UI/UX constraints documented in frontend design |
| **VI. Teacher Partnership** | ✅ Advisor tone ("Your class is feeling..."); closure metric visible | ✅ Observer tone ("Mood is trending..."); suggests interventions not demands | ✅ Metrics displayed inspire partnership ("60% implementation rate") | Tone guidelines in LLM prompts; text examples in specs |
| **VII. Scalability** | ✅ Multi-tenant (school_id FK); per-school frequency guard | ✅ Multi-tenant; horizontal scaling of 30-min checks | ✅ Aggregation views support N schools; indexed queries | Architecture docs; migration design supports sharding |
| **VIII. No Invasive Monitoring** | ✅ No ranking/scoring of teachers; notification guarded at 2/day | ✅ Max 2 alerts/day enforced in guard logic; no student profiling | ✅ No behavioral tracking; only aggregate metrics shown | notification_log table enforces daily max; no student-level data exposed |

---

## 📅 Implementation Timeline (5-6 Weeks)

### Week 1-2: Shared Infrastructure *(Critical Path)*
- [ ] Create `src/lib/line-notify.ts` (LINE API client)
- [ ] Create database migrations 020-024
- [ ] Run migrations: `supabase db push`
- [ ] Set n8n environment: LINE_NOTIFY_TOKEN, Supabase creds
- [ ] **Testing**: Verify RPS can aggregate; verify k-anonymity guards
- **Milestone**: Infrastructure ready; W06 & W07 can proceed in parallel

### Week 2-3: W07 Mood Anomaly Alert *(Simpler Feature)*
- [ ] Build n8n workflow (19 nodes as specified)
- [ ] Test anomaly detection rules (mood drop % thresholds)
- [ ] Implement API endpoints (3x): alerts/active, alerts/:id/acknowledge, alerts/:id/action
- [ ] Build frontend: LiveAlertBanner + ClosureModal
- [ ] Load test: 50 concurrent anomalies
- **Milestone**: W07 live on test school; verify <2min detection latency, <20% false positives

### Week 3-4: W06 Morning AI Briefing *(Depends on W07 guard)*
- [ ] Build n8n workflow (11 nodes as specified)
- [ ] Test LLM personalization: confidence validation, tone guard, k-anonymity
- [ ] Implement API endpoints (3x): briefings/approve, briefings/dismiss, briefings fetch
- [ ] Build frontend: `/teacher/briefings` page + BriefingCard component
- [ ] E2E test: Full approval flow (briefing → approve → LINE)
- [ ] Load test: 100 classes, <5min execution
- **Milestone**: W06 live; verify ≥70% approval rate, ≥50% implementation within 4h

### Week 4-5: Loop Closure UI *(Depends on W06+W07 live)*
- [ ] Implement API endpoints: history, close, closure-stats
- [ ] Build dashboard page: `/teacher/class/[id]/actions`
- [ ] Build components: RecommendationHistoryTable + ClosureModal + MetricsCard
- [ ] Create nightly aggregation job (n8n + PostgreSQL)
- [ ] Test aggregation accuracy: spot-check 10 teachers
- **Milestone**: Loop closure UI live; metrics dashboard functional

### Week 5-6: Testing & Tuning *(Critical for Release)*
- [ ] Full E2E test: W06 → teacher approval → W07 alert → closure UI interaction
- [ ] Anomaly false-positive tuning: Adjust thresholds based on pilot data
- [ ] Teacher feedback collection: Post-alert & post-closure modals
- [ ] Pilot school rollout: 10-15 classes, 1 week live monitoring
- [ ] Go/no-go gates:
  - [ ] W06 approval rate ≥70%? YES / ADJUST TONE
  - [ ] W07 false-positive <20%? YES / ADJUST THRESHOLDS
  - [ ] Loop closure rate ≥60%? YES / INCREASE FREQUENCY
- **Milestone**: Go/no-go gates passed; ready for 3-5 school beta

---

## 🚀 Deployment Checklist

### Pre-Deployment (Week 5)
- [ ] All migrations tested in staging
- [ ] Environment variables set in n8n Docker & Vercel
- [ ] Line Notify token verified
- [ ] DNS/routing configured for webhooks
- [ ] Monitoring rules configured (latency, error rates, false positives)
- [ ] Runbooks written for on-call escalation

### Deployment (Week 6)
- [ ] 1. Push migrations to production
- [ ] 2. Deploy API routes (Next.js)
- [ ] 3. Deploy frontend (Vercel auto-deploy)
- [ ] 4. Import n8n workflows to production
- [ ] 5. Enable n8n triggers (start schedules, webhooks)
- [ ] 6. Smoke test: Trigger W06 manually, verify LINE delivery
- [ ] 7. Smoke test: Create test mood entry, verify W07 alert fires
- [ ] 8. Smoke test: Mark recommendation done, verify closure_status updates

### Post-Deployment (Week 6+)
- [ ] Monitor n8n execution times (target: <5 min for W06)
- [ ] Monitor LINE delivery success (target: >99%)
- [ ] Collect teacher feedback via in-app modal (daily for 1 week)
- [ ] Aggregate metrics: closure rate %, approval rate, false positive %
- [ ] Decision point (day 7): Go/no-go for expansion or iterate?

---

## 📈 Success Metrics & Rollout Criteria

### Phase 2 Go/No-Go Gates (Pilot School)

| Metric | Target | If Below Target |
|--------|--------|-----------------|
| **W06 Approval Rate** | ≥70% briefings approved within 2h | Adjust tone (less advisory, more action-oriented); reduce brevity (<240 chars) |
| **W06 Implementation** | ≥50% approved → marked done within 4h | Simplify recommendations (1 instead of 2); personalize action types |
| **W07 False Positives** | <20% dismissed as "not relevant" | Raise thresholds (35% instead of 30% mood drop); add engagement context |
| **W07 Response Latency** | 50th percentile <15 min (acknowledgment) | OK to proceed; monitor weekly; if >30 min, reduce frequency |
| **Loop Closure Rate** | ≥60% recommendations marked done within 48h | Core metric; if <50%, increase approachability of Modal (pre-populate, examples) |
| **Data Privacy** | 0 violations (no raw student names in notifications) | Audit: random sample 100 messages; escalate any breach |
| **Availability** | >99.5% uptime (W06 + W07 workflows + LINE delivery) | Investigate failures; enable retries if transient |

**IF ALL GATES PASS**: Proceed to 3-5 school beta (Week 7-8)  
**IF 1-2 GATES FAIL**: Implement fixes, re-test 1 week  
**IF 3+ GATES FAIL**: Hold release; escalate to PM & tech lead

---

## 📚 Documentation Structure

```
/specs/
├── PHASE_2_TECHNICAL_IMPLEMENTATION.md  ← Read first (overview)
│
├── 003-morning-briefing/
│   ├── spec.md                          (Feature spec)
│   ├── TECHNICAL_PLAN.md                ← Detailed W06 implementation
│   ├── data-model.md                    (Entity relationships)
│   ├── plan.md                          (Timeline & tasks)
│   └── contracts/                       (OpenAPI specs)
│
├── 004-anomaly-alert/
│   ├── spec.md                          (Feature spec)
│   ├── TECHNICAL_PLAN.md                ← Detailed W07 implementation
│   ├── data-model.md
│   ├── plan.md
│   └── contracts/
│
└── 005-closure-tracking/
    ├── spec.md                          (Feature spec)
    ├── TECHNICAL_PLAN.md                ← Detailed Loop UI implementation
    ├── data-model.md
    ├── plan.md
    └── contracts/
```

---

## 🔧 How to Use These Plans

### For Engineering Teams
1. **Start with**: `PHASE_2_TECHNICAL_IMPLEMENTATION.md` (architecture overview)
2. **Then assign**:
   - Backend engineers: `003-morning-briefing/TECHNICAL_PLAN.md` & `004-anomaly-alert/TECHNICAL_PLAN.md`
   - Frontend engineers: All three feature plans (UI pages + components)
   - DevOps: Migrations + n8n workflow deployment + monitoring setup
   - QA: Testing strategy sections in each plan + E2E test scenarios

### For Project Managers
1. **Timeline**: Week-by-week breakdown in PHASE_2_TECHNICAL_IMPLEMENTATION.md
2. **Go/No-Go Gates**: Success metrics section → decision criteria
3. **Risk Areas**: False-positive tuning (W07), LLM quality (W06), teacher adoption (Loop UI)
4. **Dependencies**: W07 can start Week 2; W06 depends on W07 guard; Loop UI depends on both live

### For Security/Privacy Review
1. **Privacy checks**: Constitution alignment table in this document
2. **k-anonymity enforcement**: See `get_class_climate_summary()` RPC specs
3. **Data retention**: Raw text 60 days → redact; audit logs 2 years
4. **RLS policies**: See migration SQL in data-model sections

---

## 🎓 Key Implementation Patterns

### N8N Workflow Pattern (W06 & W07)
```
[Schedule Trigger] 
  → [Get Data / RPC] 
  → [Validate (IF)] 
  → [Process / LLM] 
  → [Store in DB] 
  → [Guard Check (IF)] 
  → [Send Notification] 
  → [Audit Log]
```

### API Route Pattern (All Three Features)
```
POST /api/[feature]/[action]
  1. Extract session & validate teacher ownership
  2. Fetch data from Supabase
  3. Apply business logic
  4. Update database + audit log
  5. Trigger webhook (optional async n8n)
  6. revalidatePath(dashboard)
  7. Return to client
```

### Frontend Pattern (All Three Features)
```
Page (RSC)
  ← Server fetch from `/api/[feature]/` (no-store)
  → Display component (use client for interactions)
    → Modal / form triggers
    → POST to `/api/[feature]/[action]`
    → Auto-refresh via revalidatePath (server-side)
```

---

## ✅ Verification Checklist (Before Release)

### Code Review Checklist
- [ ] All N8N nodes have explicit credentials (not `{}`)
- [ ] All API routes validate teacher ownership
- [ ] All RLS policies match controller (RSC only, no raw queries)
- [ ] All LLM prompts include system instruction for tone/format
- [ ] All user-facing messages are < 280 chars (LINE limit)
- [ ] All migrations tested in staging environment
- [ ] Audit log entries include: workflow_name, decision_type, timestamp, payload
- [ ] Error handling: No silent failures; all errors logged + surface to user

### Testing Checklist
- [ ] Unit tests: Anomaly rules, closure calculations, validation logic ≥80% coverage
- [ ] E2E tests: Full flows (briefing approval, anomaly response, closure) passing
- [ ] Load tests: 100 concurrent classes (W06 <5min); 50 concurrent anomalies (W07 <2min)
- [ ] Regression tests: Existing workflows (W01, W05) unaffected
- [ ] Privacy audit: Random sample of 100 notifications → no raw student data ✅

### Deployment Checklist
- [ ] Migrations can run forward & backward without data loss
- [ ] n8n workflows have error handlers + retry logic
- [ ] Monitoring alerts configured (execution time, error rate, LINE delivery)
- [ ] Runbook written for common issues (LLM API down, LINE token expired, etc.)
- [ ] Pilot school contact identified + informed of go-live plan
- [ ] Comms ready: Teachers briefed on new features, no surprises

---

## 📞 Support & Escalation

### Common Issues & Resolution

| Issue | Root Cause | Resolution |
|-------|-----------|-----------|
| W06 approval rate <50% | LLM generating generic recommendations | Review sample briefing texts; adjust few-shot examples; increase personalization |
| W07 false-positive rate >25% | Thresholds too sensitive | Raise mood_drop threshold from 30% → 35%; require engagement <40% for MEDIUM severity |
| Loop closure rate <50% | Modal not discoverable or too complex | Simplify modal (2 inputs max); place button in table row context; reduce friction |
| LINE delivery latency >10s | API slowness or n8n queueing | Check n8n worker capacity; enable batching; verify LINE token rotation |
| Audit log missing entries | Webhook failed silently | Check Next.js error logs; verify n8n webhook authentication; add retry logic |

### Escalation Path
1. **Engineering**: On-call PM / tech lead (first 2 hours)
2. **If data loss**: Escalate to CTO + database team
3. **If privacy breach**: Escalate to Privacy Officer + Legal
4. **If >1 hour downtime**: Post incident in executive channel (#critical-incidents)

---

## 📖 References

- **Constitution v2.0**: `.specify/memory/constitution.md`
- **Agentic Loop Docs**: `docs/PLAN-edu-ai-orchestrator.md`
- **n8n Docs**: https://docs.n8n.io/advanced-ai/
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security

---

## Final Checklist Before Handoff to Engineering

- [ ] All three feature technical plans reviewed & approved by PM + Tech Lead
- [ ] Database migrations peer-reviewed (no SQL mistakes, RLS correct)
- [ ] N8N node configurations validated (credentials set, versions current)
- [ ] API endpoint specs match frontend expectations
- [ ] Constitutional alignment verified by Privacy Officer
- [ ] Success metrics & go/no-go gates signed off by PM
- [ ] Team assignments made (frontend, backend, devops, QA)
- [ ] First standup scheduled (kick-off meeting Week 1)

---

**Document Status**: ✅ Final (Ready for Engineering)  
**Approval**: Pending PM, Tech Lead, Security Review  
**Timeline**: 5-6 weeks to production  
**Risk Level**: MEDIUM (LLM quality, false-positive tuning, teacher adoption)  
**Recommendation**: Execute shared infrastructure Week 1-2; begin W07 in parallel with W06

---

**Last Updated**: 2026-03-16  
**Next Review**: 2026-03-23 (after Week 1 shared infrastructure completion)
