import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherClimateClient from "./TeacherClimateClient";
import {
  buildRedactedVoiceStateFromRpc,
  buildStudentFeedbackSummary,
  deriveTeacherDisplayRiskLevel,
  getClassRedactedVoice,
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

    return {
      id: cls.id,
      name: cls.name,
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

  const selectedClimate = selectedClass
    ? {
        ...selectedClass,
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
