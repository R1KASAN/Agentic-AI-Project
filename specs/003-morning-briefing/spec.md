<!-- updated: 2026-03-21 -->
# Specification: climate-agent-main (Morning Briefing Agent)

**Branch**: `003-morning-briefing`  
**Status**: Brownfield Enhancement — Loop 2 & Loop 3 iterative implementation  
**Phase**: Phase 2 — Operational Agent (v2.0.0)  
**Agentic Loops**: Loop0 (Sense) → Loop1 (Aggregate) → Loop2 (Reason/Fallback) → Loop3 (Act/Notify) → Loop4 (Self-Evaluate) → Loop5 (Learn/Adapt)  
**Autonomy Level**: L2 (Decision & Action) — Agent autonomously generates recommendations to teacher; teacher approves before any action is taken

**Key Constraint**: Email is the **ONLY** notification channel (Resend API). [LINE Notify DEPRECATED as of 2026-03-21 per ADR-01.]

---

## 1. Current Implementation Status (As of 2026-03-21)

### 1.1 Implemented Components

**Loop0 & Loop1: Sense + Aggregate**
- Trigger: Schedule 07:30 AM Mon-Fri (Bangkok time)
- School day validation (is weekday? is business hours?)
- Supabase RPC `get_aggregated_climate_data` called via service role
- k-anonymity enforced: reject if <3 responses
- Outputs: `class_id`, `avg_mood_score`, `total_responses`, mood category breakdowns

**Loop2: Reason — Fallback Policy Engine (Current Primary)**
- LLM (Gemini 2.0 Flash via LangChain) attempted first
- On LLM failure (currently 429 rate-limit), fallback to deterministic rule-based:
  - `avg_mood_score <= 2` → `policy_level = CRITICAL`
  - `avg_mood_score <= 3` → `policy_level = WARNING`
  - `avg_mood_score > 3` → `policy_level = ROUTINE`
- Fallback engine also produces:
  - `recommendation_content` (Thai directive text)
  - `reasoning = "Fallback rule-based engine, avg_mood_score={value}"`
  - `decision_path = { route: "fallback", rule: "mood_threshold", avg_score, selected_policy }`
  - `confidence_score = 0.5` (default, non-confident path when rule-based)
- Output: `policy_level`, `confidence_score`, `recommendation_content`, `reasoning`, `decision_path`

**Loop2 Partial: Inquiry Mode**
- Schema: `inquiry_mode` column exists in `recommendations` table
- Status: **NOT YET WIRED** — currently always false
- Tool exists: `Tool: Get Teacher Metrics` RPC returns `dismissal_rate`, but not integrated into main chain
- Future rule: IF `dismissal_rate > 0.6` AND `total_recommendations >= 3` → query teacher instead of pushing recommendation

**Loop2 Partial: Past Recommendations Context**
- Tool exists: `Tool: Get Past Recommendations` returns summary (total, approved, dismissed, rates)
- Status: **NOT YET WIRED** — output not consumed by reasoning engine
- Future use: Feed into LLM prompt for personalization; inform inquiry mode decision

**Loop3: Act — Recommendation Persistence**
- **Supabase `recommendations` table** ← INSERT via service role
  - `class_id`, `content`, `policy_level`, `confidence_score`, `priority`, `category`, `ai_generated`, `ai_model`, `reasoning`, `inquiry_mode`, `fallback_used`
  - `status = "pending"` (awaiting teacher approval on dashboard)
  - Timestamps: `created_at` (DB server time), optional `completed_at`, `feedback`

**Loop3 Partial: Email Notification (WARNING + CRITICAL only)**
- Channel: **Resend Email API** (ONLY notification channel as of 2026-03-21; LINE DEPRECATED)
- Template for WARNING:
  - From: `$env.EMAIL_FROM`
  - To: `$env.EMAIL_TEACHER` (temporary; future: per-teacher routing via teacher_profiles)
  - Subject: `"⚠️ [Climate Agent] พบสัญญาณเตือนห้องเรียนวันนี้"`
  - Body (Thai):
    - Headline: `"⚠️ สภาพบรรยากาศห้องเรียนควรให้ความสนใจ"`
    - Rec: `content` (Thai text from policy engine)
    - Button: "ดูรายละเอียดบนแดชบอร์ด" → dashboard URL
- Template for CRITICAL:
  - Subject: `"🚨 URGENT [Climate Agent] บรรยากาศน่าเป็นห่วง"`
  - Body emphasizes urgency; same CTA structure
- Template for ROUTINE:
  - Email is **NOT sent**; recommendation stays dashboard-only
- Rate limiting: `Split In Batches` + `Wait` (1 item/batch, ~500ms) applied to both WARNING and CRITICAL

**Loop3: Audit Logging**
- Supabase `n8n_audit_logs` table ← INSERT via service role
  - `workflow_id`, `execution_id`, `class_id`, `policy_selected`, `confidence_score`, `decision_path` (JSONB)
  - `trigger_time` (filled with `$now.toISO()` from scheduler)
  - `triggered_by = null` (future: "schedule:morning_briefing" or teacher_id for manual triggers)
  - Provides full replay: what decision was made, how, on what data

### 1.2 Known Gaps

| Gap | Status | Target Scope |
|-----|--------|--------------|
| Inquiry mode not wired | NOT STARTED | Scope A |
| Past recommendations not consumed | NOT STARTED | Scope A |
| Tool nodes under LangChain (not main chain) | PARTIAL | Scope A |
| LLM fallback not explicitly documented | IMPLICIT | Scope B |
| Retry logic for Resend missing | NOT STARTED | Scope C |
| Dispatcher pattern not separated | NOT STARTED | Scope C |
| teacher_id propagation incomplete | NOT STARTED | Scope D |
| ISR webhook not implemented | NOT STARTED | Scope D |
| triggered_by always null | NOT STARTED | Scope D |

---

## 2. User Scenarios & Acceptance Criteria

### User Story 1: Teacher Receives Morning Briefing Email (Priority P1)

**Actor**: Teacher (human decision-maker)  
**Context**: 07:30 AM on Monday, classroom has had mood check-ins from >3 students  
**Goal**: Receive a concise email summarizing classroom climate with actionable recommendation

**Acceptance Scenarios**:

1. **Given** Monday 07:30 AM arrives AND class has ≥3 mood submissions from previous day,  
   **When** climate-agent-main workflow executes,  
   **Then** teacher receives Resend email with:
   - Subject: `"⚠️ [Climate Agent] ..."`  (severity-based emoji)
   - Policy level: WARNING or CRITICAL (email NOT sent for ROUTINE)
   - Recommendation text in Thai (directive tone)
   - Dashboard link for approval

2. **Given** teacher receives WARNING email,  
   **When** email arrives in inbox,  
   **Then** timestamp shows 07:35 AM (within 5 minutes of trigger) AND email retry has succeeded (no 429 bounces)

3. **Given** teacher clicks dashboard link from email,  
   **When** teacher reviews recommendation on dashboard,  
   **Then** teacher sees:
   - Full text of recommendation
   - Metadata: policy_level, confidence_score, category
   - "Approve" and "Dismiss" buttons
   - Optional: past recommendations for this class, teacher's approval history

### User Story 2: Teacher Approves or Dismisses Recommendation (Priority P1)

**Actor**: Teacher (human control gate)  
**Context**: After reading briefing email and optionally teacher feedback, teacher marks their decision  
**Goal**: Provide signal to agent about recommendation relevance; close Loop4

**Acceptance Scenarios**:

1. **Given** teacher clicks "Approve" on pending recommendation in dashboard,  
   **When** approval is stored,  
   **Then**: 
   - `recommendations.status = "approved"`
   - Dashboard updates immediately (optimistic UI)
   - Audit log records approval timestamp

2. **Given** teacher clicks "Dismiss" or provides negative feedback,  
   **When** dismissal is stored,  
   **Then**:
   - `recommendations.status = "dismissed"`
   - Agent logs dismissal to inform inquiry mode logic
   - Dismissal counts toward teacher's dismissal_rate metric

### User Story 3: Agent Notices High Dismissal & Switches to Inquiry Mode (Priority P2)

**Actor**: Agent (adaptive reasoning)  
**Context**: Over several days, teacher dismisses ≥3 recommendations; dismissal_rate > 60%  
**Goal**: Switch to "ask questions" mode instead of pushing recommendations

**Acceptance Scenarios**:

1. **Given** teacher's dismissal_rate > 60% from past 2 weeks,  
   **When** next briefing is generated AND policy_level = WARNING,  
   **Then**:
   - `inquiry_mode = true` in recommendation
   - Email template switches from directive to question: `"สังเกตว่าบรรยากาศห้องเรียนอาจมีบางอย่าง ครูคิดว่าอะไรทำให้นักเรียนรู้สึกแบบนี้คะ/ครับ?"`
   - No specific intervention suggested; instead invites teacher reflection
   - Dashboard shows "This is an Inquiry" label

2. **Given** teacher responds to inquiry with feedback,  
   **When** feedback is stored,  
   **Then**:
   - Agent extracts themes from feedback (e.g., "classroom setup too rigid")
   - Next briefing adapted: LLM prompt boosted with these themes
   - Dismissal_rate reset (give teacher time to apply own ideas)

---

## 3. Functional Requirements (Scope A–D)

### Scope A: Inquiry Mode + Metrics Integration

**FR-A1**: Tool nodes `Tool: Get Teacher Metrics` and `Tool: Get Past Recommendations` MUST be promoted from LangChain sub-nodes to standalone `Execute Sub-Workflow` nodes in the main `climate-agent-main` chain before the Fallback Policy Engine node.

**FR-A2**: `Tool: Get Teacher Metrics` output MUST include:
- `dismissal_rate` (past 14 days)
- `total_recommendations` (lifetime)
- `avg_approval_time_hours`
- `high_dismissal` (bool flag: dismissal_rate > 0.6)

**FR-A3**: `Tool: Get Past Recommendations` output MUST include:
- `summary.total_recommendations`
- `summary.dismissed_count`
- `summary.dismissal_rate`
- `summary.top_categories` (array of frequently recommended intervention types)

**FR-A4**: Fallback Policy Engine MUST accept metrics as inputs and compute:
- `inquiry_mode = true` IF (`dismissal_rate > 0.6` AND `total_recommendations >= 3` AND `policy_level = WARNING`)
- When `inquiry_mode = true`, use inquiry template instead of directive template

**FR-A5**: Inquiry mode template (Thai) MUST be:
- Open-ended, non-directive tone
- Example: `"สังเกตว่าบรรยากาศห้องเรียนอาจมีบางอย่าง ครูคิดว่าอะไรทำให้นักเรียนรู้สึกแบบนี้คะ/ครับ?"`
- No specific intervention suggestions
- Invitation for teacher reflection/feedback

**FR-A6**: Dashboard MUST display inquiry mode recommendations with distinct label (e.g., 🤔 "We'd like your insight").

---

### Scope B: LLM Fallback & Resilience

**FR-B1**: LLM invocation (Gemini 2.0 Flash via LangChain) MUST have explicit error handling:
- Attempt LLM call with 2-second timeout
- On timeout or non-200 HTTP: proceed to fallback
- On parse error (malformed JSON) in response: fallback with error logged

**FR-B2**: Fallback Policy Engine MUST be the active decision path until LLM quota is increased or provider switched:
- Fallback MUST produce valid output schema: `{ policy_level, confidence_score, recommendation_content, reasoning, decision_path }`
- `decision_path` MUST include:
  - `route: "fallback"`
  - `rule: "mood_threshold"`
  - `avg_mood_score: <value>`
  - `selected_policy: <ROUTINE|WARNING|CRITICAL>`
  - `timestamp: <ISO8601>`

**FR-B3**: When LLM is reintroduced or switched (e.g., GPT-4o-mini, Claude Haiku), the spec MUST remain agnostic:
- Define retry policy: max 2 retries, exponential backoff (1s, 2s)
- Define confidence threshold for accepting LLM output: confidence >= 0.65
- Define JSON contract (not vendor-specific API shape)
- On low confidence: fallback to rule-based

**FR-B4**: `decision_path` MUST annotate both success and failure paths:
- LLM success: `decision_path.route = "llm"`, `decision_path.llm_model = "gemini-2.0-flash"`, `decision_path.confidence = <score>`
- LLM failure → fallback: `decision_path.route = "fallback"`, `decision_path.fallback_reason = "llm_timeout" | "parse_error" | "rate_limit" | "low_confidence"`

**FR-B5**: Audit log MUST always be populated (regardless of LLM success/failure):
- Include `decision_path` in full detail so downstream observers can replay the decision

---

### Scope C: Email-Only Dispatcher Pattern

**FR-C1**: A dedicated `notification_jobs` table MUST exist in Supabase with schema:
```sql
notification_jobs (
  id UUID PRIMARY KEY,
  class_id UUID NOT NULL,
  teacher_id UUID,
  job_type ENUM('email_warning', 'email_critical') NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  status ENUM('pending', 'sent', 'failed', 'retrying') DEFAULT 'pending',
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  error_reason TEXT,
  created_at TIMESTAMP DEFAULT now(),
  sent_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT now()
)
```

**FR-C2**: `climate-agent-main` workflow MUST NOT send emails directly; instead:
- After SUCCESS on `recommendation` insert, Fallback Policy Engine checks `policy_level`
- If `policy_level = WARNING` or `CRITICAL`: INSERT job to `notification_jobs`
- Defer all Resend API calls to separate dispatcher workflow (future)

**FR-C3**: Job creation logic MUST set:
- `subject`: emoji + Thai text (from template)
- `html_body`: formatted HTML (from template)
- `recipient_email`: from teacher_profiles (or fallback to $env.EMAIL_TEACHER for MVP)
- `status = "pending"`
- `retry_count = 0`

**FR-C4**: Rate limiting for Resend MUST be:
- Max 1 email per 500ms (2 req/sec theoretical max)
- On 429 response: exponential backoff (1s, 2s, 4s, 8s)
- Max 3 retries per job before marking as `failed`
- Log all retries in `error_reason` field

**FR-C5**: `climate-agent-main` MAY include a synchronous Resend call (for MVP) with built-in retry:
- Use `Split In Batches` (1 item) + `Wait(500ms)` to throttle
- Update `notification_jobs` status after send attempt
- On persistent failure (>3 retries): mark `status = failed`, do NOT block workflow

**FR-C6**: Email template for WARNING:
```
Subject: ⚠️ [Climate Agent] พบสัญญาณเตือนห้องเรียนวันนี้
From: $env.EMAIL_FROM
To: <teacher_email>

HTML Body:
<h2>⚠️ สภาพบรรยากาศห้องเรียนควรให้ความสนใจ</h2>
<p>{recommendation_content}</p>
<table>
  <tr><td>Policy Level</td><td>{policy_level}</td></tr>
  <tr><td>Confidence</td><td>{confidence_score}</td></tr>
  <tr><td>Category</td><td>{category}</td></tr>
</table>
<p><a href="{DASHBOARD_URL}/teacher/recommendations">ดูรายละเอียดและอนุมัติ</a></p>
<footer>Climate Agent | Automation & Analytics | 2026</footer>
```

**FR-C7**: Email template for CRITICAL (same as WARNING but with urgent framing):
```
Subject: 🚨 URGENT [Climate Agent] บรรยากาศน่าเป็นห่วง
...
<h2>🚨 สภาพบรรยากาศห้องเรียนท้องมีปัญหาสำคัญ</h2>
...
```

**FR-C8**: No emails sent for ROUTINE policy level (dashboard-only).

---

### Scope D: Audit, ISR & Context Propagation

**FR-D1**: `trigger_time` field in audit log MUST be populated from Schedule Trigger execution time:
- Value: `$now.toISO()` (Luxon, Asia/Bangkok timezone)
- Not from execution completion; use trigger start time

**FR-D2**: `triggered_by` field MUST be set to:
- `"schedule:climate-agent-main"` for automated workflows
- Future: `"manual:teacher_{{teacher_id}}"` if teacher manually requests briefing
- Not null; always populated

**FR-D3**: Teacher context propagation (end-to-end):
- Schedule Trigger → (implicit: no specific teacher selected; applies to all enrolled classes)
- Aggregation RPC returns class_id (implies teacher_id via class_enrollments)
- Recommendation INSERT includes: class_id (from RPC), optionally teacher_id (derived from class)
- Email routing via `notification_jobs.teacher_id`
- Audit log includes derived teacher_id for later filtering

**FR-D4**: ISR (Incremental Static Regeneration) webhook MUST be called after successful `recommendation` insert:
- **Target**: `POST /api/webhooks/climate/recommendation-created`
- **Payload**:
  ```json
  {
    "event": "recommendation.created",
    "class_id": "<uuid>",
    "teacher_id": "<uuid>",
    "recommendation_id": "<uuid>",
    "policy_level": "WARNING" | "CRITICAL" | "ROUTINE",
    "timestamp": "<ISO8601>"
  }
  ```
- **Behavior**: Fire-and-forget; on error, log but do NOT block workflow
- **Purpose**: Trigger Next.js dashboard ISR to refresh teacher's recommendation list in real-time

**FR-D5**: Next.js webhook handler MUST:
- Accept recommendation event payload
- Call `revalidatePath('/teacher/recommendations')`
- Return 2xx immediately (async refresh in background)
- Log any revalidation errors to Supabase audit table

**FR-D6**: Audit log MUST be populated for EVERY execution (success or partial failure):
- Even if email send fails, audit log is inserted
- Even if ISR webhook times out, main recommendation & audit are committed
- Provides non-repudiation and full replay capability

---

## 4. Key Entities & Data Contracts

### 4.1 Recommendation Row (Supabase)

```sql
recommendations (
  id UUID PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES classes(id),
  teacher_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL (Thai or multi-lang),
  status ENUM('pending', 'approved', 'dismissed', 'completed') DEFAULT 'pending',
  policy_level ENUM('ROUTINE', 'WARNING', 'CRITICAL') NOT NULL,
  confidence_score NUMERIC(3,2) (0.0–1.0),
  priority INT (1–5, derived from policy_level),
  category TEXT (e.g., "mood_recovery", "discipline_management"),
  ai_generated BOOLEAN DEFAULT true,
  ai_model TEXT ('gemini-2.0-flash' or fallback engine),
  reasoning TEXT (explanation of why this recommendation),
  inquiry_mode BOOLEAN DEFAULT false (true if teacher feedback requested),
  fallback_used BOOLEAN DEFAULT false (true if rule-based fallback),
  created_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  feedback TEXT (optional teacher comment on outcome),
  metadata JSONB (future: extensible fields),
  created_by TEXT DEFAULT 'automation:climate-agent-main'
)
```

### 4.2 Audit Log Row (Supabase)

```sql
n8n_audit_logs (
  id UUID PRIMARY KEY,
  workflow_id TEXT NOT NULL ('L53y2qzWe6RGIUwB'),
  execution_id TEXT NOT NULL (from n8n),
  class_id UUID NOT NULL,
  teacher_id UUID (derived, may be null for pilot),
  policy_selected ENUM('ROUTINE', 'WARNING', 'CRITICAL'),
  confidence_score NUMERIC(3,2),
  decision_path JSONB (
    {
      "route": "fallback" | "llm",
      "rule": "mood_threshold" | "<llm_prompt_name>",
      "avg_mood_score": 2.5,
      "selected_policy": "WARNING",
      "fallback_reason": "llm_timeout" | null,
      "llm_model": "gemini-2.0-flash" | null,
      "timestamp": "2026-03-21T07:32:00Z"
    }
  ),
  trigger_time TIMESTAMP (when execution started),
  triggered_by TEXT ('schedule:climate-agent-main'),
  created_at TIMESTAMP DEFAULT now()
)
```

### 4.3 Teacher Metrics RPC Output

```json
{
  "class_id": "<uuid>",
  "teacher_id": "<uuid>",
  "dismissal_rate": 0.35,
  "total_recommendations": 12,
  "approved_count": 8,
  "dismissed_count": 4,
  "avg_approval_time_hours": 2.5,
  "high_dismissal": false,
  "inquiry_mode_suggested": false,
  "avg_mood_score": 3.2,
  "total_surveys": 45,
  "date_range": "2026-03-07T00:00:00Z / 2026-03-21T23:59:59Z"
}
```

### 4.4 Past Recommendations RPC Output

```json
{
  "class_id": "<uuid>",
  "summary": {
    "total_recommendations": 12,
    "approved_count": 8,
    "dismissed_count": 4,
    "approval_rate": 0.67,
    "dismissal_rate": 0.33,
    "pending_count": 0
  },
  "top_categories": [
    { "category": "mood_recovery", "count": 5 },
    { "category": "discipline_management", "count": 4 },
    { "category": "engagement_boost", "count": 3 }
  ],
  "recent_approvals": [
    { "id": "<uuid>", "content": "...", "feedback": "..." }
  ]
}
```

### 4.5 ISR Webhook Payload

```json
{
  "event": "recommendation.created",
  "class_id": "<uuid>",
  "teacher_id": "<uuid>",
  "recommendation_id": "<uuid>",
  "policy_level": "WARNING",
  "timestamp": "2026-03-21T07:33:15Z",
  "workflow_id": "L53y2qzWe6RGIUwB",
  "execution_id": "<n8n_execution_id>"
}
```

---

## 5. Node-by-Node Current Implementation

## 5. Node-by-Node Current Implementation

- **Node 1: Daily Climate Check Trigger**
  - **Type**: Schedule Trigger
  - **Cron**: `30 7 * * 1-5` (07:30 Mon-Fri)
  - **Timezone**: Asia/Bangkok
  - **Output**: Triggers main chain once per day on weekdays

- **Node 2: Check School Day**
  - **Type**: IF
  - **Condition**: `$now.toFormat('c').toNumber() >= 1` AND `$now.toFormat('c').toNumber() <= 5`
  - **Routing**: TRUE → continue | FALSE → stop (dead end, no recommendations generated)
  - **Purpose**: Skip weekends; prevent accidental triggering on unscheduled days

- **Node 3: Get Aggregated Climate Data**
  - **Type**: HTTP Request
  - **URL**: `$env.SUPABASE_URL/rest/v1/rpc/get_aggregated_climate_data`
  - **Auth**: Header Auth → Supabase Service Role (`Authorization: Bearer $env.SUPABASE_SERVICE_KEY`)
  - **Body**: `{ "p_date": "$now.toFormat('yyyy-MM-dd')", "p_min_n": 3 }`
  - **Output**: `class_id`, `avg_mood_score`, `total_responses`, mood category breakdowns
  - **RLS**: Enforced inside Supabase; returns only aggregates

- **Node 4: Validate n >= 3**
  - **Type**: IF
  - **Condition**: `$json.total_responses >= 3`
  - **Routing**: FALSE → Insert Error Log → stop | TRUE → continue
  - **Purpose**: K-anonymity gate; reject if insufficient data

- **Node 5–6: Tool: Get Teacher Metrics & Tool: Get Past Recommendations**
  - **Type**: Execute Sub-Workflow (SCOPE A: to be promoted from LangChain if currently nested)
  - **Sub-workflow IDs**: 
    - Get Teacher Metrics: `3FdK3o7eBUjd56aT`
    - Get Past Recommendations: `mDagGr7MWDHFEhES`
  - **Inputs**: `class_id`, `teacher_id` (derived from class_id via enrollments)
  - **Outputs**: Metrics and summary objects (as per 4.3, 4.4)
  - **Status**: Exists but output NOT consumed by main chain (Scope A target)

- **Node 7: Climate Analysis Agent**
  - **Type**: LangChain Agent (Gemini 2.0 Flash)
  - **Model**: Google Gemini 2.0 Flash
  - **Status**: Currently hitting 429 rate-limit; fallback is primary path
  - **Inputs**: `avg_mood_score`, optionally metrics and past recommendations
  - **Expected Output**: `{ policy_level, confidence_score, recommendation_text, reasoning, actions_json, inquiry_mode }`
  - **Note**: LLM is placeholder for future resilience (Scope B)

- **Node 8: Check AI Confidence**
  - **Type**: IF
  - **Condition**: `$json.confidence >= 0.65` OR LLM call failed
  - **Routing**: FALSE (low confidence or error) → Fallback Policy Engine | TRUE → use LLM output
  - **Purpose**: Gate to fallback when LLM is unreliable

- **Node 9: Fallback Policy Engine**
  - **Type**: Code Node (JavaScript)
  - **Logic**: 
    - Attempt to parse LLM output JSON (handle wrapped ```json ... ```)
    - If parse fails or required fields missing: apply rule-based thresholds
    - Rule-based: `avg_mood_score <= 2` → CRITICAL | `<= 3` → WARNING | else → ROUTINE
  - **Outputs**: 
    - `policy_level` ∈ {ROUTINE, WARNING, CRITICAL}
    - `confidence_score` (0.5 for fallback, 0.65+ for LLM)
    - `recommendation_content` (Thai directive or inquiry question)
    - `reasoning` (rule or LLM explanation)
    - `decision_path` (includes route, rule, avg_mood_score, selected_policy, timestamp)
  - **Future (Scope A)**: Accept metrics and compute `inquiry_mode = true` if dismissal_rate > 0.6
  - **Future**: Consume past recommendations context for personalization

- **Node 10: Route by Policy Level**
  - **Type**: Switch
  - **Cases**: ROUTINE (dashboard-only) | WARNING (insert + email) | CRITICAL (insert + urgent email)
  - **Routing**: Each case flows to Insert Draft Recommendation → [optional email] → Insert Audit Log

- **Node 11: Check Frequency Limits (per-class, per-teacher)**
  - **Type**: HTTP Request (RPC: `check_frequency_limit`)
  - **Parameters**: `class_id`, `p_max_daily: 2`, `p_max_weekly: 5`
  - **Output**: `allowed: true/false`, reason
  - **Behavior**: If false, stop execution (no recommendation inserted, no email sent)
  - **Status**: Wired but not fully reflected in `decision_path` (Scope D target)

- **Node 12: Insert Draft Recommendation**
  - **Type**: HTTP Request (POST `/rest/v1/recommendations`)
  - **Auth**: Supabase Service Role
  - **Body**:
    ```json
    {
      "class_id": "$json_from_rpc.class_id",
      "content": "$json.recommendation_content",
      "policy_level": "$json.policy_level",
      "confidence_score": "$json.confidence_score",
      "priority": "<derived from policy_level>",
      "category": "<category from recommendation>",
      "ai_generated": true,
      "ai_model": "gemini-2.0-flash",
      "reasoning": "$json.reasoning",
      "inquiry_mode": "$json.inquiry_mode",
      "fallback_used": "$json.fallback_used",
      "status": "pending"
    }
    ```
  - **Output**: Inserted `recommendations` row with `id`, `created_at`
  - **RLS**: Service role can insert

- **Node 13: Trigger ISR Webhook (future, Scope D)**
  - **Type**: HTTP Request (POST `https://<your-next-js-domain>/api/webhooks/climate/recommendation-created`)
  - **Payload**: Recommendation created event (as per 4.5)
  - **Behavior**: Fire-and-forget; on error log but don't block
  - **Status**: NOT YET IMPLEMENTED

- **Node 14–15: Email Notification (WARNING + CRITICAL)**
  - **Type**: HTTP Request (POST `https://api.resend.com/emails`) OR Split In Batches + Wait + Resend node
  - **For WARNING**: 
    - `from`: `$env.EMAIL_FROM`
    - `to`: `$env.EMAIL_TEACHER` (temp; future: derived teacher email)
    - `subject`: `"⚠️ [Climate Agent] พบสัญญาณเตือนห้องเรียนวันนี้"`
    - `html`: Formatted Thai body with recommendation + CTA link
  - **For CRITICAL**:
    - Same flow, urgent subject: `"🚨 URGENT [Climate Agent] บรรยากาศน่าเป็นห่วง"`
  - **Rate Limiting**: Split In Batches (1 item/batch) + Wait (500ms) to avoid 429
  - **Future (Scope C)**: Create `notification_jobs` instead of sending directly
  - **Status**: WARNING wired end-to-end; CRITICAL wired but prone to 429

- **Node 16: Insert Audit Log**
  - **Type**: HTTP Request (POST `/rest/v1/n8n_audit_logs`)
  - **Auth**: Supabase Service Role
  - **Body**:
    ```json
    {
      "workflow_id": "$workflow.id",
      "execution_id": "$execution.id",
      "class_id": "$json.class_id",
      "policy_selected": "$json.policy_level",
      "confidence_score": "$json.confidence_score",
      "decision_path": "$json.decision_path",
      "trigger_time": "$now.toISO()",
      "triggered_by": "schedule:climate-agent-main"
    }
    ```
  - **Purpose**: Full audit trail for non-repudiation + replay capability
  - **Status**: Implemented for all policy levels

---

## 6. Success Criteria (Measurable Outcomes)

### Section 6.1: Sense & Aggregate Loop (Loop0–1)

- **SC-001**: 100% of school days trigger collection within ±5 minutes of 07:30 AM
- **SC-002**: 100% of collected aggregates meet k-anonymity (n ≥ 3)
- **SC-003**: Aggregation latency ≤30 seconds from trigger to RPC return

### Section 6.2: Reasoning Loop (Loop2)

- **SC-004**: 100% of executions populate `decision_path` in audit log (for replay)
- **SC-005**: Fallback rule-based engine produces output within 2 seconds
- **SC-006**: LLM confidence threshold (0.65) correctly routes to fallback when LLM fails
- **SC-007**: Rule-based mood thresholds align with teacher-perceived climate (validation via teacher feedback)

### Section 6.3: Inquiry Mode (Scope A)

- **SC-008**: When `dismissal_rate > 0.6`, `inquiry_mode = true` in ≥90% of cases
- **SC-009**: Inquiry mode recommendations receive ≥40% optional feedback (vs. <15% for directive)
- **SC-010**: Teacher responds to inquiry within average 24 hours

### Section 6.4: Action & Notification Loop (Loop3)

- **SC-011**: 100% of WARNING & CRITICAL recommendations trigger Resend email within 5 minutes
- **SC-012**: Email delivery: ≥95% of emails delivered (Resend SLA); retry on 429 with exponential backoff
- **SC-013**: Zero raw student data in recommendation content or email body
- **SC-014**: Email CTA link correctly routes to dashboard approval UI

### Section 6.5: Self-Evaluation & Learn (Loop4–5)

- **SC-015**: ≥70% of recommendations receive teacher action (approve/dismiss) within 48 hours
- **SC-016**: Teacher dismissal feedback stored successfully in ≥90% of dismiss events
- **SC-017**: Dismissed recommendations do NOT block future recommendations (frequency guard still enforced but not suppressed by single dismiss)

### Section 6.6: Audit & Transparency (Scope D)

- **SC-018**: 100% of executions insert audit log (even on partial failure)
- **SC-019**: `decision_path` JSONB fully populated with route, rule, confidence, timestamp
- **SC-020**: ISR webhook called within 5 seconds of recommendation insert (when implemented)

---

## 7. Privacy & Safety Constraints

### Data Minimization

- ✅ **No raw student names, IDs, or individual mood scores** in recommendations, emails, or audit logs
- ✅ **Only aggregates** (class-level `avg_mood_score`, category breakdowns) used in reasoning
- ✅ **K-anonymity n ≥ 3** enforced at Supabase RPC level before data reaches n8n

### Audit Trail

- ✅ **Full decision replay**: `decision_path` JSONB captures route (LLM vs. fallback), rule/prompt, thresholds, confidence, timestamp
- ✅ **Non-repudiation**: Every execution logged to `n8n_audit_logs`; accessible for compliance review
- ✅ **Retention**: Keep audit logs for 2 years; recommendation feedback for 1 year

### Human-in-the-Loop

- ✅ **No unsupervised action**: AI generates recommendations only; teacher approves on dashboard before implementation
- ✅ **Teacher agency**: Dashboard displays full transparency—recommendation text, confidence, decision reasoning, past similar recommendations
- ✅ **Opt-out**: Teacher can dismiss (single-click) or switch class to inquiry mode (explicit pause on directives)

### Email Security

- ✅ **From/To**: Use `$env.EMAIL_FROM` and teacher's registered email (future: pulled from teacher_profiles, validated)
- ✅ **No credentials in logs**: Email content sanitized; no auth tokens, API keys, or student data embedded
- ✅ **Rate limiting**: Resend rate-limit (2 req/sec) respected; exponential backoff on 429

---

## 8. Error Handling & Resilience

### Non-Fatal Failure Modes

| Failure | Fallback | Impact |
|---------|----------|--------|
| LLM timeout (Gemini 429) | Rule-based fallback | Recommendation still generated, confidence = 0.5 |
| Aggregation RPC fails | Retry 2x with backoff; stop if fails | No recommendation that day |
| Resend email 429 | Retry 3x exponential backoff; mark job failed | Recommendation inserted but email delayed; logged |
| ISR webhook timeout | Fire-and-forget; log error | Dashboard refresh delayed <1 min |
| Metrics RPC fails (Scope A) | Treat as dismissal_rate = 0; no inquiry mode | Fallback to directive recommendation |
| k-anonymity check fails | Stop execution, log, alert ops | No recommendation safety-first |

### Fatal Failure Modes (Halt Workflow)

- Supabase service role auth fails
- Database connection timeout (sustained >30s)
- n8n memory exhaustion

---

## 9. Testing & Validation (Scope D)

### Unit Tests

- Fallback rule-based engine: avg_mood → policy_level
- Inquiry mode logic: dismissal_rate + recommendation_count → inquiry_mode flag
- decision_path JSONB construction

### Integration Tests

- Aggregation RPC → Fallback Engine → Recommendation INSERT → Audit log
- Email formatting (Thai, no raw student data)
- Frequency guard enforced

### E2E Tests

- Dashboard approval workflow: recommendation appears → teacher clicks Approve → recommendation.status updates
- Dismissal metric calculation: dismissal_count increments on Dismiss action

### UAT (Teacher Feedback)

- Is directive tone recommendations effective?
- Do inquiry mode prompts feel appropriate?
- Email delivery reliable? Read rates?

---

## 10. Future Roadmap (Out of Scope, This Iteration)

- \[ \] Separate dispatcher workflow (climate-agent-dispatcher) with dedicated `notification_jobs` processing
- \[ \] Per-teacher email routing via teacher_profiles
- \[ \] LLM provider switch (OpenAI GPT-4o-mini, Claude Haiku) with retry/fallback
- \[ \] Multi-language support (Thai + English)
- \[ \] Predictive anomaly detection (W08)
- \[ \] Dashboard analytics: recommendation effectiveness trends
- \[ \] Teacher feedback sentiment analysis for personalization (Loop5)

---

## 11. Luxon Expression Standards (ADR-05)

- ✅ `$now.toFormat('yyyy-MM-dd')`
- ✅ `$now.toFormat('c').toNumber()`
- ✅ `$now.toISO()`
- ✅ `$now.toISO().split('T')[0]` (for date-only)
- ❌ `$now.format('YYYY-MM-DD')`
- ❌ `$now.weekday()`
- ❌ `$now.unix()`

---

## Appendix: Agentic Design Checklist

- ✅ Loop Stage Mapping: Loop0 (Sense) → Loop1 (Aggregate) → Loop2 (Reason/Fallback) → Loop3 (Act) → Loop4 (Evaluate) → Loop5 (Learn)
- ✅ Agent Autonomy: L2 (decision-making); human approval gate on actions
- ✅ Tool Isolation: Data retrieval via dedicated RPCs/sub-workflows; LLM invoked only for suggestions
- ✅ Privacy by Design: K-anonymity, no raw student data, audit trail
- ✅ Resilience: Fallback rules, retry logic, graceful degradation on LLM failure
- ✅ Transparency: `decision_path` fully captured; teacher sees all reasoning on dashboard
- ✅ Human Partnership: Inquiry mode, dismissal tracking, adaptive suggestions (future Loop5)
