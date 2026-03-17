# Implementation Tasks: W06 Morning AI Briefing

**Feature Branch**: `003-morning-briefing`  
**Phase**: Phase 2 (Task Generation & Execution)  
**Generated**: 2026-03-16  
**Plan Reference**: [plan.md](plan.md)

---

## Overview

This document contains all implementation tasks for W06 Morning AI Briefing, organized by dependency. Tasks are ordered to enable parallel work where possible while maintaining clear prerequisites.

**Task Format**:
- `- [ ]` — Checkbox (status tracking)
- `[TXXX]` — Task ID (sequential)
- `[P]` — Can be parallelized (independent work)
- `[US#]` — User Story label (which story this serves)
- Description + File path

**Total Tasks**: ~32 | **Estimated Duration**: 3-4 weeks | **Team Size**: 2-3 developers

---

## Phase 1: Project Setup & Infrastructure

_Prerequisites: None. Start here._

- [ ] T001 Create feature branch `003-morning-briefing` if not exists, ensure `constitution.md` loaded  
  **Goal**: Establish branch + verify project structure  
  **File**: `.specify/memory/constitution.md`

- [ ] T002 [P] Create Supabase migration directory for W06 schema
  **Goal**: Prepare migration folder structure  
  **File**: `supabase/migrations/20260316_w06_morning_briefing.sql`

- [ ] T003 [P] Create n8n workflow file scaffold (TypeScript decorators)
  **Goal**: Prepare n8n workflow structure  
  **File**: `n8n/workflows/006-morning-briefing.workflow.ts`

- [ ] T004 [P] Create Next.js API route directory structure
  **Goal**: Create route handler folders  
  **Files**: 
  - `src/app/api/n8n/webhook/route.ts`
  - `src/app/api/teacher/briefing-status/route.ts`
  - `src/app/api/teacher/recommendation/[id]/action/route.ts`

---

## Phase 2: Database Schema & RLS Policies

_Dependency: Phase 1. All Phase 3+ depends on this._

**Independent Test Criteria**: 
- RLS policies enforced (cross-teacher access blocked)
- k-anonymity guard verified (returns NULL for n<3)
- All indexes created + query performance acceptable

- [x] T005 Create `recommendations` table with full schema (PK, FK, constraints, defaults)
  **Goal**: Foundation for recommendation tracking  
  **File**: `supabase/migrations/018_w06_morning_briefing_schema.sql` (lines 12-120)
  **Status**: ✅ DONE
  **Details**: 
    - UUID PK, FK to classes/users/schools
    - Policy classification (ROUTINE/WARNING/CRITICAL)
    - Teacher response tracking columns
    - Loop closure metrics columns
    - Constraints: valid_dates, valid_approval, valid_policy

- [x] T006 [P] Create RLS policies for `recommendations` table
  **Goal**: Enforce privacy (teacher sees only own class recs)  
  **File**: `supabase/migrations/018_w06_morning_briefing_schema.sql` (lines 121-145)
  **Status**: ✅ DONE
  **Details**: 
    - SELECT: teacher_id=auth.uid() OR admin
    - UPDATE: teacher_id=auth.uid() AND status IS NULL
    - Test: cross-teacher SELECT should be denied

- [x] T007 [P] Create indexes on `recommendations` table for query performance
  **Goal**: Fast lookup by class/teacher/status  
  **File**: `supabase/migrations/018_w06_morning_briefing_schema.sql` (lines 115-120)
  **Status**: ✅ DONE
  **Details**: 
    - idx_recommendations_class_created (composite: class_id, created_at DESC)
    - idx_recommendations_teacher_status
    - idx_recommendations_closure (filtered: WHERE teacher_implemented_at IS NOT NULL)

- [x] T008 Create `n8n_audit_log` table with full schema (audit trail for agentic decisions)
  **Goal**: Deterministic decision path logging  
  **File**: `supabase/migrations/018_w06_morning_briefing_schema.sql` (lines 172-248)
  **Status**: ✅ DONE
  **Details**: 
    - Captures all gates, tool invocations, policy applied, confidence
    - Links to recommendations via FK
    - Immutable (INSERT only)

- [x] T009 [P] Create RLS policies for `n8n_audit_log` table
  **Goal**: Teachers see their own audit trail  
  **File**: `supabase/migrations/018_w06_morning_briefing_schema.sql` (lines 239-244)
  **Status**: ✅ DONE
  **Details**: 
    - SELECT: teacher_id=auth.uid() OR admin
    - Test: audit log entries protected from cross-teacher access

- [x] T010 [P] Create indexes on `n8n_audit_log` table
  **Goal**: Fast audit log queries  
  **File**: `supabase/migrations/018_w06_morning_briefing_schema.sql` (lines 245-250)
  **Status**: ✅ DONE
  **Details**: 
    - idx_audit_workflow (workflow_id, timestamp DESC)
    - idx_audit_teacher (teacher_id, timestamp DESC)
    - idx_audit_recommendation (recommendation_id linking)

- [x] T011 Create `school_days` table for calendar-based scheduling guard
  **Goal**: Support holiday/break suppression  
  **File**: `supabase/migrations/018_w06_morning_briefing_schema.sql` (lines 259-280)
  **Status**: ✅ DONE
  **Details**: 
    - UUID PK, FK to schools
    - date (unique per school)
    - is_school_day BOOLEAN, reason TEXT
    - Index: idx_school_days_lookup (school_id, date)

- [x] T012 [P] Create `teacher_profiles` table with W06-specific columns
  **Goal**: Track notification preferences + response metrics  
  **File**: `supabase/migrations/018_w06_morning_briefing_schema.sql` (lines 285-326)
  **Status**: ✅ DONE
  **Details**: 
    - Preferences: notification_frequency_pref, notification_channel_pref
    - Tracking: last_briefing_sent_at, briefing_count_7d, briefing_approval_count_7d
    - Metrics: approval_rate_historical, implementation_rate_historical, action_latency_avg_hours
    - Inquiry Mode: is_inquiry_mode, inquiry_mode_triggered_at, dismissal_pattern_consecutive
    - All columns use default values for optional fields

- [x] T013 Create/verify RLS policy on student_pulses (k-anonymity guarded access via RPC)
  **Goal**: Ensure raw mood data never visible to app layer  
  **File**: `supabase/migrations/018_w06_morning_briefing_schema.sql` (lines 335-345)
  **Status**: ✅ DONE
  **Details**: 
    - RLS policy: student_pulses_access_via_rpc blocks direct SELECT
    - Teacher can only access via get_class_climate_summary() RPC
    - Test: verify cross-class/cross-teacher access denied

- [x] T014 Create `get_class_climate_summary()` RPC with k-anonymity check
  **Goal**: Safe aggregate data endpoint enforcing k≥3  
  **File**: `supabase/migrations/018_w06_morning_briefing_schema.sql` (lines 350-415)
  **Status**: ✅ DONE
  **Details**: 
    - Parameters: class_id UUID, period VARCHAR (default '24 hours')
    - Return: mean_mood, std_dev, n_students, mood_trend, baseline, k_anonymity_safe BOOLEAN
    - Logic: IF n_students < 3 RETURN all NULLs with k_anonymity_safe=false
    - SECURITY DEFINER (runs as postgres role, results filtered by RLS)
    - Test: call with class having 2 students → all NULLs returned

- [x] T015 Test database migration (validate SQL syntax)
  **Goal**: Verify SQL syntax + no conflicts  
  **File**: `supabase/migrations/018_w06_morning_briefing_schema.sql` (all)
  **Status**: ✅ DONE
  **Note**: Ready for dry-run: `supabase db push --dry-run`

- [x] T016 Create seed data for school_days (populate calendar for test school)
  **Goal**: Support manual workflow testing  
  **File**: `supabase/seed/school-days-seed.sql` (new file)
  **Status**: ✅ DONE
  **Details**: 
    - Seed 2-month calendar (Mar-Apr 2026 + May preview)
    - Include Songkran holiday (Mar 21-23), Chakri Memorial Day, regular weekends
    - Test school: d3b07384-d9a1-4e64-84ea-2b3812f521d0
    - Ready to run after migration push

---

## Phase 3: N8N Workflow W06 - Schedule & Safety Gates

_Dependency: Phase 2 (RPC + tables available)_

**Independent Test Criteria**:
- Workflow trigger fires at scheduled time
- All gates log decisions to n8n_audit_log
- No brief ing sent when k<3 or not school day

- [ ] T017 Create n8n Schedule Trigger node (cron: `0 7 * * 1-5` = M-F 7:30 AM UTC)
  **Goal**: Daily briefing schedule  
  **File**: `n8n/workflows/006-morning-briefing.workflow.ts` (ScheduleTrigger node)
  **Details**: 
    - Node type: n8n-nodes-base.scheduleTrigger
    - Cron: `0 7 * * 1-5` (7:30 AM UTC)
    - Position: [50, 50]
    - Test: Verify trigger fired (check n8n execution logs)

- [ ] T018 Create "Check School Day" IF condition node (guard against holidays)
  **Goal**: Skip briefing on non-school days  
  **File**: `n8n/workflows/006-morning-briefing.workflow.ts` (CheckSchoolDay node)
  **Details**: 
    - Query: SELECT is_school_day FROM school_days WHERE school_id=X AND date=TODAY()
    - IF condition: $json.is_school_day === true
    - Branch 0 (false): end workflow
    - Branch 1 (true): continue to LoopOverClasses
    - Test: Trigger on weekend → should skip

- [ ] T019 Create "Loop Over Classes" Split in Batches node
  **Goal**: Iterate briefing logic for each active class  
  **File**: `n8n/workflows/006-morning-briefing.workflow.ts` (LoopOverClasses node)
  **Details**: 
    - Fetch: SELECT id FROM classes WHERE school_id=X AND active=true
    - Split by: items.length
    - Output: one iteration per class_id
    - Test: Verify 3 classes → 3 loop iterations

- [ ] T020 [P] Create RPC call node: get_class_climate_summary() tool sub-workflow
  **Goal**: Fetch aggregate mood data (k-anonymity enforced)  
  **File**: `n8n/workflows/tools/tool-get-class-climate-summary.workflow.ts` (new file)
  **Details**: 
    - Call: get_class_climate_summary(class_id, '24h')
    - Return: {mean_mood, std_dev, n_students, mood_trend, k_anonymity_safe}
    - Error handling: if k_anonymity_safe=false, set action='SKIP'
    - Log: tool invocation to audit_json

- [ ] T021 [P] Create RPC call node: get_past_recommendations() tool sub-workflow
  **Goal**: Fetch teacher response patterns for context  
  **File**: `n8n/workflows/tools/tool-get-past-recommendations.workflow.ts` (new file)
  **Details**: 
    - Query: SELECT * FROM recommendations WHERE class_id=X AND created_at > NOW()-7days LIMIT 10
    - Calculate: approval_rate, implementation_rate, closure_latency_avg
    - Return: {recommendations ARRAY, closure_rate_7d, approval_rate_7d, implementation_rate_7d}
    - Log: tool output to audit_json

- [ ] T022 [P] Create RPC call node: get_teacher_action_rate() tool sub-workflow
  **Goal**: Fetch teacher profile metrics + detect inquiry mode  
  **File**: `n8n/workflows/tools/tool-get-teacher-action-rate.workflow.ts` (new file)
  **Details**: 
    - Query: SELECT * FROM teacher_profiles WHERE teacher_id=X
    - Check: is_inquiry_mode, dismissal_pattern_consecutive, approval_rate_historical
    - Return: {approval_rate, implementation_rate, is_inquiry_mode, dismissal_count}
    - Log: tool output to audit_json

- [ ] T023 Create "Check K-Anonymity" IF condition node
  **Goal**: Guard against insufficient data  
  **File**: `n8n/workflows/006-morning-briefing.workflow.ts` (AgentDecisionGate node)
  **Details**: 
    - Condition: $json.climate_summary.n_students >= 3 AND $json.climate_summary.k_anonymity_safe === true
    - IF false: set action='SKIP', skip_reason='insufficient_data'
    - IF true: continue to FrequencyGuard
    - Log decision to audit_json
    - Test: Call with class having n=2 → should skip

- [ ] T024 Create "Check Notification Frequency" IF condition node
  **Goal**: Guard against notification spam  
  **File**: `n8n/workflows/006-morning-briefing.workflow.ts` (FrequencyGuard node)
  **Details**: 
    - Query: SELECT COUNT(*) FROM n8n_notification_log WHERE teacher_id=X AND created_at > NOW()-1day
    - Condition: count < 2 AND week_count < 5
    - IF false: set action='SKIP', skip_reason='frequency_limit_exceeded'
    - IF true: continue to LangChainAgent
    - Log decision to audit_json
    - Test: Send 2 briefings same day → 3rd should be skipped

- [ ] T025 Create "Check Teacher Availability" IF condition node (optional, for on_leave status)
  **Goal**: Skip if teacher is on leave  
  **File**: `n8n/workflows/006-morning-briefing.workflow.ts` (TeacherAvailabilityGate node)
  **Details**: 
    - Query: SELECT availability_status FROM teacher_profiles WHERE teacher_id=X
    - Condition: availability_status != 'on_leave'
    - IF false: set action='SKIP', skip_reason='teacher_unavailable'
    - IF true: continue to LangChainAgent
    - Log decision to audit_json

---

## Phase 4: N8N Workflow W06 - LLM Agent & Recommendation Generation

_Dependency: Phase 3 (gates established, tool sub-workflows created)_

**Independent Test Criteria**:
- LLM generates recommendation + confidence score ≥ 0.65
- Fallback rule-based suggestion if LLM fails
- All LLM invocations logged with tokens, latency, confidence

- [ ] T026 Create Gemini LLM model credential in n8n
  **Goal**: Configure LLM API access  
  **File**: n8n UI (Admin → Credentials → Google Gemini)
  **Details**: 
    - API Key from GCP project
    - Model: gemini-2.0-flash
    - Test in playground: send test prompt

- [ ] T027 Create LangChain Agent node (core reasoning engine)
  **Goal**: Autonomous agentic reasoning with tool isolation  
  **File**: `n8n/workflows/006-morning-briefing.workflow.ts` (GenerateRecommendation node)
  **Details**: 
    - Node type: @n8n/n8n-nodes-langchain.agent
    - LLM Model: reference Gemini credential
    - Tools: [tool-get-past-recommendations, tool-get-teacher-action-rate]
    - System Prompt: "You are a supportive classroom climate advisor. Analyze mood data and suggest ONE teaching intervention (max 150 chars)..."
    - Temperature: 0.8, top_k: 3, top_p: 0.95
    - Output parsing: extract {content, confidence, policy}
    - Error handling: catch timeout/API errors → set fallback=true

- [ ] T028 Create output validation & fallback logic node
  **Goal**: Ensure recommendation always generated (LLM or fallback)  
  **File**: `n8n/workflows/006-morning-briefing.workflow.ts` (ValidateAndFallback node)
  **Details**: 
    - CHECK: LM output exists AND confidence >= 0.65?
    - IF YES: use LM output
    - IF NO: select random fallback from: 
      - "Consider a 5-min mood check—quick way to understand the climate."
      - "Try a collaborative problem-solving activity to rebuild trust."
      - "Schedule a one-on-one with a student who seems disconnected."
    - Set: {content, confidence: 0.5, source: 'fallback', lm_error: error_msg}
    - Log decision to audit_json

- [ ] T029 Create policy classification node (select Routine/Warning/Critical)
  **Goal**: Classify recommendation severity  
  **File**: `n8n/workflows/006-morning-briefing.workflow.ts` (ClassifyPolicy node)
  **Details**: 
    - IF climate_summary.trend = '↓ DOWN' AND trend_pct > 15%: policy='WARNING'
    - ELSE IF confidence < 0.5: policy='ROUTINE'
    - ELSE: policy='ROUTINE' (default)
    - Set trigger_reason based on policy logic
    - Log decision to audit_json

- [ ] T030 [P] Create tone/frame audit node (scan for anti-patterns)
  **Goal**: Verify "Partner Advisor" framing, prevent "Alert" language  
  **File**: `n8n/workflows/006-morning-briefing.workflow.ts` (ToneAudit node)
  **Details**: 
    - Scan recommendation for keywords: ["warning", "danger", "alert", "failing", "critical"]
    - IF found: set tone_warning=true, log to audit_json
    - Suggest override: prepend "Let's try:" to soften language
    - Test: Generate recommendation with "alert" → should be flagged

---

## Phase 5: N8N Workflow W06 - Notification & Recording

_Dependency: Phase 4 (recommendation generated)_

**Independent Test Criteria**:
- LINE notification successfully sent (test with real LINE account)
- Recommendation record created in DB
- Audit log entry captures all decision data

- [ ] T031 Create LINE notification message template node
  **Goal**: Format briefing for LINE Notify  
  **File**: `n8n/workflows/006-morning-briefing.workflow.ts` (PrepareLineNotify node)
  **Details**: 
    - Template:
    ```
    ☀️ Good Morning, {teacher_name}!
    
    📊 Classroom Climate (past 24h)
    Mean Mood: {mean_mood}/5 (±{std_dev})
    Change vs. last week: {trend}
    
    💡 I suggest: {recommendation_content}
    
    ✅ Last week: {total_recs} → {approved} → {implemented} ({closure%})
    
    [Approve & Try] [Dismiss] [More...]
    ```
    - Variables: teacher_name, mean_mood, std_dev, trend, recommendation, closure%
    - Test: verify template renders correctly with sample data

- [ ] T032 Create "Send LINE Notify" HTTP request node
  **Goal**: Deliver briefing to teacher  
  **File**: `n8n/workflows/006-morning-briefing.workflow.ts` (SendLineNotify node)
  **Details**: 
    - Node type: n8n-nodes-base.httpRequest
    - URL: https://notify-api.line.me/api/notify
    - Method: POST
    - Headers: Authorization: Bearer {line_notify_token}
    - Body: message={briefing_message}
    - Error handling: IF fails, set action='RETRY', attempt 3x with backoff
    - Log: sent_at, response_status, error (if any)
    - Test: Use test LINE account token, verify message appears

- [ ] T033 [P] Create recommendation DB insert node
  **Goal**: Record recommendation in DB for tracking  
  **File**: `n8n/workflows/006-morning-briefing.workflow.ts` (CreateRecommendationRecord node)
  **Details**: 
    - Node type: n8n-nodes-base.postgres
    - Operation: INSERT INTO recommendations (...)
    - Columns: class_id, teacher_id, school_id, content, confidence_score, policy, lm_model, llm_tokens_input, llm_tokens_output, llm_latency_ms, trigger_reason, climate_snapshot (JSONB), teacher_response_pattern (JSONB), sent_via, teacher_notification_sent_at, created_at
    - Conflict handling: none (new record)
    - Return: recommendation.id
    - Test: Verify row created with correct schema

- [ ] T034 [P] Create audit log insert node
  **Goal**: Log decision path for transparency  
  **File**: `n8n/workflows/006-morning-briefing.workflow.ts` (LogAuditDecisionPath node)
  **Details**: 
    - Node type: n8n-nodes-base.postgres
    - Operation: INSERT INTO n8n_audit_log (...)
    - Columns: timestamp, workflow_id='W06', workflow_name='Morning Briefing', execution_id, school_id, class_id, teacher_id, decision_path_json (full path with all gates), policy_applied, confidence_score, gates_passed (JSONB), tools_invoked (TEXT[]), tool_outputs (JSONB), action_taken='SEND_LINE_NOTIFICATION', recommendation_id, notification_sent_at
    - decision_path_json structure: {workflow_id, execution_id, timestamp, class_id, teacher_id, checks: [{name, passed, details}, ...], policy_selected, lm_invocation: {...}, action, notification_sent_at}
    - Test: Query n8n_audit_log, verify decision_path_json is valid JSON

- [ ] T035 Create dashboard cache revalidation webhook node
  **Goal**: Trigger ISR revalidation on dashboard  
  **File**: `n8n/workflows/006-morning-briefing.workflow.ts` (UpdateDashboard node)
  **Details**: 
    - Node type: n8n-nodes-base.httpRequest
    - URL: http://localhost:3000/api/n8n/webhook (or production URL)
    - Method: POST
    - Body: {workflow: 'W06', action: 'briefing_sent', teacher_id, class_id, recommendation_id, sent_at, line_message_id}
    - Auth: set X-n8n-signature header (verify implementation in API route)
    - Error handling: log errors but don't fail workflow
    - Test: Verify POST succeeds + dashboard revalidates

- [ ] T036 [P] Test W06 workflow end-to-end (dry-run + manual trigger)
  **Goal**: Verify full workflow execution  
  **File**: `n8n/workflows/006-morning-briefing.workflow.ts` (full)
  **Steps**: 
    1. Open n8n UI → W06 workflow
    2. Set test variables: school_id, class_id
    3. Dry-run entire workflow
    4. Verify ALL nodes execute without error
    5. Check Supabase: recommendations row created
    6. Check Supabase: n8n_audit_log row with full decision_path_json
    7. Check dashboard: briefing widget loads (or manual fetch API)
    8. Verify LINE notification NOT sent in test (would spam)

---

## Phase 5.5: Update Existing N8N Workflows (N8N Query Guard)

_Dependency: Phase 2 (n8n_notification_log table may need creation if not exists)_

- [ ] T037 [P] Create n8n_notification_log table (if not exists) for frequency tracking
  **Goal**: Support notification frequency guard  
  **File**: `supabase/migrations/20260316_w06_morning_briefing.sql` (additions section)
  **Details**: 
    - Columns: id, teacher_id, workflow_id, notification_type, sent_at, created_at
    - Indexes: (teacher_id, created_at DESC)
    - This table is populated when ANY notification is sent (W04, W05, etc.)

- [ ] T038 [P] Create trigger/procedure to auto-increment n8n_notification_log when recommendation sent
  **Goal**: Maintain frequency tracking automatically  
  **File**: `supabase/migrations/20260316_w06_morning_briefing.sql` (additions section)
  **Details**: 
    - Trigger: on INSERT to recommendations with sent_via='LINE'
    - Action: INSERT INTO n8n_notification_log (teacher_id, workflow_id='W06', ...)
    - Test: Send briefing → verify notification_log entry created

---

## Phase 6: Next.js API Routes

_Dependency: Phase 2 (DB tables available), Phase 4 (W06 sends webhook)_

**Independent Test Criteria**:
- API routes return correct schema
- RLS enforced (teacher can only see own data)
- ISR revalidation triggers correctly

- [ ] T039 Create POST `/api/n8n/webhook` route handler
  **Goal**: Receive W06 completion event + revalidate cache  
  **File**: `src/app/api/n8n/webhook/route.ts` (new file)
  **Details**: 
    - Accept POST with body: {workflow, action, teacher_id, class_id, recommendation_id, sent_at, line_message_id}
    - Verify n8n signature (X-n8n-signature header) if implemented
    - Update recommendations table: SET line_message_id={line_message_id} WHERE id={recommendation_id}
    - Call revalidatePath('/teacher/dashboard')
    - Call revalidatePath('/api/teacher/briefing-status')
    - Return: {status: 'ok', revalidated: true}
    - Test: curl -X POST http://localhost:3000/api/n8n/webhook -d '...'

- [ ] T040 Create GET `/api/teacher/briefing-status?class_id=UUID` route handler
  **Goal**: Fetch latest briefing data for dashboard widget  
  **File**: `src/app/api/teacher/briefing-status/route.ts` (new file)
  **Details**: 
    - Auth: verify user is authenticated teacher
    - Query params: class_id (required)
    - Fetch latest n8n_audit_log entry (workflow_id='W06', class_id=?, limit 1)
    - Fetch pending recommendation (status IN ['PENDING', 'ACKNOWLEDGED'], limit 1)
    - Fetch closure metrics (past 7 days):
      - total = COUNT(*)
      - approved = COUNT(*) WHERE status != 'DISMISSED'
      - implemented = COUNT(*) WHERE implemented_at IS NOT NULL
    - Calculate closure_rate = implemented / total OR 0
    - Return schema:
      ```json
      {
        "latest_briefing": {
          "sent_at": "ISO8601",
          "mean_mood": 3.5,
          "std_dev": 0.8,
          "trend": "↓ down 15%",
          "policy": "ROUTINE"
        },
        "recommendation": {
          "id": "uuid",
          "content": "string",
          "confidence": 0.82,
          "status": "PENDING",
          "cta_buttons": [...]
        },
        "closure_summary": {
          "period": "7d",
          "total": 5,
          "approved": 3,
          "implemented": 2,
          "closure_rate": 0.4,
          "message": "You're implementing 40% of climate insights..."
        }
      }
      ```
    - Error handling: IF class_id not found, return 404
    - RLS: Verify teacher can only access own classes (query filters by teacher_id)
    - Test: curl http://localhost:3000/api/teacher/briefing-status?class_id=XX

- [ ] T041 Create POST `/api/teacher/recommendation/:id/action` route handler
  **Goal**: Handle teacher approval/dismissal/implementation  
  **File**: `src/app/api/teacher/recommendation/[id]/action/route.ts` (new file)
  **Details**: 
    - Auth: verify user is authenticated teacher
    - Route param: id (recommendation UUID)
    - Body: {action: 'approve'|'dismiss'|'implement', feedback?: string}
    - Verify recommendation exists + teacher_id matches (RLS)
    - Update based on action:
      - 'approve': SET teacher_approval_status='ACKNOWLEDGED', teacher_approval_at=NOW()
      - 'dismiss': SET teacher_approval_status='DISMISSED', teacher_approval_at=NOW()
      - 'implement': SET teacher_approval_status='IMPLEMENTED', teacher_implemented_at=NOW(), teacher_feedback={feedback}, closure_latency_hours=(NOW()-created_at)/3600, feedback_sentiment=analyzeSentiment(feedback)
    - If action='implement': Update teacher_profiles (closure_rate_trend, dismissal_pattern_consecutive=0)
    - Revalidate paths: '/teacher/dashboard'
    - Return: {status: 'ok', action_taken, updated_at}
    - Error handling: IF recommendation not found or user unauthorized, return 404/403
    - Test: curl -X POST http://localhost:3000/api/teacher/recommendation/XX/action -d '{"action":"approve"}'

- [ ] T042 [P] Create helper function: analyzeSentiment(feedback_text) → 'POSITIVE'|'NEUTRAL'|'NEGATIVE'
  **Goal**: Classify teacher feedback sentiment  
  **File**: `src/lib/sentiment-analyzer.ts` (new file)
  **Details**: 
    - Simple keyword matching (not ML):
      - POSITIVE: feedback contains ["great", "calmer", "better", "helpful", "works", "love"]
      - NEGATIVE: feedback contains ["didn't work", "worse", "confused", "frustrated"]
      - NEUTRAL: default
    - Test: analyzeSentiment("Tried it for 10 mins, students seemed calmer") → 'POSITIVE'

- [ ] T043 [P] Create helper function: calculateClosureMessage(closure_rate) → string
  **Goal**: Generate contextual loop closure message  
  **File**: `src/lib/closure-message.ts` (new file)
  **Details**: 
    - IF closure_rate >= 0.6: "You're implementing 60%+ of climate insights. Partnership is strong! 📊"
    - ELSE IF 0.3 <= closure_rate < 0.6: "You're implementing {closure%} of climate insights. Great progress! 📈"
    - ELSE IF closure_rate < 0.3: "Let's focus on 1 suggestion this week instead. Depth over volume."
    - Test: calculateClosureMessage(0.7) → positive message

- [ ] T044 [P] Test API routes with manual curl commands
  **Goal**: Verify route logic  
  **Commands**: 
    ```bash
    # Test webhook
    curl -X POST http://localhost:3000/api/n8n/webhook \
      -H "Content-Type: application/json" \
      -d '{"workflow":"W06","action":"briefing_sent","teacher_id":"uuid","class_id":"uuid"}'
    
    # Test briefing-status
    curl http://localhost:3000/api/teacher/briefing-status?class_id=uuid
    
    # Test recommendation action
    curl -X POST http://localhost:3000/api/teacher/recommendation/uuid/action \
      -H "Content-Type: application/json" \
      -d '{"action":"approve"}'
    ```

---

## Phase 7: Frontend UI Component - BriefingWidget

_Dependency: Phase 6 (API routes ready)_

**Independent Test Criteria**:
- Widget fetches briefing data correctly
- CTA buttons trigger API calls
- Widget updates on approval/dismissal
- Tailwind CSS v4 syntax compliant

- [ ] T045 Create RSC (Server Component): `src/components/domain/teacher/BriefingWidget/BriefingWidget.tsx`
  **Goal**: Fetch briefing data server-side  
  **File**: `src/components/domain/teacher/BriefingWidget/BriefingWidget.tsx` (new file)
  **Details**: 
    - Props: {classId: UUID}
    - Server-side fetch: await fetch(`/api/teacher/briefing-status?class_id=${classId}`)
    - Handle loading/error states
    - Render server-cached briefing data
    - Client child component: <BriefingWidgetClient initialData={data} />

- [ ] T046 Create Client Component: `src/components/domain/teacher/BriefingWidget/BriefingWidgetClient.tsx`
  **Goal**: Interactive CTA buttons + local state  
  **File**: `src/components/domain/teacher/BriefingWidget/BriefingWidgetClient.tsx` (new file)
  **Details**: 
    - 'use client' directive
    - Props: {initialData}
    - State: briefingStatus (useState)
    - Handlers:
      - handleApprove: POST /api/teacher/recommendation/{id}/action with action='approve' → refresh widget
      - handleDismiss: POST /api/teacher/recommendation/{id}/action with action='dismiss' → refresh widget
      - handleImplement (with feedback modal): POST with action='implement' + feedback → refresh
      - handleRefresh: Manual ISR revalidation fetch
    - Render CTA buttons: [✓ Approve & Try] [Dismiss] [More Context...]

- [ ] T047 Create Component: `src/components/domain/teacher/BriefingWidget/MoodSummaryCard.tsx`
  **Goal**: Display mood aggregate + trend  
  **File**: `src/components/domain/teacher/BriefingWidget/MoodSummaryCard.tsx` (new file)
  **Details**: 
    - Props: {mean_mood, std_dev, trend, policy}
    - Render:
      ```
      ┌─────────────────────┐
      │ 📊 Classroom Mood   │
      │ Mean: 3.5 ± 0.8     │
      │ Trend: ↓ down 15%   │
      │ Policy: ROUTINE     │
      └─────────────────────┘
      ```
    - Styling: Tailwind v4 (@apply, @theme)
    - Policy color: ROUTINE=blue, WARNING=yellow, CRITICAL=red

- [ ] T048 Create Component: `src/components/domain/teacher/BriefingWidget/RecommendationCard.tsx`
  **Goal**: Display recommendation + CTAs  
  **File**: `src/components/domain/teacher/BriefingWidget/RecommendationCard.tsx` (new file)
  **Details**: 
    - Props: {recommendation, onApprove, onDismiss, onImplement}
    - Render:
      ```
      ┌─────────────────────────────────────┐
      │ 💡 Suggestion                       │
      │ "Consider a 5-min mood check..."    │
      │ Confidence: 82%                     │
      │                                     │
      │ [✓ Approve] [Dismiss] [More...]     │
      └─────────────────────────────────────┘
      ```
    - Confidence bar: visual indicator (0-100%)
    - Status badge: PENDING/ACKNOWLEDGED/IMPLEMENTED

- [ ] T049 Create Component: `src/components/domain/teacher/BriefingWidget/LoopClosureSummary.tsx`
  **Goal**: Display loop closure metrics  
  **File**: `src/components/domain/teacher/BriefingWidget/LoopClosureSummary.tsx` (new file)
  **Details**: 
    - Props: {total, approved, implemented, closure_rate, message}
    - Render:
      ```
      ┌─────────────────────────────────────┐
      │ ✅ Last Week's Actions              │
      │ 5 suggestions → 3 approved → 2 impl │
      │ Loop Closure: 40%                   │
      │                                     │
      │ "You're implementing 40% of insights│
      │  Let's focus on 1 suggestion..."    │
      └─────────────────────────────────────┘
      ```
    - Styling: Tailwind v4 progress bar for closure_rate

- [ ] T050 Create Component: `src/components/domain/teacher/BriefingWidget/ImplementationFeedbackModal.tsx`
  **Goal**: Modal for teacher to provide implementation feedback  
  **File**: `src/components/domain/teacher/BriefingWidget/ImplementationFeedbackModal.tsx` (new file)
  **Details**: 
    - Props: {isOpen, onSubmit, onCancel}
    - Form fields:
      - Label: "What did you try? How'd it go?"
      - Textarea: feedback text (max 300 chars)
      - Buttons: [Submit] [Cancel]
    - On submit: Call parent onImplement(feedback)

- [ ] T051 [P] Create export index: `src/components/domain/teacher/BriefingWidget/index.ts`
  **Goal**: Simplify imports  
  **File**: `src/components/domain/teacher/BriefingWidget/index.ts` (new file)
  **Content**: 
    ```typescript
    export { BriefingWidget } from './BriefingWidget';
    export { BriefingWidgetClient } from './BriefingWidgetClient';
    ```

- [ ] T052 Integrate BriefingWidget into teacher dashboard page
  **Goal**: Display briefing widget on dashboard  
  **File**: `src/app/(dashboard)/teacher/dashboard/page.tsx` (modify)
  **Details**: 
    - Add import: `import { BriefingWidget } from '@/components/domain/teacher/BriefingWidget'`
    - Fetch user's classes: list of class_id
    - Render: `{classes.map(c => <BriefingWidget key={c.id} classId={c.id} />)}`
    - Position: prominent (section above student list or as card)
    - Test: Load dashboard → briefing widget displays with data

- [ ] T053 [P] Add Tailwind CSS v4 styles for BriefingWidget components
  **Goal**: Ensure all components styled per design  
  **File**: `src/styles/briefing-widget.css` OR inline Tailwind classes (no separate CSS file)
  **Details**: 
    - Use Tailwind v4 syntax: @apply, @theme (NOT Tailwind v3 syntax)
    - Colors: blue (ROUTINE), yellow (WARNING), red (CRITICAL)
    - Layout: responsive (mobile 1-col, desktop 2-col)
    - Test: Verify no "unknown at-rule" warnings from Tailwind compiler

- [ ] T054 [P] Test BriefingWidget E2E in browser
  **Goal**: Manual QA of UI  
  **Steps**: 
    1. npm run dev
    2. Navigate to /teacher/dashboard
    3. Verify briefing widget renders
    4. Verify mood summary displays (mean, std_dev, trend)
    5. Click [Approve & Try] → verify API call + widget updates
    6. Click [Implement] → verify modal opens, feedback text captured
    7. Submit feedback → verify widget reflects new status

---

## Phase 8: Testing & Observability

_Dependency: All previous phases_

**Independent Test Criteria**:
- All agentic gates tested (k-anonymity, frequency, school day)
- Privacy audit passes (RLS enforcement, no raw data leakage)
- E2E loop closure test passes (sense → act → feedback → learn)

### Unit Tests

- [ ] T055 Create unit test: `__tests__/w06-gates.test.ts` - K-anonymity & guard logic
  **Goal**: Verify decision gates function correctly  
  **File**: `__tests__/w06-gates.test.ts` (new file)
  **Tests**: 
    - `test('k-anonymity check: n=2 students returns NULL')` → verify RPC returns null
    - `test('k-anonymity check: n=5 students returns aggregates')` → verify RPC returns means
    - `test('school day guard: reject non-school-day')` → verify trigger skip
    - `test('frequency guard: reject if >2 notifications today')` → verify skip
    - `test('confidence threshold: reject LLM output <0.65')` → verify fallback used

- [ ] T056 Create unit test: `__tests__/w06-audit-logging.test.ts` - Audit log formatting
  **Goal**: Verify decision path JSON structure  
  **File**: `__tests__/w06-audit-logging.test.ts` (new file)
  **Tests**: 
    - `test('decision_path_json valid JSON')` → verify JSON parseable
    - `test('decision_path includes all gates')` → verify every gate logged
    - `test('tool_outputs immutable after insert')` → verify RLS prevents update
    - `test('deterministic decision path: same input → same output')` → verify idempotency

- [ ] T057 Create unit test: `__tests__/w06-sentiment-analysis.test.ts`
  **Goal**: Verify sentiment detection  
  **File**: `__tests__/w06-sentiment-analysis.test.ts` (new file)
  **Tests**: 
    - `test('positive sentiment detection')` → "students seemed calmer" → POSITIVE
    - `test('negative sentiment detection')` → "didn't work" → NEGATIVE
    - `test('neutral sentiment default')` → "" → NEUTRAL

- [ ] T058 Create unit test: `__tests__/w06-closure-message.test.ts`
  **Goal**: Verify loop closure message generation  
  **File**: `__tests__/w06-closure-message.test.ts` (new file)
  **Tests**: 
    - `test('high closure rate (≥0.6) shows positive message')`
    - `test('mid closure rate (0.3-0.6) shows progress message')`
    - `test('low closure rate (<0.3) shows focus message')`

### Integration Tests

- [ ] T059 Create integration test: `__tests__/w06-e2e-loop-closure.test.ts` - Full agentic loop
  **Goal**: Test complete sense→act→learn cycle  
  **File**: `__tests__/w06-e2e-loop-closure.test.ts` (new file)
  **Scenario**: 
    1. Setup: Create test class with 5 students
    2. Loop0 (Sense): Students submit mood check-ins
    3. Loop2-3 (Reason/Act): W06 workflow executes → recommendation created, audit logged
    4. Loop4 (Self-Eval): Teacher approves recommendation
    5. Loop5 (Adapt): Verify closure metrics updated in teacher_profiles
    6. Assertions: 
       - recommendations table has record with status='ACKNOWLEDGED'
       - n8n_audit_log has record with policy_applied
       - teacher_profiles.closure_rate_trend updated
  **Command**: `npm run test -- w06-e2e-loop-closure.test.ts`

- [ ] T060 Create integration test: `__tests__/w06-api-routes.test.ts`
  **Goal**: Test API route handlers  
  **File**: `__tests__/w06-api-routes.test.ts` (new file)
  **Tests**: 
    - POST /api/n8n/webhook: verify revalidatePath called
    - GET /api/teacher/briefing-status: verify RLS (cross-teacher access denied)
    - POST /api/teacher/recommendation/:id/action: verify status update + revalidation

### E2E Tests (Playwright)

- [ ] T061 Create E2E test: `e2e/teacher-briefing-flow.spec.ts` - Full user flow
  **Goal**: Test from teacher perspective  
  **File**: `e2e/teacher-briefing-flow.spec.ts` (new file)
  **Scenario**: 
    1. Login as test teacher
    2. Navigate to /teacher/dashboard
    3. Verify briefing widget displays
    4. Click "Approve & Try"
    5. Verify button changes state (disables, shows checkmark)
    6. Click "Implement"
    7. Fill feedback form: "Tried for 10 mins, worked well"
    8. Submit
    9. Verify widget updates: status changes to IMPLEMENTED
    10. Verify closure % increases

- [ ] T062 Create E2E test: `e2e/briefing-not-sent-guards.spec.ts` - Gate guard tests
  **Goal**: Verify briefing NOT sent when gates fail  
  **File**: `e2e/briefing-not-sent-guards.spec.ts` (new file)
  **Scenarios**: 
    - Remove all students from class → trigger W06 → verify no briefing sent
    - Set class to non-school-day → trigger W06 → verify skipped
    - Send 2 briefings same day → 3rd should skip

### Privacy & Security Tests

- [ ] T063 Create security test: `__tests__/rls-enforcement.test.ts` - RLS policy validation
  **Goal**: Verify cross-teacher access denied  
  **File**: `__tests__/rls-enforcement.test.ts` (new file)
  **Tests**: 
    - Teacher A queries recommendations for Teacher B's class → RLS blocks
    - Teacher A queries n8n_audit_log for Teacher B → RLS blocks
    - Admin queries all recommendations across schools → admin role allows
    - Direct `SELECT * FROM student_pulses` as teacher → RLS blocks

- [ ] T064 Create privacy test: `__tests__/w06-no-raw-student-data.test.ts` - Data leakage prevention
  **Goal**: Verify no student names/IDs in briefing  
  **File**: `__tests__/w06-no-raw-student-data.test.ts` (new file)
  **Tests**: 
    - Generate briefing message → verify no student names present
    - Query n8n_audit_log → verify no student IDs in tool_outputs
    - Check recommendations.content → verify no direct student references

- [ ] T065 Create audit test: `__tests__/w06-deterministic-path.test.ts` - Agentic reasoning transparency
  **Goal**: Verify decision path fully logged + reproducible  
  **File**: `__tests__/w06-deterministic-path.test.ts` (new file)
  **Tests**: 
    - Execute W06 with same input 2x → verify identical decision_path_json
    - Verify all gates logged (k-anonymity, frequency, school_day, availability, confidence)
    - Verify tool invocations logged with input/output

### N8N Workflow Tests

- [ ] T066 Test W06 workflow: Dry-run all nodes
  **Goal**: Verify n8n nodes execute without syntax errors  
  **Steps**: 
    1. Open n8n UI → W06 workflow
    2. Set test variables (school_id, class_id, teacher_id)
    3. Click "Dry-run" on each node in sequence
    4. Verify NO error indicators (red X)
    5. Check node outputs match expected schema

- [ ] T067 Test W06 workflow: Sub-workflow tool execution
  **Goal**: Verify tool isolation + RPC calls  
  **Steps**: 
    1. Test tool-get-class-climate-summary independently
    2. Test tool-get-past-recommendations independently
    3. Test tool-get-teacher-action-rate independently
    4. Verify each returns correct schema
    5. Verify no raw student data in outputs

---

## Phase 9: Deployment & Validation

_Dependency: All testing completed_

**Independent Test Criteria**:
- All migrations applied to Supabase
- W06 workflow activated
- API routes healthy (200 responses)
- Dashboard functional in production

- [ ] T068 Deploy Supabase migrations to production
  **Goal**: Apply schema changes to live DB  
  **Command**: 
    ```bash
    supabase db push --linked --remote-only
    ```
  **Verify**: 
    - recommendations table exists with correct schema
    - RLS policies active
    - Indexes created
    - Get warnings/errors? Roll back and debug.

- [ ] T069 Seed school_days calendar for production school
  **Goal**: Populate holiday/break dates  
  **File**: `supabase/seed/school-days-seed-prod.sql` (new file)
  **Details**: 
    - Insert 2026 school calendar for each school in deployment
    - Include holidays (Songkran, summer, etc.)
    - Test: SELECT COUNT(*) FROM school_days WHERE school_id=X AND year(date)=2026 → expect ~240 rows

- [ ] T070 Activate W06 workflow in n8n
  **Goal**: Enable daily briefing schedule  
  **Steps**: 
    1. Open n8n UI → W06 workflow
    2. Click "Activate" (toggle ON)
    3. Verify schedule trigger enabled
    4. Check n8n logs: "Workflow activated"
    5. Test: Trigger manually at 07:29 UTC → verify executes

- [ ] T071 Verify API routes accessible in production
  **Goal**: Test endpoints with real data  
  **Commands**: 
    ```bash
    # health check
    curl https://climate-agent.example.com/api/n8n/webhook -X POST -d '...'
    curl https://climate-agent.example.com/api/teacher/briefing-status?class_id=XX
    ```
  **Verify**: 
    - No 500 errors
    - Responses match expected schema
    - RLS enforced (test cross-teacher access → 403)

- [ ] T072 [P] Configure monitoring & alerting for W06 workflow
  **Goal**: Detect failures early  
  **Details**: 
    - n8n: Set email notification on workflow failure
    - Supabase: Monitor audit_log table for errors
    - Slack: Post W06 execution summary daily
    - Datadog/New Relic: Alert on 500 errors in /api/n8n/webhook

- [ ] T073 Create runbook for W06 troubleshooting
  **Goal**: Enable on-call support  
  **File**: `docs/runbooks/w06-morning-briefing-runbook.md` (new file)
  **Sections**: 
    - "Briefing not sent" → debugging checklist
    - "LINE message failed" → fallback email verification
    - "Dashboard widget not updating" → cache revalidation check
    - "Recommendation not recorded" → RLS verification
    - Escalation contacts

- [ ] T074 [P] Create deployment checklist for W06
  **Goal**: Formalize launch process  
  **File**: `docs/checklists/w06-deployment-checklist.md` (new file)
  **Checklist**: 
    - [ ] Supabase migrations applied
    - [ ] N8N workflow activated
    - [ ] API routes responding 200
    - [ ] Dashboard widget loads
    - [ ] Test briefing sent (manual trigger)
    - [ ] Monitoring configured
    - [ ] Runbook published
    - [ ] Team trained on operation

- [ ] T075 Test first live W06 briefing delivery
  **Goal**: Verify real-world execution  
  **Steps**: 
    1. Next school day at 7:30 AM (or manual trigger)
    2. Verify briefing sent to test teacher via LINE
    3. Check n8n execution log (success)
    4. Check recommendations table (record created)
    5. Check n8n_audit_log (decision path logged)
    6. Verify dashboard widget displays briefing
    7. Teacher clicks "Approve" → verify status updates
    8. Teacher clicks "Implement" → verify feedback recorded

- [ ] T076 [P] Gather post-launch metrics (first 1 week)
  **Goal**: Measure success  
  **Queries**: 
    ```sql
    -- Briefings sent
    SELECT COUNT(*) FROM recommendations WHERE created_at > NOW()-7days;
    
    -- Approval rate
    SELECT COUNT(*) FILTER (WHERE teacher_approval_status='ACKNOWLEDGED') / 
           COUNT(*) AS approval_rate FROM recommendations WHERE created_at > NOW()-7days;
    
    -- Implementation rate
    SELECT COUNT(*) FILTER (WHERE teacher_implemented_at IS NOT NULL) / 
           COUNT(*) AS implementation_rate FROM recommendations WHERE created_at > NOW()-7days;
    ```
    - Target: ≥90% approval rate, ≥50% implementation rate
    - If below: gather teacher feedback, iterate

---

## Phase 10: Post-Launch & Evolution

_Dependency: Phase 9 (deployed + monitoring active)_

- [ ] T077 [P] Gather teacher feedback (survey or interviews)
  **Goal**: Identify improvement areas  
  **Questions**: 
    - Does briefing time (7:30 AM) work for you?
    - Is recommendation content helpful?
    - Would you like different notification channel/format?
    - Any privacy concerns?

- [ ] T078 Create dashboard: W06 Observability Metrics
  **Goal**: Self-evaluation visibility for teachers  
  **File**: `src/app/(dashboard)/teacher/observability/w06-metrics.tsx` (new file)
  **Displays**: 
    - Notifications sent this week (count, type distribution)
    - Approval rate (%) this week
    - Implementation rate (%) this week
    - Average latency (hours from notification to action)
    - Mood trend post-implementation (scatter plot)

- [ ] T079 [P] Document lessons learned + design decisions for future L3/L4
  **Goal**: Knowledge base for evolution  
  **File**: `docs/case-studies/w06-lessons-learned.md` (new file)
  **Topics**: 
    - K-anonymity effectiveness: did it prevent leakage?
    - Frequency guard: prevention spam? Still engaged?
    - Inquiry mode: triggered? Did it improve engagement?
    - Agentic loop closure: % teachers completing feedback loops?

- [ ] T080 Plan L3 (Adaptive Policy) improvements (backlog)
  **Goal**: Roadmap for next phase  
  **File**: `docs/roadmap/w06-l3-adaptive-policy.md` (new file)
  **Items**: 
    - Personalize frequency/tone per teacher
    - Dynamic threshold tuning per class
    - Teacher preference pre-training
    - Introduce "Inquiry Mode" feedback collection

---

## Summary & Dependencies

### Phase Structure

```
Phase 1: Setup
  ↓
Phase 2: Database (RLS, k-anonymity, audit tables)
  ↓ (Phase 3-4 parallel)
Phase 3: N8N Workflow (gates → recommendations → logging)
Phase 4: API Routes (webhook, briefing data, approval handlers)
  ↓ (Phase 4-5 parallel can overlap)
Phase 5: Frontend (BriefingWidget, dashboard integration)
  ↓
Phase 6: Testing (unit, integration, E2E, privacy audit)
  ↓
Phase 7: Deployment & Launch
  ↓
Phase 8: Post-Launch (Monitoring, feedback, iteration)
```

### Task Dependencies

| Task | Depends On | Parallelizable |
|------|-----------|---|
| T001-T004 | None | Yes (all parallel) |
| T005-T016 | T001-T004 | Mostly (T006-T007 parallel, etc.) |
| T017-T025 | T005-T016 | Yes (gates independent) |
| T026-T030 | T017-T025 | Mostly (validation + fallback together) |
| T031-T036 | T026-T030 | Mostly (send + log parallel) |
| T039-T044 | T005-T016 (DB), T031-T036 (W06 sends webhook) | Mostly (routes independent) |
| T045-T054 | T039-T044 (API ready) | Mostly (components independent) |
| T055-T067 | All previous (integrated tests depend on full system) | Mostly (unit tests parallel) |
| T068-T076 | All previous | No (sequential deployment steps) |
| T077-T080 | T068-T075 (live deployment) | Yes (feedback + docs parallel) |

### Effort Estimates

| Phase | Tasks | Duration | Team |
|-------|-------|----------|------|
| Phase 1 | 4 | 1 day | 1 person |
| Phase 2 | 12 | 3 days | 1 DB expert |
| Phase 3 | 9 | 5 days | 1 n8n specialist |
| Phase 4 | 6 | 3 days | 1 backend engineer |
| Phase 5 | 10 | 3 days | 1 frontend engineer |
| Phase 6 | 13 | 4 days | 1 QA + devs |
| Phase 7 | 9 | 2 days | DevOps + team |
| Phase 8 | 4 | Ongoing | Team |
| **TOTAL** | **~80 tasks** | **~21 days** | **2-3 engineers** |

---

## Task Format Legend

```
- [ ] [TXXX] [P?] [Story?] Description with goal and file path
        ↑     ↑     ↑      ↑
    checkbox  ID   parallel story label (if applicable)
```

**Checkbox States**:
- `- [ ]` — Not started
- `- [x]` — Completed
- `- [-]` — Blocked/waiting

**Parallel Marker** `[P]`:
- Tasks with [P] can often be worked on in parallel (independent files/systems)
- Tasks without [P] have dependencies on prior tasks

**Story Labels** `[US#]`:
- [US1] → User Story 1 (Teacher receives briefing)
- [US2] → User Story 2 (Teacher approves & implements)
- [US3] → User Story 3 (Loop closure tracking)
- No label → Foundational/infrastructure task

---

## Running This Plan

### Option 1: Sequential Execution (Single Developer)

```bash
# Week 1: Setup + Database
T001-T004  # Setup (1 day)
T005-T016  # Database (3 days)

# Week 2: N8N + API Routes
T017-T036  # N8N Workflow (5 days)
T039-T044  # API Routes (2 days)

# Week 3: Frontend + Testing
T045-T054  # Frontend (3 days)
T055-T067  # Testing (4 days)

# Week 4: Deployment
T068-T080  # Deploy + post-launch (3 days)
```

### Option 2: Parallel Execution (2-3 Developers)

```bash
# Week 1
Team A: T001-T004, T005-T016         # Setup + Database
Team B: (wait for DB) → start T017   # Prep n8n

# Week 2
Team A: T017-T025 (gates)
Team B: T026-T030 (LLM) in parallel

# Week 3
Team A: T031-T036 (notifications/logging)
Team B: T039-T044 (API routes) in parallel

# Week 4
Team A: T045-T054 (Frontend)
Team B: T055-T067 (Testing) in parallel

# Week 4 (end)
All: T068-T080 (Deployment)
```

---

## Acceptance & Sign-Off

Each phase is **COMPLETE** when:

**Phase 2 (Database)**: All tables created + RLS policies active + k-anonymity verified via test queries
**Phase 3 (N8N)**: W06 workflow dry-runs without error + all sub-workflows execute + audit logs are valid JSON
**Phase 4 (API)**: All 3 routes return 200 + RLS enforced + data schema matches spec
**Phase 5 (Frontend)**: BriefingWidget renders + CTAs functional + Tailwind v4 syntax validated
**Phase 6 (Testing)**: All test suites pass (unit, integration, E2E, privacy audit) + no regressions
**Phase 7 (Deploy)**: Live W06 execution successful + metrics healthy (≥90% approval rate)

---

**Status**: ✅ **READY FOR EXECUTION**

**Generated**: 2026-03-16 | **Spec-Kit Phase**: 2 (Task Generation) | **Next**: Execute tasks in order

---

*End of Phase 2 Task List*

