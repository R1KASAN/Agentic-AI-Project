"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Check,
    X,
    Loader2,
    Sparkles,
    Clock,
} from "lucide-react";

interface Recommendation {
    id: string;
    content: string;
    status: string;
    action_taken_note: string | null;
    created_at: string;
}

interface RecommendationListProps {
    recommendations: Recommendation[];
    onApprove: (id: string, note: string) => Promise<void>;
    onDismiss: (id: string, reason: string) => Promise<void>;
}

const STATUS_BADGES: Record<
    string,
    { label: string; variant: "default" | "secondary" | "success" | "warning" }
> = {
    pending: { label: "Pending", variant: "warning" },
    approved: { label: "Approved", variant: "success" },
    dismissed: { label: "Dismissed", variant: "secondary" },
};

export function RecommendationList({
    recommendations,
    onApprove,
    onDismiss,
}: RecommendationListProps) {
    if (recommendations.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                    <Sparkles className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                        No AI suggestions yet. They will appear as student data accumulates.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {recommendations.map((rec) => (
                <RecommendationCard
                    key={rec.id}
                    recommendation={rec}
                    onApprove={onApprove}
                    onDismiss={onDismiss}
                />
            ))}
        </div>
    );
}

function RecommendationCard({
    recommendation,
    onApprove,
    onDismiss,
}: {
    recommendation: Recommendation;
    onApprove: (id: string, note: string) => Promise<void>;
    onDismiss: (id: string, reason: string) => Promise<void>;
}) {
    const [loading, setLoading] = useState(false);
    const [actionNote, setActionNote] = useState("");
    const [showInput, setShowInput] = useState<"approve" | "dismiss" | null>(
        null
    );

    const status = STATUS_BADGES[recommendation.status] || STATUS_BADGES.pending;
    const isPending = recommendation.status === "pending";

    async function handleApprove() {
        setLoading(true);
        await onApprove(recommendation.id, actionNote);
        setLoading(false);
        setShowInput(null);
    }

    async function handleDismiss() {
        setLoading(true);
        await onDismiss(recommendation.id, actionNote);
        setLoading(false);
        setShowInput(null);
    }

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                {recommendation.content}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant={status.variant} className="text-[10px]">
                                    {status.label}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(recommendation.created_at).toLocaleDateString(
                                        "en-US",
                                        { month: "short", day: "numeric" }
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Note (if approved/dismissed) */}
                {recommendation.action_taken_note && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 text-xs text-muted-foreground">
                        <span className="font-medium">Note:</span>{" "}
                        {recommendation.action_taken_note}
                    </div>
                )}

                {/* Action Input */}
                {showInput && isPending && (
                    <div className="space-y-2">
                        <textarea
                            value={actionNote}
                            onChange={(e) => setActionNote(e.target.value)}
                            placeholder={
                                showInput === "approve"
                                    ? "Describe the action you'll take..."
                                    : "Reason for dismissing..."
                            }
                            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                            rows={2}
                        />
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={showInput === "approve" ? handleApprove : handleDismiss}
                                disabled={loading}
                                className={
                                    showInput === "approve"
                                        ? "bg-green-600 hover:bg-green-700 text-white"
                                        : "bg-slate-600 hover:bg-slate-700 text-white"
                                }
                            >
                                {loading && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                                {showInput === "approve" ? "Confirm Approve" : "Confirm Dismiss"}
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowInput(null)}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {/* Action Buttons (for pending) */}
                {isPending && !showInput && (
                    <div className="flex gap-2 pt-1">
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-950/30"
                            onClick={() => setShowInput("approve")}
                        >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Approve
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-slate-500 border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={() => setShowInput("dismiss")}
                        >
                            <X className="w-3.5 h-3.5 mr-1" />
                            Dismiss
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
