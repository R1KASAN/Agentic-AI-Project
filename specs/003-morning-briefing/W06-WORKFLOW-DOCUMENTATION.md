# W06 Morning AI Briefing - n8n Workflow Documentation

**Date**: 2026-03-16  
**Feature**: W06 Morning AI Briefing  
**n8n Version**: 2.8.3+  
**Language**: TypeScript (n8n-as-code decorators)  
**Status**: Ready for Deployment

---

## 📋 Executive Summary

This document provides comprehensive documentation for the **W06 Morning AI Briefing** n8n workflow—an autonomous daily briefing system that delivers classroom climate intelligence to teachers via LINE at 7:30 AM (Monday-Friday).

**Workflow Characteristics**:
- **Trigger**: Schedule-based (7:30 AM M-F UTC, cron: `0 7 * * 1-5`)
- **Architecture**: Agentic (LangChain Agent + Gemini LLM)
- **Privacy Model**: k-anonymity enforced (n ≥ 3 students required)
- **Distribution**: LINE Notify messaging
- **Logging**: Full audit trail with decision path JSON
- **Scope**: One schema covering 1000+ teachers, 50k+ students (multi-tenant via school_id)

---

## 🏗️ Workflow Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ SCHEDULE TRIGGER (7:30 AM M-F)                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ PHASE 2: SAFETY GATES                                            │
├─ Check School Day (k-anonymity guard)                            │
├─ Fetch Active Teachers (filter on_leave)                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ PHASE 3: LOOP ITERATION                                          │
├─ Loop Over Teachers (Split in Batches)                           │
│  └─ Loop Over Classes Per Teacher (Split in Batches)             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ PHASE 4: DATA COLLECTION (PARALLEL)                              │
├─ Tool: Get Class Climate Summary (RPC + k-anonymity)             │
├─ Tool: Get Past Recommendations (7-day closure metrics)          │
├─ Tool: Get Teacher Action Rate (inquiry mode detection)          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ PHASE 5: DECISION GATES (SEQUENTIAL)                             │
├─ Gate 1: K-Anonymity Check (n ≥ 3?)                              │
├─ Gate 2: Frequency Guard (≤2 today, ≤5 week?)                   │
├─ Gate 3: Teacher Availability (not on_leave?)                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ PHASE 6: AGENTIC REASONING (LANGCHAIN AGENT)                    │
├─ LLM Model: Gemini 2.0 Flash                                    │
├─ Tools: [get_past_recommendations, get_teacher_action_rate]     │
├─ System Prompt: Climate Advisor framing                          │
├─ Output: {content, confidence, rationale}                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ PHASE 6.5: VALIDATION & CLASSIFICATION                           │
├─ Validate & Fallback (LLM confidence < 0.65)                     │
├─ Classify Policy (ROUTINE/WARNING/CRITICAL)                      │
├─ Tone Audit (scan for alert-like keywords)                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ PHASE 7: NOTIFICATION & RECORDING (PARALLEL)                    │
├─ Prepare LINE Message (template + variable substitution)         │
├─ Send LINE Notify (POST to LINE API)                             │
├─ Insert Recommendation Record (DB)                               │
├─ Insert Audit Log Entry (decision path JSON)                     │
├─ Revalidate Dashboard (webhook to Next.js ISR)                   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                    END
```

---

## 🔗 Node-by-Node Mapping

### PHASE 2: SAFETY GATES

#### Node 1: Schedule Trigger (T017)
- **Type**: `n8n-nodes-base.scheduleTrigger`
- **Cron**: `0 7 * * 1-5` (7:30 AM UTC, Monday-Friday)
- **Output**: Single trigger event at scheduled time
- **Purpose**: Daily execution gate—workflow fires only once per day
- **Position**: (50, 50)

#### Node 2: Check School Day (T018)
- **Type**: `n8n-nodes-base.postgres`
- **Operation**: `executeQuery`
- **Query**: 
  ```sql
  SELECT is_school_day, date, reason 
  FROM school_days 
  WHERE school_id = $1 AND date = CURRENT_DATE
  ```
- **Input**: School ID (from context)
- **Output**: `{is_school_day: boolean, date, reason}`
- **Purpose**: Skip workflow on holidays/breaks
- **Position**: (250, 50)

#### Node 3: Is School Day Decision (T018 cont.)
- **Type**: `n8n-nodes-base.if`
- **Condition**: `is_school_day === true`
- **Branch 0** (false): SKIP entire workflow (end)
- **Branch 1** (true): Continue to fetch teachers
- **Position**: (450, 50)

#### Node 4: Fetch Active Teachers (T019)
- **Type**: `n8n-nodes-base.postgres`
- **Query**: 
  ```sql
  SELECT teacher_id, email, notification_frequency_pref, is_inquiry_mode, ...
  FROM auth.users u
  JOIN teacher_profiles tp ON u.id = tp.teacher_id
  WHERE school_id = $1 AND is_active = true AND availability_status != 'on_leave'
  ```
- **Output**: Array of active teachers
- **Purpose**: Get list of teachers to brief
- **Position**: (450, 200)

---

### PHASE 3: LOOP ITERATION

#### Node 5: Loop: Split Teachers (T019 cont.)
- **Type**: `n8n-nodes-base.splitInBatches`
- **Batch Size**: 1
- **Input**: Array of teachers from Node 4
- **Output**: One iteration per teacher
- **Purpose**: Iterate through each teacher
- **Loop Alias**: **Loop 0** (iterate teachers)
- **Position**: (650, 200)

#### Node 6: Fetch Teacher Classes (T019 cont.)
- **Type**: `n8n-nodes-base.postgres`
- **Query**: 
  ```sql
  SELECT class_id, class_name, grade_level
  FROM classes
  WHERE teacher_id = $1 AND school_id = $2 AND active = true
  ```
- **Input**: teacher_id from Loop 0
- **Output**: Array of active classes for this teacher
- **Position**: (850, 200)

#### Node 7: Loop: Split Classes (T019 cont.)
- **Type**: `n8n-nodes-base.splitInBatches`
- **Batch Size**: 1
- **Input**: Array of classes from Node 6
- **Output**: One iteration per class
- **Purpose**: Iterate through teacher's classes
- **Loop Alias**: **Loop 1** (iterate classes)
- **Position**: (1050, 200)

---

### PHASE 4: DATA COLLECTION (PARALLEL TOOL CALLS)

#### Node 8: Tool: Get Class Climate Summary (T020)
- **Type**: `@n8n/n8n-nodes-langchain.toolWorkflow`
- **Tool ID**: `tool-get-class-climate-summary`
- **Input**: `{class_id, period: '24h', school_id}`
- **RPC Call**: `get_class_climate_summary(class_id, period)`
- **Output**:
  ```json
  {
    "mean_mood": 3.5,
    "std_dev": 0.8,
    "n_students": 12,
    "mood_trend": "-15%",
    "baseline": 3.8,
    "k_anonymity_safe": true
  }
  ```
- **K-Anonymity Logic**:
  - If `n_students < 3`: return all NULLs + `k_anonymity_safe=false`
  - If `n_students >= 3`: return aggregates + `k_anonymity_safe=true`
- **Position**: (1250, 100)

#### Node 9: Tool: Get Past Recommendations (T021)
- **Type**: `@n8n/n8n-nodes-langchain.toolWorkflow`
- **Tool ID**: `tool-get-past-recommendations`
- **Input**: `{class_id, days: 7, teacher_id}`
- **Database Query**: Past 7 days recommendations
- **Output**:
  ```json
  {
    "total_recommendations": 5,
    "approved_count": 4,
    "implemented_count": 2,
    "approval_rate_7d": 0.8,
    "implementation_rate_7d": 0.4,
    "closure_rate_7d": 0.4,
    "avg_closure_latency_hours": 3.5
  }
  ```
- **Purpose**: Provide context for LLM (teacher response patterns)
- **Position**: (1250, 250)

#### Node 10: Tool: Get Teacher Action Rate (T022)
- **Type**: `@n8n/n8n-nodes-langchain.toolWorkflow`
- **Tool ID**: `tool-get-teacher-action-rate`
- **Input**: `{teacher_id}`
- **Database Query**: Teacher profile metrics
- **Output**:
  ```json
  {
    "approval_rate": 0.75,
    "implementation_rate": 0.55,
    "dismissal_rate": 0.25,
    "dismissal_pattern_consecutive": 1,
    "is_inquiry_mode": false
  }
  ```
- **Purpose**: Detect inquiry mode, adjust agent tone
- **Position**: (1250, 400)

---

### PHASE 5: DECISION GATES (SEQUENTIAL)

#### Node 11: K-Anonymity Check (T023)
- **Type**: `n8n-nodes-base.if`
- **Condition**: `n_students >= 3 AND k_anonymity_safe === true`
- **Branch 0** (false): SKIP this class
  - Set: `action='SKIP'`, `skip_reason='insufficient_data'`
  - End
- **Branch 1** (true): Continue to frequency guard
- **Position**: (1600, 200)

#### Node 12: Check Frequency Guard (T024)
- **Type**: `n8n-nodes-base.postgres`
- **Query**:
  ```sql
  SELECT 
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 END) as today_count,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as week_count
  FROM n8n_audit_log
  WHERE teacher_id = $1 AND workflow_id = 'W06' AND action_taken = 'SEND_LINE_NOTIFICATION'
  ```
- **Output**: `{today_count, week_count}`
- **Purpose**: Check notification frequency limits
- **Position**: (1800, 200)

#### Node 13: Is Within Frequency Limits (T024 cont.)
- **Type**: `n8n-nodes-base.if`
- **Condition**: `today_count < 2 AND week_count < 5`
- **Branch 0** (false): SKIP (too many notifications)
- **Branch 1** (true): Continue to availability check
- **Position**: (2000, 200)

#### Node 14: Check Teacher Availability (T025)
- **Type**: `n8n-nodes-base.if`
- **Condition**: `availability_status !== 'on_leave'`
- **Branch 0** (false): SKIP (teacher unavailable)
- **Branch 1** (true): Continue to LangChain Agent
- **Position**: (2000, 50)

---

### PHASE 6: AGENTIC REASONING

#### Node 15: Gemini LLM Model (T026)
- **Type**: `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`
- **Model**: `gemini-2.0-flash`
- **Temperature**: 0.8 (creative but focused)
- **Top K**: 3
- **Top P**: 0.95
- **Max Output Tokens**: 256
- **Purpose**: Language model backbone for agent
- **Position**: (1900, 400)

#### Node 16: LangChain Agent (T027)
- **Type**: `@n8n/n8n-nodes-langchain.agent`
- **Agent Type**: `tool-calling`
- **LLM Model**: Gemini (from Node 15)
- **Tools**:
  1. `tool-get-past-recommendations` (Node 9 output)
  2. `tool-get-teacher-action-rate` (Node 10 output)
- **System Prompt** (Climate Advisor Framing):
  ```
  You are a supportive classroom climate advisor...
  [Full prompt in workflow file]
  ```
- **Max Iterations**: 5
- **Max Retries**: 1
- **Output Schema**:
  ```json
  {
    "content": "Consider a 5-min mood check...",
    "confidence": 0.82,
    "rationale": "Based on downward trend...",
    "use_inquiry_mode": false
  }
  ```
- **Purpose**: Autonomous reasoning using tools + LLM
- **Position**: (2200, 200)

#### Node 17: Validate & Fallback (T028)
- **Type**: `n8n-nodes-base.code` (JavaScript)
- **Logic**:
  ```javascript
  IF lm_output.confidence >= 0.65
    THEN use LM output
  ELSE use random fallback suggestion
  ```
- **Fallback Suggestions**:
  - "Consider a 5-min mood check..."
  - "Try a collaborative problem-solving activity..."
  - "Share something positive about each student..."
- **Output**:
  ```json
  {
    "recommendation": {
      "content": "string",
      "confidence": 0.82,
      "source": "lm" | "fallback"
    },
    "fallback_used": boolean
  }
  ```
- **Position**: (2400, 200)

#### Node 18: Classify Policy (T029)
- **Type**: `n8n-nodes-base.code` (JavaScript)
- **Logic**:
  ```javascript
  IF mood_trend DOWN > 15% THEN policy = 'WARNING'
  ELSE IF confidence < 0.5 THEN policy = 'ROUTINE'
  ELSE policy = 'ROUTINE' (default)
  ```
- **Output**: `{policy: String, trigger_reason: String}`
- **Possible Policies**:
  - `'ROUTINE'`: Standard daily briefing
  - `'WARNING'`: Climate trend concerning
  - `'CRITICAL'`: Severe climate issue (not commonly used in W06)
- **Position**: (2400, 350)

#### Node 19: Tone Audit (T030)
- **Type**: `n8n-nodes-base.code` (JavaScript)
- **Logic**: Scan for alert-like keywords
  ```javascript
  IF content contains ["warning", "danger", "alert", "failing", "critical"]
    THEN tone_warning = true
  ```
- **Output**: 
  ```json
  {
    "tone_warning": boolean,
    "flagged_keywords": String[],
    "recommendation": String (with tone softened if needed)
  }
  ```
- **Purpose**: Enforce "Partner Advisor" tone, prevent audit/surveillance framing
- **Position**: (2600, 200)

---

### PHASE 7: NOTIFICATION & RECORDING

#### Node 20: Prepare LINE Message (T031)
- **Type**: `n8n-nodes-base.code` (JavaScript)
- **Template**:
  ```
  ☀️ Good Morning, {teacher}!
  
  📊 Classroom Climate (past 24h)
  Mean Mood: 3.5/5 (±0.8)
  Change vs. last week: ↓ down 15%
  
  💡 I suggest: {recommendation}
  Confidence: 82%
  
  ✅ Last week: 5 suggestions → 3 approved → 2 implemented (40%)
  
  Ready to try?
  ```
- **Output**: `{line_message: String, message_length: Number}`
- **Constraints**: Max 1000 chars (LINE Notify limit)
- **Position**: (2800, 200)

#### Node 21: Send LINE Notify (T032)
- **Type**: `n8n-nodes-base.httpRequest`
- **URL**: `https://notify-api.line.me/api/notify`
- **Method**: `POST`
- **Auth**: Bearer token (LINE Notify OAuth2)
- **Headers**:
  ```
  Authorization: Bearer {{ line_notify_token }}
  ```
- **Body**:
  ```json
  {
    "message": "{{ line_message }}"
  }
  ```
- **Error Handling**:
  - Retry on: [429, 500, 502, 503]
  - Max Retries: 3
  - Wait Time: 2000ms
- **Output**: `{status: Number, response: String}`
- **Position**: (3000, 200)

#### Node 22: Insert Recommendation (T033)
- **Type**: `n8n-nodes-base.postgres`
- **Operation**: `INSERT`
- **Table**: `recommendations`
- **Columns**:
  - `id` (UUID)
  - `class_id, teacher_id, school_id` (FKs)
  - `content` (recommendation text)
  - `confidence_score` (0-1)
  - `policy` (ROUTINE/WARNING/CRITICAL)
  - `ai_model` (gemini-2.0-flash)
  - `trigger_reason` (why sent)
  - `climate_snapshot` (JSONB of climate summary)
  - `teacher_response_pattern` (JSONB of past metrics)
  - `sent_via` (LINE)
  - `teacher_notification_sent_at` (NOW())
  - `created_at` (NOW())
- **Purpose**: Record recommendation for tracking + loop closure
- **Position**: (3200, 100)

#### Node 23: Insert Audit Log (T034)
- **Type**: `n8n-nodes-base.postgres`
- **Operation**: `INSERT`
- **Table**: `n8n_audit_log`
- **Columns**:
  - `id, timestamp, workflow_id='W06', execution_id`
  - `school_id, class_id, teacher_id`
  - `decision_path_json` (JSONB with full gate results)
  - `policy_applied` (ROUTINE/WARNING/CRITICAL)
  - `confidence_score`
  - `gates_passed` (JSONB: k_anonymity, frequency, availability)
  - `tools_invoked` (TEXT[]: get_class_climate_summary, ...)
  - `tool_outputs` (JSONB)
  - `action_taken` (SEND_LINE_NOTIFICATION)
  - `recommendation_id` (FK)
  - `notification_sent_at` (NOW())
- **Purpose**: Full transparency + audit trail for agentic decisions
- **Position**: (3200, 350)

#### Node 24: Revalidate Dashboard (T035)
- **Type**: `n8n-nodes-base.httpRequest`
- **URL**: `http://localhost:3000/api/n8n/webhook` (or prod URL)
- **Method**: `POST`
- **Headers**:
  ```
  Content-Type: application/json
  X-n8n-signature: {{ signature() }} (optional)
  ```
- **Body**:
  ```json
  {
    "workflow": "W06",
    "action": "briefing_sent",
    "teacher_id": "uuid",
    "class_id": "uuid",
    "recommendation_id": "uuid",
    "sent_at": "ISO8601",
    "policy": "ROUTINE"
  }
  ```
- **Error Handling**: Continue on fail (don't break workflow)
- **Purpose**: Trigger ISR on dashboard to refresh briefing widget
- **Position**: (3400, 200)

---

## 📊 Loop Mappings

### Loop 0: Teacher Iteration
- **Entry**: Node 5 (Split Teachers)
- **Batches**: One per active teacher
- **Scope**: All logic from Node 6 onwards is executed per teacher
- **Output**: (teacher_id, class_id, recommendation_id) for each briefing sent

### Loop 1: Class Iteration (Nested within Loop 0)
- **Entry**: Node 7 (Split Classes)
- **Batches**: One per teacher's class
- **Scope**: Nodes 8-24 execute per class
- **Output**: Recommendation + audit log per (teacher, class) pair

---

## 🔐 Privacy & Security Implementation

### K-Anonymity Guard (Node 8)
- **Requirement**: k ≥ 3 students minimum
- **Implementation**: RPC `get_class_climate_summary()` enforces server-side
- **Behavior**: If n < 3 → returns NULLs + `k_anonymity_safe=false`
- **Workflow Gate**: Node 11 checks `k_anonymity_safe === true` before proceeding
- **Result**: No raw student data ever seen by LLM or teacher

### RLS Enforcement (All DB Operations)
- **Teacher Access**: Can only see own class recommendations (via `teacher_id = auth.uid()`)
- **Cross-teacher Protection**: RLS policy blocks queries for other teachers' data
- **Student Privacy**: `student_pulses` table is never directly queried; only via RPC

### No Raw Student Data
- **Aggregates Only**: Briefing contains mean, std_dev, trend—never individual moods
- **Audit Log**: `tool_outputs` contains aggregates, not student names/IDs
- **Recommendation**: LLM receives aggregates only, not raw check-in data

---

## ⚙️ Configuration & Deployment

### Environment Variables Required
```bash
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyxxx
SUPABASE_SERVICE_ROLE_KEY=eyxxx (for admin operations)

# Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=AI...

# LINE Notify
LINE_NOTIFY_CHANNEL_ACCESS_TOKEN=xxxxx
LINE_NOTIFY_CHANNEL_ID=xxxxxx
```

### n8n Workflow Activation
1. Open n8n UI → Workflows
2. Search: "W06 Morning AI Briefing"
3. Click dropdown → "Activate"
4. Verify: Schedule trigger shows "Cron job active"
5. Check logs: Should see "Workflow activated at HH:MM UTC"

### Testing (Before Deployment)
1. **Dry-run**: Click "Dry-run" on each node sequentially
2. **Manual trigger**: Click "Test workflow" → trigger manually
3. **Logs inspection**: Check execution logs for errors
4. **Database validation**: Verify recommendations + audit_log rows created
5. **Dashboard test**: Manually fetch `/api/teacher/briefing-status?class_id=...`

---

## 🧪 Test Scenarios

### Scenario 1: K-Anonymity Blocks Briefing
1. Setup: Create class with 2 students
2. Trigger W06 manually
3. Expected: Branch at Node 11 → SKIP (insufficient data)
4. Verify: No LINE message sent, no recommendation created

### Scenario 2: Frequency Guard Blocks 3rd Notification
1. Setup: Manually trigger W06 twice (send 2 notifications)
2. Trigger W06 a 3rd time same day
3. Expected: Frequency guard (Node 13) → SKIP (exceeded daily limit)
4. Verify: Audit log shows 2 successful, 1 skipped

### Scenario 3: Full Happy Path
1. Setup: Class with 5 students, teacher active, frequency OK
2. Trigger W06
3. Expected: All gates pass → LLM generates recommendation → LINE sent
4. Verify:
   - recommendations table: new row created, status='PENDING'
   - n8n_audit_log: full decision_path_json logged
   - LINE: message received in test account
   - Dashboard: `/api/teacher/briefing-status` returns new briefing

### Scenario 4: LLM Fallback (Low Confidence)
1. Setup: Configure Gemini to return confidence=0.3
2. Trigger W06
3. Expected: Node 17 detects low confidence → uses fallback suggestion
4. Verify: recommendations.content contains fallback text, source='fallback'

---

## 📈 Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **Workflow Execution Time** | < 5 minutes | From trigger to dashboard update |
| **LLM Response Time** | < 3 seconds | Gemini API latency |
| **DB Query Time** | < 500ms | All queries optimized with indexes |
| **LINE Delivery** | < 10 seconds | After workflow completes |
| **Dashboard ISR** | < 2 seconds | Next.js incremental static revalidation |

---

## 🛠️ Maintenance & Monitoring

### Key Metrics to Monitor
1. **Workflow Execution Count**: Should be ~5/week (M-F only)
2. **Success Rate**: Should be >95% (excluding intentional skips)
3. **Average Confidence**: Should be >0.75 (LLM quality)
4. **Line Delivery Rate**: Should be 100% (after successful workflow)
5. **Loop Closure Rate**: Track in teacher_profiles.approval_rate_historical

### Common Failure Points
1. **K-anonymity fails**: Class has <3 students → Expected, not error
2. **Frequency blocked**: Teacher already sent 2+ today → Expected, not error
3. **LLM timeout**: Gemini API slow → Retry logic handles automatically
4. **LINE API down**: Critical; requires manual intervention
5. **Database connection error**: Critical; check Supabase status

### Alerting Strategy
- Set n8n alert: IF execution fails 3 times in 1 day → Slack notification
- Set n8n alert: IF workflow execution > 10 minutes → Slack notification
- Monitor Gemini API quota usage monthly
- Monitor LINE Notify rate limits (1000 msgs/month per token)

---

## 🚀 Deployment Checklist

- [ ] All DB migrations applied (`supabase db push --include-all`)
- [ ] school_days calendar seeded (2026 + future years)
- [ ] Gemini API credential configured in n8n
- [ ] LINE Notify credential configured in n8n
- [ ] W06 workflow imported into n8n
- [ ] All tool sub-workflows imported + configured
- [ ] Workflow tested in dry-run mode
- [ ] Manual trigger test successful
- [ ] Dashboard webhook verified working
- [ ] Workflow set to `active: true`
- [ ] Schedule trigger activated
- [ ] Monitoring + alerting set up
- [ ] Go-live approval from teacher stakeholders

---

## 📚 References

- [n8n LangChain Agent Docs](https://docs.n8n.io/advanced-ai/)
- [Gemini API](https://ai.google.dev/api)
- [LINE Notify API](https://notify-bot.line.me/doc/)
- [Supabase RPC Docs](https://supabase.com/docs/guides/api)
- [Climate Agent Constitution](../../AGENTS.md)
- [W06 Feature Specification](../003-morning-briefing/spec.md)
- [W06 Implementation Plan](../003-morning-briefing/plan.md)

