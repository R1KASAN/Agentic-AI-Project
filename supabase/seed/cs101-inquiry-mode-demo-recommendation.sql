-- Demo fallback only
-- Creates a single pending Inquiry Mode recommendation for CS101.
-- The teacher must still approve it with a non-empty note before the student
-- page will show "การตอบสนองล่าสุดจากครู".

insert into recommendations (
  id,
  class_id,
  teacher_id,
  content,
  ai_message_draft,
  policy_level,
  status,
  teacher_approval_status,
  communicated_to_students,
  inquiry_mode,
  confidence_score,
  fallback_used
)
select
  gen_random_uuid(),
  c.id,
  c.teacher_id,
  'ตัวอย่าง Inquiry Mode สำหรับเดโม CS101',
  'ระบบอยากให้ครูช่วยเติมบริบทเพิ่มเติมเกี่ยวกับสิ่งที่ทำให้นักเรียนยังไม่ตอบรับคำแนะนำในห้องนี้',
  'ROUTINE',
  'pending',
  'pending',
  false,
  true,
  0.68,
  true
from classes c
where c.id = '10000000-0000-0000-0000-000000000001'
and not exists (
  select 1
  from recommendations r
  where r.class_id = c.id
    and r.inquiry_mode = true
    and r.status = 'pending'
)
limit 1;
