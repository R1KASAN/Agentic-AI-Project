"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DailyClimateSummary } from "@/types";

export type DailyPoint = {
    sourceDate: string;
    date: string;
    mood: number | null;
    pace: number | null;
    fairness: number | null;
    studentCount: number | null;
};

function formatDayLabel(date: Date): string {
    return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export function useDailyClimateHistory(classId: string | null, daysBack: number = 14) {
    const [data, setData] = useState<DailyPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!classId) {
            setData([]);
            setIsLoading(false);
            setError(null);
            return;
        }

        async function fetchDailyData() {
            setIsLoading(true);
            setError(null);

            try {
                const supabase = createClient();
                const { data: summaryRows, error: rpcError } = await supabase.rpc(
                    "get_class_climate_daily",
                    {
                        p_class_id: classId,
                        p_days: daysBack,
                    }
                );

                if (rpcError) {
                    throw rpcError;
                }

                const dailyData: DailyPoint[] = ((summaryRows || []) as DailyClimateSummary[])
                    .slice()
                    .sort((a, b) => a.check_in_date.localeCompare(b.check_in_date))
                    .map((row) => ({
                        sourceDate: row.check_in_date,
                        date: formatDayLabel(new Date(row.check_in_date)),
                        mood: row.avg_mood ?? null,
                        pace: row.avg_pace ?? null,
                        fairness: row.avg_fairness ?? null,
                        studentCount:
                            row.total_responses === null || row.total_responses === undefined
                                ? null
                                : Number(row.total_responses),
                    }));

                setData(dailyData);
            } catch (err: unknown) {
                setData([]);
                setError(err instanceof Error ? err.message : "Failed to load daily trend data");
            } finally {
                setIsLoading(false);
            }
        }

        fetchDailyData();
    }, [classId, daysBack]);

    return { data, isLoading, error };
}
