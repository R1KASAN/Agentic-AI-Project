# W06 Morning AI Briefing — Technical Implementation Plan

**Feature Branch**: `003-morning-briefing`  
**Version**: 1.0  
**Risk Level**: Medium (depends on LLM quality + teacher approval gate reliability)  
**Estimated Effort**: 3-4 weeks (design + implementation + testing)

---

## Feature Summary

Daily autonomous n8n workflow (7:30 AM UTC) that:
1. Aggregates student mood + trends (RLS-guarded, k≥3)
2. Invokes Gemini LLM for personalized briefing + topic-specific recommendations
3. Stores briefing in `briefing_queue` with status "pending"
4. Posts webhook to dashboard for teacher approval
5. After teacher approval, sends LINE message + updates status to "sent"
6. Logs all decisions to `n8n_audit_log` for self-evaluation

**Constitutional Alignment**: Loop0 (Sense) → Loop2 (Reason) → Loop3 (Act/Notify) → Loop4 (Self-Evaluate via teacher response latency).

---

## Architecture & Data Flow

```
┌──────────────────────────────────────────────┐
│ Daily 07:30 UTC Trigger (n8n Schedule)      │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ For-Each Class Loop                          │
│  (fetch all active classes with enrollments) │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Node: Get Climate Summary (RPC call)         │
│ • Fetch: mood avg, std dev, trend (vs 3wk)  │
│ • K-anonymity: skip if enrolled < 3         │
│ • Check: school calendar (today is workday)  │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Node: Get Trend Comparison (RPC call)        │
│ • Trend delta: today vs. 1 week ago          │
│ • Flag: if drop >20%, mark as "attention"   │
│ • Key dates: upcoming events or assessment?  │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Node: Fetch Prior Recommendations (DB query) │
│ • Get last 3 days of active recommendations │
│ • Count: viewed, acknowledged, implemented  │
│ • Calculate: teacher closure_rate %          │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Node: LLM Agent (Gemini model)               │
│                                              │
│ Inputs:                                      │
│  • mood_avg, trend_delta, std_dev            │
│  • teacher_closure_rate, class_size          │
│  • recent_actions (prior recommendations)    │
│  • school_context (grade level, language)    │
│                                              │
│ Prompt Engineering:                          │
│  - System: "You are a classroom climate      │
│    advisor. Provide ONE high-confidence      │
│    recommendation based on mood trend."      │
│  - Few-shot: examples of good/bad briefs    │
│                                              │
│ Output:                                      │
│  • briefing_text (LINE message, <280 chars) │
│  • recommendation_title                     │
│  • recommendation_description                │
│  • tone_match (match prior teacher pattern)  │
│  • confidence_score (0.0 - 1.0)             │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Node: Validate Output                        │
│ • Check: confidence >= 0.6 (threshold)       │
│ • Check: briefing_text length < 280 chars    │
│ • Check: no raw student names in text        │
│ • Check: tone is advisory (not alerting)     │
│ • REJECT if fails any check (log reject)     │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Node: Store in briefing_queue                │
│ INSERT INTO briefing_queue (                 │
│   class_id, teacher_id,                      │
│   mood_summary, trend_text, recommendation, │
│   briefing_text, llm_confidence,             │
│   status = 'pending',                        │
│   created_at = now()                         │
│ )                                            │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Node: POST webhook to dashboard              │
│ POST /api/n8n/webhook                        │
│ Payload: {event: 'briefing.pending',         │
│           briefing_id, teacher_id, ...}      │
│ → Triggers: revalidatePath('/teacher/brief)  │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Node: Audit Log Entry                        │
│ INSERT INTO n8n_audit_log (                  │
│   workflow_name = 'W06_Briefing',            │
│   decision_type = 'briefing_generated',      │
│   class_id, teacher_id,                      │
│   payload = { mood, trend, confidence },     │
│   action_taken = 'briefing queued',          │
│   created_at                                 │
│ )                                            │
└──────────────────────────────────────────────┘
           ↓ [PAUSE: Awaiting Teacher Approval]
┌──────────────────────────────────────────────┐
│ DASHBOARD: Teacher Sees Briefing             │
│ Card layout:                                  │
│ • Mood summary: "Average 3.2/5, ↑ 0.3"      │
│ • Trend: "Up from last week ✓"              │
│ • Recommendation: card + "Approve & Send"    │
│ • Closure rate: "You implemented 60%"        │
│                                              │
│ CTAs:                                        │
│ ✅ Approve & Send (POST /api/briefings/approve)
│ ⏭️  Skip Today                               │
│ ✏️  Edit & Send                              │
└──────────────────────────────────────────────┘
           ↓ [Teacher clicks Approve & Send]
┌──────────────────────────────────────────────┐
│ Backend: POST /api/briefings/approve         │
│ • Validate: teacher owns class               │
│ • Check: briefing_queue.status = 'pending'   │
│ • Update: briefing_queue.status = 'approved' │
│ • Log: response_latency = time delta         │
│ • Trigger: n8n webhook for LINE send         │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ N8N Webhook Response Handler (async)         │
│ Trigger: Webhook (from /api/briefings/.../.. │
│                                              │
│ Node: Check Frequency Guard                  │
│   SELECT COUNT(*) FROM notification_log ...  │
│   IF count >= 2: defer to next day (queue)   │
│   ELSE: proceed to LINE send                 │
│                                              │
│ Node: Format LINE Message                    │
│   From LLM output, construct rich text       │
│   Template: "[📋 Morning Briefing]           │
│              Mood: {mood_text}               │
│              Trend: {trend_text}             │
│              Try: {recommendation}           │
│              Your response rate: {rate}%"    │
│                                              │
│ Node: LINE API Send                          │
│   POST https://api.line.biz/v2/bot/message  │
│   Auth: LINE_CHANNEL_ACCESS_TOKEN            │
│                                              │
│ Node: Update briefing_queue Status           │
│   UPDATE briefing_queue                      │
│   SET status = 'sent', sent_at = now()       │
│                                              │
│ Node: Update notification_log Guard          │
│   INSERT / UPDATE notification_log           │
│   (daily count incremented)                  │
│                                              │
│ Node: Audit Log — Final Entry                │
│   INSERT INTO n8n_audit_log (                │
│     decision_type = 'briefing_sent',         │
│     action_taken = 'line message sent',      │
│     teacher_acknowledged_at = now()          │
│   )                                          │
└──────────────────────────────────────────────┘
           ↓ [Awaiting teacher response in class]
```

---

## Database Schema

### Table 1: briefing_queue

```sql
CREATE TABLE briefing_queue (
  id BIGSERIAL PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Mood data (from RPC aggregation)
  mood_summary JSONB NOT NULL, -- {avg: 3.2, std_dev: 0.8, n_students: 24, baseline: 3.0}
  trend_text VARCHAR(255) NOT NULL, -- "Up 0.3 from last week", "Down 0.5 (attention needed)"
  key_flags JSONB, -- {trend_attention: false, low_engagement: true}
  
  -- Recommendation & briefing content
  recommendation_title VARCHAR(255),
  recommendation_description TEXT,
  briefing_text TEXT NOT NULL, -- LINE message (max 280 chars)
  llm_confidence NUMERIC(3,2), -- 0.6 - 1.0
  
  -- Status lifecycle
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'sent', 'dismissed'
  created_at TIMESTAMP DEFAULT now(),
  approved_at TIMESTAMP,
  sent_at TIMESTAMP,
  dismissed_reason VARCHAR(255),
  
  -- Response metrics (for Loop4)
  teacher_approved_at TIMESTAMP,
  first_viewed_at TIMESTAMP,
  response_latency_seconds INT, -- time from created_at to approved_at
  
  INDEX idx_class_status (class_id, status),
  INDEX idx_school_date (school_id, created_at),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'sent', 'dismissed'))
);

-- RLS: Teachers see only briefings for their classes
ALTER TABLE briefing_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY briefing_queue_teacher_read ON briefing_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_enrollments ce
      WHERE ce.class_id = briefing_queue.class_id
      AND ce.teacher_id = auth.uid()
      AND ce.role = 'teacher'
    )
  );
CREATE POLICY briefing_queue_teacher_update ON briefing_queue
  FOR UPDATE USING (teacher_id = auth.uid());
```

### Table 2: Extend notifications_log

```sql
-- Already defined in shared infrastructure. Ensure index on (class_id, notification_type, sent_date).
-- For W06, each approved briefing MUST insert a row:
-- INSERT INTO notification_log (school_id, class_id, notification_type, sent_date, count)
-- VALUES ($1, $2, 'briefing', now()::date, 1)
-- ON CONFLICT (school_id, class_id, notification_type, sent_date) DO UPDATE SET count = count + 1;
```

### View: briefing_history (for dashboard)

```sql
CREATE VIEW briefing_history AS
SELECT
  bq.id,
  bq.class_id,
  bq.teacher_id,
  bq.briefing_text,
  bq.recommendation_title,
  bq.status,
  bq.created_at,
  bq.sent_at,
  bq.teacher_approved_at,
  EXTRACT(EPOCH FROM (bq.teacher_approved_at - bq.created_at))::INT as response_latency_seconds,
  -- Correlate with recommendations if briefing triggered action
  COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= bq.created_at AND r.created_at <= bq.created_at + INTERVAL '2 hours')
    as triggered_recommendations_count
FROM briefing_queue bq
LEFT JOIN recommendations r ON r.class_id = bq.class_id
WHERE bq.status IN ('sent', 'approved')
GROUP BY bq.id, bq.class_id, bq.teacher_id, bq.briefing_text, bq.recommendation_title, 
         bq.status, bq.created_at, bq.sent_at, bq.teacher_approved_at
ORDER BY bq.created_at DESC;
```

---

## N8N Workflow: W06-Morning-Briefing

### Metadata
- **Name**: W06 Morning AI Briefing
- **Type**: Scheduled (cron)
- **Trigger Schedule**: Every day at 07:30 UTC
- **Expected Runtime**: ~3-5 min per 100 classes
- **Retry Logic**: Exponential backoff (max 3 retries, 5 min delay)

### Node-by-Node Design

#### Node 1: Schedule Trigger
```json
{
  "name": "DailyTrigger",
  "type": "n8n-nodes-base.scheduleTrigger",
  "typeVersion": 1,
  "parameters": {
    "interval": [
      {
        "triggerAtHour": 7,
        "triggerAtMinute": 30,
        "triggerAtSecond": 0
      }
    ],
    "timezone": "UTC"
  },
  "position": [50, 100]
}
```

#### Node 2: Get All Active Classes
```json
{
  "name": "GetActiveClasses",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2,
  "credentials": ["Supabase"],
  "parameters": {
    "query": "SELECT id, teacher_id, school_id, name FROM classes WHERE active = true AND school_id IN (SELECT id FROM schools WHERE disable_w06 = false)"
  },
  "position": [250, 100]
}
```

#### Node 3: Loop Over Classes (SplitInBatches)
```json
{
  "name": "LoopClasses",
  "type": "n8n-nodes-base.splitInBatches",
  "typeVersion": 3,
  "parameters": {
    "batchSize": 10
  },
  "position": [450, 100]
}
```

#### Node 4: Get Climate Summary (RPC)
```json
{
  "name": "GetClimateSummary",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2,
  "credentials": ["Supabase"],
  "parameters": {
    "query": "SELECT * FROM get_class_climate_summary($1::uuid) LIMIT 1",
    "queryParams": ["{{ $json.id }}"]
  },
  "position": [700, 100]
}
```

#### Node 5: Get Trend Comparison (RPC)
```json
{
  "name": "GetTrendComparison",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2,
  "credentials": ["Supabase"],
  "parameters": {
    "query": "SELECT * FROM get_trend_comparison($1::uuid, 7) LIMIT 1",
    "queryParams": ["{{ $json.id }}"]
  },
  "position": [950, 100]
}
```

#### Node 6: Check K-Anonymity & Calendar
```json
{
  "name": "CheckDataQuality",
  "type": "n8n-nodes-base.if",
  "typeVersion": 2,
  "parameters": {
    "conditions": {
      "options": [
        {
          "condition": "and",
          "comparisons": [
            {
              "value1": "{{ $json.mood_summary.n_students }}",
              "operation": ">=",
              "value2": 3
            },
            {
              "value1": "{{ ($now.toLocaleDateString('en-US', {weekday: 'long'})) }}",
              "operation": "notEqual",
              "value2": "Sunday"
            }
          ]
        }
      ]
    }
  },
  "position": [1200, 100],
  "outputs": ["true", "false"]
}
```
- Output `true`: Continue to briefing generation
- Output `false`: Skip (k-anonymity fail)

#### Node 7: Fetch Prior Recommendations
```json
{
  "name": "GetPriorRecommendations",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2,
  "credentials": ["Supabase"],
  "parameters": {
    "query": "SELECT id, title, closure_status FROM recommendations WHERE class_id = $1 AND created_at >= NOW() - INTERVAL '3 days' ORDER BY created_at DESC LIMIT 5",
    "queryParams": ["{{ $json.id }}"]
  },
  "position": [1450, 100]
}
```

#### Node 8: Calculate Teacher Closure Rate
```javascript
// JavaScript function node
const priors = $json.recommendations || [];
const implemented = priors.filter(r => r.closure_status === 'implemented').length;
const closureRate = priors.length > 0 ? Math.round((implemented / priors.length) * 100) : 0;

return {
  closure_rate: closureRate,
  prior_count: priors.length,
  implemented_count: implemented
};
```

#### Node 9: Format LLM Context
```json
{
  "name": "FormatLLMContext",
  "type": "n8n-nodes-base.javascript",
  "typeVersion": 1,
  "parameters": {
    "jsCode": "const context = {\n  mood: $json.mood_summary,\n  trend: $json.trend_comparison,\n  closure_rate: $json.closure_rate,\n  class_size: $json.mood_summary.n_students,\n  prior_actions: $json.recommendations,\n  school_context: {\n    school_id: $json.school_id,\n    grade_level: 'middle' // to be fetched from classes table\n  }\n};\nreturn context;"
  },
  "position": [1700, 100]
}
```

#### Node 10: LLM Agent - Gemini
```json
{
  "name": "LLMBriefingAgent",
  "type": "@n8n/n8n-nodes-langchain.agent",
  "typeVersion": 1,
  "credentials": ["Gemini API"],
  "parameters": {
    "model": "gemini-1.5-pro",
    "temperature": 0.7,
    "systemPrompt": "You are a classroom climate advisor. Analyze the provided classroom mood data and generate a brief, actionable LINE message for the teacher. Your message should:\n\n1. State the mood in friendly, positive language (e.g., 'Your class is feeling engaged' or 'Students are a bit quiet today')\n2. Highlight one key trend if present (e.g., 'Mood improved since yesterday')\n3. Suggest ONE specific, 5-10 minute intervention if mood is below baseline\n4. Match the teacher's prior action patterns (if they like hands-on activities, suggest one; if they prefer reflection, suggest quiet check-in)\n5. Keep the entire message under 280 characters for LINE\n6. Use emoji sparingly (1-2) for visual interest\n7. NEVER include raw student names, IDs, or individual scores\n8. NEVER use words like 'alert', 'warning', or 'urgent' (use 'observation', 'insight', 'note')\n\nRespond with ONLY a JSON object: {\"briefing_text\": \"...\", \"recommendation_title\": \"...\", \"recommendation_description\": \"...\", \"confidence\": 0.8, \"tone_match\": \"high_activity\"}\n",
    "tools": [],
    "input": "{{ json.stringify($json.context) }}"
  },
  "position": [1950, 100]
}
```

#### Node 11: Parse & Validate LLM Output
```javascript
// Parse LLM stringified JSON
let llmOutput = $json.message || '{}';
try {
  const parsed = JSON.parse(llmOutput);
  
  // Validation rules
  const errors = [];
  if (!parsed.briefing_text || parsed.briefing_text.length > 280) {
    errors.push('briefing_text exceeds 280 chars');
  }
  if (!parsed.confidence || parsed.confidence < 0.6) {
    errors.push('confidence below threshold');
  }
  if (parsed.briefing_text.includes('alert') || parsed.briefing_text.includes('warning')) {
    errors.push('tone is alerting (not advisory)');
  }
  
  if (errors.length > 0) {
    return {
      valid: false,
      reason: errors.join('; '),
      llm_output: parsed
    };
  }
  
  return {
    valid: true,
    briefing_text: parsed.briefing_text,
    recommendation_title: parsed.recommendation_title,
    recommendation_description: parsed.recommendation_description,
    llm_confidence: parsed.confidence,
    tone_match: parsed.tone_match
  };
} catch (e) {
  return { valid: false, reason: 'JSON parse error', error: e.message };
}
```

#### Node 12: IF Validation Passed
```json
{
  "name": "CheckValidation",
  "type": "n8n-nodes-base.if",
  "typeVersion": 2,
  "parameters": {
    "conditions": {
      "options": [
        {
          "comparisons": [
            {
              "value1": "{{ $json.valid }}",
              "operation": "equal",
              "value2": true
            }
          ]
        }
      ]
    }
  },
  "position": [2200, 100]
}
```

#### Node 13: Store in briefing_queue
```json
{
  "name": "StoreBriefing",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2,
  "credentials": ["Supabase"],
  "parameters": {
    "query": "INSERT INTO briefing_queue (school_id, class_id, teacher_id, mood_summary, trend_text, recommendation_title, recommendation_description, briefing_text, llm_confidence, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW()) RETURNING id",
    "queryParams": [
      "{{ $nodeInputData[0].school_id }}",
      "{{ $nodeInputData[0].id }}",
      "{{ $nodeInputData[0].teacher_id }}",
      "{{ json.stringify($json.mood) }}",
      "{{ $json.trend.text }}",
      "{{ $json.recommendation_title }}",
      "{{ $json.recommendation_description }}",
      "{{ $json.briefing_text }}",
      "{{ $json.llm_confidence }}"
    ]
  },
  "position": [2400, 200]
}
```

#### Node 14: POST Webhook to Dashboard
```json
{
  "name": "WebhookToDashboard",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 3,
  "parameters": {
    "url": "{{ $env.NEXTJS_PUBLIC_BASE_URL }}/api/n8n/webhook",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer {{ $env.NEXTJS_API_SECRET }}"
    },
    "body": "{\"event\": \"briefing.pending\", \"briefing_id\": \"{{ $json.id }}\", \"teacher_id\": \"{{ $nodeInputData[0].teacher_id }}\", \"class_id\": \"{{ $nodeInputData[0].id }}\"}"
  },
  "position": [2600, 200]
}
```

#### Node 15: Audit Log Entry
```json
{
  "name": "AuditLogBriefing",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2,
  "credentials": ["Supabase"],
  "parameters": {
    "query": "INSERT INTO n8n_audit_log (workflow_name, decision_type, class_id, teacher_id, payload, action_taken, created_at) VALUES ('W06_Briefing', 'briefing_generated', $1, $2, $3, 'briefing queued for approval', NOW())",
    "queryParams": [
      "{{ $nodeInputData[0].id }}",
      "{{ $nodeInputData[0].teacher_id }}",
      "{{ json.stringify({mood: $json.mood, trend: $json.trend, confidence: $json.llm_confidence}) }}"
    ]
  },
  "position": [2800, 200]
}
```

#### Node 16: Log Rejection (if validation failed)
```json
{
  "name": "AuditLogReject",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2,
  "credentials": ["Supabase"],
  "parameters": {
    "query": "INSERT INTO n8n_audit_log (workflow_name, decision_type, class_id, teacher_id, payload, action_taken) VALUES ('W06_Briefing', 'briefing_rejected', $1, $2, $3, 'validation failed')",
    "queryParams": [
      "{{ $nodeInputData[0].id }}",
      "{{ $nodeInputData[0].teacher_id }}",
      "{{ json.stringify({reason: $json.reason, llm_output: $json.llm_output}) }}"
    ]
  },
  "position": [2200, 400]
}
```

### Connections

```
DailyTrigger → GetActiveClasses
GetActiveClasses → LoopClasses
LoopClasses → GetClimateSummary
GetClimateSummary → GetTrendComparison
GetTrendComparison → CheckDataQuality
CheckDataQuality.out(0) → GetPriorRecommendations
CheckDataQuality.out(1) → [skip/log]
GetPriorRecommendations → CalculateClosureRate
CalculateClosureRate → FormatLLMContext
FormatLLMContext → LLMBriefingAgent
LLMBriefingAgent → ParseValidate
ParseValidate → CheckValidation
CheckValidation.out(0) → StoreBriefing
CheckValidation.out(1) → AuditLogReject
StoreBriefing → WebhookToDashboard
WebhookToDashboard → AuditLogBriefing
AuditLogBriefing → LoopClasses.loop
```

---

## API Endpoints

### 1. POST /api/briefings/approve

**Purpose**: Teacher approves briefing and triggers LINE send

**Route Handler**: `src/app/api/briefings/approve/route.ts`

```typescript
export async function POST(request: Request) {
  const { briefing_id, edit_text } = await request.json();
  const session = await cookies().then(c => verifySession(c)); // RSC async
  
  // 1. Validate: briefing belongs to teacher's class
  const briefing = await supabase
    .from('briefing_queue')
    .select('*, classes(id, teacher_id)')
    .eq('id', briefing_id)
    .single();
  
  if (briefing.data.classes.teacher_id !== session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  // 2. Update status + timestamp
  await supabase
    .from('briefing_queue')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      briefing_text: edit_text || briefing.data.briefing_text,
      response_latency_seconds: Math.floor(
        (new Date().getTime() - new Date(briefing.data.created_at).getTime()) / 1000
      )
    })
    .eq('id', briefing_id);
  
  // 3. Trigger n8n workflow for LINE send
  const n8nTrigger = await fetch('http://localhost:5678/webhook/...', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'briefing.approved',
      briefing_id,
      teacher_id: session.user.id
    })
  });
  
  // 4. Revalidate dashboard
  revalidatePath('/teacher/briefings');
  
  return NextResponse.json({ success: true, webhook_status: n8nTrigger.status });
}
```

**Request**:
```json
{
  "briefing_id": "uuid",
  "edit_text": "optional edited briefing text"
}
```

**Response**:
```json
{
  "success": true,
  "webhook_status": 200
}
```

### 2. POST /api/briefings/dismiss

**Purpose**: Teacher dismisses briefing without sending

**Route Handler**: `src/app/api/briefings/dismiss/route.ts`

```typescript
export async function POST(request: Request) {
  const { briefing_id, reason } = await request.json();
  const session = await cookies().then(c => verifySession(c));
  
  // 1. Validate ownership
  const briefing = await supabase
    .from('briefing_queue')
    .select('*, classes(teacher_id)')
    .eq('id', briefing_id)
    .single();
  
  if (briefing.data.classes.teacher_id !== session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  // 2. Mark dismissed with reason
  await supabase
    .from('briefing_queue')
    .update({
      status: 'dismissed',
      dismissed_reason: reason,
      response_latency_seconds: Math.floor(
        (new Date().getTime() - new Date(briefing.data.created_at).getTime()) / 1000
      )
    })
    .eq('id', briefing_id);
  
  // 3. Audit log
  await supabase
    .from('n8n_audit_log')
    .insert({
      workflow_name: 'W06_Briefing',
      decision_type: 'briefing_dismissed',
      class_id: briefing.data.class_id,
      teacher_id: session.user.id,
      payload: { reason },
      action_taken: 'teacher dismissed briefing'
    });
  
  revalidatePath('/teacher/briefings');
  
  return NextResponse.json({ success: true });
}
```

### 3. GET /api/briefings

**Purpose**: Fetch pending/sent briefing history

**Route Handler**: `src/app/api/briefings/route.ts`

```typescript
export async function GET(request: Request) {
  const session = await cookies().then(c => verifySession(c));
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending'; // 'pending', 'sent', 'dismissed'
  const days = parseInt(searchParams.get('days') || '7');
  
  const briefings = await supabase
    .from('briefing_history')
    .select('*')
    .eq('teacher_id', session.user.id)
    .eq('status', status)
    .gte('created_at', new Date(Date.now() - days * 86400000).toISOString())
    .order('created_at', { ascending: false });
  
  return NextResponse.json(briefings.data);
}
```

**Response**:
```json
[
  {
    "id": "uuid",
    "class_id": "uuid",
    "briefing_text": "Your class is feeling engaged...",
    "recommendation_title": "Start with a quick check-in",
    "mood_summary": { "avg": 3.5, "trend": "+0.2" },
    "response_latency_seconds": 120,
    "status": "sent",
    "sent_at": "2026-03-16T07:35:00Z",
    "triggered_recommendations_count": 1
  }
]
```

---

## Frontend Components

### Page: /teacher/briefings

**File**: `src/app/(dashboard)/teacher/briefings/page.tsx` (RSC)

```typescript
import { cookies } from 'next/headers';
import { BriefingsList } from '@/components/domain/teacher/BriefingsList';
import { verifySession } from '@/lib/supabase/server';

export const metadata = { title: 'Morning Briefings | Climate Agent' };

export default async function BriefingsPage() {
  const session = await verifySession(await cookies());
  
  // Fetch pending briefings
  const res = await fetch('http://localhost:3000/api/briefings?status=pending', {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: 'no-store'
  });
  const pending = await res.json();
  
  // Fetch sent (past 7 days)
  const sentRes = await fetch('http://localhost:3000/api/briefings?status=sent&days=7', {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: 'no-store'
  });
  const sent = await sentRes.json();
  
  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-6">Your Morning Briefings</h1>
      
      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Today's Briefing</h2>
          <BriefingsList briefings={pending} />
        </section>
      )}
      
      <section>
        <h2 className="text-xl font-semibold mb-4">Past Week</h2>
        <BriefingsList briefings={sent} />
      </section>
    </main>
  );
}
```

### Component: BriefingCard (use client)

**File**: `src/components/domain/teacher/BriefingCard.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

interface BriefingCardProps {
  briefing: {
    id: string;
    mood_summary: { avg: number; trend: string };
    briefing_text: string;
    recommendation_title: string;
    status: 'pending' | 'sent' | 'dismissed';
    response_latency_seconds?: number;
  };
}

export function BriefingCard({ briefing }: BriefingCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    const res = await fetch('/api/briefings/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ briefing_id: briefing.id })
    });
    if (res.ok) {
      // Refresh briefings (via revalidatePath on server)
      window.location.reload();
    }
    setIsApproving(false);
  };

  const handleDismiss = async (reason: string) => {
    await fetch('/api/briefings/dismiss', {
      method: 'POST',
      body: JSON.stringify({ briefing_id: briefing.id, reason })
    });
    window.location.reload();
  };

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm mb-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Mood: {briefing.mood_summary.avg.toFixed(1)}/5</h3>
          <p className="text-sm text-gray-600">{briefing.mood_summary.trend}</p>
        </div>
        <span className={`px-3 py-1 rounded text-sm font-medium ${
          briefing.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
        }`}>
          {briefing.status}
        </span>
      </div>

      <div className="bg-blue-50 p-4 rounded mb-4">
        <p className="font-semibold text-blue-900 mb-2">{briefing.recommendation_title}</p>
        <p className="text-blue-800">{briefing.briefing_text}</p>
      </div>

      {briefing.status === 'pending' && (
        <div className="flex gap-2">
          <Button
            onClick={handleApprove}
            disabled={isApproving}
            className="bg-green-600 hover:bg-green-700"
          >
            ✅ Approve & Send
          </Button>
          <Button
            onClick={() => setShowModal(true)}
            variant="outline"
          >
            ⏭️ Skip Today
          </Button>
        </div>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h3 className="text-lg font-semibold mb-4">Why skip this briefing?</h3>
          <textarea
            placeholder="Optional reason..."
            className="w-full border rounded p-2 mb-4"
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => handleDismiss('user_skip')}
              className="bg-red-600"
            >
              Skip
            </Button>
            <Button onClick={() => setShowModal(false)} variant="outline">
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests

**File**: `__tests__/n8n/w06-briefing.test.ts`

```typescript
describe('W06 Morning AI Briefing', () => {
  test('LLM output validation rejects confidence < 0.6', () => {
    const output = {
      briefing_text: 'Test',
      confidence: 0.5,
      recommendation_title: 'Test'
    };
    expect(validateLLMOutput(output)).toBe(false);
  });

  test('LLM output rejects alerts tone', () => {
    const output = {
      briefing_text: 'ALERT: Your class...',
      confidence: 0.8,
      recommendation_title: 'Test'
    };
    expect(validateLLMOutput(output)).toBe(false);
  });

  test('k-anonymity check skips classes with <3 students', () => {
    const climateData = { n_students: 2 };
    expect(shouldGenerateBriefing(climateData)).toBe(false);
  });
});
```

### E2E Test: Full Approval Flow

**File**: `e2e/briefing-approval-flow.spec.ts` (Playwright)

```typescript
test('Teacher receives and approves morning briefing', async ({ page }) => {
  // 1. Trigger W06 manually (test endpoint)
  await fetch('http://localhost:5678/webhook/test-w06-trigger', { method: 'POST' });
  
  // 2. Wait for briefing to appear in dashboard
  await page.goto('http://localhost:3000/teacher/briefings');
  await page.waitForSelector('[data-testid="briefing-pending"]', { timeout: 10000 });
  
  // 3. Verify briefing card content
  const briefingText = await page.textContent('[data-testid="briefing-text"]');
  expect(briefingText).toMatch(/\d+\.\d\/5/); // mood format
  
  // 4. Click approve
  await page.click('[data-testid="approve-button"]');
  
  // 5. Verify LINE message was sent (check audit log or LINE API mock)
  await page.waitForTimeout(2000);
  const auditLog = await fetch('http://localhost:3000/api/admin/audit-log?workflow=W06&limit=1');
  const logs = await auditLog.json();
  expect(logs[0].action_taken).toContain('line message sent');
});
```

### Load Test: 100 Classes Briefing Generation

**File**: `load-tests/w06-briefing.k6.js` (k6 test)

```javascript
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // ramp up
    { duration: '1m', target: 100 }, // hold
    { duration: '30s', target: 0 }    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% requests < 5 sec
    http_req_failed: ['rate<0.1']      // <10% failure
  }
};

export default function () {
  // Simulate W06 workflow execution for random class
  const classId = `class-${Math.floor(Math.random() * 100)}`;
  const res = http.post('http://localhost:5678/webhook/w06-test', {
    class_id: classId
  });
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 5s': (r) => r.timings.duration < 5000
  });
}
```

---

## Deployment & Monitoring

### N8N Deployment

1. **Export workflow** as JSON from n8n UI or use n8n-as-code:
   ```bash
   cp W06-Morning-Briefing.workflow.ts n8n/workflows/
   ```

2. **Import into n8n**:
   - UI: Dashboard → Import Workflow → paste JSON
   - Or: Use N8N_WORKFLOWS_DIR env var

3. **Set environment variables** in Docker:
   ```env
   LINE_CHANNEL_ACCESS_TOKEN=<token>
   NEXTJS_PUBLIC_BASE_URL=http://localhost:3000
   NEXTJS_API_SECRET=<api-secret>
   ```

### Monitoring Checklist

- [ ] N8N workflow execution time (target <5 min per 100 classes)
- [ ] Briefing storage latency (Postgres INSERT time)
- [ ] Webhook response time (POST to dashboard)
- [ ] Teacher approval rate (% of pending → approved within 2h)
- [ ] LINE delivery success rate (target 99%+)
- [ ] LLM token usage & cost (Gemini API)
- [ ] Audit log completeness (every decision logged)

### Alerting Rules

```
IF workflow execution time > 10 minutes THEN alert on-call
IF LINE delivery failure rate > 5% THEN alert platform team
IF teacher approval rate < 60% for >2 days THEN notify PM (may indicate UX issue)
```

---

## Success Criteria for W06

| Criterion | Target | How Measured |
|-----------|--------|--------------|
| Daily briefing delivery rate | ≥99% | n8n workflow logs |
| Teacher approval rate | ≥70% within 2 hours | briefing_queue.approved_at vs. created_at |
| Implementation rate | ≥50% approved recs marked "done" within 4h | recommendations.closure_status = 'implemented' |
| LLM confidence | Average ≥0.75 | briefing_queue.llm_confidence aggregation |
| False rejects (validation fails) | <5% of briefings | n8n_audit_log count of 'briefing_rejected' |
| Pilot adoption | ≥80% of teachers in pilot school approve ≥3 briefings | Teacher engagement dashboard |
| Line delivery latency | P95 <5 seconds | LINE API delivery receipts |

---

**Plan Status**: Ready for Implementation  
**Next Step**: Begin Week 1-2 shared infrastructure setup  
**Review Date**: 2026-03-23
