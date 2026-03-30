# Phase B.3 Recommendation Explainability UI

## Overview

This phase hardens the teacher-facing recommendation experience in dev by making draft cards easier to understand without exposing student-level data.

It does not change the approval workflow or n8n recommendation logic.

## Recommendation View Model

The class detail page and responses page now normalize recommendation rows into a UI-safe shape:

```ts
type RecommendationViewModel = {
  id: string
  classId: string
  status: "pending" | "approved" | "dismissed" | "sent"
  createdAt: string
  policyLevel: "ROUTINE" | "WARNING" | "CRITICAL" | null
  priority: "NORMAL" | "HIGH" | "URGENT" | null
  inquiryMode: boolean
  fallbackUsed: boolean
  aiMessageDraft: string | null
  actions: string[]
  confidenceScore: number | null
  confidenceLabel: "สูง" | "กลาง" | "ระวัง" | null
  reasoningSummary: string | null
  rationaleTag:
    | "trend_shift"
    | "low_mood"
    | "pace_friction"
    | "fairness_signal"
    | "mixed_signal"
    | "unknown"
  dismissalReason: string | null
  teacherActionNote: string | null
}
```

## Explainability Rules

- `confidenceLabel`
  - `>= 0.8` -> `สูง`
  - `>= 0.6` -> `กลาง`
  - `< 0.6` -> `ระวัง`
- `reasoningSummary`
  - derived from recommendation fields plus class-level aggregate climate
  - must stay short, non-technical, and non-student-specific
- `inquiryMode`
  - can come from recommendation row or current class-level inquiry signal
- `fallbackUsed`
  - shown as a trust-building note, not as an alarm

## Blocked State Matrix

| Condition | UI state |
|---|---|
| pending draft exists | show draft card |
| no pending + `blocked_reason = frequency_limit_exceeded` | show “No new draft this cycle” |
| no pending + `blocked_reason = k_anonymity` | show “Waiting for safe aggregate signal” |
| no pending + no blocked reason | show neutral empty state |

## Privacy Constraints

Allowed:

- recommendation row fields already stored in `recommendations`
- class-level metrics from `get_teacher_metrics()`
- aggregate climate from `get_class_climate_summary()`
- class-level audit signal from `n8n_audit_logs`

Forbidden:

- raw `student_pulses` rows
- `student_pulses.optional_text`
- any student-identifiable explanation
- fabricated student quotes

## Contract Verification Note

Current dev UI expectations align with the workflow/data contracts already in place:

- `n8n_audit_logs.blocked_reason`
  - `frequency_limit_exceeded`
  - `k_anonymity`
- recommendation payload fields used by the UI
  - `policy_level`
  - `ai_message_draft`
  - `actions_json`
  - `confidence_score`
  - `reasoning`
  - `inquiry_mode`
  - `fallback_used`
  - `priority`

Known limitation:

- `event_type` is not currently the primary driver for blocked-state UI. `blocked_reason` remains the reliable field for page rendering in this phase.

## Future Extension Points

- richer teacher-friendly explanation text sourced from structured rationale fields
- explicit “why Inquiry Mode” history for the class
- teacher feedback loop that captures which explanation format is most useful
- future redacted voice snippets integrated into the same recommendation context block
