# Dev RPC Rollout

This guide is for `dev-only`.

Do not use these commands for `staging` or `prod` in this phase.

Do not apply SQL from this guide until you have backed up the current function definitions first.

## Section 1: Dev Apply Commands

Warnings:

- `dev-only`
- back up the current function definitions first
- store the backup in `supabase/proposals/029_backup_frequency_and_metrics_pre_phase_a3.sql`
- review the backup file before running the apply step

### A. Prepare connection variables

```bash
cd /Users/ark1/Public/Climate\ Agent

DB_CLIENT_CONTAINER=n8n-docker-postgres-oss-1
SUPABASE_DB_HOST=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_HOST)
SUPABASE_DB_PORT=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_PORT)
SUPABASE_DB_DATABASE=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_DATABASE)
SUPABASE_DB_USER=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_USER)
SUPABASE_DB_PASSWORD=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_PASSWORD)
```

### B. Preview current function definitions

This exports both function definitions before any change.

```bash
cd /Users/ark1/Public/Climate\ Agent

DB_CLIENT_CONTAINER=n8n-docker-postgres-oss-1
SUPABASE_DB_HOST=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_HOST)
SUPABASE_DB_PORT=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_PORT)
SUPABASE_DB_DATABASE=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_DATABASE)
SUPABASE_DB_USER=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_USER)
SUPABASE_DB_PASSWORD=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_PASSWORD)

docker exec -e PGPASSWORD="$SUPABASE_DB_PASSWORD" "$DB_CLIENT_CONTAINER" \
  psql "host=$SUPABASE_DB_HOST port=$SUPABASE_DB_PORT dbname=$SUPABASE_DB_DATABASE user=$SUPABASE_DB_USER sslmode=require" \
  -Atc "select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('check_frequency_limit', 'get_teacher_metrics') order by p.proname;" \
  | tee /Users/ark1/Public/Climate\ Agent/supabase/proposals/029_backup_frequency_and_metrics_pre_phase_a3.sql
```

Quick sanity check:

```bash
cd /Users/ark1/Public/Climate\ Agent
sed -n '1,240p' supabase/proposals/029_backup_frequency_and_metrics_pre_phase_a3.sql
```

### C. Apply the proposal in dev

Warning:

- `dev-only`
- do not run this until the backup file exists and looks correct

```bash
cd /Users/ark1/Public/Climate\ Agent

DB_CLIENT_CONTAINER=n8n-docker-postgres-oss-1
SUPABASE_DB_HOST=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_HOST)
SUPABASE_DB_PORT=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_PORT)
SUPABASE_DB_DATABASE=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_DATABASE)
SUPABASE_DB_USER=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_USER)
SUPABASE_DB_PASSWORD=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_PASSWORD)

docker exec -i -e PGPASSWORD="$SUPABASE_DB_PASSWORD" "$DB_CLIENT_CONTAINER" \
  psql "host=$SUPABASE_DB_HOST port=$SUPABASE_DB_PORT dbname=$SUPABASE_DB_DATABASE user=$SUPABASE_DB_USER sslmode=require" \
  < /Users/ark1/Public/Climate\ Agent/supabase/proposals/030_phase_a3_frequency_guard_and_metrics.sql
```

### D. Re-export definitions after apply

```bash
cd /Users/ark1/Public/Climate\ Agent

DB_CLIENT_CONTAINER=n8n-docker-postgres-oss-1
SUPABASE_DB_HOST=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_HOST)
SUPABASE_DB_PORT=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_PORT)
SUPABASE_DB_DATABASE=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_DATABASE)
SUPABASE_DB_USER=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_USER)
SUPABASE_DB_PASSWORD=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_PASSWORD)

docker exec -e PGPASSWORD="$SUPABASE_DB_PASSWORD" "$DB_CLIENT_CONTAINER" \
  psql "host=$SUPABASE_DB_HOST port=$SUPABASE_DB_PORT dbname=$SUPABASE_DB_DATABASE user=$SUPABASE_DB_USER sslmode=require" \
  -Atc "select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('check_frequency_limit', 'get_teacher_metrics') order by p.proname;" \
  | tee /Users/ark1/Public/Climate\ Agent/supabase/proposals/031_post_apply_frequency_and_metrics_dev.sql
```

## Section 2: Dev Verification Steps & Expected Semantics

Verification class:

- `994e8327-f00f-4117-af75-5a838d5c48d9`

Run after the apply step:

```bash
cd /Users/ark1/Public/Climate\ Agent
./scripts/phase-a3/observe-frequency-and-metrics.sh frequency 994e8327-f00f-4117-af75-5a838d5c48d9
./scripts/phase-a3/observe-frequency-and-metrics.sh metrics 994e8327-f00f-4117-af75-5a838d5c48d9
```

Expected semantics after apply:

- `daily_count` and `weekly_count` count `status in ('pending','approved')`
- `dismissed` is excluded from frequency guard counts
- `dismissal_rate = dismissed / (approved + dismissed)`
- `pending` is not included in the denominator of `dismissal_rate`
- `total_generated_recommendations` counts all rows in the lookback window
- `total_decided_recommendations` counts only `approved + dismissed`
- `total_recommendations` remains the legacy alias for decided count

Suggested dev log template:

```md
| run_at_utc | class_id | daily_count | weekly_count | limit_exceeded | reason | total_generated_recommendations | total_decided_recommendations | total_recommendations | dismissal_rate | notes |
|---|---|---:|---:|---|---|---:|---:|---:|---:|---|
| 2026-03-24T08:00:00Z | 994e8327-f00f-4117-af75-5a838d5c48d9 | 0 | 0 | false | Within limits | 0 | 0 | 0 | 0.00 | post-apply zero-state verification |
| 2026-03-24T08:10:00Z | 994e8327-f00f-4117-af75-5a838d5c48d9 | 1 | 1 | false | Within limits | 1 | 0 | 0 | 0.00 | pending row counted in frequency, not in dismissal denominator |
| 2026-03-24T08:20:00Z | 994e8327-f00f-4117-af75-5a838d5c48d9 | 1 | 3 | false | Within limits | 4 | 3 | 3 | 0.33 | one pending + two approved + one dismissed |
```

## Section 3: n8n Tool Update Plan

Target workflow:

- `/Users/ark1/Downloads/Tool_ Get Teacher Metrics.json`

Nodes that need changes next:

### 1. `Get Teacher Metrics from Supabase`

No structural change is required if the RPC name stays the same:

- keep calling `POST /rest/v1/rpc/get_teacher_metrics`
- keep the same input body:
  - `p_class_id`
  - `p_lookback_days`

The important change is that the node response will now include more fields.

### 2. `Return Data`

This is the main node that must be updated in Phase B.

New fields it should read from RPC:

- `total_generated_recommendations`
- `total_decided_recommendations`
- `total_recommendations`
- `dismissal_rate`
- `accepted_count`
- `dismissed_count`
- `teacher_flag_inquiry_mode`
- `dismissal_pattern_consecutive`
- `inquiry_mode_triggered_at`

Recommended mapping behavior:

- prefer `total_generated_recommendations` for generated-volume analytics
- prefer `total_decided_recommendations` for dismissal denominator logic
- keep `total_recommendations` in the output as the legacy alias for decided count
- if `dismissal_rate` is already returned by RPC, use that directly
- compute `high_dismissal` from the normalized `dismissal_rate`
- compute or pass through `inquiry_mode_suggested`

Recommended output shape:

```ts
{
  teacher_id,
  class_id,
  dismissal_rate,
  total_generated_recommendations,
  total_decided_recommendations,
  total_recommendations,
  accepted_count,
  dismissed_count,
  high_dismissal,
  inquiry_mode_suggested,
  teacher_flag_inquiry_mode,
  dismissal_pattern_consecutive,
  inquiry_reason,
  inquiry_mode_triggered_at,
  avg_mood_score,
  total_surveys,
  low_mood_count,
  high_mood_count,
  source,
  error
}
```

Suggested Phase B node-edit order:

1. update `Return Data` to normalize the new counters
2. validate the workflow output in zero-state and mixed-status cases
3. only then update UI consumers to read the new metrics cues
