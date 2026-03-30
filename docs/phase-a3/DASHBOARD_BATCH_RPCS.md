# Teacher Dashboard Batch RPCs

Date:

- `2026-03-29`

Purpose:

- remove per-class Supabase fan-out from `/teacher` and `/teacher/classes`
- keep single-class pages on the existing RPC path
- preserve existing teacher-facing semantics for risk, inquiry mode, and safe aggregate climate data

## `get_teacher_metrics_batch(uuid[], int default 30)`

Signature:

```sql
public.get_teacher_metrics_batch(
  p_class_ids uuid[],
  p_lookback_days int default 30
)
```

Return contract:

- one row per requested `class_id`
- zero-state classes still return a row with `0` counts / `null` aggregates
- columns intentionally mirror `get_teacher_metrics()`:
  - `teacher_id`
  - `class_id`
  - `total_generated_recommendations`
  - `total_decided_recommendations`
  - `total_recommendations`
  - `accepted_count`
  - `dismissed_count`
  - `dismissal_rate`
  - `teacher_flag_inquiry_mode`
  - `dismissal_pattern_consecutive`
  - `inquiry_mode_triggered_at`
  - `avg_mood_score`
  - `total_surveys`
  - `low_mood_count`
  - `high_mood_count`
  - `source`

Semantics:

- `dismissal_rate` remains `dismissed / decided`
- `total_recommendations` remains the legacy alias for decided rows
- teacher inquiry-mode state still comes from `teacher_profiles`
- survey aggregates still use the same 30-day lookback mood mapping as the single-class RPC

Security:

- `SECURITY DEFINER`
- `SET search_path = public`
- `GRANT EXECUTE TO authenticated`

## `get_class_climate_summary_batch(uuid[], int default 4)`

Signature:

```sql
public.get_class_climate_summary_batch(
  p_class_ids uuid[],
  p_weeks int default 4
)
```

Return contract:

- returns aggregate climate rows for the requested classes
- shape intentionally mirrors `get_class_climate_summary()`:
  - `class_id`
  - `week_start`
  - `check_in_count`
  - `avg_mood`
  - `avg_pace`
  - `avg_fairness`
- classes with no aggregate rows are expected to be mapped to `[]` in the app layer

Semantics:

- reads from `v_class_climate_summary`
- preserves k-anonymity semantics from the view
- does not expose raw `student_pulses`

Security:

- `SECURITY DEFINER`
- `SET search_path = public`
- `GRANT EXECUTE TO authenticated`

## Audit Lookup Compatibility

Current dashboard explainability UI still reads the latest audit signal from `n8n_audit_logs` because the live row shape used by the UI depends on:

- `event_type`
- `policy_selected`
- `blocked_reason`
- `decision_path_json`
- `created_at`

The batching migration therefore adds compatibility indexes for both audit table names when present:

- `public.n8n_audit_log(class_id, timestamp desc)`
- `public.n8n_audit_logs(class_id, created_at desc)`

## Non-Goals

- no change to `get_teacher_metrics()`
- no change to `get_class_climate_summary()`
- no runtime cache added for the login/dashboard path in this pass
- no Inquiry Mode copy or approval-flow change

## Rollout Note

The app now prefers the batch RPCs on teacher overview pages, but it deliberately falls back to the existing single-class RPC fan-out if `032_teacher_dashboard_batching.sql` has not been applied yet. This keeps preview/dev functional during rollout while still allowing the performance win to activate as soon as the migration is present.
