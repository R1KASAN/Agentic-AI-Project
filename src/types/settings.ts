export interface SchoolNotificationSettingsInput {
    school_id: string;
    ai_run_enabled?: boolean;
    ai_run_day?: string;
    ai_run_time?: string;
    teacher_email_enabled?: boolean;
    teacher_email_day?: string;
    teacher_email_time?: string;
    reminder_enabled?: boolean;
    reminder_day?: string;
    reminder_time?: string;
    reminder_threshold?: number;
    health_score_enabled?: boolean;
    health_score_day?: string;
    health_score_time?: string;
    health_score_alert_threshold?: number;
    paused_until?: string | null;
}
