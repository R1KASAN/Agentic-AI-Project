# Student Feedback Loop Closure

## Decision

Student-visible loop closure on `/student/feedback` uses the teacher approval flow as the source of truth.

When a teacher approves a recommendation:

- if `note.trim().length > 0`
  - save the note to `teacher_action_note`
  - mark `communicated_to_students = true`
  - allow the student feedback page to show it as `recent_action`
- if the note is empty
  - still allow the approval
  - keep it as an internal teacher action only
  - do not show it to students

## Why

- Keeps the student experience tied to real teacher actions instead of manual SQL setup
- Preserves low-friction teacher approval for internal use
- Ensures students only see actions that the teacher explicitly wrote for them
- Avoids making n8n webhook success a blocker for loop closure visibility

## Student API Contract

`GET /api/student/feedback?classId={id}` returns:

- `recent_action = null` when there is no communicated teacher note
- `recent_action = { id, note, logged_at, status_label }` when the latest qualifying recommendation exists

`status_label` is derived from `teacher_approval_status` / `status` and is not stored as its own database column.

## Teacher UX Rule

Teacher approval UIs should explain:

- if the teacher writes a note, students will see it on the feedback page
- if the teacher leaves the note blank, the approval stays internal

## n8n Role

n8n remains a side-effect layer for audit, notifications, and follow-up automation.

It should not be the gating condition for whether a student sees `recent_action`.
