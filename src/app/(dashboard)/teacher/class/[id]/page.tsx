import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ClassDetailClient from "./ClassDetailClient";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildRedactedVoiceStateFromRpc,
  buildTeacherActionContext,
  buildStudentFeedbackSummary,
  deriveTeacherDisplayRiskLevel,
  getClassRedactedVoice,
  getClassMetrics,
  getRiskScoreFromLevel,
  getLatestAuditSignal,
  mapRecommendationToViewModel,
  mapRecommendationsToViewModels,
} from "@/lib/teacherDashboard";

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
    historyCountResult,
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
    supabase
      .from("recommendations")
      .select(
        "id, class_id, content, status, dismissal_reason, action_taken_note, teacher_action_note, communicated_to_students, created_at, updated_at, policy_level, ai_message_draft, actions_json, confidence_score, reasoning, inquiry_mode, fallback_used, priority, alert_sent_at",
      )
      .eq("class_id", id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("recommendations")
      .select(
        "id, class_id, content, status, dismissal_reason, action_taken_note, teacher_action_note, communicated_to_students, created_at, updated_at, policy_level, ai_message_draft, actions_json, confidence_score, reasoning, inquiry_mode, fallback_used, priority, alert_sent_at",
      )
      .eq("class_id", id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("recommendations")
      .select("*", { count: "exact", head: true })
      .eq("class_id", id)
      .in("status", ["approved", "dismissed"]),
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
  const feedbackSummary = buildStudentFeedbackSummary(climateData, metrics, {
    hasPendingRecommendation: (pendingRecsResult.data ?? []).length > 0,
  });
  const derivedRiskLevel = deriveTeacherDisplayRiskLevel(
    climateData,
    (pendingRecsResult.data ?? []).map(
      (recommendation) => recommendation.policy_level ?? null,
    ),
  );
  const redactedVoice = buildRedactedVoiceStateFromRpc(
    climateData,
    redactedVoiceRows,
  );
  const recommendationViewModels = mapRecommendationsToViewModels(
    pendingRecsResult.data ?? [],
    climateData,
    metrics,
  );
  const latestRecommendationRow = Array.isArray(latestRecommendationResult.data)
    ? latestRecommendationResult.data[0] ?? null
    : latestRecommendationResult.data ?? null;
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
      historyCount={historyCountResult.count ?? 0}
      metrics={metrics}
      auditSignal={auditSignal}
      feedbackSummary={feedbackSummary}
      redactedVoice={redactedVoice}
    />
  );
}
