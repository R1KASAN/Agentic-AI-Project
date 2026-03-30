"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ClassClimateSummary } from "@/types";

export interface WeeklyClimate {
    week: string;
    mood: number;
    pace: number;
    fairness: number;
    studentCount: number | null;
}

function formatWeekLabel(date: Date): string {
    return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export function useClimateHistory(classId: string | null, weeksBack: number = 4) {
    const [data, setData] = useState<WeeklyClimate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!classId) {
            setData([]);
            setIsLoading(false);
            setError(null);
            return;
        }

        async function fetchWeeklyData() {
            setIsLoading(true);
            setError(null);

            try {
                const supabase = createClient();
                const { data: summaryRows, error: rpcError } = await supabase.rpc(
                    "get_class_climate_summary",
                    {
                        p_class_id: classId,
                        p_weeks: weeksBack,
                    }
                );

                if (rpcError) {
                    throw rpcError;
                }

                // New behavior: map the RPC rows directly to 1-5 chart values.
                const weeklyData: WeeklyClimate[] = ((summaryRows || []) as ClassClimateSummary[])
                    .slice()
                    .sort((a, b) => a.week_start.localeCompare(b.week_start))
                    .map((row) => ({
                        week: formatWeekLabel(new Date(row.week_start)),
                        mood: row.avg_mood ?? 0,
                        pace: row.avg_pace ?? 0,
                        fairness: row.avg_fairness ?? 0,
                        studentCount: row.check_in_count ?? null,
                    }));

                setData(weeklyData);
            } catch (err: unknown) {
                setData([]);
                setError(err instanceof Error ? err.message : "Failed to load trend data");
            } finally {
                setIsLoading(false);
            }
        }

        fetchWeeklyData();
    }, [classId, weeksBack]);

    return { data, isLoading, error };
}
