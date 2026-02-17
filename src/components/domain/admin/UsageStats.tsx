"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, CheckCircle2, TrendingUp, RefreshCw } from "lucide-react";

interface Stats {
    total_users: number;
    total_classes: number;
    total_students: number;
    total_teachers: number;
}

interface AdoptionMetric {
    total_check_ins: number;
    total_recommendations: number;
    approved_recommendations: number;
    loop_closure_rate: number;
}

interface UsageStatsProps {
    stats: Stats;
    metrics: AdoptionMetric[];
}

export function UsageStats({ stats, metrics }: UsageStatsProps) {
    const metric = metrics.length > 0 ? metrics[0] : null;

    const cards = [
        {
            label: "Total Users",
            value: stats.total_users,
            icon: <Users className="w-5 h-5" />,
            color: "text-indigo-500",
            bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
        },
        {
            label: "Students",
            value: stats.total_students,
            icon: <GraduationCap className="w-5 h-5" />,
            color: "text-sky-500",
            bgColor: "bg-sky-50 dark:bg-sky-950/30",
        },
        {
            label: "Teachers",
            value: stats.total_teachers,
            icon: <BookOpen className="w-5 h-5" />,
            color: "text-emerald-500",
            bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
        },
        {
            label: "Classes",
            value: stats.total_classes,
            icon: <CheckCircle2 className="w-5 h-5" />,
            color: "text-violet-500",
            bgColor: "bg-violet-50 dark:bg-violet-950/30",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((card) => (
                    <Card key={card.label}>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    {card.label}
                                </span>
                                <div
                                    className={`w-8 h-8 rounded-lg ${card.bgColor} flex items-center justify-center ${card.color}`}
                                >
                                    {card.icon}
                                </div>
                            </div>
                            <p className="text-3xl font-bold mt-2">{card.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Adoption Metrics */}
            {metric && (
                <div className="grid gap-4 sm:grid-cols-3">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Total Check-ins
                                </span>
                                <TrendingUp className="w-4 h-4 text-indigo-500" />
                            </div>
                            <p className="text-2xl font-bold mt-1">
                                {metric.total_check_ins}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Recommendations
                                </span>
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </div>
                            <p className="text-2xl font-bold mt-1">
                                {metric.approved_recommendations}
                                <span className="text-sm font-normal text-muted-foreground">
                                    {" "}
                                    / {metric.total_recommendations} approved
                                </span>
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Loop Closure Rate
                                </span>
                                <RefreshCw className="w-4 h-4 text-violet-500" />
                            </div>
                            <p className="text-2xl font-bold mt-1">
                                {metric.loop_closure_rate != null
                                    ? `${Math.round(metric.loop_closure_rate)}%`
                                    : "—"}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                % of recommendations approved
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
