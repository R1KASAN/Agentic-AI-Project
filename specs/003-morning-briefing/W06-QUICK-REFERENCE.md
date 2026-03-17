# W06 Morning AI Briefing - Quick Reference & Node Summary

**Date**: 2026-03-16  
**Workflow File**: `n8n/workflows/006-morning-briefing.workflow.ts`  
**Tool Files**: 
- `n8n/workflows/tools/tool-get-class-climate-summary.workflow.ts`
- `n8n/workflows/tools/tool-get-past-recommendations.workflow.ts`  
- `n8n/workflows/tools/tool-get-teacher-action-rate.workflow.ts`

---

## 📋 Node Summary Table

| ID | Node Name | Type | v | Position | Outputs | Dependency |
|----|-----------|------|---|----------|---------|------------|
| 1 | Schedule Trigger: 7:30 AM M-F | scheduleTrigger | 1 | (50,50) | trigger_event | - |
| 2 | Check School Day | postgres | 1 | (250,50) | {is_school_day, date, reason} | 1 |
| 3 | Is School Day? | if | 1 | (450,50) | br0/br1 | 2 |
| 4 | Fetch Active Teachers | postgres | 1 | (450,200) | teachers[] | BRANCH:3→1 |
| 5 | Loop: Split Teachers | splitInBatches | 1 | (650,200) | teacher (x1) | 4 |
| 6 | Fetch Teacher Classes | postgres | 1 | (850,200) | classes[] | 5 |
| 7 | Loop: Split Classes | splitInBatches | 1 | (1050,200) | class (x1) | 6 |
| 8 | Call Tool: Get Climate Summary | toolWorkflow | 1 | (1250,100) | {climate_summary} | 7 |
| 9 | Call Tool: Get Past Recommendations | toolWorkflow | 1 | (1250,250) | {closure_metrics} | 7 |
| 10 | Call Tool: Get Teacher Metrics | toolWorkflow | 1 | (1250,400) | {teacher_metrics} | 7 |
| 11 | K-Anonymity Check | if | 1 | (1600,200) | br0(skip)/br1 | 8 |
| 12 | Check Frequency Guard | postgres | 1 | (1800,200) | {today_count, week_count} | BRANCH:11→1 |
| 13 | Is Within Frequency Limits? | if | 1 | (2000,200) | br0(skip)/br1 | 12 |
| 14 | Check Teacher Availability | if | 1 | (2000,50) | br0(skip)/br1 | BRANCH:13→1 |
| 15 | Gemini-LLM | lmChatGoogleGemini | 1 | (1900,400) | llm_connection | - |
| 16 | LangChain Agent | agent | 1 | (2200,200) | {content, confidence, rationale} | 9,10,15+BRANCH:14→1 |
| 17 | Validate & Fallback | code | 1 | (2400,200) | {recommendation} | 16 |
| 18 | Classify Policy | code | 1 | (2400,350) | {policy, trigger_reason} | 17 |
| 19 | Tone Audit | code | 1 | (2600,200) | {tone_warning, recommendation} | 17 |
| 20 | Prepare LINE Message | code | 1 | (2800,200) | {line_message} | 18,19 |
| 21 | Send LINE Notify | httpRequest | 4 | (3000,200) | {status, response} | 20 |
| 22 | Insert Recommendation | postgres | 1 | (3200,100) | {id, created_at} | 21 |
| 23 | Insert Audit Log | postgres | 1 | (3200,350) | {id, timestamp} | 21 |
| 24 | Revalidate Dashboard | httpRequest | 4 | (3400,200) | {status} | 22,23 |

---

## 🔀 Data Flow Diagram (Simplified)

```
TRIGGER (Node 1)
    ↓
GATE 1: School Day? (Nodes 2-3)
    ├─ NO → SKIP
    └─ YES ↓
FETCH TEACHERS (Node 4)
    ↓
LOOP 0: For Each Teacher (Node 5)
    ├─ FETCH CLASSES (Node 6)
    ↓
    LOOP 1: For Each Class (Node 7)
        ├─ FETCH DATA (Nodes 8-10) [PARALLEL]
        │  ├─ Climate Summary
        │  ├─ Past Recommendations
        │  └─ Teacher Metrics
        ↓
        GATE 2: K-Anonymity? (Node 11)
            ├─ NO (n < 3) → SKIP
            └─ YES ↓
        GATE 3: Frequency? (Nodes 12-13)
            ├─ NO (too many) → SKIP
            └─ YES ↓
        GATE 4: Available? (Node 14)
            ├─ NO (on_leave) → SKIP
            └─ YES ↓
        AGENT REASONING (Nodes 15-19)
            ├─ LLM (Gemini) generates recommendation
            ├─ Validate confidence
            ├─ Classify policy
            └─ Audit tone
        ↓
        SEND & RECORD (Nodes 20-24) [PARALLEL]
            ├─ Prepare message
            ├─ Send via LINE
            ├─ Insert DB record
            ├─ Log audit trail
            └─ Revalidate dashboard
        ↓
    (LOOP 1 continues per class)
(LOOP 0 continues per teacher)
END
```

---

## 🎯 Gate Decision Tree

```
START: 7:30 AM M-F?
    └─ YES → Is school day?
            ├─ NO → SKIP
            └─ YES → Get active teachers
                    ├─ NONE → SKIP
                    └─ YES → For each teacher...
                            FETCH classes
                            ├─ NONE → SKIP
                            └─ For each class...
                                    K-anonymity (n >= 3)?
                                    ├─ NO → SKIP
                                    └─ YES → Frequency OK?
                                            ├─ NO (2/day, 5/week) → SKIP
                                            └─ YES → Teacher available?
                                                    ├─ NO (on_leave) → SKIP
                                                    └─ YES → LLM confidence >= 0.65?
                                                            ├─ NO → Use fallback
                                                            └─ YES → Use LLM output
                                                            ↓
                                                            SEND LINE
                                                            RECORD DB
                                                            REVALIDATE
```

---

## 📊 Node Output Schemas

### Node 8: Climate Summary
```json
{
  "mean_mood": 3.5,
  "std_dev": 0.8,
  "n_students": 12,
  "mood_trend": "-15%",
  "baseline": 3.8,
  "k_anonymity_safe": true,
  "fetched_at": "2026-03-16T07:31:00Z"
}
```

### Node 9: Closure Metrics
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

### Node 10: Teacher Metrics
```json
{
  "teacher_id": "uuid",
  "approval_rate": 0.75,
  "implementation_rate": 0.55,
  "dismissal_rate": 0.25,
  "dismissal_pattern_consecutive": 1,
  "is_inquiry_mode": false
}
```

### Node 16: LangChain Agent Output
```json
{
  "content": "Consider a 5-min mood check—quick way to understand the climate.",
  "confidence": 0.82,
  "rationale": "Based on downward trend vs baseline...",
  "use_inquiry_mode": false
}
```

### Node 17: Validated Recommendation
```json
{
  "recommendation": {
    "content": "Consider a 5-min mood check...",
    "confidence": 0.82,
    "source": "lm" | "fallback"
  },
  "fallback_used": false
}
```

### Node 18: Policy Classification
```json
{
  "policy": "ROUTINE" | "WARNING" | "CRITICAL",
  "trigger_reason": "Daily climate briefing per schedule"
}
```

### Node 20: LINE Message
```json
{
  "line_message": "☀️ Good Morning, Teacher!\n\n📊 Classroom Climate (past 24h)\nMean Mood: 3.5/5 (±0.8)...",
  "message_length": 287
}
```

### Node 22: Recommendation Record
```json
{
  "id": "rec_uuid",
  "class_id": "class_uuid",
  "teacher_id": "teacher_uuid",
  "content": "...",
  "confidence_score": 0.82,
  "policy": "ROUTINE",
  "created_at": "2026-03-16T07:31:45Z"
}
```

### Node 23: Audit Log Entry
```json
{
  "id": "audit_uuid",
  "workflow_id": "W06",
  "execution_id": "exec_uuid",
  "teacher_id": "teacher_uuid",
  "class_id": "class_uuid",
  "decision_path_json": {
    "workflow_id": "W06",
    "timestamp": "2026-03-16T07:31:00Z",
    "checks": [
      {"name": "school_day", "passed": true},
      {"name": "k_anonymity", "passed": true, "n_students": 12},
      {"name": "frequency", "passed": true},
      {"name": "availability", "passed": true}
    ],
    "policy_selected": "ROUTINE",
    "confidence_score": 0.82,
    "action": "SEND_LINE_NOTIFICATION"
  },
  "tools_invoked": ["get_class_climate_summary", "get_past_recommendations", "get_teacher_action_rate"],
  "action_taken": "SEND_LINE_NOTIFICATION",
  "timestamp": "2026-03-16T07:31:45Z"
}
```

---

## 🔐 RLS & K-Anonymity Guards

### K-Anonymity (Node 8 + Node 11)
- **Guard Level**: Server-side RPC enforcement
- **Threshold**: n ≥ 3 students
- **Consequence**: If n < 3, all aggregates returned as NULL
- **Workflow Response**: Skip briefing for this class

### Teacher Data Access (Node 4, 6, 12)
- **Access Level**: Teacher can only see own classes/recommendations
- **Enforcement**: RLS policy on all queries
- **Protection**: Cross-teacher queries blocked at DB layer
- **Audit**: All access logged to n8n_audit_log

### Student Privacy (Entire Workflow)
- **No Raw Data**: Query tool sub-workflows return aggregates only
- **No Names**: Briefing contains no student identifiers
- **No Mood Traces**: Only summary stats (mean, std_dev, trend)
- **Retention**: Raw pulse data redacted after 60 days

---

## ⚡ Performance Characteristics

### Individual Node Performance
| Node | Type | Avg Latency | Notes |
|------|------|------------|-------|
| 1 | Schedule Trigger | 0ms | Cron-based, no query |
| 2-3 | School Day Gate | 50ms | Simple DB query |
| 4 | Fetch Teachers | 100ms | Full table scan (indexed) |
| 5 | Loop Split | 0ms | Memory operation |
| 6 | Fetch Classes | 50ms | Indexed by teacher_id |
| 7 | Loop Split | 0ms | Memory operation |
| 8-10 | Tool Calls | 500-1000ms | RPC calls + parsing |
| 11-14 | Decision Gates | 0-200ms | Logic + 1-2 DB queries |
| 15 | Gemini LLM | 2000-3000ms | API latency |
| 16 | LangChain Agent | included above | Uses Gemini model |
| 17-19 | Validation Logic | 50ms | JavaScript processing |
| 20 | Prepare Message | 10ms | String manipulation |
| 21 | Send LINE | 1000-2000ms | API call + retry logic |
| 22-23 | DB Insert | 100ms | 2 inserts (batch possible) |
| 24 | Dashboard Webhook | 500-1000ms | HTTP call + ISR trigger |

**Total Workflow Time**: ~6-8 seconds per (teacher, class) pair  
**Throughput**: 5 teachers × 3 classes = 15 iterations = 90-120 seconds total

---

## 🛠️ Configuration Reference

### n8n Node Configuration Examples

#### Schedule Trigger (Node 1)
```
Type: scheduleTrigger
Mode: interval
CronExpression: '30 7 * * 1-5'  (7:30 AM M-F UTC)
```

#### PostgreSQL Node (e.g., Node 2)
```
Type: postgres
Operation: executeQuery
Parameters: 
  - Connection from environment
  - Query with $1, $2 placeholders
  - Values array for parameter binding
```

#### IF Decision Node (e.g., Node 3)
```
Type: if
Condition: '{{ $json.is_school_day }} === true'
Outputs:
  - Branch 0: false path
  - Branch 1: true path
```

#### Tool Sub-Workflow Node (e.g., Node 8)
```
Type: toolWorkflow (LangChain)
Mode: map_workflow_tool
ToolName: get_class_climate_summary
WorkflowId: {{ reference to tool workflow }}
Inputs:
  - class_id: {{ $json.class_id }}
  - period: '24h'
```

#### Code Node (e.g., Node 17)
```
Type: code
Language: javascript
Code: [JavaScript function returning JSON]
```

#### HTTP Request Node (e.g., Node 21)
```
Type: httpRequest
Url: https://notify-api.line.me/api/notify
Method: POST
Auth: Credential reference
Body: {{ serialized JSON }}
Options:
  - retryOnStatusCodeError: [429, 500, 502, 503]
  - retryMaxTries: 3
```

---

## 🧪 Testing Commands

### Test Individual Nodes (n8n UI)
```
1. Right-click node → "Test node"
2. Provide test input (if node requires input)
3. Check output in execution logs
```

### Dry-Run Entire Workflow
```
1. Open workflow
2. Click "Test" → "Dry-run entire workflow"
3. Verify all nodes execute without error
4. Check logs for any warnings
```

### Manual Testing with curl
```bash
# Trigger workflow via n8n API (requires auth)
curl -X POST http://localhost:5678/api/v1/workflows/execute \
  -H "Authorization: Bearer $(curl -X POST http://localhost:5678/api/v1/auth/login \
    -d '{"email":"user","password":"pass"}' | jq .data.csrfToken)" \
  -d '{"workflowId":"W06","triggerData":{}}'

# Test LINE Notify endpoint
curl -X POST https://notify-api.line.me/api/notify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "message=Test message"

# Test dashboard webhook
curl -X POST http://localhost:3000/api/n8n/webhook \
  -H "Content-Type: application/json" \
  -d '{"workflow":"W06","action":"briefing_sent"}'
```

---

## 📝 Troubleshooting Guide

| Symptom | Cause | Solution |
|---------|-------|----------|
| Workflow doesn't trigger at 7:30 AM | Schedule not activated | Click "Activate" in n8n UI |
| K-anonymity gate always skips | n_students < 3 in all classes | Add more students to test class |
| LLM node times out | Gemini API slow or overloaded | Increase timeout, check quota |
| LINE message not sent | AUTH token invalid/expired | Refresh LINE Notify token |
| Audit log not written | DB constraints violated | Check recommendations table schema |
| Dashboard doesn't update | ISR webhook not called | Check Next.js API route logs |
| Frequency guard wrong count | Audit log not from today | Clear test data, check timestamps |

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Test all nodes individually in dry-run mode
- [ ] Verify tool sub-workflows load correctly
- [ ] Check environment variables are set (SUPABASE_URL, GOOGLE_GENERATIVE_AI_API_KEY, etc.)
- [ ] Create test teacher + class + students
- [ ] Mock LINE message receipt (test token)

### Post-Deployment
- [ ] Activate workflow: toggle "active" switch
- [ ] Monitor first 5 executions for errors
- [ ] Check Supabase: verify recommendations + audit logs created
- [ ] Test dashboard: verify briefing widget shows new data
- [ ] Receive test LINE message on deployed token

### Ongoing Monitoring
- [ ] Daily: Check n8n workflow execution logs
- [ ] Weekly: Review audit log for policy distribution + skip reasons
- [ ] Monthly: Check Gemini API quota and LINE Notify message count
- [ ] Quarterly: Review loop closure metrics in teacher_profiles

---

## 📞 Support & Documentation

For questions about:
- **n8n Workflow Structure**: See [W06-WORKFLOW-DOCUMENTATION.md](W06-WORKFLOW-DOCUMENTATION.md)
- **Feature Spec**: See [spec.md](spec.md)
- **Implementation Plan**: See [plan.md](plan.md)
- **Climate Agent Constitution**: See [../../AGENTS.md](../../AGENTS.md)

To report issues:
1. Check workflow execution logs in n8n UI
2. Inspect n8n_audit_log table for decision path
3. Verify RLS policies with direct DB queries
4. Test nodes individually before reporting

