export type UserRole = "student" | "teacher" | "admin";

export interface UserProfile {
    id: string;
    role: UserRole;
    full_name: string | null;
    avatar_url: string | null;
    created_at: string;
}

export type RiskLevel = "low" | "medium" | "high";

export type RecommendationStatus = "pending" | "approved" | "dismissed";

export interface ClassInfo {
    id: string;
    teacher_id: string;
    name: string;
    description: string | null;
    risk_score: number;
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

export interface Recommendation {
    id: string;
    class_id: string;
    content: string;
    status: RecommendationStatus;
    dismissal_reason: string | null;
    action_taken_note: string | null;
    communicated_to_students: boolean;
    created_at: string;
    updated_at: string;
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
