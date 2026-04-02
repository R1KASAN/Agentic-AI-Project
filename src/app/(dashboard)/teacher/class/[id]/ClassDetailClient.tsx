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
import type { TeacherActionContextSummary } from "@/lib/teacherDashboard";

interface ClassDetailClientProps {
  classId: string;
  className: string;
  classDescription: string | null;
  riskScore: number | null;
  riskLevel?: "ROUTINE" | "WARNING" | "CRITICAL" | null;
  inviteCode: string;
  studentCount: number;
  climate: ClassClimateSummary[];
  recommendations: RecommendationViewModel[];
  latestRecommendation: RecommendationViewModel | null;
  actionContext: TeacherActionContextSummary;
  historyCount: number;
  metrics: ClassMetrics;
  auditSignal: AuditSignal | null;
  feedbackSummary: StudentFeedbackSummary;
  redactedVoice: RedactedVoiceState;
}

export default function ClassDetailClient({
  classId,
  className,
  classDescription,
  riskScore,
  riskLevel,
  inviteCode,
  studentCount,
  climate,
  recommendations,
  latestRecommendation,
  actionContext,
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
    (recommendation) => recommendation.status === "pending",
  );
  const blockedByFrequency =
    pendingRecommendations.length === 0 &&
    auditSignal?.blockedReason === "frequency_limit_exceeded";
  const blockedByKAnonymity =
    pendingRecommendations.length === 0 &&
    auditSignal?.blockedReason === "k_anonymity";

  const latestRecommendationLabel =
    latestRecommendation && latestRecommendation.createdAt
      ? new Date(latestRecommendation.createdAt).toLocaleDateString("th-TH", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : null;

  async function handleApprove(id: string, note: string, editedDraft: string) {
    const result = await approveRecommendation(id, note, editedDraft);
    if (!result.success) {
      toast.error(result.error ?? "ไม่สามารถอนุมัติฉบับร่างนี้ได้");
      return;
    }
    if (result.webhookFailed) {
      toast.warning(
        "บันทึกการอนุมัติแล้ว แต่การส่งต่อไปยัง workflow ยังไม่สมบูรณ์",
      );
    } else {
      toast.success("อนุมัติฉบับร่างแล้ว");
    }
    router.refresh();
  }

  async function handleDismiss(id: string, reason: string) {
    const result = await dismissRecommendation(id, reason);
    if (!result.success) {
      toast.error(result.error ?? "ไม่สามารถข้ามฉบับร่างนี้ได้");
      return;
    }
    toast.success("ข้ามฉบับร่างนี้แล้ว");
    router.refresh();
  }

  return (
    <div className="space-y-6 text-[var(--teacher-dashboard-text)]">
      {/* Header */}
      <div className="product-hero-card space-y-5 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <Link
              href="/teacher"
              className="inline-flex items-center gap-1 text-xs teacher-text-muted transition-colors hover:text-[var(--teacher-dashboard-text)]"
            >
              <ArrowLeft className="w-3 h-3" />
              กลับไปหน้าภาพรวม
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1
                data-display="true"
                className="product-card-title text-[clamp(2rem,4.5vw,3.25rem)] font-semibold tracking-tight text-[var(--teacher-dashboard-text)]"
              >
                {className}
              </h1>
              <RiskIndicator
                score={riskScore}
                policyLevel={riskLevel}
                size="md"
              />
            </div>
            {classDescription && (
              <p className="max-w-3xl text-sm leading-6 teacher-text-muted">
                {classDescription}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {metrics.inquiryModeSuggested && (
                <Badge
                  variant="secondary"
                    className="border-[color:var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] text-[var(--teacher-dashboard-text)]"
                >
                  <HelpCircle className="mr-1 h-3 w-3" />
                  โหมดค้นหาบริบท
                </Badge>
              )}
              {blockedByFrequency && (
                <Badge
                  variant="outline"
                    className="border-[color:var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] text-[var(--teacher-dashboard-text-muted)]"
                >
                  <PauseCircle className="mr-1 h-3 w-3" />
                  ยังไม่สร้างฉบับร่างใหม่ในรอบนี้
                </Badge>
              )}
              {blockedByKAnonymity && (
                <Badge
                  variant="outline"
                    className="border-[color:var(--teacher-dashboard-border)] bg-[rgba(147,197,253,0.12)] text-[var(--teacher-dashboard-primary)]"
                >
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  รอสัญญาณรวมที่ปลอดภัย
                </Badge>
              )}
              <span className="text-xs teacher-text-muted">
                ตัดสินแล้ว {metrics.totalDecided} รายการ, ข้าม{" "}
                {Math.round(metrics.dismissalRate * 100)}%
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <p className="flex items-center gap-2 text-sm teacher-text-muted">
                <Users className="w-4 h-4" />
                {studentCount} คน
              </p>
              <div className="teacher-surface-soft flex max-w-full flex-wrap items-center gap-2 rounded-full border px-3 py-1.5 text-sm teacher-text-muted">
                <span className="font-medium">รหัสเชิญ:</span>
                <span className="product-code-chip font-mono font-semibold tracking-widest text-[var(--teacher-dashboard-text)]">
                  {inviteCode}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-[var(--teacher-dashboard-text-muted)] hover:text-[var(--teacher-dashboard-text)]"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteCode);
                    toast.success("คัดลอกรหัสเชิญแล้ว");
                  }}
                  title="คัดลอกรหัสเชิญ"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="sr-only">คัดลอกรหัสเชิญ</span>
                </Button>
              </div>
            </div>
          </div>
          <div className="shrink-0 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Link href={`/teacher/class/${classId}/members`} className="min-w-0">
              <Button
                variant="outline"
                size="sm"
                className="product-card-button h-auto min-h-11 w-full gap-2 rounded-2xl border-[color:var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] px-4 py-3 text-left text-[var(--teacher-dashboard-text)] hover:bg-[var(--teacher-dashboard-primary-soft)] sm:w-auto"
              >
                <Users className="w-4 h-4" />
                ดูรายชื่อสมาชิก
              </Button>
            </Link>
            <Link href={`/teacher/class/${classId}/settings`} className="min-w-0">
              <Button
                variant="outline"
                size="sm"
                className="product-card-button h-auto min-h-11 w-full gap-2 rounded-2xl border-[color:var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] px-4 py-3 text-left text-[var(--teacher-dashboard-text)] hover:bg-[var(--teacher-dashboard-primary-soft)] sm:w-auto"
              >
                <Settings className="w-4 h-4" />
                ตั้งค่าห้องเรียน
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Weekly Summary Cards */}
      {latestWeek ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="อารมณ์เฉลี่ย"
            value={latestWeek.avg_mood}
            icon={<TrendingUp className="w-4 h-4" />}
            color="text-[var(--teacher-dashboard-primary)]"
          />
          <MetricCard
            label="จังหวะเฉลี่ย"
            value={latestWeek.avg_pace}
            icon={<BarChart3 className="w-4 h-4" />}
            color="text-sky-300"
          />
          <MetricCard
            label="ความยุติธรรมเฉลี่ย"
            value={latestWeek.avg_fairness}
            icon={<BarChart3 className="w-4 h-4" />}
            color="text-teal-300"
          />
        </div>
      ) : (
        <Card className="product-section-card border-dashed">
          <CardContent className="py-6 text-center">
            <p className="text-sm teacher-text-muted">
              ยังไม่มีข้อมูลเช็กอินมากพอ ระบบจะแสดงค่า aggregate
              เมื่อมีนักเรียนตอบครบตามเกณฑ์
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="product-section-card overflow-hidden">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <h2 data-display="true" className="text-2xl font-semibold">
                    สรุปบรรยากาศห้อง
                  </h2>
                </div>
                <p className="text-sm teacher-text-muted">
                  {feedbackSummary.summaryLine}
                </p>
              </div>
              <TrendBadge trend={feedbackSummary.trend} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryStat
                label="รอบล่าสุด"
                value={`${feedbackSummary.latestResponseCount} คำตอบ`}
                helper="นับเฉพาะข้อมูลแบบ aggregate"
              />
              <SummaryStat
                label="อารมณ์เฉลี่ย"
                value={formatStat(feedbackSummary.avgMood)}
                helper="ภาพรวมอารมณ์ของห้อง"
              />
              <SummaryStat
                label="จังหวะเฉลี่ย"
                value={formatStat(feedbackSummary.avgPace)}
                helper="จังหวะการเรียนที่เด็กสะท้อน"
              />
              <SummaryStat
                label="ความยุติธรรมเฉลี่ย"
                value={formatStat(feedbackSummary.avgFairness)}
                helper={`มีข้อมูลรวม ${feedbackSummary.totalWeeksWithData} สัปดาห์`}
              />
            </div>

            <div className="teacher-surface-soft rounded-[24px] border border-dashed px-4 py-3 text-sm leading-6 teacher-text-muted">
              หน้านี้แสดงเฉพาะสัญญาณรวมของทั้งห้องเท่านั้น
              และจะไม่แสดงข้อมูลรายบุคคลของนักเรียน
            </div>
          </CardContent>
        </Card>

        <Card className="product-section-card overflow-hidden">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-sky-500/10 p-2 text-sky-200">
                <MessageSquareQuote className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h2 data-display="true" className="text-2xl font-semibold">
                  เสียงสะท้อนที่ปกปิดข้อมูลแล้ว
                </h2>
                <p className="text-sm teacher-text-muted">
                  {redactedVoice.message}
                </p>
              </div>
            </div>

            {redactedVoice.status === "ready" &&
            redactedVoice.snippets.length > 0 ? (
              <div className="space-y-3">
                <div className="rounded-[24px] border border-emerald-200/60 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-50">
                  ข้อความด้านล่างถูกลบข้อมูลระบุตัวตนแล้ว
                  และเป็นเสียงสะท้อนที่ถูกรวมจากหลายคน
                  ไม่ใช่คำพูดของนักเรียนคนเดียวแบบตรง ๆ
                </div>
                {redactedVoice.snippets.map((snippet) => (
                  <div
                    key={snippet.id}
                    className="rounded-[24px] border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-raised)] px-4 py-3"
                  >
                    <div className="flex items-center gap-2 text-xs text-[var(--student-dashboard-text-muted)]">
                      <Dot className="h-4 w-4" />
                      {snippet.tone ? snippet.tone : "ผสม"}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--student-dashboard-text)]">
                      {snippet.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-sky-200/80 bg-[var(--student-dashboard-surface-raised)] p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-sky-300" />
                  <div className="space-y-2 text-sm text-[var(--student-dashboard-text-muted)]">
                    <p>
                      ระบบจะเปิดส่วนนี้เมื่อมี source
                      ที่ผ่านการปกปิดข้อมูลระบุตัวตนและตรวจ privacy-safe
                      แล้วเท่านั้น
                    </p>
                    <p>
                      ข้อความดิบของนักเรียนจะไม่ถูกแสดงบนหน้านี้โดยตรง
                      แม้ในช่วงพัฒนาก็ยังคงใช้ข้อจำกัดเดิม
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
          <h2
            data-display="true"
            className="flex items-center gap-2 text-2xl font-semibold text-[var(--student-dashboard-text)]"
          >
            ฉบับร่าง / แนวทางตอบสนอง
            {pendingRecommendations.length > 0 && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-200">
                {pendingRecommendations.length} รออนุมัติ
              </span>
            )}
          </h2>
          <Link href={`/teacher/class/${classId}/responses`}>
            <Button
              variant="outline"
              size="sm"
              className="h-11 gap-2 rounded-2xl border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] text-[var(--student-dashboard-text)] hover:bg-[var(--student-dashboard-surface-raised)]"
            >
              <History className="w-4 h-4" />
              ดูประวัติข้อความที่ผ่านมา
              {historyCount > 0 ? ` (${historyCount})` : ""}
            </Button>
          </Link>
        </div>
        {pendingRecommendations.length === 0 ? (
          actionContext.mode !== "empty" ? (
            <Card className="student-surface overflow-hidden rounded-[28px] border border-[color:var(--student-dashboard-border)]">
              <CardContent className="space-y-4 py-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-[rgba(147,197,253,0.14)] text-[var(--teacher-dashboard-primary)]"
                  >
                    {actionContext.title}
                  </Badge>
                  {actionContext.sourceLabel && (
                    <Badge
                      variant="outline"
                      className="rounded-full border-[color:var(--student-dashboard-border)] text-[var(--student-dashboard-text-muted)]"
                    >
                      {actionContext.sourceLabel}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[var(--student-dashboard-text)]">
                    {actionContext.summary}
                  </p>
                  <p className="text-sm leading-6 text-[var(--student-dashboard-text-muted)]">
                    {actionContext.actionContext}
                  </p>
                  {latestRecommendationLabel && latestRecommendation && (
                    <p className="text-xs text-[var(--student-dashboard-text-muted)]">
                      อ้างอิงข้อความล่าสุดเมื่อ {latestRecommendationLabel}
                    </p>
                  )}
                </div>
                {actionContext.draftText && (
                  <div className="rounded-[24px] border border-dashed border-sky-200/60 bg-[var(--student-dashboard-surface-raised)] px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--student-dashboard-text-muted)]">
                      ฉบับร่างล่าสุด
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--student-dashboard-text)]">
                      {actionContext.draftText}
                    </p>
                  </div>
                )}
                {actionContext.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {actionContext.actions.map((action) => (
                      <span
                        key={action}
                        className="rounded-full bg-[rgba(147,197,253,0.12)] px-3 py-1 text-xs text-[var(--teacher-dashboard-primary)]"
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                )}
                {blockedByFrequency && (
                  <p className="text-xs leading-5 text-[var(--student-dashboard-text-muted)]">
                    ระบบชะลอการแจ้งเตือนซ้ำไว้เพื่อกันข้อความถี่เกิน แต่ยังเก็บสรุปบริบทล่าสุดให้ใช้ตัดสินใจต่อได้
                  </p>
                )}
                {blockedByKAnonymity && (
                  <p className="text-xs leading-5 text-[var(--student-dashboard-text-muted)]">
                    ระบบยังไม่เปิดฉบับร่างใหม่จนกว่าสัญญาณรวมจะถึงเกณฑ์ความเป็นส่วนตัวขั้นต่ำ
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="student-surface overflow-hidden rounded-[28px] border border-dashed border-sky-200/60">
              <CardContent className="space-y-2 py-6 text-sm text-[var(--student-dashboard-text-muted)]">
                <p className="font-medium text-[var(--student-dashboard-text)]">
                  {blockedByFrequency
                    ? "ระบบยังไม่สร้างข้อความใหม่ เพื่อไม่ให้ถี่เกินไป"
                    : blockedByKAnonymity
                      ? "ระบบยังไม่แสดงฉบับร่างใหม่ เพราะข้อมูลรวมยังไม่ถึงเกณฑ์ความเป็นส่วนตัวขั้นต่ำ"
                      : "ยังไม่มีฉบับร่างที่รอตรวจในตอนนี้"}
                </p>
                <p>
                  {blockedByFrequency
                    ? "ระบบชะลอการสร้างฉบับร่างใหม่ชั่วคราวตาม frequency guard ของห้องนี้ คุณยังสามารถเปิดประวัติข้อความที่ผ่านมาเพื่อดูสิ่งที่เคยอนุมัติหรือข้ามไปแล้วได้"
                    : blockedByKAnonymity
                      ? "ระบบกำลังรอให้มีสัญญาณรวมที่ปลอดภัยพอก่อน เพื่อปกป้องความเป็นส่วนตัวของนักเรียนและคงมาตรฐาน k-anonymity ของห้องนี้"
                      : "ห้องนี้ยังอาจไม่มี recommendation ใหม่เพราะข้อมูลยังไม่พอหรือ workflow ยังไม่พบสัญญาณที่ควรสร้างฉบับร่างในรอบนี้"}
                </p>
              </CardContent>
            </Card>
          )
        ) : (
          <RecommendationList
            recommendations={pendingRecommendations}
            onApprove={handleApprove}
            onDismiss={handleDismiss}
            emptyStateTitle="ยังไม่มีฉบับร่างที่รออนุมัติ"
            emptyStateBody="ฉบับร่างใหม่จะปรากฏที่นี่เมื่อห้องมีสัญญาณเพียงพอและผ่าน safety checks"
          />
        )}
      </div>
    </div>
  );
}

function formatStat(value: number | null) {
  return value !== null ? value.toFixed(1) : "—";
}

function TrendBadge({ trend }: { trend: StudentFeedbackSummary["trend"] }) {
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
    <div className="rounded-[24px] border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-raised)] px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--student-dashboard-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-[var(--student-dashboard-text)]">
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--student-dashboard-text-muted)]">
        {helper}
      </p>
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
    <Card className="student-surface rounded-[24px] border shadow-[0_12px_30px_rgba(2,8,23,0.16)]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--student-dashboard-text-muted)]">
            {label}
          </span>
          <span className={color}>{icon}</span>
        </div>
        <p className="mt-1 text-2xl font-bold text-[var(--student-dashboard-text)]">
          {value !== null ? value.toFixed(1) : "—"}
          <span className="text-sm font-normal text-[var(--student-dashboard-text-muted)]">
            {" "}
            / 5
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
