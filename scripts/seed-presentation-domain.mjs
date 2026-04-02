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
    invite_code: "7A9D2E11",
    risk_score: 0,
    pilot_status: true,
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    teacher_id: teacherId,
    school_id: schoolId,
    name: "กินหมูกระทะ",
    description: "No-data demo room used to show privacy-safe empty states.",
    invite_code: "88F2C0D9",
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
    teacher_action_note: "รับทราบและปรับจังหวะตามคำแนะนำ",
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
