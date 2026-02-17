"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Loader2, Clock, User } from "lucide-react";

interface AuditLog {
    id: string;
    actor_id: string;
    action_type: string;
    target_type: string;
    target_id: string;
    created_at: string;
    users: {
        full_name: string | null;
        role: string;
    } | null;
}

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "success" | "secondary" | "warning" }> = {
    recommendation_approved: { label: "Approved", variant: "success" },
    recommendation_dismissed: { label: "Dismissed", variant: "secondary" },
    recommendation_communicated: { label: "Communicated", variant: "default" },
};

export default function AdminAuditPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchLogs() {
            try {
                const res = await fetch("/api/admin/metrics");
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || "Failed to load audit log");
                }
                const data = await res.json();
                setLogs(data.logs || []);
            } catch (err: unknown) {
                setError(
                    err instanceof Error ? err.message : "Something went wrong"
                );
            } finally {
                setLoading(false);
            }
        }
        fetchLogs();
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
                    <ClipboardList className="w-6 h-6 text-violet-500" />
                    Audit Log
                </h1>
                <p className="text-muted-foreground mt-1">
                    View all significant actions — no raw student text content is shown.
                </p>
            </div>

            {error && (
                <div className="text-sm text-destructive bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
                    {error}
                </div>
            )}

            {logs.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                        <ClipboardList className="w-10 h-10 text-muted-foreground/40" />
                        <p className="text-muted-foreground">
                            No audit entries yet. Actions will be logged as teachers review
                            recommendations.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {/* Table header */}
                            <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                                <div className="col-span-3">Actor</div>
                                <div className="col-span-3">Action</div>
                                <div className="col-span-3">Target</div>
                                <div className="col-span-3">Time</div>
                            </div>

                            {/* Rows */}
                            {logs.map((log) => {
                                const actionConfig =
                                    ACTION_LABELS[log.action_type] || {
                                        label: log.action_type.replace(/_/g, " "),
                                        variant: "default" as const,
                                    };

                                return (
                                    <div
                                        key={log.id}
                                        className="grid grid-cols-12 gap-4 px-3 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors items-center"
                                    >
                                        {/* Actor */}
                                        <div className="col-span-3 flex items-center gap-2 min-w-0">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                                <User className="w-3 h-3 text-muted-foreground" />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-xs font-medium truncate">
                                                    {log.users?.full_name || "Unknown"}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {log.users?.role || "—"}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Action */}
                                        <div className="col-span-3">
                                            <Badge
                                                variant={actionConfig.variant}
                                                className="text-[10px]"
                                            >
                                                {actionConfig.label}
                                            </Badge>
                                        </div>

                                        {/* Target */}
                                        <div className="col-span-3">
                                            <span className="text-xs text-muted-foreground">
                                                {log.target_type}
                                            </span>
                                            <p className="text-[10px] text-muted-foreground/70 truncate font-mono">
                                                {log.target_id.slice(0, 8)}…
                                            </p>
                                        </div>

                                        {/* Time */}
                                        <div className="col-span-3 flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            {new Date(log.created_at).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
