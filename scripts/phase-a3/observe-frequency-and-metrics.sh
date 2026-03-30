#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  observe-frequency-and-metrics.sh snapshot <class-id>
  observe-frequency-and-metrics.sh frequency <class-id> [max-daily] [max-weekly]
  observe-frequency-and-metrics.sh metrics <class-id> [lookback-days]

Notes:
  - Reads SUPABASE_URL and SUPABASE_SERVICE_KEY from the n8n container by default.
  - Override with env vars if needed.
EOF
}

if [[ $# -lt 2 ]]; then
  usage
  exit 1
fi

N8N_CONTAINER="${N8N_CONTAINER:-n8n-docker-n8n-oss-1}"
SUPABASE_URL="${SUPABASE_URL:-$(docker exec "$N8N_CONTAINER" printenv SUPABASE_URL)}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-$(docker exec "$N8N_CONTAINER" printenv SUPABASE_SERVICE_KEY)}"

MODE="$1"
CLASS_ID="$2"

case "$MODE" in
  snapshot)
    curl -sS \
      "$SUPABASE_URL/rest/v1/recommendations?class_id=eq.$CLASS_ID&select=id,class_id,policy_level,status,created_at,updated_at,confidence_score,inquiry_mode,fallback_used&order=created_at.desc&limit=20" \
      -H "apikey: $SUPABASE_SERVICE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
      | jq '.'
    ;;

  frequency)
    MAX_DAILY="${3:-2}"
    MAX_WEEKLY="${4:-5}"
    curl -sS \
      "$SUPABASE_URL/rest/v1/rpc/check_frequency_limit" \
      -H "apikey: $SUPABASE_SERVICE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"p_class_id\":\"$CLASS_ID\",\"p_max_daily\":$MAX_DAILY,\"p_max_weekly\":$MAX_WEEKLY}" \
      | jq '.'
    ;;

  metrics)
    LOOKBACK_DAYS="${3:-30}"
    curl -sS \
      "$SUPABASE_URL/rest/v1/rpc/get_teacher_metrics" \
      -H "apikey: $SUPABASE_SERVICE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"p_class_id\":\"$CLASS_ID\",\"p_lookback_days\":$LOOKBACK_DAYS}" \
      | jq '.'
    ;;

  *)
    usage
    exit 1
    ;;
esac
