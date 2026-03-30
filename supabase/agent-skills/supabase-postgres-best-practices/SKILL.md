---
name: supabase-postgres-best-practices
description: "Climate Agent best practices for Supabase Postgres audit/error logging, REST APIs, and strict privacy/PII constraints."
tags:
  - supabase
  - postgres
  - n8n
  - privacy
  - audit
---

# Supabase Postgres Best Practices: Climate Agent

This skill defines the strict architectural and privacy constraints for interacting with the Supabase PostgreSQL database within the **Climate Agent** project. It is heavily tailored toward n8n automated workflows (specifically the "Handle Teacher Approval" sub-workflow) and Next.js server actions.

## When to use this skill
- When designing or modifying database tables, particularly `n8n_audit_logs` and `error_logs`.
- When building n8n workflows that write to Supabase via REST APIs.
- When handling JSON/JSONB payloads containing AI recommendations, teacher approvals, or system errors.
- When evaluating payload structures for potential Personally Identifiable Information (PII) leaks.

## What this skill will help the agent do

### 1. Schema Design
Propose robust schemas for logging tables while optimizing for performance and cost.
- **Required columns for `n8n_audit_logs`:**
  - `id` (uuid, primary key, default `gen_random_uuid()`)
  - `created_at` (timestamptz, default `now()`)
  - `workflow_id` (text)
  - `event_type` (text)
  - `recommendation_id` (uuid)
  - `teacher_id` (uuid)
  - `class_id` (uuid)
  - `policy_level` (text)
  - `decision_path_json` (jsonb)
  - `raw_payload` (jsonb)
- **Indexing:** Use `GIN` indexes on `decision_path_json` or `raw_payload` only if querying against specific JSON keys is completely necessary. Otherwise, standard B-tree indexes on foreign keys (`class_id`, `teacher_id`) and timestamps (`created_at`) are preferred.

### 2. Privacy & PII Constraints
Privacy is the core tenet of Climate Agent (k-anonymity, n >= 3).
- **Rule:** Raw student-level data (e.g., arrays of `student_pulses` or `climate_snapshot` events) **must never** be logged into audit or error tables.
- **Rule:** Audit and error logs may only contain:
  - k-anonymized / aggregated information.
  - References by UUID (`class_id`, `teacher_id`).
  - Sanitized JSON payloads (e.g., AI message drafts, teacher notes).
- **Enforcement Pattern:** "Never store arrays named `student_pulses`, `raw_climate_snapshot`, or similar raw sensor streams in `n8n_audit_logs` or `error_logs`." If nested objects look like raw per-student data, reject or strip them before logging.

### 3. Supabase REST + Service Role Usage
For n8n workflows connecting directly to Supabase without user sessions:
- **Endpoints:** Use the `/rest/v1/n8n_audit_logs` and `/rest/v1/error_logs` endpoints.
- **Headers:** Always send the `apikey` and `Authorization: Bearer` headers utilizing the `SUPABASE_SERVICE_ROLE_KEY`.
- **Environment:** Service role usage must remain strictly on the n8n / server side. **Never expose the service role key to the client/frontend.**
- **Reliability:** Ensure idempotent inserts (utilizing constraints on `event_id` or `request_id` if retries are expected) and handle HTTP timeouts gracefully.

### 4. n8n Workflow Integration
Assume standard payload validation inside n8n Code nodes ("Validate Payload").
- **Validation shape:**
  - `event === "recommendation_approved"`
  - `recommendation_id` and `teacher_id` are valid strings (UUIDs).
  - Explicit checks removing keys like `raw_climate_snapshot` before advancing.
- **Logging Example Construction:**
  ```json
  {
    "workflow_id": "{{ $workflow.id }}",
    "event_type": "{{ $('Validate Payload').item.json.data.event }}",
    "recommendation_id": "{{ $('Validate Payload').item.json.data.recommendation_id }}",
    "teacher_id": "{{ $('Validate Payload').item.json.data.teacher_id }}",
    "class_id": "{{ $('Validate Payload').item.json.data.recommendation.class_id }}",
    "policy_level": "{{ $('Validate Payload').item.json.data.recommendation.policy_level }}",
    "decision_path_json": {{ JSON.stringify($('Validate Payload').item.json.data.recommendation.decision_path_json || null) }},
    "raw_payload": {{ JSON.stringify($('Validate Payload').item.json.data) }}
  }
  ```
- **Review:** Constantly review payload configurations in workflows to guarantee that `raw_payload` omits student arrays before finalizing the HTTP Request node.

## Constraints & Guardrails
- **RLS Bypassing:** NEVER recommend bypassing Supabase Row Level Security (RLS) for student or interactive teacher tables. Using the service role key is reserved explicitly for backend system logging (audit/error) and internal admin functions.
- **Key Secrecy:** NEVER recommend exposing `SUPABASE_SERVICE_ROLE_KEY` to the Next.js frontend or `process.env.NEXT_PUBLIC_*`.
- **Payload Minimization:** Always prefer high-level audit info (e.g., HTTP status, event type, affected UUID) over raw payload dumps whenever possible. Keep logs lean.
- **Access Control:** Logging tables (`n8n_audit_logs`, `error_logs`) must be locked down. They are accessible only to backend services (via service role keys) and database administrators, NOT to teachers or students via the DAPI.
