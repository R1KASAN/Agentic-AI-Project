import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherClimateClient from "./TeacherClimateClient";
import {
  buildRedactedVoiceStateFromRpc,
  buildTeacherActionContext,
  buildStudentFeedbackSummary,
  deriveTeacherDisplayRiskLevel,
  getClassRedactedVoice,
  getTeacherDailyClimateSummary,
  getRiskScoreFromLevel,
  getTeacherDashboardOverviewData,
} from "@/lib/teacherDashboard";

export const metadata: Metadata = { title: "Class Climate | Class Climate Agent" };

type Props = {
  searchParams: Promise<{ classId?: string }>;
};

export default async function TeacherClimatePage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { classId } = await searchParams;
  const {
    classRows,
    enrollmentCounts,
    metricsByClassId,
    auditByClassId,
    climateByClassId,
  } = await getTeacherDashboardOverviewData(user.id, 4, supabase);

  const classes = classRows.map((cls) => {
    const climate = climateByClassId[cls.id] ?? [];
    const pendingRecommendations = (cls.recommendations ?? []).filter(
      (recommendation) => recommendation.status === "pending"
    );
    const riskLevel = deriveTeacherDisplayRiskLevel(
      climate,
      pendingRecommendations.map((recommendation) => recommendation.policy_level)
    );
    const metrics = metricsByClassId[cls.id];
    const feedbackSummary = buildStudentFeedbackSummary(climate, metrics, {
      hasPendingRecommendation: pendingRecommendations.length > 0,
    });
    const actionContext = buildTeacherActionContext(
      feedbackSummary,
      riskLevel,
      auditByClassId[cls.id]?.blockedReason ?? null,
    );

    return {
      id: cls.id,
      name: cls.name,
      description: cls.description ?? null,
      studentCount: enrollmentCounts[cls.id] ?? 0,
      riskLevel,
      riskScore: getRiskScoreFromLevel(riskLevel),
      pendingRecommendations: pendingRecommendations.length,
      inquiryModeSuggested: metrics?.inquiryModeSuggested ?? false,
      blockedReason: auditByClassId[cls.id]?.blockedReason ?? null,
      latestPolicySelected: auditByClassId[cls.id]?.policySelected ?? null,
      summaryLine: feedbackSummary.summaryLine,
      latestWeekStart: feedbackSummary.latestWeekStart,
      latestResponseCount: feedbackSummary.latestResponseCount,
      avgMood: feedbackSummary.avgMood,
      avgPace: feedbackSummary.avgPace,
      avgFairness: feedbackSummary.avgFairness,
      totalWeeksWithData: feedbackSummary.totalWeeksWithData,
      trend: feedbackSummary.trend,
      actionContext,
      climate,
      metrics,
    };
  });

  const selectedClass = classId
    ? classes.find((classEntry) => classEntry.id === classId) ?? null
    : null;

  if (classId && !selectedClass) {
    redirect("/teacher/climate");
  }

  const redactedVoiceRows = selectedClass
    ? await getClassRedactedVoice(selectedClass.id, 4)
    : null;
  const dailyClimate = selectedClass
    ? await getTeacherDailyClimateSummary(user.id, selectedClass.id, 14, supabase)
    : [];

  const selectedClimate = selectedClass
    ? {
        ...selectedClass,
        dailyClimate,
        redactedVoice: buildRedactedVoiceStateFromRpc(
          selectedClass.climate,
          redactedVoiceRows
        ),
      }
    : null;

  return (
    <TeacherClimateClient
      classes={classes}
      selectedClass={selectedClimate}
    />
  );
}
