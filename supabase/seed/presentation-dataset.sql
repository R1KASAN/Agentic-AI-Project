-- Presentation Dataset Bundle
-- Class Climate Agent
--
-- Canonical demo bundle for presentation / recording.
-- This file targets the current schema used by the app:
--   - public.users
--   - public.classes / public.class_enrollments
--   - public.student_pulses (canonical check-in table)
--   - public.recommendations
--   - public.teacher_profiles
--   - public.schools / public.school_days
--
-- Run after the latest migrations are applied and after demo auth users
-- are provisioned through the Supabase Admin API.

-- ============================================================
-- 0. School + Teacher Profile
-- ============================================================

INSERT INTO public.schools (id, name, health_score, last_calculated)
VALUES (
  'd3b07384-d9a1-4e64-84ea-2b3812f521d0'::uuid,
  'Demo School (Presentation)',
  100,
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  health_score = EXCLUDED.health_score,
  last_calculated = EXCLUDED.last_calculated;

-- ============================================================
-- 1. Auth Provisioning Precondition
-- ============================================================

DO $$
DECLARE
  missing_users integer;
BEGIN
  SELECT COUNT(*)
  INTO missing_users
  FROM (
    SELECT id
    FROM (
      VALUES
        ('00000000-0000-0000-0000-000000000001'::uuid),
        ('00000000-0000-0000-0000-000000000002'::uuid),
        ('00000000-0000-0000-0000-000000000003'::uuid),
        ('00000000-0000-0000-0000-000000000004'::uuid)
    ) AS required_users(id)
    WHERE NOT EXISTS (
      SELECT 1
      FROM auth.users
      WHERE auth.users.id = required_users.id
    )
  ) AS missing;

  IF missing_users > 0 THEN
    RAISE EXCEPTION
      'Demo auth users are missing. Run "npm run demo:provision-auth" before loading supabase/seed/presentation-dataset.sql';
  END IF;
END $$;

-- ============================================================
-- 2. Public Users
-- ============================================================

INSERT INTO public.users (id, role, full_name, avatar_url)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'teacher', 'Teacher Demo', NULL),
  ('00000000-0000-0000-0000-000000000002', 'student', 'Student One', NULL),
  ('00000000-0000-0000-0000-000000000003', 'student', 'Student Two', NULL),
  ('00000000-0000-0000-0000-000000000004', 'student', 'Student Three', NULL)
ON CONFLICT (id) DO UPDATE
SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  avatar_url = EXCLUDED.avatar_url;

-- ============================================================
-- 3b. Teacher Profile
-- ============================================================

INSERT INTO public.teacher_profiles (
  user_id,
  notification_frequency_pref,
  notification_channel_pref,
  last_briefing_sent_at,
  briefing_count_7d,
  briefing_approval_count_7d,
  approval_rate_historical,
  implementation_rate_historical,
  action_latency_avg_hours,
  closure_rate_trend_7d,
  is_inquiry_mode,
  inquiry_mode_triggered_at,
  dismissal_pattern_consecutive,
  dismissal_pattern_reason
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ROUTINE',
  'DASHBOARD',
  NULL,
  0,
  0,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  0,
  NULL
)
ON CONFLICT (user_id) DO UPDATE
SET
  notification_frequency_pref = EXCLUDED.notification_frequency_pref,
  notification_channel_pref = EXCLUDED.notification_channel_pref,
  last_briefing_sent_at = EXCLUDED.last_briefing_sent_at,
  briefing_count_7d = EXCLUDED.briefing_count_7d,
  briefing_approval_count_7d = EXCLUDED.briefing_approval_count_7d,
  approval_rate_historical = EXCLUDED.approval_rate_historical,
  implementation_rate_historical = EXCLUDED.implementation_rate_historical,
  action_latency_avg_hours = EXCLUDED.action_latency_avg_hours,
  closure_rate_trend_7d = EXCLUDED.closure_rate_trend_7d,
  is_inquiry_mode = EXCLUDED.is_inquiry_mode,
  inquiry_mode_triggered_at = EXCLUDED.inquiry_mode_triggered_at,
  dismissal_pattern_consecutive = EXCLUDED.dismissal_pattern_consecutive,
  dismissal_pattern_reason = EXCLUDED.dismissal_pattern_reason;

-- ============================================================
-- 3. Classes
-- ============================================================

INSERT INTO public.classes (
  id,
  teacher_id,
  school_id,
  name,
  description,
  invite_code,
  risk_score,
  pilot_status
)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'd3b07384-d9a1-4e64-84ea-2b3812f521d0',
    'CS101 Introduction to Computing',
    'Main demo class for the approval workflow and positive climate trend.',
    '54C9B1C4',
    0,
    true
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'd3b07384-d9a1-4e64-84ea-2b3812f521d0',
    'gg',
    'Demo room for inquiry mode and a pending recommendation.',
    'RM9HDHDP',
    0,
    true
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'd3b07384-d9a1-4e64-84ea-2b3812f521d0',
    'กินหมูกระทะ',
    'No-data demo room used to show privacy-safe empty states.',
    '08FD21EB',
    0,
    true
  )
ON CONFLICT (id) DO UPDATE
SET
  teacher_id = EXCLUDED.teacher_id,
  school_id = EXCLUDED.school_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  invite_code = EXCLUDED.invite_code,
  risk_score = EXCLUDED.risk_score,
  pilot_status = EXCLUDED.pilot_status;

-- ============================================================
-- 4. Enrollments
-- ============================================================

INSERT INTO public.class_enrollments (class_id, student_id) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. Student Pulses (canonical check-in table)
-- ============================================================
-- This is the source of truth used by the current climate dashboards.
-- We seed:
--   - CS101: 2 weeks of healthy data
--   - gg: 1 week of lower-signal data + pending inquiry-mode recommendation
--   - กินหมูกระทะ: no data, to show empty/no-data state

INSERT INTO public.student_pulses (
  id,
  class_id,
  student_id,
  mood,
  pace,
  fairness,
  optional_text,
  created_at
)
VALUES
  -- CS101, week 1
  (
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'good',
    4,
    5,
    'วันนี้เรียนเข้าใจง่ายและบรรยากาศดี',
    '2026-03-16 08:05:00+00'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    'okay',
    3,
    4,
    'จังหวะคาบกำลังโอเค',
    '2026-03-16 08:08:00+00'
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000004',
    'great',
    4,
    4,
    'วันนี้ทุกคนช่วยกันดีมาก',
    '2026-03-16 08:10:00+00'
  ),
  -- CS101, week 2
  (
    '40000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'great',
    4,
    5,
    'เริ่มชัดเจนขึ้นและตามทันมากขึ้น',
    '2026-03-23 08:05:00+00'
  ),
  (
    '40000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    'good',
    3,
    4,
    'บรรยากาศสม่ำเสมอ',
    '2026-03-23 08:08:00+00'
  ),
  (
    '40000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000004',
    'great',
    4,
    5,
    'วันนี้โอเคมาก',
    '2026-03-23 08:10:00+00'
  ),
  -- gg, one week of more cautious signals
  (
    '40000000-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'low',
    2,
    2,
    'วันนี้ยังตามไม่ค่อยทัน',
    '2026-03-24 08:05:00+00'
  ),
  (
    '40000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    'okay',
    3,
    3,
    'อยากให้มีตัวอย่างเพิ่มอีกนิด',
    '2026-03-24 08:08:00+00'
  ),
  (
    '40000000-0000-0000-0000-000000000009',
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000004',
    'low',
    2,
    2,
    'ค่อนข้างเร็วไปเล็กน้อย',
    '2026-03-24 08:10:00+00'
  )
ON CONFLICT (id) DO UPDATE
SET
  class_id = EXCLUDED.class_id,
  student_id = EXCLUDED.student_id,
  mood = EXCLUDED.mood,
  pace = EXCLUDED.pace,
  fairness = EXCLUDED.fairness,
  optional_text = EXCLUDED.optional_text,
  created_at = EXCLUDED.created_at;

-- ============================================================
-- 6. Recommendations
-- ============================================================

INSERT INTO public.recommendations (
  id,
  class_id,
  teacher_id,
  content,
  status,
  dismissal_reason,
  action_taken_note,
  communicated_to_students,
  created_at,
  updated_at,
  policy_level,
  ai_message_draft,
  actions_json,
  confidence_score,
  reasoning,
  inquiry_mode,
  fallback_used,
  teacher_approval_status,
  teacher_acted_at,
  teacher_action_note,
  structured_payload,
  action_status,
  teacher_approved_at,
  teacher_implemented_at,
  teacher_feedback,
  feedback_sentiment,
  feedback_confidence,
  closure_share_note,
  not_actioned_at,
  restored_from_recommendation_id
)
VALUES
  (
    '50000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'สรุปภาพรวมคาบ CS101 ในรอบนี้ค่อนข้างนิ่งและนักเรียนตอบรับสม่ำเสมอ',
    'approved',
    NULL,
    'ครูเริ่มคาบด้วยการทบทวนสั้น ๆ และปรับจังหวะให้ค่อยเป็นค่อยไป',
    true,
    '2026-03-24 09:00:00+00',
    '2026-03-24 09:00:00+00',
    'ROUTINE',
    'ครูอาจเริ่มต้นด้วยการเช็กอินสั้น ๆ และสรุปเป้าหมายของคาบให้ชัดขึ้น',
    '["เริ่มด้วย check-in สั้น ๆ","สรุปเป้าหมายของคาบ","เปิดโอกาสให้นักเรียนถามคำถาม"]'::jsonb,
    0.91,
    'คะแนนเฉลี่ยของห้องอยู่ในระดับปกติและมีแนวโน้มดีขึ้นในสัปดาห์ถัดมา',
    false,
    false,
    'approved',
    '2026-03-24 09:00:00+00',
    'ขอบคุณสำหรับฟีดแบ็กของห้อง คาบถัดไปเราจะเริ่มด้วยการเช็กอินสั้น ๆ และสรุปเป้าหมายของคาบให้ชัดขึ้นอีกนิด เพื่อให้ทุกคนตามทันมากขึ้น',
    $${
      "version": 1,
      "mode": "action",
      "source": "llm",
      "teacherSummary": "ภาพรวมของ CS101 ค่อนข้างนิ่งและนักเรียนตอบรับสม่ำเสมอ จึงเหมาะกับการคงจังหวะคาบที่ชัดและอุ่นใจ",
      "situationHypothesis": "นักเรียนส่วนใหญ่ตามเนื้อหาได้ดีขึ้นเมื่อครูเปิดคาบอย่างชัดเจนและเว้นพื้นที่ให้ถาม",
      "recommendedTeacherMove": "เริ่มคาบด้วยการเช็กอินสั้น ๆ แล้วสรุปเป้าหมายของคาบให้ชัดก่อนเริ่มเนื้อหา",
      "studentMessageDraft": "ขอบคุณสำหรับฟีดแบ็กของห้อง คาบถัดไปเราจะเริ่มด้วยการเช็กอินสั้น ๆ และสรุปเป้าหมายของคาบให้ชัดขึ้นอีกนิด เพื่อให้ทุกคนตามทันมากขึ้น",
      "teacherActionPlan": [
        "เริ่มคาบด้วยการเช็กอินสั้น ๆ",
        "สรุปเป้าหมายของคาบให้ชัดก่อนเริ่มเนื้อหา",
        "เปิดช่วงให้ถามคำถามก่อนเดินต่อ"
      ],
      "watchSignals": [
        "นักเรียนถามคำถามได้เร็วขึ้นหรือไม่",
        "ช่วงต้นคาบผ่อนลงและนิ่งขึ้นหรือไม่",
        "ยังมีจุดไหนที่นักเรียนบอกว่าตามไม่ทันอีกหรือไม่"
      ],
      "whyThisHelps": "การเริ่มคาบอย่างชัดเจนและให้พื้นที่ถามตั้งแต่ต้นช่วยคงบรรยากาศที่นิ่งและลดแรงตึงสะสมระหว่างคาบ",
      "postClassReflectionPrompt": "หลังใช้วิธีนี้แล้ว นักเรียนตอบสนองอย่างไร และจุดไหนของคาบที่ยังควรปรับต่อ"
    }$$::jsonb,
    'approved',
    '2026-03-24 09:00:00+00',
    NULL,
    NULL,
    NULL,
    NULL,
    'ขอบคุณสำหรับฟีดแบ็กของห้อง คาบถัดไปเราจะเริ่มด้วยการเช็กอินสั้น ๆ และสรุปเป้าหมายของคาบให้ชัดขึ้นอีกนิด เพื่อให้ทุกคนตามทันมากขึ้น',
    NULL,
    NULL
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'ตัวอย่างคำแนะนำสำหรับห้อง gg เพื่อใช้เดโม inquiry mode',
    'pending',
    NULL,
    NULL,
    false,
    '2026-03-25 09:00:00+00',
    '2026-03-25 09:00:00+00',
    'WARNING',
    'ระบบอยากให้ครูช่วยเติมบริบทเพิ่มเติมเกี่ยวกับสิ่งที่ทำให้นักเรียนยังไม่ตอบรับคำแนะนำในห้องนี้',
    '["ถามครูถึงบริบทของห้อง","รอข้อมูลเพิ่มเติมก่อนสรุป","ปรับภาษาให้เหมาะกับชั้นเรียน"]'::jsonb,
    0.68,
    'ข้อมูลรวมยังไม่พอสำหรับข้อสรุปที่มั่นใจ จึงเปิดโหมด inquiry เพื่อขอบริบทเพิ่ม',
    true,
    true,
    'pending',
    NULL,
    NULL,
    $${
      "version": 1,
      "mode": "inquiry",
      "source": "fallback",
      "teacherSummary": "สัญญาณรวมของห้อง gg เริ่มอ่อนลง แต่ยังควรเติมบริบทจากครูอีกเล็กน้อยก่อนสรุปข้อความถึงนักเรียน",
      "situationHypothesis": "ข้อมูลรวมบอกว่าห้องมีแรงตึงบางช่วงของคาบ แต่ยังไม่ชัดว่าควรเริ่มแก้ตรงจังหวะไหนก่อน",
      "recommendedTeacherMove": "เติมบริบทสั้น ๆ ว่าช่วงไหนของคาบที่นักเรียนเริ่มเงียบหรือตามไม่ทัน",
      "studentMessageDraft": null,
      "teacherActionPlan": [
        "เติมบริบทสั้น ๆ ว่าปัญหาน่าจะเกิดช่วงไหนของคาบ",
        "บอกระบบว่าคุณครูอยากให้ช่วยต่อเรื่องใด",
        "ค่อยตัดสินใจอีกครั้งหลังได้บริบทเพิ่ม"
      ],
      "watchSignals": [
        "ช่วงที่เด็กเริ่มเงียบพร้อมกัน",
        "กิจกรรมที่ทำให้เด็กถามน้อยลง",
        "จังหวะที่ครูรู้สึกว่าห้องเริ่มหลุดจากการมีส่วนร่วม"
      ],
      "whyThisHelps": "การเติมบริบทจากครูก่อนจะช่วยให้ข้อเสนอรอบถัดไปตรงกับสถานการณ์จริงของห้องมากขึ้น",
      "postClassReflectionPrompt": null
    }$$::jsonb,
    'pending',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'ห้องนี้น่าจะได้ผลดีถ้าเริ่มคาบด้วยการเช็กความเข้าใจสั้น ๆ ก่อนเดินโจทย์หลัก',
    'approved',
    NULL,
    'ครูลองเริ่มคาบด้วยคำถามสั้น ๆ ก่อนเข้าสู่โจทย์หลัก และเห็นว่านักเรียนกล้าถามมากขึ้น',
    false,
    '2026-03-22 09:00:00+00',
    '2026-03-23 10:30:00+00',
    'WARNING',
    'คาบถัดไปเราจะเริ่มด้วยการเช็กความเข้าใจสั้น ๆ ก่อน เพื่อให้ทุกคนบอกได้ว่าตรงไหนยังติดอยู่ แล้วค่อยเดินโจทย์หลักต่อ',
    '["เริ่มคาบด้วยการเช็กความเข้าใจสั้น ๆ","ถามจุดที่ยังติดก่อนเดินโจทย์หลัก","สังเกตว่านักเรียนกล้าถามมากขึ้นหรือไม่"]'::jsonb,
    0.84,
    'การเปิดพื้นที่ให้บอกจุดที่ยังติดก่อนเริ่มโจทย์หลักช่วยลดความเกร็งและทำให้ครูเห็นจุดสะดุดได้เร็วขึ้น',
    false,
    false,
    'approved',
    '2026-03-23 10:30:00+00',
    'ครูลองเริ่มคาบด้วยคำถามสั้น ๆ ก่อนเข้าสู่โจทย์หลัก และเห็นว่านักเรียนกล้าถามมากขึ้น',
    $${
      "version": 1,
      "mode": "action",
      "source": "fallback",
      "teacherSummary": "ห้องนี้น่าจะได้ผลดีถ้าเริ่มคาบด้วยการเช็กความเข้าใจสั้น ๆ ก่อนเดินโจทย์หลัก",
      "situationHypothesis": "นักเรียนบางส่วนยังต้องการพื้นที่ตั้งหลักก่อนเข้าสู่โจทย์หลัก จึงอาจเงียบหรือไม่กล้าถามตั้งแต่ต้นคาบ",
      "recommendedTeacherMove": "เปิดช่วงเช็กความเข้าใจสั้น ๆ ก่อน แล้วค่อยเข้าสู่โจทย์หลัก",
      "studentMessageDraft": "คาบถัดไปเราจะเริ่มด้วยการเช็กความเข้าใจสั้น ๆ ก่อน เพื่อให้ทุกคนบอกได้ว่าตรงไหนยังติดอยู่ แล้วค่อยเดินโจทย์หลักต่อ",
      "teacherActionPlan": [
        "เริ่มคาบด้วยการเช็กความเข้าใจสั้น ๆ",
        "ถามจุดที่ยังติดก่อนเดินโจทย์หลัก",
        "สังเกตว่านักเรียนกล้าถามมากขึ้นหรือไม่"
      ],
      "watchSignals": [
        "เด็กเริ่มตอบคำถามได้เร็วขึ้นหรือไม่",
        "ช่วงต้นคาบยังเงียบเหมือนเดิมหรือไม่",
        "คำถามซ้ำเรื่องโจทย์หลักลดลงหรือไม่"
      ],
      "whyThisHelps": "การเริ่มจากจุดที่เด็กยังติดจะช่วยลดแรงกดดันและทำให้การมีส่วนร่วมกลับมาได้ง่ายขึ้น",
      "postClassReflectionPrompt": "หลังลองใช้วิธีนี้แล้ว นักเรียนตอบสนองอย่างไร และช่วงไหนของคาบที่ยังควรปรับต่อ"
    }$$::jsonb,
    'feedback_logged',
    '2026-03-22 09:15:00+00',
    '2026-03-23 09:40:00+00',
    'ลองใช้แล้ว เด็กตอบคำถามเร็วขึ้นและช่วงต้นคาบดูผ่อนลงกว่าก่อนหน้า',
    'positive',
    0.780,
    NULL,
    NULL,
    NULL
  ),
  (
    '50000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'ระบบเสนอให้เริ่มคาบด้วยการทบทวนศัพท์สำคัญสั้น ๆ เพื่อช่วยให้ห้องตั้งหลักได้ง่ายขึ้น',
    'approved',
    NULL,
    'คาบนั้นเวลาไม่พอจึงยังไม่ได้ลองใช้ แต่เก็บข้อความนี้ไว้เป็นตัวเลือกสำหรับคาบถัดไป',
    false,
    '2026-03-21 09:00:00+00',
    '2026-03-21 09:20:00+00',
    'ROUTINE',
    'คาบถัดไปเราจะลองเริ่มด้วยการทบทวนศัพท์สำคัญสั้น ๆ ก่อน เพื่อช่วยให้ทุกคนตั้งหลักกับเนื้อหาได้ง่ายขึ้น',
    '["ทบทวนศัพท์สำคัญก่อนเริ่มคาบ","เช็กว่ามีคำไหนที่ยังไม่ชัด","ค่อยเดินเข้าสู่เนื้อหาหลัก"]'::jsonb,
    0.73,
    'การทบทวนศัพท์สำคัญก่อนเริ่มคาบช่วยลดแรงเสียดทานเล็ก ๆ ที่ทำให้เด็กหลุดตั้งแต่ช่วงต้น',
    false,
    true,
    'approved',
    '2026-03-21 09:20:00+00',
    NULL,
    $${
      "version": 1,
      "mode": "action",
      "source": "llm",
      "teacherSummary": "ระบบเสนอให้เริ่มคาบด้วยการทบทวนศัพท์สำคัญสั้น ๆ เพื่อช่วยให้ห้องตั้งหลักได้ง่ายขึ้น",
      "situationHypothesis": "นักเรียนบางส่วนอาจยังเสียพลังไปกับการตีความศัพท์หรือคีย์เวิร์ดตั้งแต่ต้นคาบ",
      "recommendedTeacherMove": "ทบทวนศัพท์สำคัญสั้น ๆ ก่อนเริ่มเนื้อหาหลัก",
      "studentMessageDraft": "คาบถัดไปเราจะลองเริ่มด้วยการทบทวนศัพท์สำคัญสั้น ๆ ก่อน เพื่อช่วยให้ทุกคนตั้งหลักกับเนื้อหาได้ง่ายขึ้น",
      "teacherActionPlan": [
        "ทบทวนศัพท์สำคัญก่อนเริ่มคาบ",
        "เช็กว่ามีคำไหนที่ยังไม่ชัด",
        "ค่อยเดินเข้าสู่เนื้อหาหลัก"
      ],
      "watchSignals": [
        "นักเรียนตามช่วงต้นคาบได้เร็วขึ้นหรือไม่",
        "คำถามเรื่องคำศัพท์ลดลงหรือไม่",
        "ห้องนิ่งขึ้นก่อนเข้าสู่โจทย์หลักหรือไม่"
      ],
      "whyThisHelps": "การลดแรงสะดุดเล็ก ๆ ตั้งแต่ต้นคาบช่วยให้ห้องตั้งหลักได้ไวขึ้นและไม่เสียพลังไปกับความไม่ชัดเจน",
      "postClassReflectionPrompt": "ถ้าลองใช้ในคาบถัดไป เด็กตอบสนองอย่างไร และยังมีจุดไหนควรปรับอีก"
    }$$::jsonb,
    'not_actioned',
    '2026-03-21 09:05:00+00',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-03-21 09:20:00+00',
    '50000000-0000-0000-0000-000000000003'
  )
ON CONFLICT (id) DO UPDATE
SET
  class_id = EXCLUDED.class_id,
  teacher_id = EXCLUDED.teacher_id,
  content = EXCLUDED.content,
  status = EXCLUDED.status,
  dismissal_reason = EXCLUDED.dismissal_reason,
  action_taken_note = EXCLUDED.action_taken_note,
  communicated_to_students = EXCLUDED.communicated_to_students,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at,
  policy_level = EXCLUDED.policy_level,
  ai_message_draft = EXCLUDED.ai_message_draft,
  actions_json = EXCLUDED.actions_json,
  confidence_score = EXCLUDED.confidence_score,
  reasoning = EXCLUDED.reasoning,
  inquiry_mode = EXCLUDED.inquiry_mode,
  fallback_used = EXCLUDED.fallback_used,
  teacher_approval_status = EXCLUDED.teacher_approval_status,
  teacher_acted_at = EXCLUDED.teacher_acted_at,
  teacher_action_note = EXCLUDED.teacher_action_note,
  structured_payload = EXCLUDED.structured_payload,
  action_status = EXCLUDED.action_status,
  teacher_approved_at = EXCLUDED.teacher_approved_at,
  teacher_implemented_at = EXCLUDED.teacher_implemented_at,
  teacher_feedback = EXCLUDED.teacher_feedback,
  feedback_sentiment = EXCLUDED.feedback_sentiment,
  feedback_confidence = EXCLUDED.feedback_confidence,
  closure_share_note = EXCLUDED.closure_share_note,
  not_actioned_at = EXCLUDED.not_actioned_at,
  restored_from_recommendation_id = EXCLUDED.restored_from_recommendation_id;

-- ============================================================
-- 7. School calendar
-- ============================================================

INSERT INTO public.school_days (school_id, date, is_school_day, reason) VALUES
  ('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::uuid, '2026-03-16', true,  'Monday'),
  ('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::uuid, '2026-03-17', true,  'Tuesday'),
  ('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::uuid, '2026-03-18', true,  'Wednesday'),
  ('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::uuid, '2026-03-19', true,  'Thursday'),
  ('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::uuid, '2026-03-20', true,  'Friday'),
  ('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::uuid, '2026-03-21', false, 'Songkran Holiday'),
  ('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::uuid, '2026-03-22', false, 'Songkran Holiday'),
  ('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::uuid, '2026-03-23', false, 'Songkran Holiday'),
  ('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::uuid, '2026-03-24', false, 'Songkran Catch-up / Non-school day'),
  ('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::uuid, '2026-03-25', false, 'Non-school day'),
  ('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::uuid, '2026-03-26', true,  'Thursday'),
  ('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::uuid, '2026-03-27', true,  'Friday'),
  ('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::uuid, '2026-03-28', false, 'Weekend Saturday'),
  ('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::uuid, '2026-03-29', false, 'Weekend Sunday'),
  ('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::uuid, '2026-03-30', true,  'Monday'),
  ('d3b07384-d9a1-4e64-84ea-2b3812f521d0'::uuid, '2026-03-31', true,  'Tuesday')
ON CONFLICT (school_id, date) DO UPDATE
SET
  is_school_day = EXCLUDED.is_school_day,
  reason = EXCLUDED.reason;

-- ============================================================
-- End of presentation dataset
-- ============================================================
