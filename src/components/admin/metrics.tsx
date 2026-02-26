"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts"

/* ─── AdminMetricCard ───────────────────────────────────── */
export function AdminMetricCard({
    label,
    value,
    trend,
    helperText,
    icon,
}: {
    label: string
    value: string | number
    trend?: "up" | "down" | "flat"
    helperText?: string
    icon?: React.ReactNode
}) {
    const TrendIcon = trend === "up"
        ? TrendingUp
        : trend === "down"
            ? TrendingDown
            : Minus

    const trendColor = trend === "up"
        ? "text-emerald-500"
        : trend === "down"
            ? "text-red-500"
            : "text-muted-foreground"

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">{label}</p>
                        <p className="text-3xl font-extrabold tracking-tight">{value}</p>
                        {helperText && (
                            <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
                        )}
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        {icon && (
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                                {icon}
                            </div>
                        )}
                        {trend && (
                            <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

/* ─── AdminMetricsOverview ──────────────────────────────── */
export function AdminMetricsOverview({
    checkinRate,
    loopClosureRate,
    activeTeachers,
    activeClasses,
    checkinTrend,
    loopClosureTrend,
}: {
    checkinRate: number
    loopClosureRate: number
    activeTeachers: number
    activeClasses: number
    checkinTrend?: "up" | "down" | "flat"
    loopClosureTrend?: "up" | "down" | "flat"
}) {
    if (
        checkinRate === 0 &&
        loopClosureRate === 0 &&
        activeTeachers === 0 &&
        activeClasses === 0
    ) {
        return (
            <div className="flex flex-col items-center justify-center p-16 text-center text-muted-foreground border-2 border-dashed rounded-2xl bg-muted/20">
                <p className="text-lg font-semibold mb-2">ยังไม่มีข้อมูลพอสำหรับคำนวณ KPI</p>
                <p className="text-sm">ระบบจะแสดงข้อมูลเมื่อมีการใช้งานเพียงพอ</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminMetricCard
                label="Check-in Rate (สัปดาห์นี้)"
                value={`${checkinRate}%`}
                trend={checkinTrend}
                helperText="นักเรียนที่ส่ง check-in"
            />
            <AdminMetricCard
                label="Loop Closure Rate (สัปดาห์นี้)"
                value={`${loopClosureRate}%`}
                trend={loopClosureTrend}
                helperText="สัดส่วนที่ครูตอบกลับ"
            />
            <AdminMetricCard
                label="Active Teachers"
                value={activeTeachers}
                helperText="ครูที่มี class"
            />
            <AdminMetricCard
                label="Active Classes"
                value={activeClasses}
                helperText="จำนวน class ที่ active"
            />
        </div>
    )
}

/* ─── AdminTrendChart ───────────────────────────────────── */
export function AdminTrendChart({
    data,
}: {
    data: { weekLabel: string; checkinRate: number; loopClosureRate: number }[]
}) {
    if (!data || data.length < 2) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border-2 border-dashed rounded-2xl bg-muted/20">
                <p className="text-base font-semibold">รอข้อมูลเพิ่มก่อนจะแสดงกราฟ</p>
                <p className="text-sm mt-1">ต้องมีข้อมูลอย่างน้อย 2 สัปดาห์</p>
            </div>
        )
    }

    return (
        <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="weekLabel" className="text-xs" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} className="text-xs" tick={{ fontSize: 12 }} unit="%" />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                        }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Line
                        type="monotone"
                        dataKey="checkinRate"
                        name="Check-in Rate"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="loopClosureRate"
                        name="Loop Closure Rate"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
