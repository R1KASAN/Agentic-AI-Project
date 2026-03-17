# Phase 2 Cross-Feature QA Testing Tasks
**Workstream**: Quality Assurance & System Hardening  
**Duration**: Week 4-6 (Days 22-42, parallel with LOOP & DEPLOYMENT)  
**Status**: Ready for Sprint Planning  
**Dependencies**: All feature workstreams (W07, W06, LOOP) must be feature-complete first

---

## Workstream Summary

Comprehensive testing of Phase 2 features across multiple dimensions: **load testing** (100 concurrent users), **integration testing** (feature interactions), **privacy/security audit** (k-anonymity, RLS, no data leaks), **false-positive tuning** (W07 thresholds), and **user acceptance testing** (teacher feedback).

### What It Delivers
- ✅ Load test report (latency, throughput, error rates)
- ✅ Integration test matrix (feature interactions)
- ✅ Privacy audit report (k-anonymity verified, RLS enforced)
- ✅ W07 false-positive tuning (threshold adjustments)
- ✅ UAT feedback summary (teacher acceptance)
- ✅ Production readiness checklist

### Risks & Mitigation
| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Load test finds >2min latency** | Briefing generation too slow for daily 7:30 AM | Optimize RPC calls; increase N8N resources; consider caching |
| **K-anonymity violated** | Data exposed to teachers below threshold | Audit RLS policies on all tables; test with <3 students |
| **False positives >20%** | Alert fatigue; teachers ignore W07 | Threshold tuning in QA vs. production pilot data |
| **Privacy breach discovered** | Regulatory violation; reputation damage | Security review by external team; penetration test |

---

## Task Summary Table

| Task ID | Title | Effort | Dependencies | Assigned | Status |
|---------|-------|--------|--------------|----------|--------|
| QA-001 | Load test: 100 classes, concurrent W06/W07/check-ins | 3 days | W07, W06, INFRA-008 | QA | Ready |
| QA-002 | Integration test: W06 + W07 + Loop interactions | 2 days | W07, W06, LOOP | QA | Ready |
| QA-003 | Privacy/security audit (k-anonymity, RLS, PII) | 2 days | W07, W06, LOOP | Security + QA | Ready |
| QA-004 | W07 false-positive tuning (threshold adjustments) | 3 days | W07-015 (initial tuning) | QA + Backend | Ready |
| QA-005 | UAT: 5 pilot schools, 2-week feedback loop | 5 days | All features | QA + Product | Ready |
| QA-006 | Production readiness checklist & go/no-go gates | 1 day | All QA tasks | QA + DevOps | Ready |

**Total Effort**: ~16 days (1.5-2 QA engineers + security + devops)

---

## Detailed Task Cards

### QA-001: Load Test: 100 Classes, Concurrent W06/W07/Check-ins
**Epic**: QA → Performance & Scalability  
**Status**: Not Started

#### Description
Simulate realistic production load:
- 100 active classes (30 students avg each)
- Daily W06 workflow execution (morning briefing) → 100 briefings generation
- Concurrent W07 anomaly detections (50 classes trigger anomaly simultaneously)
- Student check-in traffic (2000 check-ins in 1-hour window, 10:00-11:00 UTC)

Measure:
1. **Latency**: p50, p95, p99 response times for each operation
2. **Throughput**: requests/second the system can handle
3. **Error rate**: % of requests that fail
4. **Resource utilization**: CPU, memory, database connections

#### Implementation Details
```typescript
// scripts/load-test-phase-2.ts (k6 script)

import http from 'k6/http';
import { check, group } from 'k6';

export const options = {
  vus: 50, // 50 concurrent virtual users
  duration: '30m', // 30-minute test
  thresholds: {
    'http_req_duration{use_case:w06}': ['p95<5000'], // W06 <5sec
    'http_req_duration{use_case:w07}': ['p95<2000'], // W07 <2sec
    'http_req_duration{use_case:checkin}': ['p95<1000'], // Check-in <1sec
    'http_req_failed': ['rate<0.01'], // Error rate <1%
  }
};

// Scenario 1: W06 Daily Briefing (run once at start of test)
export function w06DailyBriefing() {
  const url = 'http://staging.localhost:3000/api/briefings';
  
  for (let classId = 1; classId <= 100; classId++) {
    const res = http.get(`${url}?classId=class-${classId}`, {
      tags: { use_case: 'w06' }
    });
    
    check(res, {
      'W06 GET returns 200': (r) => r.status === 200,
      'W06 briefing text present': (r) => r.json('briefing_text') !== undefined,
      'W06 response time <5s': (r) => r.timings.duration < 5000
    });
  }
}

// Scenario 2: W07 Concurrent Anomaly Detection (simulated)
export function w07AnomalyDetection() {
  const url = 'http://localhost:5678/webhook/anomaly-check';
  
  // 50 concurrent anomalies
  for (let i = 0; i < 50; i++) {
    const classId = `class-${Math.floor(Math.random() * 100)}`;
    
    const res = http.post(url, JSON.stringify({
      class_id: classId,
      current_mood: Math.random() * 100,
      timestamp: new Date().toISOString()
    }), {
      tags: { use_case: 'w07' }
    });
    
    check(res, {
      'W07 detection executes': (r) => r.status === 200,
      'W07 response time <2s': (r) => r.timings.duration < 2000
    });
  }
}

// Scenario 3: Student Check-ins (high throughput)
export function studentCheckIns() {
  const url = 'http://staging.localhost:3000/api/student/check-in';
  
  // 2000 check-ins in 1-hour window
  for (let i = 0; i < 2000; i++) {
    const classId = `class-${Math.floor(i / 20)}`;
    const studentId = `student-${i % 30}`;
    
    const res = http.post(url, JSON.stringify({
      class_id: classId,
      student_id: studentId,
      mood: 50 + Math.random() * 50, // 50-100 mood
      timestamp: new Date().toISOString()
    }), {
      tags: { use_case: 'checkin' }
    });
    
    check(res, {
      'Check-in stored': (r) => r.status === 200 || r.status === 201,
      'Check-in response time <1s': (r) => r.timings.duration < 1000
    });
  }
}

export default function() {
  group('Phase 2 Load Test', () => {
    w06DailyBriefing();
    w07AnomalyDetection();
    studentCheckIns();
  });
}
```

**Why This Task Exists**: Must verify Phase 2 handles production load without degradation. Load testing catches scaling issues early.

**Loop Stage**: Plan (infrastructure readiness)  
**Constitutional Principle**: VII (scalability; must handle multi-school concurrent load)

#### Acceptance Criteria
1. ✅ 100 classes processed without timeouts
2. ✅ W06 briefing generation: p95 latency <5s
3. ✅ W07 anomaly detection: p95 latency <2s
4. ✅ Check-in ingestion: p95 latency <1s
5. ✅ Error rate <1%
6. ✅ Database connection pool not exhausted (< 90% utilization)
7. ✅ CPU/memory remain stable (no memory leaks)

#### DoD
- [ ] Load test script created: `scripts/load-test-phase-2.ts`
- [ ] Test executed in staging environment
- [ ] Report generated: `docs/QA_LOAD_TEST_REPORT.md` (with latency graphs + recommendations)

---

### QA-002: Integration Test: W06 + W07 + Loop Interactions
**Epic**: QA → Integration Testing  
**Status**: Not Started

#### Description
Test feature interactions + ensure no side effects:
1. **W07 alert + W06 briefing same day**: Do they trigger correctly? Does frequency guard prevent spam?
2. **Loop closure + next briefing**: Does closure feedback affect next W06 personalization?
3. **W07 alert + teacher marks done in Loop**: Does alert acknowledge + loop closure sync?
4. **Multi-class scenario**: Teacher with 5 classes receives different briefings/alerts per class

#### Test Scenarios (10+)
```gherkin
# integration.feature

Scenario: W07 high alert + W06 briefing same class same day
  Given a class with declining mood (high alert triggered)
  And W07 alert sent via LINE at 10:00
  And at 07:30 next day, W06 briefing scheduled
  When W06 workflow runs
  Then briefing is generated (despite alert yesterday)
  And frequency guard allows (total 2 notifications/day threshold allows both on different days)

Scenario: Teacher marks W07 alert "action taken" + Loop closure
  Given a mood alert raised at 16:00
  And alert sent to teacher
  When teacher clicks "Alert acknowledge" from banner
  And teacher later marks "done" with feedback in Loop
  Then mood_alerts.action_taken_at recorded
  And recommendations.closure_status recorded
  And both timestamps available for latency analysis

Scenario: Loop closure feedback → next briefing personalization
  Given teacher closed 5 recommendations (3 icebreaker, 2 check-in)
  And closure feedback: "icebreakers work best"
  And nightly aggregation runs
  And next day's W06 briefing generates
  When LLM personalizes based on teacher stats
  Then recommended action includes icebreaker (matching pattern)
  And personalization_factors includes "teacher_prefers_icebreaker"
```

**Why This Task Exists**: Phase 2 has 3 feature flows that interact. Integration testing catches subtle bugs (e.g., frequency guard doesn't count W06+W07 together, LLM personalization uses stale data).

**Loop Stage**: Act (testing coordinated execution), Plan (testing data flow between features)  
**Constitutional Principle**: I (auditable multi-feature interactions)

#### Acceptance Criteria
1. ✅ 10+ scenario tests written
2. ✅ All scenarios passing
3. ✅ No unintended side effects (one feature affects another adversely)
4. ✅ Data consistency: audit logs show correct decision sequence

#### DoD
- [ ] Integration test file: `__tests__/integration/phase-2-flows.test.ts`
- [ ] All tests passing

---

### QA-003: Privacy/Security Audit (K-Anonymity, RLS, PII)
**Epic**: QA → Security & Compliance  
**Status**: Not Started

#### Description
Comprehensive privacy audit:
1. **K-anonymity verification**: Confirm all aggregations enforce k≥3 (no single-student data in alerts/briefings)
2. **RLS policy enforcement**: Verify teachers only see own class data
3. **PII scanning**: No student names in LINE messages, briefings, alerts
4. **Data retention**: 60-day raw data policy enforced; older data aggregated

#### Audit Procedures
```sql
-- K-anonymity test: Verify aggregates skip <3 student classes
SELECT
  class_id,
  COUNT(DISTINCT student_id) as student_count,
  EXISTS(
    SELECT 1 FROM mood_alerts
    WHERE class_id = student_pulses.class_id
    AND created_at >= NOW() - INTERVAL '30 days'
  ) as has_alerts
FROM student_pulses
GROUP BY class_id
HAVING COUNT(DISTINCT student_id) < 3;

-- Should return 0 rows (no alerts for classes with <3 students)

-- RLS Policy test: Query as Teacher A, verify only see Class A
SELECT
  *
FROM student_pulses
WHERE class_id IN (SELECT class_id FROM class_enrollments WHERE user_id = 'teacher-a-id')
-- Should return data for Teacher A's classes only

-- PII Scan: Search for student names in LINE messages
SELECT COUNT(*)
FROM briefing_queue
WHERE briefing_text ILIKE '%john%' OR briefing_text ILIKE '%jane%' OR ...;
-- Should return 0

-- Data retention check: Verify raw data >60 days is deleted
SELECT COUNT(*)
FROM student_pulses
WHERE created_at < NOW() - INTERVAL '60 days';
-- Should return 0 (or very small due to lag)
```

**Why This Task Exists**: Privacy violation would be catastrophic (regulatory fines, reputation damage, teacher distrust). Explicit audit prevents regressions.

**Loop Stage**: Plan (security infrastructure validation)  
**Constitutional Principle**: II (privacy-by-design), VIII (no invasive monitoring)

#### Acceptance Criteria
1. ✅ K-anonymity verified: 0 alerts for classes with <3 students
2. ✅ RLS policies enforced: teachers only see own class data
3. ✅ PII scan: 0 student names in briefings/alerts
4. ✅ Data retention policy: tested + working
5. ✅ Security report: `docs/QA_PRIVACY_AUDIT_REPORT.md` with no critical findings

#### DoD
- [ ] Audit script: `scripts/privacy-audit.sql` + `scripts/privacy-audit.sh`
- [ ] Report generated with 0 critical issues

---

### QA-004: W07 False-Positive Tuning (Threshold Adjustments)
**Epic**: QA → Optimization  
**Status**: Not Started

#### Description
Fine-tune W07 anomaly detection thresholds to minimize false positives (missed alerts) while maximizing true positives (real issues detected).

#### Tuning Process
1. **Baseline**: Collect anomaly detection results during Week 3-4 pilot (100+ classes)
2. **Manual review**: Get teacher feedback on 30 sample alerts (real issue? Useful?)
3. **Calculate false-positive rate**: % of alerts teachers marked "false alarm"
4. **Threshold adjustment**: If >20%, increase thresholds (less sensitive); if <10%, decrease (more sensitive)
5. **Backtest**: Re-run historical detection with new thresholds; verify improvement

#### Example Tuning
```typescript
// Baseline thresholds (from W07-001)
const RULE_1_MOOD_DROP_THRESHOLD = 0.30; // 30% drop
const RULE_2_MOOD_DROP_MIN = 0.15; // 15% min
const RULE_2_MOOD_DROP_MAX = 0.30; // 30% max
const RULE_2_ENGAGEMENT_THRESHOLD = 0.50; // 50% of typical

// Week 3-4 Results:
// - HIGH alerts: 40% false positives (too sensitive)
// - MEDIUM alerts: 15% false positives (acceptable)

// Adjusted thresholds (tuned):
const RULE_1_MOOD_DROP_THRESHOLD = 0.35; // ↑ from 0.30 (higher = less sensitive)
const RULE_2_MOOD_DROP_MAX = 0.33; // ↑ from 0.30 (narrower range = less MEDIUM alerts)

// Backtest on Week 1-2 data:
// Before: 60 alerts, 24 false positives (40% FP rate)
// After: 50 alerts, 8 false positives (16% FP rate)
// Trade-off: Missed 2 real issues (recall 97% vs. 100%) but vastly improved precision
```

**Why This Task Exists**: False positives cause alert fatigue. Fine-tuning is essential for long-term adoption.

**Loop Stage**: Learn (tuning detection thresholds based on feedback)  
**Constitutional Principle**: I (auditable threshold adjustments with rationale)

#### Acceptance Criteria
1. ✅ False-positive rate <20% (measured from pilot)
2. ✅ Threshold adjustments documented with rationale + data
3. ✅ Backtest: re-run historical detection; show improvement
4. ✅ Per-school thresholds ready for Phase 3 (configurable)

#### DoD
- [ ] Tuning report: `docs/QA_W07_THRESHOLD_TUNING.md`
- [ ] Thresholds updated in code + n8n workflow
- [ ] Backtest results documented

---

### QA-005: UAT: 5 Pilot Schools, 2-Week Feedback Loop
**Epic**: QA → User Acceptance Testing  
**Status**: Not Started

#### Description
Real-world testing with 5 pilot schools (20-30 teachers total). Running pilot for 2 weeks on production-like staging environment.

#### Pilot Acceptance Criteria
- **W06 Approval Rate**: >60% of briefings approved within 2 hours (shows usefulness)
- **W07 Acknowledgment Rate**: >70% of alerts acknowledged within 5 minutes (shows visibility)
- **Loop Closure Rate**: >40% of recommendations marked done within 48 hours (shows adoption)
- **Teacher NPS**: "Would you recommend this to colleagues?" - target >7/10
- **Zero privacy violations**: No unintended data access

#### Pilot Execution
```markdown
# Pilot Week 1-2: Real Usage
1. Day 1-3: Teachers use all 3 features (W06, W07, Loop)
2. Day 4-7: Collect initial feedback (surveys, interviews)
3. Adjust thresholds / UX based on feedback
4. Day 8-14: Run refined features; collect final metrics

# Feedback Mechanisms
- In-app survey: "Was this briefing helpful?" (after approve/dismiss)
- Weekly email: "How's Climate Agent treating you?"
- Slack channel: #climate-agent-feedback
- Weekly 1:1 calls: 2-3 representative teachers

# Success Criteria
- Approval rate >60% → Briefing content is useful
- Acknowledgment rate >70% → Alerts are timely/visible
- Closure rate >40% → Loop is low-friction enough to use
- NPS >7 → Teachers believe in the system
- 0 privacy violations → Trust is maintained
```

**Why This Task Exists**: Real teachers reveal bugs + UX issues that staging tests miss. UAT is essential gate before production.

**Loop Stage**: Self-Evaluate (collecting teacher feedback), Learn (tuning based on real usage)  
**Constitutional Principle**: IV (human-in-the-loop; real teachers validating systems)

#### Acceptance Criteria
1. ✅ 5 pilot schools (20-30 teachers) using all features for 2 weeks
2. ✅ Metrics collected daily (approval, acknowledgment, closure rates)
3. ✅ Feedback collected (surveys, interviews, logs)
4. ✅ All 4 success criteria met (approval >60%, acknowledgment >70%, closure >40%, NPS >7)
5. ✅ Zero privacy violations + security incidents

#### DoD
- [ ] Pilot results report: `docs/QA_UAT_PILOT_RESULTS.md`
- [ ] Metrics dashboard: Shows daily trends over 2 weeks
- [ ] Teacher feedback summary: `docs/QA_TEACHER_FEEDBACK.md`

---

### QA-006: Production Readiness Checklist & Go/No-Go Gates
**Epic**: QA → Release Management  
**Status**: Not Started

#### Description
Final go/no-go decision before production rollout. Checklist covers:
- All P0/P1 bugs fixed
- Load test passes
- Privacy audit passes
- UAT metrics achieved
- Deployment procedures documented
- Rollback procedures tested
- Monitoring/alerting configured
- On-call runbook ready

#### Go/No-Go Decision Matrix
```markdown
# Go/No-Go Criteria

GATE 1 (Functional Completeness)
- [ ] All P0 bugs fixed
- [ ] All P1 bugs fixed (or identified as non-blocking)
- [ ] Feature completeness: W06, W07, LOOP all working
- [ ] Test coverage: >80% for critical paths

GATE 2 (Performance & Scalability)
- [ ] Load test: W06 p95 <5s, W07 p95 <2s, check-in p95 <1s
- [ ] Error rate <1%
- [ ] Database connections stable

GATE 3 (Privacy & Security)
- [ ] Privacy audit: 0 critical findings
- [ ] K-anonymity: verified
- [ ] RLS: verified
- [ ] PII scan: 0 matches

GATE 4 (User Acceptance)
- [ ] Approval rate >60% (W06)
- [ ] Acknowledgment rate >70% (W07)
- [ ] Closure rate >40% (Loop)
- [ ] NPS >7

GATE 5 (Operations Readiness)
- [ ] Deployment runbook: tested
- [ ] Rollback procedures: tested
- [ ] Monitoring: alerts configured (CPU, latency, errors)
- [ ] On-call runbook: complete
- [ ] Incident response: tested

DECISION:
- All gates GREEN → GO for production
- Any gate RED → NO-GO; schedule re-assessment
```

#### Release Procedures
```bash
# Pre-release checklist
echo "Verifying all gates..."
./scripts/verify-go-gates.sh

# Deployment (staging → production)
./scripts/deploy-phase-2-prod.sh

# Post-release validation
./scripts/post-deploy-healthcheck.sh

# Rollback (if critical issue discovered)
./scripts/rollback-phase-2.sh --version=previous-stable
```

**Why This Task Exists**: Go/no-go gate prevents half-baked rollouts. Explicit checklist ensures team alignment.

**Loop Stage**: Plan (deployment readiness validation)  
**Constitutional Principle**: VII (reliable, scalable operations)

#### Acceptance Criteria
1. ✅ All 5 gates GREEN (no red blockers)
2. ✅ Go/no-go decision documented with date + approvers
3. ✅ Deployment plan finalized
4. ✅ Team trained on runbooks

#### DoD
- [ ] Checklist: `docs/DEPLOYMENT_GO_NO_GO_CHECKLIST.md`
- [ ] Decision recorded: `docs/DEPLOYMENT_GO_NO_GO_DECISION.md`

---

## Dependency Graph

```
QA-001 (Load Test) ──→┐
QA-002 (Integration) ─┼→ QA-006 (Go/No-Go)
QA-003 (Privacy Audit)┼
QA-004 (Threshold Tuning) ┤
QA-005 (UAT Pilot) ──┘
```

All QA tasks inform the final go/no-go decision.

---

## Team Assignments (Recommended)

| Role | Assigned Tasks | Effort | Timeline |
|------|----------------|--------|----------|
| QA Engineer (1.5) | QA-001–006 | 16 days | Week 4–6 |
| Security Engineer (0.5) | QA-003 (privacy audit) | 2 days | Week 4 |
| Product/Pilot Lead (0.5) | QA-005 (UAT coordination) | 5 days | Week 4–5 |
| DevOps (0.5) | QA-001, QA-006 (infrastructure, deployment) | 4 days | Week 5–6 |

---

## Success Criteria (Workstream Level)

✅ All 6 QA tasks completed  
✅ QA-001 Load test passes (p95 <5s W06, <2s W07, <1s check-in, error <1%)  
✅ QA-003 Privacy audit: 0 critical findings  
✅ QA-005 UAT: metrics achieved (approval >60%, acknowledgment >70%, closure >40%, NPS >7)  
✅ QA-006 Go/No-Go: all gates GREEN  
✅ Team confident in production readiness  

---

## Artifacts Delivered

| Artifact | Location | Owner |
|----------|----------|-------|
| Load Test Script | `scripts/load-test-phase-2.ts` | QA |
| Load Test Report | `docs/QA_LOAD_TEST_REPORT.md` | QA |
| Integration Tests | `__tests__/integration/phase-2-flows.test.ts` | QA |
| Privacy Audit Script | `scripts/privacy-audit.sql` | Security |
| Privacy Audit Report | `docs/QA_PRIVACY_AUDIT_REPORT.md` | Security |
| Threshold Tuning Report | `docs/QA_W07_THRESHOLD_TUNING.md` | QA |
| UAT Pilot Results | `docs/QA_UAT_PILOT_RESULTS.md` | Product |
| Teacher Feedback Summary | `docs/QA_TEACHER_FEEDBACK.md` | Product |
| Go/No-Go Checklist | `docs/DEPLOYMENT_GO_NO_GO_CHECKLIST.md` | QA |
| Go/No-Go Decision | `docs/DEPLOYMENT_GO_NO_GO_DECISION.md` | QA |

