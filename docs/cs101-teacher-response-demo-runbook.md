# CS101 Teacher Response Demo Runbook

คู่มือนี้ใช้ปิดช่องว่างเดโมของ section `การตอบสนองล่าสุดจากครู` สำหรับห้อง `CS101 Introduction to Computing` โดย **ไม่แก้ logic ของระบบ**

ห้องเป้าหมาย:

- `class_id = 10000000-0000-0000-0000-000000000001`

## Root Cause ที่ล็อกแล้ว

behavior ปัจจุบันของหน้า student ถูกต้องตามสเปก:

- `recent_action` จะขึ้นได้ก็ต่อเมื่อ recommendation ของห้องนั้นมี
  - `communicated_to_students = true`
  - และมี note จริงใน `teacher_action_note` หรือ `action_taken_note`
- approve แบบ note ว่าง จะยังไม่แสดงให้นักเรียนเห็น
- dismiss จะยังไม่แสดงให้นักเรียนเห็น

ดังนั้นถ้าหน้า student ของ `CS101` ยังขึ้น placeholder แปลว่า:

- ยังไม่มี recommendation ตัวล่าสุดที่ครู approve พร้อม note และแชร์ถึงนักเรียนจริง

## เป้าหมายของ runbook

ทำให้ `CS101` แสดง note card จริงใน section `การตอบสนองล่าสุดจากครู` โดยใช้ `teacher flow` เป็น source of truth

## เส้นทางหลัก

1. ให้ระบบหรือ workflow สร้าง `pending recommendation` ใหม่สำหรับ `CS101`
2. login ฝั่งครู
3. เปิดหน้า class detail / recommendation ของ `CS101`
4. กด approve พร้อม note ภาษาไทยที่ไม่ว่าง
5. เปิดฝั่งนักเรียนที่ `/student/feedback?classId=10000000-0000-0000-0000-000000000001`
6. ยืนยันว่า placeholder เปลี่ยนเป็น note card จริง

## เส้นทางสำรอง: SQL Fallback

ใช้เฉพาะตอน workflow ไม่ generate draft ทันเวลาเดโม

ไฟล์ที่ใช้:

- [cs101-pending-demo-recommendation.sql](/Users/ark1/Public/Climate%20Agent/supabase/seed/cs101-pending-demo-recommendation.sql)

หลักการของ fallback นี้คือ:

- สร้าง `pending recommendation` ให้ CS101 1 แถว
- ยัง **ไม่** mark เป็น `approved`
- ยัง **ไม่** mark เป็น `communicated_to_students = true`
- จากนั้นให้ครู approve ผ่าน flow ปกติเอง

## ขั้นตอนวันเดโม

### Step 1: ยืนยัน baseline ก่อน

เปิด:

- `/student/feedback?classId=10000000-0000-0000-0000-000000000001`

สิ่งที่ควรเห็น:

- section `การตอบสนองล่าสุดจากครู`
- ยังเป็น placeholder

### Step 2: สร้าง pending recommendation

เลือกหนึ่งทาง:

- ทางหลัก: ใช้ workflow จริง
- ทางสำรอง: รัน SQL fallback

### Step 3: ฝั่งครู approve พร้อม note

ตัวอย่าง note ที่ใช้เดโมได้:

> ครูได้อ่าน feedback แล้ว และสัปดาห์หน้าจะเริ่มคาบด้วยการเช็กอินสั้น ๆ เพื่อให้ทุกคนสบายใจก่อนเรียน

กติกา:

- note ห้ามว่าง
- ไม่ควรเป็นแค่ช่องว่าง

### Step 4: ตรวจใน DB หลัง approve

แถวล่าสุดของ `CS101` ต้องเป็น:

- `status = 'approved'`
- `teacher_approval_status = 'approved'`
- `communicated_to_students = true`
- `teacher_action_note` ไม่ว่าง

ตัวอย่าง query:

```sql
select
  id,
  status,
  teacher_approval_status,
  communicated_to_students,
  teacher_action_note,
  action_taken_note,
  updated_at
from recommendations
where class_id = '10000000-0000-0000-0000-000000000001'
order by updated_at desc
limit 5;
```

### Step 5: เปิดฝั่งนักเรียนอีกครั้ง

เปิด:

- `/student/feedback?classId=10000000-0000-0000-0000-000000000001`

สิ่งที่ควรเห็น:

- placeholder หาย
- section `การตอบสนองล่าสุดจากครู` แสดง note card จริง
- มี label สถานะและวันอัปเดต

## Acceptance Criteria

ถือว่าผ่านเมื่อ:

- `CS101` ยังแสดง current week / last week summary ปกติ
- ก่อน approve: section ครูเป็น placeholder
- หลัง approve พร้อม note: section ครูเป็น note card จริง
- student API คืน `recent_action`
- ไม่มี field ภายในอย่าง `ai_message_draft`, `reasoning`, `confidence_score` หลุดไปฝั่ง student

## Negative Checks

เคสเหล่านี้ต้องยังไม่ขึ้น note card:

- recommendation เป็น `dismissed`
- recommendation มี `communicated_to_students = false`
- approve แล้วแต่ note ว่าง

## หมายเหตุ

- runbook นี้เป็น `demo-scoped`
- ไม่ได้เปลี่ยน contract ของ student API
- ไม่ได้ลดกติกา privacy หรือ communication gating ของระบบ
