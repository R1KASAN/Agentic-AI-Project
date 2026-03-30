# Phase A.3 Frontend Logic Sketch

This file captures the proposed UI logic for:

- frequency guard cues
- blocked reason handling
- inquiry mode cues

These are proposals only. Do not treat them as deployed behavior yet.

## Class-Scoped Data Contract

Suggested server-side shape for teacher pages:

```ts
type LatestAuditSignal = {
  event_type: "recommendation_generated" | "teacher_approval" | string;
  blocked_reason: string | null;
  policy_selected: "ROUTINE" | "WARNING" | "CRITICAL" | null;
  decision_path_json: Record<string, unknown> | null;
  created_at: string;
};

type TeacherMetricsCue = {
  inquiry_mode_suggested: boolean;
  dismissal_rate: number;
  total_generated_recommendations: number;
  total_decided_recommendations: number;
  total_recommendations: number;
};
```

## UI Decision Rules

### 1. No New Draft This Cycle

Do not infer this from "no pending recommendations".

Instead:

```ts
function getNoDraftCue(args: {
  pendingCount: number;
  latestAuditSignal: LatestAuditSignal | null;
}) {
  if (args.pendingCount > 0) return null;

  if (args.latestAuditSignal?.blocked_reason === "frequency_limit_exceeded") {
    return {
      kind: "info",
      title: "No new draft this cycle",
      body: "ระบบยังไม่สร้างข้อความใหม่ เพื่อหลีกเลี่ยงการแจ้งเตือนถี่เกินไป",
    };
  }

  if (args.latestAuditSignal?.blocked_reason === "insufficient_k_anonymity") {
    return {
      kind: "info",
      title: "Not enough signal yet",
      body: "ยังมีข้อมูลไม่พอสำหรับสร้างข้อเสนอใหม่ในรอบนี้",
    };
  }

  return {
    kind: "empty",
    title: "ไม่มี draft ที่รอตรวจในตอนนี้",
    body: "ห้องนี้อาจยังไม่มี recommendation ใหม่ในรอบล่าสุด",
  };
}
```

### 2. Inquiry Mode Cue

Use metrics, not recommendation absence:

```ts
function getInquiryModeCue(metrics: TeacherMetricsCue | null) {
  if (!metrics?.inquiry_mode_suggested) return null;

  return {
    label: "Inquiry Mode",
    description: "ระบบแนะนำให้เริ่มจากคำถามสะท้อนคิดก่อน เพราะมีสัญญาณว่าครูมัก dismiss ข้อเสนอรูปแบบเดิม",
  };
}
```

### 3. Teacher Dashboard and Class List

Suggested cue priority:

1. pending recommendations count
2. latest blocked reason
3. inquiry mode suggested
4. fallback/risk badges

Pseudo-code:

```ts
function buildClassCardCue(args: {
  pendingCount: number;
  latestAuditSignal: LatestAuditSignal | null;
  metrics: TeacherMetricsCue | null;
}) {
  if (args.pendingCount > 0) {
    return { tone: "warning", text: `${args.pendingCount} actions required` };
  }

  if (args.latestAuditSignal?.blocked_reason === "frequency_limit_exceeded") {
    return { tone: "muted", text: "No new draft this cycle" };
  }

  if (args.metrics?.inquiry_mode_suggested) {
    return { tone: "secondary", text: "Inquiry Mode suggested" };
  }

  return { tone: "positive", text: "All caught up" };
}
```

## Suggested Server Query Additions

For `/teacher` and `/teacher/classes`:

- latest `n8n_audit_logs` row per class for `recommendation_generated`
- latest `blocked_reason`
- latest `policy_selected`

For `/teacher/class/[id]`:

- current pending recommendations
- latest `recommendation_generated` audit row
- latest teacher metrics cue object

## Current Gap

Current pages still rely heavily on:

- pending recommendation count
- absence of rows

Target behavior should rely on:

- latest audit signal
- explicit blocked reason
- inquiry mode suggestion from metrics
