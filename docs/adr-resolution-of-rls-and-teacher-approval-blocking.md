# ADR: Resolution of RLS and Teacher Approval Blocking

**Status:** Accepted  
**Date:** 2026-03-23  
**Related Implementation:** `src/app/(teacher)/actions/approveRecommendation.ts`, `src/lib/actions/recommendations.ts`, `n8n/generated/workflows/climate-agent-main.json`, `n8n/workflows/handle-teacher-approval.json`

## Context / Problem

The teacher approval flow was blocked by a misleading `0 rows affected` result when the Next.js frontend attempted to update a recommendation. The root cause was a mismatch between the approval logic and the data model: recommendations were originally created by n8n with `teacher_id = NULL`, but the update path still assumed that `teacher_id` was already populated and should be part of the row match.

At the same time, Supabase RLS and the ownership model required the authenticated user to be the actual class owner, so the request had to satisfy both the application-level ownership check and the database-level policy. In practice, the old update path was brittle because it coupled approval to `teacher_id` on the recommendation row instead of verifying ownership through the class relationship.

## Decision / Solution

We refactored the approval flow so the authenticated teacher session is the source of identity and the class relationship is the source of ownership.

- Fetch the active user with `supabase.auth.getUser()` before approving.
- Verify ownership through the class relationship, such as `classes` or an equivalent mapping table, rather than relying on `recommendations.teacher_id` being populated.
- Update the recommendation row exclusively with `.eq('id', input.recommendationId)`.
- Remove the `.eq('teacher_id', ...)` constraint from the approval update path so the row can be updated even when the recommendation was originally created by n8n with a null teacher reference.
- Trigger the n8n approval webhook only after the update succeeds, so downstream workflow execution and audit logging continue as designed.

## Consequences

This change restores secure approvals without weakening authorization.

- Teacher approvals now succeed reliably even when the recommendation row was created by n8n before ownership metadata was attached.
- The approval flow still respects security boundaries because access is verified through authenticated identity plus class ownership, not by trusting a mutable row field.
- Successful approvals continue to trigger the n8n webhook, which keeps the closure loop intact and allows the workflow to write to `n8n_audit_log`.
- The system is now easier to reason about because the recommendation row is updated by primary key, while authorization is handled by the user session and class ownership model.

## Notes

- This ADR describes the authorization fix for the approval path. The dismissal path should be refactored to use the same ownership model so both actions stay aligned.
- The workflow-level audit trail remains the primary source for reconstructing the recommendation lifecycle, especially when the n8n agent branches into fallback handling.
