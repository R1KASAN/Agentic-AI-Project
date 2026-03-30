# PR Summary: Auth Hotfix Reconciliation

ปัญหาหลักของรอบนี้คือ hotfix ที่ผ่านการ verify บน preview ถูกแก้ใน clean checkout แยก ทำให้ repo หลักยังไม่ได้รับเฉพาะ delta ที่ยืนยันแล้ว โดยเฉพาะ student class actions, safe fallback ของ student API และ source-of-truth ของ demo credentials

รอบนี้จึง reconcile เฉพาะ behavior ที่ผ่านการ validate กลับเข้า repo หลัก โดยคงงาน in-progress เดิมของ main repo ไว้ ไม่แทนทั้งไฟล์ จุดที่แก้ครอบคลุม 4 ส่วน:

- auth/routing ยังคง teacher ลง `/teacher` และ student ลง `/student/classes`
- student classes page มี Join CTA และ action `ดู Feedback` รายห้องกลับมา
- student API fallback ให้ `/api/student/classes` fail-safe มากขึ้นโดยไม่ทำลาย response contract เดิม
- docs / seed credential ให้ demo account อิงชุดเดียวกันคือ `teacher@demo.com / password123` และ `student1@demo.com / password123`

ไฟล์หลักที่แตะ:

- `src/app/api/student/classes/route.ts`
- `src/app/(dashboard)/student/classes/page.tsx`
- `supabase/seed.sql`
- `USAGE.md`
- `docs/PREVIEW_DEMO_CREDENTIALS.md`

พฤติกรรมที่ตั้งใจไว้และควรรู้:

- ถ้านักเรียนมีหลายห้อง แล้วเปิด `/student/check-in` โดยไม่ส่ง `classId` ระบบจะ redirect กลับ `/student/classes`
- ถ้ามี 1 ห้อง ระบบสามารถเข้าฟอร์มของห้องนั้นได้
- ถ้าไม่มีห้อง ระบบควรพาไป flow เข้าร่วมห้อง
