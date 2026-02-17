"use client";

import { useState, useEffect } from "react";
import { UsageStats } from "@/components/domain/admin/UsageStats";
import { BarChart3, Loader2 } from "lucide-react";

export default function AdminMetricsPage() {
    const [stats, setStats] = useState({
        total_users: 0,
        total_classes: 0,
        total_students: 0,
        total_teachers: 0,
    });
    const [metrics, setMetrics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchMetrics() {
            try {
                const res = await fetch("/api/admin/metrics");
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || "Failed to load metrics");
                }
                const data = await res.json();
                setStats(data.stats);
                setMetrics(data.metrics);
            } catch (err: unknown) {
                setError(
                    err instanceof Error ? err.message : "Something went wrong"
                );
            } finally {
                setLoading(false);
            }
        }
        fetchMetrics();
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
                    <BarChart3 className="w-6 h-6 text-violet-500" />
                    Adoption Metrics
                </h1>
                <p className="text-muted-foreground mt-1">
                    Track system adoption and loop closure rates — no student content
                    visible.
                </p>
            </div>

            {error && (
                <div className="text-sm text-destructive bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
                    {error}
                </div>
            )}

            <UsageStats stats={stats} metrics={metrics} />
        </div>
    );
}
