"use client";

import { useState, useEffect } from "react";
import { ClimateCharts } from "@/components/domain/student/ClimateCharts";
import { ActionList } from "@/components/domain/student/ActionList";
import { TrendChart } from "@/components/charts/TrendChart";
import { useClimateHistory } from "@/hooks/useClimateHistory";
import { Loader2, BarChart3 } from "lucide-react";

interface ClimateSummary {
    class_id: string;
    week_start: string;
    check_in_count: number;
    avg_mood: number | null;
    avg_pace: number | null;
    avg_fairness: number | null;
}

interface Action {
    id: string;
    content: string;
    action_taken_note: string | null;
    created_at: string;
    updated_at: string;
}

export default function StudentFeedbackPage() {
    const [climate, setClimate] = useState<ClimateSummary[]>([]);
    const [actions, setActions] = useState<Action[]>([]);
    const [classId, setClassId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 4-week trend chart data
    const { data: climateHistory, isLoading: trendLoading } =
        useClimateHistory(classId);

    useEffect(() => {
        async function fetchFeedback() {
            try {
                const res = await fetch("/api/student/feedback");
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || "Failed to load feedback");
                }
                const data = await res.json();
                setClimate(data.climate || []);
                setActions(data.actions || []);
                setClassId(data.class_id || null);
            } catch (err: unknown) {
                setError(
                    err instanceof Error ? err.message : "Something went wrong"
                );
            } finally {
                setLoading(false);
            }
        }
        fetchFeedback();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-indigo-500" />
                    Class Feedback
                </h1>
                <p className="text-muted-foreground mt-1">
                    See how your class is doing and what actions your teacher has taken.
                </p>
            </div>

            {error && (
                <div className="text-sm text-destructive bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
                    {error}
                </div>
            )}

            {/* 4-Week Trend Chart (G2/T011 — FR-007) */}
            <section className="mb-6">
                <h2 className="text-base font-semibold mb-3">
                    แนวโน้ม 4 สัปดาห์ / 4-Week Class Trend
                </h2>
                {trendLoading ? (
                    <div className="h-[220px] animate-pulse bg-muted rounded-lg" />
                ) : (
                    <TrendChart
                        data={climateHistory}
                        title="Mood · Pace · Fairness"
                    />
                )}
            </section>

            {/* Climate Charts (existing bar charts) */}
            <ClimateCharts data={climate} />

            {/* Teacher Actions (loop-closure feed) */}
            <ActionList actions={actions} />
        </div>
    );
}

