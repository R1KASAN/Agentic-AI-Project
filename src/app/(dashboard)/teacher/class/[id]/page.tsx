"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
    approveRecommendation,
    dismissRecommendation,
} from "@/lib/actions/teacher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiskIndicator } from "@/components/domain/teacher/RiskIndicator";
import { RecommendationList } from "@/components/domain/teacher/RecommendationList";
import {
    ArrowLeft,
    Users,
    TrendingUp,
    Loader2,
    BarChart3,
} from "lucide-react";
import Link from "next/link";

interface ClimateSummary {
    class_id: string;
    week_start: string;
    check_in_count: number;
    avg_mood: number | null;
    avg_pace: number | null;
    avg_fairness: number | null;
}

interface Recommendation {
    id: string;
    content: string;
    status: string;
    action_taken_note: string | null;
    created_at: string;
}

export default function ClassDetailPage() {
    const params = useParams();
    const classId = params.id as string;

    const [className, setClassName] = useState("");
    const [riskScore, setRiskScore] = useState<number | null>(null);
    const [studentCount, setStudentCount] = useState(0);
    const [climate, setClimate] = useState<ClimateSummary[]>([]);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    const fetchData = useCallback(async () => {
        // Fetch class info
        const { data: classData } = await supabase
            .from("classes")
            .select("name, risk_score")
            .eq("id", classId)
            .single();

        if (classData) {
            setClassName(classData.name);
            setRiskScore(classData.risk_score);
        }

        // Fetch enrollment count
        const { count } = await supabase
            .from("class_enrollments")
            .select("*", { count: "exact", head: true })
            .eq("class_id", classId);
        setStudentCount(count || 0);

        // Fetch climate summary via RPC
        const { data: climateSummary } = await supabase.rpc(
            "get_class_climate_summary",
            { p_class_id: classId, p_weeks: 4 }
        );
        setClimate(climateSummary || []);

        // Fetch recommendations
        const { data: recs } = await supabase
            .from("recommendations")
            .select("id, content, status, action_taken_note, created_at")
            .eq("class_id", classId)
            .order("created_at", { ascending: false })
            .limit(10);
        setRecommendations(recs || []);

        setLoading(false);
    }, [classId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    async function handleApprove(id: string, note: string) {
        await approveRecommendation(id, note);
        await fetchData();
    }

    async function handleDismiss(id: string, reason: string) {
        await dismissRecommendation(id, reason);
        await fetchData();
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Latest week summary
    const latestWeek = climate.find((c) => c.avg_mood !== null);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <Link
                        href="/teacher"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        {className}
                        <RiskIndicator score={riskScore} size="md" />
                    </h1>
                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {studentCount} students enrolled
                    </p>
                </div>
            </div>

            {/* Weekly Summary Cards */}
            {latestWeek ? (
                <div className="grid gap-4 sm:grid-cols-3">
                    <MetricCard
                        label="Avg Mood"
                        value={latestWeek.avg_mood}
                        icon={<TrendingUp className="w-4 h-4" />}
                        color="text-indigo-500"
                    />
                    <MetricCard
                        label="Avg Pace"
                        value={latestWeek.avg_pace}
                        icon={<BarChart3 className="w-4 h-4" />}
                        color="text-sky-500"
                    />
                    <MetricCard
                        label="Avg Fairness"
                        value={latestWeek.avg_fairness}
                        icon={<BarChart3 className="w-4 h-4" />}
                        color="text-violet-500"
                    />
                </div>
            ) : (
                <Card className="border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                    <CardContent className="py-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Not enough check-in data yet. Aggregate metrics appear when 3+
                            students respond.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Recommendations */}
            <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    Suggested Actions
                    {recommendations.filter((r) => r.status === "pending").length > 0 && (
                        <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full px-2 py-0.5 font-medium">
                            {recommendations.filter((r) => r.status === "pending").length}{" "}
                            pending
                        </span>
                    )}
                </h2>
                <RecommendationList
                    recommendations={recommendations}
                    onApprove={handleApprove}
                    onDismiss={handleDismiss}
                />
            </div>
        </div>
    );
}

function MetricCard({
    label,
    value,
    icon,
    color,
}: {
    label: string;
    value: number | null;
    icon: React.ReactNode;
    color: string;
}) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className={color}>{icon}</span>
                </div>
                <p className="text-2xl font-bold mt-1">
                    {value !== null ? value.toFixed(1) : "—"}
                    <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        / 5
                    </span>
                </p>
            </CardContent>
        </Card>
    );
}
