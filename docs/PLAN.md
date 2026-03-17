# 🎼 ORCHESTRATION: Class Join Code Feature (PLAN.md)

## Section 1: Current State Summary
จากการตรวจสอบโปรเจกต์ ปัจจุบันมีโครงสร้างบางส่วนสำหรับ Join Code อยู่แล้ว:
- **Database:** ตาราง `classes` มีคอลัมน์ `invite_code` (VARCHAR(8) UNIQUE) และตาราง `class_enrollments` จัดการการเข้าร่วมห้องเรียน
- **Teacher UI:** หน้า `/teacher/class/[id]/settings` มีการแสดง invite code และปุ่ม Copy Code
- **Student UI:** หน้า `/student/join` มี UI ให้กรอกโค้ด 8 ตัวอักษร
- **API (Server Action):** `joinClass` ใน `src/app/(dashboard)/student/join/actions.ts` จัดการการตรวจสอบโค้ดและ Insert ข้อมูลเข้า enrollments เรียบร้อยแล้ว

**สิ่งที่ยังขาดและต้องปรับปรุง:**
1. ครูยัง**ไม่สามารถสร้าง/รีเซ็ต (Regenerate)** รหัสใหม่ได้ (ความปลอดภัยหากรหัสหลุด)
2. บนหน้า Main Dashboard ของครู (`ClassDetailClient.tsx`) ไม่มีการแสดงรหัสเชิญอย่างชัดเจน ทำให้ครูต้องคลิกหลายต่อเพื่อหา
3. UI ของนักเรียนหลังกรอกเสร็จ ควรมีการแสดงผล Success และนำทางไป Check-in อย่างไร้รอยต่อ

---

## Section 2: UX/UI Flow

**Teacher Flow:**
1. เข้าไปที่ `/teacher` -> เลือก Class
2. บนหน้า Dashboard หลัก (`ClassDetailClient`) จะมีกล่องเล็กๆ หรือ Badge แสดง Invite Code พร้อมปุ่ม Copy ทำให้นักเรียนเห็นได้ทันทีเมื่อครูเปิดโปรเจกเตอร์
3. หากครูเข้าหน้า Settings จะพบส่วน "Invite Students" พร้อมปุ่ม **Regenerate Code** นอกเหนือจากปุ่ม Copy

**Student Flow:**
1. เข้าสู่ระบบ -> เข้าหน้า `/student/join`
2. กรอกรหัสเชิญ 8 ตัวอักษร -> กด Join
3. ระบบตรวจสอบความถูกต้อง:
   - กรณีผิด: ขึ้นแจ้งเตือนสั้นๆ (เช่น "Invalid code" or "Class not found")
   - กรณีผ่าน: นำทางไปยัง `/student/check-in?classId=xxx` อัตโนมัติ (ปัจจุบันทำแล้ว)

---

## Section 3: DB Schema / Migration Proposal
**ข้อเสนอ:** ปัจจุบันโครงสร้างสมบูรณ์เพียงพอแล้ว ไม่จำเป็นต้องทำ Migration เพิ่มเติม
- ตาราง: `classes` และ `class_enrollments`
- ความเป็นส่วนตัว (k-anonymity & Human in the loop) ไม่ได้รับผลกระทบจากการเข้าร่วมระบบนี้
- รหัสความปลอดภัยใช้ RLS อยู่แล้ว (นักเรียนเป็นผู้ INSERT เข้า `class_enrollments` ด้วย UUID ตัวเอง)

---

## Section 4: API Design (Server Actions)

การทำงานทั้งหมดจะใช้ React Server Actions แทนการเรียก REST API เต็มรูปแบบ (ลด Latency และทำงานร่วมกับ RLS ได้ดีบน Next.js 14+)

1. `regenerateInviteCode(classId: string)` **[เพิ่มใหม่]**
   - **Request:** `classId`
   - **Access:** ตรวจสอบว่า Teacher ที่ Request เป็นเจ้าของ Class (ผ่าน RLS หรือ auth check)
   - **Process:** สร้าง string ขนาด 8 ตัวอักษรแบบสุ่ม ไม่ซ้ำ (ตรวจสอบ Unique) -> Update `classes.invite_code`
   - **Response:** `{ success: true, newCode: "NEWCODE1" }` หรือ `{ error: "Not authorized" }`

2. `joinClass(formData)` **[มีอยู่แล้ว แต่ต้อง Review]**
   - **Request:** `inviteCode`
   - **Process:** ดึง class_id จาก invite_code -> Insert ใน `class_enrollments`
   - **Response:** redirect หรือ error msg.

---

## Section 5: Task List (Phase 2 - Parallel Implementation)

| Domain | Task | Target File | Status |
|--------|------|-------------|--------|
| **Backend** | นำเสนอเช็คและสร้าง `regenerateInviteCode` Server Action | `src/app/(dashboard)/teacher/class/[id]/settings/actions.ts` | [x] |
| **Frontend** | เพิ่ม UI ปุ่ม Copy รหัสในหน้าหลักของ Class Dashboard | `src/app/(dashboard)/teacher/class/[id]/ClassDetailClient.tsx` | [x] |
| **Frontend** | เพิ่มปุ่ม Regenerate Code พร้อม Dialog/Confirm ใน Settings | `src/app/(dashboard)/teacher/class/[id]/settings/client.tsx` | [x] |
| **Testing** | รัน `lint_runner.py` เพื่อตรวจสอบบั๊ก | `.agent/scripts/lint_runner.py` | [x] |

---

## Section 6: Code Snippet แนะนำ (Minimal Scaffold)

**ตัวอย่าง `regenerateInviteCode` (Server Action):**
```typescript
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid" // หรือเขียนฟังก์ชันสุ่ม 8 ตัวเอง

export async function regenerateInviteCode(classId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: "Unauthorized" }

    // Random uppercase 8 chars
    const newCode = Array.from({ length: 8 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('')

    const { error } = await supabase
        .from('classes')
        .update({ invite_code: newCode })
        .eq('id', classId)
        .eq('teacher_id', user.id) // Security check

    if (error) {
        console.error(error)
        return { success: false, error: "Failed to regenerate code" }
    }

    revalidatePath(`/teacher/class/${classId}`)
    return { success: true, newCode }
}
```
