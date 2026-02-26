"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface WeeklyClimate {
    week: string;        // display label e.g. "21 Jan"
    mood: number;        // 0-100 normalized (null weeks → 0)
    pace: number;        // 0-100 normalized
    fairness: number;    // 0-100 normalized
    studentCount: number | null;
}

/**
 * Maps mood text enum to a 1-5 score for normalization.
 */
const MOOD_SCORE: Record<string, number> = {
    very_low: 1,
    low: 2,
    okay: 3,
    good: 4,
    great: 5,
};

/**
 * Normalizes a 1-5 value to 0-100 percentage.
 */
function normalize(value: number | null, max: number = 5): number {
    if (value === null || value === undefined) return 0;
    return Math.round((value / max) * 100);
}

/**
 * Returns the Monday date of the week containing `date`.
 */
function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Formats a date as "DD MMM" (e.g. "21 Jan").
 */
function formatWeekLabel(date: Date): string {
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * Hook: Fetches 4-week climate trend data for a class via the
 * get_class_climate_summary RPC (SECURITY DEFINER).
 *
 * Each week is fetched in parallel. Weeks with insufficient data
 * (k-anonymity: n < 3) return null values (shown as gaps in chart).
 */
export function useClimateHistory(classId: string | null, weeksBack: number = 4) {
    const [data, setData] = useState<WeeklyClimate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!classId) {
            setIsLoading(false);
            return;
        }

        async function fetchWeeklyData() {
            setIsLoading(true);
            setError(null);

            try {
                const supabase = createClient();
                const now = new Date();
                const thisMonday = getMonday(now);

                // Generate Monday dates going back `weeksBack` weeks
                const mondays: Date[] = [];
                for (let i = weeksBack - 1; i >= 0; i--) {
                    const monday = new Date(thisMonday);
                    monday.setDate(monday.getDate() - i * 7);
                    mondays.push(monday);
                }

                // Fetch each week in parallel via the existing RPC
                // Each call asks for 1-week window from that Monday
                const results = await Promise.all(
                    mondays.map(async (monday) => {
                        const { data: summary, error: rpcError } = await supabase.rpc(
                            "get_class_climate_summary",
                            {
                                p_class_id: classId,
                                p_weeks: 1,
                            }
                        );

                        if (rpcError) {
                            console.warn(`RPC error for week ${monday.toISOString()}:`, rpcError);
                            return null;
                        }

                        return { monday, summary };
                    })
                );

                // Transform RPC results into WeeklyClimate entries
                const weeklyData: WeeklyClimate[] = results.map((result, i) => {
                    const monday = mondays[i];
                    const label = formatWeekLabel(monday);

                    if (!result || !result.summary || result.summary.privacy_locked) {
                        // k-anonymity locked or no data → show gap
                        return {
                            week: label,
                            mood: 0,
                            pace: 0,
                            fairness: 0,
                            studentCount: null,
                        };
                    }

                    const s = result.summary;

                    // Mood: if it's a text enum, map to score; if numeric, use directly
                    let moodScore: number;
                    if (typeof s.main_mood === "string") {
                        moodScore = MOOD_SCORE[s.main_mood] ?? 3;
                    } else {
                        moodScore = s.main_mood ?? 3;
                    }

                    return {
                        week: label,
                        mood: normalize(moodScore),
                        pace: normalize(s.avg_pace),
                        fairness: normalize(s.avg_fairness),
                        studentCount: s.response_count ?? null,
                    };
                });

                setData(weeklyData);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to load trend data");
            } finally {
                setIsLoading(false);
            }
        }

        fetchWeeklyData();
    }, [classId, weeksBack]);

    return { data, isLoading, error };
}
