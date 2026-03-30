# Inquiry Mode QA Follow-Up Package

เอกสารนี้สรุป follow-up หลังจาก quick actions ในหน้า approve panel ของครูพร้อมใช้แล้ว แต่ยังมี QA gap สำหรับ `Inquiry Mode` เพราะใน browser smoke test รอบล่าสุดไม่มี recommendation ที่เข้าถึงได้สำหรับกรณีนี้

อ้างอิง asset ที่มีอยู่แล้วใน repo:

- [supabase/seed/cs101-inquiry-mode-demo-recommendation.sql](/Users/ark1/Public/Climate%20Agent/supabase/seed/cs101-inquiry-mode-demo-recommendation.sql)
- [docs/inquiry-mode-demo-runbook.md](/Users/ark1/Public/Climate%20Agent/docs/inquiry-mode-demo-runbook.md)

## GitHub Issue / Task Card

### Problem

UI ของ quick actions ใน approve panel พร้อมใช้งานแล้วและ browser smoke test ผ่านสำหรับ recommendation ปกติ แต่ยังไม่สามารถ verify เส้นทาง `Inquiry Mode` ได้ เพราะใน environment ทดสอบไม่มี fixture/data path ที่เข้าถึงได้จากหน้า teacher class detail อย่างสม่ำเสมอ

### Why now

- งาน quick actions พร้อมเป็น release candidate แล้ว
- QA gap ที่เหลืออยู่มีผลต่อความมั่นใจของ flow `Inquiry Mode` เท่านั้น
- ใน repo มีทั้ง seed SQL และ runbook อยู่แล้ว จึงควรปิดช่องว่างนี้ตอนนี้ด้วยการทำให้ path ทดสอบรันซ้ำได้จริง แทนการขยาย feature เพิ่ม

### Proposed approach

1. ตรวจสอบว่า seed [cs101-inquiry-mode-demo-recommendation.sql](/Users/ark1/Public/Climate%20Agent/supabase/seed/cs101-inquiry-mode-demo-recommendation.sql) ยังใช้ได้กับ dev data/schema ปัจจุบัน
2. ตรวจสอบว่า runbook [inquiry-mode-demo-runbook.md](/Users/ark1/Public/Climate%20Agent/docs/inquiry-mode-demo-runbook.md) ยังสอดคล้องกับ UI และ flow ปัจจุบัน
3. ทำให้ทีม QA หรือ demo operator สามารถสร้าง pending inquiry-mode recommendation สำหรับ `CS101` ได้แบบรันซ้ำได้
4. ใช้ path นี้เพื่อตรวจ browser/manual smoke test สำหรับ:
   - inquiry helper text
   - inquiry-only quick actions
   - approve blocked when note is empty
   - approve with note closes the loop safely to student view

### Acceptance criteria

- มีวิธีที่รันซ้ำได้ในการสร้าง `pending inquiry-mode recommendation` สำหรับ QA/demo
- หน้า teacher class detail สามารถ verify ได้จริงว่า:
  - card อยู่ใน `Inquiry Mode`
  - helper text เป็นเวอร์ชัน inquiry
  - quick actions เป็น inquiry-only prompts
  - ปุ่ม approve ยังถูก block ถ้า note ว่าง
- หลัง approve พร้อม note แล้ว ยังสามารถสังเกต student-safe closure path ได้ตาม runbook
- ไม่ต้องแก้ contract ของ quick actions feature, student feedback API, หรือ approval logic เพื่อให้ QA path นี้ทำงาน

### Out of scope

- การ redesign `Inquiry Mode` UX
- การเพิ่ม feature ใหม่ใน recommendation card
- การเปลี่ยน schema, backend logic, หรือ API contract
- การเปลี่ยนเกณฑ์ trigger ของ `Inquiry Mode`

## Docs-Style Follow-Up Note

สถานะปัจจุบันของ quick actions feature ถือว่า `ready as-is` แล้วสำหรับ recommendation ปกติและ fallback path

coverage gap เดียวที่ยังเหลือคือ `Inquiry Mode` test path ในสภาพแวดล้อมทดสอบ เนื่องจาก browser smoke test รอบล่าสุดไม่พบ recommendation ที่เป็น inquiry mode จากหน้า teacher class detail

ข้อดีคือ repo มีฐานสำหรับปิด gap นี้อยู่แล้ว:

- seed SQL สำหรับสร้าง pending inquiry-mode recommendation
- runbook สำหรับไล่ flow ครู → approve พร้อม note → ฝั่งนักเรียน

next step ที่แนะนำ:

1. validate ว่า seed และ runbook ยังใช้ได้กับ dev data/schema ปัจจุบัน
2. refresh เอกสารหรือ query เฉพาะจุดถ้าพบว่า asset เดิม stale
3. rerun browser/manual smoke test สำหรับ `Inquiry Mode` เพื่อปิด QA coverage gap นี้โดยไม่แตะ feature scope ของ quick actions
