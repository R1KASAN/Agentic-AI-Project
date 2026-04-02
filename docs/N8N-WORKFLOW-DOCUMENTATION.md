# N8N WORKFLOW SYSTEM DOCUMENTATION - Climate Agent
**Version**: 1.0.0 | **Internal Reference**: Agentic-AI-Project

> คู่มือ execution แบบละเอียดและอัปเดตล่าสุดสำหรับใช้พรีเซนต์อยู่ที่ [docs/n8n-demo-execution-guide.md](/Users/ark1/Public/Climate%20Agent/docs/n8n-demo-execution-guide.md)
> เอกสารหน้านี้ยังคงเป็นภาพรวมระบบ n8n เดิม แต่ถ้าจะอธิบายเดโมรอบล่าสุด แนะนำให้อ่านคู่มือตัวใหม่เป็นหลัก

---

## 1. OVERVIEW (ภาพรวมระบบ)
ระบบมีการใช้งานทั้งหมด **3 Main Workflows** และ **6+ Tool Sub-workflows** ที่ทำงานร่วมกันเพื่อสร้างระบบ Early Warning System สำหรับการจัดการบรรยากาศในชั้นเรียน

### Workflows ทั้งหมด:
1.  **W01: Agentic AI Recommendation (Weekly)** - "สมองกล" หลักที่วิเคราะห์ข้อมูล Mood รายสัปดาห์
2.  **W06: Morning AI Briefing (Daily)** - ส่งบรีฟสรุปบรรยากาศชั้นเรียนให้ครูทาง LINE ทุกเช้า 07:30 น.
3.  **W02: Loop Closure Notification (Event-based)** - แจ้งเตือนนักเรียนเมื่อครูมีการตอบรับคำแนะนำ

### Data Flow Overview:
- **Sense**: [Student Pulse] → [Supabase DB]
- **Reason**: [n8n W01/W06] → [Gemini AI] → [Analyze Context & Trends]
- **Act**: [n8n] → [LINE Notify / In-app Notification]
- **Loop Closure**: [Teacher Action] → [W02] → [Notify Student]

---

## 2. WORKFLOW DETAILS (รายละเอียดแต่ละตัว)

### 2.1 W06: Morning AI Briefing
- **วัตถุประสงค์**: ส่งรายงานและคำแนะนำการสอนระดับห้องเรียนให้ครูรายวัน เพื่อให้ครูเห็นภาพรวมห้องเรียนก่อนเริ่มสอน
- **Trigger**: `Schedule Trigger` (จันทร์-ศุกร์ 07:30 AM UTC / 14:30 น. ไทย)
- **Input**: `school_id`, `teacher_id`, `class_id` จากฐานข้อมูล
- **Output**: ข้อความ LINE Notify ส่งตรงหาครูรายคน
- **Nodes หลัก**: `Check School Day`, `Fetch Active Teachers`, `Loop Split Classes`, `Tool: Get Climate Summary`, `LangChain Agent`, `Send LINE Notify`
- **Agentic Loop Stage**: `Loop2 (Reason/Plan)` & `Loop3 (Act)`
- **Tables (Supabase)**: `school_days`, `teacher_profiles`, `classes`, `recommendations`, `n8n_audit_log`

### 2.2 W01: Agentic AI Recommendation
- **วัตถุประสงค์**: วิเคราะห์เทรนด์เชิงลึกรายสัปดาห์และสร้างแผนคำแนะนำ (Recommendation)
- **Trigger**: `Schedule Trigger` (จันทร์ 06:00 AM)
- **Input**: ข้อมูล Pulse 7 วันย้อนหลัง
- **Output**: Records ใหม่ในตาราง `recommendations`
- **Nodes หลัก**: `Get Active Classes`, `Build Agent Context`, `AI Recommendation Agent`, `Parse Agent Output`
- **Agentic Loop Stage**: `Loop2 (Reason/Plan)`
- **Tables (Supabase)**: `classes`, `class_enrollments`, `recommendations`

### 2.3 W02: Loop Closure Notification
- **วัตถุประสงค์**: แจ้งเตือนนักเรียนเมื่อครูทำการกด "Approve" หรือแก้ไขปัญหาตามคำแนะนำ เพื่อยืนยันว่าเสียงของนักเรียนมีผล (Closing the Loop)
- **Trigger**: `Webhook (Supabase)` เมื่อมีการ Update ตาราง `recommendations`
- **Input**: `class_id`, `record` ข้อมูลที่ถูกอัปเดต
- **Output**: Data อัปเดตในตาราง `notifications` (In-app)
- **Nodes หลัก**: `Supabase Webhook Trigger`, `Insert In-App Notifications`, `Notify Next.js Webhook`
- **Agentic Loop Stage**: `Loop4 (Learn/Feedback)`

---

## 3. TOOL SUB-WORKFLOWS (เครื่องมือเสริม)

| Name | Role / Purpose | Input / Output |
|---|---|---|
| `tool-get-class-climate-summary` | ดึงค่าเฉลี่ย Mood, Std Dev และ Trend ของห้องเรียน | In: `class_id`, `period` / Out: `mean_mood`, `k_anonymity_safe` |
| `tool-get-past-recommendations` | ดึงประวัติคำแนะนำย้อนหลัง 7 วันเพื่อเลี่ยงการแนะนำซ้ำ | In: `class_id` / Out: `recommendations[]`, `closure_rate_7d` |
| `tool-get-teacher-action-rate` | วิเคราะห์พฤติกรรมครู (Approval Rate) เพื่อปรับโทน AI | In: `teacher_id` / Out: `is_inquiry_mode`, `approval_rate` |
| `tool-get-trend-comparison` | เปรียบเทียบข้อมูล Mood สัปดาห์นี้ vs สัปดาห์ก่อน | In: `class_id` / Out: `trend_percentage` |
| `tool-submit-recommendation` | บันทึกคำแนะนำลง DB พร้อมระบบ Guard ใน SQL | In: `content`, `category`, `priority` / Out: `was_inserted` |

---

## 4. AI AGENT NODE (การตั้งค่าสมองกล)

### Configuration:
- **LLM**: `Google Gemini 2.0 Flash`
- **Temperature**: `0.8` (W06) / `0.4` (W01)
- **Tools**: Agent สามารถเรียกใช้ Tool ได้ทัั้งหมดที่ระบุในข้อ 3 ผ่าน `toolWorkflow` nodes

### System Prompt (Summarized):
> "คุณเป็น ClimateAgent Advisor ที่ปรึกษาครูไทยในการดูแลบรรยากาศห้องเรียน วิเคราะห์ข้อมูล Pulse และให้คำแนะนำที่ actionable (ทำได้จริง) โดยต้องรักษาสิทธิความเป็นส่วนตัว (k-anonymity) ห้ามระบุชื่อนักเรียนเป็นรายคน เขียนในภาษาไทยด้วยโทนที่ Supportive และ Warm (Empowering Language)"

### Expected Output:
- JSON format: `{content: string, confidence: number, rationale: string, category: string}`

---

## 5. DATA FLOW DIAGRAM (Logic Flow)

```text
[Schedule Trigger: 7:30 AM M-F]
    ↓
[Check School Day] ── IF Holiday ──→ [STOP]
    ↓ (IS School Day)
[Fetch Active Teachers]
    ↓
[Loop per Teacher]
    ↓
    [Loop per Class]
        ↓
        [Tool: Get Climate Summary]
        ↓
        [K-Anonymity Guard (n≥3?)] ── IF n<3 ──→ [SKIP CLASS]
        ↓ (Safe)
        [Frequency Guard (max 2/day)] ── IF Exceeded ──→ [SKIP]
        ↓ (Passed)
        [LangChain Agent (Gemini)]
            ↔ [Tool: Past Recommendations]
            ↔ [Tool: Teacher Metrics]
        ↓
        [Validate & Fallback]
        ↓
        [Prepare LINE Message]
        ↓
        [Send LINE Notify]
        ↓
        [Record Audit Log & Recommendation]
```

---

## 6. CREDENTIALS (ความปลอดภัยและการเชื่อมต่อ)

1.  **supabaseApi**: ใช้ API Key และ Secret ของ Supabase (Project Settings)
2.  **googlePalmApi**: Google Gemini API Key ที่หาได้จาก Google AI Studio
3.  **lineNotifyOAuth2Api**: Personal Access Token จาก LINE Notify (My Page)
4.  **postgres**: การเชื่อมต่อ Direct Connection กับ Supabase DB สำหรับการ Execute Query

### Credential Binding Policy
- Workflow JSON ใน repo จะอ้างชื่อ credential กลาง `Supabase account` เท่านั้น และจะไม่ commit credential id ปลอมแบบ `supabase-api-cred-id`
- Credential id ของ n8n เป็นค่าเฉพาะแต่ละ environment จึงต้อง rebind ใหม่หลัง import เสมอ
- ค่าที่ต้องมีใน credential `supabaseApi` คือ:
  - `SUPABASE_URL`
  - Supabase service-role key
- หลัง import workflow ให้ตรวจทุก node ที่ใช้ `supabaseApi` ว่าเลือก `Supabase account` แล้วก่อนกดทดสอบหรือ activate

---

## 7. GUARDRAILS & SAFETY RULES (มาตรการความปลอดภัย)

### 7.1 k-anonymity (n≥3)
- **ทำงานที่**: `tool-get-class-climate-summary` (RPC level) และ `K-Anonymity Check` node
- **กลไก**: หากห้องเรียนมีคนส่ง Pulse น้อยกว่า 3 คน RPC จะคืนค่า `NULL` และ `k_anonymity_safe = false` ระบบจะหยุดทำงานสำหรับห้องนั้นทันทีเพื่อป้องกันการระบุตัวตนนักเรียน

### 7.2 Frequency Guard
- **กฎ**: สูงสุดไม่เกิน 2 แจ้งเตือน/วัน และ 5 แจ้งเตือน/สัปดาห์ ต่อครู 1 ท่าน
- **ตรวจสอบที่**: `Check Frequency Guard` node โดย Query จาก `n8n_audit_log`

### 7.3 Human-in-the-Loop
- **กฎ**: AI ห้ามส่งคำแนะนำถึงนักเรียนโดยตรง
- **กลไก**: ทุกคำแนะนำจะค้างอยู่ที่หน้าจอครูหรือ LINE และต้องการการ "Approve" จากครูก่อนเท่านั้น

---

## 8. ERROR HANDLING (การจัดการข้อผิดพลาด)

- **LLM Fail/Low Confidence**: มีระบบ `Validate & Fallback` node ถ้า Gemini ตอบกลับมาด้วยค่า Confidence < 0.65 ระบบจะดึงข้อความแนะนำสำเร็จรูป (Rule-based) มาส่งแทน
- **LINE Notify Fail**: ตั้งค่า `Retry` ที่ Node ไว้ 3 ครั้งพร้อม Exponential Backoff
- **Database Fail**: หากดึงข้อมูลครูหรือวันหยุดไม่ได้ ระบบจะหยุดทำงานอัตโนมัติ (Fail-Safe) เพื่อรอการตรวจสอบ Logs

---

## 9. HOW TO TEST (วิธีทดสอบและตรวจสอบ)

- **Manual Test**: ใน n8n Editor สามารถกด "Test Workflow" และระบุ `class_id` หรือ `teacher_id` ในก้อนข้อมูลจำลองเพื่อดูผลลัพธ์ทีละ Step
- **Logs**: ดูได้ที่แท็บ `Executions` ใน n8n Dashboard ซึ่งจะแสดงรายการ Error สีแดงในจุดที่ Node พัง
- **Audit Table**: ตรวจสอบตาราง `n8n_audit_log` ใน Supabase เพื่อดูว่า Logic เส้นไหนที่ถูกเลือกในแต่ละครั้ง

---

## 10. STATUS SUMMARY (สถานะปัจจุบัน)

| Workflow | Status | Note |
|---|---|---|
| **W01: Recommendation** | ✅ Active | ทำงานวิเคราะห์รายสัปดาห์ |
| **W06: Morning Briefing**| ⚠️ Imported | รอการตั้งค่า LINE Notify Token เป็นรายคน |
| **W02: Loop Closure** | ✅ Active | เชื่อมต่อกับ Supabase Webhook แล้ว |
| **Tool Sub-workflows** | ✅ Active | ทั้ง 6 tools พร้อมเรียกใช้งาน |

---
**Prepared by**: Technical Document Writer (Antigravity Agent)
**Last Update**: 2026-03-17
