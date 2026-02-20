# Phase 0: Research & Technical Architecture Decisions

## Decision 1: Implementing k-anonymity (n ≥ 3) in UI/Data Layers
**Decision**: The k-anonymity constraint will be enforced strictly via Supabase RPCs (Remote Procedure Calls) and UI conditional rendering. 
**Rationale**: By aggregating on the database side using an RPC instead of raw client-side fetching, we prevent raw records from ever reaching the Next.js frontend or network tab. If `COUNT(responses) < 3`, the RPC returns a "privacy_locked: true" flag with null metrics. The UI component `ClassVibeSnapshot` respects this flag to render the "Waiting for more data" message.
**Alternatives considered**: Client-side filtering (violates security; data leaks in network tab); Edge-function filtering (unnecessary overhead compared to direct DB RPC).

## Decision 2: N8N Workflow Integration Approach
**Decision**: N8N will operate entirely asynchronously from User interactions. Communication from System to N8N will happen via Supabase Webhooks (Postgres Triggers -> N8N Webhook node) or Cron jobs fetching from Supabase. Communication from N8N to System will occur via securely authenticated REST API endpoints (`/api/n8n/webhook`) to trigger Next.js cache revalidations.
**Rationale**: This decouples the Node frontend from heavy LLM orchestration. When a student checks in, it writes to Supabase fast (<20s). N8N cron picks it up at the end of the week, calls LLMs, and stores recommendations. The Next.js app merely reads the processed recommendations.
**Alternatives considered**: Direct Next.js API route orchestration to OpenAI (Risk of Vercel serverless timeouts and high coupling).

## Decision 3: Securing Raw Text Privacy
**Decision**: The raw text field submitted by students will only be readable by a specific automated service role (for N8N to utilize in AI summarization) and a cleanup function. Teachers and Admins will be actively blocked from reading this column via Supabase Row Level Security (RLS) policies.
**Rationale**: Ensures constitutional compliance at the database level. Even if a UI bug accidentally requests the raw text column, Supabase will return null for those user roles. 
**Alternatives considered**: Encrypting the raw text (overkill since it will be auto-deleted after 60 days via pg_cron or N8N script anyway).
