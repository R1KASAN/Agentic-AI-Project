# DEPLOYMENT.md — Climate Agent n8n Workflow Deployment Guide

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| n8n | v1.0+ (tested on v2.8.3) | Self-hosted via Docker or n8n Cloud |
| Supabase | Any | PostgreSQL project with REST API enabled |
| Google Gemini API | gemini-2.0-flash | API key from [Google AI Studio](https://aistudio.google.com/) |
| LINE Notify | - | Tokens from [LINE Notify My Page](https://notify-bot.line.me/my/) |
| curl / bash | - | For running test scripts |
| python3 | 3.8+ | Used by test scripts for JSON parsing |

---

## Step 1: Database Setup (Supabase)

Run the SQL migration files **in order** via Supabase SQL Editor:

```bash
# 1. Create tables, indexes, RPCs, and RLS policies
# Paste contents of: database/migrations/001_tables_and_rpc.sql

# 2. Create frequency guard RPC
# Paste contents of: database/migrations/002_frequency_guard.sql
```

### Verify each RPC:

```sql
-- Test k-anonymity RPC (should return empty if no data today)
SELECT * FROM get_aggregated_climate_data(CURRENT_DATE, 3);

-- Test frequency guard (should return limit_exceeded = false for nil UUID)
SELECT * FROM check_frequency_limit('00000000-0000-0000-0000-000000000000', 2, 5);

-- Test teacher response rate (should return empty for nil UUID)
SELECT * FROM get_teacher_response_rate('00000000-0000-0000-0000-000000000000', 30);
```

---

## Step 2: n8n Import Order

> **Critical**: Import sub-workflows FIRST, then update env vars, then import main workflow.

### 2.1 Import Sub-Workflows

1. Open n8n → Workflows → Import From File
2. Import `workflows/tool-get-teacher-metrics.json`
3. Import `workflows/tool-get-past-recommendations.json`
4. **Note the workflow IDs** for each (visible in the URL bar after import)

### 2.2 Update Environment Variables

In n8n: **Settings → Environment Variables**, add:

| Variable | Value | Description |
|---|---|---|
| `SUPABASE_URL` | `https://xxx.supabase.co` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | `eyJ...` | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | `eyJ...` | Supabase service_role key |
| `GEMINI_API_KEY` | `AIza...` | Google Gemini API key |
| `LINE_NOTIFY_TOKEN` | `abc...` | Teacher LINE Notify token |
| `LINE_ADMIN_TOKEN` | `xyz...` | Admin LINE Notify token |
| `ADMIN_WEBHOOK` | `https://hooks.slack.com/...` | Error alert webhook |
| `TOOL_GET_TEACHER_METRICS_ID` | *(from step 2.1)* | Workflow ID |
| `TOOL_GET_PAST_RECS_ID` | *(from step 2.1)* | Workflow ID |

### 2.3 Import Main Workflow

1. Import `workflows/climate-agent-main.json`
2. Verify all nodes show green (no missing credentials/IDs)

---

## Step 3: n8n Credentials Setup

### 3.1 Google Gemini API

1. Go to n8n → Credentials → Add Credential
2. Search "Google PaLM API" (used for Gemini)
3. Name: `Google Gemini API`
4. Paste your API key

### 3.2 Supabase (Header Auth)

The workflow uses raw HTTP requests with environment variables for auth headers.
No additional credential setup needed — headers are set inline via `$env`.

### 3.3 LINE Notify

LINE Notify uses Bearer tokens passed via `$env.LINE_NOTIFY_TOKEN` and `$env.LINE_ADMIN_TOKEN`.
No separate n8n credential needed — tokens are in environment variables.

---

## Step 4: Run Test Scripts

```bash
# Make scripts executable
chmod +x n8n/generated/tests/test_k_anonymity.sh
chmod +x n8n/generated/tests/test_end_to_end.sh

# Copy and fill in .env
cp n8n/generated/.env.example n8n/generated/.env
# Edit .env with real values...

# Run K-Anonymity tests
./n8n/generated/tests/test_k_anonymity.sh

# Run End-to-End tests (sends real LINE messages!)
./n8n/generated/tests/test_end_to_end.sh
```

⚠️ **Do NOT proceed to Step 5 until all tests pass.**

---

## Step 5: Enable Schedule Trigger

1. Open `Climate Agent - Morning Briefing` workflow in n8n
2. Click the toggle in the top-right to **Activate** the workflow
3. The Schedule Trigger will fire at **06:00 UTC (13:00 BKK)** Monday–Friday

To test manually **without waiting for schedule**:
- Click "Test Workflow" in the n8n editor
- This triggers the entire flow immediately

---

## Step 6: Post-Deploy Monitoring

### Daily Checklist

- [ ] Check `n8n_audit_log` table for today's entry
- [ ] Verify `recommendations` table has new `PENDING_APPROVAL` records
- [ ] Confirm LINE notifications were received (teacher + admin if WARNING/CRITICAL)
- [ ] Check n8n Executions tab for any failed runs

### Weekly Checklist

- [ ] Review `error_logs` table for recurring issues
- [ ] Check frequency guard is working (no classroom exceeds 5/week)
- [ ] Verify teacher approval rates via `get_teacher_response_rate` RPC
- [ ] Review AI confidence scores — if consistently < 0.65, review system prompt

### Troubleshooting

| Symptom | Check | Fix |
|---|---|---|
| No execution at 06:00 | n8n workflow active? | Toggle workflow ON |
| "Validate n >= 3" skips | Not enough survey data | Insert test data with ≥3 surveys per classroom |
| Gemini returns error | API key valid? Quota? | Check Google AI Studio for rate limits |
| LINE returns 401 | Token expired/invalid | Generate new token at LINE Notify My Page |
| All fallback used | AI confidence always low | Lower threshold or improve system prompt |
| Frequency limit always hit | Too many test runs | Delete test records from `recommendations` table |

---

## Architecture Diagram

```text
[Schedule: M-F 06:00 UTC]
    ↓
[School Day Guard] ── NO ──→ [STOP]
    ↓ YES
[Supabase RPC: get_aggregated_climate_data (k≥3)]
    ↓
[Validate n≥3] ── NO ──→ [Audit Log: SKIPPED]
    ↓ YES
[Tool: Teacher Metrics] → [Tool: Past Recommendations]
    ↓
[LangChain Agent (Gemini 2.0 Flash)]
    ↓
[Confidence ≥ 0.65?] ── NO ──→ [Fallback Engine]
    ↓ YES                           ↓
[Policy Router: ROUTINE|WARNING|CRITICAL]
    ↓                ↓              ↓
[Insert DB]    [Insert DB]     [Insert DB]
                 ↓                  ↓
             [LINE Teacher]    [LINE Admin]
    ↓                ↓              ↓
              [Audit Log: COMPLETED]
```

---

*Generated by Climate Agent Deployment Automation — 2026-03-17*
