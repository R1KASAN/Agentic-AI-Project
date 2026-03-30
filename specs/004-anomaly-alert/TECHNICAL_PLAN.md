# W07 Mood Anomaly Alert — Technical Implementation Plan

**Feature Branch**: `004-anomaly-alert`  
**Version**: 1.0  
**Risk Level**: High (real-time detection, false-positive tuning critical)  
**Estimated Effort**: 3-4 weeks (rule engine + LLM severity + extensive testing)

---

## Feature Summary

Real-time (30-minute intervals OR webhook-triggered on new check-in) n8n workflow that:
1. Detects mood anomalies using rule-based thresholds + k-anonymity guards
2. Classifies severity (low/medium/high) via LLM contextual analysis
3. Generates 2-3 rapid intervention suggestions
4. Respects daily notification frequency guard (max 2 alerts/day per class)
5. Sends alert immediately via Email/Notification (no approval gate, unlike W06). (LINE Optional)
6. Tracks teacher acknowledgment + action latency for Loop4 self-evaluation
7. Logs all decisions to `n8n_audit_log` for pattern learning

**Constitutional Alignment**: Loop0 (Sense/Real-time) → Loop2 (Reason/Severity) → Loop3 (Act/Notify) → Loop4 (Self-Evaluate via response latency).

---

## Architecture & Data Flow

```
┌──────────────────────────────────────────────┐
│ Trigger: Every 30 minutes OR Webhook         │
│ (when POST /api/student/check-in receives    │
│  new mood entry)                             │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Node: Get All Active Classes                 │
│ (if schedule trigger)                        │
│ OR Use class_id from webhook payload         │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Node: Get Last Hour Mood Aggregate           │
│ Query: student_pulses from past 60 minutes   │
│ Compute: avg_mood, std_dev, count, baseline │
│ K-anonymity: skip if count < 3              │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Node: Get 3-Week Baseline                    │
│ Query: rolling average from 21 days prior    │
│ Purpose: establish "normal" for this class   │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Node: Apply Anomaly Detection Rules          │
│                                              │
│ Rule 1: Mood Drop Detection                  │
│   IF current_avg < baseline - 30%            │
│   AND count >= 3                             │
│   AND trend freshness < 15 min               │
│   THEN severity = "HIGH"                     │
│                                              │
│ Rule 2: Engagement Drop Detection            │
│   IF count < 50% of typical class size       │
│   AND no mood submission in 2+ hours         │
│   THEN severity = "MEDIUM"                   │
│   (Note: this is "low engagement" not "mood")│
│                                              │
│ Rule 3: Moderate Drop                        │
│   IF baseline - 15% <= current < baseline-30%│
│   AND count >= 3                             │
│   THEN severity = "MEDIUM"                   │
│                                              │
│ Output: {                                    │
│   anomaly_detected: bool,                    │
│   severity: 'high'|'medium'|'low'|null,      │
│   mood_drop_percent: number,                 │
│   engagement_percent: number,                │
│   rule_triggered: string                     │
│ }                                            │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Node: IF Anomaly Detected                    │
│ Branch: true → continue to severity class    │
│ Branch: false → skip (no alert)              │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Node: Check Frequency Guard                  │
│ Query: notification_log for alerts today     │
│ Rule: IF count >= 2 alerts sent TODAY        │
│       THEN defer to notification queue       │
│       (max 2 notifications/day still hold)   │
└──────────────────────────────────────────────┘
           ↓ [if passed guard]
┌──────────────────────────────────────────────┐
│ Node: LLM Severity Classifier & Suggestions  │
│                                              │
│ Inputs:                                      │
│  • mood_drop_percent                         │
│  • current_avg, baseline, std_dev            │
│  • engagement_percent                        │
│  • past_interventions_log (what worked?)     │
│  • teacher_action_pattern                    │
│  • class_context (grade, size, language)     │
│                                              │
│ Prompt Engineering:                          │
│  System: "You are a classroom climate        │
│   responder. Given a mood drop, classify     │
│   the anomaly type (behavioral, environmental│
│   personal, technical) and suggest 2-3       │
│   rapid interventions (5-10 min each)."      │
│                                              │
│ Output:                                      │
│  • anomaly_type: classification              │
│  • intervention_1: title + description       │
│  • intervention_2: title + description       │
│  • intervention_3: title + description       │
│  • llm_confidence: 0.0-1.0                   │
│  • tone: 'observation' | 'warning' | 'crit' │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Node: Store in mood_alerts Table             │
│ INSERT INTO mood_alerts (                    │
│   class_id, anomaly_type, severity,          │
│   mood_drop_percent, engagement_percent,     │
│   interventions_json, llm_confidence,        │
│   status = 'pending',                        │
│   created_at = now()                         │
│ )                                            │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Node: Format LINE Message                    │
│                                              │
│ Template (based on severity):                │
│                                              │
│ HIGH:                                        │
│ "[⚠️ ALERT] Class energy is lower than      │
│  usual. Students may need support.          │
│  Quick ideas:                                │
│  1️⃣ 5-min mood check: {intervention_1}      │
│  2️⃣ Energizer activity: {intervention_2}   │
│  [View Options] in dashboard"                │
│                                              │
│ MEDIUM:                                      │
│ "[📌 Observation] Mood is trending down     │
│  slightly. Worth checking in with students? │
│  Try: {intervention_1}"                      │
│                                              │
│ LOW: (no message sent, logged only)          │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Node: LINE API Send                          │
│ POST https://api.line.biz/v2/bot/message    │
│ Auth: LINE_CHANNEL_ACCESS_TOKEN              │
│ Reuse: src/lib/line-notify.ts                │
│                                              │
│ On success:                                  │
│   → Update mood_alerts.status = 'sent'       │
│   → Update mood_alerts.sent_at = now()       │
│   → Insert notification_log (guard count)    │
│                                              │
│ On failure:                                  │
│   → Retry logic: exp backoff (3x, 5 min)     │
│   → Log to n8n_audit_log                     │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Node: POST Webhook to Dashboard              │
│ POST /api/n8n/webhook                        │
│ Payload: {event: 'alert.sent',               │
│           alert_id, class_id, severity}      │
│ → Triggers: revalidatePath on teacher page   │
│ → Shows live alert banner                    │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Node: Audit Log Entry                        │
│ INSERT INTO n8n_audit_log (                  │
│   workflow_name = 'W07_AnomalyAlert',        │
│   decision_type = 'anomaly_detected',        │
│   severity,                                  │
│   payload = {mood_drop_percent, rule,        │
│              interventions, llm_confidence}, │
│   action_taken = 'line alert sent'           │
│ )                                            │
│                                              │
│ For deferred alerts:                         │
│   decision_type = 'anomaly_queued'           │
│   action_taken = 'alert queued (guard limit)' │
└──────────────────────────────────────────────┘
           ↓ [Awaiting teacher response]
```

---

## Database Schema

### Table 1: mood_alerts

```sql
CREATE TABLE mood_alerts (
  id BIGSERIAL PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Anomaly detection data
  anomaly_type VARCHAR(50) NOT NULL, -- 'behavioral', 'environmental', 'personal', 'tech', 'unknown'
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high'
  mood_drop_percent NUMERIC(5,2) NOT NULL, -- -30.5 = dropped 30.5%
  engagement_percent NUMERIC(5,2), -- % of students who submitted check-in
  baseline_mood NUMERIC(3,2), -- 3-week baseline for reference
  current_mood NUMERIC(3,2), -- actual current avg
  n_students_alert INT, -- how many students reported low mood
  
  -- Interventions generated by LLM
  interventions_json JSONB, -- [{title: "", description: "", time_mins: 5}, ...]
  anomaly_classification_text TEXT, -- "Possible end-of-week fatigue"
  llm_confidence NUMERIC(3,2),
  
  -- Status & response tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'acknowledged', 'implemented', 'dismissed'
  created_at TIMESTAMP DEFAULT now(),
  sent_at TIMESTAMP,
  first_acknowledged_at TIMESTAMP, -- when teacher clicked "acknowledged"
  implemented_at TIMESTAMP, -- when teacher marked intervention as implemented
  dismissed_at TIMESTAMP,
  
  -- Response metrics (Loop4)
  response_latency_seconds INT, -- time from sent_at to first_acknowledged_at
  implementation_latency_minutes INT, -- time from sent_at to final mood improvement
  teacher_feedback_text TEXT, -- optional: what did teacher try?
  
  INDEX idx_class_time (class_id, created_at),
  INDEX idx_school_date (school_id, created_at),
  INDEX idx_status (status),
  
  CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'acknowledged', 'implemented', 'dismissed'))
);

-- RLS: Teachers see only alerts for their classes
ALTER TABLE mood_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY mood_alerts_teacher_read ON mood_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_enrollments ce
      WHERE ce.class_id = mood_alerts.class_id
      AND ce.teacher_id = auth.uid()
      AND ce.role = 'teacher'
    )
  );
CREATE POLICY mood_alerts_teacher_update ON mood_alerts
  FOR UPDATE USING (teacher_id = auth.uid());

-- Students see alerts are triggered but NOT the specific details
-- (to avoid anxiety about being monitored)
ALTER TABLE mood_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY mood_alerts_student_read ON mood_alerts
  FOR SELECT USING (FALSE); -- Students cannot see raw alerts table
```

### Table 2: View hourly_mood_aggregate

```sql
CREATE VIEW hourly_mood_aggregate AS
SELECT
  class_id,
  DATE_TRUNC('hour', created_at) AS hour,
  AVG(mood_score)::NUMERIC(3,2) AS avg_mood,
  STDDEV(mood_score)::NUMERIC(3,2) AS std_dev_mood,
  COUNT(DISTINCT student_id) AS enrollment_count,
  (COUNT(DISTINCT student_id) * 100.0 / 
   (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = student_pulses.class_id AND ce.status = 'active'))::NUMERIC(5,2)
    AS engagement_percent
FROM student_pulses
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY class_id, DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

### Baseline Table (for trend comparison)

```sql
CREATE TABLE mood_baselines (
  id BIGSERIAL PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  baseline_day DATE NOT NULL,
  
  -- Rolling 3-week (21 day) average
  avg_mood_21d NUMERIC(3,2),
  std_dev_21d NUMERIC(3,2),
  min_mood_21d NUMERIC(3,2),
  max_mood_21d NUMERIC(3,2),
  
  -- Weekly average (for trend)
  avg_mood_7d NUMERIC(3,2),
  
  -- Updated nightly (01:00 UTC)
  updated_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(class_id, baseline_day)
);

-- Populated by nightly aggregation job (n8n scheduled)
-- See: [Materialized View Refresh] in N8N workflow setup section
```

---

## N8N Workflow: W07-Mood-Anomaly-Alert

### Metadata
- **Name**: W07 Mood Anomaly Alert
- **Type**: Scheduled (cron) + Optional Webhook
- **Trigger Schedule**: Every 30 minutes (00, 30 min markers)
- **Alternative Trigger**: Webhook on POST /api/student/check-in
- **Expected Runtime**: ~2-3 min per 50 classes
- **Retry Logic**: Exponential backoff (max 3 retries)

### Node-by-Node Design

#### Node 1: Schedule Trigger (Primary - Every 30min)

```json
{
  "name": "EveryHalfHour",
  "type": "n8n-nodes-base.scheduleTrigger",
  "typeVersion": 1,
  "parameters": {
    "interval": [
      {
        "triggerAtMinute": 0
      },
      {
        "triggerAtMinute": 30
      }
    ]
  },
  "position": [50, 100]
}
```

#### Node 2: Webhook Trigger (Secondary - on check-in)

```json
{
  "name": "CheckinWebhook",
  "type": "n8n-nodes-base.webhookTrigger",
  "typeVersion": 1,
  "parameters": {
    "path": "w07-anomaly-checkin",
    "httpMethod": "POST"
  },
  "position": [50, 300]
}
```

**Note**: Configure in n8n UI to use OR logic between triggers. Or use separate workflow instances.

#### Node 3: Get Classes (if schedule trigger)

```json
{
  "name": "GetActiveClasses",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2,
  "credentials": ["Supabase"],
  "parameters": {
    "query": "SELECT id, teacher_id, school_id FROM classes WHERE active = true AND school_id IN (SELECT id FROM schools WHERE disable_w07 = false)"
  },
  "position": [250, 100]
}
```

**OR if webhook**: Extract class_id from webhook payload

#### Node 4: Loop Over Classes

```json
{
  "name": "LoopClasses",
  "type": "n8n-nodes-base.splitInBatches",
  "typeVersion": 3,
  "parameters": {
    "batchSize": 20
  },
  "position": [450, 100]
}
```

#### Node 5: Get Last Hour Mood Aggregate

```json
{
  "name": "GetHourlyMood",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2,
  "credentials": ["Supabase"],
  "parameters": {
    "query": "SELECT * FROM hourly_mood_aggregate WHERE class_id = $1 LIMIT 1",
    "queryParams": ["{{ $json.id }}"]
  },
  "position": [700, 100]
}
```

#### Node 6: Get 3-Week Baseline

```json
{
  "name": "GetBaseline",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2,
  "credentials": ["Supabase"],
  "parameters": {
    "query": "SELECT avg_mood_21d, std_dev_21d FROM mood_baselines WHERE class_id = $1 ORDER BY baseline_day DESC LIMIT 1",
    "queryParams": ["{{ $json.id }}"]
  },
  "position": [950, 100]
}
```

#### Node 7: Apply Anomaly Detection Rules (JavaScript)

```javascript
// Anomaly Detection Logic

const current = $json.current_data[0]; // from hourly_mood_aggregate
const baseline = $json.baseline_data[0]; // from mood_baselines

if (!current || !baseline) {
  return {
    anomaly_detected: false,
    reason: 'insufficient data'
  };
}

const currentAvg = current.avg_mood;
const baselineAvg = baseline.avg_mood_21d;
const engagementPercent = current.engagement_percent;
const nStudents = current.enrollment_count;

// K-anonymity check
if (nStudents < 3) {
  return {
    anomaly_detected: false,
    reason: 'k-anonymity failed'
  };
}

// Rule 1: Mood drop >30%
const moodDropPercent = ((baselineAvg - currentAvg) / baselineAvg) * 100;
if (moodDropPercent >= 30 && nStudents >= 3) {
  return {
    anomaly_detected: true,
    severity: 'HIGH',
    rule: 'mood_drop_30_percent',
    mood_drop_percent: moodDropPercent,
    current_avg: currentAvg,
    baseline_avg: baselineAvg,
    engagement_percent: engagementPercent,
    n_students: nStudents
  };
}

// Rule 2: Moderate drop 15-30% + low engagement
if (moodDropPercent >= 15 && moodDropPercent < 30 && engagementPercent < 50) {
  return {
    anomaly_detected: true,
    severity: 'MEDIUM',
    rule: 'moderate_drop_low_engagement',
    mood_drop_percent: moodDropPercent,
    engagement_percent: engagementPercent,
    current_avg: currentAvg,
    baseline_avg: baselineAvg,
    n_students: nStudents
  };
}

// Rule 3: Moderate drop 15-30%
if (moodDropPercent >= 15 && moodDropPercent < 30) {
  return {
    anomaly_detected: true,
    severity: 'MEDIUM',
    rule: 'moderate_drop',
    mood_drop_percent: moodDropPercent,
    current_avg: currentAvg,
    baseline_avg: baselineAvg,
    n_students: nStudents
  };
}

// No anomaly
return {
  anomaly_detected: false,
  reason: 'no_threshold_breach',
  mood_drop_percent: moodDropPercent
};
```

#### Node 8: IF Anomaly Detected

```json
{
  "name": "CheckAnomaly",
  "type": "n8n-nodes-base.if",
  "typeVersion": 2,
  "parameters": {
    "conditions": {
      "options": [
        {
          "comparisons": [
            {
              "value1": "{{ $json.anomaly_detected }}",
              "operation": "equal",
              "value2": true
            }
          ]
        }
      ]
    }
  },
  "position": [1200, 100]
}
```

#### Node 9: Check Frequency Guard

```json
{
  "name": "CheckFrequencyGuard",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2,
  "credentials": ["Supabase"],
  "parameters": {
    "query": "SELECT COUNT(*) as alert_count FROM notification_log WHERE class_id = $1 AND notification_type = 'anomaly_alert' AND sent_date = now()::date",
    "queryParams": ["{{ $nodeInputData[0].id }}"]
  },
  "position": [1450, 100]
}
```

#### Node 10: IF Guard Passed

```json
{
  "name": "CheckGuardPassed",
  "type": "n8n-nodes-base.if",
  "typeVersion": 2,
  "parameters": {
    "conditions": {
      "options": [
        {
          "comparisons": [
            {
              "value1": "{{ $json.alert_count }}",
              "operation": "<",
              "value2": 2
            }
          ]
        }
      ]
    }
  },
  "position": [1700, 100]
}
```

#### Node 11: LLM Severity & Intervention Generator

```json
{
  "name": "LLMAnomalyClassifier",
  "type": "@n8n/n8n-nodes-langchain.agent",
  "typeVersion": 1,
  "credentials": ["Gemini API"],
  "parameters": {
    "model": "gemini-1.5-pro",
    "temperature": 0.8,
    "systemPrompt": "You are a classroom crisis responder. Given a mood anomaly, classify the cause and suggest 2-3 rapid interventions (5-10 minutes each). Respond with ONLY a JSON object:\n\n{\n  \"anomaly_type\": \"behavioral|environmental|personal|technical|unknown\",\n  \"classification_text\": \"brief explanation\",\n  \"intervention_1\": {\"title\": \"...\", \"description\": \"...\", \"time_minutes\": 5},\n  \"intervention_2\": {\"title\": \"...\", \"description\": \"...\", \"time_minutes\": 10},\n  \"intervention_3\": {\"title\": \"...\", \"description\": \"...\", \"time_minutes\": 5},\n  \"confidence\": 0.8,\n  \"suggested_tone\": \"observation|warning|critical\"\n}\n\nPrioritize interventions that match the teacher's prior action patterns.",
    "input": "{{ json.stringify({mood_drop_percent: $json.mood_drop_percent, severity: $json.severity, current_mood: $json.current_avg, baseline_mood: $json.baseline_avg, class_size: $json.n_students}) }}"
  },
  "position": [1950, 100]
}
```

#### Node 12: Parse & Validate LLM Output

```javascript
let llmOutput = $json.message || '{}';
try {
  const parsed = JSON.parse(llmOutput);
  
  // Validation
  const errors = [];
  if (!parsed.anomaly_type) errors.push('anomaly_type missing');
  if (!Array.isArray([parsed.intervention_1, parsed.intervention_2, parsed.intervention_3])) {
    errors.push('interventions malformed');
  }
  if (!parsed.confidence || parsed.confidence < 0.5) {
    errors.push('confidence too low');
  }
  
  if (errors.length > 0) {
    return {
      valid: false,
      reason: errors.join('; ')
    };
  }
  
  return {
    valid: true,
    anomaly_type: parsed.anomaly_type,
    interventions: [parsed.intervention_1, parsed.intervention_2, parsed.intervention_3],
    classification_text: parsed.classification_text,
    llm_confidence: parsed.confidence,
    suggested_tone: parsed.suggested_tone
  };
} catch (e) {
  return { valid: false, reason: 'JSON parse failed' };
}
```

#### Node 13: IF Validation Passed

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

#### Node 14: Store in mood_alerts

```json
{
  "name": "StoreMoodAlert",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2,
  "credentials": ["Supabase"],
  "parameters": {
    "query": "INSERT INTO mood_alerts (school_id, class_id, teacher_id, anomaly_type, severity, mood_drop_percent, engagement_percent, baseline_mood, current_mood, n_students_alert, interventions_json, anomaly_classification_text, llm_confidence, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', NOW()) RETURNING id",
    "queryParams": [
      "{{ $nodeInputData[0].school_id }}",
      "{{ $nodeInputData[0].id }}",
      "{{ $nodeInputData[0].teacher_id }}",
      "{{ $json.anomaly_type }}",
      "{{ $nodeInputData[3].severity }}",
      "{{ $nodeInputData[3].mood_drop_percent }}",
      "{{ $nodeInputData[2].engagement_percent }}",
      "{{ $nodeInputData[4].avg_mood_21d }}",
      "{{ $nodeInputData[2].avg_mood }}",
      "{{ $nodeInputData[2].enrollment_count }}",
      "{{ json.stringify($json.interventions) }}",
      "{{ $json.classification_text }}",
      "{{ $json.llm_confidence }}"
    ]
  },
  "position": [2400, 200]
}
```

#### Node 15: Format LINE Message

```javascript
const severity = $nodeInputData[3].severity; // 'HIGH', 'MEDIUM', 'LOW'
const interventions = $json.interventions;

let message = '';
if (severity === 'HIGH') {
  message = `⚠️ [ALERT] Class energy is lower than usual. Students may need support right now.\n\nQuick ideas:\n1️⃣ ${interventions[0].title}\n2️⃣ ${interventions[1].title}\n\n[View More Options]`;
} else if (severity === 'MEDIUM') {
  message = `📌 [Observation] Mood is trending down. Worth checking in?\n\n💡 Try: ${interventions[0].title}\n\n[Options in Dashboard]`;
} else {
  message = ''; // Low severity - no LINE send
}

return {
  line_message: message,
  formatted: true
};
```

#### Node 16: LINE API Send

```json
{
  "name": "LineAPISend",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 3,
  "parameters": {
    "url": "https://api.line.biz/v2/bot/message/push",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer {{ $env.LINE_CHANNEL_ACCESS_TOKEN }}"
    },
    "body": "{\"to\": \"{{ $nodeInputData[0].teacher_line_id }}\", \"messages\": [{\"type\": \"text\", \"text\": \"{{ $json.line_message }}\"}]}",
    "otherOptions": {
      "timeout": 5000
    }
  },
  "position": [2600, 200]
}
```

#### Node 17: Update Alert Status + notification_log

```json
{
  "name": "UpdateAlertAndLog",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2,
  "credentials": ["Supabase"],
  "parameters": {
    "query": "BEGIN; UPDATE mood_alerts SET status = 'sent', sent_at = NOW() WHERE id = $1; INSERT INTO notification_log (school_id, class_id, notification_type, sent_date, count) VALUES ($2, $3, 'anomaly_alert', now()::date, 1) ON CONFLICT (school_id, class_id, notification_type, sent_date) DO UPDATE SET count = count + 1; COMMIT;",
    "queryParams": [
      "{{ $nodeInputData[8].id }}",
      "{{ $nodeInputData[0].school_id }}",
      "{{ $nodeInputData[0].id }}"
    ]
  },
  "position": [2800, 200]
}
```

#### Node 18: POST Webhook to Dashboard

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
    "body": "{\"event\": \"alert.sent\", \"alert_id\": \"{{ $nodeInputData[8].id }}\", \"severity\": \"{{ $nodeInputData[3].severity }}\", \"class_id\": \"{{ $nodeInputData[0].id }}\"}"
  },
  "position": [3000, 200]
}
```

#### Node 19: Audit Log

```json
{
  "name": "AuditLogAlert",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2,
  "credentials": ["Supabase"],
  "parameters": {
    "query": "INSERT INTO n8n_audit_log (workflow_name, decision_type, class_id, teacher_id, severity, payload, action_taken, created_at) VALUES ('W07_AnomalyAlert', 'anomaly_detected', $1, $2, $3, $4, 'line alert sent', NOW())",
    "queryParams": [
      "{{ $nodeInputData[0].id }}",
      "{{ $nodeInputData[0].teacher_id }}",
      "{{ $nodeInputData[3].severity }}",
      "{{ json.stringify({mood_drop: $nodeInputData[3].mood_drop_percent, rule: $nodeInputData[3].rule, anomaly_type: $json.anomaly_type, confidence: $json.llm_confidence}) }}"
    ]
  },
  "position": [3200, 200]
}
```

---

## API Endpoints

### 1. GET /api/alerts/active

**Purpose**: Fetch active (unacknowledged) anomaly alerts

```typescript
export async function GET(request: Request) {
  const session = await verifySession(await cookies());
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('class_id');
  
  const alerts = await supabase
    .from('mood_alerts')
    .select('*')
    .eq('teacher_id', session.user.id)
    .eq('status', 'sent')
    .gte('sent_at', new Date(Date.now() - 4 * 3600000).toISOString()); // past 4 hours
  
  return NextResponse.json(alerts.data);
}
```

### 2. POST /api/alerts/:id/acknowledge

**Purpose**: Teacher clicks "Acknowledged" on alert

```typescript
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await verifySession(await cookies());
  const { action_tried } = await request.json();
  
  const alert = await supabase
    .from('mood_alerts')
    .select('*')
    .eq('id', params.id)
    .single();
  
  const responseLatency = Math.floor(
    (new Date().getTime() - new Date(alert.data.sent_at).getTime()) / 1000
  );
  
  await supabase
    .from('mood_alerts')
    .update({
      status: 'acknowledged',
      first_acknowledged_at: new Date().toISOString(),
      response_latency_seconds: responseLatency,
      teacher_feedback_text: action_tried
    })
    .eq('id', params.id);
  
  // Audit log
  await supabase
    .from('n8n_audit_log')
    .insert({
      workflow_name: 'W07_AnomalyAlert',
      decision_type: 'alert_acknowledged',
      class_id: alert.data.class_id,
      teacher_id: session.user.id,
      response_latency_seconds: responseLatency,
      action_taken: 'teacher acknowledged alert'
    });
  
  revalidatePath(`/teacher/class/${alert.data.class_id}`);
  
  return NextResponse.json({ success: true, response_latency_seconds: responseLatency });
}
```

### 3. POST /api/alerts/:id/action

**Purpose**: Teacher logs what intervention they tried and outcome

```typescript
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await verifySession(await cookies());
  const { intervention_title, feedback_text, outcome } = await request.json();
  
  await supabase
    .from('mood_alerts')
    .update({
      status: 'implemented',
      implemented_at: new Date().toISOString(),
      teacher_feedback_text: `${intervention_title}: ${feedback_text}`
    })
    .eq('id', params.id);
  
  // Audit log
  await supabase
    .from('n8n_audit_log')
    .insert({
      workflow_name: 'W07_AnomalyAlert',
      decision_type: 'intervention_implemented',
      teacher_action_type: intervention_title,
      payload: { feedback: feedback_text, outcome },
      action_taken: 'teacher implemented intervention'
    });
  
  // If mood recovered: tag intervention as high_trust for future use
  // (Implementation: fetch latest mood, compare to baseline)
  
  return NextResponse.json({ success: true });
}
```

---

## Frontend Components

### Live Alert Banner (classroom page)

**File**: `src/components/domain/teacher/LiveAlertBanner.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface Alert {
  id: string;
  severity: 'high' | 'medium';
  classification_text: string;
  interventions_json: Array<{title: string; description: string}>;
}

export function LiveAlertBanner({ classId }: { classId: string }) {
  const [alert, setAlert] = useState<Alert | null>(null);

  useEffect(() => {
    const fetchActiveAlerts = async () => {
      const res = await fetch(`/api/alerts/active?class_id=${classId}`);
      const alerts = await res.json();
      if (alerts.length > 0) setAlert(alerts[0]);
    };
    
    const interval = setInterval(fetchActiveAlerts, 30000); // poll every 30s
    fetchActiveAlerts(); // initial fetch
    
    return () => clearInterval(interval);
  }, [classId]);

  if (!alert) return null;

  return (
    <div className={`p-4 rounded-lg mb-4 ${alert.severity === 'high' ? 'bg-red-100 border-l-4 border-red-500' : 'bg-yellow-100 border-l-4 border-yellow-500'}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className={alert.severity === 'high' ? 'text-red-600' : 'text-yellow-600'} />
        <div className="flex-1">
          <h3 className={`font-semibold ${alert.severity === 'high' ? 'text-red-900' : 'text-yellow-900'}`}>
            {alert.severity === 'high' ? '⚠️ Alert' : '📌 Observation'}
          </h3>
          <p className={`text-sm ${alert.severity === 'high' ? 'text-red-800' : 'text-yellow-800'}`}>
            {alert.classification_text}
          </p>
          <div className="mt-3 space-y-2">
            {alert.interventions_json.map((i, idx) => (
              <button
                key={idx}
                onClick={() => handleIntervention(alert.id, i.title)}
                className="block text-left px-3 py-2 text-sm bg-white rounded hover:bg-gray-50"
              >
                {idx + 1}️⃣ {i.title}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleAcknowledge(alert.id)}
            className="mt-3 text-sm font-medium px-3 py-1 bg-white rounded hover:bg-gray-50"
          >
            ✅ Got it, thanks
          </button>
        </div>
      </div>
    </div>
  );
}

async function handleIntervention(alertId: string, title: string) {
  await fetch(`/api/alerts/${alertId}/action`, {
    method: 'POST',
    body: JSON.stringify({ intervention_title: title })
  });
}

async function handleAcknowledge(alertId: string) {
  await fetch(`/api/alerts/${alertId}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}
```

---

## Testing Strategy

### Unit Tests: Anomaly Detection Rules

```typescript
describe('W07 Anomaly Detection Rules', () => {
  test('triggers HIGH severity for 30% mood drop', () => {
    const result = detectAnomaly(
      { avg_mood: 2.1, n_students: 5 },
      { avg_mood_21d: 3.0, std_dev_21d: 0.5 }
    );
    expect(result.severity).toBe('HIGH');
  });

  test('skips alert for k<3', () => {
    const result = detectAnomaly(
      { avg_mood: 2.5, n_students: 2 },
      { avg_mood_21d: 3.0 }
    );
    expect(result.anomaly_detected).toBe(false);
  });

  test('triggers MEDIUM for 20% drop + low engagement', () => {
    const result = detectAnomaly(
      { avg_mood: 2.4, engagement: 40, n_students: 5 },
      { avg_mood_21d: 3.0 }
    );
    expect(result.severity).toBe('MEDIUM');
  });
});
```

### E2E Test: Alert Generation & Response

```typescript
test('Alert fires and teacher acknowledges it', async ({ page }) => {
  // 1. Create mood entries that trigger anomaly
  await createCheckIns([1, 1, 1.5, 2, 2]); // all low scores
  
  // 2. Trigger W07 manually
  await fetch('http://localhost:5678/webhook/test-w07', { method: 'POST' });
  
  // 3. Check alert appears on dashboard
  await page.goto('http://localhost:3000/teacher/class/test-class');
  await page.waitForSelector('[data-testid="alert-banner"]', { timeout: 5000 });
  
  // 4. Teacher clicks acknowledge
  await page.click('[data-testid="alert-acknowledge"]');
  
  // 5. Verify audit log records response_latency
  const audit = await fetch('http://localhost:3000/api/admin/audit');
  const logs = await audit.json();
  const lastAlert = logs.find(l => l.decision_type === 'alert_acknowledged');
  expect(lastAlert.response_latency_seconds).toBeLessThan(10);
});
```

### Load Test: 50 Concurrent Anomalies

```javascript
// k6 test
const classes = Array(50).fill(0).map((_, i) => ({ classId: `class-${i}` }));

export default function () {
  classes.forEach(c => {
    http.post('http://localhost:5678/webhook/test-w07', {
      class_id: c.classId
    });
  });
}
```

---

## Thresholds & Tuning for False-Positives

### Initial Thresholds (Subject to Tuning)

| Rule | Threshold | Severity | Justification |
|------|-----------|----------|---------------|
| Mood drop | ≥30% | HIGH | Strong signal; >2 std dev from baseline |
| Mood drop | 15-30% + low engagement | MEDIUM | Moderate signal; engagement context matters |
| Mood drop | 15-30% | MEDIUM | Worth observing; trend to monitor |
| Low engagement | <50% check-ins | (depends on mood context) | Disengagement signal |

### Tuning Strategy (Week 5-6)

1. **Track false-positive rate** (dismissed alerts / total alerts):
   - Target: <20% dismissals
   - If >20%: raise thresholds (e.g., 35% instead of 30%)

2. **Monitor response latency** (when teachers ACK):
   - Target: P90 < 15 minutes
   - If >15 min: reduce alert frequency (max 1/day until responsive)

3. **Collect teacher feedback** (post-alert modal):
   - "Was this helpful?" → feeds into model confidence
   - "Not relevant" → tags intervention for suppression in future

---

## Success Criteria for W07

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| Alert detection latency | <2 minutes from mood drop to notification send | n8n audit logs |
| False-positive rate (dismissals) | <20% | mood_alerts.dismissed_at count |
| Teacher acknowledgment rate | >70% within 4 hours | mood_alerts.first_acknowledged_at |
| Intervention implementation rate | >40% | mood_alerts.status = 'implemented' |
| Mood recovery post-intervention | >60% of alerts result in mood +0.3 | Correlate mood_alerts with student_pulses post-action |
| Average response latency | <15 minutes | Audit log aggregation |
| Notification delivery success rate | >99% | Email API response codes |
| Availability | >99.5% | n8n workflow uptime |

---

**Plan Status**: Ready for Implementation  
**Risk Areas**: False-positive tuning; LLM intervention quality  
**Next Step**: Implement shared infrastructure (email dispatcher, frequency guard) in Week 1-2. (LINE Optional future)  
**Review Date**: 2026-03-23
