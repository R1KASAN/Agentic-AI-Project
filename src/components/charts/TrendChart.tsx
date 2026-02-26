"use client";

import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import type { WeeklyClimate } from "@/hooks/useClimateHistory";

interface TrendChartProps {
    data: WeeklyClimate[];
    title?: string;
    className?: string;
}

function EmptyState() {
    return (
        <div className="h-[220px] flex flex-col items-center justify-center text-center text-muted-foreground text-sm border border-dashed rounded-lg bg-muted/30">
            <svg
                className="w-8 h-8 mb-2 text-muted-foreground/50"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
            </svg>
            <p className="font-medium">ยังไม่มีข้อมูลเพียงพอ</p>
            <p className="text-xs mt-1 text-muted-foreground/70">
                Not enough data yet (min. 3 students/week)
            </p>
        </div>
    );
}

export function TrendChart({ data, title, className }: TrendChartProps) {
    const allDataEmpty = data.every(
        (w) => w.mood === 0 && w.pace === 0 && w.fairness === 0
    );

    return (
        <div className={cn("w-full", className)}>
            {title && (
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    {title}
                </h3>
            )}

            {allDataEmpty ? (
                <EmptyState />
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart
                        data={data}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                        />
                        <XAxis
                            dataKey="week"
                            tick={{ fontSize: 12 }}
                            className="text-muted-foreground"
                        />
                        <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 12 }}
                            unit="%"
                            className="text-muted-foreground"
                        />
                        <Tooltip
                            formatter={(value: number | string | undefined, name: string | undefined) => [
                                `${value ?? 0}%`,
                                name ?? "",
                            ]}
                            labelFormatter={(label) =>
                                `สัปดาห์ ${String(label)} / Week of ${String(label)}`
                            }
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                            }}
                        />
                        <Legend
                            wrapperStyle={{ fontSize: "12px" }}
                        />
                        <Line
                            type="monotone"
                            dataKey="mood"
                            name="อารมณ์/Mood"
                            stroke="#4f46e5"
                            strokeWidth={2}
                            dot={{ r: 4, fill: "#4f46e5" }}
                            activeDot={{ r: 6 }}
                            connectNulls={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="pace"
                            name="ความเร็ว/Pace"
                            stroke="#059669"
                            strokeWidth={2}
                            dot={{ r: 4, fill: "#059669" }}
                            activeDot={{ r: 6 }}
                            connectNulls={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="fairness"
                            name="ความยุติธรรม/Fairness"
                            stroke="#d97706"
                            strokeWidth={2}
                            dot={{ r: 4, fill: "#d97706" }}
                            activeDot={{ r: 6 }}
                            connectNulls={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
