/**
 * Centralized bilingual microcopy — Thai/English.
 * Constitution §IV: "Local Context Friendly" mandates Thai + English support.
 *
 * Pattern: No i18n library for pilot — use constant object + BiText component.
 * Usage:
 *   import { MICROCOPY, bi, BiText } from '@/lib/microcopy'
 *   <p>{bi(MICROCOPY.teacher.emptyState)}</p>
 *   <BiText entry={MICROCOPY.student.checkInTitle} />
 */

export const MICROCOPY = {
    teacher: {
        emptyState: {
            th: "ยังไม่มีห้องเรียน — สร้างห้องเรียนใหม่ได้เลย",
            en: "No classes yet — create your first class",
        },
        dashboardTitle: {
            th: "ภาพรวมชั้นเรียน",
            en: "Teacher Dashboard",
        },
        dashboardSubtitle: {
            th: "สรุปรายสัปดาห์ — เกิดอะไรขึ้นในห้องเรียนของคุณ",
            en: "Weekly briefing — what's happening in your classes.",
        },
        reviewCTA: {
            th: "ตรวจสอบสัปดาห์นี้",
            en: "Review This Week",
        },
        riskBadge: {
            th: "ต้องดูแล",
            en: "Needs Attention",
        },
        createClass: {
            th: "สร้างห้องเรียน",
            en: "Create Class",
        },
    },
    student: {
        checkInTitle: {
            th: "เช็คอินรายวัน",
            en: "Daily Check-in",
        },
        checkInSubtitle: {
            th: "วันนี้ห้องเรียนเป็นยังไง? ใช้เวลาไม่ถึง 20 วินาที",
            en: "How's your classroom feeling today? Takes less than 20 seconds.",
        },
        climateCheckIn: {
            th: "เช็คอินบรรยากาศ",
            en: "Climate Check-in",
        },
        successMessage: {
            th: "บันทึกแล้ว ขอบคุณ! 🎉",
            en: "Saved, thank you! 🎉",
        },
        feedbackTitle: {
            th: "ความคิดเห็นจากห้องเรียน",
            en: "Class Feedback",
        },
        notEnrolledTitle: {
            th: "พร้อมเริ่มต้นใช้งาน?",
            en: "Ready to get started?",
        },
        notEnrolledBody: {
            th: "คุณยังไม่ได้เข้าร่วมห้องเรียน ขอรหัสจากครูเพื่อเข้าร่วม",
            en: "You aren't enrolled in any classes yet. Get the invite code from your teacher.",
        },
        joinClass: {
            th: "เข้าร่วมห้องเรียน",
            en: "Join a Class",
        },
        privacyNote: {
            th: "ข้อความของคุณจะถูกลบอัตโนมัติหลัง 60 วัน",
            en: "Your comments are auto-deleted after 60 days",
        },
        alreadyCheckedInTitle: {
            th: "คุณเช็คอินวันนี้แล้ว ✅",
            en: "You've already checked in today",
        },
        alreadyCheckedInBody: {
            th: "ขอบคุณที่กลับมาดูอีกครั้ง 🙌 คุณสามารถเช็คอินใหม่ได้พรุ่งนี้",
            en: "Thanks for coming back! You can check in again tomorrow.",
        },
    },
    common: {
        loading: { th: "กำลังโหลด...", en: "Loading..." },
        error: { th: "เกิดข้อผิดพลาด", en: "Something went wrong" },
        noData: { th: "ยังไม่มีข้อมูลเพียงพอ", en: "Not enough data yet" },
    },
} as const;

// ============================================================
// Helpers
// ============================================================

/**
 * Render bilingual inline as a single string.
 * Usage: <p>{bi(MICROCOPY.teacher.emptyState)}</p>
 * Output: "ยังไม่มีห้องเรียน — สร้างห้องเรียนใหม่ได้เลย / No classes yet"
 */
export function bi(entry: { th: string; en: string }): string {
    return `${entry.th} / ${entry.en}`;
}

/**
 * BiText JSX component — renders Thai on first line, English below.
 * Usage: <BiText entry={MICROCOPY.student.checkInTitle} />
 */
export function BiText({
    entry,
    className,
}: {
    entry: { th: string; en: string };
    className?: string;
}) {
    return (
        <span className={className}>
            <span className="block">{entry.th}</span>
            <span className="block text-muted-foreground text-sm">{entry.en}</span>
        </span>
    );
}
