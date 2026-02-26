"use client";

import { useState } from "react";
import {
    approveRecommendation,
    dismissRecommendation,
} from "@/lib/actions/teacher";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiskIndicator } from "@/components/domain/teacher/RiskIndicator";
import { RecommendationList } from "@/components/domain/teacher/RecommendationList";
import {
    ArrowLeft,
    Users,
    TrendingUp,
    BarChart3,
    Settings,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

interface ClassDetailClientProps {
    classId: string;
    className: string;
    riskScore: number | null;
    studentCount: number;
    climate: ClimateSummary[];
    initialRecommendations: Recommendation[];
}

export default function ClassDetailClient({
    classId,
    className,
    riskScore,
    studentCount,
    climate,
    initialRecommendations,
}: ClassDetailClientProps) {
    const router = useRouter();
    const [recommendations, setRecommendations] = useState(initialRecommendations);

    // Latest week summary
    const latestWeek = climate.find((c) => c.avg_mood !== null);

    async function handleApprove(id: string, note: string) {
        await approveRecommendation(id, note);
        router.refresh();
    }

    async function handleDismiss(id: string, reason: string) {
        await dismissRecommendation(id, reason);
        router.refresh();
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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
                <Link href={`/teacher/class/${classId}/settings`} className="shrink-0 mt-2 sm:mt-0">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Settings className="w-4 h-4" />
                        Class Settings
                    </Button>
                </Link>
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
                    {initialRecommendations.filter((r) => r.status === "pending").length > 0 && (
                        <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full px-2 py-0.5 font-medium">
                            {initialRecommendations.filter((r) => r.status === "pending").length}{" "}
                            pending
                        </span>
                    )}
                </h2>
                <RecommendationList
                    recommendations={initialRecommendations}
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
