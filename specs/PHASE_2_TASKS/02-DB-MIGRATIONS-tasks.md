# Phase 2 Database Migrations Tasks (DB-MIGRATIONS)
**Workstream**: Database Schema Evolution  
**Duration**: Week 1-2 (Days 1-10, in parallel with INFRA)  
**Status**: Ready for Sprint Planning  
**Critical Path**: YES — Blocks all feature development

---

## Workstream Summary

Database schema foundation for Phase 2. These migrations are asynchronous to INFRA tasks (different team can execute) but are critical path before any feature code runs.

### What It Delivers
- ✅ `020_briefing_queue.sql` — Table for pending/sent briefings (W06)
- ✅ `021_mood_alerts.sql` — Tables for real-time anomaly alerts (W07)
- ✅ `022_recommendation_enhancements.sql` — Closure tracking fields (Loop UI)
- ✅ `023_audit_log_extensions.sql` — Decision audit columns (shared infrastructure)
- ✅ `024_engagement_stats.sql` — Teacher engagement aggregation (Loop UI)
- ✅ Migration testing & rollback validation

### Shared Infrastructure Dependency
These migrations depend on **INFRA-005 (Migration Harness)** to be deployed, but SQL can be written in parallel.

### Risks & Mitigation
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Data loss during rollback | Production data corrupted | Test rollbacks against staging with real data copy |  
| Indexes created inefficiently | Query performance poor | Review EXPLAIN plans; test queries on 100K+ row dataset |
| RLS policies missing | Data exposed to wrong teachers | Run RLS validation tests before production deploy |
| Migration lock contention | Deploy hangs if another migration runs | Coordinate deployment windows; use advisory locks |

---

## Task Summary Table

| Task ID | Title | Effort | Dependencies | Assigned | Status |
|---------|-------|--------|--------------|----------|--------|
| DB-001 | Write briefing_queue schema (020) | 1 day | None | Backend | Ready |
| DB-002 | Write mood_alerts schema (021) | 1.5 days | None | Backend | Ready |
| DB-003 | Write recommendation_enhancements schema (022) | 1 day | None | Backend | Ready |
| DB-004 | Write audit_log_extensions schema (023) | 1 day | Shared with INFRA-003 | Backend | Ready |
| DB-005 | Write engagement_stats schema (024) | 1 day | None | Backend | Ready |
| DB-006 | Test migrations: rollback & idempotency | 2 days | DB-001–005 | QA | Ready |

**Total Effort**: ~7 days (1 backend, 1 QA)

---

## Detailed Task Cards

### DB-001: Write briefing_queue Schema (Migration 020)
**Epic**: Database Schema → W06 Morning Briefing  
**Status**: Not Started

#### Description
Create schema for the `briefing_queue` table that stores pending/sent briefings for W06. This table is written by the n8n W06 workflow and read by the dashboard for the teacher approval gate.

#### Implementation Details
```sql
-- supabase/migrations/020_briefing_queue.sql

CREATE TABLE briefing_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES class_enrollments(class_id) ON DELETE CASCADE,
  school_id uuid NOT NULL,
  
  -- Briefing Content
  briefing_text text NOT NULL, -- LINE message (max 280 chars)
  recommendation_title text NOT NULL,
  recommendation_description text,
  
  -- Metadata
  mood_avg numeric, -- avg mood when briefing generated
  mood_trend numeric, -- trend delta vs 3 weeks
  teacher_closure_rate numeric, -- prior closure % (personalization)
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  llm_model text, -- 'gemini-1.5-pro', etc.
  
  -- Status Lifecycle
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'dismissed', 'sent', 'failed')),
  created_at timestamp NOT NULL DEFAULT now(),
  approved_at timestamp,
  sent_at timestamp,
  dismissed_at timestamp,
  
  -- Audit
  teacher_id uuid NOT NULL,
  approved_by_user_id uuid,
  created_by_workflow text, -- 'W06-Morning-Briefing'
  
  -- Line integration
  line_message_id text, -- returned by LINE API
  line_send_latency_ms integer, -- how long did LINE.send() take?
  
  CONSTRAINT briefing_immutable_once_sent CHECK (
    (status IN ('pending', 'approved', 'dismissed')) OR
    (sent_at IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_briefing_queue_class_id ON briefing_queue(class_id, created_at DESC);
CREATE INDEX idx_briefing_queue_status ON briefing_queue(status, created_at DESC);
CREATE INDEX idx_briefing_queue_teacher_id ON briefing_queue(teacher_id, created_at DESC);

-- RLS Policies
ALTER TABLE briefing_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers see briefings for their classes"
  ON briefing_queue FOR SELECT
  USING (
    class_id IN (
      SELECT class_id FROM class_enrollments
      WHERE user_id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "N8N workflow writes briefings"
  ON briefing_queue FOR INSERT
  WITH CHECK (created_by_workflow IN ('W06-Morning-Briefing'));

CREATE POLICY "Teachers approve their class briefings"
  ON briefing_queue FOR UPDATE
  USING (
    class_id IN (
      SELECT class_id FROM class_enrollments
      WHERE user_id = auth.uid() AND role = 'teacher'
    )
  )
  WITH CHECK (
    -- Can only update status & approval fields
    briefing_text = OLD.briefing_text AND
    mood_avg = OLD.mood_avg AND
    status != 'sent' -- Cannot override sent status
  );
```

**Why This Task Exists**: W06 needs persistent storage for briefings pending teacher approval. Without this table, the dashboard can't display "here's your briefing, approve?" workflow.

**Loop Stage**: Act (storing pending actions waiting for teacher approval)  
**Constitutional Principle**: IV (human-in-the-loop; teacher approval required before LINE send)

#### Acceptance Criteria
1. ✅ Table `briefing_queue` created with all 20 columns
2. ✅ RLS policies: tested that teacher only sees their class briefings
3. ✅ Constraints: `status` only allows 5 values; cannot modify sent briefings
4. ✅ Foreign key: references `class_enrollments`, cascade delete on class removal
5. ✅ Sample data: insert 3 test briefings (pending, approved, dismissed)
6. ✅ Rollback: migration can be reversed; table drops cleanly

#### DoD
- [ ] Migration SQL validated against staging Supabase instance
- [ ] RLS policy tested: call as teacher→ see own class briefings; as other teacher→ see nothing
- [ ] Sample inserts succeed without constraint violations

---

### DB-002: Write mood_alerts Schema (Migration 021)
**Epic**: Database Schema → W07 Mood Anomaly Alert  
**Status**: Not Started

#### Description
Create schema for tables supporting W07 real-time anomaly detection:
1. `mood_alerts` — Individual alert records triggered by anomaly detection rules
2. `hourly_mood_aggregate` — Pre-computed aggregates (speed optimization for W07)
3. `mood_baselines` — 3-week rolling baselines per class (used for anomaly comparison)

#### Implementation Details
```sql
-- supabase/migrations/021_mood_alerts.sql

-- Main alerts table
CREATE TABLE mood_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES class_enrollments(class_id) ON DELETE CASCADE,
  school_id uuid NOT NULL,
  
  -- Detection Metadata
  detection_rule text NOT NULL, -- 'mood_drop_high', 'mood_drop_medium', 'engagement_drop'
  mood_current numeric, -- avg mood at detection time (0-100)
  mood_baseline numeric, -- 3-week baseline
  mood_drop_percent numeric, -- % drop from baseline
  engagement_count integer, -- # students who submitted in past hour
  engagement_threshold integer, -- expected count for this class
  
  -- Severity Classification
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1), -- LLM confidence
  
  -- Suggested Interventions
  intervention_titles text[], -- array of 2-3 suggested action titles
  intervention_descriptions text[], -- descriptions
  llm_model text, -- which LLM classified severity
  
  -- Teacher Response Tracking
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'action_taken', 'dismissed')),
  acknowledged_at timestamp,
  acknowledged_by_user_id uuid,
  action_taken_at timestamp,
  action_description text, -- what did teacher do?
  
  -- Line Integration
  line_message_id text,
  line_sent_at timestamp,
  line_send_latency_ms integer,
  
  -- Audit
  created_at timestamp NOT NULL DEFAULT now(),
  created_by_workflow text, -- 'W07-Mood-Anomaly-Alert'
  
  CONSTRAINT alert_immutable_once_sent CHECK (
    (status IN ('pending', 'acknowledged', 'dismissed')) OR
    (line_sent_at IS NOT NULL)
  )
);

CREATE INDEX idx_mood_alerts_class_id ON mood_alerts(class_id, created_at DESC);
CREATE INDEX idx_mood_alerts_severity ON mood_alerts(severity, created_at DESC);
CREATE INDEX idx_mood_alerts_status ON mood_alerts(status, created_at DESC);

-- Hourly aggregates (pre-computed for speed)
CREATE TABLE hourly_mood_aggregate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES class_enrollments(class_id) ON DELETE CASCADE,
  
  -- Hour bucket
  hour_bucket timestamp NOT NULL, -- e.g., 2026-03-16 14:00:00
  
  -- Aggregation
  mood_avg numeric,
  mood_std_dev numeric,
  mood_min numeric,
  mood_max numeric,
  submission_count integer,
  
  created_at timestamp DEFAULT now(),
  
  UNIQUE (class_id, hour_bucket)
);

-- 3-week rolling baseline
CREATE TABLE mood_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL UNIQUE REFERENCES class_enrollments(class_id) ON DELETE CASCADE,
  
  -- Baseline from past 21 days
  baseline_mood_avg numeric,
  baseline_mood_std_dev numeric,
  computed_at timestamp DEFAULT now(),
  
  -- Recalculate nightly
  next_recalc_at timestamp
);

-- RLS
ALTER TABLE mood_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_mood_aggregate ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers see alerts for their classes"
  ON mood_alerts FOR SELECT
  USING (
    class_id IN (
      SELECT class_id FROM class_enrollments
      WHERE user_id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "N8N workflow writes alerts"
  ON mood_alerts FOR INSERT
  WITH CHECK (created_by_workflow IN ('W07-Mood-Anomaly-Alert'));

CREATE POLICY "Teachers acknowledge/respond to alerts"
  ON mood_alerts FOR UPDATE
  USING (
    class_id IN (
      SELECT class_id FROM class_enrollments
      WHERE user_id = auth.uid() AND role = 'teacher'
    )
  )
  WITH CHECK (
    -- Can only update status & response fields
    mood_current = OLD.mood_current AND
    severity = OLD.severity AND
    status IN ('pending', 'acknowledged', 'action_taken', 'dismissed')
  );
```

**Why This Task Exists**: W07 is real-time anomaly detection. These tables store:
- Individual alerts (for teacher dashboard)
- Hourly pre-computed aggregates (for fast anomaly checks in W07 loop)
- 3-week baselines (used to detect deviations)

**Loop Stage**: Act (recording anomaly detections), Self-Evaluate (tracking teacher response)  
**Constitutional Principle**: III (closure tracking via acknowledged_at, action_taken_at), IV (teacher acknowledges/responds)

#### Acceptance Criteria
1. ✅ All 3 tables created with correct column types & constraints
2. ✅ Indexes on frequently queried columns (class_id, severity, status)
3. ✅ RLS: teacher sees only alerts for their classes; N8N can insert
4. ✅ Sample data: insert 5 test alerts (different severities, statuses)
5. ✅ Hourly aggregate: sample data for 24 hours of a test class
6. ✅ Baseline: compute rolling 3-week average for test class

#### DoD
- [ ] All 3 tables created & tested in staging
- [ ] Rollback tested (tables drop cleanly)
- [ ] RLS policies verified with test queries

---

### DB-003: Write recommendation_enhancements Schema (Migration 022)
**Epic**: Database Schema → Loop Closure UI  
**Status**: Not Started

#### Description
Extend the existing `recommendations` table with closure tracking columns needed for the Loop Closure UI. Teachers mark recommendations "Done" with structured feedback, which feeds into next briefing personalization.

#### Implementation Details
```sql
-- supabase/migrations/022_recommendation_enhancements.sql

ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS closure_status text 
  CHECK (closure_status IN ('pending', 'implemented', 'dismissed', 'expired'));
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS closure_timestamp timestamp;
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS closure_latency_hours numeric;
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS teacher_action_type text 
  CHECK (teacher_action_type IN (
    'icebreaker_energizer',
    'one_on_one_checkin',
    'content_revisit',
    'pacing_breaks',
    'other',
    NULL
  ));
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS teacher_feedback_text text;

-- Index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_recommendations_closure_status 
  ON recommendations(class_id, closure_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_closure_latency 
  ON recommendations(class_id, closure_latency_hours DESC);

-- Computed view for aggregation
CREATE OR REPLACE VIEW recommendation_stats_by_teacher AS
SELECT
  teacher_id,
  class_id,
  COUNT(*) as total_sent,
  COUNT(CASE WHEN closure_status = 'implemented' THEN 1 END) as implemented_count,
  ROUND(
    100.0 * COUNT(CASE WHEN closure_status = 'implemented' THEN 1 END) 
    / NULLIF(COUNT(*), 0),
    1
  ) as closure_rate_percent,
  ROUND(AVG(closure_latency_hours), 2) as avg_closure_latency_hours,
  MAX(created_at) as last_recommendation_at
FROM recommendations
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY teacher_id, class_id;

-- RLS Policy: Only teachers see their own recommendation closure data
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers update closure on their class recommendations"
  ON recommendations FOR UPDATE
  USING (
    class_id IN (
      SELECT class_id FROM class_enrollments
      WHERE user_id = auth.uid() AND role = 'teacher'
    )
  )
  WITH CHECK (
    -- Can only modify closure-related fields
    recommendation_title = OLD.recommendation_title AND
    description = OLD.description AND
    created_by_workflow = OLD.created_by_workflow
  );
```

**Why This Task Exists**: The Loop Closure UI requires teachers to mark recommendations "Done". These columns store the closure status, latency, and feedback for self-evaluation.

**Loop Stage**: Self-Evaluate (teacher marks done + feedback), Learn (metrics aggregated)  
**Constitutional Principle**: III (loop closure data), VI (teacher feedback mechanism)

#### Acceptance Criteria
1. ✅ 5 new columns added to `recommendations` table (closure_status, timestamp, latency, action_type, feedback)
2. ✅ Indexes created for dashboard queries
3. ✅ View `recommendation_stats_by_teacher` created; sample data shows correct calculations
4. ✅ RLS policy allows teachers to update only closure fields; verified via SELECT/UPDATE test
5. ✅ Rollback: columns can be removed; view drops cleanly

#### DoD
- [ ] Migration tested in staging
- [ ] Sample data: update 3 recommendations with closure info; verify view calcs
- [ ] RLS tested

---

### DB-004: Write audit_log_extensions Schema (Migration 023)
**Epic**: Database Schema → Audit Logging (SHARED with INFRA-003)  
**Status**: Not Started

#### Description
Extend `n8n_audit_log` table with decision metadata columns for agentic reasoning transparency (Constitutional Principle I). This is a **shared dependency** with INFRA-003; DevOps and Backend should coordinate.

#### Implementation Details
```sql
-- supabase/migrations/023_audit_log_extensions.sql
-- Shared with INFRA-003; DevOps coordinates deployment

ALTER TABLE n8n_audit_log ADD COLUMN IF NOT EXISTS decision_type text 
  CHECK (decision_type IN (
    'briefing_generated',
    'briefing_approved',
    'anomaly_detected',
    'alert_sent',
    'recommendation_closed',
    'frequency_guard_applied',
    NULL
  ));

ALTER TABLE n8n_audit_log ADD COLUMN IF NOT EXISTS severity text 
  CHECK (severity IN ('low', 'medium', 'high', 'critical', NULL));

ALTER TABLE n8n_audit_log ADD COLUMN IF NOT EXISTS confidence_score numeric 
  CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1));

ALTER TABLE n8n_audit_log ADD COLUMN IF NOT EXISTS teacher_feedback jsonb;

ALTER TABLE n8n_audit_log ADD COLUMN IF NOT EXISTS llm_model text;

ALTER TABLE n8n_audit_log ADD COLUMN IF NOT EXISTS rule_triggered text;

-- Indexes for reporting
CREATE INDEX IF NOT EXISTS idx_audit_log_decision_type 
  ON n8n_audit_log(decision_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_workflow_severity 
  ON n8n_audit_log(workflow_id, severity, created_at DESC);

-- Audit log view (safe for teachers to see high-level summary)
CREATE OR REPLACE VIEW audit_log_summary_by_class AS
SELECT
  class_id,
  decision_type,
  severity,
  COUNT(*) as count,
  AVG(confidence_score) as avg_confidence,
  MAX(created_at) as last_occurrence
FROM n8n_audit_log
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY class_id, decision_type, severity;
```

**Why This Task Exists**: Constitutional Principle I requires auditable decisions. Every agentic action (briefing generation, anomaly detection, alert send) must log its reasoning, confidence, and model used.

**Loop Stage**: Learn (audit trail for self-evaluation)  
**Constitutional Principle**: I (autonomous agency must be auditable)

#### Acceptance Criteria
1. ✅ 6 columns added to `n8n_audit_log`
2. ✅ Indexes created; query performance for "SELECT WHERE decision_type='briefing_generated'" <200ms
3. ✅ View created; aggregates decisions by type/severity
4. ✅ RLS: teachers can READ summary view but NOT raw audit rows

#### DoD
- [ ] Coordinate with INFRA-003; ensure no duplicate column creation
- [ ] Indexes tested with sample 1M-row dataset

---

### DB-005: Write engagement_stats Schema (Migration 024)
**Epic**: Database Schema → Teacher Engagement Aggregation  
**Status**: Not Started

#### Description
Create a `teacher_engagement_stats` table that stores nightly aggregations of teacher engagement metrics. This enables:
1. Dashboard MetricsCard showing closure rates
2. LLM personalization in next briefing ("this teacher prefers icebreakers")
3. Admin health dashboard tracking adoption

#### Implementation Details
```sql
-- supabase/migrations/024_engagement_stats.sql

CREATE TABLE teacher_engagement_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  class_id uuid NOT NULL REFERENCES class_enrollments(class_id) ON DELETE CASCADE,
  school_id uuid NOT NULL,
  
  -- Aggregation period
  stat_date date NOT NULL, -- e.g., 2026-03-16
  computed_at timestamp DEFAULT now(),
  
  -- Recommendation metrics (past 7 days)
  recommendations_sent_7d integer DEFAULT 0,
  recommendations_implemented_7d integer DEFAULT 0,
  closure_rate_7d_percent numeric,
  avg_closure_latency_hours_7d numeric,
  
  -- Recommendation metrics (past 30 days)
  recommendations_sent_30d integer DEFAULT 0,
  recommendations_implemented_30d integer DEFAULT 0,
  closure_rate_30d_percent numeric,
  avg_closure_latency_hours_30d numeric,
  
  -- Action type preference (past 30 days)
  preferred_action_type text, -- most used: 'icebreaker_energizer', etc.
  action_type_histogram jsonb, -- { icebreaker_energizer: 5, one_on_one: 3, ... }
  
  -- Alert metrics (past 7 days)
  alerts_received_7d integer DEFAULT 0,
  alerts_acknowledged_7d integer DEFAULT 0,
  alert_acknowledgment_rate_7d_percent numeric,
  
  -- Signature for personalization
  high_trust_action_types text[], -- actions that succeeded >70% of times
  teacher_tone_preference text, -- 'encouraging', 'clinical', 'direct' (inferred from feedback)
  
  UNIQUE (teacher_id, class_id, stat_date)
);

CREATE INDEX idx_engagement_stats_teacher ON teacher_engagement_stats(teacher_id, stat_date DESC);
CREATE INDEX idx_engagement_stats_class ON teacher_engagement_stats(class_id, stat_date DESC);

-- RLS: Teachers see only their own stats
ALTER TABLE teacher_engagement_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers see only their own engagement stats"
  ON teacher_engagement_stats FOR SELECT
  USING (teacher_id = auth.uid());

-- Nightly aggregation job will be implemented as N8N sub-workflow
-- See: n8n/workflows/nightly-engagement-aggregation.json
```

**Why This Task Exists**: Loop Closure UI needs to display teacher engagement metrics. Without this table, we'd have to compute aggregates on-demand (slow) or have no visibility into adoption patterns.

**Loop Stage**: Learn (aggregating engagement metrics for adaptation)  
**Constitutional Principle**: VI (teacher partnership metrics visibility)

#### Acceptance Criteria
1. ✅ Table `teacher_engagement_stats` created with 18 columns
2. ✅ UNIQUE constraint on (teacher_id, class_id, stat_date)
3. ✅ Indexes on teacher_id and class_id
4. ✅ RLS policy: teacher only sees own stats
5. ✅ Sample data: insert 7 days of stats for test teacher (shows trend)

#### DoD
- [ ] Table created & tested
- [ ] Rollback tested
- [ ] Nightly aggregation job design reviewed (scheduled for Phase 2 later)

---

### DB-006: Test Migrations: Rollback & Idempotency
**Epic**: Database Schema → Quality Assurance  
**Status**: Not Started

#### Description
Comprehensive testing of all 5 migrations (020-024) to ensure:
1. **Forward compatibility**: Migrations run in order without conflicts
2. **Rollback safety**: Migrations can be reversed without data loss
3. **Idempotency**: Running same migration twice doesn't fail
4. **Performance**: Migrations complete in <30 seconds each (no locks on production)
5. **RLS correctness**: All policies function as intended

#### Implementation Details
```bash
# Test procedure (./scripts/test-migrations.sh)

# Test 1: Forward migration
echo "[TEST] Running migrations 020-024 sequentially..."
for migration in 020 021 022 023 024; do
  psql -h $STAGING_HOST -d $STAGING_DB < supabase/migrations/${migration}_*.sql
done

# Test 2: Verify schema
psql -h $STAGING_HOST -d $STAGING_DB \
  -c "SELECT * FROM information_schema.tables WHERE table_schema='public';" \
  | grep -E 'briefing_queue|mood_alerts|hourly_mood_aggregate|mood_baselines|teacher_engagement_stats'

# Test 3: RLS policies exist
psql -h $STAGING_HOST -d $STAGING_DB \
  -c "SELECT tablename, policyname FROM pg_policies;" \
  | wc -l # Should have >= 15 policies for Phase 2

# Test 4: Rollback test (reverse order)
for migration in 024 023 022 021 020; do
  # Generate rollback SQL (reverse of forward)
  # psql < rollback/${migration}_*.sql
done

# Test 5: Idempotency (run 020 twice)
psql -h $STAGING_HOST -d $STAGING_DB < supabase/migrations/020_*.sql
psql -h $STAGING_HOST -d $STAGING_DB < supabase/migrations/020_*.sql # Should not error
```

**Why This Task Exists**: Database migrations are risky. A failed migration can corrupt schema, cause downtime, or lose data. Comprehensive testing catches issues before production.

**Loop Stage**: Plan (testing deployment safety)  
**Constitutional Principle**: VII (reliable, scalable infrastructure)

#### Acceptance Criteria
1. ✅ All 5 migrations run in sequence without errors
2. ✅ Tables exist post-migration (verified via information_schema query)
3. ✅ RLS policies created (verified via pg_policies)
4. ✅ Rollback scripts created & tested (schema reverts cleanly)
5. ✅ Idempotency tested: running migration twice doesn't error
6. ✅ Performance: each migration <30 seconds (no table locks >5 sec)
7. ✅ Test report created: `docs/DB_MIGRATION_TEST_REPORT.md`

#### DoD
- [ ] All tests pass in staging
- [ ] Rollback scripts committed to repo
- [ ] Migration Harness script (INFRA-005) tested with these migrations

---

## Dependency Graph

```
DB-001 ──┐
DB-002 ──┼─→ DB-006 (Testing Phase)
DB-003 ──┼
DB-004 ──┤ (Shared with INFRA-003; coordinate deployment)
DB-005 ──┘
```

All DB tasks are parallel except for DB-006 (testing runs after all migrations written).

---

## Team Assignments (Recommended)

| Role | Assigned Tasks | Effort |
|------|----------------|--------|
| Backend Engineer (1) | DB-001–005 (write migrations) | 5 days |
| QA Engineer (1) | DB-006 (test, rollback, performance) | 2 days |

---

## Success Criteria (Workstream Level)

✅ All 5 migrations written & committed to `supabase/migrations/`  
✅ DB-006 Test Report shows all tests pass  
✅ Rollback procedures documented & tested  
✅ RLS policies verified on all new tables  
✅ Team ready to deploy to staging before W07/W06 feature work starts  

---

## Artifacts Delivered

| Artifact | Location | Owner |
|----------|----------|-------|
| Migration 020 (Briefing Queue) | `supabase/migrations/020_briefing_queue.sql` | Backend |
| Migration 021 (Mood Alerts) | `supabase/migrations/021_mood_alerts.sql` | Backend |
| Migration 022 (Recommendation Enhancements) | `supabase/migrations/022_recommendation_enhancements.sql` | Backend |
| Migration 023 (Audit Extensions) | `supabase/migrations/023_audit_log_extensions.sql` | Backend + INFRA-003 |
| Migration 024 (Engagement Stats) | `supabase/migrations/024_engagement_stats.sql` | Backend |
| Test Report | `docs/DB_MIGRATION_TEST_REPORT.md` | QA |
| Rollback Scripts | `supabase/rollback/024-023-022-021-020.sql` | DevOps |

