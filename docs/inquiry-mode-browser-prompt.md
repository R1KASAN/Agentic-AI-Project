# Browser Prompt: Inquiry Mode QA Verification

```text
Open the local app at http://localhost:3000 and verify the Inquiry Mode QA path after the seed/runbook path is available.

Primary goal:
Verify that the Inquiry Mode teacher flow and student-safe closure path are working end-to-end in the current build.

Important:
- Focus only on observable UI behavior and safe outcome verification.
- Do not evaluate backend refactoring choices.
- Do not suggest expanding the quick actions feature.
- Assume the Inquiry Mode seed/runbook path has already been restored or validated before this test starts.

## Context

The target demo class is:
- CS101 Introduction to Computing
- class_id = 10000000-0000-0000-0000-000000000001

The flow should verify:
1. teacher class detail shows an Inquiry Mode recommendation
2. approve panel shows inquiry-specific helper text
3. only inquiry-oriented quick actions appear
4. empty note blocks approval
5. non-empty note allows approval
6. student page shows latest teacher response safely after approval

## Test steps

1. Open the app and sign in as a teacher if needed.
2. Navigate to the teacher class detail page for CS101.
3. Confirm there is a pending Inquiry Mode recommendation visible on the page.
4. Capture a screenshot of the Inquiry Mode recommendation card before approval.
5. Open the approve panel for that recommendation.
6. Verify:
   - the card is clearly Inquiry Mode
   - inquiry-specific helper text is shown
   - only inquiry-oriented quick actions are shown
   - no corrective-action phrasing appears in the quick actions
7. Capture a screenshot of the approve panel with inquiry quick actions visible.
8. Without entering a note, verify whether confirm approve is blocked in the UI.
9. If the blocked state is visible, capture a screenshot of the empty-note blocked state.
10. Enter a non-empty Thai note and approve successfully.
11. Navigate to:
   - /student/feedback?classId=10000000-0000-0000-0000-000000000001
12. Verify the latest teacher response appears on the student page in a student-safe way.
13. Capture a screenshot of the post-approval student feedback state.

## Required verification points

### Teacher-side Inquiry Mode
- Inquiry Mode recommendation is visible on teacher class detail
- approve panel shows inquiry helper text
- only inquiry quick actions appear
- empty note blocks approval if the UI exposes that state
- non-empty note allows approval

### Student-safe closure path
- latest teacher response appears after approval
- no internal-only fields or debugging data are shown on the student page

## Required screenshots

- Inquiry Mode recommendation card before approval
- Approve panel with inquiry quick actions visible
- Empty-note blocked state, if visible
- Post-approval student feedback state

## Output format

1. Result: PASS or FAIL
2. Findings:
- List only concrete issues
- Include exact page and interaction where each issue occurred
3. Positive observations:
- Briefly note what works well if the flow passes
4. Screenshot summary:
- List the screenshots captured
5. Final verdict:
- Ready as-is
or
- Needs small follow-up

## Guardrails

- Do not recommend redesigning Inquiry Mode UX in this test
- Do not suggest feature expansion unless a concrete UI bug is observed
- Keep findings narrow and evidence-based
```
