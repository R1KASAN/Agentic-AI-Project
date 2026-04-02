import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ClassDetailClient from "./ClassDetailClient";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildRedactedVoiceStateFromRpc,
  buildTeacherActionContext,
  buildStudentFeedbackSummary,
  countRecommendationHistory,
  deriveTeacherDisplayRiskLevel,
  fetchRecommendationRowsByClassId,
  getClassRedactedVoice,
  getClassMetrics,
  getRiskScoreFromLevel,
  getLatestAuditSignal,
  mapRecommendationToViewModel,
  mapRecommendationsToViewModels,
} from "@/lib/teacherDashboard";
import { getFeatureFlags } from "@/lib/featureFlags";

type Props = { params: Promise<{ id: string }> };

function EnrollmentQueryErrorState({ message }: { message: string }) {
  return (
    <Card className="border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
      <CardContent className="py-6">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          ไม่สามารถโหลดจำนวนสมาชิกของห้องนี้ได้
        </p>
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
          {process.env.NODE_ENV === "development"
            ? message
            : "เกิดข้อผิดพลาดระหว่างโหลดข้อมูลสมาชิก กรุณาลองใหม่อีกครั้ง"}
        </p>
      </CardContent>
    </Card>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select("name")
    .eq("id", id)
    .single();

  return { title: data?.name ?? "รายละเอียดห้องเรียน" };
}

export default async function ClassDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // Parallel data fetching — no waterfall
  const [
    classResult,
    countResult,
    climateResult,
    pendingRecsResult,
    latestRecommendationResult,
    historyCount,
    metrics,
    auditSignal,
    redactedVoiceRows,
  ] = await Promise.all([
    supabase.from("classes").select("name, description, invite_code").eq("id", id).single(),
    supabase
      .from("class_enrollments")
      .select("*", { count: "exact", head: true })
      .eq("class_id", id),
    supabase.rpc("get_class_climate_summary", {
      p_class_id: id,
      p_weeks: 4,
    }),
    fetchRecommendationRowsByClassId(id, { status: "pending", limit: 10 }),
    fetchRecommendationRowsByClassId(id, { limit: 1 }),
    countRecommendationHistory(id),
    getClassMetrics(id),
    getLatestAuditSignal(id),
    getClassRedactedVoice(id, 4),
  ]);

  if (!classResult.data) {
    notFound();
  }

  if (countResult.error) {
    console.error("[teacher/class][enrollment_count_error]", {
      classId: id,
      message: countResult.error.message,
      code: countResult.error.code,
      details: countResult.error.details,
      hint: countResult.error.hint,
    });

    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {classResult.data.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            รหัสเชิญ: {classResult.data.invite_code}
          </p>
        </div>
        <EnrollmentQueryErrorState message={countResult.error.message} />
      </div>
    );
  }

  const rawClimate = climateResult.data;
  const climateData = Array.isArray(rawClimate) ? rawClimate : [];
  const pendingRecommendationRows = pendingRecsResult.data ?? [];
  const latestRecommendationRows = latestRecommendationResult.data ?? [];
  const feedbackSummary = buildStudentFeedbackSummary(climateData, metrics, {
    hasPendingRecommendation: pendingRecommendationRows.length > 0,
  });
  const derivedRiskLevel = deriveTeacherDisplayRiskLevel(
    climateData,
    pendingRecommendationRows.map(
      (recommendation) => recommendation.policy_level ?? null,
    ),
  );
  const redactedVoice = buildRedactedVoiceStateFromRpc(
    climateData,
    redactedVoiceRows,
  );
  const recommendationViewModels = mapRecommendationsToViewModels(
    pendingRecommendationRows,
    climateData,
    metrics,
  );
  const featureFlags = getFeatureFlags();
  const latestRecommendationRow = latestRecommendationRows[0] ?? null;
  const latestRecommendation = latestRecommendationRow
    ? mapRecommendationToViewModel(latestRecommendationRow, climateData, metrics)
    : null;
  const actionContext = buildTeacherActionContext(
    feedbackSummary,
    derivedRiskLevel,
    auditSignal?.blockedReason ?? null,
    {
      pendingRecommendation: recommendationViewModels[0] ?? null,
      referenceRecommendation: recommendationViewModels.length > 0
        ? recommendationViewModels[0]
        : latestRecommendation,
    },
  );

  return (
      <ClassDetailClient
      classId={id}
      className={classResult.data.name}
      classDescription={classResult.data.description ?? null}
      inviteCode={classResult.data.invite_code}
      riskScore={getRiskScoreFromLevel(derivedRiskLevel)}
      riskLevel={derivedRiskLevel === "NO_DATA" ? null : derivedRiskLevel}
      studentCount={countResult.count ?? 0}
      climate={climateData}
      recommendations={recommendationViewModels}
      latestRecommendation={latestRecommendation}
      actionContext={actionContext}
      historyCount={historyCount}
      metrics={metrics}
      auditSignal={auditSignal}
      feedbackSummary={feedbackSummary}
      redactedVoice={redactedVoice}
      featureFlags={featureFlags}
    />
  );
}
