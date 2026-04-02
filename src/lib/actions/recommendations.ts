"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  TeacherRecommendationRow,
  ApproveRecommendationSchema,
  DismissRecommendationSchema,
  MarkRecommendationImplementedSchema,
  SaveRecommendationFeedbackSchema,
  NotActionedRecommendationSchema,
  RestoreRecommendationAsDraftSchema,
  ApproveRecommendationInput,
  DismissRecommendationInput,
  MarkRecommendationImplementedInput,
  SaveRecommendationFeedbackInput,
  NotActionedRecommendationInput,
  RestoreRecommendationAsDraftInput,
  RecommendationWebhookPayload,
  StructuredRecommendationPayloadSchema,
} from "@/lib/schemas/recommendations";
import type { StructuredRecommendationPayloadV1 } from "@/types";

type ApprovalReasonCode =
  | "db_update_failed"
  | "db_state_not_changed"
  | "schema_mismatch"
  | "webhook_failed"
  | "forbidden_or_rls";

type ApprovalVerificationSnapshot = {
  status: string | null;
  teacherApprovalStatus: string | null;
  communicatedToStudents: boolean;
  teacherActionNote: string | null;
};

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

function getRecommendationsServiceClient() {
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

function buildApprovalVerificationSnapshot(
  row: Record<string, unknown> | null | undefined,
): ApprovalVerificationSnapshot | null {
  if (!row) {
    return null;
  }

  return {
    status: typeof row.status === "string" ? row.status : null,
    teacherApprovalStatus:
      typeof row.teacher_approval_status === "string"
        ? row.teacher_approval_status
        : null,
    communicatedToStudents: row.communicated_to_students === true,
    teacherActionNote:
      typeof row.teacher_action_note === "string"
        ? row.teacher_action_note
        : null,
  };
}

function mapApprovalErrorToReasonCode(error: unknown): ApprovalReasonCode {
  if (isMissingColumnError(error)) {
    return "schema_mismatch";
  }

  const candidate = error as {
    code?: string;
    message?: string;
  } | null;

  if (
    candidate?.code === "42501" ||
    candidate?.message?.toLowerCase().includes("permission") ||
    candidate?.message?.toLowerCase().includes("forbidden")
  ) {
    return "forbidden_or_rls";
  }

  return "db_update_failed";
}

function logApprovalStage(
  stage:
    | "approve:start"
    | "approve:update_retry_legacy"
    | "approve:update_error"
    | "approve:update_ok"
    | "approve:verify_error"
    | "approve:verify_failed"
    | "approve:webhook"
    | "approve:done",
  payload: Record<string, unknown>,
) {
  console.info("[recommendations][approval]", {
    stage,
    ...payload,
  });
}

function isMissingColumnError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: string;
    message?: string;
    details?: string;
  };

  return (
    candidate.code === "42703" ||
    candidate.code === "PGRST204" ||
    candidate.message?.includes("schema cache") === true ||
    candidate.message?.includes("Could not find the '") === true ||
    candidate.message?.includes("column recommendations.") === true ||
    candidate.details?.includes("column recommendations.") === true
  );
}

function normalizeRecommendationRow<T extends Record<string, unknown>>(row: T) {
  return {
    ...row,
    structured_payload:
      "structured_payload" in row ? row.structured_payload ?? null : null,
    action_status: "action_status" in row ? row.action_status ?? null : null,
    closure_share_note:
      "closure_share_note" in row ? row.closure_share_note ?? null : null,
    teacher_approved_at:
      "teacher_approved_at" in row ? row.teacher_approved_at ?? null : null,
    teacher_implemented_at:
      "teacher_implemented_at" in row ? row.teacher_implemented_at ?? null : null,
    teacher_feedback:
      "teacher_feedback" in row ? row.teacher_feedback ?? null : null,
    restored_from_recommendation_id:
      "restored_from_recommendation_id" in row
        ? row.restored_from_recommendation_id ?? null
        : null,
  };
}

async function fetchRecommendationByIdWithFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await supabase
      .from("recommendations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (isMissingColumnError(error)) {
        continue;
      }

      return { data: null, error };
    }

    return { data: data ? normalizeRecommendationRow(data) : null, error: null };
  }

  return {
    data: null,
    error: { code: "42703", message: "Recommendation schema mismatch" },
  };
}

async function updateRecommendationWithFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  attempts: Array<{
    patch: Record<string, unknown>;
  }>,
) {
  let retriedAfterMissingColumn = false;

  for (const attempt of attempts) {
    const { data, error } = await supabase
      .from("recommendations")
      .update(attempt.patch)
      .eq("id", id)
      .select("*");

    if (error) {
      if (isMissingColumnError(error)) {
        retriedAfterMissingColumn = true;
        continue;
      }

      return { data: null, error, retriedAfterMissingColumn };
    }

    return {
      data: Array.isArray(data) ? data.map(normalizeRecommendationRow) : null,
      error: null,
      retriedAfterMissingColumn,
    };
  }

  return {
    data: null,
    error: { code: "42703", message: "Recommendation schema mismatch" },
    retriedAfterMissingColumn,
  };
}

async function insertRecommendationWithFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  attempts: Array<Record<string, unknown>>,
) {
  for (const payload of attempts) {
    const { data, error } = await supabase
      .from("recommendations")
      .insert(payload)
      .select("id, class_id")
      .single();

    if (error) {
      if (isMissingColumnError(error)) {
        continue;
      }

      return { data: null, error };
    }

    return { data, error: null };
  }

  return {
    data: null,
    error: { code: "42703", message: "Recommendation schema mismatch" },
  };
}

async function getOwnedRecommendationContext(id: string, teacherId: string) {
  const supabase = await createClient();

  const {
    data: recommendation,
    error: recommendationError,
  } = await fetchRecommendationByIdWithFallback(supabase, id);

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

// Spec 2/6: recommendation rows keep a structured payload alongside legacy fields.
function parseStructuredPayload(
  value: unknown,
): StructuredRecommendationPayloadV1 | null {
  const parsed = StructuredRecommendationPayloadSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function mergeStructuredPayload(
  currentValue: unknown,
  patch: Partial<StructuredRecommendationPayloadV1>,
) {
  const current = parseStructuredPayload(currentValue);
  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...patch,
  } satisfies StructuredRecommendationPayloadV1;

  const parsed = StructuredRecommendationPayloadSchema.safeParse(next);
  return parsed.success ? parsed.data : current;
}

// Spec 4/5: restored drafts must reuse the student-facing message first so the
// teacher always lands on an editable response for students, not an internal summary.
function buildRestoredRecommendationDraft(
  recommendation: {
    ai_message_draft?: string | null;
    content?: string | null;
    teacher_action_note?: string | null;
    closure_share_note?: string | null;
    structured_payload?: unknown;
  },
) {
  const structuredPayload = parseStructuredPayload(recommendation.structured_payload);
  const restoredDraft =
    structuredPayload?.studentMessageDraft?.trim() ||
    recommendation.closure_share_note?.trim() ||
    recommendation.teacher_action_note?.trim() ||
    recommendation.ai_message_draft?.trim() ||
    recommendation.content?.trim() ||
    "";

  const nextStructuredPayload = structuredPayload
    ? mergeStructuredPayload(structuredPayload, {
        studentMessageDraft: restoredDraft.length > 0 ? restoredDraft : null,
      })
    : null;

  return {
    restoredDraft,
    structuredPayload: nextStructuredPayload,
  };
}

function classifyFeedbackSentiment(feedback: string) {
  const text = feedback.toLowerCase();
  const positiveHints = ["ดีขึ้น", "ดีมาก", "ตอบสนอง", "ผ่อนลง", "เข้าใจมากขึ้น"];
  const negativeHints = ["แย่", "ยังไม่ดี", "ไม่ช่วย", "ตึง", "เงียบเหมือนเดิม"];

  if (negativeHints.some((hint) => text.includes(hint))) {
    return { sentiment: "negative" as const, confidence: 0.78 };
  }

  if (positiveHints.some((hint) => text.includes(hint))) {
    return { sentiment: "positive" as const, confidence: 0.78 };
  }

  return { sentiment: "neutral" as const, confidence: 0.55 };
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
): Promise<{
  success: boolean;
  webhookFailed?: boolean;
  reasonCode?: ApprovalReasonCode;
  recommendationId: string;
  dbSnapshotAfterWrite?: ApprovalVerificationSnapshot | null;
}> {
  const parsed = ApproveRecommendationSchema.parse(input);
  const { user } = await getSupabaseServerClient();
  const now = new Date().toISOString();
  const trimmedNote = parsed.note.trim();
  const trimmedEditedDraft = parsed.editedDraft?.trim() ?? "";
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
  const shouldCommunicateToStudents =
    parsed.shareWithStudents && approvedDraft.length > 0;
  const internalContextNote = trimmedNote.length > 0 ? trimmedNote : null;
  const mergedStructuredPayload = mergeStructuredPayload(
    recommendation.structured_payload,
    {
      studentMessageDraft: shouldCommunicateToStudents
        ? approvedDraft
        : parseStructuredPayload(recommendation.structured_payload)
            ?.studentMessageDraft ?? approvedDraft,
    },
  );

  logApprovalStage("approve:start", {
    recommendationId: parsed.id,
    classId: recommendation.class_id,
    teacherId: user.id,
    shareWithStudents: parsed.shareWithStudents,
    shouldCommunicateToStudents,
  });

  const {
    data: updatedRows,
    error: updateError,
    retriedAfterMissingColumn,
  } =
    await updateRecommendationWithFallback(supabase, parsed.id, [
      {
        patch: {
          status: "approved",
          action_status: "approved",
          teacher_approval_status: "approved",
          ai_message_draft: approvedDraft,
          content: approvedDraft,
          teacher_action_note: shouldCommunicateToStudents ? approvedDraft : null,
          communicated_to_students: shouldCommunicateToStudents,
          closure_share_note: shouldCommunicateToStudents ? approvedDraft : null,
          structured_payload: mergedStructuredPayload,
          teacher_approved_at: now,
          teacher_acted_at: now,
          ...(internalContextNote
            ? { action_taken_note: internalContextNote }
            : {}),
        },
      },
      {
        patch: {
          status: "approved",
          teacher_approval_status: "approved",
          ai_message_draft: approvedDraft,
          content: approvedDraft,
          teacher_action_note: shouldCommunicateToStudents ? approvedDraft : null,
          communicated_to_students: shouldCommunicateToStudents,
          teacher_acted_at: now,
          ...(internalContextNote
            ? { action_taken_note: internalContextNote }
            : {}),
        },
      },
    ]);

  if (retriedAfterMissingColumn) {
    logApprovalStage("approve:update_retry_legacy", {
      recommendationId: parsed.id,
      classId: recommendation.class_id,
      teacherId: user.id,
      message: "Full schema update failed due to missing columns. Retried with legacy patch.",
    });
  }

  if (updateError) {
    const reasonCode = mapApprovalErrorToReasonCode(updateError);
    logApprovalStage("approve:update_error", {
      recommendationId: parsed.id,
      classId: recommendation.class_id,
      teacherId: user.id,
      reasonCode,
      error: formatSupabaseError(updateError),
    });
    return {
      success: false,
      reasonCode,
      recommendationId: parsed.id,
      dbSnapshotAfterWrite: null,
    };
  }

  if (!updatedRows || updatedRows.length === 0) {
    logApprovalStage("approve:update_error", {
      recommendationId: parsed.id,
      classId: recommendation.class_id,
      teacherId: user.id,
      reasonCode: "db_update_failed",
      error: "0 rows affected",
    });
    return {
      success: false,
      reasonCode: "db_update_failed",
      recommendationId: parsed.id,
      dbSnapshotAfterWrite: null,
    };
  }

  const updatedRow = updatedRows[0];
  const updatedSnapshot = buildApprovalVerificationSnapshot(updatedRow);
  logApprovalStage("approve:update_ok", {
    recommendationId: parsed.id,
    classId: recommendation.class_id,
    teacherId: user.id,
    snapshot: updatedSnapshot,
  });

  const {
    data: verifiedRow,
    error: verificationError,
  } = await fetchRecommendationByIdWithFallback(supabase, parsed.id);

  if (verificationError || !verifiedRow) {
    const reasonCode = verificationError
      ? mapApprovalErrorToReasonCode(verificationError)
      : "db_state_not_changed";
    logApprovalStage("approve:verify_error", {
      recommendationId: parsed.id,
      classId: recommendation.class_id,
      teacherId: user.id,
      reasonCode,
      error: verificationError ? formatSupabaseError(verificationError) : null,
    });
    return {
      success: false,
      reasonCode,
      recommendationId: parsed.id,
      dbSnapshotAfterWrite: updatedSnapshot,
    };
  }

  const verifiedSnapshot = buildApprovalVerificationSnapshot(verifiedRow);
  const normalizedVerifiedStatus = normalizeRecommendationStatus(
    typeof verifiedRow.status === "string" ? verifiedRow.status : null,
    typeof verifiedRow.teacher_approval_status === "string"
      ? verifiedRow.teacher_approval_status
      : null,
  );
  const verificationPassed =
    normalizedVerifiedStatus === "approved" &&
    verifiedSnapshot?.teacherApprovalStatus === "approved" &&
    (!shouldCommunicateToStudents ||
      (verifiedSnapshot?.communicatedToStudents === true &&
        (verifiedSnapshot.teacherActionNote?.trim().length ?? 0) > 0));

  if (!verificationPassed) {
    logApprovalStage("approve:verify_failed", {
      recommendationId: parsed.id,
      classId: recommendation.class_id,
      teacherId: user.id,
      expectedShared: shouldCommunicateToStudents,
      snapshot: verifiedSnapshot,
    });
    return {
      success: false,
      reasonCode: "db_state_not_changed",
      recommendationId: parsed.id,
      dbSnapshotAfterWrite: verifiedSnapshot,
    };
  }

  const webhookPayload: RecommendationWebhookPayload = {
    event: "recommendation_approved",
    recommendation_id: updatedRow.id,
    teacher_id: user.id,
    teacher_email: user.email ?? "",
    note: approvedDraft,
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
      action_status:
        updatedRow.action_status ??
        normalizeRecommendationStatus(
          updatedRow.status,
          updatedRow.teacher_approval_status,
        ),
      teacher_approval_status:
        normalizeRecommendationStatus(
          updatedRow.status,
          updatedRow.teacher_approval_status
        ) ?? "approved",
      teacher_action_note: updatedRow.teacher_action_note ?? null,
      structured_payload: parseStructuredPayload(updatedRow.structured_payload),
      teacher_acted_at: updatedRow.teacher_acted_at ?? null,
      created_at: updatedRow.created_at,
      classes: {
        name: className,
      },
    },
  };

  const { webhookFailed } = await triggerApprovalWebhook(webhookPayload);
  logApprovalStage("approve:webhook", {
    recommendationId: parsed.id,
    classId: recommendation.class_id,
    teacherId: user.id,
    webhookFailed,
    webhookUrl: getApprovalWebhookUrl(),
  });
  revalidateTeacherRoutes(updatedRow.class_id);
  if (shouldCommunicateToStudents) {
    revalidateStudentFeedbackRoutes(updatedRow.class_id);
  }

  logApprovalStage("approve:done", {
    recommendationId: parsed.id,
    classId: recommendation.class_id,
    teacherId: user.id,
    webhookFailed,
    snapshot: verifiedSnapshot,
  });

  return {
    success: true,
    webhookFailed,
    reasonCode: webhookFailed ? "webhook_failed" : undefined,
    recommendationId: parsed.id,
    dbSnapshotAfterWrite: verifiedSnapshot,
  };
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
      action_status: "dismissed",
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

// Spec 6: implemented is the explicit loop-closure step after the teacher tries the intervention.
export async function markRecommendationImplemented(
  input: MarkRecommendationImplementedInput,
): Promise<{ success: boolean; webhookFailed?: boolean }> {
  const parsed = MarkRecommendationImplementedSchema.parse(input);
  const { user } = await getSupabaseServerClient();
  const now = new Date().toISOString();
  const trimmedShareNote = parsed.closureShareNote.trim();
  const { supabase, recommendation, className } = await getOwnedRecommendationContext(
    parsed.id,
    user.id,
  );
  const structuredPayload = mergeStructuredPayload(recommendation.structured_payload, {});

  const { data: updatedRows, error } = await updateRecommendationWithFallback(
    supabase,
    parsed.id,
    [
      {
        patch: {
          action_status: "implemented",
          teacher_implemented_at: now,
          teacher_acted_at: now,
          closure_share_note:
            parsed.shareWithStudents && trimmedShareNote.length > 0
              ? trimmedShareNote
              : recommendation.closure_share_note ?? null,
          teacher_action_note:
            parsed.shareWithStudents && trimmedShareNote.length > 0
              ? trimmedShareNote
              : recommendation.teacher_action_note ?? null,
          communicated_to_students:
            parsed.shareWithStudents && trimmedShareNote.length > 0,
          structured_payload: structuredPayload,
        },
      },
      {
        patch: {
          teacher_acted_at: now,
          teacher_action_note:
            parsed.shareWithStudents && trimmedShareNote.length > 0
              ? trimmedShareNote
              : recommendation.teacher_action_note ?? null,
          communicated_to_students:
            parsed.shareWithStudents && trimmedShareNote.length > 0,
        },
      },
    ],
  );

  if (error || !updatedRows?.length) {
    throw new Error("Unable to mark recommendation as implemented");
  }

  const updatedRow = updatedRows[0];
  const { webhookFailed } = await triggerApprovalWebhook({
    event: "teacher_implemented",
    recommendation_id: updatedRow.id,
    teacher_id: user.id,
    teacher_email: user.email ?? "",
    note: trimmedShareNote,
    recommendation: {
      id: updatedRow.id,
      class_id: updatedRow.class_id,
      policy_level: updatedRow.policy_level,
      ai_message_draft: updatedRow.ai_message_draft ?? "",
      inquiry_mode: updatedRow.inquiry_mode ?? false,
      confidence_score: updatedRow.confidence_score ?? 0,
      status: normalizeRecommendationStatus(
        updatedRow.status,
        updatedRow.teacher_approval_status,
      ),
      action_status: updatedRow.action_status ?? "implemented",
      teacher_approval_status:
        normalizeRecommendationStatus(
          updatedRow.status,
          updatedRow.teacher_approval_status,
        ) ?? "approved",
      teacher_action_note: updatedRow.teacher_action_note ?? null,
      structured_payload: parseStructuredPayload(updatedRow.structured_payload),
      teacher_acted_at: updatedRow.teacher_acted_at ?? null,
      created_at: updatedRow.created_at,
      classes: {
        name: className,
      },
    },
  });

  revalidateTeacherRoutes(updatedRow.class_id);
  if (parsed.shareWithStudents && trimmedShareNote.length > 0) {
    revalidateStudentFeedbackRoutes(updatedRow.class_id);
  }

  return { success: true, webhookFailed };
}

export async function saveRecommendationFeedback(
  input: SaveRecommendationFeedbackInput,
): Promise<{ success: boolean; webhookFailed?: boolean }> {
  const parsed = SaveRecommendationFeedbackSchema.parse(input);
  const { user } = await getSupabaseServerClient();
  const now = new Date().toISOString();
  const { sentiment, confidence } = classifyFeedbackSentiment(parsed.feedback);
  const { supabase, className } = await getOwnedRecommendationContext(
    parsed.id,
    user.id,
  );

  const { data: updatedRows, error } = await updateRecommendationWithFallback(
    supabase,
    parsed.id,
    [
      {
        patch: {
          action_status: "feedback_logged",
          teacher_feedback: parsed.feedback.trim(),
          feedback_sentiment: sentiment,
          feedback_confidence: confidence,
          teacher_acted_at: now,
        },
      },
      {
        patch: {
          action_taken_note: parsed.feedback.trim(),
          teacher_acted_at: now,
        },
      },
    ],
  );

  if (error || !updatedRows?.length) {
    throw new Error("Unable to save recommendation feedback");
  }

  const updatedRow = updatedRows[0];
  const { webhookFailed } = await triggerApprovalWebhook({
    event: "teacher_feedback_submitted",
    recommendation_id: updatedRow.id,
    teacher_id: user.id,
    teacher_email: user.email ?? "",
    note: parsed.feedback.trim(),
    recommendation: {
      id: updatedRow.id,
      class_id: updatedRow.class_id,
      policy_level: updatedRow.policy_level,
      ai_message_draft: updatedRow.ai_message_draft ?? "",
      inquiry_mode: updatedRow.inquiry_mode ?? false,
      confidence_score: updatedRow.confidence_score ?? 0,
      status: normalizeRecommendationStatus(
        updatedRow.status,
        updatedRow.teacher_approval_status,
      ),
      action_status: updatedRow.action_status ?? "feedback_logged",
      teacher_approval_status:
        normalizeRecommendationStatus(
          updatedRow.status,
          updatedRow.teacher_approval_status,
        ) ?? "approved",
      teacher_action_note: updatedRow.teacher_action_note ?? null,
      structured_payload: parseStructuredPayload(updatedRow.structured_payload),
      teacher_acted_at: updatedRow.teacher_acted_at ?? null,
      created_at: updatedRow.created_at,
      classes: {
        name: className,
      },
    },
  });

  revalidateTeacherRoutes(updatedRow.class_id);
  return { success: true, webhookFailed };
}

export async function markRecommendationNotActioned(
  input: NotActionedRecommendationInput,
): Promise<{ success: boolean; webhookFailed?: boolean }> {
  const parsed = NotActionedRecommendationSchema.parse(input);
  const { user } = await getSupabaseServerClient();
  const now = new Date().toISOString();
  const { supabase, recommendation, className } = await getOwnedRecommendationContext(
    parsed.id,
    user.id,
  );

  const { data: updatedRows, error } = await updateRecommendationWithFallback(
    supabase,
    parsed.id,
    [
      {
        patch: {
          action_status: "not_actioned",
          not_actioned_at: now,
          teacher_acted_at: now,
          action_taken_note: parsed.reason.trim() || recommendation.action_taken_note,
        },
      },
      {
        patch: {
          teacher_acted_at: now,
          action_taken_note: parsed.reason.trim() || recommendation.action_taken_note,
        },
      },
    ],
  );

  if (error || !updatedRows?.length) {
    throw new Error("Unable to mark recommendation as not actioned");
  }

  const updatedRow = updatedRows[0];
  const { webhookFailed } = await triggerApprovalWebhook({
    event: "teacher_not_actioned",
    recommendation_id: updatedRow.id,
    teacher_id: user.id,
    teacher_email: user.email ?? "",
    note: parsed.reason.trim(),
    recommendation: {
      id: updatedRow.id,
      class_id: updatedRow.class_id,
      policy_level: updatedRow.policy_level,
      ai_message_draft: updatedRow.ai_message_draft ?? "",
      inquiry_mode: updatedRow.inquiry_mode ?? false,
      confidence_score: updatedRow.confidence_score ?? 0,
      status: normalizeRecommendationStatus(
        updatedRow.status,
        updatedRow.teacher_approval_status,
      ),
      action_status: updatedRow.action_status ?? "not_actioned",
      teacher_approval_status:
        normalizeRecommendationStatus(
          updatedRow.status,
          updatedRow.teacher_approval_status,
        ) ?? "approved",
      teacher_action_note: updatedRow.teacher_action_note ?? null,
      structured_payload: parseStructuredPayload(updatedRow.structured_payload),
      teacher_acted_at: updatedRow.teacher_acted_at ?? null,
      created_at: updatedRow.created_at,
      classes: {
        name: className,
      },
    },
  });

  revalidateTeacherRoutes(updatedRow.class_id);
  return { success: true, webhookFailed };
}

// Spec 4: restore creates a fresh pending draft without mutating the history row.
export async function restoreRecommendationAsDraft(
  input: RestoreRecommendationAsDraftInput,
): Promise<{ success: boolean; draftId: string }> {
  const parsed = RestoreRecommendationAsDraftSchema.parse(input);
  const { user } = await getSupabaseServerClient();
  const now = new Date().toISOString();
  const { recommendation } = await getOwnedRecommendationContext(parsed.id, user.id);
  const serviceSupabase = getRecommendationsServiceClient();
  const { restoredDraft, structuredPayload } = buildRestoredRecommendationDraft(
    recommendation,
  );

  const { data: insertedRow, error } = await insertRecommendationWithFallback(
    serviceSupabase,
    [
      {
        class_id: recommendation.class_id,
        teacher_id: user.id,
        policy_level: recommendation.policy_level,
        ai_message_draft: restoredDraft,
        content: restoredDraft,
        actions_json: recommendation.actions_json ?? null,
        structured_payload: structuredPayload,
        confidence_score: recommendation.confidence_score ?? 0,
        reasoning: recommendation.reasoning ?? null,
        inquiry_mode: recommendation.inquiry_mode ?? false,
        fallback_used: recommendation.fallback_used ?? false,
        status: "pending",
        action_status: "pending",
        teacher_approval_status: "pending",
        communicated_to_students: false,
        teacher_action_note: null,
        closure_share_note: null,
        action_taken_note: null,
        dismissal_reason: null,
        teacher_approved_at: null,
        teacher_implemented_at: null,
        teacher_feedback: null,
        feedback_sentiment: null,
        feedback_confidence: null,
        not_actioned_at: null,
        teacher_acted_at: now,
        restored_from_recommendation_id: recommendation.id,
      },
      {
        class_id: recommendation.class_id,
        teacher_id: user.id,
        policy_level: recommendation.policy_level,
        ai_message_draft: restoredDraft,
        content: restoredDraft,
        actions_json: recommendation.actions_json ?? null,
        confidence_score: recommendation.confidence_score ?? 0,
        reasoning: recommendation.reasoning ?? null,
        inquiry_mode: recommendation.inquiry_mode ?? false,
        fallback_used: recommendation.fallback_used ?? false,
        status: "pending",
        teacher_approval_status: "pending",
        communicated_to_students: false,
        teacher_action_note: null,
        action_taken_note: null,
        dismissal_reason: null,
        teacher_acted_at: now,
      },
    ],
  );

  if (error || !insertedRow) {
    console.error("[recommendations] restore draft failed", {
      recommendationId: parsed.id,
      classId: recommendation.class_id,
      teacherId: user.id,
      usedServiceRole: true,
      error: formatSupabaseError(error),
    });
    throw new Error("ไม่สามารถสร้างฉบับร่างใหม่จากข้อความเดิมได้");
  }

  revalidateTeacherRoutes(insertedRow.class_id);
  revalidateStudentFeedbackRoutes(insertedRow.class_id);

  return { success: true, draftId: insertedRow.id };
}
