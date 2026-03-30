# Feature Specification: Recommendation UX/UI & Teacher Metrics Validation

**Feature Branch**: `006-recommendation-ux-metrics`  
**Created**: 2026-03-22  
**Status**: Brownfield Enhancement  
**Phase**: Phase 2 — Operational Agent (v2.0.0)  
**Priority**: P1 (blocking Loop4 self-evaluation feedback)  
**Agentic Loops**: Loop3 (Act) → Loop4 (Self-Evaluate/Feedback) → Loop5 (Learn/Adapt)

---

## Context

The Climate Agent generates recommendations via `climate-agent-main` workflow and stores them in the `recommendations` Supabase table. However, the **teacher-facing UX to view, understand, and respond to those recommendations is incomplete**.

This spec defines the product experience for:
1. **Viewing recommendations** with different lifecycle states (pending, approved, dismissed, inquiry)
2. **Validating teacher metrics** (dismissal_rate, total_recommendations) using real data from Supabase RPCs
3. **Presenting Inquiry Mode** as a question-driven interaction when metrics trigger it
4. **Reviewing recommendation history** with metrics summary
5. **Graceful degradation** for missing data, errors, and empty states

---

## 1. Overview: Recommendation Lifecycle States

Every recommendation moves through a lifecycle with clear UI states:

| State | System Trigger | Teacher Sees | Next Action |
|-------|---|---|---|
| **PENDING** | New recommendation inserted by n8n | Email + dashboard card | Approve or Dismiss |
| **APPROVED** | Teacher clicks "Approve" | ✅ on dashboard; logged to audit | Optionally add feedback |
| **DISMISSED** | Teacher clicks "Dismiss" | ❌ on dashboard; logged to audit | Contributes to dismissal_rate |
| **INQUIRY** | Special state when `inquiry_mode=true` | 🤔 question phrasing; explanation | Teacher provides feedback (not approve/dismiss) |
| **COMPLETED** | Teacher marks "Done" (Loop4) | ✓ with optional outcome note | Used for Loop5 learning |

---

## 2. Functional Requirements

### 2.1 Recommendation List & Card Components (Primary/Secondary Pages)

**FR-2.1.1**: The system MUST display a recommendation card for each pending recommendation with the following required fields:
- Recommendation text (Thai, from `content`)
- Policy level badge (emoji + label): 🚨 CRITICAL | ⚠️ WARNING | 🟢 ROUTINE
- Confidence score (0.0–1.0, as percentage)
- Recommendation category (e.g., "mood_recovery", "discipline_management")
- Status indicator (PENDING, APPROVED, DISMISSED, INQUIRY, COMPLETED)
- Timestamps: `created_at`, optionally `completed_at`

**FR-2.1.2**: The card MUST include state-specific action buttons:
- **PENDING state**: Two buttons in top-right:
  - ✅ "Approve" (primary CTA)
  - ❌ "Dismiss" (secondary)
- **INQUIRY state**: Different layout
  - 💬 "Provide Feedback" (text input or modal)
  - Skip / "Not applicable" (secondary)
- **APPROVED / DISMISSED / COMPLETED state**: 
  - Locked/disabled buttons
  - Optional "View Details" link to see full decision history

**FR-2.1.3**: If `inquiry_mode = true`, the card layout MUST change:
- Headline: "🤔 We'd like your insight" (instead of directive phrasing)
- Content: Open-ended question in Thai (e.g., "สังเกตว่าบรรยากาศห้องเรียนอาจมีบางอย่าง ครูคิดว่าอะไรทำให้นักเรียนรู้สึกแบบนี้คะ/ครับ?")
- Explanation: "Because your previous recommendations focused on action, we're asking for your perspective to adjust our suggestions."
- Feedback form: text area (optional, not required submit)

**FR-2.1.4**: The system MUST support two layout views for recommendation lists:
- **Per-class view** (`/teacher/class/[id]/`): Recommendations for that specific class only
- **All recommendations view** (`/teacher/recommendations`): Aggregated across all teacher's classes with class context (class name, date)

**FR-2.1.5**: Each view MUST include sorting and filtering options:
- **Sort by**: Date created (newest/oldest), policy level (critical → routine), status
- **Filter by**: Status (pending, approved, dismissed, inquiry), policy level, date range (last 7 days / 30 days / all-time)

---

### 2.2 Teacher Metrics Validation & Display

**FR-2.2.1**: For each class, the system MUST call the Supabase RPC `get_teacher_metrics` with the class_id to retrieve:
- `dismissal_rate` (0.0–1.0)
- `total_recommendations` (integer count)
- `approved_count` (integer count)
- `dismissed_count` (integer count)
- `avg_approval_time_hours` (decimal)
- `high_dismissal` (boolean: dismissal_rate > 0.6)
- `inquiry_mode_suggested` (boolean: should this class use inquiry mode?)

**FR-2.2.2**: Metrics are called and cached:
- **Server-side (RSC)**: Fetch metrics at page render time on `/teacher/class/[id]/` and `/teacher/recommendations`
- **Cache strategy**: Revalidate every 5 minutes (ISR) or on-demand via webhook
- **Graceful fallback**: If RPC times out or returns error, show "Metrics unavailable" without blocking page render

**FR-2.2.3**: The system MUST display a **Metrics Summary Card** on the per-class view:
```
┌─────────────────────────────────────────┐
│ 📊 Recommendation Metrics (Last 30 days) │
├─────────────────────────────────────────┤
│ Total Recommendations: 7                │
│ Approval Rate: 71% (5/7 approved)       │
│ Dismissal Rate: 29% (2/7 dismissed)     │
│ Avg Time to Respond: 2.5 hours          │
│                                         │
│ ℹ️ Recommendation status influences how  │
│    we tailor future suggestions.        │
└─────────────────────────────────────────┘
```

**FR-2.2.4**: When `high_dismissal = true` (dismissal_rate > 0.6), the card MUST include:
- ⚠️ Icon/label: "High Dismissal Rate Detected"
- Explanation: "We've noticed you're dismissing frequent recommendations. We'll switch to asking questions instead of suggesting actions."
- CTA: "View Inquiry Mode recommendations" (filter to `inquiry_mode=true`)

**FR-2.2.5**: When `total_recommendations = 0` (no history), metrics card MUST show:
```
┌─────────────────────────────────────────┐
│ 📊 No recommendation history yet         │
├─────────────────────────────────────────┤
│ Once you receive recommendations, we'll │
│ show metrics here. Check back soon!     │
└─────────────────────────────────────────┘
```

**FR-2.2.6**: Metrics MUST be linked to Inquiry Mode decision logic:
- System evaluates: IF `dismissal_rate > 0.6` AND `total_recommendations >= 3` AND `policy_level = WARNING`
  - THEN next recommendation WILL have `inquiry_mode = true` (decision made in n8n)
- UI MUST show why Inquiry Mode is active: "Based on your recent feedback patterns, we're using Inquiry Mode for this class."

---

### 2.3 Inquiry Mode Product Behavior

**FR-2.3.1**: Inquiry Mode recommendations MUST be visually distinct from directive recommendations:
- Background color: Light blue or special border (TBD by design)
- Icon: 🤔 prefix in title
- Tone indicator: Badge "Question Mode" or "Feedback Request"

**FR-2.3.2**: Inquiry Mode MUST NOT include action suggestions or directives:
- Content is exclusively a question in Thai (open-ended)
- Example: "สังเกตว่าบรรยากาศห้องเรียนอาจมีบางอย่าง ครูคิดว่าอะไรทำให้นักเรียนรู้สึกแบบนี้คะ/ครับ?"
- No bullet points of interventions
- No "approve/dismiss" buttons (teacher gives feedback instead)

**FR-2.3.3**: Inquiry Mode card MUST include context explanation:
```
┌────────────────────────────────────────┐
│ 🤔 We'd like your insight              │
├────────────────────────────────────────┤
│ Question:                              │
│ สังเกตว่าบรรยากาศห้องเรียนอาจมีบางอย่าง │ 
│ ครูคิดว่าอะไรทำให้นักเรียนรู้สึกแบบนี้คะ │
│ /ครับ?                                 │
│                                        │
│ ℹ️ Why we're asking:                   │
│ We've learned from your feedback that │
│ you prefer to identify solutions       │
│ yourself. Your insights help us adapt. │
│                                        │
│ Optional Feedback:                     │
│ [Text area - 1-2 sentences]            │
│                                        │
│ [Skip] [Submit Feedback]               │
└────────────────────────────────────────┘
```

**FR-2.3.4**: Teacher feedback on Inquiry Mode recommendations MUST be:
- Optional (not required for submission)
- Stored in `recommendations.feedback` as text
- Analyzed by agent (Loop5) for sentiment and themes
- Used to inform next recommendation personalization

**FR-2.3.5**: Inquiry Mode MUST include an explanation of why it was selected:
- Text: "Based on your recent recommendation patterns, we're asking for your perspective instead of suggesting actions. This helps us personalize better."
- Dismissible info banner
- Settable as preference (future: teacher can opt into/out of Inquiry Mode explicitly)

---

### 2.4 Recommendation History & Review Flow

**FR-2.4.1**: The `/teacher/recommendations` page MUST display all historical recommendations for all teacher's classes with:
- **Fullscreen view**: Paginated list of recommendations (20 per page)
- **Sorting**: Default by date created (newest first)
- **Class context**: Each card includes: badge with class name, class emoji/icon
- **Status badge**: PENDING | APPROVED | DISMISSED | INQUIRY | COMPLETED
- **Metrics summary**: Global (all classes) approval rate, dismissal rate, total count

**FR-2.4.2**: On the per-class view (`/teacher/class/[id]/`), the system MUST display:
- **Top section**: Mood chart + climate overview (Loop0–1)
- **Middle section**: Metrics card (FR-2.2.3)
- **Bottom section**: Recommendation list for this class
  - Default: Show pending + recent (last 7 days)
  - Expandable: Show full history with archive toggle

**FR-2.4.3**: Each recommendation card in history view MUST include:
- Recommendation text (truncated if >2 lines; expandable)
- Policy level, category, confidence
- Status + timestamp
- Optional: Teacher's approval time, feedback text (if any)
- Optional: Link to n8n audit log entry (for transparency)

**FR-2.4.4**: The history view MUST support **decision detail drill-down**:
- Click "View Details" on any recommendation → modal/page with:
  - Full recommendation text
  - `decision_path` JSONB (displayed as timeline or expandable tree):
    - Route: "fallback" | "llm"
    - Rule/prompt used
    - Confidence score + threshold
    - Why this policy level was chosen
  - Teacher's approval/dismissal timestamp + feedback
  - Class context: mood data that day, other factors
  - Audit log reference: who/what/when

**FR-2.4.5**: Metrics card MUST be refreshed:
- On page load (fresh data)
- When user approves/dismisses a recommendation (immediate recompute)
- Cache: 5-minute ISR revalidation between user actions

---

### 2.5 Empty & Error States

**FR-2.5.1**: **No Climate Data** state (when class has <3 student check-ins):
```
┌──────────────────────────────────────────┐
│ 📍 Waiting for classroom climate data     │
├──────────────────────────────────────────┤
│ We need at least 3 student mood check-ins│
│ to start generating recommendations.     │
│                                          │
│ Current data: 1 check-in (need 2 more)   │
│                                          │
│ Next workflow run: Monday 07:30 AM       │
│                                          │
│ [Jump to: Mood Check-in Page]            │
└──────────────────────────────────────────┘
```

**FR-2.5.2**: **No Recommendation History** state (when total_recommendations = 0):
```
┌──────────────────────────────────────────┐
│ 🎯 No recommendations yet                │
├──────────────────────────────────────────┤
│ The system generates daily climate       │
│ briefings at 7:30 AM (Mon-Fri).          │
│                                          │
│ Check back after the next scheduled run. │
│ [Learn more about how recommendations]   │
│ [work →]                                 │
└──────────────────────────────────────────┘
```

**FR-2.5.3**: **Metrics Unavailable** state (RPC timeout or error):
```
┌──────────────────────────────────────────┐
│ ℹ️ Metrics temporarily unavailable        │
├──────────────────────────────────────────┤
│ We're unable to load detailed metrics    │
│ right now. Try refreshing.               │
│                                          │
│ Recommendations are still available →    │
│ [Refresh] [Contact Support]              │
└──────────────────────────────────────────┘
```

**FR-2.5.4**: **Workflow Failure** state (n8n execution error logged):
```
┌──────────────────────────────────────────┐
│ ❌ Recommendation generation failed       │
├──────────────────────────────────────────┤
│ There was an issue creating today's      │
│ climate briefing. Our team has been      │
│ notified.                                │
│                                          │
│ Error ID: L53y2qzWe6RGIUwB-12345         │
│ [View logs (admin only)]                 │
└──────────────────────────────────────────┘
```

**FR-2.5.5**: All empty/error states MUST:
- NOT expose raw student data, database schema, or error stack traces
- Provide alternative actions or next steps
- Include timestamp of last successful operation (if applicable)
- Link to support/documentation
- Degrade gracefully (show partial data if available, e.g., cached metrics)

---

### 2.6 Admin View (Distinct from Teacher View)

**FR-2.6.1**: Admin dashboard (if exists) MUST show:
- **Aggregated metrics across all classes**:
  - Total recommendations generated (system-wide)
  - Average approval rate across all teachers
  - Schools/classes with high dismissal rates (flag for intervention)
  - System health: last workflow execution, error rate, latency
- **Per-school filters**: Drill down to specific school, then class
- **Audit trail access**: Link to full decision paths for compliance/analysis

**FR-2.6.2**: Admin view MUST NOT expose:
- Individual student names or IDs
- Raw mood scores or individual student feedback
- Teacher personal feedback or emails
- Only aggregates and decision metadata (policy_level, confidence, decision_path)

---

## 3. Data Contracts

### 3.1 Recommendation Record (from Supabase)

```typescript
type Recommendation = {
  id: string (UUID);
  class_id: string (UUID);
  teacher_id?: string (UUID, nullable in MVP);
  content: string (Thai/multi-lang recommendation text);
  status: 'pending' | 'approved' | 'dismissed' | 'completed';
  policy_level: 'ROUTINE' | 'WARNING' | 'CRITICAL';
  confidence_score: number (0.0–1.0);
  priority: number (1–5, derived from policy_level);
  category: string (e.g., "mood_recovery", "discipline_management");
  ai_generated: boolean (default: true);
  ai_model: string (e.g., "gemini-2.0-flash" or "fallback");
  reasoning: string (why this recommendation was generated);
  inquiry_mode: boolean (true if question-driven, not directive);
  fallback_used: boolean (true if LLM failed and rule-based fallback used);
  created_at: ISO8601;
  completed_at?: ISO8601;
  feedback?: string (optional teacher feedback, 1-500 chars);
  metadata?: JSONB (future extensibility);
};
```

### 3.2 Teacher Metrics RPC Response

```typescript
type TeacherMetrics = {
  class_id: string (UUID);
  teacher_id: string (UUID);
  dismissal_rate: number (0.0–1.0, calculated as dismissed_count / total_recommendations);
  total_recommendations: number (integer count);
  approved_count: number;
  dismissed_count: number;
  pending_count: number;
  avg_approval_time_hours: number (decimal);
  high_dismissal: boolean (dismissal_rate > 0.6);
  inquiry_mode_suggested: boolean (should next recommendation use inquiry mode?);
  avg_mood_score: number (3-week rolling average);
  total_surveys: number (total mood check-ins);
  date_range: {
    from: ISO8601;
    to: ISO8601;
  };
};
```

### 3.3 Inquiry Mode Recommendation Payload

When `inquiry_mode = true`:
```typescript
{
  ...Recommendation (all fields),
  inquiry_mode: true,
  content: string (open-ended question in Thai, no action directives),
  reasoning: "Inquiry mode active due to dismissal_rate={value} > 0.6",
  metadata: {
    inquiry_reason: "high_dismissal_rate" | "teacher_preference" | "low_confidence",
    inquiry_explanation: "Based on your recent feedback patterns, we're asking for your perspective instead of suggesting actions."
  }
}
```

### 3.4 Recommendation Card Props (React Component)

```typescript
interface RecommendationCardProps {
  id: string;
  content: string;
  policy_level: 'ROUTINE' | 'WARNING' | 'CRITICAL';
  status: 'pending' | 'approved' | 'dismissed' | 'inquiry' | 'completed';
  confidence_score: number;
  category: string;
  created_at: Date;
  completed_at?: Date;
  inquiry_mode: boolean;
  className?: string (for class context in aggregated view);
  onApprove?: (id: string, feedback?: string) => Promise<void>;
  onDismiss?: (id: string) => Promise<void>;
  onSubmitFeedback?: (id: string, feedback: string) => Promise<void>;
  isLoading?: boolean;
}
```

### 3.5 Metrics Card Props (React Component)

```typescript
interface MetricsCardProps {
  classId: string;
  metrics: TeacherMetrics | null;
  isLoading: boolean;
  error?: Error;
  onRefresh?: () => void;
}
```

---

## 4. Acceptance Criteria

### 4.1 Recommendation Display & Interaction

- **AC-4.1.1**: Teacher can view pending recommendations on `/teacher/class/[id]/` page
- **AC-4.1.2**: Clicking "Approve" updates `recommendations.status = 'approved'` and disables the button
- **AC-4.1.3**: Clicking "Dismiss" marks recommendation dismissed and updates `dismissal_count` metric
- **AC-4.1.4**: Inquiry mode cards show question format (no approve/dismiss, feedback-only)
- **AC-4.1.5**: All cards display policy level emoji (🚨 | ⚠️ | 🟢) and confidence percentage

### 4.2 Metrics Validation & Display

- **AC-4.2.1**: `/teacher/class/[id]/` fetches metrics from RPC at page load
- **AC-4.2.2**: Metrics card displays `total_recommendations`, `approval_rate`, `dismissal_rate` correctly
- **AC-4.2.3**: If `high_dismissal = true`, card displays warning + Inquiry Mode explanation
- **AC-4.2.4**: If `total_recommendations = 0`, card shows empty state (not error)
- **AC-4.2.5**: If metrics RPC times out, page still renders with "Metrics unavailable" (non-blocking)
- **AC-4.2.6**: After teacher dismisses a recommendation, metrics card updates within 5 seconds OR next page load

### 4.3 Inquiry Mode Experience

- **AC-4.3.1**: When `inquiry_mode = true`, recommendation card title includes 🤔 icon
- **AC-4.3.2**: Card content displays Thai question (from `content`), not action directives
- **AC-4.3.3**: Card includes explanation: "Why we're asking" section visible
- **AC-4.3.4**: "Provide Feedback" button opens textarea; "Skip" closes card
- **AC-4.3.5**: Submitted feedback stored in `recommendations.feedback`

### 4.4 History & Drill-Down

- **AC-4.4.1**: `/teacher/recommendations` shows all historical recommendations with class context
- **AC-4.4.2**: Clicking "View Details" on any recommendation displays full decision_path JSONB
- **AC-4.4.3**: Decision tree shows route (fallback vs llm), rule name, confidence, timestamp
- **AC-4.4.4**: Teacher can filter by status, policy level, date range
- **AC-4.4.5**: Metrics summary shows global approval/dismissal rates

### 4.5 Empty & Error States

- **AC-4.5.1**: No climate data: page shows "Waiting for classroom climate data" with check-in count
- **AC-4.5.2**: No history: page shows "No recommendations yet" with next run info
- **AC-4.5.3**: Metrics RPC error: banner shows "Metrics temporarily unavailable" + Refresh button
- **AC-4.5.4**: Workflow error: banner shows "Recommendation generation failed" + Error ID + Support link
- **AC-4.5.5**: No error state exposes raw data, SQL, or stack trace

### 4.6 Performance & Caching

- **AC-4.6.1**: Page load < 2 seconds on initial render
- **AC-4.6.2**: Metrics cached and revalidated via ISR every 5 minutes
- **AC-4.6.3**: User action (approve/dismiss) triggers immediate metric recompute (or show stale with "refreshing" indicator)
- **AC-4.6.4**: No N+1 queries (batch fetch metrics for all teacher's classes)

---

## 5. Error Handling

### 5.1 RPC Call Failures

| Scenario | Fallback | UX |
|----------|----------|-----|
| `get_teacher_metrics` timeout (>5s) | Use cached metrics (up to 10 min old) | Show banner: "Metrics loading..." |
| `get_teacher_metrics` 401 Unauthorized | Treat metrics as unavailable | Show banner: "Metrics unavailable, contact support" |
| Recommendation query fails | Show empty state | "Unable to load recommendations, try refreshing" |

### 5.2 Action Failures

| Scenario | Fallback | UX |
|----------|----------|-----|
| `approveRecommendation` fails | Retry 3x; show error toast | "Failed to approve. Retry? [Yes] [No]" |
| `dismissRecommendation` fails | Retry 3x; show error toast | "Failed to dismiss. Retry? [Yes] [No]" |
| ISR revalidation fails | Metric cache remains valid; next revalidation in 5 min | Silent retry; no user-facing error |

### 5.3 Partial Failures (Non-Blocking)

- If metrics fail to load, show recommendations anyway (don't block UI)
- If workflow execution error occurred, show banner but still render recent recommendations
- If k-anonymity check failed during generation, n8n skipped that class (admin alert only; teacher sees "no data" state)

---

## 6. Privacy Constraints

### 6.1 Data Minimization

- ✅ Recommendations contain ONLY class-level aggregates and teacher-facing suggestions
- ✅ NO individual student names, IDs, or mood scores in recommendation text
- ✅ NO raw student feedback or qualitative comments in recommendation content
- ✅ Metrics show rates & counts only; no breakdowns by student

### 6.2 Access Control

- ✅ Teacher sees ONLY recommendations for classes they teach
- ✅ Metrics fetched via RPC with teacher's auth context (RLS enforces this)
- ✅ Audit logs visible only to admins (future: teachers can see decision_path for transparency)

### 6.3 Audit Trail

- ✅ Every approve/dismiss action logged in `n8n_audit_logs` with timestamp, user_id, recommendation_id
- ✅ `decision_path` JSONB populated at recommendation generation time (immutable after)
- ✅ Retention: Audit logs kept 2 years; recommendations kept 1 year (soft delete)

### 6.4 Email Privacy

- ✅ Recommendation emails sent via Resend to teacher's registered email
- ✅ Email content matches dashboard (no additional raw data revealed)
- ✅ NO student names/IDs in email subject or body
- ✅ CTA links to dashboard require authentication verification

---

## 7. UI/UX Notes (Design Guidance)

### 7.1 Color & Visual Hierarchy

- **Policy levels**:
  - 🚨 CRITICAL: Red/dark red background, white text, top priority placement
  - ⚠️ WARNING: Orange/amber, high prominence
  - 🟢 ROUTINE: Green/subtle, lower prominence, dashboard-only (no email)

- **Inquiry Mode**:
  - Blue or special border, distinct from directive recommendations
  - 🤔 icon consistently used
  - Softer tone (no "action required" pressure)

- **Status indicators**:
  - ✅ Approved: Green checkmark, locked state
  - ❌ Dismissed: Gray/muted, crossed out
  - ⏳ Pending: Yellow/highlight, unread indicator (future)
  - Completed: Green with "Done" badge

### 7.2 Typography & Language

- **Recommendation text**: Readable, ~60–120 chars per line (Thai: 20–40 chars)
- **Buttons**: Action-oriented Thai verbs ("เห็นด้วย", "ปฏิเสธ", "ให้ข้อมูล")
- **Explanatory text**: Plain language, <reading level 8, avoid jargon
- **Inquiry mode language**: Open-ended, non-judgmental tone

### 7.3 Mobile Responsiveness

- **Cards**: Stack vertically on mobile; horizontal layout on desktop
- **Metrics card**: Collapse/expand on mobile; always visible on desktop
- **History list**: Single-column on mobile; two-column (optional) on desktop
- **Decision detail modal**: Full-screen on mobile; modal overlay on desktop

### 7.4 Accessibility (WCAG 2.1 AA)

- ✅ Color not the only indicator (use text labels + icons)
- ✅ All interactive elements keyboard accessible (Tab, Enter, Escape)
- ✅ Form labels associated with inputs (`<label for="...">`)
- ✅ Error messages linked to form fields (ARIA)
- ✅ Recommendation text formatted for readability (headings, line breaks, lists)

---

## 8. Success Metrics

### 8.1 Product Metrics

- **SC-8.1.1**: ≥70% of pending recommendations receive teacher action (approve/dismiss) within 48 hours
- **SC-8.1.2**: Metrics card viewed by ≥50% of teachers on class detail page
- **SC-8.1.3**: Inquiry mode acceptance rate ≥40% (compared to ≥15% for directive mode based on feedback)
- **SC-8.1.4**: Average review time for Inquiry Mode ≤24 hours (vs. ≤2 hours for directive)

### 8.2 Technical Metrics

- **SC-8.2.1**: Page load time < 2 seconds (p95)
- **SC-8.2.2**: Metrics RPC latency < 500ms (p95)
- **SC-8.2.3**: Zero data privacy incidents (no raw student data leaked in UI)
- **SC-8.2.4**: 99.5% uptime for recommendation and metrics endpoints

### 8.3 Quality Metrics

- **SC-8.3.1**: 0 instances of raw student data in recommendation text (validated by code review + automated scan)
- **SC-8.3.2**: ≥95% of error states render without exposing technical details
- **SC-8.3.3**: All recommendation cards tested on 3+ mobile devices (iOS, Android, tablet)

---

## 9. Implementation Notes (Non-Prescriptive)

### 9.1 Data Fetching Strategy (RSC-first)

- Server Components fetch metrics at page render time (no client-side waterfall)
- Use `Promise.all()` to paral lelize metric + recommendation queries
- Cache metrics with ISR (5-min revalidation)
- On user action (approve/dismiss), trigger ISR revalidation OR fetch fresh metrics client-side

### 9.2 Component Hierarchy (Suggested Structure)

```
/teacher/class/[id]/page.tsx (RSC)
  ├─ TrendChart (RSC)
  ├─ MetricsCard (ClientComponent, accepts metrics prop, can refetch)
  ├─ RecommendationList (ClientComponent, accepts recommendations + metrics)
  │  ├─ RecommendationCard (interactive, approve/dismiss handlers)
  │  ├─ InquiryModeCard (question variant)

/teacher/recommendations/page.tsx (RSC)
  ├─ RecommendationHistory (ClientComponent with filtering/sorting)
  │  ├─ RecommendationSummary (metrics + stats)
  │  ├─ RecommendationCard[] (history view variant)
```

### 9.3 Server Actions

- `approveRecommendation(recommendationId, feedback?)` — Update status, log to audit
- `dismissRecommendation(recommendationId)` — Update status, trigger metric recompute
- `submitInquiryFeedback(recommendationId, feedback)` — Store feedback, log to audit

### 9.4 Error Boundaries

- Wrap metrics card in error boundary (render "Metrics unavailable" on throw)
- Wrap recommendation list in error boundary (render "Unable to load recommendations" on throw)
- Use toast notifications for action errors (approve/dismiss failures)

### 9.5 Testing Strategy

- **Unit tests**: Metric calculations (dismissal_rate, approval_rate)
- **Component tests**: Card rendering with different `inquiry_mode` values
- **Integration tests**: Approve/dismiss flow with Supabase mock
- **E2E tests**: Full teacher workflow (view class → approve recommendation → metrics update)

---

## 10. Future Enhancements (Out of Scope)

- \[ \] Export recommendations to PDF/CSV
- \[ \] Recommendation scheduling (defer action until next week)
- \[ \] Teacher preference settings (opt-in/out of Inquiry Mode)
- \[ \] Bulk actions (approve all pending in a class)
- \[ \] Sentiment analysis on teacher feedback (Loop5)
- \[ \] Recommendation templates & customization (teacher creates own suggestions)
- \[ \] Mobile app with offline support
- \[ \] Multi-language support (Thai + English UI toggle)

---

## Appendix: Wireframe Sketch (Text-based)

### Per-Class Recommendation List View (`/teacher/class/[id]/`)

```
┌──────────────────────────────────────────────────────────────┐
│ 🏫 Grade 7A Classroom                                        │
│ Last Updated: Today 2:45 PM                                  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ 📊 METRICS CARD                                              │
│ ├─ Total Recommendations: 7                                  │
│ ├─ Approval Rate: 71% (5/7)                                  │
│ ├─ Dismissal Rate: 29% (2/7)                                 │
│ ├─ Avg Time to Respond: 2.5 hrs                              │
│ └─ ℹ️ "High dismissal detected. Using Inquiry Mode..."       │
│                                                               │
│ 📋 RECOMMENDATIONS                                           │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ ⚠️ WARNING | Mood Recovery | 68% Confidence             │  │
│ │ Created: Today 7:35 AM                                  │  │
│ │                                                         │  │
│ │ "ลองให้นักเรียนทำแบบประเมินความรู้สึก 5 นาที             │  │
│ │ เพื่อเข้าใจเหตุผลของอารมณ์ที่เปลี่ยนแปลง"               │  │
│ │                                                         │  │
│ │ [Approve ✓] [Dismiss ✗]                                 │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 🤔 INQUIRY MODE | 54% Confidence                        │  │
│ │ Created: Yesterday 7:35 AM                              │  │
│ │                                                         │  │
│ │ "สังเกตว่าบรรยากาศห้องเรียนอาจมีบางอย่าง                │  │
│ │ ครูคิดว่าอะไรทำให้นักเรียนรู้สึกแบบนี้คะ/ครับ?"          │  │
│ │                                                         │  │
│ │ ℹ️ Why we're asking: Based on your feedback patterns,   │  │
│ │ we're asking for your perspective.                      │  │
│ │                                                         │  │
│ │ Optional Feedback:                                      │  │
│ │ [Text area ...........................]                 │  │
│ │                                                         │  │
│ │ [Skip]  [Submit Feedback]                               │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ [View All Recommendations] [Metrics Details]                 │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Global Recommendations List View (`/teacher/recommendations`)

```
┌──────────────────────────────────────────────────────────────┐
│ 📋 All Recommendations (Your Classes)                         │
│                                                               │
│ Sort: [Date ▼] Filter: [Status ▼] [Policy ▼] [Date Range ▼] │
│                                                               │
│ 📊 Summary:                                                   │
│ Total: 15 | Approval: 67% | Dismissal: 33%                   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ [🏫 Grade 7A]  ⚠️ WARNING | ✓ APPROVED                  │  │
│ │ "ลองให้นักเรียนทำแบบประเมินความรู้สึก..."                │  │
│ │ Approved: 2 hours ago | [View Details]                  │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ [🏫 Grade 6B]  🚨 CRITICAL | ⏳ PENDING                 │  │
│ │ "จัดกิจกรรมเพื่อลดความตึงเครียดอย่างเร่งด่วง..."         │  │
│ │ Pending since: Yesterday 7:35 AM | [View Details]       │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ [🏫 Grade 7A]  🤔 INQUIRY | 💬 FEEDBACK PENDING          │  │
│ │ "สังเกตว่าบรรยากาศห้องเรียนอาจมีบางอย่าง..."             │  │
│ │ Inquiry since: 1 day ago | [View Details]                 │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ [< Prev] [1 of 3 pages] [Next >]                              │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Document History

| Date | Author | Change |
|------|--------|--------|
| 2026-03-22 | Climate Agent Team | Initial spec: recommendation UX/UI + metrics validation |
