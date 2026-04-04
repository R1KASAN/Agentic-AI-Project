# N8N Demo Execution Guide - Class Climate Agent

เอกสารนี้สรุป workflow n8n ที่ใช้ในระบบ **Class Climate Agent** แบบละเอียด โดยเน้น 2 อย่างพร้อมกัน:

1. โครงสร้าง workflow ที่ใช้อยู่ในปัจจุบัน
2. execution ที่ควรยกมาเล่าในเดโมจริง

เป้าหมายคือให้เอกสารนี้ใช้เป็นทั้ง **คู่มืออธิบายระบบ**, **สคริปต์พูดหน้ากล้อง**, และ **checklist ตอนกดรัน n8n** ได้ในไฟล์เดียว

> หมายเหตุสำคัญเรื่องสถานะ runtime: workflow บางตัวใน repo นี้เป็นไฟล์ reference / import template และไม่ได้ publish อยู่ใน n8n UI ปัจจุบัน  
> จากไฟล์ที่ตรวจพบ `W06-morning-briefing-v2`, `loop-closure-notification`, `agentic-ai-recommendation` และ `handle-teacher-approval` มี `active: false` ใน JSON จึงไม่ควรคาดว่าจะเห็นเป็น workflow active ใน n8n เว้นแต่จะ import และเปิดใช้งานเอง

## 0) สถานะใช้งานจริงใน n8n ตอนนี้

| กลุ่ม | Workflow | สถานะ |
|---|---|---|
| Live core | `climate-agent-main-v2` | ใช้งานจริง |
| Demo harness | `phase-c-redaction-batch` | ใช้ทดสอบ/เดโมเส้นทาง redaction |
| Live tool workflows | `Tool: Get Raw Snippet Batch`, `Tool: Write Redacted Snippets` | ใช้งานจริงในเส้นทางเดโม |
| Reference / inactive | `W06-morning-briefing-v2`, `loop-closure-notification`, `agentic-ai-recommendation`, `handle-teacher-approval` | เก็บไว้ใน repo แต่ยังไม่ publish ใน UI ปัจจุบัน

---

## 1) ภาพรวม workflow ที่ใช้ตอนนี้

ระบบ n8n ของโปรเจกต์นี้แบ่งได้เป็น 4 กลุ่มหลัก:

### A. Live core workflows

| Workflow | ไฟล์ | Trigger | บทบาท | ใช้ในเดโม |
|---|---|---|---|---|
| `climate-agent-main-v2` | `n8n/workflows/climate-agent-main-v2.json` | Schedule + batch climate snapshot | แกนวิเคราะห์ climate แบบ privacy-safe, สร้าง recommendation, enforce confidence/frequency guard, log audit | ใช้พูดอธิบาย “ระบบหลัก” |
### B. Demo harness workflows

| Workflow | ไฟล์ | บทบาท |
|---|---|---|
| `phase-c-redaction-batch` | `n8n/workflows/phase-c-redaction-batch.json` | demo harness สำหรับ redaction pipeline แบบ end-to-end |

### C. Tool / sub-workflows ที่ใช้งานจริง

| Tool workflow | บทบาท |
|---|---|
| `tool-get-class-climate-summary` | ดึงสรุป climate ของห้องเรียนจาก Supabase RPC |
| `tool-get-past-recommendations` | ดึงคำแนะนำย้อนหลังเพื่อกันการแนะนำซ้ำ |
| `tool-get-trend-comparison` | เปรียบเทียบเทรนด์ของห้องสัปดาห์นี้กับสัปดาห์ก่อน |
| `tool-count-enrolled-students` | นับจำนวนนักเรียนที่ลงทะเบียนในห้อง |
| `tool-get-teacher-action-rate` | ดูอัตราการ approve ของครูเพื่อปรับโทนคำแนะนำ |
| `tool-submit-recommendation` | บันทึก recommendation ลงฐานข้อมูลแบบปลอดภัย |
| `Tool: Get Raw Snippet Batch` | ดึง batch ความเห็นดิบที่ผ่าน guard มาแล้วจาก Supabase RPC |
| `Tool: Write Redacted Snippets` | เขียนเสียงนักเรียนที่ถูก redacted กลับลงระบบ |

### D. Reference / inactive workflows

| Workflow | ไฟล์ | สถานะ | บทบาท |
|---|---|---|---|
| `agentic-ai-recommendation` | `n8n/workflows/agentic-ai-recommendation.json` | inactive | รุ่น agentic workflow แบบคลาสสิกที่ใช้ tool sub-workflows |
| `W06-morning-briefing-v2` | `n8n/workflows/W06-morning-briefing-v2.json` | inactive | daily briefing ให้ครู, สรุปภาพรวมก่อนสอน |
| `handle-teacher-approval` | `n8n/workflows/handle-teacher-approval.json` | inactive | รับผล approve/dismiss จากครู, บันทึก audit, ตอบกลับ |
| `loop-closure-notification` | `n8n/workflows/loop-closure-notification.json` | inactive | ส่ง notification กลับไปฝั่งนักเรียนเมื่อ loop ปิด |

---

## 2) แผนที่การไหลของระบบที่ active จริง

```mermaid
flowchart LR
    DS["Demo Setup<br/>apply migrations<br/>run demo:provision-auth<br/>load presentation-dataset.sql"] --> PRE

    subgraph PRE["Preprocessing"]
        PRE1["Student / Teacher UI"] --> PRE2["Next.js Route Handlers"]
        PRE2 --> PRE3["Supabase Auth"]
        PRE3 --> PRE4["Supabase Postgres"]
        PRE4 --> PRE5["Privacy Guard / Aggregation"]
    end

    PRE5 --> MAIN["climate-agent-main-v2"]
    MAIN --> CHILD["Tool Sub-workflows<br/>Get Climate Snapshot Batch<br/>Get Teacher Metrics<br/>Get Past Recommendations"]
    CHILD --> LLM["LLM Analysis + Fallback Policy Engine"]
    LLM --> WRITE["Teacher Decision Workspace<br/>approve / dismiss / restore"]
    WRITE --> DB["Supabase PostgreSQL"]
    MAIN -. demo harness .-> DEMO["phase-c-redaction-batch"]
    MAIN -. validation only .-> TEST["climate-agent-main-v2-manual-test"]
```

ภาพรวมที่ควรเล่าในคลิปคือ:

- ข้อมูลตั้งต้นมาจากการ provision demo auth และโหลด `presentation-dataset.sql`
- ฝั่ง preprocessing จะจัดข้อมูลให้พร้อมใช้งานและปลอดภัยก่อน
- workflow หลักที่ใช้งานจริงจะอยู่ที่ `climate-agent-main-v2`
- `phase-c-redaction-batch` ใช้เป็น demo harness สำหรับอธิบายเส้นทาง redaction แบบ end-to-end
- child workflow กลุ่ม tool จะดึงสัญญาณ aggregate, metrics, และ history จาก Supabase
- LLM จะช่วยวิเคราะห์และสร้าง recommendation draft
- ถ้าจะเล่าแนวคิด approval / loop closure ให้ยก `handle-teacher-approval` และ `loop-closure-notification` เป็น reference workflow ที่มีอยู่ใน repo แต่ยังไม่ publish ใน UI ปัจจุบัน และไม่ต้องวางไว้ใน flow หลักของระบบ active

---

## 3) Execution ที่ควรใช้พูดในเดโม

### 3.1 Execution Story ที่แนะนำที่สุด

ถ้าต้องเล่าให้คนฟังเข้าใจเร็วที่สุด ให้ใช้ลำดับนี้:

1. Provision demo auth accounts แล้ว seed ข้อมูลด้วย `supabase/seed/presentation-dataset.sql`
2. รัน parent workflow `phase-c-redaction-batch`
3. ให้ child `Tool: Get Raw Snippet Batch` วิ่งจาก `Build Redaction Context`
4. แสดง case valid ที่ออก `status: ready`
5. แสดง case invalid ที่ออก `status: invalid_class_id`
6. ชี้ต่อไปยัง `climate-agent-main-v2` ว่าคือ workflow หลักของระบบ recommendation
7. ปิดท้ายด้วย approval / loop closure

### 3.2 ทำไมต้องใช้ parent workflow เป็นตัวเล่า

ก่อนหน้านี้ถ้ารัน `Tool: Get Raw Snippet Batch` ตรง ๆ บางครั้งจะเห็นแค่ state ที่ไม่ครบ เพราะมันไม่ได้สะท้อน mapping จาก parent ทั้งหมด

แต่ถ้ารันผ่าน `phase-c-redaction-batch` จะเห็น flow จริงครบ:

- parent สร้าง context
- parent ส่ง `class_id`, `weeks`, `limit` ไปยัง child
- child validate แล้ว fetch batch
- child normalize เป็น output ที่ปลอดภัย
- parent เอาผลลัพธ์ไปสร้าง prompt และส่งต่อ downstream

---

## 4) Execution ที่ทดสอบแล้วจริง

### 4.1 Parent execution

| Item | Value |
|---|---|
| Parent workflow | `phase-c-redaction-batch` |
| Parent execution id | `686` |
| เป้าหมาย | เดโมเส้นทาง redaction pipeline แบบ end-to-end |

### 4.2 Child execution: valid case

| Item | Value |
|---|---|
| Child workflow | `Tool: Get Raw Snippet Batch` |
| Child execution id | `687` |
| Input class | `CS101 Introduction to Computing` |
| `class_id` | `10000000-0000-0000-0000-000000000001` |
| `weeks` | `4` |
| `limit` | `12` |
| ผลลัพธ์สุดท้าย | `status: ready` |
| `batch_size` | `6` |
| `contributing_students_count` | `3` |
| `rows.length` | `6` |

### 4.3 Child execution: invalid regression case

| Item | Value |
|---|---|
| Child workflow | `Tool: Get Raw Snippet Batch` |
| Child execution id | `688` |
| Input class_id | `""` |
| ผลลัพธ์สุดท้าย | `status: invalid_class_id` |
| `batch_size` | `0` |
| `rows` | `[]` |

---

## 5) อธิบาย execution 686 แบบ node-by-node

demo harness `phase-c-redaction-batch` มี node สำคัญดังนี้:

### 5.1 `When clicking 'Execute workflow'`
- เป็น manual trigger สำหรับเดโม
- ใช้เปิด workflow แบบคุมจังหวะเอง ไม่ต้องรอ schedule

### 5.2 `Fetch Target Classes`
- ดึง class list จาก Supabase
- query ที่ใช้เลือกเฉพาะ `id`, `name`, `teacher_id`
- ข้อมูลนี้มาจาก dataset seed ที่เตรียมไว้ก่อนเดโม

### 5.3 `Loop Over Classes`
- วนทีละห้อง
- ทำให้ demo สามารถโชว์หลาย class ได้ในรอบเดียว
- จุดนี้สำคัญเพราะทำให้เห็นว่า pipeline ไม่ได้ hardcode แค่ห้องเดียว

### 5.4 `Build Redaction Context`
- สร้าง context สำหรับแต่ละห้อง
- ใส่:
  - `class_id`
  - `class_name`
  - `weeks`
  - `limit`
  - `llm_provider`
  - `llm_model`
- ค่านี้จะถูกส่งต่อให้ child workflow

### 5.5 `Call Tool: Get Raw Snippet Batch`
- ใช้ `Execute Workflow`
- ส่ง `class_id`, `weeks`, `limit` ไปยัง child workflow
- จุดนี้คือสะพานจาก parent ไปยัง raw batch extraction

### 5.6 `Build Ollama Prompt`
- เอาผล batch ที่ได้มาสร้าง prompt สำหรับ redaction
- prompt จะมี:
  - aggregate context
  - safety rules
  - raw comment batch
- ถ้า batch ไม่ safe จะสร้าง prompt fallback ที่สั้นและปลอดภัย

### 5.7 `Redaction LLM Chain`
- เรียก LLM chain เพื่อ redaction / summarization
- ใช้ `Ollama Model`
- ในระบบนี้ LLM ไม่ได้อ่าน raw data แบบไร้ guard แต่ต้องผ่าน context ที่เตรียมไว้ก่อน

### 5.8 `Parse Redaction Output`
- ตรวจผล LLM
- กรองข้อความที่:
  - คล้าย quote ตรงเกินไป
  - เปิดเผยข้อมูลรายบุคคล
  - generic เกินไป
  - ไม่มีสัญญาณ classroom ที่ใช้งานได้
- output ที่ผ่านจะถูกจัดเป็น `ready_to_write`

### 5.9 `Call Tool: Write Redacted Snippets`
- เขียน snippet ที่ผ่านการ redaction ลงระบบ
- ใช้ workflow แยกเพื่อแยก logic database write ออกจาก logic LLM

### 5.10 `Normalize Pipeline Result` และ `Build Audit Payload`
- รวมผลลัพธ์ให้เป็นรูปแบบเดียว
- เตรียม payload สำหรับ audit log

### 5.11 `Insert Audit Log`
- บันทึกว่า run นี้เกิดอะไรขึ้น
- ช่วยให้เดโมอธิบายได้ว่า system มี traceability

---

## 6) อธิบาย execution 687 แบบ node-by-node

child workflow `Tool: Get Raw Snippet Batch` คือจุดที่ควรโชว์ว่าระบบ “คัดกรองก่อนส่งต่อ” อย่างไร

### 6.1 `Execute Workflow Trigger`
- รับ input จาก parent
- fields ที่รับคือ:
  - `class_id`
  - `weeks`
  - `limit`

### 6.2 `Validate Raw Batch Input`
- ตรวจ `class_id` ว่าไม่ว่างและเป็น UUID รูปแบบที่รับได้
- ตอนแรกเราเคยติดปัญหา regex เข้มเกินไป
- ปัจจุบัน workflow ใช้ generic UUID pattern แล้ว จึงรับ seed id ได้

### 6.3 `Has Valid Class ID?`
- ถ้า valid จะไป fetch batch
- ถ้า invalid จะข้าม RPC และไป normalize เป็น `invalid_class_id`

### 6.4 `Fetch Raw Snippet Batch`
- เรียก Supabase RPC:
  - `get_raw_redaction_comment_batch`
- ใช้ URL จาก env:
  - `={{ $env.SUPABASE_URL }}/rest/v1/rpc/get_raw_redaction_comment_batch`
- ใช้ credential `Supabase account`

### 6.5 `Normalize Raw Batch`
- ถ้าได้ข้อมูลจริง จะคืน:
  - `status: ready`
  - `reason: null`
  - `batch_size: 6`
  - `contributing_students_count: 3`
  - `rows.length: 6`
- ถ้าไม่มีข้อมูลหรือ class_id ไม่ถูกต้อง จะคืน `invalid_class_id` หรือ `no_safe_batch`

### 6.6 สิ่งที่ควรพูดในคลิป

> จุดนี้เป็นตัวอย่างของการทำงานแบบ privacy-first จริง ๆ ครับ  
> ระบบจะไม่ดึง raw data แบบตรง ๆ ไปให้โมเดลทันที แต่จะตรวจ class_id, ดึงข้อมูลจาก RPC ที่ปลอดภัย, แล้วค่อย normalize ให้พร้อมใช้งานต่อ  
> ถ้าข้อมูลไม่ผ่านก็จะไม่พยายามเดาเกินจริง และจะคืนสถานะที่อ่านได้ชัดเจนแทนครับ

---

## 7) การเชื่อมไปยัง workflow หลักของระบบ

`climate-agent-main-v2` คือ workflow หลักที่อธิบายผลิตภัณฑ์จริง ส่วน `phase-c-redaction-batch` เป็น demo harness สำหรับอธิบาย redaction pipeline เท่านั้น

### 7.1 `climate-agent-main-v2`

node สำคัญที่ควรเล่า:

- `Get Active Classes`
- `Prepare Climate Snapshot Batch`
- `Fetch Climate Snapshot Batch`
- `Get Aggregated Climate Data`
- `Validate n >= 3`
- `Tool: Get Teacher Metrics`
- `Call 'Tool: Get Past Recommendations'`
- `Merge Metrics Into Item`
- `Build Ollama Analysis Prompt`
- `Climate Analysis Agent`
- `Ollama Model`
- `Parse AI Recommendation Output`
- `Fallback Policy Engine`
- `Check AI Confidence`
- `Route by Policy Level`
- `Check Frequency Limits (ROUTINE / WARNING / CRITICAL)`
- `Frequency Guard (ROUTINE / WARNING / CRITICAL)`
- `Insert Draft Recommendation`
- `Email Alert - WARNING to Teacher`
- `Email Alert - CRITICAL to Admin`
- `Insert Audit Log`
- `Workflow Error Handler`
- `Insert Error Log`

### 7.2 คำอธิบายแบบสั้น

workflow นี้คือ “สมองหลัก” ของระบบ:

1. ดึงรายชื่อห้อง active ก่อน
2. สร้าง daily climate snapshot แบบ batch แล้ว normalize เป็น one-item-per-class
3. เช็กว่า k-anonymity ผ่านหรือไม่
4. ดึง teacher metrics และ recommendation เดิม
5. สร้าง prompt ให้ LLM
6. ตรวจ confidence
7. เลือก policy ตามระดับความเสี่ยง
8. เขียน draft recommendation
9. ส่งแจ้งเตือนเฉพาะเมื่อถึงเงื่อนไข
10. บันทึก audit

มองแบบ `input -> reasoning -> output` จะเป็นแบบนี้:

```text
input
aggregate ล่าสุด + trend comparison + teacher history + approved/dismissed history
+ closure history + redacted voice summary + blocked reasons + room metadata

reasoning
ตอบ 3 คำถามหลัก:
1. ตอนนี้ห้องกำลังมีปัญหาอะไร
2. ครูควรทำอะไรเป็นขั้นแรก
3. ควรสื่อสารกับนักเรียนอย่างไรให้ช่วยสถานการณ์ได้จริง

จากนั้นตรวจ rubric 5 ข้อ:
- specificity
- teacher usability
- student clarity
- actionability
- privacy safety

ถ้า structured payload ไม่ครบหรือ confidence ต่ำ ระบบจะ reject ผล LLM และไปใช้ fallback planner

output
structuredPayload.version = 1
- studentMessageDraft
- teacherActionPlan
- watchSignals
- whyThisHelps
```

### 7.3 ประโยคที่ควรใช้พูดตอนพรีเซนต์

> ส่วน workflow หลักของระบบจะเริ่มจากข้อมูลแบบ aggregate ก่อนเสมอครับ
> ในเวอร์ชันปัจจุบัน workflow จะเริ่มจาก `Get Active Classes` แล้วเรียก daily climate snapshot แบบ batch ก่อน จากนั้นค่อย normalize เป็น `Get Aggregated Climate Data` ที่มี one-item-per-class เพื่อให้ downstream ใช้ shape เดิมต่อได้
> จากนั้น n8n จะดึง context ที่จำเป็น เช่น teacher metrics และ recommendation history แล้วค่อยให้ LLM วิเคราะห์
> ในเชิง reasoning ระบบจะบังคับให้ LLM ตอบก่อนว่า ห้องกำลังมีปัญหาอะไร, ครูควรเริ่มทำอะไร, และควรสื่อสารกับนักเรียนอย่างไร จากนั้นค่อยสร้าง `studentMessageDraft` และ `teacherActionPlan`
> ผลลัพธ์จะไม่ถูกส่งออกไปแบบทันที แต่จะผ่าน confidence check, parser validation, frequency guard และ audit log ก่อน ถ้าคุณภาพยังไม่พอระบบจะตกกลับไปใช้ fallback planner เพื่อให้ยังได้ draft ที่ใช้งานได้จริงและปลอดภัยครับ

---

## 8) Workflow สำหรับ approval และ loop closure (reference)

### 8.1 `handle-teacher-approval`

node สำคัญ:

- `Teacher Approval Webhook`
- `Validate Payload`
- `Is Valid?`
- `Insert Audit Log`
- `Send Teacher Email`
- `Respond 200`
- `Respond 400`
- `Workflow Error Handler`
- `Insert Error Log`
- `Respond 500`

บทบาทของ workflow นี้คือรับผลการ approve/dismiss จากครูและบันทึกทุกอย่างไว้เป็นหลักฐาน  
สถานะปัจจุบัน: reference / inactive ใน repo ไม่ได้ publish ใน n8n UI ที่ใช้อยู่ตอนนี้

### 8.2 `loop-closure-notification`

node สำคัญ:

- `Supabase Webhook Trigger`
- `Insert In-App Notifications`
- `Notify Next.js Webhook`

บทบาทของ workflow นี้คือปิด loop กลับไปยังฝั่งนักเรียน เมื่อครูมี action แล้วระบบจะส่ง notification และอัปเดตหน้าเว็บให้สะท้อน feedback loop ที่สมบูรณ์  
สถานะปัจจุบัน: reference / inactive ใน repo ไม่ได้ publish ใน n8n UI ที่ใช้อยู่ตอนนี้

### 8.3 ประโยคที่ใช้พูดในเดโม

> ถ้าจะเล่าแนวคิด approval / loop closure ให้ยกสอง workflow นี้เป็น reference ใน repo นะครับ  
> ตัวที่ active ใน UI ตอนนี้ไม่ได้ publish เส้นทางนี้อยู่ แต่ flow เชิงแนวคิดยังใช้เป็นภาพประกอบให้เข้าใจวงจรการตอบกลับของระบบได้ครับ

---

## 9) Script สั้นสำหรับพูดหน้ากล้อง

ถ้าต้องพูดสั้น ๆ ต่อหน้ากล้อง ให้ใช้ sequence นี้:

> เราเริ่มจากการ seed ข้อมูลเดโมเข้า Supabase ก่อนครับ  
> จากนั้นใช้ `phase-c-redaction-batch` เป็น demo harness เพื่อไล่เส้นทาง redaction แล้วส่งต่อไปยัง `Tool: Get Raw Snippet Batch`
> ถ้าห้องนั้นมีข้อมูลปลอดภัยพอ ระบบจะคืน `status: ready` แล้วส่งต่อไปยัง LLM เพื่อ redaction และบันทึกผลลงระบบ  
> ถ้าข้อมูลยังไม่พอ ระบบจะไม่ overclaim และจะคืนสถานะ invalid หรือ no safe batch อย่างชัดเจน  
> หลังจากนั้น workflow หลัก `climate-agent-main-v2` จะนำข้อมูล aggregate ไปวิเคราะห์ สร้าง recommendation draft และคุมด้วย confidence / frequency guard ก่อนให้ครู approve  
> ส่วนแนวคิด approval และ loop closure ให้ยก `handle-teacher-approval` และ `loop-closure-notification` เป็น reference workflow ที่อยู่ใน repo แต่ยังไม่ publish ใน UI ตอนนี้ครับ

---

## 10) Checklist ตอนรันเดโม

- [ ] provision demo auth accounts ให้ password login ใช้งานได้จริง
- [ ] โหลด `supabase/seed/presentation-dataset.sql`
- [ ] ตรวจว่า `CS101 Introduction to Computing` มีข้อมูลพร้อมสำหรับ valid case
- [ ] เปิด `phase-c-redaction-batch`
- [ ] รัน parent execution
- [ ] ยืนยัน child execution valid ให้ได้ `status: ready`
- [ ] ยืนยัน child execution invalid ให้ได้ `status: invalid_class_id`
- [ ] เปิด `climate-agent-main-v2`
- [ ] ตรวจว่า entry flow ใช้ `Get Active Classes -> Prepare Climate Snapshot Batch -> Fetch Climate Snapshot Batch -> Get Aggregated Climate Data`
- [ ] ตรวจว่ามี audit log เขียนครบ
- [ ] ถ้าจะอธิบาย approval / loop closure ให้ชี้ว่า workflow เหล่านี้เป็น reference ใน repo แต่ยังไม่ active ใน UI ปัจจุบัน

---

## 11) สรุปสั้นที่สุด

ถ้าต้องสรุประบบ n8n ของโปรเจกต์นี้ในประโยคเดียว:

> ข้อมูลนักเรียนถูก seed และ aggregate อย่างปลอดภัยก่อน จากนั้น n8n จะใช้ `climate-agent-main-v2` เป็น workflow หลัก ร่วมกับ tool sub-workflows เพื่อคัดกรอง, วิเคราะห์, สร้าง recommendation, ให้ครู approve, แล้วปิด loop กลับไปหานักเรียนอย่างเป็นระบบครับ
