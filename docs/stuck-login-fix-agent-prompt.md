# Stuck Login Fix Prompt

Use these skills:
- [$env-vars](/Users/ark1/.agents/skills/env-vars/SKILL.md)
- [$nextjs-supabase-auth](/Users/ark1/.agents/skills/nextjs-supabase-auth/SKILL.md)
- [$vercel:env-vars](/Users/ark1/.codex/plugins/cache/openai-curated/vercel/d88301d4694edc6282ca554e97fb8425cbd5a250/skills/env-vars/SKILL.md)
- [$vercel:agent-browser-verify](/Users/ark1/.codex/plugins/cache/openai-curated/vercel/d88301d4694edc6282ca554e97fb8425cbd5a250/skills/agent-browser-verify/SKILL.md)
- [$vercel:investigation-mode](/Users/ark1/.codex/plugins/cache/openai-curated/vercel/d88301d4694edc6282ca554e97fb8425cbd5a250/skills/investigation-mode/SKILL.md)
- [$next-best-practices](/Users/ark1/Public/Climate%20Agent/.agents/skills/next-best-practices/SKILL.md)

```text
Task: ดีบัก แก้ไข และ verify ปัญหา Next.js + Supabase auth บน Vercel ที่หน้า login ค้างที่ "Logging in..." ก่อนเข้าทั้ง student และ teacher dashboard

Important context:
- อย่าหลงกับ noise จาก browser extension เว้นแต่จะ reproduce ได้ใน clean browser context:
  - Unchecked runtime.lastError
  - utils.js / extensionState.js / heuristicsRedefinitions.js ERR_FILE_NOT_FOUND
- ให้ถือ error นี้เป็น root cause หลักจนกว่าจะพิสูจน์ได้ว่าไม่ใช่:
  - `@supabase/ssr: Your project's URL and API key are required to create a Supabase client!`
- ความหมายเชิงปฏิบัติของ error นี้คือ deployment ที่กำลังเสิร์ฟอยู่มีโอกาสสูงที่ browser bundle ไม่มี `NEXT_PUBLIC_SUPABASE_URL` และ/หรือ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- อีกความเป็นไปได้คือ preview alias ชี้ไป deployment เก่าที่ถูก build ตอน env ยังไม่ครบ
- Success ไม่ใช่แค่กดปุ่ม login แล้ว request ยิงออก แต่ต้อง redirect สำเร็จและลงหน้าปลายทางที่ถูกต้องโดยไม่ค้างที่ "Logging in..."

Requirements:
1. หา active preview alias และ deployment ID ที่กำลังเสิร์ฟแอปที่พังอยู่ให้ชัดเจน
2. Inspect Vercel env สำหรับ Preview และ active branch preview
3. ยืนยันว่ามีและถูกต้อง:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - NEXT_PUBLIC_APP_URL
4. ถ้าต้องแก้ `NEXT_PUBLIC_*` ใด ๆ ให้ redeploy ทันทีหลังแก้
5. Verify `/login` ใน clean browser context
6. Login ให้จบและยืนยัน redirect ของทั้งสอง flow:
   - `/teacher`
   - student landing flow ที่ถูกต้องของระบบนี้
7. ยืนยันว่าไม่มี visible `@supabase/ssr` config error ใน app flow และไม่มี infinite "Logging in..."
8. ถ้าเกี่ยวกับ auth callback / redirect config ให้ตรวจว่า callback host เป็น deployed hostname ไม่ใช่ `localhost`
9. ถ้า env หาย ให้ทำให้ผู้ใช้เห็น config error ชัดเจนแทน spinner ค้าง
10. ถ้าเป็น deployment drift ให้ report ว่า alias ไปชี้ deployment ไหน และ deployment ไหนยังเสิร์ฟ stale bundle

Required working style:
1. ใช้ skill เรื่อง env และ Supabase auth ข้างต้นร่วมกับ Vercel browser verification
2. อย่าหยุดแค่ analysis
3. ทำต่อให้ครบจนถึง fix + redeploy + browser verification เว้นแต่จะติดสิทธิ์หรือ credential จริง ๆ
4. ถ้าพบว่าปัญหาอยู่ที่ code path ฝั่ง student ต่างจาก teacher ให้แก้เฉพาะจุดโดยไม่ทำให้ auth flow เดิมของ teacher regression

Deliverables:
1. exact root cause
2. exact fix applied
3. deployment URL / alias ที่ verify แล้ว
4. ผล verify ของ teacher login
5. ผล verify ของ student login
6. ข้อสังเกตว่า extension noise เป็น non-blocking หรือไม่ใน clean context
```
