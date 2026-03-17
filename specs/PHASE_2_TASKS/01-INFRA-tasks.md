# Phase 2 Infrastructure Tasks (INFRA)
**Workstream**: Shared Infrastructure  
**Duration**: Week 1-2 (Days 1-10)  
**Status**: Ready for Sprint Planning  
**Critical Path**: YES — All other workstreams depend on completion

---

## Workstream Summary

Foundation for W06, W07, and Loop Closure UI. Establishes reusable patterns for external integrations, rate limiting, audit logging, and database schema versioning. This is the critical path blocking all feature development.

### What It Delivers
- ✅ LINE Notify API abstraction layer
- ✅ Frequency guard mechanism (max 2 notifications/day per class)
- ✅ N8N environment configuration & tool sub-workflow patterns
- ✅ Audit logging extension for agentic decisions
- ✅ Database migration harness
- ✅ E2E async webhook handler setup

### Risks & Mitigation
| Risk | Impact | Mitigation |
|------|--------|-----------|
| LINE API quota limits | W06/W07 can't send notifications | Implement frequency guard early; test with staging API token first |
| Supabase connection pooling exhaustion | DB connection limit hit under W07 30min intervals | Configure PgBouncer; use RPC calls (connection-efficient) |
| N8N workflow validation fails | Blocks all workflow deployments | Pre-validate against n8n v2.8.3 schema daily |
| Audit log table bloat | Query performance degrades | Implement retention policy (60d raw, 2yr aggregate) from day 1 |

---

## Task Summary Table

| Task ID | Title | Effort | Dependencies | Assigned | Status |
|---------|-------|--------|--------------|----------|--------|
| INFRA-001 | Create LINE API abstraction layer | 1 day | None | Backend | Ready |
| INFRA-002 | Implement frequency guard mechanic | 1.5 days | INFRA-001 | Backend | Ready |
| INFRA-003 | Extend audit logging table & RLS policy | 1 day | None | Backend + Security | Ready |
| INFRA-004 | Set up N8N environment & tool patterns | 1.5 days | None | DevOps | Ready |
| INFRA-005 | Create database migration harness script | 0.5 days | None | DevOps | Ready |
| INFRA-006 | Implement webhook receiver setup | 1 day | INFRA-001 | Backend | Ready |
| INFRA-007 | Deploy N8N sub-workflow templates | 1.5 days | INFRA-004 | Backend + DevOps | Ready |
| INFRA-008 | Staging environment validation & hardening | 1 day | INFRA-007 | DevOps + QA | Ready |

**Total Effort**: ~9 days (1 developer, 1 DevOps, shared QA)

---

## Detailed Task Cards

### INFRA-001: Create LINE API Abstraction Layer
**Epic**: Shared Infrastructure → External Integration  
**Status**: Not Started

#### Description
Create a reusable, mock-testable abstraction layer for the LINE Notify API in `src/lib/line-notify.ts`. This module will be used by both W06 (briefing sender) and W07 (alert sender) to avoid duplicate LINE integration logic. The abstraction must support:
- Sending messages to LINE groups/individuals via LINE Notify token
- Handling rate limiting and quota errors gracefully
- Supporting mock mode for local development & testing
- Logging all sends to `n8n_audit_log` (for constitutional compliance)

#### Implementation Details
```typescript
// src/lib/line-notify.ts structure:
export interface LineNotifyMessage {
  message: string;
  notificationType: 'briefing' | 'alert' | 'escalation';
  recipientId: string; // Teacher ID (no student PII)
  metadata?: { briefing_id?: string; alert_id?: string };
}

export async function sendLineNotify(
  msg: LineNotifyMessage,
  options?: { dryRun?: boolean }
): Promise<{ success: boolean; messageId?: string; error?: string }>;

export async function getLineQuotaUsage(): Promise<{ used: number; limit: number }>;
```

**Why This Task Exists**: Both W06 and W07 need to send LINE messages but should not duplicate API integration code. Centralizing this prevents bugs and enables consistent error handling.

**Loop Stage**: Act (sending notifications)  
**Constitutional Principle**: IV (Human-in-the-Loop partnership), VI (Teacher notification pathway)

#### Acceptance Criteria
1. ✅ Module exports `sendLineNotify()` and `getLineQuotaUsage()` with full JSDoc comments
2. ✅ Mock mode works: `process.env.LINE_MOCK_MODE=true` → returns `{ success: true }` without actual API call
3. ✅ Real mode: test with staging LINE token; message arrives in test LINE group
4. ✅ Error handling: gracefully returns `{ success: false, error: string }` for invalid token, rate limit, network errors
5. ✅ Audit logging: every send (real or failed) logs entry to audit trail with timestamp, teacher_id, notification_type
6. ✅ Unit test file: `__tests__/lib/line-notify.test.ts` with 8+ test cases (mock, real, rate limit, validation)

#### DoD (Definition of Done)
- [ ] Code written & reviewed
- [ ] Unit tests passing (8+ cases)
- [ ] JSDoc comments complete
- [ ] Integrated with T025 (audit logging)

---

### INFRA-002: Implement Frequency Guard Mechanic
**Epic**: Shared Infrastructure → Rate Limiting  
**Status**: Not Started

#### Description
Implement a database-backed frequency guard in `src/lib/frequency-guard.ts` that enforces Constitutional Principle VIII (no invasive monitoring) by limiting notifications per class. The guard checks if a class has already received notifications in the past 24 hours and blocks additional notifications based on configured thresholds.

**Rule**: Max 2 notifications per class per 24h (1 briefing + 1 alert), none after 18:00 local school time.

#### Implementation Details
```typescript
// src/lib/frequency-guard.ts structure:
export interface FrequencyGuardConfig {
  maxPerDay: number; // default 2
  quietHoursEnd: number; // 18:00 (6 PM)
  excludeTypes: ('briefing' | 'alert')[]; // which types are exempt
}

export async function checkFrequencyGuard(
  classId: string,
  notificationType: 'briefing' | 'alert',
  config?: Partial<FrequencyGuardConfig>
): Promise<{
  allowed: boolean;
  reason?: string; // e.g., "max_daily_reached", "quiet_hours"
  nextAvailable?: Date;
}>;

export async function recordNotificationSent(
  classId: string,
  notificationType: 'briefing' | 'alert',
  metadata?: Record<string, any>
): Promise<void>;
```

**Why This Task Exists**: Constitutional Principle VIII requires we don't spam teachers. W07 (alerts) can trigger every 30 minutes; without this guard, teachers could get 48 alerts in a day. This guard protects teacher experience.

**Loop Stage**: Act (gating notification sends)  
**Constitutional Principle**: VIII (No invasive monitoring; max 2 notifications/day)

#### Acceptance Criteria
1. ✅ Guard checks `notification_logs` table; returns `{ allowed: true/false }` with reason
2. ✅ Rule 1: If 2 notifications already sent today for this class → return `{ allowed: false, reason: "max_daily_reached" }`
3. ✅ Rule 2: If current time > 18:00 AND notification is low-priority alert → return `{ allowed: false, reason: "quiet_hours" }`
4. ✅ Rule 3: Briefing (high priority) always allowed if < max (exemption from quiet hours)
5. ✅ `recordNotificationSent()` creates entry in `notification_logs` with timestamp, class_id, type
6. ✅ Unit tests: `__tests__/lib/frequency-guard.test.ts` with cases for max reached, quiet hours, exemptions

#### DoD
- [ ] Database table `notification_logs` created (via INFRA-005 migration)
- [ ] Guard logic tested against 10+ scenarios
- [ ] Integration with INFRA-001 (called by sendLineNotify wrapper)

---

### INFRA-003: Extend Audit Logging Table & RLS Policy
**Epic**: Shared Infrastructure → Observability & Governance  
**Status**: Not Started

#### Description
Extend the existing `n8n_audit_log` table and create new RLS policies to support Constitutional Principle I (autonomous agency decisions must be auditable) and Principle III (loop closure metrics). Add columns for:
- `decision_type`: 'briefing_generated', 'anomaly_detected', 'alert_sent', 'recommendation_closed'
- `severity`: 'low', 'medium', 'high', 'critical'
- `confidence_score`: 0.0–1.0 (LLM confidence for AI-generated decisions)
- `teacher_feedback`: JSON field for storing closure feedback
- `llm_model`: 'gemini-1.5' (which model made the decision)
- `rule_triggered`: string describing which rule/policy was applied

#### Implementation Details
```sql
-- Migration 023_audit_log_extensions.sql structure:
ALTER TABLE n8n_audit_log ADD COLUMN decision_type text;
ALTER TABLE n8n_audit_log ADD COLUMN severity text;
ALTER TABLE n8n_audit_log ADD COLUMN confidence_score numeric;
ALTER TABLE n8n_audit_log ADD COLUMN teacher_feedback jsonb;
ALTER TABLE n8n_audit_log ADD COLUMN llm_model text;
ALTER TABLE n8n_audit_log ADD COLUMN rule_triggered text;

CREATE INDEX idx_audit_log_decision_type ON n8n_audit_log(decision_type, created_at);
CREATE INDEX idx_audit_log_severity ON n8n_audit_log(severity, created_at);
```

**Why This Task Exists**: Agentic decisions must be auditable for trust and debugging. Without this, we can't prove to teachers/admins why the agent took an action.

**Loop Stage**: Learn (recording decisions for self-evaluation)  
**Constitutional Principle**: I (auditable autonomous decisions), III (self-evaluation requires audit trail)

#### Acceptance Criteria
1. ✅ Migration 023 adds all 6 new columns with correct types & indexes
2. ✅ RLS policies ensure teachers can only READ their own class audits
3. ✅ Sample audit entries created for each decision_type (briefing, anomaly, alert, closure)
4. ✅ Query performance: SELECT * FROM n8n_audit_log WHERE class_id=X AND decision_type='briefing_generated' returns <100ms for 1M rows
5. ✅ Retention policy: Data >60 days aggregated into summary, raw deleted after 60 days (via scheduled job, Phase 3)

#### DoD
- [ ] Migration written & tested in staging
- [ ] Sample data inserted (5 entries per decision_type)
- [ ] Query performance verified

---

### INFRA-004: Set Up N8N Environment & Tool Patterns
**Epic**: Shared Infrastructure → Workflow Orchestration  
**Status**: Not Started

#### Description
Prepare the n8n instance (pinned to v2.8.3) for Phase 2 workflows. Configure:
1. **Environment variables**: Gemini API key, Supabase connection, LINE token, n8n admin credentials
2. **Connections** (reusable authenticated integrations): Supabase, Google Gemini, PostgreSQL
3. **Tool sub-workflow template pattern**: Create a reference sub-workflow that enforces tool isolation (LLM never calls Supabase directly; goes through toolWorkflow)
4. **Webhook receiver setup**: Register webhook URL for cache invalidation callbacks from n8n

#### Implementation Details
```yaml
# n8n environment config (setup.sh):
N8N_DB_TYPE=postgres
N8N_DB_POSTGRESDB_HOST=supabase.co
N8N_RUNNERS_ENABLED=true
N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
GEMINI_API_KEY=<from Secrets Manager>
SUPABASE_URL=<from Secrets Manager>
LINE_NOTIFY_TOKEN=<from Secrets Manager>
```

**Why This Task Exists**: n8n needs explicit configuration before workflows can run. Without this, W06/W07 workflows will fail on startup.

**Loop Stage**: Reason (orchestration infrastructure)  
**Constitutional Principle**: I (deterministic, auditable execution), VII (scalability via proper configuration)

#### Acceptance Criteria
1. ✅ `.env` configured with all critical vars; no hardcoded secrets in code
2. ✅ n8n dashboard loads; admin can navigate to Workflows tab
3. ✅ 3 connections created & tested: Supabase (SELECT 1), Gemini (test prompt), PostgreSQL (ping)
4. ✅ Reference sub-workflow created: `tools/template-tool-workflow.json` with single RPC call node as example
5. ✅ Webhook registration: POST to `/api/n8n/webhook` returns 200 OK
6. ✅ N8N version verified: `GET /api/n8n/version` → `"2.8.3"`

#### DoD
- [ ] All connections tested in n8n UI
- [ ] No secrets in Git history
- [ ] DevOps runbook created for environment variable updates

---

### INFRA-005: Create Database Migration Harness Script
**Epic**: Shared Infrastructure → Database Management  
**Status**: Not Started

#### Description
Create a Bash script (`scripts/run-migrations.sh`) that safely applies pending Supabase migrations in order. This is critical for Phase 2 as we'll deploy 5 new migrations (020-024) sequentially and may need quick rollbacks.

#### Implementation Details
```bash
#!/bin/bash
# scripts/run-migrations.sh

# Usage: ./run-migrations.sh [environment] [--dry-run] [--rollback-to <version>]
# Example: ./run-migrations.sh staging --dry-run
#          ./run-migrations.sh prod --rollback-to 019

set -e

ENVIRONMENT=${1:-staging}
DRY_RUN=${2:-false}

# Fetch pending migrations (not yet in schema_version table)
PENDING=$(psql -h $SUPABASE_HOST -d $SUPABASE_DB -c \
  "SELECT version FROM schema_migrations WHERE status='pending' ORDER BY version ASC;")

for version in $PENDING; do
  migration_file="supabase/migrations/${version}_*.sql"
  echo "[INFO] Applying migration $version..."
  
  if [ "$DRY_RUN" == "--dry-run" ]; then
    cat $migration_file
  else
    psql -h $SUPABASE_HOST -d $SUPABASE_DB < $migration_file
    echo "[SUCCESS] Migration $version applied"
  fi
done
```

**Why This Task Exists**: Manual SQL execution is error-prone. A script ensures migrations run in correct order and provides rollback capability.

**Loop Stage**: Plan (infrastructure setup)  
**Constitutional Principle**: VII (scalability via automated deployment)

#### Acceptance Criteria
1. ✅ Script runs pending migrations in version order
2. ✅ `--dry-run` flag shows SQL without executing
3. ✅ `--rollback-to <version>` flag can revert to prior schema state
4. ✅ Error handling: exits with code 1 if any migration fails
5. ✅ Logging: prints progress to stdout; all errors to stderr
6. ✅ Safety: scripts don't run on production without explicit `--confirm` flag

#### DoD
- [ ] Script tested against staging environment
- [ ] Runbook documented (README in scripts/ directory)

---

### INFRA-006: Implement Webhook Receiver Setup
**Epic**: Shared Infrastructure → n8n Integration  
**Status**: Not Started

#### Description
Set up the `POST /api/n8n/webhook` route handler to receive events from n8n workflows (W06, W07, etc.). This endpoint is used for:
1. **Cache invalidation**: When a briefing is approved, revalidate dashboard cache
2. **Status updates**: Record workflow execution status (success/failure) in `n8n_audit_log`
3. **Real-time notifications**: Trigger dashboard updates (e.g., new alert received)

#### Implementation Details
```typescript
// src/app/api/n8n/webhook/route.ts
export async function POST(request: Request) {
  const payload = await request.json(); // { workflow_id, event_type, data }
  
  // Validate n8n signature (X-N8N-Signature header)
  if (!validateN8NSignature(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { workflow_id, event_type, data } = payload;
  
  switch (event_type) {
    case 'briefing_approved':
      // Call W06 LINE send
      // Revalidate dashboard cache
      revalidatePath(`/teacher/class/${data.class_id}`);
      break;
    case 'alert_acknowledged':
      // Update alert status
      break;
    case 'workflow_completed':
      // Log to n8n_audit_log
      break;
  }
  
  return Response.json({ received: true });
}
```

**Why This Task Exists**: n8n workflows need a way to update the Next.js app state. Without this webhook, briefings won't appear on dashboard, alerts won't update, etc.

**Loop Stage**: Act (triggering downstream actions)  
**Constitutional Principle**: IV (human-in-the-loop; webhook enables approval flow)

#### Acceptance Criteria
1. ✅ Webhook endpoint returns 200 OK for valid requests
2. ✅ Payload validation: rejects requests without valid n8n signature
3. ✅ Event handling: `briefing_approved` → cache revalidation works
4. ✅ Error handling: malformed payloads logged, don't crash endpoint
5. ✅ Rate limiting: webhook can handle 100 requests/minute without degradation
6. ✅ Integration test: `__tests__/api/n8n-webhook.test.ts` with mock n8n payloads

#### DoD
- [ ] Endpoint integrated with INFRA-003 (audit logging)
- [ ] Signature validation tested with real n8n instances

---

### INFRA-007: Deploy N8N Sub-Workflow Templates
**Epic**: Shared Infrastructure → Workflow Orchestration  
**Status**: Not Started

#### Description
Create and validate reusable sub-workflow templates in n8n that will be invoked by W06/W07/Loop workflows. These are the "tools" in the LangChain agent pattern:
1. `tool-get-climate-summary` — RPC call to fetch aggregated mood data
2. `tool-get-past-recommendations` — Query recommendations table
3. `tool-count-enrolled-students` — Count active students in class (k-anonymity check)
4. `tool-frequency-guard-check` — Check if notification allowed (INFRA-002)
5. `tool-line-notify-send` — Send LINE message (INFRA-001 wrapper)

Each sub-workflow must:
- Be invoked via `toolWorkflow` node (not direct HTTP)
- Return JSON with `{ success: bool, data?: any, error?: string }`
- Include error handling (no hangs, timeouts)
- Log decision to `n8n_audit_log` (INFRA-003)

#### Implementation Details
```json
// n8n/workflows/tools/tool-get-climate-summary.json structure:
{
  "name": "tool-get-climate-summary",
  "nodes": [
    {
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT * FROM rpc_get_climate_summary($1, $2)"
      }
    },
    {
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": { "number": { "value1": "{{ $json.count }}", "operation": "gte", "value2": 3 } }
      }
    }
  ]
}
```

**Why This Task Exists**: W06/W07 will invoke these tools dozens of times per day. Centralizing avoids duplicated logic in each workflow.

**Loop Stage**: Reason (calling data & infrastructure services)  
**Constitutional Principle**: I (auditable tool invocations), II (k-anonymity checks embedded)

#### Acceptance Criteria
1. ✅ 5 sub-workflows created & deployed to n8n instance
2. ✅ Each sub-workflow: valid JSON, no validation errors (❌ icons), <5 second execution
3. ✅ Test invocation: call each via `toolWorkflow` node; verify return format
4. ✅ Error paths: test with invalid inputs (null class_id, missing RLS policy); ensure graceful returns
5. ✅ Audit logging: each tool invocation logs to n8n_audit_log with tool_name, status, latency
6. ✅ Documentation: `n8n/workflows/tools/README.md` lists all available tools, expected inputs/outputs

#### DoD
- [ ] All 5 sub-workflows validated in n8n UI (v2.8.3)
- [ ] Integration tests: call each tool from test node; verify results

---

### INFRA-008: Staging Environment Validation & Hardening
**Epic**: Shared Infrastructure → Testing & Readiness  
**Status**: Not Started

#### Description
Run comprehensive validation against staging environment to ensure:
1. All infrastructure works end-to-end (DB → n8n → LINE → dashboard → DB)
2. Performance is acceptable (sub-second RPC calls, <2sec workflow execution)
3. Security hardening complete (no hardcoded secrets, RLS policies enforced)
4. Monitoring/alerting configured (disk space, error rates, slow queries)

#### Implementation Details
- **Connectivity test**: Verify all external API connections (Supabase, LINE Notify, Gemini)
- **Database test**: Run sample queries (get_climate_summary for 10 classes); measure latency
- **n8n test**: Deploy a simple test workflow; trigger it via schedule; verify webhook callback
- **LINE test**: Send test message to staging LINE group; confirm delivery
- **Load test**: Simulate 100 concurrent HTTP requests to /api/student/check-in; measure response times
- **Security audit**: Scan for hardcoded passwords, check RLS policies on sensitive tables

#### Acceptance Criteria
1. ✅ All 5 external connections respond with <1s latency
2. ✅ Database queries for climate summary <500ms (for 3-week average, any class size)
3. ✅ n8n workflow hello-world executes in <3 seconds
4. ✅ LINE test message arrives in <10 seconds after send
5. ✅ Load test: 100 concurrent requests → <5% error rate, p95 latency <1s
6. ✅ Security: 0 hardcoded secrets in codebase, RLS policies verified on 5 critical tables
7. ✅ Monitoring: Prometheus scrape targets configured; Grafana dashboard shows key metrics

#### DoD
- [ ] Staging readiness report generated
- [ ] All blockers resolved before Week 2

---

## Dependency Graph

```
INFRA-001 (LINE API)
  ↓ (required by)
INFRA-002 (Frequency Guard) - can start in parallel with D1-2 of INFRA-001
  ↓
INFRA-006 (Webhook Receiver) - depends on INFRA-001 for callback actions

INFRA-003 (Audit Logging) - can start in parallel with INFRA-001
  ↓ (required by)
INFRA-007 (N8N Sub-workflows) - depends on INFRA-003 for logging

INFRA-004 (N8N Setup) - independent, can run in parallel
  ↓ (required by)
INFRA-007 (N8N Sub-workflows) - depends on INFRA-004 environment

INFRA-005 (Migration Harness) - independent, can run in parallel

INFRA-008 (Staging Validation) - depends on all others being complete
```

## Team Assignments (Recommended)

| Role | Assigned Tasks | Effort |
|------|----------------|--------|
| Backend Engineer (1) | INFRA-001, INFRA-002, INFRA-003, INFRA-006 | 5 days |
| DevOps Engineer (1) | INFRA-004, INFRA-005, INFRA-008 | 3 days |
| QA Engineer (0.5) | INFRA-008 (load & security testing) | 1.5 days |

---

## Success Criteria (Workstream Level)

✅ All 8 tasks completed and tested in staging  
✅ INFRA-008 Staging Validation Report: all checks pass  
✅ No blocking issues for W07/W06/Loop task starts  
✅ Team ready to pivot to parallel W06/W07 development  

---

## Artifacts Delivered

| Artifact | Location | Owner |
|----------|----------|-------|
| LINE API abstraction | `src/lib/line-notify.ts` | Backend |
| Frequency guard logic | `src/lib/frequency-guard.ts` | Backend |
| Audit logging extension | `supabase/migrations/023_audit_log_extensions.sql` | Backend |
| N8N environment config | `.env.n8n`, n8n Admin UI | DevOps |
| Migration harness | `scripts/run-migrations.sh` | DevOps |
| Webhook receiver | `src/app/api/n8n/webhook/route.ts` | Backend |
| Sub-workflow templates | `n8n/workflows/tools/*.json` (5 files) | Backend |
| Validation report | `docs/INFRA_STAGING_REPORT.md` | QA |

