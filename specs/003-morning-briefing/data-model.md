# Data Model: W06 Morning AI Briefing

**Feature**: W06 Morning AI Briefing (Morning Climate Intelligence for Teachers)  
**Date**: 2026-03-16  
**Phase**: Phase 1 Design  

---

## Entity Relationship Diagram

```
┌──────────────────────┐       ┌─────────────────────────┐
│  student_pulses      │       │  recommendations        │
│  (existing)          │       │  (new)                  │
├──────────────────────┤       ├─────────────────────────┤
│ id PK                │◄─┐    │ id PK                   │
│ student_id FK        │  │    │ class_id FK ──────────┐ │
│ class_id FK ────────┐│  │    │ teacher_id FK ────────┤─┤
│ mood_score           ││  │    │ school_id FK          │ │
│ created_at           ││  │    │ content               │ │
│ school_id FK ───────┐│  │    │ confidence_score      │ │
│ text (emotion)       ││  │    │ policy (enum)         │ │
│ redirect_text        ││  │    │ lm_model              │ │
│                      ││  │    │ llm_tokens_*          │ │
└──────────────────────┘│  │    │                       │ │
                        │  │    │ teacher_approval_*    │ │
                        │  │    │ teacher_implemented_at│ │
┌──────────────────────┐│  │    │ teacher_feedback      │ │
│  teacher_profiles    ││  │    │ loop_closure_*        │ │
│  (extended)          ││  │    │ expires_at            │ │
├──────────────────────┤│  │    ├─────────────────────────┤
│ id PK                ││  │    │ created_at             │
│ notification_freq   ◄┼┤  └────┤ updated_at             │
│ last_briefing_sent_at││       └─────────────────────────┘
│ approval_rate_*      ││
│ implementation_rate *││       ┌─────────────────────────┐
│ action_latency_avg   ││       │  n8n_audit_log          │
│ closure_rate_trend   ││       │  (new)                  │
│ is_inquiry_mode      ││       ├─────────────────────────┤
│ dismissal_pattern_*  │└──────►│ id PK                   │
└──────────────────────┘        │ workflow_id (W06)       │
                                │ class_id FK             │
                                │ teacher_id FK ──────────┤
┌──────────────────────┐        │ decision_path_json      │
│  school_days         │        │ policy_applied          │
│  (new)               │        │ confidence_score        │
├──────────────────────┤        │ gates_passed            │
│ id PK                │        │ tools_invoked[]         │
│ school_id FK         │        │ tool_outputs            │
│ date                 │        │                         │
│ is_school_day        │        │ action_taken            │
│ reason               │        │ skip_reason             │
└──────────────────────┘        │ recommendation_id FK ───┤
                                │ teacher_response_*      │
                                │ timestamp               │
                                └─────────────────────────┘
```

---

## Schema Definitions

### `recommendations` Table (NEW)

**Purpose**: Store all LLM-generated recommendations + teacher response tracking for loop closure.

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique recommendation identifier |
| `agent_id` | TEXT | DEFAULT 'W06-agentic-briefing' | Which agent generated this |
| `class_id` | UUID | FOREIGN KEY → classes | Which class was this for |
| `teacher_id` | UUID | FOREIGN KEY → users | Which teacher received this |
| `school_id` | UUID | FOREIGN KEY → schools | School context (for multi-tenancy) |
| **Content** |
| `content` | TEXT | NOT NULL | Recommendation text (max 150 chars) |
| `content_type` | TEXT | DEFAULT 'teaching_suggestion' | Enum: teaching_suggestion, observation_focus, climate_alert |
| `confidence_score` | FLOAT8 | 0.0 ≤ x ≤ 1.0 | LLM confidence (0.65 threshold for send) |
| `lm_model` | TEXT | — | Model name (e.g., 'gemini-2.0-flash') |
| `llm_tokens_input` | INT | — | Input tokens consumed |
| `llm_tokens_output` | INT | — | Output tokens generated |
| `llm_latency_ms` | INT | — | LLM API latency in milliseconds |
| **Policy** |
| `policy` | TEXT | DEFAULT 'ROUTINE' | Enum: ROUTINE, WARNING, CRITICAL |
| `trigger_reason` | TEXT | — | Why generated (e.g., 'mood_drop_15_percent') |
| **Context Snapshot** |
| `climate_snapshot` | JSONB | — | {mean_mood, std_dev, trend, n_students, k_anonymity_safe} |
| `teacher_response_pattern` | JSONB | — | {approval_rate_7d, implementation_rate_7d, dismissal_count} |
| **Lifecycle** |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Recommendation generated at |
| `sent_via` | TEXT | DEFAULT 'LINE' | Enum: LINE, EMAIL, DASHBOARD, SLACK |
| `teacher_notification_sent_at` | TIMESTAMP | — | When notification delivered |
| **Teacher Response (Loop4)** |
| `teacher_approval_status` | TEXT | — | Enum: PENDING, ACKNOWLEDGED, DISMISSED, NOT_ACTIONED |
| `teacher_approval_at` | TIMESTAMP | — | Timestamp of teacher action |
| `teacher_approval_note` | TEXT | — | Optional note from teacher |
| `teacher_implemented_at` | TIMESTAMP | — | When teacher marked as IMPLEMENTED |
| `teacher_feedback` | TEXT | — | Qualitative feedback (e.g., "Tried 10 mins, students calmer") |
| `feedback_sentiment` | TEXT | — | Enum: POSITIVE, NEUTRAL, NEGATIVE (for L3 tuning) |
| **Loop Closure Metrics (Loop5)** |
| `loop_closure_timestamp` | TIMESTAMP | — | When loop closed (teacher marked IMPLEMENTED) |
| `closure_latency_hours` | FLOAT8 | — | Hours from `sent_at` to `implemented_at` |
| **Metadata** |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last modification time |
| `expires_at` | TIMESTAMP | — | Archive/delete recommendation after 30 days |

**Indexes**:
```sql
CREATE INDEX idx_recommendations_class_created ON recommendations(class_id, created_at DESC);
CREATE INDEX idx_recommendations_teacher_status ON recommendations(teacher_id, teacher_approval_status);
CREATE INDEX idx_recommendations_closure ON recommendations(teacher_implemented_at) WHERE teacher_implemented_at IS NOT NULL;
```

**RLS Policies**:
```sql
-- Teacher sees only their own class recommendations
CREATE POLICY recommendations_teacher_view ON recommendations
  FOR SELECT USING (
    teacher_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Teacher can approve their own recommendation only once
CREATE POLICY recommendations_teacher_approve ON recommendations
  FOR UPDATE USING (
    teacher_id = auth.uid() AND
    teacher_approval_status IS NULL
  );
```

**Constraints**:
```sql
CONSTRAINT valid_dates CHECK (teacher_notification_sent_at IS NULL OR teacher_notification_sent_at >= created_at)
CONSTRAINT valid_approval CHECK (teacher_approval_status IN ('PENDING', 'ACKNOWLEDGED', 'DISMISSED', 'NOT_ACTIONED'))
CONSTRAINT valid_policy CHECK (policy IN ('ROUTINE', 'WARNING', 'CRITICAL'))
```

---

### `n8n_audit_log` Table (NEW)

**Purpose**: Audit trail of all agentic workflow decisions (W01, W02, W06, etc.) for transparency + debugging + compliance.

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Audit log entry ID |
| `timestamp` | TIMESTAMP | DEFAULT NOW() | When decision was made |
| **Workflow Context** |
| `workflow_id` | TEXT | NOT NULL | e.g., 'W06-briefing', 'W01-agentic-ai' |
| `workflow_name` | TEXT | — | Human-readable name |
| `execution_id` | TEXT | — | n8n execution ID (for linking to n8n logs) |
| `school_id` | UUID | FK → schools | Which school was affected |
| `class_id` | UUID | — | Which class (if applicable) |
| `teacher_id` | UUID | FK → users | Which teacher (if applicable) |
| **Decision Path** |
| `decision_path_json` | JSONB | NOT NULL | Full deterministic decision path: {checks: [{name, passed, data}]} |
| `policy_applied` | TEXT | — | ROUTINE, WARNING, CRITICAL, INQUIRY, or NULL if skipped |
| `confidence_score` | FLOAT8 | — | Overall confidence in decision (0.0-1.0) |
| `gates_passed` | JSONB | — | {k_anonymity: true, school_day: true, frequency_ok: false, ...} |
| **Tool Invocations** |
| `tools_invoked` | TEXT[] | — | ARRAY of tool names used |
| `tool_outputs` | JSONB | — | {get_class_climate_summary: {...}, gemini_lm: {...}} |
| **Action** |
| `action_taken` | TEXT | NOT NULL | SEND_LINE_NOTIFICATION, SEND_EMAIL, SKIP, RETRY |
| `action_skipped` | BOOLEAN | DEFAULT FALSE | Was action skipped? |
| `skip_reason` | TEXT | — | Why skipped (e.g., 'frequency_exceeded', 'k_anonymity_failed') |
| **Teacher Response** |
| `notification_sent_at` | TIMESTAMP | — | When notification was delivered |
| `recommendation_id` | UUID | FK → recommendations | Reference to created recommendation |
| `teacher_response_received_at` | TIMESTAMP | — | When teacher responded (approved/dismissed) |
| `teacher_response_type` | TEXT | — | APPROVED, DISMISSED, IMPLEMENTED, NOT_ACTIONED |
| **Error Handling** |
| `error_message` | TEXT | — | Error description if action failed |
| `error_stack` | TEXT | — | Stack trace (if applicable) |
| `n8n_log_url` | TEXT | — | Direct link to n8n execution log |
| **Metadata** |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | When audit entry was updated |

**Indexes**:
```sql
CREATE INDEX idx_audit_workflow ON n8n_audit_log(workflow_id, timestamp DESC);
CREATE INDEX idx_audit_teacher ON n8n_audit_log(teacher_id, timestamp DESC);
CREATE INDEX idx_audit_recommendation ON n8n_audit_log(recommendation_id);
```

**RLS Policy**:
```sql
CREATE POLICY audit_log_teacher_view ON n8n_audit_log
  FOR SELECT USING (
    teacher_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```

---

### `teacher_profiles` Table (EXTENDED)

**Purpose**: Extend existing teacher profile with W06-specific notification preferences + response metrics.

**New Columns** (added via migration):

| Column | Type | Description |
|--------|------|-------------|
| **Preferences** |
| `notification_frequency_pref` | TEXT | Enum: 'ROUTINE', 'CRITICAL_ONLY', 'NONE' |
| `notification_channel_pref` | TEXT | Enum: 'LINE', 'EMAIL', 'DASHBOARD', 'SLACK' |
| **Tracking** |
| `last_briefing_sent_at` | TIMESTAMP | When last briefing was sent |
| `briefing_count_7d` | INT | Count of briefings sent this week |
| `briefing_approval_count_7d` | INT | Count of approved briefings this week |
| **Metrics** |
| `approval_rate_historical` | FLOAT8 | Average approval rate over N weeks (0.0-1.0) |
| `implementation_rate_historical` | FLOAT8 | Average implementation rate (0.0-1.0) |
| `action_latency_avg_hours` | FLOAT8 | Average time from notification to action (hours) |
| `closure_rate_trend_7d` | FLOAT8 | Recent trend (>0.6 = improving, <0.3 = declining) |
| **Inquiry Mode** |
| `is_inquiry_mode` | BOOLEAN | Triggered if dismissal pattern detected |
| `inquiry_mode_triggered_at` | TIMESTAMP | When inquiry mode was activated |
| `dismissal_pattern_consecutive` | INT | Count of consecutive dismissals |
| `dismissal_pattern_reason` | TEXT | Notes on why dismissals detected |

**Sample Update Query**:
```sql
UPDATE teacher_profiles
SET
  last_briefing_sent_at = NOW(),
  briefing_count_7d = briefing_count_7d + 1
WHERE id = $1;
```

---

### `school_days` Table (NEW)

**Purpose**: School calendar for guarding W06 briefing trigger (don't send on holidays/weekends).

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Entry ID |
| `school_id` | UUID | FOREIGN KEY → schools | Which school |
| `date` | DATE | NOT NULL | Calendar date |
| `is_school_day` | BOOLEAN | DEFAULT TRUE | Is this a school day? |
| `reason` | TEXT | — | Why not a school day (e.g., "New Year Holiday", "Teacher Professional Day") |
| `created_at` | TIMESTAMP | DEFAULT NOW() | When entry created |
| — | — | UNIQUE(school_id, date) | One entry per school per date |

**Indexes**:
```sql
CREATE INDEX idx_school_days_lookup ON school_days(school_id, date);
```

**Sample Seed Data**:
```sql
INSERT INTO school_days (school_id, date, is_school_day, reason) VALUES
  ('school-1-uuid', '2026-03-21', FALSE, 'Songkran Festival'),
  ('school-1-uuid', '2026-03-22', FALSE, 'Songkran Festival'),
  ('school-1-uuid', '2026-03-23', FALSE, 'Songkran Festival'),
  ('school-1-uuid', '2026-04-13', FALSE, 'Summer Break Begins');
```

---

## Existing Tables (Unmodified)

These tables already exist and are used by W06 without modifications:

### `student_pulses` (existing)
- Stores mood check-ins from students
- W06 reads aggregates via `get_class_climate_summary()` RPC (not directly)
- RLS protects raw rows; teachers see only aggregates

### `classes` (existing)
- Defines classroom entities
- W06 loops over active classes to generate briefings

### `users` (existing)
- User accounts (students, teachers, admins)
- W06 reads teacher profiles and LINE notify tokens

### `class_enrollments` (existing)
- Maps teachers to classes they teach
- W06 uses to find which classes a teacher has

---

## Data Flow Diagram

```
[W06 Schedule Trigger 7:30 AM M-F]
         ↓
[LoopOverClasses (for each class)]
         ↓
[call get_class_climate_summary() RPC]
    (queries student_pulses with k≥3 guard)
         ↓
[Climate data returned: {mean, std_dev, trend, n_students}]
         ↓
[LangChain Agent evaluates context + generates recommendation]
    (tool-get-past-recommendations)
    (tool-get-teacher-action-rate)
         ↓
[Confidence >= 0.65? → YES]
         ↓
[Create recommendations record (PENDING status)]
  INSERT INTO recommendations (class_id, teacher_id, content, policy, ...)
         ↓
[Send LINE notification via LINE Notify API]
         ↓
[Create n8n_audit_log record (decision path)]
  INSERT INTO n8n_audit_log (workflow_id, decision_path_json, ...)
         ↓
[Call POST /api/n8n/webhook (revalidate cache)]
         ↓
[Dashboard ISR revalidation (briefing widget refreshes)]
         ↓
[Teacher receives LINE + sees dashboard widget]
         ↓
[Teacher clicks "Approve & Try" or "Dismiss"]
         ↓
[POST /api/teacher/recommendation/:id/action]
         ↓
[UPDATE recommendations (teacher_approval_status, teacher_approval_at)]
  UPDATE recommendations SET teacher_approval_status = 'ACKNOWLEDGED'
         ↓
[If teacher implements and provides feedback]
         ↓
[UPDATE recommendations (teacher_implemented_at, teacher_feedback)]
         ↓
[Loop5 analytics (closure_latency, sentiment, update teacher_profiles)]
```

---

## Validation Rules

### `recommendations` Table

- **approval_status transition**: PENDING → (ACKNOWLEDGED | DISMISSED) → optionally IMPLEMENTED
- **no overwrite**: Once `teacher_approval_status` is set, cannot be changed (idempotent)
- **k-anonymity**: Climate snapshot must have `k_anonymity_safe = true` before storing
- **confidence threshold**: Only stored if `confidence_score >= 0.65` (lower values fallback to rule-based)

### `n8n_audit_log` Table

- **deterministic gates**: Same input (class_id, date, time) must produce same `decision_path_json`
- **tool_outputs immutable**: Once logged, tool outputs are frozen (snapshot for historical analysis)
- **decision_path_json valid JSON**: Schema-validated before insert

### `teacher_profiles` Extensions

- **metrics calculation**: Rates calculated from `recommendations` table aggregates, not stored redundantly
- **inquiry_mode reset**: Requires teacher feedback to exit

---

## Sequence Diagram: Loop Closure (Loop0 → Loop5)

```
Loop0: Sense
  [Student submits mood check-in]
         ↓
Loop1: Context
  [W01 aggregates 24h moods via RPC]
         ↓
Loop2: Reason/Plan
  [W06 @ 7:30 AM]
  [Check: k-anonymity ✓, school_day ✓, frequency ✓]
  [LLM: "Consider a 5-min mood check" confidence=0.82]
  [INSERT INTO recommendations (PENDING)]
         ↓
Loop3: Act
  [W06 POST to LINE Notify API]
  [Teacher receives LINE message + CTA buttons]
         ↓
Loop4: Self-Evaluate
  [Teacher clicks "Approve & Try"]
  [UPDATE recommendations (teacher_approval_status = 'ACKNOWLEDGED')]
  [Teacher tries suggestion in class]
  [Teacher clicks "✓ Done" in dashboard]
  [UPDATE recommendations (teacher_implemented_at = NOW())]
  [Teacher provides feedback: "Tried 10 mins, students seemed calmer"]
  [UPDATE recommendations (teacher_feedback, feedback_sentiment = 'POSITIVE')]
         ↓
Loop5: Adapt
  [Analytics aggregation]
  [closure_latency_hours = 4.5]
  [UPDATE teacher_profiles (approval_rate_7d, implementation_rate_7d)]
  [Pre recommendation for L3: high_confidence + high_implementation_rate]
  [Next W06 invocation uses updated metrics for tone/frequency personalization]
```

---

## Compliance & Constraints

### Privacy

- ✅ No raw student names/IDs in `recommendations` or `n8n_audit_log`
- ✅ k-anonymity enforced: `climate_snapshot.k_anonymity_safe` must be `true`
- ✅ RLS prevents cross-school or cross-classroom data leakage

### Auditability

- ✅ Every decision logged to `n8n_audit_log.decision_path_json`
- ✅ Teacher can see audit trail via `/api/teacher/audit-trail` (future)
- ✅ Data retention: 60 days for raw text, 2 years for audit logs

### Idempotency

- ✅ Recommendation approval is idempotent: once approved, cannot be re-approved
- ✅ Audit log entries are immutable (INSERT only, no UPDATE)

---

**End of Data Model**

---

**Generated**: 2026-03-16 | **Spec-Kit Phase**: 1 (Design) | **Next**: Code generation + schema migration
