# Phase C Redacted Voice Pipeline

## Overview

This phase introduces a privacy-first path for turning raw student free-text into teacher-safe, redacted voice excerpts.

The teacher UI must never read `student_pulses.optional_text` directly. Only pre-redacted, k-anonymous, teacher-approved snippets may reach `RedactedVoiceState.status = "ready"`.

## DB Design

### Teacher-safe storage

Applied migration source:

- [030_phase_c_redacted_voice_pipeline.sql](/Users/ark1/Public/Climate%20Agent/supabase/migrations/030_phase_c_redacted_voice_pipeline.sql)

Reference proposal:

- [032_phase_c_redacted_voice_pipeline.sql](/Users/ark1/Public/Climate%20Agent/supabase/proposals/032_phase_c_redacted_voice_pipeline.sql)

Core table:

- `public.redacted_student_snippets`

Teacher-safe fields:

- `id`
- `class_id`
- `week_start`
- `tone`
- `text_redacted`
- `source_window`
- `created_at`

Internal-only fields:

- `approval_status`
- `contributing_students_count`
- `decision_path_json`
- `created_by_workflow`
- `created_by_execution`

### RPCs

Teacher-facing:

- `get_class_redacted_voice(p_class_id uuid, p_weeks int)`
  - returns only approved rows
  - returns only already-redacted text
  - enforces class ownership through `auth.uid()`
  - filters to `contributing_students_count >= 3`

Internal-only:

- `get_raw_redaction_comment_batch(p_class_id uuid, p_weeks int, p_limit int)`
  - returns raw comments without student identifiers
  - only when distinct contributing students in scope are `>= 3`
- `write_redacted_student_snippets(...)`
  - accepts already-redacted payload only
  - intended for n8n toolWorkflow writes

## n8n Architecture

### Main batch workflow

Implemented dev workflow:

- Trigger
  - Manual Trigger only in dev
- Fetch Target Classes
  - reads classes from Supabase
- Redaction Agent
  - uses Gemini 2.0 Flash through LangChain
  - must call tool sub-workflow `get_raw_snippet_batch` first
  - may call `write_redacted_snippets` only after safe paraphrase is ready
- Insert Audit Log
  - writes batch outcome into `n8n_audit_logs`
- Notify Webhook
  - posts `redacted_voice_updated` to `/api/n8n/webhook`

### Tool sub-workflows

- `get_raw_snippet_batch`
  - `Execute Workflow Trigger`
  - RPC call to `get_raw_redaction_comment_batch(...)`
- `write_redacted_snippets`
  - `Execute Workflow Trigger`
  - validates snippet payload
  - RPC call to `write_redacted_student_snippets(...)`

## Gemini Prompt Contract

Input:

- raw comments for a class/week window
- minimal aggregate context only
  - week range
  - average mood / pace / fairness
  - k-anonymous student count

Output:

- 1–3 Thai snippets
- each snippet:
  - must be paraphrased
  - must remove names and identifying details
  - must represent a shared pattern, not a single-person quote
  - may include `tone: low | mixed | positive`

Safety rules:

- never emit raw text verbatim
- never include names, nicknames, sections, clubs, devices, or unique incidents
- when uncertain, drop the snippet instead of forcing one

## UI Integration

Server-side integration now lives in:

- [teacherDashboard.ts](/Users/ark1/Public/Climate%20Agent/src/lib/teacherDashboard.ts)
- [page.tsx](/Users/ark1/Public/Climate%20Agent/src/app/%28dashboard%29/teacher/class/%5Bid%5D/page.tsx)

Behavior:

- RPC unavailable or not applied yet
  - keep existing fallback states:
    - `pipeline_pending`
    - `insufficient_signal`
- RPC returns safe snippets
  - map to `RedactedVoiceState.status = "ready"`
- RPC returns empty list
  - show privacy-safe `insufficient_signal`

## Privacy Boundaries

Allowed in teacher UI:

- aggregate climate metrics
- teacher metrics
- teacher-safe audit signals
- already-redacted snippets from `get_class_redacted_voice()`

Forbidden in teacher UI:

- raw `student_pulses` rows
- `student_pulses.optional_text`
- student identifiers of any kind
- exact original comment timestamps

Allowed in internal redaction pipeline only:

- raw comment text via tightly-scoped internal RPC
- no student identifiers required for LLM processing

## Logging

Recommended audit event:

- `event_type = "redaction_batch_processed"`

Recommended `decision_path_json`:

- `batch_size`
- `snippets_written`
- `approval_status`
- `failure_reason` when applicable
- aggregate context only, never raw comment text

## Current Status

Implemented in repo:

- applied migration source for table + RPCs
- import-ready workflow files:
  - [tool-get-raw-snippet-batch.json](/Users/ark1/Public/Climate%20Agent/n8n/workflows/tools/tool-get-raw-snippet-batch.json)
  - [tool-write-redacted-snippets.json](/Users/ark1/Public/Climate%20Agent/n8n/workflows/tools/tool-write-redacted-snippets.json)
  - [phase-c-redaction-batch.json](/Users/ark1/Public/Climate%20Agent/n8n/workflows/phase-c-redaction-batch.json)
- server-side wiring for `get_class_redacted_voice()`
- `RedactedVoiceState` mapping to `ready` when safe rows exist
- webhook revalidation support for `redacted_voice_updated`

Deferred:

- production scheduling

## Dev Sync Notes

Recommended order:

1. `supabase db push`
2. import `Tool: Get Raw Snippet Batch`
3. import `Tool: Write Redacted Snippets`
4. replace `__PHASEC_RAW_TOOL_ID__` and `__PHASEC_WRITE_TOOL_ID__` in [phase-c-redaction-batch.json](/Users/ark1/Public/Climate%20Agent/n8n/workflows/phase-c-redaction-batch.json)
5. import `phase-c-redaction-batch`
6. run the main workflow manually in n8n
