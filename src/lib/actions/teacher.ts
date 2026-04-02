"use server";

import {
  approveRecommendation as approveRecommendationCore,
  dismissRecommendation as dismissRecommendationCore,
  markRecommendationImplemented as markRecommendationImplementedCore,
  saveRecommendationFeedback as saveRecommendationFeedbackCore,
  markRecommendationNotActioned as markRecommendationNotActionedCore,
  restoreRecommendationAsDraft as restoreRecommendationAsDraftCore,
} from "@/lib/actions/recommendations";

type TeacherActionResult = {
  success: boolean;
  error?: string;
  webhookFailed?: boolean;
  draftId?: string;
  reasonCode?:
    | "db_update_failed"
    | "db_state_not_changed"
    | "schema_mismatch"
    | "webhook_failed"
    | "forbidden_or_rls";
  recommendationId?: string;
  dbSnapshotAfterWrite?: {
    status: string | null;
    teacherApprovalStatus: string | null;
    communicatedToStudents: boolean;
    teacherActionNote: string | null;
  } | null;
};

export async function approveRecommendation(
  id: string,
  note?: string,
  editedDraft?: string,
  shareWithStudents = true,
): Promise<TeacherActionResult> {
  try {
    const result = await approveRecommendationCore({
      id,
      note: note ?? "",
      editedDraft,
      shareWithStudents,
    });
    return {
      success: result.success,
      webhookFailed: result.webhookFailed,
      reasonCode: result.reasonCode,
      recommendationId: result.recommendationId,
      dbSnapshotAfterWrite: result.dbSnapshotAfterWrite,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve recommendation.",
    };
  }
}

export async function dismissRecommendation(
  id: string,
  reason?: string
): Promise<TeacherActionResult> {
  try {
    const result = await dismissRecommendationCore({
      id,
      dismissalReason: reason?.trim() || "Dismissed by teacher",
    });
    return {
      success: result.success,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to dismiss recommendation.",
    };
  }
}

export async function markRecommendationImplemented(
  id: string,
  closureShareNote = "",
  shareWithStudents = false,
): Promise<TeacherActionResult> {
  try {
    const result = await markRecommendationImplementedCore({
      id,
      closureShareNote,
      shareWithStudents,
    });

    return {
      success: result.success,
      webhookFailed: result.webhookFailed,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to mark recommendation implemented.",
    };
  }
}

export async function saveRecommendationFeedback(
  id: string,
  feedback: string,
): Promise<TeacherActionResult> {
  try {
    const result = await saveRecommendationFeedbackCore({ id, feedback });
    return {
      success: result.success,
      webhookFailed: result.webhookFailed,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to save recommendation feedback.",
    };
  }
}

export async function markRecommendationNotActioned(
  id: string,
  reason = "",
): Promise<TeacherActionResult> {
  try {
    const result = await markRecommendationNotActionedCore({ id, reason });
    return {
      success: result.success,
      webhookFailed: result.webhookFailed,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to mark recommendation not actioned.",
    };
  }
}

export async function restoreRecommendationAsDraft(
  id: string,
): Promise<TeacherActionResult> {
  try {
    const result = await restoreRecommendationAsDraftCore({ id });
    return {
      success: result.success,
      draftId: result.draftId,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to restore recommendation as draft.",
    };
  }
}
