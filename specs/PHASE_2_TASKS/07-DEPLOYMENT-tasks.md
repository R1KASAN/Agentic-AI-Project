# Phase 2 Deployment & Production Release Tasks
**Workstream**: Deployment & Monitoring  
**Duration**: Week 5-6 (Days 34-42, parallel with LOOP-UI + QA-TESTING)  
**Status**: Ready for Sprint Planning  
**Dependencies**: All phase workstreams + QA-006 (go/no-go approval)

---

## Workstream Summary

Controlled rollout of Phase 2 features to production: **pre-deployment validation** (staging → production migration planning), **pilot school onboarding** (5 schools, 20-30 teachers), **production monitoring setup** (observability, alerting), and **rollback procedures** (emergency revert if critical issues discovered).

### What It Delivers
- ✅ Pre-deployment checklist (all systems ready)
- ✅ Pilot school onboarding playbook (success criteria, support procedures)
- ✅ Production observability dashboard (Grafana, logs, alerts)
- ✅ Rollback procedures (tested, documented)
- ✅ Go-live runbook (step-by-step deployment guide)
- ✅ Post-deployment validation (smoke tests, SLO verification)

### Risks & Mitigation
| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Database migration fails** | Production down; roll back required | Test migrations on production-size staging DB first; practice rollback |
| **Frequency guard doesn't work in prod** | Teachers spam students with excess notifications | Staging test with realistic load; monitoring on limit_exceeded counter |
| **LLM API (Gemini) latency high** | Briefing generation times out; no briefmain sent | Set timeout + fallback; monitor Gemini latency in prod |
| **Pilot school feedback negative** | Features don't meet teacher needs; costly rework | Tight feedback loop; daily check-ins; quick UX tweaks during pilot |
| **N8N workflows fail silently** | Alerts/briefings don't trigger; no visibility | Error alerting on N8N workflow failures; escalation to on-call |

---

## Task Summary Table

| Task ID | Title | Effort | Dependencies | Assigned | Status |
|---------|-------|--------|--------------|----------|--------|
| DEPLOY-001 | Pre-deployment verification & staging→production migration plan | 2 days | QA-006 | DevOps | Ready |
| DEPLOY-002 | Pilot school onboarding: setup, success criteria, daily support | 2 days | DEPLOY-001 | DevOps + Product | Ready |
| DEPLOY-003 | Production observability & monitoring: Grafana, alerts, SLO | 2 days | DEPLOY-001 | DevOps | Ready |
| DEPLOY-004 | Rollback procedures testing & runbook | 1 day | DEPLOY-001 | DevOps | Ready |
| DEPLOY-005 | Go-live execution: deploy → pilot validation → metrics (24h) | 2 days | DEPLOY-002,003,004 | Full team | Ready |

**Total Effort**: ~9 days (1 DevOps engineer + Product lead + team support)

---

## Detailed Task Cards

### DEPLOY-001: Pre-Deployment Verification & Migration Plan
**Epic**: Infrastructure → Production Readiness  
**Status**: Not Started

#### Description
Comprehensive pre-deployment checklist ensuring:
1. **Code readiness**: All features merged to main, tested
2. **Database readiness**: Migrations tested on staging; rollback procedures documented
3. **Configuration readiness**: Environment variables, secrets, API keys in place
4. **External integrations**: LINE Notify token, Gemini API quota verified
5. **Disaster recovery**: Backup procedures tested; restore time verified

#### Pre-Deployment Checklist
```markdown
# Pre-Deployment Checklist (DEPLOY-001)

## Code Readiness
- [ ] All Phase 2 features merged to main branch
- [ ] Main branch builds successfully: `npm run build`
- [ ] All tests passing: `npm test`, `npm run test:e2e`
- [ ] Lint passes: `npm run lint` (0 errors, 0 warnings)
- [ ] Next.js type check: `npm run type-check` (0 errors)
- [ ] Env.d.ts updated for new env variables

## Database Readiness
- [ ] All 5 migrations (020-024) tested on staging DB
  - [ ] Migration 020 (briefing_queue): table created, RLS policies applied
  - [ ] Migration 021 (mood_alerts + aggregates): all 3 tables created
  - [ ] Migration 022 (recommendation_enhancements): columns added
  - [ ] Migration 023 (audit_log_extensions): columns added, indexes created
  - [ ] Migration 024 (engagement_stats): table created, nightly job ready
- [ ] Rollback tested: Each migration can be reverted
- [ ] Data retention policy tested: 60-day cleanup runs; >60-day data deleted
- [ ] RLS policies verified: row-level security enforced on all new tables

## Configuration Readiness
- [ ] Environment variables documented: `.env.production.example`
- [ ] Secrets loaded from secure store (e.g., 1Password, AWS Secrets Manager)
  - [ ] SUPABASE_SERVICE_KEY (backend)
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] LINE_NOTIFY_TOKEN
  - [ ] GEMINI_API_KEY
  - [ ] N8N_API_URL, N8N_API_KEY
- [ ] Feature flags configured (if any Phase 2 features are rollout-controlled)

## External Integration Readiness
- [ ] LINE Notify: Token verified, quota checked (limit >1000 messages/day)
- [ ] Gemini API: Quota verified, rate limits understood (target <2 reqs/sec per class)
- [ ] N8N: Production instance verified, workflows imported, credentials set
- [ ] Webhooks: Production callback URLs configured (e.g., `https://prod.example.com/api/n8n/webhook`)

## Disaster Recovery
- [ ] Database backup: Automated daily; restore tested (RPO 24h, RTO 2h)
- [ ] Code rollback: Previous stable version identified (git tag `phase-2-rollback-v1`)
- [ ] N8N workflow versions: Backed up; can revert to Week 3 version if needed

## Monitoring & Observability Readiness
- [ ] Prometheus scrape targets configured (if applicable)
- [ ] CloudWatch/Grafana dashboards created (see DEPLOY-003)
- [ ] Alert rules configured for critical metrics (error rate, latency, quota usage)
- [ ] Log aggregation: Logs shipping to centralized store (Datadog, CloudWatch)
- [ ] Tracing: Request tracing configured (if using Jaeger/Datadog)

## Sign-Off
- [ ] Tech Lead: _____________  Date: _______
- [ ] DevOps Lead: _____________  Date: _______
- [ ] Product Lead: _____________  Date: _______

** DEPLOYMENT APPROVED (All checks passing)**
```

#### Database Migration Execution Plan
```bash
#!/bin/bash
# scripts/pre-deploy-verify.sh

set -e

echo "=== Pre-Deployment Verification ==="

# 1. Code readiness
echo "1. Checking code build..."
npm run build > /dev/null 2>&1 && echo "✓ Build succeeds" || exit 1

echo "2. Checking tests..."
npm test > /dev/null 2>&1 && echo "✓ Tests pass" || exit 1
npm run test:e2e > /dev/null 2>&1 && echo "✓ E2E tests pass" || exit 1

echo "3. Checking lint..."
npm run lint > /dev/null 2>&1 && echo "✓ Lint passes" || exit 1

# 2. Database readiness
echo "4. Testing migrations on staging..."
export DATABASE_URL="postgresql://..."  # Staging DB
npx supabase migration up
echo "✓ All migrations applied"

# 3. Configuration readiness
echo "5. Verifying environment variables..."
required_vars=("SUPABASE_SERVICE_KEY" "LINE_NOTIFY_TOKEN" "GEMINI_API_KEY" "N8N_API_KEY")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "✗ Missing $var"
    exit 1
  fi
done
echo "✓ All env vars present"

echo ""
echo "✓ Pre-deployment verification PASSED"
echo "You are cleared for deployment."
```

**Why This Task Exists**: Production issues stem from inadequate pre-deployment validation. Explicit checklist prevents avoidable outages.

**Loop Stage**: Plan (infrastructure readiness validation)  
**Constitutional Principle**: VII (scalability and reliability)

#### Acceptance Criteria
1. ✅ All checklist items completed ✓
2. ✅ Database migrations tested on staging + rollback verified
3. ✅ External integrations verified (LINE, Gemini, N8N)
4. ✅ Team sign-off: Tech Lead, DevOps, Product
5. ✅ Rollback plan documented (see DEPLOY-004)

#### DoD
- [ ] Checklist: `docs/DEPLOYMENT_PRE_DEPLOY_CHECKLIST.md` (all items ✓)
- [ ] Migration test results: `docs/DEPLOYMENT_MIGRATION_TEST_RESULTS.md`
- [ ] Sign-off recorded in PR description / deployment issue

---

### DEPLOY-002: Pilot School Onboarding (Setup, Success Criteria, Daily Support)
**Epic**: Infrastructure → Production Readiness  
**Status**: Not Started

#### Description
Controlled rollout to 5 pilot schools (20-30 teachers, ~1000 students total). Each school receives:
1. **Pre-launch setup**: Teacher accounts created, data migrated, demo provided
2. **Launch day support**: On-call engineer + product lead available (08:00-18:00 local time)
3. **Daily check-ins**: Quick 15-min calls to collect feedback; quick UX tweaks if needed
4. **Metrics tracking**: Daily dashboard shows approval rate, acknowledgment rate, closure rate, error rate
5. **Success criteria**: Metrics achieved within 3-5 days; then proceed to broader rollout

#### Pilot Onboarding Playbook
```markdown
# Pilot School Onboarding Playbook (DEPLOY-002)

## Pre-Launch (Day -1)
1. **Identify 5 pilot schools**
   - Selection criteria: 20-30 teachers each, diverse grade levels, tech-savvy leadership
   - Mix: Urban + rural, elementary + secondary
   
2. **Prepare data migration**
   - Existing student rosters → Climate Agent via CSV upload or API
   - Existing teacher accounts linked to Supabase
   - Previous climate data (if any) imported for baseline
   
3. **Schedule launch calls**
   - 30-min kickoff call with each school's tech lead + 1-2 teacher champions
   - Walkthrough: how to use W06 (briefing), W07 (alerts), Loop (closure)
   - Q&A; address concerns
   
4. **Prepare support materials**
   - Quick start guide: "Your first 5 minutes with Climate Agent"
   - FAQ: Top 10 questions from earlier UAT
   - Slack channel: #climate-agent-pilot (async support)

## Launch Day (Day 0)
1. **Deployment to production**
   - App deployed; feature flags on for pilot schools only (all others see "Coming soon")
   - N8N workflows activated (W06 briefing at 07:30, W07 every 30 min)
   
2. **On-call support (08:00-18:00)**
   - DevOps engineer: monitoring dashboards, responding to alerts
   - Product lead: fielding teacher questions via Slack, quick UX tweaks
   - Bug fix SLA: critical bugs fixed within 1-2h
   
3. **Pilot school launch activities**
   - Teachers log in; start seeing briefings + alerts
   - Teachers try closing recommendations; metrics rollup nightly

## Daily Check-Ins (Day 1-5)
```

**15-Min Call Template** (with one school lead):
- "What worked great?"
- "What was confusing?"
- "What would you change?"
- "Any blockers?"
- → Document feedback; implement quick fixes if needed

**Metrics Dashboard** (schoolID/daily view):
```
| Metric | Target | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 |
|--------|--------|-------|-------|-------|-------|-------|
| W06 Approval Rate | >60% | 45% | 52% | 58% | 62% | 65% |
| W07 Ack Rate | >70% | 55% | 65% | 72% | 75% | 76% |
| Loop Closure Rate | >40% | 25% | 30% | 35% | 40% | 42% |
| Error Rate | <1% | 0.05% | 0.03% | 0.02% | 0.01% | 0.01% |
| Teachers Active | Increase | 12 | 18 | 22 | 28 | 30 |
```

## Go/No-Go Decision (Day 5)
- ✅ All 4 success criteria met → Expand to broad rollout (all schools)
- ❌ Approval rate <50% or critical issues found → Extend pilot 1 week; gather more feedback

## Success Criteria
1. ✅ **W06 Approval Rate**: >60% of briefings approved within 2h
2. ✅ **W07 Acknowledgment Rate**: >70% of alerts acknowledged within 5 min
3. ✅ **Loop Closure Rate**: >40% of recommendations marked done within 48h
4. ✅ **Error Rate**: <1% (no cascading failures)
5. ✅ **Teacher Satisfaction**: "Would use again" >80% of feedback

## Pilot Customer List
1. **Lincoln Elementary** (Chicago, IL) — 150 students, 6 teachers
2. **Roosevelt High** (Austin, TX) — 350 students, 12 teachers
3. **Jefferson Middle** (Seattle, WA) — 250 students, 10 teachers
4. **King Academy** (Digital-first, nationwide) — 180 students, 8 teachers
5. **Verde School** (San Francisco, CA) — 125 students, 5 teachers

**Total Pilot**: ~1055 students, 41 teachers
```

**Why This Task Exists**: Pilot school feedback reveals real-world issues before broad rollout. Quick fixes during pilot increase long-term adoption.

**Loop Stage**: Act (deployment + learning from real usage)  
**Constitutional Principle**: IV (human partnership; teacher feedback shapes deployment)

#### Acceptance Criteria
1. ✅ 5 pilot schools onboarded successfully
2. ✅ Pre-launch kickoff calls completed (5×)
3. ✅ All 4 success criteria data points tracked daily
4. ✅ Daily check-in calls completed (at least 3 calls across 5×5 schools)
5. ✅ Feedback documented + quick fixes deployed (if any critical issues found)
6. ✅ Go/No-Go decision made (expand to broad rollout vs. extend pilot)

#### DoD
- [ ] Pilot onboarding playbook: `docs/DEPLOYMENT_PILOT_ONBOARDING.md`
- [ ] Pilot metrics dashboard: Accessible via dashboard UI or exported CSV
- [ ] Daily check-in notes: `docs/DEPLOYMENT_PILOT_FEEDBACK.md`
- [ ] Go/No-Go decision: `docs/DEPLOYMENT_PILOT_DECISION.md`

---

### DEPLOY-003: Production Observability & Monitoring (Grafana, Alerts, SLO)
**Epic**: Infrastructure → Observability  
**Status**: Not Started

#### Description
Set up production monitoring ensuring ops team can:
1. **See real-time system health**: CPU, memory, latency, error rate
2. **Get alerted on problems**: Slack notifications for critical metrics
3. **Troubleshoot quickly**: Logs, traces, dashboards to diagnose issues
4. **Track SLO compliance**: Service-level objectives for each critical path

#### Monitoring Stack
```yaml
# Metrics Collection
- Prometheus scrape targets: API, N8N, Supabase
- App metrics: latency (histogram), request count (counter), errors (counter)
- N8N metrics: workflow success rate, step latency, tool execution time
- Database metrics: connection pool utilization, query latency, replication lag

# Dashboards (Grafana)
1. "Phase 2 Overview" — High-level health
   - Key metrics: Req/sec, Error rate, P95 latency, Active classes
   - Drill-down links to detailed dashboards

2. "W06 Briefing Health" — Daily briefing pipeline
   - Briefing generation latency histogram
   - Approval rate (approved vs. pending vs. dismissed)
   - Line message success rate
   - N8N workflow success/failure counts

3. "W07 Anomaly Detection Health" — Real-time alerting
   - Anomaly detection latency (p50, p95, p99)
   - Rule 1/2/3/0 detection counts
   - LLM classification latency
   - Frequency guard trigger counts (alerts suppressed)
   - Line message success rate

4. "Loop Closure Health" — Self-evaluation loop
   - Closure submission count (daily)
   - Action type histogram (icebreaker, check-in, etc.)
   - Feedback text availability (% with feedback)
   - Nightly aggregation job latency

5. "System Health" — Infrastructure
   - API latency (p50/p95/p99)
   - Error rate by endpoint
   - Database connection pool usage
   - N8N workflow queue depth
   - LINE API quota usage

# Alerts
1. **Critical** (immediate escalation)
   - Error rate >5% for 5 min
   - API latency p95 >10s for 10 min
   - Database connection pool >90% for 5 min
   - N8N workflow failure rate >10% for 5 min

2. **Warning** (notify on-call, investigate)
   - Error rate 1-5% for 10 min
   - API latency p95 5-10s for 10 min
   - Database connection pool 80-90% for 5 min
   - LINE API quota usage >80%

3. **Info** (log for trending)
   - Brief daily summary: req count, error count, avg latency
```

#### Sample Monitoring Code
```typescript
// src/lib/monitoring.ts

import { metrics } from 'prom-client';

// W06 Briefing metrics
export const w06_generation_duration = new metrics.Histogram({
  name: 'w06_briefing_generation_duration_ms',
  help: 'Time taken to generate briefing (ms)',
  buckets: [100, 500, 1000, 2000, 5000],
  labelNames: ['class_id', 'cache_hit']
});

export const w06_approval_counter = new metrics.Counter({
  name: 'w06_briefing_approvals_total',
  help: 'Total briefings approved',
  labelNames: ['action'] // 'approved', 'dismissed'
});

// W07 Anomaly metrics
export const w07_detection_duration = new metrics.Histogram({
  name: 'w07_anomaly_detection_duration_ms',
  help: 'Time to detect anomalies (ms)',
  buckets: [50, 100, 200, 500, 1000],
  labelNames: ['rule_triggered']
});

export const w07_alert_counter = new metrics.Counter({
  name: 'w07_alerts_sent_total',
  help: 'Total alerts sent',
  labelNames: ['severity'] // 'high', 'medium', 'low'
});

// Loop metrics
export const loop_closure_counter = new metrics.Counter({
  name: 'loop_closures_total',
  help: 'Total recommendations marked done',
  labelNames: ['action_type'] // 'icebreaker', 'check-in', etc.
});

export const loop_closure_latency = new metrics.Histogram({
  name: 'loop_closure_latency_hours',
  help: 'Time from recommendation to closure (hours)',
  buckets: [1, 4, 24, 48, 72],
  labelNames: []
});
```

#### Alerts Configuration (Prometheus AlertManager)
```yaml
# alerting-rules.yml

groups:
  - name: phase_2_alerts
    rules:
      - alert: Phase2HighErrorRate
        expr: rate(http_requests_total{handler=~"api_.*"}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate in Phase 2 APIs"
          action: "Check /api logs; escalate to backend lead"

      - alert: W06BriefingLatencyHigh
        expr: histogram_quantile(0.95, w06_briefing_generation_duration_ms) > 10000
        for: 10m
        annotations:
          summary: "W06 briefing generation p95 latency >10s"
          action: "Check Gemini API latency; may need caching"

      - alert: LINENotifyQuotaHigh
        expr: line_notify_quota_remaining / line_notify_quota_limit < 0.2
        for: 5m
        annotations:
          summary: "LINE Notify quota <20%"
          action: "Monitor quota consumption; may need to adjust frequency guard"
```

**Why This Task Exists**: Without observability, production issues become support nightmares. Dashboards + alerts enable proactive troubleshooting.

**Loop Stage**: Self-Evaluate (monitoring production)  
**Constitutional Principle**: VII (scalable, reliable operations)

#### Acceptance Criteria
1. ✅ Prometheus targets configured (API, N8N, DB)
2. ✅ 5 Grafana dashboards created + populated with data
3. ✅ Critical + Warning alert rules configured in AlertManager
4. ✅ Slack integration working (alerts → Slack #oncall)
5. ✅ SLO definitions documented (p95 <5s for W06, <2s for W07, etc.)

#### DoD
- [ ] Monitoring setup documented: `docs/DEPLOYMENT_MONITORING_SETUP.md`
- [ ] Dashboard JSON exports: `docs/monitoring/grafana-dashboards/`
- [ ] Alert rules: `docs/monitoring/alerting-rules.yml`
- [ ] On-call runbook with alert response: `docs/DEPLOYMENT_ONCALL_RUNBOOK.md`

---

### DEPLOY-004: Rollback Procedures Testing & Runbook
**Epic**: Infrastructure → Disaster Recovery  
**Status**: Not Started

#### Description
Tested, documented procedures for emergency revert if critical production issues discovered post-launch.

#### Rollback Levels
```markdown
# Rollback Procedures (DEPLOY-004)

## Level 1: Application Code Rollback (5 min downtime)
Revert to previous stable release if:
- Critical bug in W06/W07/Loop features
- Data corruption discovered in new code

**Procedure**:
1. `git tag | grep 'phase-2'` (identify tags)
2. `git checkout phase-2-v0.1` (previous stable tag)
3. `npm run build`
4. `npm run deploy` (redeploy to production)
5. Verify: curl `https://prod.example.com/api/health` (should return ok)

**Communication**: Slack #oncall + email status page (5 min)

---

## Level 2: Database Rollback (10-30 min downtime)
Revert database migrations if:
- New table schema causes data corruption
- RLS policies broken, data exposed
- Migration runs slow, causes outage

**Procedure**:
1. Put app in maintenance mode: `scripts/maintenance-mode.sh on`
   - Redirects all traffic to maintenance page
   
2. Stop all n8n workflows: `curl N8N_API/api/v1/workflows/<id>/deactivate` (all workflows)

3. Rollback last migration:
   ```bash
   export DATABASE_URL="prod-db-uri"
   npx supabase migration down --count=1
   # If multiple migrations failed, repeat
   ```

4. Restore from backup (if data corrupted):
   ```bash
   aws s3 cp s3://backups/phase-2/prod-db-2024-01-15.sql .
   psql --file=prod-db-2024-01-15.sql $DATABASE_URL
   ```

5. Verify data integrity:
   ```bash
   ./scripts/verify-db-rollback.sh
   ```

6. Reactivate n8n workflows
7. Turn off maintenance mode: `scripts/maintenance-mode.sh off`

**Communication**: Email alert; status page; customer support calls

---

## Level 3: Full Production Reset (1-2 hour downtime)
Full nuclear option for severe data corruption or security breach:
1. Restore production environment from the most recent clean backup (24h old)
2. Redeploy application code
3. Re-run Phase 2 deployments from scratch

**Used only if**:
- Data breach confirmed; need to purge compromised data
- Multiple systems cascading failure

---

# Rollback Testing Checklist

- [ ] Test Level 1 (code rollback) on staging
- [ ] Test Level 2 (DB rollback) on staging with production-size data
- [ ] Test Level 3 (full reset) on test environment
- [ ] Measure rollback time for each level
- [ ] Document gotchas (e.g., breaking changes when re-upgrading)
- [ ] Team training: walk through rollback procedure

# Maintenance Mode Page
- [ ] Created: `public/maintenance.html`
- [ ] Configured: nginx redirect on `/maintenance.sh on`
- [ ] Tested: Verify all routes redirect to maintenance page
```

**Why This Task Exists**: Documented, tested rollback procedures reduce time-to-fix in emergencies.

**Loop Stage**: Self-Evaluate (disaster recovery readiness)  
**Constitutional Principle**: VII (reliable, scalable operations)

#### Acceptance Criteria
1. ✅ All 3 rollback levels documented
2. ✅ Level 1 tested on staging (code rollback works)
3. ✅ Level 2 tested on staging (DB rollback works)
4. ✅ Rollback time <1h for all levels
5. ✅ On-call team trained on procedures
6. ✅ Runbook accessible during incident (wiki, not just local)

#### DoD
- [ ] Rollback runbook: `docs/DEPLOYMENT_ROLLBACK_RUNBOOK.md`
- [ ] Rollback test results: `docs/DEPLOYMENT_ROLLBACK_TEST_RESULTS.md`
- [ ] Maintenance mode page: `/public/maintenance.html`
- [ ] Team sign-off: DevOps lead + Tech lead

---

### DEPLOY-005: Go-Live Execution (Deploy → Pilot Validation → 24h Metrics)
**Epic**: Infrastructure → Deployment Execution  
**Status**: Not Started

#### Description
Execute production deployment + 24-hour monitoring + pilot validation.

#### Deployment Day Runbook
```markdown
# Go-Live Runbook (DEPLOY-005)

## Pre-Go-Live (Day -1)
- [ ] DEPLOY-001 checklist: all items ✓
- [ ] DEPLOY-002 prep: pilot school leaders notified (launch tomorrow)
- [ ] DEPLOY-003 monitoring: Grafana dashboards live, alerts tested
- [ ] DEPLOY-004 rollback: procedures tested, team trained
- [ ] Communication: Status page + email draft ready
- [ ] Team assembled: DevOps, backend, frontend, product leads on standby

---

## Go-Live Day (Day 0) — Timeline

### 06:00 UTC — Final Pre-Flight
- [ ] All team members online (even if remote timezones, on-call rotation)
- [ ] Grafana dashboard open on big screen (war room)
- [ ] Slack #oncall channel active
- [ ] Runbook open (this page)

### 06:30 UTC — Notification
- [ ] Status page: "Deployment in progress"
- [ ] Email: "Phase 2 features rolling out now"
- [ ] Schools notified via Slack #climate-agent-pilots

### 06:45 UTC — Deployment Execution
```bash
cd /home/deploy/climate-agent
git pull origin main
npm run build
npm run type-check

# Run pre-flight
./scripts/pre-deploy-verify.sh

# Deploy to production
npm run deploy:prod

# Run smoke tests
./scripts/smoke-tests.sh
# Expected: All tests passing (web, API, N8N)
```

### 07:00 UTC — N8N Workflow Activation
- [ ] Export Phase 2 workflows from staging: `./scripts/n8n-export-workflows.sh`
- [ ] Import to production: `curl -X POST N8N_API/api/v1/workflows/import ...`
- [ ] Activate W06 workflow (Morning Briefing at 07:30 UTC) ← **This happens 30 min after deploy**
- [ ] Activate W07 workflow (Anomaly Detection every 30 min)
- [ ] Monitor N8N dashboard: no error bars expected

### 07:30 UTC — W06 First Briefing Generation
- [ ] 100 pilot-school classes generate briefings
- [ ] Monitor W06 Grafana dashboard:
  - Latency histogram: should see spike, normalize to p95 <5s
  - Success rate: should be 100%
- [ ] Check Slack: #oncall should be quiet (no alerts)
- [ ] Sample briefing quality: pull 3 random briefings; verify <280 chars, no student names, sensible content

### 08:00 UTC — Daily Check-In Call #1 (Pilot School Lead)
- [ ] Quick call with one pilot school: "Briefings arrived? Looks good?"
- [ ] Collect initial feedback
- [ ] Note any issues for quick fix

### 09:00 UTC — Reduce On-Call
- [ ] Transition from "war room" to normal on-call rotation
- [ ] Designate p1 oncaller + p2 oncaller
- [ ] Continue monitoring but less intensity

---

## Post-Go-Live (Day 1-3) — Metrics Tracking

### Daily Metrics to Track
```md
| Metric | Target | Day 0 | Day 1 | Day 2 |
|--------|--------|-------|-------|-------|
| W06 Briefing Latency (p95) | <5s | 4.2s | 3.8s | 3.5s |
| W06 Approval Rate | >60% | 48% | 55% | 62% |
| W07 Alert Latency (p95) | <2s | 1.8s | 1.6s | 1.5s |
| W07 Alert Volume | 200-500/day | 180 | 220 | 250 |
| W07 Ack Rate | >70% | 60% | 68% | 73% |
| Loop Closure Rate | >40% | 20% | 28% | 35% |
| Error Rate | <1% | 0.2% | 0.15% | 0.1% |
| API Latency (p95) | <2s | 1.9s | 1.8s | 1.7s |
| Database Connections | <80% | 45% | 50% | 48% |
| LINE Notify Quota | >20% remaining | 95% | 92% | 90% |

**Data source**: Grafana dashboards + Excel export for trending
```

### Critical Incident Response
If any of these occur:
- Error rate >5% for >5 min → Page oncaller → Investigate
- W06 latency p95 >10s → Page oncaller → Check Gemini API / RPC
- W07 detection failing (0 alerts when should have >50) → Page oncaller → Check N8N
- Database connection pool >90% → Page oncaller → Check connection leaks
- LINE API quota exhausted → Frequency guard triggered; verify it's working

**Response**: Triage, determine rollback vs. fix-forward

---

## Go/No-Go at 24 Hours (Day 1 end)

Review metrics:
- ✅ All error rates <1%
- ✅ All latency targets met
- ✅ Pilot school feedback positive
- ✅ No critical incidents

→ **If YES**: "Broadly expand Phase 2 rollout to all schools" (proceed to Week 6)
→ **If NO**: Identify issue, fix, retest; extend deployment window

---

## Post-Deployment Communication
- [ ] Status page: "Phase 2 features now live"
- [ ] Email: "Thanks for your patience; features rolling out"
- [ ] Slack: "🎉 Phase 2 live for Climate Agent; pilot school teachers now using W06/W07/Loop"
```

**Why This Task Exists**: Go-live is the riskiest moment. Detailed runbook ensures coordinated, safe execution.

**Loop Stage**: Act (executing deployment)  
**Constitutional Principle**: VII (reliable operations under production load)

#### Acceptance Criteria
1. ✅ Deployment successful (no app crashes, no data loss)
2. ✅ First W06 briefing generation: 100% success, <5s p95 latency
3. ✅ First W07 anomaly cycle: runs without errors
4. ✅ All 4 pilot school feedback calls completed
5. ✅ 24h metrics reviewed; all targets met
6. ✅ Go/no-go decision documented

#### DoD
- [ ] Go-live runbook: `docs/DEPLOYMENT_GOLIVE_RUNBOOK.md` (used during deployment)
- [ ] Deployment execution log: `docs/DEPLOYMENT_GOLIVE_EXECUTION_LOG.md` (timestamps, decisions)
- [ ] 24h metrics report: `docs/DEPLOYMENT_GOLIVE_METRICS_24H.md` (graphs, trends)
- [ ] Post-deployment decision: `docs/DEPLOYMENT_GOLIVE_POSTMORTEM.md` (what went well, what to improve)

---

## Dependency Graph

```
DEPLOY-001 ──→ DEPLOY-002 (pilot setup)
   ↓            ↓
DEPLOY-003 ← DEPLOY-004 (monitoring + rollback)
   ↓            ↓
DEPLOY-005 (go-live execution)
   ↓
Success? → Expand to all schools (Phase 3)
```

---

## Team Assignments (Recommended)

| Role | Assigned Tasks | Effort | Timeline |
|------|----------------|--------|----------|
| DevOps Engineer (1 FTE) | DEPLOY-001,003,004,005 | 7 days | Week 5–6 |
| Product Lead (0.5 FTE) | DEPLOY-002, pilot calls | 2 days | Week 5–6 |
| Backend Lead (on-call) | DEPLOY-005, incident response | 1 day | Week 6 (Day 0) |
| Frontend Lead (on-call) | DEPLOY-005, incident response | 1 day | Week 6 (Day 0) |

---

## Success Criteria (Workstream Level)

✅ All 5 DEPLOY tasks completed  
✅ DEPLOY-001: Pre-flight checklist: 100% items ✓  
✅ DEPLOY-002: 5 pilot schools onboarded; all 4 success criteria tracked  
✅ DEPLOY-003: Monitoring live; dashboards accessible; alerts working  
✅ DEPLOY-004: Rollback procedures tested; team trained  
✅ DEPLOY-005: Go-live successful; 24h metrics met; all KPIs green  

**Production Status**: Phase 2 features live for pilot schools (Week 6); ready for broad rollout to all schools (Phase 3)

---

## Artifacts Delivered

| Artifact | Location | Owner |
|----------|----------|-------|
| Pre-Deploy Checklist | `docs/DEPLOYMENT_PRE_DEPLOY_CHECKLIST.md` | DevOps |
| Migration Test Results | `docs/DEPLOYMENT_MIGRATION_TEST_RESULTS.md` | DevOps |
| Pilot Onboarding Playbook | `docs/DEPLOYMENT_PILOT_ONBOARDING.md` | Product |
| Pilot Feedback Summary | `docs/DEPLOYMENT_PILOT_FEEDBACK.md` | Product |
| Monitoring Setup Doc | `docs/DEPLOYMENT_MONITORING_SETUP.md` | DevOps |
| Grafana Dashboards | `docs/monitoring/grafana-dashboards/` | DevOps |
| Alert Rules | `docs/monitoring/alerting-rules.yml` | DevOps |
| On-Call Runbook | `docs/DEPLOYMENT_ONCALL_RUNBOOK.md` | DevOps |
| Rollback Runbook | `docs/DEPLOYMENT_ROLLBACK_RUNBOOK.md` | DevOps |
| Rollback Test Results | `docs/DEPLOYMENT_ROLLBACK_TEST_RESULTS.md` | DevOps |
| Maintenance Page | `public/maintenance.html` | DevOps |
| Go-Live Runbook | `docs/DEPLOYMENT_GOLIVE_RUNBOOK.md` | DevOps |
| Go-Live Execution Log | `docs/DEPLOYMENT_GOLIVE_EXECUTION_LOG.md` | DevOps |
| 24h Metrics Report | `docs/DEPLOYMENT_GOLIVE_METRICS_24H.md` | DevOps |
| Post-Deployment Postmortem | `docs/DEPLOYMENT_GOLIVE_POSTMORTEM.md` | Team |

