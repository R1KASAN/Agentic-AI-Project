# PR Description: ช่วยครูตอบกลับได้เร็วขึ้นในหน้าอนุมัติคำแนะนำ

## สรุป

ปรับ UX ในหน้าอนุมัติ recommendation ของครูที่ [RecommendationList.tsx](/Users/ark1/Public/Climate%20Agent/src/components/domain/teacher/RecommendationList.tsx) เพื่อช่วยให้ครูเริ่มพิมพ์ note ได้เร็วขึ้น โดยเพิ่ม quick actions แบบ lightweight เฉพาะใน approve panel

แนวทางของงานนี้เน้นให้ครูที่งานเยอะ “เริ่มตอบได้ทันที” โดยไม่ทำให้ panel ดูหนักขึ้น และยังคงให้การตัดสินใจสุดท้ายอยู่ที่ครูเหมือนเดิม

## สิ่งที่เปลี่ยน

- เพิ่ม quick actions แบบ local-only และแสดงเฉพาะตอนอยู่ใน approve mode
- ใช้แนวทาง `AI-first + fallback`
  - recommendation ปกติใช้ `recommendation.actions` ก่อน
  - ถ้าไม่มี usable actions จะใช้ fallback ที่ปลอดภัยและสั้น
- รองรับ `Inquiry Mode` ด้วย inquiry-specific prompts โดยไม่ใช้ข้อความแนว corrective action โดยตรง
- แสดง quick actions เพียง 2 ตัวก่อนเป็นค่าเริ่มต้น และมี `ดูเพิ่ม` แบบ inline เมื่อมีมากกว่า 2 ตัว
- เมื่อครูกด quick action ระบบจะเติมค่าใน `draftNote` ให้ทันที แต่ยังแก้ต่อได้เองตามปกติ
- มี `ล้างตัวอย่าง` เฉพาะเมื่อมี quick action ที่ถูกเลือก เพื่อลด visual noise

## สิ่งที่ไม่เปลี่ยน

- ไม่เปลี่ยน backend, schema, API, server actions, route handlers
- ไม่เปลี่ยน approval logic หรือ payload shape
- ไม่เปลี่ยน callback signatures หรือ prop names
- ไม่เปลี่ยน edit flow, dismiss flow, history behavior, หรือ student-facing behavior
- ไม่เปลี่ยนความหมายของ `teacher_action_note`, `editedDraft`, หรือ `communicated_to_students`
- ไม่ย้ายหรือเปลี่ยนความหมายของ section `Suggested Actions`

## ผลการตรวจสอบ

- `eslint src/components/domain/teacher/RecommendationList.tsx` ผ่าน
- browser smoke test ผ่านในกรณี recommendation ปกติและ fallback
- ผลการทดสอบยืนยันว่า:
  - quick actions แสดงแบบเบาและ optional
  - กดแล้วเติมข้อความใน textarea ทันที
  - การเลือก chip ใหม่จะ replace ข้อความเดิม ไม่ append
  - ครูยังพิมพ์แก้ต่อเองได้
  - `ล้างตัวอย่าง` แสดงเฉพาะตอนมี chip ที่เลือก
  - ปุ่ม `ยืนยันการอนุมัติ` ยังเป็น primary action ที่เด่นที่สุด

## Known gap

- ยังไม่ได้ verify เส้นทาง `Inquiry Mode` ใน browser smoke test รอบนี้ เพราะไม่มี data fixture ที่เข้าถึงได้จากหน้า teacher class detail ในสภาพแวดล้อมทดสอบ
- ใน repo มี asset รองรับสำหรับปิด gap นี้อยู่แล้ว:
  - [supabase/seed/cs101-inquiry-mode-demo-recommendation.sql](/Users/ark1/Public/Climate%20Agent/supabase/seed/cs101-inquiry-mode-demo-recommendation.sql)
  - [docs/inquiry-mode-demo-runbook.md](/Users/ark1/Public/Climate%20Agent/docs/inquiry-mode-demo-runbook.md)
- follow-up ที่ควรทำต่อคือทำให้ Inquiry Mode QA path รันซ้ำได้จริงสำหรับเดโมและการทดสอบ regression
