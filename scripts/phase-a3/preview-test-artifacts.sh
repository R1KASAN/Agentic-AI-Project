#!/usr/bin/env bash
set -euo pipefail

N8N_CONTAINER="${N8N_CONTAINER:-n8n-docker-n8n-oss-1}"
SUPABASE_URL="${SUPABASE_URL:-$(docker exec "$N8N_CONTAINER" printenv SUPABASE_URL)}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-$(docker exec "$N8N_CONTAINER" printenv SUPABASE_SERVICE_KEY)}"

RECOMMENDATION_IDS="${RECOMMENDATION_IDS:-750ee5c4-c9e5-473d-a969-1d62da45d44f,e4908130-14bd-4149-9ebd-66b23e5087d5}"
AUDIT_IDS="${AUDIT_IDS:-445061a9-3297-4a72-b0cb-f8e4b277043d,8dbafc0f-8905-4a18-a1a0-03621104cf9a}"

recs_filter="$RECOMMENDATION_IDS"
audit_filter="$AUDIT_IDS"

echo "== recommendations preview =="
curl -sS \
  "$SUPABASE_URL/rest/v1/recommendations?id=in.($recs_filter)&select=id,class_id,policy_level,status,created_at&order=created_at.desc" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  | jq '.'

echo
echo "== n8n_audit_logs preview =="
curl -sS \
  "$SUPABASE_URL/rest/v1/n8n_audit_logs?id=in.($audit_filter)&select=id,workflow_id,execution_id,event_type,created_at&order=created_at.desc" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  | jq '.'
