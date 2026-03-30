<!-- created: 2026-03-22 -->
# Solution Architecture: Teacher Recommendation Experience & Inquiry Mode

**Branch**: `005-closure-tracking`  
**Phase**: Phase 2 — Solution Design & Planning (Recommendation UX/UI, Metrics Validation, Inquiry Mode)  
**Status**: Design phase complete, pending implementation task breakdown  
**Author**: Solution Design Specification  

---

## 1. Solution Overview

The teacher-facing recommendation experience is the critical **human-in-the-loop engagement point** where the n8n `climate-agent-main` workflow connects to educator action. Currently, recommendations are generated and persisted to Supabase, but dashboard surfaces remain incomplete, and Inquiry Mode (the adaptive behavior when teachers consistently dismiss recommendations) is not yet operational.

This solution completes the feedback loop by establishing **three integrated layers**:

1. **Dashboard Hub** — A single source of truth where teachers see all recommendations across classes, filter by state (pending/approved/dismissed), and take action with a single click
2. **Inquiry Mode Adaptation** — When a teacher's dismissal rate exceeds 60%, the agent switches from directive recommendations ("try this intervention") to collaborative inquiry ("what do you think is happening?"), with field for optional teacher feedback
3. **Metrics Loop** — Teacher actions (approve/dismiss) feed back into the metrics that trigger Inquiry Mode, creating a continuous learning signal for the agent to personalize future briefings

The design respects **k-anonymity** (never expose raw student data), **human control** (teacher always approves before action), and **email integration** (Resend email acts as awareness trigger with deep-link to approval point on dashboard). Email→Dashboard flow is optimized for busy Thai educators: scan subject line (5 sec) → click CTA → one-click approve/dismiss (20 sec total).

---

## 2. Architecture & Data Flow

### 2.1 Page Structure & Information Architecture

**Current State**:
- `/teacher/` — Dashboard mood overview (exists)
- `/teacher/classes/` — Class grid + QR dialog (exists)
- `/teacher/class/[id]/` — Per-class mood chart + student count (exists)

**Changes**:
```
/teacher/recommendations                   [NEW] Global recommendation hub
  ├── Query params: ?class=[id], ?status=[pending|approved|dismissed], ?inquiry_mode=[true], ?sort=[newest|by-class|by-policy]
  ├── Filters: All, Pending, Approved, Dismissed, Inquiry Mode (with counts)
  │
  ├── Recommendation cards (list view)
  │   ├── Each card shows: class name, policy level (emoji), content snippet, confidence, created_at
  │   ├── Status-dependent buttons: [Approve] [Dismiss] for pending; read-only for approved/dismissed
  │   ├── Inquiry Mode badge: 🤔 "We'd like your insight" (distinct styling)
  │   └── On click card → expand details (modal or inline)
  │
  └── Per-class metrics summary (collapsible)
      ├── Class 6/1: 12 total recs | 8 approved (67%) | 4 dismissed (33%) | Inquiry Mode: OFF
      ├── Class 6/2: 5 total recs | 3 approved (60%) | 2 dismissed (40%) | Inquiry Mode: ON ← 🤔

/teacher/class/[id]/                       [EXTEND existing]
  └── Add below existing mood chart:
      └── Recommendation Performance Card
          ├── Total: 12, Approved: 8 (67%), Dismissed: 4 (33%)
          ├── Avg Approval Time: 2.5 hours
          ├── Inquiry Mode Status: Active/Inactive
          └── Link: "View all recommendations for this class" → /teacher/recommendations?class=[id]
```

**Key Design Decision**: Centralize all recommendations in `/teacher/recommendations` (global view) rather than scattering per-class lists. This allows teachers to see cross-class patterns and comparative dismissal rates. Per-class context is linked (not duplicated).

### 2.2 Data Flow Diagram: Email → Dashboard → Action → Metrics Update

```
┌─────────────────────────────────────────────────────────────────────┐
│ TRIGGER: n8n climate-agent-main (07:30 AM)                         │
│ ├─ Aggregates class mood, generates recommendation                │
│ ├─ Inserts to recommendations table (status='pending')            │
│ ├─ IF policy_level = WARNING or CRITICAL:                       │
│ │  └─ Sends Resend email with CTA → /teacher/recommendations    │
│ │     + query param for highlighting this recommendation         │
│ └─ Fires ISR webhook: POST /api/webhooks/climate/...            │
└──────────┬────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ EMAIL INBOX (Resend)                                               │
│ Subject: "⚠️ [Climate Agent] พบสัญญาณเตือนห้องเรียนวันนี้"           │
│ Body: recommendation_content, policy_level, confidence, CTA button │
│ ↓ Teacher scans (5 sec) and clicks CTA button                    │
└──────────┬────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ NEXT.JS PAGE: /teacher/recommendations                              │
│ [RSC] Parallel fetches:                                             │
│   1. SELECT * FROM recommendations WHERE teacher_id = uid()        │
│   2. RPC get_teacher_metrics() for each class → dismissal_rate    │
│   3. RPC get_past_recommendations() → summary stats                │
│                                                                    │
│ Server component renders RecommendationList with fetched data      │
│ ↓ Target recommendation highlighted (from URL param)              │
└──────────┬────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ CLIENT COMPONENT: RecommendationCard.tsx                            │
│ ('use client' for interactive buttons)                             │
│ ├─ Card shows: class, policy_level, content, confidence, date     │
│ ├─ Conditional buttons (by status):                               │
│ │  ├─ PENDING: [Approve] [Dismiss]                               │
│ │  ├─ APPROVED: [Read-only]                                      │
│ │  └─ DISMISSED: [Read-only]                                     │
│ ├─ Inquiry Mode badge: 🤔 visible if inquiry_mode=true          │
│ └─ On [Dismiss]: open modal with textarea for optional feedback   │
└──────────┬────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ USER ACTION: Teacher clicks [Approve] or [Dismiss]                 │
│ (Client Event Handler → Server Action)                             │
│                                                                    │
│ Server Action: approveRecommendation(rec_id, 'approved'|'dismissed', feedback?)
│   1. Auth check: auth.user.id = teacher_id ✓                     │
│   2. UPDATE recommendations SET status='approved|dismissed', feedback=?
│   3. Supabase triggers on UPDATE → recalculates dismissal_rate  │
│   4. Return success + new recommendation state                   │
│   5. Invoke revalidatePath('/teacher/recommendations') [ISR]     │
│                                                                    │
│ Client: optimistic UI update (button disabled, status changes)   │
│         Toast: "✅ บันทึกการอนุมัติสำเร็จ"                         │
└──────────┬────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ SUPABASE: UPDATE recommendations                                    │
│ ├─ status field changes from 'pending' to 'approved'|'dismissed'  │
│ ├─ DB trigger (or RPC call) recalculates:                        │
│ │  └─ get_teacher_metrics for affected class                    │
│ │     └─ dismissal_rate = count(dismissed) / count(total)       │
│ └─ Next time RPC is queried, new dismissal_rate is returned     │
└──────────┬────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ [24 HOURS LATER] Next n8n Briefing (07:30 AM day 2)                │
│                                                                    │
│ n8n climate-agent-main:                                           │
│   ├─ Fetches RPC get_teacher_metrics                             │
│   ├─ dismissal_rate now fresh (reflects yesterday's approvals)   │
│   ├─ Fallback Policy Engine checks:                             │
│   │   IF dismissal_rate > 0.6                                   │
│   │   AND total_recommendations >= 3                             │
│   │   AND policy_level = WARNING                                 │
│   │   THEN inquiry_mode = true                                  │
│   └─ Next recommendation uses question tone (inquiry template)   │
│                                                                  │
│ Email sent with new Inquiry Mode template:                       │
│   Subject: "⚠️ [Climate Agent] สังเกตบรรยากาศห้องเรียน..."         │
│   Body: "สังเกตว่า...ครูคิดว่าอะไรทำให้นักเรียนรู้สึกแบบนี้คะ?"    │
│   Tone: Question-based (not directive)                           │
│                                                                  │
│ Teacher sees Inquiry Mode badge in dashboard:                    │
│   🤔 "We'd like your insight"                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. UX: Key Screens & States

### 3.1 Recommendation Hub View (Main Screen)

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ /teacher/recommendations                                   │
├─────────────────────────────────────────────────────────────┤
│ 📋 Recommendations (All Classes)                            │
│                                                            │
│ Filters:  [All (7)] [Pending (3)] [Approved (2)]          │
│           [Dismissed (1)] [Inquiry Mode (1)]              │
│                                                            │
│ Sort by:  📅 Newest  ▶ By Class  ▶ By Policy Level       │
│                                                            │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ⚠️ WARNING | Class 6/1 | 2026-03-22 07:30            │  │
│ │                                                       │  │
│ │ "ครูอาจต้องการสังเกตบรรยากาศห้องเรียนมากขึ้น        │  │
│ │  กลุ่มนักเรียนดูเหมือนเครียดจากผลการทดสอบ"         │  │
│ │                                                       │  │
│ │ Confidence: ████████░░ 65% | Mood Recovery | PENDING │  │
│ │                                                       │  │
│ │ [ยอมรับ] [ปฏิเสธ]                                    │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                            │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ 🤔 WARNING (Inquiry Mode) | Class 6/2 | 2026-03-21   │  │
│ │ We'd like your insight                                │  │
│ │                                                       │  │
│ │ "สังเกตว่าบรรยากาศห้องเรียนอาจมีบางส่วนที่         │  │
│ │  เปลี่ยนแปลง ครูคิดว่าอะไรทำให้นักเรียนรู้สึก      │  │
│ │  แบบนี้คะ/ครับ?"                                     │  │
│ │                                                       │  │
│ │ Confidence: ████████░░ 65% | Mood Recovery | PENDING │  │
│ │                                                       │  │
│ │ [ยอมรับ] [ปฏิเสธ]                                    │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                            │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ✅ APPROVED | Class 6/1 | 2026-03-21 07:30          │  │
│ │                                                       │  │
│ │ "ครูอาจต้องการสังเกตบรรยากาศห้องเรียนมากขึ้น        │  │
│ │  กลุ่มนักเรียนดูเหมือนเครียดจากผลการทดสอบ"         │  │
│ │                                                       │  │
│ │ Confidence: ████████░░ 65% | Mood Recovery           │  │
│ │ Approved at: 07:45 (หลังจากได้รับอีเมล 15 นาที)    │  │
│ │ [Read-only]                                          │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                            │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Recommendation Performance Summary                     │  │
│ │                                                       │  │
│ │ Class 6/1:  12 total | 8 approved (67%) | 4 dismissed│  │
│ │ Class 6/2:  5 total | 3 approved (60%) | 2 dismissed│  │
│ │             🤔 Inquiry Mode Active                    │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                            │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Pending Recommendation Card (Interactive)

**Before Click**:
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ WARNING | Class 6/1 | 2026-03-22 07:30              │
│                                                        │
│ "ครูอาจต้องการสังเกตบรรยากาศห้องเรียนมากขึ้น          │
│  กลุ่มนักเรียนดูเหมือนเครียดจากผลการทดสอบ"           │
│                                                        │
│ Confidence: ████████░░ 65% | Mood Recovery             │
│ Category: Teaching Suggestion | Created: 07:30        │
│                                                        │
│ [ยอมรับ] [ปฏิเสธ]                                     │
│                                                        │
│ Click for more details ↓                              │
└─────────────────────────────────────────────────────────┘
```

**On Click [Approve]** (optimistic):
```
┌─────────────────────────────────────────┐
│ ✅ APPROVED                             │
│ บันทึกการอนุมัติสำเร็จ                  │
│                                         │
│ (card dimmed, buttons disabled)         │
│ [approve btn greyed out]                │
│                                         │
│ (Server Action in background)           │
└─────────────────────────────────────────┘
```

**On Click [Dismiss]**:
```
┌──────────────────────────────────────────────────────────┐
│ 📋 ปฏิเสธคำแนะนำนี้                                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ "ต้องการบันทึกเหตุผลหรือหมายเหตุเกี่ยวกับการปฏิเสธ      │
│  นี้หรือไม่? (ไม่บังคับ)"                                │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ เหตุผลที่ปฏิเสธ (0-200 ตัวอักษร) :                   │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │                                                 │ │ │
│ │ │ ได้จัดการเรื่องนี้กับนักเรียนแล้ว              │ │ │
│ │ │                                                 │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │ (180 / 200)                                         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ [บันทึกการปฏิเสธ] [ยกเลิก]                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

After [บันทึกการปฏิเสธ]:
```
Card status changes to ❌ DISMISSED
Reason shown: "ได้จัดการเรื่องนี้กับนักเรียนแล้ว"
Toast: "✅ บันทึกการปฏิเสธสำเร็จ"
```

### 3.3 Inquiry Mode Card (Distinct Styling)

**In Pending State**:
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ WARNING (Inquiry Mode) | Class 6/2 | 2026-03-22     │
│ 🤔 We'd like your insight                              │
│                                                        │
│ "สังเกตว่าบรรยากาศห้องเรียนอาจมีบางส่วนที่           │
│  เปลี่ยนแปลง ครูคิดว่าอะไรทำให้นักเรียนรู้สึก         │
│  แบบนี้คะ/ครับ?"                                      │
│                                                        │
│ Confidence: ████████░░ 65% | Mood Recovery             │
│ Tone: Collaborative Question                          │
│                                                        │
│ [ยอมรับ] [ให้ความเห็น]                                │
│                                                        │
│ * This is an inquiry, not a directive. We're asking   │
│   for your professional judgment to improve our       │
│   recommendations for this class.                     │
│                                                        │
└─────────────────────────────────────────────────────────┘
```

**Color & Styling Notes**:
- Normal WARNING: Orange/yellow background, ⚠️ emoji
- Inquiry Mode: Light blue or soft purple background, 🤔 emoji, softer borders
- Font: Same as normal cards (body text unchanged)
- Badge text: "🤔 We'd like your insight" — appears below policy level

**On Click [ให้ความเห็น]** (Inquiry Feedback):
```
Modal: same as dismiss modal but with different prompt
┌──────────────────────────────────────────────────────────┐
│ 🤔 ขอฟังความเห็นของคุณ                                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ "ระบบของเราสังเกตเห็นบรรยากาศ... แต่คณะการสอน        │
│  มีประสบการณ์และความเข้าใจโดยตรง ลองช่วยให้          │
│  ระบบเข้าใจผลจากจุดมองของคุณ"                         │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ความเห็นของคุณ (0-500 ตัวอักษร) :                   │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │                                                 │ │ │
│ │ │ นักเรียนดูเครียดเพราะจะมีการทดสอบ              │ │ │
│ │ │ วันต่อไป ควรลดภาระให้พักสักหน่อย               │ │ │
│ │ │                                                 │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │ (420 / 500)                                         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ [บันทึกและยอมรับ] [ปฏิเสธคำแนะนำ] [ยกเลิก]            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

After [บันทึกและยอมรับ]:
- recommendations.status = 'approved'
- recommendations.feedback = "นักเรียนดูเครียด..."
- Toast: "✅ ขอบคุณสำหรับความเห็น ระบบจะใช้ข้อมูลนี้ปรับปรุง"
- Next briefing LLM prompt includes: "Teacher mentioned students are stressed about tests → adjust to suggest stress-relief activities"

### 3.4 Per-Class Metrics Panel

**Location**: `/teacher/class/[id]/` (below existing mood chart)

```
┌─────────────────────────────────────────────────────────┐
│ 📊 Recommendation Performance (Class 6/1)               │
├─────────────────────────────────────────────────────────┤
│                                                        │
│ Total Recommendations: 12                             │
│ ✅ Approved: 8 (67%)  ───██████████░░░░  2.5 hrs avg │
│ ❌ Dismissed: 4 (33%) ───████░░░░░░░░░░  Feedback OK  │
│                                                        │
│ ⏱️ Avg Approval Time: 2.5 hours                       │
│    (from email send to your approval click)          │
│                                                        │
│ 🤔 Inquiry Mode Status:                              │
│    ✅ Active (Teacher dismissal rate > 60%)          │
│    Next recommendations will ask for your insight    │
│                                                        │
│ [View all recommendations for this class] →          │
│                                                        │
└─────────────────────────────────────────────────────────┘
```

### 3.5 Empty State Variants

#### Variant A: No Recommendations (Yet)
```
┌─────────────────────────────────────────────────────────┐
│                    🌤️                                   │
│                                                        │
│          ยังไม่มีคำแนะนำ                               │
│                                                        │
│ "ระบบจะเริ่มสร้างคำแนะนำเมื่อนักเรียน                 │
│  แสดงความรู้สึก ปัจจุบันรอข้อมูลจากนักเรียน 3 คนขึ้นไป" │
│                                                        │
│ [ดูวิธีสร้าง QR Code]                                │
│                                                        │
└─────────────────────────────────────────────────────────┘
```

#### Variant B: Frequency Limit Hit (Too Many Notifications Today)
```
┌─────────────────────────────────────────────────────────┐
│                    🚫                                   │
│                                                        │
│        ถึงขีดจำกัดการแจ้งเตือน                         │
│                                                        │
│ "คำแนะนำเพียงพอสำหรับวันนี้แล้ว                        │
│  ลองอีกครั้งในวันพรุ่งนี้"                             │
│                                                        │
│                    [🗙 ปิด]                            │
│                                                        │
└─────────────────────────────────────────────────────────┘
```

#### Variant C: RPC Error (Cannot Load Metrics)
```
┌─────────────────────────────────────────────────────────┐
│                    ⚠️                                   │
│                                                        │
│      ไม่สามารถโหลดข้อมูลได้ชั่วขณะ                     │
│                                                        │
│ "อาจมีปัญหาชั่วคราวในการเชื่อมต่อ                      │
│  ลองรีเฟรชหน้าได้ที่นี่ หรือมาโหลดอีกครั้ง"           │
│                                                        │
│                   [🔄 รีเฟรช]                          │
│                                                        │
│ (Last known metrics will be shown if available)       │
│                                                        │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Email → Dashboard Flow (5-Second Path)

**Scenario**: Teacher receives WARNING email on smartphone at 07:35 AM.

```
⏰ T+5sec [Email Inbox - Scan Time]
  ┌─────────────────────────────────────────┐
  │ From: Climate Agent <noreply@...>       │
  │ Subject: ⚠️ [Climate Agent] พบสัญญาณ... │
  │ Preview: "ห้องเรียน 6/1 ปัญหา..."       │
  └─────────────────────────────────────────┘
  Teacher thinks: "Oh, my 6/1 class again. Let me check."
  Teacher taps CTA: [ดูรายละเอียดบนแดชบอร์ด]

⏰ T+10sec [Navigate]
  Browser opens: /teacher/recommendations?highlight=<rec_id>
  auth.user = teacher ✓
  Page starts loading

⏰ T+15sec [Dashboard Renders]
  RSC has fetched:
  - recommendations list
  - teacher metrics for each class
  - past recommendations summary
  
  Client renders RecommendationList
  Target recommendation is highlighted (shadow/border)
  Teacher sees:
  ├─ Class 6/1 card in orange (WARNING)
  ├─ Thai text: "ครูอาจต้องการสังเกตบรรยากาศ..."
  ├─ Buttons visible: [ยอมรับ] [ปฏิเสธ]
  └─ Confidence bar, timestamp visible

⏰ T+20sec [Action]
  Teacher clicks [ยอมรับ] 
  ↓
  Server Action executes
  ↓
  Optimistic UI: card turns green, button disabled
  ↓
  Toast: "✅ บันทึกการอนุมัติสำเร็จ"
  ↓
  [DONE: 20 seconds total from email to approval]
```

**Why This Works for Thai Educators**:
1. ✅ Email subject is immediately scannable (emoji + class name)
2. ✅ CTA button is large and obvious (tested on mobile)
3. ✅ URL includes deep-link parameter to highlight recommendation (reduced cognitive load: "where do I click?")
4. ✅ Dashboard opens directly to recommendation (not requiring further navigation)
5. ✅ Pre-loaded data (RSC parallel fetches) means no spinning loaders
6. ✅ Single button click: [Approve] is primary action ("Got it, thanks for heads up")
7. ✅ Optional dismiss (for when teacher disagrees) requires one extra click + modal (intentional: gives time to reflect)

---

## 5. Integration with PRD Features

### 5.1 Feature Mapping Table

| PRD Feature ID | Feature Name | Requirement | Concrete Implementation |
|---|---|---|---|
| **T-03** | AI Recommendations Approve/Dismiss | Teacher must approve every recommendation before agent acts | `/teacher/recommendations` hub with status-dependent buttons; status transitions pending→approved→completed; no agent action without approval |
| | | Show polarity (good/warning/critical) | Card headers with emoji (🌤️ ROUTINE, ⚠️ WARNING, 🚨 CRITICAL); card color coding |
| | | Approval/dismissal is logged | UPDATE recommendations.status; server-side ISR invalidation; audit trail in DB |
| **T-05** | Email Notifications | Send email for WARNING and CRITICAL | n8n Resend integration; ROUTINE policy skips email (dashboard-only); Rate limit 1/500ms |
| | | Email includes confidence & category | Resend email body includes confidence score, category, policy_level in structured HTML |
| | | Email has CTA to dashboard | Button text: "ดูรายละเอียดบนแดชบอร์ด" → href includes highlight param |
| | | Thai language template | Subject + body full Thai translation; tested with native speakers |
| **T-06** | Inquiry Mode | Detect high dismissal (>60%) | dismissal_rate RPC metric + logic in Fallback Policy Engine checks: dismissal_rate > 0.6 AND total_recs >= 3 AND policy=WARNING |
| | | Switch to question tone when triggered | inquiry_mode flag; email template changes from directive ("ลองทำ...") to question ("ครูคิดว่า...?") |
| | | Collect optional teacher feedback | Modal textarea on dismiss action; feedback stored in recommendations.feedback |
| | | Visually distinct in UI | 🤔 badge "We'd like your insight"; blue/purple card styling (vs orange for normal WARNING) |
| **S-03** | Loop Closure Visible | Students see that teacher acted on recommendation | [FUTURE] When teacher marks completed + provides feedback, API available for student dashboard to show "Teacher implemented" indicator |
| | | Transparency without raw data | Only aggregated signals shown (approval_rate, dismissal_rate, "teacher acted on this"); no student names or individual mood scores |
| **SYS-03** | k-anonymity n≥3 | Never expose raw student data | RPC get_aggregated_climate_data enforces n>=3 check; rejects queries if fewer than 3 responses |
| | | Dashboard shows only aggregates | Metrics card shows percentages (67% approved), not raw counts; no individual student mood data |
| | | Email shows aggregated signals only | Email includes recommendation_content (no student names), policy_level, category; no raw data |
| **SYS-04** | Audit Logging | Log all decisions and actions | n8n_audit_logs captures every recommendation generation (decision_path JSONB); Supabase RLS trigger on UPDATE recommendations logs teacher actions |

---

## 6. Data Contracts & API Interfaces

### 6.1 RPC: `get_teacher_metrics(class_id UUID, teacher_id UUID)`

**Returns**:
```json
{
  "class_id": "550e8400-e29b-41d4-a716-446655440000",
  "teacher_id": "660e8400-e29b-41d4-a716-446655440111",
  "dismissal_rate": 0.33,
  "total_recommendations": 12,
  "approved_count": 8,
  "dismissed_count": 4,
  "avg_approval_time_hours": 2.5,
  "high_dismissal": false,
  "inquiry_mode_suggested": false,
  "avg_mood_score": 3.2,
  "total_surveys": 45,
  "date_range": {
    "start_date": "2026-03-07T00:00:00Z",
    "end_date": "2026-03-21T23:59:59Z"
  },
  "last_updated_at": "2026-03-21T10:15:00Z"
}
```

**Used In**:
- Dashboard metrics card (per-class view)
- Inquiry Mode detection (Fallback Policy Engine)
- Trending analysis (chart comparisons)

**Calculation Logic**:
- `dismissal_rate = COUNT(status='dismissed') / COUNT(status='pending' OR 'approved' OR 'dismissed')`
- `total_recommendations = COUNT(*) for this class_id`
- `approved_count = COUNT(status='approved')`
- `avg_approval_time_hours = AVG(EXTRACT(EPOCH FROM (approved_at - created_at)) / 3600) WHERE status='approved'`
- `high_dismissal = dismissal_rate > 0.6`
- `inquiry_mode_suggested = high_dismissal AND total_recommendations >= 3`

### 6.2 RPC: `get_past_recommendations(class_id UUID)`

**Returns**:
```json
{
  "class_id": "550e8400-e29b-41d4-a716-446655440000",
  "summary": {
    "total_recommendations": 12,
    "approved_count": 8,
    "dismissed_count": 4,
    "approval_rate": 0.67,
    "dismissal_rate": 0.33,
    "pending_count": 0
  },
  "top_categories": [
    {
      "category": "mood_recovery",
      "count": 5,
      "approval_rate": 0.8,
      "feedback_themes": ["student calm down", "positive closure"]
    },
    {
      "category": "discipline_management",
      "count": 4,
      "approval_rate": 0.5,
      "feedback_themes": ["already handled", "not applicable"]
    },
    {
      "category": "engagement_boost",
      "count": 3,
      "approval_rate": 1.0,
      "feedback_themes": ["helpful", "students more engaged"]
    }
  ],
  "recent_approvals": [
    {
      "id": "770e8400-e29b-41d4-a716-446655442222",
      "content": "ครูอาจสอนด้วยเสียงต่ำกว่า...",
      "category": "mood_recovery",
      "approved_at": "2026-03-21T09:00:00Z",
      "feedback": null
    }
  ],
  "dismissal_pattern": {
    "by_day_of_week": {
      "monday": 0.25,
      "tuesday": 0.4,
      "wednesday": 0.2,
      "thursday": 0.33,
      "friday": 0.2
    },
    "by_time_of_day": {
      "morning": 0.3,
      "afternoon": 0.36
    }
  }
}
```

**Used In**:
- Dashboard summary card (shows top categories + approval rates)
- n8n briefing prompt context (e.g., "Teacher dismisses discipline_management 50% of the time...")
- Inquiry Mode reasoning (past pattern analysis)

### 6.3 Server Action: `approveRecommendation(rec_id, action, feedback?)`

**Input**:
```typescript
{
  rec_id: string (UUID)
  action: 'approved' | 'dismissed'
  feedback?: string (0-500 chars, optional for dismiss action)
}
```

**Server-Side Logic**:
```typescript
async function approveRecommendation(rec_id, action, feedback) {
  // 1. Auth check
  const user = await auth.user;
  if (!user || user.role !== 'teacher') throw new Error('Unauthorized');

  // 2. Verify recommendation belongs to this teacher
  const rec = await db.query(
    `SELECT teacher_id FROM recommendations WHERE id = $1`,
    [rec_id]
  );
  if (rec.teacher_id !== user.id) throw new Error('Not your recommendation');

  // 3. Update recommendation status
  await db.query(
    `UPDATE recommendations 
     SET status = $1, feedback = $2, updated_at = NOW()
     WHERE id = $3`,
    [action, feedback || null, rec_id]
  );

  // 4. Trigger ISR cache invalidation
  revalidatePath('/teacher/recommendations');

  // 5. Return updated recommendation state
  return { success: true, status: action, rec_id };
}
```

**Returns**:
```json
{
  "success": true,
  "status": "approved",
  "rec_id": "770e8400-e29b-41d4-a716-446655442222",
  "timestamp": "2026-03-22T09:15:00Z"
}
```

### 6.4 Next.js Route: `GET /teacher/recommendations`

**Query Params** (from URL):
```
?class=[uuid]                 // filter by class_id
&status=[pending|approved|dismissed|all]  // filter by status
&inquiry_mode=[true|false|all]  // filter by inquiry_mode flag
&sort=[newest|by-class|by-policy]  // sort order
&highlight=[uuid]             // from email CTA (for UI highlighting)
```

**Server Component Output** (passed to client):
```typescript
{
  recommendations: [
    {
      id: "770e8400-e29b-41d4-a716-446655442222",
      class_id: "550e8400-e29b-41d4-a716-446655440000",
      class_name: "6/1",
      teacher_id: "660e8400-e29b-41d4-a716-446655440111",
      content: "ครูอาจต้องการสังเกตบรรยากาศห้องเรียนมากขึ้น...",
      policy_level: "WARNING",
      confidence_score: 0.65,
      category: "mood_recovery",
      status: "pending",
      inquiry_mode: false,
      inquiry_mode_reason?: "Dismissal rate > 60% (Teacher dismissed 5 of 8 recommendations)",
      created_at: "2026-03-21T07:30:00Z",
      feedback?: "ได้จัดการแล้ว"
    }
  ],
  metrics_by_class: {
    "550e8400-e29b-41d4-a716-446655440000": {
      dismissal_rate: 0.33,
      total_recommendations: 12,
      inquiry_mode_active: false,
      approval_rate: 0.67,
      class_name: "6/1"
    }
  },
  counts: {
    pending: 3,
    approved: 8,
    dismissed: 4,
    inquiry_mode: 1
  },
  timestamp: "2026-03-22T09:15:00Z"
}
```

---

## 7. Key UX/UI Specifications

### 7.1 Color & Styling Guide

| Element | Color | Rationale |
|---|---|---|
| **Normal WARNING card** | Orange/Yellow (#FFA500) | Caution signal; warm, non-threatening |
| **CRITICAL card** | Red (#FF4444) | Urgent; demands attention |
| **ROUTINE card** | Green/Blue (#4CAF50 or #2196F3) | Safe; positive |
| **Inquiry Mode badge** | Light blue/Purple (#E3F2FD or #F3E5F5) | Soft, collaborative tone (not urgent) |
| **[Approve] button** | Green (#4CAF50) | Action affirmed |
| **[Dismiss] button** | Gray (#9E9E9E) | Action deferred; neutral |
| **Approved status** | Green checkmark (#4CAF50) | Complete, finalized |
| **Dismissed status** | Gray cross (#9E9E9E) | Archived, no further action |
| **Pending status** | Orange/Yellow (#FFA500) | Waiting for teacher |

### 7.2 Typography & Spacing

| Element | Font | Size | Weight | Line Height |
|---|---|---|---|---|
| Card title (policy + class) | Inter | 16px | 600 | 1.5 |
| Card content (recommend text) | Inter | 14px | 400 | 1.6 |
| Card metadata | Inter | 12px | 400 | 1.4 |
| Modal title | Inter | 18px | 700 | 1.5 |
| Modal body | Inter | 14px | 400 | 1.6 |
| Button text | Inter | 14px | 600 | 1.5 |

### 7.3 Responsive Design Breakpoints

| Breakpoint | Use Case | Changes |
|---|---|---|
| **Mobile (<640px)** | Smartphone (primary) | Cards full-width; buttons stack vertically; dismiss modal full-screen; filters collapse to dropdown |
| **Tablet (640px–1024px)** | iPad-like | Cards 80% width; buttons side-by-side; filters visible inline |
| **Desktop (>1024px)** | Admin/school | Multi-column layout; sidebar filters; metrics grid layout |

---

## 8. Teacher Action Loop Sequence

```
Day 1, 07:30 AM: n8n generates recommendation
  ├─ avg_mood_score = 2.8 (low)
  ├─ policy_level = WARNING
  ├─ inquiry_mode = false (dismissal_rate still < 60%)
  ├─ INSERT recommendations (status='pending', content='Thai text')
  └─ Send Resend email

Day 1, 07:35 AM: Teacher receives email
  ├─ Scans subject: "⚠️ Warning for 6/1"
  └─ Clicks CTA

Day 1, 07:40 AM: Teacher opens dashboard
  ├─ Sees recommendation card
  ├─ Reads content: "Consider monitoring class mood..."
  ├─ Thinks: "Hmm, I already tried mood recovery yesterday"
  ├─ Clicks [ปฏิเสธ]
  └─ Types feedback: "ได้ลองทำแล้ว อารมณ์นักเรียนดีขึ้น"

Day 1, 07:42 AM: UPDATE recommendations
  ├─ status = 'dismissed'
  ├─ feedback = "ได้ลองทำแล้ว อารมณ์นักเรียนดีขึ้น"
  ├─ updated_at = 07:42 AM
  ├─ Supabase RPC trigger recalculates dismissal_rate
  ├─ dismissal_rate = 3/8 = 0.375 (still < 0.60)
  └─ ISR cache invalidated

Day 2, 07:30 AM: n8n generates next recommendation
  ├─ RPC get_teacher_metrics called
  ├─ dismissal_rate = 0.375 (below threshold)
  ├─ inquiry_mode = false
  ├─ Normal directive recommendation sent
  └─ Email arrives

[REPEAT: Day 3, 4, 5...]

Day 5, 07:30 AM: After 3 dismissals in 5 days
  ├─ RPC get_teacher_metrics called
  ├─ dismissal_rate = 0.625 (5 dismissed out of 8 total)
  ├─ total_recommendations >= 3 ✓
  ├─ policy_level = WARNING ✓
  ├─ inquiry_mode = TRUE ✅
  ├─ Recommendation content changes to question:
  │  "สังเกตว่า...ครูคิดว่าอะไร?"
  ├─ INSERT recommendations (inquiry_mode=true)
  └─ Resend email with inquiry template

Day 5, 08:00 AM: Teacher opens email
  ├─ Sees 🤔 badge: "We'd like your insight"
  ├─ Reads question: "What do you think..."
  ├─ Clicks [ให้ความเห็น (Provide Insight)]
  ├─ Modal opens
  ├─ Types feedback: "นักเรียนเตรียมตัวสอบ ต้องมีเวลาเรียนเพิ่ม
  │                    ไม่ใช่อารมณ์ที่ต่ำ แนะนำปรับจำนวนแบบฝึก"
  └─ Clicks [บันทึกและยอมรับ]

Day 5, 08:05 AM: UPDATE recommendations
  ├─ status = 'approved'
  ├─ feedback = "นักเรียนเตรียมตัวสอบ..."
  ├─ Supabase trigger: dismissal_rate recalculates (or reset for this inquiry)
  └─ Toast: "ขอบคุณสำหรับความเห็น ระบบจะใช้ข้อมูลนี้ปรับปรุง"

Day 6, 07:30 AM: n8n generates next recommendation
  ├─ LLM prompt enriched with:
  │  "Teacher mentioned students are preparing for exams → need more study time.
  │   Adjust next recommendation to suggest exam preparation activities."
  ├─ LLM (if reintroduced) generates more contextual recommendation
  ├─ Fallback engine respects teacher feedback in next round
  └─ Email arrives with improved, contextualized recommendation
```

---

## 9. Trade-offs & Design Rationale

### Trade-off 1: Centralized Recommendation Hub vs. Distributed Per-Class Lists

| Approach | Pros | Cons |
|---|---|---|
| **Centralized Hub** ✅ CHOSEN | ✅ Single source of truth; ✅ Teachers see cross-class patterns easily; ✅ Unified approval workflow; ✅ Reduces decision fatigue (one place to check) | ❌ May feel like "another page to check"; ❌ Less in-context than per-class |
| **Distributed (per `/teacher/class/[id]/`)** | ✅ Naturally integrated where teachers already look; ✅ In-context | ❌ Duplication across pages; ❌ Fragmented approvals; ❌ Hard to see patterns across classes |

**Rationale**: Teachers manage multiple classes; approval is a dedicated task (not routine checking). Having one "recommendation inbox" reduces cognitive load and allows meta-analysis. Link from per-class view ensures discoverability.

### Trade-off 2: Real-Time Metrics vs. Periodic Updates

| Approach | Pros | Cons |
|---|---|---|
| **Polling + ISR (periodic refresh)** ✅ CHOSEN | ✅ Simple; ✅ Works with Next.js caching; ✅ Predictable; ✅ No WebSocket complexity | ❌ Slight delay (teachers don't see dismissal_rate change immediately while on page) |
| **Real-Time via Supabase Realtime** | ✅ Instant; ✅ Reactive | ❌ Complexity; ❌ WebSocket overhead; ❌ Cache invalidation harder; ❌ n8n timing unclear |

**Rationale**: Teachers don't need real-time metrics during single approval session. Periodic refresh (handled by ISR + Next.js revalidatePath) is sufficiently responsive. Can add Realtime later if needed.

### Trade-off 3: Inquiry Mode Trigger: Dismissal Rate vs. Feedback Sentiment

| Rule | Pros | Cons |
|---|---|---|
| **Dismissal Rate > 60%** ✅ CHOSEN | ✅ Objective behavior signal; ✅ Easy to implement; ✅ No NLP needed; ✅ Clear threshold | ❌ May trigger even if teacher has good reasons; ❌ Doesn't capture "soft dismissals" (deferred approval) |
| **Feedback Sentiment Analysis** | ✅ Catches "I disagree" signals; ✅ More nuanced | ❌ Requires NLP; ❌ Error-prone; ❌ Adds latency; ❌ Complexity |
| **Combined (dismissal > 60% + sentiment)** | ✅ Richer signal | ❌ Too complex for MVP; ❌ Increases latency; ❌ More maintenance |

**Rationale**: Dismissal_rate is a straightforward behavioral signal. If teacher rejects recommendations 2 days in a row (>60%), Inquiry Mode is warranted. Feedback is optional; behavior is primary. Simple rules > complex ML for MVP.

### Trade-off 4: Inline Approve/Dismiss vs. Modal Confirmation

| Approach | Pros | Cons |
|---|---|---|
| **Inline Approve + Modal for Dismiss** ✅ CHOSEN | ✅ Fast approve (1 click); ✅ Deliberate dismiss (modal gives time to reflect); ✅ Captures feedback safely | ❌ Asymmetric UX (approve vs dismiss different paths) |
| **Modal for Both** | ✅ Consistent; ✅ Safe; ✅ Deliberate | ❌ Extra click for approve; ❌ Slower flow; ❌ May frustrate busy teachers |
| **Inline Dismiss (no modal)** | ✅ Fastest overall | ❌ Easy to dismiss by accident; ❌ No place to explain why; ❌ Agent gets no feedback |

**Rationale**: Approve is simple (no feedback needed; teacher says "got it"). Dismiss is nuanced (teacher is providing signal); modal gives space for optional reasoning. Asymmetry is intentional: fast path for agreement, deliberate path for disagreement.

### Trade-off 5: Query-Time RPC Metrics vs. Materialized Views

| Approach | Pros | Cons |
|---|---|---|
| **Query-Time RPC** ✅ CHOSEN (MVP) | ✅ Always fresh; ✅ No data consistency issues; ✅ Simpler setup | ❌ Expensive aggregation on each load; ❌ Dashboard load time increases with data scale |
| **Materialized View (pre-computed)** | ✅ Fast dashboard load; ✅ Metrics instant; ✅ Scales well | ❌ Staleness up to refresh interval; ❌ Requires scheduled job; ❌ More moving parts |

**Rationale**: For MVP (small pilot), RPC is safer. As data grows, can add pg_cron job to refresh materialized view every 30 min. Hybrid approach: fresh metrics for interactive operations, cached for dashboards.

---

## 10. Success Metrics & Validation

### Dashboard Adoption & Engagement
- ✅ Teachers open `/teacher/recommendations` within 24 hours of receiving email (target: >70%)
- ✅ Approval rate >= 60% (majority of recommendations are approved)
- ✅ Average action time: <= 1 hour from email send to dashboard action (target: <30 min)
- ✅ Repeat visitors: >= 40% of teachers return to dashboard on day 2+ (suggests habit formation)

### Inquiry Mode Effectiveness
- ✅ Inquiry Mode flags appear in >= 20% of teachers after 2 weeks (indicates threshold is reasonable)
- ✅ When inquiry_mode=true, teacher feedback rate >= 40% (teachers engage with question-based recommendations)
- ✅ After teacher feedback, dismissal_rate decreases on next week's recommendations (shows adaptation working)
- ✅ LLM confidence improves on re-introduction (system learned from teacher feedback)

### Loop Closure Signal
- ✅ When future "completed" feature ships: >= 1 recommendation marked completed per teacher per week
- ✅ Student loop closure feedback shows >= 60% positive sentiment (students feel heard)
- ✅ Teacher retention increases post-implementation (improved experience → continued use)

---

## 11. Implementation Roadmap

### Phase 2a: Foundation (Weeks 1–2)
- [ ] Promote `Tool: Get Teacher Metrics` from LangChain sub-node to Execute Sub-Workflow
- [ ] Promote `Tool: Get Past Recommendations` to Execute Sub-Workflow
- [ ] Update Fallback Policy Engine logic to accept metrics + compute inquiry_mode
- [ ] Verify n8n audit logging populates trigger_time + triggered_by correctly

### Phase 2b: Dashboard (Weeks 2–3)
- [ ] Build `/teacher/recommendations` RSC page + RecommendationList client component
- [ ] Implement Server Actions: `approveRecommendation()`, `dismissRecommendation()`
- [ ] Add filters + sorting (status, policy_level, inquiry_mode, class)
- [ ] Style cards for all states (pending, approved, dismissed, inquiry)
- [ ] Add per-class metrics panel to `/teacher/class/[id]/`

### Phase 2c: Inquiry Mode (Weeks 3–4)
- [ ] Update email templates (inquiry-mode variant in Thai)
- [ ] Dashboard badge + styling for inquiry cards (🤔)
- [ ] Modal for feedback capture on dismiss
- [ ] E2E test: teacher dismisses 3 recs in 2 days → inquiry_mode triggers

### Phase 2d: Polish (Weeks 4–5)
- [ ] Empty state variants (no data, frequency limit, RPC error)
- [ ] Responsive mobile layout
- [ ] Performance optimization (parallel RPC in RSC)
- [ ] E2E tests for full email→approve flow

### Phase 3: Loop Closure (Future)
- [ ] Add `completed_at` + `completion_feedback` fields
- [ ] Teacher "mark as implemented" UI
- [ ] Student feedback dashboard integration
- [ ] Measure feedback loop effectiveness

---

## Appendix: PRD Feature Coverage Checklist

| Feature | PRD ID | Component | Status | Notes |
|---|---|---|---|---|
| Dashboard recommendation hub | T-03 | `/teacher/recommendations` | 🟡 Design→Build | Central approval point |
| Per-class metrics | T-03 | `/teacher/class/[id]/` card | 🟡 Design→Build | Summary + link to hub |
| Approve/Dismiss actions | T-03 | Server Actions + Modals | 🟡 Design→Build | Status transitions |
| Email for WARNING | T-05 | n8n + Resend | ✅ Spec'd | Subject/body finalized |
| Email for CRITICAL | T-05 | n8n + Resend | ✅ Spec'd | Urgent variant |
| Rate-limiting | T-05 | n8n workflow node | ✅ Implemented | 1/500ms via Split In Batches |
| Inquiry mode detection | T-06 | Fallback Policy Engine | 🟡 Design→Build | dismissal > 60% logic |
| Inquiry mode email template | T-06 | Thai email variant | 🟡 Design→Build | Question tone |
| Inquiry mode dashboard badge | T-06 | 🤔 Card badge | 🟡 Design→Build | Soft blue styling |
| Teacher feedback capture | T-06 | Dismiss modal textarea | 🟡 Design→Build | 0-500 chars |
| k-anonymity enforcement | SYS-03 | RPC + Dashboard | ✅ Spec'd | n >= 3 enforced |
| Audit logging (decisions) | SYS-04 | n8n_audit_logs | ✅ Implemented | decision_path JSONB |
| Audit logging (teacher actions) | SYS-04 | Supabase RLS trigger | 🟡 Design→Build | On UPDATE recommendations |
| Fallback rule-based engine | SYS-05 | Code node | ✅ Implemented | mood_threshold logic |

---

Generated: 2026-03-22 | Format: Markdown (Solution Design Document) | Audience: Product & Engineering teams
