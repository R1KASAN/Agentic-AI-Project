"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  HelpCircle,
  Loader2,
  MessageSquareQuote,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskIndicator } from "@/components/domain/teacher/RiskIndicator";
import { ThaiRiskBadge } from "@/components/domain/teacher/ThaiRiskBadge";
import { useDailyClimateHistory } from "@/hooks/useDailyClimateHistory";
import type {
  AuditBlockedReason,
  ClassClimateSummary,
  ClassMetrics,
  RedactedVoiceState,
  StudentFeedbackTrend,
} from "@/types";
import type { TeacherDisplayRiskLevel } from "@/lib/teacherDashboard";

type TeacherClimateOverviewClass = {
  id: string;
  name: string;
  description: string | null;
  studentCount: number;
  riskLevel: TeacherDisplayRiskLevel;
  riskScore: number | null;
  pendingRecommendations: number;
  inquiryModeSuggested: boolean;
  blockedReason: AuditBlockedReason;
  latestPolicySelected: string | null;
  summaryLine: string;
  latestWeekStart: string | null;
  latestResponseCount: number;
  avgMood: number | null;
  avgPace: number | null;
  avgFairness: number | null;
  totalWeeksWithData: number;
  trend: StudentFeedbackTrend;
  climate: ClassClimateSummary[];
  metrics: ClassMetrics;
};

type TeacherClimateSelectedClass = TeacherClimateOverviewClass & {
  redactedVoice: RedactedVoiceState;
};

type TeacherClimateClientProps = {
  classes: TeacherClimateOverviewClass[];
  selectedClass: TeacherClimateSelectedClass | null;
};

type TrendPoint = {
  label: string;
  mood: number | null;
  pace: number | null;
  fairness: number | null;
  studentCount: number | null;
};

function formatThaiDate(value: string | null) {
  if (!value) return "ยังไม่มีข้อมูล";

  return new Date(value).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatScore(value: number | null) {
  if (value === null || Number.isNaN(value)) return "-";
  return `${value.toFixed(2)}/5`;
}

function describeTrend(trend: StudentFeedbackTrend) {
  switch (trend) {
    case "up":
      return "กำลังดีขึ้น";
    case "down":
      return "ต้องติดตามเพิ่ม";
    case "flat":
      return "ใกล้เคียงเดิม";
    default:
      return "ข้อมูลยังไม่พอ";
  }
}

function formatWeekLabel(dateString: string) {
  return new Date(dateString).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });
}

function toWeeklyTrendPoints(climate: ClassClimateSummary[]): TrendPoint[] {
  return climate
    .slice()
    .sort((a, b) => a.week_start.localeCompare(b.week_start))
    .map((week) => ({
      label: formatWeekLabel(week.week_start),
      mood: week.avg_mood,
      pace: week.avg_pace,
      fairness: week.avg_fairness,
      studentCount: week.check_in_count ?? null,
    }));
}

function blockedReasonCopy(blockedReason: AuditBlockedReason) {
  switch (blockedReason) {
    case "frequency_limit_exceeded":
      return "ยังไม่มีฉบับร่างใหม่ในรอบนี้ เพราะเพิ่งมี action ไปไม่นาน";
    case "k_anonymity":
      return "ระบบกำลังรอสัญญาณรวมที่ปลอดภัยพอ ก่อนจะสร้าง insight หรือ action เพิ่ม";
    default:
      return null;
  }
}

function OverviewStatus({
  inquiryModeSuggested,
  pendingRecommendations,
  blockedReason,
}: {
  inquiryModeSuggested: boolean;
  pendingRecommendations: number;
  blockedReason: AuditBlockedReason;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {inquiryModeSuggested && (
        <Badge
          variant="secondary"
          className="border-[color:var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] text-[var(--teacher-dashboard-text)]"
        >
          <HelpCircle className="mr-1 h-3 w-3" />
          โหมดค้นหาบริบท
        </Badge>
      )}
      {pendingRecommendations > 0 ? (
        <span className="rounded-full bg-[rgba(253,230,138,0.12)] px-2.5 py-1 text-xs font-medium text-[var(--teacher-dashboard-warning)]">
          {pendingRecommendations} รายการรอตรวจ
        </span>
      ) : (
        <span className="rounded-full bg-[rgba(147,197,253,0.12)] px-2.5 py-1 text-xs font-medium text-[var(--teacher-dashboard-primary)]">
          {blockedReason === "k_anonymity"
            ? "กำลังรอสัญญาณรวม"
            : "ติดตามครบแล้ว"}
        </span>
      )}
    </div>
  );
}

function ClimateMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="teacher-surface-soft rounded-[22px] border p-4">
      <p className="text-xs uppercase tracking-[0.08em] teacher-text-muted">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-[var(--teacher-dashboard-text)]">
        {value}
      </p>
      <p className="mt-1 text-xs teacher-text-muted">{helper}</p>
    </div>
  );
}

function TrendChartCard({
  title,
  description,
  data,
  loading,
  emptyMessage,
}: {
  title: string;
  description: string;
  data: TrendPoint[];
  loading: boolean;
  emptyMessage: string;
}) {
  const hasPlottableData = data.some(
    (point) =>
      point.mood !== null || point.pace !== null || point.fairness !== null,
  );

  return (
    <Card className="product-section-card">
      <CardHeader className="space-y-2">
        <CardTitle
          data-display="true"
          className="text-2xl font-semibold text-[var(--teacher-dashboard-text)]"
        >
          {title}
        </CardTitle>
        <p className="text-sm teacher-text-muted">{description}</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[280px] items-center justify-center text-sm teacher-text-muted">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            กำลังโหลดข้อมูลแนวโน้ม...
          </div>
        ) : !hasPlottableData ? (
          <div className="teacher-surface-soft flex h-[240px] items-center justify-center rounded-[24px] border border-dashed px-6 text-center text-sm teacher-text-muted">
            {emptyMessage}
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.18)"
                />
                <XAxis
                  dataKey="label"
                  stroke="rgb(148 163 184)"
                  tick={{ fill: "rgb(148 163 184)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.18)" }}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  stroke="rgb(148 163 184)"
                  tick={{ fill: "rgb(148 163 184)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.18)" }}
                />
                <Tooltip
                  formatter={(value) => [
                    formatScore(value === null ? null : Number(value)),
                    "",
                  ]}
                  labelFormatter={(label) => String(label)}
                  contentStyle={{
                    backgroundColor: "#0f1b2d",
                    color: "#e5e7eb",
                    border: "1px solid rgba(148,163,184,0.18)",
                    borderRadius: "14px",
                  }}
                />
                <Legend wrapperStyle={{ color: "#cbd5e1" }} />
                <Line
                  type="monotone"
                  dataKey="mood"
                  name="อารมณ์"
                  stroke="#a78bfa"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#a78bfa" }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="pace"
                  name="จังหวะคาบ"
                  stroke="#7dd3fc"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#7dd3fc" }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="fairness"
                  name="ความยุติธรรม"
                  stroke="#5eead4"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#5eead4" }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClimateOverviewState({ classes }: { classes: TeacherClimateOverviewClass[] }) {
  if (classes.length === 0) {
    return (
      <Card className="product-section-card border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Users className="h-10 w-10 teacher-text-muted" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[var(--teacher-dashboard-text)]">
              ยังไม่มีห้องเรียนที่เปิดใช้งาน
            </h2>
            <p className="text-sm teacher-text-muted">
              สร้างห้องเรียนก่อน แล้ว Class Climate จะเริ่มแสดงภาพรวมและแนวโน้มให้ที่นี่
            </p>
          </div>
          <Link href="/teacher/class/new">
            <Button className="bg-[var(--teacher-dashboard-primary)] text-slate-950 hover:bg-[#bfdbfe]">
              สร้างห้องเรียน
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="product-hero-card p-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--teacher-dashboard-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--teacher-dashboard-primary)]">
          <BarChart3 className="h-3.5 w-3.5" />
          Climate intelligence workspace
        </div>
        <h1
          data-display="true"
          className="flex items-center gap-3 text-5xl font-semibold tracking-tight text-[var(--teacher-dashboard-text)]"
        >
          <BarChart3 className="h-7 w-7 text-[var(--teacher-dashboard-primary)]" />
          Class Climate
        </h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-7 teacher-text-muted">
          เลือกห้องเรียนเพื่อดูภาพรวมบรรยากาศ กราฟแนวโน้ม และสรุปที่ช่วยให้ครูตัดสินใจได้เร็วขึ้นโดยยังรักษา privacy-safe aggregate view
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {classes.map((classEntry) => (
          <Card
            key={classEntry.id}
            className="product-section-card h-full overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[0_26px_62px_rgba(2,8,23,0.32)]"
          >
            <CardContent className="flex h-full flex-col space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <h2
                    data-display="true"
                    className="product-card-title text-[clamp(1.55rem,2.2vw,2.35rem)] font-semibold leading-[1.12] text-[var(--teacher-dashboard-text)]"
                  >
                    {classEntry.name}
                  </h2>
                  {classEntry.description && (
                    <p className="max-w-2xl text-sm leading-6 teacher-text-muted">
                      {classEntry.description}
                    </p>
                  )}
                  <ThaiRiskBadge
                    score={classEntry.riskScore}
                    policyLevel={
                      classEntry.riskLevel === "NO_DATA"
                        ? null
                        : classEntry.riskLevel
                    }
                    size="md"
                  />
                </div>
              </div>

              <OverviewStatus
                inquiryModeSuggested={classEntry.inquiryModeSuggested}
                pendingRecommendations={classEntry.pendingRecommendations}
                blockedReason={classEntry.blockedReason}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <ClimateMetric
                  label="สมาชิก"
                  value={`${classEntry.studentCount} คน`}
                  helper="จำนวนสมาชิกทั้งหมดในห้อง"
                />
                <ClimateMetric
                  label="รอบล่าสุด"
                  value={`${classEntry.latestResponseCount} คำตอบ`}
                  helper={`สะสม ${classEntry.totalWeeksWithData} สัปดาห์`}
                />
              </div>

              <div className="teacher-surface-soft rounded-[24px] border p-4">
                <div className="flex items-center gap-2 text-xs teacher-text-muted">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  AI summary
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--teacher-dashboard-text)]">
                  {classEntry.summaryLine}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs teacher-text-muted">
                <span className="rounded-full bg-[rgba(147,197,253,0.12)] px-2.5 py-1 font-medium text-[var(--teacher-dashboard-primary)]">
                  แนวโน้ม: {describeTrend(classEntry.trend)}
                </span>
              </div>

              <div className="mt-auto grid gap-2 pt-1">
                <Link href={`/teacher/climate?classId=${classEntry.id}`} className="min-w-0">
                  <Button className="product-card-button h-auto min-h-12 w-full rounded-2xl bg-[var(--teacher-dashboard-primary)] px-4 py-3 text-left text-slate-950 shadow-[0_10px_24px_rgba(147,197,253,0.18)] hover:bg-[#bfdbfe]">
                    เปิดมุมมอง climate
                  </Button>
                </Link>
                <Link href={`/teacher/class/${classEntry.id}`} className="min-w-0">
                  <Button
                    variant="outline"
                    className="product-card-button h-auto min-h-12 w-full rounded-2xl border-[var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] px-4 py-3 text-left text-[var(--teacher-dashboard-text)] hover:bg-[var(--teacher-dashboard-primary-soft)]"
                  >
                    ไปยัง workspace
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ClimateDrilldownState({
  classes,
  selectedClass,
}: {
  classes: TeacherClimateOverviewClass[];
  selectedClass: TeacherClimateSelectedClass;
}) {
  const weeklyTrend = useMemo(
    () => toWeeklyTrendPoints(selectedClass.climate),
    [selectedClass.climate],
  );
  const { data: dailyTrend, isLoading: dailyLoading } = useDailyClimateHistory(
    selectedClass.id,
    14,
  );

  const dailyChartData = useMemo<TrendPoint[]>(
    () =>
      dailyTrend.map((point) => ({
        label: point.date,
        mood: point.mood,
        pace: point.pace,
        fairness: point.fairness,
        studentCount: point.studentCount,
      })),
    [dailyTrend],
  );

  const blockedCopy = blockedReasonCopy(selectedClass.blockedReason);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/teacher/climate"
          className="inline-flex items-center gap-1 text-xs teacher-text-muted transition-colors hover:text-[var(--teacher-dashboard-text)]"
        >
          <ArrowLeft className="h-3 w-3" />
          กลับไปดูทุกห้อง
        </Link>

        <div className="product-hero-card flex flex-col gap-4 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1
                data-display="true"
                className="text-4xl font-semibold tracking-tight text-[var(--teacher-dashboard-text)]"
              >
                {selectedClass.name}
              </h1>
              <RiskIndicator
                score={selectedClass.riskScore}
                policyLevel={
                  selectedClass.riskLevel === "NO_DATA"
                    ? null
                    : selectedClass.riskLevel
                }
                size="md"
              />
            </div>
            <p className="max-w-3xl text-sm leading-7 teacher-text-muted">
              หน้านี้ช่วยให้ครูอ่านภาพรวมแนวโน้มของห้องแบบเร็วพอจะตัดสินใจ
              โดยใช้เฉพาะ aggregate signal และเสียงสะท้อนที่ผ่านการปกปิดข้อมูลแล้ว
            </p>
            <OverviewStatus
              inquiryModeSuggested={selectedClass.inquiryModeSuggested}
              pendingRecommendations={selectedClass.pendingRecommendations}
              blockedReason={selectedClass.blockedReason}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {classes.map((classEntry) => {
              const active = classEntry.id === selectedClass.id;
              return (
                <Link
                  key={classEntry.id}
                  href={`/teacher/climate?classId=${classEntry.id}`}
                >
                  <Button
                    variant={active ? "default" : "outline"}
                    size="sm"
                    title={classEntry.name}
                    className={
                      `h-auto max-w-[16rem] whitespace-normal rounded-2xl px-3 py-2 text-left leading-tight ${
                        active
                          ? "bg-[var(--teacher-dashboard-primary)] text-slate-950 hover:bg-[#bfdbfe]"
                          : "border-[var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] text-[var(--teacher-dashboard-text)] hover:bg-[var(--teacher-dashboard-primary-soft)]"
                      }`
                    }
                  >
                    {classEntry.name}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <Card className="product-section-card overflow-hidden">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1.5fr_0.9fr]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--teacher-dashboard-primary-soft)] px-3 py-1 text-xs font-medium text-[var(--teacher-dashboard-primary)]">
                <Sparkles className="h-3.5 w-3.5" />
                AI climate summary
              </div>
              <div className="space-y-2">
                <h2
                  data-display="true"
                  className="text-[clamp(1.75rem,2.4vw,2.6rem)] font-semibold text-[var(--teacher-dashboard-text)]"
                >
                  ภาพรวมล่าสุดของห้องนี้
                </h2>
                {selectedClass.description && (
                  <p className="max-w-2xl text-sm leading-6 teacher-text-muted">
                    {selectedClass.description}
                  </p>
                )}
                <p className="max-w-2xl text-sm leading-6 teacher-text-muted">
                  {selectedClass.summaryLine}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <ClimateMetric
                  label="อารมณ์เฉลี่ย"
                  value={formatScore(selectedClass.avgMood)}
                  helper="สัญญาณรวมของห้อง"
                />
                <ClimateMetric
                  label="จังหวะเฉลี่ย"
                  value={formatScore(selectedClass.avgPace)}
                  helper="จังหวะของคาบในภาพรวม"
                />
                <ClimateMetric
                  label="ความยุติธรรมเฉลี่ย"
                  value={formatScore(selectedClass.avgFairness)}
                  helper="สะท้อนความรู้สึกของทั้งห้อง"
                />
              </div>
            </div>

            <div className="teacher-surface-soft space-y-3 rounded-[24px] border p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-[var(--teacher-dashboard-primary-soft)] p-2 text-[var(--teacher-dashboard-primary)]">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide teacher-text-muted">
                    รอบ aggregate ล่าสุด
                  </p>
                  <p className="text-sm font-semibold text-[var(--teacher-dashboard-text)]">
                    {formatThaiDate(selectedClass.latestWeekStart)}
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-[rgba(2,8,23,0.18)] p-3 text-sm teacher-text-muted">
                มีข้อมูลรวม {selectedClass.latestResponseCount} คำตอบ และสะสม{" "}
                {selectedClass.totalWeeksWithData} สัปดาห์ที่ใช้เปรียบเทียบแนวโน้มได้
              </div>
              <div className="rounded-xl bg-emerald-500/10 p-3 text-xs leading-5 text-emerald-100">
                หน้านี้แสดงเฉพาะ aggregate signal และ redacted student voice
                เท่านั้น ไม่มีข้อมูลรายบุคคลของนักเรียน
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="product-section-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-[var(--teacher-dashboard-primary-soft)] p-2 text-[var(--teacher-dashboard-primary)]">
                <MessageSquareQuote className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h2
                  data-display="true"
                  className="text-2xl font-semibold text-[var(--teacher-dashboard-text)]"
                >
                  เสียงสะท้อนที่ปกปิดข้อมูลแล้ว
                </h2>
                <p className="text-sm teacher-text-muted">
                  {selectedClass.redactedVoice.message}
                </p>
              </div>
            </div>

            {selectedClass.redactedVoice.status === "ready" &&
            selectedClass.redactedVoice.snippets.length > 0 ? (
              <div className="space-y-3">
                {selectedClass.redactedVoice.snippets.map((snippet) => (
                  <div
                    key={snippet.id}
                    className="teacher-surface-soft rounded-[22px] border px-4 py-3"
                  >
                    <p className="text-xs uppercase tracking-wide teacher-text-muted">
                      {snippet.tone ?? "ผสม"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--teacher-dashboard-text)]">
                      {snippet.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="teacher-surface-soft rounded-[22px] border border-dashed p-4 text-sm teacher-text-muted">
                {selectedClass.redactedVoice.message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TrendChartCard
          title="Weekly climate trend"
          description="ดูแนวโน้ม aggregate ของหลายสัปดาห์ล่าสุดเพื่อประเมินว่าบรรยากาศของห้องกำลังเคลื่อนไปทางไหน"
          data={weeklyTrend}
          loading={false}
          emptyMessage="ยังมีข้อมูลรายสัปดาห์ไม่พอสำหรับแสดงแนวโน้มของห้องนี้"
        />
        <TrendChartCard
          title="Daily climate trend"
          description="ดูสัญญาณรายวันล่าสุดเพื่อจับการเปลี่ยนแปลงที่เกิดเร็วกว่า weekly rollup"
          data={dailyChartData}
          loading={dailyLoading}
          emptyMessage="ยังมีข้อมูลรายวันไม่พอสำหรับแสดงแนวโน้มของห้องนี้"
        />
      </div>

      <Card className="product-section-card">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--teacher-dashboard-text)]">
              Action context
            </h2>
            <p className="text-sm teacher-text-muted">
              ใช้หน้า Class Detail เป็น workspace สำหรับ approve หรือ dismiss
              ฉบับร่าง ส่วนหน้านี้ตั้งใจให้ครูอ่าน climate signal ก่อนตัดสินใจ
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-[rgba(253,230,138,0.12)] text-[var(--teacher-dashboard-warning)] hover:bg-[rgba(253,230,138,0.12)]">
                {selectedClass.pendingRecommendations} ฉบับร่างรอตรวจ
              </Badge>
              {selectedClass.latestPolicySelected && (
                <Badge
                  variant="outline"
                  className="border-[var(--teacher-dashboard-border)] text-[var(--teacher-dashboard-text-muted)]"
                >
                  นโยบายล่าสุด: {selectedClass.latestPolicySelected}
                </Badge>
              )}
            </div>
            {blockedCopy && (
              <p className="text-sm teacher-text-muted">{blockedCopy}</p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={`/teacher/class/${selectedClass.id}`}>
              <Button className="bg-[var(--teacher-dashboard-primary)] text-slate-950 hover:bg-[#bfdbfe]">
                เปิด action workspace
              </Button>
            </Link>
            <Link href={`/teacher/class/${selectedClass.id}/responses`}>
              <Button
                variant="outline"
                className="border-[var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] text-[var(--teacher-dashboard-text)] hover:bg-[var(--teacher-dashboard-primary-soft)]"
              >
                ดูประวัติการตอบสนอง
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TeacherClimateClient({
  classes,
  selectedClass,
}: TeacherClimateClientProps) {
  if (!selectedClass) {
    return <ClimateOverviewState classes={classes} />;
  }

  return (
    <ClimateDrilldownState classes={classes} selectedClass={selectedClass} />
  );
}
