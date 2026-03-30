"use server";

import {
  approveRecommendation as approveRecommendationCore,
  dismissRecommendation as dismissRecommendationCore,
} from "@/lib/actions/recommendations";

type TeacherActionResult = {
  success: boolean;
  error?: string;
  webhookFailed?: boolean;
};

export async function approveRecommendation(
  id: string,
  note?: string,
  editedDraft?: string
): Promise<TeacherActionResult> {
  try {
    const result = await approveRecommendationCore({
      id,
      note: note ?? "",
      editedDraft,
    });
    return {
      success: result.success,
      webhookFailed: result.webhookFailed,
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
