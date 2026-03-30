-- Demo fallback only
-- Creates a single pending recommendation for CS101 without bypassing teacher approval.
-- After inserting this row, a teacher must still approve it with a non-empty note
-- so that the student page can display "การตอบสนองล่าสุดจากครู".

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
  confidence_score,
  inquiry_mode,
  fallback_used
)
select
  gen_random_uuid(),
  c.id,
  c.teacher_id,
  'ตัวอย่างคำแนะนำสำหรับเดโม CS101',
  'ครูอาจเริ่มคาบด้วยการเช็กอินสั้น ๆ และสรุปสิ่งที่ต้องโฟกัสในคาบให้ชัดขึ้น',
  'ROUTINE',
  'pending',
  'pending',
  false,
  0.74,
  false,
  true
from classes c
where c.id = '10000000-0000-0000-0000-000000000001'
limit 1;
