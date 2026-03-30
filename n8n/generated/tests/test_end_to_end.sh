#!/usr/bin/env bash
# ============================================================================
# FILE 8: End-to-End Integration Test Script
# Tests all external service connectivity before enabling the workflow.
# Usage: chmod +x tests/test_end_to_end.sh && ./tests/test_end_to_end.sh
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/../.env" ]; then
  source "$SCRIPT_DIR/../.env"
elif [ -f "$SCRIPT_DIR/../.env.example" ]; then
  echo "⚠️  Using .env.example — fill in real values first!"
  source "$SCRIPT_DIR/../.env.example"
fi

PASS=0
FAIL=0
TODAY=$(date +%Y-%m-%d)
NIL_UUID="00000000-0000-0000-0000-000000000000"

echo "============================================"
echo "🧪 End-to-End Integration Test Suite"
echo "   Date: $TODAY"
echo "============================================"
echo ""

# ─── TEST 1: Supabase API reachable ───
echo "TEST 1: Supabase API reachable"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "${SUPABASE_URL}/rest/v1/" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

if [ "$HTTP_CODE" = "200" ]; then
  echo "  ✅ PASS — Supabase API returned HTTP 200"
  PASS=$((PASS + 1))
else
  echo "  ❌ FAIL — Supabase API returned HTTP $HTTP_CODE"
  FAIL=$((FAIL + 1))
fi
echo ""

# ─── TEST 2: RPC get_aggregated_climate_data returns JSON array ───
echo "TEST 2: RPC get_aggregated_climate_data returns JSON array"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${SUPABASE_URL}/rest/v1/rpc/get_aggregated_climate_data" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"p_date\": \"${TODAY}\", \"p_min_n\": 3}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  IS_ARRAY=$(echo "$BODY" | python3 -c "import sys,json; data=json.load(sys.stdin); print('yes' if isinstance(data, list) else 'no')" 2>/dev/null || echo "no")
  if [ "$IS_ARRAY" = "yes" ]; then
    echo "  ✅ PASS — Returns valid JSON array"
    PASS=$((PASS + 1))
  else
    echo "  ❌ FAIL — Response is not a JSON array"
    FAIL=$((FAIL + 1))
  fi
else
  echo "  ❌ FAIL — HTTP $HTTP_CODE"
  FAIL=$((FAIL + 1))
fi
echo ""

# ─── TEST 3: RPC check_frequency_limit responds with limit_exceeded field ───
echo "TEST 3: RPC check_frequency_limit responds with limit_exceeded field"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${SUPABASE_URL}/rest/v1/rpc/check_frequency_limit" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"p_classroom_id\": \"${NIL_UUID}\", \"p_max_daily\": 2, \"p_max_weekly\": 5}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  HAS_FIELD=$(echo "$BODY" | python3 -c "
import sys,json
data=json.load(sys.stdin)
row = data[0] if isinstance(data, list) and len(data) > 0 else data
print('yes' if 'limit_exceeded' in row else 'no')
" 2>/dev/null || echo "no")

  if [ "$HAS_FIELD" = "yes" ]; then
    echo "  ✅ PASS — Response contains limit_exceeded field"
    PASS=$((PASS + 1))
  else
    echo "  ❌ FAIL — Response missing limit_exceeded field: $BODY"
    FAIL=$((FAIL + 1))
  fi
else
  echo "  ❌ FAIL — HTTP $HTTP_CODE"
  FAIL=$((FAIL + 1))
fi
echo ""

# ─── TEST 4: get_teacher_response_rate with nil UUID ───
echo "TEST 4: RPC get_teacher_response_rate with nil UUID (expect empty, no error)"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${SUPABASE_URL}/rest/v1/rpc/get_teacher_response_rate" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"p_classroom_id\": \"${NIL_UUID}\", \"p_days\": 30}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "  ✅ PASS — HTTP 200 (empty result expected for nil UUID)"
  PASS=$((PASS + 1))
else
  echo "  ❌ FAIL — HTTP $HTTP_CODE (should not error on nil UUID)"
  FAIL=$((FAIL + 1))
fi
echo ""

# ─── TEST 5: Gemini API connectivity ───
echo "TEST 5: Gemini API connectivity"
GEMINI_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hi, respond with OK"}]}]}')

if [ "$GEMINI_RESPONSE" = "200" ]; then
  echo "  ✅ PASS — Gemini API reachable"
  PASS=$((PASS + 1))
else
  echo "  ❌ FAIL — Gemini API returned HTTP $GEMINI_RESPONSE"
  FAIL=$((FAIL + 1))
fi
echo ""

# ─── TEST 6: LINE Notify teacher token ───
echo "TEST 6: LINE Notify teacher token"
LINE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "https://notify-api.line.me/api/notify" \
  -H "Authorization: Bearer ${LINE_NOTIFY_TOKEN}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "message=🧪 Climate Agent E2E Test — Teacher Channel ($(date +%H:%M))")

LINE_HTTP=$(echo "$LINE_RESPONSE" | tail -1)
LINE_BODY=$(echo "$LINE_RESPONSE" | head -n -1)

if [ "$LINE_HTTP" = "200" ]; then
  echo "  ✅ PASS — LINE Notify teacher token works"
  PASS=$((PASS + 1))
else
  echo "  ❌ FAIL — LINE Notify teacher returned HTTP $LINE_HTTP: $LINE_BODY"
  FAIL=$((FAIL + 1))
fi
echo ""

# ─── TEST 7: LINE Notify admin token ───
echo "TEST 7: LINE Notify admin token"
LINE_ADMIN_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "https://notify-api.line.me/api/notify" \
  -H "Authorization: Bearer ${LINE_ADMIN_TOKEN}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "message=🧪 Climate Agent E2E Test — Admin Channel ($(date +%H:%M))")

LINE_ADMIN_HTTP=$(echo "$LINE_ADMIN_RESPONSE" | tail -1)
LINE_ADMIN_BODY=$(echo "$LINE_ADMIN_RESPONSE" | head -n -1)

if [ "$LINE_ADMIN_HTTP" = "200" ]; then
  echo "  ✅ PASS — LINE Notify admin token works"
  PASS=$((PASS + 1))
else
  echo "  ❌ FAIL — LINE Notify admin returned HTTP $LINE_ADMIN_HTTP: $LINE_ADMIN_BODY"
  FAIL=$((FAIL + 1))
fi
echo ""

# ─── SUMMARY ───
echo "============================================"
echo "📊 Results: $PASS PASSED, $FAIL FAILED out of 7 tests"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  echo "⚠️  Some tests failed. Fix issues before enabling the workflow."
  exit 1
fi

echo "✅ All tests passed. Safe to enable the workflow."
exit 0
