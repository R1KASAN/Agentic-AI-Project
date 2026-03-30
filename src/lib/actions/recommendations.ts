"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  TeacherRecommendationRow,
  ApproveRecommendationSchema,
  DismissRecommendationSchema,
  ApproveRecommendationInput,
  DismissRecommendationInput,
  RecommendationWebhookPayload,
} from "@/lib/schemas/recommendations";

// ----------------------------------------------------------------------
// 1. Helper: Supabase Server Client
// ----------------------------------------------------------------------

/**
* Creates a server client with the active session and validates auth presence.
* Rejects access if session does not exist.
*/
async function getSupabaseServerClient() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized: Active session required.");
  }

  return { supabase, user };
}

function formatSupabaseError(error: unknown) {
  if (!error || typeof error !== "object") {
    return { message: "Unknown Supabase error" };
  }

  const candidate = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  return {
    message: candidate.message ?? "Unknown Supabase error",
    details: candidate.details ?? null,
    hint: candidate.hint ?? null,
    code: candidate.code ?? null,
  };
}

function stringifySupabaseError(error: unknown) {
  return JSON.stringify(formatSupabaseError(error));
}

function getApprovalWebhookUrl() {
  const rawUrl = process.env.N8N_APPROVAL_WEBHOOK_URL ?? process.env.N8N_WEBHOOK_URL ?? null;
  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    if (url.pathname === "/webhook/teacher-approval") {
      url.pathname =
        "/webhook/xskJ4wbN1sPJHR5U/teacher%2520approval%2520webhook/teacher-approval";
    }
    return url.toString();
  } catch {
    return rawUrl.replace(
      /\/webhook\/teacher-approval$/,
      "/webhook/xskJ4wbN1sPJHR5U/teacher%2520approval%2520webhook/teacher-approval"
    );
  }
}

function revalidateTeacherRoutes(classId: string) {
  revalidatePath("/teacher");
  revalidatePath("/teacher/classes");
  revalidatePath(`/teacher/class/${classId}`);
  revalidatePath(`/teacher/class/${classId}/responses`);
  revalidatePath("/teacher/recommendations");
}

function revalidateStudentFeedbackRoutes(classId: string) {
  revalidatePath("/student/feedback");
  revalidatePath(`/student/feedback?classId=${classId}`);
}

type RecommendationStatus =
  | "pending"
  | "approved"
  | "dismissed"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "DISMISSED"
  | "SENT"
  | null
  | undefined;

function normalizeRecommendationStatus(
  status: RecommendationStatus,
  teacherApprovalStatus: RecommendationStatus
): "pending" | "approved" | "dismissed" {
  const primary = (status ?? "").toString().toUpperCase();
  const approval = (teacherApprovalStatus ?? "").toString().toUpperCase();

  if (primary === "APPROVED" || approval === "APPROVED") {
    return "approved";
  }

  if (primary === "DISMISSED" || approval === "DISMISSED") {
    return "dismissed";
  }

  if (
    primary === "PENDING_APPROVAL" ||
    primary === "SENT" ||
    primary === "PENDING" ||
    approval === "PENDING"
  ) {
    return "pending";
  }

  return "pending";
}

async function getOwnedRecommendationContext(id: string, teacherId: string) {
  const supabase = await createClient();

  const { data: recommendation, error: recommendationError } = await supabase
    .from("recommendations")
    .select(
      `
        id,
        class_id,
        policy_level,
        ai_message_draft,
        content,
        inquiry_mode,
        confidence_score,
        status,
        teacher_approval_status,
        teacher_action_note,
        teacher_acted_at,
        created_at
      `
    )
    .eq("id", id)
    .single();

  if (recommendationError || !recommendation) {
    throw new Error("Recommendation not found");
  }

  const { data: ownedClass, error: classError } = await supabase
    .from("classes")
    .select("id, name")
    .eq("id", recommendation.class_id)
    .eq("teacher_id", teacherId)
    .single();

  if (classError || !ownedClass) {
    throw new Error("Forbidden or update failed");
  }

  return {
    supabase,
    recommendation,
    className: ownedClass.name ?? "Unknown class",
  };
}

async function triggerApprovalWebhook(payload: RecommendationWebhookPayload) {
  const webhookUrl = getApprovalWebhookUrl();
  if (!webhookUrl) {
    return { webhookFailed: false };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    return { webhookFailed: !response.ok };
  } catch (error) {
    console.error("[recommendations] approval webhook failed", error);
    return { webhookFailed: true };
  }
}

// ----------------------------------------------------------------------
// 2. Server Actions
// ----------------------------------------------------------------------

/**
* Fetch recommendations tied strictly to the authenticated teacher.
* Defaults to 50 items and 'pending' status unless specified.
*/
export async function getTeacherRecommendations(opts?: {
  limit?: number;
  status?: 'pending' | 'approved' | 'dismissed';
}): Promise<TeacherRecommendationRow[]> {
  try {
    const { supabase, user } = await getSupabaseServerClient();
    const limit = Math.min(opts?.limit || 50, 100);
    const targetStatus = opts?.status ?? "pending";

    const { data: ownedClasses, error: classesError } = await supabase
      .from("classes")
      .select("id,name")
      .eq("teacher_id", user.id)
      .is("archived_at", null)
      .order("name");

    if (classesError) {
      console.warn(
        `[recommendations] Error fetching teacher classes ${stringifySupabaseError(classesError)}`
      );
      return [];
    }

    const classIds = (ownedClasses ?? []).map((classRow) => classRow.id);

    console.warn("[recommendations][debug] owned classes", {
      userId: user.id,
      classCount: classIds.length,
      classIds,
      targetStatus,
    });

    if (classIds.length === 0) {
      return [];
    }

    const { data: recommendations, error: recommendationsError } = await supabase
      .from("recommendations")
      .select(`
        id,
        class_id,
        teacher_id,
        policy_level,
        ai_message_draft,
        content,
        inquiry_mode,
        confidence_score,
        status,
        teacher_approval_status,
        created_at,
        classes (
          name
        )
      `)
      .in("class_id", classIds)
      .order("created_at", { ascending: false })
      .limit(limit * 3);

    if (recommendationsError) {
      console.warn(
        `[recommendations] Error fetching recommendations ${stringifySupabaseError(recommendationsError)}`
      );
      return [];
    }

    const rawStatuses = Array.from(
      new Set(
        (recommendations ?? []).map((recommendation) =>
          `${recommendation.status ?? "null"}|${recommendation.teacher_approval_status ?? "null"}`
        )
      )
    );

    const rows = (recommendations ?? [])
      .map((recommendation) => {
        const normalizedStatus = normalizeRecommendationStatus(
          recommendation.status,
          recommendation.teacher_approval_status
        );
        const relatedClass = recommendation.classes as
          | { name?: string | null }
          | Array<{ name?: string | null }>
          | null;
        const className = Array.isArray(relatedClass)
          ? relatedClass[0]?.name ?? "Unknown class"
          : relatedClass?.name ?? "Unknown class";

        return {
          id: recommendation.id,
          class_id: recommendation.class_id,
          policy_level: recommendation.policy_level,
          ai_message_draft: recommendation.ai_message_draft ?? recommendation.content ?? "",
          inquiry_mode: recommendation.inquiry_mode ?? false,
          // The live recommendations table has not been migrated to decision_path_json yet.
          // Keep the contract stable for the UI and populate this once the DB schema catches up.
          decision_path_json: null,
          confidence_score: recommendation.confidence_score ?? 0,
          status: normalizedStatus,
          created_at: recommendation.created_at,
          classes: {
            name: className,
          },
        };
      })
      .filter((recommendation) => recommendation.status === targetStatus);

    console.warn("[recommendations][debug] fetched recommendations", {
      userId: user.id,
      rawCount: recommendations?.length ?? 0,
      matchedCount: rows.length,
      rawStatuses,
      targetStatus,
    });

    return rows
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, limit) as TeacherRecommendationRow[];
  } catch (error) {
    console.warn(
      `[recommendations] Unexpected failure while loading recommendations ${stringifySupabaseError(error)}`
    );
    return [];
  }
}

/**
* Approves a recommendation and dispatches an event to n8n webhook.
* Will not rollback DB commit if webhook trigger fails.
*/
export async function approveRecommendation(
  input: ApproveRecommendationInput
): Promise<{ success: boolean; webhookFailed?: boolean; }> {
  const parsed = ApproveRecommendationSchema.parse(input);
  const { user } = await getSupabaseServerClient();
  const now = new Date().toISOString();
  const trimmedNote = parsed.note.trim();
  const trimmedEditedDraft = parsed.editedDraft?.trim() ?? "";
  const shouldCommunicateToStudents = trimmedNote.length > 0;
  const { supabase, recommendation, className } = await getOwnedRecommendationContext(
    parsed.id,
    user.id
  );
  const approvedDraft =
    trimmedEditedDraft.length > 0
      ? trimmedEditedDraft
      : recommendation.ai_message_draft?.trim() ||
        recommendation.content?.trim() ||
        "";

  const { data: updatedRows, error: updateError } = await supabase
    .from("recommendations")
    .update({
      status: "approved",
      teacher_approval_status: "approved",
      ai_message_draft: approvedDraft,
      content: approvedDraft,
      teacher_action_note: shouldCommunicateToStudents ? trimmedNote : null,
      communicated_to_students: shouldCommunicateToStudents,
      teacher_acted_at: now,
    })
    .eq("id", parsed.id)
    .select(`
      id,
      class_id,
      policy_level,
      ai_message_draft,
      inquiry_mode,
      confidence_score,
      status,
      teacher_approval_status,
      teacher_action_note,
      teacher_acted_at,
      created_at
    `);

  if (updateError) {
    console.warn("[DB_ERROR] approving recommendation", updateError);
    throw new Error("Forbidden or update failed");
  }

  if (!updatedRows || updatedRows.length === 0) {
    console.warn(`[DB_ERROR] approving recommendation: 0 rows affected for ID ${parsed.id}. Verify RLS policies and ownership.`);
    throw new Error("Forbidden or update failed");
  }

  const updatedRow = updatedRows[0];
  const webhookPayload: RecommendationWebhookPayload = {
    event: "recommendation_approved",
    recommendation_id: updatedRow.id,
    teacher_id: user.id,
    teacher_email: user.email ?? "",
    note: trimmedNote,
    recommendation: {
      id: updatedRow.id,
      class_id: updatedRow.class_id,
      policy_level: updatedRow.policy_level,
      ai_message_draft:
        updatedRow.ai_message_draft ?? recommendation.ai_message_draft ?? recommendation.content ?? "",
      inquiry_mode: updatedRow.inquiry_mode ?? false,
      confidence_score: updatedRow.confidence_score ?? 0,
      status: normalizeRecommendationStatus(
        updatedRow.status,
        updatedRow.teacher_approval_status
      ),
      teacher_approval_status:
        normalizeRecommendationStatus(
          updatedRow.status,
          updatedRow.teacher_approval_status
        ) ?? "approved",
      teacher_action_note: updatedRow.teacher_action_note ?? null,
      teacher_acted_at: updatedRow.teacher_acted_at ?? null,
      created_at: updatedRow.created_at,
      classes: {
        name: className,
      },
    },
  };

  const { webhookFailed } = await triggerApprovalWebhook(webhookPayload);
  revalidateTeacherRoutes(updatedRow.class_id);
  if (shouldCommunicateToStudents) {
    revalidateStudentFeedbackRoutes(updatedRow.class_id);
  }

  return { success: true, webhookFailed };
}

/**
* Dismisses a recommendation assigning a required dismissal reason.
*/
export async function dismissRecommendation(
  input: DismissRecommendationInput
): Promise<{ success: boolean; }> {
  const parsed = DismissRecommendationSchema.parse(input);
  const { user } = await getSupabaseServerClient();
  const now = new Date().toISOString();
  const { supabase, recommendation } = await getOwnedRecommendationContext(
    parsed.id,
    user.id
  );

  const { error: updateError } = await supabase
    .from("recommendations")
    .update({
      status: "dismissed",
      teacher_approval_status: "dismissed",
      dismissal_reason: parsed.dismissalReason,
      teacher_acted_at: now,
    })
    .eq("id", parsed.id);

  if (updateError) {
    console.error("Failed to dismiss recommendation or record not found/owned by user:", updateError);
    throw new Error("Forbidden or update failed");
  }

  revalidateTeacherRoutes(recommendation.class_id);
  return { success: true };
}
