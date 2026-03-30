# Phase A.3 RPC / Code Proposals

Warnings:

- Check in `dev` and `staging` first, always.
- Do not run any `ALTER` or `CREATE OR REPLACE FUNCTION` in production until the observability cases match expected semantics.

## 1. `check_frequency_limit` Contract

Target contract:

```json
[
  {
    "limit_exceeded": false,
    "reason": "Within limits",
    "daily_count": 1,
    "weekly_count": 3
  }
]
```

Target semantics:

- count statuses in `('pending', 'approved')`
- exclude `dismissed`
- return explicit `daily_count` and `weekly_count`

Reference SQL proposal:

- [030_phase_a3_frequency_guard_and_metrics.sql](/Users/ark1/Public/Climate%20Agent/supabase/proposals/030_phase_a3_frequency_guard_and_metrics.sql)

## 2. `get_teacher_metrics` Contract

Target additions:

```json
{
  "teacher_id": "uuid-or-null",
  "class_id": "uuid",
  "total_generated_recommendations": 4,
  "total_decided_recommendations": 3,
  "total_recommendations": 3,
  "accepted_count": 2,
  "dismissed_count": 1,
  "dismissal_rate": 0.33,
  "teacher_flag_inquiry_mode": false,
  "dismissal_pattern_consecutive": 0,
  "inquiry_mode_triggered_at": null,
  "avg_mood_score": 2.5,
  "total_surveys": 12,
  "low_mood_count": 5,
  "high_mood_count": 1,
  "source": "supabase_rpc"
}
```

Rules:

- `total_generated_recommendations` counts all generated rows in the lookback window
- `total_decided_recommendations` counts only `approved + dismissed`
- `total_recommendations` stays as a legacy alias for decided count
- `dismissal_rate = dismissed / (approved + dismissed)`
- `pending` is not part of the dismissal-rate denominator

## 3. n8n Tool Normalization Update

Current normalization in `Tool_ Get Teacher Metrics.json` should be updated to prefer the new fields while keeping backward compatibility.

Suggested replacement for the counting section:

```js
const totalGeneratedRecs = Number(
  $json.total_generated_recommendations ?? $json.total_generated_recs ?? 0
);
const totalDecidedRecs = Number(
  $json.total_decided_recommendations ?? $json.total_recommendations ?? $json.total_recs ?? 0
);
const acceptedCount = Number($json.accepted_count ?? $json.total_approved ?? 0);
const dismissedCount = Number($json.dismissed_count ?? $json.total_dismissed ?? 0);
const dismissalRate = totalDecidedRecs > 0
  ? dismissedCount / totalDecidedRecs
  : Number($json.dismissal_rate ?? 0);
```

Suggested returned payload:

```js
return {
  json: {
    teacher_id: teacherId,
    class_id: classId,
    dismissal_rate: parseFloat(dismissalRate.toFixed(2)),
    total_generated_recommendations: totalGeneratedRecs,
    total_decided_recommendations: totalDecidedRecs,
    total_recommendations: totalDecidedRecs,
    accepted_count: acceptedCount,
    dismissed_count: dismissedCount,
    high_dismissal: dismissalRate > 0.6,
    inquiry_mode_suggested: teacherFlagInquiryMode || (dismissalRate > 0.6 && dismissalPatternConsecutive >= 2),
    teacher_flag_inquiry_mode: teacherFlagInquiryMode,
    dismissal_pattern_consecutive: dismissalPatternConsecutive,
    inquiry_reason: inquiryReason,
    inquiry_mode_triggered_at: $json.inquiry_mode_triggered_at ?? null,
    avg_mood_score: avgMood,
    total_surveys: totalSurveys,
    low_mood_count: lowMoodCount,
    high_mood_count: highMoodCount,
    source: $json.source ?? "supabase_rpc",
    error: null,
  },
};
```

## 4. Teacher Page Query Proposal

Suggested server-side query additions:

- fetch latest `n8n_audit_logs` row for `event_type = 'recommendation_generated'` per class
- read `blocked_reason`
- read `policy_selected`

That data can then drive:

- `/teacher`: class-level cue
- `/teacher/classes`: list cue
- `/teacher/class/[id]`: empty/info state
