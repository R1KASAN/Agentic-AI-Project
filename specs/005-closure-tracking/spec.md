# Feature Specification: Loop Closure UI Enhancement

**Feature Branch**: `005-closure-tracking`  
**Created**: 2026-03-16  
**Status**: Draft  
**Phase**: Phase 2 - Operational Agent (v2.0.0)  
**Agentic Loop Alignment**: Loop4 (Self-Evaluation/Feedback Collection) + Loop5 (Learning/Adaptation)  
**Autonomy Level**: L2 (Self-Evaluation) — Teacher provides signal for Loop4; Agent learns and adapts from aggregated patterns

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Teacher Views & Marks Recommendation as Done (Priority: P1)

**Actor**: Teacher (human feedback provider)  
**Context**: After reading AI briefing or anomaly alert, teacher implements suggested intervention in classroom  
**Goal**: Rapidly signal to agent that recommendation was actioned and capture implementation outcome

**Why this priority**: Loop closure is the critical feedback mechanism. Without teacher input on this UI, the agentic loop (Sense → Reason → Plan → Act → **Evaluate → Learn**) is broken. Teachers must have a frictionless 1-click way to mark actions as complete. This is the core of Loop4 (Self-Evaluation).

**Independent Test**: Can be fully tested by: (1) Teacher clicking "Mark as Done" button next to recommendation in dashboard, (2) Verifying status changes to "Implemented" with timestamp, (3) Observing optional feedback prompt appears ("What did you try? How'd it go?"), (4) Confirming recommendation is marked completed in database. Delivers value: Closes the loop; enables agent learning.

**Acceptance Scenarios**:

1. **Given** teacher has received AI recommendation (from W06 briefing or W07 alert),  
   **When** teacher clicks "✓ Mark as Done" button next to recommendation in dashboard,  
   **Then** (a) recommendation status changes from "Pending" → "Implemented", (b) timestamp is logged, (c) optional feedback prompt appears.

2. **Given** teacher clicks "✓ Done" for a recommendation,  
   **When** optional feedback prompt appears with text field "What did you try? How'd it go?",  
   **Then** teacher can leave 1–2 sentence feedback (e.g., "Tried a 5-min mood check. Kids opened up!") or skip and move on.

3. **Given** teacher does not click "Done" within 48 hours,  
   **When** system reviews pending recommendations,  
   **Then** recommendation is automatically marked "Not Actioned" (neutral framing, not negative).

---

### User Story 2 — Teacher Views Recommendation History & Closure Metrics (Priority: P1)

**Actor**: Teacher (reflection & self-awareness)  
**Context**: At end of week or while reviewing dashboard, teacher sees aggregate metrics on how they respond to recommendations  
**Goal**: Build transparency and agency: teacher sees the loop working and understands agent's learning

**Why this priority**: Agentic transparency (Constitution Principle I) requires teachers to see feedback patterns. Without visible metrics, agent autonomy feels opaque. Teachers need to see: "Of my recent recommendations, how many did I act on? What happened?" This builds trust and mutual learning.

**Independent Test**: Can be tested by: (1) Navigating to "Recommendation History" dashboard widget, (2) Verifying all past 30 days' recommendations are visible with status (Viewed/Acknowledged/Implemented/Dismissed), (3) Checking closure % calculation is correct, (4) Observing metric refreshes daily. Delivers value: Teacher sees their partnership with agent clearly.

**Acceptance Scenarios**:

1. **Given** teacher has navigated to teacher dashboard,  
   **When** teacher views "Recommendation History" widget,  
   **Then** widget displays: (a) List of all recommendations from past 30 days, (b) Each row shows [recommendation_text, status (Viewed/Ack/Implemented/Dismissed), timestamp].

2. **Given** teacher reviews "Recommendation History",  
   **When** widget calculates closure statistic,  
   **Then** widget displays: "7 recommendations received → 5 Viewed → 3 Implemented = 43% closure rate. Agency strong! 📊"

3. **Given** closure rate is ≥60%,  
   **When** metric is displayed,  
   **Then** tone is positive: "You're implementing 60%+ of climate insights. Partnership is working great!"

4. **Given** closure rate is <30%,  
   **When** metric is displayed,  
   **Then** tone is constructive: "Let's focus on depth over volume. Pick 1–2 suggestions this week that resonate most."

---

### User Story 3 — Agent Uses Teacher Feedback to Personalize Recommendations (Priority: P2)

**Actor**: Agent (learning system, automated adaptation)  
**Context**: Overnight, agent aggregates teacher feedback and adjusts future recommendations based on patterns  
**Goal**: Continuous improvement: agent learns which interventions work for this teacher and class, personalizes future briefs

**Why this priority**: Loop5 (Learning) depends entirely on Loop4 feedback. Without this adaptive logic, agent knowledge stays static. P2 because MVP can function with static suggestions (P1); personalization improves over time.

**Independent Test**: Can be tested by: (1) Agent collecting ≥3 feedback datapoints for a specific intervention, (2) Checking `agent_learning_policies` table to verify high_trust tag is applied (success_rate >70%), (3) Verifying next briefing for same class boosts high-trust interventions higher in suggestion list, (4) Observing sentiment analysis captures feedback tone (positive/negative/neutral). Delivers value: Recommendations become increasingly targeted.

**Acceptance Scenarios**:

1. **Given** agent has collected ≥5 feedback entries for "5-minute mood check" in Class X,  
   **When** feedback sentiment shows >60% positive ("It helped," "Great timing"),  
   **Then** agent tags intervention as high_trust and boosts it to #1 position in next briefing.

2. **Given** agent observes pattern: teacher feedback says "too generic" for brainstorming suggestions 3x,  
   **When** next briefing is generated,  
   **Then** agent's LLM prompt adjusts: "Avoid generic brainstorming. Focus on specific, immediate actions."

3. **Given** teacher closure rate drops to <20% for 2 consecutive weeks,  
   **When** weekly aggregation job runs,  
   **Then** system flags this for potential "Inquiry Mode": next briefing asks "What format would help?" instead of pushing recs.

---

### Edge Cases

- **No feedback provided**: Teacher can skip optional feedback field (null OK); recommendation still marked "Done"
- **Recommendation already dismissed**: Status cannot change from "Dismissed" back to "Implemented"; prevents data inconsistency
- **Feedback submitted days after action**: Timestamp of feedback is logged separately from timestamp of action. Both available to agent for learning.
- **Teacher deletes feedback**: Feedback is soft-deleted (marked_deleted=true) but audit trail preserved. Agent does not reprocess deleted feedback.
- **Bulk mark as done**: Teacher can select multiple recommendations and mark all as "Done" at once (checkbox + "Mark All Selected" button).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Dashboard MUST show "Recommendation History" widget visible to teachers, displaying past 30 days of recommendations
- **FR-002**: Each recommendation row MUST show: [recommendation_text (max 150 chars), status (Viewed/Acknowledged/Implemented/Dismissed), created_at timestamp, action button]
- **FR-003**: Status "Implemented" MUST include: "Mark as Done" button (1-click), optional feedback text field ("What did you try? How'd it go?"), timestamp auto-filled
- **FR-004**: Dashboard MUST calculate and display closure rate: (count where status IN [Viewed, Acknowledged, Implemented]) / (count all) = closure %
- **FR-005**: Closure metric MUST display with tone-appropriate framing: positive if ≥60%, constructive if <30%
- **FR-006**: Recommendations MUST be sorted by creation date (newest first) by default, with ability to filter by status (Implemented, Dismissed, Dismissed, All)
- **FR-007**: Optional feedback field MUST be limited to 300 characters (encourage brevity)
- **FR-008**: Bulk action MUST be supported: checkbox next to each recommendation, "Mark All as Implemented" button for 3+ selected
- **FR-009**: Dashboard refresh MUST be automatic (real-time or every 5 min)
- **FR-010**: All closure events (mark as done, feedback submitted, dismissal) MUST be logged to `n8n_audit_log` with timestamp

### Agentic Requirements

- **AGR-001**: Every teacher action on Loop4 (marking done, providing feedback, dismissing) MUST trigger agent notification: system logs action to `recommendations` table and queues message for agent to process (no real-time processing, async via cron/event)

- **AGR-002**: Feedback sentiment analysis MUST be deterministic: simple keyword matching (positive_words: "helped," "great," "worked"; negative_words: "didn't work," "too generic"; neutral: rest). Confidence score (0–1) assigned based on keyword density.

- **AGR-003**: Loop5 aggregation job (runs daily end-of-day) MUST: (1) Group recommendations by [teacher_id, class_id, intervention_type], (2) Calculate success_rate = (count where feedback_sentiment=positive) / (count all), (3) Update `agent_learning_policies` table: set is_high_trust = true if success_rate >0.7, false if <0.3, (4) Log aggregation result to audit.

- **AGR-004**: Next briefing generation MUST query `agent_learning_policies` table for high_trust interventions and prioritize them in LLM prompt. Example prompt: "High-trust interventions for this teacher: [list]. Prioritize these. Avoid: [list of low_impact suggestions]."

- **AGR-005**: Agent personality MUST shift based on closure patterns: (a) Closure ≥60%: use confident tone, "We're learning what works for your class." (b) Closure 30–60%: use balanced tone, "Let's focus on fewer, higher-impact actions." (c) Closure <30%: use inquiry tone, "What would help most? [feedback modal]"

- **AGR-006**: Dismissal tracking MUST capture optional reason: if teacher clicks "Dismiss," prompt offers: [I already tried this, It doesn't fit my style, Will try later, Other]. Reason stored for agent analysis.

### Key Entities

- **Recommendation with Closure Status**: Extends `recommendations` table. New fields: [teacher_action_status (Viewed/Acknowledged/Implemented/Dismissed), action_timestamp, teacher_feedback (text), feedback_sentiment (positive/neutral/negative), feedback_confidence (0–1)]
- **Agent Learning Policies**: `agent_learning_policies` table. [teacher_id, class_id, intervention_type, success_rate, is_high_trust, feedback_sentiment_avg, recommendations_count, last_updated]
- **Closure Metric**: Derived stat, computed daily: [teacher_id, class_id, period (week/month), closure_rate (%), recommendation_count, action_latency_avg_hours, trend (↑↓→)]

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95%+ of teachers who receive recommendations see "Recommendation History" widget within 7 days
- **SC-002**: Teachers mark ≥60% of recommendations as "Done or Dismissed" within 48 hours of delivery (loop closure ≥60%)
- **SC-003**: ≥50% of implemented recommendations include optional feedback (adoption of feedback collection)
- **SC-004**: Closure rate widget is correct (spot-check: manual calculation matches displayed %). Zero data inconsistencies.
- **SC-005**: Dashboard loads within 2 seconds; refresh latency ≤5 seconds
- **SC-006**: Teachers find Loop Closure UI helpful (survey: ≥4/5 agreement with "This helps me see my partnership with the agent")

### Agentic Success Criteria

- **SCA-001**: Loop closure rate ≥60% within 48h of recommendation delivery. Measured: (count where status IN [Viewed, Acknowledged, Implemented]) / (count all), tracked in `recommendations` table.

- **SCA-002**: Feedback collection rate ≥50% of "Implemented" recommendations. Teachers provide feedback on what they tried and outcome. Measured: (count where feedback IS NOT NULL AND status = 'Implemented') / (count where status = 'Implemented').

- **SCA-003**: Agent learning adoption: ≥70% of next-cycle recommendations are boosted from high_trust pool (vs. generic suggestions). Measured: (count recs that appeared in high_trust list) / (count all recs in next briefing).

- **SCA-004**: Personalization effectiveness: teacher approval rate on high_trust recommendations ≥80% (vs. 60% baseline for generic). Measured: (count approved where is_high_trust=true) / (count sent where is_high_trust=true) ≥ 0.80.

- **SCA-005**: Zero policy violations: all teacher actions logged, no lost feedback, no data inconsistencies between dashboard and audit trail. Weekly audit.

- **SCA-006**: Agent adaptation speed: within 1 week of closure feedback, LLM prompt includes high_trust interventions (verified via inspection of W06 prompts). Measured: compare LLM prompt Week 1 vs. Week 2 for same class.

---

## Architecture

### Data Flow

```
Teacher Uses Loop4 (Self-Evaluation): Dashboard Interaction
├─ Teacher views "Recommendation History" widget
├─ Dashboard queries `recommendations` table for past 30 days (status, feedback, timestamps)
├─ Status display: [Viewed, Acknowledged, Implemented, Dismissed]
│
├─ Teacher clicks "✓ Mark as Done" next to implemented recommendation
│  ├─ Frontend: status changes to "Implemented" + optional feedback prompt
│  ├─ Backend: UPDATE `recommendations` SET status='Implemented', teacher_action_timestamp=NOW()
│  └─ Optional: Teacher types feedback, UPDATE feedback text field
│
├─ Teacher can also "Dismiss" with optional reason
│  └─ UPDATE `recommendations` SET status='Dismissed', dismissal_reason
│
└─ Async: Log action to `n8n_audit_log` for agent awareness

Agent Uses Loop5 (Learning): End-of-Day Aggregation
├─ Scheduled job (daily, 10 PM): Aggregate recommendations from past 24h
│  ├─ GROUP BY [teacher_id, class_id, intervention_type]
│  ├─ Calculate: success_rate = count(positive_feedback) / count(all)
│  ├─ Sentiment analysis: keyword matching on feedback text
│  └─ UPDATE `agent_learning_policies` table:
│     ├─ IF success_rate >0.7: is_high_trust = true
│     ├─ IF success_rate <0.3: is_high_trust = false
│     └─ Store: latest_sentiment_avg, recommendations_count, last_updated
│
└─ Next briefing generation (W06, next day):
   ├─ LLM prompt includes: "High-trust for this class: [list]"
   ├─ High_trust interventions prioritized in suggestion ranking
   └─ Result: personalized recommendations

Agent Self-Evaluation: Weekly Trend Analysis
├─ Weekly job: Compute closure metrics per teacher
│  ├─ closure_rate = (Implemented + Acknowledged + Viewed) / (all)
│  ├─ action_latency_avg = avg(action_timestamp - delivery_timestamp)
│  ├─ trend = (this week closure_rate) vs. (last week closure_rate) → ↑↓→
│  └─ IF closure_rate <20% for 2 consecutive weeks: flag for "Inquiry Mode"
│
└─ Inquiry Mode (optional): Next briefing asks "What format would help?" instead of pushing recs
```

### Next.js UI Components

- **RecommendationHistory Widget**: Server Component (RSC)
  - Fetches `recommendations` for past 30 days via Server Action
  - Displays list with status, timestamp, "Mark Done" button
  - Filter tabs: [All, Implemented, Dismissed, Viewed]
  - Sorting: newest first (customizable)

- **ClosureMetric Badge**: Client Component
  - Displays closure % + tone-appropriate text
  - Props: closure_rate (number), recommendation_count (number)
  - Tone: positive (≥60%), balanced (30–60%), inquiry (<30%)

- **FeedbackTextarea**: Client Component (form field)
  - Max 300 chars
  - Placeholder: "What did you try? How'd it go?"
  - Shows char count
  - "Save Feedback" button (debounced POST to API)

- **BulkMarkDone Modal**: Client Component
  - Checkbox selector for multiple recommendations
  - "Mark All Selected as Implemented" button
  - Confirmation modal before batch update

### Privacy & Safeguards

| Safeguard | Implementation |
|-----------|----------------|
| **Data Ownership** | Teachers own their feedback; can delete feedback (soft delete). Agent never stores raw student mood data. |
| **Audit Trail** | Every closure event logged: who, what, when, teacher_action_timestamp |
| **Feedback Anonymization** | Feedback text is analyzed for sentiment (keywords), never raw-stored for LLM fine-tuning without explicit consent. |
| **Opt-out** | Teachers can disable "Automatic Loop Learning" (agent will not personalize recs). Fallback: agent uses generic suggestions. |

---

## Loop 4 & 5 Integration

### Loop 4 (Self-Evaluation): Teacher Provides Signal

1. Teacher marks rec as "Done" or "Dismissed" in dashboard
2. Optional feedback captured: "What did you try? How'd it go?"
3. Feedback is NOT immediately processed by agent; logged for async analysis

### Loop 5 (Learning): Agent Adapts

1. **Daily Aggregation** (10 PM): Job queries all closure actions from past 24h
2. **Sentiment Analysis**: Keyword matching on feedback (positive/neutral/negative)
3. **Success Rate Calc**: (positive + neutral feedback) / (all feedback) = effectiveness metric
4. **Policy Update**: High_trust tags applied; low_impact interventions deprioritized
5. **Next Cycle** (tomorrow's briefing): LLM prompt includes high_trust list + deprioritize low_impact
6. **Teacher Observability**: Dashboard shows "Based on your feedback, we're learning: X intervention is highly effective for your class. Using it more!"

### Closure Rate Calculation

```
Closure Rate = (count status IN [Viewed, Acknowledged, Implemented, Dismissed]) / (count all)

Example:
- Sent: 7 recommendations
- Viewed: 2, Acknowledged: 2, Implemented: 3, Dismissed: 2, Pending: 0
- Closure rate = (2+2+3+2) / 7 = 9/7 = 128.5%... 

Wait, that's wrong. Let me recalculate:
- Pending means no action taken yet (timeout, teacher didn't need)
- Closure rate should be: (count NOT "Pending") / (count all, excluding current pending?)

Correct formula:
- IF timestamp_now - created_at < 48h AND status = "Pending": count as "in progress" (not yet failed)
- IF timestamp_now - created_at >= 48h AND status = "Pending": count as "Not Actioned" (failed closure)
- Closure rate = (count where status IN [Viewed, Acknowledged, Implemented, Dismissed]) / (count where created_at within measurement window)
- For "past 7 days" metric: (count actions within 7d) / (count recommendations created within 7d)

Example (corrected):
- Week: 7 recommendations sent (M-Su)
- Viewed: 2, Acknowledged: 1, Implemented: 2, Dismissed: 1, Pending (still <48h): 1
- Closure rate would treat "Pending (still <48h)" as "pending, not failed yet"
- Formula: (2+1+2+1) / (2+1+2+1+1) = 6/7 = 86% (treating pending as potential success, not failure yet)

For "48-hour closure rate" metric (different formula):
- Count all recommendations sent >= 48h ago
- Closure rate = (count where status IN [Viewed, Acknowledged, Implemented, Dismissed]) / (count all recs sent >=48h ago)
- This filters out recommendations still in "pending" window
```

---

## Phase 2 Implementation

- **Dependencies**: `recommendations` table with new status/feedback fields, `agent_learning_policies` table, daily aggregation job
- **Scope**: Dashboard UI for closure tracking, feedback collection, sentiment analysis (Phase 3: multimodal feedback, video annotations)
- **Testing**: Unit (closed rate calc, sentiment analysis), Component (UI render, form submission), Integration (E2E teacher workflow)
- **Rollout**: Week 1 (beta teachers), Week 2+ (full rollout once feedback collection >50%)

---

## Appendix: Agentic Framing Checklist

- ✅ **Loop Stage Mapping**: Loop4 (teacher self-evaluation via dashboard) + Loop5 (agent learns from aggregated patterns)
- ✅ **Agent Goal**: Collect teacher feedback systematically; adapt recommendations based on patterns; ensure teacher sees partnership working
- ✅ **Tool Isolation**: Dashboard queries DB directly; no LLM in Loop4 (only sentiment analysis in Loop5)
- ✅ **Privacy**: Teacher owns feedback; can delete. Feedback analyzed for keywords, not stored raw for training.
- ✅ **Loop Closure**: Teacher action is the core signal; agent learns weekly and adapts next-cycle recommendations
- ✅ **Teacher Partnership**: Tone is collaborative ("Agency strong!"); non-judgmental ("Let's focus on depth")
- ✅ **Transparency**: Teachers see closure % and trending; understand agent is personalizing
- ✅ **Success Metrics**: 60%+ closure rate, 50%+ feedback adoption, 70%+ high_trust recommendations used, SCA-001 to SCA-006
