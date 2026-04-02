import { createClient } from "@/lib/supabase/server";
import {
  createClient as createServiceClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type {
  AuditBlockedReason,
  AuditEventType,
  AuditSignal,
  ClassClimateSummary,
  ClassMetrics,
  DailyClimateSummary,
  PolicyLevel,
  Recommendation,
  RecommendationConfidenceLabel,
  RecommendationRationaleTag,
  RecommendationViewModel,
  RedactedVoiceRpcRow,
  RedactedVoiceState,
  StudentFeedbackSummary,
  StudentFeedbackTrend,
} from "@/types";

function defaultMetrics(classId: string): ClassMetrics {
  return {
    classId,
    teacherId: "",
    totalGenerated: 0,
    totalDecided: 0,
    total: 0,
    acceptedCount: 0,
    dismissedCount: 0,
    dismissalRate: 0,
    inquiryModeSuggested: false,
    teacherFlagInquiryMode: false,
    dismissalPatternConsecutive: 0,
    inquiryModeTriggeredAt: null,
    avgMoodScore: null,
    totalSurveys: 0,
    lowMoodCount: 0,
    highMoodCount: 0,
    source: "fallback",
  };
}

function defaultAuditByClassIds(classIds: string[]) {
  return Object.fromEntries(
    classIds.map((classId) => [classId, null]),
  ) as Record<string, AuditSignal | null>;
}

function defaultClimateByClassIds(classIds: string[]) {
  return Object.fromEntries(
    classIds.map((classId) => [classId, [] as ClassClimateSummary[]]),
  ) as Record<string, ClassClimateSummary[]>;
}

function normalizeClassIds(classIds: string[]) {
  return [...new Set(classIds.filter(Boolean))];
}

type TeacherDashboardClient = SupabaseClient;

type RecommendationStatusRow = {
  policy_level: string | null;
  status: string | null;
};

export type TeacherDashboardOverviewClassRow = {
  id: string;
  name: string;
  description: string | null;
  invite_code: string | null;
  created_at: string;
  risk_level: string | null;
  risk_score: number | null;
  recommendations: RecommendationStatusRow[] | null;
};

export type TeacherDashboardOverviewData = {
  classRows: TeacherDashboardOverviewClassRow[];
  enrollmentCounts: Record<string, number>;
  metricsByClassId: Record<string, ClassMetrics>;
  auditByClassId: Record<string, AuditSignal | null>;
  climateByClassId: Record<string, ClassClimateSummary[]>;
};

export type TeacherMemberActivity = {
  student_id: string;
  check_in_count: number;
  last_check_in: string | null;
};

type MetricsRpcRow = {
  teacher_id: string | null;
  class_id: string | null;
  total_generated_recommendations: number | null;
  total_decided_recommendations: number | null;
  total_recommendations: number | null;
  accepted_count: number | null;
  dismissed_count: number | null;
  dismissal_rate: number | null;
  teacher_flag_inquiry_mode: boolean | null;
  dismissal_pattern_consecutive: number | null;
  inquiry_mode_triggered_at: string | null;
  avg_mood_score: number | null;
  total_surveys: number | null;
  low_mood_count: number | null;
  high_mood_count: number | null;
  source: string | null;
};

type AuditSignalRow = {
  class_id: string | null;
  event_type: unknown;
  policy_selected: string | null;
  blocked_reason: unknown;
  decision_path_json: unknown;
  created_at?: string | null;
  timestamp?: string | null;
};

export type TeacherDisplayRiskLevel = PolicyLevel | "NO_DATA";

export function deriveAggregateRiskLevel(
  climate: ClassClimateSummary[],
): PolicyLevel | null {
  const comparableWeeks = latestComparableWeeks(climate);
  if (comparableWeeks.length < 2) {
    return null;
  }

  const latestWeek = comparableWeeks[0];

  if (!latestWeek || latestWeek.avg_mood === null) {
    return null;
  }

  if (latestWeek.avg_mood < 2.5) {
    return "CRITICAL";
  }

  if (latestWeek.avg_mood < 3.5) {
    return "WARNING";
  }

  return "ROUTINE";
}

export function derivePendingRecommendationRiskLevel(
  policyLevels: Array<string | null | undefined>,
): PolicyLevel | null {
  if (
    policyLevels.some((level) => typeof level === "string" && level.length > 0)
  ) {
    return "WARNING";
  }

  return null;
}

export function deriveTeacherDisplayRiskLevel(
  climate: ClassClimateSummary[],
  policyLevels: Array<string | null | undefined> = [],
): TeacherDisplayRiskLevel {
  return (
    deriveAggregateRiskLevel(climate) ??
    derivePendingRecommendationRiskLevel(policyLevels) ??
    "NO_DATA"
  );
}

export function getRiskScoreFromLevel(
  riskLevel: TeacherDisplayRiskLevel,
): number | null {
  switch (riskLevel) {
    case "CRITICAL":
      return 100;
    case "WARNING":
      return 50;
    case "ROUTINE":
      return 20;
    default:
      return null;
  }
}

function mapMetricsRowToClassMetrics(
  row: MetricsRpcRow | null | undefined,
  classId: string,
): ClassMetrics {
  if (!row) {
    return defaultMetrics(classId);
  }

  const dismissalRate = Number(row.dismissal_rate ?? 0);
  const dismissalPatternConsecutive = Number(
    row.dismissal_pattern_consecutive ?? 0,
  );
  const teacherFlagInquiryMode = row.teacher_flag_inquiry_mode === true;

  return {
    classId,
    teacherId: typeof row.teacher_id === "string" ? row.teacher_id : "",
    totalGenerated: Number(row.total_generated_recommendations ?? 0),
    totalDecided: Number(row.total_decided_recommendations ?? 0),
    total: Number(row.total_recommendations ?? 0),
    acceptedCount: Number(row.accepted_count ?? 0),
    dismissedCount: Number(row.dismissed_count ?? 0),
    dismissalRate,
    inquiryModeSuggested: deriveInquiryModeSuggested(
      teacherFlagInquiryMode,
      dismissalRate,
      dismissalPatternConsecutive,
    ),
    teacherFlagInquiryMode,
    dismissalPatternConsecutive,
    inquiryModeTriggeredAt: row.inquiry_mode_triggered_at ?? null,
    avgMoodScore:
      row.avg_mood_score == null ? null : Number(row.avg_mood_score),
    totalSurveys: Number(row.total_surveys ?? 0),
    lowMoodCount: Number(row.low_mood_count ?? 0),
    highMoodCount: Number(row.high_mood_count ?? 0),
    source: typeof row.source === "string" ? row.source : "supabase_rpc",
  };
}

function mapAuditRowToSignal(row: AuditSignalRow | null | undefined) {
  if (!row || typeof row.class_id !== "string") {
    return null;
  }

  const eventType = normalizeEventType(row.event_type);
  const decisionPath =
    row.decision_path_json && typeof row.decision_path_json === "object"
      ? (row.decision_path_json as Record<string, unknown>)
      : null;
  const blockedReason = normalizeBlockedReason(
    row.blocked_reason ??
      decisionPath?.blocked_reason ??
      decisionPath?.reason ??
      null,
    eventType,
  );

  return {
    classId: row.class_id,
    eventType,
    policySelected: row.policy_selected ?? null,
    blockedReason,
    createdAt: row.created_at ?? row.timestamp ?? null,
  } satisfies AuditSignal;
}

async function getDashboardRpcClient(supabase?: TeacherDashboardClient) {
  if (supabase) {
    return supabase;
  }

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  }

  return createClient();
}

function getTeacherDashboardServiceClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error("Missing Supabase service role configuration");
  }

  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function normalizeEventType(value: unknown): AuditEventType {
  if (typeof value !== "string") {
    return "other";
  }

  switch (value) {
    case "recommendation_generated":
    case "teacher_approval":
    case "frequency_guard":
    case "k_anonymity":
      return value;
    default:
      return "other";
  }
}

function normalizeBlockedReason(
  value: unknown,
  eventType: AuditEventType,
): AuditBlockedReason {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (
      normalized === "frequency_limit_exceeded" ||
      normalized.includes("daily limit") ||
      normalized.includes("weekly limit") ||
      normalized.includes("frequency")
    ) {
      return "frequency_limit_exceeded";
    }
    if (normalized === "k_anonymity" || normalized.includes("k-anonymity")) {
      return "k_anonymity";
    }
  }

  if (eventType === "frequency_guard") {
    return "frequency_limit_exceeded";
  }

  if (eventType === "k_anonymity") {
    return "k_anonymity";
  }

  return null;
}

function deriveInquiryModeSuggested(
  teacherFlagInquiryMode: boolean,
  dismissalRate: number,
  dismissalPatternConsecutive: number,
) {
  return (
    teacherFlagInquiryMode ||
    (dismissalRate > 0.6 && dismissalPatternConsecutive >= 2)
  );
}

function latestComparableWeeks(climate: ClassClimateSummary[]) {
  return [...climate]
    .filter((week) => week.avg_mood !== null)
    .sort((a, b) => b.week_start.localeCompare(a.week_start));
}

function deriveTrend(
  latestWeek: ClassClimateSummary | undefined,
  previousWeek: ClassClimateSummary | undefined,
): StudentFeedbackTrend {
  if (
    !latestWeek ||
    !previousWeek ||
    latestWeek.avg_mood === null ||
    previousWeek.avg_mood === null
  ) {
    return "insufficient_data";
  }

  const delta = latestWeek.avg_mood - previousWeek.avg_mood;
  if (delta >= 0.3) {
    return "up";
  }
  if (delta <= -0.3) {
    return "down";
  }
  return "flat";
}

function buildSummaryLine(
  latestWeek: ClassClimateSummary | undefined,
  trend: StudentFeedbackTrend,
  hasPendingRecommendation: boolean,
) {
  if (
    !latestWeek ||
    latestWeek.avg_mood === null ||
    trend === "insufficient_data"
  ) {
    return hasPendingRecommendation
      ? "มีฉบับร่างรออนุมัติ แต่ข้อมูลรวมยังไม่พอสำหรับสรุปความเสี่ยงของห้องนี้"
      : "ยังไม่มีข้อมูลพอสำหรับสรุปความเสี่ยงของห้องนี้";
  }

  if (trend === "down") {
    return "สัญญาณรวมของห้องอ่อนลงจากสัปดาห์ก่อนเล็กน้อย จึงควรติดตามบรรยากาศและการมีส่วนร่วมใกล้ชิดขึ้น";
  }

  if (trend === "up") {
    return "สภาพรวมของห้องกำลังฟื้นตัวจากสัปดาห์ก่อน และบรรยากาศดูมีเสถียรภาพขึ้น";
  }

  if (trend === "flat") {
    return "สภาพรวมของห้องค่อนข้างทรงตัวจากสัปดาห์ก่อน และยังควรติดตามต่อเนื่องแบบไม่เร่งเกินไป";
  }

  if (latestWeek.avg_mood <= 2) {
    return "สัญญาณรวมของห้องสะท้อนว่าบรรยากาศค่อนข้างเปราะบางในรอบล่าสุด";
  }

  if (latestWeek.avg_mood <= 3) {
    return "สัญญาณรวมของห้องเริ่มต่ำกว่าปกติและควรติดตามอย่างใกล้ชิด";
  }

  return "สัญญาณรวมของห้องยังอยู่ในเกณฑ์ค่อนข้างปกติในรอบล่าสุด";
}

function normalizeActions(actions: Recommendation["actions_json"]): string[] {
  if (Array.isArray(actions)) {
    return actions
      .map((value) =>
        typeof value === "string" ? value.trim() : String(value),
      )
      .filter(Boolean);
  }

  if (actions && typeof actions === "object") {
    return Object.entries(actions)
      .map(([key, value]) => `${key}: ${String(value)}`.trim())
      .filter(Boolean);
  }

  return [];
}

function getConfidenceLabel(
  score: number | null,
): RecommendationConfidenceLabel {
  if (score === null) {
    return null;
  }
  if (score >= 0.8) {
    return "สูง";
  }
  if (score >= 0.6) {
    return "กลาง";
  }
  return "ระวัง";
}

function getRationaleTag(
  recommendation: Recommendation,
  climate: ClassClimateSummary[],
): RecommendationRationaleTag {
  const reasoning = recommendation.reasoning?.toLowerCase() ?? "";
  const latestWeek = latestComparableWeeks(climate)[0];

  if (reasoning.includes("fair") || (latestWeek?.avg_fairness ?? 5) <= 2.5) {
    return "fairness_signal";
  }

  if (reasoning.includes("pace") || (latestWeek?.avg_pace ?? 5) <= 2.5) {
    return "pace_friction";
  }

  if (reasoning.includes("trend") || reasoning.includes("shift")) {
    return "trend_shift";
  }

  if ((latestWeek?.avg_mood ?? 5) <= 2.5 || reasoning.includes("mood")) {
    return "low_mood";
  }

  if (
    reasoning.includes("mixed") ||
    reasoning.includes("multiple") ||
    recommendation.fallback_used
  ) {
    return "mixed_signal";
  }

  return "unknown";
}

function buildReasoningSummary(
  recommendation: Recommendation,
  climate: ClassClimateSummary[],
  metrics: ClassMetrics,
): string | null {
  const latestWeek = latestComparableWeeks(climate)[0];
  const rationaleTag = getRationaleTag(recommendation, climate);

  if (recommendation.inquiry_mode || metrics.inquiryModeSuggested) {
    return "ระบบกำลังชวนให้ครูช่วยเติมบริบทก่อน เพื่อให้คำแนะนำรอบถัดไปสอดคล้องกับห้องนี้มากขึ้น";
  }

  if (rationaleTag === "low_mood") {
    return "สัญญาณรวมของห้องบอกว่าบรรยากาศล่าสุดค่อนข้างอ่อนลง ระบบจึงเสนอฉบับร่างนี้เพื่อช่วยพยุงห้องอย่างระมัดระวัง";
  }

  if (rationaleTag === "pace_friction") {
    return "มีสัญญาณรวมว่าจังหวะการเรียนอาจตึงเกินไปสำหรับบางช่วง ระบบจึงเสนอฉบับร่างที่ช่วยผ่อนแรงเสียดทาน";
  }

  if (rationaleTag === "fairness_signal") {
    return "สัญญาณรวมสะท้อนว่าความรู้สึกเรื่องความเป็นธรรมอาจแกว่งในช่วงล่าสุด จึงมีฉบับร่างนี้เพื่อช่วยสื่อสารอย่างนุ่มนวล";
  }

  if (rationaleTag === "trend_shift") {
    return "ระบบเห็นการเปลี่ยนแปลงของแนวโน้มรวมเมื่อเทียบกับรอบก่อน จึงเสนอฉบับร่างนี้เพื่อให้ครูติดตามแบบทันจังหวะ";
  }

  if (recommendation.fallback_used) {
    return "ฉบับร่างนี้อิงกฎความปลอดภัยและสัญญาณรวมของห้อง เพื่อให้ยังคงได้ข้อเสนอที่พอใช้ได้แม้ความมั่นใจของโมเดลไม่สูงมาก";
  }

  if (recommendation.reasoning) {
    const compact = recommendation.reasoning
      .replace(/\s+/g, " ")
      .replace(/^[\s"'`]+|[\s"'`]+$/g, "")
      .slice(0, 180);
    return compact || null;
  }

  if (latestWeek?.avg_mood !== null && latestWeek?.avg_mood !== undefined) {
    return "ฉบับร่างนี้อ้างอิงสัญญาณรวมล่าสุดของห้อง และพยายามเสนอข้อความที่เหมาะกับระดับความเสี่ยงปัจจุบัน";
  }

  return null;
}

export function mapRecommendationToViewModel(
  recommendation: Recommendation,
  climate: ClassClimateSummary[],
  metrics: ClassMetrics,
): RecommendationViewModel {
  const confidenceScore =
    typeof recommendation.confidence_score === "number"
      ? recommendation.confidence_score
      : null;

  return {
    id: recommendation.id,
    classId: recommendation.class_id,
    status: recommendation.status,
    createdAt: recommendation.created_at,
    policyLevel: recommendation.policy_level ?? null,
    priority: recommendation.priority ?? null,
    inquiryMode:
      recommendation.inquiry_mode === true || metrics.inquiryModeSuggested,
    fallbackUsed: recommendation.fallback_used === true,
    aiMessageDraft:
      recommendation.ai_message_draft ?? recommendation.content ?? null,
    actions: normalizeActions(recommendation.actions_json),
    confidenceScore,
    confidenceLabel: getConfidenceLabel(confidenceScore),
    reasoningSummary: buildReasoningSummary(recommendation, climate, metrics),
    rationaleTag: getRationaleTag(recommendation, climate),
    dismissalReason: recommendation.dismissal_reason ?? null,
    teacherActionNote:
      recommendation.teacher_action_note ??
      recommendation.action_taken_note ??
      null,
  };
}

export function mapRecommendationsToViewModels(
  recommendations: Recommendation[],
  climate: ClassClimateSummary[],
  metrics: ClassMetrics,
): RecommendationViewModel[] {
  return recommendations.map((recommendation) =>
    mapRecommendationToViewModel(recommendation, climate, metrics),
  );
}

export function buildStudentFeedbackSummary(
  climate: ClassClimateSummary[],
  metrics: ClassMetrics,
  options: { hasPendingRecommendation?: boolean } = {},
): StudentFeedbackSummary {
  const comparableWeeks = latestComparableWeeks(climate);
  const latestWeek = comparableWeeks[0];
  const previousWeek = comparableWeeks[1];
  const trend = deriveTrend(latestWeek, previousWeek);

  return {
    latestWeekStart: latestWeek?.week_start ?? null,
    latestResponseCount: latestWeek?.check_in_count ?? 0,
    avgMood: latestWeek?.avg_mood ?? metrics.avgMoodScore ?? null,
    avgPace: latestWeek?.avg_pace ?? null,
    avgFairness: latestWeek?.avg_fairness ?? null,
    totalWeeksWithData: comparableWeeks.length,
    trend,
    summaryLine: buildSummaryLine(
      latestWeek,
      trend,
      options.hasPendingRecommendation === true,
    ),
  };
}

export type TeacherActionContextMode = "pending" | "fallback" | "empty";

export interface TeacherActionContextSummary {
  mode: TeacherActionContextMode;
  title: string;
  summary: string;
  draftText: string | null;
  actionContext: string;
  actions: string[];
  sourceLabel: string | null;
}

function formatCompactScore(value: number | null) {
  return value === null ? "ยังไม่มีค่าเฉลี่ย" : `${value.toFixed(1)}/5`;
}

function describeTeacherTrend(trend: StudentFeedbackTrend) {
  switch (trend) {
    case "up":
      return "กำลังฟื้นตัว";
    case "down":
      return "อ่อนลงเล็กน้อย";
    case "flat":
      return "ค่อนข้างทรงตัว";
    default:
      return "ยังสรุปแนวโน้มไม่ได้";
  }
}

function buildFallbackTeacherActions(
  riskLevel: TeacherDisplayRiskLevel,
  blockedReason: AuditBlockedReason,
) {
  if (riskLevel === "CRITICAL") {
    return [
      "เปิดพื้นที่คุยสั้น ๆ กับห้อง",
      "เช็กนักเรียนที่อาจต้องการการช่วยเหลือเพิ่ม",
      "ติดตามผลในคาบถัดไปทันที",
    ];
  }

  if (riskLevel === "WARNING") {
    return [
      "ชวนสะท้อนสิ่งที่ติดขัดในคาบนี้",
      "ปรับจังหวะคาบและยกตัวอย่างให้ชัดขึ้น",
      "ติดตามสัญญาณรวมในรอบถัดไป",
    ];
  }

  if (blockedReason === "frequency_limit_exceeded") {
    return [
      "รอจังหวะที่เหมาะสมก่อนส่งการแจ้งเตือนซ้ำ",
      "เปิดประวัติการตอบสนองก่อนหน้าเพื่อดูบริบท",
      "เตรียมแผนคุยสั้น ๆ หากสัญญาณยังอ่อนลง",
    ];
  }

  return [
    "รักษาสิ่งที่ทำงานได้ดีในรอบนี้",
    "ติดตามสัญญาณรวมต่อเนื่อง",
    "บันทึกสิ่งที่อยากทำซ้ำในคาบถัดไป",
  ];
}

function buildFallbackTeacherDraft(
  feedbackSummary: StudentFeedbackSummary,
  riskLevel: TeacherDisplayRiskLevel,
  blockedReason: AuditBlockedReason,
) {
  const trendLabel = describeTeacherTrend(feedbackSummary.trend);
  const moodLabel = formatCompactScore(feedbackSummary.avgMood);
  const paceLabel = formatCompactScore(feedbackSummary.avgPace);
  const fairnessLabel = formatCompactScore(feedbackSummary.avgFairness);

  if (riskLevel === "CRITICAL") {
    return [
      `สัปดาห์ล่าสุดห้องนี้มี ${feedbackSummary.latestResponseCount} คำตอบ และแนวโน้มรวม ${trendLabel}.`,
      `คะแนนสะท้อนว่าอารมณ์เฉลี่ยอยู่ที่ ${moodLabel}, จังหวะคาบอยู่ที่ ${paceLabel}, และความยุติธรรมอยู่ที่ ${fairnessLabel}.`,
      "ระบบจึงสรุปว่าห้องนี้ควรได้รับการดูแลใกล้ชิดขึ้น พร้อมเปิดพื้นที่คุยสั้น ๆ และติดตามผลอย่างต่อเนื่อง.",
    ].join(" ");
  }

  if (riskLevel === "WARNING") {
    return [
      `สัปดาห์ล่าสุดห้องนี้มี ${feedbackSummary.latestResponseCount} คำตอบ และแนวโน้มรวม ${trendLabel}.`,
      `สัญญาณรวมยังไม่รุนแรงเท่าระดับวิกฤต แต่ค่าที่สะท้อนอารมณ์ ${moodLabel}, จังหวะคาบ ${paceLabel}, และความยุติธรรม ${fairnessLabel} บอกว่าควรติดตามเพิ่ม.`,
      blockedReason === "frequency_limit_exceeded"
        ? "รอบนี้ระบบชะลอการแจ้งเตือนซ้ำ แต่ยังบันทึกบริบทล่าสุดไว้ให้ครูใช้ตัดสินใจต่อได้."
        : "ระบบจึงเสนอให้ครูค่อย ๆ ปรับจังหวะคาบและตรวจดูว่ามีจุดใดที่ทำให้นักเรียนสะดุด.",
    ].join(" ");
  }

  return [
    `สัปดาห์ล่าสุดห้องนี้มี ${feedbackSummary.latestResponseCount} คำตอบ และแนวโน้มรวม ${trendLabel}.`,
    `ข้อมูลรวมยังอยู่ในเกณฑ์ที่พออ่านได้ และระบบจะเก็บสัญญาณนี้ไว้ให้ครูใช้เปรียบเทียบต่อในรอบถัดไป.`,
    "หากต้องการรายละเอียดเพิ่ม สามารถเปิดประวัติการตอบสนองหรือมุมมอง workspace ของห้องนี้ต่อได้.",
  ].join(" ");
}

export function buildTeacherActionContext(
  feedbackSummary: StudentFeedbackSummary,
  riskLevel: TeacherDisplayRiskLevel,
  blockedReason: AuditBlockedReason,
  options: {
    pendingRecommendation?: RecommendationViewModel | null;
    referenceRecommendation?: RecommendationViewModel | null;
  } = {},
): TeacherActionContextSummary {
  const pendingRecommendation = options.pendingRecommendation ?? null;
  const referenceRecommendation = options.referenceRecommendation ?? null;

  if (pendingRecommendation) {
    return {
      mode: "pending",
      title: "ฉบับร่างที่รออนุมัติ",
      summary:
        pendingRecommendation.reasoningSummary ??
        "Agentic AI สร้างฉบับร่างไว้แล้ว และกำลังรอให้ครูตรวจสอบก่อนส่งต่อ",
      draftText:
        pendingRecommendation.aiMessageDraft ??
        pendingRecommendation.reasoningSummary ??
        null,
      actionContext:
        pendingRecommendation.reasoningSummary ?? feedbackSummary.summaryLine,
      actions:
        pendingRecommendation.actions.length > 0
          ? pendingRecommendation.actions
          : buildFallbackTeacherActions(riskLevel, blockedReason),
      sourceLabel: "Agentic AI draft",
    };
  }

  if (riskLevel === "WARNING" || riskLevel === "CRITICAL") {
    const draftText =
      referenceRecommendation?.aiMessageDraft ??
      buildFallbackTeacherDraft(feedbackSummary, riskLevel, blockedReason);
    const actionContext =
      referenceRecommendation?.reasoningSummary ??
      buildFallbackTeacherDraft(feedbackSummary, riskLevel, blockedReason);

    return {
      mode: "fallback",
      title: referenceRecommendation
        ? "ฉบับร่างล่าสุดจาก Agentic AI"
        : "สรุปจากบริบทล่าสุด",
      summary:
        blockedReason === "frequency_limit_exceeded"
          ? "รอบนี้ระบบชะลอการแจ้งเตือนซ้ำ แต่ยังสรุปบริบทล่าสุดไว้ให้ครูอ่านต่อได้"
          : feedbackSummary.summaryLine,
      draftText,
      actionContext,
      actions: referenceRecommendation?.actions.length
        ? referenceRecommendation.actions
        : buildFallbackTeacherActions(riskLevel, blockedReason),
      sourceLabel: referenceRecommendation
        ? referenceRecommendation.status === "approved"
          ? "ฉบับร่างล่าสุดที่เคยอนุมัติ"
          : "ฉบับร่างล่าสุดจากรอบก่อน"
        : "fallback จากบริบทล่าสุด",
    };
  }

  return {
    mode: "empty",
    title: "ยังไม่มีฉบับร่าง",
    summary: feedbackSummary.summaryLine,
    draftText: null,
    actionContext:
      blockedReason === "k_anonymity"
        ? "ระบบยังไม่สร้างฉบับร่างใหม่เพราะข้อมูลรวมยังไม่ถึงเกณฑ์ความเป็นส่วนตัวขั้นต่ำ"
        : "ระบบกำลังรอดูสัญญาณรวมที่ชัดขึ้นก่อนจะสร้างฉบับร่างใหม่",
    actions: buildFallbackTeacherActions(riskLevel, blockedReason),
    sourceLabel: null,
  };
}

export function buildRedactedVoiceState(
  climate: ClassClimateSummary[],
): RedactedVoiceState {
  const comparableWeeks = latestComparableWeeks(climate);
  const latestWeek = comparableWeeks[0];

  if (!latestWeek || latestWeek.check_in_count < 3) {
    return {
      status: "insufficient_signal",
      snippets: [],
      message:
        "ยังมีสัญญาณรวมไม่พอสำหรับแสดงถ้อยคำสรุปแบบปลอดภัยในรอบนี้ ระบบจะรอจนมีข้อมูลรวมที่เพียงพอก่อน",
    };
  }

  return {
    status: "pipeline_pending",
    snippets: [],
    message:
      "ระบบสำหรับสรุปถ้อยคำที่ปกปิดข้อมูลยังไม่ถูกเชื่อมในเฟสนี้ จึงยังไม่แสดงถ้อยคำจากนักเรียน แม้จะมีสัญญาณรวมเพียงพอแล้ว",
  };
}

function hasAggregateSignal(climate: ClassClimateSummary[]) {
  return latestComparableWeeks(climate).some(
    (week) => week.check_in_count >= 3,
  );
}

export function buildRedactedVoiceStateFromRpc(
  climate: ClassClimateSummary[],
  snippets: RedactedVoiceRpcRow[] | null,
): RedactedVoiceState {
  if (snippets === null) {
    return buildRedactedVoiceState(climate);
  }

  if (snippets.length === 0) {
    return {
      status: "insufficient_signal",
      snippets: [],
      message: hasAggregateSignal(climate)
        ? "ยังไม่มีเสียงนักเรียนแบบรวมที่ปลอดภัยพอจะนำมาแสดงในช่วงนี้"
        : "ยังไม่มีสัญญาณรวมที่เพียงพอสำหรับแสดงเสียงนักเรียนที่ปกปิดข้อมูลระบุตัวตน",
    };
  }

  return {
    status: "ready",
    snippets: snippets.map((snippet) => ({
      id: snippet.id,
      text: snippet.text_redacted,
      tone: snippet.tone ?? "mixed",
    })),
    message:
      "ข้อความนี้เป็นเสียงนักเรียนที่ผ่านการลบข้อมูลระบุตัวตนและรวมจากหลายคนแล้ว",
  };
}

export async function getClassRedactedVoice(
  classId: string,
  weeks = 4,
): Promise<RedactedVoiceRpcRow[] | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_class_redacted_voice", {
    p_class_id: classId,
    p_weeks: weeks,
  });

  if (error) {
    console.warn("[teacher-dashboard][redacted_voice_rpc_error]", {
      classId,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return null;
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((row) => ({
      id: typeof row.id === "string" ? row.id : "",
      class_id: typeof row.class_id === "string" ? row.class_id : classId,
      week_start: typeof row.week_start === "string" ? row.week_start : "",
      tone:
        row.tone === "low" || row.tone === "mixed" || row.tone === "positive"
          ? row.tone
          : null,
      text_redacted:
        typeof row.text_redacted === "string" ? row.text_redacted : "",
      source_window:
        row.source_window && typeof row.source_window === "object"
          ? (row.source_window as Record<string, unknown>)
          : null,
      created_at: typeof row.created_at === "string" ? row.created_at : null,
    }))
    .filter((row) => row.id && row.text_redacted);
}

export async function getClassMetrics(classId: string): Promise<ClassMetrics> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_teacher_metrics", {
    p_class_id: classId,
    p_lookback_days: 30,
  });

  if (error) {
    console.error("[teacher-dashboard][metrics_error]", {
      classId,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return defaultMetrics(classId);
  }

  const row = (Array.isArray(data) ? data[0] : data) as MetricsRpcRow | null;
  return mapMetricsRowToClassMetrics(row, classId);
}

export async function getLatestAuditSignal(
  classId: string,
): Promise<AuditSignal | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("n8n_audit_logs")
    .select(
      "class_id, event_type, policy_selected, blocked_reason, decision_path_json, created_at",
    )
    .eq("class_id", classId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[teacher-dashboard][audit_error]", {
      classId,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  return mapAuditRowToSignal(data as AuditSignalRow);
}

async function getClassMetricsBatch(
  classIds: string[],
  supabase?: TeacherDashboardClient,
) {
  const uniqueClassIds = normalizeClassIds(classIds);
  if (uniqueClassIds.length === 0) {
    return {} as Record<string, ClassMetrics>;
  }

  const rpcClient = await getDashboardRpcClient(supabase);
  const { data, error } = await rpcClient.rpc("get_teacher_metrics_batch", {
    p_class_ids: uniqueClassIds,
    p_lookback_days: 30,
  });

  if (error) {
    console.warn("[teacher-dashboard][metrics_batch_error]", {
      classIds: uniqueClassIds,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    const legacyMetricsEntries = await Promise.all(
      uniqueClassIds.map(
        async (classId) => [classId, await getClassMetrics(classId)] as const,
      ),
    );

    return Object.fromEntries(legacyMetricsEntries) as Record<
      string,
      ClassMetrics
    >;
  }

  const rows = Array.isArray(data) ? (data as MetricsRpcRow[]) : [];
  const rowByClassId = new Map(
    rows
      .filter((row) => typeof row.class_id === "string")
      .map((row) => [row.class_id as string, row]),
  );

  return Object.fromEntries(
    uniqueClassIds.map((classId) => [
      classId,
      mapMetricsRowToClassMetrics(rowByClassId.get(classId), classId),
    ]),
  ) as Record<string, ClassMetrics>;
}

async function getLatestAuditSignalsByClassIds(
  classIds: string[],
  supabase?: TeacherDashboardClient,
) {
  const uniqueClassIds = normalizeClassIds(classIds);
  if (uniqueClassIds.length === 0) {
    return {} as Record<string, AuditSignal | null>;
  }

  const client = supabase ?? (await createClient());
  const { data, error } = await client
    .from("n8n_audit_logs")
    .select(
      "class_id, event_type, policy_selected, blocked_reason, decision_path_json, created_at",
    )
    .in("class_id", uniqueClassIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[teacher-dashboard][audit_batch_error]", {
      classIds: uniqueClassIds,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return defaultAuditByClassIds(uniqueClassIds);
  }

  const latestByClassId = new Map<string, AuditSignalRow>();
  for (const row of (data ?? []) as AuditSignalRow[]) {
    if (typeof row.class_id !== "string" || latestByClassId.has(row.class_id)) {
      continue;
    }

    latestByClassId.set(row.class_id, row);
  }

  return Object.fromEntries(
    uniqueClassIds.map((classId) => [
      classId,
      mapAuditRowToSignal(latestByClassId.get(classId)),
    ]),
  ) as Record<string, AuditSignal | null>;
}

export async function getClassDashboardSignals(
  classIds: string[],
  supabase?: TeacherDashboardClient,
) {
  const uniqueClassIds = normalizeClassIds(classIds);
  if (uniqueClassIds.length === 0) {
    return {
      metricsByClassId: {} as Record<string, ClassMetrics>,
      auditByClassId: {} as Record<string, AuditSignal | null>,
    };
  }

  const [metricsByClassId, auditByClassId] = await Promise.all([
    getClassMetricsBatch(uniqueClassIds, supabase),
    getLatestAuditSignalsByClassIds(uniqueClassIds, supabase),
  ]);

  return {
    metricsByClassId,
    auditByClassId,
  };
}

export async function getTeacherMemberActivityByClass(
  teacherId: string,
  classId: string,
  supabase?: TeacherDashboardClient,
) {
  const authClient = supabase ?? (await createClient());
  const { data: ownedClass, error: ownershipError } = await authClient
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (ownershipError) {
    throw ownershipError;
  }

  if (!ownedClass) {
    return {} as Record<string, TeacherMemberActivity>;
  }

  const serviceClient = getTeacherDashboardServiceClient();
  const { data, error } = await serviceClient
    .from("student_pulses")
    .select("student_id, created_at")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const activityByStudentId: Record<string, TeacherMemberActivity> = {};

  for (const row of data ?? []) {
    if (typeof row.student_id !== "string") {
      continue;
    }

    const existing = activityByStudentId[row.student_id];
    if (!existing) {
      activityByStudentId[row.student_id] = {
        student_id: row.student_id,
        check_in_count: 1,
        last_check_in:
          typeof row.created_at === "string" ? row.created_at : null,
      };
      continue;
    }

    existing.check_in_count += 1;
  }

  return activityByStudentId;
}

type TeacherDailyClimatePulseRow = {
  student_id: string | null;
  mood: number | null;
  pace: number | null;
  fairness: number | null;
  created_at: string | null;
  checkin_date?: string | null;
};

export async function getTeacherDailyClimateSummary(
  teacherId: string,
  classId: string,
  daysBack = 14,
  supabase?: TeacherDashboardClient,
): Promise<DailyClimateSummary[]> {
  const authClient = supabase ?? (await createClient());
  const { data: ownedClass, error: ownershipError } = await authClient
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (ownershipError) {
    throw ownershipError;
  }

  if (!ownedClass) {
    return [];
  }

  const serviceClient = getTeacherDashboardServiceClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Math.max(daysBack - 1, 0));
  cutoff.setHours(0, 0, 0, 0);

  const { data, error } = await serviceClient
    .from("student_pulses")
    .select("student_id, mood, pace, fairness, created_at, checkin_date")
    .eq("class_id", classId)
    .gte("created_at", cutoff.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const grouped = new Map<
    string,
    {
      moods: number[];
      paces: number[];
      fairnesses: number[];
      studentIds: Set<string>;
      totalResponses: number;
    }
  >();

  for (const row of (data ?? []) as TeacherDailyClimatePulseRow[]) {
    const dateKey =
      typeof row.checkin_date === "string" && row.checkin_date.length > 0
        ? row.checkin_date
        : typeof row.created_at === "string" && row.created_at.length > 0
          ? row.created_at.slice(0, 10)
          : null;

    if (!dateKey) {
      continue;
    }

    const entry = grouped.get(dateKey) ?? {
      moods: [],
      paces: [],
      fairnesses: [],
      studentIds: new Set<string>(),
      totalResponses: 0,
    };

    if (typeof row.student_id === "string" && row.student_id.length > 0) {
      entry.studentIds.add(row.student_id);
    }
    if (typeof row.mood === "number") {
      entry.moods.push(row.mood);
    }
    if (typeof row.pace === "number") {
      entry.paces.push(row.pace);
    }
    if (typeof row.fairness === "number") {
      entry.fairnesses.push(row.fairness);
    }
    entry.totalResponses += 1;

    grouped.set(dateKey, entry);
  }

  const average = (values: number[]) =>
    values.length > 0
      ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
      : null;

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([checkInDate, entry]) => {
      const hasAggregate = entry.studentIds.size >= 3;

      return {
        class_id: classId,
        check_in_date: checkInDate,
        avg_mood: hasAggregate ? average(entry.moods) : null,
        avg_pace: hasAggregate ? average(entry.paces) : null,
        avg_fairness: hasAggregate ? average(entry.fairnesses) : null,
        total_responses: entry.totalResponses,
      } satisfies DailyClimateSummary;
    });
}

export async function getClimateSummariesByClassIds(
  classIds: string[],
  weeks = 4,
  supabase?: TeacherDashboardClient,
) {
  const uniqueClassIds = normalizeClassIds(classIds);
  if (uniqueClassIds.length === 0) {
    return {} as Record<string, ClassClimateSummary[]>;
  }

  const rpcClient = await getDashboardRpcClient(supabase);
  const climateByClassId = defaultClimateByClassIds(uniqueClassIds);
  const { data, error } = await rpcClient.rpc(
    "get_class_climate_summary_batch",
    {
      p_class_ids: uniqueClassIds,
      p_weeks: weeks,
    },
  );

  if (error) {
    console.warn("[teacher-dashboard][climate_summary_batch_error]", {
      classIds: uniqueClassIds,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    const legacyEntries = await Promise.all(
      uniqueClassIds.map(async (classId) => {
        const { data: legacyData, error: legacyError } = await rpcClient.rpc(
          "get_class_climate_summary",
          {
            p_class_id: classId,
            p_weeks: weeks,
          },
        );

        if (legacyError) {
          console.warn("[teacher-dashboard][climate_summary_error]", {
            classId,
            message: legacyError.message,
            code: legacyError.code,
            details: legacyError.details,
            hint: legacyError.hint,
          });
          return [classId, []] as const;
        }

        return [classId, (legacyData ?? []) as ClassClimateSummary[]] as const;
      }),
    );

    return Object.fromEntries(legacyEntries) as Record<
      string,
      ClassClimateSummary[]
    >;
  }

  for (const row of (data ?? []) as ClassClimateSummary[]) {
    if (typeof row.class_id !== "string" || !climateByClassId[row.class_id]) {
      continue;
    }

    climateByClassId[row.class_id].push(row);
  }

  return climateByClassId;
}

export async function getTeacherDashboardOverviewData(
  teacherId: string,
  weeks = 4,
  supabase?: TeacherDashboardClient,
): Promise<TeacherDashboardOverviewData> {
  const client = supabase ?? (await createClient());
  const { data: classesData, error } = await client
    .from("classes")
    .select(
      "id, name, description, invite_code, created_at, risk_level, risk_score, recommendations(status, policy_level)",
    )
    .eq("teacher_id", teacherId)
    .is("archived_at", null)
    .order("name");

  if (error) {
    console.warn("[teacher-dashboard][classes_error]", {
      teacherId,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }

  const classRows = (classesData ?? []) as TeacherDashboardOverviewClassRow[];
  const classIds = classRows.map((classRow) => classRow.id);
  const uniqueClassIds = normalizeClassIds(classIds);

  if (uniqueClassIds.length === 0) {
    return {
      classRows,
      enrollmentCounts: {},
      metricsByClassId: {},
      auditByClassId: {},
      climateByClassId: {},
    };
  }

  const [
    { data: enrollments, error: enrollmentsError },
    dashboardSignals,
    climateByClassId,
  ] = await Promise.all([
    client
      .from("class_enrollments")
      .select("class_id")
      .in("class_id", uniqueClassIds),
    getClassDashboardSignals(uniqueClassIds, client),
    getClimateSummariesByClassIds(uniqueClassIds, weeks, client),
  ]);

  if (enrollmentsError) {
    console.error("[teacher-dashboard][enrollments_error]", {
      teacherId,
      classIds: uniqueClassIds,
      message: enrollmentsError.message,
      code: enrollmentsError.code,
      details: enrollmentsError.details,
      hint: enrollmentsError.hint,
    });
  }

  const enrollmentCounts: Record<string, number> = {};
  for (const enrollment of enrollments ?? []) {
    enrollmentCounts[enrollment.class_id] =
      (enrollmentCounts[enrollment.class_id] ?? 0) + 1;
  }

  return {
    classRows,
    enrollmentCounts,
    metricsByClassId: dashboardSignals.metricsByClassId,
    auditByClassId: dashboardSignals.auditByClassId,
    climateByClassId,
  };
}
