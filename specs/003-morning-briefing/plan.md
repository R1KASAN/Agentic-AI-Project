# Implementation Plan: W06 Morning AI Briefing

**Branch**: `003-morning-briefing` | **Date**: 2026-03-16 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/003-morning-briefing/spec.md`  
**Constitution**: Climate Agent v2.0.0 (Agentic Autonomy & Loop Closure)

---

## Summary

**Primary Requirement**: Deliver autonomous daily classroom climate briefing via LINE at 7:30 AM (school day only) to teachers, featuring mood aggregates, LLM-generated teaching suggestions, trend analysis, and loop closure metrics—all with k-anonymity (k≥3) protection and human-in-the-loop approval gate.

**Technical Approach**:
- **n8n Workflow (W06)**: Schedule trigger (M-F 7:30 AM) → calendar/k-anonymity checks → LLM agentic reasoning (recommendations) → LINE notification + dashboard update → audit logging
- **Supabase RLS Tables**: `student_pulses` (mood data), `recommendations` (LLM output + teacher response tracking), `n8n_audit_log` (decision path audit)
- **Next.js Routes**: `POST /api/n8n/webhook` (W06 completion trigger) + `GET /api/teacher/briefing-status` (dashboard widget fetch)
- **Agentic Loop Mapping**: 
  - Loop0 (Sense): W01 collects mood check-ins + historical trends
  - Loop2 (Reason/Plan): W06 evaluates k-anonymity, calendar, LLM generates recommendations
  - Loop3 (Act): W06 sends LINE, creates recommendation record, dashboard update via webhook
  - Loop4 (Self-Evaluate/Learn): Teacher approves/implements via dashboard CTA
  - Loop5 (Adapt): Feedback stored in `recommendations.teacher_feedback`, triggers Loop0 next cycle

---

## Technical Context

**Language/Version**: TypeScript (Node.js 20+, Next.js 16 App Router)  
**Primary Dependencies**: n8n v2.8.3, Supabase (PostgreSQL + RLS), Gemini API (LLM), LINE Notify SDK, Tailwind CSS 4  
**Storage**: PostgreSQL (Supabase) with Row-Level Security (k-anonymity enforcement via RLS)  
**Testing**: Vitest (unit), Playwright (e2e), n8n workflow validation + manual LINE testing  
**Target Platform**: Self-hosted n8n + Supabase cloud + Next.js 16 (App Router)  
**Project Type**: Web service (agentic backend) + Next.js dashboard  
**Performance Goals**: Briefing delivery within 5 min of 7:30 AM trigger, <2s dashboard refresh, LLM latency <3 sec  
**Constraints**: <2 LINE notifications/day/teacher, ≤5/week; k-anonymity k≥3; no raw student names in briefing  
**Scale/Scope**: 1 school pilot → N schools (federated by school_id in RLS); supports 100+ teachers, 5k+ students

---

## Constitution Check

_GATE: Must pass before implementation. Feature involves agentic L2 autonomy + teacher notifications + student data._

**Climate Agent v2.0.0 Principles Validation**:

- [x] **Principle I (Autonomous Agency)**: 
  - **Tool Isolation**: W06 calls `get_class_climate_summary()` RPC (k-anonymity enforced server-side) + `get_past_recommendations()` RPC. LLM never sees raw `student_pulses` rows.
  - **Audit Logging**: All W06 decisions logged to `n8n_audit_log` table: [timestamp, workflow_id='W06', policy_applied (Routine/Warning/Critical), decision_path_json, confidence_score, tools_invoked=['get_class_climate_summary', 'gemini_lm'], action_taken='NOTIFY_TEACHER_LINE', approved_by_teacher_at].
  - **Deterministic Reasoning**: Agent decision path: (1) k-anonymity check [count(student_pulses) for class_id in past 24h], (2) calendar check [is_school_day(date)], (3) teacher availability check [availability_status != 'on_leave'], (4) frequency guard [count(notifications this week for teacher_id) < 5], (5) LLM invocation. No randomness.
  - ✅ **Status**: PASS

- [x] **Principle II (Privacy-by-Design)**:
  - **RLS Enforcement**: All queries use Supabase RLS policies. Teacher can only see aggregates for their own classes, k-anonymity enforced (returns NULL if n<3).
  - **No Raw Data**: Briefing contains ZERO student names, IDs, or individual moods. Only aggregates: [mean_mood, std_dev, trend_vs_baseline, loop_closure_%].
  - **Retention**: Raw `student_pulses` text redacted after 60 days via `redact_old_pulses()` trigger. Audit logs retained 2 years.
  - ✅ **Status**: PASS

- [x] **Principle III (Self-Evaluation & Loop Closure)**:
  - **Loop Closure Dashboard**: W06 includes briefing metric: "Last week: {rec_count} suggestions → {approved_count} Viewed → {implemented_count} Implemented = {closure%}".
  - **Effectiveness Gates**: If teacher action rate <30% for 2 consecutive weeks, W06 triggers "Inquiry Mode" (next briefing asks "What format would be more helpful?" instead of sending recommendation). Prevents spam.
  - **Continuous Logs**: All teacher response timestamps logged to `recommendations.(teacher_approval_status, teacher_approval_at, teacher_implemented_at, teacher_feedback)`.
  - ✅ **Status**: PASS

- [x] **Principle IV (Human-in-the-Loop)**:
  - **No Auto-Send**: W06 generates briefing, sends LINE template with CTA buttons "Approve & Try → Dismiss → More Context". Teacher MUST click "Approve" (or dashboard equivalent) before recommendation is marked actionable.
  - **Teacher Sanity**: Each briefing contains max 1-2 recommendations, max 150 chars each. Frequency: M-F only, 1 per day, respects 5/week limit.
  - ✅ **Status**: PASS

- [x] **Principle V (Minimum Friction)**:
  - **Not applicable to W06** (teacher-facing, not student-facing). Loop closure UI on dashboard (teacher side) is simple: two buttons [✓ Done] [Not Now].
  - ✅ **Status**: PASS (N/A)

- [x] **Principle VI (Daily Habits & Closing the Loop)**:
  - **Repeatable Schedule**: M-F 7:30 AM (cron trigger in n8n).
  - **Visible Loop Closure**: Dashboard shows recommendation history + closure %: "3 suggestions last week → 2 approved → 1 implemented". Student view (post-implementation) shows: "Your feedback (X students concerned about workload) prompted us to add a 5-min break." [visible feedback loop]
  - ✅ **Status**: PASS

- [x] **Principle VII (Scalability)**:
  - **Multi-Tenant Design**: All queries filtered by `school_id` (via JWT auth). W06 workflow is reusable per school via dynamic `class_id` parameter. RLS ensures data isolation.
  - ✅ **Status**: PASS

- [x] **Principle VIII (Anti-Patterns)**:
  - ✅ NO surveillance framing (briefing frames as "partnership," not "monitoring")
  - ✅ NO ranking/leaderboards (no "best class")
  - ✅ NO predictive policing (no "at-risk student" flags; only aggregate climate state)
  - ✅ NO spam (max 1 briefing/day, max 5/week)
  - ✅ NO forced participation (teacher can dismiss/deprioritize anytime)
  - ✅ **Status**: PASS (all anti-patterns avoided)

**Gate Outcome**: ✅ **PASSED**. Feature aligns with all 8 principles. Ready for design phase.

---

## Phase 0: Research & Unknowns Resolution

**Objective**: Clarify technical dependencies and best practices before Phase 1 design.

### Research Tasks (Completed)

1. **n8n Schedule Trigger + LangChain Agent Pattern**  
   - **Decision**: Use n8n Schedule Trigger (TypeScript decorator: `@scheduleTrigger({...})`) for M-F 7:30 AM. Chain to `@langChain_agent()` with `@langChain_toolWorkflow()` sub-nodes for RPC calls.
   - **Rationale**: Native n8n scheduling + LangChain agent pattern ensures deterministic reasoning + tool isolation + audit logging.
   - **Alternative Rejected**: Cron webhook (less reliable); direct HTTP (no tool isolation).

2. **Supabase RLS + k-anonymity at Database Layer**
   - **Decision**: Implement k-anonymity enforcement via `SECURITY DEFINER` RPC: `get_class_climate_summary(class_id, period='24h')` returns `{mean_mood, std_dev, trend, closure%}` only if `count(distinct student_id) >= 3`, else `NULL`.
   - **Rationale**: K-anonymity enforced server-side (Postgres, not application code). RLS prevents teacher from querying individual rows.
   - **Alternative Rejected**: Application-level filtering (race condition risk); no k-anonymity check (privacy violation).

3. **LINE Notify vs. LINE Messaging API**
   - **Decision**: Use LINE Notify (simpler, OAuth2 setup already in schema). If future L3 requires bidirectional dialogue, migrate to LINE Messaging API.
   - **Rationale**: LINE Notify sufficient for one-way briefing + CTAs (buttons). Easier OAuth2. Messaging API requires webhook server.
   - **Alternative Rejected**: Email-only (slower, lower engagement); WhatsApp (not local channel in target market).

4. **LLM Confidence Scoring & Fallback**
   - **Decision**: Gemini API returns confidence_score via `lm_output.confidence` (or inferred via token-level beam scores). If confidence <0.7, fallback to rule-based suggestions: ["Consider a 5-min mood check," "Try collaborative problem-solving activity"].
   - **Rationale**: Deterministic fallback ensures briefing always sent; low-confidence LLM output is deprioritized.
   - **Alternative Rejected**: Abort if LLM fails (breaks loop closure); always use LLM (hallucination risk).

5. **Notification Frequency Guard (Max 2/day, Max 5/week)**
   - **Decision**: W06 checks `select count(*) from n8n_notification_log where teacher_id=X and created_at > now() - interval '1 day'`. If count>=2, returns error → W06 skips. Weekly check: same query with interval '1 week'.
   - **Rationale**: Protects teacher sanity. Anomaly alerts (W04) can pre-empt if severity=CRITICAL.
   - **Alternative Rejected**: No guard (spam); manual teacher override only (causes missed alerts).

6. **Teacher Approval CTA Pattern (LINE Template vs. Dashboard Link)**
   - **Decision**: W06 sends LINE notification with quick reply buttons: [✓ Approve & Try] [Dismiss] [More Context →]. Buttons route to `/api/teacher/recommendation/{id}/action` (backend stores approval). Dashboard widget shows recommendation card for full context.
   - **Rationale**: Fast CTA in LINE (reduce friction); detailed context available on dashboard. Dual path = high adoption.
   - **Alternative Rejected**: Approval only via dashboard (high friction); all CTAs in LINE (limited space/context).

7. **Dashboard Briefing Widget Refresh (Real-Time vs. Polling)**
   - **Decision**: W06 sends POST to `/api/n8n/webhook` on completion → triggers `revalidatePath('/teacher/dashboard')` (Next.js ISR). Dashboard fetches from `/api/teacher/briefing-status`. Polling interval: 1 min (acceptable), or teacher clicks "Refresh" button.
   - **Rationale**: ISR cache revalidation + manual refresh = responsive without high server cost.
   - **Alternative Rejected**: WebSocket (higher complexity); server-sent events (requires persistent connection).

---

## Phase 1: Design & Data Model

### 1. Data Model

#### New Tables & Modifications

**`recommendations` Table** (stores all LLM-generated recommendations + teacher response tracking)
```sql
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT DEFAULT 'W06-agentic-briefing',
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id),
  
  -- Recommendation Content
  content TEXT NOT NULL,  -- e.g., "Consider a 5-min mood check"
  content_type TEXT DEFAULT 'teaching_suggestion',  -- enum: teaching_suggestion, observation_focus, climate_alert
  confidence_score FLOAT8 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  lm_model TEXT,  -- e.g., "gemini-1.5-pro-002"
  llm_tokens_input INT,
  llm_tokens_output INT,
  llm_latency_ms INT,
  
  -- Policy Classification
  policy TEXT DEFAULT 'ROUTINE',  -- enum: ROUTINE, WARNING, CRITICAL
  trigger_reason TEXT,  -- e.g., "mood_drop_15_percent", "low_participation"
  
  -- Context Snapshot
  climate_snapshot JSONB,  -- {mean_mood, std_dev, trend, n_students, k_anonymity_safe}
  teacher_response_pattern JSONB,  -- {approval_rate_7d: 0.6, implementation_rate_7d: 0.4}
  
  -- Teacher Response Tracking (Loop4/Loop5)
  created_at TIMESTAMP DEFAULT NOW(),
  sent_via TEXT DEFAULT 'LINE',  -- enum: LINE, EMAIL, DASHBOARD, SLACK
  teacher_notification_sent_at TIMESTAMP,
  
  teacher_approval_status TEXT,  -- enum: PENDING, ACKNOWLEDGED, DISMISSED, NOT_ACTIONED
  teacher_approval_at TIMESTAMP,
  teacher_approval_note TEXT,
  
  teacher_implemented_at TIMESTAMP,
  teacher_feedback TEXT,  -- "We tried it for 10 mins, students seemed calmer"
  feedback_sentiment TEXT,  -- POSITIVE, NEUTRAL, NEGATIVE (for L3 tuning)
  
  -- Loop Closure Metrics
  loop_closure_timestamp TIMESTAMP,  -- when teacher marks IMPLEMENTED
  closure_latency_hours FLOAT8,  -- hours from sent_at to implemented_at
  
  -- Metadata
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,  -- recommendations expire after 30 days (archive)
  
  CONSTRAINT valid_dates CHECK (teacher_notification_sent_at IS NULL OR teacher_notification_sent_at >= created_at),
  CONSTRAINT valid_approval CHECK (teacher_approval_status IN ('PENDING', 'ACKNOWLEDGED', 'DISMISSED', 'NOT_ACTIONED')),
  CONSTRAINT valid_policy CHECK (policy IN ('ROUTINE', 'WARNING', 'CRITICAL'))
);

-- RLS: teacher sees only their own class recommendations
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY recommendations_teacher_view ON recommendations
  FOR SELECT USING (
    teacher_id = auth.uid() OR
    -- admin can see all
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY recommendations_teacher_approve ON recommendations
  FOR UPDATE USING (
    teacher_id = auth.uid() AND
    teacher_approval_status IS NULL  -- can only approve once
  );

-- Indexes for query performance
CREATE INDEX idx_recommendations_class_created ON recommendations(class_id, created_at DESC);
CREATE INDEX idx_recommendations_teacher_status ON recommendations(teacher_id, teacher_approval_status);
CREATE INDEX idx_recommendations_closure ON recommendations(teacher_implemented_at) WHERE teacher_implemented_at IS NOT NULL;
```

**`n8n_audit_log` Table** (decision path audit for all agentic workflows including W06)
```sql
CREATE TABLE n8n_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP DEFAULT NOW(),
  
  -- Workflow Context
  workflow_id TEXT NOT NULL,  -- e.g., 'W06-briefing', 'W01-agentic-ai-recommendation'
  workflow_name TEXT,
  execution_id TEXT,
  school_id UUID REFERENCES schools(id),
  class_id UUID,
  teacher_id UUID,
  
  -- Decision Path (deterministic reasoning)
  decision_path_json JSONB NOT NULL,  -- {checks: [{name: 'k_anonymity_check', passed: true, data: {...}}, ...]}
  policy_applied TEXT,  -- ROUTINE | WARNING | CRITICAL
  confidence_score FLOAT8,
  gates_passed JSONB,  -- {k_anonymity: true, school_day: true, teacher_available: true, frequency_ok: false}
  
  -- Tool Invocations
  tools_invoked TEXT[],  -- ARRAY of tool names: ['get_class_climate_summary', 'gemini_lm', 'line_notify']
  tool_outputs JSONB,  -- {get_class_climate_summary: {...}, gemini_lm: {...}}
  
  -- Action & Outcome
  action_taken TEXT NOT NULL,  -- e.g., 'SEND_LINE_NOTIFICATION'
  action_skipped BOOLEAN DEFAULT FALSE,  -- reason: frequency_exceeded, no_data, etc.
  skip_reason TEXT,
  
  -- Teacher Response (post-action, if applicable)
  notification_sent_at TIMESTAMP,
  recommendation_id UUID REFERENCES recommendations(id),
  teacher_response_received_at TIMESTAMP,
  teacher_response_type TEXT,  -- APPROVED, DISMISSED, IMPLEMENTED
  
  -- Metadata
  error_message TEXT,
  error_stack TEXT,
  n8n_log_url TEXT,  -- link to n8n execution log
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_action CHECK (action_taken IN ('SEND_LINE_NOTIFICATION', 'SEND_EMAIL', 'SKIP', 'RETRY'))
);

ALTER TABLE n8n_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_teacher_view ON n8n_audit_log
  FOR SELECT USING (
    teacher_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX idx_audit_workflow ON n8n_audit_log(workflow_id, timestamp DESC);
CREATE INDEX idx_audit_teacher ON n8n_audit_log(teacher_id, timestamp DESC);
```

**`teacher_profiles` Table** (extend existing with notification preferences + response metrics)
```sql
-- Migrations to add columns (if not already present)
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS
  notification_frequency_pref TEXT DEFAULT 'ROUTINE',  -- ROUTINE | CRITICAL_ONLY | NONE
  
  notification_channel_pref TEXT DEFAULT 'LINE',  -- LINE | EMAIL | DASHBOARD | SLACK
  
  last_briefing_sent_at TIMESTAMP,
  
  briefing_count_7d INT DEFAULT 0,
  briefing_approval_count_7d INT DEFAULT 0,
  
  approval_rate_historical FLOAT8,  -- 0.0-1.0: average approval rate over N weeks
  implementation_rate_historical FLOAT8,  -- 0.0-1.0: average implementation rate
  action_latency_avg_hours FLOAT8,  -- average hours from notification to action
  
  closure_rate_trend_7d FLOAT8,  -- recent trend: >0.6 = improving, <0.3 = declining
  
  -- Inquiry Mode Flag (when action rate <20% for 2 weeks)
  is_inquiry_mode BOOLEAN DEFAULT FALSE,
  inquiry_mode_triggered_at TIMESTAMP,
  
  dismissal_pattern_consecutive INT DEFAULT 0,  -- count of consecutive dismissals
  dismissal_pattern_reason TEXT;  -- if >2 consecutive, ask "What would help?"
```

**`school_days` Table** (calendar management for briefing trigger guard)
```sql
CREATE TABLE school_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_school_day BOOLEAN DEFAULT TRUE,  -- FALSE = holiday, weekend, break
  reason TEXT,  -- "New Year Holiday", "Teacher Professional Day", "Weekend"
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(school_id, date)
);

CREATE INDEX idx_school_days_lookup ON school_days(school_id, date);
```

#### Existing Tables (Unmodified)
- `student_pulses` (already exists, unchanged; RLS protects raw data)
- `classes` (already exists)
- `users` (already exists)
- `school_id` (already exists)

---

### 2. N8N Workflow Design: W06 Morning AI Briefing

**Trigger**: Schedule (M-F, 7:30 AM UTC / 15:30 +07:00 BKK)

**Workflow Structure** (5 Main Nodes + 3 Sub-Workflow Tools):

```
[ScheduleTrigger: 7:30 AM M-F]
  ↓
[CheckSchoolDay] (IF node: is_school_day=true?) → YES ↓ | NO → [Skip]
  ↓
[LoopOverClasses] (foreach class_id in school)
  ↓
[GetClassClimateSummary] (tool: RPC call)  ← SUB-WORKFLOW: tool-get-class-climate-summary
  ↓
[AgentDecisionGate] (IF: k-anonymity check: n≥3?)  → YES ↓ | NO → [Skip Class]
  ↓
[AgentEvaluateFrequency] (check: notifications_this_week < 5?)  → YES ↓ | NO → [Skip Class]
  ↓
[LangChainAgent] (Gemini LM with tool capabilities)
  │
  ├─→ [tool-get-past-recommendations] (RPC: trends, closure %)
  │
  ├─→ [tool-generate-recommendations] (LLM: generate 1-2 suggestions)
  │
  └─→ [tool-get-teacher-action-rate] (RPC: closure metrics)
  ↓
[PrepareLineNotification] (template: mood summary + trend + rec + closure %)
  ↓
[SendLineNotify] (HTTP: POST to LINE Notify API)
  ↓
[CreateRecommendationRecord] (Supabase INSERT into recommendations table)
  ↓
[LogAudit] (Supabase INSERT into n8n_audit_log)
  ↓
[UpdateDashboard] (POST /api/n8n/webhook → revalidatePath)
  ↓
[End]
```

**Detailed Node Specifications**:

| Node | Type | Purpose | Key Parameters |
|------|------|---------|-----------------|
| **ScheduleTrigger** | Schedule | Fire M-F 07:30 UTC | Cron: `0 7 * * 1-5` |
| **CheckSchoolDay** | IF (condition) | Guard: is_school_day? | Condition: `$json.is_school_day = true` |
| **LoopOverClasses** | Split in Batches | Iterate over active classes | Fetch from DB: `SELECT id FROM classes WHERE school_id=X AND active=true` |
| **GetClassClimateSummary** | Execute Workflow (tool) | Calls `get_class_climate_summary(class_id, '24h')` RPC | Sub-workflow: tool-get-class-climate-summary |
| **AgentDecisionGate** | IF (k-anonymity check) | Is n≥3? | Condition: `$json.n_students >= 3` |
| **FrequencyGuard** | IF (rate limit) | <5 notifications this week? | Query: `COUNT(*) FROM n8n_notification_log WHERE teacher_id=X AND created_at > NOW()-7days < 5` |
| **LangChainAgent** | LangChain Agent | Core: Reason + Plan | Model: Gemini 2.0; Tools: [tool-get-past-recommendations, tool-get-teacher-action-rate, tool-generate-recommendations] |
| **PrepareLineNotify** | Function (Function node) | Format briefing message | Template: "☀️ Good Morning, {teacher_name}!\n\n📊 Mood Today: {mean}±{std}\n📈 vs Last Week: {trend}\n💡 Suggestion: {rec1}\n✅ Action Rate: {closure%}" |
| **SendLineNotify** | HTTP Request | POST to LINE Notify | URL: `https://notify-api.line.me/api/notify`; Auth: Bearer {line_notify_token}; Headers: Content-Type: application/x-www-form-urlencoded |
| **CreateRecommendationRecord** | Postgres | Upsert into recommendations table | SQL: `INSERT INTO recommendations (class_id, teacher_id, content, policy, confidence, climate_snapshot, created_at) VALUES (...)` |
| **LogAudit** | Postgres | Insert decision path audit | SQL: `INSERT INTO n8n_audit_log (workflow_id, decision_path_json, policy_applied, tools_invoked, action_taken) VALUES (...)` |
| **UpdateDashboard** | HTTP Request (Next.js) | Trigger ISR revalidation | URL: `{NEXTJS_URL}/api/n8n/webhook`; Method: POST; Body: `{workflow: 'W06', action: 'briefing_sent', teacher_id, class_id}` |

**Sub-Workflows (Tool Isolation)**:

1. **tool-get-class-climate-summary**
   - RPC call: `get_class_climate_summary(class_id VARCHAR, period VARCHAR)`
   - Returns: `{mean_mood FLOAT8, std_dev FLOAT8, n_students INT, mood_trend JSON, baseline FLOAT8, k_anonymity_safe BOOLEAN}`
   - Error handling: If k_anonymity_safe=false, return NULL values
   - Audit logging: Tool invocation + output logged

2. **tool-get-past-recommendations**
   - Query: `SELECT * FROM recommendations WHERE class_id=X AND created_at > NOW()-7days ORDER BY created_at DESC LIMIT 10`
   - Calculate: approval_rate, implementation_rate, closure_latency_avg
   - Returns: `{recommendations ARRAY, closure_rate_7d FLOAT8, approval_rate_7d FLOAT8, implementation_rate_7d FLOAT8}`
   - Audit: Tool output logged

3. **tool-get-teacher-action-rate**
   - Query: `SELECT approval_rate_historical, implementation_rate_historical, dismissal_pattern_consecutive FROM teacher_profiles WHERE teacher_id=X`
   - If dismissal_pattern_consecutive ≥ 3: set is_inquiry_mode=true
   - Returns: `{approval_rate FLOAT8, implementation_rate FLOAT8, is_inquiry_mode BOOLEAN, last_feedback TEXT}`
   - Audit: Tool output logged

**LLM Agent Configuration** (Gemini 2.0):
```json
{
  "model": "gemini-2.0-flash",
  "temperature": 0.8,
  "top_k": 3,
  "top_p": 0.95,
  "system_prompt": "You are a supportive classroom climate advisor. Analyze mood data and suggest ONE teaching intervention (max 150 chars) that addresses the climate trend. Use 'Partner Advisor' tone (we, let's, together). Never mention student names or individual moods. Focus on class-wide strategies.",
  "tools": [
    {
      "name": "get_past_recommendations",
      "description": "Fetch past recommendations and teacher response patterns for context"
    },
    {
      "name": "get_teacher_action_rate",
      "description": "Check teacher's historical response patterns and inquiry mode status"
    }
  ]
}
```

**Error Handling**:
- **k-anonymity violation** (n<3): Skip briefing, log "insufficient_data"
- **LLM failure** (timeout/API error): Use fallback recommendation: ["Consider a 5-min mood check", "Try collaborative problem-solving activity"], confidence=0.5, log error to audit trail
- **LINE Notify failure** (network/auth): Retry up to 3x with exponential backoff; if all fail, escalate to email + log severity=HIGH to audit
- **Frequency guard exceeded**: Skip briefing, log "frequency_limit_exceeded"

---

### 3. Next.js API Routes & Handlers

#### `POST /api/n8n/webhook` (Briefing Completion Trigger)
**Purpose**: Receive W06 completion event, revalidate dashboard cache
**Request Body**:
```json
{
  "workflow": "W06",
  "action": "briefing_sent",
  "teacher_id": "uuid",
  "class_id": "uuid",
  "recommendation_id": "uuid",
  "content": "Consider a 5-min mood check...",
  "sent_at": "2026-03-17T07:30:00Z",
  "line_message_id": "uuid"
}
```
**Response**: `{status: 'ok', revalidated: true}`
**Handler Logic**:
```typescript
export async function POST(req: Request) {
  const supabase = createServerClient();
  const body = await req.json();
  
  if (body.workflow !== 'W06') return NextResponse.json({status: 'ok'});
  
  // 1. Verify webhook auth (n8n signature)
  const signature = req.headers.get('X-n8n-signature');
  if (!verifyN8nSignature(signature, req.body)) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }
  
  // 2. Store line_message_id in recommendations for callback tracking
  await supabase
    .from('recommendations')
    .update({line_message_id: body.line_message_id})
    .eq('id', body.recommendation_id);
  
  // 3. Revalidate ISR paths
  revalidatePath(`/teacher/dashboard`);
  revalidatePath(`/teacher/briefing-status`);
  
  // 4. Emit event (for real-time updates if WebSocket is implemented)
  // publishEvent({channel: `teacher-${body.teacher_id}`, type: 'briefing_sent', data: body});
  
  return NextResponse.json({status: 'ok', revalidated: true});
}
```

#### `GET /api/teacher/briefing-status` (Dashboard Widget Data)
**Purpose**: Fetch latest briefing + recommendation for dashboard display
**Query Params**: `?class_id=uuid&days=7` (default 7 days)
**Response**:
```json
{
  "latest_briefing": {
    "sent_at": "2026-03-17T07:30:00Z",
    "mean_mood": 3.5,
    "std_dev": 0.8,
    "trend": "↓ down 15%",
    "policy": "WARNING"
  },
  "recommendation": {
    "id": "uuid",
    "content": "Consider a 5-min mood check...",
    "confidence": 0.82,
    "status": "PENDING",
    "cta_buttons": [
      {"label": "✓ Approve & Try", "action": "approve"},
      {"label": "Dismiss", "action": "dismiss"},
      {"label": "More Context...", "action": "expand"}
    ]
  },
  "closure_summary": {
    "period": "7d",
    "total_recommendations": 5,
    "approved": 3,
    "implemented": 2,
    "closure_rate": 0.4,
    "message": "You're implementing 40% of climate insights. Let's focus on 1 suggestion this week."
  }
}
```
**Handler Logic**:
```typescript
export async function GET(req: Request) {
  const supabase = createServerClient();
  const teacher_id = (await supabase.auth.getUser()).user?.id;
  const {searchParams} = new URL(req.url);
  const class_id = searchParams.get('class_id');
  const days = parseInt(searchParams.get('days') || '7', 10);
  
  // 1. Fetch latest briefing from n8n_audit_log
  const {data: latestAudit} = await supabase
    .from('n8n_audit_log')
    .select('*')
    .eq('workflow_id', 'W06')
    .eq('class_id', class_id)
    .order('timestamp', {ascending: false})
    .limit(1)
    .single();
  
  // 2. Fetch latest pending recommendation
  const {data: rec} = await supabase
    .from('recommendations')
    .select('*')
    .eq('class_id', class_id)
    .eq('teacher_id', teacher_id)
    .in('teacher_approval_status', ['PENDING', 'ACKNOWLEDGED'])
    .order('created_at', {ascending: false})
    .limit(1)
    .single();
  
  // 3. Fetch closure metrics (past N days)
  const {data: recs7d} = await supabase
    .from('recommendations')
    .select('teacher_approval_status, teacher_implemented_at')
    .eq('class_id', class_id)
    .eq('teacher_id', teacher_id)
    .gte('created_at', new Date(Date.now() - days * 86400000).toISOString());
  
  const approved = recs7d?.filter(r => r.teacher_approval_status !== 'DISMISSED').length ?? 0;
  const implemented = recs7d?.filter(r => r.teacher_implemented_at).length ?? 0;
  
  return NextResponse.json({
    latest_briefing: latestAudit?.tool_outputs?.get_class_climate_summary || {},
    recommendation: rec ? {
      id: rec.id,
      content: rec.content,
      confidence: rec.confidence_score,
      status: rec.teacher_approval_status,
      cta_buttons: [...cta_buttons...]
    } : null,
    closure_summary: {
      period: `${days}d`,
      total_recommendations: recs7d?.length ?? 0,
      approved,
      implemented,
      closure_rate: recs7d?.length ? implemented / recs7d.length : 0,
      message: calculateClosureMessage(implemented / recs7d.length)
    }
  });
}
```

#### `POST /api/teacher/recommendation/:id/action` (Approval/Dismissal)
**Purpose**: Teacher approves or dismisses a recommendation
**Request Body**:
```json
{
  "action": "approve" | "dismiss" | "implement",
  "feedback": "We tried it for 10 mins, students seemed calmer" // optional
}
```
**Handler Logic**:
```typescript
export async function POST(req: Request, {params}: {params: {id: string}}) {
  const supabase = createServerClient();
  const user = await supabase.auth.getUser();
  const {action, feedback} = await req.json();
  
  // 1. Fetch recommendation, verify ownership
  const {data: rec} = await supabase
    .from('recommendations')
    .select('*')
    .eq('id', params.id)
    .eq('teacher_id', user.user?.id)
    .single();
  
  if (!rec) return NextResponse.json({error: 'Not found'}, {status: 404});
  
  // 2. Update based on action
  let update = {};
  if (action === 'approve') {
    update = {
      teacher_approval_status: 'ACKNOWLEDGED',
      teacher_approval_at: new Date().toISOString()
    };
  } else if (action === 'dismiss') {
    update = {
      teacher_approval_status: 'DISMISSED',
      teacher_approval_at: new Date().toISOString()
    };
  } else if (action === 'implement') {
    update = {
      teacher_approval_status: 'IMPLEMENTED',
      teacher_implemented_at: new Date().toISOString(),
      teacher_feedback: feedback,
      closure_latency_hours: (new Date().getTime() - new Date(rec.created_at).getTime()) / 3600000,
      feedback_sentiment: analyzeSentiment(feedback) // POSITIVE | NEUTRAL | NEGATIVE
    };
  }
  
  await supabase
    .from('recommendations')
    .update(update)
    .eq('id', params.id);
  
  // 3. Trigger Loop5 analytics (if IMPLEMENTED)
  if (action === 'implement') {
    // Update teacher_profiles: closure_rate_trend, action_latency_avg, dismissal_pattern_consecutive=0
    // Trigger W01 to re-weight recommendations for future
  }
  
  // 4. Revalidate dashboard
  revalidatePath(`/teacher/dashboard`);
  
  return NextResponse.json({status: 'ok', updated: true});
}
```

---

### 4. Observability, Logging & Guardrails

#### Audit Trail (`n8n_audit_log` table)
Every W06 execution logs:
- **Timestamp**: ISO 8601
- **Workflow ID**: 'W06'
- **Decision Path JSON**: All gates (k-anonymity, school_day, frequency) + results
- **Policy Applied**: ROUTINE | WARNING | CRITICAL
- **Confidence Score**: LLM confidence or rule-based score
- **Tools Invoked**: Array of RPC/API calls + input/output
- **Action Taken**: SEND_LINE | SKIP | RETRY
- **Recommendation ID**: Reference to inserted recommendation record
- **Error Message** (if applicable): LLM failure, LINE API error, etc.

#### Guardrails

1. **K-Anonymity Enforcement** (server-side RLS)
   - RPC `get_class_climate_summary` checks: `COUNT(DISTINCT student_id) >= 3`
   - If not met: returns NULL, W06 skips briefing

2. **Notification Frequency Guard**
   - Query: `SELECT COUNT(*) FROM n8n_notification_log WHERE teacher_id=X AND created_at > NOW()-1day`
   - If count >= 2: skip today's briefing
   - Weekly guard: `COUNT(*) ... > NOW()-7days < 5`

3. **Inquiry Mode Trigger** (adaptive)
   - If `dismissal_pattern_consecutive >= 3` OR `implementation_rate < 20% for 2 weeks`:
     - Next briefing asks: "What format would be more helpful? [feedback modal]"
     - Set `teacher_profiles.is_inquiry_mode = TRUE`

4. **LLM Hallucination Prevention**
   - Confidence threshold: Only send recommendations with confidence >= 0.65
   - If below threshold: use fallback (rule-based) suggestions
   - Log all LLM invocations + confidence to audit trail

5. **Tone/Frame Audit**
   - W06 message must contain: "we", "together", "let's" (NOT "you didn't", "failed", "alert", "warning")
   - Auto-scan generated text for audit keywords: ["warning", "danger", "alert", "failing", "critical"] → if present, log WARNING

---

### 5. Agentic Loop Mapping (Loop0 → Loop5)

| Loop | Phase | W06 Component | Decision/Acceptance |
|------|-------|--------|----------------------|
| **Loop0** (Sense) | Perception | W01 collects mood check-ins, stores in `student_pulses`, calculates 24h aggregate via RPC | Student submits mood 7:00-7:30 AM |
| **Loop1** (Context/Memory) | - | W06 fetch historical context: past 7d trends, teacher response patterns, school calendar | Fetch from DB via tool sub-workflows |
| **Loop2** (Reason/Plan) | Deliberation | W06 LangChain Agent evaluates: (1) k-anonymity ≥3? (2) school day? (3) frequency <5/week? (4) teacher available? → Generates 1-2 recommendations via Gemini | LLM generates content + confidence; policy=ROUTINE/WARNING; logged to audit_log |
| **Loop3** (Act) | Action | W06 sends LINE briefing with: [ mood summary ], [ trend vs. baseline ], [ 1-2 LLM recommendations as CTAs ], [ loop closure % from past week ], [ "Approve & Try" / "Dismiss" buttons ] | Teacher receives LINE message + dashboard widget updates |
| **Loop4** (Self-Evaluate/Learn) | Feedback Loop | Teacher clicks CTA or dashboard action: "Approve", "Dismiss", "Implement + Feedback" → logged to `recommendations.teacher_approval_status`, `teacher_approval_at`, `teacher_implemented_at`, `teacher_feedback` | Feedback stored; closure latency calculated; dismissal pattern tracked |
| **Loop5** (Adapt) | Long-Term Learning | Analytics aggregation: (1) calculate closure_rate_7d, approval_rate_7d, implementation_rate_7d per teacher/class, (2) update `teacher_profiles` with historical metrics, (3) if action_rate <20% for 2 weeks → trigger "Inquiry Mode", (4) prepare W09 (future) for policy tuning per school | teacher_profiles updated; is_inquiry_mode flag set; feedback logged for future L3 personalization |

**Non-Negotiable Determinism**:
- W06 decision path is deterministic: same input (class_id, date, time) → same decision (SEND or SKIP)
- All randomness isolated to LLM (confidence scoring + beam search), logged + fallback-protected
- No black-box decisions: every gate + tool invocation visible in `n8n_audit_log`

---

### 6. Interface Contracts

#### LINE Notify Message Format (Contract)
```
☀️ Good Morning, {teacher_name}!

📊 Classroom Climate (past 24h)
Mean Mood: {mean_mood} / 5 (±{std_dev})
Change vs. last week: {trend}

💡 I suggest: {recommendation_content} (confidence: {confidence%})

✅ Last week: {total_recs} suggestions → {approved_recs} approved → {implemented_recs} implemented
({closure_rate%} loop closure rate)

[Approve & Try Now]  [Dismiss]  [More Context...]
```

#### Dashboard Briefing Widget (Contract)
```
┌─────────────────────────────────────────────┐
│ 📊 Today's Climate Briefing  [Refresh]      │
├─────────────────────────────────────────────┤
│ Mood: 3.5 ± 0.8  ↓ down 15% vs LW          │
│                                              │
│ Suggestion: Consider a 5-min mood check     │
│ Confidence: 82%                             │
│                                              │
│ [✓ Approve & Try] [Dismiss] [More...]      │
│                                              │
│ Last week: 3 → 2 → 1 (loop closure: 33%)   │
└─────────────────────────────────────────────┘
```

#### Recommendation API Response Contract
```json
{
  "id": "uuid",
  "content": "string (max 150 chars)",
  "confidence_score": 0..1,
  "policy": "ROUTINE | WARNING | CRITICAL",
  "created_at": "ISO8601",
  "teacher_approval_status": "PENDING | ACKNOWLEDGED | DISMISSED | IMPLEMENTED",
  "closure_latency_hours": number | null,
  "teacher_feedback": "string | null",
  "climate_snapshot": {
    "mean_mood": number,
    "std_dev": number,
    "trend": "↑ | → | ↓",
    "n_students": number,
    "k_anonymity_safe": boolean
  }
}
```

---

### 7. Quickstart & Implementation Checklist

#### Database Migrations (Supabase SQL)
1. Create `recommendations` table with PK, FKs, RLS policies, indexes
2. Create `n8n_audit_log` table with audit schema, RLS, indexes
3. Extend `teacher_profiles` table with notification preferences + metrics columns
4. Create `school_days` calendar table for holiday/break suppression
5. Run migrations via Supabase dashboard or `supabase db push`

#### N8N Workflow Setup
1. Create n8n workflow named "W06-Morning-Briefing" (source: 003-morning-briefing/workflows/)
2. Pin workflow to version 2.8.3 (Docker config already set)
3. Configure Schedule Trigger: `0 7 * * 1-5` (7:30 AM M-F UTC)
4. Create 3 sub-workflows (tools): tool-get-class-climate-summary, tool-get-past-recommendations, tool-get-teacher-action-rate
5. Configure Gemini credentials (API key from GCP)
6. Configure LINE Notify credentials (OAuth2 token)
7. Test workflow with mock data: `class_id=test`, `teacher_id=test`, `school_day=true`
8. Validate audit logging: check `n8n_audit_log` table after test
9. Deploy to production: set workflow.active=true, schedule trigger enabled

#### Next.js API Routes
1. Create `/api/n8n/webhook` route handler (POST)
2. Create `/api/teacher/briefing-status` route handler (GET)
3. Create `/api/teacher/recommendation/:id/action` route handler (POST)
4. Add n8n signature verification middleware (verify X-n8n-signature header)
5. Test routes locally: `npm run dev`, send test requests from n8n

#### Dashboard UI Component (Teacher)
1. Create component: `BriefingWidget.tsx` (Server Component fetching from `/api/teacher/briefing-status`)
2. Render mood summary card (mean, trend, policy indicator)
3. Render recommendation card with CTA buttons: [✓ Approve & Try], [Dismiss], [More Ctx]
4. Render loop closure % summary with message
5. Add [Refresh] button → manual re-trigger ISR cache revalidation
6. Style per Tailwind v4 (no Tailwind CSS incompatibilities)

#### Testing Plan
1. **Unit Tests** (Vitest):
   - RPC functions: `get_class_climate_summary` with k-anonymity guard
   - Audit log formatting: decision_path_json structure
   - API handlers: webhook validation, recommendation action logic
   
2. **Integration Tests** (Playwright):
   - E2E: teacher receives briefing, clicks "Approve", marks "Implemented"
   - Verify recommendation status changes in DB + audit log updated
   - Verify dashboard widget refreshes
   
3. **N8N Workflow Tests**:
   - Dry-run workflow with test data
   - Verify sub-workflow tool outputs logged to audit trail
   - Verify LINE Notify POST succeeds (or fails gracefully with retry)
   - Verify Postgres inserts successful (recommendations + n8n_audit_log)

4. **Privacy Audit**:
   - Verify no student names/IDs in LINE message
   - Verify RLS prevents cross-teacher data leakage
   - Verify raw text redaction after 60 days (trigger: redact_old_pulses)

---

## Phase 1 Output Checklist ✅

- [x] **Summary**: Extracted; agentic loop mapping included
- [x] **Technical Context**: All sections filled (language, dependencies, storage, testing, platform, performance, constraints, scale)
- [x] **Constitution Check**: All 8 principles validated; PASSED gate
- [x] **Data Model**: 4 new/extended tables documented (recommendations, n8n_audit_log, teacher_profiles extensions, school_days)
- [x] **N8N Workflow Design**: W06 workflow structure, node specs, sub-workflows, LLM config, error handling
- [x] **API Routes**: 3 routes documented (webhook, briefing-status, recommendation-action)
- [x] **Observability**: Audit logging + guardrails (k-anonymity, frequency, inquiry mode, hallucination prevention, tone audit)
- [x] **Agentic Loop Mapping**: Loop0 (Sense) → Loop5 (Adapt) with W06 components
- [x] **Interface Contracts**: LINE message format, dashboard widget, API response schema
- [x] **Quickstart**: Database, n8n, API, UI component checklists + testing plan

---

## Next Steps (Phase 2 @ `/speckit.tasks`)

Phase 2 will generate dependency-ordered tasks:
1. Database migrations + RLS policies
2. N8N workflow nodes + tool sub-workflows
3. Next.js API routes + handlers
4. Dashboard UI component
5. Unit + integration tests
6. Privacy audit + deployment checklist

---

**Status**: ✅ **Ready for Implementation** (Phase 2 task generation)

**Generated**: 2026-03-16  
**Author**: speckit.plan (agentic planning workflow)

