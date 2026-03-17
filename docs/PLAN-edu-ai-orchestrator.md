# EDU-AI-Unified-Orchestrator-v2 Implementation Plan

## 1. ARCHITECTURE BLUEPRINT

```text
[Triggers]
 ├─ Schedule: Daily 8AM (taskType: "daily")
 ├─ Schedule: Fri 5PM (taskType: "friday_reminder")
 ├─ Schedule: Sun 8PM (taskType: "sunday_health")
 ├─ Schedule: Mon 9AM (taskType: "teacher_email")
 └─ Webhook: Loop Closure (taskType: "loop_closure")
   │
   ▼
[Pre-processing & Routing]
 └─ Code Node: Evaluate Day/Time & Set taskType
   │
   ▼
[Switch Node] Routes based on `taskType`
 ├─ Branch 1: "daily"
 │   └─ Code Node: Data Validation
 │   └─ AI Agent Node (Google Gemini)
 │       ├─ Tool: Postgres Count Enrolled Students
 │       ├─ Tool: Postgres Get Past Recommendations
 │       ├─ Tool: Postgres Get Teacher Action Rate
 │       ├─ Tool: Postgres Submit Recommendation
 │       └─ Tool: X (Twitter) Search Tweets (Max 20)
 │   └─ Webhook (Central Notify)
 │
 ├─ Branch 2: "friday_reminder"
 │   └─ Postgres Node
 │   └─ Webhook (Central Notify)
 │
 ├─ Branch 3: "sunday_health"
 │   └─ Postgres Node
 │   └─ Webhook (Central Notify)
 │
 ├─ Branch 4: "teacher_email"
 │   └─ Postgres Node
 │   └─ SendGrid Node
 │   └─ Webhook (Central Notify)
 │
 └─ Branch 5: "loop_closure"
     └─ Postgres Node
     └─ Webhook (Central Notify)

[Global Error Handling]
 └─ Error Trigger
 └─ Code Node: Central Error Logger
```

## 2. IMPLEMENTATION TASK BREAKDOWN

### Phase 1: Triggers & Routing
1.  **Configure Triggers**: Add 4 Schedule Triggers with correct cron expressions and 1 Webhook Trigger. Assign a dummy property (e.g., `source`) to distinguish them if necessary, though the Code node will handle primary classification.
2.  **Determine Execution Type (Code Node)**: Write JavaScript to evaluate the trigger source and `$now.format('dddd')` to set the `taskType` variable (`daily`, `friday_reminder`, etc.).
3.  **Route Execution (Switch Node)**: Configure 5 outputs based on `{{ $json.taskType }}`.

### Phase 2: Agentic AI Core (Branch 1)
1.  **Data Validation (Code Node)**: Ensure necessary context variables exist before invoking the AI.
2.  **Configure AI Agent**: Add the Agent Node. Set the model to Google Gemini 1.5 Pro. Define the strict Educational System Prompt.
3.  **Configure Tools**: Create 5 Tool nodes connected to the AI Agent via the `ai_tool` connection. Write highly specific descriptions for each to constrain the LLM's behavior.
4.  **Connect to Central Notify**: Route the Agent's output to the final Webhook.

### Phase 3: Linear Sub-routines (Branches 2-5)
1.  **Friday Reminder**: Connect Postgres node (fetch missing check-ins) to Central Notify Webhook.
2.  **Sunday Health**: Connect Postgres node (aggregate weekly health) to Central Notify Webhook.
3.  **Teacher Email**: Connect Postgres node (fetch TL;DR data) to SendGrid node. Route to final Webhook.
4.  **Loop Closure**: Connect Postgres node (log closure) to Central Notify Webhook.

### Phase 4: Error Handling & Finalization
1.  **Error Trigger**: Add an Error Trigger node on the canvas.
2.  **Central Logger**: Connect the Error Trigger to a Code Node that formats the error for logging (e.g., sending an alert via Postgres or Slack webhook).
3.  **Global Settings**: Set nodes that shouldn't crash the entire flow to `Continue On Fail` (e.g., the X Node).

## 3. CRITICAL NODE CONFIGURATIONS

### 3.1 Validation & Routing (Code Node)
```javascript
// Determine Execution Type Code Node
const moment = require('moment-timezone');
const now = moment().tz('Asia/Bangkok'); // Adjust timezone as needed
const day = now.format('dddd');
const hour = now.hour();

let taskType = 'unknown';

// Check if triggered by Webhook
if ($input.item.json.body && $input.item.json.body.action === 'loop_closure') {
  taskType = 'loop_closure';
} 
// Check Schedule Triggers
else if (day === 'Friday' && hour >= 16) {
  taskType = 'friday_reminder';
} else if (day === 'Sunday' && hour >= 19) {
  taskType = 'sunday_health';
} else if (day === 'Monday' && hour >= 8 && hour < 10) {
  taskType = 'teacher_email';
} else {
  taskType = 'daily'; // Default to daily AI evaluation
}

return { json: { taskType: taskType, executionTime: now.format() } };
```

### 3.2 Switch Node Expression
- Output 0 (Daily): `{{ $json.taskType }} == "daily"`
- Output 1 (Friday): `{{ $json.taskType }} == "friday_reminder"`
- Output 2 (Sunday): `{{ $json.taskType }} == "sunday_health"`
- Output 3 (Monday): `{{ $json.taskType }} == "teacher_email"`
- Output 4 (Closure): `{{ $json.taskType }} == "loop_closure"`

### 3.3 AI Agent System Prompt
```text
You are the Climate Agent Orchestrator, an AI assistant analyzing classroom climate data.
Your goal is to summarize trends and draft actionable, non-punitive suggestions for teachers.
CRITICAL RULES:
1. NEVER identify individual students.
2. Maintain k-anonymity (never report data if n < 3).
3. Do NOT make predictive assessments of student risk.
4. Keep suggestions actionable and concise (under 3 sentences).
Use your tools to gather required statistics before formulating the final recommendation.
Finally, use the 'Submit Recommendation' tool to save your draft.
```

### 3.4 Tool Descriptions (Strict Constraints)
- **Get Teacher Action Rate**: "Returns the percentage of past recommendations the teacher has approved. Input: none. Output: percentage number."
- **Submit Recommendation**: "Use this tool to submit the final drafted action to the database. ONLY call this ONCE per execution after all analysis is complete. Input requires a JSON string with 'classId', 'summary', and 'actionItems'."
- **Search Tweets**: "Searches X (Twitter) for general education trends. Use this to gauge broader student sentiment during exam weeks, etc. Limit queries to general terms. Max results returned is 20." *(Node setting `Continue On Fail: true` should be enabled in the n8n UI for this tool to prevent rate limits from crashing the agent).*

## 4. DEPLOYMENT & TESTING CHECKLIST

- [ ] **Data Pinning**: Pin sample data on all trigger nodes to test the `taskType` routing logic without waiting for real schedules.
- [ ] **Rate Limits**: Test the X Node tool explicitly to ensure rate limit errors (`Continue On Fail`) are gracefully handled by the Agent.
- [ ] **Credentials**: Map Supabase (PostgreSQL), SendGrid, X (Twitter), and Google Gemini API credentials in the production n8n environment.
- [ ] **Timezone Check**: Verify the n8n instance timezone matches the expected Schedule trigger times (`Asia/Bangkok` recommended for local context).

---
## 5. N8N JSON GENERATION
*(Because of length constraints, the JSON structure will be provided to the user in the completion response)*
