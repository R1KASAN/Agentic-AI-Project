# Inquiry Mode Demo Runbook

คู่มือนี้ใช้เดโม `Inquiry Mode` ในระบบ `Class Climate Agent` โดยใช้ teacher UI ที่มีอยู่จริงเป็นพระเอก และปิด flow ไปถึงฝั่งนักเรียนหลังครู approve พร้อม note

ห้องเดโมหลัก:

- `CS101 Introduction to Computing`
- `class_id = 10000000-0000-0000-0000-000000000001`

## Inquiry Mode คืออะไร

Inquiry Mode คือ recommendation แบบ “ถามบริบทเพิ่ม” แทนการเร่งเสนอทางแก้แบบ directive ทันที

ใน UI ครู จุดที่ใช้ดู Inquiry Mode หลักคือ:

- class cards ที่มี badge `Inquiry Mode`
- class detail ของห้อง
- recommendation card ที่มี badge `Inquiry Mode`

อ้างอิง surface หลัก:

- [client-classes.tsx](/Users/ark1/Public/Climate%20Agent/src/app/%28dashboard%29/teacher/classes/client-classes.tsx)
- [ClassDetailClient.tsx](/Users/ark1/Public/Climate%20Agent/src/app/%28dashboard%29/teacher/class/%5Bid%5D/ClassDetailClient.tsx)
- [RecommendationList.tsx](/Users/ark1/Public/Climate%20Agent/src/components/domain/teacher/RecommendationList.tsx)

## สถานะปัจจุบัน

- UI ของ Inquiry Mode มีอยู่จริงแล้ว
- approve path ตอนนี้บังคับให้กรอก note ก่อน confirm approve เมื่อ card นั้นเป็น `inquiry_mode = true`
- baseline dev seed มีห้อง `CS101` และนักเรียนครบตาม threshold แล้ว แต่ยังไม่มี recommendation row ที่ `inquiry_mode = true` มาให้ใช้ทดสอบโดยอัตโนมัติ

ดังนั้นเดโมนี้ต้องมี 2 เส้นทาง:

1. เส้นทางหลัก: ใช้ workflow จริง generate inquiry-mode draft
2. เส้นทางสำรอง: ใช้ SQL fallback สร้าง pending inquiry-mode draft สำหรับ CS101

## Preconditions

ก่อนเริ่ม demo/QA ให้เช็ก baseline นี้ก่อน:

- dev server รันอยู่ที่ `http://localhost:3000`
- local/dev database ถูก seed ด้วยข้อมูล `CS101`
- มีห้อง `CS101 Introduction to Computing`
- มี enrollment ครบอย่างน้อย 3 คนสำหรับ class นี้

ไฟล์ baseline ที่เกี่ยวข้อง:

- [seed.sql](/Users/ark1/Public/Climate%20Agent/supabase/seed/seed.sql)
- [cs101-inquiry-mode-demo-recommendation.sql](/Users/ark1/Public/Climate%20Agent/supabase/seed/cs101-inquiry-mode-demo-recommendation.sql)

## Preflight Check

ใช้ก่อนเริ่มเดโมเพื่อยืนยันว่า class demo พร้อม และยังไม่มี pending inquiry-mode recommendation ค้างอยู่แบบไม่ตั้งใจ

```sql
select id, name, teacher_id
from classes
where id = '10000000-0000-0000-0000-000000000001';

select
  id,
  inquiry_mode,
  status,
  teacher_approval_status,
  communicated_to_students,
  created_at
from recommendations
where class_id = '10000000-0000-0000-0000-000000000001'
order by created_at desc
limit 10;
```

## เป้าหมายของเดโม

ให้ผู้ชมเข้าใจครบว่า:

1. ระบบ trigger Inquiry Mode อย่างไรในฝั่งครู
2. ทำไม draft นี้ต้องการบริบทเพิ่มเติม
3. ครูต้องกรอก note ก่อน approve
4. หลัง approve แล้ว นักเรียนเห็น `การตอบสนองล่าสุดจากครู` ได้อย่างไร

## เส้นทางหลัก

1. ให้ workflow หรือระบบสร้าง recommendation ใหม่ที่ `inquiry_mode = true` สำหรับ `CS101`
2. login ฝั่งครู
3. เปิดหน้า `/teacher/classes` หรือหน้า class detail ของ `CS101`
4. ยืนยันว่าเห็น Inquiry Mode signal
5. เปิด recommendation card ที่มี badge `Inquiry Mode`
6. กด approve
7. ยืนยันว่าปุ่ม confirm approve ยังใช้ไม่ได้ถ้า note ว่าง
8. กรอก note ภาษาไทยที่ไม่ว่าง
9. approve สำเร็จ
10. เปิดฝั่งนักเรียนที่ `/student/feedback?classId=10000000-0000-0000-0000-000000000001`
11. ยืนยันว่า section `การตอบสนองล่าสุดจากครู` แสดง note card จริง

## เส้นทางสำรอง: SQL Fallback

ใช้เฉพาะตอน workflow ไม่ generate inquiry-mode draft ทันเวลาเดโม

ไฟล์ที่ใช้:

- [cs101-inquiry-mode-demo-recommendation.sql](/Users/ark1/Public/Climate%20Agent/supabase/seed/cs101-inquiry-mode-demo-recommendation.sql)

หลักการ:

- fallback นี้สร้างแค่ `pending inquiry-mode recommendation`
- ยังไม่ mark เป็น approved
- ยังไม่ mark เป็น communicated
- ครูยังต้อง approve ผ่าน flow ปกติเอง

ตัวไฟล์ถูกออกแบบให้รันซ้ำได้ โดยจะไม่ insert ซ้ำถ้ามี pending inquiry-mode recommendation ของ `CS101` ค้างอยู่แล้ว

ตัวอย่างคำสั่งรันใน dev environment:

```bash
cd /Users/ark1/Public/Climate\ Agent

DB_CLIENT_CONTAINER=n8n-docker-postgres-oss-1
SUPABASE_DB_HOST=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_HOST)
SUPABASE_DB_PORT=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_PORT)
SUPABASE_DB_DATABASE=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_DATABASE)
SUPABASE_DB_USER=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_USER)
SUPABASE_DB_PASSWORD=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_DB_PASSWORD)

docker exec -i -e PGPASSWORD="$SUPABASE_DB_PASSWORD" "$DB_CLIENT_CONTAINER" \
  psql "host=$SUPABASE_DB_HOST port=$SUPABASE_DB_PORT dbname=$SUPABASE_DB_DATABASE user=$SUPABASE_DB_USER sslmode=require" \
  < /Users/ark1/Public/Climate\ Agent/supabase/seed/cs101-inquiry-mode-demo-recommendation.sql
```

ถ้า path นี้ขึ้น `password authentication failed` หรือ environment ไม่มี DB credential ที่ใช้ได้ ให้ใช้ service-role fallback ด้านล่างแทน โดย logic จะ mirror ไฟล์ SQL เดิมและยังไม่ insert ซ้ำถ้ามี pending inquiry-mode recommendation อยู่แล้ว

```bash
cd /Users/ark1/Public/Climate\ Agent

export URL=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_URL)
export KEY=$(docker exec n8n-docker-n8n-oss-1 printenv SUPABASE_SERVICE_KEY)

node --input-type=module <<'EOF'
import { createClient } from '@supabase/supabase-js';

const classId = '10000000-0000-0000-0000-000000000001';
const supabase = createClient(process.env.URL, process.env.KEY);

const { data: existing, error: existingError } = await supabase
  .from('recommendations')
  .select('id')
  .eq('class_id', classId)
  .eq('inquiry_mode', true)
  .eq('status', 'pending')
  .limit(1);

if (existingError) throw existingError;
if (existing && existing.length > 0) {
  console.log('pending inquiry-mode recommendation already exists:', existing[0].id);
  process.exit(0);
}

const { data: cls, error: classError } = await supabase
  .from('classes')
  .select('id, teacher_id')
  .eq('id', classId)
  .single();

if (classError || !cls) throw classError ?? new Error('CS101 class not found');

const { data: inserted, error: insertError } = await supabase
  .from('recommendations')
  .insert({
    class_id: cls.id,
    teacher_id: cls.teacher_id,
    content: 'ตัวอย่าง Inquiry Mode สำหรับเดโม CS101',
    ai_message_draft: 'ระบบอยากให้ครูช่วยเติมบริบทเพิ่มเติมเกี่ยวกับสิ่งที่ทำให้นักเรียนยังไม่ตอบรับคำแนะนำในห้องนี้',
    policy_level: 'ROUTINE',
    status: 'pending',
    teacher_approval_status: 'pending',
    communicated_to_students: false,
    inquiry_mode: true,
    confidence_score: 0.68,
    fallback_used: true,
  })
  .select('id, class_id, inquiry_mode, status, teacher_approval_status, communicated_to_students, updated_at')
  .single();

if (insertError) throw insertError;
console.log(inserted);
EOF
```

หลังรันแล้วควรเช็กทันทีว่าได้ pending inquiry-mode recommendation มาแล้ว:

```sql
select
  id,
  inquiry_mode,
  status,
  teacher_approval_status,
  communicated_to_students,
  updated_at
from recommendations
where class_id = '10000000-0000-0000-0000-000000000001'
  and inquiry_mode = true
order by updated_at desc
limit 5;
```

## ขั้นตอนวันเดโม

### Step 1: เปิด baseline ของนักเรียนก่อน

เปิด:

- `/student/feedback?classId=10000000-0000-0000-0000-000000000001`

สิ่งที่ควรเห็น:

- section `การตอบสนองล่าสุดจากครู`
- ถ้ายังไม่มี communicated action ล่าสุด จะยังเป็น placeholder

### Step 2: สร้าง inquiry-mode draft

เลือกหนึ่งทาง:

- ทางหลัก: ใช้ workflow จริง
- ทางสำรอง: รัน SQL fallback จาก [cs101-inquiry-mode-demo-recommendation.sql](/Users/ark1/Public/Climate%20Agent/supabase/seed/cs101-inquiry-mode-demo-recommendation.sql)

### Step 3: เปิดฝั่งครู

เปิด:

- `/teacher/classes`
- แล้วคลิกเข้า `CS101 Introduction to Computing`

สิ่งที่ควรสังเกต:

- ถ้า metrics พร้อม อาจเห็น badge `Inquiry Mode` ที่ class card
- ในหน้า class detail หรือ recommendation card ต้องเห็น draft ที่เป็น Inquiry Mode

### Step 4: ฝั่งครู approve พร้อมบริบท

กด approve ที่ inquiry-mode draft

สิ่งที่ควรสังเกต:

- card มี Inquiry Mode badge
- มีข้อความอธิบายว่าระบบกำลังชวนครูเติมบริบทเพิ่ม
- ถ้า note ว่าง ปุ่ม confirm approve ต้องยังใช้ไม่ได้
- เมื่อกรอก note แล้วจึง approve ได้

ตัวอย่าง note:

> ตอนนี้ห้องยังตอบสนองต่อคำแนะนำแบบตรง ๆ ไม่มาก ครูอยากให้ระบบลองถามคำถามที่เฉพาะกับช่วงต้นคาบมากขึ้น

### Step 5: ตรวจใน DB หลัง approve

แถวล่าสุดของ `CS101` ที่เป็น inquiry mode ต้องมี:

- `inquiry_mode = true`
- `status = 'approved'`
- `teacher_approval_status = 'approved'`
- `communicated_to_students = true`
- `teacher_action_note` ไม่ว่าง

ตัวอย่าง query:

```sql
select
  id,
  inquiry_mode,
  status,
  teacher_approval_status,
  communicated_to_students,
  teacher_action_note,
  updated_at
from recommendations
where class_id = '10000000-0000-0000-0000-000000000001'
order by updated_at desc
limit 10;
```

### Step 6: เปิดฝั่งนักเรียนอีกครั้ง

เปิด:

- `/student/feedback?classId=10000000-0000-0000-0000-000000000001`

สิ่งที่ควรเห็น:

- section `การตอบสนองล่าสุดจากครู` เปลี่ยนจาก placeholder เป็น note card จริง
- note ต้องเป็นข้อความจากครูที่เพิ่ง approve
- นักเรียนเห็นเฉพาะข้อมูลแบบ student-safe

## Acceptance Criteria

ถือว่าเดโม Inquiry Mode ผ่านเมื่อ:

- มี recommendation ที่ `inquiry_mode = true`
- ครูเห็น Inquiry Mode badge / explainer จริง
- ปุ่ม confirm approve ถูก disable เมื่อ note ว่าง
- เมื่อกรอก note แล้ว approve สำเร็จ
- หลัง approve แล้ว student page ของ `CS101` เห็น note card จริง
- ไม่มี internal field เช่น `ai_message_draft`, `reasoning`, `confidence_score` หลุดไปฝั่ง student

## Negative Checks

เคสเหล่านี้ต้องยังไม่ทำให้ student เห็น teacher response:

- recommendation ยังเป็น `pending`
- recommendation ถูก `dismissed`
- recommendation เป็น inquiry mode แต่ครูยังไม่ approve
- ครูยังไม่กรอก note

## หมายเหตุ

- ถ้า badge `Inquiry Mode` ยังไม่ขึ้นที่ class card เพราะ metrics ยังไม่ recompute แต่มี inquiry-mode recommendation card อยู่แล้ว ให้เดโมต่อจาก recommendation card ได้ทันที
- runbook นี้เป็น `demo-scoped`
- ไม่ได้เปลี่ยน contract ของ student feedback API
- ไม่ได้ลดกติกา `communicated_to_students`
