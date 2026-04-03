import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing Supabase configuration. Expected NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const schoolId = "d3b07384-d9a1-4e64-84ea-2b3812f521d0";
const teacherId = "00000000-0000-0000-0000-000000000001";

const schools = [
  {
    id: schoolId,
    name: "Demo School (Presentation)",
    health_score: 100,
    last_calculated: new Date().toISOString(),
  },
];

const users = [
  { id: teacherId, role: "teacher", full_name: "Teacher Demo", avatar_url: null },
  { id: "00000000-0000-0000-0000-000000000002", role: "student", full_name: "Student One", avatar_url: null },
  { id: "00000000-0000-0000-0000-000000000003", role: "student", full_name: "Student Two", avatar_url: null },
  { id: "00000000-0000-0000-0000-000000000004", role: "student", full_name: "Student Three", avatar_url: null },
];

const teacherProfiles = [
  {
    user_id: teacherId,
    notification_frequency_pref: "ROUTINE",
    notification_channel_pref: "DASHBOARD",
    last_briefing_sent_at: null,
    briefing_count_7d: 0,
    briefing_approval_count_7d: 0,
    approval_rate_historical: null,
    implementation_rate_historical: null,
    action_latency_avg_hours: null,
    closure_rate_trend_7d: null,
    is_inquiry_mode: false,
    inquiry_mode_triggered_at: null,
    dismissal_pattern_consecutive: 0,
    dismissal_pattern_reason: null,
  },
];

const classes = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    teacher_id: teacherId,
    school_id: schoolId,
    name: "CS101 Introduction to Computing",
    description: "Main demo class for the approval workflow and positive climate trend.",
    invite_code: "54C9B1C4",
    risk_score: 0,
    pilot_status: true,
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    teacher_id: teacherId,
    school_id: schoolId,
    name: "gg",
    description: "Demo room for inquiry mode and a pending recommendation.",
    invite_code: "RM9HDHDP",
    risk_score: 0,
    pilot_status: true,
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    teacher_id: teacherId,
    school_id: schoolId,
    name: "กินหมูกระทะ",
    description: "No-data demo room used to show privacy-safe empty states.",
    invite_code: "08FD21EB",
    risk_score: 0,
    pilot_status: true,
  },
];

const enrollments = [
  ["10000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"],
  ["10000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000003"],
  ["10000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000004"],
  ["10000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000002"],
  ["10000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000003"],
  ["10000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000004"],
  ["10000000-0000-0000-0000-000000000003", "00000000-0000-0000-0000-000000000002"],
  ["10000000-0000-0000-0000-000000000003", "00000000-0000-0000-0000-000000000003"],
  ["10000000-0000-0000-0000-000000000003", "00000000-0000-0000-0000-000000000004"],
].map(([class_id, student_id]) => ({ class_id, student_id }));

const studentPulses = [
  ["40000000-0000-0000-0000-000000000001","10000000-0000-0000-0000-000000000001","00000000-0000-0000-0000-000000000002","good",4,5,"วันนี้เรียนเข้าใจง่ายและบรรยากาศดี","2026-03-16T08:05:00Z"],
  ["40000000-0000-0000-0000-000000000002","10000000-0000-0000-0000-000000000001","00000000-0000-0000-0000-000000000003","okay",3,4,"จังหวะคาบกำลังโอเค","2026-03-16T08:08:00Z"],
  ["40000000-0000-0000-0000-000000000003","10000000-0000-0000-0000-000000000001","00000000-0000-0000-0000-000000000004","great",4,4,"วันนี้ทุกคนช่วยกันดีมาก","2026-03-16T08:10:00Z"],
  ["40000000-0000-0000-0000-000000000004","10000000-0000-0000-0000-000000000001","00000000-0000-0000-0000-000000000002","great",4,5,"เริ่มชัดเจนขึ้นและตามทันมากขึ้น","2026-03-23T08:05:00Z"],
  ["40000000-0000-0000-0000-000000000005","10000000-0000-0000-0000-000000000001","00000000-0000-0000-0000-000000000003","good",3,4,"บรรยากาศสม่ำเสมอ","2026-03-23T08:08:00Z"],
  ["40000000-0000-0000-0000-000000000006","10000000-0000-0000-0000-000000000001","00000000-0000-0000-0000-000000000004","great",4,5,"วันนี้โอเคมาก","2026-03-23T08:10:00Z"],
  ["40000000-0000-0000-0000-000000000007","10000000-0000-0000-0000-000000000002","00000000-0000-0000-0000-000000000002","low",2,2,"วันนี้ยังตามไม่ค่อยทัน","2026-03-24T08:05:00Z"],
  ["40000000-0000-0000-0000-000000000008","10000000-0000-0000-0000-000000000002","00000000-0000-0000-0000-000000000003","okay",3,3,"อยากให้มีตัวอย่างเพิ่มอีกนิด","2026-03-24T08:08:00Z"],
  ["40000000-0000-0000-0000-000000000009","10000000-0000-0000-0000-000000000002","00000000-0000-0000-0000-000000000004","low",2,2,"ค่อนข้างเร็วไปเล็กน้อย","2026-03-24T08:10:00Z"],
].map(([id, class_id, student_id, mood, pace, fairness, optional_text, created_at]) => ({
  id,
  class_id,
  student_id,
  mood,
  pace,
  fairness,
  optional_text,
  created_at,
}));

const recommendations = [
  {
    id: "50000000-0000-0000-0000-000000000001",
    class_id: "10000000-0000-0000-0000-000000000001",
    teacher_id: teacherId,
    content: "สรุปภาพรวมคาบ CS101 ในรอบนี้ค่อนข้างนิ่งและนักเรียนตอบรับสม่ำเสมอ",
    status: "approved",
    dismissal_reason: null,
    action_taken_note: "ครูเริ่มคาบด้วยการทบทวนสั้น ๆ และปรับจังหวะให้ค่อยเป็นค่อยไป",
    communicated_to_students: true,
    created_at: "2026-03-24T09:00:00Z",
    updated_at: "2026-03-24T09:00:00Z",
    policy_level: "ROUTINE",
    ai_message_draft: "ครูอาจเริ่มต้นด้วยการเช็กอินสั้น ๆ และสรุปเป้าหมายของคาบให้ชัดขึ้น",
    actions_json: ["เริ่มด้วย check-in สั้น ๆ", "สรุปเป้าหมายของคาบ", "เปิดโอกาสให้นักเรียนถามคำถาม"],
    confidence_score: 0.91,
    reasoning: "คะแนนเฉลี่ยของห้องอยู่ในระดับปกติและมีแนวโน้มดีขึ้นในสัปดาห์ถัดมา",
    inquiry_mode: false,
    fallback_used: false,
    teacher_approval_status: "approved",
    teacher_acted_at: "2026-03-24T09:00:00Z",
    teacher_action_note:
      "ขอบคุณสำหรับฟีดแบ็กของห้อง คาบถัดไปเราจะเริ่มด้วยการเช็กอินสั้น ๆ และสรุปเป้าหมายของคาบให้ชัดขึ้นอีกนิด เพื่อให้ทุกคนตามทันมากขึ้น",
    structured_payload: {
      version: 1,
      mode: "action",
      source: "llm",
      teacherSummary:
        "ภาพรวมของ CS101 ค่อนข้างนิ่งและนักเรียนตอบรับสม่ำเสมอ จึงเหมาะกับการคงจังหวะคาบที่ชัดและอุ่นใจ",
      situationHypothesis:
        "นักเรียนส่วนใหญ่ตามเนื้อหาได้ดีขึ้นเมื่อครูเปิดคาบอย่างชัดเจนและเว้นพื้นที่ให้ถาม",
      recommendedTeacherMove:
        "เริ่มคาบด้วยการเช็กอินสั้น ๆ แล้วสรุปเป้าหมายของคาบให้ชัดก่อนเริ่มเนื้อหา",
      studentMessageDraft:
        "ขอบคุณสำหรับฟีดแบ็กของห้อง คาบถัดไปเราจะเริ่มด้วยการเช็กอินสั้น ๆ และสรุปเป้าหมายของคาบให้ชัดขึ้นอีกนิด เพื่อให้ทุกคนตามทันมากขึ้น",
      teacherActionPlan: [
        "เริ่มคาบด้วยการเช็กอินสั้น ๆ",
        "สรุปเป้าหมายของคาบให้ชัดก่อนเริ่มเนื้อหา",
        "เปิดช่วงให้ถามคำถามก่อนเดินต่อ",
      ],
      watchSignals: [
        "นักเรียนถามคำถามได้เร็วขึ้นหรือไม่",
        "ช่วงต้นคาบผ่อนลงและนิ่งขึ้นหรือไม่",
        "ยังมีจุดไหนที่นักเรียนบอกว่าตามไม่ทันอีกหรือไม่",
      ],
      whyThisHelps:
        "การเริ่มคาบอย่างชัดเจนและให้พื้นที่ถามตั้งแต่ต้นช่วยคงบรรยากาศที่นิ่งและลดแรงตึงสะสมระหว่างคาบ",
      postClassReflectionPrompt:
        "หลังใช้วิธีนี้แล้ว นักเรียนตอบสนองอย่างไร และจุดไหนของคาบที่ยังควรปรับต่อ",
    },
    action_status: "approved",
    teacher_approved_at: "2026-03-24T09:00:00Z",
    teacher_implemented_at: null,
    teacher_feedback: null,
    feedback_sentiment: null,
    feedback_confidence: null,
    closure_share_note:
      "ขอบคุณสำหรับฟีดแบ็กของห้อง คาบถัดไปเราจะเริ่มด้วยการเช็กอินสั้น ๆ และสรุปเป้าหมายของคาบให้ชัดขึ้นอีกนิด เพื่อให้ทุกคนตามทันมากขึ้น",
    not_actioned_at: null,
    restored_from_recommendation_id: null,
  },
  {
    id: "50000000-0000-0000-0000-000000000002",
    class_id: "10000000-0000-0000-0000-000000000002",
    teacher_id: teacherId,
    content: "ตัวอย่างคำแนะนำสำหรับห้อง gg เพื่อใช้เดโม inquiry mode",
    status: "pending",
    dismissal_reason: null,
    action_taken_note: null,
    communicated_to_students: false,
    created_at: "2026-03-25T09:00:00Z",
    updated_at: "2026-03-25T09:00:00Z",
    policy_level: "WARNING",
    ai_message_draft: "ระบบอยากให้ครูช่วยเติมบริบทเพิ่มเติมเกี่ยวกับสิ่งที่ทำให้นักเรียนยังไม่ตอบรับคำแนะนำในห้องนี้",
    actions_json: ["ถามครูถึงบริบทของห้อง", "รอข้อมูลเพิ่มเติมก่อนสรุป", "ปรับภาษาให้เหมาะกับชั้นเรียน"],
    confidence_score: 0.68,
    reasoning: "ข้อมูลรวมยังไม่พอสำหรับข้อสรุปที่มั่นใจ จึงเปิดโหมด inquiry เพื่อขอบริบทเพิ่ม",
    inquiry_mode: true,
    fallback_used: true,
    teacher_approval_status: "pending",
    teacher_acted_at: null,
    teacher_action_note: null,
    structured_payload: {
      version: 1,
      mode: "inquiry",
      source: "fallback",
      teacherSummary:
        "สัญญาณรวมของห้อง gg เริ่มอ่อนลง แต่ยังควรเติมบริบทจากครูอีกเล็กน้อยก่อนสรุปข้อความถึงนักเรียน",
      situationHypothesis:
        "ข้อมูลรวมบอกว่าห้องมีแรงตึงบางช่วงของคาบ แต่ยังไม่ชัดว่าควรเริ่มแก้ตรงจังหวะไหนก่อน",
      recommendedTeacherMove:
        "เติมบริบทสั้น ๆ ว่าช่วงไหนของคาบที่นักเรียนเริ่มเงียบหรือตามไม่ทัน",
      studentMessageDraft: null,
      teacherActionPlan: [
        "เติมบริบทสั้น ๆ ว่าปัญหาน่าจะเกิดช่วงไหนของคาบ",
        "บอกระบบว่าคุณครูอยากให้ช่วยต่อเรื่องใด",
        "ค่อยตัดสินใจอีกครั้งหลังได้บริบทเพิ่ม",
      ],
      watchSignals: [
        "ช่วงที่เด็กเริ่มเงียบพร้อมกัน",
        "กิจกรรมที่ทำให้เด็กถามน้อยลง",
        "จังหวะที่ครูรู้สึกว่าห้องเริ่มหลุดจากการมีส่วนร่วม",
      ],
      whyThisHelps:
        "การเติมบริบทจากครูก่อนจะช่วยให้ข้อเสนอรอบถัดไปตรงกับสถานการณ์จริงของห้องมากขึ้น",
      postClassReflectionPrompt: null,
    },
    action_status: "pending",
    teacher_approved_at: null,
    teacher_implemented_at: null,
    teacher_feedback: null,
    feedback_sentiment: null,
    feedback_confidence: null,
    closure_share_note: null,
    not_actioned_at: null,
    restored_from_recommendation_id: null,
  },
  {
    id: "50000000-0000-0000-0000-000000000003",
    class_id: "10000000-0000-0000-0000-000000000001",
    teacher_id: teacherId,
    content:
      "ห้องนี้น่าจะได้ผลดีถ้าเริ่มคาบด้วยการเช็กความเข้าใจสั้น ๆ ก่อนเดินโจทย์หลัก",
    status: "approved",
    dismissal_reason: null,
    action_taken_note:
      "ครูลองเริ่มคาบด้วยคำถามสั้น ๆ ก่อนเข้าสู่โจทย์หลัก และเห็นว่านักเรียนกล้าถามมากขึ้น",
    communicated_to_students: false,
    created_at: "2026-03-22T09:00:00Z",
    updated_at: "2026-03-23T10:30:00Z",
    policy_level: "WARNING",
    ai_message_draft:
      "คาบถัดไปเราจะเริ่มด้วยการเช็กความเข้าใจสั้น ๆ ก่อน เพื่อให้ทุกคนบอกได้ว่าตรงไหนยังติดอยู่ แล้วค่อยเดินโจทย์หลักต่อ",
    actions_json: [
      "เริ่มคาบด้วยการเช็กความเข้าใจสั้น ๆ",
      "ถามจุดที่ยังติดก่อนเดินโจทย์หลัก",
      "สังเกตว่านักเรียนกล้าถามมากขึ้นหรือไม่",
    ],
    confidence_score: 0.84,
    reasoning:
      "การเปิดพื้นที่ให้บอกจุดที่ยังติดก่อนเริ่มโจทย์หลักช่วยลดความเกร็งและทำให้ครูเห็นจุดสะดุดได้เร็วขึ้น",
    inquiry_mode: false,
    fallback_used: false,
    teacher_approval_status: "approved",
    teacher_acted_at: "2026-03-23T10:30:00Z",
    teacher_action_note:
      "ครูลองเริ่มคาบด้วยคำถามสั้น ๆ ก่อนเข้าสู่โจทย์หลัก และเห็นว่านักเรียนกล้าถามมากขึ้น",
    structured_payload: {
      version: 1,
      mode: "action",
      source: "fallback",
      teacherSummary:
        "ห้องนี้น่าจะได้ผลดีถ้าเริ่มคาบด้วยการเช็กความเข้าใจสั้น ๆ ก่อนเดินโจทย์หลัก",
      situationHypothesis:
        "นักเรียนบางส่วนยังต้องการพื้นที่ตั้งหลักก่อนเข้าสู่โจทย์หลัก จึงอาจเงียบหรือไม่กล้าถามตั้งแต่ต้นคาบ",
      recommendedTeacherMove:
        "เปิดช่วงเช็กความเข้าใจสั้น ๆ ก่อน แล้วค่อยเข้าสู่โจทย์หลัก",
      studentMessageDraft:
        "คาบถัดไปเราจะเริ่มด้วยการเช็กความเข้าใจสั้น ๆ ก่อน เพื่อให้ทุกคนบอกได้ว่าตรงไหนยังติดอยู่ แล้วค่อยเดินโจทย์หลักต่อ",
      teacherActionPlan: [
        "เริ่มคาบด้วยการเช็กความเข้าใจสั้น ๆ",
        "ถามจุดที่ยังติดก่อนเดินโจทย์หลัก",
        "สังเกตว่านักเรียนกล้าถามมากขึ้นหรือไม่",
      ],
      watchSignals: [
        "เด็กเริ่มตอบคำถามได้เร็วขึ้นหรือไม่",
        "ช่วงต้นคาบยังเงียบเหมือนเดิมหรือไม่",
        "คำถามซ้ำเรื่องโจทย์หลักลดลงหรือไม่",
      ],
      whyThisHelps:
        "การเริ่มจากจุดที่เด็กยังติดจะช่วยลดแรงกดดันและทำให้การมีส่วนร่วมกลับมาได้ง่ายขึ้น",
      postClassReflectionPrompt:
        "หลังลองใช้วิธีนี้แล้ว นักเรียนตอบสนองอย่างไร และช่วงไหนของคาบที่ยังควรปรับต่อ",
    },
    action_status: "feedback_logged",
    teacher_approved_at: "2026-03-22T09:15:00Z",
    teacher_implemented_at: "2026-03-23T09:40:00Z",
    teacher_feedback:
      "ลองใช้แล้ว เด็กตอบคำถามเร็วขึ้นและช่วงต้นคาบดูผ่อนลงกว่าก่อนหน้า",
    feedback_sentiment: "positive",
    feedback_confidence: 0.78,
    closure_share_note: null,
    not_actioned_at: null,
    restored_from_recommendation_id: null,
  },
  {
    id: "50000000-0000-0000-0000-000000000004",
    class_id: "10000000-0000-0000-0000-000000000001",
    teacher_id: teacherId,
    content:
      "ระบบเสนอให้เริ่มคาบด้วยการทบทวนศัพท์สำคัญสั้น ๆ เพื่อช่วยให้ห้องตั้งหลักได้ง่ายขึ้น",
    status: "approved",
    dismissal_reason: null,
    action_taken_note:
      "คาบนั้นเวลาไม่พอจึงยังไม่ได้ลองใช้ แต่เก็บข้อความนี้ไว้เป็นตัวเลือกสำหรับคาบถัดไป",
    communicated_to_students: false,
    created_at: "2026-03-21T09:00:00Z",
    updated_at: "2026-03-21T09:20:00Z",
    policy_level: "ROUTINE",
    ai_message_draft:
      "คาบถัดไปเราจะลองเริ่มด้วยการทบทวนศัพท์สำคัญสั้น ๆ ก่อน เพื่อช่วยให้ทุกคนตั้งหลักกับเนื้อหาได้ง่ายขึ้น",
    actions_json: [
      "ทบทวนศัพท์สำคัญก่อนเริ่มคาบ",
      "เช็กว่ามีคำไหนที่ยังไม่ชัด",
      "ค่อยเดินเข้าสู่เนื้อหาหลัก",
    ],
    confidence_score: 0.73,
    reasoning:
      "การทบทวนศัพท์สำคัญก่อนเริ่มคาบช่วยลดแรงเสียดทานเล็ก ๆ ที่ทำให้เด็กหลุดตั้งแต่ช่วงต้น",
    inquiry_mode: false,
    fallback_used: true,
    teacher_approval_status: "approved",
    teacher_acted_at: "2026-03-21T09:20:00Z",
    teacher_action_note: null,
    structured_payload: {
      version: 1,
      mode: "action",
      source: "llm",
      teacherSummary:
        "ระบบเสนอให้เริ่มคาบด้วยการทบทวนศัพท์สำคัญสั้น ๆ เพื่อช่วยให้ห้องตั้งหลักได้ง่ายขึ้น",
      situationHypothesis:
        "นักเรียนบางส่วนอาจยังเสียพลังไปกับการตีความศัพท์หรือคีย์เวิร์ดตั้งแต่ต้นคาบ",
      recommendedTeacherMove:
        "ทบทวนศัพท์สำคัญสั้น ๆ ก่อนเริ่มเนื้อหาหลัก",
      studentMessageDraft:
        "คาบถัดไปเราจะลองเริ่มด้วยการทบทวนศัพท์สำคัญสั้น ๆ ก่อน เพื่อช่วยให้ทุกคนตั้งหลักกับเนื้อหาได้ง่ายขึ้น",
      teacherActionPlan: [
        "ทบทวนศัพท์สำคัญก่อนเริ่มคาบ",
        "เช็กว่ามีคำไหนที่ยังไม่ชัด",
        "ค่อยเดินเข้าสู่เนื้อหาหลัก",
      ],
      watchSignals: [
        "นักเรียนตามช่วงต้นคาบได้เร็วขึ้นหรือไม่",
        "คำถามเรื่องคำศัพท์ลดลงหรือไม่",
        "ห้องนิ่งขึ้นก่อนเข้าสู่โจทย์หลักหรือไม่",
      ],
      whyThisHelps:
        "การลดแรงสะดุดเล็ก ๆ ตั้งแต่ต้นคาบช่วยให้ห้องตั้งหลักได้ไวขึ้นและไม่เสียพลังไปกับความไม่ชัดเจน",
      postClassReflectionPrompt:
        "ถ้าลองใช้ในคาบถัดไป เด็กตอบสนองอย่างไร และยังมีจุดไหนควรปรับอีก",
    },
    action_status: "not_actioned",
    teacher_approved_at: "2026-03-21T09:05:00Z",
    teacher_implemented_at: null,
    teacher_feedback: null,
    feedback_sentiment: null,
    feedback_confidence: null,
    closure_share_note: null,
    not_actioned_at: "2026-03-21T09:20:00Z",
    restored_from_recommendation_id:
      "50000000-0000-0000-0000-000000000003",
  },
];

const schoolDays = [
  ["2026-03-16", true, "Monday"],
  ["2026-03-17", true, "Tuesday"],
  ["2026-03-18", true, "Wednesday"],
  ["2026-03-19", true, "Thursday"],
  ["2026-03-20", true, "Friday"],
  ["2026-03-21", false, "Songkran Holiday"],
  ["2026-03-22", false, "Songkran Holiday"],
  ["2026-03-23", false, "Songkran Holiday"],
  ["2026-03-24", false, "Songkran Catch-up / Non-school day"],
  ["2026-03-25", false, "Non-school day"],
  ["2026-03-26", true, "Thursday"],
  ["2026-03-27", true, "Friday"],
  ["2026-03-28", false, "Weekend Saturday"],
  ["2026-03-29", false, "Weekend Sunday"],
  ["2026-03-30", true, "Monday"],
  ["2026-03-31", true, "Tuesday"],
].map(([date, is_school_day, reason]) => ({ school_id: schoolId, date, is_school_day, reason }));

async function upsert(table, rows, onConflict) {
  const query = supabase.from(table).upsert(rows, onConflict ? { onConflict } : undefined);
  const { error } = await query;
  if (error) {
    throw new Error(`Failed to upsert ${table}: ${error.message}`);
  }
  console.log(`UPSERTED ${table}: ${rows.length}`);
}

async function main() {
  await upsert("schools", schools, "id");
  await upsert("users", users, "id");
  await upsert("teacher_profiles", teacherProfiles, "user_id");
  await upsert("classes", classes, "id");
  await upsert("class_enrollments", enrollments, "class_id,student_id");
  await upsert("student_pulses", studentPulses, "id");
  await upsert("recommendations", recommendations, "id");
  await upsert("school_days", schoolDays, "school_id,date");

  const [classesCount, pulsesCount, recommendationsCount] = await Promise.all([
    supabase.from("classes").select("*", { count: "exact", head: true }),
    supabase.from("student_pulses").select("*", { count: "exact", head: true }),
    supabase.from("recommendations").select("*", { count: "exact", head: true }),
  ]);

  if (classesCount.error || pulsesCount.error || recommendationsCount.error) {
    throw new Error(
      classesCount.error?.message ||
        pulsesCount.error?.message ||
        recommendationsCount.error?.message ||
        "Verification failed"
    );
  }

  console.log(
    `Verification counts -> classes: ${classesCount.count}, student_pulses: ${pulsesCount.count}, recommendations: ${recommendationsCount.count}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
