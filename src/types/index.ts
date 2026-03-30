export type UserRole = "student" | "teacher";

export interface UserProfile {
    id: string;
    role: UserRole;
    full_name: string | null;
    avatar_url: string | null;
    created_at: string;
}

export type RiskLevel = "low" | "medium" | "high";

export type PolicyLevel = "ROUTINE" | "WARNING" | "CRITICAL";

export type PriorityLevel = "NORMAL" | "HIGH" | "URGENT";

export type RecommendationStatus = "pending" | "approved" | "dismissed" | "sent";

export interface ClassInfo {
  id: string;
  teacher_id: string;
  name: string;
  description: string | null;
  risk_score: number;
  risk_level: PolicyLevel | null;
  pilot_status: boolean;
  created_at: string;
}

export interface CheckIn {
    id: string;
    class_id: string;
    mood: number;
    pace: number;
    fairness: number;
    content: string | null;
    created_at: string;
}

/**
 * Recommendation - AI-generated suggestions from n8n climate-agent-main workflow
 * These fields are written by the n8n workflow; see that workflow for policy and confidence logic.
 * Key fields:
 * - policy_level: ROUTINE (mood >= 3.5) | WARNING (2.5 <= mood < 3.5) | CRITICAL (mood < 2.5)
 * - confidence_score: 0-1 probability from LLM
 * - inquiry_mode: true if teacher dismissal_rate > 0.60 (asks clarifying questions)
 * - fallback_used: true if rule-based fallback was used (AI confidence below threshold)
 * - ai_message_draft: Thai-language message for teacher (max 280 chars)
 * - actions_json: Array of 1-3 actionable items
 */
export interface Recommendation {
  id: string;
  class_id: string;
  // Legacy content field - kept for backward compatibility
  // New recommendations use ai_message_draft instead
  content?: string;
  status: RecommendationStatus;
  dismissal_reason: string | null;
  action_taken_note: string | null;
  teacher_action_note?: string | null;
  communicated_to_students: boolean;
  created_at: string;
  updated_at: string;
  // Fields from n8n climate-agent-main workflow (see that workflow for logic)
  policy_level?: PolicyLevel;
  ai_message_draft?: string;
  actions_json?: string[] | Record<string, unknown> | null;
  confidence_score?: number;
  reasoning?: string;
  inquiry_mode?: boolean;
  fallback_used?: boolean;
  priority?: PriorityLevel;
  alert_sent_at?: string | null;
}

export interface ActionLog {
    id: string;
    actor_id: string;
    action_type: string;
    target_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
}

export interface ClassClimateSummary {
    class_id: string;
    week_start: string;
    avg_mood: number | null;
    avg_pace: number | null;
    avg_fairness: number | null;
    check_in_count: number;
}

export interface DailyClimateSummary {
  class_id: string;
  check_in_date: string;
  avg_mood: number | null;
  avg_pace: number | null;
  avg_fairness: number | null;
  total_responses: number;
}

export interface StudentFeedbackClimateRow {
  week_start: string;
  avg_mood: number | null;
  avg_pace: number | null;
  avg_fairness: number | null;
  total_responses: number;
}

export interface StudentFeedbackRecentAction {
  id: string;
  note: string;
  logged_at: string;
  status_label: string;
}

export type StudentFeedbackComparisonLabel =
  | "better"
  | "similar"
  | "worse"
  | "insufficient";

export interface StudentFeedbackCurrentWeek {
  week_start: string;
  summary: string;
  comparison_label: StudentFeedbackComparisonLabel;
}

export interface StudentFeedbackLastWeek {
  week_start: string | null;
  summary: string;
  metrics: StudentFeedbackClimateRow | null;
}

export interface StudentFeedbackResponse {
  class_id: string;
  class_name: string | null;
  latest_check_in_at: string | null;
  climate: StudentFeedbackClimateRow[];
  current_week: StudentFeedbackCurrentWeek;
  last_week: StudentFeedbackLastWeek;
  recent_action: StudentFeedbackRecentAction | null;
}

export type StudentFeedbackTrend =
  | "up"
  | "down"
  | "flat"
  | "insufficient_data";

export interface StudentFeedbackSummary {
  latestWeekStart: string | null;
  latestResponseCount: number;
  avgMood: number | null;
  avgPace: number | null;
  avgFairness: number | null;
  totalWeeksWithData: number;
  trend: StudentFeedbackTrend;
  summaryLine: string;
}

export type RedactedVoiceTone = "low" | "mixed" | "positive";

export interface RedactedVoiceSnippet {
  id: string;
  text: string;
  tone?: RedactedVoiceTone;
}

export type RedactedVoiceStatus =
  | "pipeline_pending"
  | "insufficient_signal"
  | "ready";

export interface RedactedVoiceState {
  status: RedactedVoiceStatus;
  snippets: RedactedVoiceSnippet[];
  message: string;
}

export interface RedactedVoiceRpcRow {
  id: string;
  class_id: string;
  week_start: string;
  tone: RedactedVoiceTone | null;
  text_redacted: string;
  source_window: Record<string, unknown> | null;
  created_at: string | null;
}

export type RecommendationConfidenceLabel = "สูง" | "กลาง" | "ระวัง" | null;

export type RecommendationRationaleTag =
  | "trend_shift"
  | "low_mood"
  | "pace_friction"
  | "fairness_signal"
  | "mixed_signal"
  | "unknown";

export interface RecommendationViewModel {
  id: string;
  classId: string;
  status: RecommendationStatus;
  createdAt: string;
  policyLevel: PolicyLevel | null;
  priority: PriorityLevel | null;
  inquiryMode: boolean;
  fallbackUsed: boolean;
  aiMessageDraft: string | null;
  actions: string[];
  confidenceScore: number | null;
  confidenceLabel: RecommendationConfidenceLabel;
  reasoningSummary: string | null;
  rationaleTag: RecommendationRationaleTag;
  dismissalReason: string | null;
  teacherActionNote: string | null;
}

export type AuditEventType =
  | "recommendation_generated"
  | "teacher_approval"
  | "frequency_guard"
  | "k_anonymity"
  | "other";

export type AuditBlockedReason = "frequency_limit_exceeded" | "k_anonymity" | null;

export interface ClassMetrics {
  classId: string;
  teacherId: string;
  totalGenerated: number;
  totalDecided: number;
  total: number;
  acceptedCount: number;
  dismissedCount: number;
  dismissalRate: number;
  inquiryModeSuggested: boolean;
  teacherFlagInquiryMode: boolean;
  dismissalPatternConsecutive: number;
  inquiryModeTriggeredAt: string | null;
  avgMoodScore: number | null;
  totalSurveys: number;
  lowMoodCount: number;
  highMoodCount: number;
  source: string;
}

export interface AuditSignal {
  classId: string;
  eventType: AuditEventType;
  policySelected: string | null;
  blockedReason: AuditBlockedReason;
  createdAt: string | null;
}
