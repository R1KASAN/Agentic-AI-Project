import { z } from "zod";

// ----------------------------------------------------------------------
// 1. Type Definitions & Zod Schemas
// ----------------------------------------------------------------------

export const StructuredRecommendationPayloadSchema = z.object({
  version: z.literal(1),
  mode: z.enum(["action", "inquiry"]),
  source: z.enum(["llm", "fallback"]),
  teacherSummary: z.string().min(1),
  situationHypothesis: z.string().min(1),
  recommendedTeacherMove: z.string().min(1),
  studentMessageDraft: z.string().nullable(),
  teacherActionPlan: z.array(z.string().min(1)).min(1).max(3),
  watchSignals: z.array(z.string().min(1)).min(1).max(3),
  whyThisHelps: z.string().min(1),
  postClassReflectionPrompt: z.string().nullable(),
});

export type TeacherRecommendationRow = {
  id: string;
  class_id: string;
  policy_level: 'ROUTINE' | 'WARNING' | 'CRITICAL';
  ai_message_draft: string;
  inquiry_mode: boolean;
  decision_path_json: unknown | null; // Keep flexible as per native JSON type, but strictly no PII expected
  confidence_score: number;
  status: 'pending' | 'approved' | 'dismissed';
  action_status?:
    | 'pending'
    | 'approved'
    | 'implemented'
    | 'feedback_logged'
    | 'dismissed'
    | 'not_actioned'
    | null;
  structured_payload?: z.infer<typeof StructuredRecommendationPayloadSchema> | null;
  teacher_approved_at?: string | null;
  teacher_implemented_at?: string | null;
  teacher_feedback?: string | null;
  feedback_sentiment?: 'positive' | 'neutral' | 'negative' | null;
  feedback_confidence?: number | null;
  closure_share_note?: string | null;
  restored_from_recommendation_id?: string | null;
  created_at: string;
  classes: {
    name: string;
  };
};

export const ApproveRecommendationSchema = z.object({
  id: z.string().uuid(),
  note: z.string().optional().default(""),
  editedDraft: z.string().optional(),
  shareWithStudents: z.boolean().optional().default(true),
});

export type ApproveRecommendationInput = z.infer<typeof ApproveRecommendationSchema>;

export const DismissRecommendationSchema = z.object({
  id: z.string().uuid(),
  dismissalReason: z.string().min(1, "Dismissal reason is required"),
});

export type DismissRecommendationInput = z.infer<typeof DismissRecommendationSchema>;

export const MarkRecommendationImplementedSchema = z.object({
  id: z.string().uuid(),
  closureShareNote: z.string().optional().default(""),
  shareWithStudents: z.boolean().optional().default(false),
});

export type MarkRecommendationImplementedInput = z.infer<
  typeof MarkRecommendationImplementedSchema
>;

export const SaveRecommendationFeedbackSchema = z.object({
  id: z.string().uuid(),
  feedback: z.string().min(1, "Feedback is required"),
});

export type SaveRecommendationFeedbackInput = z.infer<
  typeof SaveRecommendationFeedbackSchema
>;

export const NotActionedRecommendationSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().optional().default(""),
});

export type NotActionedRecommendationInput = z.infer<
  typeof NotActionedRecommendationSchema
>;

// Spec 4: restore creates a brand-new pending draft from a historical row.
export const RestoreRecommendationAsDraftSchema = z.object({
  id: z.string().uuid(),
});

export type RestoreRecommendationAsDraftInput = z.infer<
  typeof RestoreRecommendationAsDraftSchema
>;

export type RecommendationWebhookPayload = {
  event:
    | 'recommendation_approved'
    | 'teacher_implemented'
    | 'teacher_feedback_submitted'
    | 'teacher_not_actioned';
  recommendation_id: string;
  teacher_id: string;
  teacher_email: string;
  note: string;
  recommendation: {
    id: string;
    class_id: string;
    policy_level: 'ROUTINE' | 'WARNING' | 'CRITICAL';
    ai_message_draft: string;
    inquiry_mode: boolean;
    confidence_score: number;
    status: 'pending' | 'approved' | 'dismissed';
    teacher_approval_status: 'pending' | 'approved' | 'dismissed' | null;
    action_status?:
      | 'pending'
      | 'approved'
      | 'implemented'
      | 'feedback_logged'
      | 'dismissed'
      | 'not_actioned'
      | null;
    teacher_action_note: string | null;
    teacher_acted_at: string | null;
    structured_payload?: z.infer<typeof StructuredRecommendationPayloadSchema> | null;
    created_at: string;
    classes: {
      name: string;
    };
  };
};
