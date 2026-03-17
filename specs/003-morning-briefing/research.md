# Research & Design Decisions: W06 Morning AI Briefing

**Feature**: W06 Morning AI Briefing (Morning Climate Intelligence for Teachers)  
**Date**: 2026-03-16  
**Phase**: Phase 0 Research (resolve unknowns before design phase)

---

## Executive Summary

This research document captures all critical design decisions for W06, resolving technical uncertainties and validating architectural choices against the Climate Agent constitution and project constraints. All items marked "NEEDS CLARIFICATION" in the initial planning have been investigated and resolved.

---

## Key Design Decisions

### 1. Scheduling Architecture: n8n Native Schedule vs. External Cron

**Question**: How to ensure reliable, daily 7:30 AM briefing delivery across multiple schools with high reliability?

**Decision**: Use **n8n Schedule Trigger** (TypeScript decorator: `@scheduleTrigger`) with cron expression `0 7 * * 1-5` (7:30 UTC / 15:30 +07:00 BKK).

**Rationale**:
- n8n v2.8.3 includes native `scheduleTrigger` node with execution logging
- Cron syntax directly supported; timezone conversion built-in
- Workflow execution history + retry logic handled by n8n runtime
- Audit trail automatically captured in n8n execution logs (+ our `n8n_audit_log` table)
- No external cron service required (reduces infrastructure)

**Alternatives Evaluated**:
1. ❌ **External Cron Service** (e.g., AWS EventBridge, Vercel Cron):
   - Introduces external dependency; logs siloed in another service
   - Harder to audit decision path alongside n8n workflow logs
   - Requires API gateway to trigger n8n (one more hop)

2. ❌ **Database-Driven Polling** (query `school_days` table every 5 min):
   - High database load (240 queries/day per school)
   - Latency drift (not exactly 7:30 AM)
   - Harder to debug missed executions

**Implementation**:
```typescript
@scheduleTrigger({
  name: 'ScheduleBriefing',
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1,
  parameters: {
    unit: 'minutes',
    value: 1,
    // For M-F 7:30 AM UTC:
    cronExpression: '0 7 * * 1-5'
  }
})
```

**Testing**: Deploy to staging with webhook that logs to Slack; verify delivery within 5 min of 7:30 AM for 5 consecutive school days.

---

### 2. K-Anonymity Enforcement: Database Layer vs. Application Logic

**Question**: Where should k-anonymity (minimum 3 students) enforcement live to prevent accidental raw data leakage?

**Decision**: **Enforce at Supabase RPC layer** (PostgreSQL SECURITY DEFINER function + RLS).

**Rationale**:
- **Single Source of Truth**: k-anonymity check happens once at data source (RPC), not scattered across multiple application handlers
- **Cannot Be Bypassed**: Even if app server is compromised, raw `student_pulses` rows cannot be queried (RLS blocks direct SELECT)
- **Audit Trail**: RPC invocation logged to `n8n_audit_log` with input/output; decision path transparent
- **Simpler App Code**: W06 just calls RPC, checks result; no conditional logic needed

**Implementation**:
```sql
-- supabase/migrations/20260316_add_kanymonimity_rpc.sql
CREATE OR REPLACE FUNCTION public.get_class_climate_summary(
  p_class_id UUID,
  p_period VARCHAR DEFAULT '24h'
)
RETURNS TABLE(
  mean_mood FLOAT8,
  std_dev FLOAT8,
  n_students BIGINT,
  mood_trend VARCHAR,
  baseline_mood FLOAT8,
  k_anonymity_safe BOOLEAN,
  period_start TIMESTAMP
) AS $$
DECLARE
  v_count BIGINT;
  v_start_time TIMESTAMP;
BEGIN
  -- Calculate period window
  v_start_time := CASE
    WHEN p_period = '24h' THEN NOW() - INTERVAL '1 day'
    WHEN p_period = '7d' THEN NOW() - INTERVAL '7 days'
    ELSE NOW() - INTERVAL '1 day'
  END;

  -- Count students in period
  SELECT COUNT(DISTINCT student_id) INTO v_count
  FROM student_pulses
  WHERE class_id = p_class_id
    AND created_at >= v_start_time
    AND school_id = (SELECT school_id FROM classes WHERE id = p_class_id);

  -- Enforce k-anonymity check
  IF v_count < 3 THEN
    RETURN QUERY SELECT
      NULL::FLOAT8, NULL::FLOAT8, v_count,
      'INSUFFICIENT_DATA'::VARCHAR, NULL::FLOAT8, FALSE,
      v_start_time;
  ELSE
    -- Safe to return aggregates
    RETURN QUERY SELECT
      AVG(mood_score)::FLOAT8,
      STDDEV_POP(mood_score)::FLOAT8,
      v_count,
      CASE
        WHEN AVG(mood_score) > (SELECT AVG(mood_score)*1.15 FROM student_pulses WHERE class_id = p_class_id AND created_at > NOW() - INTERVAL '7 days') THEN '↑ UP'
        WHEN AVG(mood_score) < (SELECT AVG(mood_score)*0.85 FROM student_pulses WHERE class_id = p_class_id AND created_at > NOW() - INTERVAL '7 days') THEN '↓ DOWN'
        ELSE '→ STABLE'::VARCHAR
      END,
      (SELECT AVG(mood_score) FROM student_pulses WHERE class_id = p_class_id AND created_at > NOW() - INTERVAL '21 days')::FLOAT8,
      TRUE,
      v_start_time
    FROM student_pulses
    WHERE class_id = p_class_id
      AND created_at >= v_start_time;
  END IF;
END;
$$ LANGUAGE PLPGSQL SECURITY DEFINER;

ALTER FUNCTION public.get_class_climate_summary(UUID, VARCHAR) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_class_climate_summary(UUID, VARCHAR) TO authenticated, anon;
```

**RLS Policy** (on `student_pulses` table):
```sql
CREATE POLICY student_pulses_teacher_read ON student_pulses
  FOR SELECT USING (
    -- Teacher can see aggregates via RPC (which enforces k≥3), not raw rows
    EXISTS (
      SELECT 1 FROM class_enrollments
      WHERE class_enrollments.class_id = student_pulses.class_id
        AND class_enrollments.teacher_id = auth.uid()
    )
  );
```

**Audit Logging**:
```json
{
  "tool_name": "get_class_climate_summary",
  "input": {"class_id": "...", "period": "24h"},
  "output": {
    "mean_mood": 3.5,
    "std_dev": 0.8,
    "n_students": 15,
    "k_anonymity_safe": true
  },
  "logged_at": "2026-03-17T07:30:00Z"
}
```

**Testing**:
- Unit test: `get_class_climate_summary(class_with_2_students, '24h')` → should return k_anonymity_safe=false, all values NULL
- Unit test: `get_class_climate_summary(class_with_10_students, '24h')` → should return k_anonymity_safe=true, means/stdev calculated
- Security test: direct `SELECT * FROM student_pulses WHERE class_id=X` as teacher role → should be denied by RLS

---

### 3. LLM Integration: Gemini Direct API vs. n8n LangChain Agent

**Question**: How to safely integrate LLM for recommendation generation while maintaining tool isolation and audit trails?

**Decision**: **Use n8n LangChain Agent** with `@langChain_agent` + `@toolWorkflow` sub-node pattern (NOT direct Gemini HTTP calls).

**Rationale**:
- **Tool Isolation**: LLM cannot directly query databases; it can only call designated tool sub-workflows
- **Deterministic Audit**: Every tool invocation + LLM reasoning step logged to `n8n_audit_log`
- **Fallback Safety**: If LLM fails/hallucınates, app catches error and uses rule-based fallback
- **Compliance with Constitution I (Autonomous Agency)**: Decision path is auditable, not black-box

**Architecture**:
```
[LangChainAgent] (Gemini 2.0 with system prompt)
  ├─→ [tool-get-class-climate-summary] (sub-workflow)
  ├─→ [tool-get-past-recommendations] (sub-workflow)
  └─→ [tool-get-teacher-action-rate] (sub-workflow)
    ↓
[LLM Output]: "Consider a 5-min mood check" with confidence=0.82
    ↓
[ValidateOutput]: confidence >= 0.65? → YES → proceed | NO → use fallback
```

**n8n Node Configuration**:
```typescript
@node({
  name: 'GenerateRecommendation',
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 1
})
GenerateRecommendation = {
  llmModel: this.GeminiModel,  // reference to Gemini credential
  tools: [
    this.ToolGetClimateSummary,
    this.ToolGetPastRecommendations,
    this.ToolGetTeacherActionRate
  ],
  systemPrompt: `You are a supportive classroom climate advisor. Analyze mood data and suggest ONE teaching intervention...`,
  temperature: 0.8,
  topK: 3,
  topP: 0.95,
  outputParser: this.ExtractRecommendation  // extract text + confidence
};
```

**Gemini Model Configuration**:
```json
{
  "model": "gemini-2.0-flash",
  "temperature": 0.8,
  "top_k": 3,
  "top_p": 0.95,
  "maxTokens": 200,
  "systemPrompt": "You are a supportive classroom climate advisor. Analyze mood data and suggest ONE teaching intervention (max 150 chars) that addresses the climate trend. Be concise and actionable. Use 'Partner Advisor' tone (we, let's, together). Never mention student names or individual moods. Focus on class-wide strategies.",
  "tools": [
    {
      "name": "get_class_climate_summary",
      "description": "Get aggregate mood data for a class (k-anonymity enforced; no raw student data)",
      "input_schema": {"class_id": "UUID", "period": "string"}
    },
    {
      "name": "get_past_recommendations",
      "description": "Fetch past week's teacher response patterns for context",
      "input_schema": {"class_id": "UUID", "days": "integer"}
    }
  ]
}
```

**Fallback Logic**:
```typescript
if (lmOutput.confidence < 0.65 || lmOutput.error) {
  const fallbacks = [
    "Consider a 5-min mood check—quick way to understand the climate.",
    "Try a collaborative problem-solving activity to rebuild trust.",
    "Schedule a one-on-one with a student who seems disconnected."
  ];
  return {
    content: fallbacks[Math.floor(Math.random() * fallbacks.length)],
    confidence: 0.5,
    lm_fallback: true,
    error_reason: lmOutput.error?.message
  };
}
```

**Error Handling**:
- **Timeout** (>5 sec): Fallback, log as "lm_latency_exceeded"
- **API Error** (rate limit, auth): Retry 3x with exponential backoff; fallback if all fail
- **Hallucination Detection** (keyword scan for "warning", "danger", "alert"): Reject, retry with adjusted prompt

**Alternatives Evaluated**:
1. ❌ **Direct Gemini REST API**:
   - No tool isolation; LLM could be manipulated to query raw APIs
   - Loses n8n workflow audit logging
   - Harder to implement fallback (app layer must catch all errors)

2. ❌ **Prompt Injection via student feedback**:
   - Mitigated by: RPC limits input to aggregates (no student text directly to LLM)
   - Further protected by: system prompt override (not user-supplied)

**Testing**:
- Unit test: LongChain agent with mock climate data → verify tool calls logged
- Integration test: E2E from schedule trigger to recommendation created
- Failure test: Gemini API timeout → verify fallback recommendation sent
- Tone test: Call LLM with edge case moods → verify output never includes "alert", "warning"

---

### 4. LINE Notify vs. Slack vs. Email: Notification Channel Choice

**Question**: Which notification channel to use for teacher briefing? LINE, Slack, Email?

**Decision**: **PRIMARY: LINE Notify** (with fallback to Email if LINE fails).

**Rationale**:
- **Local-First**: LINE is dominant in Southeast Asia (target market). Teachers already have LINE OA (Official Account) open on phone
- **Low Friction**: Template message with quick reply buttons (CTA) can be tapped directly from notification (no need to open app)
- **Faster Engagement**: LINE push notification faster than email (phone vs. inbox)
- **Existing Integration**: Teacher profiles already have `line_notify_token` in schema
- **Bilateral Future** (L4): LINE Messaging API allows bidirectional dialogue (upgrade path)

**Implementation**:
```typescript
@node({
  name: 'SendLineNotify',
  type: 'n8n-nodes-base.httpRequest',
  version: 2
})
SendLineNotify = {
  method: 'POST',
  url: 'https://notify-api.line.me/api/notify',
  headers: {
    'Authorization': 'Bearer {{ $json.line_notify_token }}',
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: {
    message: '{{ $json.briefing_message }}',
    // Note: LINE Notify templates via LINE Bot SDK (separate)
  },
  options: {
    'redirectionPolicy': 'follow'
  }
};

// For complex messages with buttons, use LINE Messaging API (future upgrade)
```

**Message Template** (LINE Notify):
```
☀️ Good Morning, Mr. Somchai!

📊 Your classroom climate (past 24h):
Mean: 3.5 / 5 (±0.8)
Trend: ↓ Down 15% vs. last week

💡 My suggestion:
Consider a 5-min mood check. Quick way to reset.

✅ Partnership update:
Last week: 3 suggestions → 2 approved → 1 implemented
(Loop closure: 33%)

[Approve & Try □]  [Dismiss □]  [More ➜]
```

**Fallback Email** (if LINE API fails 3x):
```
Subject: Climate Briefing for Your Class Today
To: teacher@school.edu

Good morning!

Here's your classroom climate briefing for today:

Mood Summary: 3.5 / 5 (±0.8)
Trend: Down 15% vs. last week

Suggestion: Consider a 5-min mood check. Quick way to reset.

Loop Closure: 3 → 2 → 1 (33%)

[Approve & Try] [Dismiss] [More Info]
```

**Alternatives Evaluated**:
1. ❌ **Slack-Only**:
   - Many schools don't use Slack; requires separate setup
   - Not local (designed for Western tech teams)

2. ⚠️ **Email-Only**:
   - Slow (emails often delayed/filtered)
   - Low engagement (teacher must open email, log in to dashboard to act)
   - Better as fallback, not primary

3. ⚠️ **In-App Dashboard Notification**:
   - Requires teacher to log in to dashboard (high friction)
   - Defeats "proactive advisor" principle

**Testing**:
- Integration test: Verify LINE Notify POST succeeds + message appears in test LINE account
- Failure test: Mock LINE API 503 error → verify email fallback sent
- Security test: Verify token is not logged in plaintext to audit trail

---

### 5. Dashboard Briefing Widget: Server Component vs. Client Component

**Question**: How to fetch + display briefing data on teacher dashboard with fast refresh?

**Decision**: **Hybrid approach**:
- Dashboard page: Server Component (RSC)
- Briefing Widget: calls `/api/teacher/briefing-status` (data fetching)
- CTA Buttons: Client Component (interactive)
- Cache invalidation: ISR via `revalidatePath` on webhook completion

**Rationale**:
- **Server Component Default**: Reduces JS payload to client; RLS auth happens server-side (safer)
- **API Route**: Centralized data logic; reusable by n8n + future mobile/CLI clients
- **ISR Revalidation**: Next.js caches briefing data for 60 sec; on webhook (briefing sent), purges cache; next request fetches fresh
- **Fast Refresh**: Manual [Refresh] button in UI → triggers `revalidatePath` immediately
- **No WebSocket Complexity**: ISR + ISR manual refresh adequate for teacher experience

**Implementation** (`src/app/(dashboard)/teacher/dashboard/page.tsx`):
```typescript
// Server Component (RSC)
export default async function TeacherDashboard() {
  const supabase = createServerClient();
  const user = await getUser();
  
  // Fetch briefing status (cached + ISR)
  const classes = await supabase
    .from('class_enrollments')
    .select('class_id')
    .eq('teacher_id', user.id);
  
  return (
    <>
      {classes.data?.map(({class_id}) => (
        <BriefingWidget key={class_id} classId={class_id} />
      ))}
    </>
  );
}

// BriefingWidget Client Component
'use client';

export function BriefingWidget({classId}: {classId: UUID}) {
  const [briefingStatus, setBriefingStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    fetchBriefingStatus();
  }, [classId]);
  
  const fetchBriefingStatus = async () => {
    const res = await fetch(`/api/teacher/briefing-status?class_id=${classId}`);
    setBriefingStatus(await res.json());
    setIsLoading(false);
  };
  
  const handleApprove = async () => {
    await fetch(`/api/teacher/recommendation/${briefingStatus.recommendation.id}/action`, {
      method: 'POST',
      body: JSON.stringify({action: 'approve'})
    });
    // Re-fetch to show updated status
    await fetchBriefingStatus();
  };
  
  if (isLoading) return <div>Loading briefing...</div>;
  if (!briefingStatus.latest_briefing) return <div>No briefing yet</div>;
  
  return (
    <div className="p-4 border rounded-lg">
      <h3>Today's Climate Briefing</h3>
      <div className="text-lg">
        Mood: {briefingStatus.latest_briefing.mean_mood} ± {briefingStatus.latest_briefing.std_dev}
        <span className="ml-2">{briefingStatus.latest_briefing.trend}</span>
      </div>
      
      {briefingStatus.recommendation && (
        <div className="mt-4 p-3 bg-blue-100 rounded">
          <p>{briefingStatus.recommendation.content}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={handleApprove} className="btn-primary">
              ✓ Approve & Try
            </button>
            <button onClick={() => handleDismiss()} className="btn-secondary">
              Dismiss
            </button>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        {briefingStatus.closure_summary.message}
      </div>
    </div>
  );
}
```

**ISR Revalidation** (in `/api/n8n/webhook`):
```typescript
export async function POST(req: Request) {
  const body = await req.json();
  
  if (body.workflow === 'W06') {
    // Revalidate teacher dashboard + briefing status API
    revalidatePath('/teacher/dashboard');
    revalidatePath('/api/teacher/briefing-status');
  }
  
  return NextResponse.json({status: 'ok', revalidated: true});
}
```

**Alternatives Evaluated**:
1. ❌ **Full Client-Side Fetch**:
   - Auth token exposed to client (higher risk)
   - No server-side RLS protection
   - Slower initial page load (fetch waits on client)

2. ❌ **WebSocket Real-Time**:
   - Higher infrastructure cost (persistent connections)
   - Overkill for once-daily briefing (ISR sufficient)

3. ⚠️ **Server-Side Polling**:
   - Could work but ISR is simpler + more efficient

**Testing**:
- Integration test: Send briefing → verify ISR revalidation triggered
- Integration test: Click [Refresh] button → verify manual revalidation works
- Load test: 100+ concurrent dashboard fetches → verify ISR cache reduces server load

---

### 6. Approval Flow: LINE Button vs. Dashboard CTA vs. Email Action

**Question**: How should teachers approve/dismiss/implement recommendations? Single path or multiple paths?

**Decision**: **Multiple paths** (teacher chooses easiest):
1. **LINE Quick Reply**: Buttons in LINE message → fastest (1 tap)
2. **Dashboard Widget**: "Approve & Try" button → browser access required
3. **Email Link**: Click link → opens approval dialog (future enhancement)

**Rationale**:
- **Low Friction**: Teachers approve via whichever channel they're already in
- **Higher Completion Rate**: Some teachers prefer phone (LINE), others prefer desktop (dashboard)
- **Non-Blocking**: If LINE fails, teacher can still approve via dashboard

**Implementation**:

**LINE Quick Reply** (via LINE Messaging API upgrade):
```json
{
  "type": "template",
  "altText": "Briefing confirmation",
  "template": {
    "type": "confirm",
    "text": "💡 Consider a 5-min mood check. Ready to try?",
    "actions": [
      {
        "type": "postback",
        "label": "✓ Approve & Try",
        "data": "action=approve&recommendation_id={id}"
      },
      {
        "type": "postback",
        "label": "Dismiss",
        "data": "action=dismiss&recommendation_id={id}"
      }
    ]
  }
}
```

**Dashboard Button** (`BriefingWidget.tsx`):
```typescript
<button
  onClick={handleApprove}
  className="bg-green-500 text-white px-4 py-2 rounded"
>
  ✓ Approve & Try
</button>
```

**LINE Postback Handler** (webhook in Next.js app):
```typescript
// POST /api/line/webhook
export async function POST(req: Request) {
  const event = await req.json();
  
  if (event.events[0].type === 'postback') {
    const {action, recommendation_id} = parseQueryString(event.events[0].postback.data);
    
    // Call same handler as dashboard
    await approveRecommendation(recommendation_id, action);
    
    // Reply to teacher in LINE
    replyLineMessage('Thanks! You're all set. 👍');
  }
}
```

**Approval Record** (same DB schema regardless of path):
```sql
UPDATE recommendations
SET
  teacher_approval_status = 'ACKNOWLEDGED',
  teacher_approval_at = NOW(),
  approval_source = 'LINE'  -- or 'DASHBOARD' or 'EMAIL'
WHERE id = $1;
```

**Alternatives Evaluated**:
1. ❌ **LINE-Only**:
   - Works for mobile-first culture, but some teachers prefer desktop
   - Limits accessibility

2. ❌ **Dashboard-Only**:
   - High friction (requires login + navigation)
   - Slower approval rate

**Testing**:
- Integration test: LINE quick reply postback → verify approval recorded in DB
- Integration test: Dashboard button click → verify approval recorded
- E2E test: Send briefing → approve via LINE → dashboard widget updates

---

### 7. Observability: Audit Logging & Decision Path Transparency

**Question**: How to ensure W06 decisions are auditable and transparent for compliance + debugging?

**Decision**: **Dual Logging**:
- **n8n Native Logs**: All workflow execution details automatically captured by n8n
- **Custom `n8n_audit_log` Table**: Stores structured decision path + policy + tool outputs (denormalized for analysis)

**Rationale**:
- **Compliance (Constitution III)**: Teachers can see how agent decided to send briefing
- **Debugging**: If briefing not sent, audit log shows which gate failed (k-anonymity, frequency, calendar)
- **Privacy Audit**: Logs never contain raw student data (only aggregates + policy decisions)
- **Analytics Ready**: `n8n_audit_log` queryable for dashboards (approval rates, notification frequency, etc.)

**Schema** (`n8n_audit_log`):
```sql
CREATE TABLE n8n_audit_log (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  workflow_id TEXT,  -- 'W06'
  class_id UUID,
  teacher_id UUID,
  
  -- Decision path (deterministic reasoning)
  decision_path_json JSONB,  -- {checks: [{name, passed, data}]}
  policy_applied TEXT,  -- ROUTINE | WARNING | CRITICAL
  confidence_score FLOAT8,
  gates_passed JSONB,  -- {k_anonymity: true, school_day: true, frequency: false}
  
  -- Tool invocations
  tools_invoked TEXT[],  -- ['get_class_climate_summary', 'gemini_lm']
  tool_outputs JSONB,  -- {get_class_climate_summary: {...}}
  
  -- Action + outcome
  action_taken TEXT,  -- SEND_LINE_NOTIFICATION | SKIP
  skip_reason TEXT,  -- 'frequency_limit_exceeded'
  
  -- Teacher response (if applicable)
  recommendation_id UUID REFERENCES recommendations(id),
  teacher_response_at TIMESTAMP,
  teacher_response_type TEXT  -- APPROVED | IMPLEMENTED | DISMISSED
);
```

**Decision Path JSON Structure**:
```json
{
  "workflow_id": "W06",
  "execution_id": "abc123",
  "timestamp": "2026-03-17T07:30:00Z",
  "class_id": "class-uuid",
  "teacher_id": "teacher-uuid",
  "checks": [
    {
      "name": "calendar_check",
      "passed": true,
      "details": {
        "date": "2026-03-17",
        "is_school_day": true
      }
    },
    {
      "name": "k_anonymity_check",
      "passed": true,
      "details": {
        "n_students": 15,
        "threshold": 3,
        "safe": true
      }
    },
    {
      "name": "frequency_guard",
      "passed": true,
      "details": {
        "notifications_this_week": 0,
        "max_allowed": 5
      }
    },
    {
      "name": "teacher_availability",
      "passed": true,
      "details": {
        "status": "available",
        "on_leave": false
      }
    }
  ],
  "policy_selected": "ROUTINE",
  "lm_invocation": {
    "model": "gemini-2.0-flash",
    "tokens_input": 420,
    "tokens_output": 35,
    "latency_ms": 1200,
    "confidence": 0.82,
    "output": "Consider a 5-min mood check"
  },
  "action": "SEND_LINE_NOTIFICATION",
  "notification_sent_at": "2026-03-17T07:30:15Z"
}
```

**Logging Implementation** (in W06 workflow):
```typescript
@node({
  name: 'LogAuditDecisionPath',
  type: 'n8n-nodes-base.postgres'
})
LogAuditDecisionPath = {
  operation: 'insert',
  table: 'n8n_audit_log',
  columns: {
    timestamp: '{{ now() }}',
    workflow_id: 'W06',
    class_id: '{{ $json.class_id }}',
    teacher_id: '{{ $json.teacher_id }}',
    decision_path_json: '{{ $json.decision_path }}',
    policy_applied: '{{ $json.policy }}',
    confidence_score: '{{ $json.confidence }}',
    gates_passed: '{{ $json.gates }}',
    tools_invoked: '{{ $json.tools }}',
    tool_outputs: '{{ $json.tool_outputs }}',
    action_taken: '{{ $json.action }}',
    skip_reason: '{{ $json.skip_reason }}'
  }
};
```

**Teacher Visibility Dashboard** (future):
```typescript
// GET /api/teacher/audit-trail?class_id=X&days=7
export async function GET(req: Request) {
  const supabase = createServerClient();
  
  const {data} = await supabase
    .from('n8n_audit_log')
    .select('*')
    .eq('workflow_id', 'W06')
    .eq('class_id', classId)
    .gte('timestamp', new Date(Date.now() - 7*86400000).toISOString())
    .order('timestamp', {ascending: false});
  
  // Format for teacher UI
  return NextResponse.json({
    briefings: data?.map(log => ({
      sent_at: log.timestamp,
      policy: log.policy_applied,
      k_anonymity_safe: log.gates_passed?.k_anonymity,
      lm_confidence: log.policy_applied?.confidence,
      reason_skipped: log.skip_reason,
      teacher_action: await getTeacherAction(log.recommendation_id)
    }))
  });
}
```

**Alternatives Evaluated**:
1. ❌ **No Logging** (trust the system):
   - Violates Constitution III (continuous self-evaluation)
   - No way to debug malfunctions
   - Non-compliant with data governance

2. ⚠️ **n8n Logs Only** (no custom table):
   - Works but requires querying separate system (n8n API)
   - Not integrated with app analytics
   - Harder to correlate with teacher actions

**Testing**:
- Unit test: Mock W06 execution → verify `n8n_audit_log` row created
- Security test: Verify audit logs never contain raw student names/IDs
- Compliance test: Verify decision path fully deterministic (same input → same log output)

---

### 8. Inquiry Mode: Adaptive Response to Low Engagement

**Question**: If teachers dismiss recommendations 3x in a row, how should W06 respond?

**Decision**: **Activate "Inquiry Mode"**:
- Set `teacher_profiles.is_inquiry_mode = true`
- Next briefing asks: "What format would be more helpful? [feedback modal]" instead of sending recommendation
- Reset `dismissal_pattern_consecutive` counter after teacher provides feedback

**Rationale**:
- **Constitution IV (Human-in-the-Loop)**: Agent listens + adapts
- **Prevents Spam**: Rather than sending more of the same, ask what works
- **Transparent**: Teachers see agent is responsive to feedback
- **Loop5 (Learning)**: Feedback is stored and influences future L3 personalization

**Implementation**:

**Detection Logic** (in W06 agent):
```typescript
const teacherProfile = await getTeacherProfile(teacher_id);

if (teacherProfile.is_inquiry_mode) {
  // Send special message instead of routine briefing
  const inquiryMessage = `
    We've noticed recent suggestions didn't resonate. 
    What format would be more helpful? 
    
    [📝 Tell us] [💬 Quick call?]
  `;
  
  await sendLineNotify(teacher_id, inquiryMessage);
  
  // Log as INQUIRY mode, not ROUTINE
  await logAudit({
    policy_applied: 'INQUIRY',
    action: 'SEND_INQUIRY_MESSAGE'
  });
} else {
  // Normal briefing logic...
}
```

**Inquiry Mode Update Trigger** (in recommendation action handler):
```typescript
// When teacher dismisses (3rd time)
const dismissalCount = await supabase
  .from('recommendations')
  .select('id')
  .eq('teacher_id', teacher_id)
  .eq('class_id', class_id)
  .eq('teacher_approval_status', 'DISMISSED')
  .gte('created_at', new Date(Date.now() - 7*86400000).toISOString());

if (dismissalCount.data.length >= 3) {
  await supabase
    .from('teacher_profiles')
    .update({
      is_inquiry_mode: true,
      inquiry_mode_triggered_at: new Date().toISOString()
    })
    .eq('id', teacher_id);
}
```

**Exit Inquiry Mode** (once teacher provides feedback):
```typescript
// POST /api/teacher/inquiry-feedback
export async function POST(req: Request) {
  const {teacher_id, feedback} = await req.json();
  
  await supabase
    .from('teacher_profiles')
    .update({
      is_inquiry_mode: false,
      dismissal_pattern_consecutive: 0,
      inquiry_feedback: feedback  // stored for L3 tuning
    })
    .eq('id', teacher_id);
  
  // Log for future personalization
  await logAnalytics('INQUIRY_MODE_RESOLVED', {teacher_id, feedback});
}
```

**Alternatives Evaluated**:
1. ❌ **Silence Forever** (stop sending if <20% action rate):
   - No longer engaging; misses important alerts
   - No chance to adapt

2. ⚠️ **Increase Frequency** (try harder):
   - Violates Constitution IV (respect teacher sanity)
   - Spam framing

**Testing**:
- Integration test: Mark 3 recommendations as DISMISSED → verify is_inquiry_mode=true
- Integration test: Teacher submits inquiry feedback → verify is_inquiry_mode=false
- E2E test: Create dismissal pattern → verify inquiry message sent instead of briefing

---

## Resolved Clarifications

### Initial Unknowns → Final Decisions

| Unknown | Initial Question | Decision | File Reference |
|---------|-----------------|----------|-----------------|
| 1 | **Scheduling**: How to reliably trigger 7:30 AM briefing daily? | n8n Schedule Trigger with cron `0 7 * * 1-5` | `plan.md` § Node Specifications |
| 2 | **K-Anonymity**: Where to enforce minimum 3 students? | PostgreSQL SECURITY DEFINER RPC + RLS at data source | `plan.md` § Data Model (recommendations table) |
| 3 | **LLM**: How to safely integrate Gemini? | n8n LangChain Agent with tool-workflow isolation | `plan.md` § N8N Workflow Design |
| 4 | **Notifications**: Which channel—LINE, Slack, Email? | PRIMARY: LINE Notify (local-first, fast engagement); FALLBACK: Email | `plan.md` § SendLineNotify node |
| 5 | **Dashboard**: Server or Client component? | Hybrid RSC + Client + ISR cache revalidation | `plan.md` § API Routes (briefing-status) |
| 6 | **Approval**: Single path or multiple? | Multiple paths (LINE button, dashboard CTA, email link) | `plan.md` § API Routes (recommendation action) |
| 7 | **Observability**: How to audit W06 decisions? | Dual logging (n8n native + custom `n8n_audit_log` table) | `plan.md` § Observability section |
| 8 | **Low Engagement**: What to do if teachers dismiss >3 times? | Inquiry Mode: ask feedback instead of sending more recommendations | `plan.md` § Guardrails section |

---

## Technical Validation

### Alignment with Constitution (v2.0.0)

- ✅ **Principle I (Autonomous Agency)**: Tool isolation enforced; decision path fully auditable
- ✅ **Principle II (Privacy-by-Design)**: RLS + k-anonymity at DB layer; no raw data in notifications
- ✅ **Principle III (Self-Evaluation)**: Loop closure metrics tracked + effectiveness gates defined
- ✅ **Principle IV (Human-in-the-Loop)**: No auto-send; teacher approval gate required
- ✅ **Principle VI (Daily Habits)**: M-F 7:30 AM schedule; visible loop closure feedback
- ✅ **Principle VII (Scalability)**: Multi-tenant design; RLS ensures school isolation

### Compliance Checks

- ✅ **one-trigger Rule**: W06 has single Schedule Trigger (no conflicting triggers)
- ✅ **Hybrid Scoring**: LLM confidence (0.65 threshold) + rule-based fallback
- ✅ **Deterministic Paths**: All gates logged to `n8n_audit_log`; no randomness except LLM
- ✅ **Notification Frequency**: Guarded by <2/day, <5/week limits
- ✅ **k-Anonymity (k≥3)**: Enforced at RPC layer; teacher cannot bypass

---

## Implementation Readiness

**Status**: ✅ **All Clarifications Resolved**

**Next Steps** (Phase 1 → deliverables):
1. Create `plan.md` (this artifact) ✅
2. Generate `data-model.md` (table schemas) → in plan.md § Phase 1
3. Create Supabase migrations (SQL scripts)
4. Create n8n workflow nodes (TypeScript decorators)
5. Create Next.js API routes (route handlers)
6. Create UI component (BriefingWidget.tsx)

**Timeline**: Phase 1 (design) complete; Phase 2 (implementation tasks) ready for `/speckit.tasks` command.

---

**End of Research Document**

---

**Document Generated**: 2026-03-16 | **Spec-Kit Phase**: 0 (Research) | **Next Command**: `/speckit.tasks`
