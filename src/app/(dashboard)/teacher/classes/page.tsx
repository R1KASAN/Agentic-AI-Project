import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClientClasses } from "./client-classes";
import {
  deriveTeacherDisplayRiskLevel,
  getRiskScoreFromLevel,
  getTeacherDashboardOverviewData,
} from "@/lib/teacherDashboard";

export const metadata: Metadata = { title: "Manage Classrooms | Class Climate Agent" };

export default async function TeacherClassesPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

  const {
    classRows,
    enrollmentCounts,
    metricsByClassId,
    auditByClassId,
    climateByClassId,
  } = await getTeacherDashboardOverviewData(user.id, 4, supabase);

  const mappedClasses = classRows.map((cls) => ({
    ...(() => {
      const pendingRecs = (cls.recommendations || []).filter(
        (recommendation: { status: string | null }) => recommendation.status === "pending"
      );
      const riskLevel = deriveTeacherDisplayRiskLevel(
        climateByClassId[cls.id] ?? [],
        pendingRecs.map(
          (recommendation: { policy_level?: string | null }) =>
            recommendation.policy_level ?? null
        )
      );

      return {
        risk_level: riskLevel === "NO_DATA" ? null : riskLevel,
        risk_score: getRiskScoreFromLevel(riskLevel),
        pending_recommendations: pendingRecs.length,
      };
    })(),
    id: cls.id,
    name: cls.name,
    description: cls.description ?? null,
    invite_code: cls.invite_code || "",
    created_at: cls.created_at,
    student_count: enrollmentCounts[cls.id] || 0,
    inquiry_mode_suggested: metricsByClassId[cls.id]?.inquiryModeSuggested ?? false,
    blocked_reason: auditByClassId[cls.id]?.blockedReason ?? null,
    total_decided: metricsByClassId[cls.id]?.totalDecided ?? 0,
    dismissal_rate: metricsByClassId[cls.id]?.dismissalRate ?? 0,
    latest_policy_selected: auditByClassId[cls.id]?.policySelected ?? null,
  }));

    return (
        <ClientClasses classes={mappedClasses} />
    );
}
