# Phase A.3 SQL & Commands

This pack prepares manual operations for:

- previewing and cleaning test artifacts safely
- running observability checks for `check_frequency_limit`
- running observability checks for `get_teacher_metrics`
- comparing current behavior vs target behavior

Warnings:

- Check in `dev` and `staging` first, always.
- Do not run any `DELETE` in production until the preview `SELECT` returns exactly the expected rows.
- Use allowlist by `id` for cleanup. Do not delete by broad conditions like `status = 'pending'`.

## Environment Notes

Use one environment at a time.

- `dev`: safest place to preview, seed, delete, and rerun cases
- `staging`: only after `dev` matches expected behavior
- `prod`: preview-only by default; delete only after explicit human confirmation

This repo includes helper scripts:

- [`preview-test-artifacts.sh`](/Users/ark1/Public/Climate%20Agent/scripts/phase-a3/preview-test-artifacts.sh)
- [`observe-frequency-and-metrics.sh`](/Users/ark1/Public/Climate%20Agent/scripts/phase-a3/observe-frequency-and-metrics.sh)

## Test Artifact Preview

Known `recommendations` test rows:

- `750ee5c4-c9e5-473d-a969-1d62da45d44f`
- `e4908130-14bd-4149-9ebd-66b23e5087d5`

Known `n8n_audit_logs` test rows:

- `445061a9-3297-4a72-b0cb-f8e4b277043d`
- `8dbafc0f-8905-4a18-a1a0-03621104cf9a`

### Preview SQL

```sql
SELECT id, class_id, policy_level, status, created_at
FROM public.recommendations
WHERE id IN (
  '750ee5c4-c9e5-473d-a969-1d62da45d44f',
  'e4908130-14bd-4149-9ebd-66b23e5087d5'
)
ORDER BY created_at DESC;
```

```sql
SELECT id, workflow_id, execution_id, event_type, created_at
FROM public.n8n_audit_logs
WHERE id IN (
  '445061a9-3297-4a72-b0cb-f8e4b277043d',
  '8dbafc0f-8905-4a18-a1a0-03621104cf9a'
)
ORDER BY created_at DESC;
```

### Preview Helper Script

```bash
/Users/ark1/Public/Climate\ Agent/scripts/phase-a3/preview-test-artifacts.sh
```

## Cleanup SQL

Warning:

- Check in `dev` and `staging` first, always.
- Do not run in production until the preview `SELECT` returns exactly the expected rows.

```sql
DELETE FROM public.recommendations
WHERE id IN (
  '750ee5c4-c9e5-473d-a969-1d62da45d44f',
  'e4908130-14bd-4149-9ebd-66b23e5087d5'
);
```

```sql
DELETE FROM public.n8n_audit_logs
WHERE id IN (
  '445061a9-3297-4a72-b0cb-f8e4b277043d',
  '8dbafc0f-8905-4a18-a1a0-03621104cf9a'
);
```

## Post-Cleanup Smoke Test

1. Open `/teacher/class/[id]` for the verification class.
2. Confirm the pending draft list still renders.
3. Open `/teacher/class/[id]/responses`.
4. Confirm history still renders and no runtime error appears.
5. Confirm the removed rows no longer appear in direct DB preview.

## Observability Runbook

Use the same verification class family across all cases to reduce noise.

Record for every run:

- environment
- class id
- RPC raw response
- tool raw response
- n8n execution ids if applicable
- current behavior
- target behavior

### Shared Command Helpers

Direct RPC calls:

```bash
/Users/ark1/Public/Climate\ Agent/scripts/phase-a3/observe-frequency-and-metrics.sh frequency <class-id>
```

```bash
/Users/ark1/Public/Climate\ Agent/scripts/phase-a3/observe-frequency-and-metrics.sh metrics <class-id>
```

Current recommendations snapshot:

```bash
/Users/ark1/Public/Climate\ Agent/scripts/phase-a3/observe-frequency-and-metrics.sh snapshot <class-id>
```

### Case 1: No Recommendations

Goal:

- verify the zero-state semantics

Suggested setup SQL:

```sql
SELECT id, status, created_at
FROM public.recommendations
WHERE class_id = '<class-id>'
ORDER BY created_at DESC;
```

Checklist:

1. Confirm the class has no `recommendations` rows in the relevant window.
2. Run:
   - `observe-frequency-and-metrics.sh frequency <class-id>`
   - `observe-frequency-and-metrics.sh metrics <class-id>`
3. Confirm `daily_count = 0`.
4. Confirm `weekly_count = 0`.
5. Confirm frequency guard is effectively `allowed` because `limit_exceeded = false`.
6. Confirm metrics return `total_recommendations = 0` and `dismissal_rate = 0`.

Expected output example:

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

### Case 2: Pending Only

Goal:

- verify whether `pending` rows are counted today

Warning:

- Check in `dev` and `staging` first, always.
- Do not reuse a production class for seed tests.

Suggested seed SQL:

```sql
INSERT INTO public.recommendations (
  class_id,
  policy_level,
  content,
  ai_message_draft,
  confidence_score,
  reasoning,
  inquiry_mode,
  fallback_used,
  status
) VALUES (
  '<class-id>',
  'WARNING',
  'Phase A.3 pending-only seed',
  'Phase A.3 pending-only seed',
  0.75,
  'manual_phase_a3_pending_seed',
  false,
  true,
  'pending'
);
```

Checklist:

1. Seed exactly one `pending` row for the class.
2. Run:
   - `observe-frequency-and-metrics.sh snapshot <class-id>`
   - `observe-frequency-and-metrics.sh frequency <class-id>`
   - `observe-frequency-and-metrics.sh metrics <class-id>`
3. Record actual `daily_count` and `weekly_count`.
4. Record whether `limit_exceeded` is `true` or `false`.
5. Record `total_recommendations` and `dismissal_rate`.
6. Conclude whether current behavior counts or ignores `pending`.

### Case 3: Mixed Statuses in Week

Goal:

- verify how frequency and metrics treat `pending`, `approved`, and `dismissed`

Warning:

- Check in `dev` and `staging` first, always.
- Do not run the following seed inserts in production.

Suggested seed SQL:

```sql
INSERT INTO public.recommendations (
  class_id,
  policy_level,
  content,
  ai_message_draft,
  confidence_score,
  reasoning,
  inquiry_mode,
  fallback_used,
  status,
  created_at,
  updated_at
) VALUES
  ('<class-id>', 'ROUTINE',  'Phase A.3 mixed seed pending',   'Phase A.3 mixed seed pending',   0.70, 'manual_phase_a3_mixed_pending',   false, true, 'pending',   NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  ('<class-id>', 'WARNING',  'Phase A.3 mixed seed approved',  'Phase A.3 mixed seed approved',  0.82, 'manual_phase_a3_mixed_approved',  false, true, 'approved',  NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('<class-id>', 'CRITICAL', 'Phase A.3 mixed seed dismissed', 'Phase A.3 mixed seed dismissed', 0.88, 'manual_phase_a3_mixed_dismissed', false, true, 'dismissed', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');
```

Checklist:

1. Seed one `pending`, one `approved`, and one `dismissed` row inside the last 7 days.
2. Run:
   - `observe-frequency-and-metrics.sh snapshot <class-id>`
   - `observe-frequency-and-metrics.sh frequency <class-id>`
   - `observe-frequency-and-metrics.sh metrics <class-id>`
3. Check whether `daily_count` matches only today's rows or includes prior days.
4. Check whether `weekly_count` reflects all status types or a subset.
5. Check whether `total_recommendations` counts all rows or only decided rows.
6. Check whether `dismissal_rate` uses only `approved + dismissed` as denominator.

## Current vs Target Behavior Table Template

Use this table for human review after every case:

| Case | Field | Current behavior | Target behavior | Match? | Notes |
|---|---|---|---|---|---|
| Case 1 | daily_count |  | 0 |  |  |
| Case 1 | weekly_count |  | 0 |  |  |
| Case 1 | total_recommendations |  | 0 |  |  |
| Case 1 | dismissal_rate |  | 0 |  |  |
| Case 2 | pending counted? |  | yes/no per spec decision |  |  |
| Case 3 | weekly_count semantics |  | pending+approved only |  |  |
| Case 3 | dismissal_rate denominator |  | approved+dismissed |  |  |
