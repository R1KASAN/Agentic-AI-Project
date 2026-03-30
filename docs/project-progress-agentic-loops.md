# Climate Agent Progress Summary

**Status:** In Progress  
**Date:** 2026-03-23  
**Scope:** Agentic loops, teacher approval flow, Supabase safety layer, and n8n orchestration

## Project Overview

Climate Agent is a privacy-first classroom climate system that turns student check-ins into safe, aggregated signals for teachers. It helps the school team spot learning, wellbeing, and collaboration issues early without exposing raw student data.

## Completed Loops & Features

### Frontend

- The teacher dashboard is implemented and recommendation cards render correctly.
- The approval flow is fully functional.
- RLS behavior has been verified on the approval path, so the teacher can act on recommendations without hitting the earlier blocking issue.

### Backend / Supabase

- Core RLS policies are established.
- The main data tables are in place, including `recommendations`, `teacher_profiles`, and `n8n_audit_log`.
- The safety RPCs are deployed, including k-anonymity enforcement and frequency-limit checks.
- The backend path now supports secure teacher approvals while preserving the privacy boundary between raw student input and teacher-facing summaries.

### n8n Core Workflow

- Schedule triggers drive the main recommendation loop.
- Safety gates enforce k-anonymity with `n >= 3` and apply frequency limits before recommendations are written.
- The LangChain Agent uses Gemini 2.0 Flash to generate policy-level guidance.
- Tool usage is wired for `get_teacher_metrics` and `get_past_recs`, so the agent can compare current conditions with teacher response history.
- A fallback policy engine is present so the workflow can still produce a safe recommendation when the model confidence is too low or the agent output is unavailable.

## Pending Features & Next Steps

### Inquiry Mode

- Fully wire the end-to-end flow from `teacher_profiles.is_inquiry_mode` and dismissal patterns into the Gemini system prompt.
- Persist the reflective, question-style output on recommendations so inquiry mode has a stable output shape across runs.

### Audits & Debugging

- Ensure `decision_path_json` inside `n8n_audit_log` can reconstruct why the agent selected a specific policy level.
- Preserve enough branch metadata to distinguish the AI path from the fallback path during later review.

### Dismissal Flow

- Refactor the dismiss action to reuse the updated RLS and ownership logic from the approve action.
- Keep both teacher actions aligned so the same security model applies to approval and dismissal.

## Copy-Paste Follow-Up Prompt

```markdown
Re-summarize the current Climate Agent progress using the latest code and workflow changes.

Please highlight:
- Any newly completed work in Inquiry Mode, especially whether `teacher_profiles.is_inquiry_mode` is now wired into the Gemini prompt and persisted on recommendations.
- Any improvements to audit logging, especially whether `decision_path_json` in `n8n_audit_log` can now reconstruct the policy decision path and distinguish AI vs fallback execution.
- Any changes to teacher approval, dismissal, RLS, or ownership handling since the last review.

Then give the top 3 next actions to harden Climate Agent for production, focused on:
1. Monitoring and observability
2. Error handling and recovery
3. Scaling safely to 100+ teachers

Keep the answer concise, specific, and grounded in the current repo state.
```

## Source Signals Used

- `n8n/generated/workflows/climate-agent-main.json`
- `src/app/(teacher)/actions/approveRecommendation.ts`
- `src/lib/actions/recommendations.ts`
- `n8n/generated/database/migrations/001_tables_and_rpc.sql`
- `n8n/generated/database/migrations/002_frequency_guard.sql`
