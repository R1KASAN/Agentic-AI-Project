"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, AlertTriangle } from "lucide-react";

interface ClimateSummary {
    class_id: string;
    week_start: string;
    check_in_count: number;
    avg_mood: number | null;
    avg_pace: number | null;
    avg_fairness: number | null;
}

interface ClimateChartsProps {
    data: ClimateSummary[];
}

function formatWeek(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ClimateCharts({ data }: ClimateChartsProps) {
    // Check if any week has sufficient data (k-anonymity met)
    const hasData = data.some(
        (d) => d.avg_mood !== null || d.avg_pace !== null || d.avg_fairness !== null
    );

    if (!hasData) {
        return <NotEnoughData />;
    }

    // Transform data for Recharts
    const chartData = data
        .filter((d) => d.avg_mood !== null) // only show weeks with sufficient data
        .map((d) => ({
            week: formatWeek(d.week_start),
            Mood: d.avg_mood,
            Pace: d.avg_pace,
            Fairness: d.avg_fairness,
            responses: d.check_in_count,
        }))
        .reverse(); // oldest first for left-to-right

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    Class Climate Trends
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={chartData}
                            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                        >
                            <defs>
                                <linearGradient id="gradMood" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradPace" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradFairness" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis
                                dataKey="week"
                                tick={{ fontSize: 12 }}
                                className="text-muted-foreground"
                            />
                            <YAxis
                                domain={[1, 5]}
                                ticks={[1, 2, 3, 4, 5]}
                                tick={{ fontSize: 12 }}
                                className="text-muted-foreground"
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: "8px",
                                    border: "1px solid var(--border)",
                                    background: "var(--card)",
                                    color: "var(--card-foreground)",
                                    fontSize: "13px",
                                }}
                                labelStyle={{ fontWeight: 600 }}
                            />
                            <Legend
                                iconType="circle"
                                wrapperStyle={{ fontSize: "13px", paddingTop: "8px" }}
                            />
                            <Area
                                type="monotone"
                                dataKey="Mood"
                                stroke="#6366f1"
                                fill="url(#gradMood)"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="Pace"
                                stroke="#0ea5e9"
                                fill="url(#gradPace)"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="Fairness"
                                stroke="#8b5cf6"
                                fill="url(#gradFairness)"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-[11px] text-muted-foreground text-center mt-2">
                    Showing weekly averages (scale 1-5). Data is aggregated and
                    privacy-protected.
                </p>
            </CardContent>
        </Card>
    );
}

function NotEnoughData() {
    return (
        <Card className="border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-amber-500" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">
                        Not Enough Data
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        Waiting for more classmates to check in. Aggregate trends appear
                        when <strong>3 or more</strong> students have responded — this
                        protects everyone&apos;s privacy.
                    </p>
                </div>
                <div className="bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    🔒 Privacy Protected — k-anonymity (n ≥ 3) enforced
                </div>
            </CardContent>
        </Card>
    );
}

export { NotEnoughData };
