# Dev Semantics Snapshot

Date captured:

- `2026-03-24T07:55:17Z`

Verification class:

- `994e8327-f00f-4117-af75-5a838d5c48d9`

## Cleanup Status

- `recommendations` test rows removed:
  - `750ee5c4-c9e5-473d-a969-1d62da45d44f`
  - `e4908130-14bd-4149-9ebd-66b23e5087d5`
- `n8n_audit_logs` test rows removed:
  - `445061a9-3297-4a72-b0cb-f8e4b277043d`
  - `8dbafc0f-8905-4a18-a1a0-03621104cf9a`

Post-delete preview:

- `recommendations` = `[]`
- `n8n_audit_logs` = `[]`

## Current Behavior Snapshot

Frequency RPC output:

```json
[
  {
    "limit_exceeded": false,
    "reason": "Within limits",
    "daily_count": 0,
    "weekly_count": 0
  }
]
```

Metrics RPC output:

```json
{
  "class_id": "994e8327-f00f-4117-af75-5a838d5c48d9",
  "lookback_days": 30,
  "total_surveys": 0,
  "avg_mood_score": null,
  "low_mood_count": 0,
  "high_mood_count": 0,
  "date_range_start": null,
  "date_range_end": null
}
```

Recommendations snapshot after cleanup:

```json
[]
```

## Notes

- This is a zero-state snapshot after dev cleanup.
- `check_frequency_limit` currently returns `daily_count = 0` and `weekly_count = 0` for the verification class after cleanup.
- The current direct `get_teacher_metrics` RPC response does not expose `total_recommendations` or `dismissal_rate` in this zero-state output.
- `030_phase_a3_frequency_guard_and_metrics.sql` has not been applied yet.

## Post-Apply Snapshot

Date captured:

- `2026-03-24T08:18:00Z`

SQL apply status:

- `030_phase_a3_frequency_guard_and_metrics.sql` applied in `dev`
- pre-apply backup exported to:
  - `supabase/proposals/029_backup_frequency_and_metrics_pre_phase_a3.sql`
  - `supabase/proposals/029_public_schema_backup_pre_phase_a3.sql`
- post-apply definitions exported to:
  - `supabase/proposals/031_post_apply_frequency_and_metrics_dev.sql`

Post-apply frequency RPC output:

```json
[
  {
    "limit_exceeded": false,
    "reason": "Within limits",
    "daily_count": 0,
    "weekly_count": 0
  }
]
```

Post-apply metrics RPC output:

```json
[
  {
    "teacher_id": "00000000-0000-0000-0000-000000000001",
    "class_id": "994e8327-f00f-4117-af75-5a838d5c48d9",
    "total_generated_recommendations": 0,
    "total_decided_recommendations": 0,
    "total_recommendations": 0,
    "accepted_count": 0,
    "dismissed_count": 0,
    "dismissal_rate": 0,
    "teacher_flag_inquiry_mode": false,
    "dismissal_pattern_consecutive": 0,
    "inquiry_mode_triggered_at": null,
    "avg_mood_score": null,
    "total_surveys": 3,
    "low_mood_count": 0,
    "high_mood_count": 0,
    "source": "supabase_rpc"
  }
]
```

Post-apply semantics confirmed from live function definition:

- `check_frequency_limit()` now counts `status IN ('pending', 'approved')`
- `dismissed` is excluded from frequency guard counts
- `get_teacher_metrics()` now returns:
  - `total_generated_recommendations`
  - `total_decided_recommendations`
  - `total_recommendations`
  - `dismissal_rate`
  - `teacher_flag_inquiry_mode`
  - `dismissal_pattern_consecutive`
- `dismissal_rate` is computed from decided rows only
- `inquiry_mode_triggered_at` is cast to `timestamptz` at query time to match the live `teacher_profiles` schema

Artifacts written during post-apply verification:

- `/tmp/phase-a3-frequency-dev-post-apply.json`
- `/tmp/phase-a3-metrics-dev-post-apply.json`

## Dashboard Perf Note

Date captured:

- `2026-03-29`

Teacher dashboard overview loading now targets a batched server-side shape instead of per-class fan-out:

- `1` classes query
- `1` enrollments query
- `1` `get_teacher_metrics_batch()` RPC
- `1` `get_class_climate_summary_batch()` RPC
- `1` batched latest-audit query

Implementation notes:

- single-class pages still use the existing single-class helpers
- no `@vercel/functions` Runtime Cache was added in this pass
- next follow-up, if still needed, should focus on infra latency or short-TTL overview caching rather than reintroducing dashboard waterfalls
