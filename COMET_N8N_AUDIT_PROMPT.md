# COMET N8N AUDIT PROMPT
## Class Climate & Collaboration — n8n Workflow Inspection

---

## 📋 CONTEXT & CRITICAL CONSTRAINTS

**Project**: Agentic AI System for Class Climate & Collaboration (Early Warning System)

**Current Phase**: Production-ready v4

**n8n Instance URL**: `https://sclerotomic-octavia-unsingularly.ngrok-free.dev/projects/MYClj1mmM5lJKkdC/workflows`

**n8n Version**: v2.8.3 (Docker, local)

---

### ⚖️ 8 CRITICAL BUSINESS LOGIC CONSTRAINTS (DO NOT VIOLATE)

**[C1] One Trigger Rule**
- Each workflow MUST have exactly ONE active trigger (never multiple)
- Status check: All triggers must sum to ≤1 per workflow

**[C2] Agentic AI Pattern**
- NEVER call Gemini API directly via HTTP or raw connection
- ALWAYS use `langchain.agent` node + `toolWorkflow` nodes for DB/RPC isolation
- LLM must orchestrate tools, never bypass tools for direct API calls

**[C3] k-Anonymity (k ≥ 3)**
- Aggregate metrics MUST NOT expose data if enrollment < 3
- Any workflow querying student data must return `NULL` or `privacy_locked: true` if n < 3
- Example: health score calculation requires ≥3 students per school

**[C4] Human-in-the-Loop**
- AI NEVER sends messages/recommendations/alerts directly (e.g., email, Slack, webhook)
- Teachers MUST explicitly approve every AI-generated recommendation
- No auto-send policies allowed

**[C5] Hybrid Scoring**
- AI recommendations must combine 60% LLM reasoning + 40% rule-based logic
- System prompt must document both components

**[C6] Notify Threshold**
- Only notify teacher when BOTH conditions met:
  - `risk_level >= HIGH` (not medium/low)
  - `confidence >= 0.7` (70%+)
- Document threshold checks in code nodes or RPC

**[C7] Data Retention**
- Raw student text → retain 60 days, then redact/delete
- Audit logs → retain 2 years
- Workflows must not violate these windows

**[C8] No Empty Credentials**
- ANY node with `"credentials": {}` (empty object) = RUNTIME FAILURE
- Every DB node, SendGrid node, HTTP node MUST have credentials configured

---

### 🔄 WORKFLOW INVENTORY TO AUDIT

| ID | Name | Trigger | Expected Purpose |
|----|------|---------|------------------|
| **W01** | Agentic AI Recommendation | Schedule: Mon 06:00 | Generate AI-drafted recommendations PerClass using langchain.agent + 6 tools |
| **W02** | Loop Closure Notification | Webhook (Supabase) | Notify students when teacher approves recommendation |
| **W03** | Friday Student Reminder | Schedule: Fri 15:00 | Nudge students (<50% participation) to submit check-ins |
| **W04** | Sunday Health Score | Schedule: Sun 09:00 | Calculate school-wide health metrics, alert if <40 |
| **W05** | Weekly Teacher Email Summary | Schedule: Mon 07:00 | Email teachers list of pending AI recommendations |
| **tool-get-climate-summary** | Tool: Get Climate Summary | Execute Workflow Trigger | (sub) Fetch `get_class_climate_summary()` RPC |
| **tool-get-past-recommendations** | Tool: Get Past Recommendations | Execute Workflow Trigger | (sub) Fetch past recs from `recommendations` table |
| **tool-get-trend-comparison** | Tool: Get Trend Comparison | Execute Workflow Trigger | (sub) Call `get_trend_comparison()` RPC |
| **tool-count-enrolled-students** | Tool: Count Enrolled Students | Execute Workflow Trigger | (sub) Count from `class_enrollments` |
| **tool-get-teacher-action-rate** | Tool: Get Teacher Action Rate | Execute Workflow Trigger | (sub) Calculate teacher response rate |
| **tool-submit-recommendation** | Tool: Submit Recommendation | Execute Workflow Trigger | (sub) Call `submit_recommendation_safe()` RPC guard |

---

## 🔍 AUDIT PROCEDURE (FOR COMET BROWSER)

**GOAL**: Inspect each workflow, document gaps against constraints, provide UI-level fix instructions.

**DO NOT CHANGE** unless explicitly instructed. This is inspection only.

---

### STEP 1: Navigate to n8n Workflows Page (ONCE)

- Open: `https://sclerotomic-octavia-unsingularly.ngrok-free.dev/projects/MYClj1mmM5lJKkdC/workflows`
- You should see a list of workflow cards (W01, W02, W03, W04, W05, tool-*, archived workflows)
- Note: Some workflows may be "archived" (moved to `/archived` folder in JSON; may not appear in main list)

---

### STEP 2: AUDIT W01 — Agentic AI Recommendation

**OPEN**: Click on "Agentic AI Recommendation" workflow card

**INSPECT TRIGGER**:
- [ ] Verify `Schedule Trigger` exists and is the ONLY active trigger
- [ ] Check trigger rule: `weekday = Monday (1)`, `time = 06:00`
- [ ] No other triggers visible on canvas (Webhook, Manual trigger, etc.)
- **RECORD**: Trigger type & schedule

**INSPECT MAIN FLOW**:
- [ ] After trigger, look for node sequence: `Get Active Classes` (Postgres) → `Loop Over Classes` (Split in Batches) → `Build Agent Context` (Code) → `AI Recommendation Agent` (LangChain Agent)
- [ ] Verify Postgres query selects classes where `pilot_status = true`
- [ ] Check `Loop Over Classes` batch size (should be 1 to process one class at a time)
- **RECORD**: Node count, flow structure

**INSPECT AI AGENT NODE**:
- [ ] Double-click `AI Recommendation Agent` node, inspect settings panel
- [ ] Check `modelName` = `"gemini-2.0-flash"` (NOT raw HTTP call)
- [ ] Check `options.maxIterations` (should be 8 or similar)
- [ ] Check `options.returnIntermediateSteps` = true (for logging)
- [ ] Verify system prompt exists and mentions constraints ([C3] privacy_locked, [C4] human-in-loop, [C1] max pending)
- **RECORD**: Model, iterations, system prompt excerpt

**INSPECT TOOL CONNECTIONS**:
- [ ] On the AI Agent node, look for BLUE DASHED LINES to "Tool" nodes:
  - `Tool: get_climate_summary`
  - `Tool: get_past_recommendations`
  - `Tool: get_trend_comparison`
  - `Tool: count_enrolled_students`
  - `Tool: get_teacher_action_rate`
  - `Tool: submit_recommendation`
- [ ] All 6 should be connected as `ai_tool` type links (NOT `main` links)
- [ ] Verify each tool is of type `@n8n/n8n-nodes-langchain.toolWorkflow`
- **RECORD**: Tool count, connection type

**INSPECT ERROR HANDLING**:
- [ ] Look at the output connector of `Get Active Classes` Postgres node
  - Is there a RED ERROR line going to an error handler node? (should be if production-ready)
- [ ] Same for `AI Recommendation Agent` output
- [ ] Do you see any `IF` nodes checking for empty results or errors?
- **RECORD**: "Yes/No" for error branches; note any missing error handling

**INSPECT FINAL NODES**:
- [ ] After agent output, verify `Parse Agent Output` (Code node)
- [ ] After parsing, verify `Rate Limit Cooldown` (Wait node, 4 seconds)
- [ ] After cooldown, verify loop returns to `Loop Over Classes` (batch continuation)
- [ ] After loop completes, verify `Notify Webhook` (HTTP POST to `/api/n8n/webhook`)
  - Check HTTP method: should be POST, not GET
  - Check headers: Authorization bearer token present?
- **RECORD**: Final node sequence

**INSPECT CREDENTIALS**:
- [ ] On Postgres node: click settings → check if `credentials` field shows "Supabase Postgres" (NOT empty)
- [ ] On LangChain Agent: check if `credentials` references "Google Gemini account" or similar (NOT empty)
- [ ] On HTTP "Notify Webhook": check if auth header references N8N_WEBHOOK_SECRET env var (NOT empty)
- **RECORD**: Credential status (✓ configured or ✗ empty)

---

### STEP 3: AUDIT W02 — Loop Closure Notification

**OPEN**: Click on "Loop Closure Notification" workflow card

**INSPECT TRIGGER**:
- [ ] Verify `Supabase Webhook Trigger` exists and is the ONLY active trigger
- [ ] Check trigger path: should listen for POST on specific webhook path (e.g., `supabase-loop-closure`)
- [ ] No other triggers on canvas
- **RECORD**: Webhook path, trigger count

**INSPECT FLOW**:
- [ ] Look for sequence: `Supabase Webhook Trigger` → `Insert In-App Notifications` (Postgres) → `Notify Next.js Webhook` (HTTP POST)
- [ ] Check `Insert In-App Notifications` SQL: should execute INSERT into `notifications` table for all students in class
- [ ] Check HTTP node method: POST (not GET)
- **RECORD**: Flow structure, SQL action

**INSPECT ERROR HANDLING**:
- [ ] Do you see error lines on any node? (Test if failing is handled gracefully)
- **RECORD**: Error handling present? Yes/No

**INSPECT CREDENTIALS**:
- [ ] Postgres credentials configured?
- [ ] HTTP Authorization header present?
- **RECORD**: Credential status

---

### STEP 4: AUDIT W03 — Friday Student Reminder

**OPEN**: Click on "Friday Student Reminder" workflow card

**INSPECT TRIGGER**:
- [ ] Verify `Schedule Trigger` exists and is the ONLY active trigger
- [ ] Check rule: `weekday = Friday (5)`, `time = 15:00`
- **RECORD**: Trigger schedule

**INSPECT FLOW**:
- [ ] Look for sequence: `Schedule Trigger` → `Get Classes Below 50pct` (Postgres) → [CRITICAL] do you see an IF node before next step?
- [ ] If YES to IF node: check condition (should check if result is not empty)
- [ ] If NO IF node: **RECORD THIS AS GAP** — workflow may fail on empty result
- [ ] After IF (or directly to next node if no IF): `Insert Reminder Notifications` (Postgres)
- [ ] Final node: `Notify Webhook` (HTTP POST)
- **RECORD**: Has empty result check? Yes/No; flow structure

**INSPECT SQL QUERIES**:
- [ ] First Postgres node `Get Classes Below 50pct`: does query calculate participation rate (count pulses / total students < 50%)?
- [ ] Second Postgres node `Insert Reminder Notifications`: does it use NOT EXISTS to avoid duplicate reminders same week?
- **RECORD**: Query logic (participation calculation, duplicate prevention)

**INSPECT CREDENTIALS**:
- [ ] Postgres & HTTP credentials configured?
- **RECORD**: Credential status

---

### STEP 5: AUDIT W04 — Sunday Health Score

**OPEN**: Click on "Sunday Health Score" workflow card

**INSPECT TRIGGER**:
- [ ] Verify `Schedule Trigger` exists and is the ONLY active trigger
- [ ] Check rule: `weekday = Sunday (0)`, `time = 09:00`
- **RECORD**: Trigger schedule

**INSPECT FLOW**:
- [ ] Look for sequence: 
  - `Schedule Trigger` 
  - → `Calculate Health Score` (Postgres: multi-line SQL calculating checkin_rate, loop_closure_rate, teacher_active_rate)
  - → `Compute Final Score` (Code node: `score = checkin*0.4 + loop_closure*0.4 + teacher_active*0.2`)
  - → `Update Schools Health Score` (Postgres: UPDATE schools SET health_score)
  - → `If Score Below 40` (IF node with threshold check)
  - → `Send Slack Alert` (HTTP POST to Slack webhook, only if threshold met)
- **RECORD**: Full node sequence

**INSPECT SCORING LOGIC**:
- [ ] Verify Code node does: `score = (checkin_rate * 0.4) + (loop_closure_rate * 0.4) + (teacher_active_rate * 0.2)` (60%+40% rule-based per [C5])
- [ ] Does scoring have k-anonymity check (skip schools with <3 students)? Look in SQL or Code node.
- **RECORD**: Scoring formula, k-anonymity handling

**INSPECT ERROR HANDLING & IDEMPOTENCY**:
- [ ] After `Compute Final Score`, is there an IF checking if `score changed` before UPDATE? (Idempotency check)
  - If YES: alert only fires if score actually decreased → good
  - If NO: alert could fire every time workflow runs → bad (duplicate alerts)
- **RECORD**: Has idempotency guard? Yes/No

**INSPECT THRESHOLD CHECK**:
- [ ] `If Score Below 40` node: check condition value (should be `< 40`)
- [ ] Branch 0 (true): should go to `Send Slack Alert`
- [ ] Branch 1 (false): should end or do nothing
- **RECORD**: Threshold logic

**INSPECT SLACK ALERT**:
- [ ] HTTP "Send Slack Alert" node: method should be POST
- [ ] URL should point to `{{ $env.SLACK_WEBHOOK_URL }}`
- [ ] JSON body should include health_score value and school_id for debugging
- **RECORD**: Slack integration present? Yes/No; message template

**INSPECT CREDENTIALS**:
- [ ] Postgres credentials OK?
- [ ] Slack webhook URL in env var?
- **RECORD**: Credential status

---

### STEP 6: AUDIT W05 — Weekly Teacher Email Summary

**OPEN**: Click on "Weekly Teacher Email Summary" workflow card

**INSPECT TRIGGER**:
- [ ] Verify `Schedule Trigger` exists and is the ONLY active trigger
- [ ] Check rule: `weekday = Monday (1)`, `time = 07:00` (should be 1 hour after W01)
- **RECORD**: Trigger schedule

**INSPECT FLOW**:
- [ ] Look for sequence:
  - `Schedule Trigger`
  - → `Get Teachers With Pending Actions` (Postgres: SQL JOIN teachers + pending recommendations)
  - → [CRITICAL] do you see `Split in Batches` node? (to loop over multiple teachers)
    - If YES: good → prevents bulk email issue
    - If NO: **RECORD AS GAP** → SendGrid might get array of emails, could fail or send to all teachers at once
  - → `Send Email via SendGrid` (SendGrid node)
  - → `Notify Webhook` (HTTP POST)
- **RECORD**: Has SplitInBatches? Yes/No; flow structure

**INSPECT EMPTY RESULT HANDLING**:
- [ ] Before SendGrid, is there an IF node checking if results not empty?
  - If YES: skip SendGrid/webhook if no teachers → good
  - If NO: **RECORD AS GAP** → blank emails will be sent
- **RECORD**: Has empty check? Yes/No

**INSPECT EMAIL TEMPLATE**:
- [ ] Open SendGrid node → check `toEmail`, `subject`, `contentValue` fields
- [ ] `toEmail` should be `{{ $json.email }}` (loop variable from batch)
- [ ] Email body should mention class name, risk score, pending count, link to `/teacher/actions`
- [ ] Email should NOT contain raw student text (per [C7] and [C4])
- **RECORD**: Email template structure

**INSPECT CREDENTIALS**:
- [ ] Postgres credentials OK?
- [ ] SendGrid API key configured (NOT empty in credentials field)?
- [ ] HTTP auth for webhook?
- **RECORD**: Credential status

---

### STEP 7–12: AUDIT 6 TOOL SUB-WORKFLOWS

**For each tool workflow** (`tool-get-climate-summary`, `tool-get-past-recommendations`, `tool-get-trend-comparison`, `tool-count-enrolled-students`, `tool-get-teacher-action-rate`, `tool-submit-recommendation`):

**OPEN**: Click on tool workflow

**INSPECT TRIGGER**:
- [ ] Should be `Execute Workflow Trigger` (ONLY trigger, never other types)
- **RECORD**: Trigger type

**INSPECT NODES**:
- [ ] Should have minimal structure: `Execute Workflow Trigger` → `Postgres` node (executeQuery or similar) → output
- **RECORD**: Node count & types

**INSPECT POSTGRES QUERY**:
- [ ] Does query call correct RPC or table?
  - `tool-get-climate-summary`: calls `get_class_climate_summary(class_id, weeks)`?
  - `tool-get-past-recommendations`: queries `recommendations` table with LIMIT?
  - `tool-get-trend-comparison`: calls `get_trend_comparison(class_id)`?
  - `tool-count-enrolled-students`: COUNT(*) from `class_enrollments`?
  - `tool-get-teacher-action-rate`: calculates action_rate % from `recommendations`?
  - `tool-submit-recommendation`: calls `submit_recommendation_safe()` with guard?
- [ ] Does query handle parameters correctly (e.g., `{{ $json.class_id }}` not hardcoded)?
- **RECORD**: Query correctness, parameter handling

**INSPECT ERROR HANDLING**:
- [ ] Does tool have error output connector with fallback response?
- [ ] Does tool return structured format (e.g., `{ success: true/false, data, error }`)?
  - If YES: AI agent can parse consistently
  - If NO: **RECORD AS GAP** → agent might misparse empty/error results
- **RECORD**: Error handling present? Return format (JSON vs plain vs NULL)?

**INSPECT EMPTY RESULT HANDLING**:
- [ ] If Postgres returns 0 rows, does tool return default value or null flag?
  - Example: `{ success: true, data: [], empty: true, default_value: { privacy_locked: true } }`
- **RECORD**: Empty handling? Yes/No; default response?

**INSPECT CREDENTIALS**:
- [ ] Postgres credentials configured?
- **RECORD**: Credential status

**SPECIAL CHECK FOR tool-submit-recommendation**:
- [ ] Does RPC `submit_recommendation_safe()` prevent duplicate/overflow?
- [ ] Can you see guard checks in RPC definition (check if class already has ≥3 pending)?
- **RECORD**: Guard present? (may need to check Supabase RPC definition, not just n8n node)

**SPECIAL CHECK FOR tool-get-climate-summary**:
- [ ] Does RPC or tool response include `privacy_locked: true` flag if n < 3?
- **RECORD**: Privacy flag implemented? Yes/No

---

## ✅ FINDINGS TEMPLATE (WHAT TO REPORT)

After completing all audits, compile findings in this format:

---

### WORKFLOW: [W01–W05 / tool-*]

**Current State**:
- Trigger: [type / schedule]
- Main Nodes: [list node names]
- Error Handling: [present / absent]
- Credentials: [✓ configured / ✗ empty]

**Gaps from Constraints**:
- [C_#]: [gap description] — Impact: [risk level HIGH/MEDIUM/LOW]
- [C_#]: [gap description] — Impact: [risk level]
- (repeat for all violated constraints)

**UI-Level Fixes** (step-by-step):
1. [Click > Right-click > Select "Edit"] on node X
2. [Change field Y from Z to W]
3. [Click "Add Step" > Select "IF" node]
4. [Connect output from node A to IF input]
5. [Set IF condition: `jsonata('$count($) > 0')`]
6. [Connect IF branch 0 (true) to node B, branch 1 (false) to node C]
7. [Test by clicking "Execute" > verify output in debug panel]

**Test Instructions** (how to verify fix):
- Manually execute with mock data: [describe setup]
- Expected output: [what should appear in debug panel]
- Slack alert should/shouldn't fire: [specify condition]

---

**OVERALL SUMMARY**:
- Workflows with critical gaps (force refactor): [list]
- Workflows production-ready: [list]
- Most impactful quick wins: [top 3]
- Estimated effort to full compliance: [hours]

---

## 📌 KEY REMINDERS FOR COMET

1. **NO EDITS** unless explicitly instructed after audit
2. **DO click "Execute" for testing** (manual run to verify logic)
3. **DO check debug panel output** to verify data shapes (especially empty results)
4. **DO take screenshots or copy workflow JSON** if you find bugs
5. **DO NOT click "Activate"/"Deactivate"** without approval
6. **DO report ambiguities** (e.g., "Can't find IF node — does it exist elsewhere?")

---

## 🎯 SUCCESS CRITERIA

Your audit is complete when you've reported:

- ✅ Trigger check (correct, only 1) — all 11 workflows
- ✅ Main flow structure (nodes, sequence) — all 11 workflows
- ✅ Constraint gaps ([C1]–[C8]) — prioritized by severity
- ✅ UI fix instructions — step-by-step for each gap
- ✅ Test plan — how to verify fixes work
- ✅ Overall compliance %: current vs. target (after fixes)

---

**END OF PROMPT**

---

## 📌 USAGE INSTRUCTIONS FOR YOU

Copy everything above ("# COMET N8N AUDIT PROMPT" through "END OF PROMPT") and paste into:

1. **Comet Browser tool** (if available in your IDE/environment)
2. **Or any AI chatbot with browser control** (Claude, ChatGPT with extensions, etc.)

The prompt is designed to:
- Guide systematic inspection of all 11 workflows
- Capture findings in a consistent format
- Provide actionable UI-level instructions
- Document gaps against the 8 critical constraints
- Ensure compliance with AGENTS.md requirements

