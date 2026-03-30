# 📋 Climate Agent — Updated Spec v2.1
### สำหรับ Antigravity: UX/UI + Backend Planning

***

## 1. ภาพรวมระบบ (System Architecture — Current State)

```
[Student Survey App]
       ↓ (กรอก mood survey รายวัน)
[Supabase PostgreSQL]
   ├── survey_responses (raw)
   ├── recommendations (drafts + audit)
   └── n8n_audit_log
       ↓
[n8n Workflow: climate-agent-main]
   ├── Schedule Trigger (07:30 M–F)
   ├── RPC: get_aggregated_climate_data(date, min_n=3)
   ├── IF: n >= 3 (k-anonymity gate)
   ├── Climate Analysis Agent (Gemini 2.0 Flash)
   ├── Check AI Confidence (>= 0.65)
   ├── [Fallback Policy Engine] ← กำลังใช้งานจริง
   ├── Route by Policy (CRITICAL / WARNING / ROUTINE)
   ├── Insert Draft Recommendation → Supabase
   ├── Insert Audit Log → Supabase
   └── Email Alert (Resend API) ✅
```

***

## 2. สถานะปัจจุบัน (N8N Workflow — Live Status)

| Component | Status | หมายเหตุ |
|---|---|---|
| Schedule Trigger 07:30 | ✅ Active | M–F UTC |
| RPC get_aggregated_climate_data | ✅ Working | p_min_n=3 production-ready |
| k-anonymity Gate (n>=3) | ✅ Working | IF node กรองถูกต้อง |
| Climate Analysis Agent (Gemini) | ✅ Working | Low confidence → Fallback |
| Fallback Policy Engine | ✅ Working | rule-based mood_threshold |
| Insert Draft Recommendation (CRITICAL) | ✅ Working | returns Supabase id |
| Email Alert CRITICAL (Resend) | ✅ Working | HTML template พร้อม |
| Tool: Get Teacher Metrics | ⚠️ Mock | source: "supabase_rpc_mock" |
| Inquiry Mode trigger | ⚠️ Logic ready | ยังไม่ active (ไม่มี real metrics) |
| Insert Draft (WARNING/ROUTINE) | 🔲 TODO | node มีแต่ยังไม่ verified |
| Frequency Guard (max 2/day, 5/week) | 🔲 TODO | ยังไม่ได้ implement |
| School Day Check | 🔲 TODO | ยังไม่ได้ implement |
| LINE Notify (teacher) | 🔲 TODO | ยังไม่ได้ implement |
| Audit Log ทุก branch | 🔲 TODO | ต้องเพิ่ม |

***

## 3. Data Schema (Supabase — ที่ต้องรองรับ)

### 3.1 `recommendations` table (Insert จาก n8n)

```sql
{
  id:                  uuid (auto)
  class_id:            uuid
  teacher_id:          uuid (nullable ตอนนี้)
  policy_level:        "CRITICAL" | "WARNING" | "ROUTINE"
  ai_message_draft:    text
  confidence_score:    float (0–1)
  reasoning:           text
  decision_path_json:  jsonb  ← สำคัญ: เก็บ Agentic Loop path
  inquiry_mode:        boolean
  status:              "draft" | "sent" | "dismissed" | "accepted"
  created_at:          timestamp
}
```

**ตัวอย่าง decision_path_json จริงที่ n8n ส่งมา:**

```json
{
  "route": "fallback",
  "rule": "mood_threshold",
  "avg_mood_score": 1.4,
  "selected_policy": "CRITICAL",
  "inquiry_mode_triggered": false
}
```

### 3.2 `n8n_audit_log` table (TODO — ต้องสร้าง)

```sql
{
  id:                  uuid (auto)
  workflow_name:       text  -- "climate-agent-main"
  execution_id:        text
  class_id:            uuid
  policy_level:        text
  confidence_score:    float
  decision_path_json:  jsonb
  inquiry_mode:        boolean
  error_message:       text (nullable)
  blocked_reason:      text (nullable)  -- "frequency_guard", "school_holiday"
  created_at:          timestamp
}
```

### 3.3 `teacher_metrics` view / RPC (TODO — สำหรับ Inquiry Mode จริง)

```sql
-- RPC: get_teacher_metrics(class_id, lookback_days)
-- คืน:
{
  teacher_id:            uuid
  class_id:              uuid
  dismissal_rate:        float  -- dismissed/total
  total_recommendations: int
  accepted_count:        int
  dismissed_count:       int
  high_dismissal:        boolean  -- rate > 0.6
  inquiry_mode_suggested: boolean  -- high_dismissal && total >= 3
  avg_mood_score:        float   -- จาก survey_responses จริง
  source:                "supabase_rpc_live"
}
```

***

## 4. สิ่งที่ Antigravity ต้อง Design + Build

### 4.1 โครงสร้าง Navigation หลักของ Teacher
แสดงเมนูด้านซ้าย (Sidebar) สำหรับครู ประกอบด้วย 3 เมนูหลัก ได้แก่:
1. `Dashboard` (ภาพรวมชั้นเรียน)
2. `จัดการห้องเรียน` (Manage Classrooms)
3. `Recommendations` (ระบบข้อเสนอแนะ)

*มี User Profile อยู่มุมซ้ายล่างสำหรับ Sign Out และสลับการพับ (Collapse) ของ Navigation*

### 4.2 Dashboard (ภาพรวมชั้นเรียน - Priority 1)
**ลักษณะ UI ตามหน้าจอจริงปัจจุบัน:**
*   **Header:** "ภาพรวมชั้นเรียน สรุปรายสัปดาห์ — เกิดอะไรขึ้นในห้องเรียนของคุณ"
*   **Action Button:** "+ สร้างห้องเรียน (Create Class)" อยู่มุมขวาบน
*   **Class Summary Cards:** แสดงการ์ดของทุกห้องเรียนที่ครูดูแล
    *   **ชื่อห้องเรียน:** เช่น "CS101 Introduction to Computing"
    *   **Risk Badge:** สถานะความเสี่ยงในรูปแบบ Badge (เช่น `High Risk` 🔴 พร้อมไอคอนแจ้งเตือน, หรือ `Low Risk` 🟢 พร้อมไอคอนโล่) สะท้อนจาก `policy_level` สูงสุดที่ยังไม่ถูกจัดการ หรืองานวิเคราะห์ข้อมูล mood ล่าสุด
    *   **Student Count:** จำวนนักเรียน (ไอคอนรูปคน เช่น "3 students")
    *   **Pending Actions:** จำนวนรายการที่รอการตัดสินใจของครู (เช่น "253 pending actions") ที่รวมยอดมาจาก `recommendations` ในสถานะ `draft` ของห้องนั้นๆ

### 4.3 จัดการห้องเรียน (Manage Classrooms - Priority 2)
**ลักษณะ UI ตามหน้าจอจริงปัจจุบัน:**
*   **Header:** "Classrooms - Manage your active classes and invite students."
*   **Action Button:** "+ Create Class"
*   **Class Management Cards:**
    *   **ชื่อห้องเรียน:**
    *   **Context Menu (⋮):** ไอคอน 3 จุดมุมบนขวาสำหรับ Edit หรือตั้งค่าห้องเรียน
    *   **Risk Badge (Thai Labels):** แสดงข้อความไทย เช่น `เสี่ยงสูง` (สีแดง), หรือ `— ยังไม่มีข้อมูล` (กรณีห้องยังไม่มีการประเมิน)
    *   **Student Count:** จำนวนนักเรียน
    *   **Invite CODE Block:** ส่วนแสดงรหัสเข้าห้องเรียน (เช่น `CODE: 54C9B1C4`) ติดตั้งพร้อมปุ่ม Copy (📋) ขวาสุดของการ์ด เพื่อส่งให้นักเรียนได้อย่างรวดเร็ว

### 4.4 Recommendations (หน้าข้อเสนอแนะ AI - Priority 3)
**ลักษณะ UI ตามหน้าจอจริงปัจจุบัน:**
*   **Header:** "Recommendations - AI-suggested actions based on student climate data."
*   **ปัจจุบัน (Phase Placeholder):** แสดงกล่อง "Action Items: Recommendations will be implemented in Phase 6 (T027-T031)."
*   **Target State (อ้างอิงของเดิม):** หน้านี้จะเป็นหน้ารวม Draft Recommendations สำหรับครูแต่ละราย โดยครูสามารถกด **[✅ ยืนยันการดำเนินการ]** (update `status = "accepted"`) หรือ **[❌ ปฏิเสธ]** (update `status = "dismissed"`) หากมีการ trigger `inquiry_mode = true` ระบบจะแสดงกล่องป้อนข้อความเพื่อให้ครูพิมพ์ Context โต้ตอบ AI ได้จากหน้านี้

### 4.5 Admin Panel (Priority 4)
สำหรับ admin ของโรงเรียน:
- ภาพรวม CRITICAL alerts ทั้งหมดรายวัน
- Audit log viewer (จาก `n8n_audit_log`)
- กราฟ dismissal rate รายครู รายเดือน
- ตั้งค่า: threshold, frequency guard, LINE token per teacher

***

## 5. API Endpoints ที่ Frontend ต้องการ (Next.js)

### Supabase RPC / Data Views (เพิ่มเติม & อัปเดต)

```typescript
// ✅ มีแล้ว
get_aggregated_climate_data(p_date, p_min_n)

// ✅ มีแล้ว (mock → ต้องทำเป็น live)
get_teacher_metrics(class_id, lookback_days)

// 🆕 ต้องสร้างเพิ่ม สำหรับ UI Dashboard/Manage Classrooms
// รวบรวมข้อมูลสรุปห้องเรียน (+Risk Badge, +Pending count, +Join Code) 
// เพื่อใช้แสดงในการ์ดในหน้า Dashboard และ จัดการห้องเรียน ใน Query เดียว
get_teacher_classes_summary(teacher_id)

// 🔲 ต้องสร้าง (สำหรับหน้า Recommendations)
get_recommendations_by_teacher(teacher_id, status?)  // ใช้ดึงเข้าหน้า Recommendations โดยตรง
update_recommendation_status(id, status, teacher_note?)
get_audit_log(class_id, date_from, date_to)
get_frequency_count(class_id, date)  ← สำหรับ Frequency Guard
```

### n8n Webhook (ต้องสร้างเพิ่ม)

```
POST /webhook/teacher-response
Body: {
  recommendation_id: uuid,
  teacher_id: uuid,
  context_note: string,
  inquiry_response: string (optional)
}
→ trigger n8n workflow สำหรับ update + LOG
```

### Next.js ISR Revalidation (Optional - Future Enhancement)

```
POST /api/revalidate?secret=TOKEN&path=/dashboard/[class_id]
→ trigger เมื่อ n8n insert draft ใหม่ (ยังไม่เปิดใช้งานใน phase นี้)
```

***

## 6. สิ่งที่ N8N ต้องการจาก Backend ก่อน Deploy จริง

| สิ่งที่ต้องการ | ผู้รับผิดชอบ | Priority |
|---|---|---|
| RPC `get_teacher_metrics` แบบ live (ไม่ mock) | Backend | P1 |
| Table `n8n_audit_log` ใน Supabase | Backend | P1 |
| RPC `get_frequency_count` (สำหรับ frequency guard) | Backend | P2 |
| LINE Notify integration (Optional) | Backend | P3 |
| `teacher_context` table (สำหรับ inquiry mode) | Backend | P3 |
| Webhook endpoint รับ teacher response | Backend/n8n | P3 |

***

## 7. Environment Variables ที่ต้องตั้งใน n8n

```env
# ✅ มีแล้ว
SUPABASE_URL=https://zpmmmheezypkwqvkzdlj.supabase.co
SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...
EMAIL_FROM=...
EMAIL_ADMIN=...
DASHBOARD_URL=...
RESEND_API_KEY=...

# Optional - Future Integrations (ยังไม่ต้องตั้ง)
LINE_NOTIFY_TOKEN_DEFAULT=...
LINE_NOTIFY_WEBHOOK_URL=https://notify-api.line.me/api/notify
NEXTJS_REVALIDATE_SECRET=...
NEXTJS_WEBHOOK_URL=https://your-app.vercel.app/api/revalidate
```

***

## 8. Inquiry Mode Logic (สำหรับ Antigravity เข้าใจ flow)

```
Teacher dismissal_rate > 60% AND total_recommendations >= 3
  ↓
Fallback: inquiry_mode = true
  ↓
n8n Insert Draft:
  - ai_message_draft = "ครูช่วยเล่าเพิ่มเติมได้ไหม..."
  - inquiry_mode = true
  ↓
Dashboard หน้ารวม Recommendations แสดง Inquiry UI
  ↓
ครูพิมพ์ตอบ → POST /webhook/teacher-response
  ↓
n8n บันทึก context → ใช้ใน Gemini prompt รอบต่อไป
```

***

## 9. Mock ที่ยังอยู่ในระบบ (ต้องถอดออกก่อน Production)

| Node | Mock ที่ใช้อยู่ | ต้องแทนด้วย |
|---|---|---|
| `Tool: Get Teacher Metrics` → Return Data | `source: "supabase_rpc_mock"`, `dismissal_rate: 0.8`, `avg_mood_score: 3` hardcoded | RPC `get_teacher_metrics` แบบ live จาก Supabase |
| `Get Aggregated Climate Data` | วันที่ fix `2026-03-20` | `$now.minus({ days: 1 })` แบบ dynamic |

***
