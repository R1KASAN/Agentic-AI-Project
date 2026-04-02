"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    GraduationCap,
    Loader2,
    MessageSquare,
    ShieldCheck,
    Sparkles,
    Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDailyClimateHistory } from "@/hooks/useDailyClimateHistory";
import { useClimateHistory } from "@/hooks/useClimateHistory";
import type { StudentFeedbackResponse } from "@/types";

type EnrolledClass = {
    class_id: string;
    class_name: string;
    description: string | null;
    teacher_name: string | null;
    last_check_in: string | null;
};

type TrendChartPoint = {
    label: string;
    mood: number | null;
    pace: number | null;
    fairness: number | null;
    studentCount: number | null;
};

type ClimateTrendCardProps = {
    title: string;
    helperText: string;
    loading: boolean;
    data: TrendChartPoint[];
    emptyMessage: string;
    statusText?: string | null;
    insightText?: string | null;
    chartHeightClassName?: string;
};

type DailyPrivacyNoticeState = {
    dateLabel: string;
    responseCount: number | null;
};

function formatThaiDate(dateString: string | null) {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function getComparisonCopy(
    comparisonLabel: StudentFeedbackResponse["current_week"]["comparison_label"]
) {
    switch (comparisonLabel) {
        case "better":
            return {
                badge: "ดีขึ้นเล็กน้อย",
                tone: "bg-[color:rgb(209_250_229/0.12)] text-[var(--student-dashboard-success)]",
            };
        case "worse":
            return {
                badge: "ตึงเครียดขึ้น",
                tone: "bg-[color:rgb(254_202_202/0.12)] text-[var(--student-dashboard-danger)]",
            };
        case "similar":
            return {
                badge: "คล้ายเดิม",
                tone: "bg-[color:rgb(253_230_138/0.12)] text-[var(--student-dashboard-warning)]",
            };
        default:
            return {
                badge: "ข้อมูลยังไม่พอ",
                tone: "bg-[color:rgb(253_230_138/0.12)] text-[var(--student-dashboard-warning)]",
            };
    }
}

function formatScore(value: number | null | undefined) {
    if (value === null || value === undefined) return "-";
    return `${Number(value).toFixed(2)}/5`;
}

function describeMood(value: number | null) {
    if (value === null) return "ยังไม่มีข้อมูลพอ";
    if (value <= 2) return "ค่อนข้างตึง";
    if (value <= 3) return "ยังตึงอยู่บ้าง";
    if (value <= 4) return "ค่อนข้างสบายขึ้น";
    return "สบายและมั่นคง";
}

function describePace(value: number | null) {
    if (value === null) return "ยังไม่มีข้อมูลพอ";
    if (value < 3) return "ช้ากว่าปกติ";
    if (value > 3) return "เร็วกว่าปกติ";
    return "ใกล้เคียงปกติ";
}

function describeFairness(value: number | null) {
    if (value === null) return "ยังไม่มีข้อมูลพอ";
    if (value <= 2.5) return "ยังน่ากังวล";
    if (value <= 3.5) return "อยู่ระดับกลาง";
    return "ค่อนข้างดี";
}

function buildPointInsight(point: TrendChartPoint | null, prefix: string) {
    if (!point) {
        return null;
    }

    return `${prefix} ห้องเรียนดู${describeMood(point.mood)} จังหวะคาบ${describePace(point.pace)} และความยุติธรรม${describeFairness(point.fairness)}`;
}

function ClimateTrendCard({
    title,
    helperText,
    loading,
    data,
    emptyMessage,
    statusText,
    insightText,
    chartHeightClassName = "h-[300px]",
}: ClimateTrendCardProps) {
    const hasPlottableData = data.some(
        (point) =>
            point.mood !== null ||
            point.pace !== null ||
            point.fairness !== null
    );

    return (
        <Card className="overflow-hidden border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] text-[var(--student-dashboard-text)] shadow-[0_18px_40px_rgba(2,8,23,0.28)]">
            <CardHeader className="border-b border-[color:var(--student-dashboard-border)]">
                <CardTitle className="text-lg font-semibold text-[var(--student-dashboard-text)]">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
                {statusText && (
                    <p className="text-sm text-[var(--student-dashboard-text-muted)]">
                        {statusText}
                    </p>
                )}

                {insightText && !loading && hasPlottableData && (
                    <div className="rounded-2xl border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-raised)] p-4">
                        <p className="text-sm leading-6 text-[var(--student-dashboard-text)]">
                            {insightText}
                        </p>
                    </div>
                )}

                {loading ? (
                    <div className="flex h-[280px] items-center justify-center text-sm text-[var(--student-dashboard-text-muted)]">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        กำลังโหลดกราฟแนวโน้ม…
                    </div>
                ) : !hasPlottableData ? (
                    <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-raised)] px-6 text-center text-sm text-[var(--student-dashboard-text-muted)]">
                        {emptyMessage}
                    </div>
                ) : (
                    <div className={chartHeightClassName}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={data}
                                margin={{ top: 12, right: 12, left: 0, bottom: 8 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="var(--student-dashboard-grid)"
                                />
                                <XAxis
                                    dataKey="label"
                                    stroke="var(--student-dashboard-text-muted)"
                                    tick={{
                                        fill: "var(--student-dashboard-text-muted)",
                                        fontSize: 12,
                                    }}
                                    tickLine={false}
                                    axisLine={{ stroke: "var(--student-dashboard-grid)" }}
                                />
                                <YAxis
                                    domain={[1, 5]}
                                    ticks={[1, 2, 3, 4, 5]}
                                    stroke="var(--student-dashboard-text-muted)"
                                    tick={{
                                        fill: "var(--student-dashboard-text-muted)",
                                        fontSize: 12,
                                    }}
                                    tickLine={false}
                                    axisLine={{ stroke: "var(--student-dashboard-grid)" }}
                                />
                                <Tooltip
                                    formatter={(value, name) => [
                                        name === "อารมณ์"
                                            ? `${describeMood(
                                                  value === null || value === undefined
                                                      ? null
                                                      : Number(value)
                                              )} (${formatScore(
                                                  value === null || value === undefined
                                                      ? null
                                                      : Number(value)
                                              )})`
                                            : name === "จังหวะคาบ"
                                              ? `${describePace(
                                                    value === null || value === undefined
                                                        ? null
                                                        : Number(value)
                                                )} (${formatScore(
                                                    value === null || value === undefined
                                                        ? null
                                                        : Number(value)
                                                )})`
                                              : `${describeFairness(
                                                    value === null || value === undefined
                                                        ? null
                                                        : Number(value)
                                                )} (${formatScore(
                                                    value === null || value === undefined
                                                        ? null
                                                        : Number(value)
                                                )})`,
                                        String(name ?? ""),
                                    ]}
                                    labelFormatter={(label) => String(label)}
                                    contentStyle={{
                                        backgroundColor: "var(--student-dashboard-surface-raised)",
                                        border: "1px solid var(--student-dashboard-border)",
                                        borderRadius: "12px",
                                        color: "var(--student-dashboard-text)",
                                    }}
                                />
                                <Legend
                                    wrapperStyle={{
                                        color: "var(--student-dashboard-text-muted)",
                                        fontSize: "12px",
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="mood"
                                    name="อารมณ์"
                                    stroke="var(--student-dashboard-chart-mood)"
                                    strokeWidth={2.5}
                                    dot={{ r: 4, fill: "var(--student-dashboard-chart-mood)" }}
                                    activeDot={{ r: 6 }}
                                    connectNulls={false}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="pace"
                                    name="จังหวะคาบ"
                                    stroke="var(--student-dashboard-chart-pace)"
                                    strokeWidth={2.5}
                                    dot={{ r: 4, fill: "var(--student-dashboard-chart-pace)" }}
                                    activeDot={{ r: 6 }}
                                    connectNulls={false}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="fairness"
                                    name="ความยุติธรรม"
                                    stroke="var(--student-dashboard-chart-fairness)"
                                    strokeWidth={2.5}
                                    dot={{
                                        r: 4,
                                        fill: "var(--student-dashboard-chart-fairness)",
                                    }}
                                    activeDot={{ r: 6 }}
                                    connectNulls={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                <p className="text-xs text-[var(--student-dashboard-text-muted)]">
                    {helperText}
                </p>
            </CardContent>
        </Card>
    );
}

function ImpactSummaryCard({
    className,
    latestCheckInAt,
    currentWeekSummary,
    comparisonLabel,
}: {
    className: string | null;
    latestCheckInAt: string | null;
    currentWeekSummary: string;
    comparisonLabel: StudentFeedbackResponse["current_week"]["comparison_label"];
}) {
    const comparison = getComparisonCopy(comparisonLabel);

    return (
        <Card className="overflow-hidden border-[color:var(--student-dashboard-border)] bg-[linear-gradient(135deg,rgba(15,27,45,1),rgba(19,33,52,0.96))] text-[var(--student-dashboard-text)] shadow-[0_18px_44px_rgba(2,8,23,0.32)]">
            <CardContent className="grid gap-5 p-6 lg:grid-cols-[1.4fr_0.9fr]">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[var(--student-dashboard-primary-soft)] px-3 py-1 text-xs font-medium text-[var(--student-dashboard-primary)]">
                        <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                        บรรยากาศของห้องเรียนตอนนี้
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-pretty text-2xl font-semibold text-[var(--student-dashboard-text)]">
                            {className || "ห้องเรียนนี้"}
                        </h2>
                        <p className="max-w-2xl text-sm leading-6 text-[var(--student-dashboard-text-muted)]">
                            สรุปอัตโนมัติจากการเช็กอินล่าสุดของอาทิตย์นี้ และเทียบกับสัปดาห์ก่อน
                        </p>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-raised)] p-5 shadow-sm">
                        <Badge
                            className={`border-0 px-3 py-1 text-xs font-medium ${comparison.tone}`}
                            variant="secondary"
                        >
                            เทียบกับสัปดาห์ก่อน: {comparison.badge}
                        </Badge>
                        <p className="text-sm leading-7 text-[var(--student-dashboard-text)]">
                            {currentWeekSummary}
                        </p>
                    </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-raised)] p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-[var(--student-dashboard-primary-soft)] p-2 text-[var(--student-dashboard-primary)]">
                            <CalendarDays aria-hidden="true" className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-[var(--student-dashboard-text-muted)]">
                                เช็กอินล่าสุด
                            </p>
                            <p className="text-sm font-semibold text-[var(--student-dashboard-text)]">
                                {formatThaiDate(latestCheckInAt) || "ยังไม่มีข้อมูลเช็กอินล่าสุด"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-xl bg-[var(--student-dashboard-surface-soft)] p-3">
                        <ShieldCheck
                            aria-hidden="true"
                            className="mt-0.5 h-4 w-4 text-[var(--student-dashboard-success)]"
                        />
                        <p className="text-xs leading-5 text-[var(--student-dashboard-text-muted)]">
                            ข้อมูลนี้แสดงเป็นภาพรวมของห้องเพื่อคุ้มครองความเป็นส่วนตัวของนักเรียน
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function LastWeekSummaryCard({
    summary,
    weekStart,
}: {
    summary: string;
    weekStart: string | null;
}) {
    return (
        <Card className="border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] text-[var(--student-dashboard-text)] shadow-[0_14px_36px_rgba(2,8,23,0.24)]">
            <CardHeader className="gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--student-dashboard-surface-soft)] px-3 py-1 text-xs font-medium text-[var(--student-dashboard-text-muted)]">
                    <BarChart3 aria-hidden="true" className="h-3.5 w-3.5" />
                    สัปดาห์ก่อน
                </div>
                <CardTitle className="text-lg text-[var(--student-dashboard-text)]">
                    สรุปบรรยากาศของสัปดาห์ก่อน
                </CardTitle>
                <p className="text-sm leading-6 text-[var(--student-dashboard-text-muted)]">
                    สรุปและกราฟด้านล่างเล่าบรรยากาศของสัปดาห์ก่อน เพื่อใช้เทียบกับอาทิตย์นี้ด้านบน
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                {weekStart && (
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--student-dashboard-text-muted)]">
                        อ้างอิงสัปดาห์ของ {formatThaiDate(weekStart)}
                    </p>
                )}
                <div className="rounded-2xl border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-raised)] p-5">
                    <p className="text-sm leading-7 text-[var(--student-dashboard-text)]">
                        {summary}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

function TeacherResponseCard({
    recentAction,
}: {
    recentAction: StudentFeedbackResponse["recent_action"];
}) {
    return (
        <Card className="border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-soft)] text-[var(--student-dashboard-text)] shadow-[0_12px_30px_rgba(2,8,23,0.18)]">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-[var(--student-dashboard-text)]">
                    <MessageSquare className="h-5 w-5 text-[var(--student-dashboard-text-muted)]" />
                    อัปเดตล่าสุดที่ครูสื่อสารกับห้อง
                </CardTitle>
            </CardHeader>
            <CardContent>
                {recentAction ? (
                    <div className="space-y-4 rounded-2xl border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] p-5">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="rounded-full bg-[var(--student-dashboard-primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--student-dashboard-primary)]">
                                {recentAction.status_label}
                            </span>
                            <span className="text-xs text-[var(--student-dashboard-text-muted)]">
                                อัปเดตล่าสุด {formatThaiDate(recentAction.logged_at)}
                            </span>
                        </div>
                        <p className="text-sm leading-6 text-[var(--student-dashboard-text)]">
                            {recentAction.note}
                        </p>
                        <p className="text-xs leading-5 text-[var(--student-dashboard-text-muted)]">
                            ข้อความนี้จะแสดงเฉพาะเมื่อครูเลือกแชร์อัปเดตกลับมาที่ห้องเรียนอย่างตั้งใจ และจะไม่แสดงบริบทภายในของครูหรือระบบ
                        </p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] p-5 text-sm text-[var(--student-dashboard-text-muted)]">
                        เมื่อครูเขียนข้อความตอบกลับและเลือกแชร์ให้นักเรียนเห็น ระบบจะแสดงอัปเดตล่าสุดไว้ที่นี่
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function DailyPrivacyNotice({
    dateLabel,
    responseCount,
}: DailyPrivacyNoticeState) {
    const countLabel =
        responseCount === null ? "มีเช็กอินล่าสุดแล้ว" : `มี ${responseCount} คำตอบในวันนั้น`;

    return (
        <div className="rounded-2xl border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-raised)] p-5 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--student-dashboard-primary-soft)] px-3 py-1 text-xs font-medium text-[var(--student-dashboard-primary)]">
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                มีเช็กอินล่าสุดแล้ว
            </div>
            <p className="mt-3 text-sm leading-7 text-[var(--student-dashboard-text)]">
                วันที่ {dateLabel} {countLabel} แต่ระบบยังไม่แสดงแนวโน้มรายวันของวันนั้น
                เพราะต้องรอข้อมูลรวมอย่างน้อย 3 คน เพื่อคุ้มครองความเป็นส่วนตัวของนักเรียน
            </p>
        </div>
    );
}

function DailyCompactCard({
    point,
    helperText,
    statusText,
    privacyNotice,
}: {
    point: TrendChartPoint | null;
    helperText: string;
    statusText?: string | null;
    privacyNotice?: DailyPrivacyNoticeState | null;
}) {
    const metrics = [
        {
            label: "อารมณ์",
            value: point?.mood,
            color: "text-violet-300",
            description: describeMood(point?.mood ?? null),
        },
        {
            label: "จังหวะคาบ",
            value: point?.pace,
            color: "text-sky-300",
            description: describePace(point?.pace ?? null),
        },
        {
            label: "ความยุติธรรม",
            value: point?.fairness,
            color: "text-teal-300",
            description: describeFairness(point?.fairness ?? null),
        },
    ];

    return (
        <Card className="overflow-hidden border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] text-[var(--student-dashboard-text)] shadow-[0_18px_40px_rgba(2,8,23,0.28)]">
            <CardHeader className="border-b border-[color:var(--student-dashboard-border)]">
                <CardTitle className="text-lg font-semibold text-[var(--student-dashboard-text)]">
                    แนวโน้มรายวันจากการเช็กอินล่าสุด
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
                {statusText && (
                    <p className="text-sm text-[var(--student-dashboard-text-muted)]">
                        {statusText}
                    </p>
                )}

                {point ? (
                    <div className="space-y-4 rounded-2xl border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-raised)] p-5">
                        <div className="rounded-2xl border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-soft)] p-4">
                            <p className="text-sm leading-6 text-[var(--student-dashboard-text)]">
                                {buildPointInsight(point, "ภาพรวมของวันที่มีข้อมูลล่าสุด")}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wide text-[var(--student-dashboard-text-muted)]">
                                วันที่มีข้อมูลล่าสุด
                            </p>
                            <p className="text-base font-semibold text-[var(--student-dashboard-text)]">
                                {point.label}
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            {metrics.map((metric) => (
                                <div
                                    key={metric.label}
                                    className="rounded-xl border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] p-3"
                                >
                                    <p className="text-xs text-[var(--student-dashboard-text-muted)]">
                                        {metric.label}
                                    </p>
                                    <p className={`mt-2 text-xl font-semibold ${metric.color}`}>
                                        {metric.description}
                                    </p>
                                    <p className="mt-1 text-xs text-[var(--student-dashboard-text-muted)]">
                                        คะแนนรวม {formatScore(metric.value)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {privacyNotice && <DailyPrivacyNotice {...privacyNotice} />}
                    </div>
                ) : privacyNotice ? (
                    <DailyPrivacyNotice {...privacyNotice} />
                ) : (
                    <div className="rounded-2xl border border-dashed border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-raised)] p-6 text-sm text-[var(--student-dashboard-text-muted)]">
                        ยังไม่มีข้อมูลรายวันที่แสดงได้ในตอนนี้
                    </div>
                )}

                <p className="text-xs text-[var(--student-dashboard-text-muted)]">
                    {helperText}
                </p>
            </CardContent>
        </Card>
    );
}

function WeeklyCompactCard({
    point,
    helperText,
}: {
    point: TrendChartPoint | null;
    helperText: string;
}) {
    const metrics = [
        {
            label: "อารมณ์",
            value: point?.mood,
            color: "text-violet-300",
            description: describeMood(point?.mood ?? null),
        },
        {
            label: "จังหวะคาบ",
            value: point?.pace,
            color: "text-sky-300",
            description: describePace(point?.pace ?? null),
        },
        {
            label: "ความยุติธรรม",
            value: point?.fairness,
            color: "text-teal-300",
            description: describeFairness(point?.fairness ?? null),
        },
    ];

    return (
        <Card className="overflow-hidden border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] text-[var(--student-dashboard-text)] shadow-[0_18px_40px_rgba(2,8,23,0.28)]">
            <CardHeader className="border-b border-[color:var(--student-dashboard-border)]">
                <CardTitle className="text-lg font-semibold text-[var(--student-dashboard-text)]">
                    แนวโน้มรายสัปดาห์ของห้องเรียนนี้
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
                {point ? (
                    <div className="space-y-4 rounded-2xl border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-raised)] p-5">
                        <div className="rounded-2xl border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-soft)] p-4">
                            <p className="text-sm leading-6 text-[var(--student-dashboard-text)]">
                                {buildPointInsight(point, "ภาพรวมของสัปดาห์ล่าสุด")}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wide text-[var(--student-dashboard-text-muted)]">
                                สัปดาห์ล่าสุดที่มีข้อมูล
                            </p>
                            <p className="text-base font-semibold text-[var(--student-dashboard-text)]">
                                {point.label}
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            {metrics.map((metric) => (
                                <div
                                    key={metric.label}
                                    className="rounded-xl border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] p-3"
                                >
                                    <p className="text-xs text-[var(--student-dashboard-text-muted)]">
                                        {metric.label}
                                    </p>
                                    <p className={`mt-2 text-xl font-semibold ${metric.color}`}>
                                        {metric.description}
                                    </p>
                                    <p className="mt-1 text-xs text-[var(--student-dashboard-text-muted)]">
                                        คะแนนรวม {formatScore(metric.value)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="rounded-xl border border-dashed border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-soft)] p-4 text-sm text-[var(--student-dashboard-text-muted)]">
                            ยังมีข้อมูลสัปดาห์เดียว กราฟจะแสดงเมื่อมีข้อมูลเพิ่มขึ้น
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-raised)] p-6 text-sm text-[var(--student-dashboard-text-muted)]">
                        ยังไม่มีข้อมูลรายสัปดาห์ที่แสดงได้ในตอนนี้
                    </div>
                )}

                <p className="text-xs text-[var(--student-dashboard-text-muted)]">
                    {helperText}
                </p>
            </CardContent>
        </Card>
    );
}

export default function StudentFeedbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestedClassId = searchParams.get("classId");

    const [classes, setClasses] = useState<EnrolledClass[]>([]);
    const [payload, setPayload] = useState<StudentFeedbackResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showWeeklyEvidence, setShowWeeklyEvidence] = useState(false);
    const [showDailyEvidence, setShowDailyEvidence] = useState(false);

    const classId = payload?.class_id ?? requestedClassId ?? null;
    const {
        data: dailyClimateHistory,
        isLoading: dailyTrendLoading,
        error: dailyTrendError,
    } = useDailyClimateHistory(classId);
    const {
        data: climateHistory,
        isLoading: trendLoading,
        error: trendError,
    } = useClimateHistory(classId);

    useEffect(() => {
        setLoading(true);
        setError(null);

        if (!requestedClassId) {
            async function fetchClassList() {
                try {
                    setPayload(null);
                    setShowWeeklyEvidence(false);
                    setShowDailyEvidence(false);
                    const res = await fetch("/api/student/classes", {
                        cache: "no-store",
                    });

                    if (res.status === 401) {
                        router.replace("/login");
                        return;
                    }

                    if (!res.ok) {
                        throw new Error("ไม่สามารถโหลดรายการห้องเรียนได้");
                    }

                    const data = await res.json();
                    setClasses(data.classes || []);
                } catch (err: unknown) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "เกิดข้อผิดพลาดในการโหลดรายการห้องเรียน"
                    );
                } finally {
                    setLoading(false);
                }
            }

            fetchClassList();
            return;
        }

        async function fetchFeedback() {
            try {
                const requestedClassIdValue = requestedClassId;
                if (!requestedClassIdValue) {
                    setLoading(false);
                    return;
                }

                setClasses([]);
                setShowWeeklyEvidence(false);
                setShowDailyEvidence(false);
                const params = new URLSearchParams();
                params.set("classId", requestedClassIdValue);

                const res = await fetch(`/api/student/feedback?${params.toString()}`, {
                    cache: "no-store",
                });

                if (res.status === 403 || res.status === 404) {
                    router.replace("/student/classes");
                    return;
                }

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(
                        errData.error || "ไม่สามารถโหลดข้อมูลความคิดเห็นห้องเรียนได้"
                    );
                }

                const data = (await res.json()) as StudentFeedbackResponse;
                setPayload(data);
            } catch (err: unknown) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "เกิดข้อผิดพลาดในการโหลดข้อมูลความคิดเห็นห้องเรียน"
                );
            } finally {
                setLoading(false);
            }
        }

        fetchFeedback();
    }, [requestedClassId, router]);

    const hasClimateRows = (payload?.climate.length ?? 0) > 0;
    const hasAggregateData = (payload?.climate ?? []).some(
        (row) =>
            row.avg_mood !== null ||
            row.avg_pace !== null ||
            row.avg_fairness !== null
    );

    const currentWeekStart = payload?.current_week.week_start ?? null;

    const currentWeekDailyClimateHistory = useMemo(() => {
        if (!currentWeekStart) {
            return [];
        }

        return dailyClimateHistory.filter((row) => row.sourceDate >= currentWeekStart);
    }, [currentWeekStart, dailyClimateHistory]);

    const latestCurrentWeekDailyRow =
        currentWeekDailyClimateHistory.at(-1) ?? null;
    const latestCurrentWeekNeedsPrivacyNotice = Boolean(
        latestCurrentWeekDailyRow && !latestCurrentWeekDailyRow.hasAggregate
    );
    const latestCurrentWeekPrivacyNotice = latestCurrentWeekNeedsPrivacyNotice
        ? {
              dateLabel: latestCurrentWeekDailyRow?.date ?? "วันที่ล่าสุด",
              responseCount: latestCurrentWeekDailyRow?.studentCount ?? null,
          }
        : null;

    const dailyChartData = useMemo(
        () =>
            currentWeekDailyClimateHistory.map((row) => ({
                label: row.date,
                mood: row.mood,
                pace: row.pace,
                fairness: row.fairness,
                studentCount: row.studentCount,
            })),
        [currentWeekDailyClimateHistory]
    );

    const dailyVisiblePoints = useMemo(
        () =>
            currentWeekDailyClimateHistory.filter((row) => row.hasAggregate).map((row) => ({
                label: row.date,
                mood: row.mood,
                pace: row.pace,
                fairness: row.fairness,
                studentCount: row.studentCount,
            })),
        [currentWeekDailyClimateHistory]
    );

    const dailyVisiblePointCount = dailyVisiblePoints.length;
    const latestDailyPoint = dailyVisiblePoints.at(-1) ?? null;

    const dailyStatusText = useMemo(() => {
        if (dailyTrendLoading || currentWeekDailyClimateHistory.length === 0) {
            return null;
        }

        if (dailyVisiblePointCount === 0) {
            return `อาทิตย์นี้มีเช็กอินแล้ว ${currentWeekDailyClimateHistory.length} วัน แต่ยังไม่มีวันที่แสดงค่าเฉลี่ยรายวันได้`;
        }

        return `ตอนนี้มีข้อมูลรายวันที่แสดงได้ ${dailyVisiblePointCount} วันในอาทิตย์นี้`;
    }, [
        currentWeekDailyClimateHistory.length,
        dailyTrendLoading,
        dailyVisiblePointCount,
    ]);

    const weeklyChartData = useMemo(
        () =>
            climateHistory.map((row) => ({
                label: `สัปดาห์ของ ${row.week}`,
                mood: row.mood === 0 ? null : row.mood,
                pace: row.pace === 0 ? null : row.pace,
                fairness: row.fairness === 0 ? null : row.fairness,
                studentCount: row.studentCount,
            })),
        [climateHistory]
    );

    const weeklyVisiblePoints = useMemo(
        () =>
            weeklyChartData.filter(
                (row) =>
                    row.mood !== null ||
                    row.pace !== null ||
                    row.fairness !== null
            ),
        [weeklyChartData]
    );

    const weeklyVisiblePointCount = weeklyVisiblePoints.length;
    const latestWeeklyPoint = weeklyVisiblePoints.at(-1) ?? null;
    const weeklyInsightText = useMemo(
        () => buildPointInsight(latestWeeklyPoint, "สัปดาห์ล่าสุด"),
        [latestWeeklyPoint]
    );
    const dailyInsightText = useMemo(
        () => buildPointInsight(latestDailyPoint, "ข้อมูลล่าสุดของอาทิตย์นี้"),
        [latestDailyPoint]
    );

    if (loading) {
        return (
            <Card className="border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] text-[var(--student-dashboard-text)] shadow-[0_16px_36px_rgba(2,8,23,0.24)]">
                <CardContent className="flex min-h-[320px] items-center justify-center">
                    <div className="flex items-center gap-3 text-sm text-[var(--student-dashboard-text-muted)]">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        กำลังโหลดความคิดเห็นห้องเรียน…
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] shadow-[0_16px_36px_rgba(2,8,23,0.24)]">
                <CardContent className="py-8 text-sm text-[var(--student-dashboard-danger)]">
                    {error}
                </CardContent>
            </Card>
        );
    }

    if (!requestedClassId) {
        return (
            <div className="space-y-6">
                <header className="space-y-2">
                    <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                        <BarChart3 aria-hidden="true" className="h-6 w-6 text-indigo-500" />
                        ความคิดเห็นห้องเรียน
                    </h1>
                    <p className="text-[var(--student-dashboard-text-muted)]">
                        เลือกห้องเรียนที่ต้องการดูภาพรวมบรรยากาศและการตอบสนองล่าสุดจากครู
                    </p>
                </header>

                {classes.length === 0 ? (
                    <Card className="border-dashed border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] shadow-[0_14px_32px_rgba(2,8,23,0.24)]">
                        <CardContent className="py-10 text-center">
                            <p className="text-base font-semibold text-[var(--student-dashboard-warning)]">
                                ยังไม่พบห้องเรียนสำหรับดูความคิดเห็นห้องเรียน
                            </p>
                            <p className="mt-2 text-sm text-[var(--student-dashboard-text-muted)]">
                                เมื่อคุณเข้าร่วมห้องเรียนแล้ว จะสามารถเลือกดู feedback รายห้องได้จากหน้านี้
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {classes.map((room) => (
                            <Card
                                key={room.class_id}
                                className="border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] text-[var(--student-dashboard-text)] shadow-[0_14px_32px_rgba(2,8,23,0.2)] transition-all hover:border-[color:var(--student-dashboard-primary)] hover:shadow-[0_18px_36px_rgba(2,8,23,0.26)]"
                            >
                                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--student-dashboard-primary-soft)] text-[var(--student-dashboard-primary)]">
                                                <GraduationCap
                                                    aria-hidden="true"
                                                    className="h-5 w-5"
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <h2 className="product-card-title text-base font-semibold text-[var(--student-dashboard-text)]">
                                                    {room.class_name}
                                                </h2>
                                                {room.description && (
                                                    <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--student-dashboard-text-muted)]">
                                                        {room.description}
                                                    </p>
                                                )}
                                                {room.teacher_name && (
                                                    <p className="line-clamp-2 break-words text-sm text-[var(--student-dashboard-text-muted)]">
                                                        ครูผู้สอน: {room.teacher_name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        className="product-card-button w-full shrink-0 border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-primary-soft)] px-4 py-3 text-left text-[var(--student-dashboard-primary)] hover:bg-[color:rgb(147_197_253/0.24)] sm:w-auto"
                                        onClick={() =>
                                            router.push(
                                                `/student/feedback?classId=${encodeURIComponent(room.class_id)}`
                                            )
                                        }
                                    >
                                        <Users aria-hidden="true" className="h-4 w-4" />
                                        ดูความคิดเห็นห้องเรียน
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (!payload || !hasClimateRows || !hasAggregateData) {
        return (
            <div className="space-y-6">
                <header className="space-y-2">
                    <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                        <BarChart3 aria-hidden="true" className="h-6 w-6 text-indigo-500" />
                        ความคิดเห็นห้องเรียน
                    </h1>
                    <p className="text-[var(--student-dashboard-text-muted)]">
                        ห้องนี้จะแสดงข้อมูลเมื่อมีการตอบแบบรวมเพียงพอตามเงื่อนไขความเป็นส่วนตัว
                    </p>
                    <p className="text-sm text-[var(--student-dashboard-text-muted)]">
                        ห้องเรียน: {payload?.class_name || "ห้องเรียนนี้"}
                    </p>
                </header>

                <Card className="border-dashed border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] shadow-[0_14px_32px_rgba(2,8,23,0.24)]">
                    <CardContent className="py-10 text-center">
                        <p className="text-base font-semibold text-[var(--student-dashboard-warning)]">
                            ยังมีข้อมูลไม่พอสำหรับสรุปบรรยากาศห้องเรียน
                        </p>
                        <p className="mt-2 text-sm text-[var(--student-dashboard-text-muted)]">
                            ระบบจะแสดงเฉพาะข้อมูลแบบรวม เพื่อคุ้มครองความเป็นส่วนตัวของนักเรียน
                        </p>
                    </CardContent>
                </Card>

                <div className="flex flex-wrap gap-3">
                    {payload?.class_id && (
                        <Button
                            className="bg-[var(--student-dashboard-primary)] text-[var(--student-dashboard-sidebar)] hover:bg-[color:rgb(147_197_253/0.88)]"
                            onClick={() =>
                                router.push(
                                    `/student/check-in?classId=${encodeURIComponent(payload.class_id)}`
                                )
                            }
                        >
                            กลับไปเช็กอินห้องนี้
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        className="border-[color:var(--student-dashboard-border)] bg-transparent text-[var(--student-dashboard-text)] hover:bg-[var(--student-dashboard-surface-soft)] hover:text-[var(--student-dashboard-text)] focus-visible:ring-[var(--student-dashboard-primary)]"
                        onClick={() => router.push("/student/feedback")}
                    >
                        ดูห้องเรียนทั้งหมด
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="space-y-2">
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                    <BarChart3 aria-hidden="true" className="h-6 w-6 text-indigo-500" />
                    ความคิดเห็นห้องเรียน
                </h1>
                <p className="text-[var(--student-dashboard-text-muted)]">
                    ดูทั้งภาพรวมของอาทิตย์นี้ สัปดาห์ก่อน และการตอบสนองล่าสุดจากครูในหน้าเดียว
                </p>
            </header>

            <ImpactSummaryCard
                className={payload.class_name}
                latestCheckInAt={payload.latest_check_in_at}
                currentWeekSummary={payload.current_week.summary}
                comparisonLabel={payload.current_week.comparison_label}
            />

            <section className="space-y-4">
                <LastWeekSummaryCard
                    summary={payload.last_week.summary}
                    weekStart={payload.last_week.week_start}
                />
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] p-4">
                    <p className="text-sm leading-6 text-[var(--student-dashboard-text-muted)]">
                        กราฟรายสัปดาห์ใช้เป็นหลักฐานประกอบ เพื่อช่วยยืนยันสิ่งที่สรุปไว้ด้านบน
                    </p>
                    <Button
                        variant="outline"
                        className="border-[color:var(--student-dashboard-border)] bg-transparent text-[var(--student-dashboard-text)] hover:bg-[var(--student-dashboard-surface-soft)] hover:text-[var(--student-dashboard-text)] focus-visible:ring-[var(--student-dashboard-primary)]"
                        aria-expanded={showWeeklyEvidence}
                        onClick={() => setShowWeeklyEvidence((value) => !value)}
                    >
                        {showWeeklyEvidence
                            ? "ซ่อนกราฟรายสัปดาห์"
                            : "ดูกราฟรายสัปดาห์ประกอบ"}
                    </Button>
                </div>

                {showWeeklyEvidence &&
                    (weeklyVisiblePointCount === 1 && !trendLoading ? (
                        <WeeklyCompactCard
                            point={latestWeeklyPoint}
                            helperText="กราฟนี้แสดงค่าเฉลี่ยรายสัปดาห์ของห้องเรียน และจะแสดงเป็นกราฟเต็มเมื่อมีข้อมูลอย่างน้อย 2 สัปดาห์"
                        />
                    ) : (
                        <ClimateTrendCard
                            title="แนวโน้มรายสัปดาห์ของห้องเรียนนี้"
                            helperText="กราฟนี้แสดงค่าเฉลี่ยรายสัปดาห์ของห้องเรียน เพื่อใช้เทียบกับอาทิตย์นี้โดยไม่เปิดเผยข้อมูลรายบุคคล"
                            loading={trendLoading}
                            data={weeklyChartData}
                            insightText={weeklyInsightText}
                            emptyMessage={
                                trendError ||
                                "ยังมีข้อมูลรายสัปดาห์ไม่พอสำหรับแสดงแนวโน้มของห้องเรียน"
                            }
                            chartHeightClassName="h-[240px]"
                        />
                    ))}
            </section>

            <TeacherResponseCard recentAction={payload.recent_action} />

            <section className="space-y-4">
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-[var(--student-dashboard-text)]">
                        แนวโน้มรายวันของอาทิตย์นี้
                    </h2>
                    <p className="text-sm leading-6 text-[var(--student-dashboard-text-muted)]">
                        ใช้ดูว่าบรรยากาศในอาทิตย์นี้กำลังเคลื่อนไปทางไหน โดยไม่จำเป็นต้องตีความตัวเลขเองทั้งหมด เพราะสรุปด้านบนช่วยเล่าให้แล้ว
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface)] p-4">
                    <p className="text-sm leading-6 text-[var(--student-dashboard-text-muted)]">
                        เปิดดูเมื่ออยากเห็นรายละเอียดการเปลี่ยนแปลงของอาทิตย์นี้ในแต่ละวัน
                    </p>
                    <Button
                        variant="outline"
                        className="border-[color:var(--student-dashboard-border)] bg-transparent text-[var(--student-dashboard-text)] hover:bg-[var(--student-dashboard-surface-soft)] hover:text-[var(--student-dashboard-text)] focus-visible:ring-[var(--student-dashboard-primary)]"
                        aria-expanded={showDailyEvidence}
                        onClick={() => setShowDailyEvidence((value) => !value)}
                    >
                        {showDailyEvidence
                            ? "ซ่อนแนวโน้มรายวัน"
                            : "ดูแนวโน้มรายวันของอาทิตย์นี้"}
                    </Button>
                </div>

                {showDailyEvidence &&
                    (dailyVisiblePointCount <= 1 && !dailyTrendLoading ? (
                        <DailyCompactCard
                            point={latestDailyPoint}
                            statusText={dailyStatusText}
                            privacyNotice={latestCurrentWeekPrivacyNotice}
                            helperText="แต่ละจุดสะท้อนการเช็กอินของอาทิตย์นี้ เพื่อดูว่าบรรยากาศกำลังเคลื่อนไปทางไหนเมื่อเทียบกับสัปดาห์ก่อน"
                        />
                    ) : (
                        <div className="space-y-4">
                            {latestCurrentWeekPrivacyNotice && (
                                <DailyPrivacyNotice {...latestCurrentWeekPrivacyNotice} />
                            )}
                            <ClimateTrendCard
                                title="แนวโน้มรายวันจากการเช็กอินล่าสุด"
                                helperText="ดูว่าอารมณ์ของห้องเรียนในอาทิตย์นี้กำลังเคลื่อนไปทางไหน เทียบกับสัปดาห์ก่อน"
                                loading={dailyTrendLoading}
                                data={dailyChartData}
                                insightText={dailyInsightText}
                                emptyMessage={
                                    dailyTrendError ||
                                    "ยังไม่มีข้อมูลรายวันที่แสดงได้ของอาทิตย์นี้"
                                }
                                statusText={dailyStatusText}
                                chartHeightClassName="h-[240px]"
                            />
                        </div>
                    ))}
            </section>

            <div className="flex flex-wrap gap-3">
                <Button
                    className="bg-[var(--student-dashboard-primary)] text-[var(--student-dashboard-sidebar)] hover:bg-[color:rgb(147_197_253/0.88)]"
                    onClick={() =>
                        router.push(
                            `/student/check-in?classId=${encodeURIComponent(payload.class_id)}`
                        )
                    }
                >
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    กลับไปเช็กอินห้องนี้
                </Button>
                <Button
                    variant="outline"
                    className="border-[color:var(--student-dashboard-border)] bg-transparent text-[var(--student-dashboard-text)] hover:bg-[var(--student-dashboard-surface-soft)] hover:text-[var(--student-dashboard-text)] focus-visible:ring-[var(--student-dashboard-primary)]"
                    onClick={() => router.push("/student/feedback")}
                >
                    ดูห้องเรียนทั้งหมด
                </Button>
            </div>
        </div>
    );
}
