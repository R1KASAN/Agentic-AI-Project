# Phase B.2 Student Feedback UI

## Overview

This phase upgrades the lower section of `/teacher/class/[id]` from placeholder copy to a privacy-safe UI contract that is grounded in aggregate-only classroom signals.

It does not add a redaction pipeline yet.

## Data Contract

### `StudentFeedbackSummary`

Built only from:

- `get_class_climate_summary()` aggregate rows
- `ClassMetrics` fields already loaded for the page

Shape:

```ts
type StudentFeedbackSummary = {
  latestWeekStart: string | null
  latestResponseCount: number
  avgMood: number | null
  avgPace: number | null
  avgFairness: number | null
  totalWeeksWithData: number
  trend: "up" | "down" | "flat" | "insufficient_data"
  summaryLine: string
}
```

Rules:

- `latestWeek` is the newest aggregate week with `avg_mood !== null`
- `trend` is based on latest vs previous week
- trend threshold uses a meaningful delta of `0.3`
- copy is intentionally high-level and never implies student-level certainty

### `RedactedVoiceState`

Shape:

```ts
type RedactedVoiceState = {
  status: "pipeline_pending" | "insufficient_signal" | "ready"
  snippets: Array<{
    id: string
    text: string
    tone?: "low" | "mixed" | "positive"
  }>
  message: string
}
```

Current phase behavior:

- `pipeline_pending`
  - aggregate signal exists
  - no redacted snippet source is connected yet
- `insufficient_signal`
  - there is not enough aggregate-safe signal to render voice excerpts
- `ready`
  - reserved for a future phase with a real privacy-reviewed snippet source

## Allowed Data Sources

- `get_class_climate_summary()`
- `get_teacher_metrics()`
- existing class-level audit signals when needed by the page

## Forbidden Data Sources

- raw `student_pulses` rows
- `student_pulses.optional_text`
- raw comments from n8n climate aggregation
- any student-identifiable payload

## UI State Rules

- Student Feedback Summary always explains that it is aggregate-only
- Redacted Student Voice never fabricates quotes
- If no safe redacted source exists, show a transparent privacy-safe info state
- Existing Inquiry Mode and frequency-block cues remain unchanged

## Future Plug-In Path

When a real redaction pipeline exists, it should populate:

- `status: "ready"`
- `snippets`
- optional tone metadata

without changing the page-level prop contract.
