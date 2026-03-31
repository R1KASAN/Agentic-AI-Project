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
  ClassClimateSummary,
  ClassMetrics,
  RedactedVoiceState,
  StudentFeedbackTrend,
  AuditBlockedReason,
} from "@/types";
import type { TeacherDisplayRiskLevel } from "@/lib/teacherDashboard";

type TeacherClimateOverviewClass = {
  id: string;
  name: string;
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
      return "ยังไม่ออก draft ใหม่ในรอบนี้ เพราะเพิ่งมี action ไปไม่นาน";
    case "k_anonymity":
      return "สัญญาณรวมของห้องยังไม่ปลอดภัยพอสำหรับสร้าง insight เพิ่ม";
    default:
      return null;
  }
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
    (point) => point.mood !== null || point.pace !== null || point.fairness !== null
  );

  return (
    <Card className="teacher-surface rounded-[28px] border shadow-[0_18px_42px_rgba(23,33,51,0.06)]">
      <CardHeader className="space-y-2">
        <CardTitle data-display="true" className="text-2xl font-semibold text-[var(--teacher-dashboard-text)]">{title}</CardTitle>
        <p className="text-sm teacher-text-muted">{description}</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            กำลังโหลดข้อมูลแนวโน้ม...
          </div>
        ) : !hasPlottableData ? (
          <div className="flex h-[240px] items-center justify-center rounded-[24px] border border-dashed border-[color:var(--teacher-dashboard-border)] px-6 text-center text-sm teacher-text-muted">
            {emptyMessage}
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.24)" />
                <XAxis
                  dataKey="label"
                  stroke="rgb(100 116 139)"
                  tick={{ fill: "rgb(100 116 139)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.24)" }}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  stroke="rgb(100 116 139)"
                  tick={{ fill: "rgb(100 116 139)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.24)" }}
                />
                <Tooltip
                  formatter={(value) => [formatScore(value === null ? null : Number(value)), ""]}
                  labelFormatter={(label) => String(label)}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid rgba(148,163,184,0.25)",
                    borderRadius: "12px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="mood"
                  name="อารมณ์"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#6366f1" }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="pace"
                  name="จังหวะคาบ"
                  stroke="#0ea5e9"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#0ea5e9" }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="fairness"
                  name="ความยุติธรรม"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#8b5cf6" }}
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
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">ยังไม่มีห้องเรียนที่เปิดใช้งาน</h2>
            <p className="text-sm text-muted-foreground">
              สร้างห้องเรียนก่อน แล้ว Class Climate จะเริ่มแสดงกราฟและ summary ให้คุณดูที่นี่
            </p>
          </div>
          <Link href="/teacher/class/new">
            <Button>Create Class</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--teacher-dashboard-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--teacher-dashboard-primary)]">
          <BarChart3 className="h-3.5 w-3.5" />
          Climate intelligence workspace
        </div>
        <h1 data-display="true" className="flex items-center gap-3 text-5xl font-semibold tracking-tight text-[var(--teacher-dashboard-text)]">
          <BarChart3 className="h-7 w-7 text-sky-500" />
          Class Climate
        </h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-7 teacher-text-muted">
          เลือกห้องเรียนเพื่อดูภาพรวมบรรยากาศ กราฟแนวโน้ม และสรุปที่ช่วยให้ตัดสินใจได้เร็วขึ้น
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {classes.map((classEntry) => (
          <Card key={classEntry.id} className="teacher-surface rounded-[28px] border shadow-[0_18px_42px_rgba(23,33,51,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(23,33,51,0.1)]">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <h2 data-display="true" className="text-[2rem] font-semibold leading-[1.15] text-[var(--teacher-dashboard-text)]">{classEntry.name}</h2>
                  <ThaiRiskBadge
                    score={classEntry.riskScore}
                    policyLevel={classEntry.riskLevel === "NO_DATA" ? null : classEntry.riskLevel}
                    size="md"
                  />
                </div>
                {classEntry.inquiryModeSuggested && (
                  <Badge variant="secondary" className="bg-violet-50 text-violet-700 border-violet-200">
                    <HelpCircle className="mr-1 h-3 w-3" />
                    Inquiry Mode
                  </Badge>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="teacher-surface-soft rounded-[22px] border p-4">
                  <p className="text-xs uppercase tracking-[0.08em] teacher-text-muted">สมาชิก</p>
                  <p className="mt-1 text-lg font-semibold">{classEntry.studentCount} คน</p>
                </div>
                <div className="teacher-surface-soft rounded-[22px] border p-4">
                  <p className="text-xs uppercase tracking-[0.08em] teacher-text-muted">รอบล่าสุด</p>
                  <p className="mt-1 text-lg font-semibold">{classEntry.latestResponseCount} responses</p>
                </div>
              </div>

              <div className="teacher-surface-soft rounded-[24px] border p-4">
                <div className="flex items-center gap-2 text-xs teacher-text-muted">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  AI summary
                </div>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {classEntry.summaryLine}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs teacher-text-muted">
                <span className="rounded-full bg-sky-100 px-2.5 py-1 font-medium text-sky-700">
                  trend: {describeTrend(classEntry.trend)}
                </span>
                {classEntry.pendingRecommendations > 0 && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700">
                    {classEntry.pendingRecommendations} pending
                  </span>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Link href={`/teacher/climate?classId=${classEntry.id}`} className="flex-1">
                  <Button className="h-12 w-full rounded-2xl bg-[var(--teacher-dashboard-primary)] shadow-[0_10px_24px_rgba(31,122,224,0.2)] hover:bg-[#186bc8]">Open Climate</Button>
                </Link>
                <Link href={`/teacher/class/${classEntry.id}`} className="flex-1">
                  <Button variant="outline" className="h-12 w-full rounded-2xl border-[var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)]">
                    Action Workspace
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
    [selectedClass.climate]
  );
  const {
    data: dailyTrend,
    isLoading: dailyLoading,
  } = useDailyClimateHistory(selectedClass.id, 14);

  const dailyChartData = useMemo<TrendPoint[]>(
    () =>
      dailyTrend.map((point) => ({
        label: point.date,
        mood: point.mood,
        pace: point.pace,
        fairness: point.fairness,
        studentCount: point.studentCount,
      })),
    [dailyTrend]
  );

  const blockedCopy = blockedReasonCopy(selectedClass.blockedReason);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/teacher/climate"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          กลับไปดูทุกห้อง
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 data-display="true" className="text-4xl font-semibold tracking-tight text-[var(--teacher-dashboard-text)]">{selectedClass.name}</h1>
              <RiskIndicator
                score={selectedClass.riskScore}
                policyLevel={selectedClass.riskLevel === "NO_DATA" ? null : selectedClass.riskLevel}
                size="md"
              />
            </div>
            <p className="max-w-3xl text-sm leading-7 teacher-text-muted">
              หน้า Class Climate นี้เน้นให้ครูเห็นสัญญาณรวมของห้องแบบอ่านเร็ว ทั้งภาพรวมแนวโน้ม รายวัน และเสียงสะท้อนที่ผ่านการปกปิดข้อมูลแล้ว
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {selectedClass.inquiryModeSuggested && (
                <Badge variant="secondary" className="bg-violet-50 text-violet-700 border-violet-200">
                  <HelpCircle className="mr-1 h-3 w-3" />
                  Inquiry Mode suggested
                </Badge>
              )}
              {selectedClass.pendingRecommendations > 0 && (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300">
                  {selectedClass.pendingRecommendations} pending draft
                </Badge>
              )}
              {selectedClass.blockedReason && (
                <Badge variant="outline">
                  {selectedClass.blockedReason === "k_anonymity"
                    ? "Waiting for safe aggregate signal"
                    : "No new draft this cycle"}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {classes.map((classEntry) => {
              const active = classEntry.id === selectedClass.id;
              return (
                <Link key={classEntry.id} href={`/teacher/climate?classId=${classEntry.id}`}>
                  <Button variant={active ? "default" : "outline"} size="sm" className={active ? "bg-[var(--teacher-dashboard-primary)] hover:bg-[#186bc8]" : "border-[var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)]"}>
                    {classEntry.name}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <Card className="overflow-hidden rounded-[30px] border border-[#1c2638] bg-[radial-gradient(circle_at_top_left,rgba(31,122,224,0.16),transparent_28%),linear-gradient(145deg,#162033,#101826)] text-slate-50 shadow-[0_24px_55px_rgba(15,23,42,0.24)]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1.5fr_0.9fr]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-300">
                <Sparkles className="h-3.5 w-3.5" />
                AI climate summary
              </div>
              <div className="space-y-2">
                <h2 data-display="true" className="text-3xl font-semibold">ภาพรวมล่าสุดของห้องนี้</h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-300">
                  {selectedClass.summaryLine}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-xs text-slate-400">Avg Mood</p>
                  <p className="mt-2 text-xl font-semibold">{formatScore(selectedClass.avgMood)}</p>
                </div>
                <div className="rounded-[22px] border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-xs text-slate-400">Avg Pace</p>
                  <p className="mt-2 text-xl font-semibold">{formatScore(selectedClass.avgPace)}</p>
                </div>
                <div className="rounded-[22px] border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-xs text-slate-400">Avg Fairness</p>
                  <p className="mt-2 text-xl font-semibold">{formatScore(selectedClass.avgFairness)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-[24px] border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-sky-500/15 p-2 text-sky-300">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    รอบ aggregate ล่าสุด
                  </p>
                  <p className="text-sm font-semibold text-slate-100">
                    {formatThaiDate(selectedClass.latestWeekStart)}
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/60 p-3 text-sm text-slate-300">
                มีข้อมูลรวม {selectedClass.latestResponseCount} responses และสะสม {selectedClass.totalWeeksWithData} สัปดาห์ที่ใช้เปรียบเทียบแนวโน้มได้
              </div>
              <div className="rounded-xl bg-emerald-500/10 p-3 text-xs leading-5 text-emerald-100">
                หน้านี้แสดงเฉพาะ aggregate signal และ redacted student voice เท่านั้น ไม่มีข้อมูลรายบุคคลของนักเรียน
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="teacher-surface rounded-[28px] border shadow-[0_18px_42px_rgba(23,33,51,0.06)]">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-sky-100 p-2 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                <MessageSquareQuote className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Redacted Student Voice</h2>
                <p className="text-sm text-muted-foreground">
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
                    className="rounded-xl border bg-slate-50/80 px-4 py-3 dark:bg-slate-900/60"
                  >
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {snippet.tone ?? "mixed"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground">{snippet.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                {selectedClass.redactedVoice.message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TrendChartCard
          title="Weekly climate trend"
          description="ดูแนวโน้ม aggregate ของหลายสัปดาห์ล่าสุดเพื่อประเมินว่าบรรยากาศกำลังเคลื่อนไปทางไหน"
          data={weeklyTrend}
          loading={false}
          emptyMessage="ยังมีข้อมูลรายสัปดาห์ไม่พอสำหรับแสดงแนวโน้มของห้องนี้"
        />
        <TrendChartCard
          title="Daily climate trend"
          description="ดูจังหวะรายวันของการเช็กอินล่าสุด เพื่อจับการเปลี่ยนแปลงที่เกิดขึ้นเร็วกว่า weekly rollup"
          data={dailyChartData}
          loading={dailyLoading}
          emptyMessage="ยังมีข้อมูลรายวันไม่พอสำหรับแสดงแนวโน้มของห้องนี้"
        />
      </div>

      <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Action context</h2>
            <p className="text-sm text-muted-foreground">
              ใช้หน้า Class Detail เป็น workspace สำหรับ approve/dismiss draft และติดตาม action ของครู ส่วนหน้านี้ตั้งใจให้เป็นหน้าอ่าน climate signal ก่อนตัดสินใจ
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{selectedClass.pendingRecommendations} pending draft</Badge>
              {selectedClass.latestPolicySelected && (
                <Badge variant="outline">Latest policy: {selectedClass.latestPolicySelected}</Badge>
              )}
            </div>
            {blockedCopy && (
              <p className="text-sm text-muted-foreground">{blockedCopy}</p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={`/teacher/class/${selectedClass.id}`}>
              <Button>Open Action Workspace</Button>
            </Link>
            <Link href={`/teacher/class/${selectedClass.id}/responses`}>
              <Button variant="outline">View Response History</Button>
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

  return <ClimateDrilldownState classes={classes} selectedClass={selectedClass} />;
}
