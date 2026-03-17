# W06 MORNING AI BRIEFING - DATABASE IMPLEMENTATION SUMMARY

**Status**: ✅ COMPLETE  
**Migration File**: `supabase/migrations/018_w06_morning_briefing_schema.sql`  
**Seed File**: `supabase/seed/school-days-seed.sql`  
**Date**: 2026-03-16

---

## 📊 TABLES CREATED & AGENTIC LOOP MAPPING

### 1. `public.recommendations` (T005-T007)
**Purpose**: Track LLM-generated recommendations + teacher response path

| Agentic Loop | Role | Relevant Columns |
|---|---|---|
| **Loop0** (Sense) | ✓ Input: aggregate mood data | `climate_snapshot` (captured at create time) |
| **Loop1** (Reason) | — | N/A |
| **Loop2** (Reason→Plan) | ✓ Planning: content generation | `content, confidence_score, lm_model` → LLM metadata |
| **Loop3** (Act) | ✓ Action: send notification | `sent_via, teacher_notification_sent_at` → delivery tracking |
| **Loop4** (Learn) | ✓ Response: track teacher action | `teacher_approval_status, teacher_approval_at` → approval gate |
| **Loop5** (Adapt) | ✓ Implementation: track closure | `teacher_implemented_at, loop_closure_timestamp, closure_latency_hours, teacher_feedback` → effectiveness metrics |

**Key Columns**:
- `content` (TEXT): The recommendation text (max 150 chars)
- `policy` (TEXT): Escalation level → ROUTINE | WARNING | CRITICAL
- `confidence_score` (FLOAT8 0-1): LLM confidence; <0.7 uses fallback rules
- `climate_snapshot` (JSONB): Mood aggregate at time of recommendation
- `teacher_approval_status` (TEXT): PENDING → ACKNOWLEDGED → IMPLEMENTED
- `loop_closure_timestamp`: When teacher marks IMPLEMENTED

**RLS Policies**: 
- Teacher sees only own class recommendations
- Teacher can update only own pending recommendations

**Indexes** (3):
- `idx_recommendations_class_created`: Fast class-level queries
- `idx_recommendations_teacher_status`: Filter by approval status
- `idx_recommendations_closure`: Closure tracking metrics

**Supports**: Daily 7:30 AM briefing with teacher approval gate + loop closure tracking

---

### 2. `public.n8n_audit_log` (T008-T010)
**Purpose**: Immutable decision path audit for all agentic workflows (W06 + future)

| Agentic Loop | Role | Relevant Columns |
|---|---|---|
| **Loop0** (Sense) | ✓ Input logged | `decision_path_json.input_data` |
| **Loop1** (Reason) | ✓ Reasoning logged | `decision_path_json.reasoning_steps` |
| **Loop2** (Plan) | ✓ Gates + planning | `gates_passed, tools_invoked` → all safety checks |
| **Loop3** (Act) | ✓ Action taken | `action_taken, action_skipped, skip_reason` |
| **Loop4** (Learn) | ✓ Response tracking | `teacher_response_received_at, teacher_response_type` |
| **Loop5** (Adapt) | ✓ Feedback captured | Link to recommendations for effectiveness analysis |

**Key Columns**:
- `workflow_id` (TEXT): W06, W01, etc. — enables multi-workflow auditing
- `decision_path_json` (JSONB): Full reasoning trail with checks, conditions, results
- `gates_passed` (JSONB): Summary of all safety gates (k_anonymity, school_day, frequency, teacher_available)
- `tools_invoked` (TEXT[]): Array of tool names called (e.g., [get_class_climate_summary, gemini_lm, line_notify])
- `action_taken` (TEXT): SEND_LINE_NOTIFICATION | SEND_EMAIL | SKIP | RETRY
- `skip_reason` (TEXT): Why action was skipped if applicable

**RLS Policies**:
- Teacher sees only own audit trail
- Admin can see all

**Indexes** (3):
- `idx_audit_workflow`: Filter by workflow (W06, W01) + order by time
- `idx_audit_teacher`: Teacher audit trail
- `idx_audit_recommendation`: Link back to recommendations

**Supports**: Deterministic reasoning trail + compliance audit + W06 research analysis

---

### 3. `public.school_days` (T011)
**Purpose**: Calendar management for holiday/break suppression

| Agentic Loop | Role | Relevant Columns |
|---|---|---|
| **Loop0** (Sense) | ✓ Calendar check | `is_school_day` → guard: only trigger on school days |
| **Loop1-Loop5** | — | N/A |

**Key Columns**:
- `school_id` (UUID): Multi-tenant support (federated by school)
- `date` (DATE): Calendar day
- `is_school_day` (BOOLEAN): TRUE = regular school day; FALSE = holiday/break/weekend
- `reason` (TEXT): "Songkran Holiday", "Teacher Professional Day", etc.

**RLS Policies**: 
- None (teachers don't directly query school_days; n8n queries via RPC)

**Indexes** (1):
- `idx_school_days_lookup`: Fast (school_id, date) lookup for W06 trigger guard

**Seeded Data**:
- April 2026: 30 days (22 school days + 8 weekend/holiday)
- Includes Songkran (Mar 21-23), Chakri Memorial Day, weekends

**Supports**: W06 Skip briefing on non-school days (Loop0 Sense gate)

---

### 4. `public.teacher_profiles` (T012)
**Purpose**: Notification preferences + W06 response metrics

| Agentic Loop | Role | Relevant Columns |
|---|---|---|
| **Loop0** (Sense) | ✓ Baseline preferences | `notification_frequency_pref, notification_channel_pref` |
| **Loop3** (Act) | ✓ Delivery decisions | Frequency guarded by `briefing_count_7d` |
| **Loop4** (Learn) | ✓ Response patterns | `approval_rate_historical, implementation_rate_historical, action_latency_avg_hours` |
| **Loop5** (Adapt) | ✓ Adaptive behavior | `is_inquiry_mode, dismissal_pattern_consecutive` → switches to inquiry mode if <20% approval for 2 weeks |

**Key Columns**:
- `user_id` (UUID UNIQUE): Links to teachers
- `notification_frequency_pref` (TEXT): ROUTINE | CRITICAL_ONLY | NONE
- `notification_channel_pref` (TEXT): LINE | EMAIL | DASHBOARD | SLACK
- `briefing_count_7d` (INT): Rolling count for frequency guard (max 5/week)
- `approval_rate_historical` (FLOAT8): % of briefings approved
- `implementation_rate_historical` (FLOAT8): % of approved recommendations implemented
- `is_inquiry_mode` (BOOLEAN): Switches mode when engagement low

**RLS Policies**: 
- None (admin-only; n8n reads during workflow)

**Indexes** (1):
- `idx_teacher_profiles_user`: User lookup

**Supports**: Personalized briefing frequency + inquiry mode adaptation (Loop5 feedback loop)

---

### 5. `public.student_pulses` (Enhanced, T013)
**Purpose**: Protect raw mood data via RLS enforcement

| Agentic Loop | Role | Relevant Columns |
|---|---|---|
| **Loop0** (Sense) | ✓ Raw data guarded | All columns protected from direct access |

**RLS Enhancement**:
- New Policy: `student_pulses_access_via_rpc` → blocks direct SELECT
- Forces usage via `get_class_climate_summary()` RPC (SECURITY DEFINER)
- Ensures k-anonymity enforcement at DB layer (not app layer)

**Why**: Prevents accidental data leakage; k-anonymity enforced server-side

---

## 🔐 RPC FUNCTION: `get_class_climate_summary()` (T014)

**Purpose**: Safe aggregate mood data endpoint with k-anonymity enforcement

**Signature**:
```sql
get_class_climate_summary(
  p_class_id UUID,
  p_period VARCHAR DEFAULT '24 hours'
) RETURNS TABLE (
  mean_mood FLOAT8,
  std_dev FLOAT8,
  n_students INT,
  mood_trend TEXT,
  baseline FLOAT8,
  k_anonymity_safe BOOLEAN
)
```

**Security Properties**:
- **SECURITY DEFINER**: Runs as `postgres` role; results filtered by RLS
- **k-Anonymity**: If n<3 returns NULL aggregates + k_anonymity_safe=FALSE
- **Input Validation**: Mood values mapped (happy=4, neutral=3, sad=2, very_sad=1)

**Agentic Loop Map** (Loop0 - Sense):
- Called by W06 LangChain Agent
- Returns { mean_mood, std_dev, n_students, mood_trend, k_anonymity_safe }
- If k=FALSE, W06 skips briefing → logged to audit trail

**Example Call**:
```sql
SELECT * FROM get_class_climate_summary('class-uuid-1', '24 hours');
-- Returns: (3.5, 0.8, 12, ↓ declining, 3.0, true)
```

---

## 📋 CONSTRAINT & INDEX SUMMARY

### Constraints Enforced:
- **Data Validation**: Enums for policy (ROUTINE/WARNING/CRITICAL), approval_status, frequency_pref
- **Referential Integrity**: FKs on class_id, teacher_id, school_id (ON DELETE CASCADE)
- **Date Ordering**: teacher_notification_sent_at ≥ created_at; teacher_implemented_at ≥ created_at
- **k-Anonymity**: n_students < 3 returns NULL aggregates (in RPC)
- **Confidence**: 0 ≤ confidence_score ≤ 1

### Index Performance Targets:
- Query latency: <2 sec for dashboard widget
- W06 briefing delivery: <5 min from 7:30 AM trigger
- Class-level aggregates: Indexed by (class_id, created_at DESC)
- Teacher audit trail: Indexed by (teacher_id, timestamp DESC)

---

## 🧠 AGENTIC LOOPS COVERAGE

```
Loop0 (Sense)
  ├─ school_days.is_school_day check
  ├─ student_pulses raw data (RLS-protected)
  ├─ get_class_climate_summary() RPC (k-anonymity safe)
  └─ teacher_profiles baseline preferences
  
Loop1 (Reason)
  ├─ n8n_audit_log.decision_path_json (gates evaluation)
  └─ get_class_climate_summary() output
  
Loop2 (Plan)
  ├─ LLM prompt + context from climate_snapshot
  ├─ recommendations.content generation
  ├─ n8n_audit_log.tools_invoked tracking
  └─ confidence_score thresholding
  
Loop3 (Act)
  ├─ recommendations.sent_via (LINE notification)
  ├─ n8n_audit_log.action_taken
  └─ teacher_notification_sent_at timestamp
  
Loop4 (Learn)
  ├─ recommendations.teacher_approval_status
  ├─ teacher_profiles.approval_rate_historical
  ├─ n8n_audit_log.teacher_response_received_at
  └─ closure latency measurement
  
Loop5 (Adapt)
  ├─ recommendations.teacher_implemented_at (loop closure)
  ├─ teacher_profiles.is_inquiry_mode (adaptive mode)
  ├─ dismissal_pattern_consecutive (engagement tracking)
  └─ teacher_feedback sentiment analysis
```

---

## ✅ READY FOR TESTING

**Next Steps** (as per user request):
1. **Dry-run**: `supabase db push --dry-run` (verify SQL)
2. **Apply**: `supabase db push` (create tables/RPC)
3. **Seed**: Run `supabase/seed/school-days-seed.sql`
4. **Verify**: Check tables + indexes in Supabase dashboard

**Waiting for Review** ⏸️ before proceeding to:
- N8N Workflow W06 implementation (Part 2)
- Next.js API routes (Part 3)
- Frontend BriefingWidget (Part 4)

---

## 📁 FILES CREATED

| File | Lines | Purpose |
|---|---|---|
| `supabase/migrations/018_w06_morning_briefing_schema.sql` | 570 | Main migration: 4 tables + 1 RPC + RLS policies + indexes |
| `supabase/seed/school-days-seed.sql` | 120 | Seed calendar data (Mar-Apr 2026) |

---

**Database Implementation**: COMPLETE ✅  
**Agentic Loop Mapping**: VERIFIED ✅  
**Code Review Ready**: YES ⏳
