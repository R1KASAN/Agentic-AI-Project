# Phase 2 Master Tasks Index & Execution Plan
**Consolidation of All 7 Workstreams**  
**Total Tasks**: 75 (across INFRA, DB, W07, W06, LOOP, QA, DEPLOY)  
**Total Duration**: 6 weeks (42 days)  
**Status**: Ready for Execution  
**Last Updated**: Phase 2 task generation complete

---

## Executive Summary

Climate Agent Phase 2 implements three major feature workstreams (W06 Morning Briefing, W07 Mood Anomaly Alerts, Loop Closure Tracking UI) with supporting infrastructure, database, quality assurance, and deployment tasks. All 75 tasks are organized for parallel execution where possible, with explicit dependencies identified.

**Critical Success Factors**:
1. ✅ Infra foundation (INFRA) must complete first (days 1-9)
2. ✅ Database migrations (DB) run parallel to INFRA (days 1-7)
3. ✅ W07 (anomaly detection) depends on INFRA + DB (days 8-26)
4. ✅ W06 (morning briefing) depends on W07's frequency guard (days 15-24)
5. ✅ Loop closure depends on W06 + W07 (days 22-33)
6. ✅ QA testing runs parallel with feature development (days 22-42)
7. ✅ Deployment happens in final week (days 34-42)

**Success Metrics** (all must achieve):
- W06: >60% briefing approval rate within 2h
- W07: >70% alert acknowledgment rate within 5 min, <20% false positives
- Loop: >40% closure adoption within 48h
- All workstreams: <1% error rate, <99% availability
- QA: all go/no-go gates GREEN
- Deployment: pilot school metrics achieved (24h post-launch)

---

## Workstream Overview & Task Counts

| Workstream | ID | Focus | Tasks | Effort (Days) | Timeline | Owner |
|-----------|-----|-------|-------|---------------|----------|-------|
| **Infrastructure** | INFRA | Foundation: LINE API, frequency guard, auditing, N8N setup | 8 | 9 | Week 1–2 | DevOps/Backend |
| **Database** | DB | Schema evolution: 5 migrations (briefing_queue, alerts, aggregates) | 6 | 7 | Week 1–2 | Backend/DevOps |
| **W07 Anomaly** | W07 | Real-time anomaly detection: rules, LLM, N8N, API, UI, testing | 15 | 19 | Week 2–4 | Backend/Frontend/QA |
| **W06 Briefing** | W06 | Daily AI briefing: personalization, LLM, approval gate, N8N, UI, testing | 12 | 14 | Week 3–4 | Backend/Frontend/QA |
| **Loop Closure** | LOOP | Self-evaluation: closure modal, metrics, aggregation, adoption tracking | 9 | 12 | Week 4–5 | Backend/Frontend/QA |
| **QA Testing** | QA | Cross-feature QA: load, integration, privacy, tuning, UAT | 6 | 16 | Week 4–6 | QA/Security |
| **Deployment** | DEPLOY | Production readiness: pre-flight, pilot, monitoring, rollback, go-live | 5 | 9 | Week 5–6 | DevOps/Product |
| **TOTAL** | | | **75** | **~86 task-days** | **6 weeks** | **All teams** |

**Average team size**: 4–5 engineers (1–2 Backend, 1–2 Frontend, 1 DevOps, 0.5 QA/Product)

---

## Master Task Index (All 75 Tasks)

### INFRA (Infrastructure Foundation) — 8 Tasks, 9 Days

| Task ID | Title | Dependencies | Status |
|---------|-------|--------------|--------|
| INFRA-001 | Implement LINE Notify API abstraction layer | — | Ready |
| INFRA-002 | Implement frequency guard rate limiter (2/day max) | INFRA-001 | Ready |
| INFRA-003 | Audit logging: decision_type, severity, confidence_score | INFRA-001 | Ready |
| INFRA-004 | N8N environment setup: instance, auth, credentials | — | Ready |
| INFRA-005 | Migration harness & test script for controlled rollouts | — | Ready |
| INFRA-006 | Webhook receiver setup: `/api/n8n/webhook` for cache invalidation | — | Ready |
| INFRA-007 | N8N tool sub-workflows (5 tools): climate-summary, recommendations, counts, etc. | INFRA-004 | Ready |
| INFRA-008 | Staging environment validation & pre-deploy testing | INFRA-001 to INFRA-007 | Ready |

**Output**: LINE API layer, frequency guard logic, audit infrastructure, N8N foundation, 5 reusable tool sub-workflows

---

### DB (Database Schema Evolution) — 6 Tasks, 7 Days

| Task ID | Title | Dependencies | Status |
|---------|-------|--------------|--------|
| DB-001 | Migration 020: briefing_queue table (20 cols, RLS, status lifecycle) | — | Ready |
| DB-002 | Migration 021: mood_alerts, hourly_mood_aggregate, mood_baselines (3-table set) | — | Ready |
| DB-003 | Migration 022: recommendation_enhancements (closure tracking) | DB-001, DB-002 | Ready |
| DB-004 | Migration 023: audit_log_extensions (shared with INFRA-003) | DB-003 | Ready |
| DB-005 | Migration 024: teacher_engagement_stats (nightly aggregation table) | DB-002, DB-003 | Ready |
| DB-006 | Migration testing & rollback procedures (all 5 migrations) | DB-001 to DB-005 | Ready |

**Output**: 5 SQL migrations, rollback procedures, migration test suite

---

### W07 (Mood Anomaly Detection System) — 15 Tasks, 19 Days

| Task ID | Title | Dependencies | Status |
|---------|-------|--------------|--------|
| W07-001 | Design anomaly detection rules (4 rule paths: HIGH/MEDIUM/MEDIUM/NULL) | DB-002 | Ready |
| W07-002 | Implement `src/lib/anomaly-detector.ts` (rule engine) | W07-001, INFRA-008 | Ready |
| W07-003 | Implement LLM severity classifier (`anomaly-severity-classifier.ts`) | W07-002 | Ready |
| W07-004 | Design N8N workflow architecture (19 nodes, triggers, routing) | INFRA-007 | Ready |
| W07-005 | Implement & test N8N workflow (W07-Mood-Anomaly-Alert.json) | W07-002, W07-003, W07-004, INFRA-007 | Ready |
| W07-006 | API endpoints: GET /alerts, POST /alerts/:id/acknowledge, /action | DB-002, W07-005 | Ready |
| W07-007 | Frontend: LiveAlertBanner component (30-sec polling, severity colors) | W07-006 | Ready |
| W07-008 | Frontend: AcknowledgeModal component (suggested interventions, feedback) | W07-006 | Ready |
| W07-009 | Frequency guard integration test (verify 2 alerts/day enforced) | W07-005, INFRA-002 | Ready |
| W07-010 | Unit tests: anomaly detection rules (40+ test cases) | W07-002 | Ready |
| W07-011 | Unit tests: LLM classification (15+ test cases) | W07-003 | Ready |
| W07-012 | Integration tests: workflow + staging DB (end-to-end) | W07-005, DB-006 | Ready |
| W07-013 | E2E tests: full alert flow (detect → send → acknowledge → record) | W07-006, W07-007, W07-008 | Ready |
| W07-014 | Load test: 50 concurrent anomalies (latency, throughput) | W07-005, W07-006 | Ready |
| W07-015 | False-positive tuning: adjust thresholds based on pilot data | W07-014, QA-004 | Ready |

**Output**: Anomaly detection engine, LLM classifier, N8N workflow, API endpoints, frontend components, comprehensive tests, tuning results

---

### W06 (Morning AI Briefing System) — 12 Tasks, 14 Days

| Task ID | Title | Dependencies | Status |
|---------|-------|--------------|--------|
| W06-001 | Design personalization strategy (5-step: climate → trend → history → stats → tone) | DB-024 | Ready |
| W06-002 | Implement `src/lib/briefing-generator.ts` (LLM prompt + validation) | W06-001, W07-005 (freq guard must be live) | Ready |
| W06-003 | Design N8N workflow (11 nodes, daily 07:30 trigger) | INFRA-007, W06-002 | Ready |
| W06-004 | Implement & test N8N workflow (W06-Morning-Briefing.json) | W06-003, DB-020 | Ready |
| W06-005 | API endpoints: GET /briefings, POST /approve, /dismiss (frequency guard check) | DB-020, W06-004, INFRA-002 | Ready |
| W06-006 | Frontend: BriefingCard component (preview, pending badge) | W06-005 | Ready |
| W06-007 | Frontend: ApprovalModal component (full details, stats, approve/dismiss) | W06-005 | Ready |
| W06-008 | Dashboard integration: BriefingCard at top of teacher/class/[id] page | W06-006, W06-007 | Ready |
| W06-009 | Unit tests: briefing generation (15+ test cases) | W06-002 | Ready |
| W06-010 | Integration tests: workflow + staging DB (end-to-end) | W06-004, DB-006 | Ready |
| W06-011 | E2E tests: full briefing flow (generate → approve/dismiss → LINE send) | W06-005, W06-006, W06-007 | Ready |
| W06-012 | Load test: 100 classes generating briefings (latency, throughput) | W06-004, W06-005 | Ready |

**Output**: Personalization strategy, briefing generator, N8N workflow, API endpoints, frontend components, comprehensive tests, load results

---

### LOOP (Loop Closure Dashboard & Engagement Tracking) — 9 Tasks, 12 Days

| Task ID | Title | Dependencies | Status |
|---------|-------|--------------|--------|
| LOOP-001 | Design closure workflow & data schema | DB-022, DB-024 | Ready |
| LOOP-002 | API endpoints: GET history, POST close (with feedback), GET stats | LOOP-001, DB-022, DB-024 | Ready |
| LOOP-003 | Frontend: ClosureModal component (action type dropdown, feedback textarea) | LOOP-002 | Ready |
| LOOP-004 | Frontend: MetricsCard component (closure %, latency, histogram) | LOOP-002 | Ready |
| LOOP-005 | Frontend: ActionHistory page (list, filter, close modal integration) | LOOP-002, LOOP-003, LOOP-004 | Ready |
| LOOP-006 | N8N or API-based nightly aggregation (update teacher_engagement_stats) | DB-024 | Ready |
| LOOP-007 | Unit tests: closure API, aggregation logic | LOOP-002 | Ready |
| LOOP-008 | E2E tests: mark done → metrics updated | LOOP-002, LOOP-003, LOOP-004 | Ready |
| LOOP-009 | Adoption metrics collection & reporting | LOOP-006 | Ready |

**Output**: Closure modal, metrics card, history page, nightly aggregation job, API endpoints, tests, adoption metrics report

---

### QA (Quality Assurance & System Hardening) — 6 Tasks, 16 Days

| Task ID | Title | Dependencies | Status |
|---------|-------|--------------|--------|
| QA-001 | Load test: 100 classes concurrent W06/W07/check-ins (latency, error rate) | W07-005, W06-004, INFRA-008 | Ready |
| QA-002 | Integration test: W06 + W07 + Loop interactions (10+ scenarios) | W07-005, W06-004, LOOP-006 | Ready |
| QA-003 | Privacy/security audit (k-anonymity, RLS, PII scan, data retention) | All feature tasks | Ready |
| QA-004 | W07 false-positive tuning (threshold adjustments with pilot feedback) | W07-014 | Ready |
| QA-005 | UAT: 5 pilot schools, 2-week feedback loop (approval, ack, closure rates) | All feature tasks | Ready |
| QA-006 | Production readiness checklist & go/no-go gates (all 5 gates GREEN) | All QA tasks | Ready |

**Output**: Load test report, integration tests, privacy audit report, tuning results, UAT feedback, go/no-go checklist

---

### DEPLOY (Deployment & Production Release) — 5 Tasks, 9 Days

| Task ID | Title | Dependencies | Status |
|---------|-------|--------------|--------|
| DEPLOY-001 | Pre-deployment verification & migration plan | QA-006 | Ready |
| DEPLOY-002 | Pilot school onboarding (setup, success criteria, daily support) | DEPLOY-001 | Ready |
| DEPLOY-003 | Production observability & monitoring (Grafana, alerts, SLO) | DEPLOY-001 | Ready |
| DEPLOY-004 | Rollback procedures testing & runbook (3 levels: code, DB, full) | DEPLOY-001 | Ready |
| DEPLOY-005 | Go-live execution (deploy → pilot validation → 24h metrics) | DEPLOY-002, DEPLOY-003, DEPLOY-004 | Ready |

**Output**: Pre-flight checklist, pilot onboarding playbook, monitoring dashboards, rollback runbook, go-live runbook, metrics report

---

## Week-by-Week Gantt Chart

```
WEEK 1 (Days 1-7): Foundation & Schema
└─ Parallel Track 1: INFRA (1-5)
   ├─ INFRA-001: LINE API layer (Days 1-2)
   ├─ INFRA-002: Frequency guard (Days 3-4)
   ├─ INFRA-003: Audit logging (Days 4-5)
   ├─ INFRA-004: N8N environment (Days 1-3)
   └─ INFRA-005: Migration harness (Days 5-7)

└─ Parallel Track 2: DB (1-5)
   ├─ DB-001: Migration 020 (briefing_queue) (Days 1-2)
   ├─ DB-002: Migration 021 (mood_alerts) (Days 2-3)
   ├─ DB-003: Migration 022 (recommendation_enhancements) (Days 3-4)
   ├─ DB-004: Migration 023 (audit_log) (Days 4-5)
   └─ DB-005: Migration 024 (engagement_stats) (Days 5-6)

└─ Parallel Track 3: Planning/Design
   ├─ W07-001: Anomaly rules design (Days 3-5)
   ├─ W06-001: Briefing personalization design (Days 4-6)
   └─ LOOP-001: Closure workflow design (Days 5-7)

**Milestones**:
- End of Day 7: INFRA core features available; DB migration test suite passing
- Blockers for Week 2: INFRA-006, INFRA-007 (N8N setups) must complete
```

```
WEEK 2 (Days 8-14): N8N & Early W07
└─ Parallel Track 1: INFRA Completion
   ├─ INFRA-006: Webhook receiver (Days 8-9)
   ├─ INFRA-007: N8N sub-workflows (Days 9-11)
   └─ INFRA-008: Staging validation (Days 11-14)

└─ Parallel Track 2: W07 Begins
   ├─ W07-002: Anomaly detector implementation (Days 8-11)
   ├─ W07-003: LLM severity classifier (Days 11-13)
   ├─ W07-004: N8N workflow design (Days 12-14)
   └─ W07-010: Unit tests for detection (Days 10-14)

└─ Parallel Track 3: W06/LOOP Planning
   ├─ DB-006: Migration testing & rollback (Days 12-14)
   └─ Prep frontend component designs

**Milestones**:
- End of Day 14: INFRA complete (all 8 tasks); W07 >50% implementation; DB migrations fully tested
- Blockers for Week 3: W07-005 workflow implementation critical path
```

```
WEEK 3 (Days 15-21): W07 Full Implementation & W06 Begins
└─ Parallel Track 1: W07 Core
   ├─ W07-005: N8N workflow implementation (Days 15-18)
   ├─ W07-006: API endpoints (Days 18-20)
   ├─ W07-009: Frequency guard integration (Days 19-21)
   └─ W07-011/012: Testing (Days 19-21)

└─ Parallel Track 2: W06 Preparations
   ├─ W06-002: Briefing generator implementation (Days 15-18)
   ├─ W06-003/004: N8N workflow (Days 18-21)
   └─ W06-009: Unit tests (Days 17-21)

└─ Parallel Track 3: Frontend
   ├─ W07-007: LiveAlertBanner component (Days 17-19)
   ├─ W07-008: AcknowledgeModal component (Days 19-21)
   ├─ W06-006: BriefingCard component (Days 18-20)
   └─ W06-007: ApprovalModal component (Days 20-21)

**Milestones**:
- End of Day 21: W07 >90% complete (API + frontend ready); W06 >60% complete; W07 APIs deployable
- Blockers for Week 4: LOOP depends on W06+W07; QA-004 depends on W07 data
```

```
WEEK 4 (Days 22-28): W06 Finishes, LOOP Begins, QA Starts
└─ Parallel Track 1: W06 Completion
   ├─ W06-005: API endpoints (Days 22-24)
   ├─ W06-008: Dashboard integration (Days 24-26)
   ├─ W06-010/011: Integration & E2E tests (Days 24-27)
   └─ W06-012: Load test (Days 27-28)

└─ Parallel Track 2: LOOP Begins
   ├─ LOOP-002: API endpoints (Days 22-24)
   ├─ LOOP-003: ClosureModal component (Days 24-25)
   ├─ LOOP-004: MetricsCard component (Days 25-26)
   ├─ LOOP-005: ActionHistory page (Days 26-27)
   └─ LOOP-006: Nightly aggregation (Days 25-28)

└─ Parallel Track 3: QA Begins
   ├─ QA-001: Load test setup (Days 22-24)
   ├─ QA-002: Integration test scenarios (Days 23-25)
   ├─ QA-003: Privacy audit (Days 25-27)
   └─ QA-004: False-positive tuning setup (Days 26-28)

└─ Parallel Track 4: W07 Polish & Testing
   ├─ W07-013/014/015: E2E, load test, tuning (Days 22-28)

**Milestones**:
- End of Day 28: W06 complete (API + UI); LOOP >70% complete; QA >50% complete; all features deployed to staging
- Blockers for Week 5: QA-005 (UAT) can only start once all features on staging
```

```
WEEK 5 (Days 29-35): LOOP Completion, QA Full Swing, Pre-Deployment
└─ Parallel Track 1: LOOP Completion
   ├─ LOOP-007/008: Unit & E2E tests (Days 29-30)
   ├─ LOOP-009: Adoption metrics (Days 31-33)
   └─ Feature complete for production

└─ Parallel Track 2: QA Full Execution
   ├─ QA-005: UAT with 5 pilot schools (Days 29-35, continuous)
   ├─ QA-004: False-positive tuning with live data (Days 30-34)
   ├─ QA-006: Go/no-go gates (Day 35)
   └─ Integration & load tests ongoing

└─ Parallel Track 3: Pre-Deployment
   ├─ DEPLOY-001: Pre-deployment verification (Days 32-33)
   ├─ DEPLOY-003: Prod monitoring setup (Days 33-35)
   ├─ DEPLOY-004: Rollback procedures (Days 33-34)
   └─ DEPLOY-002: Pilot school prep (Days 32-35)

**Milestones**:
- End of Day 35: All features complete; QA gates reviewed; pre-deployment checklist ✓; pilot school agreements signed
- Decision: GO or NO-GO at end of Day 35
```

```
WEEK 6 (Days 36-42): Deployment, Pilot Validation, Success Metrics
└─ Day 36-37: Final Prep
   ├─ DEPLOY-005: Go-live execution (Day 36)
   ├─ Deploy code to production
   ├─ Activate N8N workflows
   └─ First W06 briefing generation (07:30 UTC Day 36)

└─ Days 37-42: Pilot Validation & Monitoring
   ├─ DEPLOY-002: Daily pilot school check-ins (Days 36-42)
   ├─ DEPLOY-003: Monitor Grafana dashboards continuously
   ├─ DEPLOY-005: 24h metrics collection (Days 36-37)
   ├─ Post-go-live incident response (if needed)
   └─ Metrics trending (approval%, clos%, error rate)

**Milestones**:
- End of Day 37: W06 briefing sent to all pilot schools (07:30 UTC); first alerts sent (W07)
- End of Day 42: 24h metrics reviewed; all KPIs met; decision to expand beyond pilot schools (Phase 3)

**Success Criteria (All Must Be True)**:
- [ ] W06 approval rate >60%
- [ ] W07 alert acknowledgment rate >70%
- [ ] W07 false-positive rate <20%
- [ ] LOOP closure rate >40%
- [ ] Error rate <1%
- [ ] API latency p95 <5s (W06), <2s (W07)
- [ ] Privacy audit: 0 critical findings
- [ ] Pilot school feedback: NPS >7
```

---

## Critical Path Analysis

**Longest dependency chain** (determines minimum project duration):

```
Day 1:  INFRA-001 (LINE API) ──→ 2 days
Day 3:  INFRA-004 (N8N env) ──→ 3 days
Day 6:  INFRA-007 (sub-workflows) ──→ 3 days
Day 9:  W07-002 (Anomaly detector) ──→ 4 days
Day 13: W07-003 (LLM classifier) ──→ 2 days
Day 15: W07-005 (N8N workflow) ──→ 4 days
Day 19: W07-006 (API endpoints) ──→ 2 days
Day 21: INFRA-002 dependency met (freq guard)
Day 21: W06-002 (Briefing generator) ──→ 4 days
Day 25: W06-004 (N8N workflow) ──→ 4 days
Day 29: W06-005 (API endpoints) ──→ 2 days
Day 31: LOOP-002 (API endpoints) ──→ 2 days
Day 33: QA-005 (UAT) ──→ 3 days (parallel)
Day 35: DEPLOY-001 ──→ 1 day
Day 36: DEPLOY-005 (Go-live) ──→ 1 day

**Critical path**: INFRA-001 → INFRA-004 → INFRA-007 → W07-002 → W07-003 → W07-005 → W07-006 → W06-002 → W06-004 → W06-005 → LOOP-002 → QA-005 → DEPLOY-001 → DEPLOY-005
**Total critical path**: ~39 days (6 weeks)

**Non-critical paths** (can be delayed without affecting project):
- DB migrations (parallel to INFRA, 1 day buffer)
- QA-001/002/003/004 (parallel, ~5 day buffer)
- LOOP-003–009 (parallel, flexible completion)

**Key bottlenecks**:
1. **INFRA-002 (frequency guard)**: Required before W06 starts. Any delay here cascades.
2. **W07-005 (N8N workflow)**: Required for W06 personalization. Cannot start W06 until this is done.
3. **QA-005 (UAT)**: Compresses into Week 5. Slow UAT feedback could delay deployment.
```

---

## Parallel Execution Examples

### Week 3: Maximum Parallelism
```
Team Members: 4 (Backend, Backend, Frontend, Frontend)

Team A (Backend):
    09:00-12:00: W07-005 (N8N workflow), morning impl
    13:00-17:00: W07-006 (API), afternoon code

Team B (Backend):
    09:00-12:00: W06-002 (Briefing gen), morning design
    13:00-17:00: W06-003&004 (N8N prep), afternoon planning

Team C (Frontend):
    09:00-12:00: W07-007 (LiveAlertBanner), morning component
    13:00-17:00: W07-008 (AcknowledgeModal), afternoon component

Team D (Frontend):
    09:00-12:00: W06-006&007 (BriefingCard, ApprovalModal), morning
    13:00-17:00: Component polish, afternoon

**Synergy**: Each team dependent on previous day's output
    Day 15: Design complete (W07-004, W06-003)
    Day 16: APIs can test with mocked N8N
    Day 17: Frontend can test with mocked APIs
    Day 18: Integration testing begins
```

### Week 4: W06 + LOOP + QA Parallel
```
Team Members: 5 (Backend, Backend, Backend, Frontend, Frontend)

Team A (Backend): W06-005 + W06-010 (API + tests)
Team B (Backend): LOOP-002 + W07 polish
Team C (Backend): QA-001 + QA-003 (Load test + Privacy audit)
Team D (Frontend): W06-008 + LOOP-003/004/005
Team E (Frontend): LOOP + QA-002 (Integration tests)

**Outcome**: By end of Week 4, all feature APIs done, all frontends done, all tests ready
```

---

## Team Assignments (Recommended)

### Suggested Structure: 2 Sprints × 4-5 Engineers

#### Sprint 1 (Weeks 1-3): Foundation & W07
```
Team Composition: 1 Tech Lead, 1 Backend, 1 Frontend, 1 DevOps
(5 days/week × 3 weeks = 15 task-days available)

Tech Lead / Backend Lead:
    - INFRA-001 to INFRA-008 (8 tasks)
    - W07-001, W07-002, W07-003 (design + implementation)
    - Code review + pair programming

Backend:
    - W07-004, W07-005, W07-006 (N8N + API)
    - DB migrations + testing

Frontend:
    - W07-007, W07-008 (components)
    - Test infrastructure setup

DevOps:
    - INFRA-004, INFRA-005, INFRA-006, INFRA-007
    - N8N environment setup
    - CI/CD pipeline updates
```

#### Sprint 2 (Weeks 4-6): W06 + LOOP + QA + Deploy
```
Team Composition: 1 Tech Lead, 2 Backend, 2 Frontend, 1 DevOps, 1 QA, 1 Product
(5 days/week × 3 weeks = 15 task-days per person)

Tech Lead:
    - W06 & LOOP technical oversight
    - Code review
    - QA-006 (go/no-go gates)

Backend 1:
    - W06-002, W06-004, W06-005 (Briefing gen + APIs)
    - LOOP-002, LOOP-006 (API + aggregation job)

Backend 2:
    - W07 refinement + load testing
    - QA-001, QA-002, QA-003 (Load, integration, privacy)

Frontend 1:
    - W06-006, W06-007, W06-008 (Components + dashboard)

Frontend 2:
    - LOOP-003, LOOP-004, LOOP-005 (Components + history page)
    - W06-006/007 support

DevOps:
    - QA infrastructure (load test setup)
    - DEPLOY-003, DEPLOY-004 (Monitoring, rollback)
    - DEPLOY-001, DEPLOY-005 (Pre-flight, go-live)

QA:
    - QA-001 to QA-006 (Load, integration, UAT, go/no-go)
    - Test automation
    - Pilot school coordination

Product:
    - DEPLOY-002 (Pilot onboarding + daily calls)
    - Stakeholder communication
```

### Skills Required

| Skill | Required For | Key Tasks |
|-------|-------|-----------|
| **TypeScript/Node.js** | INFRA, W07, W06, LOOP (all services) | INFRA-001/002/003, W07-002/003, W06-002 |
| **React** | Frontend components | W07-007/008, W06-006/007, LOOP-003/004/005 |
| **PostgreSQL** | Database schema + RLS | DB-001 to DB-006 |
| **N8N** | Workflow orchestration | INFRA-004, INFRA-007, W07-005, W06-004, LOOP-006 |
| **LLM/Gemini API** | Briefing gen + severity classification | W06-002, W07-003 |
| **Testing (Jest/E2E)** | QA tasks | QA-001 to QA-006, all feature unit/integration tests |
| **DevOps/Infrastructure** | Deployment, monitoring, scaling | INFRA-004 to INFRA-008, DEPLOY-001 to DEPLOY-005, DEPLOY-003 |
| **Product Management** | Requirements, validation, feedback | DEPLOY-002, QA-005, all workstream planning |

---

## Success Criteria & KPIs

### Feature Adoption (Primary Metrics)

| KPI | Target | Measurement | Acceptance Criteria |
|-----|--------|-------------|-------------------|
| **W06 Approval Rate** | >60% | briefings approved / briefings generated | Teachers find briefings valuable |
| **W07 Acknowledgment Rate** | >70% | alerts acknowledged / alerts sent | Teachers see & respond to anomalies |
| **W07 False-Positive Rate** | <20% | false alarms / total alerts | Threshold tuning successful |
| **LOOP Closure Rate** | >40% | recommendations marked done / sent | Teachers engage with self-evaluation |
| **Loop Closure Latency** | <48h median | hours to close | Teachers close action items quickly |

### Technical Metrics (Secondary)

| KPI | Target | Measurement | Responsible |
|-----|--------|-------------|-------------|
| **API Latency (p95)** | W06 <5s, W07 <2s, Loop <2s | Prometheus histograms | DevOps |
| **Error Rate** | <1% | 5xx errors / total requests | Backend |
| **Availability** | >99.5% | uptime / 24h | DevOps |
| **Test Coverage** | >80% | lines covered / total lines | QA |
| **Privacy Compliance** | 0 incidents | K-anonymity, RLS, PII | Security |

### Deployment Metrics (Tertiary)

| Objective | Target | Details |
|-----------|--------|---------|
| **Deployment Time** | <30 min | Code push to production |
| **Mean Time to Recovery** | <2h | Incident to rollback |
| **Pilot School Success** | All 4 KPIs met | Approval >60%, ack >70%, closure >40%, NPS >7 |

---

## Risk Register & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| **LLM latency high** | Medium | W06/W07 slow; teachers frustrated | Gemini latency caching; fallback rules; load test early |
| **False positives >20%** | Medium | Alert fatigue; adoption poor | QA-004 threshold tuning; pilot feedback loops |
| **RLS policy bug** | Low | Data exposure; privacy violation | QA-003 security audit; external review; pen testing |
| **N8N workflow failures** | Low | Silent alerts/briefings miss | Error monitoring; alerting on workflow failures; testing |
| **Database migration fails** | Low | Production downtime | Staging test; rollback procedures; DEPLOY-004 |
| **Pilot school negative feedback** | Medium | Features not adopted; rework needed | Daily check-ins Week 5; quick UX fixes; flexible timeline |
| **Gemini API quota exhausted** | Low | Briefing generation fails | Quota monitoring; rate limit enforcement; fallbacks |
| **Team member departure** | Low | Task delay; knowledge loss | Documentation; pair programming; cross-training |

---

## Phase 3 Opportunities (Post-Phase 2)

Once Phase 2 is stable (end of Week 6):
1. **Broader Rollout**: Expand from 5 pilot schools to all schools (60–100+ schools)
2. **Customization**: Per-school threshold tuning, tone preferences, action type libraries
3. **Student Companion App**: LOOP features for students (view closure history, celebrate wins)
4. **Offline Mode**: Mobile app for areas with unreliable connectivity
5. **Advanced Analytics**: Teacher engagement dashboard, school-wide trending, cohort analysis
6. **Integration**: Sync with Google Classroom, LMS, school calendar

---

## Artifacts Checklist

All 75 tasks produce these deliverables:

### Code Artifacts
- [ ] `src/lib/line-notify.ts` (INFRA-001)
- [ ] `src/lib/frequency-guard.ts` (INFRA-002)
- [ ] `src/lib/anomaly-detector.ts` (W07-002)
- [ ] `src/lib/anomaly-severity-classifier.ts` (W07-003)
- [ ] `src/lib/briefing-generator.ts` (W06-002)
- [ ] `src/app/api/alerts/route.ts`, `route.ts` (W07-006)
- [ ] `src/app/api/briefings/route.ts` (W06-005)
- [ ] `src/app/api/recommendations/route.ts` (LOOP-002)
- [ ] `src/components/domain/teacher/LiveAlertBanner.tsx` (W07-007)
- [ ] `src/components/domain/teacher/AcknowledgeModal.tsx` (W07-008)
- [ ] `src/components/domain/teacher/BriefingCard.tsx` (W06-006)
- [ ] `src/components/domain/teacher/ApprovalModal.tsx` (W06-007)
- [ ] `src/components/domain/teacher/ClosureModal.tsx` (LOOP-003)
- [ ] `src/components/domain/teacher/MetricsCard.tsx` (LOOP-004)

### Database Artifacts
- [ ] `supabase/migrations/020_briefing_queue.sql` (DB-001)
- [ ] `supabase/migrations/021_mood_alerts.sql` (DB-002)
- [ ] `supabase/migrations/022_recommendation_enhancements.sql` (DB-003)
- [ ] `supabase/migrations/023_audit_log_extensions.sql` (DB-004)
- [ ] `supabase/migrations/024_engagement_stats.sql` (DB-005)

### N8N Artifacts
- [ ] `n8n/workflows/W07-Mood-Anomaly-Alert.json` (W07-005)
- [ ] `n8n/workflows/W06-Morning-Briefing.json` (W06-004)
- [ ] `n8n/workflows/tools/tool-get-climate-summary.json` (INFRA-007)
- [ ] `n8n/workflows/tools/tool-get-trend-comparison.json` (INFRA-007)
- [ ] `n8n/workflows/tools/tool-get-past-recommendations.json` (INFRA-007)
- [ ] `n8n/workflows/tools/tool-frequency-guard-check.json` (INFRA-007)
- [ ] `n8n/workflows/tools/tool-line-notify-send.json` (INFRA-007)

### Test Artifacts
- [ ] `__tests__/lib/anomaly-detector.test.ts` (W07-010)
- [ ] `__tests__/lib/anomaly-severity-classifier.test.ts` (W07-011)
- [ ] `__tests__/integration/w07-workflow.test.ts` (W07-012)
- [ ] `__tests__/integration/w06-workflow.test.ts` (W06-010)
- [ ] `__tests__/integration/phase-2-flows.test.ts` (QA-002)
- [ ] `e2e/w07-alert-flow.spec.ts` (W07-013)
- [ ] `e2e/w06-briefing-flow.spec.ts` (W06-011)
- [ ] `e2e/loop-closure-flow.spec.ts` (LOOP-008)
- [ ] `scripts/load-test-phase-2.ts` (QA-001)
- [ ] `scripts/privacy-audit.sql` + `.sh` (QA-003)

### Documentation Artifacts
- [ ] `docs/PHASE_2_INFRA_ARCHITECTURE.md` (INFRA)
- [ ] `docs/PHASE_2_W07_DESIGN.md` (W07)
- [ ] `docs/PHASE_2_W06_DESIGN.md` (W06)
- [ ] `docs/PHASE_2_LOOP_DESIGN.md` (LOOP)
- [ ] `docs/QA_LOAD_TEST_REPORT.md` (QA-001)
- [ ] `docs/QA_PRIVACY_AUDIT_REPORT.md` (QA-003)
- [ ] `docs/QA_W07_THRESHOLD_TUNING.md` (QA-004)
- [ ] `docs/QA_UAT_PILOT_RESULTS.md` (QA-005)
- [ ] `docs/DEPLOYMENT_PRE_DEPLOY_CHECKLIST.md` (DEPLOY-001)
- [ ] `docs/DEPLOYMENT_PILOT_ONBOARDING.md` (DEPLOY-002)
- [ ] `docs/DEPLOYMENT_MONITORING_SETUP.md` (DEPLOY-003)
- [ ] `docs/DEPLOYMENT_ROLLBACK_RUNBOOK.md` (DEPLOY-004)
- [ ] `docs/DEPLOYMENT_GOLIVE_RUNBOOK.md` (DEPLOY-005)
- [ ] `docs/DEPLOYMENT_GOLIVE_EXECUTION_LOG.md` (DEPLOY-005)
- [ ] `docs/DEPLOYMENT_GOLIVE_METRICS_24H.md` (DEPLOY-005)

---

## How to Use This Document

### For Project Managers
1. **Week 1**: Review Gantt chart (Section 5). Assign INFRA + DB tasks.
2. **Weekly**: Track progress against Week-by-Week Gantt. Flag delays in critical path.
3. **Week 3**: Review QA-001 load test setup progress.
4. **Week 5**: Execute QA-005 UAT pilot school calls.
5. **End of Week 5**: Review go/no-go gates (QA-006, DEPLOY-001).
6. **Week 6**: Monitor DEPLOY-005 go-live metrics daily.

### For Developers
1. **Assign**: Pick 2-3 consecutive tasks from "Task Summary Table"
2. **Dependencies**: Check Dependencies column; ensure blocking tasks are complete
3. **Code**: Implement per Acceptance Criteria (testable items)
4. **Test**: Use test task acceptance criteria (QA-level tests)
5. **Review**: Pair with teammate before merging to main

### For QA/Security
1. **Week 3**: Begin QA-001 setup (load test script)
2. **Week 4**: Execute QA-001, QA-002, QA-003 in parallel
3. **Week 5**: Run QA-005 (pilot school UAT), collect daily feedback
4. **End of Week 5**: Make QA-006 go/no-go decision

### For DevOps/Product
1. **Week 1**: Set up INFRA environment (INFRA-004 to INFRA-008)
2. **Week 5**: Prepare pilot schools (DEPLOY-002)
3. **Week 6 Day 1**: Execute DEPLOY-005 go-live runbook (morning of launch)
4. **Week 6 Days 2-7**: Monitor metrics; daily pilot school check-ins

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-15 | Initial task generation complete; all 75 tasks + Gantt + critical path |

---

**Last Updated**: End of task generation process (token budget exhaustion)  
**Status**: Ready for implementation start (Week 1, Day 1)  
**Next Action**: Assign Week 1 tasks; kick off INFRA + DB workstreams

