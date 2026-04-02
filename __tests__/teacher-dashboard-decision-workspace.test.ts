import { describe, expect, it } from "vitest";
import {
  buildTeacherActionContext,
  deriveHistoryStatus,
  filterHistoryRecommendations,
  isPendingRecommendation,
  mapRecommendationToViewModel,
} from "@/lib/teacherDashboard";
import type {
  ClassClimateSummary,
  ClassMetrics,
  Recommendation,
  StructuredRecommendationPayloadV1,
} from "@/types";

const climate: ClassClimateSummary[] = [
  {
    class_id: "class-1",
    week_start: "2026-03-30",
    avg_mood: 1,
    avg_pace: 2,
    avg_fairness: 3.3,
    check_in_count: 3,
  },
];

const metrics: ClassMetrics = {
  classId: "class-1",
  teacherId: "teacher-1",
  totalGenerated: 1,
  totalDecided: 0,
  total: 1,
  acceptedCount: 0,
  dismissedCount: 0,
  dismissalRate: 0,
  inquiryModeSuggested: false,
  teacherFlagInquiryMode: false,
  dismissalPatternConsecutive: 0,
  inquiryModeTriggeredAt: null,
  avgMoodScore: 1,
  totalSurveys: 3,
  lowMoodCount: 3,
  highMoodCount: 0,
  source: "test",
};

describe("decision workspace recommendation mapping", () => {
  it("prefers structured payload when present", () => {
    const payload: StructuredRecommendationPayloadV1 = {
      version: 1,
      mode: "action",
      source: "llm",
      teacherSummary: "ห้องนี้เริ่มตึงในช่วงต้นคาบ",
      situationHypothesis: "เด็กบางส่วนยังตั้งหลักไม่ทัน",
      recommendedTeacherMove: "เริ่มคาบด้วยการเช็กอินสั้น ๆ",
      studentMessageDraft:
        "วันนี้เราจะเริ่มด้วยการเช็กอินสั้น ๆ เพื่อให้ทุกคนตามทันมากขึ้น",
      teacherActionPlan: [
        "เปิดช่วงเช็กอินสั้น ๆ",
        "เช็กว่ายังติดตรงไหน",
      ],
      watchSignals: ["เด็กเริ่มถามมากขึ้นหรือไม่"],
      whyThisHelps: "ช่วยลดแรงกดดันในช่วงต้นคาบ",
      postClassReflectionPrompt: "หลังลองใช้แล้ว เด็กตอบสนองอย่างไร",
    };

    const recommendation: Recommendation = {
      id: "rec-1",
      class_id: "class-1",
      status: "pending",
      dismissal_reason: null,
      action_taken_note: null,
      communicated_to_students: false,
      created_at: "2026-04-02T00:00:00.000Z",
      updated_at: "2026-04-02T00:00:00.000Z",
      policy_level: "CRITICAL",
      ai_message_draft: "legacy",
      actions_json: ["legacy"],
      confidence_score: 0.82,
      reasoning: "legacy reasoning",
      inquiry_mode: false,
      fallback_used: false,
      structured_payload: payload,
      action_status: "pending",
    };

    const vm = mapRecommendationToViewModel(recommendation, climate, metrics);

    expect(vm.structuredPayload).toEqual(payload);
    expect(vm.studentFacingDraft).toContain("เช็กอินสั้น ๆ");
    expect(vm.teacherPlan).toEqual(payload.teacherActionPlan);
    expect(vm.watchSignals).toEqual(payload.watchSignals);
    expect(vm.actionStatus).toBe("pending");
  });

  it("builds a legacy fallback payload for older recommendations", () => {
    const legacyRecommendation: Recommendation = {
      id: "rec-2",
      class_id: "class-1",
      status: "approved",
      dismissal_reason: null,
      action_taken_note: null,
      communicated_to_students: false,
      created_at: "2026-04-02T00:00:00.000Z",
      updated_at: "2026-04-02T00:00:00.000Z",
      policy_level: "CRITICAL",
      ai_message_draft: "ลองเปิดช่วงคุยสั้น ๆ ก่อนเริ่มคาบถัดไป",
      actions_json: ["เปิดช่วงคุยสั้น ๆ", "ติดตามผลอีกครั้งในคาบหน้า"],
      confidence_score: 0.7,
      reasoning: "ภาพรวมอารมณ์ของห้องลดลงชัดในรอบล่าสุด",
      inquiry_mode: false,
      fallback_used: true,
      structured_payload: null,
      action_status: null,
    };

    const vm = mapRecommendationToViewModel(
      legacyRecommendation,
      climate,
      metrics,
    );
    const actionContext = buildTeacherActionContext(
      {
        latestWeekStart: "2026-03-30",
        latestResponseCount: 3,
        avgMood: 1,
        avgPace: 2,
        avgFairness: 3.3,
        totalWeeksWithData: 1,
        trend: "insufficient_data",
        summaryLine: "สัญญาณรวมของห้องยังเปราะบาง",
      },
      "CRITICAL",
      null,
      {
        pendingRecommendation: vm,
      },
    );

    expect(vm.structuredPayload?.version).toBe(1);
    expect(vm.teacherPlan.length).toBeGreaterThan(0);
    expect(actionContext.title).toBe("ข้อเสนอแนะที่ครูใช้ตัดสินใจได้");
    expect(actionContext.draftText).toContain("คุย");
  });

  it("flags pending recommendations through the shared helper", () => {
    expect(
      isPendingRecommendation({
        status: "pending",
        action_status: "pending",
        teacher_approval_status: "pending",
      }),
    ).toBe(true);
    expect(
      isPendingRecommendation({
        status: "approved",
        action_status: "approved",
        teacher_approval_status: "approved",
      }),
    ).toBe(false);
  });

  it("derives history status from action_status or legacy status", () => {
    expect(
      deriveHistoryStatus({
        status: "approved",
        action_status: null,
        teacher_approval_status: "approved",
      }),
    ).toBe("approved");
    expect(
      deriveHistoryStatus({
        status: "pending",
        action_status: "implemented",
        teacher_approval_status: "approved",
      }),
    ).toBe("implemented");
    expect(
      deriveHistoryStatus({
        status: "pending",
        action_status: null,
        teacher_approval_status: "pending",
      }),
    ).toBeNull();
  });

  it("filters history rows with the same source-of-truth used by the UI count", () => {
    const recommendations: Recommendation[] = [
      {
        id: "rec-pending",
        class_id: "class-1",
        status: "pending",
        dismissal_reason: null,
        action_taken_note: null,
        communicated_to_students: false,
        created_at: "2026-04-04T00:00:00.000Z",
        updated_at: "2026-04-04T00:00:00.000Z",
        ai_message_draft: "pending",
        action_status: "pending",
      },
      {
        id: "rec-approved",
        class_id: "class-1",
        status: "approved",
        dismissal_reason: null,
        action_taken_note: null,
        communicated_to_students: false,
        created_at: "2026-04-03T00:00:00.000Z",
        updated_at: "2026-04-03T00:00:00.000Z",
        ai_message_draft: "approved",
        action_status: "approved",
      },
      {
        id: "rec-legacy-dismissed",
        class_id: "class-1",
        status: "dismissed",
        dismissal_reason: "skip",
        action_taken_note: null,
        communicated_to_students: false,
        created_at: "2026-04-02T00:00:00.000Z",
        updated_at: "2026-04-02T00:00:00.000Z",
        ai_message_draft: "dismissed",
        action_status: null,
      },
    ];

    const historyRows = filterHistoryRecommendations(recommendations);
    expect(historyRows.map((row) => row.id)).toEqual([
      "rec-approved",
      "rec-legacy-dismissed",
    ]);
  });
});
