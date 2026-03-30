import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users } from "lucide-react";
import { ThaiRiskBadge } from "@/components/domain/teacher/ThaiRiskBadge";
import { deriveTeacherDisplayRiskLevel } from "@/lib/teacherDashboard";

type Props = { params: Promise<{ id: string }> };

interface MemberWithCheckIn {
  enrollment_id: string;
  joined_at: string;
  full_name: string;
  student_id: string;
  check_in_count: number;
  last_check_in: string | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select("name")
    .eq("id", id)
    .single();

  return { title: data?.name ? `สมาชิก — ${data.name}` : "Class Members" };
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatThaiDate(dateStr: string | null): string {
  if (!dateStr) return "ยังไม่เช็คอิน";
  const date = new Date(dateStr);
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function MembersQueryErrorState({
  inviteCode,
  message,
}: {
  inviteCode: string | null;
  message: string;
}) {
  return (
    <Card className="border-rose-300 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20">
      <CardContent className="flex flex-col justify-center py-12 text-center space-y-3">
        <Users className="w-12 h-12 text-rose-300 mx-auto" />
        <p className="text-rose-700 dark:text-rose-300 font-medium">
          โหลดรายชื่อสมาชิกไม่ได้
        </p>
        <p className="text-sm text-rose-600 dark:text-rose-400">
          {process.env.NODE_ENV === "development"
            ? message
            : "เกิดข้อผิดพลาดระหว่างโหลดรายชื่อสมาชิก กรุณาลองใหม่อีกครั้ง"}
        </p>
        {inviteCode && (
          <p className="text-sm text-slate-500">
            รหัสเชิญของห้องนี้คือ{" "}
            <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
              {inviteCode}
            </code>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function ClassMembersPage({ params }: Props) {
  const { id: classId } = await params;
  const supabase = await createClient();

  // 1. Get session and verify role = teacher
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user has teacher role
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher") {
    redirect("/login");
  }

  // 2. Verify this class belongs to this teacher
  const { data: classData } = await supabase
    .from("classes")
    .select("id, name, invite_code, teacher_id")
    .eq("id", classId)
    .single();

  if (!classData) {
    notFound();
  }

  if (classData.teacher_id !== user.id) {
    redirect("/teacher/classes");
  }

  const [climateResult, pendingRecsResult] = await Promise.all([
    supabase.rpc("get_class_climate_summary", {
      p_class_id: classId,
      p_weeks: 4,
    }),
    supabase
      .from("recommendations")
      .select("policy_level, status")
      .eq("class_id", classId)
      .eq("status", "pending"),
  ]);

  const climateData = Array.isArray(climateResult.data) ? climateResult.data : [];
  const derivedRiskLevel = deriveTeacherDisplayRiskLevel(
    climateData,
    (pendingRecsResult.data ?? []).map((recommendation) => recommendation.policy_level ?? null)
  );

  // 3. Fetch member list with enrollment data
  interface EnrollmentWithUser {
    created_at: string;
    student_id: string;
    users: { full_name: string | null } | { full_name: string | null }[] | null;
  }

  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("class_enrollments")
    .select(`
      created_at,
      student_id,
      users!inner(full_name)
    `)
    .eq("class_id", classId)
    .order("created_at", { ascending: false })
    .returns<EnrollmentWithUser[]>();

  if (enrollmentsError) {
    const debugMessage = JSON.stringify({
      classId,
      message: enrollmentsError.message,
      code: enrollmentsError.code,
      details: enrollmentsError.details,
      hint: enrollmentsError.hint,
    });

    console.error("[teacher/class/members][enrollments_error]", debugMessage);

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Link
            href={`/teacher/class/${classId}`}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                สมาชิก — {classData.name}
              </h1>
              <ThaiRiskBadge
                score={null}
                policyLevel={derivedRiskLevel === "NO_DATA" ? null : derivedRiskLevel}
                size="sm"
              />
            </div>
        </div>
        <MembersQueryErrorState
          inviteCode={classData.invite_code}
          message={enrollmentsError.message}
        />
      </div>
    );
  }

  // 4. Fetch check-in data for each student
  const members: MemberWithCheckIn[] = enrollments?.length
    ? await Promise.all(
        enrollments.map(async (enrollment) => {
          const profile = Array.isArray(enrollment.users)
            ? enrollment.users[0] ?? null
            : enrollment.users;
          const fullName = profile?.full_name || "ไม่ระบุชื่อ";

          const [{ data: lastCheckInData }, { count: checkInCount }] = await Promise.all([
            supabase
              .from("student_pulses")
              .select("created_at")
              .eq("student_id", enrollment.student_id)
              .eq("class_id", classId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from("student_pulses")
              .select("*", { count: "exact", head: true })
              .eq("student_id", enrollment.student_id)
              .eq("class_id", classId),
          ]);

          return {
            enrollment_id: `${classId}:${enrollment.student_id}`,
            joined_at: enrollment.created_at,
            full_name: fullName,
            student_id: enrollment.student_id,
            check_in_count: checkInCount || 0,
            last_check_in: lastCheckInData?.created_at || null,
          };
        })
      )
    : [];

  // Sort by full_name ASC
  members.sort((a, b) => a.full_name.localeCompare(b.full_name, "th"));

  // Status badge helper
  const getStatusBadge = (count: number) => {
    if (count >= 5) {
      return (
        <Badge
          variant="success"
          className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
        >
          สม่ำเสมอ
        </Badge>
      );
    }
    if (count >= 1) {
      return (
        <Badge
          variant="default"
          className="bg-sky-100 text-sky-700 hover:bg-sky-100"
        >
          เริ่มใช้งาน
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-gray-600">
        ยังไม่เช็คอิน
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          href={`/teacher/class/${classId}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                สมาชิก — {classData.name}
              </h1>
              <ThaiRiskBadge
                score={null}
                policyLevel={derivedRiskLevel === "NO_DATA" ? null : derivedRiskLevel}
                size="sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className="flex items-center gap-1.5 px-3 py-1"
              >
                <Users className="w-3.5 h-3.5" />
                {members.length} คน
              </Badge>
              {classData.invite_code && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-md">
                  <span className="text-slate-400">รหัสเชิญ:</span>
                  <code className="font-mono font-medium text-slate-700">
                    {classData.invite_code}
                  </code>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Member List */}
      {members.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-300" />
            <p className="text-slate-500 font-medium">ยังไม่มีนักเรียนในห้องเรียนนี้</p>
            <p className="text-sm text-slate-400">
              นักเรียนสามารถเข้าร่วมได้โดยใช้รหัสเชิญ{" "}
              <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                {classData.invite_code}
              </code>
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
          {members.map((member) => (
            <Card
              key={member.enrollment_id}
              className="border-slate-200 hover:border-sky-200 hover:shadow-sm transition-all"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Avatar with initials */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {getInitials(member.full_name)}
                  </div>

                  {/* Member info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {member.full_name}
                      </h3>
                      {getStatusBadge(member.check_in_count)}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500 flex-wrap">
                      <span>เข้าร่วม: {formatShortDate(member.joined_at)}</span>
                      <span className="text-slate-300">|</span>
                      <span>
                        เช็คอิน:{" "}
                        <span className="font-medium text-slate-700">
                          {member.check_in_count} ครั้ง
                        </span>
                      </span>
                      <span className="text-slate-300">|</span>
                      <span>
                        ล่าสุด:{" "}
                        <span
                          className={
                            member.last_check_in
                              ? "text-slate-700"
                              : "text-slate-400 italic"
                          }
                        >
                          {formatThaiDate(member.last_check_in)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
