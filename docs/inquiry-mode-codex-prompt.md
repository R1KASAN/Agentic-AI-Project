# Codex Prompt: Inquiry Mode QA Path Validation

```text
You are working in the repository at:

/Users/ark1/Public/Climate Agent

Your task is to close the current QA coverage gap for Inquiry Mode by making the Inquiry Mode QA path reproducible for demo/testing.

This is a focused QA/demo reproducibility task.
Do not expand the quick actions feature.
Do not redesign UI.
Do not propose backend/schema/API changes unless you first confirm that the existing seed/runbook are stale or broken.

## Goal

Make it possible for QA or a demo operator to reliably verify the Inquiry Mode path from:
1. teacher class detail
2. approve-with-note flow
3. student-safe closure path

using the existing repo assets as the starting point.

## Existing assets to validate first

- /Users/ark1/Public/Climate Agent/supabase/seed/cs101-inquiry-mode-demo-recommendation.sql
- /Users/ark1/Public/Climate Agent/docs/inquiry-mode-demo-runbook.md

Also inspect the relevant current UI/API paths before changing anything:
- /Users/ark1/Public/Climate Agent/src/components/domain/teacher/RecommendationList.tsx
- /Users/ark1/Public/Climate Agent/src/app/(dashboard)/teacher/class/[id]/ClassDetailClient.tsx
- /Users/ark1/Public/Climate Agent/src/app/api/student/feedback/route.ts
- /Users/ark1/Public/Climate Agent/src/lib/actions/recommendations.ts

## What to do

1. Validate whether the SQL seed still works against the current schema/data assumptions.
2. Validate whether the Inquiry Mode demo runbook still matches the current UI and flow.
3. Confirm whether CS101 demo class still exists and is usable:
   - class_id = 10000000-0000-0000-0000-000000000001
4. Determine the smallest safe path to make Inquiry Mode QA/demo reproducible.
5. If the existing seed/runbook already work, keep changes minimal and update only docs/checklist if needed.
6. If they are stale, refresh only the minimum required files/steps to restore a reproducible QA path.
7. Do not touch unrelated code.

## Required verification target

The final QA/demo path must make it possible to verify all of the following:

### Teacher-side Inquiry Mode
- a pending inquiry-mode recommendation can be created reproducibly
- it appears on teacher class detail
- the card is visibly Inquiry Mode
- the approve panel shows inquiry-specific helper text
- the approve panel shows inquiry-only quick actions
- confirm approve remains blocked when note is empty
- approve succeeds once a non-empty note is entered

### Student-safe closure path
After teacher approval with a note:
- the latest recommendation row reflects:
  - inquiry_mode = true
  - status = 'approved'
  - teacher_approval_status = 'approved'
  - communicated_to_students = true
  - teacher_action_note is not empty
- /student/feedback?classId=10000000-0000-0000-0000-000000000001 shows the latest teacher response safely
- no internal-only fields leak to the student page

## Constraints

Do not do these unless absolutely required by broken/stale assets:
- no redesign of Inquiry Mode UX
- no new feature work in recommendation card
- no schema migration by default
- no API contract changes
- no approval logic changes
- no broad refactor

If you discover a blocker, explain it clearly before proposing any non-trivial change.

## Deliverables

At the end, provide:

1. Summary
- What was broken or missing
- What you changed, if anything

2. Reproducible QA path
- Exact steps QA can now run
- Exact file(s) to use
- Any command or SQL snippet required

3. Validation result
- Whether the path is now reproducible
- Which acceptance checks were confirmed
- What remains unverified, if anything

4. Files changed
- List each file path changed

## Success criteria

This task is successful if QA can reliably create or expose a pending Inquiry Mode recommendation for CS101 and verify:
- teacher Inquiry Mode UX
- note-required approve behavior
- student-safe closure path

Prefer the smallest possible fix.
If the current assets already work, do not over-engineer.
```
