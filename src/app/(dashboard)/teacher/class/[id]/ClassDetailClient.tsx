"use client";

import {
    approveRecommendation,
    dismissRecommendation,
} from "@/lib/actions/teacher";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RiskIndicator } from "@/components/domain/teacher/RiskIndicator";
import { RecommendationList } from "@/components/domain/teacher/RecommendationList";
import {
    ArrowLeft,
    Users,
    TrendingUp,
    BarChart3,
    Settings,
    Copy,
    History,
    HelpCircle,
    PauseCircle,
    MessageSquareQuote,
    ShieldCheck,
    Sparkles,
    Dot,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  AuditSignal,
  ClassClimateSummary,
  ClassMetrics,
  RecommendationViewModel,
  RedactedVoiceState,
  StudentFeedbackSummary,
} from "@/types";

interface ClassDetailClientProps {
  classId: string;
  className: string;
  riskScore: number | null;
  riskLevel?: "ROUTINE" | "WARNING" | "CRITICAL" | null;
  inviteCode: string;
  studentCount: number;
  climate: ClassClimateSummary[];
  recommendations: RecommendationViewModel[];
  historyCount: number;
  metrics: ClassMetrics;
  auditSignal: AuditSignal | null;
  feedbackSummary: StudentFeedbackSummary;
  redactedVoice: RedactedVoiceState;
}

export default function ClassDetailClient({
  classId,
  className,
  riskScore,
  riskLevel,
  inviteCode,
  studentCount,
  climate,
  recommendations,
  historyCount,
  metrics,
  auditSignal,
  feedbackSummary,
  redactedVoice,
}: ClassDetailClientProps) {
    const router = useRouter();

    // Type guard to prevent runtime crashes if Supabase RPC returns malformed data
    if (!Array.isArray(climate)) {
        console.error("climate is not an array:", climate);
        return (
            <div className="text-sm text-muted-foreground p-4">
                ไม่สามารถโหลดข้อมูลสภาพอากาศในชั้นเรียนได้ กรุณาลองใหม่อีกครั้ง
            </div>
        );
    }

    const latestWeek = climate.find((c) => c.avg_mood !== null);
    const pendingRecommendations = recommendations.filter(
      (recommendation) => recommendation.status === "pending"
    );
    const blockedByFrequency =
      pendingRecommendations.length === 0 &&
      auditSignal?.blockedReason === "frequency_limit_exceeded";
    const blockedByKAnonymity =
      pendingRecommendations.length === 0 &&
      auditSignal?.blockedReason === "k_anonymity";

    async function handleApprove(id: string, note: string, editedDraft: string) {
        const result = await approveRecommendation(id, note, editedDraft);
        if (!result.success) {
            toast.error(result.error ?? "ไม่สามารถอนุมัติ draft นี้ได้");
            return;
        }
        if (result.webhookFailed) {
            toast.warning("บันทึกการอนุมัติแล้ว แต่การส่งต่อไปยัง workflow ยังไม่สมบูรณ์");
        } else {
            toast.success("อนุมัติ draft แล้ว");
        }
        router.refresh();
    }

    async function handleDismiss(id: string, reason: string) {
        const result = await dismissRecommendation(id, reason);
        if (!result.success) {
            toast.error(result.error ?? "ไม่สามารถ dismiss draft นี้ได้");
            return;
        }
        toast.success("ข้าม draft นี้แล้ว");
        router.refresh();
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                    <Link
                        href="/teacher"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        {className}
                        <RiskIndicator score={riskScore} policyLevel={riskLevel} size="md" />
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {metrics.inquiryModeSuggested && (
                        <Badge variant="secondary" className="bg-violet-50 text-violet-700 border-violet-200">
                          <HelpCircle className="mr-1 h-3 w-3" />
                          Inquiry Mode
                        </Badge>
                      )}
                      {blockedByFrequency && (
                        <Badge variant="outline" className="border-slate-300 text-slate-600">
                          <PauseCircle className="mr-1 h-3 w-3" />
                          No new draft this cycle
                        </Badge>
                      )}
                      {blockedByKAnonymity && (
                        <Badge variant="outline" className="border-sky-300 text-sky-700">
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          Waiting for safe aggregate signal
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ตัดสินแล้ว {metrics.totalDecided} รายการ, ข้าม {Math.round(metrics.dismissalRate * 100)}%
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 pt-1">
                        <p className="text-muted-foreground text-sm flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {studentCount} students enrolled
                        </p>
                        <div className="flex items-center gap-2 bg-muted px-3 py-1 rounded-md border text-sm">
                            <span className="text-muted-foreground font-medium">Join Code:</span>
                            <span className="font-mono font-bold tracking-widest">{inviteCode}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                    navigator.clipboard.writeText(inviteCode);
                                    toast.success("Invite code copied to clipboard!");
                                }}
                                title="Copy Invite Code"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                <span className="sr-only">Copy Code</span>
                            </Button>
                        </div>
                    </div>
                </div>
      <div className="shrink-0 mt-2 sm:mt-0 flex items-center gap-2">
        <Link href={`/teacher/class/${classId}/members`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="w-4 h-4" />
            ดูรายชื่อสมาชิก
          </Button>
        </Link>
        <Link href={`/teacher/class/${classId}/settings`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            Class Settings
          </Button>
        </Link>
      </div>
            </div>

            {/* Weekly Summary Cards */}
            {latestWeek ? (
                <div className="grid gap-4 sm:grid-cols-3">
                    <MetricCard
                        label="Avg Mood"
                        value={latestWeek.avg_mood}
                        icon={<TrendingUp className="w-4 h-4" />}
                        color="text-indigo-500"
                    />
                    <MetricCard
                        label="Avg Pace"
                        value={latestWeek.avg_pace}
                        icon={<BarChart3 className="w-4 h-4" />}
                        color="text-sky-500"
                    />
                    <MetricCard
                        label="Avg Fairness"
                        value={latestWeek.avg_fairness}
                        icon={<BarChart3 className="w-4 h-4" />}
                        color="text-violet-500"
                    />
                </div>
            ) : (
                <Card className="border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                    <CardContent className="py-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Not enough check-in data yet. Aggregate metrics appear when 3+
                            students respond.
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-slate-200/80 bg-gradient-to-br from-white to-slate-50/90 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900/80">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <h2 className="text-lg font-semibold">Student Feedback Summary</h2>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {feedbackSummary.summaryLine}
                      </p>
                    </div>
                    <TrendBadge trend={feedbackSummary.trend} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <SummaryStat
                      label="รอบล่าสุด"
                      value={`${feedbackSummary.latestResponseCount} responses`}
                      helper="นับเฉพาะข้อมูลแบบ aggregate"
                    />
                    <SummaryStat
                      label="Avg Mood"
                      value={formatStat(feedbackSummary.avgMood)}
                      helper="ภาพรวมอารมณ์ของห้อง"
                    />
                    <SummaryStat
                      label="Avg Pace"
                      value={formatStat(feedbackSummary.avgPace)}
                      helper="จังหวะการเรียนที่เด็กสะท้อน"
                    />
                    <SummaryStat
                      label="Avg Fairness"
                      value={formatStat(feedbackSummary.avgFairness)}
                      helper={`มีข้อมูลรวม ${feedbackSummary.totalWeeksWithData} สัปดาห์`}
                    />
                  </div>

                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-muted-foreground dark:border-slate-800 dark:bg-slate-900/50">
                    หน้านี้จะแสดงเฉพาะสัญญาณรวมของทั้งห้องเท่านั้น และจะไม่แสดงข้อมูลรายบุคคลของนักเรียน
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dashed border-sky-200 bg-gradient-to-br from-sky-50/80 to-white dark:border-sky-900 dark:from-sky-950/30 dark:to-slate-950">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-sky-100 p-2 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                      <MessageSquareQuote className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold">Redacted Student Voice</h2>
                      <p className="text-sm text-muted-foreground">
                        {redactedVoice.message}
                      </p>
                    </div>
                  </div>

                  {redactedVoice.status === "ready" && redactedVoice.snippets.length > 0 ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100">
                        ข้อความด้านล่างถูกลบข้อมูลระบุตัวตนแล้ว และเป็นเสียงสะท้อนที่ถูกรวมจากหลายคน ไม่ใช่คำพูดของนักเรียนคนเดียวแบบตรง ๆ
                      </div>
                      {redactedVoice.snippets.map((snippet) => (
                        <div
                          key={snippet.id}
                          className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/80"
                        >
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Dot className="h-4 w-4" />
                            {snippet.tone ?? "mixed"}
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-foreground">
                            {snippet.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-sky-200/80 bg-white/70 p-4 dark:border-sky-900 dark:bg-slate-950/60">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-4 w-4 text-sky-600 dark:text-sky-400" />
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p>
                            ระบบจะเปิดส่วนนี้เมื่อมี source ที่ผ่านการปกปิดข้อมูลระบุตัวตนและตรวจ privacy-safe แล้วเท่านั้น
                          </p>
                          <p>
                            raw student comments จะไม่ถูกแสดงบนหน้านี้โดยตรง แม้ใน dev phase นี้ก็ยังคงใช้ข้อจำกัดเดิม
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    Draft Response / Suggested Action
                    {pendingRecommendations.length > 0 && (
                        <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full px-2 py-0.5 font-medium">
                            {pendingRecommendations.length} pending
                        </span>
                    )}
                  </h2>
                  <Link href={`/teacher/class/${classId}/responses`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <History className="w-4 h-4" />
                      ดูประวัติข้อความที่ผ่านมา
                      {historyCount > 0 ? ` (${historyCount})` : ""}
                    </Button>
                  </Link>
                </div>
                {pendingRecommendations.length === 0 ? (
                  <Card className="border-dashed border-sky-200 bg-sky-50/40 dark:border-sky-900 dark:bg-sky-950/20">
                    <CardContent className="py-6 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">
                        {blockedByFrequency
                          ? "ระบบยังไม่สร้างข้อความใหม่ เพื่อไม่ให้ถี่เกินไป"
                          : blockedByKAnonymity
                            ? "ระบบยังไม่แสดง draft ใหม่ เพราะข้อมูลรวมยังไม่ถึงเกณฑ์ความเป็นส่วนตัวขั้นต่ำ"
                          : "ไม่มี draft ที่รอตรวจในตอนนี้"}
                      </p>
                      <p className="mt-1">
                        {blockedByFrequency
                          ? "ระบบชะลอการสร้าง draft ใหม่ชั่วคราวตาม frequency guard ของห้องนี้ คุณยังสามารถเปิดประวัติข้อความที่ผ่านมาเพื่อดูสิ่งที่เคยอนุมัติหรือข้ามไปแล้วได้"
                          : blockedByKAnonymity
                            ? "ระบบกำลังรอให้มีสัญญาณรวมที่ปลอดภัยพอก่อน เพื่อปกป้องความเป็นส่วนตัวของนักเรียนและคงมาตรฐาน k-anonymity ของห้องนี้"
                            : "ห้องนี้ยังอาจไม่มี recommendation ใหม่เพราะข้อมูลยังไม่พอหรือ workflow ยังไม่พบสัญญาณที่ควรสร้าง draft ในรอบนี้"}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                <RecommendationList
                    recommendations={pendingRecommendations}
                    onApprove={handleApprove}
                    onDismiss={handleDismiss}
                    emptyStateTitle="No pending drafts right now."
                    emptyStateBody="New drafts will appear here after the class has enough signal and clears safety checks."
                />
                )}
            </div>
        </div>
    );
}

function formatStat(value: number | null) {
    return value !== null ? value.toFixed(1) : "—";
}

function TrendBadge({
    trend,
}: {
    trend: StudentFeedbackSummary["trend"];
}) {
    const content =
        trend === "up"
            ? {
                  label: "กำลังฟื้นตัว",
                  className:
                      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
              }
            : trend === "down"
              ? {
                    label: "ควรติดตามเพิ่ม",
                    className:
                        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
                }
              : trend === "flat"
                ? {
                      label: "ค่อนข้างทรงตัว",
                      className:
                          "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300",
                  }
                : {
                      label: "ข้อมูลยังน้อย",
                      className:
                          "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300",
                  };

    return (
        <Badge variant="outline" className={content.className}>
            {content.label}
        </Badge>
    );
}

function SummaryStat({
    label,
    value,
    helper,
}: {
    label: string;
    value: string;
    helper: string;
}) {
    return (
        <div className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {label}
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
    );
}

function MetricCard({
    label,
    value,
    icon,
    color,
}: {
    label: string;
    value: number | null;
    icon: React.ReactNode;
    color: string;
}) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className={color}>{icon}</span>
                </div>
                <p className="text-2xl font-bold mt-1">
                    {value !== null ? value.toFixed(1) : "—"}
                    <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        / 5
                    </span>
                </p>
            </CardContent>
        </Card>
    );
}
