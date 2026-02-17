# 🚀 คู่มือการใช้งาน Supabase (สำหรับโปรเจกต์ Climate Agent)

โปรเจกต์นี้เชื่อมต่อกับ Supabase เรียบร้อยแล้ว โดยใช้โครงสร้างแบบ **Next.js App Router** ร่วมกับ `@supabase/ssr` เพื่อความปลอดภัยสูงสุด

---

## 📂 1. โครงสร้างไฟล์ที่สำคัญ

| ไฟล์ | หน้าที่ |
|---|---|
| `src/lib/supabase/server.ts` | **Server Client**: สำหรับใช้ใน Server Components, API Routes, Server Actions (จัดการ Cookies อัตโนมัติ) |
| `src/lib/supabase/client.ts` | **Browser Client**: สำหรับใช้ใน Client Components (`use client`) |
| `src/middleware.ts` | **Middleware**: ช่วย refresh session และจัดการ redirect ตาม Role |
| `.env.local` | เก็บ `SUPABASE_URL` และ `ANON_KEY` |

---

## 🔐 2. การ Authentication (Login/Register)

ระบบรองรับทั้ง Email/Password และ Magic Link (Email OTP)

### ตัวอย่างการ Login (Client Side)
```typescript
"use client";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: "student@example.com",
      password: "password123",
    });
    
    if (!error) {
      window.location.href = "/"; // redirect ไปหน้าแรก
    }
  };

  return <button onClick={handleLogin}>Login</button>;
}
```

---

## 💾 3. การดึงข้อมูล (Database Query)

### ✅ แบบที่ 1: ดึงข้อมูลใน Server Component (แนะนำ)
วิธีนี้ดีที่สุดสำหรับ SEO และ Performance

```typescript
// src/app/page.tsx
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();

  // ดึงข้อมูล classes (ระบบจะกรองข้อมูลตาม Role ของ user ให้อัตโนมัติด้วย RLS)
  const { data: classes } = await supabase
    .from("classes")
    .select("*");

  return (
    <div>
      {classes?.map((c) => (
        <div key={c.id}>{c.name}</div>
      ))}
    </div>
  );
}
```

### ✅ แบบที่ 2: ดึงข้อมูลใน Client Component
ใช้เมื่อต้องการดึงข้อมูลหลังจาก user กดปุ่ม หรือทำ filter

```typescript
"use client";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function StudentList() {
  const [students, setStudents] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchStudents = async () => {
      const { data } = await supabase.from("users").select("*").eq("role", "student");
      setStudents(data || []);
    };
    fetchStudents();
  }, []);

  return <div>...</div>;
}
```

---

## 🛡️ 4. ความปลอดภัย (RLS & Privacy)

ระบบนี้ใช้ **Row Level Security (RLS)** อย่างเคร่งครัด:

1. **Check-ins (ข้อมูลความรู้สึกนักเรียน)**
   - **Student**: เห็นเฉพาะของตัวเอง (`select_own`)
   - **Teacher/Admin**: ❌ **ห้ามเห็นข้อมูลดิบ** (Select policy = NONE)
   - **ทางแก้ไข**: Teacher ต้องดูผ่าน **Aggregate View** แทน (ดูข้อ 5)

2. **Classes**
   - **Student**: เห็นเฉพาะคลาสที่ตัวเองลงเรียน
   - **Teacher**: เห็นเฉพาะคลาสที่ตัวเองสอน

---

## 📊 5. การใช้ RPC (Stored Functions)

สำหรับข้อมูลสรุป (Aggregate Data) ที่มีกฎ Privacy ซับซ้อน เราใช้ Function แทนการ Query ตรงๆ

### ตัวอย่าง: Teacher ดูสรุปผล Climate (k-anonymity)
ฟังก์ชันนี้จะคืนค่า `NULL` ถ้านักเรียนตอบน้อยกว่า 3 คน (เพื่อปกป้อง Privacy)

```typescript
// ใช้ใน Server Component หรือ API Route
const { data: climateStats } = await supabase.rpc("get_class_climate_summary", {
  p_class_id: "class-uuid-123",
  p_weeks: 4 // ดูย้อนหลัง 4 สัปดาห์
});
```

---

## 🛠️ 6. คำสั่ง SQL ที่น่าใช้ (ใน Supabase Dashboard)

ไปที่ **SQL Editor** ใน Dashboard เพื่อรันคำสั่งเหล่านี้:

### ตรวจสอบ Users ทั้งหมด
```sql
SELECT * FROM auth.users;
```

### เพิ่ม User เข้าตาราง public.users (ถ้าไม่ได้สมัครผ่านหน้าเว็บ)
*ปกติระบบมี Trigger ทำให้แล้ว แต่ถ้ารัน Seed Data เองต้องเช็ค*
```sql
SELECT * FROM public.users;
```

### ทดสอบดึง Check-in (ลองรันด้วย Role ต่างๆ)
```sql
-- ลองเป็น Authenticated User
SET ROLE authenticated;
SELECT * FROM public.check_ins;
```
