import { z } from "zod";

// ----------------------------------------------------------------------
// 1. Type Definitions & Zod Schemas
// ----------------------------------------------------------------------

export type TeacherRecommendationRow = {
  id: string;
  class_id: string;
  policy_level: 'ROUTINE' | 'WARNING' | 'CRITICAL';
  ai_message_draft: string;
  inquiry_mode: boolean;
  decision_path_json: unknown | null; // Keep flexible as per native JSON type, but strictly no PII expected
  confidence_score: number;
  status: 'pending' | 'approved' | 'dismissed';
  created_at: string;
  classes: {
    name: string;
  };
};

export const ApproveRecommendationSchema = z.object({
  id: z.string().uuid(),
  note: z.string().optional().default(""),
  editedDraft: z.string().optional(),
});

export type ApproveRecommendationInput = z.infer<typeof ApproveRecommendationSchema>;

export const DismissRecommendationSchema = z.object({
  id: z.string().uuid(),
  dismissalReason: z.string().min(1, "Dismissal reason is required"),
});

export type DismissRecommendationInput = z.infer<typeof DismissRecommendationSchema>;

export type RecommendationWebhookPayload = {
  event: 'recommendation_approved';
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
    teacher_action_note: string | null;
    teacher_acted_at: string | null;
    created_at: string;
    classes: {
      name: string;
    };
  };
};
