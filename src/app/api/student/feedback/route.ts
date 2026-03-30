import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type {
    ClassClimateSummary,
    DailyClimateSummary,
    StudentFeedbackComparisonLabel,
    StudentFeedbackClimateRow,
    StudentFeedbackResponse,
} from "@/types";

type RecentActionRow = {
    id: string;
    action_taken_note: string | null;
    teacher_action_note: string | null;
    updated_at: string;
    teacher_approval_status: "pending" | "approved" | "dismissed" | null;
    status: string | null;
};

function toRecentActionStatusLabel(
    teacherApprovalStatus: RecentActionRow["teacher_approval_status"],
    status: RecentActionRow["status"]
) {
    if (teacherApprovalStatus === "approved") {
        return "ครูได้ดำเนินการแล้ว";
    }

    if (teacherApprovalStatus === "dismissed") {
        return "ครูได้รับทราบและอัปเดตแล้ว";
    }

    if (status === "approved" || status === "sent") {
        return "ครูได้อัปเดตแล้ว";
    }

    return "ครูได้รับความคิดเห็นแล้ว";
}

function getUtcWeekStart(date: Date) {
    const utc = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );
    const day = utc.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    utc.setUTCDate(utc.getUTCDate() + diffToMonday);
    return utc.toISOString().slice(0, 10);
}

function getMoodDescriptor(value: number | null) {
    if (value === null) return "ยังไม่มีข้อมูลรวมพอ";
    if (value <= 2) return "ค่อนข้างตึงและเปราะบาง";
    if (value <= 3) return "ยังตึงอยู่บ้าง";
    if (value <= 4) return "ค่อนข้างนิ่งขึ้น";
    return "ค่อนข้างสบายและมั่นคง";
}

function getPaceDescriptor(value: number | null) {
    if (value === null) return "ยังไม่มีข้อมูลรวมพอ";
    if (value < 3) return "ช้ากว่าปกติ";
    if (value > 3) return "เร็วกว่าปกติ";
    return "ใกล้เคียงปกติ";
}

function getFairnessDescriptor(value: number | null) {
    if (value === null) return "ยังไม่มีข้อมูลรวมพอ";
    if (value <= 2.5) return "ยังน่ากังวล";
    if (value <= 3.5) return "อยู่ในระดับกลาง";
    return "ค่อนข้างดี";
}

function getComparisonLabel(
    currentMood: number | null,
    lastWeekMood: number | null
): StudentFeedbackComparisonLabel {
    if (currentMood === null || lastWeekMood === null) {
        return "insufficient";
    }

    const delta = currentMood - lastWeekMood;
    if (delta >= 0.3) return "better";
    if (delta <= -0.3) return "worse";
    return "similar";
}

function weightedAverage<T extends keyof Pick<DailyClimateSummary, "avg_mood" | "avg_pace" | "avg_fairness">>(
    rows: DailyClimateSummary[],
    key: T
) {
    const validRows = rows.filter(
        (row) => row[key] !== null && row[key] !== undefined && (row.total_responses ?? 0) > 0
    );

    if (validRows.length === 0) {
        return null;
    }

    const totalWeight = validRows.reduce(
        (sum, row) => sum + Number(row.total_responses ?? 0),
        0
    );

    if (totalWeight === 0) {
        return null;
    }

    const weightedSum = validRows.reduce(
        (sum, row) => sum + Number(row[key] ?? 0) * Number(row.total_responses ?? 0),
        0
    );

    return Number((weightedSum / totalWeight).toFixed(2));
}

function buildCurrentWeekSummary(
    currentWeekRows: DailyClimateSummary[],
    lastWeekMetric: StudentFeedbackClimateRow | null
) {
    if (currentWeekRows.length === 0) {
        return {
            summary: "ตอนนี้เริ่มมีข้อมูลแล้ว แต่ยังสรุปแนวโน้มได้ไม่ชัด",
            comparison_label: "insufficient" as const,
        };
    }

    const avgMood = weightedAverage(currentWeekRows, "avg_mood");
    const avgPace = weightedAverage(currentWeekRows, "avg_pace");
    const avgFairness = weightedAverage(currentWeekRows, "avg_fairness");
    const comparisonLabel = getComparisonLabel(avgMood, lastWeekMetric?.avg_mood ?? null);

    const comparisonText =
        comparisonLabel === "better"
            ? "อาทิตย์นี้บรรยากาศของห้องดูผ่อนลงเล็กน้อยเมื่อเทียบกับสัปดาห์ก่อน"
            : comparisonLabel === "worse"
              ? "อาทิตย์นี้บรรยากาศของห้องดูตึงขึ้นกว่าสัปดาห์ก่อนเล็กน้อย"
              : comparisonLabel === "similar"
                ? "อาทิตย์นี้บรรยากาศของห้องยังใกล้เคียงกับสัปดาห์ก่อน"
                : "อาทิตย์นี้เริ่มมีข้อมูลรวมของห้องแล้ว แต่ยังเทียบกับสัปดาห์ก่อนแบบชัดเจนไม่ได้";

    return {
        summary: `${comparisonText} ภาพรวมตอนนี้นักเรียนหลายคนดู${getMoodDescriptor(avgMood)} จังหวะคาบ${getPaceDescriptor(avgPace)} และความรู้สึกต่อความยุติธรรม${getFairnessDescriptor(avgFairness)}`,
        comparison_label: comparisonLabel,
    };
}

function buildLastWeekSummary(lastWeekMetric: StudentFeedbackClimateRow | null) {
    if (!lastWeekMetric || lastWeekMetric.avg_mood === null) {
        return "สัปดาห์ก่อนยังมีข้อมูลรวมไม่พอสำหรับสรุปบรรยากาศของห้องเรียนอย่างปลอดภัย";
    }

    return `สัปดาห์ก่อน ห้องเรียนมีบรรยากาศ${getMoodDescriptor(lastWeekMetric.avg_mood)} จังหวะคาบ${getPaceDescriptor(lastWeekMetric.avg_pace)} และความรู้สึกต่อความยุติธรรม${getFairnessDescriptor(lastWeekMetric.avg_fairness)}`;
}

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!profile || profile.role !== "student") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const requestedClassId = searchParams.get("classId");

        const { data: enrollments, error: enrollmentError } = await supabase
            .from("class_enrollments")
            .select("class_id")
            .eq("student_id", user.id);

        if (enrollmentError) {
            console.error("Feedback enrollment lookup error:", enrollmentError);
            return NextResponse.json(
                { error: "ไม่สามารถตรวจสอบสิทธิ์การเข้าถึงห้องเรียนได้" },
                { status: 500 }
            );
        }

        if (!enrollments || enrollments.length === 0) {
            return NextResponse.json(
                { error: "ยังไม่พบห้องเรียนที่คุณลงทะเบียนไว้" },
                { status: 404 }
            );
        }

        const enrolledClassIds = enrollments.map((enrollment) => enrollment.class_id);
        const serviceSupabase = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        let classId: string | null = null;

        if (requestedClassId) {
            if (!enrolledClassIds.includes(requestedClassId)) {
                // New per-class behavior: an explicit room must belong to the current student.
                return NextResponse.json(
                    { error: "คุณไม่มีสิทธิ์ดูข้อมูลห้องเรียนนี้" },
                    { status: 403 }
                );
            }
            classId = requestedClassId;
        } else {
            const { data: latestPulse, error: latestPulseError } = await serviceSupabase
                .from("student_pulses")
                .select("class_id")
                .eq("student_id", user.id)
                .in("class_id", enrolledClassIds)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (latestPulseError) {
                console.error("Feedback latest class lookup error:", latestPulseError);
                return NextResponse.json(
                    { error: "ไม่สามารถหาห้องเรียนล่าสุดได้" },
                    { status: 500 }
                );
            }

            classId = latestPulse?.class_id ?? null;
        }

        if (!classId) {
            return NextResponse.json(
                { error: "ยังไม่พบห้องเรียนล่าสุดสำหรับดู feedback" },
                { status: 404 }
            );
        }

        const [
            { data: classRecord, error: classError },
            { data: latestCheckIn, error: latestCheckInError },
            { data: climateSummary, error: rpcError },
            { data: dailySummary, error: dailyRpcError },
            { data: recentAction, error: recentActionError },
        ] = await Promise.all([
            serviceSupabase
                .from("classes")
                .select("name")
                .eq("id", classId)
                .maybeSingle(),
            serviceSupabase
                .from("student_pulses")
                .select("created_at")
                .eq("student_id", user.id)
                .eq("class_id", classId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
            supabase.rpc("get_class_climate_summary", {
                p_class_id: classId,
                p_weeks: 4,
            }),
            supabase.rpc("get_class_climate_daily", {
                p_class_id: classId,
                p_days: 14,
            }),
            serviceSupabase
                .from("recommendations")
                .select(
                    "id, action_taken_note, teacher_action_note, updated_at, teacher_approval_status, status"
                )
                .eq("class_id", classId)
                .eq("communicated_to_students", true)
                .or("teacher_action_note.not.is.null,action_taken_note.not.is.null")
                .order("updated_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
        ]);

        if (classError) {
            console.error("Feedback class metadata lookup error:", classError);
            return NextResponse.json(
                { error: "ไม่สามารถโหลดข้อมูลห้องเรียนได้" },
                { status: 500 }
            );
        }

        if (latestCheckInError) {
            console.error("Feedback latest check-in lookup error:", latestCheckInError);
        }

        if (rpcError) {
            console.error("Climate summary RPC error:", rpcError);
            return NextResponse.json(
                { error: "ไม่สามารถโหลดข้อมูลสรุปบรรยากาศห้องเรียนได้" },
                { status: 500 }
            );
        }

        if (dailyRpcError) {
            console.error("Daily climate summary RPC error:", dailyRpcError);
            return NextResponse.json(
                { error: "ไม่สามารถโหลดข้อมูลสรุปรายวันของห้องเรียนได้" },
                { status: 500 }
            );
        }

        if (recentActionError) {
            console.error("Feedback recent action lookup error:", recentActionError);
            return NextResponse.json(
                { error: "ไม่สามารถโหลดการตอบสนองล่าสุดจากครูได้" },
                { status: 500 }
            );
        }

        const recentActionRow = recentAction as RecentActionRow | null;
        const recentActionNote =
            recentActionRow?.teacher_action_note?.trim() ||
            recentActionRow?.action_taken_note?.trim() ||
            null;

        const climateRows: StudentFeedbackClimateRow[] = (
            (climateSummary || []) as ClassClimateSummary[]
        ).map((row) => ({
            week_start: String(row.week_start),
            avg_mood: row.avg_mood ?? null,
            avg_pace: row.avg_pace ?? null,
            avg_fairness: row.avg_fairness ?? null,
            total_responses: Number(row.check_in_count ?? 0),
        }));

        const currentWeekStart = getUtcWeekStart(new Date());
        const lastWeekMetric =
            [...climateRows]
                .filter((row) => row.week_start < currentWeekStart && row.avg_mood !== null)
                .sort((a, b) => b.week_start.localeCompare(a.week_start))
                .at(0) ?? null;

        const currentWeekRows = ((dailySummary || []) as DailyClimateSummary[]).filter(
            (row) => row.check_in_date >= currentWeekStart
        );

        const currentWeekOverview = buildCurrentWeekSummary(currentWeekRows, lastWeekMetric);
        const lastWeekSummary = buildLastWeekSummary(lastWeekMetric);

        const response: StudentFeedbackResponse = {
            class_id: classId,
            class_name: classRecord?.name ?? null,
            latest_check_in_at: latestCheckIn?.created_at ?? null,
            climate: climateRows,
            current_week: {
                week_start: currentWeekStart,
                summary: currentWeekOverview.summary,
                comparison_label: currentWeekOverview.comparison_label,
            },
            last_week: {
                week_start: lastWeekMetric?.week_start ?? null,
                summary: lastWeekSummary,
                metrics: lastWeekMetric,
            },
            recent_action:
                recentActionRow && recentActionNote
                    ? {
                          id: recentActionRow.id,
                          note: recentActionNote,
                          logged_at: recentActionRow.updated_at,
                          status_label: toRecentActionStatusLabel(
                              recentActionRow.teacher_approval_status,
                              recentActionRow.status
                          ),
                      }
                    : null,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Feedback API error:", error);
        return NextResponse.json(
            { error: "เกิดข้อผิดพลาดภายในระบบ" },
            { status: 500 }
        );
    }
}
